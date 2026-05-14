/**
 * Suitability Analysis Pipeline
 *
 * Architecture:
 *
 * 1. PARSE (AI or dev files) — Extract structured data from JD and CV
 * 2. MATCH (code)            — Compare facts: what's met, what's not
 * 3. NARRATE (AI or dev)     — Human-readable advice based on facts
 *
 * In DEV mode: Claude Code parses via Supabase (zero API calls).
 * In PROD mode: DeepSeek Flash API parses.
 * Step 2 is always code — no AI involved, same in both modes.
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
  };
}
import {
  getProviderMode,
  loadDevParsedJD,
  loadDevParsedCV,
  saveDevParsedJD,
  saveDevParsedCV,
  saveDevPrompt,
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
      `[JD PARSE] No DEEPSEEK_API_KEY and no cached fixture found. ` +
      `Set DEEPSEEK_API_KEY in .env.local to enable auto-caching, or run: ` +
      `npx tsx packages/ai/tests/generate-fixtures.ts`
    );
  }

  // Attempt 1: initial parse
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: JD_PARSER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildJDParserPrompt(jd) }],
        temperature: 0.2,
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const result = safeParseJSON<ParsedJD>(text, "JD parsing");

      // Auto-cache in dev mode — next run hits Tier 1 instantly
      if (getProviderMode() === "dev") {
        saveDevParsedJD(jd, result);
        console.log(`[DEV] JD parse cached (${model}) — next call will be instant`);
      }

      return result;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        console.warn(`[JD PARSE] Attempt ${attempt} failed: ${err instanceof Error ? err.message : err}. Retrying...`);
      }
    }
  }
  throw lastError;
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
      `[CV PARSE] No DEEPSEEK_API_KEY and no cached fixture found. ` +
      `Set DEEPSEEK_API_KEY in .env.local or run: npx tsx packages/ai/tests/generate-fixtures.ts`
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

/** Call the CV parser API and return raw parsed JSON.
 *  Returns empty object on parse failure so retry logic in parseCV() can kick in. */
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
    temperature: 0.2,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    return safeParseJSON<Record<string, unknown>>(text, "CV parsing");
  } catch {
    // LLM returned non-JSON (e.g. reasoning preamble) — return empty so retry logic runs
    console.warn(`[CV PARSE] JSON extraction failed for model ${model}. Text starts with: ${text.slice(0, 100)}`);
    return {};
  }
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
// TECH KEYWORDS — used by classifyJDComplexity()
// ============================================================

const TECH_KEYWORDS = new Set([
  "javascript", "typescript", "python", "java", "c#", "c++", "go", "rust", "ruby", "php",
  "react", "angular", "vue", "svelte", "next.js", "node.js", "express", "django", "flask",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb",
  "graphql", "rest", "api", "microservices", "agile", "scrum", "git",
  "machine learning", "deep learning", "ai", "data science", "sql",
]);
