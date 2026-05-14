/**
 * Country/Profession Licensing Lookup
 *
 * STRUCTURED LOOKUP — never LLM-generated. Zero hallucination on licensing pathways.
 * Design principle from CLAUDE.md: known pathways stated confidently with source;
 * unknown pathways return null (UI shows "Check local requirements").
 *
 * Coverage: top migration corridors for regulated professions.
 * Add entries as research confirms them. Never guess.
 *
 * Sources:
 *  - Saudi: SCFHS (scfhs.org.sa), MHRSD licensing portal
 *  - UAE: HAAD/DOH (doh.gov.ae), DHA (dha.gov.ae)
 *  - UK: GMC (gmc-uk.org), NMC (nmc.org.uk), GPhC, HCPC, SRA
 *  - Australia: AHPRA (ahpra.gov.au), Engineers Australia, CPA Australia
 *  - Canada: provincial colleges, CATO, CIMA
 *  - US: USMLE (usmle.org), NCLEX, state bar associations
 */

export interface LicensingRequirement {
  /** Short description of what's required */
  summary: string;
  /** Key exam or registration step */
  key_exam: string | null;
  /** Registering body */
  authority: string;
  /** Verified source URL */
  source: string;
  /** True = this is a hard requirement before work; false = advisory */
  mandatory: boolean;
}

export type LicensingLookupResult =
  | { found: true; requirement: LicensingRequirement }
  | { found: false; message: string }; // "Check local licensing requirements for X in Y"

type ProfessionKey =
  | "physician" | "surgeon" | "dentist" | "pharmacist" | "nurse"
  | "engineer" | "accountant" | "lawyer" | "physiotherapist" | "radiologist";

type CountryKey =
  | "SA" | "AE" | "UK" | "AU" | "CA" | "US" | "QA" | "KW" | "BH" | "OM";

// Source country → target country → profession → requirement
// Only entries with verified pathways are listed.
const PATHWAYS: Partial<Record<
  string, // source country ISO2
  Partial<Record<
    CountryKey,
    Partial<Record<ProfessionKey, LicensingRequirement>>
  >>
>> = {
  PK: {
    SA: {
      physician: {
        summary: "Pakistani MBBS graduates must pass SMLE (Saudi Medical Licensing Exam) and obtain SCFHS classification before practicing in Saudi Arabia. Postgraduate qualifications (FCPS, MCPS) are assessed separately for specialist registration.",
        key_exam: "SMLE (Saudi Medical Licensing Exam)",
        authority: "Saudi Commission for Health Specialties (SCFHS)",
        source: "https://www.scfhs.org.sa/en/Registration",
        mandatory: true,
      },
      nurse: {
        summary: "Pakistani nurses must obtain SCFHS classification (Nurse/Midwife category) and pass NCLEX-RN or equivalent competency exam recognized by SCFHS.",
        key_exam: "NCLEX-RN or SCFHS Competency Exam",
        authority: "Saudi Commission for Health Specialties (SCFHS)",
        source: "https://www.scfhs.org.sa/en/Registration/Pages/NursingAndRelatedHealthProfessions.aspx",
        mandatory: true,
      },
      engineer: {
        summary: "Pakistani engineers (PE, PEC registered) can work in Saudi Arabia. Saudi Engineering Council (SEC) registration required for project sign-off. PEC credentials assessed by SEC.",
        key_exam: null,
        authority: "Saudi Council of Engineers (SCE)",
        source: "https://www.saudiengineers.org.sa",
        mandatory: false,
      },
    },
    AE: {
      physician: {
        summary: "Pakistani physicians must pass the relevant Emirates authority licensing exam: HAAD (Abu Dhabi) or DHA (Dubai) or MOH (other emirates). MBBS recognized after verification.",
        key_exam: "HAAD Exam (Abu Dhabi) or DHA Exam (Dubai)",
        authority: "DOH Abu Dhabi / DHA Dubai",
        source: "https://www.doh.gov.ae/en/our-services/licensing",
        mandatory: true,
      },
      nurse: {
        summary: "Pakistani nurses must pass HAAD/DHA/MOH nursing licensing exam. NCLEX-RN holders have a streamlined pathway in Abu Dhabi.",
        key_exam: "HAAD/DHA Nursing Exam",
        authority: "DOH Abu Dhabi / DHA Dubai",
        source: "https://www.haad.ae/haad/tabid/58/Default.aspx",
        mandatory: true,
      },
    },
    UK: {
      physician: {
        summary: "Pakistani MBBS graduates must pass PLAB (Professional and Linguistic Assessments Board) exams (PLAB 1 + PLAB 2) and register with the GMC. IELTS/OET English proficiency required.",
        key_exam: "PLAB 1 + PLAB 2",
        authority: "General Medical Council (GMC)",
        source: "https://www.gmc-uk.org/registration-and-licensing/join-the-register/plab",
        mandatory: true,
      },
      nurse: {
        summary: "Pakistani nurses must apply for NMC registration, complete CBT (Computer Based Test) and OSCE (Objective Structured Clinical Examination). English language test required.",
        key_exam: "NMC CBT + OSCE",
        authority: "Nursing and Midwifery Council (NMC)",
        source: "https://www.nmc.org.uk/registration/joining-the-register/",
        mandatory: true,
      },
    },
    AU: {
      physician: {
        summary: "Pakistani medical graduates must apply to AMC (Australian Medical Council) for assessment. AMC MCQ + clinical exam required. IELTS/OET required.",
        key_exam: "AMC MCQ Exam + AMC Clinical Exam",
        authority: "Australian Medical Council (AMC) / AHPRA",
        source: "https://www.amc.org.au/assessment/standard-pathway/",
        mandatory: true,
      },
      accountant: {
        summary: "Pakistani ACCA or ICAP members can apply for CPA Australia or CAANZ membership via mutual recognition. Bridging exams may apply depending on qualification level.",
        key_exam: null,
        authority: "CPA Australia / Chartered Accountants ANZ",
        source: "https://www.cpaaustralia.com.au/become-a-cpa/overseas-applicants",
        mandatory: false,
      },
    },
  },
  IN: {
    SA: {
      physician: {
        summary: "Indian MBBS graduates must pass SMLE and obtain SCFHS classification. MCI/NMC registration required as prerequisite.",
        key_exam: "SMLE (Saudi Medical Licensing Exam)",
        authority: "Saudi Commission for Health Specialties (SCFHS)",
        source: "https://www.scfhs.org.sa/en/Registration",
        mandatory: true,
      },
      nurse: {
        summary: "Indian nurses must obtain SCFHS classification and pass competency exam. INC registration required.",
        key_exam: "SCFHS Competency Exam",
        authority: "Saudi Commission for Health Specialties (SCFHS)",
        source: "https://www.scfhs.org.sa/en/Registration",
        mandatory: true,
      },
    },
    UK: {
      physician: {
        summary: "Indian MBBS graduates must pass PLAB 1 + PLAB 2 and register with GMC. Those with postgraduate qualifications from recognised institutions may qualify via alternative GMC routes.",
        key_exam: "PLAB 1 + PLAB 2",
        authority: "General Medical Council (GMC)",
        source: "https://www.gmc-uk.org/registration-and-licensing/join-the-register/plab",
        mandatory: true,
      },
    },
    AU: {
      engineer: {
        summary: "Indian engineers (BE/BTech) can have qualifications assessed by Engineers Australia (EA). Many Indian degrees from NBA-accredited institutions qualify for Skills Assessment without bridging exams.",
        key_exam: null,
        authority: "Engineers Australia",
        source: "https://www.engineersaustralia.org.au/skills-assessment",
        mandatory: false,
      },
    },
    US: {
      physician: {
        summary: "Indian MBBS graduates must pass USMLE Steps 1, 2 CK, and 3, then match into a residency program. ECFMG certification required.",
        key_exam: "USMLE Steps 1, 2 CK, 3 + ECFMG Certification",
        authority: "ECFMG / USMLE",
        source: "https://www.ecfmg.org/certification/index.html",
        mandatory: true,
      },
    },
  },
  PH: {
    SA: {
      nurse: {
        summary: "Filipino nurses are highly sought after in Saudi Arabia. SCFHS classification required. PRC license is the prerequisite. Most Filipino nurses qualify for direct classification without additional exams.",
        key_exam: "SCFHS Classification (streamlined for PRC holders)",
        authority: "Saudi Commission for Health Specialties (SCFHS)",
        source: "https://www.scfhs.org.sa/en/Registration",
        mandatory: true,
      },
    },
    AE: {
      nurse: {
        summary: "Filipino nurses with PRC license and minimum 2 years experience can apply for HAAD/DHA/MOH licensing. Competency exam usually required.",
        key_exam: "HAAD/DHA Nursing Licensing Exam",
        authority: "DOH Abu Dhabi / DHA Dubai",
        source: "https://www.doh.gov.ae/en/our-services/licensing",
        mandatory: true,
      },
    },
  },
  UK: {
    AU: {
      physician: {
        summary: "UK-trained doctors (GMC registered, MBBS/MBChB) qualify for the Competent Authority Pathway (CAP) to AHPRA registration — no AMC exams required.",
        key_exam: null,
        authority: "AHPRA",
        source: "https://www.ahpra.gov.au/Registration/Registration-Process/International-Applicants.aspx",
        mandatory: false,
      },
    },
    CA: {
      physician: {
        summary: "UK-trained GMC-registered physicians can apply to provincial Colleges of Physicians via the IMG pathway. MCCQE Part 1 usually required. Assessment varies by province.",
        key_exam: "MCCQE Part 1",
        authority: "Medical Council of Canada (MCC)",
        source: "https://mcc.ca/imgp/",
        mandatory: true,
      },
    },
  },
};

/** Normalize profession label to key */
function normalizeProfession(profession: string): ProfessionKey | null {
  const p = profession.toLowerCase();
  if (/physici|doctor|mbbs|md\b|general pract|gp\b/.test(p)) return "physician";
  if (/surg/.test(p)) return "surgeon";
  if (/dent/.test(p)) return "dentist";
  if (/pharm/.test(p)) return "pharmacist";
  if (/nurs|midwif/.test(p)) return "nurse";
  if (/engineer|engr\./.test(p)) return "engineer";
  if (/account|cpa|acca|icap|cima/.test(p)) return "accountant";
  if (/lawyer|solicitor|barrister|advocate/.test(p)) return "lawyer";
  if (/physio|physiother/.test(p)) return "physiotherapist";
  if (/radiolog/.test(p)) return "radiologist";
  return null;
}

/** Normalize country to ISO2 */
function normalizeCountry(country: string): string {
  const c = country.toLowerCase().trim();
  const map: Record<string, string> = {
    "pakistan": "PK", "pk": "PK",
    "india": "IN", "in": "IN",
    "philippines": "PH", "ph": "PH",
    "united kingdom": "UK", "uk": "UK", "gb": "UK", "great britain": "UK",
    "saudi arabia": "SA", "ksa": "SA", "sa": "SA",
    "united arab emirates": "AE", "uae": "AE", "ae": "AE",
    "australia": "AU", "au": "AU",
    "canada": "CA", "ca": "CA",
    "united states": "US", "usa": "US", "us": "US",
    "qatar": "QA", "qa": "QA",
    "kuwait": "KW", "kw": "KW",
    "bahrain": "BH", "bh": "BH",
    "oman": "OM", "om": "OM",
  };
  return map[c] ?? c.toUpperCase().slice(0, 2);
}

/**
 * Look up licensing requirements for a profession moving from one country to another.
 *
 * Returns a confirmed pathway if known, or a safe "check local requirements" message.
 * NEVER returns guessed or LLM-generated content.
 */
export function lookupLicensingRequirement(
  profession: string,
  sourceCountry: string,
  targetCountry: string,
): LicensingLookupResult {
  const profKey = normalizeProfession(profession);
  const srcKey = normalizeCountry(sourceCountry);
  const tgtKey = normalizeCountry(targetCountry) as CountryKey;

  if (profKey && PATHWAYS[srcKey]?.[tgtKey]?.[profKey]) {
    return {
      found: true,
      requirement: PATHWAYS[srcKey][tgtKey]![profKey]!,
    };
  }

  return {
    found: false,
    message: `Check local licensing requirements for ${profession} in ${targetCountry}. Requirements vary by qualification country and registering body.`,
  };
}
