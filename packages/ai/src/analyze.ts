/**
 * Suitability Analysis Pipeline
 *
 * Architecture:
 *
 * 1. PARSE (AI or dev files) — Extract structured data from JD and CV
 * 2. MATCH (code)            — Compare facts: what's met, what's not
 * 3. NARRATE (AI or dev)     — Human-readable advice based on facts
 *
 * In DEV mode: parsing reads from local JSON files (you generate via Claude Code).
 * In API mode: parsing calls Anthropic API.
 * Steps 2 is always code — no AI involved, same in both modes.
 */

import { getClient, MODELS } from "./client";
import { JD_PARSER_SYSTEM_PROMPT, buildJDParserPrompt } from "./prompts/jd-parser";
import { CV_PARSER_SYSTEM_PROMPT, buildCVParserPrompt, type ParsedCVOutput } from "./prompts/cv-parser";
import { matchCVToJD, type MatchReport } from "./matcher";
import type { ParsedJD, ParsedCV } from "./types";

/**
 * Convert API parser output (ParsedCVOutput) → pipeline contract (ParsedCV).
 * This is the single bridge between Claude API output and all downstream stages.
 */
function apiOutputToParsedCV(raw: ParsedCVOutput): ParsedCV {
  const allTech = new Set<string>([
    ...raw.skills.languages,
    ...raw.skills.frameworks,
    ...raw.skills.infrastructure,
    ...raw.skills.databases,
    ...raw.skills.tools,
    ...raw.skills.other,
    ...raw.experience.flatMap(e => e.technologies_used),
  ]);

  return {
    total_experience_years: raw.total_experience_years,
    experience: raw.experience.map(e => ({
      company: e.company,
      title: e.title,
      start_date: e.start_date,
      end_date: e.end_date,
      duration_months: e.duration_months,
      technologies_used: e.technologies_used,
      metrics_mentioned: e.metrics_mentioned,
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
    certifications: raw.certifications.map(c =>
      typeof c === "string" ? c : c.name
    ),
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
    ? MODELS.fast  // Always Haiku in dev — cheap auto-caching
    : (tier === "quality" ? MODELS.quality : MODELS.fast);

  let client: ReturnType<typeof getClient>;
  try {
    client = getClient();
  } catch {
    // TIER 3: No API key, no fixture — explicit error
    const promptText = `SYSTEM:\n${JD_PARSER_SYSTEM_PROMPT}\n\nUSER:\n${buildJDParserPrompt(jd)}`;
    saveDevPrompt("jd-parse", jd, promptText);
    throw new Error(
      `[JD PARSE] No ANTHROPIC_API_KEY and no cached fixture found. ` +
      `Set ANTHROPIC_API_KEY in .env.local to enable auto-caching, or run: ` +
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

  // TIER 2: Real API call (same in dev and api mode)
  // Dev mode: uses Haiku (cheap, ~$0.01/call) and auto-caches result
  // API mode: uses model selected by caller based on Cloud maturity
  const model = (getProviderMode() === "dev")
    ? MODELS.fast  // Always Haiku in dev — cheap auto-caching
    : (modelTier === "quality" ? MODELS.quality : MODELS.fast);

  let client: ReturnType<typeof getClient>;
  try {
    client = getClient();
  } catch {
    // TIER 3: No API key, no fixture — explicit error, NO regex fallback
    const promptText = `SYSTEM:\n${CV_PARSER_SYSTEM_PROMPT}\n\nUSER:\n${buildCVParserPrompt(cv)}`;
    saveDevPrompt("cv-parse", cv, promptText);
    throw new Error(
      `[CV PARSE] No ANTHROPIC_API_KEY and no cached fixture found. ` +
      `Set ANTHROPIC_API_KEY in .env.local to enable auto-caching, or run: ` +
      `npx tsx packages/ai/tests/generate-fixtures.ts`
    );
  }

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: CV_PARSER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildCVParserPrompt(cv) }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const raw = safeParseJSON<ParsedCVOutput>(text, "CV parsing");
  const result = apiOutputToParsedCV(raw);

  // Auto-cache in dev mode — next run hits Tier 1 instantly
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
 * Signals that push toward Sonnet (complex):
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
// STEP 3: NARRATE
// ============================================================

const NARRATOR_SYSTEM_PROMPT = `You are a career advisor. You receive a factual match report showing exactly which job requirements a candidate meets and which they don't.

Your job: give 2-3 actionable suggestions for how to position the CV to address gaps. Be specific — reference the actual gaps and suggest concrete rewording or emphasis changes.

Also give a 1-sentence "recruiter lens" — what would a recruiter think seeing this CV land on their desk for this role?

Rules:
- Do NOT re-score or re-evaluate. The facts are the facts.
- Do NOT be encouraging or discouraging. Be useful.
- Focus on what the candidate can DO about the gaps (reword, emphasize, upskill).
- If there are no gaps, say so — don't manufacture advice.

Return JSON:
{
  "positioning_advice": ["<specific, actionable suggestion referencing actual gaps>"],
  "recruiter_lens": "<1 sentence — what recruiter thinks>",
  "strongest_selling_point": "<the #1 thing to lead with for this role>"
}`;

export interface NarratedAdvice {
  positioning_advice: string[];
  recruiter_lens: string;
  strongest_selling_point: string;
}

async function narrateMatchReport(
  report: MatchReport,
  jdTitle: string,
  jdCompany: string
): Promise<NarratedAdvice> {
  const unmetReqs = report.requirements
    .filter((r) => r.status === "not_met" && r.importance === "required")
    .map((r) => r.requirement);

  const metReqs = report.requirements
    .filter((r) => r.status === "met" && r.importance === "required")
    .map((r) => r.requirement);

  const missingTech = report.tech_matches
    .filter((t) => !t.found_in_cv && t.context_in_jd === "required")
    .map((t) => t.technology);

  const narrateInput = `Role: "${jdTitle}" at ${jdCompany}

Position: ${report.position.label} (${report.position.basis})
Experience: ${report.experience.actual_years} years (need ${report.experience.required_years ?? "unspecified"}), verdict: ${report.experience.verdict}

Requirements MET (${report.summary_stats.hard_reqs_met}/${report.summary_stats.hard_reqs_total}):
${metReqs.map((r) => `  ✓ ${r}`).join("\n") || "  (none)"}

Requirements NOT MET:
${unmetReqs.map((r) => `  ✗ ${r}`).join("\n") || "  (none — all met!)"}

Missing required tech: ${missingTech.join(", ") || "none"}
Bonus signals: ${report.bonus_signals.join("; ") || "none"}
Red flags: ${report.red_flags.join("; ") || "none"}`;

  // DEV MODE: try cached, or save prompt for manual processing
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<NarratedAdvice>("narrate", narrateInput);
    if (cached) return cached;

    // Save prompt for manual processing
    const promptText = `SYSTEM:\n${NARRATOR_SYSTEM_PROMPT}\n\nUSER:\n${narrateInput}\n\nGive positioning advice. Return ONLY JSON.`;
    const id = saveDevPrompt("narrate", narrateInput, promptText);

    // In dev mode, return a placeholder instead of throwing
    // (narration is nice-to-have, matching is the core)
    return {
      positioning_advice: [
        `[DEV MODE] Narration not cached. Process prompt: dev-data/prompts/${id}.txt`,
      ],
      recruiter_lens: "[DEV MODE] Process the saved prompt to get recruiter lens.",
      strongest_selling_point: "[DEV MODE] Process the saved prompt to get selling point.",
    };
  }

  // API MODE
  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 1024,
    system: NARRATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `${narrateInput}\n\nGive positioning advice. Return ONLY JSON.` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<NarratedAdvice>(text, "narration");
}

// ============================================================
// FULL PIPELINE — Parse → Match → Narrate
// ============================================================

export interface FullAnalysisResult {
  parsed_jd: ParsedJD;
  parsed_cv: ParsedCV;
  match_report: MatchReport;
  advice: NarratedAdvice;
}

/** @deprecated Use analyzeWithCloud() from cloud-pipeline.ts instead */
export async function analyzeSuitability(
  cvText: string,
  jdText: string
): Promise<FullAnalysisResult> {
  // Step 1: Parse (AI in production, file-based in dev)
  const [parsed_jd, parsed_cv] = await Promise.all([
    parseJD(jdText),
    parseCV(cvText),
  ]);

  // Step 2: Match — always code, never AI
  const match_report = matchCVToJD(parsed_cv, parsed_jd);

  // Step 3: Narrate (AI in production, placeholder in dev)
  const advice = await narrateMatchReport(
    match_report,
    parsed_jd.role_title,
    parsed_jd.company
  );

  return { parsed_jd, parsed_cv, match_report, advice };
}
