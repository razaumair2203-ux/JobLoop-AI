/**
 * Socratic Questioning Engine
 *
 * Asks targeted questions to deepen the profile cloud.
 * Two triggers:
 *   1. After CV upload — fill initial gaps
 *   2. After JD match — deepen evidence for skills the JD needs
 *
 * Uses intelligent gating (from spec §4.2):
 *   ASK only if ALL three gates pass:
 *   - RELEVANCE: Is this skill/gap important enough to ask about?
 *   - EVIDENCE GAP: Is the existing evidence thin?
 *   - MARGINAL VALUE: Will the answer meaningfully improve the cloud?
 *
 * Stops naturally when the cloud is rich enough.
 */

import type { ProfileCloud, CloudNode, Evidence, SocraticEvidence } from "./cloud";
import type { ParsedJD } from "./types";
import { getClient, MODELS } from "./client";
import { getProviderMode, getDevResponse, saveDevPrompt } from "./provider";
import { safeParseJSON } from "./utils";

// ============================================================
// TYPES
// ============================================================

export interface SocraticQuestion {
  id: string;
  skill_name: string;
  question: string;
  why_asking: string;           // transparent — tell user why
  evidence_gap: string;         // what's missing
  triggered_by: "cv_upload" | "jd_match";
  jd_context: string | null;    // which JD requirement triggered this
}

export interface SocraticAnswer {
  question_id: string;
  skill_name: string;
  answer: string;
}

// ============================================================
// THREE-GATE SYSTEM — Decides whether to ask a question
// ============================================================

interface GateResult {
  should_ask: boolean;
  relevance: { pass: boolean; reason: string };
  evidence_gap: { pass: boolean; reason: string };
  marginal_value: { pass: boolean; reason: string };
}

function evaluateGates(
  node: CloudNode,
  context: { trigger: "cv_upload" | "jd_match"; jd_requirement?: string },
  cloud: ProfileCloud
): GateResult {
  // GATE 1: RELEVANCE — Is this worth asking about?
  const relevance = evaluateRelevance(node, context);

  // GATE 2: EVIDENCE GAP — Is the evidence thin?
  const evidence_gap = evaluateEvidenceGap(node);

  // GATE 3: MARGINAL VALUE — Will an answer actually help?
  const marginal_value = evaluateMarginalValue(node, cloud);

  return {
    should_ask: relevance.pass && evidence_gap.pass && marginal_value.pass,
    relevance,
    evidence_gap,
    marginal_value,
  };
}

function evaluateRelevance(
  node: CloudNode,
  context: { trigger: "cv_upload" | "jd_match"; jd_requirement?: string }
): { pass: boolean; reason: string } {
  // If triggered by a JD, the skill is relevant by definition (JD asked for it)
  if (context.trigger === "jd_match") {
    return { pass: true, reason: `JD requires "${node.name}"` };
  }

  // For CV upload: skills used in roles are relevant, "listed only" are less so
  if (node.summary.number_of_roles > 0) {
    return { pass: true, reason: `Used professionally in ${node.summary.number_of_roles} role(s)` };
  }

  // Listed-only skills: only relevant if they appear in multiple contexts
  return { pass: false, reason: `"${node.name}" only listed, no role evidence — not worth asking about yet` };
}

function evaluateEvidenceGap(node: CloudNode): { pass: boolean; reason: string } {
  // If already has depth (Socratic answers), no gap
  if (node.summary.has_depth) {
    return { pass: false, reason: `Already has Socratic depth for "${node.name}"` };
  }

  // If has external validation + impact + multiple roles, evidence is rich enough
  if (
    node.summary.has_external_validation &&
    node.summary.has_impact &&
    node.summary.number_of_roles >= 2
  ) {
    return { pass: false, reason: `"${node.name}" has strong evidence from multiple sources` };
  }

  // Gap exists — thin evidence
  const reasons: string[] = [];
  if (node.summary.number_of_roles === 0) reasons.push("no role context");
  if (node.summary.number_of_roles === 1) reasons.push("only 1 role");
  if (!node.summary.has_impact) reasons.push("no measurable impact");
  if (!node.summary.has_external_validation) reasons.push("no external validation");

  return { pass: true, reason: `Evidence is thin: ${reasons.join(", ")}` };
}

function evaluateMarginalValue(
  node: CloudNode,
  cloud: ProfileCloud
): { pass: boolean; reason: string } {
  // Check how many Socratic questions have already been asked total
  const totalSocraticAnswers = cloud.nodes.reduce(
    (sum, n) => sum + n.evidence.filter((e) => e.type === "socratic").length,
    0
  );

  // Check if user has been skipping questions (from past interactions)
  const skipCount = 0; // TODO: track from user behavior

  // If cloud is already very rich (many nodes with depth), marginal value drops
  const nodesWithDepth = cloud.nodes.filter((n) => n.summary.has_depth).length;
  const totalNodes = cloud.nodes.filter((n) => n.summary.number_of_roles > 0).length;

  if (totalNodes > 0 && nodesWithDepth / totalNodes > 0.8) {
    return { pass: false, reason: "Cloud is already 80%+ deep — diminishing returns" };
  }

  return { pass: true, reason: "Answer would meaningfully enrich the cloud" };
}

// ============================================================
// QUESTION GENERATION
// ============================================================

const QUESTION_GENERATOR_PROMPT = `You generate a single targeted question to deepen understanding of a candidate's skill/experience.

You receive:
- The skill name
- What evidence already exists
- What's missing

Generate ONE question that would fill the most important gap. The question should:
- Be specific and answerable in 1-3 sentences
- Not be a yes/no question
- Focus on WHAT they did, HOW they used it, or WHAT the result was
- Feel like a smart interviewer, not a form

Return JSON:
{
  "question": "<the question>",
  "why_asking": "<1 sentence explaining what this will reveal — shown to user>"
}`;

async function generateQuestion(
  node: CloudNode,
  context: { trigger: "cv_upload" | "jd_match"; jd_requirement?: string }
): Promise<{ question: string; why_asking: string }> {
  const existingEvidence = node.evidence
    .map((e) => {
      switch (e.type) {
        case "role":
          return `Used at ${e.company} for ${e.duration_months} months`;
        case "impact":
          return `Impact: ${e.description}`;
        case "certification":
          return `Certified: ${e.name}`;
        case "socratic":
          return `Previously answered: "${e.question}" → "${e.answer}"`;
        default:
          return `${e.type} evidence exists`;
      }
    })
    .join("\n");

  const gaps: string[] = [];
  if (node.summary.number_of_roles <= 1) gaps.push("only used in 1 or fewer roles");
  if (!node.summary.has_impact) gaps.push("no measurable impact mentioned");
  if (!node.summary.has_depth) gaps.push("no depth beyond CV text");

  const prompt = `Skill: ${node.name}

Existing evidence:
${existingEvidence || "(listed in skills only — no details)"}

Evidence gaps: ${gaps.join(", ")}

${context.jd_requirement ? `JD context: A job requires "${context.jd_requirement}"` : "Context: Initial profile building after CV upload"}

Generate ONE question. Return ONLY JSON.`;

  // DEV MODE — return template questions based on gap type
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<{ question: string; why_asking: string }>("socratic", prompt);
    if (cached) return cached;

    // Generate a reasonable template question based on what's missing
    if (!node.summary.has_impact) {
      return {
        question: `Can you describe a specific measurable outcome you achieved using ${node.name}? For example, a metric you improved, time saved, or scale you handled.`,
        why_asking: `Your profile shows you've used ${node.name}, but doesn't include measurable results — adding one would significantly strengthen your evidence.`,
      };
    }
    if (node.summary.number_of_roles <= 1) {
      return {
        question: `Beyond ${node.evidence.find(e => e.type === "role")?.type === "role" ? "your current role" : "what's listed"}, have you used ${node.name} in other contexts — side projects, previous roles, or consulting work?`,
        why_asking: `${node.name} only appears in one context in your profile — additional examples would show broader experience.`,
      };
    }
    return {
      question: `What's the most complex or challenging problem you've solved using ${node.name}? Walk me through your approach.`,
      why_asking: `Adding depth to your ${node.name} experience helps distinguish you from candidates who only list it as a keyword.`,
    };
  }

  // API MODE
  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 512,
    system: QUESTION_GENERATOR_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<{ question: string; why_asking: string }>(text, "Socratic question generation");
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Generate questions after CV upload.
 * Targets skills that are used professionally but lack depth.
 */
export async function generateInitialQuestions(
  cloud: ProfileCloud,
  maxQuestions?: number
): Promise<SocraticQuestion[]> {
  const candidates: CloudNode[] = [];

  for (const node of cloud.nodes) {
    const gate = evaluateGates(node, { trigger: "cv_upload" }, cloud);
    if (gate.should_ask) {
      candidates.push(node);
    }
  }

  // Sort: prioritize skills used in more roles (more important to the person)
  candidates.sort((a, b) => b.summary.number_of_roles - a.summary.number_of_roles);

  // Generate questions — gate naturally limits, but cap at a reasonable batch
  const limit = maxQuestions ?? candidates.length;
  const questions: SocraticQuestion[] = [];

  for (const node of candidates.slice(0, limit)) {
    const { question, why_asking } = await generateQuestion(node, {
      trigger: "cv_upload",
    });

    questions.push({
      id: `sq_${Date.now()}_${questions.length}`,
      skill_name: node.name,
      question,
      why_asking,
      evidence_gap: evaluateEvidenceGap(node).reason,
      triggered_by: "cv_upload",
      jd_context: null,
    });
  }

  return questions;
}

/**
 * Generate questions after JD match.
 * Targets skills the JD needs where cloud evidence is thin.
 */
export async function generateJDQuestions(
  cloud: ProfileCloud,
  parsedJD: ParsedJD
): Promise<SocraticQuestion[]> {
  const questions: SocraticQuestion[] = [];

  // Collect all skills/keywords the JD mentions
  const jdSkills = [
    ...parsedJD.requirements.hard.flatMap((r) => r.keywords),
    ...parsedJD.technologies_mentioned.filter((t) => t.context === "required").map((t) => t.name),
  ];

  const uniqueSkills = [...new Set(jdSkills.map((s) => s.toLowerCase()))];

  for (const skillName of uniqueSkills) {
    // Find this skill in the cloud
    const node = cloud.nodes.find(
      (n) =>
        n.name.toLowerCase() === skillName ||
        n.name.toLowerCase().includes(skillName) ||
        skillName.includes(n.name.toLowerCase())
    );

    if (!node) continue; // skill not in cloud at all — can't ask about what they don't have

    const gate = evaluateGates(
      node,
      { trigger: "jd_match", jd_requirement: skillName },
      cloud
    );

    if (gate.should_ask) {
      const { question, why_asking } = await generateQuestion(node, {
        trigger: "jd_match",
        jd_requirement: skillName,
      });

      questions.push({
        id: `sq_${Date.now()}_${questions.length}`,
        skill_name: node.name,
        question,
        why_asking,
        evidence_gap: gate.evidence_gap.reason,
        triggered_by: "jd_match",
        jd_context: `JD requires: ${skillName}`,
      });
    }
  }

  return questions;
}

/**
 * Process a user's answer — adds Socratic evidence to the cloud node.
 * Returns the updated cloud.
 */
export function processAnswer(
  cloud: ProfileCloud,
  answer: SocraticAnswer
): ProfileCloud {
  const node = cloud.nodes.find(
    (n) => n.name.toLowerCase() === answer.skill_name.toLowerCase()
  );

  if (!node) return cloud;

  const evidence: SocraticEvidence = {
    type: "socratic",
    question: answer.question_id, // store question reference
    answer: answer.answer,
    date: new Date().toISOString(),
    triggered_by: null,
  };

  node.evidence.push(evidence);

  // Recompute summary
  node.summary.has_depth = true;

  return cloud;
}
