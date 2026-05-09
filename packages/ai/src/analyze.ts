/**
 * Suitability Analysis Pipeline
 *
 * Architecture:
 *
 * 1. PARSE (AI or dev files) — Extract structured data from JD and CV
 * 2. MATCH (code)            — Compare facts: what's met, what's not
 * 3. NARRATE (AI or dev)     — Human-readable advice based on facts
 *
 * In DEV mode: parsing reads from local JSON files (fixture cache).
 * In API mode: parsing calls NVIDIA NIM API.
 * Steps 2 is always code — no AI involved, same in both modes.
 */

import { getClient, MODELS } from "./client";
import { JD_PARSER_SYSTEM_PROMPT, buildJDParserPrompt } from "./prompts/jd-parser";
import { CV_PARSER_SYSTEM_PROMPT, buildCVParserPrompt, type ParsedCVOutput } from "./prompts/cv-parser";
import type { ParsedJD, ParsedCV } from "./types";
import { validateParsedCVOutput, repairLLMOutput } from "./schema-validator";
import { SchemaValidationError, NoProviderError } from "./errors";

/**
 * Convert API parser output (ParsedCVOutput) → pipeline contract (ParsedCV).
 * This is the single bridge between LLM API output and all downstream stages.
 */
function apiOutputToParsedCV(raw: ParsedCVOutput): ParsedCV {
  const allTech = new Set<string>([
    ...raw.skills.map(s => s.name),
    ...raw.experience.flatMap(e => e.technologies_used),
  ]);

  return {
    // Contact — preserved for cross-CV conflict detection
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    location: raw.location,
    links: raw.links,
    summary: raw.summary,

    total_experience_years: raw.total_experience_years,

    experience: raw.experience.map(e => ({
      company: e.company,
      employer: e.employer,
      title: e.title,
      start_date: e.start_date,
      end_date: e.end_date,
      duration_months: e.duration_months,
      location: e.location,
      bullets: e.bullets,
      technologies_used: e.technologies_used,
      metrics_mentioned: e.metrics_mentioned,
      programs: e.programs,
      team_size: e.team_size,
      seniority_signals: e.seniority_signals,
      domain: e.domain,
    })),

    skills: raw.skills,
    all_technologies: Array.from(allTech),

    education: raw.education.map(e => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      start_year: e.start_year,
      end_year: e.end_year,
      grade: e.grade ?? undefined,
      research_topic: e.research_topic ?? undefined,
      highlights: e.highlights,
    })),

    // Names for backward compat, detailed for Cloud enrichment
    certifications: raw.certifications.map(c =>
      typeof c === "string" ? c : c.name
    ),
    certifications_detailed: raw.certifications.filter(
      (c): c is Exclude<typeof c, string> => typeof c !== "string"
    ),

    competencies: raw.competencies,
    awards: raw.awards,
    projects: raw.projects,
    publications: raw.publications,
    volunteer: raw.volunteer,
    leadership: raw.leadership,
    professional_affiliations: raw.professional_affiliations,
    training: raw.training,
    languages_spoken: raw.languages_spoken,
    conflicts: raw.conflicts,
  };
}
import {
  getProviderMode,
  loadDevParsedJD,
  loadDevParsedCV,
  saveDevParsedJD,
  saveDevParsedCV,
  saveDevPrompt,
  getDevResponse,
  saveDevResponse,
} from "./provider";
import { safeParseJSON } from "./utils";

// ============================================================
// STEP 1: PARSE
// ============================================================

export async function parseJD(jd: string, modelTier?: "fast" | "quality"): Promise<ParsedJD> {
  // TIER 1: Fixture cache — instant, zero cost
  if (getProviderMode() === "dev") {
    const cached = loadDevParsedJD(jd);
    if (cached) return cached;
  }

  // TIER 2: Real API call (same behavior dev and api mode)
  const tier = modelTier ?? (classifyJDComplexity(jd) === "complex" ? "quality" : "fast");
  const model = (getProviderMode() === "dev")
    ? MODELS.fast  // Always fast tier in dev — cheap auto-caching
    : (tier === "quality" ? MODELS.quality : MODELS.fast);

  let client: ReturnType<typeof getClient>;
  try {
    client = getClient();
  } catch {
    // TIER 3: No API key, no fixture — explicit error
    const promptText = `SYSTEM:\n${JD_PARSER_SYSTEM_PROMPT}\n\nUSER:\n${buildJDParserPrompt(jd)}`;
    saveDevPrompt("jd-parse", jd, promptText);
    throw new Error(
      `[JD PARSE] No NVIDIA_NIM_API_KEY and no cached fixture found. ` +
      `Set NVIDIA_NIM_API_KEY in .env.local to enable auto-caching, or run: ` +
      `npx tsx packages/ai/tests/generate-fixtures.ts`
    );
  }

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: JD_PARSER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildJDParserPrompt(jd) }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const result = safeParseJSON<ParsedJD>(text, "JD parsing");

  // Auto-cache in dev mode — next run hits Tier 1 instantly
  if (getProviderMode() === "dev") {
    saveDevParsedJD(jd, result);
    console.log(`[DEV] JD parse cached (${model}) — next call will be instant`);
  }

  return result;
}

export async function parseCV(cv: string, modelTier?: "fast" | "quality"): Promise<ParsedCV> {
  // TIER 1: Fixture cache — instant, zero cost
  if (getProviderMode() === "dev") {
    const cached = loadDevParsedCV(cv);
    if (cached) return cached;
  }

  // TIER 2: Real API call with validation + retry/fallback
  const initialModel = (getProviderMode() === "dev")
    ? MODELS.fast
    : (modelTier === "quality" ? MODELS.quality : MODELS.fast);

  let client: ReturnType<typeof getClient>;
  try {
    client = getClient();
  } catch {
    // TIER 3: No API key, no fixture — explicit error, NO regex fallback
    const promptText = `SYSTEM:\n${CV_PARSER_SYSTEM_PROMPT}\n\nUSER:\n${buildCVParserPrompt(cv)}`;
    saveDevPrompt("cv-parse", cv, promptText);
    throw new NoProviderError(
      `[CV PARSE] No NVIDIA_NIM_API_KEY and no cached fixture found. ` +
      `Set NVIDIA_NIM_API_KEY in .env.local or run: npx tsx packages/ai/tests/generate-fixtures.ts`
    );
  }

  // Attempt 1: initial model
  const raw1 = await callCVParser(client, initialModel, cv);
  const validation1 = validateAfterRepair(raw1);
  if (validation1.valid) {
    return cacheAndReturn(cv, validation1.data!, initialModel);
  }

  // Attempt 2: retry same model with repair hint
  console.warn(`[CV PARSE] Attempt 1 failed validation: ${validation1.errorSummary}. Retrying with repair hint...`);
  const raw2 = await callCVParser(client, initialModel, cv, "Your previous response had schema errors. Return ONLY valid JSON matching the exact schema. No markdown, no commentary.");
  const validation2 = validateAfterRepair(raw2);
  if (validation2.valid) {
    return cacheAndReturn(cv, validation2.data!, initialModel);
  }

  // Attempt 3: escalate to quality tier (if not already using it)
  if (initialModel !== MODELS.quality) {
    console.warn(`[CV PARSE] Attempt 2 failed. Escalating to quality tier...`);
    const raw3 = await callCVParser(client, MODELS.quality, cv);
    const validation3 = validateAfterRepair(raw3);
    if (validation3.valid) {
      return cacheAndReturn(cv, validation3.data!, MODELS.quality);
    }
    throw new SchemaValidationError(
      `[CV PARSE] All 3 attempts failed schema validation`,
      { attempt1: validation1.errorSummary, attempt2: validation2.errorSummary, attempt3: validation3.errorSummary }
    );
  }

  throw new SchemaValidationError(
    `[CV PARSE] Both attempts failed schema validation`,
    { attempt1: validation1.errorSummary, attempt2: validation2.errorSummary }
  );
}

/** Call the CV parser API and return raw parsed JSON */
async function callCVParser(
  client: ReturnType<typeof getClient>,
  model: string,
  cv: string,
  extraInstruction?: string,
): Promise<Record<string, unknown>> {
  const userContent = extraInstruction
    ? `${extraInstruction}\n\n${buildCVParserPrompt(cv)}`
    : buildCVParserPrompt(cv);

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: CV_PARSER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<Record<string, unknown>>(text, "CV parsing");
}

/** Repair common LLM issues, then validate */
function validateAfterRepair(raw: Record<string, unknown>): { valid: boolean; data?: ParsedCVOutput; errorSummary?: string } {
  const repaired = repairLLMOutput(raw);
  const result = validateParsedCVOutput(repaired);
  if (result.valid) {
    return { valid: true, data: result.data as unknown as ParsedCVOutput };
  }
  return { valid: false, errorSummary: result.errorSummary };
}

/** Convert validated output to ParsedCV and cache in dev mode */
function cacheAndReturn(cv: string, raw: ParsedCVOutput, model: string): ParsedCV {
  const result = apiOutputToParsedCV(raw);
  if (getProviderMode() === "dev") {
    saveDevParsedCV(cv, result);
    console.log(`[DEV] CV parse cached (${model}) — next call will be instant`);
  }
  return result;
}

// ============================================================
// JD COMPLEXITY CLASSIFIER — signal-based model selection
// ============================================================

/** Domain-specific terms that signal regulatory/compliance complexity */
const DOMAIN_JARGON = new Set([
  "compliance", "regulatory", "accreditation", "audit", "iso", "sox", "hipaa",
  "gdpr", "pci-dss", "fedramp", "itar", "easa", "faa", "cpa", "gaap", "ifrs",
  "clearance", "classified", "fiduciary", "actuarial", "pharmacovigilance",
]);

type JDComplexity = "simple" | "complex";

/**
 * Classify JD complexity from the text itself — no counters, no user state.
 *
 * Signals that push toward quality tier (complex):
 * - High requirement density (many bullet points)
 * - Domain jargon the model needs to understand contextually
 * - Ambiguous/overlapping requirements (long sentences, nested clauses)
 * - Cross-domain bridging (e.g., "software engineer with clinical trial experience")
 *
 * Simple JDs: short, clear bullets, common tech stacks.
 */
export function classifyJDComplexity(jd: string): JDComplexity {
  const lower = jd.toLowerCase();
  const lines = jd.split("\n").filter(l => l.trim().length > 0);
  const words = jd.split(/\s+/).length;

  let complexityScore = 0;

  // Signal 1: Length — long JDs have more nuance to parse
  if (words > 600) complexityScore += 2;
  else if (words > 350) complexityScore += 1;

  // Signal 2: Requirement density — many bullets = harder to prioritize
  const bulletLines = lines.filter(l => /^\s*[-•*]\s/.test(l) || /^\s*\d+[.)]\s/.test(l));
  if (bulletLines.length > 15) complexityScore += 2;
  else if (bulletLines.length > 8) complexityScore += 1;

  // Signal 3: Domain jargon — needs contextual understanding
  let jargonHits = 0;
  for (const term of DOMAIN_JARGON) {
    if (lower.includes(term)) jargonHits++;
  }
  if (jargonHits >= 3) complexityScore += 2;
  else if (jargonHits >= 1) complexityScore += 1;

  // Signal 4: Ambiguity markers — long requirements, nested clauses
  const longBullets = bulletLines.filter(l => l.length > 120);
  if (longBullets.length >= 3) complexityScore += 1;

  // Signal 5: Cross-domain bridging ("engineer with healthcare experience")
  const techTerms = [...TECH_KEYWORDS].filter(t => lower.includes(t)).length;
  const domainTerms = jargonHits;
  if (techTerms > 0 && domainTerms > 0) complexityScore += 1;

  // Threshold: 3+ signals = complex, otherwise simple
  return complexityScore >= 3 ? "complex" : "simple";
}

// ============================================================
// BASIC JD EXTRACTOR (dev mode fallback, no AI)
// ============================================================

const TECH_KEYWORDS = new Set([
  "javascript", "typescript", "python", "java", "c#", "c++", "go", "rust", "ruby", "php",
  "react", "angular", "vue", "svelte", "next.js", "node.js", "express", "django", "flask",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb",
  "graphql", "rest", "api", "microservices", "agile", "scrum", "git",
  "machine learning", "deep learning", "ai", "data science", "sql",
]);

function extractJDBasic(jd: string): ParsedJD {
  const lines = jd.split("\n").map(l => l.trim()).filter(Boolean);
  const lower = jd.toLowerCase();

  // Extract tech mentions
  const techFound: Array<{ name: string; context: "required" | "mentioned" }> = [];
  for (const tech of TECH_KEYWORDS) {
    if (lower.includes(tech)) {
      techFound.push({ name: tech, context: "required" });
    }
  }

  // Extract bullet-point requirements
  const requirements = lines
    .filter(l => /^[-•*]\s/.test(l) || /^\d+[.)]\s/.test(l))
    .map(l => l.replace(/^[-•*\d.)]+\s*/, "").trim())
    .filter(l => l.length > 10);

  const hard = requirements.slice(0, 8).map(text => ({
    text,
    category: "extracted",
    keywords: text.split(/\s+/).filter(w => w.length > 3).slice(0, 5),
  }));

  // Try to extract years
  const yearsMatch = lower.match(/(\d+)\+?\s*years?\s*(of\s+)?experience/);
  const minYears = yearsMatch ? parseInt(yearsMatch[1]) : null;

  return {
    company: "",
    role_title: lines[0]?.slice(0, 100) || "Unknown Role",
    seniority_level: minYears && minYears >= 7 ? "senior" : minYears && minYears >= 3 ? "mid" : "unknown",
    location: { city: null, country: null, remote: lower.includes("remote") },
    experience_years: { min: minYears, max: null, raw_text: yearsMatch?.[0] || "" },
    requirements: { hard, preferred: [] },
    technologies_mentioned: techFound,
    responsibilities: [],
  };
}

// ============================================================
// LEGACY analyzeSuitability REMOVED (May 6, 2026)
// Use analyzeWithCloud() from cloud-pipeline.ts instead.
// Old code archived at: archive/dead-code/matcher.ts
// ============================================================
