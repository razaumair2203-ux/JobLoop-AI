/**
 * REAL Pipeline Test — Human Input Edition
 *
 * This script runs the ACTUAL pipeline code with REAL user answers
 * collected during the May 4 2026 session.
 *
 * Flow:
 *   1. Feed 5 simulated Haiku parse outputs into conflict detector (real code)
 *   2. Show conflicts detected (real code)
 *   3. Feed REAL user answers through answer parser
 *      - In dev mode: saves prompt, we process it, save response
 *      - In API mode: calls Haiku/Sonnet directly
 *   4. Merge resolved data into ProfileCloud (real code)
 *   5. Validate output
 *
 * Run: npx tsx packages/ai/tests/real-pipeline-test.ts
 */

import {
  detectConflicts,
  type ConflictReport,
} from "../src/conflict-detector";

import {
  detectComplexitySignals,
  selectModelTier,
  parseAnswer,
  saveAnswerParseResponse,
  type AnswerParseResult,
  type ParsedRoleFromAnswer,
} from "../src/answer-parser";

import { mergeResolvedProfile, type ResolvedProfile } from "../src/resolution-merger";
import { setProvider } from "../src/provider";

// ============================================================
// STEP 0: Configure dev mode
// ============================================================

setProvider("dev", "./dev-data");

// ============================================================
// STEP 1: Simulated Haiku parse outputs (what Haiku WOULD return)
// These are the 5 CVs parsed independently — same data as before.
// ============================================================

const parsedCVs = [
  {
    id: "cv-se",
    name: "SE CV (Systems Engineer)",
    roles: [
      { title: "Program Lead, Professional Education", company: "College of Aeronautical Engineering & NUTECH University", start_date: "Jan 2023", end_date: "Present", bullets: ["Professional education initiatives", "HEC capacity building", "60+ projects", "AI/ML research", "Industry partnerships"] },
      { title: "Dy Director, Program Management Office", company: "Air Force PMO", start_date: "Jan 2020", end_date: "Dec 2023", bullets: ["PMO governance", "RAID logs", "EVM reporting", "Fleet management", "C-check contracts", "Airworthiness"] },
      { title: "Lead Systems Integration Expert", company: "Chengdu Aircraft Design Institute (CADI), China", start_date: "Jan 2018", end_date: "Dec 2020", bullets: ["SE Lead", "Avionics integration", "Requirements analysis", "Technical interface"] },
      { title: "Maintenance Support Engineer (AEW&C)", company: "AEW&C Squadron", start_date: "Jan 2016", end_date: "Dec 2017", bullets: ["Flight-line maintenance", "MTBF/MTTR analysis", "Team of 80", "Airworthiness directives"] },
      { title: "Integrated Systems & Design Specialist", company: "Pakistan Aeronautical Complex (PAC), Kamra", start_date: "Oct 2008", end_date: "Oct 2013", bullets: ["Glass cockpit modification", "JF-17 avionics", "Backup Mission Computer", "$1.27M savings", "Trainer aircraft export"] },
    ],
    education: [
      { institution: "National University of Sciences and Technology (NUST)", degree: "BE", field: "Avionics Engineering", start_year: 2004, end_year: 2008 },
      { institution: "Institute of Space Technology (IST) / NUST", degree: "MS", field: "Signal & Image Processing", start_year: 2013, end_year: 2015 },
    ],
    certifications: [
      "PMP (Project Management Professional)",
      "PSM-I (Professional Scrum Master)",
      "CSEP (Certified Systems Engineering Professional)",
      "ISO 9001:2015 Lead Auditor",
      "Six Sigma Green Belt",
      "AWS Cloud Practitioner",
      "MATLAB Onramp Certificate",
      "IPC-A-610 Acceptability of Electronic Assemblies",
      "NDT Level II (Non-Destructive Testing)",
      "Aircraft Maintenance License (AML) — Type Rating",
    ],
  },
  {
    id: "cv-pm",
    name: "PM CV (Project Management)",
    roles: [
      { title: "Program Lead, Professional Education", company: "College of Aeronautical Engineering & NUTECH University", start_date: "Jan 2023", end_date: "Present", bullets: ["Professional education", "Quality assurance"] },
      { title: "Deputy Director Avionics, PMO", company: "Air Force PMO", start_date: "Jan 2020", end_date: "Dec 2023", bullets: ["PMO governance", "Stakeholder coordination"] },
      { title: "Aerospace Systems Integration Lead", company: "Chengdu Aircraft Design Institute (CADI), China", start_date: "Jan 2018", end_date: "Dec 2020", bullets: ["International collaboration", "Agile delivery"] },
      { title: "Engineering Operations Manager", company: "AEW&C Squadron", start_date: "Jan 2016", end_date: "Dec 2018", bullets: ["Operations management", "Maintenance planning"] },
      { title: "Systems Engineering & Integration Engineer", company: "Pakistan Aeronautical Complex (PAC), Kamra", start_date: "Oct 2008", end_date: "Oct 2013", bullets: ["Systems integration", "Configuration management"] },
    ],
    education: [
      { institution: "National University of Sciences and Technology (NUST)", degree: "BE", field: "Avionics Engineering", start_year: 2004, end_year: 2008 },
      { institution: "Institute of Space Technology (IST)", degree: "MS", field: "Signal & Image Processing", start_year: 2013, end_year: 2014 },
    ],
    certifications: [
      "PMP (Project Management Professional)",
      "PSM-I (Professional Scrum Master)",
      "CSEP (Certified Systems Engineering Professional)",
    ],
  },
  {
    id: "cv-ksa",
    name: "KSA-ME CV (Maintenance)",
    roles: [
      { title: "Program Lead, Avionics Systems Design", company: "Aerospace & Defence / Systems Development", start_date: "Jan 2023", end_date: "Present", bullets: ["Avionics design", "Systems development"] },
      { title: "Deputy Director, Fighter Fleet Management", company: "Air Force", start_date: "Jan 2020", end_date: "Dec 2023", bullets: ["Fleet management", "Fighter operations"] },
      { title: "Avionics Systems Integration Lead", company: "Chengdu Aircraft Design Institute (CADI), China", start_date: "Jan 2018", end_date: "Dec 2019", bullets: ["Avionics integration", "Design rig testing"] },
      { title: "Maintenance Supervisor, AEW&C Aircraft", company: "Air Force", start_date: "Jan 2016", end_date: "Dec 2018", bullets: ["Supervised 80 engineers", "AMOS", "Maintenance management"] },
      { title: "Maintenance & Systems Engineer", company: "Pakistan Aeronautical Complex (PAC), Kamra", start_date: "Oct 2008", end_date: "Oct 2013", bullets: ["Maintenance engineering", "Systems design"] },
    ],
  },
  {
    id: "cv-be",
    name: "BE CV (Strategy & Defense)",
    roles: [
      { title: "Program Lead, Professional Education", company: "College of Aeronautical Engineering & NUTECH University", start_date: "Jan 2023", end_date: "Present", bullets: ["Professional education", "Research coordination"] },
      { title: "Deputy Director Avionics, PMO", company: "Air Force PMO", start_date: "Jan 2020", end_date: "Dec 2023", bullets: ["PMO governance", "Production oversight"] },
      { title: "Aerospace Systems Integration Lead", company: "Chengdu Aircraft Design Institute (CADI), China", start_date: "Jan 2018", end_date: "Dec 2020", bullets: ["Systems integration", "International development"] },
      { title: "Engineering Operations Manager", company: "Air Force AEW&C", start_date: "Jan 2016", end_date: "Dec 2018", bullets: ["Engineering operations", "Technical management"] },
      { title: "Systems Engineering & Integration Engineer", company: "Pakistan Aeronautical Complex (PAC), Kamra", start_date: "Oct 2008", end_date: "Oct 2013", bullets: ["Systems engineering", "Design specialist"] },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn Profile",
    roles: [
      { title: "Assistant Professor", company: "NUST (College of Aeronautical Engineering)", start_date: "Jan 2025", end_date: "Present", bullets: ["Research", "Teaching"] },
      { title: "Assistant Director Quality", company: "NUTECH", start_date: "Sep 2022", end_date: "Dec 2025", bullets: ["Quality assurance", "Accreditation"] },
      { title: "Deputy Program Manager", company: "Pakistan Air Force", start_date: "Jan 2020", end_date: "Sep 2022", bullets: ["Program management", "JF-17"] },
      { title: "Aerospace Systems Integration Lead", company: "AVIC International (CADI China)", start_date: "Nov 2017", end_date: "Dec 2019", bullets: ["Systems integration", "Joint development"] },
      { title: "Maintenance Support Engineer", company: "Government of Pakistan", start_date: "Jan 2016", end_date: "Nov 2017", bullets: ["AEW&C maintenance", "Flight-line support"] },
      { title: "Integrated Systems & Design Specialist", company: "PAC Kamra", start_date: "Oct 2008", end_date: "Oct 2013", bullets: ["Systems design", "Aircraft integration"] },
    ],
    education: [
      { institution: "NUST", degree: "BE", field: "Avionics Engineering", dates: "2004-2008" },
      { institution: "IST / NUST", degree: "MS", field: "Signal & Image Processing", dates: "Sep 2013 - Sep 2015" },
    ],
  },
];

// ============================================================
// STEP 2: Run REAL conflict detection
// ============================================================

console.log("=" .repeat(70));
console.log("STEP 1: CONFLICT DETECTION (real code — detectConflicts())");
console.log("=" .repeat(70));

const report: ConflictReport = detectConflicts(parsedCVs);

console.log(`\nDocuments analyzed: ${report.stats.documents_analyzed}`);
console.log(`Total roles parsed: ${report.stats.total_roles_parsed}`);
console.log(`Unique roles detected: ${report.unique_roles_detected}`);
console.log(`Conflicts found: ${report.stats.conflicts_found}`);
console.log(`Gaps found: ${report.stats.gaps_found}`);
console.log(`Employer groups: ${report.stats.employer_groups_found}`);

console.log("\n--- Conflicts ---");
for (const c of report.conflicts) {
  console.log(`  [${c.type}] ${c.id}: ${c.description.slice(0, 120)}`);
}

console.log("\n--- Gaps ---");
for (const g of report.gaps) {
  console.log(`  ${g.gap_months}mo gap: ${g.prompt.slice(0, 120)}`);
}

console.log("\n--- Employer Groups ---");
for (const eg of report.employer_groups) {
  console.log(`  ${eg.employer}: ${eg.roles.length} roles, rotational=${eg.is_rotational}`);
  console.log(`    ${eg.prompt.slice(0, 120)}`);
}

// ============================================================
// STEP 3: REAL user answers (collected May 4, 2026)
// ============================================================

console.log("\n" + "=" .repeat(70));
console.log("STEP 2: COMPLEXITY ANALYSIS OF REAL USER ANSWERS");
console.log("=" .repeat(70));

const realAnswers = [
  {
    id: "Q1",
    question: "All your roles appear to be at government/military organizations. Were all of these Pakistan Air Force postings or secondments under one employer?",
    answer: "Yes — all PAF",
    type: "option" as const,
  },
  {
    id: "Q2",
    question: "Your 2020-2023 period appears as ONE role on all 4 CVs. During Jan 2020 - Sep 2022, were you in the same PMO assignment the entire time?",
    answer: `thanks for pointing it out , you look like a good app. i came back from china in dec-2019 . from jan 2020 to June 2021 i was assistant director development in PMO of JF-17 . main task was air worthiness, weapons integration, testing , and at the same time its operationalization was being done so active liason with chinese designer, equipment, OEMS, operations squadron. then was was senior engineering officer of crotale weapons system - an out of system field apointment which is necessary for milestone of armed forced. here was sensior maintenance engineer , supervisong technicians, officers, and weapons deployment of missle, maintenance mangement and resources management. then - here i was june 2021 to sept 2022 .. then i was promoted to deputy director -got back to JF-17 PMO , but now main task was operationalization, and management of operational fleet of aircraft from forecasting of spares , to contracting, making sure operational readiness of squadrons, and maintenance facilities in the filed are top nothch.. here i was from sept-2022 till dec 2023 .. then i was sent to nutech .. where i was QA officer .. academic QA .. you can check what they does .. this is out of main domain appointment but this is liek tht... and then from july 2025 in am in college of aeronautical engineering .. looking after projects , research and development, system engineering courses ... i tought system enginereing in nutech also. .. but things seemed quite jumpy - ididnt mention some things.. this is whole picture .. i want you to seamlessly integrate. and also look up which skills and tools are used in these seetings. include them in cv after my approval`,
    type: "freetext" as const,
  },
  {
    id: "Q3",
    question: "Your AEW&C role dates differ. Your China role dates differ. Can you confirm the precise months for both?",
    answer: "AEW&C maintenance engineer from Dec-2015 to Nov-2017. Nov-2017 to Dec-2019 CHina -CADI",
    type: "freetext" as const,
  },
  {
    id: "Q4",
    question: "Your roles have different titles across CVs. For PAC Kamra (2008-13), AEW&C (2015-17), and first PMO role - which titles are most accurate?",
    answer: `i was involved in deisgn development, took a big project of glass cockpit modification of super mushshak - first one in country. involved in sub system development of JF-17 avionics and also flight testing of mushshak and JF-17. these CVs were for different roles hence some wording were changed. my deisgned was actualy System Design Engineer actually over there.`,
    type: "freetext" as const,
  },
  {
    id: "Q5",
    question: "AEW&C title and first PMO title - confirm?",
    answer: "AEW&C - Maintenance Support Engineer. First role in PMo - Assitant Director Development (Avionics), PMO was the department",
    type: "freetext" as const,
  },
  {
    id: "Q6",
    question: "Your MS degree shows 2013 on most CVs but 2014 on KSA-ME. LinkedIn says Sep 2013 - Sep 2015. Which is correct?",
    answer: "real time was Sept-2013 to Dec-2015",
    type: "freetext" as const,
  },
];

// Analyze complexity of each answer
for (const a of realAnswers) {
  if (a.type === "option") {
    console.log(`\n  ${a.id}: Option selected → NO LLM needed ($0)`);
    continue;
  }

  const { tier, signals } = selectModelTier(a.answer);
  console.log(`\n  ${a.id}: Free text (${a.answer.length} chars)`);
  console.log(`    Model tier: ${tier === "quality" ? "SONNET" : "HAIKU"}`);
  console.log(`    Signals: ${signals.length > 0 ? signals.join(", ") : "none → Haiku"}`);
}

// ============================================================
// STEP 4: Parse answers (dev mode — save prompts)
// ============================================================

console.log("\n" + "=" .repeat(70));
console.log("STEP 3: ANSWER PARSING (dev mode)");
console.log("=" .repeat(70));

async function runParsing() {
  // Q1: Option — no parsing needed
  console.log("\n  Q1: Direct mapping → employer = 'Pakistan Air Force', single = true");

  // Q2: Complex free text — should trigger Sonnet
  console.log("\n  Q2: Parsing with answer-parser...");
  const q2Result = await parseAnswer(
    realAnswers[1].question,
    realAnswers[1].answer,
  );
  console.log(`    Result: ${q2Result.flags.join(", ") || "parsed"}`);
  if (q2Result.roles.length > 0) {
    console.log(`    Roles extracted: ${q2Result.roles.length}`);
    for (const r of q2Result.roles) {
      console.log(`      → ${r.title} at ${r.organization} (${r.start_date} — ${r.end_date})`);
    }
  }

  // Q3: Short free text — should trigger Haiku
  console.log("\n  Q3: Parsing with answer-parser...");
  const q3Result = await parseAnswer(
    realAnswers[2].question,
    realAnswers[2].answer,
  );
  console.log(`    Result: ${q3Result.flags.join(", ") || "parsed"}`);

  // Q4: Medium free text — check tier
  console.log("\n  Q4: Parsing with answer-parser...");
  const q4Result = await parseAnswer(
    realAnswers[3].question,
    realAnswers[3].answer,
  );
  console.log(`    Result: ${q4Result.flags.join(", ") || "parsed"}`);

  // Q5: Short free text
  console.log("\n  Q5: Parsing with answer-parser...");
  const q5Result = await parseAnswer(
    realAnswers[4].question,
    realAnswers[4].answer,
  );
  console.log(`    Result: ${q5Result.flags.join(", ") || "parsed"}`);

  // Q6: Short free text — date correction
  console.log("\n  Q6: Parsing with answer-parser...");
  const q6Result = await parseAnswer(
    realAnswers[5].question,
    realAnswers[5].answer,
  );
  console.log(`    Result: ${q6Result.flags.join(", ") || "parsed"}`);

  // In dev mode, all results will be empty (pending manual processing).
  // Check if any were cached from previous runs.
  const allResults = [q2Result, q3Result, q4Result, q5Result, q6Result];
  const pendingCount = allResults.filter(r => r.flags.some(f => f.startsWith("dev_mode_pending"))).length;

  if (pendingCount > 0) {
    console.log(`\n${"=" .repeat(70)}`);
    console.log("DEV MODE: PROMPTS SAVED — MANUAL PROCESSING REQUIRED");
    console.log("=" .repeat(70));
    console.log(`\n  ${pendingCount} prompts need processing.`);
    console.log("  Check dev-data/prompts/ for the saved prompts.");
    console.log("  Process each one and save the JSON response to dev-data/responses/");
    console.log("  Then re-run this script to continue the pipeline.\n");
    console.log("  Alternatively, use saveAnswerParseResponse() to inject responses directly.\n");

    // Show what the prompts look like
    console.log("  Prompt locations:");
    for (const r of allResults) {
      for (const f of r.flags) {
        if (f.startsWith("dev_mode_pending:")) {
          console.log(`    → ${f.replace("dev_mode_pending:", "")}`);
        }
      }
    }
  } else {
    console.log("\n  All answers parsed! Proceeding to merge + Cloud build...");

    // ============================================================
    // STEP 4: MERGE — Resolution Merger (real code)
    // ============================================================

    console.log("\n" + "=" .repeat(70));
    console.log("STEP 4: RESOLUTION MERGER (real code — mergeResolvedProfile())");
    console.log("=" .repeat(70));

    const resolved: ResolvedProfile = mergeResolvedProfile(
      parsedCVs,
      allResults,
      { employer_confirmed: "Pakistan Air Force", is_single_employer: true },
      "military",
    );

    // Update metadata from conflict report
    resolved.meta.conflicts_detected = report.stats.conflicts_found + report.stats.gaps_found;
    resolved.meta.conflicts_resolved = resolved.meta.conflicts_detected; // all answered

    console.log(`\nEmployer: ${resolved.employer}`);
    console.log(`Persona: ${resolved.persona}`);
    console.log(`Total roles: ${resolved.roles.length}`);
    console.log(`Socratic discoveries: ${resolved.meta.roles_discovered_via_socratic}`);
    console.log(`Total career months: ${resolved.meta.total_career_months}`);
    console.log(`Flags: ${resolved.flags.join(", ") || "none"}`);

    console.log("\n--- Resolved Timeline ---");
    for (let i = 0; i < resolved.roles.length; i++) {
      const r = resolved.roles[i];
      console.log(`\n  #${i + 1} ${r.title}`);
      console.log(`     ${r.organization} | ${r.start_date} — ${r.end_date} | ${r.duration_months}mo`);
      console.log(`     Domain: ${r.domain} | Origin: ${r.origin}`);
      if (r.programs.length > 0) console.log(`     Programs: ${r.programs.join(", ")}`);
      if (r.team_size) console.log(`     Team: ${r.team_size}`);
      if (r.alt_titles.length > 0) console.log(`     Alt titles: ${r.alt_titles.join(", ")}`);
      console.log(`     Sources: ${r.source_cvs.join(", ") || "N/A"}`);
      console.log(`     Bullets (${r.bullets.length}):`);
      for (const b of r.bullets.slice(0, 5)) {
        console.log(`       • ${b.slice(0, 100)}`);
      }
      if (r.bullets.length > 5) console.log(`       ... +${r.bullets.length - 5} more`);
    }

    console.log("\n--- Education ---");
    for (const edu of resolved.education) {
      console.log(`  ${edu.degree} — ${edu.institution} (${edu.start_date} — ${edu.end_date})`);
    }

    console.log(`\n--- Certifications (${resolved.certifications.length}) ---`);
    for (const cert of resolved.certifications) {
      console.log(`  • ${cert}`);
    }

    console.log(`\n--- Programs (${resolved.programs.length}) ---`);
    for (const p of resolved.programs) {
      console.log(`  • ${p}`);
    }

    // ============================================================
    // STEP 5: VALIDATION
    // ============================================================

    console.log("\n" + "=" .repeat(70));
    console.log("STEP 5: VALIDATION");
    console.log("=" .repeat(70));

    let valid = true;

    // Timeline continuity
    console.log("\n--- Timeline Continuity ---");
    for (let i = 0; i < resolved.roles.length - 1; i++) {
      const current = resolved.roles[i];
      const next = resolved.roles[i + 1];
      const currentEnd = current.end_date;
      const nextStart = next.start_date;

      const gap = (() => {
        const endM = parseDateToMonths(currentEnd);
        const startM = parseDateToMonths(nextStart);
        if (endM === null || startM === null) return 0;
        return startM - endM;
      })();

      // Check if gap is filled by education
      const gapFilledByEducation = gap > 3 && resolved.education.some(edu => {
        const eduStart = parseDateToMonths(edu.start_date);
        const eduEnd = parseDateToMonths(edu.end_date);
        const gapStart = parseDateToMonths(currentEnd);
        const gapEnd = parseDateToMonths(nextStart);
        if (!eduStart || !eduEnd || !gapStart || !gapEnd) return false;
        // Education covers most of the gap
        const overlap = Math.min(eduEnd, gapEnd) - Math.max(eduStart, gapStart);
        return overlap > (gapEnd - gapStart) * 0.5;
      });

      if (gapFilledByEducation) {
        console.log(`  ✓ #${i + 1} → #${i + 2}: gap filled by education`);
      } else if (gap > 3) {
        console.log(`  ⚠ ${gap}mo gap: #${i + 1} ends ${currentEnd}, #${i + 2} starts ${nextStart}`);
        valid = false;
      } else if (gap < -3) {
        console.log(`  ⚠ ${Math.abs(gap)}mo overlap: #${i + 1} ends ${currentEnd}, #${i + 2} starts ${nextStart}`);
        valid = false;
      } else {
        console.log(`  ✓ #${i + 1} → #${i + 2}: seamless`);
      }
    }

    // Duplicate check
    console.log("\n--- Duplicate Check ---");
    const titleDatePairs = resolved.roles.map(r => `${r.title.toLowerCase()}|${r.start_date}`);
    const dupes = titleDatePairs.filter((v, i) => titleDatePairs.indexOf(v) !== i);
    if (dupes.length > 0) {
      console.log(`  ✗ Duplicates found: ${dupes.join(", ")}`);
      valid = false;
    } else {
      console.log(`  ✓ No duplicate roles`);
    }

    // Bullet uniqueness
    console.log("\n--- Bullet Dedup ---");
    const allBullets = resolved.roles.flatMap(r => r.bullets);
    const bulletSet = new Set(allBullets.map(b => b.toLowerCase().trim()));
    if (bulletSet.size < allBullets.length) {
      console.log(`  ⚠ ${allBullets.length - bulletSet.size} duplicate bullets across roles`);
    } else {
      console.log(`  ✓ All ${allBullets.length} bullets unique`);
    }

    // Employer consistency
    console.log("\n--- Employer Consistency ---");
    if (resolved.employer) {
      console.log(`  ✓ All roles under ${resolved.employer}`);
    } else {
      console.log(`  - No single employer confirmed`);
    }

    // Summary
    console.log("\n--- Summary ---");
    console.log(`  Roles: ${resolved.roles.length}`);
    console.log(`  Education: ${resolved.education.length}`);
    console.log(`  Certifications: ${resolved.certifications.length}`);
    console.log(`  Programs: ${resolved.programs.length}`);
    console.log(`  Socratic discoveries: ${resolved.meta.roles_discovered_via_socratic}`);
    console.log(`  Career span: ${resolved.roles[0]?.start_date} — ${resolved.roles[resolved.roles.length - 1]?.end_date}`);
    console.log(`  Valid: ${valid ? "✓ YES" : "✗ ISSUES FOUND"}`);

    console.log("\n" + "=" .repeat(70));
    console.log("PIPELINE COMPLETE — Ready for Phase 2 enrichment");
    console.log("=" .repeat(70));
  }
}

// Helper for validation
function parseDateToMonths(s: string): number | null {
  if (!s) return null;
  const trimmed = s.trim().toLowerCase();
  if (trimmed === "present" || trimmed === "current") {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
  }
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const my = trimmed.match(/^([a-z]{3,})\s*[-,]?\s*(\d{4})$/);
  if (my) {
    const m = monthMap[my[1].slice(0, 3)];
    if (m !== undefined) return parseInt(my[2]) * 12 + m;
  }
  const yo = trimmed.match(/^(\d{4})$/);
  if (yo) return parseInt(yo[1]) * 12;
  return null;
}

runParsing().catch(console.error);
