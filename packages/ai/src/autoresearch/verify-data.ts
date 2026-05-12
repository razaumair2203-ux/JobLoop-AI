import { scoreCVGeneration } from "./scorecard";
import * as fs from "fs";
import * as path from "path";

const DIR = path.join(__dirname, "test-bank");
const files = fs.readdirSync(DIR).filter(f => f.startsWith("pair-") && f.endsWith(".json"));
const hardGates = ["no_fabrication","no_fabricated_skills","factual_preservation"];
const checkStats: Record<string, {pass:number,fail:number,scores:number[]}> = {};
const pairResults: any[] = [];

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf-8"));
  const result = scoreCVGeneration({
    generated: raw.expected_output,
    expected: raw.expected_output,
    jd_requirements: raw.jd_requirements,
    cloud_skills: raw.cloud_skills,
    raw_cv_text: raw.raw_cv_text || "",
    raw_jd_text: raw.raw_jd_text || "",
  });
  for (const c of result.checks) {
    if (!checkStats[c.name]) checkStats[c.name] = {pass:0,fail:0,scores:[]};
    if (c.passed) checkStats[c.name].pass++;
    else checkStats[c.name].fail++;
    checkStats[c.name].scores.push(c.score);
  }
  const hardFails = result.gate1_failures.filter(f => hardGates.includes(f));
  const softChecks = result.checks.filter(c => !hardGates.includes(c.name));
  const softAvg = softChecks.reduce((s,c) => s+c.score, 0) / softChecks.length;
  const passes = hardFails.length === 0 && softAvg >= 0.50;
  pairResults.push({id:raw.id, split:raw.split, persona:raw.persona, passed:result.gate1_passed, total:result.gate1_total, failures:result.gate1_failures, softAvg, hardFail: hardFails.length > 0, passes});
}

console.log("\n=== PER-CHECK PASS RATES (after fixes) ===");
for (const [name, s] of Object.entries(checkStats)) {
  const avg = s.scores.reduce((a,b)=>a+b,0)/s.scores.length;
  const isHard = hardGates.includes(name) ? " [HARD]" : "";
  console.log(`${name.padEnd(28)} ${(s.pass+"/"+(s.pass+s.fail)).padEnd(8)} ${(s.pass/(s.pass+s.fail)*100).toFixed(0).padStart(4)}%  avg=${avg.toFixed(3)}${isHard}`);
}

const passing = pairResults.filter(p => p.passes);
console.log(`\n=== PAIR GATE: ${passing.length}/${pairResults.length} pass (${((passing.length/pairResults.length)*100).toFixed(1)}%) ===`);

const failing = pairResults.filter(p => !p.passes);
if (failing.length > 0) {
  console.log("\nStill failing:");
  for (const p of failing) {
    console.log(`  ${p.id} (${p.persona},${p.split}): hard=${p.hardFail} softAvg=${p.softAvg.toFixed(3)} fails=[${p.failures.join(",")}]`);
  }
}

// Training batch
const train = pairResults.filter(p => p.split === "train").sort((a,b) => a.id.localeCompare(b.id));
const batch = train.slice(0, 10);
const batchPass = batch.filter(p => p.passes).length;
console.log(`\n=== TRAINING BATCH (first 10): ${batchPass}/10 pass ===`);
for (const p of batch) {
  const status = p.passes ? "PASS" : "FAIL";
  console.log(`  ${p.id.padEnd(40)} ${status} softAvg=${p.softAvg.toFixed(3)} fails=[${p.failures.join(",")}]`);
}
