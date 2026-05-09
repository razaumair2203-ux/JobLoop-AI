/**
 * Socratic Answer Parser
 *
 * Parses free-text user answers from Phase 1 conflict resolution
 * into structured role/date/title data that the Cloud builder can consume.
 *
 * Model selection per design (socratic-engine-FINAL-v2.md):
 *   - Option picked → no LLM, direct mapping ($0)
 *   - Structured fields → no LLM, direct mapping ($0)
 *   - Free text, no complexity signals → fast tier
 *   - Free text, has complexity signals → quality tier
 *
 * In dev mode: saves prompt to file, reads response from file.
 */

import { getClient, MODELS } from "./client";
import { getProviderMode, getDevResponse, saveDevPrompt, saveDevResponse } from "./provider";
import { safeParseJSON } from "./utils";

// ============================================================
// TYPES
// ============================================================

export interface ParsedRoleFromAnswer {
  title: string;
  organization: string;
  start_date: string; // "Jan 2020", "Jun 2021", etc.
  end_date: string;   // "Jun 2021", "Present", etc.
  responsibilities: string[];
  programs: string[];
  team_size: number | null;
  source: "user_confirmed" | "socratic_discovery";
}

export interface AnswerParseResult {
  roles: ParsedRoleFromAnswer[];
  date_corrections: Array<{
    role_description: string;
    corrected_start: string;
    corrected_end: string;
  }>;
  title_corrections: Array<{
    period: string;
    corrected_title: string;
  }>;
  flags: string[]; // e.g. "anonymize_jf17", "sensitive_military_detail"
  raw_answer: string;
}

export type ModelTier = "fast" | "quality";

// ============================================================
// COMPLEXITY DETECTION (regex, no LLM)
// ============================================================

/**
 * Detect structural complexity signals in free-text answer.
 * If ANY signal found → use quality tier. Otherwise → fast tier.
 *
 * Returns the signals found (for logging/debugging).
 */
export function detectComplexitySignals(text: string): string[] {
  const signals: string[] = [];

  // Multiple date references
  const datePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*[-–]?\s*\d{4}|\d{4}\s*[-–]\s*\d{2,4}/gi;
  const dateMatches = text.match(datePattern) || [];
  if (dateMatches.length >= 3) {
    signals.push(`multiple_dates(${dateMatches.length})`);
  }

  // Temporal overlap language
  if (/\b(?:overlapping|at the same time|while also|on the side|concurrent|simultaneously|parallel)\b/i.test(text)) {
    signals.push("temporal_overlap_language");
  }

  // Multiple organization names (capitalized multi-word sequences)
  const orgPattern = /(?:PMO|NUTECH|NUST|PAF|PAC|CADI|College of|University|Air Force|Field Unit)/gi;
  const orgMatches = text.match(orgPattern) || [];
  const uniqueOrgs = new Set(orgMatches.map(o => o.toLowerCase()));
  if (uniqueOrgs.size >= 2) {
    signals.push(`multiple_orgs(${uniqueOrgs.size})`);
  }

  // Role transition language
  if (/\b(?:then (?:i |was )|moved to|transferred|posted to|promoted|got back|was sent|transited)\b/i.test(text)) {
    signals.push("role_transitions");
  }

  // Multiple responsibility domains
  const domainKeywords = [
    /\b(?:maintenance|airworthiness|flight[- ]?line)\b/i,
    /\b(?:PMO|program management|governance|contracting)\b/i,
    /\b(?:quality|QA|accreditation|HEC|OBE)\b/i,
    /\b(?:teaching|faculty|research|courses|education)\b/i,
    /\b(?:weapons?|missile|deployment|field)\b/i,
    /\b(?:design|development|integration|testing)\b/i,
  ];
  const domainCount = domainKeywords.filter(p => p.test(text)).length;
  if (domainCount >= 3) {
    signals.push(`multiple_domains(${domainCount})`);
  }

  return signals;
}

/**
 * Select model tier based on complexity signals.
 */
export function selectModelTier(text: string): { tier: ModelTier; signals: string[] } {
  const signals = detectComplexitySignals(text);
  return {
    tier: signals.length > 0 ? "quality" : "fast",
    signals,
  };
}

// ============================================================
// ANSWER PARSER PROMPT
// ============================================================

const ANSWER_PARSER_SYSTEM = `You are parsing a user's free-text answer to a conflict resolution question about their career history.

The user was asked to clarify overlapping roles, date conflicts, or collapsed entries from their uploaded CVs.

Extract ALL structured data from their answer. Be precise with dates and titles.

Return ONLY valid JSON matching this schema:
{
  "roles": [
    {
      "title": "exact title the user mentioned",
      "organization": "org name",
      "start_date": "Mon YYYY format, e.g. Jan 2020",
      "end_date": "Mon YYYY or Present",
      "responsibilities": ["key responsibility 1", "..."],
      "programs": ["named programs/platforms mentioned"],
      "team_size": null or number if mentioned,
      "source": "user_confirmed" or "socratic_discovery"
    }
  ],
  "date_corrections": [
    {
      "role_description": "which role this corrects",
      "corrected_start": "Mon YYYY",
      "corrected_end": "Mon YYYY"
    }
  ],
  "title_corrections": [
    {
      "period": "e.g. 2008-2013",
      "corrected_title": "the correct title"
    }
  ],
  "flags": ["any special instructions the user gave, e.g. anonymize_program_name, sensitive_detail"]
}

Rules:
- Extract EVERY role mentioned, even briefly
- Use the EXACT dates the user provides (don't round to years)
- If user says "then I was..." treat it as a new role
- If user mentions a program name they don't want in the CV, add a flag like "anonymize:[program_name]"
- If user mentions something sensitive ("should not be mentioned in cv"), add flag "sensitive:[topic]"
- "socratic_discovery" = role that was not in any uploaded CV
- "user_confirmed" = role that was in CVs but user is confirming/correcting details
- Preserve the user's exact phrasing for titles — don't upgrade or rewrite
- If dates are ambiguous, note them as-is and do NOT guess`;

// ============================================================
// PARSE FUNCTION
// ============================================================

/**
 * Parse a free-text answer using the appropriate model tier.
 *
 * In dev mode: saves the prompt and returns null (you process it manually).
 * In API mode: calls fast tier or quality tier based on complexity.
 */
export async function parseAnswer(
  questionContext: string,
  userAnswer: string,
  forceTier?: ModelTier,
): Promise<AnswerParseResult> {
  const { tier, signals } = forceTier
    ? { tier: forceTier, signals: [] }
    : selectModelTier(userAnswer);

  const model = tier === "quality" ? MODELS.quality : MODELS.fast;

  const userPrompt = `Question that was asked:
${questionContext}

User's answer:
${userAnswer}

Parse this answer into structured data. Return ONLY JSON.`;

  const promptKey = `answer-parse-${tier}`;

  // DEV MODE
  if (getProviderMode() === "dev") {
    // Check for cached response
    const cached = getDevResponse<AnswerParseResult>(promptKey, userAnswer);
    if (cached) return cached;

    // Save prompt for manual processing
    const promptId = saveDevPrompt(promptKey, userAnswer, `SYSTEM:\n${ANSWER_PARSER_SYSTEM}\n\nUSER:\n${userPrompt}`);

    console.log(`\n[answer-parser] Dev mode — prompt saved as: ${promptId}`);
    console.log(`[answer-parser] Model tier: ${tier} (${model})`);
    console.log(`[answer-parser] Complexity signals: ${signals.length > 0 ? signals.join(", ") : "none"}`);
    console.log(`[answer-parser] Process this prompt and save response to complete the pipeline.\n`);

    // Return empty result — caller must check and retry after response is saved
    return {
      roles: [],
      date_corrections: [],
      title_corrections: [],
      flags: [`dev_mode_pending:${promptId}`],
      raw_answer: userAnswer,
    };
  }

  // API MODE
  console.log(`[answer-parser] Calling ${model} (tier: ${tier}, signals: ${signals.join(", ") || "none"})`);

  const client = getClient();
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: ANSWER_PARSER_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = safeParseJSON<AnswerParseResult>(text, "Answer parser");

  return {
    ...parsed,
    raw_answer: userAnswer,
  };
}

// ============================================================
// CONVENIENCE: Save a manually processed response (dev mode)
// ============================================================

export function saveAnswerParseResponse(
  tier: ModelTier,
  userAnswer: string,
  result: AnswerParseResult,
): void {
  saveDevResponse(`answer-parse-${tier}`, userAnswer, result);
}
