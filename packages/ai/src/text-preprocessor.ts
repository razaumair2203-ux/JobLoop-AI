/**
 * Text Pre-Processor for Multi-Column CV Extraction
 *
 * Runs AFTER text-normalizer.ts, BEFORE sending to LLM parser.
 * Fixes structural issues that pdf-parse creates when extracting
 * two-column CV layouts (left sidebar + right main content).
 *
 * Handles:
 * - Role headers appearing AFTER their bullets (reorders)
 * - Titles displaced to wrong sections (relocates)
 * - Education/Experience/Certification interleaving (regroups)
 * - Concatenated publication text (splits)
 *
 * Tested against: 9 CVs (5 aerospace/defense, 4 medical)
 */

// ============================================================
// Section Detection
// ============================================================

const SECTION_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  { regex: /^(?:PROFESSIONAL\s*)?EXPERIENCE\s*(?:\(\d+\s*YRS?\))?$/i, name: 'EXPERIENCE' },
  { regex: /^EDUCATION$/i, name: 'EDUCATION' },
  { regex: /^LICENSES?\s*&?\s*$/i, name: 'LICENSES' },
  { regex: /^CERTIFICATIONS?$/i, name: 'CERTIFICATIONS' },
  { regex: /^(?:ABOUT\s*ME|PROFILE|SUMMARY)$/i, name: 'ABOUT' },
  { regex: /^(?:AWARDS?\s*&?\s*RECOGNITIONS?|ACHIEVEMENTS?)$/i, name: 'AWARDS' },
  { regex: /^TRAINING\s*(?:COURSES?)?\s*&?\s*(?:WORKSHOPS?)?$/i, name: 'TRAINING' },
  { regex: /^(?:CORE\s*)?COMPETENC(?:IES|Y)$/i, name: 'COMPETENCIES' },
  { regex: /^RESEARCH\s*$/i, name: 'RESEARCH' },
  { regex: /^CONTRIBUTIONS?\s*$/i, name: 'CONTRIBUTIONS' },
  { regex: /^COMMUNITY\s*&?\s*CSR\s*INITIATIVES?$/i, name: 'COMMUNITY' },
  { regex: /^(?:NOTABLE\s*)?(?:NATIONAL\s*)?PROJECTS?\s*(?:OF\s*NATIONAL\s*IMPORTANCE)?$/i, name: 'PROJECTS' },
  { regex: /^PROFILE\(S\)$/i, name: 'PROFILES' },
];

/** Detect if a line is a section header */
function detectSection(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return null;
  for (const { regex, name } of SECTION_PATTERNS) {
    if (regex.test(trimmed)) return name;
  }
  // Handle merged section headers like "LICENSES&" or "NOTABLENATIONALPROJECTS"
  if (/^LICENSES\s*&\s*$/i.test(trimmed)) return 'LICENSES';
  if (/^NOTABLENATIONALPROJECTS$/i.test(trimmed)) return 'PROJECTS';
  if (/^PROJECTSOFNATIONALIMPORTANCE$/i.test(trimmed)) return 'PROJECTS';
  return null;
}

// ============================================================
// Role Header Detection
// ============================================================

/**
 * Matches lines that contain a role title with embedded dates.
 * Examples:
 *   "Deputy Director Avionics, PMO (2020 - 23)"
 *   "Lead Systems Integration Expert (2018-20)"
 *   "Program Lead, Professional Education (2023 - Present)"
 *   "Maintenance Support Engineer (AEW&C) (2016-17)"
 *   "Senior Registrar Anesthesia 2024 - Present"
 *   "Physician Intensive Care Unit Dec 25 - Present"
 */
const ROLE_HEADER_PATTERN = /^(.+?)\s*(?:\(?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{2,4}\s*[-–]\s*(?:Present|\d{2,4})\s*\)?)\s*$/i;

/**
 * Matches standalone date lines.
 * Examples: "2020 - 2024", "2022 - Present", "Jan 2023 - Present", "2009 - 2014"
 */
const STANDALONE_DATE_PATTERN = /^\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{2,4}\s*[-–]\s*(?:Present|\d{2,4})\s*$/i;

/** Extract date range from a line */
function extractDateRange(line: string): { start: string; end: string } | null {
  const match = line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(\d{4})\s*[-–]\s*(Present|\d{2,4})/i);
  if (!match) return null;
  const startYear = match[1];
  let endStr = match[2];
  if (endStr !== 'Present' && endStr.length === 2) {
    endStr = startYear.substring(0, 2) + endStr;
  }
  return { start: startYear, end: endStr };
}

/** Check if a line looks like a role header (title + date) */
function isRoleHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 10 || trimmed.length > 120) return false;
  return ROLE_HEADER_PATTERN.test(trimmed);
}

/** Check if a line is a standalone date */
function isStandaloneDate(line: string): boolean {
  return STANDALONE_DATE_PATTERN.test(line.trim());
}

/** Check if a line looks like a company/organization name */
function isCompanyLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 5 || trimmed.length > 120) return false;
  // Company indicators
  const companyPatterns = [
    /hospital/i, /university/i, /college/i, /institute/i,
    /complex/i, /corporation/i, /inc\./i, /ltd/i,
    /air force/i, /army/i, /navy/i,
    /medical/i, /engineering/i,
    /pakistan/i, /china/i, /usa/i, /saudi/i,
    /kamra/i, /jeddah/i, /islamabad/i, /lahore/i,
    /PMO\b/i, /KAMC/i, /CADI/i, /CPSP/i,
  ];
  return companyPatterns.some(p => p.test(trimmed));
}

// ============================================================
// Education Line Detection
// ============================================================

const EDUCATION_KEYWORDS = [
  /\b(?:MBBS|Bachelor|Master'?s?|PhD|Doctorate|BSc|MSc|B\.?E\.?|B\.?Tech|M\.?Tech)\b/i,
  /\bPostgraduation\b/i,
  /\bDegree\b/i,
  /^MS\s*\(/i, // "MS (Signal & Image Processing)" — Master's degree
  /^BE,?\s/i, // "BE, Aeronautical Engineering"
];

/** Medical role titles that look like education but are actually experience */
const MEDICAL_ROLE_KEYWORDS = [
  /\bResidency\b/i,
  /\bFellowship\b.*\b(?:Training|Program)\b/i,
  /\bClinical Observership\b/i,
  /\bRegistrar\b/i,
  /\bHouse Officer\b/i,
];

function isEducationLine(line: string): boolean {
  const trimmed = line.trim();
  // Must match an education keyword
  if (!EDUCATION_KEYWORDS.some(p => p.test(trimmed))) return false;
  // Reject if it's actually a company name (has "College of" + "Engineering" in context of a company)
  if (isCompanyLine(trimmed)) return false;
  // Reject if it's a medical role
  if (MEDICAL_ROLE_KEYWORDS.some(p => p.test(trimmed))) return false;
  return true;
}

// ============================================================
// Certification/License Line Detection
// ============================================================

const CERT_KEYWORDS = [
  /\b(?:Professional Engineer|PE)\b/i,
  /\bLicense to Practice\b/i,
  /\bSCFHS\b/i,
  /\bPMDC\b/i,
  /\bFellow of College/i,
  /\bCertified\b/i,
  /\bAdvanced Cardiovascular Life/i,
  /\bBasic Life Support/i,
  /\bPeadiatric Advaned Life Support/i, // typo in actual CV
];

function isCertLine(line: string): boolean {
  const trimmed = line.trim();
  return CERT_KEYWORDS.some(p => p.test(trimmed));
}

// ============================================================
// Publication Concatenation Fix
// ============================================================

/**
 * Fix concatenated publication text.
 * "Critical Burn CasesIndo-American Journal of" →
 * "Critical Burn Cases\nIndo-American Journal of"
 */
function fixConcatenatedPublications(text: string): string {
  // Split at journal name patterns that are concatenated without space
  return text.replace(
    /([a-z])([A-Z][a-z]*[-\s]?(?:American|European|Asian|British|International)\s+Journal\s+of)/g,
    '$1\n$2'
  );
}

// ============================================================
// Main Pre-Processor
// ============================================================

export interface PreprocessResult {
  text: string;
  changes: string[];
  sectionsFound: string[];
  roleHeadersFound: number;
  displacedTitlesFixed: number;
}

/**
 * Pre-process extracted CV text to fix multi-column layout artifacts.
 * Call AFTER normalizeExtractedText(), BEFORE sending to LLM parser.
 */
export function preprocessExtractedText(rawText: string): PreprocessResult {
  const changes: string[] = [];

  // Step 1: Fix concatenated publications FIRST (may add newlines, shifting indices)
  let result = rawText;
  const beforePubFix = result;
  result = fixConcatenatedPublications(result);
  if (result !== beforePubFix) {
    changes.push('Fixed concatenated publication text');
  }

  // Step 2: ALL scanning happens on the post-fix text (indices are stable from here)
  const lines = result.split('\n');

  const sectionMap: Array<{ lineIndex: number; section: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const section = detectSection(lines[i]);
    if (section) {
      sectionMap.push({ lineIndex: i, section });
    }
  }

  const sectionsFound = sectionMap.map(s => s.section);

  // Step 3: Find the EXPERIENCE section boundaries
  const expStart = sectionMap.find(s => s.section === 'EXPERIENCE');
  const expEnd = sectionMap.find(s =>
    s.section !== 'EXPERIENCE' &&
    s.section !== 'RESEARCH' &&
    s.section !== 'CONTRIBUTIONS' &&
    expStart && s.lineIndex > expStart.lineIndex
  );

  // Step 4: Find displaced role headers (role headers outside EXPERIENCE section)
  const displacedHeaders: Array<{ lineIndex: number; text: string }> = [];
  if (expStart) {
    const expEndIdx = expEnd ? expEnd.lineIndex : lines.length;
    for (let i = 0; i < lines.length; i++) {
      if (i >= expStart.lineIndex && i < expEndIdx) continue;
      const trimmed = lines[i].trim();
      if (isRoleHeader(trimmed) && !isStandaloneDate(trimmed)) {
        const isFalsePositive =
          isEducationLine(trimmed) ||
          isCertLine(trimmed) ||
          /\bTransfer of Source Code\b/i.test(trimmed) ||
          /\bSpecialization\b/i.test(trimmed) ||
          /\bType Rating\b/i.test(trimmed) ||
          /\bStaff Course\b/i.test(trimmed) ||
          /\bTraining\b.*\bChengdu\b/i.test(trimmed) ||
          trimmed.replace(/[\(\)\d\s\-–]/g, '').length <= 3;
        if (!isFalsePositive) {
          displacedHeaders.push({ lineIndex: i, text: trimmed });
        }
      }
    }
  }

  // Step 5: Find role headers WITHIN experience section
  let roleHeadersFound = 0;
  const roleHeaders: Array<{ lineIndex: number; text: string }> = [];
  if (expStart) {
    const expEndIdx = expEnd ? expEnd.lineIndex : lines.length;
    for (let i = expStart.lineIndex + 1; i < expEndIdx; i++) {
      if (isRoleHeader(lines[i]) || isStandaloneDate(lines[i])) {
        roleHeaders.push({ lineIndex: i, text: lines[i].trim() });
        roleHeadersFound++;
      }
    }
  }

  // Step 6: Apply annotations (all on `lines` array, indices are stable)
  // 6a: Mark displaced headers (bottom-to-top to preserve indices for splice)
  if (displacedHeaders.length > 0) {
    const sortedDH = [...displacedHeaders].sort((a, b) => b.lineIndex - a.lineIndex);
    for (const dh of sortedDH) {
      if (dh.lineIndex < lines.length) {
        lines[dh.lineIndex] = `[DISPLACED_FROM_EXPERIENCE] ${lines[dh.lineIndex]}`;
        changes.push(`Marked displaced role header: "${dh.text}"`);
      }
    }

    if (expStart && expStart.lineIndex < lines.length) {
      const displacedTitles = displacedHeaders.map(h => h.text.trim()).join('; ');
      lines.splice(
        expStart.lineIndex + 1, 0,
        `[NOTE: The following role title(s) were found displaced in another section and belong here: ${displacedTitles}]`
      );
      changes.push(`Added displaced title hint to EXPERIENCE section`);
    }
  }

  // 6b: Re-find experience section after splice, then detect title-after-bullets
  if (roleHeaders.length > 0) {
    let newExpStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (detectSection(lines[i]) === 'EXPERIENCE') {
        newExpStart = i;
        break;
      }
    }

    if (newExpStart >= 0) {
      let firstContentLine = newExpStart + 1;
      while (firstContentLine < lines.length && lines[firstContentLine].trim().length === 0) {
        firstContentLine++;
      }

      // Skip any [NOTE:] lines we just inserted
      while (firstContentLine < lines.length && lines[firstContentLine].startsWith('[NOTE:')) {
        firstContentLine++;
      }

      if (firstContentLine < lines.length) {
        const firstContent = lines[firstContentLine].trim();
        if (isCompanyLine(firstContent) && !isRoleHeader(firstContent) && !isStandaloneDate(firstContent)) {
          if (!lines[firstContentLine].includes('[NOTE:')) {
            lines.splice(firstContentLine, 0,
              `[NOTE: This block's role title may appear later in the text or in another section. Match by company context.]`
            );
            changes.push('Flagged titleless first experience block');
          }
        }
      }

      if (roleHeaders.length >= 2) {
        const firstRoleHeaderLine = roleHeaders[0].lineIndex;
        if (firstRoleHeaderLine > (expStart?.lineIndex ?? 0) + 3) {
          // Re-find after possible splices
          let latestExpStart = -1;
          for (let i = 0; i < lines.length; i++) {
            if (detectSection(lines[i]) === 'EXPERIENCE') { latestExpStart = i; break; }
          }
          if (latestExpStart >= 0) {
            lines.splice(latestExpStart + 1, 0,
              `[LAYOUT_WARNING: In this CV, role titles with dates often appear AFTER their bullet points, not before. When you see a Title (YYYY-YY) line, the bullets ABOVE it (back to the previous title or section start) belong to THIS role, not the previous one.]`
            );
            changes.push('Added title-after-bullets layout warning');
          }
        }
      }
    }
  }

  // 6c: Handle education-experience interleaving
  if (expStart) {
    let newExpStart = -1;
    let newExpEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const sec = detectSection(lines[i]);
      if (sec === 'EXPERIENCE') newExpStart = i;
      if (newExpStart >= 0 && sec && sec !== 'EXPERIENCE' && sec !== 'RESEARCH' && sec !== 'CONTRIBUTIONS' && i > newExpStart) {
        if (newExpEnd < 0) newExpEnd = i;
      }
    }

    if (newExpStart >= 0) {
      const endIdx = newExpEnd >= 0 ? newExpEnd : lines.length;
      for (let i = newExpStart + 1; i < endIdx; i++) {
        const trimmed = lines[i].trim();
        if (isEducationLine(trimmed) && !lines[i].includes('[')) {
          lines[i] = `[EDUCATION_ITEM] ${lines[i]}`;
          changes.push(`Flagged education item in experience section: "${trimmed.substring(0, 50)}..."`);
        }
      }
    }
  }

  result = lines.join('\n');

  return {
    text: result,
    changes,
    sectionsFound,
    roleHeadersFound,
    displacedTitlesFixed: displacedHeaders.length,
  };
}
