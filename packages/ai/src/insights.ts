/**
 * Suitability Insights
 *
 * Not a score. Not a checklist. INSIGHT.
 *
 * Each insight is:
 *   - An observation about fit (what a smart advisor would notice)
 *   - A visible reasoning chain (BECAUSE: evidence, evidence, evidence)
 *   - Challengeable (user can say "that's wrong because..." → cloud updates)
 *
 * The AI is constrained:
 *   - Cannot make claims without citing evidence from the match report/cloud
 *   - Cannot contradict the evidence
 *   - Cannot invent facts not in the data
 *   - Every insight must have a "because" chain
 *
 * This is the difference between:
 *   "Score: 74/100" (opaque, meaningless)
 *   "6/8 requirements met" (factual but shallow)
 *   "This role is a natural next step because..." (transparent insight)
 */

import type { CloudMatchReport } from "./cloud-matcher";
import type { ProfileCloud } from "./cloud";
import type { ParsedJD } from "./types";
import { getClient, MODELS } from "./client";
import { getProviderMode, getDevResponse, saveDevPrompt } from "./provider";
import { safeParseJSON } from "./utils";

// ============================================================
// TYPES
// ============================================================

export type InsightType =
  | "core_strength"        // What's your strongest advantage for THIS role?
  | "transferable_depth"   // What experience transfers even if keywords don't match?
  | "real_risk"            // What's the actual risk — and how to address it
  | "irrelevant_gap"       // What gap LOOKS bad but won't actually matter?
  | "hidden_advantage"     // What's not obvious but works in their favor?
  | "recruiter_focus"      // What will the recruiter actually look at first?
  | "positioning"          // How to FRAME experience for this specific role
  | "evidence_to_gather";  // What evidence from their past should they surface?

export interface Insight {
  type: InsightType;
  observation: string;     // The insight itself — 1-2 sentences
  because: string[];       // Reasoning chain — each item cites specific evidence
  implication: string;     // So what? What should you DO with this insight?
  challengeable: boolean;  // Can the user push back on this?
}

export interface SuitabilityInsights {
  // The headline — strongest angle for this role
  headline: string;

  // Structured insights (3-6, not more — each one matters)
  insights: Insight[];

  // The ONE thing to lead with if you apply
  lead_with: string;

  // The biggest challenge — framed as "address this by...", never "don't apply"
  biggest_risk: string | null;

  // How to apply strongest — never whether to apply
  advisor_take: string;
}

// ============================================================
// INSIGHT GENERATOR
// ============================================================

const INSIGHT_SYSTEM_PROMPT = `You are a senior career advisor. The candidate has chosen to explore this role — your job is to HELP THEM APPLY AS STRONGLY AS POSSIBLE, not to decide whether they should.

You've been given factual evidence about the match. Generate INSIGHTS that help them position themselves.

FUNDAMENTAL PRINCIPLE: You are an advocate, not a gatekeeper.
- A 16-year veteran applying for something "lateral" or "different" isn't lost — they bring depth, pattern recognition, and adaptability that no junior ever could.
- Career paths aren't linear. A systems engineer moving to DevOps isn't a mismatch — they understand systems better than most DevOps candidates.
- Experience compounds in ways checklists can't capture. Someone who's "only" done backend but has 12 years of it can likely learn any adjacent skill in weeks.
- Your job: find every angle that strengthens their case. Be honest about gaps, but focus on HOW TO ADDRESS THEM, not whether the person "should" apply.

WHAT MAKES AN INSIGHT (vs just a fact):
- FACT: "6/8 requirements met"
- INSIGHT: "The 2 requirements you're missing (Kubernetes, 5+ years) are exactly the kind that companies flex on for candidates with strong domain experience. Your payment systems background will carry more weight than the checklist."

YOUR CONSTRAINTS:
1. Every insight MUST have a "because" chain citing specific evidence from the data
2. You CANNOT make claims not supported by the evidence provided
3. You CANNOT introduce facts that aren't in the input
4. You CANNOT assign scores or percentages
5. Each "because" item must reference something specific (a role, a metric, a requirement, a trajectory pattern)
6. NEVER tell the candidate not to apply. Instead, tell them what they'd need to address.
7. NEVER assume a non-linear career path is a weakness. Look for transferable depth.

INSIGHT TYPES TO CONSIDER:
- core_strength: What's their strongest advantage for THIS specific role? (Always include this first)
- transferable_depth: What experience transfers even if it doesn't match keywords exactly?
- real_risk: What's the ACTUAL risk (not just a missing keyword)? Focus on how to mitigate it.
- irrelevant_gap: What looks bad on paper but won't actually matter?
- hidden_advantage: What's not obvious but works in their favor? (Years of adjacent experience, breadth of exposure, battle-tested problem solving)
- recruiter_focus: What will the recruiter's eye go to FIRST?
- positioning: How should they FRAME their experience for this specific role?
- evidence_to_gather: What additional evidence should they surface (from their past) to strengthen their case?

OUTPUT FORMAT (return ONLY this JSON):
{
  "headline": "<one sentence — what's their strongest angle for this role>",
  "insights": [
    {
      "type": "<insight_type>",
      "observation": "<the insight — 1-2 sentences, direct>",
      "because": ["<evidence citation>", "<evidence citation>"],
      "implication": "<what to DO with this insight — always actionable>",
      "challengeable": true/false
    }
  ],
  "lead_with": "<the #1 thing to emphasize if applying>",
  "biggest_risk": "<what could block them — frame as 'address this by...' not 'you can't'>",
  "advisor_take": "<1-2 sentences — how to apply strongest, not whether to apply>"
}

RULES:
- Generate 3-6 insights. Each must be genuinely useful, not padding.
- "because" chains must have 2-4 items each, citing SPECIFIC evidence.
- Be direct. No corporate language. No encouragement for encouragement's sake.
- Always start with strengths — what they HAVE, not what they lack.
- For every gap, suggest how to address it (reframe experience, gather evidence, acknowledge and pivot).
- "challengeable" = true if the user might have evidence that changes this insight.
- Remember: someone with 15 years in a "different" field has seen more patterns, solved more problems, and adapted more times than someone with 5 years in the "right" field.`;

export async function generateInsights(
  matchReport: CloudMatchReport,
  cloud: ProfileCloud,
  parsedJD: ParsedJD
): Promise<SuitabilityInsights> {
  // Build the evidence summary for the AI
  const evidenceContext = buildEvidenceContext(matchReport, cloud, parsedJD);

  // DEV MODE
  if (getProviderMode() === "dev") {
    const cached = getDevResponse<SuitabilityInsights>("insights", evidenceContext);
    if (cached) return cached;

    const promptText = `SYSTEM:\n${INSIGHT_SYSTEM_PROMPT}\n\nUSER:\n${evidenceContext}`;
    const id = saveDevPrompt("insights", evidenceContext, promptText);

    return {
      headline: `[DEV MODE] Insights not cached. Process prompt: dev-data/prompts/${id}.txt`,
      insights: [],
      lead_with: "[Process prompt to generate]",
      biggest_risk: "[Process prompt to generate]",
      advisor_take: "[Process prompt to generate]",
    };
  }

  // API MODE
  const client = getClient();
  const response = await client.messages.create({
    model: MODELS.quality, // Insights need the quality model — this is synthesis, not extraction
    max_tokens: 3000,
    system: INSIGHT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: evidenceContext }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return safeParseJSON<SuitabilityInsights>(text, "insight generation");
}

// ============================================================
// EVIDENCE CONTEXT BUILDER
// Feeds the AI structured facts — it can only cite from these
// ============================================================

function buildEvidenceContext(
  report: CloudMatchReport,
  cloud: ProfileCloud,
  jd: ParsedJD
): string {
  const sections: string[] = [];

  // Role info
  sections.push(`ROLE: ${jd.role_title} at ${jd.company}
Seniority: ${jd.seniority_level}
Experience required: ${jd.experience_years.raw_text || "not specified"}`);

  // Candidate trajectory
  sections.push(`CANDIDATE TRAJECTORY:
Total experience: ${cloud.trajectory.total_experience_years} years
Pattern: ${cloud.trajectory.progression_pattern}
Domain focus: ${cloud.trajectory.domain_consistency}
Average tenure: ${cloud.trajectory.avg_tenure_months} months
Roles: ${cloud.trajectory.roles.map(r => `${r.title} at ${r.company} (${r.duration_months}mo, ${r.domain})`).join(" → ")}`);

  // Position assessment
  sections.push(`POSITION ASSESSMENT: ${report.position.label}
Basis: ${report.position.basis}`);

  // Experience comparison
  sections.push(`EXPERIENCE: ${report.experience.actual_years} years actual, need ${report.experience.required}
Verdict: ${report.experience.verdict}`);

  // Requirements evidence
  const reqsMet = report.requirements
    .filter(r => r.importance === "required" && (r.verdict === "strong_evidence" || r.verdict === "evidence_exists"))
    .map(r => `  ✓ ${r.requirement_text} — ${r.evidence_summary}`);
  const reqsNotMet = report.requirements
    .filter(r => r.importance === "required" && (r.verdict === "not_found" || r.verdict === "adjacent"))
    .map(r => `  ✗ ${r.requirement_text} — ${r.gap}`);
  const reqsThin = report.requirements
    .filter(r => r.importance === "required" && r.verdict === "claimed_only")
    .map(r => `  ⚠ ${r.requirement_text} — ${r.gap}`);

  sections.push(`HARD REQUIREMENTS MET (with evidence):
${reqsMet.join("\n") || "  (none)"}

HARD REQUIREMENTS NOT MET:
${reqsNotMet.join("\n") || "  (none)"}

HARD REQUIREMENTS — THIN EVIDENCE:
${reqsThin.join("\n") || "  (none)"}`);

  // Technology matches
  const techMet = report.technologies
    .filter(t => t.jd_context === "required" && t.verdict !== "not_found")
    .map(t => `  ✓ ${t.technology}: ${t.evidence_summary}`);
  const techMissing = report.technologies
    .filter(t => t.jd_context === "required" && t.verdict === "not_found")
    .map(t => `  ✗ ${t.technology}`);

  sections.push(`REQUIRED TECH MATCHED:
${techMet.join("\n") || "  (none)"}

REQUIRED TECH MISSING:
${techMissing.join("\n") || "  (none)"}`);

  // Domain
  sections.push(`DOMAIN: JD domains: ${report.domain.jd_domains.join(", ") || "unclear"}
Candidate domains: ${report.domain.cv_domains.join(", ") || "unclear"}
Overlap: ${report.domain.overlapping.join(", ") || "none"}`);

  // Strongest signals
  if (report.strongest_evidence.length > 0) {
    sections.push(`STRONGEST EVIDENCE:\n${report.strongest_evidence.map(s => `  💪 ${s}`).join("\n")}`);
  }

  // Achievements
  if (cloud.achievements.length > 0) {
    const relevantAchievements = cloud.achievements.slice(0, 5);
    sections.push(`TOP ACHIEVEMENTS:\n${relevantAchievements.map(a => `  • "${a.title}" at ${a.source_role}`).join("\n")}`);
  }

  // External validation
  if (cloud.certifications.length > 0) {
    sections.push(`CERTIFICATIONS: ${cloud.certifications.map(c => c.name).join(", ")}`);
  } else {
    sections.push(`CERTIFICATIONS: none`);
  }

  // Red flags
  const flags = report.improvement_opportunities;
  if (flags.length > 0) {
    sections.push(`POTENTIAL CONCERNS:\n${flags.map(f => `  • ${f}`).join("\n")}`);
  }

  return sections.join("\n\n---\n\n") + "\n\n---\n\nGenerate suitability insights. Return ONLY JSON.";
}
