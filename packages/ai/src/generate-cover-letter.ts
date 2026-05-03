import { getClient, MODELS } from "./client";
import {
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterUserPrompt,
} from "./prompts/cover-letter";
import { getProviderMode, getDevResponse, saveDevPrompt } from "./provider";
import type { ProfileCloud } from "./cloud";
import type { CloudMatchReport } from "./cloud-matcher";
import type { CoverLetterTone } from "@jobloop/shared";
import { safeParseJSON } from "./utils";

export interface CoverLetterParagraph {
  type: "opening" | "body" | "closing";
  text: string;
  evidence_used: string[];
  strategy: string;
}

export interface GeneratedCoverLetter {
  paragraphs: CoverLetterParagraph[];
  tone_applied: CoverLetterTone;
  jd_requirements_addressed: string[];
  evidence_summary: string;
  word_count: number;
  warnings: string[];
}

/**
 * Generate a cover letter using Cloud evidence + JD match report.
 * Returns structured paragraphs with evidence citations and strategy explanations.
 */
export async function generateCoverLetter(
  cloud: ProfileCloud,
  matchReport: CloudMatchReport,
  jd: string,
  company: string,
  role: string,
  tone: CoverLetterTone,
  focusPoints?: string[],
): Promise<GeneratedCoverLetter> {
  const cloudContext = buildCoverLetterContext(cloud, matchReport);
  const userPrompt = buildCoverLetterUserPrompt(
    cloudContext,
    jd,
    company,
    role,
    tone,
    focusPoints,
  );

  // DEV MODE
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<GeneratedCoverLetter>("cover-letter", userPrompt);
    if (cached) return cached;

    const promptText = `SYSTEM:\n${COVER_LETTER_SYSTEM_PROMPT}\n\nUSER:\n${userPrompt}`;
    const id = saveDevPrompt("cover-letter", userPrompt, promptText);

    return {
      paragraphs: [
        {
          type: "opening",
          text: `[DEV MODE] Cover letter not cached. Process prompt: dev-data/prompts/${id}.txt`,
          evidence_used: [],
          strategy: "dev-mode placeholder",
        },
      ],
      tone_applied: tone,
      jd_requirements_addressed: [],
      evidence_summary: `Process prompt ${id} to generate cover letter`,
      word_count: 0,
      warnings: [`Process prompt ${id} to generate cover letter`],
    };
  }

  // API MODE
  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.quality,
    max_tokens: 4096,
    system: COVER_LETTER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<GeneratedCoverLetter>(text, "Cover letter generation");
}

// ============================================================
// INTERNAL — Build context from Cloud for cover letter
// ============================================================

function buildCoverLetterContext(
  cloud: ProfileCloud,
  report: CloudMatchReport,
): string {
  const sections: string[] = [];

  // Career headline (brief — cover letter doesn't need full trajectory)
  sections.push(`CANDIDATE HEADLINE:
${cloud.trajectory.total_experience_years} years experience. ${cloud.trajectory.progression_pattern}.
Most recent: ${cloud.trajectory.roles[0]?.title ?? "N/A"} at ${cloud.trajectory.roles[0]?.company ?? "N/A"}`);

  // Strongest evidence (what to build the letter around)
  if (report.strongest_evidence.length > 0) {
    sections.push(`STRONGEST EVIDENCE (build your claims around these):\n${report.strongest_evidence.map(s => `  - ${s}`).join("\n")}`);
  }

  // Achievement bank (concrete stories for the body paragraphs)
  if (cloud.achievements.length > 0) {
    sections.push(`ACHIEVEMENTS (use for specific claims):\n${cloud.achievements.map(a =>
      `  - "${a.title}" at ${a.source_role}${a.metric ? ` — ${a.metric}` : ""}${a.scale ? ` (scale: ${a.scale})` : ""}`
    ).join("\n")}`);
  }

  // Socratic depth answers — critical for voice matching and adding info beyond CV
  const socraticEvidence = cloud.nodes
    .flatMap(n => n.evidence.filter(e => e.type === "socratic"))
    .map(e => e.type === "socratic" ? `  - Q: "${e.question}" A: "${e.answer}"` : "")
    .filter(Boolean);

  if (socraticEvidence.length > 0) {
    sections.push(`CANDIDATE'S OWN WORDS (match this voice, use these insights):\n${socraticEvidence.join("\n")}`);
  }

  // Requirements with strong evidence (for confident claims)
  const strongMatches = report.requirements.filter(
    r => r.verdict === "strong_evidence" || r.verdict === "evidence_exists"
  );
  if (strongMatches.length > 0) {
    sections.push(`JD REQUIREMENTS WITH EVIDENCE:\n${strongMatches.map(m =>
      `  - "${m.requirement_text}" [${m.importance}] — ${m.evidence_summary}`
    ).join("\n")}`);
  }

  // Gaps (for honest bridge strategies)
  if (report.missing.length > 0) {
    sections.push(`GAPS (do NOT fabricate — use a bridge strategy for at most ONE):\n${report.missing.map(m => `  - ${m}`).join("\n")}`);
  }

  // Repositioning hints from requirements (honest bridge strategies)
  const bridges = report.requirements
    .filter(r => r.repositioning_hint)
    .map(r => `  - ${r.requirement_text}: ${r.repositioning_hint}`);
  if (bridges.length > 0) {
    sections.push(`BRIDGE STRATEGIES (use at most one in the letter):\n${bridges.join("\n")}`);
  }

  return sections.join("\n\n---\n\n");
}
