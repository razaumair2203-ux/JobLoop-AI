/**
 * Multi-Document Conflict Detector
 *
 * When a user uploads multiple CVs (or CV + LinkedIn), this module:
 * 1. Finds roles that appear to be the same across documents (fuzzy matching)
 * 2. Flags conflicts: different dates, titles, descriptions for matched roles
 * 3. Detects timeline gaps (potential hidden roles)
 * 4. Detects same-employer groupings (military rotations, corporate transfers)
 * 5. Returns structured conflict objects for UI to present as "pick one" choices
 *
 * All deterministic — zero LLM calls, zero tokens.
 */

// ============================================================
// TYPES
// ============================================================

export interface ParsedRole {
  /** Which source document this came from */
  source_id: string;
  /** Source document display name */
  source_name: string;
  /** Job title as it appears in the source */
  title: string;
  /** Company/organization name */
  company: string;
  /** Start date string, e.g. "Jan 2020", "2020", "2020-01" */
  start_date: string;
  /** End date string, e.g. "Dec 2023", "Present" */
  end_date: string;
  /** Location if available */
  location?: string;
  /** Bullet points / description lines */
  bullets: string[];
}

export interface RoleConflict {
  /** Unique conflict ID */
  id: string;
  /** Type of conflict detected */
  type: "date_mismatch" | "title_mismatch" | "description_gap" | "duplicate";
  /** The matched role entries from different documents */
  entries: ParsedRole[];
  /** Human-readable description of the conflict */
  description: string;
  /** Which field(s) differ */
  fields: string[];
}

export interface TimelineGap {
  /** Gap start date (end of previous role) */
  after_role: { title: string; company: string; end_date: string };
  /** Gap end date (start of next role) */
  before_role: { title: string; company: string; start_date: string };
  /** Gap duration in months (approximate) */
  gap_months: number;
  /** Suggested prompt for user */
  prompt: string;
}

export interface EmployerGroup {
  /** Normalized employer name */
  employer: string;
  /** All roles under this employer, sorted by date */
  roles: ParsedRole[];
  /** Number of distinct titles */
  distinct_titles: number;
  /** Whether this looks like rotational postings (military/gov pattern) */
  is_rotational: boolean;
  /** Suggested prompt for user */
  prompt: string;
}

export interface ConflictReport {
  /** Role-level conflicts between documents */
  conflicts: RoleConflict[];
  /** Timeline gaps that might indicate hidden roles */
  gaps: TimelineGap[];
  /** Same-employer groupings (rotational postings, transfers) */
  employer_groups: EmployerGroup[];
  /** Total number of unique roles detected across all documents */
  unique_roles_detected: number;
  /** Summary stats */
  stats: {
    documents_analyzed: number;
    total_roles_parsed: number;
    conflicts_found: number;
    gaps_found: number;
    employer_groups_found: number;
  };
}

// ============================================================
// DATE PARSING
// ============================================================

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

/** Parse a date string like "Jan 2020", "2020", "2020-01", "Present" into a Date-like object */
function parseRoleDate(s: string): { year: number; month: number; isPresent: boolean } | null {
  if (!s) return null;
  const trimmed = s.trim().toLowerCase();

  if (trimmed === "present" || trimmed === "current" || trimmed === "now") {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), isPresent: true };
  }

  // "Jan 2020" or "January 2020"
  const monthYear = trimmed.match(/^([a-z]+)\s*[\-,]?\s*(\d{4})$/);
  if (monthYear) {
    const month = MONTH_MAP[monthYear[1]];
    if (month !== undefined) {
      return { year: parseInt(monthYear[2]), month, isPresent: false };
    }
  }

  // "2020-01" or "2020/01"
  const isoish = trimmed.match(/^(\d{4})[\-\/](\d{1,2})$/);
  if (isoish) {
    return { year: parseInt(isoish[1]), month: parseInt(isoish[2]) - 1, isPresent: false };
  }

  // "2020" (year only — assume January)
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return { year: parseInt(yearOnly[1]), month: 0, isPresent: false };
  }

  // "01/2020" or "1/2020"
  const monthSlash = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthSlash) {
    return { year: parseInt(monthSlash[2]), month: parseInt(monthSlash[1]) - 1, isPresent: false };
  }

  return null;
}

/** Convert parsed date to months-since-epoch for comparison */
function dateToMonths(d: { year: number; month: number }): number {
  return d.year * 12 + d.month;
}

/** Calculate approximate months between two date strings */
function monthsBetween(startStr: string, endStr: string): number | null {
  const start = parseRoleDate(startStr);
  const end = parseRoleDate(endStr);
  if (!start || !end) return null;
  return dateToMonths(end) - dateToMonths(start);
}

// ============================================================
// TEXT SIMILARITY (simple, no dependencies)
// ============================================================

/** Normalize a string for comparison: lowercase, remove punctuation, collapse whitespace */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Extract significant words (drop articles, prepositions) */
function significantWords(s: string): Set<string> {
  const stopwords = new Set([
    "a", "an", "the", "and", "or", "of", "in", "at", "to", "for",
    "is", "was", "were", "be", "been", "with", "on", "by", "from",
  ]);
  return new Set(
    normalize(s).split(" ").filter(w => w.length > 1 && !stopwords.has(w))
  );
}

/** Jaccard similarity between two sets of words (0-1) */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check if two words share a common stem (prefix ≥ 6 chars).
 * Catches: anesthesiology↔anesthesia, engineering↔engineer,
 * management↔manager, programming↔programmer, etc.
 */
function stemMatch(a: string, b: string): boolean {
  const minLen = Math.min(a.length, b.length);
  if (minLen < 5) return a === b;
  const prefixLen = Math.min(6, minLen);
  return a.slice(0, prefixLen) === b.slice(0, prefixLen);
}

/**
 * Stem-aware word matching: count how many words in set A
 * have a stem-match in set B.
 */
function stemAwareOverlap(a: Set<string>, b: Set<string>): number {
  let matches = 0;
  for (const wordA of a) {
    for (const wordB of b) {
      if (stemMatch(wordA, wordB)) { matches++; break; }
    }
  }
  return matches;
}

/**
 * Check if two role titles are synonymous (same role, different wording).
 * Uses stem-aware matching to handle:
 * - "Residency Training (FCPS), Anesthesiology" vs "Anesthesia Residency"
 * - "Software Engineer" vs "Software Development Engineer"
 * - "Project Manager" vs "PM - Project Management"
 * - "Senior Consultant" vs "Sr. Consulting Lead"
 *
 * Returns true if titles describe the same role.
 */
function titlesAreSynonymous(a: string, b: string): boolean {
  // Exact match after normalization
  if (normalize(a) === normalize(b)) return true;

  const wordsA = significantWords(a);
  const wordsB = significantWords(b);

  // If either is empty, can't compare
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  // Containment: all words of the shorter title stem-match in the longer
  const [smaller, larger] = wordsA.size <= wordsB.size ? [wordsA, wordsB] : [wordsB, wordsA];
  const containedCount = stemAwareOverlap(smaller, larger);
  if (containedCount === smaller.size) return true;

  // Stem-aware Jaccard: symmetric overlap > 50%
  // Strictly >0.5: "House Officer" vs "Medical Officer" (1/2=0.5) must be DIFF
  const overlapAB = stemAwareOverlap(wordsA, wordsB);
  const overlapBA = stemAwareOverlap(wordsB, wordsA);
  const totalOverlap = Math.max(overlapAB, overlapBA);
  const maxSize = Math.max(wordsA.size, wordsB.size);
  if (totalOverlap / maxSize > 0.5) return true;

  return false;
}

/** Check if two company names are likely the same entity */
function companiesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);

  // Exact match after normalization
  if (na === nb) return true;

  // One contains the other (handles "PAC Kamra" vs "Pakistan Aeronautical Complex Kamra")
  if (na.includes(nb) || nb.includes(na)) return true;

  // Word-level Jaccard
  const wordsA = significantWords(a);
  const wordsB = significantWords(b);
  if (jaccardSimilarity(wordsA, wordsB) >= 0.5) return true;

  // Common abbreviation patterns
  const abbrevMap: Record<string, string[]> = {
    "pac": ["pakistan aeronautical complex"],
    "cadi": ["chengdu aircraft design institute"],
    "paf": ["pakistan air force", "air force"],
    "nutech": ["national university of technology"],
    "hec": ["higher education commission"],
  };

  for (const [abbrev, expansions] of Object.entries(abbrevMap)) {
    const hasAbbrev = na.includes(abbrev) || nb.includes(abbrev);
    const hasExpansion = expansions.some(e => na.includes(e) || nb.includes(e));
    if (hasAbbrev && hasExpansion) return true;
  }

  return false;
}

/** Check if two titles are similar enough to be the same role */
function titlesOverlap(a: string, b: string): number {
  return jaccardSimilarity(significantWords(a), significantWords(b));
}

/** Check if two date ranges overlap significantly */
function datesOverlap(a: ParsedRole, b: ParsedRole): boolean {
  const aStart = parseRoleDate(a.start_date);
  const aEnd = parseRoleDate(a.end_date);
  const bStart = parseRoleDate(b.start_date);
  const bEnd = parseRoleDate(b.end_date);

  if (!aStart || !aEnd || !bStart || !bEnd) return false;

  const aStartM = dateToMonths(aStart);
  const aEndM = dateToMonths(aEnd);
  const bStartM = dateToMonths(bStart);
  const bEndM = dateToMonths(bEnd);

  // Allow 6-month tolerance for fuzzy date reporting
  const tolerance = 6;
  const overlapStart = Math.max(aStartM, bStartM);
  const overlapEnd = Math.min(aEndM, bEndM);
  const overlap = overlapEnd - overlapStart;

  // Roles overlap if the overlap is within tolerance of the shorter role
  const shorterDuration = Math.min(aEndM - aStartM, bEndM - bStartM);
  return overlap >= -tolerance && overlap >= shorterDuration * 0.3;
}

// ============================================================
// CORE DETECTION
// ============================================================

/** Determine if two roles from different documents refer to the same position */
function rolesMatch(a: ParsedRole, b: ParsedRole): boolean {
  // Must be from different documents
  if (a.source_id === b.source_id) return false;

  // Company must match
  if (!companiesMatch(a.company, b.company)) return false;

  // Dates must overlap (with tolerance)
  if (!datesOverlap(a, b)) return false;

  // Title similarity helps but isn't required (same role gets different titles across CVs)
  // If company + dates match, it's very likely the same role even with different titles
  return true;
}

/** Group roles that refer to the same position across documents */
function findRoleGroups(allRoles: ParsedRole[]): ParsedRole[][] {
  const used = new Set<number>();
  const groups: ParsedRole[][] = [];

  for (let i = 0; i < allRoles.length; i++) {
    if (used.has(i)) continue;

    const group = [allRoles[i]];
    used.add(i);

    for (let j = i + 1; j < allRoles.length; j++) {
      if (used.has(j)) continue;
      if (rolesMatch(allRoles[i], allRoles[j])) {
        group.push(allRoles[j]);
        used.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

/** Detect timeline gaps between consecutive roles */
function detectGaps(
  roleGroups: ParsedRole[][],
  minGapMonths: number = 3,
): TimelineGap[] {
  // Build a merged timeline: for each group, take the best start/end
  const timeline: Array<{
    title: string;
    company: string;
    startMonths: number;
    endMonths: number;
    start_date: string;
    end_date: string;
  }> = [];

  for (const group of roleGroups) {
    const starts = group
      .map(r => parseRoleDate(r.start_date))
      .filter((d): d is NonNullable<typeof d> => d !== null);
    const ends = group
      .map(r => parseRoleDate(r.end_date))
      .filter((d): d is NonNullable<typeof d> => d !== null);

    if (starts.length === 0 || ends.length === 0) continue;

    // Take earliest start, latest end
    const startMonths = Math.min(...starts.map(dateToMonths));
    const endMonths = Math.max(...ends.map(dateToMonths));

    timeline.push({
      title: group[0].title,
      company: group[0].company,
      startMonths,
      endMonths,
      start_date: group[0].start_date,
      end_date: group[0].end_date,
    });
  }

  // Sort by start date
  timeline.sort((a, b) => a.startMonths - b.startMonths);

  // Find gaps
  const gaps: TimelineGap[] = [];
  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i];
    const next = timeline[i + 1];
    const gapMonths = next.startMonths - current.endMonths;

    if (gapMonths >= minGapMonths) {
      gaps.push({
        after_role: {
          title: current.title,
          company: current.company,
          end_date: current.end_date,
        },
        before_role: {
          title: next.title,
          company: next.company,
          start_date: next.start_date,
        },
        gap_months: gapMonths,
        prompt: `There's a ${gapMonths}-month gap between "${current.title}" (ending ${current.end_date}) and "${next.title}" (starting ${next.start_date}). Were you employed during this period?`,
      });
    }
  }

  return gaps;
}

/** Detect same-employer groupings (military rotations, corporate transfers) */
function detectEmployerGroups(allRoles: ParsedRole[]): EmployerGroup[] {
  // Group all roles by normalized employer
  const byEmployer = new Map<string, ParsedRole[]>();

  for (const role of allRoles) {
    const normalizedCompany = normalize(role.company);

    // Find existing group or create new one
    let found = false;
    for (const [, roles] of byEmployer) {
      if (companiesMatch(role.company, roles[0].company)) {
        roles.push(role);
        found = true;
        break;
      }
    }
    if (!found) {
      byEmployer.set(normalizedCompany, [role]);
    }
  }

  const groups: EmployerGroup[] = [];

  for (const [, roles] of byEmployer) {
    // Deduplicate: only count unique roles (not same role from different CVs)
    const uniqueByDate = new Map<string, ParsedRole>();
    for (const role of roles) {
      const key = `${normalize(role.start_date)}-${normalize(role.end_date)}`;
      if (!uniqueByDate.has(key)) {
        uniqueByDate.set(key, role);
      }
    }

    const uniqueRoles = Array.from(uniqueByDate.values());
    if (uniqueRoles.length < 2) continue;

    const distinctTitles = new Set(uniqueRoles.map(r => normalize(r.title))).size;
    const isRotational = distinctTitles >= 2;

    groups.push({
      employer: roles[0].company,
      roles: uniqueRoles.sort((a, b) => {
        const aDate = parseRoleDate(a.start_date);
        const bDate = parseRoleDate(b.start_date);
        if (!aDate || !bDate) return 0;
        return dateToMonths(aDate) - dateToMonths(bDate);
      }),
      distinct_titles: distinctTitles,
      is_rotational: isRotational,
      prompt: isRotational
        ? `You have ${uniqueRoles.length} different roles at "${roles[0].company}". Are these separate postings/rotations within the same organization?`
        : `You have ${uniqueRoles.length} entries for "${roles[0].company}". Are these the same role or different positions?`,
    });
  }

  return groups;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Analyze multiple parsed documents for conflicts, gaps, and groupings.
 *
 * @param documents - Array of { id, name, roles } from different source documents
 * @returns ConflictReport with all detected issues for UI resolution
 *
 * Cost: $0 — pure code logic, no LLM calls.
 */
/** @deprecated Use UserPersona from @jobloop/shared instead */
export type PersonaType =
  | "early_career" | "mid_career" | "senior" | "executive"
  | "career_changer" | "freelancer" | "returner" | "laid_off" | "military";

export function detectConflicts(
  documents: Array<{
    id: string;
    name: string;
    roles: Array<{
      title: string;
      company: string;
      start_date: string;
      end_date: string;
      location?: string;
      bullets: string[];
    }>;
  }>,
  persona?: PersonaType,
): ConflictReport {
  // Flatten all roles with source attribution
  const allRoles: ParsedRole[] = [];
  for (const doc of documents) {
    for (const role of doc.roles) {
      allRoles.push({
        source_id: doc.id,
        source_name: doc.name,
        ...role,
      });
    }
  }

  // 1. Find role groups (same role across different documents)
  const roleGroups = findRoleGroups(allRoles);

  // 2. Detect conflicts within each group (persona-aware — Finding 5)
  let conflicts: RoleConflict[] = [];
  for (let i = 0; i < roleGroups.length; i++) {
    conflicts.push(...detectConflictsInGroup(roleGroups[i], i));
  }

  // Persona-aware filtering (Finding 5 from socratic-model-selection-audit)
  if (persona === "freelancer") {
    // Freelancers: overlapping dates are normal (concurrent clients)
    // Only keep date conflicts within the SAME client company
    conflicts = conflicts.filter(c => {
      if (c.type === "duplicate") return false; // overlapping dates aren't conflicts for freelancers
      if (c.type === "title_mismatch") return true; // title mismatches still valid
      return true;
    });
  }
  if (persona === "career_changer") {
    // Career changers: different titles across CVs are intentional (reframing)
    // Only flag title mismatches within the same era (±2 years)
    conflicts = conflicts.filter(c => {
      if (c.type !== "title_mismatch") return true;
      // Keep only if entries are from the same time period
      const parsed = c.entries.map(e => parseRoleDate(e.start_date)).filter(d => d !== null);
      if (parsed.length < 2) return true;
      const months = parsed.map(d => d.year * 12 + d.month);
      const spread = Math.max(...months) - Math.min(...months);
      return spread <= 24; // 2 years = same era, flag it. Otherwise intentional reframe.
    });
  }

  // 3. Detect timeline gaps
  const gaps = detectGaps(roleGroups);

  // 4. Detect same-employer groupings
  const deduplicatedRoles = roleGroups.map(g => g[0]);
  // Freelancers: employer pattern detection disabled (different companies = normal)
  const employerGroups = persona === "freelancer"
    ? []
    : detectEmployerGroups(deduplicatedRoles);

  return {
    conflicts,
    gaps,
    employer_groups: employerGroups,
    unique_roles_detected: roleGroups.length,
    stats: {
      documents_analyzed: documents.length,
      total_roles_parsed: allRoles.length,
      conflicts_found: conflicts.length,
      gaps_found: gaps.length,
      employer_groups_found: employerGroups.length,
    },
  };
}

// Renamed to avoid collision with the export
function detectConflictsInGroup(group: ParsedRole[], groupIndex: number): RoleConflict[] {
  if (group.length <= 1) return [];

  const conflicts: RoleConflict[] = [];

  // Check date mismatches
  const startDates = new Set(group.map(r => normalize(r.start_date)));
  const endDates = new Set(group.map(r => normalize(r.end_date)));
  if (startDates.size > 1 || endDates.size > 1) {
    const dateEntries = group.map(r => `${r.source_name}: ${r.start_date} - ${r.end_date}`);
    conflicts.push({
      id: `conflict-${groupIndex}-dates`,
      type: "date_mismatch",
      entries: group,
      description: `Different dates for "${group[0].company}": ${dateEntries.join(" vs ")}`,
      fields: ["start_date", "end_date"],
    });
  }

  // Check title mismatches — but skip if titles are synonymous
  // (e.g. "Residency Training (FCPS), Anesthesiology" ≈ "Anesthesia Residency")
  const titles = new Set(group.map(r => normalize(r.title)));
  if (titles.size > 1) {
    // Check all pairs — if ALL are synonymous, no conflict
    const uniqueTitles = [...titles];
    let allSynonymous = true;
    for (let i = 0; i < uniqueTitles.length && allSynonymous; i++) {
      for (let j = i + 1; j < uniqueTitles.length && allSynonymous; j++) {
        if (!titlesAreSynonymous(uniqueTitles[i], uniqueTitles[j])) {
          allSynonymous = false;
        }
      }
    }

    if (!allSynonymous) {
      const titleEntries = group.map(r => `${r.source_name}: "${r.title}"`);
      conflicts.push({
        id: `conflict-${groupIndex}-titles`,
        type: "title_mismatch",
        entries: group,
        description: `Different titles for "${group[0].company}": ${titleEntries.join(" vs ")}`,
        fields: ["title"],
      });
    }
  }

  // Check description gaps (one CV has bullets, another doesn't)
  const withBullets = group.filter(r => r.bullets.length > 0);
  const withoutBullets = group.filter(r => r.bullets.length === 0);
  if (withBullets.length > 0 && withoutBullets.length > 0) {
    conflicts.push({
      id: `conflict-${groupIndex}-desc`,
      type: "description_gap",
      entries: group,
      description: `"${group[0].company}" has descriptions in ${withBullets.map(r => r.source_name).join(", ")} but not in ${withoutBullets.map(r => r.source_name).join(", ")}`,
      fields: ["bullets"],
    });
  }

  return conflicts;
}

// Also export utility functions for testing
export {
  parseRoleDate,
  companiesMatch,
  titlesOverlap,
  datesOverlap,
  normalize,
  significantWords,
  jaccardSimilarity,
  monthsBetween,
};
