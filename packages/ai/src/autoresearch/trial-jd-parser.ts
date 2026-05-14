/**
 * JD Parser Trial — Free API Evaluation
 *
 * Runs the JD parser prompt against real full_description text from test pairs,
 * scores results with per-field metrics, and reports distributions for calibration.
 *
 * NO thresholds are set here — this script DISCOVERS what the right thresholds should be.
 *
 * Usage:
 *   npx tsx packages/ai/src/autoresearch/trial-jd-parser.ts [--pairs 10] [--provider gemini|deepseek]
 *
 * Requires: GEMINI_API_KEY or DEEPSEEK_API_KEY in .env
 */

import * as fs from "fs";
import * as path from "path";

// Load .env
const envPath = path.resolve(__dirname, "../../../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

import { JD_PARSER_SYSTEM_PROMPT, buildJDParserPrompt } from "../prompts/jd-parser";
import { safeParseJSON } from "../utils";

const TEST_BANK_DIR = path.join(__dirname, "test-bank");
const RESULTS_DIR = path.join(__dirname, "results");

// ============================================================
// TYPES
// ============================================================

interface RawTestPair {
  id: string;
  split: string;
  persona: string;
  jd: {
    title: string;
    company: string;
    location: string;
    experience_years: number | null;
    requirements: Array<{ text: string; type: "must_have" | "nice_to_have" }>;
    responsibilities: string[];
    full_description: string;
  };
}

/** What the parser prompt is expected to return */
interface ParsedJDOutput {
  company: string;
  role_title: string;
  seniority_level: string;
  location: {
    city: string | null;
    country: string | null;
    remote: boolean | string;
  };
  experience_years: {
    min: number | null;
    max: number | null;
    raw_text: string;
  };
  requirements: {
    hard: Array<{ text: string; category: string; keywords: string[] }>;
    preferred: Array<{ text: string; category: string; keywords: string[] }>;
  };
  technologies_mentioned: Array<{ name: string; context: string; raw_text: string }>;
  responsibilities: string[];
  team_info: { team_name: string; team_size: string; reports_to: string };
  compensation: { salary_range: string; benefits: string[] };
  red_flags: string[];
}

/** Ground truth extracted from test pair jd object */
interface JDExpected {
  company: string;
  title: string;
  location: string;
  experience_years_min: number | null;
  experience_years_max: number | null;
  requirements: Array<{ text: string; type: "must_have" | "nice_to_have" }>;
  responsibilities: string[];
}

/** Per-field score result */
interface FieldScore {
  field: string;
  score: number; // 0.0 to 1.0
  match_type: string; // exact, fuzzy, array_recall, etc.
  detail: string;
}

// ============================================================
// LOAD TEST PAIRS
// ============================================================

function loadTestPairs(maxPairs: number): RawTestPair[] {
  const files = fs.readdirSync(TEST_BANK_DIR)
    .filter(f => f.startsWith("pair-") && f.endsWith(".json"))
    .sort();

  const pairs: RawTestPair[] = [];
  for (const f of files) {
    if (pairs.length >= maxPairs) break;
    const raw = JSON.parse(fs.readFileSync(path.join(TEST_BANK_DIR, f), "utf-8"));
    if (raw.jd?.full_description) {
      pairs.push(raw);
    }
  }
  return pairs;
}

function extractExpected(pair: RawTestPair): JDExpected {
  const jd = pair.jd;

  // Parse experience_years — test pairs store single number, but JD text may say "5-10"
  let min: number | null = jd.experience_years;
  let max: number | null = null;

  // Try to extract range from full_description
  const rangeMatch = jd.full_description.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)/i);
  const plusMatch = jd.full_description.match(/(\d+)\+\s*(?:years?|yrs?)/i);
  if (rangeMatch) {
    min = parseInt(rangeMatch[1]);
    max = parseInt(rangeMatch[2]);
  } else if (plusMatch) {
    min = parseInt(plusMatch[1]);
    max = null;
  }

  return {
    company: jd.company,
    title: jd.title,
    location: jd.location || "",
    experience_years_min: min,
    experience_years_max: max,
    requirements: jd.requirements,
    responsibilities: jd.responsibilities,
  };
}

// ============================================================
// PER-FIELD SCORING (ExtractBench-informed)
// ============================================================

/** Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Normalize abbreviations for title/company matching */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bsr\.?\b/g, "senior")
    .replace(/\bjr\.?\b/g, "junior")
    .replace(/\bmgr\.?\b/g, "manager")
    .replace(/\bhr\b/g, "human resources")
    .replace(/\bit\b/g, "information technology")
    .replace(/\beng\.?\b/g, "engineer")
    .replace(/\badmin\.?\b/g, "administrator")
    .replace(/\bassoc\.?\b/g, "associate")
    .replace(/\bvp\b/g, "vice president")
    .replace(/\bcto\b/g, "chief technology officer")
    .replace(/\bcfo\b/g, "chief financial officer")
    .replace(/\bceo\b/g, "chief executive officer")
    .replace(/[,.'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize location abbreviations */
function normalizeLocation(loc: string): string {
  const stateAbbrevs: Record<string, string> = {
    "al": "alabama", "ak": "alaska", "az": "arizona", "ar": "arkansas",
    "ca": "california", "co": "colorado", "ct": "connecticut", "de": "delaware",
    "fl": "florida", "ga": "georgia", "hi": "hawaii", "id": "idaho",
    "il": "illinois", "in": "indiana", "ia": "iowa", "ks": "kansas",
    "ky": "kentucky", "la": "louisiana", "me": "maine", "md": "maryland",
    "ma": "massachusetts", "mi": "michigan", "mn": "minnesota", "ms": "mississippi",
    "mo": "missouri", "mt": "montana", "ne": "nebraska", "nv": "nevada",
    "nh": "new hampshire", "nj": "new jersey", "nm": "new mexico", "ny": "new york",
    "nc": "north carolina", "nd": "north dakota", "oh": "ohio", "ok": "oklahoma",
    "or": "oregon", "pa": "pennsylvania", "ri": "rhode island", "sc": "south carolina",
    "sd": "south dakota", "tn": "tennessee", "tx": "texas", "ut": "utah",
    "vt": "vermont", "va": "virginia", "wa": "washington", "wv": "west virginia",
    "wi": "wisconsin", "wy": "wyoming", "dc": "district of columbia",
  };

  let norm = loc.toLowerCase().replace(/[,.'()]/g, "").replace(/\s+/g, " ").trim();
  // Replace state abbreviations
  for (const [abbr, full] of Object.entries(stateAbbrevs)) {
    norm = norm.replace(new RegExp(`\\b${abbr}\\b`, "g"), full);
  }
  return norm;
}

/** Score a single string field with fuzzy matching */
function scoreStringField(
  field: string,
  parsed: string,
  expected: string,
  normalizer?: (s: string) => string,
): FieldScore {
  if (!expected && !parsed) {
    return { field, score: 1, match_type: "both_empty", detail: "Both empty — correct" };
  }
  if (!expected && parsed) {
    // Parser extracted something from nothing — hallucination?
    // But could be legitimate extraction from full_description that ground truth missed
    return { field, score: 0.5, match_type: "extra_extraction", detail: `Parser found "${parsed}" but expected empty` };
  }
  if (expected && !parsed) {
    return { field, score: 0, match_type: "missing", detail: `Expected "${expected}" but parser returned empty` };
  }

  const norm = normalizer || ((s: string) => s.toLowerCase().trim());
  const a = norm(parsed);
  const b = norm(expected);

  // Exact match
  if (a === b) return { field, score: 1, match_type: "exact", detail: `Exact: "${parsed}"` };

  // Contains match (one contains the other)
  if (a.includes(b) || b.includes(a)) {
    return { field, score: 0.9, match_type: "contains", detail: `Contains: "${parsed}" vs "${expected}"` };
  }

  // Fuzzy match (Levenshtein >= 0.8)
  const sim = levenshteinSimilarity(a, b);
  if (sim >= 0.8) {
    return { field, score: sim, match_type: "fuzzy", detail: `Fuzzy (${sim.toFixed(2)}): "${parsed}" vs "${expected}"` };
  }

  return { field, score: sim, match_type: "mismatch", detail: `Mismatch (${sim.toFixed(2)}): "${parsed}" vs "${expected}"` };
}

/** Score integer field (null-safe) */
function scoreIntegerField(field: string, parsed: number | null, expected: number | null): FieldScore {
  if (parsed === null && expected === null) {
    return { field, score: 1, match_type: "both_null", detail: "Both null — correct" };
  }
  if (parsed === null || expected === null) {
    return { field, score: 0, match_type: "null_mismatch", detail: `Parsed: ${parsed}, Expected: ${expected}` };
  }
  if (parsed === expected) {
    return { field, score: 1, match_type: "exact", detail: `Exact: ${parsed}` };
  }
  // Tolerance: within 1 year
  if (Math.abs(parsed - expected) <= 1) {
    return { field, score: 0.8, match_type: "close", detail: `Close: ${parsed} vs ${expected} (diff=${Math.abs(parsed - expected)})` };
  }
  return { field, score: 0, match_type: "mismatch", detail: `Mismatch: ${parsed} vs ${expected}` };
}

/** Score requirement array — recall (how many expected were found) */
function scoreRequirementsRecall(
  parsed: Array<{ text: string }>,
  expected: Array<{ text: string }>,
): FieldScore {
  if (expected.length === 0) {
    return { field: "requirements_recall", score: 1, match_type: "no_expected", detail: "No expected requirements" };
  }

  let found = 0;
  const missed: string[] = [];

  for (const exp of expected) {
    const expWords = exp.text.toLowerCase().split(/[\s/,()]+/)
      .filter(w => w.length > 3);

    if (expWords.length === 0) { found++; continue; } // Pure filler — auto-match

    const matched = parsed.some(p => {
      const pWords = p.text.toLowerCase();
      if (expWords.length <= 2) {
        return expWords.some(w => pWords.includes(w));
      }
      // 3+ words: require 2+ matches
      const matchCount = expWords.filter(w => pWords.includes(w)).length;
      return matchCount >= 2;
    });

    if (matched) found++;
    else missed.push(exp.text.slice(0, 60));
  }

  const score = found / expected.length;
  const detail = missed.length > 0
    ? `${found}/${expected.length} found. Missed: ${missed.slice(0, 3).join("; ")}`
    : `${found}/${expected.length} found`;

  return { field: "requirements_recall", score, match_type: "array_recall", detail };
}

/** Score requirement array — precision (how many parsed are NOT phantom) */
function scoreRequirementsPrecision(
  parsed: Array<{ text: string }>,
  expected: Array<{ text: string }>,
): FieldScore {
  if (parsed.length === 0) {
    return { field: "requirements_precision", score: 1, match_type: "no_parsed", detail: "No parsed requirements" };
  }

  let legitimate = 0;
  const phantoms: string[] = [];

  for (const p of parsed) {
    const pWords = p.text.toLowerCase().split(/[\s/,()]+/)
      .filter(w => w.length > 3);

    if (pWords.length === 0) { legitimate++; continue; }

    const matchesExpected = expected.some(exp => {
      const expLower = exp.text.toLowerCase();
      if (pWords.length <= 2) {
        return pWords.some(w => expLower.includes(w));
      }
      const matchCount = pWords.filter(w => expLower.includes(w)).length;
      return matchCount >= Math.min(2, pWords.length);
    });

    if (matchesExpected) legitimate++;
    else phantoms.push(p.text.slice(0, 60));
  }

  const score = legitimate / parsed.length;
  const detail = phantoms.length > 0
    ? `${legitimate}/${parsed.length} legitimate. Phantoms: ${phantoms.slice(0, 3).join("; ")}`
    : `${legitimate}/${parsed.length} legitimate`;

  return { field: "requirements_precision", score, match_type: "array_precision", detail };
}

/** Score requirement type classification on matched pairs */
function scoreRequirementTypes(
  parsed: Array<{ text: string; type?: string }>,
  expected: Array<{ text: string; type: string }>,
): FieldScore {
  let matched = 0;
  let correct = 0;

  for (const exp of expected) {
    const expWords = exp.text.toLowerCase().split(/[\s/,()]+/).filter(w => w.length > 3);

    // Find matching parsed requirement
    const match = parsed.find(p => {
      const pLower = p.text.toLowerCase();
      if (expWords.length <= 2) return expWords.some(w => pLower.includes(w));
      return expWords.filter(w => pLower.includes(w)).length >= 2;
    });

    if (!match) continue;
    matched++;

    // Normalize type names
    const parsedType = normalizeRequirementType(match.type || "unknown");
    const expectedType = exp.type;

    if (parsedType === expectedType) {
      correct++;
    } else if (parsedType === "must_have" && expectedType === "nice_to_have") {
      // Conservative bias — parser was told "if ambiguous, mark as hard"
      // Give partial credit for following instructions
      correct += 0.5;
    }
  }

  if (matched === 0) {
    return { field: "requirement_types", score: 0, match_type: "no_matches", detail: "No matched requirements to classify" };
  }

  const score = correct / matched;
  return {
    field: "requirement_types",
    score,
    match_type: "enum_match",
    detail: `${correct}/${matched} types correct (on matched pairs)`,
  };
}

function normalizeRequirementType(type: string): string {
  const t = type.toLowerCase().trim();
  if (t === "must_have" || t === "hard" || t === "required") return "must_have";
  if (t === "nice_to_have" || t === "preferred" || t === "bonus") return "nice_to_have";
  return t;
}

/** Score responsibilities recall */
function scoreResponsibilitiesRecall(
  parsed: string[],
  expected: string[],
): FieldScore {
  if (expected.length === 0) {
    return { field: "responsibilities_recall", score: 1, match_type: "no_expected", detail: "No expected responsibilities" };
  }

  let found = 0;
  for (const exp of expected) {
    const expWords = exp.toLowerCase().split(/[\s/,()]+/).filter(w => w.length > 3);
    if (expWords.length === 0) { found++; continue; }

    const matched = parsed.some(p => {
      const pLower = p.toLowerCase();
      const matchCount = expWords.filter(w => pLower.includes(w)).length;
      return matchCount >= Math.min(2, expWords.length);
    });
    if (matched) found++;
  }

  const score = found / expected.length;
  return { field: "responsibilities_recall", score, match_type: "array_recall", detail: `${found}/${expected.length} found` };
}

/** Score company with abbreviation + subsidiary awareness */
function scoreCompanyField(parsed: string, expected: string): FieldScore {
  const field = "company";
  if (!expected && !parsed) return { field, score: 1, match_type: "both_empty", detail: "Both empty" };
  if (!expected && parsed) return { field, score: 0.5, match_type: "extra_extraction", detail: `Parser found "${parsed}" but expected empty` };
  if (expected && !parsed) return { field, score: 0, match_type: "missing", detail: `Expected "${expected}" but parser returned empty` };

  const pLow = parsed.toLowerCase().replace(/[,.'®()]/g, "").replace(/\s+/g, " ").trim();
  const eLow = expected.toLowerCase().replace(/[,.'®()]/g, "").replace(/\s+/g, " ").trim();

  // Exact
  if (pLow === eLow) return { field, score: 1, match_type: "exact", detail: `Exact: "${parsed}"` };

  // Contains (one contains the other)
  if (pLow.includes(eLow) || eLow.includes(pLow)) {
    return { field, score: 0.9, match_type: "contains", detail: `Contains: "${parsed}" vs "${expected}"` };
  }

  // Abbreviation expansion: check if expected abbreviation expands to match parsed
  // e.g. "NYS" → words starting with N, Y, S in parsed
  const eWords = eLow.split(/\s+/);
  const pWords = pLow.split(/\s+/);
  if (eWords.length === 1 && eWords[0].length <= 5 && pWords.length >= 2) {
    const abbr = eWords[0];
    const initials = pWords.map(w => w[0]).join("");
    if (initials.startsWith(abbr) || abbr.startsWith(initials)) {
      return { field, score: 0.85, match_type: "abbreviation", detail: `Abbreviation: "${parsed}" ≈ "${expected}"` };
    }
  }
  // Reverse: parsed is abbreviation of expected
  if (pWords.length === 1 && pWords[0].length <= 5 && eWords.length >= 2) {
    const abbr = pWords[0];
    const initials = eWords.map(w => w[0]).join("");
    if (initials.startsWith(abbr) || abbr.startsWith(initials)) {
      return { field, score: 0.85, match_type: "abbreviation", detail: `Abbreviation: "${parsed}" ≈ "${expected}"` };
    }
  }

  // Subsidiary pattern: "X, a Y company" — check if Y matches expected
  const subMatch = pLow.match(/^(.+?),?\s+a\s+(.+?)\s+company$/);
  if (subMatch) {
    const parent = subMatch[2];
    if (eLow.includes(parent) || parent.includes(eLow)) {
      return { field, score: 0.85, match_type: "subsidiary", detail: `Subsidiary: "${parsed}" parent="${parent}" ≈ "${expected}"` };
    }
  }

  // Word overlap: significant shared words
  const sigWords = (s: string) => s.split(/\s+/).filter(w => w.length > 2 && !["the","inc","ltd","corp","llc","co","group","company"].includes(w));
  const pSig = sigWords(pLow);
  const eSig = sigWords(eLow);
  if (pSig.length > 0 && eSig.length > 0) {
    const overlap = pSig.filter(w => eSig.some(e => e.includes(w) || w.includes(e))).length;
    const maxLen = Math.max(pSig.length, eSig.length);
    if (overlap / maxLen >= 0.5) {
      return { field, score: 0.8, match_type: "word_overlap", detail: `Word overlap: "${parsed}" vs "${expected}" (${overlap}/${maxLen})` };
    }
  }

  // Fuzzy fallback
  const sim = levenshteinSimilarity(pLow, eLow);
  if (sim >= 0.6) {
    return { field, score: sim, match_type: "fuzzy", detail: `Fuzzy (${sim.toFixed(2)}): "${parsed}" vs "${expected}"` };
  }

  return { field, score: sim, match_type: "mismatch", detail: `Mismatch (${sim.toFixed(2)}): "${parsed}" vs "${expected}"` };
}

/** Score location with city-level matching (handles "Denver, USA" vs "Denver, CO") */
function scoreLocationField(
  parsedLoc: ParsedJDOutput["location"] | undefined,
  expectedLoc: string,
): FieldScore {
  const field = "location";
  const parsedStr = parsedLoc
    ? [parsedLoc.city, parsedLoc.country].filter(Boolean).join(", ")
    : "";

  // Handle Remote
  const expectedLower = expectedLoc.toLowerCase().trim();
  const parsedRemote = parsedLoc?.remote;
  if (expectedLower === "remote") {
    if (parsedRemote === true || parsedRemote === "true" || String(parsedRemote).toLowerCase() === "remote") {
      return { field, score: 1, match_type: "remote_match", detail: "Both Remote" };
    }
    if (parsedStr.toLowerCase().includes("remote")) {
      return { field, score: 0.9, match_type: "remote_in_text", detail: `Remote in parsed text: "${parsedStr}"` };
    }
    return { field, score: 0, match_type: "missing_remote", detail: `Expected "Remote" but got "${parsedStr}"` };
  }

  // Both empty
  if (!expectedLoc && !parsedStr) {
    return { field, score: 1, match_type: "both_empty", detail: "Both empty — correct" };
  }
  // Parser found something, GT empty
  if (!expectedLoc && parsedStr) {
    return { field, score: 0.5, match_type: "extra_extraction", detail: `Parser found "${parsedStr}" but expected empty` };
  }
  // GT has value, parser empty
  if (expectedLoc && !parsedStr) {
    return { field, score: 0, match_type: "missing", detail: `Expected "${expectedLoc}" but parser returned empty` };
  }

  // City-level matching: extract city from both
  const parsedCity = (parsedLoc?.city || "").toLowerCase().trim();
  const expectedParts = expectedLoc.split(",").map(s => s.trim().toLowerCase());
  const expectedCity = expectedParts[0] || "";

  // If cities match, that's the important part
  if (parsedCity && expectedCity) {
    const citySim = levenshteinSimilarity(parsedCity, expectedCity);
    if (citySim >= 0.8) {
      // City matches — "Denver, USA" vs "Denver, CO" = good enough
      return { field, score: Math.max(0.85, citySim), match_type: "city_match", detail: `City match: "${parsedCity}" ≈ "${expectedCity}"` };
    }
    // Check if expected has multiple locations ("New York and Maine")
    if (expectedLoc.toLowerCase().includes(" and ")) {
      const cities = expectedLoc.toLowerCase().split(/\s+and\s+/).map(s => s.trim());
      if (cities.some(c => levenshteinSimilarity(parsedCity, c) >= 0.8 || c.includes(parsedCity))) {
        return { field, score: 0.8, match_type: "partial_multi", detail: `Matched "${parsedCity}" in multi-location "${expectedLoc}"` };
      }
    }
  }

  // Fallback to full string fuzzy with normalization
  return scoreStringField(field, parsedStr, expectedLoc, normalizeLocation);
}

/** Score all fields for a single parse result */
function scoreParseResult(parsed: ParsedJDOutput, expected: JDExpected): FieldScore[] {
  const scores: FieldScore[] = [];

  // 1. Company (fuzzy + abbreviation + subsidiary awareness)
  scores.push(scoreCompanyField(parsed.company || "", expected.company));

  // 2. Title (fuzzy + abbreviation normalization)
  scores.push(scoreStringField("title", parsed.role_title || "", expected.title, normalizeTitle));

  // 3. Location (smart city-level matching)
  scores.push(scoreLocationField(parsed.location, expected.location));

  // 4. Experience years min
  const parsedMin = parsed.experience_years?.min ?? null;
  scores.push(scoreIntegerField("experience_years_min", parsedMin, expected.experience_years_min));

  // 5. Experience years max
  const parsedMax = parsed.experience_years?.max ?? null;
  scores.push(scoreIntegerField("experience_years_max", parsedMax, expected.experience_years_max));

  // 6. Requirements recall
  const allParsedReqs = [
    ...(parsed.requirements?.hard || []).map(r => ({ text: r.text, type: "must_have" })),
    ...(parsed.requirements?.preferred || []).map(r => ({ text: r.text, type: "nice_to_have" })),
  ];
  scores.push(scoreRequirementsRecall(allParsedReqs, expected.requirements));

  // 7. Requirements precision (no phantoms)
  scores.push(scoreRequirementsPrecision(allParsedReqs, expected.requirements));

  // 8. Requirement types
  scores.push(scoreRequirementTypes(
    allParsedReqs.map(r => ({ text: r.text, type: r.type })),
    expected.requirements,
  ));

  // 9. Responsibilities recall
  scores.push(scoreResponsibilitiesRecall(
    parsed.responsibilities || [],
    expected.responsibilities,
  ));

  return scores;
}

// ============================================================
// LLM CALL (DeepSeek or Gemini)
// ============================================================

interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  rateGapMs: number;
}

function getProvider(preference?: string): LLMProvider | null {
  if ((!preference || preference === "gemini") && process.env.GEMINI_API_KEY) {
    return {
      name: "Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      rateGapMs: 6000, // 10 RPM free tier
    };
  }
  if ((!preference || preference === "deepseek") && process.env.DEEPSEEK_API_KEY) {
    return {
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      rateGapMs: 200,
    };
  }
  return null;
}

let lastCallMs = 0;

async function callParser(provider: LLMProvider, jdText: string): Promise<ParsedJDOutput | null> {
  // Rate limiting
  const now = Date.now();
  const gap = now - lastCallMs;
  if (gap < provider.rateGapMs) {
    await new Promise(r => setTimeout(r, provider.rateGapMs - gap));
  }
  lastCallMs = Date.now();

  const userPrompt = buildJDParserPrompt(jdText);

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: [
      { role: "system", content: JD_PARSER_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.1, // Low temp for extraction accuracy
    stream: false,
    response_format: { type: "json_object" },
  };

  const res = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`  [ERROR] ${provider.name} ${res.status}: ${errText.slice(0, 200)}`);
    return null;
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  try {
    return safeParseJSON<ParsedJDOutput>(text, "jd-parser-trial");
  } catch {
    console.error(`  [ERROR] Invalid JSON response`);
    return null;
  }
}

// ============================================================
// REPORTING
// ============================================================

function computeDistribution(values: number[]): {
  min: number; p10: number; p25: number; median: number; p75: number; max: number; mean: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const percentile = (p: number) => {
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    min: sorted[0],
    p10: percentile(10),
    p25: percentile(25),
    median: percentile(50),
    p75: percentile(75),
    max: sorted[n - 1],
    mean: values.reduce((a, b) => a + b, 0) / n,
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const maxPairs = args.includes("--pairs")
    ? parseInt(args[args.indexOf("--pairs") + 1]) || 10
    : 10;
  const providerPref = args.includes("--provider")
    ? args[args.indexOf("--provider") + 1]
    : undefined;

  console.log("\n========================================");
  console.log("  JD Parser Trial — Free API Evaluation");
  console.log("========================================\n");

  const provider = getProvider(providerPref);
  if (!provider) {
    console.error("ERROR: No API key found. Set GEMINI_API_KEY or DEEPSEEK_API_KEY in .env");
    process.exit(1);
  }
  console.log(`Provider: ${provider.name} (${provider.model})`);
  console.log(`Pairs: ${maxPairs}`);
  console.log();

  // Load pairs
  const pairs = loadTestPairs(maxPairs);
  console.log(`Loaded ${pairs.length} test pairs with full_description\n`);

  if (pairs.length === 0) {
    console.error("ERROR: No test pairs with full_description found");
    process.exit(1);
  }

  // Run parser on each pair
  const allScores: Array<{ id: string; fields: FieldScore[]; raw_output: ParsedJDOutput | null }> = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    console.log(`[${i + 1}/${pairs.length}] ${pair.id} (${pair.jd.company} — ${pair.jd.title})`);

    const expected = extractExpected(pair);
    const parsed = await callParser(provider, pair.jd.full_description);

    if (!parsed) {
      console.log("  FAILED — skipping\n");
      continue;
    }

    const fields = scoreParseResult(parsed, expected);
    allScores.push({ id: pair.id, fields, raw_output: parsed });

    // Print per-field scores
    const avgScore = fields.reduce((s, f) => s + f.score, 0) / fields.length;
    console.log(`  Overall: ${(avgScore * 100).toFixed(1)}%`);
    for (const f of fields) {
      const icon = f.score >= 0.8 ? "  " : f.score >= 0.5 ? "! " : "X ";
      console.log(`  ${icon}${f.field.padEnd(25)} ${(f.score * 100).toFixed(0).padStart(4)}%  ${f.match_type.padEnd(18)} ${f.detail.slice(0, 80)}`);
    }
    console.log();
  }

  // ============================================================
  // DISTRIBUTION REPORT
  // ============================================================

  if (allScores.length === 0) {
    console.error("ERROR: No successful parses — cannot compute distribution");
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("  DISTRIBUTION REPORT");
  console.log("========================================\n");

  // Get all unique field names
  const fieldNames = [...new Set(allScores.flatMap(s => s.fields.map(f => f.field)))];

  const distributions: Record<string, ReturnType<typeof computeDistribution>> = {};

  console.log(`${"Field".padEnd(25)} ${"Min".padStart(5)} ${"P10".padStart(5)} ${"P25".padStart(5)} ${"Med".padStart(5)} ${"P75".padStart(5)} ${"Max".padStart(5)} ${"Mean".padStart(5)}`);
  console.log("-".repeat(80));

  for (const field of fieldNames) {
    const values = allScores
      .map(s => s.fields.find(f => f.field === field)?.score)
      .filter((v): v is number => v !== undefined);

    if (values.length === 0) continue;

    const dist = computeDistribution(values);
    distributions[field] = dist;

    console.log(
      `${field.padEnd(25)} ${(dist.min * 100).toFixed(0).padStart(5)} ${(dist.p10 * 100).toFixed(0).padStart(5)} ${(dist.p25 * 100).toFixed(0).padStart(5)} ${(dist.median * 100).toFixed(0).padStart(5)} ${(dist.p75 * 100).toFixed(0).padStart(5)} ${(dist.max * 100).toFixed(0).padStart(5)} ${(dist.mean * 100).toFixed(0).padStart(5)}`
    );
  }

  // Overall accuracy
  const overallScores = allScores.map(s => {
    const avg = s.fields.reduce((sum, f) => sum + f.score, 0) / s.fields.length;
    return avg;
  });
  const overallDist = computeDistribution(overallScores);

  console.log("-".repeat(80));
  console.log(
    `${"OVERALL".padEnd(25)} ${(overallDist.min * 100).toFixed(0).padStart(5)} ${(overallDist.p10 * 100).toFixed(0).padStart(5)} ${(overallDist.p25 * 100).toFixed(0).padStart(5)} ${(overallDist.median * 100).toFixed(0).padStart(5)} ${(overallDist.p75 * 100).toFixed(0).padStart(5)} ${(overallDist.max * 100).toFixed(0).padStart(5)} ${(overallDist.mean * 100).toFixed(0).padStart(5)}`
  );

  // Failure analysis
  console.log("\n\n========================================");
  console.log("  FAILURE ANALYSIS");
  console.log("========================================\n");

  for (const field of fieldNames) {
    const failures = allScores
      .filter(s => {
        const f = s.fields.find(f2 => f2.field === field);
        return f && f.score < 0.8;
      })
      .map(s => ({
        id: s.id,
        detail: s.fields.find(f => f.field === field)!.detail,
        score: s.fields.find(f => f.field === field)!.score,
      }));

    if (failures.length > 0) {
      console.log(`${field} — ${failures.length}/${allScores.length} below 0.8:`);
      for (const f of failures.slice(0, 5)) {
        console.log(`  ${f.id}: ${f.detail.slice(0, 100)} (${(f.score * 100).toFixed(0)}%)`);
      }
      console.log();
    }
  }

  // Suggested thresholds (P10-based, same methodology as CV gen)
  console.log("\n========================================");
  console.log("  SUGGESTED THRESHOLDS (P10-based)");
  console.log("========================================\n");
  console.log("These are the P10 values — the floor that 90% of real parser outputs exceed.");
  console.log("Use these as starting thresholds, then tighten after prompt improvements.\n");

  for (const field of fieldNames) {
    const dist = distributions[field];
    if (!dist) continue;
    console.log(`  ${field.padEnd(25)} >= ${(dist.p10 * 100).toFixed(0)}%  (P10=${(dist.p10 * 100).toFixed(1)}%, median=${(dist.median * 100).toFixed(1)}%)`);
  }

  // Save results
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const reportPath = path.join(RESULTS_DIR, "jd-parser-trial.json");
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    provider: { name: provider.name, model: provider.model },
    pairs_attempted: pairs.length,
    pairs_scored: allScores.length,
    distributions,
    overall: overallDist,
    per_pair: allScores.map(s => ({
      id: s.id,
      fields: s.fields,
      overall: s.fields.reduce((sum, f) => sum + f.score, 0) / s.fields.length,
    })),
    raw_outputs: allScores.map(s => ({ id: s.id, output: s.raw_output })),
  }, null, 2));

  console.log(`\nResults saved: ${reportPath}`);
  console.log("\nNEXT STEP: Review failures, fix scorecard bugs, then calibrate thresholds.");
}

main().catch(err => {
  console.error("Trial failed:", err);
  process.exit(1);
});
