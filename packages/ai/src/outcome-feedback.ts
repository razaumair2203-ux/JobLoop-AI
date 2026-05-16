/**
 * Outcome Feedback Parser
 *
 * Parses free-text user feedback ("they liked my pipeline work but wanted more K8s")
 * into structured SkillSignals that enrich the Profile Cloud.
 *
 * Uses a fast model (Haiku-equivalent) — ~$0.004 per call.
 */

import { getClient, MODELS } from "./client";
import { getProviderMode, getDevResponse, saveDevPrompt } from "./provider";
import { safeParseJSON } from "./utils";
import { skillsMatch } from "./skill-matching";
import type { ProfileCloud } from "./cloud";

// ============================================================
// Types
// ============================================================

export interface ParsedFeedbackSignal {
  skill_name: string;
  signal: "positive" | "gap";
  detail: string; // what the employer said/implied
}

export interface ParsedOutcomeFeedbackResult {
  positive_signals: ParsedFeedbackSignal[];
  gap_signals: ParsedFeedbackSignal[];
  context: string | null; // competitive loss, overqualified, underqualified, etc.
  raw_feedback: string;
}

// ============================================================
// Prompt
// ============================================================

const FEEDBACK_PARSER_SYSTEM_PROMPT = `You are a feedback parser for a job application tracking system. The user describes what happened after applying to a job — what the employer said, what went well, what didn't.

Your job: extract structured skill signals from natural language feedback.

## Input
You receive:
1. The user's free-text feedback about an application outcome
2. A list of the user's known skills (from their profile)
3. The role they applied for

## Output
Return a JSON object:

{
  "positive_signals": [
    { "skill_name": "<skill from profile>", "signal": "positive", "detail": "<what employer said/implied>" }
  ],
  "gap_signals": [
    { "skill_name": "<skill from profile or new skill>", "signal": "gap", "detail": "<what employer wanted>" }
  ],
  "context": "<one of: competitive_loss | overqualified | underqualified | culture_mismatch | compensation_mismatch | timing | null>"
}

## Rules
1. Map casual language to skill names. "K8s" → "Kubernetes". "pipeline work" → look for "data pipeline" or similar in their profile.
2. Only create positive_signals for skills the employer EXPLICITLY praised or that clearly contributed to progress.
3. Only create gap_signals for skills the employer EXPLICITLY said were missing or insufficient.
4. If the feedback is vague ("they went with someone else"), set context to "competitive_loss" and return empty signal arrays.
5. If feedback mentions a skill NOT in the user's profile, still include it in gap_signals — it's a new data point.
6. Never infer signals from silence. "Didn't mention X" ≠ "X is a gap".
7. The "detail" field should quote or paraphrase what the employer actually said, not your interpretation.
8. Return ONLY the JSON object, no markdown fences.`;

// ============================================================
// Parser
// ============================================================

export async function parseOutcomeFeedback(
  feedback: string,
  cloud: ProfileCloud,
  role: string,
): Promise<ParsedOutcomeFeedbackResult> {
  const skillNames = cloud.nodes.map(n => n.name).slice(0, 50); // cap for token budget

  const userPrompt = `## User's Feedback
"${feedback}"

## Role Applied For
${role}

## User's Known Skills
${skillNames.join(", ")}

Parse this feedback into structured skill signals. Return ONLY the JSON object.`;

  // DEV MODE
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<ParsedOutcomeFeedbackResult>("feedback-parse", userPrompt);
    if (cached) return { ...cached, raw_feedback: feedback };

    const promptText = `SYSTEM:\n${FEEDBACK_PARSER_SYSTEM_PROMPT}\n\nUSER:\n${userPrompt}`;
    saveDevPrompt("feedback-parse", userPrompt, promptText);

    return {
      positive_signals: [],
      gap_signals: [],
      context: null,
      raw_feedback: feedback,
    };
  }

  // API MODE
  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 1024,
    system: FEEDBACK_PARSER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = safeParseJSON<{
    positive_signals: ParsedFeedbackSignal[];
    gap_signals: ParsedFeedbackSignal[];
    context: string | null;
  }>(text, "feedback parsing");

  return {
    positive_signals: parsed.positive_signals ?? [],
    gap_signals: parsed.gap_signals ?? [],
    context: parsed.context ?? null,
    raw_feedback: feedback,
  };
}

/**
 * Write parsed feedback signals to cloud_nodes.outcome_signals.
 * Maps parsed skill names to actual cloud node IDs.
 */
export function mapFeedbackToNodeSignals(
  cloud: ProfileCloud,
  parsed: ParsedOutcomeFeedbackResult,
  company: string,
  role: string,
  niche: string,
): Array<{
  node_id: string;
  signal: { skill_id: string; signal: "positive" | "gap"; context: string; niche: string; date: string };
}> {
  const date = new Date().toISOString().split("T")[0];
  const results: Array<{
    node_id: string;
    signal: { skill_id: string; signal: "positive" | "gap"; context: string; niche: string; date: string };
  }> = [];

  const allSignals = [
    ...parsed.positive_signals.map(s => ({ ...s, type: "positive" as const })),
    ...parsed.gap_signals.map(s => ({ ...s, type: "gap" as const })),
  ];

  for (const sig of allSignals) {
    const node = cloud.nodes.find(n => skillsMatch(n.name, sig.skill_name));
    if (!node) continue;

    results.push({
      node_id: node.id,
      signal: {
        skill_id: node.id,
        signal: sig.type,
        context: sig.detail || `${sig.type === "positive" ? "Praised" : "Gap flagged"} when applying at ${company} for ${role}`,
        niche,
        date,
      },
    });
  }

  return results;
}
