/**
 * Test Gates 1 + 2 — Run against all 9 Alpha CV golden baselines
 *
 * Gate 1: Source Grounding (every value → find in source text)
 * Gate 2: Sanity Check (duration vs dates, no placeholders, no duplicates)
 *
 * Usage: npx tsx packages/ai/tests/test-source-grounding.ts
 */

import * as fs from "fs";
import * as path from "path";
import { groundParsedCV, formatGroundingReport } from "../src/verification/source-grounder";
import { checkSanity, formatSanityReport } from "../src/verification/sanity-checker";
import type { ParsedCVOutput } from "../src/prompts/cv-parser";

// ============================================================
// MAP: golden baseline JSON → raw extracted source text
// ============================================================

const CV_PAIRS: Array<{ name: string; jsonPath: string; sourcePath: string }> = [
  {
    name: "Umair KSA-ME",
    jsonPath: "e:/tmp/parsed-cvs/Resume KSA-ME_JAN25.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Resume_KSA-ME_JAN25.txt",
  },
  {
    name: "Umair SE",
    jsonPath: "e:/tmp/parsed-cvs/Resume SE_Jan26.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Resume_SE_Jan26.txt",
  },
  {
    name: "Umair BE",
    jsonPath: "e:/tmp/parsed-cvs/Resume of BE_Jan26.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Resume_of_BE_Jan26.txt",
  },
  {
    name: "Umair PM",
    jsonPath: "e:/tmp/parsed-cvs/Resume PM_Jan26.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Resume_PM_Jan26.txt",
  },
  {
    name: "Umair LinkedIn",
    jsonPath: "e:/tmp/parsed-cvs/Profile_Linkedin.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Profile_Linkedin.txt",
  },
  {
    name: "Sibgha Main",
    jsonPath: "e:/tmp/parsed-cvs/Dr. Sibgha Saliha Resume.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Dr__Sibgha_Saliha_Resume.txt",
  },
  {
    name: "Sibgha Pak",
    jsonPath: "e:/tmp/parsed-cvs/Dr. Sibgha Saliha Resume_Pak.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Dr__Sibgha_Saliha_Resume_Pak.txt",
  },
  {
    name: "Sibgha IIMCT",
    jsonPath: "e:/tmp/parsed-cvs/Copy of Dr. Sibgha Saliha Resume_IIMCT.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Copy_of_Dr__Sibgha_Saliha_Resume_IIMCT.txt",
  },
  {
    name: "Sibgha Aug-25",
    jsonPath: "e:/tmp/parsed-cvs/Copy of Copy of Dr. Sibgha Saliha Resume_Aug-25.json",
    sourcePath: "e:/AIloop&JobSpec/Alpha_CVs/extracted/Copy_of_Copy_of_Dr__Sibgha_Saliha_Resume_Aug-25.txt",
  },
];

// ============================================================
// RUN
// ============================================================

let gate1Pass = 0;
let gate1Fail = 0;
let gate2Pass = 0;
let gate2Fail = 0;

console.log("=== HARD-GATED MATURATION PROTOCOL — Gates 1 + 2 ===\n");

for (const pair of CV_PAIRS) {
  // Check files exist
  if (!fs.existsSync(pair.jsonPath)) {
    console.log(`[SKIP] ${pair.name}: JSON not found at ${pair.jsonPath}\n`);
    continue;
  }
  if (!fs.existsSync(pair.sourcePath)) {
    console.log(`[SKIP] ${pair.name}: Source text not found at ${pair.sourcePath}\n`);
    continue;
  }

  // Load
  const parsed: ParsedCVOutput = JSON.parse(fs.readFileSync(pair.jsonPath, "utf-8"));
  const sourceText = fs.readFileSync(pair.sourcePath, "utf-8");

  console.log(`--- ${pair.name} ---`);

  // Gate 1: Source Grounding
  const g1 = groundParsedCV(parsed, sourceText);
  const g1Status = g1.pass ? "PASS" : "FAIL";
  const g1Color = g1.pass ? "\x1b[32m" : "\x1b[31m";
  console.log(`  Gate 1 (Grounding): ${g1Color}${g1Status}\x1b[0m — ${g1.groundedCount}/${g1.totalFields} (${g1.passRate}%), ${g1.ungroundedFields.length} ungrounded`);

  if (g1.ungroundedFields.length > 0) {
    for (const field of g1.ungroundedFields) {
      const truncated = field.value.length > 55
        ? field.value.substring(0, 52) + "..."
        : field.value;
      console.log(`    [UNGROUNDED] ${field.path}: "${truncated}"`);
    }
  }

  if (g1.pass) gate1Pass++;
  else gate1Fail++;

  // Gate 2: Sanity Check
  const g2 = checkSanity(parsed, sourceText.length);
  const g2Status = g2.pass ? "PASS" : "FAIL";
  const g2Color = g2.pass ? "\x1b[32m" : "\x1b[31m";
  console.log(`  Gate 2 (Sanity):    ${g2Color}${g2Status}\x1b[0m — ${g2.errorCount} errors, ${g2.warningCount} warnings`);

  if (g2.issues.length > 0) {
    for (const issue of g2.issues) {
      const tag = issue.level === "error" ? "\x1b[31m[ERROR]\x1b[0m" : "\x1b[33m[WARN]\x1b[0m";
      console.log(`    ${tag} ${issue.path}: ${issue.message}`);
    }
  }

  if (g2.pass) gate2Pass++;
  else gate2Fail++;

  // Combined verdict
  const bothPass = g1.pass && g2.pass;
  const verdict = bothPass ? "\x1b[32mBOTH PASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  Combined: ${verdict}`);
  console.log("");
}

// Final summary
console.log("=== SUMMARY ===");
const total = gate1Pass + gate1Fail;
console.log(`Total CVs: ${total}`);
console.log(`Gate 1 (Grounding): ${gate1Pass} pass, ${gate1Fail} fail`);
console.log(`Gate 2 (Sanity):    ${gate2Pass} pass, ${gate2Fail} fail`);
console.log(`Both gates pass:    ${Math.min(gate1Pass, gate2Pass)} / ${total}`);

if (gate1Fail > 0 || gate2Fail > 0) {
  console.log("\nAction: fix golden baseline JSONs (remove hallucinations, fix dates) or fix parser prompt.");
}
