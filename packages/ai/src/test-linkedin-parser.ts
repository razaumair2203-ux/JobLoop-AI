/**
 * Test harness for LinkedIn ZIP parser.
 *
 * Runs the EXACT same parseLinkedInExport() function that the API route uses.
 * Same code path, same logic, same output — just without HTTP/Supabase.
 *
 * Usage:
 *   npx tsx packages/ai/src/test-linkedin-parser.ts <path-to-zip>
 *
 * Also accepts a folder of extracted CSVs:
 *   npx tsx packages/ai/src/test-linkedin-parser.ts <path-to-folder>
 */

import * as fs from "fs";
import * as path from "path";
import { parseLinkedInExport, isLinkedInExport, RELEVANT_FILES } from "./linkedin-parser";
import type { LinkedInCSVFiles } from "./linkedin-parser";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npx tsx packages/ai/src/test-linkedin-parser.ts <path-to-zip-or-folder>");
    process.exit(1);
  }

  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  let csvFiles: LinkedInCSVFiles;

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    // Read CSVs from extracted folder
    console.log(`Reading CSVs from folder: ${resolved}\n`);
    csvFiles = readCSVsFromFolder(resolved);
  } else if (resolved.toLowerCase().endsWith(".zip")) {
    // Extract from ZIP
    console.log(`Extracting ZIP: ${resolved}\n`);
    csvFiles = await extractFromZip(resolved);
  } else {
    console.error("Expected a .zip file or a folder containing CSV files");
    process.exit(1);
  }

  // --- Validation ---
  const filenames = Object.keys(csvFiles);
  console.log("=== FILES FOUND ===");
  for (const f of filenames) {
    const size = csvFiles[f]?.length ?? 0;
    console.log(`  ${f} (${(size / 1024).toFixed(1)} KB)`);
  }
  console.log();

  const validation = isLinkedInExport(filenames);
  if (!validation.isValid) {
    console.error(`VALIDATION FAILED: ${validation.reason}`);
    process.exit(1);
  }
  console.log(`Validated as LinkedIn export. Relevant files: ${validation.relevantFiles.join(", ")}\n`);

  // --- Parse ---
  const result = parseLinkedInExport(csvFiles);

  // --- Output ---
  console.log("=== PROFILE ===");
  console.log(JSON.stringify(result.profile, null, 2));
  console.log();

  console.log("=== EXPERIENCE ===");
  for (const exp of result.parsedCV.experience) {
    console.log(`  ${exp.title} @ ${exp.company}`);
    console.log(`    ${exp.start_date ?? "?"} → ${exp.end_date ?? "present"} (${exp.duration_months} months)`);
    console.log(`    Domain: ${exp.domain}`);
    if (exp.technologies_used.length > 0)
      console.log(`    Tech: ${exp.technologies_used.join(", ")}`);
    if (exp.metrics_mentioned.length > 0)
      console.log(`    Metrics: ${exp.metrics_mentioned.join(", ")}`);
    console.log();
  }

  console.log("=== EDUCATION ===");
  for (const edu of result.parsedCV.education) {
    console.log(`  ${edu.degree} ${edu.field} @ ${edu.institution} (${edu.year})`);
    if (edu.highlights && edu.highlights.length > 0)
      console.log(`    Highlights: ${edu.highlights.join(", ")}`);
  }
  console.log();

  console.log("=== SKILLS ===");
  const { skills } = result.parsedCV;
  for (const [category, items] of Object.entries(skills)) {
    if (items.length > 0) {
      console.log(`  ${category}: ${items.join(", ")}`);
    }
  }
  console.log();

  console.log("=== CERTIFICATIONS ===");
  for (const cert of result.parsedCV.certifications) {
    console.log(`  ${cert}`);
  }
  console.log();

  console.log("=== SUMMARY ===");
  console.log(`  Total experience: ${result.parsedCV.total_experience_years} years`);
  console.log(`  Positions: ${result.parsedCV.experience.length}`);
  console.log(`  Skills: ${result.parsedCV.all_technologies.length}`);
  console.log(`  Education: ${result.parsedCV.education.length}`);
  console.log(`  Certifications: ${result.parsedCV.certifications.length}`);
  console.log();

  if (result.warnings.length > 0) {
    console.log("=== WARNINGS ===");
    for (const w of result.warnings) {
      console.log(`  ⚠ ${w}`);
    }
    console.log();
  }

  console.log("=== FILES STATUS ===");
  console.log(`  Found: ${result.filesFound.join(", ")}`);
  console.log(`  Missing: ${result.filesMissing.length > 0 ? result.filesMissing.join(", ") : "none"}`);
  console.log();

  // Also dump full JSON for inspection
  const outputPath = path.join(path.dirname(resolved), "linkedin-parsed-output.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Full JSON output saved to: ${outputPath}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCSVsFromFolder(folder: string): LinkedInCSVFiles {
  const csvFiles: LinkedInCSVFiles = {};
  const entries = fs.readdirSync(folder);

  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith(".csv")) continue;
    const fullPath = path.join(folder, entry);
    const content = fs.readFileSync(fullPath, "utf-8");
    csvFiles[entry] = content;
  }

  return csvFiles;
}

async function extractFromZip(zipPath: string): Promise<LinkedInCSVFiles> {
  const JSZip = (await import("jszip")).default;
  const buffer = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(buffer);

  const allowlist = new Set(RELEVANT_FILES.map((f: string) => f.toLowerCase()));
  const csvFiles: LinkedInCSVFiles = {};

  for (const [filePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const basename = filePath.replace(/\\/g, "/").split("/").pop() || "";
    if (!allowlist.has(basename.toLowerCase())) continue;

    const content = await entry.async("string");
    const canonicalName = RELEVANT_FILES.find(
      (f: string) => f.toLowerCase() === basename.toLowerCase(),
    );
    if (canonicalName) {
      csvFiles[canonicalName] = content;
    }
  }

  return csvFiles;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
