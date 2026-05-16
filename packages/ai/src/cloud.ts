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

/**
 * Tier determines WHICH SECTION a node appears in — not a score.
 * - core_skill: Domain expertise demonstrated through roles (Anesthesiology, Software Engineering)
 * - certification: Industry-standard credentials (ACLS, PMP, AWS SA)
 * - education: Degrees and formal qualifications (MBBS, FCPS, MBA)
 * - voluntary: Supplementary certs, MOOCs, workshops (Heart Saver, Coursera)
 * - license: Practice permits (PMDC, SCFHS, GMC, PE license)
 */
export type CloudNodeTier = "core_skill" | "certification" | "education" | "voluntary" | "license";

export interface CloudNode {
  id: string;
  type: NodeType;
  name: string; // "Kafka", "Leadership", "Fintech"
  category: string; // "language", "framework", "infrastructure", "soft_skill", etc.
  tier: CloudNodeTier; // determines UI section, not rank
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
    seniority_level: number; // 1-5 for career path Y-axis
    isTraining: boolean; // residency/fellowship = progression, never a dip
  }>;
  progression_pattern: string; // "consistent growth", "lateral moves", "career change"
  domain_consistency: string; // "fintech focused", "diverse"
  avg_tenure_months: number;
  total_experience_years: number;
}

// ============================================================
// PROFESSIONAL IDENTITY — WHO you are (not what you have)
// ============================================================

export interface ProfessionalIdentity {
  core_profession: string;          // "Anesthesiologist" (not "Heart Saver")
  specializations: string[];        // ["Cardiac Anesthesia", "Critical Care"]
  career_stage: string;             // "Senior Registrar" (from most recent title)
  career_stage_generic: string;     // "Experienced Professional" (from years)
  qualification_country: string | null;
  qualification_degrees: string[];  // ["MBBS", "FCPS (Anesthesiology)"]
  niche_differentiators: string[];  // ["AHA Instructor (ACLS/BLS)", "PALS Provider"]
  identity_basis: {
    primary_education: string | null;
    longest_role_domain: string;
    title_signals: string[];
  };
}

// ============================================================
// THE FULL CLOUD — Everything about this person
// ============================================================

export interface ProfileCloud {
  user_id: string;
  identity: ProfessionalIdentity;
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
// PROFESSIONAL IDENTITY COMPUTATION
// ============================================================

/** Deduplicate certifications across multiple CVs */
export function deduplicateCertifications(certs: string[]): string[] {
  const normalized = new Map<string, string>(); // normalized key -> best version

  for (const cert of certs) {
    const key = normalizeCertName(cert);
    const existing = normalized.get(key);
    // Keep the longer/more specific version
    if (!existing || cert.length > existing.length) {
      normalized.set(key, cert);
    }
  }
  return Array.from(normalized.values());
}

function normalizeCertName(name: string): string {
  let s = name.toLowerCase().trim();
  // Strip common prefixes
  s = s.replace(/^(fellow of |fellowship |certificate in |certified )/i, "");
  // Normalize parentheses
  s = s.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  // Normalize medical field names
  s = s.replace(/\banaesth(esia|esiology|etics)\b/gi, "anesthesiology");
  s = s.replace(/\banesthesia\b/gi, "anesthesiology");
  // Normalize common acronyms with full names
  s = s.replace(/\bcollege of physicians (&|and) surgeons\b/gi, "cpsp");
  s = s.replace(/\bamerican heart association\b/gi, "aha");
  // Extract core acronym if present (FCPS, ACLS, BLS, etc.)
  const acronymMatch = s.match(/\b(fcps|acls|bls|pals|atls|nrp|pmp|pmi|cfa|cpa|pe|mbbs|mrcp|frcs|usmle|plab|smle)\b/i);
  if (acronymMatch) {
    const acronym = acronymMatch[1].toLowerCase();
    // For FCPS/MBBS/MRCP, include the field if present
    const fieldMatch = s.match(/(?:in|of)\s+([\w\s]+?)(?:\s*$|\s*from|\s*at)/i);
    if (fieldMatch && ["fcps", "mbbs", "mrcp", "frcs"].includes(acronym)) {
      return `${acronym}_${fieldMatch[1].trim().replace(/\s+/g, "_")}`;
    }
    return acronym;
  }
  // Fallback: use first 3 significant words
  return s.split(/\s+/).filter(w => w.length > 2).slice(0, 3).join("_");
}

/** Classify certification tier */
export type CertTier = "professional_qualification" | "industry_gold" | "voluntary";

export function classifyCertTier(certName: string): CertTier {
  const lower = certName.toLowerCase();
  // Professional qualifications (prerequisites for the profession)
  if (/\b(fcps|mbbs|md|frcs|mrcp|do|bds|pharm\.?d|dds|dnb)\b/i.test(lower)) return "professional_qualification";
  if (/\b(be|bs|ms|phd|m\.?tech|b\.?tech|mba|llb|llm|bcom|mcom)\b/i.test(lower)) return "professional_qualification";
  if (/\b(license|licence|registration|pmdc|scfhs|dha|doh|haad|gmc)\b/i.test(lower)) return "professional_qualification";
  // Industry gold (standardized validation)
  if (/\b(acls|bls|pals|atls|nrp)\b/i.test(lower)) return "industry_gold";
  if (/\b(pmp|pmi|prince2|csep|pe |professional engineer)\b/i.test(lower)) return "industry_gold";
  if (/\b(aws|gcp|azure|cisco|oracle|comptia|cissp|cisa|cism)\b/i.test(lower)) return "industry_gold";
  if (/\b(cpa|cfa|acca|frm|shrm|phr|sphr)\b/i.test(lower)) return "industry_gold";
  // Everything else is voluntary
  return "voluntary";
}

/**
 * Compute professional identity from parsed CV data.
 * CODE-first: no LLM needed. Uses education + roles + title signals.
 */
export function computeIdentity(
  education: Array<{ degree: string; field: string; institution: string }>,
  experience: Array<{ title: string; company: string; start_date?: string; end_date?: string; duration_months: number; domain: string }>,
  certifications: string[],
  candidateContext?: { primary_profession?: string; specialization?: string; career_level?: string; country_of_qualification?: string },
): ProfessionalIdentity {
  // 1. Core profession from terminal degree + longest domain + most recent title
  const terminalDegree = findTerminalDegree(education);
  const longestDomain = findLongestDomain(experience);
  // Find most recent role by end_date (don't assume sort order)
  const mostRecentTitle = experience.length > 0
    ? experience.reduce((best, curr) => {
        if (curr.end_date?.toLowerCase() === "present") return curr;
        if (best.end_date?.toLowerCase() === "present") return best;
        // Compare date strings — "Dec 2024" > "Jan 2014"
        const bestYear = parseInt(best.end_date?.match(/\d{4}/)?.[0] ?? "0");
        const currYear = parseInt(curr.end_date?.match(/\d{4}/)?.[0] ?? "0");
        return currYear > bestYear ? curr : best;
      }).title
    : null;
  const titleSignals = experience.map(e => e.title);

  // Use parser's candidate context if available
  let coreProfession = candidateContext?.primary_profession || "";
  if (!coreProfession) {
    // Infer from terminal degree field
    if (terminalDegree) {
      coreProfession = terminalDegree.field;
    } else if (mostRecentTitle) {
      // Strip seniority prefixes to get profession
      coreProfession = mostRecentTitle
        .replace(/^(senior|junior|lead|head|chief|principal|staff|assistant|associate|deputy)\s+/i, "")
        .replace(/\s+(officer|specialist|consultant|instructor|trainee|intern|fellow|registrar)$/i, "");
    }
  }

  // 2. Career stage from most recent title
  const careerStage = candidateContext?.career_level ||
    (mostRecentTitle ? extractCareerStage(mostRecentTitle) : "Professional");

  // 3. Generic career stage from total years
  const totalYears = experience.reduce((sum, e) => sum + e.duration_months, 0) / 12;
  let genericStage: string;
  if (totalYears >= 15) genericStage = "Senior Professional";
  else if (totalYears >= 8) genericStage = "Experienced Professional";
  else if (totalYears >= 3) genericStage = "Mid-Career Professional";
  else genericStage = "Early-Career Professional";

  // 4. Qualification country
  const country = candidateContext?.country_of_qualification ||
    detectQualificationCountry(education, certifications);

  // 5. Qualification degrees (terminal/professional only) — dedup across CVs
  const qualDegreesSet = new Set<string>();
  const qualDegrees: string[] = [];
  for (const e of education) {
    if (!isTerminalDegree(e.degree)) continue;
    const field = e.field && e.field !== e.degree ? ` (${e.field})` : "";
    const label = `${e.degree}${field}`;
    const key = label.toLowerCase().replace(/\s+/g, " ").trim();
    if (qualDegreesSet.has(key)) continue;
    qualDegreesSet.add(key);
    qualDegrees.push(label);
  }

  // 6. Specializations from candidate context or education field
  const specializations: string[] = [];
  if (candidateContext?.specialization) {
    specializations.push(candidateContext.specialization);
  }

  // 7. Niche differentiators from certifications — dedup across CVs
  const differentiators: string[] = [];
  const seenDiff = new Set<string>();
  for (const cert of certifications) {
    const lower = cert.toLowerCase();
    // Normalize: strip org prefixes for dedup ("AHA Instructor - ACLS" ≈ "American Heart Association Instructor - ACLS")
    const normalized = lower
      .replace(/american heart association/g, "aha")
      .replace(/\s+/g, " ")
      .trim();
    if (seenDiff.has(normalized)) continue;
    if (lower.includes("instructor")) {
      seenDiff.add(normalized);
      differentiators.push(cert);
    } else if (classifyCertTier(cert) === "voluntary") {
      seenDiff.add(normalized);
      differentiators.push(cert);
    }
  }

  return {
    core_profession: coreProfession || "Professional",
    specializations,
    career_stage: careerStage,
    career_stage_generic: genericStage,
    qualification_country: country,
    qualification_degrees: qualDegrees,
    niche_differentiators: differentiators,
    identity_basis: {
      primary_education: terminalDegree ? `${terminalDegree.degree} in ${terminalDegree.field} from ${terminalDegree.institution}` : null,
      longest_role_domain: longestDomain,
      title_signals: titleSignals.slice(0, 5),
    },
  };
}

function findTerminalDegree(education: Array<{ degree: string; field: string; institution: string }>): { degree: string; field: string; institution: string } | null {
  // Priority order: specialty fellowship > masters/doctorate > bachelors
  const priority: Array<[RegExp, number]> = [
    [/\b(fcps|frcs|mrcp|dnb|dm|mch|fellowship)\b/i, 10], // specialty
    [/\b(phd|dphil|doctorate)\b/i, 9],
    [/\b(ms|msc|ma|mba|mphil|mtech)\b/i, 7],
    [/\b(mbbs|md|do|bds|pharmd|dds)\b/i, 6], // medical bachelors (terminal for clinical)
    [/\b(be|bs|bsc|ba|btech|bcom|llb)\b/i, 4],
  ];

  let best: { degree: string; field: string; institution: string } | null = null;
  let bestPriority = -1;

  for (const edu of education) {
    for (const [pattern, p] of priority) {
      if (pattern.test(edu.degree) && p > bestPriority) {
        bestPriority = p;
        best = edu;
      }
    }
  }
  return best;
}

function isTerminalDegree(degree: string): boolean {
  return /\b(fcps|frcs|mrcp|dnb|phd|dphil|md|do|mbbs|bds|pharmd|ms|msc|mba|be|bs|bsc|btech|llb|llm)\b/i.test(degree);
}

function findLongestDomain(experience: Array<{ domain: string; duration_months: number }>): string {
  const counts = new Map<string, number>();
  for (const e of experience) {
    const d = e.domain.toLowerCase();
    if (d && d !== "general") counts.set(d, (counts.get(d) ?? 0) + e.duration_months);
  }
  let best = "general";
  let max = 0;
  for (const [d, m] of counts) {
    if (m > max) { max = m; best = d; }
  }
  return best;
}

function extractCareerStage(title: string): string {
  const t = title.toLowerCase();
  // Medical hierarchy
  if (/\bconsultant\b/.test(t)) return "Consultant";
  if (/\bsenior registrar\b/.test(t) || /\bsenior resident\b/.test(t)) return "Senior Registrar";
  if (/\bregistrar\b/.test(t) || /\bresident\b/.test(t)) return "Registrar";
  if (/\b(attending|specialist|physician)\b/.test(t)) return "Specialist";
  if (/\b(fellow|fellowship)\b/.test(t)) return "Fellow";
  if (/\bresidency\b/.test(t)) return "Resident";
  if (/\bmedical officer\b/.test(t)) return "Medical Officer";
  if (/\bhouse officer\b/.test(t) || /\bintern\b/.test(t)) return "House Officer";
  // Engineering/tech hierarchy
  if (/\b(cto|ceo|cfo|coo|vp|vice president)\b/.test(t)) return "Executive";
  if (/\bdirector\b/.test(t)) return "Director";
  if (/\b(head|principal|staff)\b/.test(t)) return "Principal";
  if (/\blead\b/.test(t)) return "Lead";
  if (/\bsenior\b/.test(t)) return "Senior";
  if (/\bjunior\b/.test(t)) return "Junior";
  if (/\b(trainee|apprentice)\b/.test(t)) return "Trainee";
  // Academic
  if (/\bprofessor\b/.test(t)) return "Professor";
  if (/\blecturer\b/.test(t)) return "Lecturer";
  // Generic
  if (/\bmanager\b/.test(t)) return "Manager";
  if (/\banalyst\b/.test(t)) return "Analyst";
  return "Professional";
}

function detectQualificationCountry(
  education: Array<{ institution: string }>,
  certifications: string[],
): string | null {
  const allText = [
    ...education.map(e => e.institution),
    ...certifications,
  ].join(" ").toLowerCase();

  const patterns: Array<[RegExp, string]> = [
    [/\b(pakistan|lahore|karachi|islamabad|peshawar|quetta|rawalpindi|faisalabad|pmdc|cpsp|pec)\b/i, "Pakistan"],
    [/\b(india|delhi|mumbai|chennai|bangalore|kolkata|aiims|neet|mci)\b/i, "India"],
    [/\b(saudi|riyadh|jeddah|dammam|scfhs|smle)\b/i, "Saudi Arabia"],
    [/\b(uae|dubai|abu dhabi|sharjah|dha |doh |haad)\b/i, "UAE"],
    [/\b(uk |united kingdom|london|manchester|birmingham|gmc|plab|nhs)\b/i, "United Kingdom"],
    [/\b(usa|united states|usmle|nbme|acgme)\b/i, "United States"],
    [/\b(australia|sydney|melbourne|amc)\b/i, "Australia"],
    [/\b(canada|toronto|vancouver|mcc)\b/i, "Canada"],
    [/\b(china|beijing|shanghai|chengdu)\b/i, "China"],
    [/\b(philippines|manila|prc)\b/i, "Philippines"],
    [/\b(egypt|cairo|alexandria)\b/i, "Egypt"],
    [/\b(nigeria|lagos|abuja|mdcn)\b/i, "Nigeria"],
  ];

  for (const [pattern, country] of patterns) {
    if (pattern.test(allText)) return country;
  }
  return null;
}

// ============================================================
// CAREER SENIORITY — Title-based, profession-aware
// ============================================================

export type SeniorityLevel = "entry" | "junior" | "mid" | "senior" | "lead" | "director";

/** Infer seniority from job title. Profession-aware. */
export function inferSeniority(title: string): SeniorityLevel {
  const t = title.toLowerCase();

  // Training/fellowship roles: these are PROGRESSION, not demotion
  if (/\b(residency|resident|fellowship|fellow|trainee|apprentice|intern|house officer)\b/.test(t)) {
    // Training in a specialty is mid-level progression (not entry, not junior)
    if (/\b(senior|chief)\b/.test(t)) return "senior";
    if (/\b(residency|resident|fellowship|fellow)\b/.test(t)) return "mid"; // training = mid, NOT junior
    return "entry";
  }

  // Executive/Director
  if (/\b(cto|ceo|cfo|coo|vp|vice president|chief)\b/.test(t)) return "director";
  if (/\bdirector\b/.test(t)) return "director";

  // Lead/Principal/Head
  if (/\b(head|principal|staff|lead)\b/.test(t)) return "lead";
  if (/\bconsultant\b/.test(t)) return "lead"; // medical consultant = lead level

  // Senior
  if (/\bsenior\b/.test(t)) return "senior";
  if (/\bsenior registrar\b/.test(t)) return "senior";
  if (/\bspecialist\b/.test(t)) return "senior";

  // Mid
  if (/\b(registrar|medical officer|engineer|analyst|manager|instructor|physician)\b/.test(t)) return "mid";

  // Junior
  if (/\bjunior\b/.test(t)) return "junior";

  // Default
  return "mid";
}

/** Default empty identity for cases where we construct a ProfileCloud from DB without full context */
export function emptyIdentity(): ProfessionalIdentity {
  return {
    core_profession: "",
    specializations: [],
    career_stage: "",
    career_stage_generic: "",
    qualification_country: null,
    qualification_degrees: [],
    niche_differentiators: [],
    identity_basis: { primary_education: null, longest_role_domain: "", title_signals: [] },
  };
}

// ============================================================
// TIER CLASSIFICATION — Determines which UI section a node belongs to
// ============================================================

/**
 * Classify a node into its display tier based on its origin and evidence.
 * This is CLASSIFICATION (which section), not scoring (how good).
 */
export function classifyNodeTier(
  name: string,
  category: string,
  evidence: Evidence[],
): CloudNodeTier {
  const lower = name.toLowerCase();

  // Licenses — binary active/expired, never ranked against skills
  if (/\b(license|licence|registration|pmdc|scfhs|dha|doh|haad|gmc|state board|pec)\b/i.test(lower)) {
    return "license";
  }

  // Education — degrees
  if (/\b(mbbs|md|do|bds|pharmd|dds|phd|dphil|ms|msc|ma|mba|mphil|be|bs|bsc|ba|btech|bcom|llb|llm|dnb)\b/i.test(lower)) {
    return "education";
  }
  // FCPS/FRCS/MRCP are degree+experience combos — education tier
  if (/\b(fcps|frcs|mrcp|fellowship)\b/i.test(lower) && !/instructor/i.test(lower)) {
    return "education";
  }

  // Voluntary certs — supplementary, low-stakes
  if (/\b(heart saver|heartsaver|first aid|bystander|mooc|coursera|udemy|edx|skillshare)\b/i.test(lower)) {
    return "voluntary";
  }

  // Industry certifications — standardized validation
  if (/\b(acls|bls|pals|atls|nrp|pmp|prince2|aws|gcp|azure|cisco|comptia|cissp|cisa|cpa|cfa|acca|shrm|phr)\b/i.test(lower)) {
    return "certification";
  }
  // If the only evidence is certification type and no role evidence, it's a cert node
  if (evidence.length > 0 && evidence.every(e => e.type === "certification")) {
    return "certification";
  }
  if (category === "certification") {
    return "certification";
  }

  // Everything else with role evidence = core skill
  return "core_skill";
}

// ============================================================
// UNIFIED DEDUPLICATION — One function for all credential normalization
// ============================================================

/**
 * Normalize any credential (cert, degree, skill) to a canonical key for deduplication.
 * "FCPS Anesthesiology", "Fellowship (FCPS) in Anesthesia",
 * "Fellow of CPSP in Anesthesiology" all → "fcps_anesthesiology"
 */
export function normalizeCredential(name: string): string {
  let s = name.toLowerCase().trim();

  // Strip common prefixes
  s = s.replace(/^(fellow of|fellowship in|fellowship|certificate in|certified |diploma in|bachelor of|master of|doctor of)\s+/i, "");

  // Normalize field names (profession-agnostic where possible)
  s = s.replace(/\bana?esth(esia|esiology|etics)\b/g, "anesthesiology");
  s = s.replace(/\bmedicine and surgery\b/g, "medicine");
  s = s.replace(/\bcomputer science\b/g, "cs");
  s = s.replace(/\binformation technology\b/g, "it");
  s = s.replace(/\belectrical engineering\b/g, "ee");
  s = s.replace(/\bmechanical engineering\b/g, "me");
  s = s.replace(/\bcollege of physicians (&|and) surgeons\b/g, "cpsp");
  s = s.replace(/\bamerican heart association\b/g, "aha");

  // Extract core acronym if present
  const acronymMatch = s.match(/\b(fcps|mbbs|mrcp|frcs|md|ms|phd|be|bs|bsc|mba|cfa|cpa|pmp|pe|acls|bls|pals|atls|nrp|usmle|plab|smle|dnb)\b/);
  if (acronymMatch) {
    const acronym = acronymMatch[1];
    // Extract field after "in/of" or remaining words
    const fieldMatch = s.match(/(?:in|of)\s+([\w\s]+?)(?:\s*$|\s*from|\s*at|\s*[-—])/);
    const field = fieldMatch
      ? fieldMatch[1].trim().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, "_")
      : s.replace(acronym, "").replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, "_");
    return field && field !== acronym ? `${acronym}_${field}` : acronym;
  }

  // Fallback: clean and join significant words
  return s.replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, "_");
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
  // Optional candidate context from parser Step 0
  candidate_context?: {
    primary_profession?: string;
    specialization?: string;
    career_level?: string;
    country_of_qualification?: string;
    candidate_name?: string;
  };
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
      tier: classifyNodeTier(skill.name, resolvedCategory, []),
      evidence: [],
      summary: emptySummary(),
    });
  }

  // Enrich nodes with role evidence
  for (const role of parsedCV.experience) {
    // Determine which skills to link: use technologies_used if available,
    // otherwise match top-level skills against role title + bullets
    let techsForRole = role.technologies_used;
    if (techsForRole.length === 0 && parsedCV.skills.length > 0) {
      // Fallback: match skills from top-level skills array against role content
      const roleText = [
        role.title,
        role.company,
        ...((role as Record<string, unknown>).bullets as string[] ?? []),
      ].join(" ").toLowerCase();
      techsForRole = parsedCV.skills
        .filter(s => {
          const name = s.name.toLowerCase();
          // Match if skill name appears in role text, or significant words overlap
          if (roleText.includes(name)) return true;
          // For multi-word skills, check if all significant words appear
          const words = name.split(/\s+/).filter(w => w.length >= 4);
          if (words.length >= 1 && words.every(w => roleText.includes(w))) return true;
          return skillsMatch(s.name, roleText);
        })
        .map(s => s.name);
    }

    for (const tech of techsForRole) {
      const key = tech.toLowerCase();
      if (!nodeMap.has(key)) {
        const techClassification = classifySkill(tech, role.domain);
        nodeMap.set(key, {
          id: generateId(),
          type: "skill",
          name: tech,
          category: techClassification.category,
          tier: classifyNodeTier(tech, techClassification.category, []),
          evidence: [],
          summary: emptySummary(),
        });
      }

      const node = nodeMap.get(key)!;
      // Determine mention context: title > bullet > skills_section (Daxtra proximity weighting)
      const titleLower = role.title.toLowerCase();
      const techLower = tech.toLowerCase();
      const inTitle = titleLower.includes(techLower) || techLower.includes(titleLower.replace(/senior |lead |principal |junior |staff /gi, "").trim());
      // Use actual bullet text as context when available — much more informative than a formula string
      const roleBullets = (role as Record<string, unknown>).bullets as string[] | undefined ?? [];
      const relevantBullet = roleBullets.find((b: string) => b.toLowerCase().includes(techLower));
      node.evidence.push({
        type: "role",
        company: role.company,
        title: role.title,
        duration_months: role.duration_months,
        context: relevantBullet
          ? relevantBullet.slice(0, 120)
          : `Used in role: ${role.title} at ${role.company}`,
        start_date: role.start_date || "unknown",
        end_date: role.end_date || "unknown",
        mention_context: inTitle ? "title" : "bullet",
      });
    }

    // Add metrics as impact evidence — only to skills explicitly mentioned in the metric text,
    // or if no skill is mentioned, attach to the first skill in the role (avoids inflation).
    for (const metric of role.metrics_mentioned) {
      const metricLower = metric.toLowerCase();
      const matchedSkills = techsForRole.filter(tech =>
        metricLower.includes(tech.toLowerCase()) || skillsMatch(tech, metricLower)
      );

      // If metric doesn't name a specific skill, attach to first tech only (conservative)
      const targets = matchedSkills.length > 0 ? matchedSkills : [techsForRole[0]].filter(Boolean);

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
          tier: "core_skill",
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

  // Add certification evidence — deduplicate with normalizeCredential, then attach or create nodes
  const dedupedCerts = deduplicateCertifications(parsedCV.certifications);
  const certEvidences: CertificationEvidence[] = [];

  // Build a normalized key map of existing nodes for credential matching
  const normalizedNodeMap = new Map<string, string>(); // normalizedKey -> nodeMap key
  for (const [key] of nodeMap) {
    const nk = normalizeCredential(key);
    if (!normalizedNodeMap.has(nk)) normalizedNodeMap.set(nk, key);
  }

  for (const certName of dedupedCerts) {
    const cert: CertificationEvidence = {
      type: "certification",
      name: certName,
      issuer: extractIssuer(certName),
      year: null,
      active: true,
    };
    certEvidences.push(cert);

    // Try to attach cert to matching skill node using normalized keys
    const certNormalized = normalizeCredential(certName);
    let attached = false;

    // First try: exact normalized match (catches FCPS Anesthesiology = Fellowship FCPS in Anesthesia)
    const matchingNodeKey = normalizedNodeMap.get(certNormalized);
    if (matchingNodeKey && nodeMap.has(matchingNodeKey)) {
      nodeMap.get(matchingNodeKey)!.evidence.push(cert);
      attached = true;
    }

    // Second try: substring match on original keys (fallback)
    if (!attached) {
      for (const [key, node] of nodeMap) {
        if (certName.toLowerCase().includes(key) || key.includes(certName.toLowerCase())) {
          node.evidence.push(cert);
          attached = true;
          break; // attach to first match only to avoid duplication
        }
      }
    }

    // If cert didn't match ANY existing node, create a standalone cert node
    if (!attached) {
      // Use normalized key to prevent dupes like "FCPS Anesthesiology" and "Fellow of CPSP..."
      const certKey = certNormalized;
      if (!nodeMap.has(certKey) && !nodeMap.has(certName.toLowerCase())) {
        const certClassification = classifySkill(certName, report.primaryDomain);
        const certTier = classifyNodeTier(certName, "certification", [cert]);
        nodeMap.set(certKey, {
          id: generateId(),
          type: "skill",
          name: certName,
          category: certClassification.category !== "general" ? certClassification.category : "certification",
          tier: certTier,
          evidence: [cert],
          summary: emptySummary(),
        });
      }
    }
  }

  // Compute summaries for all nodes
  for (const node of nodeMap.values()) {
    node.summary = computeSummary(node.evidence);
  }

  // Post-build dedup: merge nodes that normalize to the same credential
  const seenNormalized = new Map<string, string>(); // normalizedKey -> nodeMap key
  const dupeKeys: string[] = [];
  for (const [key, node] of nodeMap) {
    const nk = normalizeCredential(node.name);
    const existing = seenNormalized.get(nk);
    if (existing && existing !== key) {
      // Merge evidence into the first node, drop the dupe
      const target = nodeMap.get(existing)!;
      target.evidence.push(...node.evidence);
      target.summary = computeSummary(target.evidence);
      // Keep the longer/more descriptive name
      if (node.name.length > target.name.length) target.name = node.name;
      dupeKeys.push(key);
    } else {
      seenNormalized.set(nk, key);
    }
  }
  for (const key of dupeKeys) nodeMap.delete(key);

  // Build career trajectory
  const trajectory = buildTrajectory(parsedCV.experience, parsedCV.total_experience_years);

  // Build achievements from metrics
  const achievements = extractAchievements(parsedCV.experience);

  // Compute professional identity
  const identity = computeIdentity(
    parsedCV.education,
    parsedCV.experience,
    dedupedCerts,
    parsedCV.candidate_context,
  );

  // Sort nodes: within each tier, sort by real evidence (roles > months > impact)
  const sortedNodes = Array.from(nodeMap.values()).sort((a, b) => {
    // Primary: tier order (core_skill first, then cert, education, license, voluntary)
    const tierOrder: Record<CloudNodeTier, number> = {
      core_skill: 0, certification: 1, education: 2, license: 3, voluntary: 4,
    };
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;

    // Within same tier: sort by evidence strength
    // 1. Number of roles (more roles = more evidence)
    const roleDiff = b.summary.number_of_roles - a.summary.number_of_roles;
    if (roleDiff !== 0) return roleDiff;
    // 2. Total months used
    const monthDiff = b.summary.total_months_used - a.summary.total_months_used;
    if (monthDiff !== 0) return monthDiff;
    // 3. Has impact
    if (b.summary.has_impact !== a.summary.has_impact) return b.summary.has_impact ? 1 : -1;
    return 0;
  });

  const cloud: ProfileCloud = {
    user_id: "", // set by caller
    identity,
    nodes: sortedNodes,
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

  // First pass: collect domain assignments from domain-type nodes
  const roleDomainMap = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === "domain") {
      for (const ev of node.evidence) {
        if (ev.type !== "role") continue;
        const role = ev as RoleEvidence;
        const key = `${role.company}|${role.title}|${role.start_date}`;
        roleDomainMap.set(key, node.name);
      }
    }
  }

  // Second pass: build roles, using domain-node assignment or inferring from category
  for (const node of nodes) {
    for (const ev of node.evidence) {
      if (ev.type !== "role") continue;
      const role = ev as RoleEvidence;
      const key = `${role.company}|${role.title}|${role.start_date}`;
      if (!roleMap.has(key)) {
        const domain = roleDomainMap.get(key)
          ?? (node.type === "domain" ? node.name : node.category !== "general" ? node.category : "general");
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

  // Compute total years as date span (earliest start → latest end), NOT sum of durations
  // Summing durations double-counts overlapping/concurrent roles
  const totalYears = computeDateSpanYears(roles);

  return buildTrajectory(roles, totalYears);
}

// ============================================================
// HELPERS
// ============================================================

/** Compute career span in years from earliest start_date to latest end_date */
function computeDateSpanYears(roles: Array<{ start_date?: string; end_date?: string; duration_months: number }>): number {
  const currentYear = new Date().getFullYear();
  let earliest = Infinity;
  let latest = -Infinity;

  for (const role of roles) {
    const startYear = extractYearFromDateStr(role.start_date);
    const endYear = role.end_date?.toLowerCase() === "present"
      ? currentYear
      : extractYearFromDateStr(role.end_date);

    if (startYear !== null && startYear < earliest) earliest = startYear;
    if (endYear !== null && endYear > latest) latest = endYear;
  }

  if (earliest === Infinity || latest === -Infinity) {
    // Fallback: sum durations (imperfect but better than 0)
    return Math.round(roles.reduce((s, r) => s + r.duration_months, 0) / 12);
  }

  const span = latest - earliest;
  // Safety cap: 0-60 years
  return Math.max(0, Math.min(60, span));
}

function extractYearFromDateStr(dateStr?: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  if (!match) return null;
  const year = parseInt(match[0], 10);
  return (year >= 1950 && year <= 2100) ? year : null;
}

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
  // Tech
  if (lower.includes("aws") || lower.includes("amazon")) return "Amazon";
  if (lower.includes("google") || lower.includes("gcp")) return "Google";
  if (lower.includes("azure") || lower.includes("microsoft")) return "Microsoft";
  if (lower.includes("cisco")) return "Cisco";
  if (lower.includes("oracle")) return "Oracle";
  if (lower.includes("salesforce")) return "Salesforce";
  if (lower.includes("comptia")) return "CompTIA";
  if (lower.includes("isaca") || lower.includes("cisa") || lower.includes("cism")) return "ISACA";
  if (lower.includes("isc2") || lower.includes("(isc)") || lower.includes("cissp")) return "(ISC)²";
  // Management & PM
  if (lower.includes("pmp") || lower.includes("pmi") || lower.includes("capm")) return "PMI";
  if (lower.includes("prince2")) return "Axelos";
  if (lower.includes("scrum")) return "Scrum Alliance";
  if (lower.includes("six sigma") || lower.includes("lean")) return "ASQ";
  // Healthcare
  if (lower.includes("acls") || lower.includes("bls") || lower.includes("pals") || lower.includes("aha") || lower.includes("american heart")) return "American Heart Association";
  if (lower.includes("fcps") || lower.includes("cpsp") || lower.includes("college of physicians & surgeons")) return "CPSP Pakistan";
  if (lower.includes("pmdc") || lower.includes("pakistan medical")) return "PMDC";
  if (lower.includes("scfhs") || lower.includes("saudi commission")) return "SCFHS";
  if (lower.includes("usmle")) return "NBME";
  if (lower.includes("acgme")) return "ACGME";
  // Finance & Accounting
  if (lower.includes("cpa")) return "AICPA";
  if (lower.includes("cfa")) return "CFA Institute";
  if (lower.includes("acca")) return "ACCA";
  if (lower.includes("frm")) return "GARP";
  // HR
  if (lower.includes("shrm")) return "SHRM";
  if (lower.includes("phr") || lower.includes("sphr")) return "HRCI";
  // Engineering
  if (lower.includes("pe ") || lower === "pe" || lower.includes("professional engineer")) return "NCEES";
  if (lower.includes("incose") || lower.includes("csep") || lower.includes("asep")) return "INCOSE";
  // Aviation
  if (lower.includes("faa")) return "FAA";
  if (lower.includes("easa")) return "EASA";
  if (lower.includes("gaca")) return "GACA";
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
  const seniorityMap: Record<SeniorityLevel, number> = {
    entry: 1, junior: 2, mid: 3, senior: 4, lead: 5, director: 5,
  };

  let prevLevel = 0;
  const roles = experience.map((e) => {
    const seniority = inferSeniority(e.title);
    const training = isTrainingRole(e.title);
    let level = seniorityMap[seniority];

    // Training roles should never dip below previous level
    if (training && prevLevel > 0) {
      level = Math.max(level, prevLevel);
    }
    prevLevel = level;

    return {
      company: e.company,
      title: e.title,
      start_date: e.start_date || "unknown",
      end_date: e.end_date || "unknown",
      duration_months: e.duration_months,
      domain: e.domain,
      seniority_level: level,
      isTraining: training,
    };
  });

  const avgTenure =
    roles.length > 0
      ? Math.round(roles.reduce((s, r) => s + r.duration_months, 0) / roles.length)
      : 0;

  const domains = [...new Set(roles.map((r) => r.domain.toLowerCase()))];
  const domainConsistency =
    domains.length <= 2 ? `${domains.join(" & ")} focused` : "diverse";

  const levels = roles.map((r) => r.seniority_level);
  let progression = "lateral moves";
  if (levels.length >= 2) {
    const first = levels[0];
    const last = levels[levels.length - 1];
    if (last > first) progression = "consistent growth";
    else if (last < first) progression = "career change";
  }

  return {
    roles,
    progression_pattern: progression,
    domain_consistency: domainConsistency,
    avg_tenure_months: avgTenure,
    total_experience_years: totalYears,
  };
}

/** Check if a role title indicates training/residency/fellowship */
function isTrainingRole(title: string): boolean {
  return /\b(residency|resident|fellowship|fellow|trainee|apprentice|intern|house officer|clinical observer)\b/i.test(title);
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
