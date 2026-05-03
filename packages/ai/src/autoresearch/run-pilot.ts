/**
 * AutoResearch Pilot Runner
 *
 * Scores the test bank to establish baselines and verify scorecard behavior.
 *
 * Three modes:
 *   1. CEILING: Score expected_output against itself (should be ~100%)
 *   2. DEGRADED: Score deliberately degraded outputs (should fail predictably)
 *   3. SENSITIVITY: Verify each check catches its target failure
 *
 * Usage:
 *   npx tsx packages/ai/src/autoresearch/run-pilot.ts
 */

import * as fs from "fs";
import * as path from "path";
import { scoreCVGeneration, scoreJDParsing } from "./scorecard";
import type { CVScorecardInput, JDScorecardInput, ScorecardResult, CheckResult } from "./scorecard";
import { bayesianCredibleInterval } from "./safeguards";

// ============================================================
// LOAD TEST PAIRS
// ============================================================

const TEST_BANK_DIR = path.join(__dirname, "test-bank");
const RESULTS_DIR = path.join(__dirname, "results");

interface RawTestPair {
  id: string;
  split: "train" | "validation" | "held_out";
  persona: string;
  synthetic?: boolean;
  jd_style?: string;
  coverage?: { industry: string; seniority: string; pattern: string; region: string };
  jd: {
    title: string;
    company: string;
    location: string;
    experience_years: number;
    requirements: Array<{ text: string; type: string }>;
    responsibilities: string[];
  };
  expected_output: {
    summary: string;
    experience: Array<{
      company: string;
      title: string;
      start_date: string;
      end_date: string;
      bullets: string[];
    }>;
    skills: Record<string, string[]>;
    certifications: string[];
    education?: string[];
  };
  jd_requirements: string[];
  cloud_skills: string[];
  deliberate_flaws?: string[];
}

function loadTestPairs(): RawTestPair[] {
  const files = fs.readdirSync(TEST_BANK_DIR)
    .filter(f => f.startsWith("pair-") && f.endsWith(".json"))
    .sort();

  return files.map(file =>
    JSON.parse(fs.readFileSync(path.join(TEST_BANK_DIR, file), "utf-8"))
  );
}

// ============================================================
// CEILING TEST: expected vs expected (should pass all checks)
// ============================================================

interface PairResult {
  id: string;
  split: string;
  persona: string;
  industry?: string;
  gate1_verdict: string;
  gate1_passed: number;
  gate1_total: number;
  failures: string[];
  legacy_structural_avg: number;
  check_scores: Record<string, number>;
}

function runCeilingTest(pairs: RawTestPair[]): PairResult[] {
  const results: PairResult[] = [];

  for (const pair of pairs) {
    const scorecard = scoreCVGeneration({
      generated: pair.expected_output,
      expected: pair.expected_output,
      jd_requirements: pair.jd_requirements,
      cloud_skills: pair.cloud_skills,
    });

    const checkScores: Record<string, number> = {};
    for (const check of scorecard.checks) {
      checkScores[check.name] = check.score;
    }

    results.push({
      id: pair.id,
      split: pair.split,
      persona: pair.persona,
      industry: pair.coverage?.industry,
      gate1_verdict: scorecard.gate1_verdict,
      gate1_passed: scorecard.gate1_passed,
      gate1_total: scorecard.gate1_total,
      failures: scorecard.gate1_failures,
      legacy_structural_avg: scorecard.legacy_structural_avg,
      check_scores: checkScores,
    });
  }

  return results;
}

// ============================================================
// JD PARSER CEILING TEST
// ============================================================

function runJDParserCeilingTest(pairs: RawTestPair[]): PairResult[] {
  const results: PairResult[] = [];

  for (const pair of pairs) {
    const jdInput: JDScorecardInput = {
      parsed: {
        title: pair.jd.title,
        company: pair.jd.company,
        location: pair.jd.location,
        requirements: pair.jd.requirements.map(r => ({
          text: r.text,
          type: r.type as "must_have" | "nice_to_have",
        })),
        experience_years: pair.jd.experience_years,
        responsibilities: pair.jd.responsibilities || [],
      },
      expected: {
        title: pair.jd.title,
        company: pair.jd.company,
        location: pair.jd.location,
        requirements: pair.jd.requirements.map(r => ({
          text: r.text,
          type: r.type as "must_have" | "nice_to_have",
        })),
        experience_years: pair.jd.experience_years,
        responsibilities: pair.jd.responsibilities || [],
      },
    };

    const scorecard = scoreJDParsing(jdInput);

    const checkScores: Record<string, number> = {};
    for (const check of scorecard.checks) {
      checkScores[check.name] = check.score;
    }

    results.push({
      id: pair.id,
      split: pair.split,
      persona: pair.persona,
      industry: pair.coverage?.industry,
      gate1_verdict: scorecard.gate1_verdict,
      gate1_passed: scorecard.gate1_passed,
      gate1_total: scorecard.gate1_total,
      failures: scorecard.gate1_failures,
      legacy_structural_avg: scorecard.legacy_structural_avg,
      check_scores: checkScores,
    });
  }

  return results;
}

// ============================================================
// DEGRADED TEST: mutate expected output to verify scorecard catches errors
// ============================================================

function runDegradedTest(pairs: RawTestPair[]): {
  fabrication: PairResult[];
  missingMetrics: PairResult[];
  wrongDates: PairResult[];
} {
  const fabrication: PairResult[] = [];
  const missingMetrics: PairResult[] = [];
  const wrongDates: PairResult[] = [];

  for (const pair of pairs) {
    // Test 1: Add fabricated skill not in cloud
    const fabricatedOutput = structuredClone(pair.expected_output);
    const firstCategory = Object.keys(fabricatedOutput.skills)[0];
    if (firstCategory) {
      fabricatedOutput.skills[firstCategory].push("Quantum Computing");
      fabricatedOutput.skills[firstCategory].push("Blockchain DeFi");
    }

    const fabScore = scoreCVGeneration({
      generated: fabricatedOutput,
      expected: pair.expected_output,
      jd_requirements: pair.jd_requirements,
      cloud_skills: pair.cloud_skills,
    });

    fabrication.push({
      id: pair.id,
      split: pair.split,
      persona: pair.persona,
      gate1_verdict: fabScore.gate1_verdict,
      gate1_passed: fabScore.gate1_passed,
      gate1_total: fabScore.gate1_total,
      failures: fabScore.gate1_failures,
      legacy_structural_avg: fabScore.legacy_structural_avg,
      check_scores: Object.fromEntries(fabScore.checks.map(c => [c.name, c.score])),
    });

    // Test 2: Remove all numbers (metrics loss)
    const noMetricsOutput = structuredClone(pair.expected_output);
    noMetricsOutput.summary = noMetricsOutput.summary.replace(/\d+/g, "several");
    for (const exp of noMetricsOutput.experience) {
      exp.bullets = exp.bullets.map(b => b.replace(/\d+/g, "several"));
    }

    const metricsScore = scoreCVGeneration({
      generated: noMetricsOutput,
      expected: pair.expected_output,
      jd_requirements: pair.jd_requirements,
      cloud_skills: pair.cloud_skills,
    });

    missingMetrics.push({
      id: pair.id,
      split: pair.split,
      persona: pair.persona,
      gate1_verdict: metricsScore.gate1_verdict,
      gate1_passed: metricsScore.gate1_passed,
      gate1_total: metricsScore.gate1_total,
      failures: metricsScore.gate1_failures,
      legacy_structural_avg: metricsScore.legacy_structural_avg,
      check_scores: Object.fromEntries(metricsScore.checks.map(c => [c.name, c.score])),
    });

    // Test 3: Change dates (factual error)
    const wrongDatesOutput = structuredClone(pair.expected_output);
    for (const exp of wrongDatesOutput.experience) {
      exp.start_date = "1999-01";
      exp.end_date = "2000-01";
    }

    const datesScore = scoreCVGeneration({
      generated: wrongDatesOutput,
      expected: pair.expected_output,
      jd_requirements: pair.jd_requirements,
      cloud_skills: pair.cloud_skills,
    });

    wrongDates.push({
      id: pair.id,
      split: pair.split,
      persona: pair.persona,
      gate1_verdict: datesScore.gate1_verdict,
      gate1_passed: datesScore.gate1_passed,
      gate1_total: datesScore.gate1_total,
      failures: datesScore.gate1_failures,
      legacy_structural_avg: datesScore.legacy_structural_avg,
      check_scores: Object.fromEntries(datesScore.checks.map(c => [c.name, c.score])),
    });
  }

  return { fabrication, missingMetrics, wrongDates };
}

// ============================================================
// REPORTING
// ============================================================

function summarize(label: string, results: PairResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.gate1_verdict === "pass").length;
  const passRate = total > 0 ? passed / total : 0;

  // Bayesian CI
  const ci = bayesianCredibleInterval(passed, total);

  // Failure breakdown
  const failureCounts: Record<string, number> = {};
  for (const r of results) {
    for (const f of r.failures) {
      failureCounts[f] = (failureCounts[f] || 0) + 1;
    }
  }

  // Per-check average score
  const checkAvgs: Record<string, number> = {};
  const checkCounts: Record<string, number> = {};
  for (const r of results) {
    for (const [name, score] of Object.entries(r.check_scores)) {
      checkAvgs[name] = (checkAvgs[name] || 0) + score;
      checkCounts[name] = (checkCounts[name] || 0) + 1;
    }
  }
  for (const name of Object.keys(checkAvgs)) {
    checkAvgs[name] /= checkCounts[name];
  }

  // Per-split breakdown
  const splits: Record<string, { total: number; passed: number }> = {};
  for (const r of results) {
    if (!splits[r.split]) splits[r.split] = { total: 0, passed: 0 };
    splits[r.split].total++;
    if (r.gate1_verdict === "pass") splits[r.split].passed++;
  }

  const lines: string[] = [
    `\n${"=".repeat(60)}`,
    `  ${label}`,
    `${"=".repeat(60)}`,
    `  Pass rate: ${passed}/${total} (${(passRate * 100).toFixed(1)}%)`,
    `  Bayesian 95% CI: [${(ci.ci_lower * 100).toFixed(1)}%, ${(ci.ci_upper * 100).toFixed(1)}%]`,
    ``,
  ];

  // Split breakdown
  lines.push(`  By split:`);
  for (const [split, data] of Object.entries(splits)) {
    lines.push(`    ${split}: ${data.passed}/${data.total} (${((data.passed / data.total) * 100).toFixed(0)}%)`);
  }

  // Check averages
  lines.push(`\n  Per-check avg scores:`);
  const sortedChecks = Object.entries(checkAvgs).sort((a, b) => a[1] - b[1]);
  for (const [name, avg] of sortedChecks) {
    const bar = "█".repeat(Math.round(avg * 20)) + "░".repeat(20 - Math.round(avg * 20));
    lines.push(`    ${name.padEnd(28)} ${bar} ${(avg * 100).toFixed(1)}%`);
  }

  // Failure breakdown
  if (Object.keys(failureCounts).length > 0) {
    lines.push(`\n  Failure breakdown:`);
    const sortedFailures = Object.entries(failureCounts).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sortedFailures) {
      lines.push(`    ${name}: ${count}/${total} pairs (${((count / total) * 100).toFixed(0)}%)`);
    }
  }

  // List specific failing pairs
  const failing = results.filter(r => r.gate1_verdict === "fail");
  if (failing.length > 0 && failing.length <= 10) {
    lines.push(`\n  Failing pairs:`);
    for (const r of failing) {
      lines.push(`    ${r.id} (${r.persona}, ${r.industry || "?"}): ${r.failures.join(", ")}`);
    }
  }

  return lines.join("\n");
}

// ============================================================
// MAIN
// ============================================================

function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         AutoResearch Pilot — Scorecard Baseline         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const pairs = loadTestPairs();
  console.log(`Loaded ${pairs.length} test pairs`);

  const trainPairs = pairs.filter(p => p.split === "train");
  const valPairs = pairs.filter(p => p.split === "validation");
  const heldOutPairs = pairs.filter(p => p.split === "held_out");
  console.log(`  Train: ${trainPairs.length}, Validation: ${valPairs.length}, Held-out: ${heldOutPairs.length}`);

  // Coverage stats
  const personas = new Set(pairs.map(p => p.persona));
  const industries = new Set(pairs.filter(p => p.coverage).map(p => p.coverage!.industry));
  const regions = new Set(pairs.filter(p => p.coverage).map(p => p.coverage!.region));
  const jdStyles = new Set(pairs.filter(p => p.jd_style).map(p => p.jd_style!));
  console.log(`  Personas: ${[...personas].sort().join(", ")}`);
  console.log(`  Industries: ${industries.size}`);
  console.log(`  Regions: ${[...regions].sort().join(", ")}`);
  console.log(`  JD styles: ${[...jdStyles].sort().join(", ")}`);

  // ========== 1. CV GENERATION CEILING TEST ==========
  console.log("\n--- Running CV Generation Ceiling Test ---");
  const cvCeiling = runCeilingTest(pairs);
  console.log(summarize("CV GENERATION — CEILING (expected vs expected)", cvCeiling));

  // ========== 2. JD PARSER CEILING TEST ==========
  console.log("\n--- Running JD Parser Ceiling Test ---");
  const jdCeiling = runJDParserCeilingTest(pairs);
  console.log(summarize("JD PARSER — CEILING (expected vs expected)", jdCeiling));

  // ========== 3. DEGRADED TESTS ==========
  console.log("\n--- Running Degraded Tests (scorecard sensitivity) ---");
  const degraded = runDegradedTest(pairs);

  console.log(summarize("DEGRADED — Fabricated Skills (should fail no_fabrication)", degraded.fabrication));
  console.log(summarize("DEGRADED — Removed Metrics (should fail metrics_preserved)", degraded.missingMetrics));
  console.log(summarize("DEGRADED — Wrong Dates (should fail factual_preservation)", degraded.wrongDates));

  // ========== 4. SENSITIVITY MATRIX ==========
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  SCORECARD SENSITIVITY MATRIX`);
  console.log(`${"=".repeat(60)}`);

  const fabDetected = degraded.fabrication.filter(r => r.failures.includes("no_fabrication")).length;
  const metricsDetected = degraded.missingMetrics.filter(r => r.failures.includes("metrics_preserved")).length;
  const datesDetected = degraded.wrongDates.filter(r => r.failures.includes("factual_preservation")).length;

  console.log(`  Fabrication detection:   ${fabDetected}/${pairs.length} (${((fabDetected / pairs.length) * 100).toFixed(0)}%)`);
  console.log(`  Metrics loss detection:  ${metricsDetected}/${pairs.length} (${((metricsDetected / pairs.length) * 100).toFixed(0)}%)`);
  console.log(`  Date error detection:    ${datesDetected}/${pairs.length} (${((datesDetected / pairs.length) * 100).toFixed(0)}%)`);

  const allSensitive = fabDetected === pairs.length && metricsDetected >= pairs.length * 0.8 && datesDetected === pairs.length;
  console.log(`\n  Overall: ${allSensitive ? "PASS — scorecard catches target failures" : "NEEDS ATTENTION — some checks not sensitive enough"}`);

  // ========== 5. SAVE RESULTS ==========
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const pilotReport = {
    timestamp: new Date().toISOString(),
    total_pairs: pairs.length,
    splits: { train: trainPairs.length, validation: valPairs.length, held_out: heldOutPairs.length },
    coverage: {
      personas: [...personas].sort(),
      industries: [...industries].sort(),
      regions: [...regions].sort(),
      jd_styles: [...jdStyles].sort(),
    },
    cv_ceiling: {
      pass_rate: cvCeiling.filter(r => r.gate1_verdict === "pass").length / cvCeiling.length,
      passed: cvCeiling.filter(r => r.gate1_verdict === "pass").length,
      total: cvCeiling.length,
      failing_pairs: cvCeiling.filter(r => r.gate1_verdict === "fail").map(r => ({
        id: r.id, failures: r.failures, scores: r.check_scores,
      })),
    },
    jd_ceiling: {
      pass_rate: jdCeiling.filter(r => r.gate1_verdict === "pass").length / jdCeiling.length,
      passed: jdCeiling.filter(r => r.gate1_verdict === "pass").length,
      total: jdCeiling.length,
      failing_pairs: jdCeiling.filter(r => r.gate1_verdict === "fail").map(r => ({
        id: r.id, failures: r.failures, scores: r.check_scores,
      })),
    },
    sensitivity: {
      fabrication_detection: fabDetected / pairs.length,
      metrics_detection: metricsDetected / pairs.length,
      dates_detection: datesDetected / pairs.length,
    },
    per_pair_cv: cvCeiling.map(r => ({
      id: r.id, split: r.split, persona: r.persona, industry: r.industry,
      verdict: r.gate1_verdict, passed: r.gate1_passed, total: r.gate1_total,
      failures: r.failures, avg_score: r.legacy_structural_avg,
    })),
  };

  const reportPath = path.join(RESULTS_DIR, "pilot-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(pilotReport, null, 2));
  console.log(`\nPilot report saved: ${reportPath}`);

  // Summary verdict
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PILOT VERDICT`);
  console.log(`${"=".repeat(60)}`);

  const cvCeilingRate = pilotReport.cv_ceiling.pass_rate;
  const jdCeilingRate = pilotReport.jd_ceiling.pass_rate;

  if (cvCeilingRate === 1 && jdCeilingRate === 1 && allSensitive) {
    console.log(`  STATUS: ALL GREEN`);
    console.log(`  - CV ceiling: 100% (expected outputs pass all checks)`);
    console.log(`  - JD ceiling: 100% (expected JD outputs pass all checks)`);
    console.log(`  - Sensitivity: All degradation tests detected correctly`);
    console.log(`  -> Ready for optimization loop`);
  } else {
    console.log(`  STATUS: NEEDS FIXES`);
    if (cvCeilingRate < 1) {
      console.log(`  - CV ceiling: ${(cvCeilingRate * 100).toFixed(0)}% — ${pilotReport.cv_ceiling.failing_pairs.length} pairs fail even with expected output`);
      console.log(`    This means the scorecard is too strict or test data has issues`);
    }
    if (jdCeilingRate < 1) {
      console.log(`  - JD ceiling: ${(jdCeilingRate * 100).toFixed(0)}% — JD parser scoring has issues`);
    }
    if (!allSensitive) {
      console.log(`  - Sensitivity: Some degradation tests not caught`);
    }
    console.log(`  -> Fix scorecard or test data before running optimization loop`);
  }

  console.log();
}

main();
