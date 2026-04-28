/**
 * Evidence Matcher
 *
 * No scores. No weights. No subjective thresholds.
 *
 * This module takes parsed JD + parsed CV and produces FACTS:
 * - Which requirements are met (with evidence)
 * - Which requirements are NOT met
 * - What's in the CV that's relevant but not explicitly required
 * - What the gaps are
 *
 * The USER decides whether to apply. We give them clear information.
 *
 * The only "opinion" we give is a position assessment based on simple,
 * universally-accepted rules:
 * - Met all hard requirements → Strong position
 * - Met 75%+ → Competitive
 * - Met 50-74% → Stretch
 * - Met <50% → Major gaps
 */

import type { ParsedJD, ParsedCV } from "./types";

// ============================================================
// TYPES
// ============================================================

export type MatchStatus = "met" | "not_met" | "partial";

export interface RequirementMatch {
  requirement: string;           // The JD requirement text
  status: MatchStatus;
  evidence: string | null;       // What in the CV supports this (null if not met)
  gap: string | null;            // What's missing (null if fully met)
  category: string;              // skill, experience, education, etc.
  importance: "required" | "preferred";
}

export interface TechMatch {
  technology: string;
  found_in_cv: boolean;
  context_in_jd: "required" | "preferred" | "mentioned";
  cv_evidence: string | null;    // Where/how it appears in CV (role, skills section, etc.)
}

export interface ExperienceComparison {
  required_years: number | null;
  actual_years: number;
  raw_jd_text: string;
  verdict: "exceeds" | "meets" | "close" | "short" | "major_gap" | "not_specified";
  gap_years: number | null;      // null if meets/exceeds
}

export interface DomainOverlap {
  jd_domains: string[];          // Domains implied by the JD
  cv_domains: string[];          // Domains from CV experience
  overlapping: string[];
  unique_to_jd: string[];        // JD wants, CV doesn't have
}

export interface PositionAssessment {
  label: "Strong position" | "Competitive" | "Stretch" | "Major gaps";
  basis: string;                 // Why — e.g., "6/8 hard requirements met"
  hard_reqs_met: number;
  hard_reqs_total: number;
  percentage: number;
}

// ============================================================
// THE FULL MATCH REPORT — Everything the user needs to decide
// ============================================================

export interface MatchReport {
  // Position assessment (the ONE opinion we give, with transparent basis)
  position: PositionAssessment;

  // Experience comparison
  experience: ExperienceComparison;

  // Every requirement matched against the CV
  requirements: RequirementMatch[];

  // Technology overlap
  tech_matches: TechMatch[];

  // Domain relevance
  domain: DomainOverlap;

  // What's in the CV that's STRONG for this role (even if not explicitly required)
  bonus_signals: string[];

  // Red flags a recruiter would notice
  red_flags: string[];

  // Raw numbers for quick glance
  summary_stats: {
    hard_reqs_met: number;
    hard_reqs_total: number;
    preferred_met: number;
    preferred_total: number;
    required_tech_met: number;
    required_tech_total: number;
  };
}

// ============================================================
// MATCHER — Produces facts, not opinions
// ============================================================

export function matchCVToJD(parsedCV: ParsedCV, parsedJD: ParsedJD): MatchReport {
  const requirements = matchRequirements(parsedCV, parsedJD);
  const tech_matches = matchTechnologies(parsedCV, parsedJD);
  const experience = compareExperience(parsedCV, parsedJD);
  const domain = findDomainOverlap(parsedCV, parsedJD);
  const bonus_signals = findBonusSignals(parsedCV, parsedJD);
  const red_flags = detectRedFlags(parsedCV, parsedJD, experience);

  const hardReqs = requirements.filter((r) => r.importance === "required");
  const hardMet = hardReqs.filter((r) => r.status === "met").length;
  const hardPartial = hardReqs.filter((r) => r.status === "partial").length;

  const preferredReqs = requirements.filter((r) => r.importance === "preferred");
  const preferredMet = preferredReqs.filter((r) => r.status === "met").length;

  const reqTech = tech_matches.filter((t) => t.context_in_jd === "required");
  const reqTechMet = reqTech.filter((t) => t.found_in_cv).length;

  // Effective hard reqs met (partial counts as 0.5)
  const effectiveMet = hardMet + hardPartial * 0.5;
  const percentage = hardReqs.length > 0
    ? Math.round((effectiveMet / hardReqs.length) * 100)
    : 100;

  const position = assessPosition(hardMet, hardReqs.length, percentage);

  return {
    position,
    experience,
    requirements,
    tech_matches,
    domain,
    bonus_signals,
    red_flags,
    summary_stats: {
      hard_reqs_met: hardMet,
      hard_reqs_total: hardReqs.length,
      preferred_met: preferredMet,
      preferred_total: preferredReqs.length,
      required_tech_met: reqTechMet,
      required_tech_total: reqTech.length,
    },
  };
}

// ============================================================
// POSITION ASSESSMENT — Simple, transparent rules
// ============================================================

function assessPosition(
  met: number,
  total: number,
  percentage: number
): PositionAssessment {
  if (total === 0) {
    return {
      label: "Competitive",
      basis: "No explicit hard requirements listed — position unclear",
      hard_reqs_met: 0,
      hard_reqs_total: 0,
      percentage: 100,
    };
  }

  if (percentage >= 90) {
    return {
      label: "Strong position",
      basis: `${met}/${total} hard requirements met (${percentage}%)`,
      hard_reqs_met: met,
      hard_reqs_total: total,
      percentage,
    };
  }

  if (percentage >= 75) {
    return {
      label: "Competitive",
      basis: `${met}/${total} hard requirements met (${percentage}%). Gaps are addressable.`,
      hard_reqs_met: met,
      hard_reqs_total: total,
      percentage,
    };
  }

  if (percentage >= 50) {
    return {
      label: "Stretch",
      basis: `${met}/${total} hard requirements met (${percentage}%). Significant gaps exist.`,
      hard_reqs_met: met,
      hard_reqs_total: total,
      percentage,
    };
  }

  return {
    label: "Major gaps",
    basis: `Only ${met}/${total} hard requirements met (${percentage}%). Fundamental mismatches.`,
    hard_reqs_met: met,
    hard_reqs_total: total,
    percentage,
  };
}

// ============================================================
// REQUIREMENT MATCHING
// ============================================================

function matchRequirements(cv: ParsedCV, jd: ParsedJD): RequirementMatch[] {
  const results: RequirementMatch[] = [];

  const cvText = buildCVSearchText(cv);

  for (const req of jd.requirements.hard) {
    results.push(matchSingleRequirement(req, cvText, "required"));
  }

  for (const req of jd.requirements.preferred) {
    results.push(matchSingleRequirement(req, cvText, "preferred"));
  }

  return results;
}

function matchSingleRequirement(
  req: { text: string; category: string; keywords: string[] },
  cvText: string,
  importance: "required" | "preferred"
): RequirementMatch {
  const keywords = req.keywords.map((k) => k.toLowerCase());
  const matchedKeywords = keywords.filter((kw) => cvText.includes(kw));

  if (matchedKeywords.length === keywords.length) {
    return {
      requirement: req.text,
      status: "met",
      evidence: `Keywords found: ${matchedKeywords.join(", ")}`,
      gap: null,
      category: req.category,
      importance,
    };
  }

  if (matchedKeywords.length > 0) {
    const missing = keywords.filter((k) => !matchedKeywords.includes(k));
    return {
      requirement: req.text,
      status: "partial",
      evidence: `Partially matched: ${matchedKeywords.join(", ")}`,
      gap: `Missing: ${missing.join(", ")}`,
      category: req.category,
      importance,
    };
  }

  return {
    requirement: req.text,
    status: "not_met",
    evidence: null,
    gap: `No evidence found for: ${keywords.join(", ")}`,
    category: req.category,
    importance,
  };
}

// ============================================================
// TECHNOLOGY MATCHING
// ============================================================

function matchTechnologies(cv: ParsedCV, jd: ParsedJD): TechMatch[] {
  const cvTechLower = cv.all_technologies.map((t) => t.toLowerCase());

  return jd.technologies_mentioned.map((tech) => {
    const nameLower = tech.name.toLowerCase();
    const found = cvTechLower.some(
      (ct) => ct === nameLower || ct.includes(nameLower) || nameLower.includes(ct)
    );

    // Find where in CV (which role/skills)
    let cv_evidence: string | null = null;
    if (found) {
      const matchingRole = cv.experience.find((exp) =>
        exp.technologies_used.some(
          (t) => t.toLowerCase().includes(nameLower) || nameLower.includes(t.toLowerCase())
        )
      );
      if (matchingRole) {
        cv_evidence = `Used at ${matchingRole.company} (${matchingRole.title})`;
      } else {
        cv_evidence = "Listed in skills section";
      }
    }

    return {
      technology: tech.name,
      found_in_cv: found,
      context_in_jd: tech.context,
      cv_evidence,
    };
  });
}

// ============================================================
// EXPERIENCE COMPARISON
// ============================================================

function compareExperience(cv: ParsedCV, jd: ParsedJD): ExperienceComparison {
  const required = jd.experience_years.min;
  const actual = cv.total_experience_years;

  if (required === null) {
    return {
      required_years: null,
      actual_years: actual,
      raw_jd_text: jd.experience_years.raw_text || "Not specified",
      verdict: "not_specified",
      gap_years: null,
    };
  }

  const diff = actual - required;

  let verdict: ExperienceComparison["verdict"];
  if (diff > 1) verdict = "exceeds";
  else if (diff >= 0) verdict = "meets";
  else if (diff >= -1) verdict = "close";     // within 1 year — usually fine
  else if (diff >= -2) verdict = "short";     // 1-2 years short
  else verdict = "major_gap";                  // 3+ years short

  return {
    required_years: required,
    actual_years: actual,
    raw_jd_text: jd.experience_years.raw_text,
    verdict,
    gap_years: diff < 0 ? Math.abs(diff) : null,
  };
}

// ============================================================
// DOMAIN OVERLAP
// ============================================================

function findDomainOverlap(cv: ParsedCV, jd: ParsedJD): DomainOverlap {
  const domainKeywords = [
    "fintech", "finance", "payments", "banking", "insurance",
    "healthcare", "health", "medical", "pharma",
    "e-commerce", "retail", "marketplace",
    "social media", "content", "advertising",
    "enterprise", "saas", "b2b",
    "gaming", "entertainment",
    "education", "edtech",
    "logistics", "supply chain",
    "cybersecurity", "security",
    "ai", "machine learning",
    "real estate", "proptech",
    "travel", "hospitality",
  ];

  const jdText = [jd.company, jd.role_title, ...jd.responsibilities]
    .join(" ")
    .toLowerCase();
  const cvDomains = cv.experience.map((e) => e.domain.toLowerCase());

  const jd_domains = domainKeywords.filter((d) => jdText.includes(d));
  const cv_domains = [...new Set(
    domainKeywords.filter((d) =>
      cvDomains.some((cd) => cd.includes(d))
    )
  )];

  const overlapping = jd_domains.filter((d) => cv_domains.includes(d));
  const unique_to_jd = jd_domains.filter((d) => !cv_domains.includes(d));

  return { jd_domains, cv_domains, overlapping, unique_to_jd };
}

// ============================================================
// BONUS SIGNALS — What makes this candidate stronger than the JD requires
// ============================================================

function findBonusSignals(cv: ParsedCV, jd: ParsedJD): string[] {
  const signals: string[] = [];

  // Quantified achievements
  const metricsCount = cv.experience.reduce(
    (sum, exp) => sum + exp.metrics_mentioned.length,
    0
  );
  if (metricsCount >= 5) {
    signals.push(`${metricsCount} quantified achievements — shows impact orientation`);
  }

  // Overqualified in experience
  if (jd.experience_years.min && cv.total_experience_years > jd.experience_years.min + 2) {
    signals.push(
      `${cv.total_experience_years} years experience vs ${jd.experience_years.min}+ required — significantly exceeds requirement`
    );
  }

  // Well-known companies
  const knownCompanies = [
    "google", "meta", "amazon", "apple", "microsoft", "stripe",
    "spotify", "netflix", "uber", "airbnb", "revolut", "monzo",
    "wise", "deliveroo", "shopify", "github", "gitlab",
  ];
  const cvCompanies = cv.experience.map((e) => e.company.toLowerCase());
  const recognizable = cvCompanies.filter((c) =>
    knownCompanies.some((k) => c.includes(k))
  );
  if (recognizable.length > 0) {
    signals.push(`Experience at recognized companies: ${recognizable.join(", ")}`);
  }

  return signals;
}

// ============================================================
// RED FLAGS — Things a recruiter would notice
// ============================================================

function detectRedFlags(
  cv: ParsedCV,
  jd: ParsedJD,
  experience: ExperienceComparison
): string[] {
  const flags: string[] = [];

  // Short tenure pattern
  const shortStints = cv.experience.filter((e) => e.duration_months < 12);
  if (shortStints.length >= 2) {
    flags.push(
      `${shortStints.length} roles under 12 months — recruiters may question commitment`
    );
  }

  // Major experience gap
  if (experience.verdict === "major_gap") {
    flags.push(
      `${experience.gap_years}+ years short of experience requirement — likely auto-filtered`
    );
  }

  // Title mismatch (applying for Senior but title is Junior, etc.)
  const seniorityOrder = ["intern", "junior", "mid", "senior", "staff", "principal", "lead", "manager", "director"];
  const jdLevel = seniorityOrder.indexOf(jd.seniority_level);
  const latestTitle = cv.experience[0]?.title.toLowerCase() || "";
  let cvLevel = -1;
  for (let i = 0; i < seniorityOrder.length; i++) {
    if (latestTitle.includes(seniorityOrder[i])) {
      cvLevel = i;
      break;
    }
  }
  if (jdLevel >= 0 && cvLevel >= 0 && jdLevel - cvLevel >= 2) {
    flags.push(
      `Title gap: current "${cv.experience[0]?.title}" vs JD "${jd.seniority_level}" level — may need strong justification`
    );
  }

  return flags;
}

// ============================================================
// HELPERS
// ============================================================

function buildCVSearchText(cv: ParsedCV): string {
  return [
    ...cv.all_technologies,
    ...cv.experience.flatMap((e) => [
      e.title,
      e.domain,
      ...e.technologies_used,
      e.company,
    ]),
    ...cv.education.flatMap((e) => [e.degree, e.field]),
    ...cv.certifications,
    ...(cv.skills.languages || []),
    ...(cv.skills.frameworks || []),
    ...(cv.skills.infrastructure || []),
    ...(cv.skills.databases || []),
    ...(cv.skills.tools || []),
    ...(cv.skills.other || []),
  ]
    .join(" ")
    .toLowerCase();
}
