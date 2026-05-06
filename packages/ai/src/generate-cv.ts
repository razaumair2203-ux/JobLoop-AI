import { getClient, MODELS } from "./client";
import {
  CV_GENERATION_SYSTEM_PROMPT,
  buildCVGenerationUserPrompt,
} from "./prompts/cv-generation";
import { getProviderMode, getDevResponse, saveDevPrompt } from "./provider";
import type { ProfileCloud } from "./cloud";
import type { CloudMatchReport } from "./cloud-matcher";
import { safeParseJSON } from "./utils";

export interface GeneratedCV {
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    location: string;
    bullets: string[];
  }>;
  skills: Record<string, string[]>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
    highlights: string[];
  }>;
  certifications: string[];
  changes_made: string[];
  keywords_integrated: string[];
  warnings: string[];
}

/**
 * Generate a tailored CV from raw text (legacy path).
 * Works without a Cloud — useful for first-time quick analysis.
 * @deprecated Use generateCloudTailoredCV() instead
 */
export async function generateTailoredCV(
  cv: string,
  jd: string,
  instructions?: string
): Promise<GeneratedCV> {
  const userPrompt = buildCVGenerationUserPrompt(cv, jd, instructions);
  return callCVGeneration(userPrompt);
}

/**
 * Generate a tailored CV using Cloud evidence (preferred path).
 * Includes evidence summaries, achievement bank, and Socratic answers
 * so the AI has richer context for better output.
 */
export async function generateCloudTailoredCV(
  cloud: ProfileCloud,
  matchReport: CloudMatchReport,
  jd: string,
  instructions?: string,
  modelTier?: "fast" | "quality"
): Promise<GeneratedCV> {
  const cloudContext = buildCloudContext(cloud, matchReport);
  const userPrompt = buildCloudCVPrompt(cloudContext, jd, instructions);
  return callCVGeneration(userPrompt, modelTier);
}

// ============================================================
// INTERNAL
// ============================================================

async function callCVGeneration(userPrompt: string, modelTier?: "fast" | "quality"): Promise<GeneratedCV> {
  // DEV MODE
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<GeneratedCV>("cv-gen", userPrompt);
    if (cached) return cached;

    const promptText = `SYSTEM:\n${CV_GENERATION_SYSTEM_PROMPT}\n\nUSER:\n${userPrompt}`;
    const id = saveDevPrompt("cv-gen", userPrompt, promptText);

    return {
      summary: `[DEV MODE] CV not cached. Process prompt: dev-data/prompts/${id}.txt`,
      experience: [],
      skills: {},
      education: [],
      certifications: [],
      changes_made: [],
      keywords_integrated: [],
      warnings: [`Process prompt ${id} to generate tailored CV`],
    };
  }

  // API MODE
  const client = getClient();
  const response = await client.messages.create({
    model: modelTier === "fast" ? MODELS.fast : MODELS.quality,
    max_tokens: 8192,
    system: CV_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<GeneratedCV>(text, "CV generation");
}

function buildCloudContext(cloud: ProfileCloud, report: CloudMatchReport): string {
  const sections: string[] = [];

  // Career trajectory
  sections.push(`CAREER TRAJECTORY:
Total experience: ${cloud.trajectory.total_experience_years} years
Pattern: ${cloud.trajectory.progression_pattern}
Roles: ${cloud.trajectory.roles.map(r => `${r.title} at ${r.company} (${r.duration_months}mo)`).join(" -> ")}`);

  // Strong evidence (what to lead with)
  if (report.strongest_evidence.length > 0) {
    sections.push(`STRONGEST EVIDENCE (lead with these in the CV):\n${report.strongest_evidence.map(s => `  - ${s}`).join("\n")}`);
  }

  // Achievement bank (STAR stories to weave into bullets)
  if (cloud.achievements.length > 0) {
    sections.push(`ACHIEVEMENT BANK (use these for impact-focused bullets):\n${cloud.achievements.map(a =>
      `  - "${a.title}" at ${a.source_role}${a.metric ? ` (metric: ${a.metric})` : ""}${a.scale ? ` (scale: ${a.scale})` : ""}`
    ).join("\n")}`);
  }

  // Socratic depth answers (additional context the raw CV doesn't have)
  const socraticEvidence = cloud.nodes
    .flatMap(n => n.evidence.filter(e => e.type === "socratic"))
    .map(e => e.type === "socratic" ? `  - Q: "${e.question}" A: "${e.answer}"` : "")
    .filter(Boolean);

  if (socraticEvidence.length > 0) {
    sections.push(`ADDITIONAL DEPTH (from candidate's own words — weave into relevant bullets):\n${socraticEvidence.join("\n")}`);
  }

  // Certifications
  if (cloud.certifications.length > 0) {
    sections.push(`CERTIFICATIONS: ${cloud.certifications.map(c => c.name).join(", ")}`);
  }

  // Evidence gaps (what to be careful about)
  if (report.missing.length > 0) {
    sections.push(`MISSING FROM PROFILE (do NOT fabricate these):\n${report.missing.map(m => `  - ${m}`).join("\n")}`);
  }

  // Thin evidence (present carefully)
  if (report.thin_evidence.length > 0) {
    sections.push(`THIN EVIDENCE (present honestly, don't oversell):\n${report.thin_evidence.map(t => `  - ${t}`).join("\n")}`);
  }

  return sections.join("\n\n---\n\n");
}

function buildCloudCVPrompt(
  cloudContext: string,
  jd: string,
  instructions?: string
): string {
  let prompt = `## Profile Cloud Evidence (richer than the raw CV — use this)

${cloudContext}

---

## Target Job Description

${jd}`;

  if (instructions) {
    prompt += `\n\n---\n\n## Candidate's Instructions\n\n${instructions}`;
  }

  prompt += `\n\n---\n\nGenerate a tailored CV using the evidence above. The Cloud evidence includes achievements, metrics, and depth answers not present in a typical CV — weave these into impact-focused bullets. Follow all rules exactly. Return ONLY the JSON object, no markdown fences.`;

  return prompt;
}
