/**
 * Validate scorecard sanity: score the IDEAL expected_output for every test pair.
 * If the scorecard is sane, ideal outputs should score HIGH.
 */
import { scoreCVGeneration } from "../src/autoresearch/scorecard";
import * as fs from "fs";
import * as path from "path";

const testBank = path.join(__dirname, "../src/autoresearch/test-bank");
const files = fs.readdirSync(testBank).filter((f: string) => f.startsWith("pair-") && f.endsWith(".json"));

console.log(`=== Scorecard Validation (${files.length} pairs) ===`);
console.log("Scoring IDEAL expected_output — should score HIGH if scorecard is sane.\n");

let totalPassed = 0;
let totalChecks = 0;
let pairsPassing6of8 = 0;
let pairsPassing8of8 = 0;
const checkFailCounts: Record<string, number> = {};
const checkAvgScores: Record<string, number[]> = {};

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

  totalPassed += result.gate1_passed;
  totalChecks += result.gate1_total;

  if (result.gate1_passed >= 6) pairsPassing6of8++;
  if (result.gate1_passed === 8) pairsPassing8of8++;

  for (const c of result.checks) {
    if (!c.passed) checkFailCounts[c.name] = (checkFailCounts[c.name] || 0) + 1;
    if (!checkAvgScores[c.name]) checkAvgScores[c.name] = [];
    checkAvgScores[c.name].push(c.score);
  }
}

console.log("=== Results ===");
console.log(`Total: ${totalPassed}/${totalChecks} checks pass (${(totalPassed / totalChecks * 100).toFixed(1)}%)`);
console.log(`Pairs passing 8/8: ${pairsPassing8of8}/${files.length}`);
console.log(`Pairs passing >=6/8 (per-pair gate): ${pairsPassing6of8}/${files.length} (${(pairsPassing6of8 / files.length * 100).toFixed(1)}%)`);
console.log(`Gate 1 aggregate would ${pairsPassing6of8 / files.length >= 0.7 ? "PASS" : "FAIL"} (need 70%, got ${(pairsPassing6of8 / files.length * 100).toFixed(1)}%)`);
console.log();
console.log("Per-check failure rates:");
const allChecks = Object.keys(checkAvgScores);
for (const name of allChecks) {
  const fails = checkFailCounts[name] || 0;
  const avg = checkAvgScores[name].reduce((a, b) => a + b, 0) / checkAvgScores[name].length;
  console.log(`  ${name}: ${fails}/${files.length} fail (${(fails / files.length * 100).toFixed(0)}%), avg score: ${(avg * 100).toFixed(1)}%`);
}
