/**
 * CV Cleaner — Pre-Cloud Data Quality Module
 *
 * Consolidates all cleaning, validation, and verification that runs
 * BETWEEN parsing and Cloud building:
 *
 * 1. cleanTitle() — strip garbage from role titles
 * 2. filterGarbageBullets() — remove non-content bullets
 * 3. validateDates() — semantic date sanity checks
 * 4. verifyAgainstSourceText() — anti-hallucination source verification
 * 5. buildConflictQuestions() — convert ConflictReport to Phase 1 Socratic questions
 * 6. cleanParsedCVs() — orchestrator that runs all cleaning on parsed CVs
 *
 * All deterministic — zero LLM calls, zero tokens.
 */

import type { ConflictReport } from "./conflict-detector";
import type { InputCV, InputRole } from "./resolution-merger";
import { parseRoleDate, monthsBetween } from "./conflict-detector";

// ============================================================
// TYPES
// ============================================================

export interface DateValidationIssue {
  role_index: number;
  title: string;
  company: string;
  issue: "end_before_start" | "future_date" | "unreasonable_duration" | "zero_duration_with_dates";
  detail: string;
}

export interface SourceVerificationResult {
  role_index: number;
  title: string;
  company: string;
  field: "title" | "company" | "skill";
  value: string;
  found_in_source: boolean;
}

export interface CleaningReport {
  cv_id: string;
  roles_removed: number;
  bullets_removed: number;
  skills_rejected: number;
  date_issues: DateValidationIssue[];
  source_mismatches: SourceVerificationResult[];
}

export interface Phase1Question {
  id: string;
  type: "conflict" | "gap" | "employer_group";
  question: string;
  options?: Array<{ label: string; value: string }>;
}

// ============================================================
// TITLE CLEANING
// ============================================================

/** Remove garbage from role titles: section headers, date fragments, bullet prefixes */
export function cleanTitle(title: string): string {
  return title
    .replace(/^[•·\-▪►]\s*/, "")          // bullet prefixes
    .replace(/\(?\d{4}\s*[-–—].*$/, "")    // trailing date ranges
    .replace(/^\s*(EXPERIENCE|EDUCATION|SKILLS|ABOUT)\s*$/i, "") // section headers
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// BULLET FILTERING
// ============================================================

const GARBAGE_PATTERNS = [
  /^(EXPERIENCE|EDUCATION|SKILLS|ABOUT|SUMMARY|PROFILE|CERTIF|TRAINING|Page\s+\d)/i,
  /^(References available|Willing to relocate|Date of birth|Nationality|Passport)/i,
  /^\d{4}\s*[-–—]/, // bare date ranges
  /^[A-Z\s,]+$/, // ALL CAPS lines (likely headers)
];

/** Filter out garbage bullets: too short, section headers, competency sentences without action */
export function filterGarbageBullets(bullets: string[]): string[] {
  return bullets.filter((b) => {
    const trimmed = b.trim();
    if (trimmed.length < 15) return false; // too short to be meaningful
    if (trimmed.length > 500) return false; // likely a paragraph dump
    for (const pattern of GARBAGE_PATTERNS) {
      if (pattern.test(trimmed)) return false;
    }
    return true;
  });
}

// ============================================================
// DATE SANITY VALIDATION
// ============================================================

/**
 * Validates date semantics on parsed roles:
 * - end_date must not be before start_date
 * - dates must not be in the future (with 1-month grace period)
 * - duration must be reasonable (0 < months < 600 = 50 years)
 * - if both dates are present but duration_months is 0, flag it
 */
export function validateDates(roles: InputRole[]): DateValidationIssue[] {
  const issues: DateValidationIssue[] = [];
  const now = new Date();
  const nowMonths = now.getFullYear() * 12 + now.getMonth();

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const start = parseRoleDate(role.start_date);
    const end = parseRoleDate(role.end_date);

    // Skip roles with unparseable dates — they'll be handled by gap detection
    if (!start && !end) continue;

    // end_date before start_date
    if (start && end && !end.isPresent) {
      const startMonths = start.year * 12 + start.month;
      const endMonths = end.year * 12 + end.month;
      if (endMonths < startMonths) {
        issues.push({
          role_index: i,
          title: role.title,
          company: role.company,
          issue: "end_before_start",
          detail: `End date "${role.end_date}" is before start date "${role.start_date}"`,
        });
      }
    }

    // Future dates (1-month grace period for "current" roles listed as next month)
    if (start && !start.isPresent) {
      const startMonths = start.year * 12 + start.month;
      if (startMonths > nowMonths + 1) {
        issues.push({
          role_index: i,
          title: role.title,
          company: role.company,
          issue: "future_date",
          detail: `Start date "${role.start_date}" is in the future`,
        });
      }
    }

    if (end && !end.isPresent) {
      const endMonths = end.year * 12 + end.month;
      if (endMonths > nowMonths + 1) {
        issues.push({
          role_index: i,
          title: role.title,
          company: role.company,
          issue: "future_date",
          detail: `End date "${role.end_date}" is in the future`,
        });
      }
    }

    // Unreasonable duration (> 50 years)
    const duration = monthsBetween(role.start_date, role.end_date);
    if (duration !== null && duration > 600) {
      issues.push({
        role_index: i,
        title: role.title,
        company: role.company,
        issue: "unreasonable_duration",
        detail: `Duration is ${duration} months (${Math.round(duration / 12)} years) — exceeds 50-year maximum`,
      });
    }

    // Both dates present but duration_months is 0 (parsing missed it)
    if (start && end && (role.duration_months === 0 || role.duration_months === undefined)) {
      if (duration !== null && duration > 0) {
        issues.push({
          role_index: i,
          title: role.title,
          company: role.company,
          issue: "zero_duration_with_dates",
          detail: `Has dates (${role.start_date} - ${role.end_date}) but duration_months is 0. Computed: ${duration} months`,
        });
        // Auto-fix: set duration_months to computed value
        role.duration_months = duration;
      }
    }
  }

  return issues;
}

// ============================================================
// SOURCE TEXT VERIFICATION (Anti-hallucination)
// ============================================================

/**
 * Verify that key fields extracted by the LLM actually appear in the
 * original PDF text. Catches hallucinated companies, titles, and skills.
 *
 * Uses case-insensitive substring matching with fuzzy tolerance:
 * - Exact substring match first
 * - Then normalized match (collapse whitespace, remove punctuation)
 * - Skills check against all source text
 *
 * Inspired by Layout-Aware Parsing (Oct 2025) "source text verification" step.
 */

// Alias map: canonical skill name → terms that may appear in source text instead
const SKILL_ALIAS_MAP: Record<string, string[]> = {
  "machine learning": ["ai/ml", "artificial intelligence", "ml"],
  "data science": ["data analytics", "analytics", "data analysis"],
  "budgeting": ["budget", "budget management", "cost-control", "cost savings"],
  "root cause analysis": ["rca", "corrective action"],
  "procurement": ["spares planning", "sourcing"],
  "team leadership": ["led team", "leading team", "team lead"],
  "communication": ["interpersonal", "liaison"],
  "strategic planning": ["strategy", "strategic"],
  "supervision": ["supervisor", "supervisory", "supervised"],
  "predictive maintenance": ["trend monitoring", "condition monitoring"],
};

export function verifyAgainstSourceText(
  roles: InputRole[],
  sourceText: string,
): SourceVerificationResult[] {
  const results: SourceVerificationResult[] = [];
  if (!sourceText || sourceText.trim().length === 0) return results;

  const normalizedSource = normalizeForVerification(sourceText);

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];

    // Verify company name
    const companyFound = fieldExistsInSource(role.company, sourceText, normalizedSource);
    results.push({
      role_index: i,
      title: role.title,
      company: role.company,
      field: "company",
      value: role.company,
      found_in_source: companyFound,
    });

    // Verify title
    const titleFound = fieldExistsInSource(role.title, sourceText, normalizedSource);
    results.push({
      role_index: i,
      title: role.title,
      company: role.company,
      field: "title",
      value: role.title,
      found_in_source: titleFound,
    });

    // Verify technologies (skills) — also check known aliases
    if (role.technologies_used) {
      for (const skill of role.technologies_used) {
        let skillFound = fieldExistsInSource(skill, sourceText, normalizedSource);
        // If not found by canonical name, check known aliases
        if (!skillFound) {
          const aliases = SKILL_ALIAS_MAP[skill.toLowerCase()];
          if (aliases) {
            skillFound = aliases.some(alias => fieldExistsInSource(alias, sourceText, normalizedSource));
          }
        }
        results.push({
          role_index: i,
          title: role.title,
          company: role.company,
          field: "skill",
          value: skill,
          found_in_source: skillFound,
        });
      }
    }
  }

  return results;
}

/** Normalize text for fuzzy matching: lowercase, collapse whitespace, remove common punctuation */
function normalizeForVerification(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\-–—]/g, " ")   // dashes to spaces
    .replace(/[.,;:()'"/\\]/g, "") // remove punctuation
    .replace(/\s+/g, " ")      // collapse whitespace
    .trim();
}

/**
 * Check if a field value exists in source text.
 * Tries exact substring first, then normalized match.
 * Short values (< 3 chars) are always considered found (too many false positives).
 */
function fieldExistsInSource(
  value: string,
  rawSource: string,
  normalizedSource: string,
): boolean {
  if (!value || value.trim().length < 3) return true; // too short to verify

  // Exact case-insensitive substring
  if (rawSource.toLowerCase().includes(value.toLowerCase())) return true;

  // Normalized match (handles "S e n i o r" → "senior", punctuation differences)
  const normalizedValue = normalizeForVerification(value);
  if (normalizedSource.includes(normalizedValue)) return true;

  // For multi-word values, check if all significant words appear
  // (handles reordering: "Senior Software Engineer" vs "Software Engineer, Senior")
  const words = normalizedValue.split(" ").filter(w => w.length >= 3);
  if (words.length >= 2) {
    const allWordsFound = words.every(word => normalizedSource.includes(word));
    if (allWordsFound) return true;
  }

  return false;
}

// ============================================================
// CONTACT DETAIL EXTRACTION (Factual field bypass — inspired by ResumeFlow)
// ============================================================

/**
 * Extracted contact details from raw CV text.
 * These bypass the LLM entirely — regex extraction is near-100% accurate
 * for structured data like emails, phones, URLs.
 */
export interface ExtractedContact {
  emails: string[];
  phones: string[];
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  urls: string[];
}

// RFC 5322 simplified email pattern
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// International phone: +country-code or local formats, 7+ digits
const PHONE_RE = /(?:\+?\d{1,4}[\s\-.]?)?\(?\d{1,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{2,4}[\s\-.]?\d{0,4}/g;

// URL patterns
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w\-%.]+\/?/gi;
const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/[\w\-]+\/?/gi;
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

/**
 * Extract contact details from raw CV text using regex.
 * Zero LLM calls. Near-100% accuracy for structured fields.
 *
 * Priority: regex-extracted values override LLM-extracted values.
 */
export function extractContactDetails(rawText: string): ExtractedContact {
  // Extract emails (deduplicated)
  const emails = [...new Set(rawText.match(EMAIL_RE) ?? [])];

  // Extract phones — filter to those with 7+ digits (avoid matching years/IDs)
  const phoneMatches = rawText.match(PHONE_RE) ?? [];
  const phones = [...new Set(
    phoneMatches
      .map(p => p.trim())
      .filter(p => {
        const digits = p.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      }),
  )];

  // Extract LinkedIn URL (first match)
  const linkedinMatches = rawText.match(LINKEDIN_RE);
  const linkedin = linkedinMatches ? linkedinMatches[0] : null;

  // Extract GitHub URL (first match)
  const githubMatches = rawText.match(GITHUB_RE);
  const github = githubMatches ? githubMatches[0] : null;

  // Extract all other URLs (exclude LinkedIn/GitHub, deduplicated)
  const allUrls = rawText.match(URL_RE) ?? [];
  const knownUrls = new Set([linkedin, github].filter(Boolean).map(u => u!.toLowerCase()));
  const otherUrls = [...new Set(
    allUrls.filter(u => !knownUrls.has(u.toLowerCase())),
  )];

  // Portfolio: first non-LinkedIn, non-GitHub URL (heuristic)
  const portfolio = otherUrls.length > 0 ? otherUrls[0] : null;

  return {
    emails,
    phones,
    linkedin,
    github,
    portfolio,
    urls: otherUrls,
  };
}

// ============================================================
// SKILL VERIFICATION (Deterministic — inspired by SRICL 2604.21525)
// ============================================================

/**
 * Common words that are NOT skills — extracted by LLMs as false positives.
 * Includes sentence fragments, filler words, and generic terms.
 */
const NOT_SKILLS = new Set([
  "responsible for", "worked with", "worked on", "involved in",
  "experience with", "experience in", "knowledge of", "familiar with",
  "proficient in", "skilled in", "strong", "excellent", "good",
  "various", "multiple", "several", "many", "other", "etc",
  "including", "such as", "related", "relevant", "general",
  "technical", "professional", "advanced", "basic",
  "the", "and", "for", "with", "from", "into", "this", "that",
  "new", "all", "any", "use", "used", "using",
  "team", "teams", "staff", "role", "roles", "work", "company",
  "development", "implementation", "management", "process", "processes",
  "system", "systems", "solution", "solutions", "service", "services",
  "tools", "technologies", "skills", "industry", "business",
]);

/**
 * Deterministic skill verifier — catches structural extraction errors.
 *
 * Failure modes addressed (from SRICL paper):
 * 1. Sentence fragments — skills longer than 4 words are likely not skills
 * 2. Common words — generic terms the LLM misidentified as skills
 * 3. Boundary drift — partial word extractions or trailing punctuation
 * 4. Numeric-only — bare numbers or dates extracted as skills
 *
 * Returns only valid skills. Cost: $0 (pure string checks).
 */
export function verifySkills(skills: string[]): { valid: string[]; rejected: string[] } {
  const valid: string[] = [];
  const rejected: string[] = [];

  for (const raw of skills) {
    const skill = raw.trim();

    // Empty or too short (single character)
    if (skill.length < 2) { rejected.push(skill); continue; }

    // Too long — likely a sentence fragment, not a skill name
    // Real skills: "Model-Based Systems Engineering" (4 words), "Lean Six Sigma" (3 words)
    // Generous limit: 6 words to handle compound domain skills
    const wordCount = skill.split(/\s+/).length;
    if (wordCount > 6) { rejected.push(skill); continue; }

    // Numeric-only or date-like
    if (/^\d[\d\s/\-.,]*$/.test(skill)) { rejected.push(skill); continue; }

    // Known non-skills (case-insensitive exact match)
    if (NOT_SKILLS.has(skill.toLowerCase())) { rejected.push(skill); continue; }

    // Starts with a preposition/article — sentence fragment leak
    if (/^(the|a|an|to|in|on|at|by|of|for|with|from|and|or|but)\s/i.test(skill)) {
      rejected.push(skill); continue;
    }

    // Contains verb phrases indicating a sentence, not a skill
    if (/^(responsible|worked|involved|experience|knowledge|familiar|proficient|skilled)\b/i.test(skill)) {
      rejected.push(skill); continue;
    }

    // Trailing/leading punctuation cleanup (boundary drift)
    const cleaned = skill
      .replace(/^[,;:\-•·▪►\s]+/, "")
      .replace(/[,;:\-•·▪►\s]+$/, "")
      .trim();

    if (cleaned.length < 2) { rejected.push(skill); continue; }

    valid.push(cleaned);
  }

  return { valid, rejected };
}

// ============================================================
// CONFLICT → PHASE 1 QUESTIONS
// ============================================================

/** Build Phase 1 Socratic questions from a conflict report. Hard cap: 6 questions. */
/**
 * Shorten a filename for display: remove extension, "Copy of" prefixes, trim.
 */
function shortName(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/\.docx$/i, "")
    .replace(/^(Copy of )+/gi, "")
    .trim();
}

export function buildConflictQuestions(report: ConflictReport): Phase1Question[] {
  const questions: Phase1Question[] = [];

  // Conflict resolution questions (pick-one)
  for (const conflict of report.conflicts) {
    // Deduplicate options by unique title+dates (multiple CVs may have identical entries)
    const seen = new Map<string, { label: string; value: string }>();
    for (const entry of conflict.entries) {
      const key = `${entry.title}|${entry.start_date}|${entry.end_date}`.toLowerCase();
      if (!seen.has(key)) {
        const dates = entry.start_date && entry.end_date
          ? ` (${entry.start_date} – ${entry.end_date})`
          : "";
        seen.set(key, {
          label: `"${entry.title}"${dates}`,
          value: `${entry.source_id}:${entry.title}:${entry.start_date}`,
        });
      }
    }
    const options = Array.from(seen.values());

    // Build a cleaner question based on conflict type
    const company = conflict.entries[0]?.company ?? "this role";
    let question: string;
    if (conflict.fields.includes("title")) {
      const uniqueTitles = [...new Set(conflict.entries.map(e => e.title))];
      question = `Your CVs use different titles for your role at ${company}. Which is most accurate?`;
      if (uniqueTitles.length === 2) {
        question = `At ${company}, your CVs say "${uniqueTitles[0]}" and "${uniqueTitles[1]}". Which title is correct?`;
      }
    } else if (conflict.fields.includes("start_date") || conflict.fields.includes("end_date")) {
      question = `Your CVs show different dates for your time at ${company}. Which dates are correct?`;
    } else {
      question = `We found conflicting information about your role at ${company}. Which version is correct?`;
    }

    // Only add if there are actually different options to choose from
    if (options.length > 1) {
      questions.push({
        id: conflict.id,
        type: "conflict",
        question,
        options,
      });
    }
  }

  // Gap questions (yes/no + free text)
  for (let i = 0; i < report.gaps.length; i++) {
    const gap = report.gaps[i];
    questions.push({
      id: `gap-${i}`,
      type: "gap",
      question: gap.prompt,
    });
  }

  // Employer group confirmations
  for (let i = 0; i < report.employer_groups.length; i++) {
    const group = report.employer_groups[i];
    const titles = [...new Set(group.roles.map(r => r.title))].slice(0, 4).join(", ");
    questions.push({
      id: `employer-${i}`,
      type: "employer_group",
      question: `You held ${group.distinct_titles} different titles at ${group.employer} (${titles}). Were these all within the same organization?`,
      options: [
        { label: "Yes — same organization (transfers, name changes, or rotations)", value: "same_employer" },
        { label: "No — these are different employers", value: "different_employers" },
      ],
    });
  }

  // Hard cap: 6 Phase 1 questions max (from socratic-engine-FINAL-v2.md)
  return questions.slice(0, 6);
}

// ============================================================
// ORCHESTRATOR — Clean parsed CVs for Cloud building
// ============================================================

/**
 * Full cleaning pipeline for parsed CVs:
 * 1. Clean titles (garbage removal)
 * 2. Filter garbage bullets
 * 3. Remove roles with no meaningful content
 * 4. Validate date semantics (auto-fixes zero durations)
 * 5. Verify against source text (if provided)
 *
 * Returns cleaned CVs + cleaning report per CV.
 */
export function cleanParsedCVs(
  rawCVs: Array<{
    id: string;
    filename: string;
    parsed_cv: Record<string, unknown>;
    source_text?: string; // original PDF text for source verification
  }>,
): { cleanedCVs: InputCV[]; reports: CleaningReport[] } {
  const cleanedCVs: InputCV[] = [];
  const reports: CleaningReport[] = [];

  for (const raw of rawCVs) {
    const cv = raw.parsed_cv;
    const experience = (cv.experience ?? []) as Array<Record<string, unknown>>;
    const originalRoleCount = experience.length;

    let totalSkillsRejected = 0;

    const roles: InputRole[] = experience
      .map((role) => {
        const rawSkills = (role.technologies_used as string[]) ?? [];
        const { valid: verifiedSkills, rejected } = verifySkills(rawSkills);
        totalSkillsRejected += rejected.length;
        return {
          title: cleanTitle((role.title as string) ?? ""),
          company: ((role.company as string) ?? "").trim(),
          start_date: ((role.start_date as string) ?? "").trim(),
          end_date: ((role.end_date as string) ?? "").trim(),
          duration_months: (role.duration_months as number) ?? 0,
          bullets: filterGarbageBullets((role.bullets ?? []) as string[]),
          technologies_used: verifiedSkills,
          metrics_mentioned: (role.metrics_mentioned as string[]) ?? [],
          domain: (role.domain as string) ?? "general",
        };
      })
      .filter((role) =>
        // Remove roles with no meaningful content
        role.title.length > 2 &&
        role.company.length > 2 &&
        role.title !== "Role detected",
      );

    // Count bullets removed
    const originalBulletCount = experience.reduce(
      (sum, r) => sum + ((r.bullets as string[]) ?? []).length,
      0,
    );
    const cleanBulletCount = roles.reduce(
      (sum, r) => sum + r.bullets.length,
      0,
    );

    // Date validation (auto-fixes zero duration_months)
    const dateIssues = validateDates(roles);

    // Source text verification — BLOCK unverified skills (not just flag them)
    let sourceMismatches: SourceVerificationResult[] = [];
    if (raw.source_text) {
      const allResults = verifyAgainstSourceText(roles, raw.source_text);
      sourceMismatches = allResults.filter(r => !r.found_in_source);

      // Strip unverified skills from technologies_used per role
      // (skills the LLM fabricated that don't appear in original text)
      const unverifiedSkills = new Set(
        sourceMismatches
          .filter(r => r.field === "skill")
          .map(r => `${r.role_index}:${r.value}`),
      );
      if (unverifiedSkills.size > 0) {
        for (let i = 0; i < roles.length; i++) {
          const role = roles[i];
          const techs = role.technologies_used ?? [];
          const before = techs.length;
          role.technologies_used = techs.filter(
            (skill) => !unverifiedSkills.has(`${i}:${skill}`),
          );
          totalSkillsRejected += before - role.technologies_used.length;
        }
      }
      // Note: unverified company/title are NOT stripped — they may be
      // legitimate normalizations (Sr. → Senior). These get flagged
      // in the report for potential Socratic confirmation.
    }

    // Carry top-level skills (parser extracts these even when technologies_used per role is empty)
    const rawSkills = (cv.skills ?? []) as Array<{ name: string; domain?: string; category?: string; source?: string }>;
    const topLevelSkills = rawSkills
      .filter(s => s.name && s.name.length >= 2)
      .map(s => ({
        name: s.name,
        domain: s.domain ?? "general",
        category: s.category ?? "general",
        source: s.source ?? "skills_section",
      }));

    cleanedCVs.push({
      id: raw.id,
      name: raw.filename,
      roles,
      education: (cv.education as InputCV["education"]) ?? [],
      certifications: (Array.isArray(cv.certifications) ? cv.certifications : []).map(
        (c: unknown) => (typeof c === "string" ? c : (c as { name?: string })?.name ?? String(c))
      ),
      skills: topLevelSkills,
    });

    reports.push({
      cv_id: raw.id,
      roles_removed: originalRoleCount - roles.length,
      bullets_removed: originalBulletCount - cleanBulletCount,
      skills_rejected: totalSkillsRejected,
      date_issues: dateIssues,
      source_mismatches: sourceMismatches,
    });
  }

  return { cleanedCVs, reports };
}
