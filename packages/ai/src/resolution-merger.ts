/**
 * Resolution Merger
 *
 * Takes:
 *   1. Parsed CVs (from LLM parse or local parser)
 *   2. Conflict detection report
 *   3. Parsed user answers (from answer-parser)
 *   4. Direct option selections (employer confirmation, etc.)
 *
 * Produces:
 *   A single resolved timeline — canonical roles, correct dates/titles,
 *   merged bullets, no duplicates, ready for Cloud building.
 *
 * Zero LLM calls — pure deterministic merge logic.
 */

import type { AnswerParseResult, ParsedRoleFromAnswer } from "./answer-parser";

// ============================================================
// TYPES
// ============================================================

export interface ResolvedRole {
  /** Canonical title (from user correction or best source) */
  title: string;
  /** Organization/unit */
  organization: string;
  /** Parent employer (e.g. "Pakistan Air Force") — null if not confirmed */
  employer: string | null;
  /** Start date in "Mon YYYY" format */
  start_date: string;
  /** End date in "Mon YYYY" or "Present" */
  end_date: string;
  /** Approximate duration in months */
  duration_months: number;
  /** Merged, deduplicated bullets from all CVs + user answers */
  bullets: string[];
  /** Named programs/platforms */
  programs: string[];
  /** Technologies/skills extracted from this role (carried from parsed CVs) */
  technologies_used: string[];
  /** Largest team size mentioned */
  team_size: number | null;
  /** Alternative titles found across CVs */
  alt_titles: string[];
  /** Which source CVs mentioned this role */
  source_cvs: string[];
  /** How this role was established */
  origin: "parsed" | "user_confirmed" | "socratic_discovery";
  /** Domain detected */
  domain: string;
}

export interface ResolvedEducation {
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
  research_topic: string | null;
}

export interface ResolvedProfile {
  /** Single employer if confirmed, null otherwise */
  employer: string | null;
  /** User's persona */
  persona: string;
  /** Canonical role timeline, sorted chronologically */
  roles: ResolvedRole[];
  /** Education entries */
  education: ResolvedEducation[];
  /** Certifications (merged, deduped) */
  certifications: string[];
  /** All programs found across career */
  programs: string[];
  /** Top-level skills from parsed CVs (merged, deduped) */
  skills: Array<{ name: string; domain: string; category: string; source: string }>;
  /** Flags from user answers (anonymize requests, sensitivity, etc.) */
  flags: string[];
  /** Metadata */
  meta: {
    cvs_analyzed: number;
    conflicts_detected: number;
    conflicts_resolved: number;
    roles_discovered_via_socratic: number;
    total_career_months: number;
  };
}

// ============================================================
// INPUT TYPES (from parsed CVs)
// ============================================================

export interface InputRole {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  duration_months?: number;
  bullets: string[];
  technologies_used?: string[];
  metrics_mentioned?: string[];
  domain?: string;
  programs?: string[];
  team_size?: number | null;
}

export interface InputCV {
  id: string;
  name: string;
  roles: InputRole[];
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    dates?: string;
    start_year?: number | null;
    end_year?: number | null;
  }>;
  certifications?: string[];
  /** Top-level skills extracted by parser (may not be linked to specific roles) */
  skills?: Array<{ name: string; domain: string; category: string; source: string }>;
}

export interface DirectAnswers {
  employer_confirmed: string | null; // "Pakistan Air Force" or null
  is_single_employer: boolean;
}

// ============================================================
// DATE UTILS
// ============================================================

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_MAP: Record<string, number> = {};
for (let i = 0; i < MONTH_NAMES.length; i++) {
  MONTH_MAP[MONTH_NAMES[i].toLowerCase()] = i;
}

function parseDateToMonths(s: string): number | null {
  if (!s) return null;
  const trimmed = s.trim().toLowerCase();

  if (trimmed === "present" || trimmed === "current") {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
  }

  // "Mon YYYY" — e.g. "Jan 2020", "Dec 2015"
  const monthYear = trimmed.match(/^([a-z]{3,})\s*[-,]?\s*(\d{4})$/);
  if (monthYear) {
    const m = MONTH_MAP[monthYear[1].slice(0, 3)];
    if (m !== undefined) return parseInt(monthYear[2]) * 12 + m;
  }

  // "YYYY" only
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) return parseInt(yearOnly[1]) * 12;

  return null;
}

function monthsBetween(start: string, end: string): number {
  const s = parseDateToMonths(start);
  const e = parseDateToMonths(end);
  if (s === null || e === null) return 0;
  return Math.max(0, e - s);
}

function compareDates(a: string, b: string): number {
  const am = parseDateToMonths(a) ?? 0;
  const bm = parseDateToMonths(b) ?? 0;
  return am - bm;
}

// ============================================================
// UNION COVERAGE (for checking if answer-parsed roles cover a CV period)
// ============================================================

/**
 * Compute what fraction of [groupStart, groupEnd] is covered by the union
 * of all coveredPeriods. Handles overlapping intervals correctly.
 */
function computeUnionCoverage(
  coveredPeriods: Array<{ start: number; end: number }>,
  groupStart: number,
  groupEnd: number,
): number {
  const groupDuration = groupEnd - groupStart;
  if (groupDuration <= 0) return 0;

  // Clip each period to the group range and keep valid ones
  const clipped = coveredPeriods
    .map(cp => ({ start: Math.max(cp.start, groupStart), end: Math.min(cp.end, groupEnd) }))
    .filter(cp => cp.end > cp.start)
    .sort((a, b) => a.start - b.start);

  if (clipped.length === 0) return 0;

  // Merge overlapping intervals and sum total covered
  let totalCovered = 0;
  let curStart = clipped[0].start;
  let curEnd = clipped[0].end;

  for (let i = 1; i < clipped.length; i++) {
    if (clipped[i].start <= curEnd) {
      curEnd = Math.max(curEnd, clipped[i].end);
    } else {
      totalCovered += curEnd - curStart;
      curStart = clipped[i].start;
      curEnd = clipped[i].end;
    }
  }
  totalCovered += curEnd - curStart;

  return totalCovered / groupDuration;
}

// ============================================================
// BULLET DEDUPLICATION
// ============================================================

function normalizeBullet(b: string): string {
  return b.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function dedupBullets(bullets: string[]): string[] {
  const seen = new Map<string, string>();
  for (const b of bullets) {
    const key = normalizeBullet(b);
    if (key.length < 10) continue;
    // Keep the longer/richer version
    if (!seen.has(key) || b.length > (seen.get(key)?.length ?? 0)) {
      seen.set(key, b);
    }
  }
  return Array.from(seen.values());
}

// ============================================================
// DOMAIN DETECTION
// ============================================================

function detectDomain(text: string): string {
  const lower = text.toLowerCase();
  if (/avion|aircraft|aviation|aerospace|flight|airworth/i.test(lower)) return "aviation";
  if (/defense|defence|military|armed forces|air force|weapons?|missile/i.test(lower)) return "defense";
  if (/software|web|app|cloud|saas/i.test(lower)) return "technology";
  if (/healthcare|medical|pharma|clinical|hospital|patient/i.test(lower)) return "healthcare";
  if (/finance|banking|fintech|investment|trading/i.test(lower)) return "finance";
  if (/energy|oil|gas|renewable|power\s*plant/i.test(lower)) return "energy";
  if (/manufactur|industrial|production|factory/i.test(lower)) return "manufacturing";
  if (/universit|college|academic|education|hec|faculty|research/i.test(lower)) return "academia";
  if (/quality|qa|accreditation|iso/i.test(lower)) return "quality";
  if (/consult/i.test(lower)) return "consulting";
  if (/retail|store|merchandise|e-?commerce/i.test(lower)) return "retail";
  if (/legal|law\s*firm|attorney|litigation/i.test(lower)) return "legal";
  return "general";
}

// ============================================================
// ROLE SIMILARITY (for cross-CV grouping)
// ============================================================

const STOP_WORDS = new Set(["of", "the", "and", "at", "in", "for", "a", "an", "to"]);

function extractWords(text: string, minLen: number): Set<string> {
  return new Set(
    text.toLowerCase()
      .split(/[\s,()/]+/) // preserve & in abbreviations like AEW&C
      .filter(w => w.length >= minLen && !STOP_WORDS.has(w))
  );
}

/** Check if two roles are likely the same position across different CVs.
 *  Two-tier: company match (1 distinctive word) is sufficient,
 *  otherwise need 2+ title+company matches to avoid false positives. */
function rolesShareContext(a: { title: string; company: string }, b: { title: string; company: string }): boolean {
  // Tier 1: Company names share a distinctive word (>= 4 chars)
  const companyA = extractWords(a.company, 4);
  const companyB = extractWords(b.company, 4);
  for (const w of companyA) {
    if (companyB.has(w)) return true;
  }

  // Tier 2: Combined title+company share 2+ words (>= 3 chars)
  const allA = extractWords(a.title + " " + a.company, 3);
  const allB = extractWords(b.title + " " + b.company, 3);
  let matches = 0;
  for (const w of allA) {
    if (allB.has(w)) matches++;
  }
  return matches >= 2;
}

// ============================================================
// CORE MERGE LOGIC
// ============================================================

/**
 * Merge parsed CVs + user answers into a single resolved profile.
 *
 * Algorithm:
 * 1. Apply answer-parsed roles (from Q2-like answers) — these REPLACE collapsed CV entries
 * 2. Apply date corrections — fix specific role dates
 * 3. Apply title corrections — fix specific role titles
 * 4. For remaining CV roles (not overridden by answers), merge across CVs:
 *    - Group by overlapping date + company
 *    - Pick best title (user-corrected > most common > longest)
 *    - Merge bullets, deduplicate
 * 5. Sort chronologically
 * 6. Validate: no gaps, no overlaps, no duplicates
 */
export function mergeResolvedProfile(
  parsedCVs: InputCV[],
  answerResults: AnswerParseResult[],
  directAnswers: DirectAnswers,
  persona: string,
): ResolvedProfile {
  // Collect all corrections
  const allRoles: ParsedRoleFromAnswer[] = [];
  const allDateCorrections: AnswerParseResult["date_corrections"] = [];
  const allTitleCorrections: AnswerParseResult["title_corrections"] = [];
  const allFlags: string[] = [];

  for (const ar of answerResults) {
    allRoles.push(...ar.roles);
    allDateCorrections.push(...ar.date_corrections);
    allTitleCorrections.push(...ar.title_corrections);
    allFlags.push(...ar.flags);
  }

  // Collect all certifications across CVs
  const allCerts = new Set<string>();
  for (const cv of parsedCVs) {
    for (const cert of cv.certifications ?? []) {
      allCerts.add(cert);
    }
  }

  // Build title correction map: period → corrected title
  const titleMap = new Map<string, string>();
  for (const tc of allTitleCorrections) {
    titleMap.set(tc.period, tc.corrected_title);
  }

  // Build date correction map: role description → corrected dates
  const dateMap = new Map<string, { start: string; end: string }>();
  for (const dc of allDateCorrections) {
    dateMap.set(dc.role_description.toLowerCase(), {
      start: dc.corrected_start,
      end: dc.corrected_end,
    });
  }

  // ---- Phase A: Roles from answer parsing (user-confirmed splits) ----
  // These override any CV entries for the same period
  const resolvedRoles: ResolvedRole[] = [];
  const coveredPeriods: Array<{ start: number; end: number }> = [];

  for (const role of allRoles) {
    const startM = parseDateToMonths(role.start_date);
    const endM = parseDateToMonths(role.end_date);
    if (startM !== null && endM !== null) {
      coveredPeriods.push({ start: startM, end: endM });
    }

    resolvedRoles.push({
      title: role.title,
      organization: role.organization,
      employer: directAnswers.employer_confirmed,
      start_date: role.start_date,
      end_date: role.end_date,
      duration_months: monthsBetween(role.start_date, role.end_date),
      bullets: role.responsibilities,
      programs: role.programs,
      technologies_used: [],
      team_size: role.team_size,
      alt_titles: [],
      source_cvs: role.source === "socratic_discovery" ? ["Socratic"] : [],
      origin: role.source === "socratic_discovery" ? "socratic_discovery" : "user_confirmed",
      domain: detectDomain(role.responsibilities.join(" ") + " " + role.organization),
    });
  }

  // ---- Phase B: CV roles NOT covered by answer-parsed roles ----
  // Group across CVs by overlapping dates + company
  interface CVRoleWithSource extends InputRole {
    source_id: string;
    source_name: string;
  }

  const allCVRoles: CVRoleWithSource[] = [];
  for (const cv of parsedCVs) {
    for (const role of cv.roles) {
      allCVRoles.push({ ...role, source_id: cv.id, source_name: cv.name });
    }
  }

  // Group matching roles across CVs
  const used = new Set<number>();
  const roleGroups: CVRoleWithSource[][] = [];

  for (let i = 0; i < allCVRoles.length; i++) {
    if (used.has(i)) continue;
    const group = [allCVRoles[i]];
    used.add(i);

    for (let j = i + 1; j < allCVRoles.length; j++) {
      if (used.has(j)) continue;
      if (allCVRoles[i].source_id === allCVRoles[j].source_id) continue;

      // Check if same role: overlapping dates + similar company
      const aStart = parseDateToMonths(allCVRoles[i].start_date) ?? 0;
      const aEnd = parseDateToMonths(allCVRoles[i].end_date) ?? 0;
      const bStart = parseDateToMonths(allCVRoles[j].start_date) ?? 0;
      const bEnd = parseDateToMonths(allCVRoles[j].end_date) ?? 0;

      const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
      const shorter = Math.min(aEnd - aStart, bEnd - bStart);

      if (overlap > 0 && overlap >= shorter * 0.3 && rolesShareContext(allCVRoles[i], allCVRoles[j])) {
        group.push(allCVRoles[j]);
        used.add(j);
      }
    }

    roleGroups.push(group);
  }

  // For each group, check if it's already covered by answer-parsed roles
  for (const group of roleGroups) {
    const groupStart = parseDateToMonths(group[0].start_date) ?? 0;
    const groupEnd = parseDateToMonths(group[0].end_date) ?? 0;

    // Check if this period is covered by the UNION of answer-parsed roles
    const coverage = computeUnionCoverage(coveredPeriods, groupStart, groupEnd);
    const isCovered = coverage >= 0.5;

    if (isCovered) {
      // This CV period is replaced by user's answer — merge bullets into BEST-matching answer-parsed role only
      for (const cvRole of group) {
        const cvStart = parseDateToMonths(cvRole.start_date) ?? 0;
        const cvEnd = parseDateToMonths(cvRole.end_date) ?? 0;

        // Find the answer-parsed role with the MOST temporal overlap
        let bestMatch: ResolvedRole | null = null;
        let bestOverlap = 0;

        for (const resolved of resolvedRoles) {
          if (resolved.origin === "parsed") continue; // only match answer-parsed roles
          const rStart = parseDateToMonths(resolved.start_date) ?? 0;
          const rEnd = parseDateToMonths(resolved.end_date) ?? 0;
          const overlap = Math.min(cvEnd, rEnd) - Math.max(cvStart, rStart);
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestMatch = resolved;
          }
        }

        if (bestMatch) {
          bestMatch.bullets.push(...cvRole.bullets);
          const normalTitle = cvRole.title.toLowerCase().trim();
          const resolvedTitle = bestMatch.title.toLowerCase().trim();
          if (normalTitle !== resolvedTitle && !bestMatch.alt_titles.some(t => t.toLowerCase() === normalTitle)) {
            bestMatch.alt_titles.push(cvRole.title);
          }
          if (!bestMatch.source_cvs.includes(cvRole.source_name)) {
            bestMatch.source_cvs.push(cvRole.source_name);
          }
          for (const p of cvRole.programs ?? []) {
            if (!bestMatch.programs.includes(p)) bestMatch.programs.push(p);
          }
          for (const t of cvRole.technologies_used ?? []) {
            if (!bestMatch.technologies_used.includes(t)) bestMatch.technologies_used.push(t);
          }
          if (cvRole.team_size && (!bestMatch.team_size || cvRole.team_size > bestMatch.team_size)) {
            bestMatch.team_size = cvRole.team_size;
          }
        }
      }
      continue;
    }

    // Not covered — merge this CV role group into a resolved role
    const representative = group[0];

    // Apply date corrections
    let startDate = representative.start_date;
    let endDate = representative.end_date;

    for (const [desc, corrected] of dateMap) {
      const roleText = (representative.title + " " + representative.company).toLowerCase();
      if (roleText.includes(desc) || desc.includes(roleText.slice(0, 20).toLowerCase())) {
        startDate = corrected.start;
        endDate = corrected.end;
        break;
      }
    }

    // Apply title corrections — match role start year to period start (exclusive end)
    let title = representative.title;
    for (const [period, correctedTitle] of titleMap) {
      const yearRange = period.match(/(\d{4})/g);
      if (yearRange) {
        const periodStart = parseInt(yearRange[0]);
        // Exclusive end: "2015-2017" matches start year 2015 or 2016, NOT 2017
        const periodEnd = yearRange[1] ? parseInt(yearRange[1]) : periodStart + 1;
        const roleStartYear = parseInt(startDate.match(/\d{4}/)?.[0] ?? "0");
        if (roleStartYear >= periodStart && roleStartYear < periodEnd) {
          title = correctedTitle;
          break;
        }
      }
    }

    // Merge bullets from all CVs in group
    const allBullets = group.flatMap(r => r.bullets);
    const allTechs = group.flatMap(r => r.technologies_used ?? []);
    const altTitles = [...new Set(group.map(r => r.title).filter(t => t.toLowerCase() !== title.toLowerCase()))];
    const sourceCvs = [...new Set(group.map(r => r.source_name))];
    const programs = [...new Set(group.flatMap(r => r.programs ?? []))];
    const teamSizes = group.map(r => r.team_size).filter((t): t is number => t !== null && t !== undefined);

    resolvedRoles.push({
      title,
      organization: representative.company,
      employer: directAnswers.employer_confirmed,
      start_date: startDate,
      end_date: endDate,
      duration_months: monthsBetween(startDate, endDate),
      bullets: allBullets,
      programs,
      technologies_used: [...new Set(allTechs)],
      team_size: teamSizes.length > 0 ? Math.max(...teamSizes) : null,
      alt_titles: altTitles,
      source_cvs: sourceCvs,
      origin: "parsed",
      domain: detectDomain(allBullets.join(" ") + " " + representative.company),
    });
  }

  // ---- Phase C: Deduplicate bullets within each role ----
  for (const role of resolvedRoles) {
    role.bullets = dedupBullets(role.bullets);
  }

  // ---- Phase C.5: Cross-role bullet dedup (first occurrence wins) ----
  const seenBullets = new Set<string>();
  for (const role of resolvedRoles) {
    role.bullets = role.bullets.filter(b => {
      const key = normalizeBullet(b);
      if (seenBullets.has(key)) return false;
      seenBullets.add(key);
      return true;
    });
  }

  // ---- Phase D: Sort chronologically ----
  resolvedRoles.sort((a, b) => compareDates(a.start_date, b.start_date));

  // ---- Phase E: Build education (with fuzzy dedup) ----
  const educationMap = new Map<string, ResolvedEducation>();

  // Normalize degree names for deduplication (profession-agnostic equivalences)
  function normalizeDegreeName(degree: string): string {
    const d = degree.toLowerCase().trim();
    // Postgraduate medical equivalences
    if (d.includes("fcps") || d === "fellowship" || d.includes("fellow of college")) return "fellowship";
    if (d.includes("frcs")) return "fellowship";
    if (d.includes("mrcp")) return "membership";
    // Medical degrees
    if (d.includes("mbbs") || d === "md" || d.includes("bachelor of medicine")) return "mbbs";
    // Engineering equivalences
    if (d.includes("b.tech") || d.includes("btech") || d.includes("b.eng") || d.includes("beng") || d.includes("b.sc. eng") || d.includes("bse")) return "bachelor_eng";
    if (d.includes("m.tech") || d.includes("mtech") || d.includes("m.eng") || d.includes("meng") || d.includes("m.sc. eng")) return "master_eng";
    // Business
    if (d.includes("mba")) return "mba";
    // Accounting
    if (d === "ca" || d.includes("chartered accountant")) return "ca";
    return d;
  }

  function normalizeFieldName(field: string): string {
    const f = field.toLowerCase().trim();
    // Normalize common field variations
    if (f.includes("anesthes") || f.includes("anaesth")) return "anesthesiology";
    if (f.includes("computer science") || f.includes("cs") && f.length <= 3) return "computer_science";
    if (f.includes("electrical") && f.includes("eng")) return "electrical_engineering";
    if (f.includes("mechanical") && f.includes("eng")) return "mechanical_engineering";
    if (f.includes("medicine") || f === "medical" || f === "mbbs") return "medicine";
    return f;
  }

  for (const cv of parsedCVs) {
    for (const edu of cv.education ?? []) {
      // Key by NORMALIZED degree + field (catches FCPS=Fellowship, MBBS variants, etc.)
      const normalizedDegree = normalizeDegreeName(edu.degree);
      const normalizedField = normalizeFieldName(edu.field);
      const key = (normalizedDegree + " " + normalizedField).trim();
      if (!educationMap.has(key)) {
        let startDate = "";
        let endDate = "";

        if (edu.start_year) startDate = `${edu.start_year}`;
        if (edu.end_year) endDate = `${edu.end_year}`;
        if (edu.dates) {
          const parts = edu.dates.split(/[-–—]/);
          if (parts[0]) startDate = parts[0].trim();
          if (parts[1]) endDate = parts[1].trim();
        }

        educationMap.set(key, {
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          start_date: startDate,
          end_date: endDate,
          research_topic: null,
        });
      }
    }
  }

  // ---- Phase F: Collect all programs ----
  const allPrograms = [...new Set(resolvedRoles.flatMap(r => r.programs))];

  // ---- Phase G: Compute metadata ----
  const socraticDiscoveries = resolvedRoles.filter(r => r.origin === "socratic_discovery").length;
  // Compute total experience as UNION of date spans (handles overlapping/concurrent roles)
  const roleSpans = resolvedRoles
    .map(r => ({ start: parseDateToMonths(r.start_date) ?? 0, end: parseDateToMonths(r.end_date) ?? 0 }))
    .filter(s => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  let totalMonths = 0;
  if (roleSpans.length > 0) {
    let curStart = roleSpans[0].start;
    let curEnd = roleSpans[0].end;
    for (let i = 1; i < roleSpans.length; i++) {
      if (roleSpans[i].start <= curEnd) {
        curEnd = Math.max(curEnd, roleSpans[i].end);
      } else {
        totalMonths += curEnd - curStart;
        curStart = roleSpans[i].start;
        curEnd = roleSpans[i].end;
      }
    }
    totalMonths += curEnd - curStart;
  }

  const educationEntries = Array.from(educationMap.values());

  return {
    employer: directAnswers.employer_confirmed,
    persona,
    roles: resolvedRoles,
    education: educationEntries,
    certifications: Array.from(allCerts),
    programs: allPrograms,
    skills: dedupeSkills(parsedCVs),
    flags: allFlags,
    meta: {
      cvs_analyzed: parsedCVs.length,
      conflicts_detected: 0, // caller sets this from conflict report
      conflicts_resolved: 0, // caller sets this
      roles_discovered_via_socratic: socraticDiscoveries,
      total_career_months: totalMonths,
    },
  };
}

/** Merge and deduplicate top-level skills from all input CVs */
function dedupeSkills(cvs: InputCV[]): Array<{ name: string; domain: string; category: string; source: string }> {
  const seen = new Set<string>();
  const result: Array<{ name: string; domain: string; category: string; source: string }> = [];
  for (const cv of cvs) {
    for (const skill of cv.skills ?? []) {
      const key = skill.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(skill);
      }
    }
  }
  return result;
}

// ============================================================
// ADAPTER: ResolvedProfile → ParsedCV (for Cloud builder)
// ============================================================

import type { ParsedCV } from "./types";

const METRIC_RE = /\d+[\d,]*\s*[%xX]|\$[\d,.]+[MmBbKk]?|\d+[\d,]*\s*(?:users|customers|transactions|requests|orders|employees|engineers|developers|clients|servers|nodes|instances|teams|percent|months|years|days|hours)/gi;

const KNOWN_LANGUAGES = new Set(["javascript", "typescript", "python", "java", "c#", "c++", "rust", "ruby", "php", "swift", "kotlin", "scala", "matlab", "sql", "bash", "perl", "lua", "dart", "objective-c", "assembly", "vhdl", "verilog"]);
// Short/ambiguous names excluded from KNOWN_LANGUAGES: "r", "go" — they match common English words.
// They'll be caught by extractSkillsFromText with proper word boundaries if present in a skills section.
const KNOWN_FRAMEWORKS = new Set(["react", "next.js", "nextjs", "angular", "vue", "svelte", "express", "django", "flask", "spring", "rails", "laravel", "fastapi", ".net", "asp.net", "node.js", "nodejs", "remix", "nuxt", "gatsby", "nest.js", "nestjs", "electron", "react native", "flutter"]);
const KNOWN_INFRA = new Set(["aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "github actions", "gitlab ci", "circleci", "nginx", "apache", "linux", "vercel", "netlify", "cloudflare", "heroku", "datadog", "grafana", "prometheus"]);
const KNOWN_DATABASES = new Set(["postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra", "sqlite", "oracle", "sql server", "supabase", "firebase", "neo4j", "couchdb", "mariadb"]);

function categorizeSkill(name: string): { domain: string; category: string } {
  const lower = name.toLowerCase();
  if (KNOWN_LANGUAGES.has(lower)) return { domain: "technology", category: "programming_language" };
  if (KNOWN_FRAMEWORKS.has(lower)) return { domain: "technology", category: "framework" };
  if (KNOWN_INFRA.has(lower)) return { domain: "technology", category: "cloud_infrastructure" };
  if (KNOWN_DATABASES.has(lower)) return { domain: "technology", category: "database" };
  return { domain: "general", category: "general" };
}

/**
 * Convert a ResolvedProfile into the ParsedCV shape that buildCloudFromParsedCV expects.
 * Extracts technologies from programs + bullet text, metrics from bullets.
 */
export function resolvedProfileToParsedCV(profile: ResolvedProfile): ParsedCV {
  const skills: ParsedCV["skills"] = [];
  const allTechSet = new Set<string>();
  const addedSkills = new Set<string>();

  const experience: ParsedCV["experience"] = profile.roles.map((role) => {
    // Technologies: carried from parsed CVs + programs + any known tech in bullets
    const techs = new Set<string>([...role.programs, ...role.technologies_used]);
    const bulletText = role.bullets.join(" ").toLowerCase();
    for (const set of [KNOWN_LANGUAGES, KNOWN_FRAMEWORKS, KNOWN_INFRA, KNOWN_DATABASES]) {
      for (const tech of set) {
        // Word boundary match to avoid "r" matching everywhere, "go" in "going", etc.
        const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "i");
        if (re.test(bulletText)) techs.add(tech);
      }
    }

    // Metrics: numbers with context
    const metrics: string[] = [];
    for (const bullet of role.bullets) {
      const matches = bullet.match(METRIC_RE);
      if (matches) metrics.push(...matches.map(m => m.trim()));
    }

    for (const t of techs) allTechSet.add(t);

    return {
      company: role.employer ?? role.organization,
      title: role.title,
      start_date: role.start_date,
      end_date: role.end_date,
      duration_months: role.duration_months,
      technologies_used: [...techs],
      metrics_mentioned: [...new Set(metrics)],
      domain: role.domain,
    };
  });

  // Build classified skills array from discovered technologies
  for (const tech of allTechSet) {
    const key = tech.toLowerCase();
    if (addedSkills.has(key)) continue;
    addedSkills.add(key);
    const { domain, category } = categorizeSkill(tech);
    skills.push({ name: tech, domain, category, source: "experience" });
  }

  // Also add programs from all roles if not already present
  for (const prog of profile.programs) {
    const key = prog.toLowerCase();
    if (!addedSkills.has(key)) {
      addedSkills.add(key);
      skills.push({ name: prog, domain: "general", category: "program", source: "experience" });
    }
  }

  // Carry forward top-level skills from parsed CVs (critical for non-tech professions
  // where skills like "Anesthesiology", "Critical Care" appear in skills section
  // but not in technologies_used per role)
  for (const skill of profile.skills) {
    const key = skill.name.toLowerCase();
    if (!addedSkills.has(key)) {
      addedSkills.add(key);
      allTechSet.add(skill.name);
      skills.push(skill);
    }
  }

  const totalMonths = profile.meta.total_career_months;

  return {
    total_experience_years: Math.round(totalMonths / 12),
    experience,
    skills,
    all_technologies: [...allTechSet],
    education: profile.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      start_year: e.start_date ? parseInt(e.start_date.match(/\d{4}/)?.[0] ?? "") || null : null,
      end_year: e.end_date ? parseInt(e.end_date.match(/\d{4}/)?.[0] ?? "") || null : null,
      research_topic: e.research_topic,
      highlights: [],
    })),
    certifications: profile.certifications,
  };
}
