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
    const startYear = parseInt(String(role.start_date), 10);
    const endYear = role.end_date === "present" || role.end_date === "Present"
      ? new Date().getFullYear()
      : parseInt(String(role.end_date), 10);
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
  clinical: "Clinical",
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
 * Falls back to domain inference from the skill name itself.
 */
export function classifySkill(
  name: string,
): { domain: string; category: string } {
  const lower = name.toLowerCase().trim();
  const match = SKILL_TAXONOMY[lower];
  if (match) return match;

  // Fuzzy matching: try partial matches (require min 4 chars to avoid "r"/"go" matching everything)
  for (const [key, val] of Object.entries(SKILL_TAXONOMY)) {
    if (key.length < 4) continue; // skip short keys like "r", "go", "c#", "qa"
    if (lower.includes(key) || key.includes(lower)) return val;
  }

  // Fallback: infer from keywords in the name
  if (/avion|aircraft|aero|flight|radar|defense|defence|military/i.test(name)) {
    return { domain: "defense_aerospace", category: "general" };
  }
  if (/manag|program|project|portfolio|pmo/i.test(name)) {
    return { domain: "management", category: "general" };
  }
  if (/quality|compli|config|require|audit|iso|standard/i.test(name)) {
    return { domain: "quality_compliance", category: "general" };
  }
  if (/maintain|fleet|reliab|fault|mro|camo/i.test(name)) {
    return { domain: "maintenance_ops", category: "general" };
  }
  if (/lead|team|train|mentor|coach|supervis/i.test(name)) {
    return { domain: "leadership", category: "general" };
  }
  if (/health|medical|clinical|patient|pharma|nurs|diagnos|epidem/i.test(name)) {
    return { domain: "healthcare", category: "general" };
  }
  if (/financ|account|bank|invest|actuar|tax|treasury|audit/i.test(name)) {
    return { domain: "finance", category: "general" };
  }
  if (/market|seo|advertis|brand|sales|crm|copywr|content/i.test(name)) {
    return { domain: "marketing", category: "general" };
  }
  if (/civil|structur|construct|bim|survey|hvac|geotec|estimat/i.test(name)) {
    return { domain: "construction", category: "general" };
  }
  if (/legal|law|litigat|patent|contract|gdpr|privacy/i.test(name)) {
    return { domain: "legal", category: "general" };
  }
  if (/educ|curricul|teach|instruct|learn|academ|accredit/i.test(name)) {
    return { domain: "education", category: "general" };
  }
  if (/recruit|talent|onboard|hr|hris|payroll|employee|compensation/i.test(name)) {
    return { domain: "hr", category: "general" };
  }
  if (/ux|ui|wireframe|prototype|figma|sketch|graphic|usability/i.test(name)) {
    return { domain: "design", category: "general" };
  }
  if (/supply.?chain|logistics|warehouse|inventor|procure|manufactur/i.test(name)) {
    return { domain: "operations", category: "general" };
  }
  if (/energy|solar|wind|renew|oil|gas|sustain|esg|power.?system/i.test(name)) {
    return { domain: "energy", category: "general" };
  }
  if (/secur|cyber|pentest|siem|soc|incident.?resp|vulnerab/i.test(name)) {
    return { domain: "technology", category: "security" };
  }

  return { domain: "general", category: "general" };
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
        const sy = parseInt(String(role.start_date), 10);
        const ey = role.end_date === "present" || role.end_date === "Present"
          ? new Date().getFullYear()
          : parseInt(String(role.end_date), 10);
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

  // Career start: detect education gap
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

  // Collect unique roles sorted by start year
  const roles = [...roleMap.values()].sort((a, b) => a.startYear - b.startYear);

  return {
    domains,
    topSkills,
    roles,
    careerSpan: {
      startYear: careerStart,
      endYear: careerEnd,
      years: careerEnd > careerStart ? careerEnd - careerStart : 0,
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
