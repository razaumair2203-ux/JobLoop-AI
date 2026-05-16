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

/** Outcome context from previous applications — injected into CV gen for smarter emphasis */
export interface CVOutcomeContext {
  skill_signals: Array<{
    skill_name: string;
    signals: Array<{ signal: "positive" | "gap"; context: string; niche: string }>;
  }>;
  niche_history: Array<{
    company: string;
    role: string;
    outcome: string;
    feedback_summary: string | null;
  }>;
}

/**
 * Generate a tailored CV using Cloud evidence (preferred path).
 * Includes evidence summaries, achievement bank, Socratic answers,
 * and outcome intelligence from previous applications.
 */
export async function generateCloudTailoredCV(
  cloud: ProfileCloud,
  matchReport: CloudMatchReport,
  jd: string,
  instructions?: string,
  modelTier?: "fast" | "quality",
  outcomeContext?: CVOutcomeContext | null,
): Promise<GeneratedCV> {
  const cloudContext = buildCloudContext(cloud, matchReport, outcomeContext);
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
  const result = safeParseJSON<GeneratedCV>(text, "CV generation");
  validateGeneratedCV(result);
  return result;
}

function validateGeneratedCV(cv: GeneratedCV): void {
  if (typeof cv.summary !== "string") {
    throw new Error("[CV GEN] Invalid output: missing 'summary' string");
  }
  if (!Array.isArray(cv.experience)) {
    throw new Error("[CV GEN] Invalid output: missing 'experience' array");
  }
  if (typeof cv.skills !== "object" || cv.skills === null || Array.isArray(cv.skills)) {
    throw new Error("[CV GEN] Invalid output: missing 'skills' object");
  }
  if (!Array.isArray(cv.education)) {
    throw new Error("[CV GEN] Invalid output: missing 'education' array");
  }
}

function buildCloudContext(cloud: ProfileCloud, report: CloudMatchReport, outcomeCtx?: CVOutcomeContext | null): string {
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

  // Outcome Intelligence — what worked/didn't in previous applications for this niche
  if (outcomeCtx) {
    const outcomeLines: string[] = [];

    // Skill-level signals from employer feedback
    for (const ss of outcomeCtx.skill_signals.slice(0, 8)) {
      const positives = ss.signals.filter(s => s.signal === "positive").length;
      const gaps = ss.signals.filter(s => s.signal === "gap").length;
      if (positives > 0) outcomeLines.push(`  + "${ss.skill_name}": ${positives} employer(s) praised this`);
      if (gaps > 0) outcomeLines.push(`  - "${ss.skill_name}": ${gaps} employer(s) flagged as gap`);
    }

    // Application history for context
    for (const app of outcomeCtx.niche_history.slice(0, 5)) {
      const fb = app.feedback_summary ? ` — "${app.feedback_summary}"` : "";
      outcomeLines.push(`  ${app.company} (${app.role}): ${app.outcome}${fb}`);
    }

    if (outcomeLines.length > 0) {
      sections.push(`APPLICATION HISTORY FOR THIS NICHE (use to inform emphasis decisions):
${outcomeLines.join("\n")}
Note: Lead with skills that got positive signals. Address gaps proactively if candidate has new evidence. Do NOT fabricate — this is context, not content.`);
    }
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
