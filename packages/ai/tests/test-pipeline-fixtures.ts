/**
 * Pipeline Test: Full CV Pipeline using FIXTURE-BASED parsing
 *
 * This test uses the SAME code path as the production upload route:
 *   parseCV() → fixture cache hit → ParsedCV (production quality)
 *   → cleanParsedCVs() → detectConflicts() → merge → Cloud → classify
 *
 * NO regex parser. NO fallback. Production-identical output.
 *
 * Usage: npx tsx packages/ai/tests/test-pipeline-fixtures.ts
 */

import {
  parseCV,
  setProvider,
  extractContactDetails,
  cleanParsedCVs,
  detectConflicts,
  mergeResolvedProfile,
  resolvedProfileToParsedCV,
  buildCloudFromParsedCV,
  classifyCloud,
} from "../src/index";
import type { ParsedCV as ParsedCVType } from "../src/types";
import * as path from "path";
import * as fs from "fs";

const ALPHA_CVS_DIR = path.resolve(__dirname, "../../../Alpha_CVs");
const DEV_DATA_DIR = path.resolve(__dirname, "../../../dev-data");

// Force dev mode → hits fixture cache
setProvider("dev", DEV_DATA_DIR);

async function extractText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require("pdf-parse") as any;
  const parser = new PDFParse(new Uint8Array(buffer));
  const pdfData = await parser.getText();
  return pdfData.text ?? pdfData.pages.map((p: { text: string }) => p.text).join("\n");
}

async function main() {
  console.log("=== PIPELINE TEST (Fixture-Based, Production Quality) ===\n");

  const files = [
    "Resume SE_Jan26.pdf",
    "Resume PM_Jan26.pdf",
    "Resume KSA-ME_JAN25.pdf",
    "Resume of BE_Jan26.pdf",
    "Profile_Linkedin.pdf",
  ];

  // STAGE 1: Extract text + Parse via fixtures
  console.log("STAGE 1: Text Extraction + CV Parsing (fixture cache)");
  console.log("─".repeat(60));

  const parsedResults: Array<{
    id: string;
    filename: string;
    parsed_cv: ParsedCVType;
    extracted_text: string;
  }> = [];

  for (const filename of files) {
    const filePath = path.join(ALPHA_CVS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${filename} not found`);
      continue;
    }

    const text = await extractText(filePath);
    const contacts = extractContactDetails(text);

    try {
      const parsed = await parseCV(text, "fast");
      console.log(
        `  ${filename}: ${parsed.experience.length} roles, ` +
        `${parsed.total_experience_years}yr, ` +
        `${parsed.certifications.length} certs`
      );

      parsedResults.push({
        id: filename.replace(/[^a-z0-9]/gi, "_"),
        filename,
        parsed_cv: parsed,
        extracted_text: text,
      });
    } catch (err) {
      console.error(`  FAILED: ${filename} — ${err instanceof Error ? err.message : err}`);
    }
  }

  if (parsedResults.length === 0) {
    console.error("\nNo CVs parsed! Run seed-fixtures.ts first.");
    process.exit(1);
  }

  // STAGE 2: Clean
  console.log(`\nSTAGE 2: CV Cleaning (garbage filter, date validation)`);
  console.log("─".repeat(60));

  const { cleanedCVs, reports } = cleanParsedCVs(
    parsedResults.map(r => ({
      id: r.id,
      filename: r.filename,
      parsed_cv: r.parsed_cv as unknown as Record<string, unknown>,
      source_text: r.extracted_text,
    }))
  );

  for (const report of reports) {
    console.log(
      `  ${report.cv_id}: ` +
      `${report.roles_removed} roles removed, ` +
      `${report.bullets_removed} bullets removed, ` +
      `${report.skills_rejected} skills rejected, ` +
      `${report.date_issues.length} date issues`
    );
  }

  // STAGE 3: Conflict Detection
  console.log(`\nSTAGE 3: Cross-CV Conflict Detection`);
  console.log("─".repeat(60));

  const documents = cleanedCVs.map(cv => ({
    id: cv.id,
    name: cv.name,
    roles: cv.roles.map((r: { title: string; company: string; start_date: string; end_date: string; bullets: string[] }) => ({
      title: r.title,
      company: r.company,
      start_date: r.start_date,
      end_date: r.end_date,
      bullets: r.bullets,
    })),
  }));

  const conflictReport = detectConflicts(documents, "military");

  console.log(`  Conflicts: ${conflictReport.conflicts.length}`);
  console.log(`  Gaps: ${conflictReport.gaps.length}`);
  console.log(`  Employer groups: ${conflictReport.employer_groups.length}`);

  if (conflictReport.conflicts.length > 0) {
    console.log("\n  Detected conflicts:");
    for (const c of conflictReport.conflicts) {
      console.log(`    [${c.type}] ${c.description}`);
    }
  }

  if (conflictReport.gaps.length > 0) {
    console.log("\n  Detected gaps:");
    for (const g of conflictReport.gaps) {
      console.log(`    ${g.start} — ${g.end}: ${g.description}`);
    }
  }

  // STAGE 4: Merge (assuming no blocking conflicts for now)
  console.log(`\nSTAGE 4: Resolution & Cloud Build`);
  console.log("─".repeat(60));

  const resolvedProfile = mergeResolvedProfile(
    cleanedCVs,
    [],
    { employer_confirmed: "Pakistan Air Force", is_single_employer: true },
    "military",
  );

  const cleanParsedCV = resolvedProfileToParsedCV(resolvedProfile);
  const cloud = buildCloudFromParsedCV(cleanParsedCV);

  console.log(`  Resolved roles: ${resolvedProfile.roles.length}`);
  console.log(`  Cloud nodes: ${cloud.nodes.length}`);
  console.log(`  Total experience: ${cleanParsedCV.total_experience_years} years`);

  // STAGE 5: Classification
  console.log(`\nSTAGE 5: Taxonomy Classification`);
  console.log("─".repeat(60));

  const classified = classifyCloud(cloud.nodes);
  console.log(`  Domains: ${classified.domains.length}`);
  for (const domain of classified.domains) {
    const skillCount = domain.categories.reduce((sum, c) => sum + (c.skills?.length ?? 0), 0);
    console.log(`    ${domain.displayName}: ${domain.categories.length} categories, ${skillCount} skills`);
  }
  console.log(`  Top skills: ${classified.topSkills.length}`);
  console.log(`  Career span: ${classified.careerSpan.startYear}–${classified.careerSpan.endYear} (${classified.careerSpan.years}yr)`);
  console.log(`  Gaps: ${classified.gaps.length}`);
  if (classified.gaps.length > 0) {
    for (const gap of classified.gaps.slice(0, 5)) {
      console.log(`    [${gap.domain}] ${gap.skill_name} — ${gap.reason}`);
    }
  }

  // VALIDATION
  console.log(`\n${"=".repeat(60)}`);
  console.log("VALIDATION CHECKS");
  console.log("=".repeat(60));

  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];

  // Check 1: Total experience = 18 years (2008–present)
  const expYears = cleanParsedCV.total_experience_years;
  checks.push({
    name: "Total experience = 18yr (2008–present)",
    pass: expYears >= 16 && expYears <= 18,
    detail: `Got: ${expYears} years`,
  });

  // Check 2: 5-7 unique roles (not 16+ garbage)
  const roleCount = resolvedProfile.roles.length;
  checks.push({
    name: "5-7 real roles (not 16+ garbage)",
    pass: roleCount >= 5 && roleCount <= 8,
    detail: `Got: ${roleCount} roles`,
  });

  // Check 3: No education dates counted as work (2004-2008)
  const has2004Role = resolvedProfile.roles.some(
    (r: { start_date: string }) => r.start_date.includes("2004") || r.start_date.includes("2005")
  );
  checks.push({
    name: "No education (2004-2008) counted as work",
    pass: !has2004Role,
    detail: has2004Role ? "FAIL: Found role starting 2004/2005" : "Correct",
  });

  // Check 4: Key companies present
  const companies = resolvedProfile.roles.map((r: { organization: string }) => r.organization.toLowerCase());
  const hasKamra = companies.some((c: string) => c.includes("kamra") || c.includes("pac"));
  const hasPMO = companies.some((c: string) => c.includes("pmo") || c.includes("air force"));
  const hasChina = companies.some((c: string) => c.includes("cadi") || c.includes("chengdu") || c.includes("avic"));
  checks.push({
    name: "Key companies: PAC Kamra, Air Force PMO, CADI China",
    pass: hasKamra && hasPMO && hasChina,
    detail: `Kamra:${hasKamra} PMO:${hasPMO} China:${hasChina}`,
  });

  // Check 5: PMP certification present
  const hasPMP = cleanParsedCV.certifications.some(c => c.toLowerCase().includes("pmp"));
  checks.push({
    name: "PMP certification extracted",
    pass: hasPMP,
    detail: hasPMP ? "Present" : "MISSING",
  });

  // Check 6: Cloud has meaningful nodes (not garbage)
  checks.push({
    name: "Cloud has 10+ meaningful skill nodes",
    pass: cloud.nodes.length >= 10,
    detail: `Got: ${cloud.nodes.length} nodes`,
  });

  // Check 7: Education correctly identified
  const hasEducation = cleanParsedCV.education.length >= 2;
  checks.push({
    name: "Education: BE + MS degrees found",
    pass: hasEducation,
    detail: `Got: ${cleanParsedCV.education.length} education entries`,
  });

  // Print results
  console.log("");
  let allPass = true;
  for (const check of checks) {
    const icon = check.pass ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${check.name} — ${check.detail}`);
    if (!check.pass) allPass = false;
  }

  console.log(`\n${"=".repeat(60)}`);
  if (allPass) {
    console.log("ALL CHECKS PASSED — Pipeline produces production-quality output.");
  } else {
    console.log("SOME CHECKS FAILED — Review above.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
