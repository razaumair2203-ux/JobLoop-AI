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
import { CV_PARSER_SYSTEM_PROMPT, buildCVParserPrompt } from "./prompts/cv-parser";
import { matchCVToJD, type MatchReport } from "./matcher";
import type { ParsedJD, ParsedCV } from "./types";
import {
  getProviderMode,
  loadDevParsedJD,
  loadDevParsedCV,
  saveDevPrompt,
  getDevResponse,
  saveDevResponse,
} from "./provider";
import { safeParseJSON } from "./utils";

// ============================================================
// STEP 1: PARSE
// ============================================================

export async function parseJD(jd: string): Promise<ParsedJD> {
  // DEV MODE: try local file first
  if (getProviderMode() === "dev") {
    const cached = loadDevParsedJD(jd);
    if (cached) return cached;

    // No cached response — save the prompt so you can process it
    const promptText = `SYSTEM:\n${JD_PARSER_SYSTEM_PROMPT}\n\nUSER:\n${buildJDParserPrompt(jd)}`;
    const id = saveDevPrompt("jd-parse", jd, promptText);
    throw new Error(
      `[DEV MODE] No cached response for JD parsing.\n` +
      `Prompt saved to: dev-data/prompts/${id}.txt\n` +
      `Process it with Claude Code, then save response to: dev-data/responses/${id}.json`
    );
  }

  // API MODE: call Anthropic
  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 4096,
    system: JD_PARSER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildJDParserPrompt(jd) }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<ParsedJD>(text, "JD parsing");
}

export async function parseCV(cv: string): Promise<ParsedCV> {
  if (getProviderMode() === "dev") {
    const cached = loadDevParsedCV(cv);
    if (cached) return cached;

    const promptText = `SYSTEM:\n${CV_PARSER_SYSTEM_PROMPT}\n\nUSER:\n${buildCVParserPrompt(cv)}`;
    const id = saveDevPrompt("cv-parse", cv, promptText);
    throw new Error(
      `[DEV MODE] No cached response for CV parsing.\n` +
      `Prompt saved to: dev-data/prompts/${id}.txt\n` +
      `Process it with Claude Code, then save response to: dev-data/responses/${id}.json`
    );
  }

  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 4096,
    system: CV_PARSER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildCVParserPrompt(cv) }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<ParsedCV>(text, "CV parsing");
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
