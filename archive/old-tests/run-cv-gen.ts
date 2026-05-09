/**
 * Test harness for CV generation
 *
 * Run: ANTHROPIC_API_KEY=sk-... npx tsx tests/run-cv-gen.ts
 *
 * Quality checks:
 * 1. Every bullet has a result/metric (no duty descriptions)
 * 2. No banned phrases (leveraged, spearheaded, passionate, synergy)
 * 3. JD keywords appear in output
 * 4. Changes are explained
 * 5. Warnings flag real gaps honestly
 */

import { generateTailoredCV } from "../src/generate-cv";
import { SAMPLE_CV, SAMPLE_JD_STRONG_FIT } from "./sample-cv";

const BANNED_PHRASES = [
  "leveraged",
  "spearheaded",
  "synergy",
  "passionate",
  "team player",
  "self-starter",
  "go-getter",
  "think outside the box",
  "wear many hats",
  "fast-paced environment",
  "proven track record",
  "results-driven",
  "detail-oriented",
];

async function runTest() {
  console.log("=== JobLoop CV Generation — Quality Check ===\n");
  console.log("Target: Stripe Senior Backend Engineer\n");

  const start = Date.now();
  const cv = await generateTailoredCV(SAMPLE_CV, SAMPLE_JD_STRONG_FIT);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`Generated in ${elapsed}s\n`);

  // Display the CV
  console.log(`--- SUMMARY ---`);
  console.log(cv.summary);

  console.log(`\n--- EXPERIENCE ---`);
  for (const exp of cv.experience) {
    console.log(`\n${exp.title} — ${exp.company} (${exp.start_date} – ${exp.end_date})`);
    exp.bullets.forEach((b) => console.log(`  • ${b}`));
  }

  console.log(`\n--- SKILLS ---`);
  for (const [category, skills] of Object.entries(cv.skills)) {
    console.log(`  ${category}: ${skills.join(", ")}`);
  }

  console.log(`\n--- CHANGES MADE ---`);
  cv.changes_made.forEach((c) => console.log(`  → ${c}`));

  console.log(`\n--- KEYWORDS INTEGRATED ---`);
  console.log(`  ${cv.keywords_integrated.join(", ")}`);

  console.log(`\n--- WARNINGS ---`);
  cv.warnings.forEach((w) => console.log(`  ⚠ ${w}`));

  // Quality checks
  console.log(`\n\n=== Quality Checks ===\n`);

  // Check 1: Banned phrases
  const allText = JSON.stringify(cv).toLowerCase();
  const foundBanned = BANNED_PHRASES.filter((p) => allText.includes(p));
  console.log(
    `Banned phrases: ${foundBanned.length === 0 ? "PASS (none found)" : `FAIL — found: ${foundBanned.join(", ")}`}`
  );

  // Check 2: Bullets have results
  let totalBullets = 0;
  let weakBullets = 0;
  const dutyPhrases = [
    "responsible for",
    "tasked with",
    "duties included",
    "worked on",
    "helped with",
    "assisted in",
  ];
  for (const exp of cv.experience) {
    for (const bullet of exp.bullets) {
      totalBullets++;
      const lower = bullet.toLowerCase();
      if (dutyPhrases.some((p) => lower.startsWith(p))) {
        weakBullets++;
        console.log(`  WEAK BULLET: "${bullet}"`);
      }
    }
  }
  console.log(
    `Impact bullets: ${weakBullets === 0 ? "PASS" : `FAIL — ${weakBullets}/${totalBullets} bullets start with duty phrases`}`
  );

  // Check 3: Keywords present
  const jdKeywords = [
    "api",
    "distributed systems",
    "java",
    "go",
    "event-driven",
    "message queue",
    "relational database",
  ];
  const cvText = allText;
  const missingKeywords = jdKeywords.filter((k) => !cvText.includes(k));
  console.log(
    `JD keywords: ${missingKeywords.length === 0 ? "PASS (all present)" : `WARN — missing: ${missingKeywords.join(", ")}`}`
  );

  // Check 4: Changes explained
  console.log(
    `Changes documented: ${cv.changes_made.length > 0 ? `PASS (${cv.changes_made.length} changes)` : "FAIL — no changes explained"}`
  );

  // Check 5: Warnings present (for honesty)
  console.log(
    `Honest warnings: ${cv.warnings.length > 0 ? `PASS (${cv.warnings.length} warnings)` : "WARN — no warnings (might be overly optimistic)"}`
  );

  // Check 6: No fabrication (basic — check that company names match)
  const originalCompanies = ["revolut", "monzo", "wise", "transferwise"];
  const cvCompanies = cv.experience.map((e) => e.company.toLowerCase());
  const fabricated = cvCompanies.filter(
    (c) => !originalCompanies.some((oc) => c.includes(oc))
  );
  console.log(
    `No fabrication: ${fabricated.length === 0 ? "PASS (all companies from original)" : `FAIL — unknown companies: ${fabricated.join(", ")}`}`
  );

  console.log(`\n=== Done ===`);
}

runTest();
