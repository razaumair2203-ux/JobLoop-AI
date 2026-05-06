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
 * Model selection — Cloud maturity is the master signal:
 *   - computeCloudMaturity() + gap complexity → selectModel()
 *   - Thin Cloud → Sonnet (can't afford mistakes early)
 *   - Rich Cloud → Haiku (known territory, save cost)
 *   - 90-day skip decay on existing evidence
 *   - Question count controlled by gates, not hardcoded caps
 */

import type { ProfileCloud, CloudNode, SocraticEvidence } from "./cloud";
import { findNode, computeSummary } from "./cloud";
import type { ParsedJD } from "./types";
import { getClient, MODELS } from "./client";
import { getProviderMode, getDevResponse } from "./provider";
import { safeParseJSON, generateId } from "./utils";
import { computeCloudMaturity, selectModel, type CloudMaturity } from "./cloud-maturity";
import { SOCRATIC_QUESTION_PROMPT } from "./prompts/socratic";

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

export interface ContradictionResult {
  found: boolean;
  contradictions: Array<{
    claim_a: string;
    claim_b: string;
    description: string;
  }>;
  follow_up_question: string | null;
}

// Safety ceiling — NOT the intended stop condition.
// The three-gate system (relevance + evidence gap + marginal value) is the primary
// stop mechanism. This ceiling only prevents pathological edge cases (e.g., 100-node
// cloud where gates pass for every node). The gates should stop generation well
// before this number is reached.
const SAFETY_CEILING_QUESTIONS = 10;

// Evidence older than this is stale — re-ask (Finding 6: 90-day skip decay)
const EVIDENCE_STALE_DAYS = 90;

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
  const relevance = evaluateRelevance(node, context);
  const evidence_gap = evaluateEvidenceGap(node);
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
  if (context.trigger === "jd_match") {
    return { pass: true, reason: `JD requires "${node.name}"` };
  }

  if (node.summary.number_of_roles > 0) {
    return { pass: true, reason: `Used professionally in ${node.summary.number_of_roles} role(s)` };
  }

  return { pass: false, reason: `"${node.name}" only listed, no role evidence — not worth asking about yet` };
}

// Finding 5: 90-day skip decay on Socratic evidence
function evaluateEvidenceGap(node: CloudNode): { pass: boolean; reason: string } {
  // Check for existing Socratic depth — but apply time decay
  const socraticEvidence = node.evidence.filter((e): e is SocraticEvidence => e.type === "socratic");

  if (socraticEvidence.length > 0) {
    // Check age of most recent Socratic answer
    const mostRecent = socraticEvidence
      .map(e => new Date(e.date).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    const daysSince = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24);

    if (daysSince < EVIDENCE_STALE_DAYS) {
      return { pass: false, reason: `Already has Socratic depth for "${node.name}" (${Math.round(daysSince)} days ago)` };
    }
    // Evidence is stale — re-ask
  }

  if (
    node.summary.has_external_validation &&
    node.summary.has_impact &&
    node.summary.number_of_roles >= 2
  ) {
    return { pass: false, reason: `"${node.name}" has strong evidence from multiple sources` };
  }

  const reasons: string[] = [];
  if (node.summary.number_of_roles === 0) reasons.push("no role context");
  if (node.summary.number_of_roles === 1) reasons.push("only 1 role");
  if (!node.summary.has_impact) reasons.push("no measurable impact");
  if (!node.summary.has_external_validation) reasons.push("no external validation");
  if (socraticEvidence.length > 0) reasons.push("previous answer is >90 days old");

  return { pass: true, reason: `Evidence is thin: ${reasons.join(", ")}` };
}

function evaluateMarginalValue(
  _node: CloudNode,
  cloud: ProfileCloud
): { pass: boolean; reason: string } {
  const nodesWithDepth = cloud.nodes.filter((n) => n.summary.has_depth).length;
  const totalNodes = cloud.nodes.filter((n) => n.summary.number_of_roles > 0).length;

  if (totalNodes > 0 && nodesWithDepth / totalNodes > 0.8) {
    return { pass: false, reason: "Cloud is already 80%+ deep — diminishing returns" };
  }

  return { pass: true, reason: "Answer would meaningfully enrich the cloud" };
}

// ============================================================
// RULE-BASED GAP CLASSIFIER (Finding 1 + Finding 2)
// Decides Haiku vs Sonnet for question generation
// ============================================================

type GapComplexity = "simple" | "complex" | "gray_zone";

function classifyGapComplexity(
  node: CloudNode,
  context: { trigger: "cv_upload" | "jd_match"; jd_requirement?: string },
): GapComplexity {
  // CV upload questions are always simpler — no domain bridging needed
  if (context.trigger === "cv_upload") return "simple";

  // JD match: check for domain bridging signals
  const jdReq = (context.jd_requirement || "").toLowerCase();
  const nodeEvidence = node.evidence
    .filter((e) => e.type === "role")
    .map((e) => (e as { company: string; title: string }).company + " " + (e as { company: string; title: string }).title)
    .join(" ")
    .toLowerCase();

  // High keyword overlap = simple match
  const jdWords = new Set(jdReq.split(/\s+/).filter(w => w.length > 3));
  const evidenceWords = new Set(nodeEvidence.split(/\s+/).filter(w => w.length > 3));
  let overlap = 0;
  for (const w of jdWords) {
    if (evidenceWords.has(w)) overlap++;
  }
  const overlapRatio = jdWords.size > 0 ? overlap / jdWords.size : 0;

  // >70% overlap = simple (same domain, obvious match)
  if (overlapRatio > 0.7) return "simple";

  // <40% overlap = complex (different domain, needs bridging)
  if (overlapRatio < 0.4) return "complex";

  // 40-70% = gray zone — check additional signals
  // Seniority jump detection
  const seniorityTerms = ["intern", "junior", "mid", "senior", "staff", "lead", "principal", "director", "vp"];
  const nodeSeniority = seniorityTerms.findIndex(t => nodeEvidence.includes(t));
  const jdSeniority = seniorityTerms.findIndex(t => jdReq.includes(t));
  if (nodeSeniority >= 0 && jdSeniority >= 0 && Math.abs(nodeSeniority - jdSeniority) >= 2) {
    return "complex"; // 2+ level seniority jump
  }

  // Domain-specific terminology mismatch (regulatory, certification frameworks)
  const domainSpecificTerms = ["certification", "compliance", "regulatory", "accreditation", "audit", "iso", "part 21", "easa", "faa", "dgca"];
  const hasJdDomainTerm = domainSpecificTerms.some(t => jdReq.includes(t));
  const hasEvidenceDomainTerm = domainSpecificTerms.some(t => nodeEvidence.includes(t));
  if (hasJdDomainTerm && !hasEvidenceDomainTerm) return "complex";

  return "gray_zone"; // Sonnet classifies
}

function selectQuestionModel(complexity: GapComplexity): "fast" | "quality" {
  switch (complexity) {
    case "simple": return "fast";
    case "complex": return "quality";
    case "gray_zone": return "quality"; // err on the side of quality for ambiguous cases
  }
}

// ============================================================
// QUESTION GENERATION
// ============================================================

// Prompt is now externalized to prompts/socratic.ts for AutoResearch optimization
const QUESTION_GENERATOR_PROMPT = SOCRATIC_QUESTION_PROMPT;

async function generateQuestion(
  node: CloudNode,
  context: { trigger: "cv_upload" | "jd_match"; jd_requirement?: string },
  maturity?: CloudMaturity,
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

  // API MODE — model selected from Cloud maturity + gap complexity
  const complexity = classifyGapComplexity(node, context);
  const gapComplexity = complexity === "simple" ? "simple" as const : "complex" as const;
  const modelTier = maturity
    ? selectModel(maturity, "socratic_question", { taskComplexity: gapComplexity })
    : selectQuestionModel(complexity); // fallback if no maturity passed
  const model = modelTier === "quality" ? MODELS.quality : MODELS.fast;

  const client = getClient();
  const response = await client.messages.create({
    model,
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
 * Stops when gates stop passing. Safety ceiling prevents runaway.
 */
export async function generateInitialQuestions(
  cloud: ProfileCloud,
  maxQuestions?: number
): Promise<SocraticQuestion[]> {
  const maturity = computeCloudMaturity(cloud);
  const candidates: CloudNode[] = [];

  for (const node of cloud.nodes) {
    const gate = evaluateGates(node, { trigger: "cv_upload" }, cloud);
    if (gate.should_ask) {
      candidates.push(node);
    }
  }

  // Sort: prioritize skills used in more roles (more important to the person)
  candidates.sort((a, b) => b.summary.number_of_roles - a.summary.number_of_roles);

  // Gates are the primary filter — safety ceiling is a guardrail only
  const limit = Math.min(maxQuestions ?? SAFETY_CEILING_QUESTIONS, SAFETY_CEILING_QUESTIONS);
  const questions: SocraticQuestion[] = [];

  for (const node of candidates.slice(0, limit)) {
    const { question, why_asking } = await generateQuestion(node, {
      trigger: "cv_upload",
    }, maturity);

    questions.push({
      id: generateId("sq"),
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
  const maturity = computeCloudMaturity(cloud);
  const questions: SocraticQuestion[] = [];

  // Collect all skills/keywords the JD mentions
  const jdSkills = [
    ...parsedJD.requirements.hard.flatMap((r) => r.keywords),
    ...parsedJD.technologies_mentioned.filter((t) => t.context === "required").map((t) => t.name),
  ];

  const uniqueSkills = [...new Set(jdSkills.map((s) => s.toLowerCase()))];

  for (const skillName of uniqueSkills) {
    const node = cloud.nodes.find(
      (n) =>
        n.name.toLowerCase() === skillName ||
        n.name.toLowerCase().includes(skillName) ||
        skillName.includes(n.name.toLowerCase())
    );

    if (!node) continue;

    const gate = evaluateGates(
      node,
      { trigger: "jd_match", jd_requirement: skillName },
      cloud
    );

    if (gate.should_ask) {
      const { question, why_asking } = await generateQuestion(node, {
        trigger: "jd_match",
        jd_requirement: skillName,
      }, maturity);

      questions.push({
        id: generateId("sq"),
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
 */
export function processAnswer(
  cloud: ProfileCloud,
  answer: SocraticAnswer,
  triggeredBy: string | null = null
): ProfileCloud {
  const evidence: SocraticEvidence = {
    type: "socratic",
    question: answer.question_id,
    answer: answer.answer,
    date: new Date().toISOString(),
    triggered_by: triggeredBy,
  };

  let node = findNode(cloud, answer.skill_name);

  if (node) {
    node.evidence.push(evidence);
    node.summary = computeSummary(node.evidence);
  } else {
    node = {
      id: generateId("node"),
      type: "skill",
      name: answer.skill_name,
      category: "other",
      evidence: [evidence],
      summary: computeSummary([evidence]),
    };
    cloud.nodes.push(node);
  }

  cloud.last_updated = new Date().toISOString();
  return cloud;
}

// ============================================================
// CROSS-ANSWER CONTRADICTION CHECK (Finding 9)
// ============================================================

/**
 * After all Socratic answers are collected, check for contradictions.
 * E.g., user says "single employer" but mentions consulting for another company.
 */
export function detectContradictions(
  answers: SocraticAnswer[],
  _cloud: ProfileCloud,
): ContradictionResult {
  const contradictions: ContradictionResult["contradictions"] = [];

  // Extract employer claims
  const employerMentions = new Set<string>();
  const singleEmployerClaim = answers.some(a =>
    /single employer|all .+|only .+ (employer|company|organization)/i.test(a.answer)
  );

  // Extract all org names mentioned in answers
  for (const a of answers) {
    // Look for "at [Company]", "for [Company]", "with [Company]"
    const orgMatches = a.answer.match(/(?:at|for|with|from)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+(?:from|during|in|as|where|,|\.))/g);
    if (orgMatches) {
      for (const m of orgMatches) {
        const org = m.replace(/^(?:at|for|with|from)\s+/i, "").replace(/\s+(?:from|during|in|as|where|,|\.)$/i, "").trim();
        if (org.length > 2) employerMentions.add(org);
      }
    }
  }

  // Check: claimed single employer but mentioned multiple
  if (singleEmployerClaim && employerMentions.size > 1) {
    contradictions.push({
      claim_a: "Single employer claimed",
      claim_b: `Multiple organizations mentioned: ${[...employerMentions].join(", ")}`,
      description: `You mentioned working for a single employer, but also referenced ${[...employerMentions].join(" and ")}. Can you clarify?`,
    });
  }

  // Check for overlapping date claims across answers
  const dateClaims: Array<{ answer_idx: number; start: string; end: string; context: string }> = [];
  for (let i = 0; i < answers.length; i++) {
    const dateRanges = answers[i].answer.match(/\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})\s*(?:to|[-–—])\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}|present)/gi);
    if (dateRanges) {
      for (const range of dateRanges) {
        const parts = range.split(/\s*(?:to|[-–—])\s*/i);
        if (parts.length === 2) {
          dateClaims.push({ answer_idx: i, start: parts[0], end: parts[1], context: answers[i].skill_name });
        }
      }
    }
  }

  // Check for contradictory dates for same skill
  for (let i = 0; i < dateClaims.length; i++) {
    for (let j = i + 1; j < dateClaims.length; j++) {
      if (dateClaims[i].context === dateClaims[j].context &&
          dateClaims[i].start !== dateClaims[j].start) {
        contradictions.push({
          claim_a: `${dateClaims[i].context}: ${dateClaims[i].start} to ${dateClaims[i].end}`,
          claim_b: `${dateClaims[j].context}: ${dateClaims[j].start} to ${dateClaims[j].end}`,
          description: `Different date ranges given for ${dateClaims[i].context}`,
        });
      }
    }
  }

  // Generate follow-up question if contradictions found
  let follow_up_question: string | null = null;
  if (contradictions.length > 0) {
    const first = contradictions[0];
    follow_up_question = `I noticed something that might need clarification: ${first.description}. Could you help me understand?`;
  }

  return {
    found: contradictions.length > 0,
    contradictions,
    follow_up_question,
  };
}
