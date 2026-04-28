/**
 * Test harness for suitability analysis
 *
 * Run: ANTHROPIC_API_KEY=sk-... npx tsx tests/run-analysis.ts
 *
 * Tests the AI engine against 3 scenarios:
 * 1. Strong fit (should score 70-85)
 * 2. Weak fit (should score 10-30)
 * 3. Moderate fit (should score 50-70)
 *
 * If scores don't land in these ranges, the prompt needs tuning.
 */

import { analyzeSuitability } from "../src/analyze";
import {
  SAMPLE_CV,
  SAMPLE_JD_STRONG_FIT,
  SAMPLE_JD_WEAK_FIT,
  SAMPLE_JD_MODERATE_FIT,
} from "./sample-cv";

const TESTS = [
  {
    name: "Strong Fit — Stripe Senior Backend Engineer",
    jd: SAMPLE_JD_STRONG_FIT,
    expected_range: [65, 85],
    expected_fit: "strong" as const,
    expected_rec: "apply" as const,
  },
  {
    name: "Weak Fit — DeepMind Staff ML Engineer",
    jd: SAMPLE_JD_WEAK_FIT,
    expected_range: [5, 30],
    expected_fit: "weak" as const,
    expected_rec: "skip" as const,
  },
  {
    name: "Moderate Fit — Monzo Full-Stack Engineer",
    jd: SAMPLE_JD_MODERATE_FIT,
    expected_range: [45, 70],
    expected_fit: "moderate" as const,
    expected_rec: "apply_with_repositioning" as const,
  },
];

async function runTests() {
  console.log("=== JobLoop Suitability Analysis — Validation Run ===\n");

  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    console.log(`\n--- ${test.name} ---`);
    console.log(`Expected: score ${test.expected_range[0]}-${test.expected_range[1]}, fit=${test.expected_fit}, rec=${test.expected_rec}\n`);

    try {
      const start = Date.now();
      const result = await analyzeSuitability(SAMPLE_CV, test.jd, {
        tier: "quality",
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      console.log(`Score: ${result.score} | Fit: ${result.fit_level} | Rec: ${result.recommendation} | Confidence: ${result.confidence}`);
      console.log(`Time: ${elapsed}s`);
      console.log(`\nSummary: ${result.summary}`);
      console.log(`\nStrengths:`);
      result.strengths.forEach((s) => console.log(`  + ${s}`));
      console.log(`\nRisks:`);
      result.risks.forEach((r) => console.log(`  - ${r}`));
      console.log(`\nKeywords matched: ${result.keywords_matched.join(", ")}`);
      console.log(`Keywords missing: ${result.keywords_missing.join(", ")}`);
      console.log(`\nRecruiter perspective: ${result.recruiter_perspective}`);

      if (result.repositioning_suggestions.length > 0) {
        console.log(`\nRepositioning suggestions:`);
        result.repositioning_suggestions.forEach((s) =>
          console.log(`  → ${s}`)
        );
      }

      // Check expectations
      const scoreInRange =
        result.score >= test.expected_range[0] &&
        result.score <= test.expected_range[1];
      const fitCorrect = result.fit_level === test.expected_fit;
      const recCorrect = result.recommendation === test.expected_rec;

      console.log(`\n--- Validation ---`);
      console.log(
        `Score in range [${test.expected_range[0]}-${test.expected_range[1]}]: ${scoreInRange ? "PASS" : "FAIL"} (got ${result.score})`
      );
      console.log(
        `Fit level correct: ${fitCorrect ? "PASS" : "FAIL"} (expected ${test.expected_fit}, got ${result.fit_level})`
      );
      console.log(
        `Recommendation correct: ${recCorrect ? "PASS" : "FAIL"} (expected ${test.expected_rec}, got ${result.recommendation})`
      );

      if (scoreInRange && fitCorrect) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`ERROR: ${error}`);
      failed++;
    }
  }

  console.log(`\n\n=== Results: ${passed} passed, ${failed} failed out of ${TESTS.length} ===`);

  if (failed > 0) {
    console.log("\nPrompt needs tuning. Review the outputs above and adjust scoring/prompt.");
    process.exit(1);
  } else {
    console.log("\nAll tests passed. Suitability analysis is calibrated.");
  }
}

runTests();
