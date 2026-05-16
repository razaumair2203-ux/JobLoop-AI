/**
 * Skill Taxonomy Engine
 *
 * Classifies raw skill names into a hierarchical taxonomy:
 *   Domain > Category > Skill
 *
 * Computes evidence-based depth levels (NOT self-declared proficiency).
 * Identifies gaps based on domain expertise patterns.
 *
 * Research sources:
 *   - ESCO (13,890 skills, 4 sub-classifications)
 *   - O*NET (46 skill areas, 325 intermediate work activities)
 *   - SFIA (7 levels, 121 professional skills)
 *   - skill-graph.com (node/edge/depth/evidence data model)
 */

import type { Evidence, CloudNode } from "./cloud";

// ============================================================
// DATE UTILITY — Extract year from date strings like "Jan 2014", "2014", "Present"
// ============================================================

function extractYearFromDate(dateStr: string | undefined): number {
  if (!dateStr) return NaN;
  const s = String(dateStr);
  if (s.toLowerCase() === "present" || s.toLowerCase() === "current") return new Date().getFullYear();
  const yearMatch = s.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return parseInt(yearMatch[0], 10);
  const parsed = parseInt(s, 10);
  if (!isNaN(parsed) && parsed >= 1950 && parsed <= 2100) return parsed;
  return NaN;
}

// ============================================================
// DEPTH LEVELS — Evidence-based, not self-declared
// ============================================================

export type DepthLevel = "mentioned" | "applied" | "proficient" | "expert";

export interface DepthAssessment {
  level: DepthLevel;
  totalMonths: number;
  roleCount: number;
  hasImpact: boolean;
  hasCertification: boolean;
  hasProject: boolean;
  hasAward: boolean;
  score: number; // 0-100 composite for sorting only (NOT shown to user)
}

/**
 * Infer evidence-based depth level from a skill's evidence array.
 *
 * | Level      | Criteria                                            |
 * |------------|-----------------------------------------------------|
 * | Mentioned  | Skills section only, no role evidence                |
 * | Applied    | 1 role OR <24 months total                          |
 * | Proficient | 2+ roles OR 24+ months                              |
 * | Expert     | 3+ roles AND 60+ months AND (impact OR cert OR award)|
 */
export function inferDepthLevel(evidence: Evidence[]): DepthAssessment {
  const roles = evidence.filter((e) => e.type === "role");
  const impacts = evidence.filter((e) => e.type === "impact");
  const certs = evidence.filter((e) => e.type === "certification");
  const awards = evidence.filter((e) => e.type === "award");
  const projects = evidence.filter((e) => e.type === "project");

  // Deduplicate role count by unique company+period (same role from multiple CVs = 1 role)
  const uniqueRoleKeys = new Set<string>();
  for (const r of roles) {
    const role = r as { company?: string; start_date?: string; end_date?: string };
    uniqueRoleKeys.add(`${(role.start_date ?? "").slice(0, 4)}|${role.end_date === "present" || role.end_date === "Present" ? "now" : (role.end_date ?? "").slice(0, 4)}`);
  }
  const roleCount = uniqueRoleKeys.size;

  // Compute totalMonths as UNION of date spans (handles overlapping evidence from multiple CVs)
  const roleSpans: Array<{ start: number; end: number }> = [];
  for (const r of roles) {
    const role = r as { start_date?: string; end_date?: string; duration_months?: number };
    const startYear = extractYearFromDate(role.start_date);
    const endYear = extractYearFromDate(role.end_date);
    if (!isNaN(startYear) && !isNaN(endYear) && endYear >= startYear) {
      roleSpans.push({ start: startYear * 12, end: endYear * 12 });
    }
  }
  roleSpans.sort((a, b) => a.start - b.start);
  let totalMonths = 0;
  if (roleSpans.length > 0) {
    let curStart = roleSpans[0].start;
    let curEnd = roleSpans[0].end;
    for (let i = 1; i < roleSpans.length; i++) {
      if (roleSpans[i].start <= curEnd) {
        curEnd = Math.max(curEnd, roleSpans[i].end);
      } else {
        totalMonths += curEnd - curStart;
        curStart = roleSpans[i].start;
        curEnd = roleSpans[i].end;
      }
    }
    totalMonths += curEnd - curStart;
  }
  const hasImpact = impacts.length > 0;
  const hasCertification = certs.length > 0;
  const hasAward = awards.length > 0;
  const hasProject = projects.length > 0;

  // Mention context bonus: skills in job titles get higher weight (Daxtra proximity weighting)
  const titleMentions = roles.filter(
    (r) => (r as { mention_context?: string }).mention_context === "title",
  ).length;

  // Composite score for sorting (internal only)
  let score = 0;
  score += Math.min(roleCount * 15, 45); // max 45 from roles
  score += Math.min(totalMonths / 2, 30); // max 30 from duration
  score += Math.min(titleMentions * 5, 10); // max 10 from title mentions (skill appears in job title)
  if (hasImpact) score += 10;
  if (hasCertification) score += 8;
  if (hasAward) score += 5;
  if (hasProject) score += 2;

  let level: DepthLevel;
  if (
    roleCount >= 3 &&
    totalMonths >= 60 &&
    (hasImpact || hasCertification || hasAward)
  ) {
    level = "expert";
  } else if (roleCount >= 2 || totalMonths >= 24) {
    level = "proficient";
  } else if (roleCount >= 1) {
    level = "applied";
  } else {
    level = "mentioned";
  }

  return {
    level,
    totalMonths,
    roleCount,
    hasImpact,
    hasCertification,
    hasProject,
    hasAward,
    score,
  };
}

// ============================================================
// TAXONOMY — Domain > Category > Skill mapping
// ============================================================

export interface ClassifiedSkill {
  name: string;
  domain: string;
  category: string;
  depth: DepthAssessment;
  evidence: Evidence[];
}

export interface TaxonomyDomain {
  name: string;
  displayName: string;
  categories: TaxonomyCategory[];
}

export interface TaxonomyCategory {
  name: string;
  displayName: string;
  skills: ClassifiedSkill[];
}

/** Domain/category classification for known skill names */
const SKILL_TAXONOMY: Record<string, { domain: string; category: string }> = {
  // ---- Systems Engineering & Integration ----
  "avionics": { domain: "defense_aerospace", category: "systems_integration" },
  "systems engineering": { domain: "defense_aerospace", category: "systems_integration" },
  "systems integration": { domain: "defense_aerospace", category: "systems_integration" },
  "integration": { domain: "defense_aerospace", category: "systems_integration" },
  "mbse": { domain: "defense_aerospace", category: "systems_integration" },
  "interface control": { domain: "defense_aerospace", category: "systems_integration" },
  "verification & validation": { domain: "defense_aerospace", category: "systems_integration" },
  "airworthiness": { domain: "defense_aerospace", category: "compliance_standards" },
  "defense programs": { domain: "defense_aerospace", category: "program_management" },
  "defence programs": { domain: "defense_aerospace", category: "program_management" },
  "mil-std-1553": { domain: "defense_aerospace", category: "standards" },
  "mil-std-461": { domain: "defense_aerospace", category: "standards" },
  "do-178c": { domain: "defense_aerospace", category: "standards" },
  "do-254": { domain: "defense_aerospace", category: "standards" },

  // ---- Program & Project Management ----
  "program management": { domain: "management", category: "program_management" },
  "project management": { domain: "management", category: "project_management" },
  "portfolio management": { domain: "management", category: "program_management" },
  "pmo": { domain: "management", category: "program_management" },
  "evm": { domain: "management", category: "program_management" },
  "risk management": { domain: "management", category: "risk_governance" },
  "stakeholder management": { domain: "management", category: "leadership" },
  "contract management": { domain: "management", category: "procurement" },
  "vendor management": { domain: "management", category: "procurement" },
  "procurement": { domain: "management", category: "procurement" },
  "budgeting": { domain: "management", category: "financial" },
  "change management": { domain: "management", category: "organizational" },

  // ---- Quality, Compliance & Standards ----
  "quality assurance": { domain: "quality_compliance", category: "quality" },
  "configuration management": { domain: "quality_compliance", category: "configuration" },
  "requirements management": { domain: "quality_compliance", category: "requirements" },
  "audit": { domain: "quality_compliance", category: "compliance" },
  "iso 9001": { domain: "quality_compliance", category: "standards" },
  "as9100": { domain: "quality_compliance", category: "standards" },
  "safety management": { domain: "quality_compliance", category: "safety" },
  "export certification": { domain: "quality_compliance", category: "compliance" },

  // ---- Maintenance & Fleet ----
  "fleet management": { domain: "maintenance_ops", category: "fleet" },
  "aircraft maintenance": { domain: "maintenance_ops", category: "maintenance" },
  "predictive maintenance": { domain: "maintenance_ops", category: "maintenance" },
  "reliability engineering": { domain: "maintenance_ops", category: "reliability" },
  "fault diagnosis": { domain: "maintenance_ops", category: "maintenance" },
  "mro": { domain: "maintenance_ops", category: "maintenance" },
  "camo": { domain: "maintenance_ops", category: "airworthiness" },
  "part-145": { domain: "maintenance_ops", category: "airworthiness" },
  "root cause analysis": { domain: "maintenance_ops", category: "reliability" },

  // ---- Software & Technology ----
  "javascript": { domain: "technology", category: "languages" },
  "typescript": { domain: "technology", category: "languages" },
  "python": { domain: "technology", category: "languages" },
  "java": { domain: "technology", category: "languages" },
  "c#": { domain: "technology", category: "languages" },
  "c++": { domain: "technology", category: "languages" },
  "go": { domain: "technology", category: "languages" },
  "rust": { domain: "technology", category: "languages" },
  "matlab": { domain: "technology", category: "languages" },
  "react": { domain: "technology", category: "frameworks" },
  "angular": { domain: "technology", category: "frameworks" },
  "vue": { domain: "technology", category: "frameworks" },
  "next.js": { domain: "technology", category: "frameworks" },
  "node.js": { domain: "technology", category: "frameworks" },
  ".net": { domain: "technology", category: "frameworks" },
  "aws": { domain: "technology", category: "cloud_infra" },
  "gcp": { domain: "technology", category: "cloud_infra" },
  "azure": { domain: "technology", category: "cloud_infra" },
  "docker": { domain: "technology", category: "cloud_infra" },
  "kubernetes": { domain: "technology", category: "cloud_infra" },
  "postgresql": { domain: "technology", category: "data" },
  "mysql": { domain: "technology", category: "data" },
  "mongodb": { domain: "technology", category: "data" },
  "sql": { domain: "technology", category: "data" },
  "oracle": { domain: "technology", category: "data" },
  "machine learning": { domain: "technology", category: "ai_data" },
  "data science": { domain: "technology", category: "ai_data" },
  "power bi": { domain: "technology", category: "ai_data" },
  "git": { domain: "technology", category: "tools" },
  "jira": { domain: "technology", category: "tools" },
  "ci/cd": { domain: "technology", category: "devops" },
  "devops": { domain: "technology", category: "devops" },
  "linux": { domain: "technology", category: "cloud_infra" },

  // ---- Leadership & Soft Skills ----
  "team leadership": { domain: "leadership", category: "people" },
  "cross-functional": { domain: "leadership", category: "people" },
  "training": { domain: "leadership", category: "development" },
  "supervision": { domain: "leadership", category: "people" },
  "communication": { domain: "leadership", category: "interpersonal" },
  "strategic planning": { domain: "leadership", category: "strategy" },
  "continuous improvement": { domain: "leadership", category: "process" },

  // ---- Tools (domain-specific) ----
  "sap": { domain: "tools", category: "enterprise" },
  "ms project": { domain: "tools", category: "project_tools" },
  "primavera": { domain: "tools", category: "project_tools" },
  "amos": { domain: "tools", category: "aviation_tools" },
  "doors": { domain: "tools", category: "engineering_tools" },
  "erp": { domain: "tools", category: "enterprise" },
  "sharepoint": { domain: "tools", category: "collaboration" },

  // ---- Certifications & Frameworks (as skill areas) ----
  "pmp": { domain: "management", category: "certifications" },
  "pmi-acp": { domain: "management", category: "certifications" },
  "prince2": { domain: "management", category: "certifications" },
  "agile": { domain: "management", category: "methodology" },
  "scrum": { domain: "management", category: "methodology" },
  "lean": { domain: "management", category: "methodology" },
  "six sigma": { domain: "management", category: "methodology" },

  // ---- Aviation-specific ----
  "faa": { domain: "defense_aerospace", category: "regulatory" },
  "easa": { domain: "defense_aerospace", category: "regulatory" },
  "gaca": { domain: "defense_aerospace", category: "regulatory" },
  "icao": { domain: "defense_aerospace", category: "regulatory" },
  "obe": { domain: "education", category: "pedagogy" },
  "outcome based education": { domain: "education", category: "pedagogy" },

  // ---- Healthcare ----
  "anesthesiology": { domain: "healthcare", category: "clinical" },
  "anesthesia": { domain: "healthcare", category: "clinical" },
  "critical care": { domain: "healthcare", category: "clinical" },
  "intensive care": { domain: "healthcare", category: "clinical" },
  "pain management": { domain: "healthcare", category: "clinical" },
  "perioperative care": { domain: "healthcare", category: "clinical" },
  "airway management": { domain: "healthcare", category: "clinical" },
  "regional anesthesia": { domain: "healthcare", category: "clinical" },
  "general anesthesia": { domain: "healthcare", category: "clinical" },
  "sedation": { domain: "healthcare", category: "clinical" },
  "surgery": { domain: "healthcare", category: "clinical" },
  "cardiology": { domain: "healthcare", category: "clinical" },
  "neurology": { domain: "healthcare", category: "clinical" },
  "orthopedics": { domain: "healthcare", category: "clinical" },
  "pediatrics": { domain: "healthcare", category: "clinical" },
  "obstetrics": { domain: "healthcare", category: "clinical" },
  "emergency medicine": { domain: "healthcare", category: "clinical" },
  "internal medicine": { domain: "healthcare", category: "clinical" },
  "radiology": { domain: "healthcare", category: "clinical" },
  "pathology": { domain: "healthcare", category: "clinical" },
  "dermatology": { domain: "healthcare", category: "clinical" },
  "psychiatry": { domain: "healthcare", category: "clinical" },
  "ophthalmology": { domain: "healthcare", category: "clinical" },
  "ent": { domain: "healthcare", category: "clinical" },
  "urology": { domain: "healthcare", category: "clinical" },
  "oncology": { domain: "healthcare", category: "clinical" },
  "nephrology": { domain: "healthcare", category: "clinical" },
  "gastroenterology": { domain: "healthcare", category: "clinical" },
  "pulmonology": { domain: "healthcare", category: "clinical" },
  "endocrinology": { domain: "healthcare", category: "clinical" },
  "rheumatology": { domain: "healthcare", category: "clinical" },
  "hematology": { domain: "healthcare", category: "clinical" },
  "infectious disease": { domain: "healthcare", category: "clinical" },
  "family medicine": { domain: "healthcare", category: "clinical" },
  "general practice": { domain: "healthcare", category: "clinical" },
  // Healthcare certifications (supporting, not core)
  "acls": { domain: "healthcare", category: "medical_education" },
  "bls": { domain: "healthcare", category: "medical_education" },
  "pals": { domain: "healthcare", category: "medical_education" },
  "atls": { domain: "healthcare", category: "medical_education" },
  "nrp": { domain: "healthcare", category: "medical_education" },
  "fcps": { domain: "healthcare", category: "certifications" },
  "mrcp": { domain: "healthcare", category: "certifications" },
  "frcs": { domain: "healthcare", category: "certifications" },
  "usmle": { domain: "healthcare", category: "certifications" },
  "plab": { domain: "healthcare", category: "certifications" },
  "smle": { domain: "healthcare", category: "certifications" },
  "clinical trials": { domain: "healthcare", category: "research" },
  "patient care": { domain: "healthcare", category: "clinical" },
  "ehr": { domain: "healthcare", category: "systems" },
  "electronic health records": { domain: "healthcare", category: "systems" },
  "hipaa": { domain: "healthcare", category: "compliance" },
  "medical devices": { domain: "healthcare", category: "devices" },
  "fda regulations": { domain: "healthcare", category: "compliance" },
  "pharmaceutical": { domain: "healthcare", category: "pharma" },
  "nursing": { domain: "healthcare", category: "clinical" },
  "epidemiology": { domain: "healthcare", category: "research" },
  "gmp": { domain: "healthcare", category: "compliance" },
  "clinical research": { domain: "healthcare", category: "research" },
  "healthcare management": { domain: "healthcare", category: "management" },
  "telemedicine": { domain: "healthcare", category: "digital" },
  "pharmacy": { domain: "healthcare", category: "pharma" },
  "diagnostics": { domain: "healthcare", category: "clinical" },
  "biostatistics": { domain: "healthcare", category: "research" },
  "public health": { domain: "healthcare", category: "policy" },
  "hemodynamic monitoring": { domain: "healthcare", category: "critical_care" },
  "hemodynamic stabilization": { domain: "healthcare", category: "critical_care" },
  "patient stabilization": { domain: "healthcare", category: "emergency" },
  "cardiac anesthesia": { domain: "healthcare", category: "clinical" },
  "emergency handling": { domain: "healthcare", category: "emergency" },
  "emergency response": { domain: "healthcare", category: "emergency" },
  "resuscitation": { domain: "healthcare", category: "emergency" },
  "cfam": { domain: "healthcare", category: "clinical" },
  "intubation": { domain: "healthcare", category: "clinical" },
  "ventilator management": { domain: "healthcare", category: "critical_care" },
  "trauma management": { domain: "healthcare", category: "emergency" },
  "triage": { domain: "healthcare", category: "emergency" },

  // ---- Finance & Accounting ----
  "financial analysis": { domain: "finance", category: "analysis" },
  "financial modeling": { domain: "finance", category: "analysis" },
  "accounting": { domain: "finance", category: "accounting" },
  "gaap": { domain: "finance", category: "standards" },
  "ifrs": { domain: "finance", category: "standards" },
  "financial audit": { domain: "finance", category: "audit" },
  "tax": { domain: "finance", category: "tax" },
  "investment banking": { domain: "finance", category: "banking" },
  "investment management": { domain: "finance", category: "investment" },
  "risk assessment": { domain: "finance", category: "risk" },
  "compliance": { domain: "finance", category: "compliance" },
  "aml": { domain: "finance", category: "compliance" },
  "kyc": { domain: "finance", category: "compliance" },
  "fintech": { domain: "finance", category: "technology" },
  "blockchain": { domain: "finance", category: "technology" },
  "credit analysis": { domain: "finance", category: "analysis" },
  "treasury": { domain: "finance", category: "treasury" },
  "actuarial": { domain: "finance", category: "insurance" },
  "insurance": { domain: "finance", category: "insurance" },
  "banking": { domain: "finance", category: "banking" },
  "valuation": { domain: "finance", category: "analysis" },
  "sox": { domain: "finance", category: "compliance" },
  "quickbooks": { domain: "finance", category: "tools" },

  // ---- Marketing & Sales ----
  "digital marketing": { domain: "marketing", category: "digital" },
  "seo": { domain: "marketing", category: "digital" },
  "sem": { domain: "marketing", category: "digital" },
  "content marketing": { domain: "marketing", category: "content" },
  "social media marketing": { domain: "marketing", category: "social" },
  "email marketing": { domain: "marketing", category: "digital" },
  "google analytics": { domain: "marketing", category: "analytics" },
  "google ads": { domain: "marketing", category: "advertising" },
  "facebook ads": { domain: "marketing", category: "advertising" },
  "marketing automation": { domain: "marketing", category: "automation" },
  "hubspot": { domain: "marketing", category: "tools" },
  "salesforce": { domain: "marketing", category: "crm" },
  "crm": { domain: "marketing", category: "crm" },
  "brand management": { domain: "marketing", category: "brand" },
  "market research": { domain: "marketing", category: "research" },
  "copywriting": { domain: "marketing", category: "content" },
  "public relations": { domain: "marketing", category: "pr" },
  "event management": { domain: "marketing", category: "events" },
  "product marketing": { domain: "marketing", category: "product" },
  "growth hacking": { domain: "marketing", category: "growth" },
  "conversion optimization": { domain: "marketing", category: "analytics" },
  "b2b sales": { domain: "marketing", category: "sales" },
  "b2c sales": { domain: "marketing", category: "sales" },
  "lead generation": { domain: "marketing", category: "sales" },
  "account management": { domain: "marketing", category: "sales" },
  "business development": { domain: "marketing", category: "sales" },

  // ---- Construction & Engineering ----
  "civil engineering": { domain: "construction", category: "engineering" },
  "structural engineering": { domain: "construction", category: "engineering" },
  "mechanical engineering": { domain: "construction", category: "engineering" },
  "electrical engineering": { domain: "construction", category: "engineering" },
  "autocad": { domain: "construction", category: "tools" },
  "revit": { domain: "construction", category: "tools" },
  "solidworks": { domain: "construction", category: "tools" },
  "catia": { domain: "construction", category: "tools" },
  "bim": { domain: "construction", category: "design" },
  "construction management": { domain: "construction", category: "management" },
  "project controls": { domain: "construction", category: "controls" },
  "estimating": { domain: "construction", category: "estimating" },
  "quantity surveying": { domain: "construction", category: "estimating" },
  "site management": { domain: "construction", category: "site" },
  "health and safety": { domain: "construction", category: "safety" },
  "osha": { domain: "construction", category: "safety" },
  "geotechnical": { domain: "construction", category: "engineering" },
  "hvac": { domain: "construction", category: "mechanical" },
  "plumbing": { domain: "construction", category: "mechanical" },
  "surveying": { domain: "construction", category: "surveying" },

  // ---- Legal ----
  "contract law": { domain: "legal", category: "corporate" },
  "corporate law": { domain: "legal", category: "corporate" },
  "litigation": { domain: "legal", category: "litigation" },
  "intellectual property": { domain: "legal", category: "ip" },
  "employment law": { domain: "legal", category: "employment" },
  "regulatory compliance": { domain: "legal", category: "compliance" },
  "legal research": { domain: "legal", category: "research" },
  "contract drafting": { domain: "legal", category: "contracts" },
  "due diligence": { domain: "legal", category: "corporate" },
  "gdpr": { domain: "legal", category: "data_privacy" },
  "data privacy": { domain: "legal", category: "data_privacy" },
  "mergers and acquisitions": { domain: "legal", category: "corporate" },

  // ---- Education & Academia ----
  "curriculum development": { domain: "education", category: "instruction" },
  "instructional design": { domain: "education", category: "instruction" },
  "e-learning": { domain: "education", category: "edtech" },
  "lms": { domain: "education", category: "edtech" },
  "assessment": { domain: "education", category: "assessment" },
  "academic research": { domain: "education", category: "research" },
  "student engagement": { domain: "education", category: "teaching" },
  "accreditation": { domain: "education", category: "quality" },
  "special education": { domain: "education", category: "specialized" },
  "higher education": { domain: "education", category: "sector" },

  // ---- Human Resources ----
  "talent acquisition": { domain: "hr", category: "recruitment" },
  "recruiting": { domain: "hr", category: "recruitment" },
  "onboarding": { domain: "hr", category: "employee_lifecycle" },
  "performance management": { domain: "hr", category: "performance" },
  "compensation and benefits": { domain: "hr", category: "comp_benefits" },
  "employee relations": { domain: "hr", category: "relations" },
  "hris": { domain: "hr", category: "systems" },
  "workday": { domain: "hr", category: "systems" },
  "succession planning": { domain: "hr", category: "talent" },
  "diversity and inclusion": { domain: "hr", category: "dei" },
  "labor law": { domain: "hr", category: "compliance" },
  "organizational development": { domain: "hr", category: "development" },

  // ---- Data Science & AI ----
  "deep learning": { domain: "technology", category: "ai_data" },
  "natural language processing": { domain: "technology", category: "ai_data" },
  "computer vision": { domain: "technology", category: "ai_data" },
  "tensorflow": { domain: "technology", category: "ai_data" },
  "pytorch": { domain: "technology", category: "ai_data" },
  "scikit-learn": { domain: "technology", category: "ai_data" },
  "pandas": { domain: "technology", category: "ai_data" },
  "numpy": { domain: "technology", category: "ai_data" },
  "r": { domain: "technology", category: "languages" },
  "scala": { domain: "technology", category: "languages" },
  "swift": { domain: "technology", category: "languages" },
  "kotlin": { domain: "technology", category: "languages" },
  "php": { domain: "technology", category: "languages" },
  "ruby": { domain: "technology", category: "languages" },
  "data engineering": { domain: "technology", category: "data" },
  "etl": { domain: "technology", category: "data" },
  "data warehousing": { domain: "technology", category: "data" },
  "spark": { domain: "technology", category: "data" },
  "hadoop": { domain: "technology", category: "data" },
  "airflow": { domain: "technology", category: "data" },
  "tableau": { domain: "technology", category: "ai_data" },
  "looker": { domain: "technology", category: "ai_data" },
  "snowflake": { domain: "technology", category: "data" },
  "bigquery": { domain: "technology", category: "data" },
  "redshift": { domain: "technology", category: "data" },
  "cassandra": { domain: "technology", category: "data" },
  "redis": { domain: "technology", category: "data" },
  "neo4j": { domain: "technology", category: "data" },
  "graphql": { domain: "technology", category: "frameworks" },
  "rest api": { domain: "technology", category: "frameworks" },
  "microservices": { domain: "technology", category: "architecture" },
  "serverless": { domain: "technology", category: "architecture" },
  "event-driven": { domain: "technology", category: "architecture" },
  "api design": { domain: "technology", category: "architecture" },
  "system design": { domain: "technology", category: "architecture" },

  // ---- Cloud & DevOps (expanded) ----
  "terraform": { domain: "technology", category: "cloud_infra" },
  "ansible": { domain: "technology", category: "cloud_infra" },
  "jenkins": { domain: "technology", category: "devops" },
  "github actions": { domain: "technology", category: "devops" },
  "gitlab ci": { domain: "technology", category: "devops" },
  "prometheus": { domain: "technology", category: "devops" },
  "grafana": { domain: "technology", category: "devops" },
  "datadog": { domain: "technology", category: "devops" },
  "new relic": { domain: "technology", category: "devops" },
  "elasticsearch": { domain: "technology", category: "data" },
  "kafka": { domain: "technology", category: "data" },
  "rabbitmq": { domain: "technology", category: "data" },

  // ---- Cybersecurity ----
  "cybersecurity": { domain: "technology", category: "security" },
  "information security": { domain: "technology", category: "security" },
  "penetration testing": { domain: "technology", category: "security" },
  "soc": { domain: "technology", category: "security" },
  "siem": { domain: "technology", category: "security" },
  "incident response": { domain: "technology", category: "security" },
  "vulnerability assessment": { domain: "technology", category: "security" },
  "cissp": { domain: "technology", category: "security" },
  "iso 27001": { domain: "technology", category: "security" },
  "nist": { domain: "technology", category: "security" },
  "network security": { domain: "technology", category: "security" },
  "cloud security": { domain: "technology", category: "security" },

  // ---- Design & UX ----
  "ux design": { domain: "design", category: "ux" },
  "ui design": { domain: "design", category: "ui" },
  "user research": { domain: "design", category: "research" },
  "wireframing": { domain: "design", category: "ux" },
  "prototyping": { domain: "design", category: "ux" },
  "figma": { domain: "design", category: "tools" },
  "sketch": { domain: "design", category: "tools" },
  "adobe xd": { domain: "design", category: "tools" },
  "photoshop": { domain: "design", category: "tools" },
  "illustrator": { domain: "design", category: "tools" },
  "graphic design": { domain: "design", category: "visual" },
  "design systems": { domain: "design", category: "systems" },
  "accessibility": { domain: "design", category: "ux" },
  "usability testing": { domain: "design", category: "research" },

  // ---- Supply Chain & Logistics ----
  "supply chain management": { domain: "operations", category: "supply_chain" },
  "logistics": { domain: "operations", category: "logistics" },
  "inventory management": { domain: "operations", category: "inventory" },
  "warehouse management": { domain: "operations", category: "warehouse" },
  "demand planning": { domain: "operations", category: "planning" },
  "sourcing": { domain: "operations", category: "procurement" },
  "lean manufacturing": { domain: "operations", category: "manufacturing" },
  "total quality management": { domain: "operations", category: "process_improvement" },
  "operations management": { domain: "operations", category: "management" },
  "erp systems": { domain: "operations", category: "systems" },
  "sap modules": { domain: "operations", category: "systems" },

  // ---- Energy & Environment ----
  "renewable energy": { domain: "energy", category: "renewables" },
  "oil and gas": { domain: "energy", category: "oil_gas" },
  "solar energy": { domain: "energy", category: "renewables" },
  "wind energy": { domain: "energy", category: "renewables" },
  "environmental compliance": { domain: "energy", category: "compliance" },
  "sustainability": { domain: "energy", category: "sustainability" },
  "esg": { domain: "energy", category: "sustainability" },
  "power systems": { domain: "energy", category: "power" },
  "grid management": { domain: "energy", category: "power" },
  "hse": { domain: "energy", category: "safety" },

  // ---- Mobile & Web Development (expanded) ----
  "react native": { domain: "technology", category: "mobile" },
  "flutter": { domain: "technology", category: "mobile" },
  "ios development": { domain: "technology", category: "mobile" },
  "android development": { domain: "technology", category: "mobile" },
  "swiftui": { domain: "technology", category: "mobile" },
  "responsive design": { domain: "technology", category: "frontend" },
  "html": { domain: "technology", category: "frontend" },
  "css": { domain: "technology", category: "frontend" },
  "tailwind": { domain: "technology", category: "frontend" },
  "sass": { domain: "technology", category: "frontend" },
  "webpack": { domain: "technology", category: "frontend" },
  "vite": { domain: "technology", category: "frontend" },

  // ---- Testing & QA ----
  "test automation": { domain: "technology", category: "testing" },
  "selenium": { domain: "technology", category: "testing" },
  "cypress": { domain: "technology", category: "testing" },
  "playwright": { domain: "technology", category: "testing" },
  "jest": { domain: "technology", category: "testing" },
  "unit testing": { domain: "technology", category: "testing" },
  "integration testing": { domain: "technology", category: "testing" },
  "qa": { domain: "technology", category: "testing" },
  "performance testing": { domain: "technology", category: "testing" },
  "load testing": { domain: "technology", category: "testing" },
};

/** Human-readable domain names */
const DOMAIN_DISPLAY: Record<string, string> = {
  defense_aerospace: "Defense & Aerospace",
  management: "Program & Project Management",
  quality_compliance: "Quality, Compliance & Standards",
  maintenance_ops: "Maintenance & Operations",
  technology: "Software & Technology",
  leadership: "Leadership & Development",
  tools: "Tools & Platforms",
  healthcare: "Healthcare & Life Sciences",
  finance: "Finance & Accounting",
  marketing: "Marketing & Sales",
  construction: "Construction & Engineering",
  legal: "Legal",
  education: "Education & Academia",
  hr: "Human Resources",
  design: "Design & UX",
  operations: "Supply Chain & Operations",
  energy: "Energy & Environment",
  general: "General",
};

/** Human-readable category names */
const CATEGORY_DISPLAY: Record<string, string> = {
  systems_integration: "Systems Integration",
  compliance_standards: "Compliance & Standards",
  standards: "Industry Standards",
  program_management: "Program Management",
  project_management: "Project Management",
  risk_governance: "Risk & Governance",
  leadership: "Stakeholder Leadership",
  procurement: "Procurement & Contracts",
  financial: "Financial Management",
  organizational: "Organizational Change",
  quality: "Quality Assurance",
  configuration: "Configuration Management",
  requirements: "Requirements Engineering",
  compliance: "Regulatory Compliance",
  safety: "Safety Management",
  fleet: "Fleet Operations",
  maintenance: "Maintenance",
  reliability: "Reliability Engineering",
  airworthiness: "Airworthiness",
  languages: "Programming Languages",
  frameworks: "Frameworks & Libraries",
  cloud_infra: "Cloud & Infrastructure",
  data: "Data & Databases",
  ai_data: "AI, Data & Analytics",
  tools: "Development Tools",
  devops: "DevOps & CI/CD",
  people: "People Leadership",
  development: "Training & Development",
  interpersonal: "Communication",
  strategy: "Strategy",
  process: "Process Improvement",
  enterprise: "Enterprise Systems",
  project_tools: "Project Management Tools",
  aviation_tools: "Aviation Tools",
  engineering_tools: "Engineering Tools",
  collaboration: "Collaboration Tools",
  certifications: "Certifications",
  methodology: "Methodologies",
  regulatory: "Regulatory Bodies",
  // Healthcare
  research: "Research",
  clinical: "Clinical Practice",
  medical_education: "Medical Training & Certifications",
  cardiology: "Cardiology",
  neurology: "Neurology",
  orthopedics: "Orthopedics",
  radiology: "Radiology",
  laboratory: "Laboratory",
  rehabilitation: "Rehabilitation",
  dental: "Dental",
  ophthalmology: "Ophthalmology",
  mental_health: "Mental Health",
  pediatrics: "Pediatrics",
  obstetrics: "Obstetrics & Gynecology",
  systems: "Systems",
  devices: "Devices",
  pharma: "Pharmaceutical",
  digital: "Digital",
  policy: "Policy",
  // Finance
  analysis: "Analysis",
  accounting: "Accounting",
  audit: "Audit",
  tax: "Tax",
  banking: "Banking",
  investment: "Investment",
  risk: "Risk",
  treasury: "Treasury",
  insurance: "Insurance",
  // Marketing
  content: "Content",
  social: "Social Media",
  analytics: "Analytics",
  advertising: "Advertising",
  automation: "Automation",
  crm: "CRM",
  brand: "Brand",
  pr: "Public Relations",
  events: "Events",
  product: "Product",
  growth: "Growth",
  sales: "Sales",
  // Construction
  engineering: "Engineering",
  design: "Design",
  controls: "Controls",
  estimating: "Estimating",
  site: "Site Management",
  surveying: "Surveying",
  mechanical: "Mechanical",
  // Legal
  corporate: "Corporate",
  litigation: "Litigation",
  ip: "Intellectual Property",
  employment: "Employment",
  contracts: "Contracts",
  data_privacy: "Data Privacy",
  // Education
  pedagogy: "Pedagogy",
  instruction: "Instruction",
  edtech: "Educational Technology",
  assessment: "Assessment",
  teaching: "Teaching",
  specialized: "Specialized Education",
  sector: "Sector",
  // HR
  recruitment: "Recruitment",
  employee_lifecycle: "Employee Lifecycle",
  performance: "Performance",
  comp_benefits: "Compensation & Benefits",
  relations: "Employee Relations",
  talent: "Talent Management",
  dei: "Diversity & Inclusion",
  // Design
  ux: "UX Design",
  ui: "UI Design",
  visual: "Visual Design",
  // Operations
  supply_chain: "Supply Chain",
  logistics: "Logistics",
  inventory: "Inventory",
  warehouse: "Warehouse",
  planning: "Planning",
  manufacturing: "Manufacturing",
  process_improvement: "Process Improvement",
  // Energy
  renewables: "Renewables",
  oil_gas: "Oil & Gas",
  sustainability: "Sustainability",
  power: "Power Systems",
  // Technology (expanded)
  security: "Cybersecurity",
  architecture: "Architecture",
  mobile: "Mobile Development",
  frontend: "Frontend",
  testing: "Testing & QA",
  general: "General",
};

/**
 * Classify a raw skill name into the taxonomy.
 *
 * Priority order:
 *   1. Curated table — exact match (known-correct, ~300 entries)
 *   2. Curated table — substring match (≥4 char keys)
 *   3. LLM/context classification — the LLM saw the full CV, trust it
 *   4. Regex keyword fallback — infer domain from skill name patterns
 *   5. Last resort — "general/general"
 *
 * @param name - Raw skill name to classify
 * @param contextDomain - Domain from LLM classification or role context (optional)
 * @param contextCategory - Category from LLM classification (optional)
 */
export function classifySkill(
  name: string,
  contextDomain?: string,
  contextCategory?: string,
): { domain: string; category: string } {
  const lower = name.toLowerCase().trim();

  // 1. Curated table — exact match (highest confidence)
  const match = SKILL_TAXONOMY[lower];
  if (match) return match;

  // 2. Curated table — substring match (require min 4 chars to avoid "r"/"go" matching everything)
  for (const [key, val] of Object.entries(SKILL_TAXONOMY)) {
    if (key.length < 4) continue;
    if (lower.includes(key) || key.includes(lower)) return val;
  }

  // 3. LLM/context classification — the LLM saw full CV context (titles, bullets, companies)
  //    Trust it if it's not "general". This is what makes us work for ANY profession.
  if (contextDomain && contextDomain !== "general") {
    return {
      domain: contextDomain,
      category: contextCategory && contextCategory !== "general"
        ? contextCategory
        : inferCategoryFromKeywords(name, contextDomain),
    };
  }

  // 4. Regex keyword fallback — infer domain from skill name patterns
  const regexResult = inferDomainFromKeywords(name);
  if (regexResult) return regexResult;

  // 5. Last resort
  return { domain: "general", category: "general" };
}

/**
 * Infer domain from keywords in a skill name. Pure regex, no LLM.
 * Returns null if no pattern matches (caller falls to "general").
 */
function inferDomainFromKeywords(name: string): { domain: string; category: string } | null {
  if (/avion|aircraft|aero|flight|radar|defense|defence|military/i.test(name)) {
    return { domain: "defense_aerospace", category: inferCategoryFromKeywords(name, "defense_aerospace") };
  }
  if (/manag|program|project|portfolio|pmo/i.test(name)) {
    return { domain: "management", category: inferCategoryFromKeywords(name, "management") };
  }
  if (/quality|compli|config|require|audit|iso|standard/i.test(name)) {
    return { domain: "quality_compliance", category: inferCategoryFromKeywords(name, "quality_compliance") };
  }
  if (/maintain|fleet|reliab|fault|mro|camo/i.test(name)) {
    return { domain: "maintenance_ops", category: inferCategoryFromKeywords(name, "maintenance_ops") };
  }
  if (/lead|team|train|mentor|coach|supervis/i.test(name)) {
    return { domain: "leadership", category: inferCategoryFromKeywords(name, "leadership") };
  }
  if (/health|medical|clinical|patient|pharma|nurs|diagnos|epidem|surg|anesth|cardio|ortho|neuro|icu|resuscit|emergency.*care|critical.*care|perioper|intubat|ventilat|trauma|triage|vital|hemodynam|stabiliz|life support|bls|acls|pals|aha|pain.*manag/i.test(name)) {
    return { domain: "healthcare", category: inferCategoryFromKeywords(name, "healthcare") };
  }
  if (/financ|account|bank|invest|actuar|tax|treasury/i.test(name)) {
    return { domain: "finance", category: inferCategoryFromKeywords(name, "finance") };
  }
  if (/market|seo|advertis|brand|sales|crm|copywr|content/i.test(name)) {
    return { domain: "marketing", category: inferCategoryFromKeywords(name, "marketing") };
  }
  if (/civil|structur|construct|bim|survey|hvac|geotec|estimat/i.test(name)) {
    return { domain: "construction", category: inferCategoryFromKeywords(name, "construction") };
  }
  if (/legal|law|litigat|patent|contract|gdpr|privacy/i.test(name)) {
    return { domain: "legal", category: inferCategoryFromKeywords(name, "legal") };
  }
  if (/educ|curricul|teach|instruct|learn|academ|accredit/i.test(name)) {
    return { domain: "education", category: inferCategoryFromKeywords(name, "education") };
  }
  if (/recruit|talent|onboard|hr|hris|payroll|employee|compensation/i.test(name)) {
    return { domain: "hr", category: inferCategoryFromKeywords(name, "hr") };
  }
  if (/ux|ui|wireframe|prototype|figma|sketch|graphic|usability/i.test(name)) {
    return { domain: "design", category: inferCategoryFromKeywords(name, "design") };
  }
  if (/supply.?chain|logistics|warehouse|inventor|procure|manufactur/i.test(name)) {
    return { domain: "operations", category: inferCategoryFromKeywords(name, "operations") };
  }
  if (/energy|solar|wind|renew|oil|gas|sustain|esg|power.?system/i.test(name)) {
    return { domain: "energy", category: inferCategoryFromKeywords(name, "energy") };
  }
  if (/secur|cyber|pentest|siem|soc|incident.?resp|vulnerab/i.test(name)) {
    return { domain: "technology", category: "security" };
  }

  return null;
}

/**
 * Given a domain, infer a more specific category from keyword patterns in the skill name.
 * This gives us "healthcare/clinical" instead of "healthcare/general" when the LLM
 * provided the domain but no useful category.
 */
function inferCategoryFromKeywords(name: string, domain: string): string {
  const lower = name.toLowerCase();

  switch (domain) {
    case "healthcare":
      if (/surg|anesth|intubat|airway|perioper|icu|ventilat|resuscit/i.test(lower)) return "clinical";
      if (/cardio|ecg|echo|catheter|pacemaker/i.test(lower)) return "cardiology";
      if (/neuro|brain|spine|cranio/i.test(lower)) return "neurology";
      if (/ortho|fracture|joint|bone/i.test(lower)) return "orthopedics";
      if (/nurs|patient care|wound|triage/i.test(lower)) return "nursing";
      if (/research|study|trial|epidem|biostat/i.test(lower)) return "research";
      if (/pharma|drug|prescri|dosage|formul/i.test(lower)) return "pharmaceutical";
      if (/radiol|imaging|mri|ct scan|x-ray|ultrasound/i.test(lower)) return "radiology";
      if (/lab|pathol|blood|hematol|microbi/i.test(lower)) return "laboratory";
      if (/educat|train|instruct|mentor|teach|bls|acls|pals/i.test(lower)) return "medical_education";
      if (/compli|regulat|hipaa|jci|accredit|audit/i.test(lower)) return "compliance";
      if (/admin|billing|coding|icd|cpt|ehr|emr/i.test(lower)) return "administration";
      if (/rehab|physio|therap|occupat/i.test(lower)) return "rehabilitation";
      if (/dent|oral|endodont|orthodont/i.test(lower)) return "dental";
      if (/ophthalm|eye|vision|retina/i.test(lower)) return "ophthalmology";
      if (/psych|mental|counsel|behav/i.test(lower)) return "mental_health";
      if (/pediatr|neonat|child/i.test(lower)) return "pediatrics";
      if (/obstet|gynec|matern|pregnan/i.test(lower)) return "obstetrics";
      return "general";

    case "defense_aerospace":
      if (/avion|electron|sensor|radar|ew|ecm/i.test(lower)) return "avionics";
      if (/system|integrat|mbse|sysml/i.test(lower)) return "systems_integration";
      if (/flight|pilot|airborne|aew/i.test(lower)) return "flight_operations";
      if (/weapon|missile|munition|ordnance/i.test(lower)) return "weapons";
      if (/maintain|repair|overhaul|servic/i.test(lower)) return "maintenance";
      if (/standard|mil-std|do-178|do-254|as9100/i.test(lower)) return "standards";
      if (/certif|airworth|qualify|accept/i.test(lower)) return "airworthiness";
      if (/program|pmo|acquis/i.test(lower)) return "program_management";
      if (/config|baseline|change.?control/i.test(lower)) return "configuration";
      if (/reliab|mtbf|mttr|failure/i.test(lower)) return "reliability";
      if (/navig|gps|ins|cns|atm/i.test(lower)) return "navigation";
      if (/propuls|engine|turbine|thrust/i.test(lower)) return "propulsion";
      if (/structur|aerodynam|composit|fuselage/i.test(lower)) return "structures";
      return "general";

    case "technology":
      if (/python|java|type|rust|go|swift|kotlin|ruby|php|scala|c\+\+|c#/i.test(lower)) return "languages";
      if (/react|angular|vue|next|node|django|flask|spring|express/i.test(lower)) return "frameworks";
      if (/aws|gcp|azure|cloud|docker|kubernetes|terraform|ansible/i.test(lower)) return "cloud_infra";
      if (/sql|postgres|mysql|mongo|redis|elastic|kafka|data/i.test(lower)) return "data";
      if (/ml|ai|deep.?learn|nlp|vision|tensor|pytorch|model/i.test(lower)) return "ai_data";
      if (/ci|cd|jenkins|github.?action|deploy|devops|pipeline/i.test(lower)) return "devops";
      if (/secur|crypto|pentest|siem|firewall|oauth/i.test(lower)) return "security";
      if (/test|selenium|cypress|jest|playwright|qa/i.test(lower)) return "testing";
      if (/mobile|ios|android|react.?native|flutter|swift/i.test(lower)) return "mobile";
      if (/html|css|tailwind|sass|webpack|frontend/i.test(lower)) return "frontend";
      if (/api|rest|graphql|microservice|architect/i.test(lower)) return "architecture";
      if (/git|jira|confluence|notion|tool/i.test(lower)) return "tools";
      return "general";

    case "management":
      if (/program|portfolio|pmo/i.test(lower)) return "program_management";
      if (/project|schedil|timeline|gantt/i.test(lower)) return "project_management";
      if (/risk|raid|mitigat|contingenc/i.test(lower)) return "risk_governance";
      if (/stakeholder|commun|negotiat/i.test(lower)) return "leadership";
      if (/contract|vendor|supplier|procur|sourcing/i.test(lower)) return "procurement";
      if (/budget|cost|financ|evm|earned.?value/i.test(lower)) return "financial";
      if (/agile|scrum|kanban|lean|six.?sigma/i.test(lower)) return "methodology";
      if (/change|transform|organi/i.test(lower)) return "organizational";
      return "general";

    case "finance":
      if (/account|ledger|journal|reconcil|payable|receivable/i.test(lower)) return "accounting";
      if (/audit|sox|internal.?control/i.test(lower)) return "audit";
      if (/tax|vat|gst|withhold/i.test(lower)) return "tax";
      if (/invest|portfolio|asset|equity|bond|fund/i.test(lower)) return "investment";
      if (/bank|credit|loan|mortgage|treasury/i.test(lower)) return "banking";
      if (/risk|credit.?risk|market.?risk|basel/i.test(lower)) return "risk";
      if (/compli|aml|kyc|regulat/i.test(lower)) return "compliance";
      if (/insur|actuar|underwr|claim/i.test(lower)) return "insurance";
      if (/analy|model|forecast|valuat/i.test(lower)) return "analysis";
      return "general";

    case "construction":
      if (/civil|structur|geotec|foundation/i.test(lower)) return "engineering";
      if (/electr|power|wiring|circuit/i.test(lower)) return "electrical";
      if (/mechan|hvac|plumb|piping/i.test(lower)) return "mechanical";
      if (/autocad|revit|solidwork|catia|bim/i.test(lower)) return "tools";
      if (/estimat|quantity|cost|tender|bid/i.test(lower)) return "estimating";
      if (/site|supervis|foreman|construct/i.test(lower)) return "site";
      if (/safety|osha|hse|hazard/i.test(lower)) return "safety";
      if (/survey|topograph|gis|mapping/i.test(lower)) return "surveying";
      return "general";

    case "marketing":
      if (/seo|sem|ppc|google.?ads|facebook.?ads|advertis/i.test(lower)) return "digital";
      if (/content|copywr|blog|editorial/i.test(lower)) return "content";
      if (/social|instagram|twitter|linkedin|tiktok/i.test(lower)) return "social";
      if (/brand|position|identit/i.test(lower)) return "brand";
      if (/crm|salesforce|hubspot|customer/i.test(lower)) return "crm";
      if (/analytic|metric|attribution|roi/i.test(lower)) return "analytics";
      if (/sale|b2b|b2c|lead|pipeline|prospect/i.test(lower)) return "sales";
      if (/event|conferenc|trade.?show|webinar/i.test(lower)) return "events";
      if (/pr|press|media.?relation|communicat/i.test(lower)) return "pr";
      return "general";

    case "legal":
      if (/corporate|m&a|merger|acquisit|due.?dilig/i.test(lower)) return "corporate";
      if (/litigat|dispute|arbitrat|trial/i.test(lower)) return "litigation";
      if (/ip|patent|trademark|copyright/i.test(lower)) return "ip";
      if (/employ|labor|workplace|discriminat/i.test(lower)) return "employment";
      if (/contract|draft|negotiat|agreement/i.test(lower)) return "contracts";
      if (/gdpr|privacy|data.?protect/i.test(lower)) return "data_privacy";
      if (/regulat|compli|licens/i.test(lower)) return "compliance";
      return "general";

    case "hr":
      if (/recruit|talent|hire|sourcing|interview/i.test(lower)) return "recruitment";
      if (/onboard|orient|induct/i.test(lower)) return "employee_lifecycle";
      if (/perform|review|apprais|goal/i.test(lower)) return "performance";
      if (/compens|benefit|payroll|salary/i.test(lower)) return "comp_benefits";
      if (/hris|workday|successfactor|bamboo/i.test(lower)) return "systems";
      if (/divers|inclus|equity|dei/i.test(lower)) return "dei";
      if (/train|develop|learn|l&d/i.test(lower)) return "development";
      if (/labor|union|relation|grievanc/i.test(lower)) return "relations";
      return "general";

    case "design":
      if (/ux|user.?experience|usabil|accessib/i.test(lower)) return "ux";
      if (/ui|user.?interface|visual|layout/i.test(lower)) return "ui";
      if (/research|interview|survey|persona/i.test(lower)) return "research";
      if (/figma|sketch|adobe|photoshop|illustrat|invision/i.test(lower)) return "tools";
      if (/graphic|poster|brochure|print/i.test(lower)) return "visual";
      if (/motion|animation|video|after.?effect/i.test(lower)) return "motion";
      if (/design.?system|component|token|style.?guide/i.test(lower)) return "systems";
      return "general";

    case "education":
      if (/curricul|syllabus|lesson|course.?design/i.test(lower)) return "instruction";
      if (/e-learn|lms|moodle|canvas|online/i.test(lower)) return "edtech";
      if (/assess|exam|rubric|grading/i.test(lower)) return "assessment";
      if (/research|publish|peer|journal/i.test(lower)) return "research";
      if (/accredit|obe|quality|standard/i.test(lower)) return "quality";
      if (/teach|tutor|lecture|professor/i.test(lower)) return "teaching";
      if (/special|disabil|inclusive/i.test(lower)) return "specialized";
      return "general";

    case "operations":
      if (/supply.?chain|scm|procurement|sourcing/i.test(lower)) return "supply_chain";
      if (/logist|freight|shipping|transport|distribut/i.test(lower)) return "logistics";
      if (/inventor|stock|warehou|wms/i.test(lower)) return "inventory";
      if (/manufactur|lean|six.?sigma|kaizen|tqm/i.test(lower)) return "manufacturing";
      if (/demand|forecast|plan|s&op/i.test(lower)) return "planning";
      if (/sap|erp|oracle|netsuite/i.test(lower)) return "systems";
      return "general";

    case "energy":
      if (/solar|wind|renew|hydro|biomass/i.test(lower)) return "renewables";
      if (/oil|gas|petrol|drill|refin|upstream|downstream/i.test(lower)) return "oil_gas";
      if (/power|grid|transmiss|distribut|substation/i.test(lower)) return "power";
      if (/sustain|esg|carbon|emiss|climate/i.test(lower)) return "sustainability";
      if (/hse|safety|hazard|permit/i.test(lower)) return "safety";
      if (/nuclear|reactor|radiation/i.test(lower)) return "nuclear";
      return "general";

    case "quality_compliance":
      if (/quality|qa|tqm|inspection/i.test(lower)) return "quality";
      if (/config|baseline|change/i.test(lower)) return "configuration";
      if (/require|traceab|specif/i.test(lower)) return "requirements";
      if (/compli|regulat|licens|certif/i.test(lower)) return "compliance";
      if (/audit|assess|review/i.test(lower)) return "compliance";
      if (/safety|hazard|fmea|risk/i.test(lower)) return "safety";
      if (/iso|as9100|cmmi|standard/i.test(lower)) return "standards";
      return "general";

    case "maintenance_ops":
      if (/fleet|aircraft|vehicle/i.test(lower)) return "fleet";
      if (/maintain|repair|overhaul|mro|servic/i.test(lower)) return "maintenance";
      if (/reliab|mtbf|mttr|failure|rca/i.test(lower)) return "reliability";
      if (/airworth|camo|part.?145|easa/i.test(lower)) return "airworthiness";
      if (/fault|diagnos|troubleshoot/i.test(lower)) return "diagnostics";
      return "general";

    case "leadership":
      if (/team|people|staff|direct.?report/i.test(lower)) return "people";
      if (/train|develop|mentor|coach/i.test(lower)) return "development";
      if (/communicat|present|negotiat|influenc/i.test(lower)) return "interpersonal";
      if (/strateg|vision|roadmap|plan/i.test(lower)) return "strategy";
      if (/process|improv|optimi|efficien/i.test(lower)) return "process";
      return "general";

    default:
      return "general";
  }
}

// ============================================================
// CLOUD CLASSIFICATION — Process all nodes into taxonomy
// ============================================================

export interface ClassifiedRole {
  title: string;
  company: string;
  startYear: number;
  endYear: number;
  domain: string;
  durationMonths: number;
}

export interface ClassifiedCloud {
  domains: TaxonomyDomain[];
  topSkills: ClassifiedSkill[];
  roles: ClassifiedRole[];
  careerSpan: { startYear: number; endYear: number; years: number };
  totalRoles: number;
  totalEvidencePoints: number;
  gaps: SkillGap[];
}

/**
 * Process raw cloud nodes into a classified, hierarchical taxonomy.
 */
export function classifyCloud(nodes: CloudNode[]): ClassifiedCloud {
  const skillNodes = nodes.filter((n) => n.type === "skill" || n.type === "capability");

  // Classify each skill
  const classified: ClassifiedSkill[] = skillNodes
    .filter((n) => n.category !== "competency") // skip raw competency sentences
    .map((node) => {
      const { domain, category } = classifySkill(node.name);
      return {
        name: node.name,
        domain,
        category,
        depth: inferDepthLevel(node.evidence),
        evidence: node.evidence,
      };
    })
    .filter((s) => s.depth.level !== "mentioned" || s.evidence.length > 0);

  // Category-aware score adjustment (profession-agnostic)
  // Determine the user's primary domain (most evidence-heavy)
  const domainEvidenceCounts = new Map<string, number>();
  for (const s of classified) {
    domainEvidenceCounts.set(s.domain, (domainEvidenceCounts.get(s.domain) ?? 0) + s.evidence.length);
  }
  const primaryDomain = [...domainEvidenceCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general";

  // Supporting categories that should NOT outrank core domain skills:
  // - "certifications" (PMP, PRINCE2, etc.)
  // - categories ending in "_education" (medical_education, etc.)
  // - "methodology" (Agile, Scrum — frameworks not core practice)
  const isSupportingCategory = (cat: string) =>
    cat === "certifications" || cat.endsWith("_education") || cat === "methodology";

  for (const skill of classified) {
    const rawScore = skill.depth.score;
    if (skill.domain === primaryDomain && !isSupportingCategory(skill.category)) {
      // Core domain skills: boost by 1.5x — profession ALWAYS outranks certs
      skill.depth.score = Math.min(150, Math.round(rawScore * 1.5));
    } else if (isSupportingCategory(skill.category)) {
      // Supporting certifications/methodologies: cap at 0.3x — differentiators, not identity
      skill.depth.score = Math.round(rawScore * 0.3);
    }
    // Skills in non-primary domains keep their raw score — no penalty
  }

  // Group into domain > category hierarchy
  const domainMap = new Map<string, Map<string, ClassifiedSkill[]>>();
  for (const skill of classified) {
    if (!domainMap.has(skill.domain)) domainMap.set(skill.domain, new Map());
    const catMap = domainMap.get(skill.domain)!;
    if (!catMap.has(skill.category)) catMap.set(skill.category, []);
    catMap.get(skill.category)!.push(skill);
  }

  // Build domain objects
  const domains: TaxonomyDomain[] = [];
  for (const [domainName, catMap] of domainMap) {
    const categories: TaxonomyCategory[] = [];
    for (const [catName, skills] of catMap) {
      categories.push({
        name: catName,
        displayName: CATEGORY_DISPLAY[catName] ?? catName,
        skills: skills.sort((a, b) => b.depth.score - a.depth.score),
      });
    }
    domains.push({
      name: domainName,
      displayName: DOMAIN_DISPLAY[domainName] ?? domainName,
      categories: categories.sort(
        (a, b) =>
          b.skills.reduce((s, sk) => s + sk.depth.score, 0) -
          a.skills.reduce((s, sk) => s + sk.depth.score, 0),
      ),
    });
  }

  // Sort domains by total depth score
  domains.sort(
    (a, b) =>
      b.categories.reduce((s, c) => s + c.skills.reduce((ss, sk) => ss + sk.depth.score, 0), 0) -
      a.categories.reduce((s, c) => s + c.skills.reduce((ss, sk) => ss + sk.depth.score, 0), 0),
  );

  // Top skills across all domains
  const topSkills = [...classified].sort((a, b) => b.depth.score - a.depth.score).slice(0, 15);

  // Career span — collect all role date ranges, deduplicate, build role list
  const allStartYears: number[] = [];
  const allEndYears: number[] = [];
  const roleMap = new Map<string, ClassifiedRole>(); // key: "startYear|endYear"
  let totalEvidence = 0;

  for (const node of nodes) {
    totalEvidence += node.evidence.length;
    for (const ev of node.evidence) {
      if (ev.type === "role") {
        const role = ev as { company?: string; title?: string; start_date?: string; end_date?: string; duration_months?: number };
        const sy = extractYearFromDate(role.start_date);
        const ey = extractYearFromDate(role.end_date);
        if (!isNaN(sy)) allStartYears.push(sy);
        if (!isNaN(ey)) allEndYears.push(ey);
        if (!isNaN(sy) && !isNaN(ey)) {
          const key = `${sy}|${ey}`;
          if (!roleMap.has(key)) {
            // Detect domain from the skill node this evidence is attached to
            const skillDomain = classifySkill(node.name).domain;
            roleMap.set(key, {
              title: role.title ?? "Role",
              company: role.company ?? "",
              startYear: sy,
              endYear: ey,
              domain: skillDomain !== "general" ? skillDomain : detectRoleDomain(role.title ?? "", role.company ?? ""),
              durationMonths: role.duration_months ?? Math.max(1, (ey - sy) * 12),
            });
          }
        }
      }
    }
  }

  // Career start: detect education gap (skip pre-career education years)
  const sortedStarts = [...new Set(allStartYears)].sort((a, b) => a - b);
  let careerStart = sortedStarts[0] ?? 0;
  if (sortedStarts.length >= 2) {
    for (let i = 0; i < sortedStarts.length - 1; i++) {
      if (sortedStarts[i + 1] - sortedStarts[i] >= 3) {
        careerStart = sortedStarts[i + 1];
        break;
      }
    }
  }
  const careerEnd = allEndYears.length > 0 ? Math.max(...allEndYears) : 0;

  // Safety: if careerStart is 0 or invalid, years should be 0 (not 2026)
  // Also cap at reasonable maximum (60 years) to catch any remaining bugs
  const careerYears = (careerStart > 0 && careerEnd > careerStart)
    ? Math.min(careerEnd - careerStart, 60)
    : 0;

  // Collect unique roles sorted by start year
  const roles = [...roleMap.values()].sort((a, b) => a.startYear - b.startYear);

  return {
    domains,
    topSkills,
    roles,
    careerSpan: {
      startYear: careerStart,
      endYear: careerEnd,
      years: careerYears,
    },
    totalRoles: roleMap.size,
    totalEvidencePoints: totalEvidence,
    gaps: [], // populated by detectGaps()
  };
}

// ============================================================
// GAP IDENTIFICATION — What's missing for their expertise
// ============================================================

export interface SkillGap {
  skillName: string;
  reason: string;
  priority: "p0" | "p1" | "p2";
  type: "missing" | "shallow" | "stale";
}

/** Infer domain from role title/company when skill-based detection gives "general" */
function detectRoleDomain(title: string, company: string): string {
  const text = `${title} ${company}`.toLowerCase();
  if (/avion|aircraft|aviation|aerospace|flight|airworth|defense|defence|military|air force/i.test(text)) return "defense_aerospace";
  if (/maintenance|fleet|mro|camo|reliability/i.test(text)) return "maintenance_ops";
  if (/program|project|pmo|portfolio/i.test(text)) return "management";
  if (/quality|compliance|audit|accreditation/i.test(text)) return "quality_compliance";
  if (/software|developer|engineer.*software/i.test(text)) return "technology";
  if (/university|college|academic|professor|faculty/i.test(text)) return "leadership";
  return "general";
}

/**
 * Expected skills by domain — ONLY for domains where user has deep expertise.
 * These are adjacent skills that strengthen an existing deep skillset,
 * NOT generic industry trends.
 */
const DOMAIN_EXPECTED_SKILLS: Record<string, Array<{ skill: string; reason: string; adjacentTo: string[] }>> = {
  defense_aerospace: [
    { skill: "model-based systems engineering", reason: "MBSE is becoming standard for defense system design and V&V", adjacentTo: ["systems engineering", "integration", "verification & validation"] },
    { skill: "digital twin", reason: "Emerging for fleet sustainment and predictive maintenance", adjacentTo: ["fleet management", "predictive maintenance", "reliability engineering"] },
    { skill: "supply chain management", reason: "Critical for defense procurement and logistics programs", adjacentTo: ["procurement", "contract management", "vendor management"] },
  ],
  management: [
    { skill: "data analytics", reason: "Data-driven decision making for program governance and reporting", adjacentTo: ["program management", "evm", "portfolio management"] },
  ],
  maintenance_ops: [
    { skill: "predictive maintenance", reason: "ML-driven predictive maintenance replacing scheduled maintenance", adjacentTo: ["reliability engineering", "fleet management", "fault diagnosis"] },
  ],
  technology: [
    { skill: "cloud infrastructure", reason: "Cloud-native development is the standard platform", adjacentTo: ["docker", "kubernetes", "aws", "azure"] },
    { skill: "ci/cd", reason: "Automated deployment pipelines expected for production systems", adjacentTo: ["devops", "git", "docker"] },
  ],
};

/**
 * Detect skill gaps with due diligence.
 *
 * Rules:
 * 1. Only suggest gaps in PRIMARY domains (where user has expert-level skills)
 * 2. Only suggest skills ADJACENT to what they already have (not random industry trends)
 * 3. Check ALL skills (not just top 15) before flagging as missing
 * 4. Shallow skill suggestions only for skills the user clearly uses but hasn't documented well
 */
export function detectGaps(
  classified: ClassifiedCloud,
): SkillGap[] {
  const gaps: SkillGap[] = [];

  // Build a set of ALL user skills (lowercase) across all domains
  const allSkillNames = new Set<string>();
  for (const domain of classified.domains) {
    for (const cat of domain.categories) {
      for (const skill of cat.skills) {
        allSkillNames.add(skill.name.toLowerCase());
      }
    }
  }

  // Only suggest for PRIMARY domains (domains where user has expert-level skills)
  const primaryDomains = classified.domains.filter((d) =>
    d.categories.some((c) => c.skills.some((s) => s.depth.level === "expert" || s.depth.level === "proficient")),
  );

  for (const domain of primaryDomains) {
    const expected = DOMAIN_EXPECTED_SKILLS[domain.name];
    if (!expected) continue;

    // Get user's existing skills in this domain
    const domainSkillNames = new Set<string>();
    for (const cat of domain.categories) {
      for (const skill of cat.skills) {
        domainSkillNames.add(skill.name.toLowerCase());
      }
    }

    for (const { skill, reason, adjacentTo } of expected) {
      // Skip if user already has this skill (check ALL skills, not just topSkills)
      if (allSkillNames.has(skill)) continue;
      const hasSimilar = [...allSkillNames].some(
        (s) => s.includes(skill) || skill.includes(s),
      );
      if (hasSimilar) continue;

      // Only suggest if user has at least one of the adjacent skills
      const hasAdjacentSkill = adjacentTo.some((adj) =>
        [...domainSkillNames].some((s) => s.includes(adj) || adj.includes(s)),
      );
      if (!hasAdjacentSkill) continue;

      gaps.push({ skillName: skill, reason, priority: "p1", type: "missing" });
    }
  }

  // Shallow skills: only flag skills at "applied" in a domain where user has expert depth
  // AND only if the skill appears in multiple roles (suggesting it's important but under-documented)
  for (const domain of primaryDomains) {
    const domainHasExperts = domain.categories.some((c) =>
      c.skills.some((s) => s.depth.level === "expert"),
    );
    if (!domainHasExperts) continue;

    for (const cat of domain.categories) {
      for (const skill of cat.skills) {
        if (skill.depth.level === "applied" && skill.depth.roleCount === 1 && skill.depth.totalMonths >= 12) {
          gaps.push({
            skillName: skill.name,
            reason: `Used for ${Math.round(skill.depth.totalMonths / 12)}+ years but documented in only 1 role — Socratic questions can surface more evidence`,
            priority: "p2",
            type: "shallow",
          });
        }
      }
    }
  }

  gaps.sort((a, b) => {
    const order = { p0: 0, p1: 1, p2: 2 };
    return order[a.priority] - order[b.priority];
  });

  return gaps.slice(0, 5);
}

// ============================================================
// TAXONOMY NORMALIZATION — Map LLM output to approved terms
//
// Cross-reference guidance (from Deep Research Report, May 2026):
// - O*NET (46 skill areas, 325 intermediate work activities): use as quality check
//   for domain/category completeness. Transformer-based skill/job matching on O*NET
//   outperforms keyword baselines (see deep-research-report).
// - ESCO (13,890 skills, 4 sub-classifications): use for European market coverage
//   and multilingual skill name normalization when expanding internationally.
// - Neither should be imported wholesale — our LLM classifier handles every profession.
//   These are reference standards for auditing coverage gaps in DOMAIN_EXPECTED_SKILLS.
// ============================================================

/** All approved domain strings (keys of DOMAIN_DISPLAY) */
export const APPROVED_DOMAINS = new Set(Object.keys(DOMAIN_DISPLAY));

/** Aliases: LLM variants → approved domain names */
const DOMAIN_ALIASES: Record<string, string> = {
  // Common LLM variations
  "aerospace": "defense_aerospace",
  "defense": "defense_aerospace",
  "defence": "defense_aerospace",
  "aviation": "defense_aerospace",
  "military": "defense_aerospace",
  "aviation_electronics": "defense_aerospace",
  "avionics": "defense_aerospace",
  "embedded_avionics": "defense_aerospace",
  "aircraft_electronics": "defense_aerospace",
  "aerospace_electronics": "defense_aerospace",
  "project_management": "management",
  "program_management": "management",
  "management_consulting": "management",
  "maintenance": "maintenance_ops",
  "maintenance_engineering": "maintenance_ops",
  "fleet_operations": "maintenance_ops",
  "software": "technology",
  "it": "technology",
  "information_technology": "technology",
  "tech": "technology",
  "engineering": "technology",
  "software_engineering": "technology",
  "web_development": "technology",
  "data_science": "technology",
  "cybersecurity": "technology",
  "cloud_computing": "technology",
  "devops": "technology",
  "soft_skills": "leadership",
  "people_management": "leadership",
  "team_management": "leadership",
  "quality": "quality_compliance",
  "compliance": "quality_compliance",
  "standards": "quality_compliance",
  "regulatory": "quality_compliance",
  "medical": "healthcare",
  "health": "healthcare",
  "clinical": "healthcare",
  "pharma": "healthcare",
  "pharmaceutical": "healthcare",
  "life_sciences": "healthcare",
  "medicine": "healthcare",
  "accounting": "finance",
  "banking": "finance",
  "financial_services": "finance",
  "sales": "marketing",
  "advertising": "marketing",
  "digital_marketing": "marketing",
  "civil_engineering": "construction",
  "structural_engineering": "construction",
  "building": "construction",
  "real_estate": "construction",
  "human_resources": "hr",
  "people_operations": "hr",
  "talent": "hr",
  "ux": "design",
  "ui": "design",
  "product_design": "design",
  "graphic_design": "design",
  "creative": "design",
  "supply_chain": "operations",
  "logistics": "operations",
  "manufacturing": "operations",
  "procurement": "operations",
  "oil_gas": "energy",
  "renewables": "energy",
  "environmental": "energy",
  "power": "energy",
  "academia": "education",
  "teaching": "education",
  "training": "education",
  "law": "legal",
  "enterprise_software": "tools",
  "platforms": "tools",
};

/**
 * Normalize an LLM-generated domain string to an approved domain.
 * Returns the approved domain, or "general" if not recognized (and logs the gap).
 */
export function normalizeDomain(rawDomain: string): string {
  const lower = rawDomain.toLowerCase().trim().replace(/\s+/g, "_");

  // Direct match
  if (APPROVED_DOMAINS.has(lower)) return lower;

  // Alias match
  const alias = DOMAIN_ALIASES[lower];
  if (alias) return alias;

  // Partial match: check if any approved domain is contained in the raw string
  for (const approved of APPROVED_DOMAINS) {
    if (lower.includes(approved) || approved.includes(lower)) return approved;
  }

  // Not found — log gap and return "general"
  logTaxonomyGap("domain", rawDomain, lower);
  return "general";
}

/**
 * Normalize an LLM-generated category string.
 * Returns the normalized category, or the raw string if not in approved list (logged).
 */
const CATEGORY_ALIASES: Record<string, string> = {
  "programming": "languages",
  "programming_languages": "languages",
  "databases": "data",
  "database": "data",
  "cloud": "cloud_infra",
  "infrastructure": "cloud_infra",
  "ci_cd": "devops",
  "machine_learning": "ai_data",
  "analytics": "ai_data",
  "communication": "interpersonal",
  "agile": "methodology",
  "scrum": "methodology",
  "testing": "quality",
  "qa": "quality",
  "risk_management": "risk_governance",
  "stakeholder_management": "leadership",
  "configuration_management": "configuration",
  "strategic_planning": "strategy",
  "quality_assurance": "quality",
};

export function normalizeCategory(rawCategory: string, domain: string): string {
  const lower = rawCategory.toLowerCase().trim().replace(/\s+/g, "_");

  // Direct match in CATEGORY_DISPLAY
  if (CATEGORY_DISPLAY[lower]) return lower;

  // Alias match
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];

  // Not found — log and return as-is (categories are more fluid than domains)
  if (lower !== "general" && lower !== "other") {
    logTaxonomyGap("category", rawCategory, `${domain}/${lower}`);
  }
  return lower;
}

export interface TaxonomyGapEntry {
  timestamp: string;
  type: "domain" | "category";
  raw: string;
  normalized: string;
  resolvedTo: string;
}

/** In-memory gap log (flushed to file periodically or on process exit) */
const taxonomyGapLog: TaxonomyGapEntry[] = [];

function logTaxonomyGap(type: "domain" | "category", raw: string, normalized: string): void {
  taxonomyGapLog.push({
    timestamp: new Date().toISOString(),
    type,
    raw,
    normalized,
    resolvedTo: type === "domain" ? "general" : normalized,
  });
}

/** Get accumulated taxonomy gaps (for reporting/testing) */
export function getTaxonomyGaps(): TaxonomyGapEntry[] {
  return [...taxonomyGapLog];
}

/** Clear taxonomy gaps (for testing) */
export function clearTaxonomyGaps(): void {
  taxonomyGapLog.length = 0;
}

/**
 * Normalize both domain and category from LLM output.
 * Call this on every skill after LLM parsing, before Cloud building.
 */
export function normalizeTaxonomy(rawDomain: string, rawCategory: string): { domain: string; category: string } {
  const domain = normalizeDomain(rawDomain);
  const category = normalizeCategory(rawCategory, domain);
  return { domain, category };
}
