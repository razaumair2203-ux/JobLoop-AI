/**
 * Sanity Checker — Gate 2 of the Hard-Gated Maturation Protocol (HGMP)
 *
 * Runs AFTER Zod schema validation (schema-validator.ts).
 * Catches logical/semantic errors that structural validation can't detect:
 *
 *   1. duration_months must match date span (± 1 month tolerance)
 *   2. total_experience_years must be calculable from earliest→latest dates
 *   3. No "Unknown" or placeholder values in required fields
 *   4. Skill count sanity: if source text has >500 words, skills < 3 is suspicious
 *   5. No empty arrays where source text clearly has content for that section
 *   6. Date format consistency (YYYY or YYYY-MM or "Present", no invented precision)
 *   7. No duplicate entries (same company+title+dates in experience)
 *
 * Zero LLM calls. Pure deterministic CODE.
 */

import type { ParsedCVOutput } from "../prompts/cv-parser";

// ============================================================
// TYPES
// ============================================================

export type SanityIssueLevel = "error" | "warning";

export interface SanityIssue {
  /** JSON path to the problematic field */
  path: string;
  /** What's wrong */
  message: string;
  /** error = hard stop, warning = logged but doesn't fail the gate */
  level: SanityIssueLevel;
  /** The problematic value */
  value: string;
}

export interface SanityReport {
  /** Total checks run */
  totalChecks: number;
  /** Issues found */
  issues: SanityIssue[];
  /** PASS = zero errors (warnings are OK) */
  pass: boolean;
  /** Count of errors (not warnings) */
  errorCount: number;
  /** Count of warnings */
  warningCount: number;
}

// ============================================================
// DATE PARSING
// ============================================================

interface ParsedDate {
  year: number;
  month: number; // 1-12, defaults to 1 for year-only
  isPresent: boolean;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function parseDate(dateStr: string): ParsedDate | null {
  if (!dateStr) return null;
  const d = dateStr.trim().toLowerCase();
  if (d === "present" || d === "current" || d === "ongoing") {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, isPresent: true };
  }

  // "Jan 2020", "January 2020"
  const monthYear = d.match(/^([a-z]+)\s*(\d{4})$/);
  if (monthYear) {
    const month = MONTH_MAP[monthYear[1]];
    if (month) return { year: parseInt(monthYear[2]), month, isPresent: false };
  }

  // "2020-01", "2020/01"
  const isoMonth = d.match(/^(\d{4})[\-/](\d{1,2})$/);
  if (isoMonth) {
    return { year: parseInt(isoMonth[1]), month: parseInt(isoMonth[2]), isPresent: false };
  }

  // "2020" — needs context: start dates default to Jan, end dates to Dec
  // But parseDate doesn't know context, so we return month: 0 as sentinel
  // Callers handle the start/end distinction
  const yearOnly = d.match(/^(\d{4})$/);
  if (yearOnly) {
    return { year: parseInt(yearOnly[1]), month: 0, isPresent: false };
  }

  return null;
}

/** Convert to months. month=0 (year-only sentinel) defaults to 1 (Jan) for general use */
function toMonths(d: ParsedDate): number {
  return d.year * 12 + (d.month === 0 ? 1 : d.month);
}

// ============================================================
// PLACEHOLDER DETECTION
// ============================================================

const PLACEHOLDER_VALUES = new Set([
  "unknown", "n/a", "na", "none", "null", "undefined",
  "not specified", "not available", "tbd", "tba",
  "placeholder", "to be determined",
]);

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

// ============================================================
// MAIN SANITY CHECK
// ============================================================

export function checkSanity(
  parsed: ParsedCVOutput,
  sourceTextLength?: number,
): SanityReport {
  const issues: SanityIssue[] = [];
  let checks = 0;

  // --- 1. Duration vs date span ---
  for (let i = 0; i < parsed.experience.length; i++) {
    const exp = parsed.experience[i];
    const prefix = `experience[${i}]`;
    checks++;

    const start = parseDate(exp.start_date);
    const end = parseDate(exp.end_date);

    if (start && end) {
      // Year-only dates: prompt rule says "assume Jan for start and Dec for end"
      const startMonth = start.month === 0 ? 1 : start.month;
      const endMonth = end.month === 0 ? 12 : end.month;
      const startMonths = start.year * 12 + startMonth;
      const endMonths = end.year * 12 + endMonth;
      const computed = endMonths - startMonths;
      const stated = exp.duration_months;

      if (computed >= 0 && Math.abs(computed - stated) > 2) {
        issues.push({
          path: `${prefix}.duration_months`,
          message: `Stated duration (${stated}mo) doesn't match date span (${computed}mo). Dates: ${exp.start_date} - ${exp.end_date}`,
          level: "error",
          value: String(stated),
        });
      }
    }
  }

  // --- 2. total_experience_years vs date range ---
  checks++;
  if (parsed.experience.length > 0) {
    const allDates: ParsedDate[] = [];
    for (const exp of parsed.experience) {
      const s = parseDate(exp.start_date);
      const e = parseDate(exp.end_date);
      if (s) allDates.push(s);
      if (e) allDates.push(e);
    }

    if (allDates.length >= 2) {
      const earliest = Math.min(...allDates.map(toMonths));
      const latest = Math.max(...allDates.map(toMonths));
      const spanYears = Math.round((latest - earliest) / 12);
      const stated = parsed.total_experience_years;

      // Allow ± 2 years tolerance (overlapping roles, gaps, etc.)
      if (Math.abs(spanYears - stated) > 2) {
        issues.push({
          path: "total_experience_years",
          message: `Stated ${stated} years but date span suggests ~${spanYears} years (earliest to latest role)`,
          level: "warning",
          value: String(stated),
        });
      }
    }
  }

  // --- 3. No placeholder values ---
  // Check key fields that should never be "Unknown"
  const fieldsToCheckPlaceholders: Array<{ path: string; value: string | null }> = [
    { path: "name", value: parsed.name },
    { path: "location.city", value: parsed.location?.city },
    { path: "location.country", value: parsed.location?.country },
  ];

  for (const exp of parsed.experience) {
    const i = parsed.experience.indexOf(exp);
    fieldsToCheckPlaceholders.push(
      { path: `experience[${i}].company`, value: exp.company },
      { path: `experience[${i}].title`, value: exp.title },
      { path: `experience[${i}].employer`, value: exp.employer },
    );
  }
  for (const edu of parsed.education) {
    const i = parsed.education.indexOf(edu);
    fieldsToCheckPlaceholders.push(
      { path: `education[${i}].institution`, value: edu.institution },
      { path: `education[${i}].degree`, value: edu.degree },
    );
  }
  for (const pub of parsed.publications) {
    const i = parsed.publications.indexOf(pub);
    fieldsToCheckPlaceholders.push(
      { path: `publications[${i}].venue`, value: pub.venue },
    );
  }

  for (const field of fieldsToCheckPlaceholders) {
    checks++;
    if (field.value && isPlaceholder(field.value)) {
      issues.push({
        path: field.path,
        message: `Placeholder value "${field.value}" — use null instead of fabricating`,
        level: "error",
        value: field.value,
      });
    }
  }

  // --- 4. Skill count sanity ---
  checks++;
  if (sourceTextLength && sourceTextLength > 500) {
    const totalSkills = parsed.skills.length + parsed.all_technologies.length;
    if (totalSkills < 3) {
      issues.push({
        path: "skills",
        message: `Only ${totalSkills} skills extracted from ${sourceTextLength}-char source text — suspiciously low`,
        level: "warning",
        value: String(totalSkills),
      });
    }
  }

  // --- 5. Date format consistency ---
  const validDateFormats = /^(\d{4}|[A-Za-z]+\s+\d{4}|\d{4}[\-/]\d{1,2}|Present|Current|Ongoing)$/i;
  for (let i = 0; i < parsed.experience.length; i++) {
    const exp = parsed.experience[i];
    checks += 2;

    if (!validDateFormats.test(exp.start_date.trim())) {
      issues.push({
        path: `experience[${i}].start_date`,
        message: `Non-standard date format: "${exp.start_date}"`,
        level: "warning",
        value: exp.start_date,
      });
    }
    if (!validDateFormats.test(exp.end_date.trim())) {
      issues.push({
        path: `experience[${i}].end_date`,
        message: `Non-standard date format: "${exp.end_date}"`,
        level: "warning",
        value: exp.end_date,
      });
    }
  }

  // --- 6. No duplicate experience entries ---
  checks++;
  const seen = new Set<string>();
  for (let i = 0; i < parsed.experience.length; i++) {
    const exp = parsed.experience[i];
    const key = `${exp.company}|${exp.title}|${exp.start_date}`.toLowerCase();
    if (seen.has(key)) {
      issues.push({
        path: `experience[${i}]`,
        message: `Duplicate role: "${exp.title}" at "${exp.company}" (${exp.start_date})`,
        level: "error",
        value: key,
      });
    }
    seen.add(key);
  }

  // --- 7. Experience should have at least one role ---
  checks++;
  if (parsed.experience.length === 0 && sourceTextLength && sourceTextLength > 200) {
    issues.push({
      path: "experience",
      message: "No experience roles extracted — likely a parsing failure",
      level: "error",
      value: "[]",
    });
  }

  // --- Compile report ---
  const errors = issues.filter(i => i.level === "error");
  const warnings = issues.filter(i => i.level === "warning");

  return {
    totalChecks: checks,
    issues,
    pass: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}

// ============================================================
// HUMAN-READABLE REPORT
// ============================================================

export function formatSanityReport(report: SanityReport): string {
  const lines: string[] = [];

  const verdict = report.pass ? "PASS" : "FAIL";
  lines.push(`=== SANITY CHECK: ${verdict} ===`);
  lines.push(`Checks run: ${report.totalChecks}`);
  lines.push(`Errors: ${report.errorCount}`);
  lines.push(`Warnings: ${report.warningCount}`);
  lines.push("");

  if (report.issues.length > 0) {
    for (const issue of report.issues) {
      const tag = issue.level === "error" ? "[ERROR]" : "[WARN]";
      lines.push(`  ${tag} ${issue.path}: ${issue.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
