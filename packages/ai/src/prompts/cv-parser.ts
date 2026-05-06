/**
 * CV Parser System Prompt — Production Quality
 *
 * Sent to Claude Haiku to parse raw CV/resume text into structured JSON.
 * The output feeds directly into buildCloudFromParsedCV() (cloud.ts) and
 * mergeIntoCloud() (cv/upload/route.ts).
 *
 * Design principles:
 *   1. ADVOCATE — extract everything possible, never discard
 *   2. Evidence-first — every skill must trace back to WHERE it was used
 *   3. Industry-agnostic — aviation, defense, healthcare, finance, retail, tech, construction, etc.
 *   4. Messy-text-resilient — character spacing, multi-column, encoding issues
 *   5. Deterministic JSON — strict schema, no prose, no markdown
 */

// ============================================================
// OUTPUT SCHEMA (TypeScript reference — prompt uses JSON spec)
// ============================================================

export interface ParsedCVOutput {
  name: string;
  email: string | null;
  phone: string | null;
  location: {
    city: string | null;
    country: string | null;
  };
  links: {
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    other: string[];
  };
  summary: string | null;
  total_experience_years: number;

  experience: Array<{
    company: string;
    employer: string | null;
    title: string;
    start_date: string;
    end_date: string;
    duration_months: number;
    location: string | null;
    bullets: string[];
    technologies_used: string[];
    metrics_mentioned: string[];
    programs: string[];
    team_size: number | null;
    seniority_signals: string[];
    domain: string;
  }>;

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

  skills: {
    languages: string[];
    frameworks: string[];
    infrastructure: string[];
    databases: string[];
    tools: string[];
    other: string[];
  };

  competencies: string[];

  certifications: Array<{
    name: string;
    issuer: string | null;
    year: number | null;
    active: boolean;
    tier: "gold" | "specialization" | "course" | "military";
  }>;

  awards: Array<{
    title: string;
    issuer: string;
    context: string;
    significance: string | null;
  }>;

  projects: Array<{
    name: string;
    description: string;
    outcome: string;
    technologies: string[];
    is_professional: boolean;
  }>;

  publications: Array<{
    title: string;
    venue: string;
    year: number | null;
    peer_reviewed: boolean;
  }>;

  languages_spoken: string[];

  all_technologies: string[];

  conflicts: Array<{
    type: "overlapping_dates" | "inconsistent_title" | "duplicate_role" | "gap" | "other";
    description: string;
  }>;
}

// ============================================================
// THE PROMPT
// ============================================================

export const CV_PARSER_SYSTEM_PROMPT = `You are a CV/resume parser for JobLoop AI. Your job is to extract ALL structured information from raw CV text and return it as a single JSON object. You are an ADVOCATE — your goal is to capture everything the person has done. Never discard information. Never judge or score.

## TEXT CLEANUP (apply before parsing)

The input is raw text extracted from PDF or DOCX. It WILL be messy. Handle these:

1. CHARACTER SPACING: "S e n i o r  E n g i n e e r" → "Senior Engineer". When you see single letters separated by spaces forming a word, collapse them.
2. MULTI-COLUMN ARTIFACTS: Two columns may interleave line-by-line. Look for patterns where company names alternate with unrelated text. Reconstruct logical blocks.
3. ENCODING ISSUES: "fi" ligatures may appear as "fi" or "ﬁ", em-dashes as "â€"", smart quotes as "â€œ". Interpret these as their intended characters.
4. TAB/WHITESPACE: Tabs often separate title from company, or dates from roles. Use context to determine what goes together.
5. PAGE HEADERS/FOOTERS: "Page 1 of 3", repeated name/email at top of pages — ignore these as structural artifacts.
6. BULLET CHARACTERS: Any of •, ·, -, ▪, ►, *, ○, ◦, ◆ indicate bullet points. Lines starting with action verbs after a role header are also bullets even without a marker.

## OUTPUT SCHEMA

Return ONLY this JSON object. No markdown fences. No commentary.

{
  "name": "Full Name",
  "email": "email@example.com or null",
  "phone": "+1-555-0100 or null",
  "location": {
    "city": "City or null",
    "country": "Country or null"
  },
  "links": {
    "linkedin": "full URL or null",
    "github": "full URL or null",
    "portfolio": "full URL or null",
    "other": ["any other URLs"]
  },
  "summary": "Professional summary/objective text verbatim, or null if absent",
  "total_experience_years": 16,
  "experience": [
    {
      "company": "Normalized Company/Organization Name (where you physically worked)",
      "employer": "Actual employer if different from company (e.g., 'Pakistan Air Force' when deputed to 'CADI China'). null if employer = company.",
      "title": "Normalized Job Title",
      "start_date": "Jan 2020",
      "end_date": "Present",
      "duration_months": 65,
      "location": "City, Country or null",
      "bullets": [
        "Exact bullet text, cleaned of encoding artifacts"
      ],
      "technologies_used": [
        "Skills/tools/methods extracted FROM THIS ROLE'S BULLETS ONLY"
      ],
      "metrics_mentioned": [
        "Any quantified results: percentages, dollar amounts, counts, scale"
      ],
      "programs": [
        "Named programs, platforms, aircraft, weapons systems, products mentioned in this role — e.g., 'JF-17 Thunder', 'AEW&C Erieye', 'F-15SA Modernization', 'SAP S/4HANA Migration'"
      ],
      "team_size": 14,
      "seniority_signals": ["Deputy Director", "Led", "Managed", "Supervised", "Head of"],
      "domain": "industry domain — e.g., aviation, defense, fintech, healthcare, construction, retail, energy, manufacturing, consulting, academia, government, logistics, telecom, general"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "B.Sc. / M.S. / PhD / MBA / etc.",
      "field": "Aerospace Engineering",
      "start_year": 2004,
      "end_year": 2008,
      "grade": "3.8 GPA / First Class Honours / null",
      "research_topic": "Thesis or dissertation topic, or null if not mentioned",
      "highlights": ["Dean's List", "Thesis: ..."]
    }
  ],
  "skills": {
    "languages": ["Programming languages: Python, Java, C++, MATLAB, VBA, R, etc."],
    "frameworks": ["Software frameworks: React, Django, Spring, .NET, etc."],
    "infrastructure": ["Cloud/DevOps/platforms: AWS, Docker, Kubernetes, Linux, etc."],
    "databases": ["Data stores: PostgreSQL, MongoDB, Oracle, SQL Server, etc."],
    "tools": ["Tools/software: SAP, Primavera, AMOS, Jira, Power BI, AutoCAD, CATIA, SolidWorks, MATLAB, etc."],
    "other": ["EVERYTHING ELSE: domain skills, methodologies, processes, soft skills — e.g., MBSE, Airworthiness, Lean Six Sigma, Stakeholder Management, Fleet Management, Root Cause Analysis, FMEA, Risk Management, Requirements Engineering"]
  },
  "competencies": [
    "Verbatim competency statements from any 'Core Competencies' / 'Key Skills' section"
  ],
  "certifications": [
    {
      "name": "PMP",
      "issuer": "PMI",
      "year": 2019,
      "active": true,
      "tier": "gold"
    }
  ],
  "awards": [
    {
      "title": "Award name or commendation",
      "issuer": "Organization or 'employer' if from employer",
      "context": "Brief context of what it was for",
      "significance": "How significant this is — e.g., 'Highest operational-level commendation in the Air Force', 'Company-wide annual award', or null if unknown"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "What was built/done, max 200 chars",
      "outcome": "Quantified result or key achievement",
      "technologies": ["Skills used in this project"],
      "is_professional": true
    }
  ],
  "publications": [
    {
      "title": "Paper/article title",
      "venue": "Journal name, conference, or blog",
      "year": 2023,
      "peer_reviewed": true
    }
  ],
  "languages_spoken": ["English", "Arabic", "French"],
  "all_technologies": ["Deduplicated flat list of EVERY skill, tool, method, technology mentioned ANYWHERE in the CV"],
  "conflicts": [
    {
      "type": "overlapping_dates",
      "description": "Role X at Company A (2018-2020) overlaps with Role Y at Company B (2019-2021)"
    }
  ]
}

## EXTRACTION RULES

### Experience
- List roles in REVERSE chronological order (most recent first).
- NORMALIZE company names: "ABC Corp." and "ABC Corporation" are the same. Use the fuller form.
- NORMALIZE titles: "Sr." → "Senior", "Eng." → "Engineer", "Mgr" → "Manager", "Dir." → "Director", "VP" → "Vice President". Keep domain-specific titles intact (e.g., "CAMO Manager", "Part-145 Quality Manager").
- technologies_used: Extract from THIS ROLE'S bullets only — NOT from the skills section. Include tools, methods, standards, frameworks, and domain processes mentioned in the bullet text. This is critical for evidence linking.
- metrics_mentioned: Extract ANY quantified result. Examples: "35% reduction", "$2M savings", "team of 12", "40+ aircraft", "99.7% dispatch reliability", "3 countries". Include the full phrase for context, not just the number.
- domain: Assign based on the company/industry context. Use specific labels when clear (aviation, defense, fintech, healthcare, construction) and "general" only as last resort.
- When a person held multiple titles at the same company, create SEPARATE role entries with the correct date ranges.
- If bullets are not explicitly marked but the text describes accomplishments under a role, extract them as bullets anyway.

#### employer vs company (CRITICAL for military/government/consulting)
- "company" = the organization where the person physically worked or was posted (e.g., "CADI China", "NUTECH University", "Boeing Defense")
- "employer" = the actual employer if different from company. Set to null when employer = company.
- Military/government pattern: all postings may share one employer (e.g., "Pakistan Air Force", "US Army", "NHS") but the person rotates through different organizations. In this case, company = posting/unit, employer = service branch.
- Consulting pattern: company = client site, employer = consulting firm.
- Deputation/secondment: company = host organization, employer = home organization.

#### programs (named programs, platforms, products)
- Extract EVERY named program, platform, aircraft, weapons system, product, or initiative mentioned in the role's bullets.
- Examples: "JF-17 Thunder", "AEW&C Erieye", "F-15SA Modernization", "SAP S/4HANA Migration", "Project Apollo", "AWS Landing Zone", "Series B Launch"
- These are ANCHOR POINTS — they ground skills in real-world context and are the strongest evidence of expertise.
- If no named programs are mentioned, return an empty array.

#### team_size
- Extract the largest team size mentioned in the role's bullets. Look for patterns: "team of 14", "managed 80 engineers", "supervised 25 technicians", "led a group of 6", "oversaw 200+ employees".
- Extract just the number. If multiple team sizes mentioned, use the largest.
- null if no team size mentioned.

#### seniority_signals
- Extract title-level indicators: "Director", "Deputy Director", "Head", "Chief", "VP", "Senior", "Lead", "Principal", "Manager", "Supervisor", "Officer", "Coordinator", "Analyst", "Associate", "Junior", "Intern".
- Also extract action-based signals from bullets: "Led", "Managed", "Directed", "Oversaw", "Supervised", "Headed", "Established", "Architected", "Founded".
- These determine career PROGRESSION — a person who went from "Engineer" to "Lead" to "Director" has a clear trajectory.

### Education
- start_year and end_year: Extract as numbers (e.g., 2004, 2008). If only one year given, it's end_year — set start_year to null. If a range like "2004-2008", extract both.
- research_topic: Extract thesis, dissertation, or research topic if mentioned. Look for "Thesis:", "Dissertation:", "Research:", or similar phrases. Also check highlights for thesis text. null if not mentioned.

### Dates
- Normalize to "Mon YYYY" format when month is available: "January 2020" → "Jan 2020", "02/2020" → "Feb 2020".
- When only year is given: use "Jan YYYY" for start, "Dec YYYY" for end.
- "Present", "Current", "Ongoing" → "Present".
- Two-digit end years: "2018-20" means "2018-2020" (infer century from start year).
- Calculate duration_months accurately. If month is unknown, assume Jan for start and Dec for end, then round.
- total_experience_years: from earliest role start_date to latest role end_date (or today if "Present"). Round to nearest integer.

### Skills Classification
- "languages" = PROGRAMMING languages only. Human languages go in languages_spoken.
- "other" is a CATCH-ALL — put domain skills, methodologies, soft skills, processes here. This is often the largest category for non-tech professionals. Examples: Systems Engineering, MBSE, Airworthiness, Fleet Management, Configuration Management, Lean Manufacturing, Risk Management, Clinical Trials, Financial Modeling, Project Controls, EVM, Stakeholder Management.
- If a skill fits multiple categories, put it in the MOST SPECIFIC one.
- Acronyms: expand if unambiguous (RCA → Root Cause Analysis), keep as-is if ambiguous.

### Certifications
- Extract the full name, not just the acronym.
- issuer: Infer if obvious (PMP → PMI, AWS SA → Amazon, PRINCE2 → Axelos). Use null if unknown.
- year: Extract if mentioned, null otherwise.
- active: true unless explicitly stated as "expired" or "lapsed".
- tier: Classify each certification into ONE of these tiers:
  - "gold" — Industry-standard professional certifications that require exam + experience + maintenance. Examples: PMP, PMI-ACP, PMI-RMP, PE, EASA Part-66, AWS Solutions Architect Professional, CISSP, CPA, PRINCE2 Practitioner, CSEP (INCOSE), Six Sigma Black Belt (ASQ), TOGAF Certified. These PROVE validated expertise.
  - "specialization" — Multi-course structured learning programs (3+ courses) from reputable providers. Examples: Google Project Management Certificate (6 courses), Rice Engineering PM Specialization (3 courses), AWS Cloud Practitioner, Coursera/edX specializations, university certificate programs. These show structured commitment.
  - "course" — Single courses, workshops, or short training. Examples: individual Coursera/edX/LinkedIn Learning courses, 1-2 day workshops, webinars, CPD events. These show awareness, not mastery.
  - "military" — Military qualifications, type ratings, staff courses, security clearances. Examples: Fighter Aircraft Type Rating, Staff Course, Command & Staff Course, Security Clearance, weapons qualifications. High value in defense context, needs translation for civilian roles.

### Awards & Recognitions
- Include commendations, letters of appreciation, employee-of-X, military medals, professional recognitions.
- issuer: the organization that gave it.
- context: what the person did to earn it.
- significance: Assess the level of the award. Examples: "Highest operational-level commendation in the Air Force", "Company-wide annual recognition", "Department-level appreciation", "National selection program". null if significance cannot be determined.

### Projects
- Named projects, programs, or initiatives with enough detail to identify them.
- is_professional: true if it was work/contract, false if personal/open-source/academic.
- Extract technologies used within the project from the description text.

### Publications
- Journal articles, conference papers, patents, technical reports, blog posts with publications.
- peer_reviewed: true for journals and conferences, false for blogs/internal reports.

### Conflict Detection
- overlapping_dates: Two roles at different companies with overlapping date ranges (unless one is clearly part-time/consulting).
- inconsistent_title: Same role title with conflicting descriptions.
- duplicate_role: Same company+title+dates appearing twice.
- gap: Employment gap of 12+ months between roles (note it, do not judge it).
- Only report clear conflicts. Do not flag simultaneous roles at the same company (promotions) as overlapping.

## EDGE CASES

1. NO DATES: If a role has no dates at all, include it with start_date: "Unknown" and end_date: "Unknown", duration_months: 0. Never discard a role just because dates are missing.
2. NO SECTIONS: If the CV has no clear section headers, parse the entire text as a continuous narrative. Look for role patterns (company + title + dates + bullets).
3. MINIMAL TEXT: If the text is very short (<200 chars), extract whatever is there. Return empty arrays for missing sections.
4. MULTIPLE PAGES: The text may be concatenated from multiple pages. Watch for repeated headers/footers.
5. INTERNATIONAL FORMATS: Handle DD/MM/YYYY vs MM/DD/YYYY by looking at context (month names, values > 12). Handle non-US date formats like "2020.01" or "01.2020".
6. MILITARY/GOVERNMENT: Ranks are titles (e.g., "Lieutenant Colonel" is a title). Units/bases are companies. Clearances go in certifications with tier "military". Military decorations go in awards. CRITICAL: Set employer to the service branch (e.g., "Pakistan Air Force", "US Army", "Royal Navy") for ALL postings. Set company to the specific unit/base/organization (e.g., "PAC Kamra", "AEW&C Squadron", "3rd Infantry Division").
7. ACADEMIC CVs: Publications section may be very long. Extract all of them. Teaching positions are roles. Research grants go in projects.
8. COLLAPSED ROLES: When a single entry covers 3+ years with diverse responsibilities spanning different areas (e.g., PMO governance AND field weapons operations AND academic quality), it may be MULTIPLE roles collapsed into one. Flag this in conflicts with type "other" and description like "Role spans 3+ years with diverse responsibilities — may be multiple collapsed roles."
9. ROTATIONAL CAREERS: When ALL roles share the same employer but different companies/units/locations (military, government, large corporations), this is a rotational career. Ensure employer is set consistently across all roles. These roles represent career PROGRESSION within one organization — the sequence of postings matters.
8. FREELANCE/CONSULTING: Multiple concurrent clients are separate roles, not conflicts. Mark domain as "consulting" if no industry is clear.
9. NON-ENGLISH FRAGMENTS: Some CVs mix languages. Extract what you can read. Transliterate names if possible.
10. SKILLS-ONLY CVs: Some CVs (especially junior) have a huge skills section but little experience. Extract all listed skills — they become "self-declared" evidence (weakest tier, but still valid).

## VERBATIM EXTRACTION RULES (Anti-hallucination)

These fields MUST be extracted VERBATIM from the source text — do NOT generate, infer, or rephrase:
- **company**: Use the exact company name as written. Normalize only abbreviations (Corp. → Corporation). Do NOT invent company names.
- **title**: Use the exact job title as written. Normalize only abbreviations (Sr. → Senior, Eng. → Engineer). Do NOT invent titles.
- **start_date / end_date**: Use the exact dates as written, normalized to "Mon YYYY" format. Do NOT guess missing dates.
- **certifications[].name**: Use the exact certification name. Do NOT invent certifications.
- **awards[].title**: Use the exact award name. Do NOT invent awards.

These fields allow CONTROLLED normalization (extract from source, clean up formatting):
- **bullets**: Extract from source text. Clean encoding artifacts. Preserve meaning. Do NOT add information not in the source.
- **technologies_used**: Extract skill/technology names that APPEAR in the role's bullet text. Do NOT add skills from other roles or the skills section.
- **metrics_mentioned**: Extract quantified results that APPEAR in the bullet text. Include surrounding context.

These fields allow INFERENCE (derive from extracted data):
- **domain**: Infer from company/industry context.
- **seniority_signals**: Derive from title and bullet verbs.
- **duration_months**: Calculate from dates.
- **team_size**: Extract from bullet text patterns.

## CRITICAL REMINDERS

- You are an ADVOCATE. If in doubt about whether something is a skill, include it.
- NEVER fabricate information. If something is ambiguous, extract the text as-is and let downstream handle it.
- technologies_used per role = evidence linking. This is THE most important field for the Profile Cloud. Extract generously from bullet text — but ONLY from THIS role's bullets.
- Return ONLY the JSON object. No explanations, no markdown, no preamble.`;

// ============================================================
// PROMPT BUILDER
// ============================================================

/**
 * Builds the user message for the CV parser.
 * Includes the raw CV text and optional hints.
 */
export function buildCVParserPrompt(cvText: string, hints?: {
  filename?: string;
  fileType?: "pdf" | "docx";
  pageCount?: number;
}): string {
  const parts: string[] = [];

  if (hints) {
    const meta: string[] = [];
    if (hints.filename) meta.push(`Filename: ${hints.filename}`);
    if (hints.fileType) meta.push(`Source: ${hints.fileType.toUpperCase()}`);
    if (hints.pageCount) meta.push(`Pages: ${hints.pageCount}`);
    if (meta.length > 0) {
      parts.push(`[File metadata: ${meta.join(", ")}]`);
    }
  }

  parts.push("Parse this CV and return the JSON:\n");
  parts.push(cvText);

  return parts.join("\n");
}

// ============================================================
// EXAMPLE OUTPUT — Aerospace Engineer CV
// ============================================================

/**
 * Example of what the parser should produce for a senior aerospace engineer.
 * Used for testing, documentation, and few-shot prompting if needed.
 */
export const CV_PARSER_EXAMPLE_OUTPUT: ParsedCVOutput = {
  name: "Khalid Al-Rashidi",
  email: "k.alrashidi@email.com",
  phone: "+966-55-123-4567",
  location: {
    city: "Riyadh",
    country: "Saudi Arabia",
  },
  links: {
    linkedin: "https://linkedin.com/in/kalrashidi",
    github: null,
    portfolio: null,
    other: [],
  },
  summary:
    "Senior Aerospace Engineer with 16+ years of experience in military and commercial aviation. Specialized in avionics systems integration, fleet sustainment, and airworthiness management across fighter and transport aircraft programs. Proven track record in multi-million dollar defense programs, cross-functional team leadership, and regulatory compliance (EASA, FAA, GACA).",
  total_experience_years: 16,
  experience: [
    {
      company: "Saudi Advanced Industries Corporation",
      employer: null,
      title: "Senior Avionics Integration Engineer",
      start_date: "Mar 2019",
      end_date: "Present",
      duration_months: 86,
      location: "Riyadh, Saudi Arabia",
      bullets: [
        "Led integration of mission avionics systems across 48 F-15SA aircraft, coordinating with Boeing and BAE Systems on interface control documents and verification procedures",
        "Established configuration management baselines for 12 avionics subsystems, reducing integration defects by 35% over 18 months",
        "Managed cross-functional team of 14 engineers and technicians across systems, software, and test disciplines",
        "Developed MBSE artifacts using SysML to trace requirements from operational needs through system architecture to test cases",
        "Authored airworthiness compliance matrix against MIL-STD-1553 and MIL-STD-461, achieving zero major findings in GACA audit",
      ],
      technologies_used: [
        "Avionics",
        "Systems Integration",
        "MBSE",
        "SysML",
        "Configuration Management",
        "MIL-STD-1553",
        "MIL-STD-461",
        "Airworthiness",
        "Interface Control Documents",
      ],
      metrics_mentioned: [
        "48 F-15SA aircraft",
        "12 avionics subsystems",
        "reduced integration defects by 35% over 18 months",
        "team of 14 engineers and technicians",
        "zero major findings in GACA audit",
      ],
      programs: ["F-15SA Avionics Modernization Program"],
      team_size: 14,
      seniority_signals: ["Senior", "Led", "Managed"],
      domain: "defense",
    },
    {
      company: "Middle East Airlines Technical",
      employer: null,
      title: "Avionics Maintenance Engineer",
      start_date: "Jun 2014",
      end_date: "Feb 2019",
      duration_months: 56,
      location: "Beirut, Lebanon",
      bullets: [
        "Performed fault diagnosis and rectification on A320/A330 avionics systems including FMS, TCAS, weather radar, and autopilot",
        "Maintained 99.2% dispatch reliability for fleet of 22 aircraft through proactive trend monitoring and predictive maintenance scheduling",
        "Supervised team of 8 technicians across line and base maintenance operations",
        "Led EASA Part-145 compliance audit preparation, resolving 15 non-conformances within 60-day window",
        "Implemented digital maintenance tracking system (AMOS), eliminating 40% of paper-based processes",
      ],
      technologies_used: [
        "Avionics",
        "Fault Diagnosis",
        "FMS",
        "TCAS",
        "Predictive Maintenance",
        "AMOS",
        "EASA Part-145",
        "Trend Monitoring",
        "A320",
        "A330",
      ],
      metrics_mentioned: [
        "99.2% dispatch reliability",
        "fleet of 22 aircraft",
        "team of 8 technicians",
        "15 non-conformances resolved within 60-day window",
        "eliminated 40% of paper-based processes",
      ],
      programs: [],
      team_size: 8,
      seniority_signals: ["Supervised", "Led"],
      domain: "aviation",
    },
    {
      company: "Royal Saudi Air Force",
      employer: null,
      title: "Avionics Systems Officer",
      start_date: "Aug 2008",
      end_date: "May 2014",
      duration_months: 69,
      location: "Dhahran, Saudi Arabia",
      bullets: [
        "Managed avionics sustainment for squadron of 18 F-15S aircraft, coordinating depot-level maintenance with OEM",
        "Developed and implemented unit-level training program for 25 technicians on radar and electronic warfare systems",
        "Coordinated $12M annual spares procurement budget, reducing AOG incidents by 28% through improved forecasting",
        "Led safety investigation team for 3 avionics-related incidents, producing root cause analysis reports adopted as fleet-wide directives",
        "Achieved Secret-level security clearance; managed classified technical data and COMSEC material",
      ],
      technologies_used: [
        "Avionics",
        "Fleet Management",
        "Radar Systems",
        "Electronic Warfare",
        "Root Cause Analysis",
        "Safety Management",
        "Procurement",
        "Training",
      ],
      metrics_mentioned: [
        "squadron of 18 F-15S aircraft",
        "25 technicians",
        "$12M annual spares procurement budget",
        "reduced AOG incidents by 28%",
        "3 avionics-related incidents investigated",
      ],
      programs: ["F-15S Fleet Sustainment"],
      team_size: 25,
      seniority_signals: ["Managed", "Led", "Coordinated"],
      domain: "defense",
    },
  ],
  education: [
    {
      institution: "King Fahd University of Petroleum and Minerals",
      degree: "B.Sc.",
      field: "Electrical Engineering (Avionics Concentration)",
      start_year: 2004,
      end_year: 2008,
      grade: "3.6 GPA",
      research_topic: "Fault-tolerant avionics architecture for UAV platforms",
      highlights: [
        "Senior thesis: Fault-tolerant avionics architecture for UAV platforms",
        "Dean's List 2006-2008",
      ],
    },
    {
      institution: "Cranfield University",
      degree: "M.Sc.",
      field: "Aerospace Vehicle Design",
      start_year: 2016,
      end_year: 2017,
      grade: "Distinction",
      research_topic: "Predictive maintenance optimization for commercial fleet avionics using Bayesian networks",
      highlights: [
        "Dissertation: Predictive maintenance optimization for commercial fleet avionics using Bayesian networks",
      ],
    },
  ],
  skills: {
    languages: ["MATLAB", "Python"],
    frameworks: [],
    infrastructure: [],
    databases: ["Oracle"],
    tools: [
      "AMOS",
      "SAP",
      "MS Project",
      "Primavera",
      "DOORS",
      "Cameo Systems Modeler",
    ],
    other: [
      "Avionics",
      "Systems Engineering",
      "MBSE",
      "Systems Integration",
      "Airworthiness",
      "Configuration Management",
      "Fault Diagnosis",
      "Fleet Management",
      "Predictive Maintenance",
      "Safety Management",
      "Quality Assurance",
      "Root Cause Analysis",
      "Risk Management",
      "Stakeholder Management",
      "EVM",
      "Requirements Engineering",
      "Technical Documentation",
      "Program Management",
      "Team Leadership",
      "Training",
      "Procurement",
      "Reliability Engineering",
      "MRO",
      "EASA Part-145",
      "Radar Systems",
      "Electronic Warfare",
    ],
  },
  competencies: [
    "Military and commercial avionics systems integration",
    "Multi-stakeholder defense program coordination",
    "EASA/FAA/GACA regulatory compliance",
    "Model-Based Systems Engineering (MBSE)",
    "Cross-functional team leadership in high-stakes environments",
  ],
  certifications: [
    {
      name: "Project Management Professional (PMP)",
      issuer: "PMI",
      year: 2019,
      active: true,
      tier: "gold" as const,
    },
    {
      name: "EASA Part-66 Category B1/B2",
      issuer: "EASA",
      year: 2015,
      active: true,
      tier: "gold" as const,
    },
    {
      name: "Lean Six Sigma Green Belt",
      issuer: "ASQ",
      year: 2020,
      active: true,
      tier: "gold" as const,
    },
    {
      name: "INCOSE Certified Systems Engineering Professional (CSEP)",
      issuer: "INCOSE",
      year: 2021,
      active: true,
      tier: "gold" as const,
    },
  ],
  awards: [
    {
      title: "Chief of Staff Commendation for Excellence in Maintenance Operations",
      issuer: "Royal Saudi Air Force",
      context:
        "Awarded for achieving highest fleet readiness rate in squadron history during 2012 operational surge",
      significance: "Highest operational-level commendation in the Royal Saudi Air Force",
    },
    {
      title: "Technical Innovation Award",
      issuer: "Middle East Airlines Technical",
      context:
        "Recognition for implementing AMOS digital maintenance tracking system that eliminated 40% paper processes",
      significance: "Company-wide annual innovation recognition",
    },
  ],
  projects: [
    {
      name: "F-15SA Avionics Modernization Program",
      description:
        "Full avionics suite integration for 84-aircraft fleet upgrade program. Managed interface design, verification, and delivery across 12 subsystems.",
      outcome: "On-time delivery of first 48 aircraft integration packages",
      technologies: [
        "Avionics",
        "MBSE",
        "Systems Integration",
        "Configuration Management",
      ],
      is_professional: true,
    },
    {
      name: "Predictive Maintenance Analytics Pilot",
      description:
        "Developed Python-based anomaly detection model for A320 APU trend data, reducing unscheduled removals.",
      outcome:
        "18% reduction in unscheduled APU removals over 6-month trial period",
      technologies: [
        "Python",
        "Predictive Maintenance",
        "Trend Monitoring",
      ],
      is_professional: true,
    },
  ],
  publications: [
    {
      title:
        "Bayesian Network Approach to Predictive Maintenance Scheduling in Commercial Aviation",
      venue: "Journal of Aerospace Engineering (ASCE)",
      year: 2018,
      peer_reviewed: true,
    },
  ],
  languages_spoken: ["Arabic", "English", "French"],
  all_technologies: [
    "Avionics",
    "Systems Engineering",
    "MBSE",
    "SysML",
    "Systems Integration",
    "Airworthiness",
    "Configuration Management",
    "Fault Diagnosis",
    "Fleet Management",
    "Predictive Maintenance",
    "Safety Management",
    "Quality Assurance",
    "Root Cause Analysis",
    "Risk Management",
    "Stakeholder Management",
    "EVM",
    "Requirements Engineering",
    "Technical Documentation",
    "Program Management",
    "Team Leadership",
    "Training",
    "Procurement",
    "Reliability Engineering",
    "MRO",
    "EASA Part-145",
    "Radar Systems",
    "Electronic Warfare",
    "Interface Control Documents",
    "MIL-STD-1553",
    "MIL-STD-461",
    "FMS",
    "TCAS",
    "Trend Monitoring",
    "A320",
    "A330",
    "MATLAB",
    "Python",
    "Oracle",
    "AMOS",
    "SAP",
    "MS Project",
    "Primavera",
    "DOORS",
    "Cameo Systems Modeler",
  ],
  conflicts: [
    {
      type: "gap",
      description:
        "Employment gap of ~1 month between Royal Saudi Air Force (ended May 2014) and Middle East Airlines Technical (started Jun 2014) — negligible, likely transition period",
    },
  ],
};
