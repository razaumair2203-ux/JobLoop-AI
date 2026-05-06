/**
 * Dev-Mode CV Parser — regex-based extraction without AI.
 *
 * In production, parseCV() calls Claude with CV_PARSER_SYSTEM_PROMPT.
 * This module provides a local fallback for development/testing.
 *
 * Usage:
 *   import { parseCVLocal } from "@jobloop/ai";
 *   const result = await parseCVLocal(extractedText);
 *
 * The output shape is a superset of ParsedCV (types.ts) — all downstream
 * pipeline stages (cleanParsedCVs, detectConflicts, mergeResolvedProfile,
 * buildCloudFromParsedCV) work with it directly.
 */

// ============================================================
// TEXT NORMALIZATION
// ============================================================

/** Collapse character-spaced PDF text: "S e n i o r" → "Senior" */
export function normalizeSpacedText(text: string): string {
  return text.replace(/\b([A-Za-z]) ([A-Za-z])( [A-Za-z]){2,}\b/g, (match) =>
    match.replace(/ /g, ""),
  );
}

// ============================================================
// SECTION DETECTION
// ============================================================

export interface CVSection {
  type: string;
  content: string;
  startIdx: number;
}

export const SECTION_PATTERNS: Array<[string, RegExp]> = [
  ["experience", /^(?:EXPERIENCE|WORK\s*EXPERIENCE|PROFESSIONAL\s*EXPERIENCE|EMPLOYMENT|CAREER)/i],
  ["education", /^(?:EDUCATION|ACADEMIC|QUALIFICATIONS)/i],
  ["skills", /^(?:SKILLS|COMPETENCIES|CORE\s*COMPETENCIES|TECHNICAL\s*SKILLS|TOP\s*SKILLS)/i],
  ["achievements", /^(?:ACHIEVEMENTS?|AWARDS?|HONORS?|RECOGNITIONS?|AWARDS?\s*&\s*RECOGNITIONS?)/i],
  ["projects", /^(?:PROJECTS?|NOTABLE\s*(?:NATIONAL\s*)?PROJECTS?|KEY\s*PROJECTS?)/i],
  ["certifications", /^(?:CERTIFICATIONS?|LICENSES?\s*&?\s*CERTIFICATIONS?|PROFESSIONAL\s*CERTIFICATIONS?)/i],
  ["about", /^(?:ABOUT\s*ME|SUMMARY|PROFILE|OBJECTIVE|PROFESSIONAL\s*SUMMARY)/i],
  ["training", /^(?:TRAINING|COURSES?|WORKSHOPS?|TRAINING\s*COURSES?\s*&?\s*WORKSHOPS?)/i],
  ["publications", /^(?:PUBLICATIONS?|RESEARCH|PAPERS?)/i],
];

export function detectSections(text: string): CVSection[] {
  const lines = text.split("\n");
  const sections: CVSection[] = [];
  let currentSection: { type: string; lines: string[]; startIdx: number } | null = null;
  let charIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    let matched = false;

    for (const [type, pattern] of SECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        if (currentSection) {
          sections.push({
            type: currentSection.type,
            content: currentSection.lines.join("\n"),
            startIdx: currentSection.startIdx,
          });
        }
        currentSection = { type, lines: [], startIdx: charIdx };
        matched = true;
        break;
      }
    }

    if (!matched && currentSection) {
      currentSection.lines.push(line);
    }

    charIdx += line.length + 1;
  }

  if (currentSection) {
    sections.push({
      type: currentSection.type,
      content: currentSection.lines.join("\n"),
      startIdx: currentSection.startIdx,
    });
  }

  return sections;
}

// ============================================================
// DATE PARSING
// ============================================================

export interface DateRange {
  raw: string;
  startYear: number;
  endYear: number;
  durationMonths: number;
  index: number;
}

export function findAllDateRanges(text: string): DateRange[] {
  const ranges: DateRange[] = [];
  const seen = new Set<number>();

  // Pattern 1: "Month YYYY - Month YYYY/Present"
  const fullPattern = /(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(\d{4})\s*[-–—]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(\d{4}|[Pp]resent|[Cc]urrent|[Oo]ngoing)/g;
  for (const m of text.matchAll(fullPattern)) {
    if (seen.has(m.index!)) continue;
    seen.add(m.index!);
    const startYear = parseInt(m[2], 10);
    const endYear = /\d{4}/.test(m[4]) ? parseInt(m[4], 10) : new Date().getFullYear();
    ranges.push({ raw: m[0], startYear, endYear, durationMonths: Math.max(1, (endYear - startYear) * 12), index: m.index! });
  }

  // Pattern 2: "(YYYY - YY)" — 2-digit end year in parens
  const shortPattern = /\(\s*(\d{4})\s*[-–—]\s*(\d{2})\s*\)/g;
  for (const m of text.matchAll(shortPattern)) {
    const overlaps = [...seen].some((idx) => Math.abs(idx - m.index!) < 15);
    if (overlaps) continue;
    const startYear = parseInt(m[1], 10);
    const century = Math.floor(startYear / 100) * 100;
    const endShort = parseInt(m[2], 10);
    const endYear = century + endShort;
    if (endYear >= startYear && endYear <= new Date().getFullYear() + 1) {
      seen.add(m.index!);
      ranges.push({ raw: m[0], startYear, endYear, durationMonths: Math.max(1, (endYear - startYear) * 12), index: m.index! });
    }
  }

  // Pattern 2b: Tab-prefixed short dates
  const tabShortPattern = /\t\s*(\d{4})\s*[-–—]\s*(\d{2})(?!\d)/g;
  for (const m of text.matchAll(tabShortPattern)) {
    const overlaps = [...seen].some((idx) => Math.abs(idx - m.index!) < 15);
    if (overlaps) continue;
    const startYear = parseInt(m[1], 10);
    const century = Math.floor(startYear / 100) * 100;
    const endYear = century + parseInt(m[2], 10);
    if (endYear >= startYear && endYear <= new Date().getFullYear() + 1) {
      seen.add(m.index!);
      ranges.push({ raw: m[0].trim(), startYear, endYear, durationMonths: Math.max(1, (endYear - startYear) * 12), index: m.index! });
    }
  }

  // Pattern 3: "YYYY - Present" without month
  const presentPattern = /(\d{4})\s*[-–—]\s*([Pp]resent|[Cc]urrent|[Oo]ngoing)/g;
  for (const m of text.matchAll(presentPattern)) {
    if (seen.has(m.index!)) continue;
    seen.add(m.index!);
    const startYear = parseInt(m[1], 10);
    const endYear = new Date().getFullYear();
    ranges.push({ raw: m[0], startYear, endYear, durationMonths: Math.max(1, (endYear - startYear) * 12), index: m.index! });
  }

  return ranges.sort((a, b) => a.index - b.index);
}

// ============================================================
// GARBAGE WORD EXCLUSION
// ============================================================

const GARBAGE_WORDS = new Set([
  // Countries
  "china", "pakistan", "saudi arabia", "qatar", "turkey", "usa", "united states",
  "united kingdom", "uk", "uae", "united arab emirates", "india", "germany",
  "france", "canada", "australia", "japan", "south korea", "brazil", "russia",
  "italy", "spain", "netherlands", "sweden", "norway", "denmark", "finland",
  "switzerland", "ireland", "singapore", "malaysia", "indonesia", "thailand",
  "egypt", "jordan", "oman", "bahrain", "kuwait", "iraq", "iran",
  // Cities
  "islamabad", "risalpur", "jeddah", "kamra", "boulder", "colorado",
  "karachi", "lahore", "rawalpindi", "peshawar", "riyadh", "dammam",
  "doha", "dubai", "abu dhabi", "istanbul", "ankara", "london", "new york",
  "san francisco", "los angeles", "chicago", "seattle", "austin", "denver",
  "toronto", "vancouver", "sydney", "melbourne", "berlin", "munich",
  "paris", "amsterdam", "stockholm", "oslo", "helsinki", "zurich",
  "singapore", "hong kong", "beijing", "shanghai", "tokyo", "seoul",
  "mumbai", "bangalore", "hyderabad", "pune", "chennai", "delhi",
  // US States
  "california", "texas", "washington", "virginia", "maryland", "massachusetts",
  "new jersey", "pennsylvania", "ohio", "illinois", "florida", "georgia",
  // Generic non-skill terms
  "city", "state", "country", "region", "province", "district",
]);

export function isGarbageWord(term: string): boolean {
  return GARBAGE_WORDS.has(term.toLowerCase().trim());
}

// ============================================================
// SKILL EXTRACTION
// ============================================================

export function extractSkillsFromText(text: string): string[] {
  const knownSkills: Record<string, string[]> = {
    // Software
    "JavaScript": [], "TypeScript": [], "Python": [], "Java": [], "C#": [], "C++": [],
    "Go": [], "Rust": [], "Ruby": [], "PHP": [], "Swift": [], "Kotlin": [],
    "React": [], "Angular": [], "Vue": [], "Next.js": [], "Node.js": [], ".NET": [],
    "AWS": [], "GCP": [], "Azure": [], "Docker": [], "Kubernetes": [], "Terraform": [],
    "SQL": [], "PostgreSQL": [], "MySQL": [], "MongoDB": [], "Redis": [], "Oracle": [],
    "Git": [], "Jira": [], "GraphQL": [], "REST": [], "HTML": [], "CSS": [],
    "Linux": [], "DevOps": [], "CI/CD": [], "Microservices": [],
    "Machine Learning": ["AI/ML", "artificial intelligence"], "Data Science": ["data analytics", "analytics"],
    "MATLAB": [], "Power BI": ["kpis", "rois"],
    // Engineering & Aviation
    "Avionics": ["avionics systems"], "Systems Engineering": ["systems engineer", "system engineering"],
    "MBSE": ["model-based systems engineering", "model based systems"],
    "Aircraft Maintenance": [], "Airworthiness": ["continuing airworthiness", "airworthiness directives"],
    "Configuration Management": ["configuration baselines", "cmdb"],
    "Fault Diagnosis": ["fault rectification", "fault diagnosis"],
    "Integration": ["integration specialist", "system integration", "systems integration", "i&t"],
    "Fleet Management": ["fleet sustainment", "fleet operations", "fleet performance"],
    "MRO": ["heavy mro", "airline mro"], "CAMO": ["camo/amo"],
    "Part-145": ["part 145"], "Part-21": ["part 21"],
    "FAA": [], "GACA": [], "ICAO": [], "EASA": [],
    "Safety Management": ["safety management system", "human factors"],
    "Quality Assurance": ["quality management", "quality standards", "qms", "iso certification"],
    "Reliability Engineering": ["reliability", "mtbf", "mttr"],
    "Root Cause Analysis": ["rca", "corrective actions"],
    "Predictive Maintenance": ["trend monitoring", "predictive maintenance"],
    // Defense & Programs
    "Defense Programs": ["defense program", "defence program", "defense organization"],
    "Program Management": ["programme management", "pmo leadership", "pmo"],
    "Project Management": [], "Portfolio Management": [],
    "Stakeholder Management": ["stakeholder", "oem coordination"],
    "Risk Management": ["risk workshops", "risk mitigation", "raid logs"],
    "Contract Management": ["c-check contracts", "contracted amo"], "Vendor Management": ["supplier management", "supplier interfaces"],
    "Requirements Management": ["requirements engineering"],
    "Technical Documentation": ["technical writing", "technical data", "aircraft documentation"],
    "EVM": ["earned value management", "evm reporting"],
    // Certifications & Frameworks
    "PMP": [], "PMI-ACP": [], "PRINCE2": [], "Six Sigma": ["lean six sigma"],
    "Agile": ["agile certified"], "Scrum": [], "Kanban": [], "Lean": [],
    "ISO 9001": [], "AS9100": [], "ISO 27001": [],
    "OBE": ["outcome based education"],
    // Management & Soft Skills
    "Team Leadership": ["leading teams", "team lead", "team management", "led .* team"],
    "Communication": [], "Budgeting": ["budget management", "cost-control", "cost savings"],
    "Strategic Planning": ["strategy"], "Change Management": [],
    "Training": ["mentoring", "coaching", "ojt supervision", "capacity building", "capacity development", "professional education"],
    "Supervision": ["supervisor", "supervisory", "supervised"],
    "Cross-functional": ["cross functional", "multi-disciplinary", "multidisciplinary"],
    "Continuous Improvement": [],
    "Audit": ["audit support", "audit activities", "local audits", "process compliance"],
    "Procurement": ["spares planning", "procurement"],
    "Export Certification": ["export certification"],
    // Tools
    "SAP": [], "MS Project": ["microsoft project"], "Primavera": ["primavera p6"],
    "ServiceNow": [], "Salesforce": [], "Tableau": [],
    "SharePoint": [], "ERP": [], "AMOS": [],
    "Garmin": [], "Dynon": [],
  };

  const found: string[] = [];
  const lower = text.toLowerCase();
  const AMBIGUOUS = new Set(["go", "r", "c#", "c++", ".net", "rust", "ruby", "swift", "dart", "spring", "flask", "rails", "lean", "expo"]);
  for (const [skill, aliases] of Object.entries(knownSkills)) {
    if (isGarbageWord(skill)) continue;
    const skillLower = skill.toLowerCase();
    if (AMBIGUOUS.has(skillLower)) {
      const escaped = skillLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`);
      if (re.test(lower)) { found.push(skill); continue; }
    } else {
      if (lower.includes(skillLower)) { found.push(skill); continue; }
    }
    for (const alias of aliases) {
      if (lower.includes(alias.toLowerCase())) {
        found.push(skill);
        break;
      }
    }
  }
  return found.filter((s) => !isGarbageWord(s));
}

// ============================================================
// EXPERIENCE EXTRACTION
// ============================================================

export interface ParsedRole {
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  bullets: string[];
  technologies_used: string[];
  metrics_mentioned: string[];
  domain: string;
}

const TITLE_WORDS = /(?:engineer|manager|lead|director|supervisor|specialist|analyst|consultant|coordinator|officer|architect|developer|designer|professor|head|deputy|program\s*lead|nurse|physician|clinician|therapist|technician|surgeon|attorney|counsel|paralegal|teacher|instructor|lecturer|accountant|auditor|executive|representative|associate|administrator|chef|pharmacist|scientist|researcher|planner|inspector|operator|controller|advisor|strategist)/i;

const SKIP_PATTERNS = /^(EXPERIENCE|WORK\s*EXPERIENCE|PROFESSIONAL\s*EXPERIENCE|EMPLOYMENT|CAREER|EDUCATION|ACADEMIC|QUALIFICATIONS|SKILLS|COMPETENCIES|CORE\s*COMPETENCIES|TECHNICAL\s*SKILLS|TOP\s*SKILLS|CERTIFICATIONS?|LICENSES?\s*&?\s*CERTIFICATIONS?|LICENSES?\s*&?|PROFESSIONAL\s*CERTIFICATIONS?|ACHIEVEMENTS?|AWARDS?|HONORS?|RECOGNITIONS?|PROJECTS?|NOTABLE\s*PROJECTS?|KEY\s*PROJECTS?|ABOUT\s*ME|SUMMARY|PROFILE|OBJECTIVE|PROFESSIONAL\s*SUMMARY|TRAINING|COURSES?|WORKSHOPS?|PUBLICATIONS?|RESEARCH|PAPERS?|VOLUNTEER|INTERESTS?|HOBBIES|REFERENCES?|LANGUAGES?|MEMBERSHIPS?|AFFILIATIONS?|PERSONAL\s*DETAILS?|CONTACT|Page\s+\d|--|$)/i;

function findTitle(context: string): string {
  const sentenceFragment = /(?:^(?:Led|Managed|Directed|Provided|Delivered|Supervised|Coordinated|Developed|Implemented|Oversaw|Conducted|Ensured|Achieved|Maintained|Spearheaded|Orchestrated|Streamlined)\b|,\s*(?:enhancing|supporting|leading|ensuring|managing|including|resulting|utilizing|leveraging|focusing|working|enabling)\b)/i;
  const lines = context.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 5 && t.length < 80 && TITLE_WORDS.test(t) && !/^\d{4}/.test(t) && !sentenceFragment.test(t) && !/^[•·▪►]/.test(t)) {
      return t.replace(/\(?\d{4}\s*[-–—].*$/, "").replace(/^[•·\-]\s*/, "").trim().slice(0, 80);
    }
  }
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 5 && t.length < 80 && TITLE_WORDS.test(t) && !/^\d{4}/.test(t) && !/^[•·▪►]/.test(t)) {
      return t.replace(/\(?\d{4}\s*[-–—].*$/, "").replace(/^[•·\-]\s*/, "").trim().slice(0, 80);
    }
  }
  return "Role detected";
}

function findCompany(beforeDate: string, _title: string): string {
  const lines = beforeDate.split("\n").filter((l) => l.trim()).reverse();

  for (const line of lines) {
    const t = line.trim();
    if (t.length < 3 || t.length > 120) continue;
    if (SKIP_PATTERNS.test(t)) continue;
    if (/^\d{4}/.test(t)) continue;
    if (/^[•·\-]/.test(t)) continue;
    if (!TITLE_WORDS.test(t) || /(?:University|Institute|Corporation|Complex|Government|Air Force)/i.test(t)) {
      return t.replace(/\(?\d{4}\s*[-–—].*$/, "").trim().slice(0, 100);
    }
  }
  return "From CV";
}

function extractBullets(text: string): string[] {
  const bullets: string[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^[•·\-▪►]\s*/.test(t) || /^[A-Z][a-z].*(?:ed|ing)\b/.test(t)) {
      const clean = t.replace(/^[•·\-▪►]\s*/, "").trim();
      if (clean.length > 15) bullets.push(clean);
    }
  }
  return bullets.slice(0, 8);
}

function deduplicateRoles(roles: ParsedRole[]): ParsedRole[] {
  const seen = new Map<string, ParsedRole>();
  for (const role of roles) {
    const key = `${role.title.toLowerCase().slice(0, 30)}|${role.start_date}|${role.end_date}`;
    if (!seen.has(key)) {
      seen.set(key, role);
    } else {
      const existing = seen.get(key)!;
      existing.bullets.push(...role.bullets);
      for (const s of role.technologies_used) {
        if (!existing.technologies_used.includes(s)) existing.technologies_used.push(s);
      }
    }
  }
  return Array.from(seen.values());
}

function extractExperience(text: string, expSection: CVSection | undefined): ParsedRole[] {
  const searchText = expSection?.content ?? text;
  const dateRanges = findAllDateRanges(searchText);
  if (dateRanges.length === 0) return [];

  const roles: ParsedRole[] = [];
  for (let i = 0; i < dateRanges.length; i++) {
    const dr = dateRanges[i];
    const contextStart = Math.max(0, dr.index - 300);
    const contextEnd = i + 1 < dateRanges.length
      ? dateRanges[i + 1].index
      : Math.min(searchText.length, dr.index + 800);
    const beforeDate = searchText.slice(contextStart, dr.index);
    const afterDate = searchText.slice(dr.index + dr.raw.length, contextEnd);
    const fullContext = beforeDate + afterDate;

    const title = findTitle(beforeDate + "\n" + afterDate);
    const company = findCompany(beforeDate, title);
    const bullets = extractBullets(afterDate);
    const skills = extractSkillsFromText(fullContext);

    roles.push({
      company,
      title,
      start_date: String(dr.startYear),
      end_date: dr.endYear === new Date().getFullYear() ? "Present" : String(dr.endYear),
      duration_months: dr.durationMonths,
      bullets,
      technologies_used: skills.slice(0, 25),
      metrics_mentioned: extractMetrics(afterDate),
      domain: detectDomain(fullContext),
    });
  }

  return deduplicateRoles(roles);
}

// ============================================================
// METRICS & DOMAIN
// ============================================================

function extractMetrics(text: string): string[] {
  const metrics: string[] = [];
  const patterns = [
    /\d+%\s*\w+/g,
    /\$[\d,.]+[MKB]?/g,
    /\d+\s*(?:million|billion|thousand)/gi,
    /(?:reduced|increased|improved|achieved|maintained)\s+[^\n]{5,60}?\d+%/gi,
    /(?:saved|generated)\s+[^\n]{5,60}?\$[\d,.]+/gi,
    /(?:managed|led|supervised|coordinated)\s+[^\n]{5,60}?\d+\s*(?:team|people|staff|engineers|technicians|subsystems)/gi,
    /\d+\s*(?:systems?|subsystems?|aircraft|units?|engineers?|technicians?|countries)/gi,
    /(?:above|over)\s*\d+%/gi,
    /(?:multi-?million|millions?[\s-]*dollar)/gi,
  ];
  for (const pat of patterns) {
    for (const m of text.matchAll(pat)) {
      metrics.push(m[0].trim());
    }
  }
  return [...new Set(metrics)].slice(0, 10);
}

export function detectDomain(text: string): string {
  const lower = text.toLowerCase();
  if (/avion|aircraft|aviation|aerospace|flight|airworth/i.test(lower)) return "aviation";
  if (/defense|defence|military|armed forces|air force/i.test(lower)) return "defense";
  if (/software|web|app|cloud|saas/i.test(lower)) return "technology";
  if (/healthcare|medical|pharma|clinical|hospital|patient/i.test(lower)) return "healthcare";
  if (/finance|banking|fintech|investment|trading/i.test(lower)) return "finance";
  if (/energy|oil|gas|renewable|power\s*plant/i.test(lower)) return "energy";
  if (/manufactur|industrial|production|factory/i.test(lower)) return "manufacturing";
  if (/universit|college|academic|education|hec /i.test(lower)) return "academia";
  if (/consult/i.test(lower)) return "consulting";
  if (/retail|store|merchandise|e-?commerce/i.test(lower)) return "retail";
  if (/marketing|advertising|brand|campaign/i.test(lower)) return "marketing";
  if (/legal|law\s*firm|attorney|litigation/i.test(lower)) return "legal";
  return "general";
}

// ============================================================
// AWARDS, PROJECTS, CERTIFICATIONS, EDUCATION
// ============================================================

interface ParsedAward {
  title: string;
  source: string;
  description: string;
}

function extractAwards(text: string, section: CVSection | undefined): ParsedAward[] {
  const searchText = section?.content ?? "";
  if (!searchText.trim()) {
    const awards: ParsedAward[] = [];
    const patterns = [
      /(?:commendation|appreciation|award|recognition|selected for)[:\s]+([^\n.]{10,150})/gi,
    ];
    for (const pat of patterns) {
      for (const m of text.matchAll(pat)) {
        awards.push({ title: m[1].trim(), source: "CV", description: m[0].trim() });
      }
    }
    return awards;
  }

  const awards: ParsedAward[] = [];
  const lines = searchText.split("\n").filter((l) => l.trim().length > 10);
  for (const line of lines) {
    const t = line.trim().replace(/^[•·\-▪►]\s*/, "");
    if (t.length < 10) continue;
    const colonSplit = t.match(/^(.+?):\s+(.+)$/);
    if (colonSplit) {
      awards.push({ title: colonSplit[2].slice(0, 100), source: colonSplit[1].trim(), description: t });
    } else {
      awards.push({ title: t.slice(0, 100), source: "CV", description: t });
    }
  }
  return awards;
}

interface ParsedProject {
  name: string;
  description: string;
  outcome: string;
  technologies: string[];
}

function extractProjects(_text: string, section: CVSection | undefined): ParsedProject[] {
  const searchText = section?.content ?? "";
  if (!searchText.trim()) return [];

  const projects: ParsedProject[] = [];
  const blocks = searchText.split(/\n(?=[A-Z][^\n]{5,80}\n)/);
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length === 0) continue;
    const name = lines[0].trim();
    if (name.length < 5) continue;
    const desc = lines.slice(1).map((l) => l.trim().replace(/^[•·\-▪►]\s*/, "")).join(" ");
    const outcome = extractProjectOutcome(desc);
    projects.push({
      name: name.slice(0, 100),
      description: desc.slice(0, 300),
      outcome,
      technologies: extractSkillsFromText(desc).slice(0, 5),
    });
  }
  return projects;
}

function extractProjectOutcome(desc: string): string {
  const impactPatterns = [
    /(\d+\s*(?:systems?|units?|aircraft|countries)\s*\w*)/i,
    /(millions?[\s-]*dollar|cost\s*savings?|eliminat\w+\s*reliance)/i,
    /(export\w*\s*to\s*\d+\s*countries)/i,
    /(\d+%\s*\w+)/,
  ];
  for (const pat of impactPatterns) {
    const match = desc.match(pat);
    if (match) return match[1];
  }
  return "";
}

function extractCertifications(text: string, section: CVSection | undefined): string[] {
  const searchText = section?.content ?? text;
  const found = new Set<string>();

  const patterns = [
    /Project Management Professional\s*\(PMP\)/gi,
    /PMI Agile Certified Practitioner\s*\(PMI-ACP\)/gi,
    /PMP®?/g, /PMI-ACP®?/g, /PMI-RMP/g, /PMI-PBA/g,
    /PRINCE2/g, /ITIL/g, /CAPM/g,
    /Google Project Management\s*(?:Certificate)?/gi,
    /Professional Engineer/gi,
    /Six Sigma\s*(?:Green|Black|Yellow)?\s*Belt/gi,
    /Lean Six Sigma/gi,
    /ISO\s*\d{4,5}/g, /AS\s*9100/g,
    /EASA\s*(?:Part|B1|B2|66)/gi,
    /Certified\s+\w+\s+(?:Engineer|Manager|Professional|Specialist|Auditor)/gi,
    /(?:Systems?|Engineering)\s+(?:Management\s+)?Specialization/gi,
  ];

  for (const pat of patterns) {
    for (const m of searchText.matchAll(pat)) {
      found.add(m[0].trim().replace(/®/g, ""));
    }
  }

  if (section) {
    const lines = section.content.split("\n").filter((l) => l.trim().length > 3);
    for (const line of lines) {
      const t = line.trim();
      if (t.length > 5 && t.length < 100 && !/^\d{4}/.test(t)) {
        found.add(t);
      }
    }
  }

  return Array.from(found);
}

interface ParsedEducation {
  institution: string;
  degree: string;
  field: string;
  dates: string;
}

function extractEducation(_text: string, section: CVSection | undefined): ParsedEducation[] {
  const searchText = section?.content ?? "";
  if (!searchText.trim()) return [];

  const results: ParsedEducation[] = [];
  const dateRanges = findAllDateRanges(searchText);
  const degreePattern = /(?:Bachelor|Master|PhD|Doctorate|B\.?E\.?|M\.?S\.?|B\.?Sc|M\.?Sc|MBA|B\.?Tech|M\.?Tech)/i;
  const lines = searchText.split("\n").filter((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (degreePattern.test(line) || /University|College|Institute/i.test(line)) {
      const context = lines.slice(Math.max(0, i - 1), i + 3).join(" ");
      const degreeMatch = context.match(/(?:Bachelor|Master|PhD|Doctorate|B\.?E\.?|M\.?S\.?|B\.?Sc|M\.?Sc|MBA|B\.?Tech|M\.?Tech)[^,\n]*/i);
      const instMatch = context.match(/(?:University|College|Institute|School)[^\n,]*/i);
      const dateMatch = context.match(/\d{4}\s*[-–—]\s*(?:\d{2,4}|Present)/i);

      results.push({
        institution: instMatch?.[0]?.trim().slice(0, 100) ?? line.slice(0, 100),
        degree: degreeMatch?.[0]?.trim().slice(0, 100) ?? "",
        field: "",
        dates: dateMatch?.[0]?.trim() ?? (dateRanges[0]?.raw ?? ""),
      });
    }
  }

  return results;
}

// ============================================================
// LOCATION
// ============================================================

function extractLocation(text: string): { city: string | null; country: string | null } {
  const locMatch = text.match(/(?:📍\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*(?:([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:,\s*)?)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (locMatch) {
    return { city: locMatch[1] ?? null, country: locMatch[3] ?? locMatch[2] ?? null };
  }
  return { city: null, country: null };
}

// ============================================================
// MAIN PARSER
// ============================================================

const SECTION_HEADER_RE = /^(EXPERIENCE|WORK\s*EXPERIENCE|PROFESSIONAL\s*EXPERIENCE|EMPLOYMENT|CAREER|EDUCATION|ACADEMIC|QUALIFICATIONS|SKILLS|COMPETENCIES|CORE\s*COMPETENCIES|TECHNICAL\s*SKILLS|CERTIFICATIONS?|LICENSES?\s*&?\s*CERTIFICATIONS?|LICENSES?\s*&?|ACHIEVEMENTS?|AWARDS?|HONORS?|RECOGNITIONS?|PROJECTS?|NOTABLE\s*PROJECTS?|ABOUT\s*ME|SUMMARY|PROFILE|OBJECTIVE|PROFESSIONAL\s*SUMMARY|TRAINING|COURSES?|WORKSHOPS?|PUBLICATIONS?|RESEARCH|VOLUNTEER|INTERESTS?|HOBBIES|REFERENCES?|LANGUAGES?|MEMBERSHIPS?|AFFILIATIONS?|PERSONAL\s*DETAILS?|CONTACT)$/i;

function estimateYears(text: string, roles: ParsedRole[]): number {
  const yearsMatch = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?/i);
  if (yearsMatch) return parseInt(yearsMatch[1], 10);
  return Math.round(roles.reduce((sum, r) => sum + (r.duration_months || 0), 0) / 12) || 0;
}

export async function parseCVLocal(text: string) {
  const normalized = normalizeSpacedText(text);
  const sections = detectSections(normalized);
  const lines = normalized.split("\n").filter((l) => l.trim());

  const expSection = sections.find((s) => s.type === "experience");
  const eduSection = sections.find((s) => s.type === "education");
  const skillSection = sections.find((s) => s.type === "skills");
  const achieveSection = sections.find((s) => s.type === "achievements");
  const projectSection = sections.find((s) => s.type === "projects");
  const certSection = sections.find((s) => s.type === "certifications");

  let experience = extractExperience(normalized, expSection);
  if (experience.length < 3 && expSection) {
    const fullTextRoles = extractExperience(normalized, undefined);
    if (fullTextRoles.length > experience.length) {
      experience = fullTextRoles;
    }
  }
  // Post-filter: remove roles where "company" is actually a section header
  experience = experience.filter(r => !SECTION_HEADER_RE.test(r.company.trim()));
  const education = extractEducation(normalized, eduSection);
  const awards = extractAwards(normalized, achieveSection);
  const projects = extractProjects(normalized, projectSection);
  const certs = extractCertifications(normalized, certSection);

  const allSkills = extractSkillsFromText(normalized);
  const BULLET_STARTERS = /^(?:Directed|Led|Managed|Provided|Delivered|Supervised|Coordinated|Established|Developed|Implemented|Oversaw|Conducted|Facilitated|Ensured|Executed|Achieved|Maintained|Spearheaded|Orchestrated|Streamlined)\b/i;
  const competencies: string[] = [];
  if (skillSection) {
    const compLines = skillSection.content.split("\n").filter((l) => l.trim().length > 3);
    for (const line of compLines) {
      const t = line.trim().replace(/^[•·\-▪►]\s*/, "");
      if (t.length > 3 && t.length < 50 && !BULLET_STARTERS.test(t) && !isGarbageWord(t)) {
        competencies.push(t);
      }
    }
  }

  const langSet = new Set(["javascript", "typescript", "python", "java", "c#", "c++", "go", "rust", "ruby", "php", "swift", "kotlin", "matlab", "vba", "r", "scala"]);
  const fwSet = new Set(["react", "angular", "vue", "next.js", "express", "django", "flask", "spring", "node.js", "rails", "laravel", "svelte", "nuxt", ".net"]);
  const infraSet = new Set(["aws", "gcp", "azure", "docker", "kubernetes", "terraform", "jenkins", "ci/cd", "linux", "nginx", "devops"]);
  const dbSet = new Set(["postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "sqlite", "cassandra", "sql", "nosql", "oracle"]);
  const toolSet = new Set(["git", "jira", "figma", "slack", "postman", "webpack", "sap", "ms project", "primavera", "servicenow", "salesforce", "power bi", "tableau", "sharepoint", "erp", "amos", "garmin", "dynon"]);

  return {
    name: lines[0]?.trim().replace(/^Contact$/, lines[1]?.trim() ?? "Unknown") ?? "Unknown",
    email: normalized.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] ?? null,
    phone: normalized.match(/[+]?[\d\s\-().]{10,18}/)?.[0]?.trim() ?? null,
    location: extractLocation(normalized),
    links: {
      linkedin: normalized.match(/linkedin\.com\/in\/[\w-]+/)?.[0] ?? null,
      github: normalized.match(/github\.com\/[\w-]+/)?.[0] ?? null,
      portfolio: null,
      other: [] as string[],
    },
    summary: sections.find((s) => s.type === "about")?.content.trim().slice(0, 500) ?? null,
    total_experience_years: estimateYears(normalized, experience),
    experience,
    education,
    skills: {
      languages: allSkills.filter((s) => langSet.has(s.toLowerCase())),
      frameworks: allSkills.filter((s) => fwSet.has(s.toLowerCase())),
      infrastructure: allSkills.filter((s) => infraSet.has(s.toLowerCase())),
      databases: allSkills.filter((s) => dbSet.has(s.toLowerCase())),
      tools: allSkills.filter((s) => toolSet.has(s.toLowerCase())),
      other: allSkills.filter((s) => {
        const l = s.toLowerCase();
        return !langSet.has(l) && !fwSet.has(l) && !infraSet.has(l) && !dbSet.has(l) && !toolSet.has(l);
      }),
    },
    competencies,
    certifications: certs,
    awards,
    projects,
    all_technologies: allSkills,
  };
}
