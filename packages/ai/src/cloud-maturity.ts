/**
 * Cloud Maturity — The Master Signal
 *
 * Cloud maturity drives ALL model selection, question volume, and cost optimization.
 * No hardcoded counters, no per-task guessing. One signal, consistent behavior.
 *
 * Two dimensions:
 *   1. Cloud maturity (per-domain niche) — how rich is the user's evidence?
 *   2. Task complexity — how hard is this specific operation?
 *
 * Together they determine: Haiku or Sonnet.
 */

import type { ProfileCloud, CloudNode, Evidence } from "./cloud";

// ============================================================
// CLOUD MATURITY — computed from the Cloud itself
// ============================================================

export type MaturityLevel = "empty" | "thin" | "medium" | "rich";

export interface CloudMaturity {
  /** Overall maturity — weighted average across all professional nodes */
  overall: MaturityLevel;

  /** Ratio of nodes with depth evidence vs total professional nodes (0-1) */
  coverage_ratio: number;

  /** Average evidence count per professional node */
  evidence_density: number;

  /** Total professional nodes (used in 1+ roles, not just listed) */
  professional_node_count: number;

  /** Per-domain maturity — allows niche-specific model selection */
  domain_maturity: Record<string, DomainMaturity>;

  /** ISO date of most recent Socratic answer (or null if never answered) */
  last_enrichment: string | null;
}

export interface DomainMaturity {
  level: MaturityLevel;
  node_count: number;
  coverage_ratio: number;
  evidence_density: number;
}

/**
 * Compute Cloud maturity from the current state.
 * Pure function — no DB calls, no side effects.
 */
export function computeCloudMaturity(cloud: ProfileCloud): CloudMaturity {
  // Professional nodes = nodes with at least 1 role evidence (not just "listed")
  const professionalNodes = cloud.nodes.filter(
    (n) => n.type === "skill" && n.summary.number_of_roles > 0
  );

  if (professionalNodes.length === 0) {
    return {
      overall: "empty",
      coverage_ratio: 0,
      evidence_density: 0,
      professional_node_count: 0,
      domain_maturity: {},
      last_enrichment: null,
    };
  }

  // Coverage: how many professional nodes have depth (Socratic answers or multi-role + impact)
  const nodesWithDepth = professionalNodes.filter(
    (n) => n.summary.has_depth || (n.summary.number_of_roles >= 2 && n.summary.has_impact)
  );
  const coverage_ratio = nodesWithDepth.length / professionalNodes.length;

  // Evidence density: average evidence count per professional node
  const totalEvidence = professionalNodes.reduce((sum, n) => sum + n.evidence.length, 0);
  const evidence_density = totalEvidence / professionalNodes.length;

  // Overall maturity
  const overall = computeLevel(coverage_ratio, evidence_density, professionalNodes.length);

  // Per-domain maturity
  const domainMap = groupByDomain(cloud);
  const domain_maturity: Record<string, DomainMaturity> = {};
  for (const [domain, nodes] of Object.entries(domainMap)) {
    const domProfessional = nodes.filter((n) => n.summary.number_of_roles > 0);
    if (domProfessional.length === 0) continue;
    const domDepth = domProfessional.filter(
      (n) => n.summary.has_depth || (n.summary.number_of_roles >= 2 && n.summary.has_impact)
    );
    const domCoverage = domDepth.length / domProfessional.length;
    const domDensity = domProfessional.reduce((s, n) => s + n.evidence.length, 0) / domProfessional.length;
    domain_maturity[domain] = {
      level: computeLevel(domCoverage, domDensity, domProfessional.length),
      node_count: domProfessional.length,
      coverage_ratio: domCoverage,
      evidence_density: domDensity,
    };
  }

  // Last enrichment: most recent Socratic answer date
  const last_enrichment = findLastEnrichment(cloud);

  return {
    overall,
    coverage_ratio,
    evidence_density,
    professional_node_count: professionalNodes.length,
    domain_maturity,
    last_enrichment,
  };
}

/**
 * Compute maturity for a specific domain niche.
 * Falls back to overall if domain not found.
 */
export function getMaturityForDomain(
  maturity: CloudMaturity,
  domain: string | null
): MaturityLevel {
  if (!domain) return maturity.overall;
  const domLower = domain.toLowerCase();
  // Try exact match, then partial match
  const exact = maturity.domain_maturity[domLower];
  if (exact) return exact.level;
  for (const [key, dm] of Object.entries(maturity.domain_maturity)) {
    if (key.includes(domLower) || domLower.includes(key)) return dm.level;
  }
  // Domain not in Cloud at all → treat as empty for that niche
  return "empty";
}

// ============================================================
// MODEL SELECTOR — unified decision point
// ============================================================

export type TaskType =
  | "cv_parse"          // parsing uploaded CV text
  | "jd_parse"          // parsing JD text
  | "socratic_question" // generating a Socratic question
  | "cv_generation"     // generating tailored CV
  | "insights"          // generating analysis insights
  | "cover_letter";     // generating cover letter

export type TaskComplexity = "simple" | "complex";

/**
 * Unified model selector. ALL AI calls route through this.
 *
 * Decision matrix:
 *   Cloud thin + any task → Sonnet (can't afford mistakes early on)
 *   Cloud medium + complex task → Sonnet
 *   Cloud medium + simple task → Haiku
 *   Cloud rich + any task → Haiku (unless task is genuinely complex)
 *   Cloud rich + complex task → Sonnet (respect task demands)
 *
 * User escalation override always wins.
 */
export function selectModel(
  maturity: CloudMaturity,
  taskType: TaskType,
  options?: {
    /** Domain context for this specific operation */
    domain?: string | null;
    /** Task complexity signal (from classifiers) */
    taskComplexity?: TaskComplexity;
    /** User explicitly requested better quality (re-generation, dissatisfaction) */
    userEscalation?: boolean;
  }
): "fast" | "quality" {
  // User escalation always wins
  if (options?.userEscalation) return "quality";

  // Get maturity for the relevant domain niche
  const nicheMaturity = getMaturityForDomain(maturity, options?.domain ?? null);
  const taskComplexity = options?.taskComplexity ?? "simple";

  // Decision matrix
  switch (nicheMaturity) {
    case "empty":
    case "thin":
      // Early stage — Sonnet for everything (can't afford mistakes)
      return "quality";

    case "medium":
      // Middle ground — complex tasks get Sonnet, simple get Haiku
      if (taskComplexity === "complex") return "quality";
      // CV gen, cover letter, and insights are high-stakes even when task seems simple
      if (taskType === "cv_generation" || taskType === "cover_letter" || taskType === "insights") return "quality";
      return "fast";

    case "rich":
      // Mature — Haiku unless task genuinely demands quality
      if (taskComplexity === "complex") return "quality";
      return "fast";
  }
}

// ============================================================
// USER FEEDBACK SIGNALS
// ============================================================

export type FeedbackSignal =
  | "regenerate"       // user clicked "try again" → model quality issue
  | "heavy_edit"       // user edited >40% of generated text → Cloud gap
  | "thumbs_down"     // explicit dissatisfaction → escalate model
  | "thumbs_up"       // satisfied → current tier is fine
  | "skipped"         // ignored analysis, applied anyway → they know more
  | "natural_language"; // user typed a complaint/request → parse intent

export interface UserFeedback {
  signal: FeedbackSignal;
  context: {
    task_type: TaskType;
    domain?: string;
    application_id?: string;
    message?: string; // natural language from user
  };
  timestamp: string;
}

/**
 * Interpret user feedback into model selection adjustment.
 *
 * Returns:
 *   - "escalate" → use Sonnet for next operation of this type
 *   - "cloud_gap" → trigger Socratic question for the relevant domain
 *   - "maintain" → keep current tier
 *   - "de_escalate" → safe to use Haiku
 */
export function interpretFeedback(
  feedback: UserFeedback,
): "escalate" | "cloud_gap" | "maintain" | "de_escalate" {
  switch (feedback.signal) {
    case "regenerate":
    case "thumbs_down":
      // User unhappy → escalate model for this task type
      return "escalate";

    case "natural_language":
      // Natural language could be anything — feedback classifier handles intent.
      // Don't auto-escalate; the classified intent drives the action.
      return "maintain";

    case "heavy_edit":
      // User had to fix a lot → Cloud is missing evidence
      return "cloud_gap";

    case "thumbs_up":
      // Happy → can de-escalate if we were using Sonnet
      return "de_escalate";

    case "skipped":
      // Ignored → maintain, they know something we don't
      return "maintain";
  }
}

// ============================================================
// JD SIMILARITY CHECK — cost gate for repeat analysis
// ============================================================

export interface JDSimilarityResult {
  is_similar: boolean;
  similar_application_id: string | null;
  overlap_ratio: number;
  shared_requirements: string[];
}

/**
 * Check if a new JD is substantially similar to a previously analyzed one.
 * Uses keyword overlap — not embeddings (no vector DB needed for MVP).
 *
 * If similar: can reuse cached analysis, skip expensive re-parsing.
 * Threshold: >70% keyword overlap = "similar enough" to shortcut.
 */
export function checkJDSimilarity(
  newJDKeywords: string[],
  previousJDs: Array<{ id: string; keywords: string[] }>
): JDSimilarityResult {
  const newSet = new Set(newJDKeywords.map((k) => k.toLowerCase()));

  let bestOverlap = 0;
  let bestMatch: { id: string; keywords: string[] } | null = null;
  let sharedKeywords: string[] = [];

  for (const prev of previousJDs) {
    const prevSet = new Set(prev.keywords.map((k) => k.toLowerCase()));
    const shared: string[] = [];
    for (const k of newSet) {
      if (prevSet.has(k)) shared.push(k);
    }
    // Overlap relative to the smaller set (Jaccard-like but asymmetric)
    const overlapRatio = Math.min(newSet.size, prevSet.size) > 0
      ? shared.length / Math.min(newSet.size, prevSet.size)
      : 0;

    if (overlapRatio > bestOverlap) {
      bestOverlap = overlapRatio;
      bestMatch = prev;
      sharedKeywords = shared;
    }
  }

  return {
    is_similar: bestOverlap > 0.7,
    similar_application_id: bestOverlap > 0.7 ? bestMatch?.id ?? null : null,
    overlap_ratio: bestOverlap,
    shared_requirements: sharedKeywords,
  };
}

// ============================================================
// HELPERS
// ============================================================

function computeLevel(
  coverageRatio: number,
  evidenceDensity: number,
  nodeCount: number
): MaturityLevel {
  // Empty: no professional nodes
  if (nodeCount === 0) return "empty";

  // Rich: high coverage AND high density
  if (coverageRatio >= 0.6 && evidenceDensity >= 3) return "rich";

  // Medium: either decent coverage or decent density
  if (coverageRatio >= 0.3 || evidenceDensity >= 2) return "medium";

  // Thin: some nodes exist but sparse evidence
  return "thin";
}

function groupByDomain(cloud: ProfileCloud): Record<string, CloudNode[]> {
  const domainMap: Record<string, CloudNode[]> = {};

  // Use trajectory domains
  for (const role of cloud.trajectory.roles) {
    const domain = role.domain?.toLowerCase();
    if (!domain || domain === "general") continue;

    // Find skills used in this role's time period
    for (const node of cloud.nodes) {
      if (node.type !== "skill") continue;
      const hasRoleInDomain = node.evidence.some(
        (e) => e.type === "role" && (e as { company: string }).company === role.company
      );
      if (hasRoleInDomain) {
        if (!domainMap[domain]) domainMap[domain] = [];
        if (!domainMap[domain].includes(node)) domainMap[domain].push(node);
      }
    }
  }

  // Also check domain-type nodes directly
  for (const node of cloud.nodes) {
    if (node.type === "domain") {
      const domain = node.name.toLowerCase();
      if (!domainMap[domain]) domainMap[domain] = [];
    }
  }

  return domainMap;
}

function findLastEnrichment(cloud: ProfileCloud): string | null {
  let latest: string | null = null;
  for (const node of cloud.nodes) {
    for (const ev of node.evidence) {
      if (ev.type === "socratic") {
        const date = (ev as { date: string }).date;
        if (!latest || date > latest) latest = date;
      }
    }
  }
  return latest;
}
