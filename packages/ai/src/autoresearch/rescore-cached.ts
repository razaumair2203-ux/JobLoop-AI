/**
 * Re-score cached JD parser outputs with improved scoring functions.
 * No API calls — uses saved raw outputs from previous trial.
 *
 * Usage: npx tsx packages/ai/src/autoresearch/rescore-cached.ts
 */

import * as fs from "fs";
import * as path from "path";

const TEST_BANK_DIR = path.join(__dirname, "test-bank");
const RESULTS_DIR = path.join(__dirname, "results");

// Load cached raw outputs
const cached = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, "jd-parser-trial.json"), "utf-8"));
const rawOutputs: Record<string, any> = {};
for (const r of cached.raw_outputs) {
  rawOutputs[r.id] = r.output;
}

// Load test pairs
const pairs = fs.readdirSync(TEST_BANK_DIR)
  .filter(f => f.startsWith("pair-") && f.endsWith(".json"))
  .sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(TEST_BANK_DIR, f), "utf-8")))
  .filter((p: any) => p.jd?.full_description && rawOutputs[p.id]);

console.log(`Re-scoring ${pairs.length} pairs with improved scoring + corrected GT\n`);

// ============================================================
// SCORING FUNCTIONS
// ============================================================

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function levSim(a: string, b: string): number {
  const mx = Math.max(a.length, b.length);
  return mx === 0 ? 1 : 1 - levenshtein(a, b) / mx;
}

function scoreCompany(parsed: string, expected: string): { score: number; detail: string } {
  if (!expected && !parsed) return { score: 1, detail: "both empty" };
  if (!expected) return { score: 0.5, detail: `extra: ${parsed}` };
  if (!parsed) return { score: 0, detail: `missing, expected: ${expected}` };

  const pL = parsed.toLowerCase().replace(/[,.'®()]/g, "").replace(/\s+/g, " ").trim();
  const eL = expected.toLowerCase().replace(/[,.'®()]/g, "").replace(/\s+/g, " ").trim();

  if (pL === eL) return { score: 1, detail: "exact" };
  if (pL.includes(eL) || eL.includes(pL)) return { score: 0.9, detail: `contains: "${parsed}" ~ "${expected}"` };

  // Abbreviation
  const eW = eL.split(/\s+/), pW = pL.split(/\s+/);
  if (eW.length === 1 && eW[0].length <= 5 && pW.length >= 2) {
    const ini = pW.map(w => w[0]).join("");
    if (ini.startsWith(eW[0]) || eW[0].startsWith(ini)) return { score: 0.85, detail: "abbreviation" };
  }
  if (pW.length === 1 && pW[0].length <= 5 && eW.length >= 2) {
    const ini = eW.map(w => w[0]).join("");
    if (ini.startsWith(pW[0]) || pW[0].startsWith(ini)) return { score: 0.85, detail: "abbreviation" };
  }

  // Subsidiary: "X, a Y company"
  const sub = pL.match(/^(.+?),?\s+a\s+(.+?)\s+company$/);
  if (sub) {
    const parent = sub[2];
    if (eL.includes(parent) || parent.includes(eL)) return { score: 0.85, detail: `subsidiary: parent="${parent}"` };
  }

  // Word overlap
  const sig = (s: string) => s.split(/\s+/).filter(w => w.length > 2 && !["the", "inc", "ltd", "corp", "llc", "co", "group", "company"].includes(w));
  const ps = sig(pL), es = sig(eL);
  if (ps.length > 0 && es.length > 0) {
    const ov = ps.filter(w => es.some(e => e.includes(w) || w.includes(e))).length;
    if (ov / Math.max(ps.length, es.length) >= 0.5) return { score: 0.8, detail: `word_overlap (${ov})` };
  }

  const sim = levSim(pL, eL);
  return { score: sim, detail: `${sim >= 0.6 ? "fuzzy" : "mismatch"} (${sim.toFixed(2)})` };
}

function scoreLocation(parsedLoc: any, expectedLoc: string): { score: number; detail: string } {
  const parsedStr = parsedLoc ? [parsedLoc.city, parsedLoc.country].filter(Boolean).join(", ") : "";
  const eLow = expectedLoc.toLowerCase().trim();

  // Remote
  if (eLow === "remote") {
    if (parsedLoc?.remote === true || String(parsedLoc?.remote).toLowerCase() === "remote" || String(parsedLoc?.remote).toLowerCase() === "true") {
      return { score: 1, detail: "remote match" };
    }
    if (parsedStr.toLowerCase().includes("remote")) return { score: 0.9, detail: "remote in text" };
    return { score: 0, detail: `expected Remote, got "${parsedStr}"` };
  }

  if (!expectedLoc && !parsedStr) return { score: 1, detail: "both empty" };
  if (!expectedLoc && parsedStr) return { score: 0.5, detail: `extra: ${parsedStr}` };
  if (expectedLoc && !parsedStr) return { score: 0, detail: `missing: ${expectedLoc}` };

  // City-level matching
  const pCity = (parsedLoc?.city || "").toLowerCase().trim();
  const eCity = expectedLoc.split(",")[0].trim().toLowerCase();

  if (pCity && eCity) {
    const cs = levSim(pCity, eCity);
    if (cs >= 0.8) return { score: Math.max(0.85, cs), detail: `city match: "${pCity}" ~ "${eCity}"` };

    // Multi-location: "New York and Maine"
    if (expectedLoc.toLowerCase().includes(" and ")) {
      const cities = expectedLoc.toLowerCase().split(/\s+and\s+/).map(s => s.trim());
      if (cities.some(c => levSim(pCity, c) >= 0.8 || c.includes(pCity))) {
        return { score: 0.8, detail: `partial multi: "${pCity}" in "${expectedLoc}"` };
      }
    }
  }

  // Fuzzy fallback
  const sim = levSim(parsedStr.toLowerCase(), expectedLoc.toLowerCase());
  return { score: sim, detail: `${sim >= 0.6 ? "fuzzy" : "mismatch"} (${sim.toFixed(2)})` };
}

function normalizeTitle(t: string): string {
  return t.toLowerCase()
    .replace(/\bsr\.?\b/g, "senior").replace(/\bjr\.?\b/g, "junior")
    .replace(/\bmgr\.?\b/g, "manager").replace(/\bsvp\b/g, "senior vice president")
    .replace(/\bvp\b/g, "vice president")
    .replace(/[,.'()]/g, "").replace(/\s+/g, " ").trim();
}

// ============================================================
// SCORE ALL PAIRS
// ============================================================

interface FieldResult { field: string; score: number; detail: string }

const allResults: Array<{ id: string; fields: FieldResult[]; avg: number }> = [];

for (const pair of pairs) {
  const parsed = rawOutputs[pair.id];
  const jd = pair.jd;
  const fields: FieldResult[] = [];

  // 1. Company
  fields.push({ field: "company", ...scoreCompany(parsed.company || "", jd.company) });

  // 2. Title
  const pT = normalizeTitle(parsed.role_title || "");
  const eT = normalizeTitle(jd.title);
  let tScore = levSim(pT, eT);
  if (pT.includes(eT) || eT.includes(pT)) tScore = Math.max(tScore, 0.9);
  if (pT === eT) tScore = 1;
  fields.push({ field: "title", score: tScore, detail: tScore >= 0.8 ? "ok" : `mismatch (${tScore.toFixed(2)})` });

  // 3. Location
  fields.push({ field: "location", ...scoreLocation(parsed.location, jd.location || "") });

  // 4-5. Experience years — use GT value directly (already corrected), extract max from text
  const expMin: number | null = jd.experience_years ?? null;
  let expMax: number | null = jd.experience_years_max ?? null;
  if (expMax === null && expMin !== null) {
    // Try to find a range in text that starts with expMin
    const rangeRe = new RegExp(`${expMin}\\s*[-–]\\s*(\\d+)\\s*(?:years?|yrs?)`, "i");
    const rangeMatch = jd.full_description.match(rangeRe);
    if (rangeMatch) expMax = parseInt(rangeMatch[1]);
  }

  const pMin = parsed.experience_years?.min ?? null;
  const pMax = parsed.experience_years?.max ?? null;

  if (pMin === null && expMin === null) fields.push({ field: "exp_min", score: 1, detail: "both null" });
  else if (pMin === expMin) fields.push({ field: "exp_min", score: 1, detail: "exact" });
  else if (pMin !== null && expMin !== null && Math.abs(pMin - expMin) <= 1) fields.push({ field: "exp_min", score: 0.8, detail: `close: ${pMin} vs ${expMin}` });
  else fields.push({ field: "exp_min", score: 0, detail: `${pMin} vs ${expMin}` });

  if (pMax === null && expMax === null) fields.push({ field: "exp_max", score: 1, detail: "both null" });
  else if (pMax === expMax) fields.push({ field: "exp_max", score: 1, detail: "exact" });
  else if (pMax !== null && expMax !== null && Math.abs(pMax - expMax) <= 1) fields.push({ field: "exp_max", score: 0.8, detail: `close: ${pMax} vs ${expMax}` });
  else fields.push({ field: "exp_max", score: 0, detail: `${pMax} vs ${expMax}` });

  // 6. Requirements recall
  const allParsedReqs = [
    ...(parsed.requirements?.hard || []).map((r: any) => ({ text: r.text, type: "must_have" })),
    ...(parsed.requirements?.preferred || []).map((r: any) => ({ text: r.text, type: "nice_to_have" })),
  ];
  const expReqs = jd.requirements || [];
  let reqFound = 0;
  for (const exp of expReqs) {
    const expWords = exp.text.toLowerCase().split(/[\s/,()]+/).filter((w: string) => w.length > 3);
    if (expWords.length === 0) { reqFound++; continue; }
    const matched = allParsedReqs.some((p: any) => {
      const pWords = p.text.toLowerCase();
      if (expWords.length <= 2) return expWords.some((w: string) => pWords.includes(w));
      return expWords.filter((w: string) => pWords.includes(w)).length >= 2;
    });
    if (matched) reqFound++;
  }
  const reqRecall = expReqs.length > 0 ? reqFound / expReqs.length : 1;
  fields.push({ field: "req_recall", score: reqRecall, detail: `${reqFound}/${expReqs.length}` });

  // 7. Requirements precision
  let reqLegit = 0;
  for (const p of allParsedReqs) {
    const pWords = p.text.toLowerCase().split(/[\s/,()]+/).filter((w: string) => w.length > 3);
    if (pWords.length === 0) { reqLegit++; continue; }
    const matched = expReqs.some((exp: any) => {
      const eLow = exp.text.toLowerCase();
      if (pWords.length <= 2) return pWords.some((w: string) => eLow.includes(w));
      return pWords.filter((w: string) => eLow.includes(w)).length >= Math.min(2, pWords.length);
    });
    if (matched) reqLegit++;
  }
  const reqPrec = allParsedReqs.length > 0 ? reqLegit / allParsedReqs.length : 1;
  fields.push({ field: "req_precision", score: reqPrec, detail: `${reqLegit}/${allParsedReqs.length}` });

  // 8. Requirement types
  let typesMatched = 0, typesCorrect = 0;
  for (const exp of expReqs) {
    const expWords = exp.text.toLowerCase().split(/[\s/,()]+/).filter((w: string) => w.length > 3);
    const match = allParsedReqs.find((p: any) => {
      const pLow = p.text.toLowerCase();
      if (expWords.length <= 2) return expWords.some((w: string) => pLow.includes(w));
      return expWords.filter((w: string) => pLow.includes(w)).length >= 2;
    });
    if (!match) continue;
    typesMatched++;
    const pType = match.type === "hard" || match.type === "required" ? "must_have" : match.type === "preferred" || match.type === "bonus" ? "nice_to_have" : match.type;
    if (pType === exp.type) typesCorrect++;
    else if (pType === "must_have" && exp.type === "nice_to_have") typesCorrect += 0.5;
  }
  const typeScore = typesMatched > 0 ? typesCorrect / typesMatched : 0;
  fields.push({ field: "req_types", score: typeScore, detail: `${typesCorrect}/${typesMatched}` });

  // 9. Responsibilities recall
  const expResps = jd.responsibilities || [];
  const parsedResps = parsed.responsibilities || [];
  let respFound = 0;
  for (const exp of expResps) {
    const expWords = exp.toLowerCase().split(/[\s/,()]+/).filter((w: string) => w.length > 3);
    if (expWords.length === 0) { respFound++; continue; }
    const matched = parsedResps.some((p: string) => {
      const pLow = p.toLowerCase();
      return expWords.filter((w: string) => pLow.includes(w)).length >= Math.min(2, expWords.length);
    });
    if (matched) respFound++;
  }
  const respRecall = expResps.length > 0 ? respFound / expResps.length : 1;
  fields.push({ field: "resp_recall", score: respRecall, detail: `${respFound}/${expResps.length}` });

  const avg = fields.reduce((s, f) => s + f.score, 0) / fields.length;
  allResults.push({ id: pair.id, fields, avg });
}

// ============================================================
// DISTRIBUTION REPORT
// ============================================================

const fieldNames = ["company", "title", "location", "exp_min", "exp_max", "req_recall", "req_precision", "req_types", "resp_recall"];

function computeDist(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const pct = (p: number) => {
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return { min: sorted[0], p10: pct(10), p25: pct(25), median: pct(50), p75: pct(75), max: sorted[n - 1], mean: values.reduce((a, b) => a + b, 0) / n };
}

console.log("\n========================================");
console.log("  DISTRIBUTION (IMPROVED SCORING)");
console.log("========================================\n");

console.log(`${"Field".padEnd(20)} ${"Min".padStart(5)} ${"P10".padStart(5)} ${"P25".padStart(5)} ${"Med".padStart(5)} ${"P75".padStart(5)} ${"Max".padStart(5)} ${"Mean".padStart(5)}`);
console.log("-".repeat(75));

const distributions: Record<string, ReturnType<typeof computeDist>> = {};
for (const fn of fieldNames) {
  const vals = allResults.map(r => r.fields.find(f => f.field === fn)?.score).filter((v): v is number => v !== undefined);
  if (vals.length === 0) continue;
  const d = computeDist(vals);
  distributions[fn] = d;
  console.log(`${fn.padEnd(20)} ${(d.min * 100).toFixed(0).padStart(5)} ${(d.p10 * 100).toFixed(0).padStart(5)} ${(d.p25 * 100).toFixed(0).padStart(5)} ${(d.median * 100).toFixed(0).padStart(5)} ${(d.p75 * 100).toFixed(0).padStart(5)} ${(d.max * 100).toFixed(0).padStart(5)} ${(d.mean * 100).toFixed(0).padStart(5)}`);
}
console.log("-".repeat(75));
const overalls = allResults.map(r => r.avg);
const od = computeDist(overalls);
console.log(`${"OVERALL".padEnd(20)} ${(od.min * 100).toFixed(0).padStart(5)} ${(od.p10 * 100).toFixed(0).padStart(5)} ${(od.p25 * 100).toFixed(0).padStart(5)} ${(od.median * 100).toFixed(0).padStart(5)} ${(od.p75 * 100).toFixed(0).padStart(5)} ${(od.max * 100).toFixed(0).padStart(5)} ${(od.mean * 100).toFixed(0).padStart(5)}`);

// ============================================================
// FAILURE ANALYSIS
// ============================================================

console.log("\n========================================");
console.log("  FAILURES (<0.8)");
console.log("========================================\n");

for (const fn of fieldNames) {
  const failures = allResults
    .filter(r => (r.fields.find(f => f.field === fn)?.score || 0) < 0.8)
    .map(r => ({ id: r.id, ...r.fields.find(f => f.field === fn)! }));
  if (failures.length > 0) {
    console.log(`${fn} — ${failures.length}/${allResults.length} failures:`);
    for (const f of failures.slice(0, 5)) {
      console.log(`  ${f.id}: ${(f.score * 100).toFixed(0)}% — ${f.detail.slice(0, 80)}`);
    }
    if (failures.length > 5) console.log(`  ... and ${failures.length - 5} more`);
    console.log();
  }
}

// ============================================================
// SUGGESTED THRESHOLDS
// ============================================================

console.log("\n========================================");
console.log("  SUGGESTED THRESHOLDS (P10-based)");
console.log("========================================\n");

for (const fn of fieldNames) {
  const d = distributions[fn];
  if (!d) continue;
  // Use P10 rounded down to nearest 5%
  const threshold = Math.floor(d.p10 * 20) / 20;
  console.log(`  ${fn.padEnd(20)} >= ${(threshold * 100).toFixed(0).padStart(3)}%  (P10=${(d.p10 * 100).toFixed(1)}%, median=${(d.median * 100).toFixed(1)}%)`);
}

// ============================================================
// SAVE
// ============================================================

const reportPath = path.join(RESULTS_DIR, "jd-parser-rescore.json");
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  note: "Re-scored with improved company/location scoring + corrected GT (Q037, Q046 exp years)",
  pairs_scored: allResults.length,
  distributions,
  overall: od,
  per_pair: allResults,
}, null, 2));

console.log(`\nSaved: ${reportPath}`);
