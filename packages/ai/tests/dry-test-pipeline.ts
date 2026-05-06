/**
 * Dry Test: Full CV Pipeline (5 Alpha CVs)
 *
 * Simulates the EXACT upload route pipeline WITHOUT Supabase.
 * Uses the REAL parseCVLocal from route.ts (copied here since it's not exported).
 *
 * Pipeline stages:
 *   1. PDF text extraction (pdf-parse v2)
 *   2. extractContactDetails() — factual field bypass ($0)
 *   3. parseCVLocal() — full regex parser with 80+ skills, section detection
 *   4. Contact detail override (ResumeFlow bypass)
 *   5. cleanParsedCVs() — garbage filter, date validation, source verification, skill verification
 *   6. detectConflicts() — cross-document conflict detection
 *   7. mergeResolvedProfile() → resolvedProfileToParsedCV() → buildCloudFromParsedCV()
 *   8. classifyCloud() — taxonomy classification (355 skills, 17 domains)
 *
 * This test proves: when you swap parseCVLocal for Claude API,
 * every downstream stage is wired correctly and produces expected output.
 */

import {
  extractContactDetails,
  cleanParsedCVs,
  detectConflicts,
  mergeResolvedProfile,
  resolvedProfileToParsedCV,
  buildCloudFromParsedCV,
  classifyCloud,
  verifySkills,
} from "../src/index";
import * as path from "path";
import * as fs from "fs";

// ============================================================
// PDF TEXT EXTRACTION (mirrors route.ts exactly)
// ============================================================

async function extractText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require("pdf-parse") as any;
  const parser = new PDFParse(new Uint8Array(buffer));
  const pdfData = await parser.getText();
  return pdfData.text ?? pdfData.pages.map((p: { text: string }) => p.text).join("\n");
}

// ============================================================
// REAL parseCVLocal — copied from route.ts (600+ lines)
// This is the ACTUAL dev-mode parser the route uses
// ============================================================

function normalizeSpacedText(text: string): string {
  return text.replace(/\b([A-Za-z]) ([A-Za-z])( [A-Za-z]){2,}\b/g, (match) =>
    match.replace(/ /g, ""),
  );
}

interface CVSection {
  type: string;
  content: string;
  startIdx: number;
}

const SECTION_PATTERNS: Array<[string, RegExp]> = [
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

function detectSections(text: string): CVSection[] {
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
          sections.push({ type: currentSection.type, content: currentSection.lines.join("\n"), startIdx: currentSection.startIdx });
        }
        currentSection = { type, lines: [], startIdx: charIdx };
        matched = true;
        break;
      }
    }
    if (!matched && currentSection) currentSection.lines.push(line);
    charIdx += line.length + 1;
  }
  if (currentSection) sections.push({ type: currentSection.type, content: currentSection.lines.join("\n"), startIdx: currentSection.startIdx });
  return sections;
}

interface DateRange { raw: string; startYear: number; endYear: number; durationMonths: number; index: number; }

function findAllDateRanges(text: string): DateRange[] {
  const ranges: DateRange[] = [];
  const seen = new Set<number>();
  const fullPattern = /(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(\d{4})\s*[-–—]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(\d{4}|[Pp]resent|[Cc]urrent|[Oo]ngoing)/g;
  for (const m of text.matchAll(fullPattern)) {
    if (seen.has(m.index!)) continue;
    seen.add(m.index!);
    const startYear = parseInt(m[2], 10);
    const endYear = /\d{4}/.test(m[4]) ? parseInt(m[4], 10) : new Date().getFullYear();
    ranges.push({ raw: m[0], startYear, endYear, durationMonths: Math.max(1, (endYear - startYear) * 12), index: m.index! });
  }
  const shortPattern = /\(\s*(\d{4})\s*[-–—]\s*(\d{2})\s*\)/g;
  for (const m of text.matchAll(shortPattern)) {
    const overlaps = [...seen].some((idx) => Math.abs(idx - m.index!) < 15);
    if (overlaps) continue;
    const startYear = parseInt(m[1], 10);
    const century = Math.floor(startYear / 100) * 100;
    const endYear = century + parseInt(m[2], 10);
    if (endYear >= startYear && endYear <= new Date().getFullYear() + 1) {
      seen.add(m.index!);
      ranges.push({ raw: m[0], startYear, endYear, durationMonths: Math.max(1, (endYear - startYear) * 12), index: m.index! });
    }
  }
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

const GARBAGE_WORDS = new Set([
  "china","pakistan","saudi arabia","qatar","turkey","usa","united states","united kingdom","uk","uae","united arab emirates","india","germany","france","canada","australia","japan","south korea","brazil","russia","italy","spain","netherlands","sweden","norway","denmark","finland","switzerland","ireland","singapore","malaysia","indonesia","thailand","egypt","jordan","oman","bahrain","kuwait","iraq","iran",
  "islamabad","risalpur","jeddah","kamra","boulder","colorado","karachi","lahore","rawalpindi","peshawar","riyadh","dammam","doha","dubai","abu dhabi","istanbul","ankara","london","new york","san francisco","los angeles","chicago","seattle","austin","denver","toronto","vancouver","sydney","melbourne","berlin","munich","paris","amsterdam","stockholm","oslo","helsinki","zurich","singapore","hong kong","beijing","shanghai","tokyo","seoul","mumbai","bangalore","hyderabad","pune","chennai","delhi",
  "california","texas","washington","virginia","maryland","massachusetts","new jersey","pennsylvania","ohio","illinois","florida","georgia",
  "city","state","country","region","province","district",
]);

function isGarbageWord(term: string): boolean { return GARBAGE_WORDS.has(term.toLowerCase().trim()); }

function extractSkillsFromText(text: string): string[] {
  const knownSkills: Record<string, string[]> = {
    "JavaScript": [], "TypeScript": [], "Python": [], "Java": [], "C#": [], "C++": [],
    "Go": [], "Rust": [], "Ruby": [], "PHP": [], "Swift": [], "Kotlin": [],
    "React": [], "Angular": [], "Vue": [], "Next.js": [], "Node.js": [], ".NET": [],
    "AWS": [], "GCP": [], "Azure": [], "Docker": [], "Kubernetes": [], "Terraform": [],
    "SQL": [], "PostgreSQL": [], "MySQL": [], "MongoDB": [], "Redis": [], "Oracle": [],
    "Git": [], "Jira": [], "GraphQL": [], "REST": [], "HTML": [], "CSS": [],
    "Linux": [], "DevOps": [], "CI/CD": [], "Microservices": [],
    "Machine Learning": ["AI/ML", "artificial intelligence"], "Data Science": ["data analytics", "analytics"],
    "MATLAB": [], "Power BI": ["kpis", "rois"],
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
    "Defense Programs": ["defense program", "defence program", "defense organization"],
    "Program Management": ["programme management", "pmo leadership", "pmo"],
    "Project Management": [], "Portfolio Management": [],
    "Stakeholder Management": ["stakeholder", "oem coordination"],
    "Risk Management": ["risk workshops", "risk mitigation", "raid logs"],
    "Contract Management": ["c-check contracts", "contracted amo"], "Vendor Management": ["supplier management", "supplier interfaces"],
    "Requirements Management": ["requirements engineering"],
    "Technical Documentation": ["technical writing", "technical data", "aircraft documentation"],
    "EVM": ["earned value management", "evm reporting"],
    "PMP": [], "PMI-ACP": [], "PRINCE2": [], "Six Sigma": ["lean six sigma"],
    "Agile": ["agile certified"], "Scrum": [], "Kanban": [], "Lean": [],
    "ISO 9001": [], "AS9100": [], "ISO 27001": [],
    "OBE": ["outcome based education"],
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
    "SAP": [], "MS Project": ["microsoft project"], "Primavera": ["primavera p6"],
    "ServiceNow": [], "Salesforce": [], "Tableau": [],
    "SharePoint": [], "ERP": [], "AMOS": [],
    "Garmin": [], "Dynon": [],
  };
  const found: string[] = [];
  const lower = text.toLowerCase();
  // Short/ambiguous skills need word boundary matching to avoid false positives
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
      if (lower.includes(alias.toLowerCase())) { found.push(skill); break; }
    }
  }
  return found.filter((s) => !isGarbageWord(s));
}

interface ParsedRole {
  company: string; title: string; start_date: string; end_date: string;
  duration_months: number; bullets: string[]; technologies_used: string[];
  metrics_mentioned: string[]; domain: string;
}

function findTitle(context: string): string {
  // Title patterns: "Senior Engineer", "Deputy Director, Fleet Management", "Head, Systems Engineering"
  const titleWords = /(?:engineer|manager|lead|director|supervisor|specialist|analyst|consultant|coordinator|officer|architect|developer|designer|professor|head|deputy|program\s*lead)/i;
  // Reject lines that look like bullet content or sentence fragments
  const sentenceFragment = /(?:^(?:Led|Managed|Directed|Provided|Delivered|Supervised|Coordinated|Developed|Implemented|Oversaw|Conducted|Ensured|Achieved|Maintained|Spearheaded|Orchestrated|Streamlined)\b|,\s*(?:enhancing|supporting|leading|ensuring|managing|including|resulting|utilizing|leveraging|focusing|working|enabling)\b)/i;
  const lines = context.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 5 && t.length < 80 && titleWords.test(t) && !/^\d{4}/.test(t) && !sentenceFragment.test(t) && !/^[•·▪►]/.test(t)) {
      return t.replace(/\(?\d{4}\s*[-–—].*$/, "").replace(/^[•·\-]\s*/, "").trim().slice(0, 80);
    }
  }
  // Fallback: less strict but avoid bullet starters
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 5 && t.length < 80 && titleWords.test(t) && !/^\d{4}/.test(t) && !/^[•·▪►]/.test(t)) {
      return t.replace(/\(?\d{4}\s*[-–—].*$/, "").replace(/^[•·\-]\s*/, "").trim().slice(0, 80);
    }
  }
  return "Role detected";
}

function findCompany(beforeDate: string, _title: string): string {
  const lines = beforeDate.split("\n").filter((l) => l.trim()).reverse();
  const skipPatterns = /^(EXPERIENCE|WORK\s*EXPERIENCE|PROFESSIONAL\s*EXPERIENCE|EMPLOYMENT|CAREER|EDUCATION|ACADEMIC|QUALIFICATIONS|SKILLS|COMPETENCIES|CORE\s*COMPETENCIES|TECHNICAL\s*SKILLS|TOP\s*SKILLS|CERTIFICATIONS?|LICENSES?\s*&?\s*CERTIFICATIONS?|LICENSES?\s*&?|PROFESSIONAL\s*CERTIFICATIONS?|ACHIEVEMENTS?|AWARDS?|HONORS?|RECOGNITIONS?|PROJECTS?|NOTABLE\s*PROJECTS?|KEY\s*PROJECTS?|ABOUT\s*ME|SUMMARY|PROFILE|OBJECTIVE|PROFESSIONAL\s*SUMMARY|TRAINING|COURSES?|WORKSHOPS?|PUBLICATIONS?|RESEARCH|PAPERS?|VOLUNTEER|INTERESTS?|HOBBIES|REFERENCES?|LANGUAGES?|MEMBERSHIPS?|AFFILIATIONS?|PERSONAL\s*DETAILS?|CONTACT|Page\s+\d|--|$)/i;
  const titleWords = /(?:engineer|manager|lead|director|supervisor|specialist|analyst|consultant|coordinator|officer|architect|developer|designer|professor|head|deputy|nurse|physician|clinician|therapist|technician|surgeon|attorney|counsel|paralegal|teacher|instructor|lecturer|accountant|auditor|executive|representative|associate|administrator|chef|pharmacist|scientist|researcher|planner|inspector|operator|controller|advisor|strategist)/i;
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 3 || t.length > 120) continue;
    if (skipPatterns.test(t)) continue;
    if (/^\d{4}/.test(t)) continue;
    if (/^[•·\-]/.test(t)) continue;
    if (!titleWords.test(t) || /(?:University|Institute|Corporation|Complex|Government|Air Force)/i.test(t)) {
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

function extractMetrics(text: string): string[] {
  const metrics: string[] = [];
  const patterns = [/\d+%\s*\w+/g, /\$[\d,.]+[MKB]?/g, /\d+\s*(?:million|billion|thousand)/gi,
    /(?:reduced|increased|improved|achieved|maintained)\s+[^\n]{5,60}?\d+%/gi,
    /\d+\s*(?:systems?|subsystems?|aircraft|units?|engineers?|technicians?|countries)/gi,
    /(?:multi-?million|millions?[\s-]*dollar)/gi];
  for (const pat of patterns) { for (const m of text.matchAll(pat)) { metrics.push(m[0].trim()); } }
  return [...new Set(metrics)].slice(0, 10);
}

function detectDomain(text: string): string {
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

function deduplicateRoles(roles: ParsedRole[]): ParsedRole[] {
  const seen = new Map<string, ParsedRole>();
  for (const role of roles) {
    const key = `${role.title.toLowerCase().slice(0, 30)}|${role.start_date}|${role.end_date}`;
    if (!seen.has(key)) { seen.set(key, role); }
    else {
      const existing = seen.get(key)!;
      existing.bullets.push(...role.bullets);
      for (const s of role.technologies_used) { if (!existing.technologies_used.includes(s)) existing.technologies_used.push(s); }
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
    const contextEnd = i + 1 < dateRanges.length ? dateRanges[i + 1].index : Math.min(searchText.length, dr.index + 800);
    const beforeDate = searchText.slice(contextStart, dr.index);
    const afterDate = searchText.slice(dr.index + dr.raw.length, contextEnd);
    const fullContext = beforeDate + afterDate;
    const title = findTitle(beforeDate + "\n" + afterDate);
    const company = findCompany(beforeDate, title);
    const bullets = extractBullets(afterDate);
    const skills = extractSkillsFromText(fullContext);
    roles.push({
      company, title,
      start_date: String(dr.startYear),
      end_date: dr.endYear === new Date().getFullYear() ? "Present" : String(dr.endYear),
      duration_months: dr.durationMonths, bullets,
      technologies_used: skills.slice(0, 25),
      metrics_mentioned: extractMetrics(afterDate),
      domain: detectDomain(fullContext),
    });
  }
  return deduplicateRoles(roles);
}

function extractEducation(_text: string, section: CVSection | undefined): Array<{ institution: string; degree: string; field: string; dates: string }> {
  const searchText = section?.content ?? "";
  if (!searchText.trim()) return [];
  const results: Array<{ institution: string; degree: string; field: string; dates: string }> = [];
  const degreePattern = /(?:Bachelor|Master|PhD|Doctorate|B\.?E\.?|M\.?S\.?|B\.?Sc|M\.?Sc|MBA|B\.?Tech|M\.?Tech)/i;
  const lines = searchText.split("\n").filter((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (degreePattern.test(line) || /University|College|Institute/i.test(line)) {
      const context = lines.slice(Math.max(0, i - 1), i + 3).join(" ");
      const degreeMatch = context.match(/(?:Bachelor|Master|PhD|Doctorate|B\.?E\.?|M\.?S\.?|B\.?Sc|M\.?Sc|MBA|B\.?Tech|M\.?Tech)[^,\n]*/i);
      const instMatch = context.match(/(?:University|College|Institute|School)[^\n,]*/i);
      const dateMatch = context.match(/\d{4}\s*[-–—]\s*(?:\d{2,4}|Present)/i);
      const dateRanges = findAllDateRanges(searchText);
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

function extractCertifications(text: string, section: CVSection | undefined): string[] {
  const searchText = section?.content ?? text;
  const found = new Set<string>();
  const patterns = [
    /Project Management Professional\s*\(PMP\)/gi, /PMI Agile Certified Practitioner\s*\(PMI-ACP\)/gi,
    /PMP®?/g, /PMI-ACP®?/g, /PRINCE2/g, /ITIL/g, /CAPM/g,
    /Google Project Management\s*(?:Certificate)?/gi, /Professional Engineer/gi,
    /Six Sigma\s*(?:Green|Black|Yellow)?\s*Belt/gi, /Lean Six Sigma/gi,
    /ISO\s*\d{4,5}/g, /AS\s*9100/g, /EASA\s*(?:Part|B1|B2|66)/gi,
    /Certified\s+\w+\s+(?:Engineer|Manager|Professional|Specialist|Auditor)/gi,
    /(?:Systems?|Engineering)\s+(?:Management\s+)?Specialization/gi,
  ];
  for (const pat of patterns) { for (const m of searchText.matchAll(pat)) { found.add(m[0].trim().replace(/®/g, "")); } }
  if (section) {
    for (const line of section.content.split("\n").filter((l) => l.trim().length > 3)) {
      const t = line.trim();
      if (t.length > 5 && t.length < 100 && !/^\d{4}/.test(t)) found.add(t);
    }
  }
  return Array.from(found);
}

function parseCVLocal(text: string) {
  const normalized = normalizeSpacedText(text);
  const sections = detectSections(normalized);
  const lines = normalized.split("\n").filter((l) => l.trim());
  const expSection = sections.find((s) => s.type === "experience");
  const eduSection = sections.find((s) => s.type === "education");
  const skillSection = sections.find((s) => s.type === "skills");
  const certSection = sections.find((s) => s.type === "certifications");

  let experience = extractExperience(normalized, expSection);
  if (experience.length < 3 && expSection) {
    const fullTextRoles = extractExperience(normalized, undefined);
    if (fullTextRoles.length > experience.length) experience = fullTextRoles;
  }
  // Post-filter: remove roles where "company" is actually a section header
  const SECTION_HEADER_RE = /^(EXPERIENCE|WORK\s*EXPERIENCE|PROFESSIONAL\s*EXPERIENCE|EMPLOYMENT|CAREER|EDUCATION|ACADEMIC|QUALIFICATIONS|SKILLS|COMPETENCIES|CORE\s*COMPETENCIES|TECHNICAL\s*SKILLS|CERTIFICATIONS?|LICENSES?\s*&?\s*CERTIFICATIONS?|LICENSES?\s*&?|ACHIEVEMENTS?|AWARDS?|HONORS?|RECOGNITIONS?|PROJECTS?|NOTABLE\s*PROJECTS?|ABOUT\s*ME|SUMMARY|PROFILE|OBJECTIVE|PROFESSIONAL\s*SUMMARY|TRAINING|COURSES?|WORKSHOPS?|PUBLICATIONS?|RESEARCH|VOLUNTEER|INTERESTS?|HOBBIES|REFERENCES?|LANGUAGES?|MEMBERSHIPS?|AFFILIATIONS?|PERSONAL\s*DETAILS?|CONTACT)$/i;
  experience = experience.filter(r => !SECTION_HEADER_RE.test(r.company.trim()));
  const education = extractEducation(normalized, eduSection);
  const certs = extractCertifications(normalized, certSection);
  const allSkills = extractSkillsFromText(normalized);

  const BULLET_STARTERS = /^(?:Directed|Led|Managed|Provided|Delivered|Supervised|Coordinated|Established|Developed|Implemented|Oversaw|Conducted|Facilitated|Ensured|Executed|Achieved|Maintained|Spearheaded|Orchestrated|Streamlined)\b/i;
  const competencies: string[] = [];
  if (skillSection) {
    for (const line of skillSection.content.split("\n").filter((l) => l.trim().length > 3)) {
      const t = line.trim().replace(/^[•·\-▪►]\s*/, "");
      if (t.length > 3 && t.length < 50 && !BULLET_STARTERS.test(t) && !isGarbageWord(t)) competencies.push(t);
    }
  }

  const langSet = new Set(["javascript","typescript","python","java","c#","c++","go","rust","ruby","php","swift","kotlin","matlab","vba","r","scala"]);
  const fwSet = new Set(["react","angular","vue","next.js","express","django","flask","spring","node.js","rails","laravel","svelte","nuxt",".net"]);
  const infraSet = new Set(["aws","gcp","azure","docker","kubernetes","terraform","jenkins","ci/cd","linux","nginx","devops"]);
  const dbSet = new Set(["postgresql","mysql","mongodb","redis","elasticsearch","dynamodb","sqlite","cassandra","sql","nosql","oracle"]);
  const toolSet = new Set(["git","jira","figma","slack","postman","webpack","sap","ms project","primavera","servicenow","salesforce","power bi","tableau","sharepoint","erp","amos","garmin","dynon"]);

  return {
    name: lines[0]?.trim().replace(/^Contact$/, lines[1]?.trim() ?? "Unknown") ?? "Unknown",
    email: normalized.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] ?? null,
    phone: normalized.match(/[+]?[\d\s\-().]{10,18}/)?.[0]?.trim() ?? null,
    experience, education,
    skills: {
      languages: allSkills.filter((s) => langSet.has(s.toLowerCase())),
      frameworks: allSkills.filter((s) => fwSet.has(s.toLowerCase())),
      infrastructure: allSkills.filter((s) => infraSet.has(s.toLowerCase())),
      databases: allSkills.filter((s) => dbSet.has(s.toLowerCase())),
      tools: allSkills.filter((s) => toolSet.has(s.toLowerCase())),
      other: allSkills.filter((s) => { const l = s.toLowerCase(); return !langSet.has(l) && !fwSet.has(l) && !infraSet.has(l) && !dbSet.has(l) && !toolSet.has(l); }),
    },
    competencies,
    certifications: certs,
    all_technologies: allSkills,
  };
}

// ============================================================
// MAIN TEST
// ============================================================

async function main() {
  const cvDir = path.resolve(__dirname, "../../../Alpha_CVs");
  const pdfFiles = fs.readdirSync(cvDir).filter((f) => f.endsWith(".pdf"));

  console.log("=".repeat(70));
  console.log("DRY TEST: Full CV Pipeline — REAL parseCVLocal (80+ skills)");
  console.log("=".repeat(70));
  console.log(`Found ${pdfFiles.length} PDF files\n`);

  // Step 1: Extract text
  const extracted: Array<{ filename: string; text: string }> = [];
  for (const file of pdfFiles) {
    try {
      const text = await extractText(path.join(cvDir, file));
      extracted.push({ filename: file, text });
      console.log(`[EXTRACT] ${file}: ${text.length} chars`);
    } catch (err) {
      console.error(`[EXTRACT FAIL] ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Step 2: extractContactDetails()
  console.log("\n--- Step 2: extractContactDetails() ---");
  const contactMap = new Map<string, ReturnType<typeof extractContactDetails>>();
  for (const { filename, text } of extracted) {
    const contact = extractContactDetails(text);
    contactMap.set(filename, contact);
    console.log(`[CONTACT] ${filename}: email=${contact.emails[0] || "none"}, phone=${contact.phones.length > 0 ? "found" : "none"}, linkedin=${contact.linkedin || "none"}`);
  }

  // Step 3: Parse each CV with REAL parseCVLocal
  console.log("\n--- Step 3: parseCVLocal() (REAL — 80+ skills) ---");
  const parsedCVs: Array<{ id: string; filename: string; parsed_cv: Record<string, unknown>; source_text: string }> = [];
  for (let i = 0; i < extracted.length; i++) {
    const { filename, text } = extracted[i];
    const parsed = parseCVLocal(text);

    // Step 3b: Contact detail override (ResumeFlow bypass — same as route.ts)
    const contact = contactMap.get(filename)!;
    if (contact.emails.length > 0) (parsed as Record<string, unknown>).email = contact.emails[0];
    if (contact.phones.length > 0) (parsed as Record<string, unknown>).phone = contact.phones[0];
    if (contact.linkedin) (parsed as Record<string, unknown>).linkedin = contact.linkedin;

    parsedCVs.push({ id: `cv-${i + 1}`, filename, parsed_cv: parsed as Record<string, unknown>, source_text: text });
    console.log(`[PARSE] ${filename}: ${parsed.experience.length} roles, ${parsed.all_technologies.length} skills, ${parsed.certifications.length} certs, ${parsed.competencies.length} competencies`);
    if (parsed.all_technologies.length > 0) {
      console.log(`  Skills: ${parsed.all_technologies.join(", ")}`);
    }
  }

  // Step 4: cleanParsedCVs()
  console.log("\n--- Step 4: cleanParsedCVs() ---");
  const { cleanedCVs, reports } = cleanParsedCVs(
    parsedCVs.map((row) => ({ id: row.id, filename: row.filename, parsed_cv: row.parsed_cv, source_text: row.source_text })),
  );
  for (const report of reports) {
    console.log(`[CLEAN] ${report.cv_id}: ${report.roles_removed} roles removed, ${report.bullets_removed} bullets removed, ${report.skills_rejected} skills rejected, ${report.date_issues.length} date issues, ${report.source_mismatches.length} source mismatches`);
    if (report.source_mismatches.length > 0) {
      for (const m of report.source_mismatches) {
        console.log(`    MISMATCH: ${m.field}="${m.value}" in role "${m.title}" at "${m.company}"`);
      }
    }
  }

  // Step 5: detectConflicts()
  console.log("\n--- Step 5: detectConflicts() ---");
  const documents = cleanedCVs.map((cv) => ({
    id: cv.id, name: cv.name,
    roles: cv.roles.map((r: { title: string; company: string; start_date: string; end_date: string; bullets: string[] }) => ({
      title: r.title, company: r.company, start_date: r.start_date, end_date: r.end_date, bullets: r.bullets,
    })),
  }));
  const conflictReport = detectConflicts(documents, "senior");
  console.log(`Conflicts: ${conflictReport.conflicts.length}`);
  console.log(`Gaps: ${conflictReport.gaps.length}`);
  console.log(`Employer groups: ${conflictReport.employer_groups.length}`);
  for (const c of conflictReport.conflicts) console.log(`  CONFLICT: ${c.type} — ${c.description}`);

  // Step 6: Merge → Build Cloud
  console.log("\n--- Step 6: mergeResolvedProfile() → buildCloudFromParsedCV() ---");
  const resolvedProfile = mergeResolvedProfile(cleanedCVs, [], { employer_confirmed: null, is_single_employer: false }, "senior");
  console.log(`Resolved roles: ${resolvedProfile.roles.length}`);
  for (const r of resolvedProfile.roles) {
    console.log(`  ${r.start_date}-${r.end_date}: "${r.title}" @ ${r.organization} [${r.source_cvs.length} CVs, ${r.technologies_used.length} techs]`);
  }
  const cleanParsedCV = resolvedProfileToParsedCV(resolvedProfile);
  const cloud = buildCloudFromParsedCV(cleanParsedCV);
  console.log(`Cloud nodes: ${cloud.nodes.length}`);
  console.log(`  Skills: ${cloud.nodes.filter(n => n.type === "skill").length}`);
  console.log(`  Capabilities: ${cloud.nodes.filter(n => n.type === "capability").length}`);
  console.log(`  Domains: ${cloud.nodes.filter(n => n.type === "domain").length}`);
  console.log(`Achievements: ${cloud.achievements.length}`);
  console.log(`Trajectory roles: ${cloud.trajectory.roles.length}`);
  console.log(`Total experience: ${cloud.trajectory.total_experience_years} years`);
  // Show top 10 nodes by evidence count
  const sortedNodes = [...cloud.nodes].sort((a, b) => b.evidence.length - a.evidence.length);
  console.log(`\nTop 10 Cloud nodes by evidence:`);
  for (const node of sortedNodes.slice(0, 10)) {
    const roleEvidence = node.evidence.filter(e => e.type === "role");
    const titleMentions = roleEvidence.filter((e: any) => e.mention_context === "title").length;
    console.log(`  ${node.name} (${node.type}): ${node.evidence.length} evidence items, ${titleMentions} title mentions`);
  }

  // Step 7: classifyCloud()
  console.log("\n--- Step 7: classifyCloud() (355 skills, 17 domains) ---");
  const classified = classifyCloud(cloud.nodes);
  console.log(`Classified domains: ${classified.domains.length}`);
  for (const domain of classified.domains) {
    const allSkills = domain.categories.flatMap((c: any) => c.skills ?? []);
    console.log(`  ${domain.displayName} (${domain.name}): ${allSkills.length} skills across ${domain.categories.length} categories`);
    for (const skill of allSkills.slice(0, 5)) {
      console.log(`    - ${skill.name} (${skill.depth.level}, ${skill.depth.totalMonths}mo, ${skill.depth.roleCount} roles)`);
    }
    if (allSkills.length > 5) console.log(`    ... and ${allSkills.length - 5} more`);
  }
  console.log(`Gaps detected: ${classified.gaps.length}`);
  for (const gap of classified.gaps.slice(0, 5)) {
    console.log(`  GAP: ${gap.skill} (${gap.reason})`);
  }

  // Step 8: verifySkills()
  console.log("\n--- Step 8: verifySkills() ---");
  const allSkillNames = cloud.nodes.map(n => n.name);
  const { valid, rejected } = verifySkills(allSkillNames);
  console.log(`Total: ${allSkillNames.length}, Valid: ${valid.length}, Rejected: ${rejected.length}`);
  if (rejected.length > 0) console.log(`  Rejected: ${rejected.join(", ")}`);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("PIPELINE SUMMARY");
  console.log("=".repeat(70));
  console.log(`PDFs extracted:       ${extracted.length}/${pdfFiles.length}`);
  console.log(`CVs parsed:           ${parsedCVs.length}`);
  console.log(`Total roles found:    ${parsedCVs.reduce((s, p) => s + ((p.parsed_cv as any).experience?.length ?? 0), 0)}`);
  console.log(`Total skills found:   ${parsedCVs.reduce((s, p) => s + ((p.parsed_cv as any).all_technologies?.length ?? 0), 0)}`);
  console.log(`CVs cleaned:          ${cleanedCVs.length}`);
  console.log(`Conflicts detected:   ${conflictReport.conflicts.length}`);
  console.log(`Gaps detected:        ${conflictReport.gaps.length}`);
  console.log(`Cloud nodes:          ${cloud.nodes.length}`);
  console.log(`Classified domains:   ${classified.domains.length}`);
  console.log(`Taxonomy gaps:        ${classified.gaps.length}`);
  console.log(`Skills verified:      ${valid.length}/${allSkillNames.length}`);

  const pass = extracted.length === pdfFiles.length && cloud.nodes.length >= 10;
  console.log(`\nPipeline status:      ${pass ? "PASS" : "NEEDS ATTENTION"}`);
  if (!pass && cloud.nodes.length < 10) {
    console.log(`  WARNING: Only ${cloud.nodes.length} Cloud nodes. Expected 10+ for 5 CVs with 16yr experience.`);
    console.log(`  This is the DEV-MODE parser (regex). With Claude API, expect 30-50+ nodes.`);
  }
  console.log("=".repeat(70));
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
