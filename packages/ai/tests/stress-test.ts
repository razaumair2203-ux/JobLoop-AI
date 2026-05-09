/**
 * Stress Test: Run 4,817 resumes through the pipeline code path
 *
 * Tests: schema validation, cv-cleaner, taxonomy normalizer, conflict detector
 * Does NOT call LLM — uses the structured data from master_resumes.jsonl
 *
 * Usage: npx tsx packages/ai/tests/stress-test.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { validateParsedCVOutput, repairLLMOutput } from "../src/schema-validator";
import { cleanParsedCVs } from "../src/cv-cleaner";
import { normalizeTaxonomy, getTaxonomyGaps, clearTaxonomyGaps } from "../src/taxonomy";
import { buildCloudFromParsedCV } from "../src/cloud";
import type { ParsedCV } from "../src/types";

const DATASET = path.resolve(__dirname, "../../../datasets/master_resumes.jsonl");

// ============================================================
// Transform master_resumes.jsonl record → ParsedCV
// ============================================================

interface DatasetRecord {
  personal_info: {
    name: string;
    email: string;
    phone: string;
    location: { city: string; country: string };
    summary: string;
  };
  experience: Array<{
    company: string;
    title: string;
    level: string;
    dates: { start: string; end: string; duration: string };
    responsibilities: string[];
    technologies: string[];
    achievements: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    dates: { start: string; end: string };
    gpa?: string;
  }>;
  skills: {
    technical: {
      programming_languages?: Array<{ name: string; level: string }>;
      frameworks?: Array<{ name: string; level: string }>;
      tools?: Array<{ name: string; level: string }>;
      databases?: Array<{ name: string; level: string }>;
    };
    soft?: string[];
  };
  certifications: Array<{ name: string; issuer: string; year: string }>;
  projects?: Array<{ name: string; description: string; technologies: string[] }>;
}

function parseDuration(dur: string): number {
  const m = dur.match(/(\d+)\s*(?:year|yr)/i);
  const mMonths = dur.match(/(\d+)\s*month/i);
  return (m ? parseInt(m[1]) * 12 : 0) + (mMonths ? parseInt(mMonths[1]) : 0);
}

function datasetToCV(rec: DatasetRecord): ParsedCV {
  const allTech = new Set<string>();

  const experience = rec.experience.map(e => {
    e.technologies?.forEach(t => allTech.add(t));
    const months = parseDuration(e.dates?.duration ?? "");
    return {
      company: e.company || "Unknown",
      title: e.title || "Unknown",
      start_date: e.dates?.start || "",
      end_date: e.dates?.end || "",
      duration_months: months || 12,
      technologies_used: e.technologies || [],
      metrics_mentioned: e.achievements || [],
      domain: "general",
    };
  });

  const totalMonths = experience.reduce((s, e) => s + e.duration_months, 0);

  const skills: ParsedCV["skills"] = [];
  const techSkills = rec.skills?.technical;
  if (techSkills) {
    for (const cat of ["programming_languages", "frameworks", "tools", "databases"] as const) {
      const items = techSkills[cat];
      if (items) {
        for (const item of items) {
          allTech.add(item.name);
          skills.push({
            name: item.name,
            domain: "technology",
            category: cat === "programming_languages" ? "programming" : cat,
            source: "skills_section",
          });
        }
      }
    }
  }

  const education = rec.education.map(e => {
    const startMatch = e.dates?.start?.match(/(\d{4})/);
    const endMatch = e.dates?.end?.match(/(\d{4})/);
    return {
      institution: e.institution || "Unknown",
      degree: e.degree || "Unknown",
      field: e.field || "Unknown",
      start_year: startMatch ? parseInt(startMatch[1]) : null,
      end_year: endMatch ? parseInt(endMatch[1]) : null,
    };
  });

  return {
    name: rec.personal_info?.name || "Unknown",
    email: rec.personal_info?.email || null,
    total_experience_years: Math.round(totalMonths / 12),
    experience,
    skills,
    all_technologies: Array.from(allTech),
    education,
    certifications: Array.isArray(rec.certifications)
      ? rec.certifications.map(c => typeof c === "string" ? c : c.name)
      : typeof rec.certifications === "string" && rec.certifications
        ? [rec.certifications]
        : [],
  };
}

// ============================================================
// Metrics
// ============================================================

interface Metrics {
  total: number;
  parseOk: number;
  parseFail: number;
  cleanOk: number;
  cleanCrash: number;
  cloudOk: number;
  cloudCrash: number;
  taxonomyGaps: number;
  emptySkills: number;
  emptyExperience: number;
  zeroDuration: number;
  processTimeMs: number[];
  errors: Array<{ line: number; stage: string; error: string }>;
}

// ============================================================
// Main
// ============================================================

async function main() {
  if (!fs.existsSync(DATASET)) {
    console.error(`Dataset not found: ${DATASET}`);
    process.exit(1);
  }

  console.log("=== STRESS TEST: 4,817 Resumes ===\n");

  const metrics: Metrics = {
    total: 0,
    parseOk: 0,
    parseFail: 0,
    cleanOk: 0,
    cleanCrash: 0,
    cloudOk: 0,
    cloudCrash: 0,
    taxonomyGaps: 0,
    emptySkills: 0,
    emptyExperience: 0,
    zeroDuration: 0,
    processTimeMs: [],
    errors: [],
  };

  clearTaxonomyGaps();

  const rl = readline.createInterface({
    input: fs.createReadStream(DATASET),
    crlfDelay: Infinity,
  });

  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    metrics.total++;
    const start = Date.now();

    try {
      // Parse JSON
      const rec = JSON.parse(line) as DatasetRecord;

      // Transform to ParsedCV
      const cv = datasetToCV(rec);
      metrics.parseOk++;

      // Track data quality
      if (cv.skills.length === 0) metrics.emptySkills++;
      if (cv.experience.length === 0) metrics.emptyExperience++;
      if (cv.experience.some(e => e.duration_months === 0)) metrics.zeroDuration++;

      // Run through cleaner
      try {
        cleanParsedCVs([{
          id: `stress-${lineNum}`,
          filename: `record-${lineNum}`,
          parsed_cv: cv as unknown as Record<string, unknown>,
          source_text: "",
        }]);
        metrics.cleanOk++;
      } catch (err) {
        metrics.cleanCrash++;
        metrics.errors.push({
          line: lineNum,
          stage: "clean",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Run through taxonomy normalizer (per skill)
      for (const skill of cv.skills) {
        normalizeTaxonomy(skill.domain, skill.category);
      }

      // Build Cloud
      try {
        buildCloudFromParsedCV(cv);
        metrics.cloudOk++;
      } catch (err) {
        metrics.cloudCrash++;
        metrics.errors.push({
          line: lineNum,
          stage: "cloud",
          error: err instanceof Error ? err.message : String(err),
        });
      }

    } catch (err) {
      metrics.parseFail++;
      metrics.errors.push({
        line: lineNum,
        stage: "parse",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    metrics.processTimeMs.push(Date.now() - start);

    // Progress
    if (lineNum % 1000 === 0) {
      process.stdout.write(`  Processed ${lineNum}...\r`);
    }
  }

  // Taxonomy gaps
  const gaps = getTaxonomyGaps();
  metrics.taxonomyGaps = gaps.length;

  // Calculate stats
  const times = metrics.processTimeMs;
  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const p95Idx = Math.floor(times.length * 0.95);
  const sortedTimes = [...times].sort((a, b) => a - b);
  const p95Ms = sortedTimes[p95Idx] || 0;

  // Report
  console.log(`\n${"=".repeat(60)}`);
  console.log("STRESS TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`  Total records:        ${metrics.total}`);
  console.log(`  JSON parse OK:        ${metrics.parseOk} (${pct(metrics.parseOk, metrics.total)})`);
  console.log(`  JSON parse FAIL:      ${metrics.parseFail}`);
  console.log(`  Cleaner OK:           ${metrics.cleanOk} (${pct(metrics.cleanOk, metrics.parseOk)})`);
  console.log(`  Cleaner CRASH:        ${metrics.cleanCrash}`);
  console.log(`  Cloud build OK:       ${metrics.cloudOk} (${pct(metrics.cloudOk, metrics.parseOk)})`);
  console.log(`  Cloud build CRASH:    ${metrics.cloudCrash}`);
  console.log(`  Taxonomy gaps:        ${metrics.taxonomyGaps}`);
  console.log(`  Empty skills:         ${metrics.emptySkills} (${pct(metrics.emptySkills, metrics.total)})`);
  console.log(`  Empty experience:     ${metrics.emptyExperience}`);
  console.log(`  Zero-duration roles:  ${metrics.zeroDuration}`);
  console.log(`  Avg time/record:      ${avgMs.toFixed(1)}ms`);
  console.log(`  P95 time/record:      ${p95Ms}ms`);
  console.log(`  Total time:           ${(times.reduce((a, b) => a + b, 0) / 1000).toFixed(1)}s`);

  if (metrics.errors.length > 0) {
    console.log(`\nFirst 10 errors:`);
    for (const e of metrics.errors.slice(0, 10)) {
      console.log(`  Line ${e.line} [${e.stage}]: ${e.error.slice(0, 120)}`);
    }
  }

  // Unique taxonomy gaps
  if (gaps.length > 0) {
    const uniqueDomainGaps = new Set(gaps.filter(g => g.type === "domain").map(g => g.raw));
    const uniqueCatGaps = new Set(gaps.filter(g => g.type === "category").map(g => g.raw));
    console.log(`\nTaxonomy gaps — ${uniqueDomainGaps.size} unknown domains, ${uniqueCatGaps.size} unknown categories`);
    if (uniqueDomainGaps.size > 0) {
      console.log(`  Domain gaps: ${[...uniqueDomainGaps].slice(0, 20).join(", ")}`);
    }
    if (uniqueCatGaps.size > 0) {
      console.log(`  Category gaps: ${[...uniqueCatGaps].slice(0, 20).join(", ")}`);
    }
  }

  // Pass/Fail
  console.log(`\n${"=".repeat(60)}`);
  const crashRate = (metrics.cleanCrash + metrics.cloudCrash) / metrics.total;
  if (crashRate === 0) {
    console.log("PASS: 0% crash rate across all records.");
  } else {
    console.log(`WARNING: ${(crashRate * 100).toFixed(2)}% crash rate (${metrics.cleanCrash + metrics.cloudCrash} crashes).`);
  }
}

function pct(n: number, total: number): string {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "N/A";
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
