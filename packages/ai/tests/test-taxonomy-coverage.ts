/**
 * Taxonomy Coverage Test
 *
 * Extracts all identifiable skills from Alpha CVs (2 users, 2 professions)
 * and runs them through classifySkill() to measure miss rate.
 *
 * A "miss" = classifySkill returns { domain: "general", category: "general" }
 * meaning the taxonomy has no mapping for that skill.
 *
 * Run: npx tsx packages/ai/tests/test-taxonomy-coverage.ts
 */

import { classifySkill } from "../src/taxonomy";

// ============================================================
// USER 1: Military / Aerospace / Program Management (5 CVs)
// Skills extracted manually from all 5 CVs + LinkedIn
// ============================================================
const USER1_SKILLS = [
  // Defense & Aerospace
  "avionics", "systems engineering", "systems integration", "airworthiness",
  "defense programs", "mil-std-1553", "do-178c", "do-254",
  "radar systems", "electronic warfare", "FMECA", "LORA", "RCM",
  "AEW&C", "ERIEYE", "F-16", "Mirage", "K-8",
  "flight safety", "aircraft modification", "avionics upgrade",
  "weapon systems", "mission systems", "ground support equipment",
  "test and evaluation", "operational testing", "acceptance testing",
  "air defense", "command and control", "C4ISR",
  "technical publications", "technical documentation",
  "ILS", "integrated logistics support", "obsolescence management",

  // Program & Project Management
  "program management", "project management", "portfolio management",
  "stakeholder management", "contract management", "vendor management",
  "procurement", "budgeting", "risk management", "EVM",
  "earned value management", "work breakdown structure", "WBS",
  "schedule management", "cost management", "change management",
  "requirements management", "configuration management",
  "milestone tracking", "gate reviews", "decision analysis",

  // Quality & Compliance
  "quality assurance", "quality management", "audit",
  "iso 9001", "as9100", "safety management",
  "export certification", "regulatory compliance",
  "continuous improvement", "root cause analysis",

  // Maintenance & Reliability
  "fleet management", "aircraft maintenance", "predictive maintenance",
  "reliability engineering", "fault diagnosis", "MRO",
  "depot level maintenance", "organizational level maintenance",
  "maintenance planning", "serviceability", "mission readiness",

  // Leadership & Strategy
  "team leadership", "strategic planning", "cross-functional",
  "training", "supervision", "communication",
  "business development", "international cooperation",
  "technology transfer", "capacity building",
  "academia", "curriculum development", "outcome based education",
  "faculty development", "accreditation",

  // Certifications & Frameworks
  "PMP", "CSEP", "INCOSE", "agile", "prince2",
  "six sigma", "lean",

  // Tools
  "SAP", "MS Project", "DOORS", "AMOS",
  "Primavera", "JIRA", "SharePoint",
  "MATLAB", "Simulink",

  // Soft / Transferable
  "negotiation", "conflict resolution", "briefing",
  "multinational team management", "OEM liaison",
  "offset management", "technology acquisition",
  "policy development", "SOP development",
];

// ============================================================
// USER 2: Anesthesiologist / ICU / AHA Instructor (4 CVs)
// Skills extracted manually from all 4 CVs
// ============================================================
const USER2_SKILLS = [
  // Clinical / Medical
  "anesthesiology", "anesthesia", "intensive care",
  "critical care", "ICU management", "perioperative care",
  "airway management", "difficult airway", "intubation",
  "regional anaesthesia", "general anesthesia",
  "pain management", "sedation", "ventilator management",
  "hemodynamic monitoring", "arterial line", "central line",
  "patient stabilization", "emergency medicine",
  "trauma management", "cardiac arrest management",
  "obstetric anesthesia", "pediatric anesthesia",
  "neuro anesthesia", "thoracic anesthesia",
  "ASA classification", "preoperative assessment",
  "postoperative care", "recovery room management",

  // Procedures & Techniques
  "Whipple procedure", "craniotomy", "esophagectomy",
  "tracheal resection", "video-assisted intubation",
  "CFAM", "nerve blocks", "spinal anesthesia",
  "epidural", "ultrasound-guided procedures",

  // Emergency / Resuscitation
  "ACLS", "BLS", "PALS",
  "advanced cardiovascular life support",
  "basic life support", "pediatric advanced life support",
  "resuscitation", "CPR", "defibrillation",
  "emergency response", "code blue management",

  // Training & Instruction
  "AHA instructor", "course director",
  "medical education", "clinical teaching",
  "simulation training", "mentoring",
  "instructor essentials", "training program development",
  "healthcare professional training",

  // Research
  "clinical research", "biostatistics",
  "research methodology", "epidemiology",
  "publication", "journal article",
  "pain research", "asthma research",
  "evidence-based medicine",

  // Certifications & Licenses
  "FCPS", "MBBS", "PMDC license",
  "SCFHS", "medical license",
  "BASIC certification",

  // Healthcare Systems
  "hospital administration", "department management",
  "multidisciplinary team", "patient safety",
  "infection control", "quality improvement",
  "clinical protocols", "standard operating procedures",
  "electronic health records", "EHR",

  // Soft / Professional
  "crisis management", "decision making under pressure",
  "team coordination", "patient communication",
  "ethical medical practice", "informed consent",
  "continuing medical education", "CME",
];

// ============================================================
// RUN THE TEST
// ============================================================

interface SkillResult {
  skill: string;
  domain: string;
  category: string;
  hit: boolean;
}

function runTest(label: string, skills: string[]): SkillResult[] {
  const results: SkillResult[] = [];

  for (const skill of skills) {
    const { domain, category } = classifySkill(skill);
    results.push({
      skill,
      domain,
      category,
      hit: domain !== "general" || category !== "general",
    });
  }

  return results;
}

function printReport(label: string, results: SkillResult[]) {
  const hits = results.filter(r => r.hit);
  const misses = results.filter(r => !r.hit);
  const total = results.length;
  const hitRate = ((hits.length / total) * 100).toFixed(1);
  const missRate = ((misses.length / total) * 100).toFixed(1);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`${label}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Total skills tested: ${total}`);
  console.log(`Hits (classified):   ${hits.length} (${hitRate}%)`);
  console.log(`Misses (general):    ${misses.length} (${missRate}%)`);

  if (misses.length > 0) {
    console.log(`\nMISSED SKILLS (fell through to general/general):`);
    for (const m of misses) {
      console.log(`  - "${m.skill}"`);
    }
  }

  // Domain distribution for hits
  const domainCounts = new Map<string, number>();
  for (const h of hits) {
    domainCounts.set(h.domain, (domainCounts.get(h.domain) ?? 0) + 1);
  }
  console.log(`\nDomain distribution (hits):`);
  const sorted = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [domain, count] of sorted) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${domain.padEnd(25)} ${String(count).padStart(3)} (${pct}%)`);
  }

  // Check for misclassifications (partial matches that went to wrong domain)
  console.log(`\nPOTENTIAL MISCLASSIFICATIONS (verify these):`);
  const suspicious = results.filter(r => {
    if (!r.hit) return false;
    // Medical skills landing in non-healthcare domains
    if (/anesthes|clinical|patient|medical|ICU|surgical|hospital/i.test(r.skill) && r.domain !== "healthcare") return true;
    // Military skills landing in non-defense domains
    if (/weapon|radar|aircraft|F-16|Mirage|AEW|mil-std|defense|defence/i.test(r.skill) && r.domain !== "defense_aerospace") return true;
    return false;
  });
  if (suspicious.length === 0) {
    console.log(`  None detected`);
  } else {
    for (const s of suspicious) {
      console.log(`  - "${s.skill}" → ${s.domain}/${s.category} (expected different domain)`);
    }
  }
}

// Run both users
const user1Results = runTest("USER 1: Military/Aerospace/PM", USER1_SKILLS);
const user2Results = runTest("USER 2: Anesthesiologist/ICU/AHA", USER2_SKILLS);
const allResults = [...user1Results, ...user2Results];

printReport("USER 1: Military/Aerospace/Program Management (5 CVs)", user1Results);
printReport("USER 2: Anesthesiologist/ICU/AHA Instructor (4 CVs)", user2Results);
printReport("COMBINED: Both Users (9 CVs, 2 professions)", allResults);

// Summary
console.log(`\n${"=".repeat(70)}`);
console.log("VERDICT");
console.log(`${"=".repeat(70)}`);
const totalMisses = allResults.filter(r => !r.hit).length;
const totalTests = allResults.length;
const overallMissRate = ((totalMisses / totalTests) * 100).toFixed(1);
console.log(`Overall miss rate: ${overallMissRate}% (${totalMisses}/${totalTests})`);

if (parseFloat(overallMissRate) < 10) {
  console.log(`340 taxonomy entries are SUFFICIENT for these 2 professions.`);
} else if (parseFloat(overallMissRate) < 20) {
  console.log(`340 entries are MARGINAL. Add targeted entries for missed skills.`);
} else {
  console.log(`340 entries are INSUFFICIENT. Major gaps in domain coverage.`);
}

// Categorize misses by what domain they SHOULD be in
console.log(`\nMISSED SKILLS BY EXPECTED DOMAIN (for targeted expansion):`);
const user1Misses = user1Results.filter(r => !r.hit).map(r => r.skill);
const user2Misses = user2Results.filter(r => !r.hit).map(r => r.skill);
if (user1Misses.length > 0) {
  console.log(`\n  Defense/Aerospace/PM gaps (${user1Misses.length}):`);
  for (const s of user1Misses) console.log(`    - "${s}"`);
}
if (user2Misses.length > 0) {
  console.log(`\n  Healthcare/Medical gaps (${user2Misses.length}):`);
  for (const s of user2Misses) console.log(`    - "${s}"`);
}
