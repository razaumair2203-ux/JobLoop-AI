/**
 * LinkedIn ZIP Export Parser
 *
 * Parses LinkedIn's "Download Your Data" ZIP export into our ParsedCV schema.
 * Deterministic CSV→schema mapping — no LLM needed for structured fields.
 * Optional LLM call for enriching position descriptions (technologies, metrics).
 *
 * LinkedIn ZIP contains ~20+ CSV files. We only read the 6 that matter:
 *   Profile.csv, Positions.csv, Education.csv, Skills.csv,
 *   Certifications.csv, Languages.csv
 *
 * Security: ZIP handling (extraction, size limits, path traversal) is the
 * caller's responsibility (server-side route handler). This module receives
 * already-extracted CSV strings keyed by filename.
 */

import type { ParsedCV } from "./types";

// ---------------------------------------------------------------------------
// Types for raw LinkedIn CSV data
// ---------------------------------------------------------------------------

export interface LinkedInCSVFiles {
  "Profile.csv"?: string;
  "Positions.csv"?: string;
  "Education.csv"?: string;
  "Skills.csv"?: string;
  "Certifications.csv"?: string;
  "Languages.csv"?: string;
  [key: string]: string | undefined; // allow unknown files (we ignore them)
}

export interface LinkedInProfile {
  first_name: string;
  last_name: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  email: string | null;
}

export interface LinkedInPosition {
  company: string;
  title: string;
  description: string | null;
  location: string | null;
  started_on: string | null; // "Mon YYYY" or "YYYY"
  finished_on: string | null; // "Mon YYYY" or "YYYY" or empty (current)
}

export interface LinkedInEducation {
  school_name: string;
  degree_name: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  activities: string | null;
}

export interface LinkedInCertification {
  name: string;
  authority: string | null;
  started_on: string | null;
  finished_on: string | null;
  url: string | null;
}

/** Files we care about from the ZIP */
export const RELEVANT_FILES = [
  "Profile.csv",
  "Positions.csv",
  "Education.csv",
  "Skills.csv",
  "Certifications.csv",
  "Languages.csv",
] as const;

/** Maximum uncompressed size we'll accept (100MB — generous, typical is ~70MB) */
export const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;

/** Maximum individual CSV file size (10MB — more than enough) */
export const MAX_CSV_SIZE = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// CSV Parser (lightweight, no dependencies)
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into an array of objects keyed by header names.
 * Handles quoted fields with commas and newlines inside quotes.
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = splitCSVLines(csv.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

/** Split CSV text into logical lines (respecting quoted fields that contain newlines) */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++; // skip \r\n
      if (current.length > 0) lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);

  return lines;
}

/** Parse a single CSV row into field values */
function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);

  return fields;
}

// ---------------------------------------------------------------------------
// LinkedIn CSV → ParsedCV mapping
// ---------------------------------------------------------------------------

/** Normalize LinkedIn header names (they vary between export versions) */
function normalizeHeader(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase().replace(/\s+/g, "_")] = value;
  }
  return normalized;
}

/** Parse "Mon YYYY" or "YYYY" into "YYYY-MM" format */
function parseLinkedInDate(raw: string | null | undefined): string | undefined {
  if (!raw || raw.trim() === "") return undefined;
  const trimmed = raw.trim();

  // "Jan 2020", "January 2020"
  const monthYear = trimmed.match(/^(\w+)\s+(\d{4})$/);
  if (monthYear) {
    const month = monthToNum(monthYear[1]);
    if (month) return `${monthYear[2]}-${month}`;
    return monthYear[2];
  }

  // Just "2020"
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) return yearOnly[1];

  return undefined;
}

const MONTHS: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

function monthToNum(month: string): string | null {
  return MONTHS[month.toLowerCase()] ?? null;
}

/** Calculate duration in months between two date strings */
function calcDurationMonths(start?: string, end?: string): number {
  if (!start) return 0;
  const s = parseDateToMonths(start);
  const e = end ? parseDateToMonths(end) : currentMonths();
  if (s === null || e === null) return 0;
  return Math.max(1, e - s);
}

function parseDateToMonths(d: string): number | null {
  const parts = d.split("-");
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return null;
  const month = parts[1] ? parseInt(parts[1], 10) : 6; // default to mid-year
  return year * 12 + month;
}

function currentMonths(): number {
  const now = new Date();
  return now.getFullYear() * 12 + (now.getMonth() + 1);
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export interface LinkedInParseResult {
  parsedCV: ParsedCV;
  profile: LinkedInProfile;
  warnings: string[];
  /** Which CSV files were found and parsed */
  filesFound: string[];
  /** Which expected files were missing */
  filesMissing: string[];
}

/**
 * Parse LinkedIn CSV files into our ParsedCV schema.
 *
 * @param csvFiles - Map of filename → CSV content (already extracted from ZIP)
 * @returns ParsedCV + profile info + warnings
 */
export function parseLinkedInExport(csvFiles: LinkedInCSVFiles): LinkedInParseResult {
  const warnings: string[] = [];
  const filesFound: string[] = [];
  const filesMissing: string[] = [];

  // Check which files we got
  for (const f of RELEVANT_FILES) {
    if (csvFiles[f] && csvFiles[f]!.trim().length > 0) {
      filesFound.push(f);
    } else {
      filesMissing.push(f);
    }
  }

  // Must have at least Positions.csv or Profile.csv
  if (!csvFiles["Positions.csv"] && !csvFiles["Profile.csv"]) {
    throw new LinkedInParseError(
      "This doesn't look like a LinkedIn data export. Expected files like Profile.csv, Positions.csv, Skills.csv — but none were found.",
      filesMissing,
    );
  }

  // --- Profile ---
  const profile = parseProfile(csvFiles["Profile.csv"], warnings);

  // --- Positions → experience ---
  const positions = parsePositions(csvFiles["Positions.csv"], warnings);

  // --- Education ---
  const education = parseEducation(csvFiles["Education.csv"], warnings);

  // --- Skills ---
  const skills = parseSkills(csvFiles["Skills.csv"], warnings);

  // --- Certifications ---
  const certifications = parseCertifications(csvFiles["Certifications.csv"], warnings);

  // --- Languages (stored in skills.other) ---
  const languages = parseLanguages(csvFiles["Languages.csv"], warnings);
  if (languages.length > 0) {
    skills.other.push(...languages.map((l) => `${l} (language)`));
  }

  // Calculate total experience
  const allDates = positions.map((p) => ({
    start: p.start_date,
    end: p.end_date,
  }));
  const totalYears = calcTotalExperience(allDates);

  // Build all_technologies from experience entries
  const allTech = new Set<string>();
  for (const p of positions) {
    for (const t of p.technologies_used) allTech.add(t);
  }
  // Also add skills
  for (const category of Object.values(skills)) {
    for (const s of category) allTech.add(s);
  }

  const parsedCV: ParsedCV = {
    total_experience_years: totalYears,
    experience: positions,
    skills,
    all_technologies: [...allTech],
    education,
    certifications,
  };

  return { parsedCV, profile, warnings, filesFound, filesMissing };
}

// ---------------------------------------------------------------------------
// Individual file parsers
// ---------------------------------------------------------------------------

function parseProfile(csv: string | undefined, warnings: string[]): LinkedInProfile {
  const profile: LinkedInProfile = {
    first_name: "",
    last_name: "",
    headline: null,
    summary: null,
    location: null,
    email: null,
  };

  if (!csv) {
    warnings.push("Profile.csv not found — contact info will need manual entry");
    return profile;
  }

  const rows = parseCSV(csv);
  if (rows.length === 0) {
    warnings.push("Profile.csv was empty");
    return profile;
  }

  // LinkedIn Profile.csv can be either row-based or column-based
  const row = normalizeHeader(rows[0]);

  profile.first_name = row.first_name || row["first name"] || "";
  profile.last_name = row.last_name || row["last name"] || "";
  profile.headline = row.headline || null;
  profile.summary = row.summary || null;
  profile.location = row.geo_location || row.location || null;
  profile.email = row.email_address || row.email || null;

  return profile;
}

function parsePositions(
  csv: string | undefined,
  warnings: string[],
): ParsedCV["experience"] {
  if (!csv) {
    warnings.push("Positions.csv not found — work history will need manual entry");
    return [];
  }

  const rows = parseCSV(csv);
  if (rows.length === 0) return [];

  return rows.map((raw) => {
    const r = normalizeHeader(raw);
    const company = r.company_name || r.company || "Unknown Company";
    const title = r.title || "Unknown Role";
    const description = r.description || "";
    const location = r.location || null;

    const startDate = parseLinkedInDate(r.started_on || r.start_date);
    const endDate = parseLinkedInDate(r.finished_on || r.end_date);
    const durationMonths = calcDurationMonths(startDate, endDate);

    // Extract technologies from description (basic keyword extraction)
    const techFromDesc = extractTechnologies(description);

    // Extract any numbers/metrics from description
    const metrics = extractMetrics(description);

    // Infer domain from company + title + description
    const domain = inferDomain(company, title, description);

    return {
      company,
      title,
      start_date: startDate,
      end_date: endDate,
      duration_months: durationMonths,
      technologies_used: techFromDesc,
      metrics_mentioned: metrics,
      domain,
    };
  });
}

function parseEducation(
  csv: string | undefined,
  warnings: string[],
): ParsedCV["education"] {
  if (!csv) return [];

  const rows = parseCSV(csv);
  return rows.map((raw) => {
    const r = normalizeHeader(raw);
    return {
      institution: r.school_name || r.school || "Unknown Institution",
      degree: r.degree_name || r.degree || "",
      field: r.field_of_study || r.field || r.notes || "",
      start_year: parseInt(extractYear(r.start_date || r.begin_date) || "", 10) || null,
      end_year: parseInt(extractYear(r.end_date || r.finish_date) || "", 10) || null,
      highlights: r.activities ? [r.activities] : [],
    };
  });
}

function parseSkills(
  csv: string | undefined,
  warnings: string[],
): ParsedCV["skills"] {
  const skills: ParsedCV["skills"] = {
    languages: [],
    frameworks: [],
    infrastructure: [],
    databases: [],
    tools: [],
    other: [],
  };

  if (!csv) return skills;

  const rows = parseCSV(csv);
  for (const raw of rows) {
    const r = normalizeHeader(raw);
    const skillName = r.name || r.skill || Object.values(raw)[0] || "";
    if (!skillName.trim()) continue;

    categorizeSkill(skillName.trim(), skills);
  }

  return skills;
}

function parseCertifications(
  csv: string | undefined,
  _warnings: string[],
): string[] {
  if (!csv) return [];

  const rows = parseCSV(csv);
  return rows
    .map((raw) => {
      const r = normalizeHeader(raw);
      const name = r.name || r.certification_name || Object.values(raw)[0] || "";
      const authority = r.authority || r.issuing_organization || "";
      return authority ? `${name} (${authority})` : name;
    })
    .filter((c) => c.length > 0);
}

function parseLanguages(
  csv: string | undefined,
  _warnings: string[],
): string[] {
  if (!csv) return [];

  const rows = parseCSV(csv);
  return rows
    .map((raw) => {
      const r = normalizeHeader(raw);
      return r.name || r.language || Object.values(raw)[0] || "";
    })
    .filter((l) => l.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Basic technology keyword extraction from description text */
function extractTechnologies(text: string): string[] {
  if (!text) return [];

  // Common technology patterns — not exhaustive, just catches obvious ones
  // The LLM enrichment step (optional) does the heavy lifting
  const techPatterns = [
    /\b(Python|Java|JavaScript|TypeScript|C\+\+|C#|Go|Rust|Ruby|PHP|Swift|Kotlin|Scala|R|MATLAB)\b/gi,
    /\b(React|Angular|Vue|Next\.?js|Node\.?js|Express|Django|Flask|Spring|Rails|Laravel|\.NET)\b/gi,
    /\b(AWS|Azure|GCP|Docker|Kubernetes|K8s|Terraform|Jenkins|CircleCI|GitHub Actions)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra|SQL Server|Oracle)\b/gi,
    /\b(Git|Jira|Confluence|Slack|Figma|Tableau|Power BI|Salesforce|SAP|Workday)\b/gi,
    /\b(TensorFlow|PyTorch|Keras|scikit-learn|Pandas|NumPy|Spark|Hadoop|Kafka|Airflow)\b/gi,
    /\b(REST|GraphQL|gRPC|WebSocket|OAuth|JWT|SAML|CI\/CD|Agile|Scrum|Kanban)\b/gi,
  ];

  const found = new Set<string>();
  for (const pattern of techPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) found.add(m);
    }
  }

  return [...found];
}

/** Extract numbers/metrics from description text */
function extractMetrics(text: string): string[] {
  if (!text) return [];

  const metrics: string[] = [];

  // Percentages
  const pctMatches = text.match(/\d+%/g);
  if (pctMatches) metrics.push(...pctMatches.map((m) => m));

  // Dollar amounts
  const dollarMatches = text.match(/\$[\d,.]+[KMBkmb]?/g);
  if (dollarMatches) metrics.push(...dollarMatches);

  // "X users", "X customers", etc.
  const countMatches = text.match(/\b\d[\d,]*\+?\s*(?:users|customers|employees|people|engineers|developers|members|clients|teams?)\b/gi);
  if (countMatches) metrics.push(...countMatches);

  return [...new Set(metrics)];
}

/** Infer industry domain from company/title/description */
function inferDomain(company: string, title: string, description: string): string {
  const text = `${company} ${title} ${description}`.toLowerCase();

  const domains: [string, RegExp][] = [
    ["fintech", /\b(fintech|banking|financial|payments?|trading|invest)\b/],
    ["healthcare", /\b(health|medical|pharma|biotech|clinical|patient)\b/],
    ["e-commerce", /\b(e-?commerce|retail|shopping|marketplace|merchant)\b/],
    ["education", /\b(education|edtech|learning|university|school|academic)\b/],
    ["saas", /\b(saas|b2b|platform|subscription|cloud\s+service)\b/],
    ["gaming", /\b(gaming|game|esports|unity|unreal)\b/],
    ["media", /\b(media|content|publishing|news|entertainment)\b/],
    ["cybersecurity", /\b(security|cyber|infosec|threat|vulnerability)\b/],
    ["logistics", /\b(logistics|supply\s+chain|shipping|warehouse|freight)\b/],
    ["automotive", /\b(automotive|vehicle|car|ev|autonomous)\b/],
    ["telecom", /\b(telecom|5g|network|wireless|mobile\s+operator)\b/],
    ["consulting", /\b(consult|advisory|deloitte|accenture|mckinsey|kpmg|pwc|ey)\b/],
  ];

  for (const [domain, pattern] of domains) {
    if (pattern.test(text)) return domain;
  }

  return "general";
}

/** Categorize a skill into the appropriate bucket */
function categorizeSkill(skill: string, skills: ParsedCV["skills"]): void {
  const s = skill.toLowerCase();

  const languagePatterns = /^(python|java|javascript|typescript|c\+\+|c#|go|golang|rust|ruby|php|swift|kotlin|scala|r|matlab|perl|shell|bash|sql|html|css|objective-c|dart|lua|haskell|elixir|clojure)$/i;
  const frameworkPatterns = /^(react|angular|vue|next\.?js|nuxt|svelte|node\.?js|express|django|flask|fastapi|spring|rails|laravel|\.net|asp\.net|flutter|electron|gatsby|remix|astro)$/i;
  const infraPatterns = /^(aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform|ansible|jenkins|circleci|github actions|gitlab|ci\/cd|heroku|vercel|netlify|cloudflare|nginx|apache|linux|windows server)$/i;
  const dbPatterns = /^(postgresql|postgres|mysql|mongodb|redis|elasticsearch|dynamodb|cassandra|sql server|oracle|sqlite|mariadb|neo4j|couchdb|firebase|supabase|snowflake|bigquery|redshift)$/i;
  const toolPatterns = /^(git|jira|confluence|slack|figma|sketch|adobe|photoshop|illustrator|tableau|power bi|excel|salesforce|sap|workday|zendesk|intercom|datadog|grafana|splunk|new relic|postman|swagger|vs code|intellij)$/i;

  if (languagePatterns.test(skill)) {
    skills.languages.push(skill);
  } else if (frameworkPatterns.test(skill)) {
    skills.frameworks.push(skill);
  } else if (infraPatterns.test(skill)) {
    skills.infrastructure.push(skill);
  } else if (dbPatterns.test(skill)) {
    skills.databases.push(skill);
  } else if (toolPatterns.test(skill)) {
    skills.tools.push(skill);
  } else {
    skills.other.push(skill);
  }
}

/** Extract a 4-digit year from a date string */
function extractYear(date: string | undefined): string | null {
  if (!date) return null;
  const match = date.match(/(\d{4})/);
  return match ? match[1] : null;
}

/** Calculate total years of experience from an array of date ranges */
function calcTotalExperience(
  ranges: Array<{ start?: string; end?: string }>,
): number {
  if (ranges.length === 0) return 0;

  let earliest: number | null = null;
  let latest: number | null = null;

  for (const r of ranges) {
    if (r.start) {
      const s = parseDateToMonths(r.start);
      if (s !== null && (earliest === null || s < earliest)) earliest = s;
    }
    const e = r.end ? parseDateToMonths(r.end) : currentMonths();
    if (e !== null && (latest === null || e > latest)) latest = e;
  }

  if (earliest === null || latest === null) return 0;
  return Math.round((latest - earliest) / 12);
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class LinkedInParseError extends Error {
  constructor(
    message: string,
    public missingFiles: string[],
  ) {
    super(message);
    this.name = "LinkedInParseError";
  }
}

// ---------------------------------------------------------------------------
// Validation — call this before parsing to check if a ZIP looks like LinkedIn
// ---------------------------------------------------------------------------

/** Check if a set of filenames looks like a LinkedIn export */
export function isLinkedInExport(filenames: string[]): {
  isValid: boolean;
  relevantFiles: string[];
  reason?: string;
} {
  const basenames = filenames.map((f) => {
    // Handle nested paths — LinkedIn sometimes puts files in a subfolder
    const parts = f.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1];
  });

  const found = RELEVANT_FILES.filter((r) => basenames.includes(r));

  if (found.length === 0) {
    return {
      isValid: false,
      relevantFiles: [],
      reason:
        "No LinkedIn data files found. Expected files like Profile.csv, Positions.csv, Skills.csv. Make sure you uploaded the ZIP from LinkedIn's 'Download Your Data' feature.",
    };
  }

  return { isValid: true, relevantFiles: [...found] };
}
