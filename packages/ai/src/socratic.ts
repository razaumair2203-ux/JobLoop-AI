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
 *   - Thin Cloud → quality tier (can't afford mistakes early)
 *   - Rich Cloud → fast tier (known territory, save cost)
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
import { skillsMatch } from "./skill-matching";

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

/**
 * Context about the candidate — passed to question generation for
 * persona-aware, domain-appropriate questions.
 */
export interface SocraticContext {
  persona?: string;
  candidate_context?: {
    primary_profession?: string;
    specialization?: string;
    career_level?: string;
    country_of_qualification?: string;
    candidate_name?: string;
  };
}

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
  // Gate 0: NEVER ask about domain nodes — "healthcare" is not a skill you "use"
  if (node.type === "domain") {
    return { pass: false, reason: `"${node.name}" is a domain, not a skill — skip` };
  }

  // Gate 0b: Skip license/registration nodes — they're credentials, not skills to probe
  if (node.tier === "license" || /\blicen[sc]e\b/i.test(node.name)) {
    return { pass: false, reason: `"${node.name}" is a license/registration — not probeable` };
  }

  if (context.trigger === "jd_match") {
    return { pass: true, reason: `JD requires "${node.name}"` };
  }

  if (node.summary.number_of_roles > 0) {
    return { pass: true, reason: `Used professionally in ${node.summary.number_of_roles} role(s)` };
  }

  return { pass: false, reason: `"${node.name}" only listed, no role evidence — not worth asking about yet` };
}

/**
 * Classify a node's "question type" — determines WHAT kind of question to ask.
 * Different from whether to ask at all (that's the gate system).
 */
type QuestionNodeType = "applied_skill" | "certification" | "qualification";

function classifyQuestionNodeType(node: CloudNode): QuestionNodeType {
  // Certifications — ACLS, BLS, PALS, etc.
  if (node.tier === "certification" || node.tier === "voluntary") {
    return "certification";
  }
  // Education/qualification — FCPS, MBBS, etc.
  if (node.tier === "education" || /\b(FCPS|MBBS|MD|MS|PhD|MBA|CPA|PE|CFA)\b/i.test(node.name)) {
    return "qualification";
  }
  return "applied_skill";
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
  node: CloudNode,
  _cloud: ProfileCloud
): { pass: boolean; reason: string } {
  // Per-node check: if THIS node already has depth, skip it
  // (Previously used global 80% threshold which blocked ALL questions when most nodes were deep)
  if (node.summary.has_depth && node.summary.has_impact && node.summary.number_of_roles >= 2) {
    return { pass: false, reason: `"${node.name}" already has depth + impact + multiple roles` };
  }

  return { pass: true, reason: "Answer would meaningfully enrich the cloud" };
}

// ============================================================
// RULE-BASED GAP CLASSIFIER (Finding 1 + Finding 2)
// Decides fast tier vs quality tier for question generation
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

  return "gray_zone"; // quality tier classifies
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
  socraticCtx?: SocraticContext,
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

  // Build context lines for the prompt
  const contextLines: string[] = [];
  if (socraticCtx?.candidate_context?.primary_profession) {
    contextLines.push(`Candidate profession: ${socraticCtx.candidate_context.primary_profession}`);
  }
  if (socraticCtx?.candidate_context?.specialization) {
    contextLines.push(`Specialization: ${socraticCtx.candidate_context.specialization}`);
  }
  if (socraticCtx?.candidate_context?.career_level) {
    contextLines.push(`Career level: ${socraticCtx.candidate_context.career_level}`);
  }
  if (socraticCtx?.persona) {
    contextLines.push(`Persona: ${socraticCtx.persona}`);
  }

  const prompt = `${contextLines.length > 0 ? contextLines.join("\n") + "\n\n" : ""}Skill: ${node.name}

Existing evidence:
${existingEvidence || "(listed in skills only — no details)"}

Evidence gaps: ${gaps.join(", ")}

${context.jd_requirement ? `JD context: A job requires "${context.jd_requirement}"` : "Context: Initial profile building after CV upload"}

Generate ONE question. Return ONLY JSON.`;

  // DEV MODE — return context-aware template questions
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<{ question: string; why_asking: string }>("socratic", prompt);
    if (cached) return cached;

    return generateDevQuestion(node, socraticCtx);
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

/**
 * Dev-mode question generation — context-aware templates.
 * These are the PRODUCT during alpha testing. Must be as thoughtful as API output.
 *
 * Question design principles:
 * 1. CERTIFICATIONS get "application" questions ("In what scenarios have you applied X?")
 * 2. QUALIFICATIONS get "depth" questions ("What was your most complex case in X?")
 * 3. SKILLS get "impact" questions ("What measurable outcome did X produce?")
 * 4. Questions REFERENCE actual evidence data (company names, durations, role counts)
 * 5. Questions feel like a curious expert, not a checkbox form
 */
function generateDevQuestion(
  node: CloudNode,
  ctx?: SocraticContext,
): { question: string; why_asking: string } {
  const skill = node.name;
  const persona = ctx?.persona;
  const profession = ctx?.candidate_context?.primary_profession;
  const specialization = ctx?.candidate_context?.specialization;
  const nodeType = classifyQuestionNodeType(node);

  // Find the most relevant role evidence for contextual reference
  const roleEvidence = node.evidence.filter(e => e.type === "role") as
    Array<{ type: "role"; company: string; title: string; duration_months: number }>;
  const primaryRole = roleEvidence[0];
  const roleRef = primaryRole
    ? `your work at ${primaryRole.company}`
    : "your experience";
  const totalMonths = node.summary.total_months_used;
  const yearsUsed = totalMonths >= 12 ? `${Math.round(totalMonths / 12)} years` : `${totalMonths} months`;

  // ── CERTIFICATIONS (ACLS, BLS, PALS, etc.) ──
  // These are credentials you HOLD. Ask about APPLICATION, not impact.
  if (nodeType === "certification") {
    const workContext = profession
      ? `${profession.toLowerCase()} work`
      : "professional work";
    if (roleEvidence.length > 0) {
      return {
        question: `You've held your ${skill} certification across ${yearsUsed} of ${workContext}. Can you describe a specific situation where this training directly influenced your decision-making or outcome?`,
        why_asking: `Certifications become compelling evidence when linked to real scenarios — showing real application is far stronger than just listing it.`,
      };
    }
    return {
      question: `How has your ${skill} training shaped your ${workContext}? Can you walk me through a situation where you applied it?`,
      why_asking: `A certification on paper is weaker than a certification with a story — showing real application makes it meaningful evidence.`,
    };
  }

  // ── QUALIFICATIONS (FCPS, MBBS, MD, PhD, etc.) ──
  // These represent deep training. Ask about the depth of expertise they represent.
  if (nodeType === "qualification") {
    if (specialization) {
      return {
        question: `Your ${skill} represents significant ${specialization} training. What was the most complex or challenging case/project during your training, and what made your approach distinctive?`,
        why_asking: `Fellowship-level qualifications deserve depth evidence — employers want to know the caliber of cases you've handled, not just that you passed.`,
      };
    }
    return {
      question: `During your ${skill} training, what was the most challenging case or project you worked on? What was unique about your approach or its outcome?`,
      why_asking: `Your qualification shows you completed the training — depth evidence shows the caliber of practitioner you became.`,
    };
  }

  // ── APPLIED SKILLS ──
  // These are the core — ask based on what's MISSING.

  // Gap: No measurable impact
  if (!node.summary.has_impact) {
    if (persona === "military") {
      return {
        question: `During ${roleRef}, what operational improvement or readiness outcome resulted from your work with ${skill}? Think: efficiency gains, cost savings, personnel trained.`,
        why_asking: `Your profile shows ${skill} experience but no quantified results — military achievements translated into civilian metrics make your profile stand out.`,
      };
    }
    if (persona === "executive" || persona === "senior") {
      return {
        question: `What was the strategic or business impact of your ${skill} work${primaryRole ? ` at ${primaryRole.company}` : ""}? Revenue, cost reduction, team scale, or organizational change.`,
        why_asking: `Senior roles need scope and impact evidence — "led" without "achieved what" leaves your expertise understated.`,
      };
    }
    if (persona === "early_career") {
      return {
        question: `What's a specific result you achieved using ${skill}${primaryRole ? ` at ${primaryRole.company}` : ""}? Even small wins count — a bug fixed, a feature shipped, positive feedback received.`,
        why_asking: `Early career profiles benefit hugely from concrete outcomes — it shows you don't just list skills, you apply them.`,
      };
    }
    if (persona === "career_changer") {
      return {
        question: `How did ${skill} from ${profession ? `your ${profession} background` : "your previous field"} create measurable value? What outcome would translate to your new target field?`,
        why_asking: `Career changers need to show transferable impact — not just "I used X" but "X produced Y result that matters in your new field too."`,
      };
    }
    // Default — weave in actual evidence data
    if (roleEvidence.length > 0 && totalMonths > 24) {
      const companies = roleEvidence.map(r => r.company).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(" and ");
      const hint = profession
        ? ` In ${profession}, this might be patient outcomes, process improvements, cost savings, or quality metrics.`
        : "";
      return {
        question: `You've applied ${skill} across ${yearsUsed} at ${companies}. What's a specific measurable outcome from that experience?${hint}`,
        why_asking: `Your profile shows ${skill} experience across multiple roles but no quantified results — one concrete outcome dramatically strengthens your evidence.`,
      };
    }
    const domainHint = profession
      ? ` In ${profession}, this might be patient outcomes, project delivery, cost savings, or quality improvements.`
      : " For example: a metric you improved, time saved, team size managed, or problem solved.";
    return {
      question: `Can you describe a specific measurable outcome from ${roleRef} involving ${skill}?${domainHint}`,
      why_asking: `Your profile shows ${skill} experience but no quantified results — one concrete outcome dramatically strengthens your evidence.`,
    };
  }

  // Gap: Only used in 1 or fewer roles
  if (node.summary.number_of_roles <= 1) {
    if (persona === "freelancer") {
      return {
        question: `Beyond ${roleRef}, have you applied ${skill} in other client engagements, side projects, or consulting work?`,
        why_asking: `Freelancers often understate breadth — showing ${skill} across multiple contexts demonstrates versatility.`,
      };
    }
    return {
      question: `Have you used ${skill} outside of ${roleRef}? This could be in a previous role, a side project, volunteer work, or training.`,
      why_asking: `${skill} only appears in one context — additional examples would show breadth and sustained expertise.`,
    };
  }

  // Gap: No external validation
  if (!node.summary.has_external_validation) {
    return {
      question: `Have you received any formal recognition for your ${skill} work — certifications, awards, speaking invitations, publications, or peer acknowledgments?`,
      why_asking: `External validation (third-party recognition) is the strongest evidence type — it independently confirms your expertise in ${skill}.`,
    };
  }

  // Default: ask for depth — use actual data
  if (persona === "returner") {
    return {
      question: `Since returning to work, how has your approach to ${skill} evolved? What have you done to stay current?`,
      why_asking: `Showing current engagement with ${skill} addresses the most common employer concern about career gaps.`,
    };
  }

  if (roleEvidence.length >= 2) {
    return {
      question: `Across your ${yearsUsed} using ${skill} at ${roleEvidence.length} organizations, what's the most challenging problem you've tackled? Walk me through your approach.`,
      why_asking: `You have breadth — now show depth. A specific challenge story reveals expertise that keyword lists can't.`,
    };
  }

  return {
    question: `What's the most challenging problem you've solved using ${skill}${primaryRole ? ` at ${primaryRole.company}` : ""}? Walk me through your approach.`,
    why_asking: `Adding depth to your ${skill} experience shows expertise beyond keyword listing.`,
  };
}

// ============================================================
// CONTEXT ENRICHMENT
// ============================================================

/**
 * Infer persona from candidate_context when persona is not explicitly set.
 * Also enriches candidate_context from Cloud identity when not set.
 */
function enrichContext(ctx: SocraticContext | undefined, cloud: ProfileCloud): SocraticContext {
  const enriched: SocraticContext = { ...ctx };

  // Fill candidate_context from Cloud identity if missing
  if (!enriched.candidate_context && cloud.identity) {
    enriched.candidate_context = {
      primary_profession: cloud.identity.core_profession || undefined,
      specialization: cloud.identity.specializations?.[0] || undefined,
      career_level: cloud.identity.career_stage || undefined,
    };
  }

  // Infer persona from career data when not explicitly selected
  if (!enriched.persona && cloud.trajectory) {
    const years = cloud.trajectory.total_experience_years;
    const roles = cloud.trajectory.roles?.length ?? 0;

    if (years <= 3 || roles <= 1) {
      enriched.persona = "early_career";
    } else if (years > 15 || roles > 6) {
      enriched.persona = "senior";
    } else {
      enriched.persona = "mid_career";
    }
  }

  return enriched;
}

// ============================================================
// ROLE-IMPLIED GAP DETECTION
// Users are careless — their CVs describe what they DID but omit
// the SKILLS they used. This function looks at the user's roles
// and profession, infers what skills they SHOULD have, checks if
// the Cloud has them, and generates targeted confirmation questions.
//
// DESIGN: Profession-agnostic. Uses role title patterns + profession
// context to infer skills, NOT a hardcoded taxonomy.
// In dev mode: template heuristics. In production: LLM inference.
// ============================================================

/**
 * Role-title → expected skill patterns.
 * NOT a complete taxonomy — just common patterns across professions.
 * The LLM prompt (production mode) does the real inference.
 * This is the dev-mode fallback for alpha testing.
 */
const ROLE_SKILL_PATTERNS: Array<{
  /** Regex matching role titles */
  rolePattern: RegExp;
  /** Skills implied by this role */
  impliedSkills: string[];
  /** Question template: {role} = role title, {skill} = implied skill, {company} = company */
  questionTemplate: string;
}> = [
  // ── MEDICAL ──
  {
    rolePattern: /\b(anesthesi|anaesthesi)/i,
    impliedSkills: ["Airway Management", "Hemodynamic Monitoring", "Regional Anesthesia", "Ventilator Management", "Pain Management"],
    questionTemplate: "As {role}, did you regularly perform {skill}? If so, what was your approach or a challenging case?",
  },
  {
    rolePattern: /\b(intensivist|icu|critical care|intensive care)/i,
    impliedSkills: ["Mechanical Ventilation", "Hemodynamic Monitoring", "Sedation Protocols", "Central Line Placement", "Sepsis Management"],
    questionTemplate: "In your ICU work at {company}, did you handle {skill}? Tell us about a specific case or protocol you followed.",
  },
  {
    rolePattern: /\b(surgeon|surgical)/i,
    impliedSkills: ["Surgical Planning", "Intraoperative Decision-Making", "Tissue Handling", "Surgical Team Leadership"],
    questionTemplate: "During your surgical work, what was your experience with {skill}? Any complex cases?",
  },
  {
    rolePattern: /\b(emergency|er physician|trauma)/i,
    impliedSkills: ["Emergency Triage", "Trauma Assessment", "Rapid Decision-Making", "Resuscitation"],
    questionTemplate: "In emergency medicine at {company}, how did you apply {skill}? Walk us through a scenario.",
  },
  // ── ENGINEERING ──
  {
    rolePattern: /\b(software engineer|developer|sde|swe)\b/i,
    impliedSkills: ["Code Review", "System Design", "Debugging & Troubleshooting", "Version Control (Git)"],
    questionTemplate: "As {role}, what was your approach to {skill}? Any examples of complex problems you solved?",
  },
  {
    rolePattern: /\b(devops|sre|site reliability|platform engineer)/i,
    impliedSkills: ["CI/CD Pipeline Design", "Infrastructure as Code", "Monitoring & Alerting", "Incident Response"],
    questionTemplate: "In your {role} work, how did you handle {skill}? What tools or approaches did you use?",
  },
  {
    rolePattern: /\b(data scientist|machine learning|ml engineer)/i,
    impliedSkills: ["Statistical Modeling", "Feature Engineering", "Model Evaluation", "Data Pipeline Design"],
    questionTemplate: "As {role}, what was your most impactful work with {skill}? What approach did you take?",
  },
  // ── MANAGEMENT / BUSINESS ──
  {
    rolePattern: /\b(project manager|program manager)\b/i,
    impliedSkills: ["Stakeholder Management", "Risk Assessment", "Budget Management", "Schedule Management"],
    questionTemplate: "In your PM role at {company}, how did you handle {skill}? Give us a specific example.",
  },
  {
    rolePattern: /\b(director|vp|vice president|head of|chief)\b/i,
    impliedSkills: ["Strategic Planning", "Budget Oversight", "Cross-Functional Leadership", "Performance Management"],
    questionTemplate: "As {role}, what was your approach to {skill}? What scale were you working at?",
  },
  // ── EDUCATION / TRAINING ──
  {
    rolePattern: /\b(instructor|trainer|educator|professor|lecturer)/i,
    impliedSkills: ["Curriculum Development", "Assessment Design", "Adult Education Methodology", "Student/Trainee Evaluation"],
    questionTemplate: "As {role}, how did you approach {skill}? What methods or tools did you use?",
  },
  // ── FINANCE ──
  {
    rolePattern: /\b(accountant|auditor|cpa|controller)\b/i,
    impliedSkills: ["Financial Reporting", "Regulatory Compliance", "Internal Controls", "Tax Planning"],
    questionTemplate: "In your {role} work at {company}, how did you apply {skill}? Any complex scenarios?",
  },
  // ── LEGAL ──
  {
    rolePattern: /\b(lawyer|attorney|counsel|solicitor|barrister)\b/i,
    impliedSkills: ["Legal Research", "Contract Drafting", "Client Advisory", "Regulatory Compliance"],
    questionTemplate: "As {role}, what was your experience with {skill}? Give us an example.",
  },
];

function generateRoleImpliedQuestions(
  cloud: ProfileCloud,
  ctx: SocraticContext | undefined,
  alreadyAskedSkills: string[],
  maxQuestions: number,
): SocraticQuestion[] {
  const questions: SocraticQuestion[] = [];
  const existingSkillNames = new Set(cloud.nodes.map(n => n.name.toLowerCase()));
  const askedSet = new Set(alreadyAskedSkills.map(s => s.toLowerCase()));

  // Collect all role titles from trajectory
  const roles = cloud.trajectory?.roles ?? [];
  if (roles.length === 0) return questions;

  // For each role, check ROLE_SKILL_PATTERNS for implied skills not in Cloud
  const candidateGaps: Array<{
    skill: string;
    role: string;
    company: string;
    template: string;
  }> = [];

  for (const role of roles) {
    for (const pattern of ROLE_SKILL_PATTERNS) {
      if (!pattern.rolePattern.test(role.title)) continue;
      for (const impliedSkill of pattern.impliedSkills) {
        const skillLower = impliedSkill.toLowerCase();
        // Skip if Cloud already has this skill or a close match
        if (existingSkillNames.has(skillLower)) continue;
        if (askedSet.has(skillLower)) continue;
        // Check for partial matches (e.g., "Airway" in "Airway Management")
        let alreadyExists = false;
        for (const existing of existingSkillNames) {
          if (existing.includes(skillLower) || skillLower.includes(existing)) {
            alreadyExists = true;
            break;
          }
        }
        if (alreadyExists) continue;

        candidateGaps.push({
          skill: impliedSkill,
          role: role.title,
          company: role.company,
          template: pattern.questionTemplate,
        });
        askedSet.add(skillLower);
      }
    }
  }

  // Limit: pick the most relevant gaps (from most recent / longest roles first)
  for (const gap of candidateGaps.slice(0, maxQuestions)) {
    const question = gap.template
      .replace(/\{role\}/g, gap.role)
      .replace(/\{skill\}/g, gap.skill)
      .replace(/\{company\}/g, gap.company);

    questions.push({
      id: generateId("sq"),
      skill_name: gap.skill,
      question,
      why_asking: `Your ${gap.role} role typically involves ${gap.skill}, but your CV doesn't mention it explicitly. If you have this experience, confirming it strengthens your profile.`,
      evidence_gap: `Role "${gap.role}" implies ${gap.skill} but Cloud has no evidence`,
      triggered_by: "cv_upload",
      jd_context: null,
    });
  }

  return questions;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Generate questions after CV upload.
 * Targets skills that are used professionally but lack depth.
 * Stops when gates stop passing. Safety ceiling prevents runaway.
 *
 * @param cloud - The user's Profile Cloud
 * @param maxQuestions - Override max questions (otherwise adaptive based on maturity)
 * @param ctx - Candidate context (persona, profession, etc.) for contextual questions
 */
export async function generateInitialQuestions(
  cloud: ProfileCloud,
  maxQuestions?: number,
  ctx?: SocraticContext,
): Promise<SocraticQuestion[]> {
  // Infer persona from candidate_context when not explicitly set
  const enrichedCtx = enrichContext(ctx, cloud);
  const maturity = computeCloudMaturity(cloud);
  const candidates: CloudNode[] = [];

  for (const node of cloud.nodes) {
    const gate = evaluateGates(node, { trigger: "cv_upload" }, cloud);
    if (gate.should_ask) {
      candidates.push(node);
    }
  }

  // Sort: core_skills first (most valuable to probe), then by role count.
  // Certifications go after skills — they need different question framing.
  const tierPriority: Record<string, number> = {
    core_skill: 0,
    education: 1,
    certification: 2,
    voluntary: 3,
  };
  candidates.sort((a, b) => {
    const aTier = tierPriority[a.tier ?? "core_skill"] ?? 4;
    const bTier = tierPriority[b.tier ?? "core_skill"] ?? 4;
    if (aTier !== bTier) return aTier - bTier;
    return b.summary.number_of_roles - a.summary.number_of_roles;
  });

  // Adaptive question volume based on Cloud maturity
  // Rich profiles need fewer questions; thin profiles need more
  let adaptiveMax: number;
  if (maturity.coverage_ratio > 0.6 && maturity.evidence_density > 3) {
    adaptiveMax = 3; // Rich cloud — ask less
  } else if (maturity.coverage_ratio > 0.3) {
    adaptiveMax = 5; // Medium cloud
  } else {
    adaptiveMax = 6; // Thin cloud — ask more
  }

  const limit = Math.min(
    maxQuestions ?? adaptiveMax,
    SAFETY_CEILING_QUESTIONS,
  );
  const questions: SocraticQuestion[] = [];

  // Group similar certifications to avoid repetitive questions
  // e.g., ACLS + BLS + PALS → one combined question instead of three identical ones
  const certCandidates = candidates.filter(n =>
    classifyQuestionNodeType(n) === "certification"
  );
  const nonCertCandidates = candidates.filter(n =>
    classifyQuestionNodeType(n) !== "certification"
  );

  // Generate questions for non-cert nodes first
  for (const node of nonCertCandidates.slice(0, limit)) {
    const { question, why_asking } = await generateQuestion(node, {
      trigger: "cv_upload",
    }, maturity, enrichedCtx);

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

  // Group certs into 1-2 combined questions (instead of asking about each individually)
  const remaining = limit - questions.length;
  if (certCandidates.length > 0 && remaining > 0) {
    if (certCandidates.length <= 2) {
      // Few certs — ask individually
      for (const node of certCandidates.slice(0, remaining)) {
        const { question, why_asking } = await generateQuestion(node, {
          trigger: "cv_upload",
        }, maturity, enrichedCtx);
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
    } else {
      // 3+ similar certs — combine into ONE question
      const certNames = certCandidates.map(n => n.name).join(", ");
      const profession = enrichedCtx?.candidate_context?.primary_profession;
      const contextWord = profession ? "professional" : "work";
      questions.push({
        id: generateId("sq"),
        skill_name: certNames, // combined
        question: `You hold ${certNames}. Can you describe a specific ${contextWord} situation where one of these certifications directly guided your response or decision-making?`,
        why_asking: `Certifications are stronger evidence when linked to real scenarios. One good story covering any of these shows applied expertise.`,
        evidence_gap: `${certCandidates.length} certifications with no application evidence`,
        triggered_by: "cv_upload",
        jd_context: null,
      });
      // Skip individual cert follow-up — the combined question already covers them.
      // Adding another question about the same cert creates duplicates.
    }
  }

  // ── ROLE-IMPLIED GAP DETECTION ──
  // Users understate their skills. Their roles IMPLY skills they didn't list.
  // Generate targeted questions for skills the Cloud should have but doesn't.
  const remainingSlots = limit - questions.length;
  if (remainingSlots > 0) {
    const impliedGapQuestions = generateRoleImpliedQuestions(
      cloud, enrichedCtx, questions.map(q => q.skill_name), remainingSlots
    );
    questions.push(...impliedGapQuestions);
  }

  // Discovery question — ask what the CV DOESN'T show (Ada Health / Khanmigo pattern)
  // Only when we have room and the Cloud is thin
  if (questions.length < limit && maturity.overall !== "rich") {
    const profession = enrichedCtx?.candidate_context?.primary_profession;
    const discoveryQ = profession
      ? `Beyond what your CV shows, are there ${profession} skills or experiences you use regularly but haven't documented — such as specialized techniques, informal mentoring, or niche expertise?`
      : `Is there a skill or experience you regularly use at work that your CV doesn't capture? This could be informal leadership, a technical specialty, or domain knowledge that's second nature to you.`;
    questions.push({
      id: generateId("sq"),
      skill_name: "_discovery",
      question: discoveryQ,
      why_asking: "CVs often understate 30-40% of what professionals actually do. This question helps us capture skills that are too obvious to you to mention.",
      evidence_gap: "Potential hidden skills not in CV",
      triggered_by: "cv_upload",
      jd_context: null,
    });
  }

  return questions;
}

/**
 * Generate questions after JD match.
 * Targets skills the JD needs where cloud evidence is thin.
 *
 * Priority: hard requirements first, then preferred.
 * Volume: max 3 questions (user is evaluating, not onboarding).
 * Dedup: skip skills already answered via CV-upload Socratic.
 */
export async function generateJDQuestions(
  cloud: ProfileCloud,
  parsedJD: ParsedJD,
  ctx?: SocraticContext,
): Promise<SocraticQuestion[]> {
  const enrichedCtx = enrichContext(ctx, cloud);
  const maturity = computeCloudMaturity(cloud);
  const questions: SocraticQuestion[] = [];

  // Collect JD skills with priority: hard requirements first, then preferred
  const hardSkills = parsedJD.requirements.hard.flatMap((r) => r.keywords);
  const preferredSkills = [
    ...parsedJD.requirements.preferred.flatMap((r) => r.keywords),
    ...parsedJD.technologies_mentioned.filter((t) => t.context === "preferred").map((t) => t.name),
  ];
  const requiredTech = parsedJD.technologies_mentioned
    .filter((t) => t.context === "required")
    .map((t) => t.name);

  // Hard requirements + required tech first, then preferred
  const prioritizedSkills: Array<{ name: string; priority: "hard" | "preferred" }> = [];
  const seen = new Set<string>();

  for (const s of [...hardSkills, ...requiredTech]) {
    const lower = s.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      prioritizedSkills.push({ name: lower, priority: "hard" });
    }
  }
  for (const s of preferredSkills) {
    const lower = s.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      prioritizedSkills.push({ name: lower, priority: "preferred" });
    }
  }

  // JD-match hard ceiling: 3 questions max
  const JD_QUESTION_CEILING = 3;

  for (const { name: skillName, priority } of prioritizedSkills) {
    if (questions.length >= JD_QUESTION_CEILING) break;

    const node = cloud.nodes.find(
      (n) => skillsMatch(n.name, skillName)
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
      }, maturity, enrichedCtx);

      questions.push({
        id: generateId("sq"),
        skill_name: node.name,
        question,
        why_asking,
        evidence_gap: gate.evidence_gap.reason,
        triggered_by: "jd_match",
        jd_context: priority === "hard"
          ? `JD hard requirement: ${skillName}`
          : `JD preferred: ${skillName}`,
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

  // Skip internal placeholder skill names — these are meta-questions, not real skills
  const isPlaceholder = answer.skill_name.startsWith("_");

  let node = isPlaceholder ? null : findNode(cloud, answer.skill_name);

  if (node) {
    node.evidence.push(evidence);
    node.summary = computeSummary(node.evidence);
  } else if (!isPlaceholder) {
    const newNode: CloudNode = {
      id: generateId("node"),
      type: "skill",
      name: answer.skill_name,
      category: "other",
      tier: "core_skill",
      evidence: [evidence],
      summary: computeSummary([evidence]),
    };
    cloud.nodes.push(newNode);
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
    // Case-insensitive: handles "at google", "for The Government", non-English names
    const orgMatches = a.answer.match(/(?:at|for|with|from)\s+([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s&'.()-]+?)(?:\s+(?:from|during|in|as|where|,|\.|$))/gi);
    if (orgMatches) {
      for (const m of orgMatches) {
        const org = m.replace(/^(?:at|for|with|from)\s+/i, "").replace(/\s+(?:from|during|in|as|where|,|\.)$/i, "").trim();
        if (org.length > 2 && !/^(?:the|a|an|that|this|my|our)$/i.test(org)) employerMentions.add(org);
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
