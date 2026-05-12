/**
 * Living Profile Cloud
 *
 * No scores. No levels. Just evidence.
 *
 * The cloud is a collection of skills, capabilities, and domains —
 * each backed by factual evidence (roles, certs, impacts, depth answers).
 *
 * The evidence speaks for itself. We never assign numbers to skill "level."
 */

import { skillsMatch } from "./skill-matching";
import { classifySkill } from "./taxonomy";

// ============================================================
// VOCABULARY UPGRADE TRACKING — "You said → We improved"
// ============================================================

export interface VocabularyUpgrade {
  original: string;     // What appeared in the raw CV text
  upgraded: string;     // What the LLM/parser chose as professional terminology
  domain: string;
  category: string;
}

/**
 * Tracks vocabulary upgrades made during parsing.
 * Shown to user during Confirmation Echo so they can review/correct.
 */
export interface SkillClassificationReport {
  upgrades: VocabularyUpgrade[];          // Skills where name was upgraded
  taxonomyOverrides: Array<{              // Skills where taxonomy overrode LLM classification
    name: string;
    llmDomain: string;
    llmCategory: string;
    taxonomyDomain: string;
    taxonomyCategory: string;
    overrideApplied: boolean;             // false if blocked by domain-coherence guard
  }>;
  primaryDomain: string;                  // Detected primary domain of the CV
  domainDistribution: Map<string, number>;// Count of skills per domain
}

// ============================================================
// EVIDENCE — What PROVES a skill/capability/domain
// ============================================================

export interface RoleEvidence {
  type: "role";
  company: string;
  title: string;
  duration_months: number;
  context: string; // what they did with this skill in this role
  start_date: string;
  end_date: string | "present";
  mention_context?: "title" | "bullet" | "skills_section"; // where in the document this skill was found (Daxtra proximity weighting)
}

export interface ImpactEvidence {
  type: "impact";
  description: string; // "reduced latency 35%"
  source_role: string; // company where this happened
  metric: string | null; // the number/percentage if extractable
}

export interface CertificationEvidence {
  type: "certification";
  name: string; // "AWS Solutions Architect"
  issuer: string; // "Amazon"
  year: number | null;
  active: boolean;
}

export interface AwardEvidence {
  type: "award";
  name: string;
  issuer: string; // company or organization
  context: string;
}

export interface ProjectEvidence {
  type: "project";
  name: string;
  description: string;
  url: string | null; // github, live link
  is_professional: boolean; // work project vs personal/open-source
}

export interface EducationEvidence {
  type: "education";
  institution: string;
  degree: string;
  field: string;
  relevance: string; // how this relates to the skill
}

export interface WorkshopEvidence {
  type: "workshop";
  name: string;
  provider: string;
  year: number | null;
}

export interface PublicationEvidence {
  type: "publication";
  title: string;
  venue: string; // journal, conference, blog
  year: number | null;
  peer_reviewed: boolean;
}

export interface SocraticEvidence {
  type: "socratic";
  question: string;
  answer: string;
  date: string;
  triggered_by: string | null; // which JD triggered this question
}

export type Evidence =
  | RoleEvidence
  | ImpactEvidence
  | CertificationEvidence
  | AwardEvidence
  | ProjectEvidence
  | EducationEvidence
  | WorkshopEvidence
  | PublicationEvidence
  | SocraticEvidence;

// ============================================================
// CLOUD NODES — What you HAVE
// ============================================================

export type NodeType = "skill" | "capability" | "domain";

export interface CloudNode {
  id: string;
  type: NodeType;
  name: string; // "Kafka", "Leadership", "Fintech"
  category: string; // "language", "framework", "infrastructure", "soft_skill", etc.
  evidence: Evidence[];

  // Factual summary — NOT a score, just "does this exist? yes/no"
  summary: EvidenceSummary;
}

export interface EvidenceSummary {
  total_months_used: number;
  number_of_roles: number;
  has_impact: boolean;
  has_external_validation: boolean; // cert, award, or publication
  has_depth: boolean; // Socratic answers exist
  has_project: boolean; // personal/OS project demonstrating it
  last_used: string | null;
}

// ============================================================
// ACHIEVEMENT BANK — Reusable STAR stories
// ============================================================

export interface Achievement {
  id: string;
  title: string; // "Reduced payment latency 35%"
  situation: string;
  task: string;
  action: string;
  result: string;
  skills_demonstrated: string[]; // links to cloud node names
  metric: string | null;
  scale: string | null; // "team of 8", "30M users"
  source_role: string; // company where this happened
}

// ============================================================
// CAREER TRAJECTORY
// ============================================================

export interface CareerTrajectory {
  roles: Array<{
    company: string;
    title: string;
    start_date: string;
    end_date: string | "present";
    duration_months: number;
    domain: string;
  }>;
  progression_pattern: string; // "consistent growth", "lateral moves", "career change"
  domain_consistency: string; // "fintech focused", "diverse"
  avg_tenure_months: number;
  total_experience_years: number;
}

// ============================================================
// THE FULL CLOUD — Everything about this person
// ============================================================

export interface ProfileCloud {
  user_id: string;
  nodes: CloudNode[];
  achievements: Achievement[];
  trajectory: CareerTrajectory;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number | null;
    end_year: number | null;
    grade: string | null;
    research_topic: string | null;
    highlights: string[];
  }>;
  certifications: CertificationEvidence[];
  languages_spoken: string[];
  last_updated: string;
}

// ============================================================
// CLOUD BUILDER — Constructs cloud from parsed CV
// ============================================================

export function buildCloudFromParsedCV(parsedCV: {
  total_experience_years: number;
  experience: Array<{
    company: string;
    title: string;
    start_date?: string;
    end_date?: string;
    duration_months: number;
    technologies_used: string[];
    metrics_mentioned: string[];
    domain: string;
  }>;
  skills: Array<{
    name: string;
    original_text?: string;
    domain: string;
    category: string;
    source: string;
  }>;
  all_technologies: string[];
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year?: number | null;
    end_year?: number | null;
    year?: string;
    grade?: string;
    research_topic?: string | null;
    highlights?: string[];
  }>;
  certifications: string[];
}): { cloud: ProfileCloud; classificationReport: SkillClassificationReport } {
  const nodeMap = new Map<string, CloudNode>();
  const report: SkillClassificationReport = {
    upgrades: [],
    taxonomyOverrides: [],
    primaryDomain: "general",
    domainDistribution: new Map(),
  };

  // STEP 1: Detect primary domain from experience (NOT skills section — experience is ground truth)
  const domainCounts = new Map<string, number>();
  for (const role of parsedCV.experience) {
    const d = role.domain.toLowerCase();
    if (d && d !== "general") {
      domainCounts.set(d, (domainCounts.get(d) ?? 0) + role.duration_months);
    }
  }
  // Primary domain = most months worked
  let maxMonths = 0;
  for (const [domain, months] of domainCounts) {
    if (months > maxMonths) {
      maxMonths = months;
      report.primaryDomain = domain;
    }
  }

  // STEP 2: Build nodes from classified skills array with domain-coherence guard
  for (const skill of parsedCV.skills) {
    const key = skill.name.toLowerCase();
    if (nodeMap.has(key)) continue;

    // Taxonomy cache/override: curated entries take priority for CATEGORY only
    const taxonomyResult = classifySkill(skill.name, skill.domain, skill.category);
    const hasCuratedEntry = taxonomyResult.domain !== "general" || taxonomyResult.category !== "general";

    let resolvedCategory = skill.category;
    let resolvedDomain = skill.domain;

    if (hasCuratedEntry) {
      // DOMAIN-COHERENCE GUARD: taxonomy can refine category, but should NOT
      // pull a skill away from the CV's primary domain into a different one.
      // Example: defense person's "risk management" — taxonomy says management/risk_governance,
      // LLM says defense_aerospace/risk_management. If LLM domain matches primary domain,
      // keep LLM's classification (it's more contextually aware).
      const llmMatchesPrimary = skill.domain === report.primaryDomain;
      const taxonomyMatchesPrimary = taxonomyResult.domain === report.primaryDomain;

      const overrideApplied = !llmMatchesPrimary || taxonomyMatchesPrimary;

      report.taxonomyOverrides.push({
        name: skill.name,
        llmDomain: skill.domain,
        llmCategory: skill.category,
        taxonomyDomain: taxonomyResult.domain,
        taxonomyCategory: taxonomyResult.category,
        overrideApplied,
      });

      if (overrideApplied) {
        resolvedCategory = taxonomyResult.category;
        resolvedDomain = taxonomyResult.domain;
      }
      // else: LLM classified this skill under the primary domain, and taxonomy wants to
      // move it elsewhere — block the override to preserve domain coherence.
    }

    // Track vocabulary upgrades (original_text → name)
    if (skill.original_text && skill.original_text.toLowerCase() !== skill.name.toLowerCase()) {
      report.upgrades.push({
        original: skill.original_text,
        upgraded: skill.name,
        domain: resolvedDomain,
        category: resolvedCategory,
      });
    }

    // Track domain distribution
    report.domainDistribution.set(resolvedDomain, (report.domainDistribution.get(resolvedDomain) ?? 0) + 1);

    nodeMap.set(key, {
      id: generateId(),
      type: "skill",
      name: skill.name,
      category: resolvedCategory,
      evidence: [],
      summary: emptySummary(),
    });
  }

  // Enrich nodes with role evidence
  for (const role of parsedCV.experience) {
    for (const tech of role.technologies_used) {
      const key = tech.toLowerCase();
      if (!nodeMap.has(key)) {
        const techClassification = classifySkill(tech, role.domain);
        nodeMap.set(key, {
          id: generateId(),
          type: "skill",
          name: tech,
          category: techClassification.category,
          evidence: [],
          summary: emptySummary(),
        });
      }

      const node = nodeMap.get(key)!;
      // Determine mention context: title > bullet > skills_section (Daxtra proximity weighting)
      const titleLower = role.title.toLowerCase();
      const techLower = tech.toLowerCase();
      const inTitle = titleLower.includes(techLower) || techLower.includes(titleLower.replace(/senior |lead |principal |junior |staff /gi, "").trim());
      node.evidence.push({
        type: "role",
        company: role.company,
        title: role.title,
        duration_months: role.duration_months,
        context: `Used in role: ${role.title} at ${role.company}`,
        start_date: role.start_date || "unknown",
        end_date: role.end_date || "unknown",
        mention_context: inTitle ? "title" : "bullet",
      });
    }

    // Add metrics as impact evidence — only to skills explicitly mentioned in the metric text,
    // or if no skill is mentioned, attach to the first skill in the role (avoids inflation).
    for (const metric of role.metrics_mentioned) {
      const metricLower = metric.toLowerCase();
      const matchedSkills = role.technologies_used.filter(tech =>
        metricLower.includes(tech.toLowerCase()) || skillsMatch(tech, metricLower)
      );

      // If metric doesn't name a specific skill, attach to first tech only (conservative)
      const targets = matchedSkills.length > 0 ? matchedSkills : [role.technologies_used[0]].filter(Boolean);

      for (const tech of targets) {
        const key = tech.toLowerCase();
        const node = nodeMap.get(key);
        if (node) {
          node.evidence.push({
            type: "impact",
            description: metric,
            source_role: role.company,
            metric,
          });
        }
      }
    }

    // Build domain nodes
    if (role.domain) {
      const domainKey = role.domain.toLowerCase();
      if (!nodeMap.has(domainKey)) {
        nodeMap.set(domainKey, {
          id: generateId(),
          type: "domain",
          name: role.domain,
          category: "domain",
          evidence: [],
          summary: emptySummary(),
        });
      }
      nodeMap.get(domainKey)!.evidence.push({
        type: "role",
        company: role.company,
        title: role.title,
        duration_months: role.duration_months,
        context: `Worked in ${role.domain} domain`,
        start_date: role.start_date || "unknown",
        end_date: role.end_date || "unknown",
      });
    }
  }

  // Add certification evidence
  const certEvidences: CertificationEvidence[] = [];
  for (const certName of parsedCV.certifications) {
    const cert: CertificationEvidence = {
      type: "certification",
      name: certName,
      issuer: extractIssuer(certName),
      year: null,
      active: true,
    };
    certEvidences.push(cert);

    // Try to attach cert to relevant skill nodes
    for (const [key, node] of nodeMap) {
      if (certName.toLowerCase().includes(key) || key.includes(certName.toLowerCase())) {
        node.evidence.push(cert);
      }
    }
  }

  // Compute summaries for all nodes
  for (const node of nodeMap.values()) {
    node.summary = computeSummary(node.evidence);
  }

  // Build career trajectory
  const trajectory = buildTrajectory(parsedCV.experience, parsedCV.total_experience_years);

  // Build achievements from metrics
  const achievements = extractAchievements(parsedCV.experience);

  const cloud: ProfileCloud = {
    user_id: "", // set by caller
    nodes: Array.from(nodeMap.values()),
    achievements,
    trajectory,
    education: parsedCV.education.map((e) => {
      // Support both old (year string) and new (start_year/end_year numbers) formats
      let startYear: number | null = e.start_year ?? null;
      let endYear: number | null = e.end_year ?? null;
      if (startYear === null && endYear === null && e.year) {
        const parsed = parseInt(e.year, 10);
        if (!isNaN(parsed)) endYear = parsed;
      }
      return {
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        start_year: startYear,
        end_year: endYear,
        grade: e.grade || null,
        research_topic: e.research_topic ?? null,
        highlights: e.highlights || [],
      };
    }),
    certifications: certEvidences,
    languages_spoken: [],
    last_updated: new Date().toISOString(),
  };

  return { cloud, classificationReport: report };
}

// ============================================================
// CLOUD QUERIES — What can you ask the cloud?
// ============================================================

/** Find a node by name (uses alias-aware word boundary matching) */
export function findNode(cloud: ProfileCloud, name: string): CloudNode | undefined {
  return cloud.nodes.find((n) => skillsMatch(n.name, name));
}

/** Get all nodes with external validation (certs, awards, publications) */
export function getValidatedSkills(cloud: ProfileCloud): CloudNode[] {
  return cloud.nodes.filter((n) => n.summary.has_external_validation);
}

/** Get nodes that are "listed only" — no role evidence, no impact, nothing */
export function getWeakClaims(cloud: ProfileCloud): CloudNode[] {
  return cloud.nodes.filter(
    (n) =>
      n.summary.number_of_roles === 0 &&
      !n.summary.has_impact &&
      !n.summary.has_external_validation
  );
}

/** Get skills used in multiple roles (stronger evidence) */
export function getRepeatedSkills(cloud: ProfileCloud): CloudNode[] {
  return cloud.nodes.filter((n) => n.summary.number_of_roles >= 2);
}

/** Get all evidence for a specific skill */
export function getEvidenceFor(cloud: ProfileCloud, skillName: string): Evidence[] {
  const node = findNode(cloud, skillName);
  return node ? node.evidence : [];
}

// ============================================================
// TRAJECTORY RECONSTRUCTION — for DB-loaded clouds
// ============================================================

/**
 * Reconstruct CareerTrajectory from CloudNode role evidence.
 * Used when loading Cloud from DB where trajectory isn't stored separately.
 */
export function reconstructTrajectory(nodes: CloudNode[]): CareerTrajectory {
  // Extract unique roles from all node evidence
  const roleMap = new Map<string, {
    company: string; title: string; start_date: string;
    end_date: string; duration_months: number; domain: string;
  }>();

  for (const node of nodes) {
    for (const ev of node.evidence) {
      if (ev.type !== "role") continue;
      const role = ev as RoleEvidence;
      const key = `${role.company}|${role.title}|${role.start_date}`;
      if (!roleMap.has(key)) {
        // Determine domain from the node's parent domain nodes or category
        const domain = node.type === "domain" ? node.name : "general";
        roleMap.set(key, {
          company: role.company,
          title: role.title,
          start_date: role.start_date,
          end_date: role.end_date,
          duration_months: role.duration_months,
          domain,
        });
      }
    }
  }

  // Deduplicate: same company+title = same role
  const uniqueRoles = new Map<string, typeof roleMap extends Map<string, infer V> ? V : never>();
  for (const role of roleMap.values()) {
    const key = `${role.company}|${role.title}`;
    const existing = uniqueRoles.get(key);
    if (!existing || role.duration_months > existing.duration_months) {
      uniqueRoles.set(key, role);
    }
  }

  const roles = [...uniqueRoles.values()];
  return buildTrajectory(roles, Math.round(roles.reduce((s, r) => s + r.duration_months, 0) / 12));
}

// ============================================================
// HELPERS
// ============================================================

export function computeSummary(evidence: Evidence[]): EvidenceSummary {
  const roles = evidence.filter((e): e is RoleEvidence => e.type === "role");
  const impacts = evidence.filter((e): e is ImpactEvidence => e.type === "impact");
  const certs = evidence.filter((e): e is CertificationEvidence => e.type === "certification");
  const awards = evidence.filter((e): e is AwardEvidence => e.type === "award");
  const pubs = evidence.filter((e): e is PublicationEvidence => e.type === "publication");
  const projects = evidence.filter((e): e is ProjectEvidence => e.type === "project");
  const socratic = evidence.filter((e): e is SocraticEvidence => e.type === "socratic");

  const totalMonths = roles.reduce((sum, r) => sum + r.duration_months, 0);

  // Find most recent role end date
  let lastUsed: string | null = null;
  for (const role of roles) {
    if (role.end_date === "present") {
      lastUsed = "present";
      break;
    }
    if (!lastUsed || role.end_date > lastUsed) {
      lastUsed = role.end_date;
    }
  }

  return {
    total_months_used: totalMonths,
    number_of_roles: roles.length,
    has_impact: impacts.length > 0,
    has_external_validation: certs.length > 0 || awards.length > 0 || pubs.length > 0,
    has_depth: socratic.length > 0,
    has_project: projects.length > 0,
    last_used: lastUsed,
  };
}

function emptySummary(): EvidenceSummary {
  return {
    total_months_used: 0,
    number_of_roles: 0,
    has_impact: false,
    has_external_validation: false,
    has_depth: false,
    has_project: false,
    last_used: null,
  };
}

function extractIssuer(certName: string): string {
  const lower = certName.toLowerCase();
  if (lower.includes("aws") || lower.includes("amazon")) return "Amazon";
  if (lower.includes("google") || lower.includes("gcp")) return "Google";
  if (lower.includes("azure") || lower.includes("microsoft")) return "Microsoft";
  if (lower.includes("cisco")) return "Cisco";
  if (lower.includes("pmp") || lower.includes("pmi")) return "PMI";
  if (lower.includes("scrum")) return "Scrum Alliance";
  return "Unknown";
}

function buildTrajectory(
  experience: Array<{
    company: string;
    title: string;
    start_date?: string;
    end_date?: string;
    duration_months: number;
    domain: string;
  }>,
  totalYears: number
): CareerTrajectory {
  const roles = experience.map((e) => ({
    company: e.company,
    title: e.title,
    start_date: e.start_date || "unknown",
    end_date: e.end_date || "unknown",
    duration_months: e.duration_months,
    domain: e.domain,
  }));

  const avgTenure =
    roles.length > 0
      ? Math.round(roles.reduce((s, r) => s + r.duration_months, 0) / roles.length)
      : 0;

  const domains = [...new Set(roles.map((r) => r.domain.toLowerCase()))];
  const domainConsistency =
    domains.length <= 2 ? `${domains.join("/")} focused` : "diverse";

  // Simple progression detection
  const titles = roles.map((r) => r.title.toLowerCase());
  let progression = "lateral moves";
  const seniorityKeywords = ["intern", "junior", "mid", "senior", "staff", "lead", "principal", "manager", "director"];
  const levels = titles.map((t) => {
    for (let i = 0; i < seniorityKeywords.length; i++) {
      if (t.includes(seniorityKeywords[i])) return i;
    }
    return 2; // default to mid
  });
  if (levels.length >= 2 && levels[0] > levels[levels.length - 1]) {
    progression = "consistent growth";
  }

  return {
    roles,
    progression_pattern: progression,
    domain_consistency: domainConsistency,
    avg_tenure_months: avgTenure,
    total_experience_years: totalYears,
  };
}

function extractAchievements(
  experience: Array<{
    company: string;
    title: string;
    metrics_mentioned: string[];
    technologies_used: string[];
  }>
): Achievement[] {
  const achievements: Achievement[] = [];
  for (const role of experience) {
    for (const metric of role.metrics_mentioned) {
      achievements.push({
        id: generateId(),
        title: metric,
        situation: `At ${role.company} as ${role.title}`,
        task: "", // to be filled by Socratic questions
        action: "", // to be filled by Socratic questions
        result: metric,
        skills_demonstrated: role.technologies_used,
        metric,
        scale: null,
        source_role: role.company,
      });
    }
  }
  return achievements;
}

import { generateId as _generateId } from "./utils";
function generateId(): string {
  return _generateId("node");
}
