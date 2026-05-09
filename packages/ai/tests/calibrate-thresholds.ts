/**
 * Calibrate scorecard thresholds from ideal output score distribution.
 *
 * Principle: If the IDEAL expected output can't pass a check, the threshold is wrong.
 * Set thresholds at P10 (10th percentile) of ideal scores — anything below that
 * is genuinely bad, not a scorecard artifact.
 */
import { scoreCVGeneration } from "../src/autoresearch/scorecard";
import * as fs from "fs";
import * as path from "path";

const testBank = path.join(__dirname, "../src/autoresearch/test-bank");
const files = fs.readdirSync(testBank).filter((f: string) => f.startsWith("pair-") && f.endsWith(".json"));

console.log(`=== Threshold Calibration (${files.length} ideal outputs) ===\n`);

const checkScores: Record<string, number[]> = {};

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(testBank, file), "utf-8"));

  const result = scoreCVGeneration({
    generated: raw.expected_output,
    expected: raw.expected_output,
    jd_requirements: raw.jd_requirements || [],
    cloud_skills: raw.cloud_skills || [],
    raw_cv_text: raw.raw_cv_text || "",
    raw_jd_text: raw.jd?.full_description || (raw.jd_requirements || []).join("\n"),
  });

  for (const c of result.checks) {
    if (!checkScores[c.name]) checkScores[c.name] = [];
    checkScores[c.name].push(c.score);
  }
}

console.log("Check Name               | Min    | P10    | P25    | Median | P75    | Mean   | Current Threshold | Suggested (P10)");
console.log("-------------------------|--------|--------|--------|--------|--------|--------|-------------------|----------------");

const currentThresholds: Record<string, number> = {
  jd_requirements_coverage: 0.4,
  no_fabrication: 1.0,  // 0 fabricated = binary
  metrics_preserved: 0.8,
  word_count: 1.0,      // hard limit = binary
  no_fabricated_skills: 1.0,  // 0 fabricated = binary
  action_verbs: 0.65,
  ats_structure: 1.0,   // binary
  factual_preservation: 1.0,  // ≤1 error
};

for (const [name, scores] of Object.entries(checkScores)) {
  const sorted = [...scores].sort((a, b) => a - b);
  const min = sorted[0];
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const current = currentThresholds[name] ?? "?";

  // Suggested: P10 of ideal scores, rounded down to nearest 0.05
  const suggested = Math.floor(p10 * 20) / 20;

  console.log(
    `${name.padEnd(25)}| ${(min * 100).toFixed(1).padStart(5)}% | ${(p10 * 100).toFixed(1).padStart(5)}% | ${(p25 * 100).toFixed(1).padStart(5)}% | ${(median * 100).toFixed(1).padStart(5)}% | ${(p75 * 100).toFixed(1).padStart(5)}% | ${(mean * 100).toFixed(1).padStart(5)}% | ${typeof current === 'number' ? (current * 100).toFixed(0).padStart(16) + '%' : current.padStart(17)} | ${(suggested * 100).toFixed(0)}%`
  );
}

// Also show per-pair gate analysis
console.log("\n=== Per-Pair Gate Analysis ===\n");
const pairPassCounts: number[] = [];
for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(testBank, file), "utf-8"));
  const result = scoreCVGeneration({
    generated: raw.expected_output,
    expected: raw.expected_output,
    jd_requirements: raw.jd_requirements || [],
    cloud_skills: raw.cloud_skills || [],
    raw_cv_text: raw.raw_cv_text || "",
    raw_jd_text: raw.jd?.full_description || (raw.jd_requirements || []).join("\n"),
  });
  pairPassCounts.push(result.gate1_passed);
}

const sortedCounts = [...pairPassCounts].sort((a, b) => a - b);
console.log(`Checks passed per pair: min=${sortedCounts[0]}, P10=${sortedCounts[Math.floor(sortedCounts.length * 0.1)]}, median=${sortedCounts[Math.floor(sortedCounts.length * 0.5)]}, max=${sortedCounts[sortedCounts.length - 1]}`);
console.log(`Distribution: ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => `${n}/8: ${pairPassCounts.filter(p => p === n).length}`).join(", ")}`);

// Show which checks are the worst offenders
console.log("\n=== Worst Offenders (checks that fail most on ideal output) ===\n");
for (const [name, scores] of Object.entries(checkScores)) {
  const failures = scores.filter(s => {
    const threshold = currentThresholds[name];
    if (name === "no_fabrication" || name === "no_fabricated_skills") return s < 1.0;
    if (name === "factual_preservation") return s < 1.0;
    return typeof threshold === 'number' ? s < threshold : false;
  });
  if (failures.length > 0) {
    console.log(`${name}: ${failures.length}/${scores.length} fail (${(failures.length / scores.length * 100).toFixed(0)}%) — failing scores: ${failures.slice(0, 5).map(f => (f * 100).toFixed(1) + '%').join(', ')}`);
  }
}
