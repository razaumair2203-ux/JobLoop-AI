/**
 * Cloud Matcher
 *
 * When a JD arrives, this maps every requirement against the Profile Cloud.
 * For each requirement, shows:
 *   - What evidence exists (from which sources)
 *   - What's missing
 *   - What can be repositioned (truthfully)
 *
 * No scores. Just: "here's what you have, here's what they want."
 */

import type { ProfileCloud, CloudNode, Evidence } from "./cloud";
import type { ParsedJD } from "./types";
import { skillsMatch } from "./skill-matching";

// ============================================================
// MATCH RESULT — What the user sees per requirement
// ============================================================

export type MatchVerdict =
  | "strong_evidence"       // multiple sources, impact, validated
  | "evidence_exists"       // used professionally, but thin
  | "claimed_only"          // listed in skills, no context
  | "adjacent"              // don't have it, but have something related
  | "not_found";            // nothing

export interface CloudRequirementMatch {
  requirement_text: string;
  importance: "required" | "preferred";
  verdict: MatchVerdict;
  matched_node: string | null;    // which cloud node matched
  evidence_summary: string;       // human-readable: "Used at Revolut (2.5 yrs), Monzo (1.5 yrs), has metric"
  evidence_detail: Evidence[];    // full evidence list
  gap: string | null;             // what's thin or missing
  repositioning_hint: string | null; // how to truthfully frame existing evidence
}

export interface CloudTechMatch {
  technology: string;
  jd_context: "required" | "preferred" | "mentioned";
  verdict: MatchVerdict;
  evidence_summary: string;
  node: CloudNode | null;
}

export interface CloudMatchReport {
  // Position assessment (same transparent rules)
  position: {
    label: "Strong position" | "Competitive" | "Stretch" | "Major gaps";
    basis: string;
  };

  // Per-requirement evidence mapping
  requirements: CloudRequirementMatch[];

  // Technology mapping
  technologies: CloudTechMatch[];

  // Experience comparison
  experience: {
    required: string;     // raw JD text
    actual_years: number;
    verdict: "exceeds" | "meets" | "close" | "short" | "major_gap" | "not_specified";
  };

  // Domain overlap
  domain: {
    jd_domains: string[];
    cv_domains: string[];
    overlapping: string[];
  };

  // What's strong (lead with these)
  strongest_evidence: string[];

  // What's thin (could improve)
  thin_evidence: string[];

  // What's missing entirely
  missing: string[];

  // Opportunities to improve the cloud
  improvement_opportunities: string[];
}

// ============================================================
// MATCH FUNCTION
// ============================================================

export function matchCloudToJD(
  cloud: ProfileCloud,
  parsedJD: ParsedJD
): CloudMatchReport {
  // Match each requirement against the cloud
  const requirements: CloudRequirementMatch[] = [];

  for (const req of parsedJD.requirements.hard) {
    requirements.push(matchRequirement(req, "required", cloud));
  }
  for (const req of parsedJD.requirements.preferred) {
    requirements.push(matchRequirement(req, "preferred", cloud));
  }

  // Match technologies
  const technologies: CloudTechMatch[] = parsedJD.technologies_mentioned.map(
    (tech) => matchTechnology(tech, cloud)
  );

  // Experience comparison
  const experience = {
    required: parsedJD.experience_years.raw_text || "Not specified",
    actual_years: cloud.trajectory.total_experience_years,
    verdict: compareYears(
      cloud.trajectory.total_experience_years,
      parsedJD.experience_years.min
    ),
  };

  // Domain overlap
  const jdDomains = extractDomains(parsedJD);
  const cvDomains = [...new Set(cloud.nodes.filter((n) => n.type === "domain").map((n) => n.name.toLowerCase()))];
  const overlapping = jdDomains.filter((d) =>
    cvDomains.some((cd) => cd.includes(d) || d.includes(cd))
  );

  // Categorize evidence strength
  const hardReqs = requirements.filter((r) => r.importance === "required");
  const strongEvidence = hardReqs
    .filter((r) => r.verdict === "strong_evidence")
    .map((r) => `${r.requirement_text}: ${r.evidence_summary}`);
  const thinEvidence = hardReqs
    .filter((r) => r.verdict === "evidence_exists" || r.verdict === "claimed_only")
    .map((r) => `${r.requirement_text}: ${r.gap}`);
  const missing = hardReqs
    .filter((r) => r.verdict === "not_found" || r.verdict === "adjacent")
    .map((r) => r.requirement_text);

  // Position assessment
  const metCount = hardReqs.filter(
    (r) => r.verdict === "strong_evidence" || r.verdict === "evidence_exists"
  ).length;
  const position = assessPosition(metCount, hardReqs.length);

  // Improvement opportunities
  const opportunities: string[] = [];
  for (const req of thinEvidence) {
    opportunities.push(`Deepen evidence: ${req}`);
  }
  if (!cloud.certifications.length) {
    opportunities.push("No certifications — relevant certs would add external validation");
  }
  const nodesWithoutDepth = cloud.nodes.filter(
    (n) => n.summary.number_of_roles > 0 && !n.summary.has_depth
  );
  if (nodesWithoutDepth.length > 0) {
    opportunities.push(
      `${nodesWithoutDepth.length} skills lack depth — answer Socratic questions to strengthen`
    );
  }

  return {
    position,
    requirements,
    technologies,
    experience,
    domain: { jd_domains: jdDomains, cv_domains: cvDomains, overlapping },
    strongest_evidence: strongEvidence,
    thin_evidence: thinEvidence,
    missing,
    improvement_opportunities: opportunities,
  };
}

// ============================================================
// INTERNAL
// ============================================================

function matchRequirement(
  req: { text: string; category: string; keywords: string[] },
  importance: "required" | "preferred",
  cloud: ProfileCloud
): CloudRequirementMatch {
  // Try to find a matching cloud node for each keyword
  let bestNode: CloudNode | null = null;
  let bestMatchCount = 0;

  for (const keyword of req.keywords) {
    const node = cloud.nodes.find((n) => skillsMatch(n.name, keyword));
    if (node) {
      const matchStrength = node.summary.number_of_roles + (node.summary.has_impact ? 2 : 0);
      if (matchStrength > bestMatchCount) {
        bestNode = node;
        bestMatchCount = matchStrength;
      }
    }
  }

  if (!bestNode) {
    // Check for adjacent skills
    const adjacent = findAdjacentSkill(req.keywords, cloud);
    if (adjacent) {
      return {
        requirement_text: req.text,
        importance,
        verdict: "adjacent",
        matched_node: adjacent.name,
        evidence_summary: `No direct match, but have adjacent: "${adjacent.name}"`,
        evidence_detail: adjacent.evidence,
        gap: `"${req.keywords.join(", ")}" not found — "${adjacent.name}" is closest`,
        repositioning_hint: `Consider if "${adjacent.name}" experience can be framed to partially address this`,
      };
    }

    return {
      requirement_text: req.text,
      importance,
      verdict: "not_found",
      matched_node: null,
      evidence_summary: "No evidence found",
      evidence_detail: [],
      gap: `Nothing in profile matches: ${req.keywords.join(", ")}`,
      repositioning_hint: null,
    };
  }

  // Node found — determine verdict based on evidence richness
  const verdict = determineVerdict(bestNode);
  const summary = buildEvidenceSummaryText(bestNode);
  const gap = verdict === "strong_evidence" ? null : identifyGap(bestNode);
  const hint = verdict === "strong_evidence" ? null : suggestRepositioning(bestNode, req.text);

  return {
    requirement_text: req.text,
    importance,
    verdict,
    matched_node: bestNode.name,
    evidence_summary: summary,
    evidence_detail: bestNode.evidence,
    gap,
    repositioning_hint: hint,
  };
}

function matchTechnology(
  tech: { name: string; context: "required" | "preferred" | "mentioned" },
  cloud: ProfileCloud
): CloudTechMatch {
  const node = cloud.nodes.find((n) => skillsMatch(n.name, tech.name));

  if (!node) {
    return {
      technology: tech.name,
      jd_context: tech.context,
      verdict: "not_found",
      evidence_summary: "Not in profile",
      node: null,
    };
  }

  return {
    technology: tech.name,
    jd_context: tech.context,
    verdict: determineVerdict(node),
    evidence_summary: buildEvidenceSummaryText(node),
    node,
  };
}

function determineVerdict(node: CloudNode): MatchVerdict {
  if (
    node.summary.number_of_roles >= 2 &&
    (node.summary.has_impact || node.summary.has_external_validation)
  ) {
    return "strong_evidence";
  }

  if (node.summary.number_of_roles >= 1) {
    return "evidence_exists";
  }

  return "claimed_only";
}

function buildEvidenceSummaryText(node: CloudNode): string {
  const parts: string[] = [];

  const roles = node.evidence.filter((e) => e.type === "role") as Array<{
    type: "role";
    company: string;
    duration_months: number;
  }>;
  if (roles.length > 0) {
    const roleTexts = roles.map(
      (r) => `${r.company} (${Math.round(r.duration_months / 12 * 10) / 10} yr)`
    );
    parts.push(`Used at: ${roleTexts.join(", ")}`);
  }

  if (node.summary.has_impact) {
    parts.push("has measurable impact");
  }
  if (node.summary.has_external_validation) {
    parts.push("externally validated");
  }
  if (node.summary.has_depth) {
    parts.push("depth confirmed");
  }

  return parts.join(" | ") || "Listed in skills only";
}

function identifyGap(node: CloudNode): string {
  const gaps: string[] = [];
  if (node.summary.number_of_roles <= 1) gaps.push("only 1 role");
  if (!node.summary.has_impact) gaps.push("no metric/impact shown");
  if (!node.summary.has_external_validation) gaps.push("no cert/award");
  if (!node.summary.has_depth) gaps.push("no depth beyond CV text");
  return gaps.join(", ");
}

function suggestRepositioning(node: CloudNode, requirement: string): string | null {
  if (node.summary.number_of_roles > 0 && !node.summary.has_impact) {
    return `You've used "${node.name}" professionally — try adding a measurable result to strengthen this`;
  }
  return null;
}

function findAdjacentSkill(
  keywords: string[],
  cloud: ProfileCloud
): CloudNode | null {
  // Simple adjacency: look for nodes whose name shares words with keywords
  for (const keyword of keywords) {
    const parts = keyword.toLowerCase().split(/[\s\-\/]+/);
    for (const node of cloud.nodes) {
      const nodeParts = node.name.toLowerCase().split(/[\s\-\/]+/);
      const overlap = parts.some((p) => nodeParts.some((np) => np.includes(p) || p.includes(np)));
      if (overlap && node.summary.number_of_roles > 0) {
        return node;
      }
    }
  }
  return null;
}

function assessPosition(
  met: number,
  total: number
): { label: "Strong position" | "Competitive" | "Stretch" | "Major gaps"; basis: string } {
  if (total === 0) return { label: "Competitive", basis: "No explicit hard requirements listed" };
  const pct = Math.round((met / total) * 100);
  if (pct >= 90) return { label: "Strong position", basis: `${met}/${total} requirements have evidence (${pct}%)` };
  if (pct >= 75) return { label: "Competitive", basis: `${met}/${total} requirements have evidence (${pct}%)` };
  if (pct >= 50) return { label: "Stretch", basis: `${met}/${total} requirements have evidence (${pct}%)` };
  return { label: "Major gaps", basis: `Only ${met}/${total} requirements have evidence (${pct}%)` };
}

function compareYears(
  actual: number,
  required: number | null
): "exceeds" | "meets" | "close" | "short" | "major_gap" | "not_specified" {
  if (required === null) return "not_specified";
  const diff = actual - required;
  if (diff > 1) return "exceeds";
  if (diff >= 0) return "meets";
  if (diff >= -1) return "close";
  if (diff >= -2) return "short";
  return "major_gap";
}

function extractDomains(jd: ParsedJD): string[] {
  const domainKeywords = [
    "fintech", "finance", "payments", "banking",
    "healthcare", "health", "e-commerce", "retail",
    "saas", "b2b", "gaming", "education",
    "cybersecurity", "ai", "machine learning",
  ];
  const text = [jd.company, jd.role_title, ...jd.responsibilities].join(" ").toLowerCase();
  return domainKeywords.filter((d) => text.includes(d));
}
