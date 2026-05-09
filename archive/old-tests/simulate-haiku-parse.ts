/**
 * Simulate Haiku parsing of all 5 CVs independently.
 * This is what the parser WOULD produce — structured JSON from raw text.
 * No ground truth, no cheating. Pure extraction from what's visible.
 *
 * Then run cross-CV conflict detection to generate Phase 1 Socratic questions.
 */

// ============================================================
// SIMULATED HAIKU OUTPUT PER CV (what each CV independently yields)
// ============================================================

interface SimulatedRole {
  title: string;
  company: string;
  employer: string | null;
  start_date: string;
  end_date: string;
  duration_months: number;
  bullets: string[];
  programs: string[];
  team_size: number | null;
  seniority_signals: string[];
  domain: string;
}

interface SimulatedEducation {
  institution: string;
  degree: string;
  field: string;
  start_year: number | null;
  end_year: number | null;
  research_topic: string | null;
}

interface SimulatedCert {
  name: string;
  issuer: string | null;
  tier: "gold" | "specialization" | "course" | "military";
}

interface SimulatedParsedCV {
  source_file: string;
  name: string;
  experience: SimulatedRole[];
  education: SimulatedEducation[];
  certifications: SimulatedCert[];
  conflicts: Array<{ type: string; description: string }>;
}

// --- SE CV ---
const SE_CV: SimulatedParsedCV = {
  source_file: "Resume SE_Jan26.pdf",
  name: "M. Umair Raza",
  experience: [
    {
      title: "Program Lead, Professional Education",
      company: "College of Aeronautical Engineering & NUTECH University",
      employer: null,
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      bullets: [
        "Leadership in transformative programs (Capacity Building initiative by HEC Pakistan)",
        "Led the integration of 60+ Aerospace and defense projects across multi-disciplinary engineering teams",
        "Strong product management in Data, AI, AI/ML lifecycle, analytics, Power BI (KPIs, ROIs)",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead", "Led"],
      domain: "academia",
    },
    {
      title: "Deputy Director, Program Management Office",
      company: "Air Force PMO",
      employer: null,
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      bullets: [
        "Led configuration management and integration of Aero Systems across fixed-wing and UAV platforms",
        "Conducted FMECA, LORA, and RCM analyses that improved fleet serviceability to >90%",
        "Delivered hands-on field leadership across airworthiness compliance, lifecycle supportability, system integration, and testing through flight-test phases",
        "Wrote Risk mitigation plans, RAID logs, and EVM reporting",
        "Led requirements & stakeholder analysis to translate Air Force operational needs",
        "Developed and managed Acceptance Test Requirements (ATRs) and verification/test specifications",
        "Executed integration and validation testing of avionics subsystems on an advanced aircraft design/integration rig",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Deputy Director", "Led"],
      domain: "defense",
    },
    {
      title: "Lead Systems Integration Expert",
      company: "Chengdu Aircraft Design Institute, China",
      employer: null,
      start_date: "Jan 2018",
      end_date: "Dec 2020",
      duration_months: 36,
      bullets: [],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead"],
      domain: "defense",
    },
    {
      title: "Maintenance Support Engineer (AEW&C)",
      company: "Airborne Warning & Control Systems, Air Force",
      employer: null,
      start_date: "Jan 2016",
      end_date: "Dec 2017",
      duration_months: 24,
      bullets: [
        "Delivered flight-line maintenance and sustainment support - fault isolation, real-time troubleshooting, and corrective action planning",
        "Performed reliability (MTTR, MTTF) and trend analysis to optimize staggered and preventive maintenance plans",
      ],
      programs: ["AEW&C"],
      team_size: null,
      seniority_signals: [],
      domain: "aviation",
    },
    {
      title: "Integrated Systems & Design Specialist",
      company: "Pakistan Aeronautical Complex Kamra, Pakistan",
      employer: null,
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      bullets: [
        "Designed, developed, and qualified a mission-critical aircraft sub-system; successfully integrated into operational fleet",
        "Led the design, planning, and upgrade of the country's first legacy trainer aircraft with a glass cockpit",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Specialist", "Led"],
      domain: "defense",
    },
  ],
  education: [
    { institution: "College of Aeronautical Engineering, Risalpur", degree: "BE", field: "Avionics Engineering", start_year: 2004, end_year: 2008, research_topic: null },
    { institution: "Air University, Islamabad", degree: "MS", field: "Avionics Engineering", start_year: 2013, end_year: 2015, research_topic: "Novel ECCM algorithm for ground-based radars" },
  ],
  certifications: [
    { name: "Project Management Professional (PMP)", issuer: "PMI", tier: "gold" },
    { name: "Agile Certified Practitioner (PMI-ACP)", issuer: "PMI", tier: "gold" },
    { name: "Professional Engineer (PE)", issuer: "Pakistan Engineering Council", tier: "gold" },
    { name: "System Engineering Specialization", issuer: "University of Colorado Boulder via Coursera", tier: "specialization" },
    { name: "Engineering Management Specialization", issuer: "Rice University via Coursera", tier: "specialization" },
    { name: "Project Management Specialization", issuer: "Google via Coursera", tier: "specialization" },
    { name: "Fighter Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "AWACS Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "Basic Staff Course", issuer: "Air Force", tier: "military" },
    { name: "Senior Command & Staff Course", issuer: "Air Force", tier: "military" },
  ],
  conflicts: [
    { type: "other", description: "Role 'Dy Director PMO (2020-23)' spans 3 years with bullets covering both PMO governance (RAID, EVM) AND field operations (airworthiness, flight-test). May be multiple collapsed roles." },
    { type: "other", description: "Role 'Program Lead (2023-Present)' mentions two organizations (College of Aero Eng AND NUTECH University). May be separate assignments." },
  ],
};

// --- PM CV ---
const PM_CV: SimulatedParsedCV = {
  source_file: "Resume PM_Jan26.pdf",
  name: "M. Umair Raza",
  experience: [
    {
      title: "Program Lead, Professional Education",
      company: "College of Aeronautical Engineering, Risalpur & NUTECH University",
      employer: null,
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      bullets: [
        "Head, Systems Engineering Program & Industry Partnerships",
        "Strong product management in Data, AI, AI/ML lifecycle, analytics, Power BI (KPIs, ROIs)",
        "Proficient in tools like MS Project, JIRA",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead", "Head"],
      domain: "academia",
    },
    {
      title: "Deputy Director Avionics, PMO",
      company: "Air Force PMO",
      employer: null,
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      bullets: [
        "Managed program-level integration of Aero subsystems, delivering integration and I&T to flight-test phases",
        "Provided PMO leadership, coordinating cross-functional teams across fleet operations and iterative development cycles",
        "Led Risk mitigation plans, RAID logs, and EVM reporting",
        "Working Knowledge of Air Navigation and CNS/ATM Systems",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Deputy Director", "Led", "Managed"],
      domain: "defense",
    },
    {
      title: "Aerospace Systems Integration Lead",
      company: "Chengdu Aircraft Design Institute (CADI), China",
      employer: null,
      start_date: "Jan 2018",
      end_date: "Dec 2020",
      duration_months: 36,
      bullets: [
        "Systems Engineering Lead within an international development program, applying Agile and hybrid delivery",
        "Executed testing and integration of avionics systems on the aircraft design rig",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead"],
      domain: "defense",
    },
    {
      title: "Engineering Operations Manager",
      company: "Airborne Early Warning & Control Systems, Air Force",
      employer: null,
      start_date: "Jan 2016",
      end_date: "Dec 2018",
      duration_months: 36,
      bullets: [
        "Directed Maintenance operations (spares planning, depot coordination, and supplier management)",
        "Established reliability improvement plans by MTBF/MTTR trends; delivered cost-control initiatives",
      ],
      programs: ["AEW&C"],
      team_size: null,
      seniority_signals: ["Manager", "Directed"],
      domain: "aviation",
    },
    {
      title: "Systems Engineering & Integration Engineer",
      company: "Pakistan Aeronautical Complex Kamra, Pakistan",
      employer: null,
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      bullets: [
        "Led Agile program delivery of aircraft systems using iterative planning, incremental delivery",
        "Project manager for aircraft platform modernization that delivered exports and generated multi-million dollar revenue",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Led"],
      domain: "defense",
    },
  ],
  education: [
    { institution: "College of Aeronautical Engineering, Risalpur", degree: "BE", field: "Aeronautical Engineering", start_year: 2004, end_year: 2008, research_topic: null },
    { institution: "Air University, Islamabad", degree: "MS", field: "Signal & Image Processing", start_year: 2013, end_year: 2015, research_topic: null },
  ],
  certifications: [
    { name: "Project Management Professional (PMP)", issuer: "PMI", tier: "gold" },
    { name: "Agile Certified Practitioner (PMI-ACP)", issuer: "PMI", tier: "gold" },
    { name: "Professional Engineer (PE)", issuer: "Pakistan Engineering Council", tier: "gold" },
    { name: "System Engineering Specialization", issuer: "University of Colorado Boulder via Coursera", tier: "specialization" },
    { name: "Engineering Management Specialization", issuer: "Rice University via Coursera", tier: "specialization" },
    { name: "Project Management Specialization", issuer: "Google via Coursera", tier: "specialization" },
    { name: "Fighter Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "AWACS Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "Basic Staff Course", issuer: "Air Force", tier: "military" },
    { name: "Senior Command & Staff Course", issuer: "Air Force", tier: "military" },
  ],
  conflicts: [
    { type: "other", description: "Role 'Deputy Director Avionics PMO (2020-23)' spans 3 years. May be multiple collapsed roles." },
    { type: "other", description: "Role 'Program Lead (2023-Present)' mentions two organizations." },
  ],
};

// --- KSA-ME CV ---
const KSA_ME_CV: SimulatedParsedCV = {
  source_file: "Resume KSA-ME_JAN25.pdf",
  name: "M. Umair Raza",
  experience: [
    {
      title: "Program Lead, Avionics Systems Design",
      company: "Aerospace & Defence / Systems Development",
      employer: null,
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      bullets: [
        "Head, Systems Engineering Program & Industry Partnerships",
        "Strong product management in Data, AI, AI/ML lifecycle, analytics, Power BI",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead", "Head"],
      domain: "defense",
    },
    {
      title: "Deputy Director, Fighter Fleet Management",
      company: "Air Force",
      employer: null,
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      bullets: [
        "Managed program-level integration of Aero subsystems, trend monitoring for predictive maintenance",
        "Provided PMO leadership, coordinating cross-functional teams",
        "Led Risk mitigation plans, RAID logs, and EVM reporting",
        "Managed performance of contracted AMOs and Heavy MROs for C-checks (scope, SLAs, 3rd-party KPIs)",
        "Supervised maintenance, inspections, and fault rectification on JF-17 aircraft during development",
        "Prepared and supported CAMO/AMO audit activities",
        "Designed work packages prior to aircraft release to operations",
        "Negotiated C-check contracts with Heavy MROs",
      ],
      programs: ["JF-17"],
      team_size: null,
      seniority_signals: ["Deputy Director", "Managed", "Supervised", "Led"],
      domain: "defense",
    },
    {
      title: "Avionics Systems Integration Lead",
      company: "Chengdu Aircraft Design Institute (CADI), China",
      employer: null,
      start_date: "Jan 2018",
      end_date: "Dec 2019",
      duration_months: 24,
      bullets: [],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead"],
      domain: "defense",
    },
    {
      title: "Maintenance Supervisor, AEW&C Aircraft",
      company: "Airborne Early Warning & Control Systems, Air Force",
      employer: null,
      start_date: "Jan 2016",
      end_date: "Dec 2018",
      duration_months: 36,
      bullets: [
        "Led maintenance planning & execution, spares planning and depot coordination",
        "MTBF/MTTR analysis, data-driven corrective actions",
        "Managed incorporation of Airworthiness Directives and Service Bulletins",
        "Supervised a multidisciplinary team of 80 engineers and technicians using AMOS",
      ],
      programs: ["AEW&C"],
      team_size: 80,
      seniority_signals: ["Supervisor", "Led", "Managed", "Supervised"],
      domain: "aviation",
    },
    {
      title: "Maintenance & Systems Engineer",
      company: "Pakistan Aeronautical Complex Kamra, Pakistan",
      employer: null,
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      bullets: [
        "Supported Aircraft System integration, modification, and retrofit activities",
        "Implemented Configuration Management to track aircraft configuration changes",
        "Verified technical documentation, led aircraft modification programs",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Led"],
      domain: "defense",
    },
  ],
  education: [
    { institution: "College of Aeronautical Engineering, Risalpur", degree: "BE", field: "Avionics Engineering", start_year: 2004, end_year: 2008, research_topic: null },
    { institution: "Air University, Islamabad", degree: "MS", field: "Signal & Image Processing", start_year: 2014, end_year: 2015, research_topic: null },
  ],
  certifications: [
    { name: "Project Management Professional (PMP)", issuer: "PMI", tier: "gold" },
    { name: "Agile Certified Practitioner (PMI-ACP)", issuer: "PMI", tier: "gold" },
    { name: "Professional Engineer (PE)", issuer: "Pakistan Engineering Council", tier: "gold" },
    { name: "System Engineering Specialization", issuer: "University of Colorado Boulder via Coursera", tier: "specialization" },
    { name: "Engineering Management Specialization", issuer: "Rice University via Coursera", tier: "specialization" },
    { name: "Project Management Specialization", issuer: "Google via Coursera", tier: "specialization" },
    { name: "Fighter Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "AWACS Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "Basic Staff Course", issuer: "Air Force", tier: "military" },
    { name: "Senior Command & Staff Course", issuer: "Air Force", tier: "military" },
  ],
  conflicts: [
    { type: "other", description: "Role 'Deputy Director Fighter Fleet Management (2020-23)' spans 3 years with mixed PMO governance AND C-check/fleet operations. May be multiple collapsed roles." },
    { type: "other", description: "China role dates (2018-19) don't align with AEW&C dates (2016-18) — possible overlap or gap." },
  ],
};

// --- BE CV ---
const BE_CV: SimulatedParsedCV = {
  source_file: "Resume of BE_Jan26.pdf",
  name: "M. Umair Raza",
  experience: [
    {
      title: "Program Lead, Professional Education",
      company: "College of Aeronautical Engineering, Risalpur & NUTECH University",
      employer: null,
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      bullets: [
        "Support capability development and workforce strategy for national aerospace programs",
        "Advise senior stakeholders on technology roadmaps, skills localization",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead"],
      domain: "defense",
    },
    {
      title: "Deputy Director Avionics, PMO",
      company: "Air Force PMO",
      employer: null,
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      bullets: [
        "Supported strategy-to-execution alignment for multiple fixed-wing, UAV platforms",
        "Coordinated engineering, operations, test, & logistics teams",
        "Led programs, risk mitigation, RAID management, and EVM reporting",
        "Supported international collaboration and export projects, airworthiness certification",
        "Worked within a multi-national defense environment",
        "Supported early solution shaping and requirements definition",
        "Acted as technical and program interface between customer representatives and program leadership",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Deputy Director", "Led"],
      domain: "defense",
    },
    {
      title: "Aerospace Systems Integration Lead",
      company: "Chengdu Aircraft Design Institute (CADI), China",
      employer: null,
      start_date: "Jan 2018",
      end_date: "Dec 2020",
      duration_months: 36,
      bullets: [
        "Worked within a multi-national defense environment, supporting integration, validation, and acceptance",
        "Supported early solution shaping and requirements definition",
        "Acted as technical and program interface between customer representatives and program leadership",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead"],
      domain: "defense",
    },
    {
      title: "Engineering Operations Manager",
      company: "Airborne Early Warning & Control Systems, Air Force",
      employer: null,
      start_date: "Jan 2016",
      end_date: "Dec 2018",
      duration_months: 36,
      bullets: [
        "Supported sustainment and mission readiness of C2-enabled AEW&C platforms",
        "Provided real-time technical advisory support to operational stakeholders",
      ],
      programs: ["AEW&C"],
      team_size: null,
      seniority_signals: ["Manager"],
      domain: "defense",
    },
    {
      title: "Systems Engineering & Integration Engineer",
      company: "Pakistan Aeronautical Complex Kamra, Pakistan",
      employer: null,
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      bullets: [
        "Led Agile program delivery of aircraft systems",
        "Project manager for aircraft platform modernization — exports and multi-million dollar revenue",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Led"],
      domain: "defense",
    },
  ],
  education: [
    { institution: "College of Aeronautical Engineering, Risalpur", degree: "BE", field: "Aeronautical Engineering", start_year: 2004, end_year: 2008, research_topic: null },
    { institution: "Air University, Islamabad", degree: "MS", field: "Signal & Image Processing", start_year: 2013, end_year: 2015, research_topic: null },
  ],
  certifications: [
    { name: "Project Management Professional (PMP)", issuer: "PMI", tier: "gold" },
    { name: "Agile Certified Practitioner (PMI-ACP)", issuer: "PMI", tier: "gold" },
    { name: "Professional Engineer (PE)", issuer: "Pakistan Engineering Council", tier: "gold" },
    { name: "System Engineering Specialization", issuer: "University of Colorado Boulder via Coursera", tier: "specialization" },
    { name: "Engineering Management Specialization", issuer: "Rice University via Coursera", tier: "specialization" },
    { name: "Project Management Specialization", issuer: "Google via Coursera", tier: "specialization" },
    { name: "Fighter Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "AWACS Aircraft Type Rating Course", issuer: "Air Force", tier: "military" },
    { name: "Basic Staff Course", issuer: "Air Force", tier: "military" },
    { name: "Senior Command & Staff Course", issuer: "Air Force", tier: "military" },
  ],
  conflicts: [
    { type: "other", description: "Role 'Deputy Director Avionics PMO (2020-23)' spans 3 years. May be multiple collapsed roles." },
  ],
};

// --- LinkedIn ---
const LINKEDIN: SimulatedParsedCV = {
  source_file: "Profile_Linkedin.pdf",
  name: "M Umair Raza",
  experience: [
    {
      title: "Assistant Professor",
      company: "National University of Sciences and Technology (NUST)",
      employer: null,
      start_date: "Jan 2025",
      end_date: "Present",
      duration_months: 5,
      bullets: [
        "Led the Systems Engineering Training Program, focusing on MBSE and industry partnerships",
        "Managed the Postgraduate Systems Engineering program, enhancing capacity development with HEC Pakistan",
        "Spearheaded professional education initiatives",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Led", "Managed"],
      domain: "academia",
    },
    {
      title: "Assistant Director Quality",
      company: "National University of Technology (NUTECH)",
      employer: null,
      start_date: "Sep 2022",
      end_date: "Dec 2025",
      duration_months: 39,
      bullets: [
        "Ensure Academic Quality Standards inline with OBE AND PEC and HEC guidelines",
        "Ensured ISO certification",
        "Conducted first ever capacity enhancement audit in collaboration with HEC",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Assistant Director"],
      domain: "academia",
    },
    {
      title: "Deputy Program Manager",
      company: "Pakistan Air Force",
      employer: null,
      start_date: "Jan 2020",
      end_date: "Sep 2022",
      duration_months: 33,
      bullets: [
        "Managed the integration of 28 avionics and weapons subsystems for the Air Force PMO",
        "Delivered integration and I&T to flight-test phases",
        "Led risk workshops, developed mitigation plans, and maintained RAID logs",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Deputy", "Manager", "Managed", "Led"],
      domain: "defense",
    },
    {
      title: "Aerospace Systems Integration Lead",
      company: "AVIC International Holding Corporation",
      employer: null,
      start_date: "Nov 2017",
      end_date: "Dec 2019",
      duration_months: 25,
      bullets: [
        "Technical program lead at CADI, China within international development team",
        "Liaison Program Manager — International Development & Supplier Handover",
        "Tested & Integrated Avionics Systems on the Aircraft Design Rig",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Lead"],
      domain: "defense",
    },
    {
      title: "Maintenance Support Engineer",
      company: "Government of Pakistan",
      employer: null,
      start_date: "Jan 2016",
      end_date: "Nov 2017",
      duration_months: 22,
      bullets: [
        "Managed spares planning and depot-level coordination",
        "Oversaw vendor contracts and executed reliability improvement plans",
        "Tracked MTBF/MTTR metrics, maintaining fleet reliability above 90%",
        "Provided round-the-clock operational readiness",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Managed", "Oversaw"],
      domain: "government",
    },
    {
      title: "Integrated Systems & Design Specialist",
      company: "Pakistan Aeronautical Complex Kamra",
      employer: null,
      start_date: "Oct 2008",
      end_date: "Oct 2013",
      duration_months: 60,
      bullets: [
        "Led the program delivery of aircraft systems",
        "Managed the modernization of aircraft platforms, resulting in significant exports and multi-million dollar revenue",
        "Oversaw program scope, procurement, QA, scheduling, and acceptance",
      ],
      programs: [],
      team_size: null,
      seniority_signals: ["Specialist", "Led", "Managed", "Oversaw"],
      domain: "defense",
    },
  ],
  education: [
    { institution: "College of Aeronautical Engineering Risalpur", degree: "BE", field: "Aerospace, Aeronautical and Astronautical Engineering", start_year: 2004, end_year: 2008, research_topic: null },
    { institution: "Air University", degree: "MS", field: "Signals and Image Processing", start_year: 2013, end_year: 2015, research_topic: null },
  ],
  certifications: [
    { name: "Project Management Professional (PMP)", issuer: "PMI", tier: "gold" },
    { name: "Agile Certified Practitioner (PMI-ACP)", issuer: "PMI", tier: "gold" },
    { name: "Google Project Management Certificate", issuer: "Google via Coursera", tier: "specialization" },
    { name: "Engineering Project Management Specialization", issuer: "Rice University via Coursera", tier: "specialization" },
    { name: "Introduction to Systems Engineering Specialization", issuer: "University of Colorado Boulder via Coursera", tier: "specialization" },
  ],
  conflicts: [
    { type: "overlapping_dates", description: "NUTECH (Sep 2022-Dec 2025) overlaps with NUST (Jan 2025-Present) — likely transition or concurrent." },
  ],
};

// ============================================================
// CROSS-CV CONFLICT DETECTION
// ============================================================

interface ConflictQuestion {
  id: string;
  type: "collapsed_role" | "date_conflict" | "title_mismatch" | "employer_pattern" | "timeline_gap";
  priority: "critical" | "important" | "minor";
  question: string;
  context: string;
  options?: Array<{ label: string; value: string }>;
  allow_freetext: boolean;
  evidence: string[];
}

function detectConflicts(cvs: SimulatedParsedCV[]): ConflictQuestion[] {
  const questions: ConflictQuestion[] = [];

  // 1. EMPLOYER PATTERN — detect if all roles are military/government rotational
  const companyNames = new Set<string>();
  for (const cv of cvs) {
    for (const role of cv.experience) {
      companyNames.add(role.company);
    }
  }
  const militarySignals = [...companyNames].filter(
    (c) =>
      c.toLowerCase().includes("air force") ||
      c.toLowerCase().includes("government") ||
      c.toLowerCase().includes("aeronautical complex") ||
      c.toLowerCase().includes("nutech") ||
      c.toLowerCase().includes("nust") ||
      c.toLowerCase().includes("college of aero"),
  );
  if (militarySignals.length >= 3) {
    questions.push({
      id: "employer-pattern",
      type: "employer_pattern",
      priority: "critical",
      question:
        "It looks like most of your roles are through government or military organizations. Were all of these positions through the same employer (e.g., Pakistan Air Force) as different postings?",
      context:
        "We found roles at PAC Kamra, Air Force AEW&C, Air Force PMO, NUTECH, and NUST. Understanding if these are rotational postings under one employer helps us show your career as a unified trajectory.",
      options: [
        { label: "Yes — all Pakistan Air Force (different postings/secondments)", value: "single_employer_paf" },
        { label: "Mostly — but some are civilian positions", value: "mixed" },
        { label: "No — these are separate employers", value: "separate" },
      ],
      allow_freetext: true,
      evidence: militarySignals,
    });
  }

  // 2. COLLAPSED ROLE DETECTION — roles > 30 months with diverse bullets
  for (const cv of cvs) {
    for (const role of cv.experience) {
      if (role.duration_months >= 30) {
        // Check if bullets span multiple domains/areas
        const bulletText = role.bullets.join(" ").toLowerCase();
        const areas: string[] = [];
        if (bulletText.includes("pmo") || bulletText.includes("raid") || bulletText.includes("evm")) areas.push("PMO governance");
        if (bulletText.includes("maintenance") || bulletText.includes("c-check") || bulletText.includes("fleet")) areas.push("fleet/maintenance operations");
        if (bulletText.includes("field") || bulletText.includes("airworthiness")) areas.push("field operations");
        if (bulletText.includes("education") || bulletText.includes("hec") || bulletText.includes("quality")) areas.push("academia/quality");
        if (bulletText.includes("integration") || bulletText.includes("flight-test")) areas.push("systems integration");

        if (areas.length >= 2) {
          const key = `collapsed-${role.start_date}-${role.end_date}`;
          if (!questions.find((q) => q.id === key)) {
            questions.push({
              id: key,
              type: "collapsed_role",
              priority: "critical",
              question: `Your "${role.title}" role (${role.start_date} — ${role.end_date}) spans ${role.duration_months} months and covers ${areas.join(", ")}. Was this one continuous assignment, or were there separate postings within this period?`,
              context: `We detected ${areas.length} different responsibility areas in this single entry. Military careers often involve rotations that get collapsed into one CV entry.`,
              options: [
                { label: "One continuous role", value: "single" },
                { label: "2 separate assignments", value: "split_2" },
                { label: "3 or more assignments", value: "split_3plus" },
              ],
              allow_freetext: true,
              evidence: areas,
            });
          }
        }
      }
    }
  }

  // 3. TITLE MISMATCH — same date range, different titles
  // Group roles by approximate date range across CVs
  const rolesByPeriod = new Map<string, Array<{ cv: string; title: string; dates: string }>>();
  for (const cv of cvs) {
    for (const role of cv.experience) {
      const startYear = parseInt(role.start_date.split(" ").pop() || "0", 10);
      const endYear = role.end_date === "Present" ? 2026 : parseInt(role.end_date.split(" ").pop() || "0", 10);
      const period = `${startYear}-${endYear}`;
      if (!rolesByPeriod.has(period)) rolesByPeriod.set(period, []);
      rolesByPeriod.get(period)!.push({ cv: cv.source_file, title: role.title, dates: `${role.start_date} — ${role.end_date}` });
    }
  }

  for (const [period, entries] of rolesByPeriod) {
    const uniqueTitles = [...new Set(entries.map((e) => e.title))];
    if (uniqueTitles.length >= 3) {
      questions.push({
        id: `title-mismatch-${period}`,
        type: "title_mismatch",
        priority: "important",
        question: `Your role around ${period} appears with ${uniqueTitles.length} different titles across your CVs. Which title best represents what you actually did?`,
        context: `We found: ${uniqueTitles.map((t) => `"${t}"`).join(", ")}`,
        options: uniqueTitles.map((t) => ({ label: t, value: t })),
        allow_freetext: true,
        evidence: entries.map((e) => `${e.cv}: "${e.title}"`),
      });
    }
  }

  // 4. DATE CONFLICTS — same role period, different date ranges
  const datesByRole = new Map<string, Array<{ cv: string; start: string; end: string }>>();
  for (const cv of cvs) {
    for (const role of cv.experience) {
      // Normalize to approximate period for matching
      const company = role.company.toLowerCase();
      let key = "";
      if (company.includes("cadi") || company.includes("chengdu") || company.includes("avic")) key = "china";
      else if (company.includes("aew") || company.includes("warning")) key = "aewc";
      else if (company.includes("kamra") || company.includes("aeronautical complex")) key = "kamra";
      else if (company.includes("pmo") || (company.includes("air force") && role.title.toLowerCase().includes("director"))) key = "pmo";
      else if (company.includes("nutech") || company.includes("nust") || company.includes("college")) key = "current";
      else key = company;

      if (!datesByRole.has(key)) datesByRole.set(key, []);
      datesByRole.get(key)!.push({ cv: cv.source_file, start: role.start_date, end: role.end_date });
    }
  }

  for (const [roleKey, dates] of datesByRole) {
    const uniqueStarts = [...new Set(dates.map((d) => d.start))];
    const uniqueEnds = [...new Set(dates.map((d) => d.end))];
    if (uniqueStarts.length >= 3 || uniqueEnds.length >= 3) {
      questions.push({
        id: `date-conflict-${roleKey}`,
        type: "date_conflict",
        priority: "important",
        question: `Your ${roleKey} role shows different date ranges across your CVs. Can you confirm the actual start and end dates?`,
        context: dates.map((d) => `${d.cv.replace("Resume ", "").replace(".pdf", "")}: ${d.start} — ${d.end}`).join("\n"),
        options: undefined,
        allow_freetext: true,
        evidence: dates.map((d) => `${d.cv}: ${d.start} — ${d.end}`),
      });
    }
  }

  // 5. LINKEDIN SPLIT DETECTION — LinkedIn has more roles than other CVs
  const linkedIn = cvs.find((c) => c.source_file.includes("Linkedin"));
  const otherCvs = cvs.filter((c) => !c.source_file.includes("Linkedin"));
  if (linkedIn) {
    const linkedInRoleCount = linkedIn.experience.length;
    const avgOtherRoles = otherCvs.reduce((sum, cv) => sum + cv.experience.length, 0) / otherCvs.length;
    if (linkedInRoleCount > avgOtherRoles + 0.5) {
      // LinkedIn shows more roles — this confirms collapsing in other CVs
      // Don't ask a question, just note it for the algorithm
      console.log(`\nNOTE: LinkedIn shows ${linkedInRoleCount} roles vs avg ${avgOtherRoles.toFixed(1)} in CVs — confirms role collapsing.`);
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, important: 1, minor: 2 };
  questions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to 5 questions max
  return questions.slice(0, 5);
}

// ============================================================
// RUN
// ============================================================

const allCVs = [SE_CV, PM_CV, KSA_ME_CV, BE_CV, LINKEDIN];
const questions = detectConflicts(allCVs);

console.log("\n" + "=".repeat(70));
console.log("PHASE 1 SOCRATIC QUESTIONS — Generated from 5 CVs (blind, no ground truth)");
console.log("=".repeat(70));
console.log(`\nTotal questions generated: ${questions.length}\n`);

for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  console.log(`--- Q${i + 1} [${q.priority.toUpperCase()}] (${q.type}) ---`);
  console.log(`QUESTION: ${q.question}`);
  console.log(`CONTEXT: ${q.context}`);
  if (q.options) {
    console.log("OPTIONS:");
    for (const opt of q.options) {
      console.log(`  [ ] ${opt.label}`);
    }
  }
  if (q.allow_freetext) {
    console.log("  [Free text input available]");
  }
  console.log();
}
