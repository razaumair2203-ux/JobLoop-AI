/**
 * AutoResearch Baseline Scoring — Fixture-Based (No API)
 *
 * Scores pre-generated baseline CV outputs against test pairs.
 * Runs entirely locally — no LLM calls needed.
 *
 * Usage:
 *   npx tsx packages/ai/src/autoresearch/run-baseline-scoring.ts
 */

import * as fs from "fs";
import * as path from "path";
import { scoreCVGeneration } from "./scorecard";
import type { CVScorecardInput, ScorecardResult } from "./scorecard";
import { bayesianCredibleInterval } from "./safeguards";
import { oneWayANOVA, analyzePretestResults } from "./anova-pretest";

const TEST_BANK_DIR = path.join(__dirname, "test-bank");
const BASELINE_DIR = path.join(__dirname, "baseline-outputs");
const RESULTS_DIR = path.join(__dirname, "results");

// ============================================================
// LOAD DATA
// ============================================================

interface RawTestPair {
  id: string;
  split: "train" | "validation" | "held_out";
  persona: string;
  jd_style?: string;
  coverage?: { industry: string; seniority: string; pattern: string; region: string };
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

interface BaselineOutput {
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
}

function loadTrainPairs(): RawTestPair[] {
  const files = fs.readdirSync(TEST_BANK_DIR)
    .filter(f => f.startsWith("pair-") && f.endsWith(".json"))
    .sort();

  return files
    .map(f => JSON.parse(fs.readFileSync(path.join(TEST_BANK_DIR, f), "utf-8")) as RawTestPair)
    .filter(p => p.split === "train");
}

function loadBaselineOutput(pairId: string): BaselineOutput | null {
  const num = pairId.replace("pair-", "");
  const filepath = path.join(BASELINE_DIR, `pair-${num}.json`);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

// ============================================================
// SCORING
// ============================================================

interface PairScore {
  id: string;
  persona: string;
  industry?: string;
  // Baseline (LLM-generated) scores
  baseline: {
    gate1_verdict: string;
    gate1_passed: number;
    gate1_total: number;
    failures: string[];
    structural_avg: number;
    check_scores: Record<string, number>;
  };
  // Ceiling (expected vs expected) scores — for comparison
  ceiling: {
    gate1_verdict: string;
    gate1_passed: number;
    structural_avg: number;
  };
  // Delta
  delta_structural: number;
}

function scorePair(pair: RawTestPair, baseline: BaselineOutput): PairScore {
  // Score baseline output
  const baselineResult = scoreCVGeneration({
    generated: baseline,
    expected: pair.expected_output,
    jd_requirements: pair.jd_requirements,
    cloud_skills: pair.cloud_skills,
  });

  // Score ceiling (expected vs expected)
  const ceilingResult = scoreCVGeneration({
    generated: pair.expected_output,
    expected: pair.expected_output,
    jd_requirements: pair.jd_requirements,
    cloud_skills: pair.cloud_skills,
  });

  const checkScores: Record<string, number> = {};
  for (const check of baselineResult.checks) {
    checkScores[check.name] = check.score;
  }

  return {
    id: pair.id,
    persona: pair.persona,
    industry: pair.coverage?.industry,
    baseline: {
      gate1_verdict: baselineResult.gate1_verdict,
      gate1_passed: baselineResult.gate1_passed,
      gate1_total: baselineResult.gate1_total,
      failures: baselineResult.gate1_failures,
      structural_avg: baselineResult.legacy_structural_avg,
      check_scores: checkScores,
    },
    ceiling: {
      gate1_verdict: ceilingResult.gate1_verdict,
      gate1_passed: ceilingResult.gate1_passed,
      structural_avg: ceilingResult.legacy_structural_avg,
    },
    delta_structural: baselineResult.legacy_structural_avg - ceilingResult.legacy_structural_avg,
  };
}

// ============================================================
// REPORTING
// ============================================================

function printReport(scores: PairScore[]): void {
  const total = scores.length;
  const baselinePassed = scores.filter(s => s.baseline.gate1_verdict === "pass").length;
  const ceilingPassed = scores.filter(s => s.ceiling.gate1_verdict === "pass").length;
  const baselinePassRate = baselinePassed / total;
  const ceilingPassRate = ceilingPassed / total;

  const ci = bayesianCredibleInterval(baselinePassed, total);

  console.log(`\n${"=".repeat(64)}`);
  console.log(`  BASELINE SCORING REPORT — ${total} Train Pairs`);
  console.log(`${"=".repeat(64)}`);

  console.log(`\n  Ceiling pass rate:  ${ceilingPassed}/${total} (${(ceilingPassRate * 100).toFixed(0)}%)`);
  console.log(`  Baseline pass rate: ${baselinePassed}/${total} (${(baselinePassRate * 100).toFixed(0)}%)`);
  console.log(`  Bayesian 95% CI:    [${(ci.ci_lower * 100).toFixed(1)}%, ${(ci.ci_upper * 100).toFixed(1)}%]`);
  console.log(`  Gap:                ${((ceilingPassRate - baselinePassRate) * 100).toFixed(1)}pp`);

  // Per-check breakdown
  console.log(`\n  Per-check avg (baseline):`);
  const checkAvgs: Record<string, number> = {};
  const checkCounts: Record<string, number> = {};
  for (const s of scores) {
    for (const [name, score] of Object.entries(s.baseline.check_scores)) {
      checkAvgs[name] = (checkAvgs[name] || 0) + score;
      checkCounts[name] = (checkCounts[name] || 0) + 1;
    }
  }
  for (const name of Object.keys(checkAvgs)) {
    checkAvgs[name] /= checkCounts[name];
  }
  const sorted = Object.entries(checkAvgs).sort((a, b) => a[1] - b[1]);
  for (const [name, avg] of sorted) {
    const bar = "\u2588".repeat(Math.round(avg * 20)) + "\u2591".repeat(20 - Math.round(avg * 20));
    console.log(`    ${name.padEnd(28)} ${bar} ${(avg * 100).toFixed(1)}%`);
  }

  // Failure breakdown
  const failureCounts: Record<string, number> = {};
  for (const s of scores) {
    for (const f of s.baseline.failures) {
      failureCounts[f] = (failureCounts[f] || 0) + 1;
    }
  }

  if (Object.keys(failureCounts).length > 0) {
    console.log(`\n  Failure breakdown (baseline):`);
    const sortedFailures = Object.entries(failureCounts).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sortedFailures) {
      console.log(`    ${name}: ${count}/${total} pairs (${((count / total) * 100).toFixed(0)}%)`);
    }
  }

  // Per-pair details
  console.log(`\n  Per-pair results:`);
  console.log(`  ${"ID".padEnd(12)} ${"Persona".padEnd(16)} ${"Verdict".padEnd(8)} ${"Score".padEnd(8)} ${"Failures"}`);
  console.log(`  ${"─".repeat(70)}`);
  for (const s of scores) {
    const verdict = s.baseline.gate1_verdict === "pass" ? "PASS" : "FAIL";
    const failures = s.baseline.failures.length > 0 ? s.baseline.failures.join(", ") : "-";
    console.log(`  ${s.id.padEnd(12)} ${s.persona.padEnd(16)} ${verdict.padEnd(8)} ${s.baseline.structural_avg.toFixed(3).padEnd(8)} ${failures}`);
  }

  // ANOVA: baseline structural scores vs ceiling structural scores
  console.log(`\n${"=".repeat(64)}`);
  console.log(`  ANOVA PRE-TEST: Baseline vs Ceiling`);
  console.log(`${"=".repeat(64)}`);

  const baselineScores = scores.map(s => s.baseline.structural_avg);
  const ceilingScores = scores.map(s => s.ceiling.structural_avg);
  const anova = oneWayANOVA(ceilingScores, baselineScores);

  console.log(`  Ceiling mean:  ${(ceilingScores.reduce((a, b) => a + b, 0) / ceilingScores.length).toFixed(4)}`);
  console.log(`  Baseline mean: ${(baselineScores.reduce((a, b) => a + b, 0) / baselineScores.length).toFixed(4)}`);
  console.log(`  F-statistic:   ${anova.f_statistic.toFixed(4)}`);
  console.log(`  p-value:       ${anova.p_value.toFixed(6)}`);
  console.log(`  Significant:   ${anova.p_value < 0.05 ? "YES (p < 0.05)" : "NO (p >= 0.05)"}`);

  if (anova.p_value < 0.05) {
    console.log(`\n  The scorecard CAN distinguish between ceiling (perfect) and baseline (LLM-generated).`);
    console.log(`  This means the optimization loop has signal to work with.`);
  } else {
    console.log(`\n  The scorecard CANNOT distinguish baseline from ceiling.`);
    console.log(`  This means either: (1) the LLM output is near-perfect, or (2) the scorecard lacks granularity.`);
  }

  // Interpretation
  console.log(`\n${"=".repeat(64)}`);
  console.log(`  INTERPRETATION`);
  console.log(`${"=".repeat(64)}`);

  if (baselinePassRate > 0.9) {
    console.log(`  Baseline pass rate is HIGH (${(baselinePassRate * 100).toFixed(0)}%).`);
    console.log(`  The current prompt already produces high-quality output.`);
    console.log(`  Optimization headroom is limited but BERTScore tiebreaking can help.`);
  } else if (baselinePassRate > 0.5) {
    console.log(`  Baseline pass rate is MODERATE (${(baselinePassRate * 100).toFixed(0)}%).`);
    console.log(`  There is clear room for improvement.`);
    console.log(`  The optimization loop should be able to improve the prompt.`);
  } else {
    console.log(`  Baseline pass rate is LOW (${(baselinePassRate * 100).toFixed(0)}%).`);
    console.log(`  The prompt needs significant improvement.`);
    console.log(`  High optimization potential — the loop has lots of signal.`);
  }

  console.log();
}

// ============================================================
// MAIN
// ============================================================

function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║   AutoResearch Baseline Scoring — Local (No API)           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const trainPairs = loadTrainPairs();
  console.log(`\nLoaded ${trainPairs.length} train pairs`);

  // Check which baseline outputs exist
  const scoreable: { pair: RawTestPair; baseline: BaselineOutput }[] = [];
  const missing: string[] = [];

  for (const pair of trainPairs) {
    const baseline = loadBaselineOutput(pair.id);
    if (baseline) {
      scoreable.push({ pair, baseline });
    } else {
      missing.push(pair.id);
    }
  }

  console.log(`Baseline outputs found: ${scoreable.length}/${trainPairs.length}`);
  if (missing.length > 0) {
    console.log(`Missing: ${missing.join(", ")}`);
  }

  if (scoreable.length === 0) {
    console.error("ERROR: No baseline outputs found. Generate them first.");
    process.exit(1);
  }

  // Score all pairs
  const scores = scoreable.map(({ pair, baseline }) => scorePair(pair, baseline));

  // Print report
  printReport(scores);

  // Save results
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const reportPath = path.join(RESULTS_DIR, "baseline-scoring-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total_pairs: scoreable.length,
    missing_pairs: missing,
    baseline_pass_rate: scores.filter(s => s.baseline.gate1_verdict === "pass").length / scores.length,
    ceiling_pass_rate: scores.filter(s => s.ceiling.gate1_verdict === "pass").length / scores.length,
    per_pair: scores,
  }, null, 2));
  console.log(`Report saved: ${reportPath}`);
}

main();
