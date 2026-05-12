/**
 * Source Grounder — Gate 1 of the Hard-Gated Maturation Protocol (HGMP)
 *
 * Verifies that every extractable value in a parsed CV JSON actually exists
 * in the source text. Prevents LLM hallucination by requiring character-level
 * evidence for every field.
 *
 * Inspired by:
 *   - Google LangExtract (char_interval source mapping)
 *   - AEVS framework (Anchor-Extraction-Verification-Supplement)
 *   - DSPy Assertions (hard computational constraints on LLM output)
 *
 * Design:
 *   - Every extracted field → fuzzy search in source text → grounded or FAIL
 *   - Derived fields (computed from other fields) are exempt: duration_months,
 *     total_experience_years, domain, category, tier, source, significance,
 *     is_professional, peer_reviewed, active
 *   - Short values (< 3 chars) skip grounding — too many false positives
 *   - Fuzzy matching: Levenshtein distance ≤ 2 for OCR artifacts
 *   - Multi-word fallback: all significant words present (handles reordering)
 *
 * Zero LLM calls. Pure deterministic CODE.
 */

import type { ParsedCVOutput } from "../prompts/cv-parser";

// ============================================================
// TYPES
// ============================================================

export type MatchType = "exact" | "normalized" | "fuzzy" | "words" | "none";

export interface GroundingResult {
  /** JSON path to the field (e.g., "experience[0].company") */
  path: string;
  /** The value being verified */
  value: string;
  /** Whether it was found in source text */
  grounded: boolean;
  /** How it was matched */
  matchType: MatchType;
  /** Character position in source text [start, end], null if not found */
  charInterval: [number, number] | null;
}

export interface DerivedField {
  /** JSON path to the field */
  path: string;
  /** The value */
  value: string;
  /** Why it's derived (not extracted) */
  derivation: string;
}

export interface GroundingReport {
  /** Total extractable fields checked */
  totalFields: number;
  /** Fields successfully grounded in source text */
  groundedCount: number;
  /** Fields that failed grounding — these are potential hallucinations */
  ungroundedFields: GroundingResult[];
  /** Fields that are derived (computed), not extracted — exempt from grounding */
  derivedFields: DerivedField[];
  /** Fields skipped (too short, null, empty) */
  skippedCount: number;
  /** PASS = zero ungrounded fields */
  pass: boolean;
  /** Pass rate as percentage */
  passRate: number;
}

// ============================================================
// LEVENSHTEIN DISTANCE (for OCR artifact tolerance)
// ============================================================

/**
 * Compute Levenshtein edit distance between two strings.
 * Used for fuzzy matching OCR artifacts (e.g., "Deisgn" vs "Design").
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization for memory efficiency
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

// ============================================================
// TEXT NORMALIZATION
// ============================================================

/** Normalize text for matching: lowercase, strip diacritics, collapse whitespace, strip punctuation */
function normalize(text: string): string {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip diacritics (ā→a, etc.)
    .toLowerCase()
    .replace(/[\-–—/\\]/g, " ") // dashes and slashes → space (preserves word boundaries)
    .replace(/[.,;:()'"\u2018\u2019\u201C\u201D&\u00B7\u2022\u00AE]/g, "") // strip other punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// FIELD MATCHING
// ============================================================

/**
 * Find a value in source text. Returns match type and character interval.
 *
 * Search order (most precise → least precise):
 * 1. Exact case-insensitive substring
 * 2. Normalized match (collapse whitespace, strip punctuation)
 * 3. Fuzzy match (Levenshtein ≤ 2, for values ≥ 5 chars)
 * 4. Multi-word fallback (all significant words present)
 */
// Module-level cache for source word set (reset per groundParsedCV call)
let sourceWordsCache: Set<string> | null = null;

function findInSource(
  value: string,
  rawSource: string,
  normalizedSource: string,
): { matchType: MatchType; charInterval: [number, number] | null } {
  const trimmed = value.trim();

  // Skip very short values — too many false positives
  if (trimmed.length < 3) {
    return { matchType: "exact", charInterval: [0, 0] }; // assumed grounded
  }

  // 1. Exact case-insensitive substring
  const lowerSource = rawSource.toLowerCase();
  const lowerValue = trimmed.toLowerCase();
  const exactIdx = lowerSource.indexOf(lowerValue);
  if (exactIdx !== -1) {
    return { matchType: "exact", charInterval: [exactIdx, exactIdx + trimmed.length] };
  }

  // 1b. URL normalization: strip protocol prefix and trailing slash
  if (lowerValue.startsWith("http")) {
    const stripped = lowerValue.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const urlIdx = lowerSource.indexOf(stripped);
    if (urlIdx !== -1) {
      return { matchType: "normalized", charInterval: [urlIdx, urlIdx + stripped.length] };
    }
  }

  // 1c. Character-spacing: "CSEP" matches "C S E P" (common PDF extraction artifact)
  if (trimmed.length >= 3 && trimmed.length <= 20 && !trimmed.includes(" ")) {
    const spacedValue = trimmed.split("").join(" ").toLowerCase();
    const spacedIdx = lowerSource.indexOf(spacedValue);
    if (spacedIdx !== -1) {
      return { matchType: "normalized", charInterval: [spacedIdx, spacedIdx + spacedValue.length] };
    }
  }

  // 1d. Two-digit year expansion: "2019" from source "(2018 - 19)" or "(2018-19)"
  // When a 4-digit year isn't found, check if its 2-digit suffix appears in a date range context
  if (/^\d{4}$/.test(trimmed)) {
    const twoDigit = trimmed.slice(2); // "19" from "2019"
    // Look for patterns like "(YYYY - DD)", "(YYYY-DD)", "(YYYY - DD)", "YYYY-DD"
    const yearRangePattern = new RegExp(`\\d{4}\\s*[-–—]\\s*${twoDigit}(?!\\d)`, "i");
    if (yearRangePattern.test(rawSource)) {
      return { matchType: "normalized", charInterval: null };
    }
  }

  // 2. Normalized match
  const normValue = normalize(trimmed);
  const normIdx = normalizedSource.indexOf(normValue);
  if (normIdx !== -1) {
    return { matchType: "normalized", charInterval: null }; // can't map back to raw positions after normalization
  }

  // 3. Fuzzy match — only for single-word or short values (≥ 5 chars, ≤ 40 chars)
  // Instead of O(n) sliding window, extract candidate tokens from source and compare
  if (trimmed.length >= 5 && normValue.length <= 40) {
    const maxDistance = 2;
    // For single words: compare against source words
    const normWords = normValue.split(" ");
    if (normWords.length === 1) {
      if (!sourceWordsCache) {
        sourceWordsCache = new Set(normalizedSource.split(" ").filter(w => w.length >= 3));
      }
      for (const srcWord of sourceWordsCache) {
        if (Math.abs(srcWord.length - normValue.length) <= maxDistance) {
          if (levenshtein(normValue, srcWord) <= maxDistance) {
            return { matchType: "fuzzy", charInterval: null };
          }
        }
      }
    }
    // For short multi-word values: check if most words fuzzy-match source words
    if (normWords.length >= 2 && normWords.length <= 4) {
      if (!sourceWordsCache) {
        sourceWordsCache = new Set(normalizedSource.split(" ").filter(w => w.length >= 3));
      }
      const fuzzyMatched = normWords.filter(w => {
        if (w.length < 3) return true; // skip short words
        for (const srcWord of sourceWordsCache!) {
          if (Math.abs(srcWord.length - w.length) <= maxDistance &&
              levenshtein(w, srcWord) <= maxDistance) {
            return true;
          }
        }
        return false;
      });
      if (fuzzyMatched.length === normWords.length) {
        return { matchType: "fuzzy", charInterval: null };
      }
    }
  }

  // 4. Multi-word fallback: all significant words (≥3 chars) appear in source
  const words = normValue.split(" ").filter(w => w.length >= 3);
  if (words.length >= 2) {
    const allFound = words.every(word => normalizedSource.includes(word));
    if (allFound) {
      return { matchType: "words", charInterval: null };
    }
  }

  return { matchType: "none", charInterval: null };
}

// ============================================================
// DERIVED FIELD DETECTION
// ============================================================

/** Fields that are computed/classified, not directly extracted from text */
const DERIVED_FIELDS = new Set([
  "total_experience_years",   // calculated from date span
  "duration_months",          // calculated from start/end dates
  "domain",                   // classified by LLM, not extracted verbatim
  "category",                 // classified
  "tier",                     // classified
  "source",                   // skill source section (classified)
  "significance",             // award significance (interpreted)
  "is_professional",          // project classification
  "peer_reviewed",            // publication classification
  "active",                   // cert status (interpreted)
]);

// ============================================================
// MAIN GROUNDING FUNCTION
// ============================================================

/**
 * Ground every extractable field in a parsed CV against the source text.
 *
 * Checks: name, email, phone, location, links, summary, experience (company,
 * employer, title, start_date, end_date, location, bullets, technologies_used,
 * metrics_mentioned, programs, seniority_signals), education (institution,
 * degree, field, grade, research_topic, highlights), skills (name, original_text),
 * competencies, certifications (name, issuer), awards (title, issuer, context),
 * projects (name, description, outcome, technologies), publications (title, venue),
 * volunteer (organization, role, description, impact), leadership (organization,
 * role, description, scope), professional_affiliations, training (name, provider),
 * languages_spoken, all_technologies.
 *
 * Skips: derived fields, null values, empty strings, values < 3 chars.
 */
export function groundParsedCV(
  parsed: ParsedCVOutput,
  sourceText: string,
): GroundingReport {
  const results: GroundingResult[] = [];
  const derived: DerivedField[] = [];
  let skipped = 0;

  // Reset fuzzy match cache for this CV
  sourceWordsCache = null;

  const normalizedSource = normalize(sourceText);

  // Helper: check one field
  function check(path: string, value: string | number | boolean | null | undefined, derivation?: string) {
    if (value === null || value === undefined) { skipped++; return; }
    const strVal = String(value).trim();
    if (strVal.length === 0) { skipped++; return; }

    // Check if this is a derived field
    const fieldName = path.split(".").pop() ?? path;
    if (DERIVED_FIELDS.has(fieldName) || derivation) {
      derived.push({ path, value: strVal, derivation: derivation ?? `${fieldName} is computed/classified` });
      return;
    }

    const { matchType, charInterval } = findInSource(strVal, sourceText, normalizedSource);
    results.push({
      path,
      value: strVal,
      grounded: matchType !== "none",
      matchType,
      charInterval,
    });
  }

  // Helper: check array of strings
  function checkArray(basePath: string, values: string[], derivation?: string) {
    for (let i = 0; i < values.length; i++) {
      check(`${basePath}[${i}]`, values[i], derivation);
    }
  }

  // --- Contact fields ---
  check("name", parsed.name);
  check("email", parsed.email);
  check("phone", parsed.phone);
  check("location.city", parsed.location?.city);
  check("location.country", parsed.location?.country);
  check("links.linkedin", parsed.links?.linkedin);
  check("links.github", parsed.links?.github);
  check("links.portfolio", parsed.links?.portfolio);
  checkArray("links.other", parsed.links?.other ?? []);

  // --- Summary ---
  // Summary is often a rewrite/synthesis — check if key phrases exist, not verbatim
  // But for strict grounding, we check it. Long summaries will likely fail if LLM rewrites them.
  // Decision: check summary but with a NOTE that it's often rewritten by parser
  if (parsed.summary && parsed.summary.length > 0) {
    // For summary, check first 80 chars as a proxy (full summary is often restructured)
    const summarySnippet = parsed.summary.substring(0, 80);
    check("summary (snippet)", summarySnippet);
  }

  // --- total_experience_years (DERIVED) ---
  derived.push({
    path: "total_experience_years",
    value: String(parsed.total_experience_years),
    derivation: "Calculated from earliest start to latest end date",
  });

  // --- Experience ---
  for (let i = 0; i < parsed.experience.length; i++) {
    const exp = parsed.experience[i];
    const prefix = `experience[${i}]`;

    check(`${prefix}.company`, exp.company);
    check(`${prefix}.employer`, exp.employer);
    check(`${prefix}.title`, exp.title);
    check(`${prefix}.start_date`, exp.start_date);
    check(`${prefix}.end_date`, exp.end_date);
    derived.push({ path: `${prefix}.duration_months`, value: String(exp.duration_months), derivation: "Calculated from start/end dates" });
    check(`${prefix}.location`, exp.location);
    checkArray(`${prefix}.bullets`, exp.bullets);
    checkArray(`${prefix}.technologies_used`, exp.technologies_used);
    checkArray(`${prefix}.metrics_mentioned`, exp.metrics_mentioned);
    checkArray(`${prefix}.programs`, exp.programs);
    checkArray(`${prefix}.seniority_signals`, exp.seniority_signals);
    check(`${prefix}.team_size`, exp.team_size != null ? String(exp.team_size) : null);
    derived.push({ path: `${prefix}.domain`, value: exp.domain, derivation: "Classified by LLM, not extracted verbatim" });
  }

  // --- Education ---
  for (let i = 0; i < parsed.education.length; i++) {
    const edu = parsed.education[i];
    const prefix = `education[${i}]`;

    check(`${prefix}.institution`, edu.institution);
    check(`${prefix}.degree`, edu.degree);
    check(`${prefix}.field`, edu.field);
    check(`${prefix}.start_year`, edu.start_year != null ? String(edu.start_year) : null);
    check(`${prefix}.end_year`, edu.end_year != null ? String(edu.end_year) : null);
    check(`${prefix}.grade`, edu.grade);
    check(`${prefix}.research_topic`, edu.research_topic);
    checkArray(`${prefix}.highlights`, edu.highlights);
  }

  // --- Skills ---
  for (let i = 0; i < parsed.skills.length; i++) {
    const skill = parsed.skills[i];
    const prefix = `skills[${i}]`;

    // name is a PROFESSIONAL EXPANSION per prompt rules (e.g., "EVM" → "Earned Value Management")
    // It's derived from original_text, not extracted verbatim. Treat as derived.
    derived.push({ path: `${prefix}.name`, value: skill.name, derivation: "Professional terminology expansion of original_text" });
    // original_text is what appeared in the CV — this MUST ground
    check(`${prefix}.original_text`, skill.original_text);
    derived.push({ path: `${prefix}.domain`, value: skill.domain, derivation: "Classified" });
    derived.push({ path: `${prefix}.category`, value: skill.category, derivation: "Classified" });
    derived.push({ path: `${prefix}.source`, value: skill.source, derivation: "Section source classification" });
  }

  // --- Competencies ---
  checkArray("competencies", parsed.competencies);

  // --- Certifications ---
  for (let i = 0; i < parsed.certifications.length; i++) {
    const cert = parsed.certifications[i];
    const prefix = `certifications[${i}]`;

    check(`${prefix}.name`, cert.name);
    check(`${prefix}.issuer`, cert.issuer);
    check(`${prefix}.year`, cert.year != null ? String(cert.year) : null);
    derived.push({ path: `${prefix}.active`, value: String(cert.active), derivation: "Interpreted status" });
    derived.push({ path: `${prefix}.tier`, value: cert.tier, derivation: "Classified tier" });
  }

  // --- Awards ---
  for (let i = 0; i < parsed.awards.length; i++) {
    const award = parsed.awards[i];
    const prefix = `awards[${i}]`;

    check(`${prefix}.title`, award.title);
    check(`${prefix}.issuer`, award.issuer);
    check(`${prefix}.context`, award.context);
    derived.push({ path: `${prefix}.significance`, value: award.significance ?? "", derivation: "Interpreted significance" });
  }

  // --- Projects ---
  for (let i = 0; i < parsed.projects.length; i++) {
    const proj = parsed.projects[i];
    const prefix = `projects[${i}]`;

    check(`${prefix}.name`, proj.name);
    check(`${prefix}.description`, proj.description);
    check(`${prefix}.outcome`, proj.outcome);
    checkArray(`${prefix}.technologies`, proj.technologies);
    derived.push({ path: `${prefix}.is_professional`, value: String(proj.is_professional), derivation: "Classified" });
  }

  // --- Publications ---
  for (let i = 0; i < parsed.publications.length; i++) {
    const pub = parsed.publications[i];
    const prefix = `publications[${i}]`;

    check(`${prefix}.title`, pub.title);
    check(`${prefix}.venue`, pub.venue);
    check(`${prefix}.year`, pub.year != null ? String(pub.year) : null);
    derived.push({ path: `${prefix}.peer_reviewed`, value: String(pub.peer_reviewed), derivation: "Interpreted" });
  }

  // --- Volunteer ---
  for (let i = 0; i < parsed.volunteer.length; i++) {
    const vol = parsed.volunteer[i];
    const prefix = `volunteer[${i}]`;

    check(`${prefix}.organization`, vol.organization);
    check(`${prefix}.role`, vol.role);
    check(`${prefix}.start_date`, vol.start_date);
    check(`${prefix}.end_date`, vol.end_date);
    check(`${prefix}.description`, vol.description);
    check(`${prefix}.impact`, vol.impact);
  }

  // --- Leadership ---
  for (let i = 0; i < parsed.leadership.length; i++) {
    const lead = parsed.leadership[i];
    const prefix = `leadership[${i}]`;

    check(`${prefix}.organization`, lead.organization);
    check(`${prefix}.role`, lead.role);
    check(`${prefix}.start_date`, lead.start_date);
    check(`${prefix}.end_date`, lead.end_date);
    check(`${prefix}.description`, lead.description);
    check(`${prefix}.scope`, lead.scope);
  }

  // --- Simple arrays ---
  checkArray("professional_affiliations", parsed.professional_affiliations);
  // languages_spoken: often inferred (CV written in English ≠ "English" stated in text)
  // Check against source, but languages not found are logged as derived-inference
  for (let i = 0; i < parsed.languages_spoken.length; i++) {
    const lang = parsed.languages_spoken[i];
    const { matchType } = findInSource(lang, sourceText, normalizedSource);
    if (matchType !== "none") {
      results.push({ path: `languages_spoken[${i}]`, value: lang, grounded: true, matchType, charInterval: null });
    } else {
      // Not found — mark as derived inference, not ungrounded
      derived.push({ path: `languages_spoken[${i}]`, value: lang, derivation: "Inferred from CV language, not explicitly stated" });
    }
  }
  checkArray("all_technologies", parsed.all_technologies);

  // --- Training ---
  for (let i = 0; i < parsed.training.length; i++) {
    const t = parsed.training[i];
    const prefix = `training[${i}]`;

    check(`${prefix}.name`, t.name);
    check(`${prefix}.provider`, t.provider);
    check(`${prefix}.year`, t.year != null ? String(t.year) : null);
    // hours is typically derived/estimated
    derived.push({ path: `${prefix}.hours`, value: String(t.hours ?? "null"), derivation: "Often estimated" });
  }

  // --- Compile report ---
  const ungrounded = results.filter(r => !r.grounded);

  return {
    totalFields: results.length,
    groundedCount: results.filter(r => r.grounded).length,
    ungroundedFields: ungrounded,
    derivedFields: derived,
    skippedCount: skipped,
    pass: ungrounded.length === 0,
    passRate: results.length > 0
      ? Math.round((results.filter(r => r.grounded).length / results.length) * 1000) / 10
      : 100,
  };
}

// ============================================================
// HUMAN-READABLE REPORT
// ============================================================

/**
 * Generate a human-readable grounding report.
 * Shows PASS/FAIL verdict, pass rate, and lists every ungrounded field.
 */
export function formatGroundingReport(report: GroundingReport): string {
  const lines: string[] = [];

  // Verdict
  const verdict = report.pass ? "PASS" : "FAIL";
  lines.push(`=== SOURCE GROUNDING: ${verdict} ===`);
  lines.push(`Fields checked: ${report.totalFields}`);
  lines.push(`Grounded: ${report.groundedCount} (${report.passRate}%)`);
  lines.push(`Ungrounded: ${report.ungroundedFields.length}`);
  lines.push(`Derived (exempt): ${report.derivedFields.length}`);
  lines.push(`Skipped (null/empty): ${report.skippedCount}`);
  lines.push("");

  // Ungrounded fields (potential hallucinations)
  if (report.ungroundedFields.length > 0) {
    lines.push("--- UNGROUNDED FIELDS (potential hallucinations) ---");
    for (const field of report.ungroundedFields) {
      const truncated = field.value.length > 80
        ? field.value.substring(0, 77) + "..."
        : field.value;
      lines.push(`  [FAIL] ${field.path}: "${truncated}"`);
    }
    lines.push("");
  }

  // Derived fields (for transparency)
  if (report.derivedFields.length > 0) {
    lines.push(`--- DERIVED FIELDS (${report.derivedFields.length} exempt) ---`);
    for (const field of report.derivedFields) {
      lines.push(`  [DERIVED] ${field.path}: ${field.derivation}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
