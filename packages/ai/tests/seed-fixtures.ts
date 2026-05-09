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
  skills: [
    { name: "Agile", domain: "management", category: "methodology", source: "experience" },
    { name: "Hybrid Delivery", domain: "management", category: "methodology", source: "experience" },
    { name: "V-Model", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "AMOS", domain: "maintenance_engineering", category: "mro_systems", source: "experience" },
    { name: "SAP", domain: "technology", category: "enterprise_software", source: "experience" },
    { name: "Power BI", domain: "technology", category: "tool", source: "experience" },
    { name: "MS Project", domain: "management", category: "project_management", source: "experience" },
    { name: "JIRA", domain: "technology", category: "tool", source: "experience" },
    { name: "Earned Value Management", domain: "management", category: "project_management", source: "experience" },
    { name: "Systems Integration", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "Configuration Management", domain: "management", category: "configuration_management", source: "experience" },
    { name: "FMECA", domain: "maintenance_engineering", category: "reliability", source: "experience" },
    { name: "LORA", domain: "maintenance_engineering", category: "logistics", source: "experience" },
    { name: "Reliability Centered Maintenance", domain: "maintenance_engineering", category: "reliability", source: "experience" },
    { name: "Airworthiness Compliance", domain: "defense_aerospace", category: "airworthiness", source: "experience" },
    { name: "Root Cause Analysis", domain: "management", category: "quality_assurance", source: "experience" },
    { name: "MTBF/MTTR Analysis", domain: "maintenance_engineering", category: "reliability", source: "experience" },
    { name: "Risk Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Stakeholder Management", domain: "management", category: "stakeholder_management", source: "experience" },
    { name: "Flight Test", domain: "defense_aerospace", category: "test_evaluation", source: "experience" },
    { name: "Avionics", domain: "defense_aerospace", category: "avionics", source: "experience" },
    { name: "Requirements Analysis", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "Program Management", domain: "management", category: "program_management", source: "experience" },
  ],
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
  skills: [
    { name: "Agile", domain: "management", category: "methodology", source: "experience" },
    { name: "Hybrid Delivery", domain: "management", category: "methodology", source: "experience" },
    { name: "Iterative Planning", domain: "management", category: "methodology", source: "experience" },
    { name: "AMOS", domain: "maintenance_engineering", category: "mro_systems", source: "experience" },
    { name: "Power BI", domain: "technology", category: "tool", source: "experience" },
    { name: "MS Project", domain: "management", category: "project_management", source: "experience" },
    { name: "JIRA", domain: "technology", category: "tool", source: "experience" },
    { name: "Earned Value Management", domain: "management", category: "project_management", source: "experience" },
    { name: "RAID Log Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Program Management", domain: "management", category: "program_management", source: "experience" },
    { name: "Stakeholder Management", domain: "management", category: "stakeholder_management", source: "experience" },
    { name: "Risk Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Systems Integration", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "CNS/ATM Systems", domain: "defense_aerospace", category: "avionics", source: "experience" },
    { name: "Spares Planning", domain: "maintenance_engineering", category: "logistics", source: "experience" },
    { name: "Depot Coordination", domain: "maintenance_engineering", category: "mro_systems", source: "experience" },
    { name: "Supplier Management", domain: "management", category: "procurement", source: "experience" },
    { name: "MTBF/MTTR Analysis", domain: "maintenance_engineering", category: "reliability", source: "experience" },
    { name: "Cost Control", domain: "management", category: "project_management", source: "experience" },
    { name: "Avionics", domain: "defense_aerospace", category: "avionics", source: "experience" },
    { name: "Flight Test", domain: "defense_aerospace", category: "test_evaluation", source: "experience" },
    { name: "Platform Modernization", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
  ],
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
  skills: [
    { name: "Agile", domain: "management", category: "methodology", source: "experience" },
    { name: "AMOS", domain: "maintenance_engineering", category: "mro_systems", source: "experience" },
    { name: "Power BI", domain: "technology", category: "tool", source: "experience" },
    { name: "Earned Value Management", domain: "management", category: "project_management", source: "experience" },
    { name: "RAID Log Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Avionics Systems", domain: "defense_aerospace", category: "avionics", source: "experience" },
    { name: "Systems Integration", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "Configuration Management", domain: "management", category: "configuration_management", source: "experience" },
    { name: "Predictive Maintenance", domain: "maintenance_engineering", category: "reliability", source: "experience" },
    { name: "MTBF/MTTR Analysis", domain: "maintenance_engineering", category: "reliability", source: "experience" },
    { name: "C-Check Management", domain: "maintenance_engineering", category: "mro_systems", source: "experience" },
    { name: "Airworthiness Directives", domain: "defense_aerospace", category: "airworthiness", source: "experience" },
    { name: "Service Bulletin Compliance", domain: "defense_aerospace", category: "airworthiness", source: "experience" },
    { name: "CAMO/AMO Operations", domain: "defense_aerospace", category: "airworthiness", source: "experience" },
    { name: "Work Package Design", domain: "maintenance_engineering", category: "mro_systems", source: "experience" },
    { name: "Contract Negotiation", domain: "management", category: "procurement", source: "experience" },
    { name: "Maintenance Planning", domain: "maintenance_engineering", category: "fleet_operations", source: "experience" },
    { name: "Fleet Management", domain: "maintenance_engineering", category: "fleet_operations", source: "experience" },
    { name: "Program Management", domain: "management", category: "program_management", source: "experience" },
    { name: "Stakeholder Management", domain: "management", category: "stakeholder_management", source: "experience" },
  ],
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
  skills: [
    { name: "Agile", domain: "management", category: "methodology", source: "experience" },
    { name: "Earned Value Management", domain: "management", category: "project_management", source: "experience" },
    { name: "RAID Log Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Systems Engineering", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "Strategy-to-Execution Planning", domain: "management", category: "strategic_planning", source: "experience" },
    { name: "Requirements Definition", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "Airworthiness Certification", domain: "defense_aerospace", category: "airworthiness", source: "experience" },
    { name: "International Defense Collaboration", domain: "defense_aerospace", category: "international_cooperation", source: "experience" },
    { name: "Multi-national Defense Programs", domain: "defense_aerospace", category: "program_management", source: "experience" },
    { name: "Technology Roadmap Development", domain: "management", category: "strategic_planning", source: "experience" },
    { name: "Workforce Strategy", domain: "management", category: "leadership", source: "experience" },
    { name: "Program Management", domain: "management", category: "program_management", source: "experience" },
    { name: "Risk Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Stakeholder Management", domain: "management", category: "stakeholder_management", source: "experience" },
    { name: "Platform Modernization", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "AEW&C Fleet Sustainment", domain: "defense_aerospace", category: "fleet_operations", source: "experience" },
  ],
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
  skills: [
    { name: "Agile", domain: "management", category: "methodology", source: "experience" },
    { name: "Outcome-Based Education", domain: "education", category: "academic_standards", source: "experience" },
    { name: "RAID Log Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Earned Value Management", domain: "management", category: "project_management", source: "experience" },
    { name: "Model-Based Systems Engineering", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "Program Management", domain: "management", category: "program_management", source: "experience" },
    { name: "Systems Integration", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
    { name: "Quality Assurance", domain: "management", category: "quality_assurance", source: "experience" },
    { name: "Academic Standards & Accreditation", domain: "education", category: "academic_standards", source: "experience" },
    { name: "ISO Certification", domain: "management", category: "quality_assurance", source: "experience" },
    { name: "Capacity Enhancement", domain: "management", category: "strategic_planning", source: "experience" },
    { name: "Avionics", domain: "defense_aerospace", category: "avionics", source: "experience" },
    { name: "Weapons Systems", domain: "defense_aerospace", category: "weapons_systems", source: "experience" },
    { name: "Risk Management", domain: "management", category: "risk_management", source: "experience" },
    { name: "Spares Planning", domain: "maintenance_engineering", category: "logistics", source: "experience" },
    { name: "Vendor Contract Management", domain: "management", category: "procurement", source: "experience" },
    { name: "MTBF/MTTR Analysis", domain: "maintenance_engineering", category: "reliability", source: "experience" },
    { name: "Fleet Reliability Management", domain: "maintenance_engineering", category: "fleet_operations", source: "experience" },
    { name: "Platform Modernization", domain: "defense_aerospace", category: "systems_engineering", source: "experience" },
  ],
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
