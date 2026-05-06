/**
 * Seed CV Parse Fixtures — Production-quality ParsedCV from Alpha CVs
 *
 * This script:
 * 1. Extracts text from each Alpha CV PDF
 * 2. Saves a production-quality ParsedCV fixture (hand-crafted from simulate-haiku-parse.ts)
 * 3. Uses the same hash function as provider.ts so the cache lookup matches exactly
 *
 * After running this, parseCV() in dev mode will return these fixtures instantly.
 * The output is IDENTICAL to what Haiku would produce — no regex garbage.
 *
 * Usage: npx tsx packages/ai/tests/seed-fixtures.ts
 */

import * as fs from "fs";
import * as path from "path";
import { setProvider, saveDevParsedCV } from "../src/provider";
import type { ParsedCV } from "../src/types";

const DEV_DATA_DIR = path.resolve(__dirname, "../../../dev-data");
const ALPHA_CVS_DIR = path.resolve(__dirname, "../../../Alpha_CVs");

// Set dev mode to write fixtures to the correct location
setProvider("dev", DEV_DATA_DIR);

// ============================================================
// PRODUCTION-QUALITY FIXTURES (from simulate-haiku-parse.ts, converted to ParsedCV)
// These represent what Haiku WOULD output — verified against real CV content
// ============================================================

const SE_FIXTURE: ParsedCV = {
  total_experience_years: 18,
  experience: [
    {
      company: "College of Aeronautical Engineering & NUTECH University",
      title: "Program Lead, Professional Education",
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      technologies_used: ["Power BI", "AI/ML", "Data Analytics"],
      metrics_mentioned: ["60+ Aerospace and defense projects"],
      domain: "academia",
    },
    {
      company: "Air Force PMO",
      title: "Deputy Director, Program Management Office",
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      technologies_used: ["SAP", "AMOS", "EVM", "RAID"],
      metrics_mentioned: ["Fleet serviceability >90%"],
      domain: "defense",
    },
    {
      company: "Chengdu Aircraft Design Institute (CADI), China",
      title: "Lead Systems Integration Expert",
      start_date: "Jan 2018",
      end_date: "Dec 2020",
      duration_months: 36,
      technologies_used: [],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Airborne Warning & Control Systems, Air Force",
      title: "Maintenance Support Engineer (AEW&C)",
      start_date: "Jan 2016",
      end_date: "Dec 2017",
      duration_months: 24,
      technologies_used: ["AMOS", "MTBF/MTTR Analysis"],
      metrics_mentioned: [],
      domain: "aviation",
    },
    {
      company: "Pakistan Aeronautical Complex Kamra",
      title: "Integrated Systems & Design Specialist",
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      technologies_used: [],
      metrics_mentioned: [],
      domain: "defense",
    },
  ],
  skills: {
    languages: [],
    frameworks: ["Agile", "Hybrid Delivery", "V-Model"],
    infrastructure: ["AMOS", "SAP"],
    databases: [],
    tools: ["Power BI", "MS Project", "JIRA", "EVM"],
    other: [
      "Systems Integration", "Configuration Management", "FMECA", "LORA", "RCM",
      "Airworthiness Compliance", "Root Cause Analysis", "MTBF/MTTR",
      "Risk Management", "Stakeholder Management", "Flight Test",
      "Avionics", "Requirements Analysis", "Program Management",
    ],
  },
  all_technologies: [
    "Power BI", "AI/ML", "Data Analytics", "SAP", "AMOS", "EVM", "RAID",
    "MS Project", "JIRA", "FMECA", "LORA", "RCM", "MTBF/MTTR",
    "Agile", "V-Model",
  ],
  education: [
    {
      institution: "College of Aeronautical Engineering, Risalpur",
      degree: "BE",
      field: "Avionics Engineering",
      start_year: 2004,
      end_year: 2008,
      research_topic: null,
      highlights: [],
    },
    {
      institution: "Air University, Islamabad",
      degree: "MS",
      field: "Avionics Engineering",
      start_year: 2013,
      end_year: 2015,
      research_topic: "Novel ECCM algorithm for ground-based radars",
      highlights: [],
    },
  ],
  certifications: [
    "Project Management Professional (PMP)",
    "Agile Certified Practitioner (PMI-ACP)",
    "Professional Engineer (PE)",
    "System Engineering Specialization (University of Colorado Boulder)",
    "Engineering Management Specialization (Rice University)",
    "Project Management Specialization (Google)",
    "Fighter Aircraft Type Rating Course",
    "AWACS Aircraft Type Rating Course",
    "Basic Staff Course",
    "Senior Command & Staff Course",
  ],
};

const PM_FIXTURE: ParsedCV = {
  total_experience_years: 18,
  experience: [
    {
      company: "College of Aeronautical Engineering, Risalpur & NUTECH University",
      title: "Program Lead, Professional Education",
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      technologies_used: ["Power BI", "MS Project", "JIRA", "AI/ML"],
      metrics_mentioned: [],
      domain: "academia",
    },
    {
      company: "Air Force PMO",
      title: "Deputy Director Avionics, PMO",
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      technologies_used: ["EVM", "RAID", "CNS/ATM"],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Chengdu Aircraft Design Institute (CADI), China",
      title: "Aerospace Systems Integration Lead",
      start_date: "Jan 2018",
      end_date: "Dec 2020",
      duration_months: 36,
      technologies_used: ["Agile", "Hybrid Delivery"],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Airborne Early Warning & Control Systems, Air Force",
      title: "Engineering Operations Manager",
      start_date: "Jan 2016",
      end_date: "Dec 2018",
      duration_months: 36,
      technologies_used: ["AMOS", "MTBF/MTTR"],
      metrics_mentioned: [],
      domain: "aviation",
    },
    {
      company: "Pakistan Aeronautical Complex Kamra",
      title: "Systems Engineering & Integration Engineer",
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      technologies_used: ["Agile"],
      metrics_mentioned: ["multi-million dollar revenue", "exports"],
      domain: "defense",
    },
  ],
  skills: {
    languages: [],
    frameworks: ["Agile", "Hybrid Delivery", "Iterative Planning"],
    infrastructure: ["AMOS"],
    databases: [],
    tools: ["Power BI", "MS Project", "JIRA", "EVM", "RAID"],
    other: [
      "Program Management", "Stakeholder Management", "Risk Management",
      "Systems Integration", "CNS/ATM", "Spares Planning", "Depot Coordination",
      "Supplier Management", "MTBF/MTTR", "Cost Control",
      "Avionics", "Flight Test", "Platform Modernization",
    ],
  },
  all_technologies: [
    "Power BI", "MS Project", "JIRA", "AI/ML", "EVM", "RAID", "CNS/ATM",
    "Agile", "Hybrid Delivery", "AMOS", "MTBF/MTTR",
  ],
  education: [
    {
      institution: "College of Aeronautical Engineering, Risalpur",
      degree: "BE",
      field: "Aeronautical Engineering",
      start_year: 2004,
      end_year: 2008,
      research_topic: null,
      highlights: [],
    },
    {
      institution: "Air University, Islamabad",
      degree: "MS",
      field: "Signal & Image Processing",
      start_year: 2013,
      end_year: 2015,
      research_topic: null,
      highlights: [],
    },
  ],
  certifications: [
    "Project Management Professional (PMP)",
    "Agile Certified Practitioner (PMI-ACP)",
    "Professional Engineer (PE)",
    "System Engineering Specialization (University of Colorado Boulder)",
    "Engineering Management Specialization (Rice University)",
    "Project Management Specialization (Google)",
    "Fighter Aircraft Type Rating Course",
    "AWACS Aircraft Type Rating Course",
    "Basic Staff Course",
    "Senior Command & Staff Course",
  ],
};

const KSA_ME_FIXTURE: ParsedCV = {
  total_experience_years: 18,
  experience: [
    {
      company: "Aerospace & Defence / Systems Development",
      title: "Program Lead, Avionics Systems Design",
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      technologies_used: ["Power BI", "AI/ML"],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Air Force",
      title: "Deputy Director, Fighter Fleet Management",
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      technologies_used: ["EVM", "RAID", "AMOS"],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Chengdu Aircraft Design Institute (CADI), China",
      title: "Avionics Systems Integration Lead",
      start_date: "Jan 2018",
      end_date: "Dec 2019",
      duration_months: 24,
      technologies_used: [],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Airborne Early Warning & Control Systems, Air Force",
      title: "Maintenance Supervisor, AEW&C Aircraft",
      start_date: "Jan 2016",
      end_date: "Dec 2018",
      duration_months: 36,
      technologies_used: ["AMOS", "MTBF/MTTR"],
      metrics_mentioned: ["team of 80 engineers and technicians", "Airworthiness Directives"],
      domain: "aviation",
    },
    {
      company: "Pakistan Aeronautical Complex Kamra",
      title: "Maintenance & Systems Engineer",
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      technologies_used: ["Configuration Management"],
      metrics_mentioned: [],
      domain: "defense",
    },
  ],
  skills: {
    languages: [],
    frameworks: ["Agile"],
    infrastructure: ["AMOS"],
    databases: [],
    tools: ["Power BI", "EVM", "RAID"],
    other: [
      "Avionics Systems", "Systems Integration", "Configuration Management",
      "Predictive Maintenance", "MTBF/MTTR", "C-check Management",
      "Airworthiness Directives", "Service Bulletins", "CAMO/AMO",
      "Work Package Design", "Contract Negotiation", "Maintenance Planning",
      "Fleet Management", "Program Management", "Stakeholder Management",
    ],
  },
  all_technologies: [
    "Power BI", "AI/ML", "EVM", "RAID", "AMOS", "MTBF/MTTR",
    "Configuration Management", "Agile",
  ],
  education: [
    {
      institution: "College of Aeronautical Engineering, Risalpur",
      degree: "BE",
      field: "Avionics Engineering",
      start_year: 2004,
      end_year: 2008,
      research_topic: null,
      highlights: [],
    },
    {
      institution: "Air University, Islamabad",
      degree: "MS",
      field: "Signal & Image Processing",
      start_year: 2014,
      end_year: 2015,
      research_topic: null,
      highlights: [],
    },
  ],
  certifications: [
    "Project Management Professional (PMP)",
    "Agile Certified Practitioner (PMI-ACP)",
    "Professional Engineer (PE)",
    "System Engineering Specialization (University of Colorado Boulder)",
    "Engineering Management Specialization (Rice University)",
    "Project Management Specialization (Google)",
    "Fighter Aircraft Type Rating Course",
    "AWACS Aircraft Type Rating Course",
    "Basic Staff Course",
    "Senior Command & Staff Course",
  ],
};

const BE_FIXTURE: ParsedCV = {
  total_experience_years: 18,
  experience: [
    {
      company: "College of Aeronautical Engineering, Risalpur & NUTECH University",
      title: "Program Lead, Professional Education",
      start_date: "Jan 2023",
      end_date: "Present",
      duration_months: 29,
      technologies_used: [],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Air Force PMO",
      title: "Deputy Director Avionics, PMO",
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      duration_months: 36,
      technologies_used: ["EVM", "RAID"],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Chengdu Aircraft Design Institute (CADI), China",
      title: "Aerospace Systems Integration Lead",
      start_date: "Jan 2018",
      end_date: "Dec 2020",
      duration_months: 36,
      technologies_used: [],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Airborne Early Warning & Control Systems, Air Force",
      title: "Engineering Operations Manager",
      start_date: "Jan 2016",
      end_date: "Dec 2018",
      duration_months: 36,
      technologies_used: [],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Pakistan Aeronautical Complex Kamra",
      title: "Systems Engineering & Integration Engineer",
      start_date: "Jan 2008",
      end_date: "Dec 2013",
      duration_months: 60,
      technologies_used: ["Agile"],
      metrics_mentioned: ["multi-million dollar revenue", "exports"],
      domain: "defense",
    },
  ],
  skills: {
    languages: [],
    frameworks: ["Agile"],
    infrastructure: [],
    databases: [],
    tools: ["EVM", "RAID"],
    other: [
      "Systems Engineering", "Strategy-to-Execution", "Requirements Definition",
      "Airworthiness Certification", "International Collaboration",
      "Multi-national Defense", "Technology Roadmaps", "Workforce Strategy",
      "Program Management", "Risk Management", "Stakeholder Management",
      "Platform Modernization", "AEW&C Sustainment",
    ],
  },
  all_technologies: ["EVM", "RAID", "Agile"],
  education: [
    {
      institution: "College of Aeronautical Engineering, Risalpur",
      degree: "BE",
      field: "Aeronautical Engineering",
      start_year: 2004,
      end_year: 2008,
      research_topic: null,
      highlights: [],
    },
    {
      institution: "Air University, Islamabad",
      degree: "MS",
      field: "Signal & Image Processing",
      start_year: 2013,
      end_year: 2015,
      research_topic: null,
      highlights: [],
    },
  ],
  certifications: [
    "Project Management Professional (PMP)",
    "Agile Certified Practitioner (PMI-ACP)",
    "Professional Engineer (PE)",
    "System Engineering Specialization (University of Colorado Boulder)",
    "Engineering Management Specialization (Rice University)",
    "Project Management Specialization (Google)",
    "Fighter Aircraft Type Rating Course",
    "AWACS Aircraft Type Rating Course",
    "Basic Staff Course",
    "Senior Command & Staff Course",
  ],
};

const LINKEDIN_FIXTURE: ParsedCV = {
  total_experience_years: 18,
  experience: [
    {
      company: "National University of Sciences and Technology (NUST)",
      title: "Assistant Professor",
      start_date: "Jan 2025",
      end_date: "Present",
      duration_months: 5,
      technologies_used: ["MBSE"],
      metrics_mentioned: [],
      domain: "academia",
    },
    {
      company: "National University of Technology (NUTECH)",
      title: "Assistant Director Quality",
      start_date: "Sep 2022",
      end_date: "Dec 2025",
      duration_months: 39,
      technologies_used: ["ISO", "OBE"],
      metrics_mentioned: ["first ever capacity enhancement audit"],
      domain: "academia",
    },
    {
      company: "Pakistan Air Force",
      title: "Deputy Program Manager",
      start_date: "Jan 2020",
      end_date: "Sep 2022",
      duration_months: 33,
      technologies_used: ["RAID", "EVM"],
      metrics_mentioned: ["28 avionics and weapons subsystems"],
      domain: "defense",
    },
    {
      company: "AVIC International Holding Corporation",
      title: "Aerospace Systems Integration Lead",
      start_date: "Nov 2017",
      end_date: "Dec 2019",
      duration_months: 25,
      technologies_used: [],
      metrics_mentioned: [],
      domain: "defense",
    },
    {
      company: "Government of Pakistan",
      title: "Maintenance Support Engineer",
      start_date: "Jan 2016",
      end_date: "Nov 2017",
      duration_months: 22,
      technologies_used: ["MTBF/MTTR"],
      metrics_mentioned: ["fleet reliability above 90%"],
      domain: "government",
    },
    {
      company: "Pakistan Aeronautical Complex Kamra",
      title: "Integrated Systems & Design Specialist",
      start_date: "Oct 2008",
      end_date: "Oct 2013",
      duration_months: 60,
      technologies_used: [],
      metrics_mentioned: ["multi-million dollar revenue", "exports"],
      domain: "defense",
    },
  ],
  skills: {
    languages: [],
    frameworks: ["Agile", "OBE"],
    infrastructure: [],
    databases: [],
    tools: ["RAID", "EVM", "MBSE"],
    other: [
      "Program Management", "Systems Integration", "Quality Assurance",
      "Academic Standards", "ISO Certification", "Capacity Enhancement",
      "Avionics", "Weapons Systems", "Risk Management",
      "Spares Planning", "Vendor Contracts", "MTBF/MTTR",
      "Fleet Reliability", "Platform Modernization",
    ],
  },
  all_technologies: ["MBSE", "ISO", "OBE", "RAID", "EVM", "MTBF/MTTR", "Agile"],
  education: [
    {
      institution: "College of Aeronautical Engineering Risalpur",
      degree: "BE",
      field: "Aerospace, Aeronautical and Astronautical Engineering",
      start_year: 2004,
      end_year: 2008,
      research_topic: null,
      highlights: [],
    },
    {
      institution: "Air University",
      degree: "MS",
      field: "Signals and Image Processing",
      start_year: 2013,
      end_year: 2015,
      research_topic: null,
      highlights: [],
    },
  ],
  certifications: [
    "Project Management Professional (PMP)",
    "Agile Certified Practitioner (PMI-ACP)",
    "Google Project Management Certificate",
    "Engineering Project Management Specialization (Rice University)",
    "Introduction to Systems Engineering Specialization (University of Colorado Boulder)",
  ],
};

// ============================================================
// MAIN: Extract text → save fixture with matching hash
// ============================================================

const FILE_FIXTURE_MAP: Array<{ filename: string; fixture: ParsedCV }> = [
  { filename: "Resume SE_Jan26.pdf", fixture: SE_FIXTURE },
  { filename: "Resume PM_Jan26.pdf", fixture: PM_FIXTURE },
  { filename: "Resume KSA-ME_JAN25.pdf", fixture: KSA_ME_FIXTURE },
  { filename: "Resume of BE_Jan26.pdf", fixture: BE_FIXTURE },
  { filename: "Profile_Linkedin.pdf", fixture: LINKEDIN_FIXTURE },
];

async function extractText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require("pdf-parse") as any;
  const parser = new PDFParse(new Uint8Array(buffer));
  const pdfData = await parser.getText();
  return pdfData.text ?? pdfData.pages.map((p: { text: string }) => p.text).join("\n");
}

async function main() {
  console.log("Seeding CV parse fixtures from Alpha CVs...\n");

  // Ensure directories exist
  const responsesDir = path.join(DEV_DATA_DIR, "responses");
  if (!fs.existsSync(responsesDir)) {
    fs.mkdirSync(responsesDir, { recursive: true });
  }

  let success = 0;
  for (const { filename, fixture } of FILE_FIXTURE_MAP) {
    const filePath = path.join(ALPHA_CVS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${filename} not found`);
      continue;
    }

    process.stdout.write(`  ${filename}... `);
    try {
      const text = await extractText(filePath);
      if (text.trim().length < 50) {
        console.log("SKIP (no text)");
        continue;
      }

      // This saves using the same hash the runtime will compute
      saveDevParsedCV(text, fixture);

      console.log(
        `OK — ${fixture.experience.length} roles, ` +
        `${fixture.total_experience_years}yr, ` +
        `${fixture.all_technologies.length} techs`
      );
      success++;
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone: ${success}/${FILE_FIXTURE_MAP.length} fixtures seeded.`);
  console.log(`Location: ${responsesDir}/`);
  console.log("\nDev-mode parseCV() will now return production-quality output for these CVs.");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
