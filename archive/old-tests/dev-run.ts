/**
 * Dev Runner — Use YOUR real CV and JDs to test the system locally.
 *
 * No API key needed. You process the AI prompts through Claude Code.
 *
 * Usage:
 *   1. Put your CV in dev-data/inputs/my-cv.txt
 *   2. Put a JD in dev-data/inputs/jd-001.txt
 *   3. Run: npx tsx tests/dev-run.ts
 *   4. Follow the instructions (it tells you what to do)
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { setProvider, saveDevParsedCV, saveDevParsedJD } from "../src/provider";
import { buildCloudFromParsedCV } from "../src/cloud";
import { matchCloudToJD } from "../src/cloud-matcher";
import { matchCVToJD } from "../src/matcher";
import type { ParsedCV, ParsedJD } from "../src/types";

const DEV_DIR = join(__dirname, "../dev-data");
const INPUTS_DIR = join(DEV_DIR, "inputs");
const RESPONSES_DIR = join(DEV_DIR, "responses");
const CLOUD_DIR = join(DEV_DIR, "cloud");

// Set dev mode
setProvider("dev", DEV_DIR);

async function main() {
  console.log("=== JobLoop Dev Runner ===\n");

  // Check for CV
  const cvPath = join(INPUTS_DIR, "my-cv.txt");
  if (!existsSync(cvPath)) {
    console.log("❌ No CV found at: dev-data/inputs/my-cv.txt");
    console.log("   Put your real CV text there and run again.\n");
    process.exit(1);
  }

  // Check for parsed CV
  const parsedCVPath = join(RESPONSES_DIR, "my-cv-parsed.json");
  if (!existsSync(parsedCVPath)) {
    console.log("❌ CV not parsed yet.");
    console.log("");
    console.log("   Ask Claude Code to parse your CV. Use this prompt:");
    console.log("   ───────────────────────────────────────���─────────");
    console.log(`   "Read the file at ${cvPath} and parse it as a CV.`);
    console.log(`    Return ONLY a JSON object following this structure:`);
    console.log(`    { total_experience_years, experience: [...], skills: {...}, all_technologies: [...], education: [...], certifications: [...] }`);
    console.log(`    Save the result to ${parsedCVPath}"`);
    console.log("   ─────────────────────────────────────────────────");
    console.log("");
    process.exit(1);
  }

  const parsedCV: ParsedCV = JSON.parse(readFileSync(parsedCVPath, "utf-8"));
  console.log(`✓ CV parsed: ${parsedCV.total_experience_years} years, ${parsedCV.all_technologies.length} technologies\n`);

  // Build cloud from CV
  const cloud = buildCloudFromParsedCV(parsedCV);
  console.log(`✓ Cloud built: ${cloud.nodes.length} nodes, ${cloud.achievements.length} achievements`);
  console.log(`  Skills: ${cloud.nodes.filter(n => n.type === "skill").length}`);
  console.log(`  Domains: ${cloud.nodes.filter(n => n.type === "domain").length}`);
  console.log(`  With role evidence: ${cloud.nodes.filter(n => n.summary.number_of_roles > 0).length}`);
  console.log(`  With impact: ${cloud.nodes.filter(n => n.summary.has_impact).length}`);
  console.log(`  Listed only (weak): ${cloud.nodes.filter(n => n.summary.number_of_roles === 0).length}`);
  console.log("");

  // Save cloud
  writeFileSync(join(CLOUD_DIR, "my-cloud.json"), JSON.stringify(cloud, null, 2));
  console.log(`✓ Cloud saved to: dev-data/cloud/my-cloud.json\n`);

  // Check for JDs
  const jdFiles = existsSync(INPUTS_DIR)
    ? require("fs").readdirSync(INPUTS_DIR).filter((f: string) => f.startsWith("jd-"))
    : [];

  if (jdFiles.length === 0) {
    console.log("No JDs found. Add a JD file to dev-data/inputs/jd-001.txt to match against.\n");
    process.exit(0);
  }

  // Process each JD
  for (const jdFile of jdFiles) {
    const jdName = jdFile.replace(".txt", "");
    const parsedJDPath = join(RESPONSES_DIR, `${jdName}-parsed.json`);

    console.log(`\n--- ${jdFile} ---`);

    if (!existsSync(parsedJDPath)) {
      const jdPath = join(INPUTS_DIR, jdFile);
      console.log(`❌ JD not parsed yet.`);
      console.log(`   Ask Claude Code:`);
      console.log(`   "Read ${jdPath} and parse it as a job description.`);
      console.log(`    Return JSON: { company, role_title, seniority_level, experience_years: {min, max, raw_text}, requirements: {hard: [...], preferred: [...]}, technologies_mentioned: [...], responsibilities: [...] }`);
      console.log(`    Save to ${parsedJDPath}"`);
      continue;
    }

    const parsedJD: ParsedJD = JSON.parse(readFileSync(parsedJDPath, "utf-8"));
    console.log(`✓ JD parsed: ${parsedJD.role_title} at ${parsedJD.company}`);

    // Run cloud matcher
    const report = matchCloudToJD(cloud, parsedJD);

    // Display results
    console.log(`\n  Position: ${report.position.label}`);
    console.log(`  Basis: ${report.position.basis}`);
    console.log(`  Experience: ${report.experience.actual_years} yrs (need ${report.experience.required}), verdict: ${report.experience.verdict}`);

    console.log(`\n  Requirements with evidence:`);
    for (const req of report.requirements.filter(r => r.importance === "required")) {
      const icon = req.verdict === "strong_evidence" ? "✅" :
                   req.verdict === "evidence_exists" ? "⚡" :
                   req.verdict === "claimed_only" ? "⚠️" :
                   req.verdict === "adjacent" ? "↔️" : "❌";
      console.log(`    ${icon} ${req.requirement_text}`);
      if (req.evidence_summary) console.log(`       ${req.evidence_summary}`);
      if (req.gap) console.log(`       Gap: ${req.gap}`);
    }

    console.log(`\n  Technologies:`);
    for (const tech of report.technologies.filter(t => t.jd_context === "required")) {
      const icon = tech.found_in_cv ? "✅" : "❌";
      console.log(`    ${icon} ${tech.technology} — ${tech.evidence_summary}`);
    }

    if (report.strongest_evidence.length > 0) {
      console.log(`\n  Strongest evidence (lead with these):`);
      report.strongest_evidence.forEach(s => console.log(`    💪 ${s}`));
    }

    if (report.missing.length > 0) {
      console.log(`\n  Missing entirely:`);
      report.missing.forEach(m => console.log(`    ❌ ${m}`));
    }

    if (report.improvement_opportunities.length > 0) {
      console.log(`\n  Improvement opportunities:`);
      report.improvement_opportunities.forEach(o => console.log(`    💡 ${o}`));
    }
  }

  console.log("\n\n=== Done ===");
}

main().catch(console.error);
