/**
 * Seed dev-data/responses/ fixture cache from Alpha CVs.
 *
 * Runs the EXACT same text extraction pipeline as the upload route:
 *   extractPDFText → normalizeExtractedText → preprocessExtractedText
 * then hashes the result and copies existing parsed-cv.json fixtures
 * into dev-data/responses/cv-parse-{hash}.json
 *
 * Usage: npx tsx packages/ai/tests/seed-dev-fixtures.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  extractPDFText,
  normalizeExtractedText,
  preprocessExtractedText,
} from "../src/index";

const MONOREPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// Map: PDF file path → test fixture directory name
const CV_MAP: Array<{ pdf: string; fixture: string }> = [
  {
    pdf: "Alpha_CVs/2/Copy of Copy of Dr. Sibgha Saliha Resume_Aug-25.pdf",
    fixture: "copy_of_copy_of_dr__sibgha_saliha_resume_aug-25",
  },
  {
    pdf: "Alpha_CVs/2/Copy of Dr. Sibgha Saliha Resume_IIMCT.pdf",
    fixture: "copy_of_dr__sibgha_saliha_resume_iimct",
  },
  {
    pdf: "Alpha_CVs/2/Dr. Sibgha Saliha Resume.pdf",
    fixture: "dr__sibgha_saliha_resume",
  },
  {
    pdf: "Alpha_CVs/2/Dr. Sibgha Saliha Resume_Pak.pdf",
    fixture: "dr__sibgha_saliha_resume_pak",
  },
  // User 1 CVs
  {
    pdf: "Alpha_CVs/1/Resume KSA-ME_JAN25.pdf",
    fixture: "resume_ksa-me_jan25",
  },
  {
    pdf: "Alpha_CVs/1/Resume of BE_Jan26.pdf",
    fixture: "resume_of_be_jan26",
  },
  {
    pdf: "Alpha_CVs/1/Resume PM_Jan26.pdf",
    fixture: "resume_pm_jan26",
  },
  {
    pdf: "Alpha_CVs/1/Resume SE_Jan26.pdf",
    fixture: "resume_se_jan26",
  },
  {
    pdf: "Alpha_CVs/1/Profile_Linkedin.pdf",
    fixture: "profile_linkedin",
  },
];

function hashString(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

async function main() {
  const responsesDir = path.join(MONOREPO_ROOT, "dev-data", "responses");
  fs.mkdirSync(responsesDir, { recursive: true });

  let seeded = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of CV_MAP) {
    const pdfPath = path.join(MONOREPO_ROOT, entry.pdf);
    const fixturePath = path.join(
      MONOREPO_ROOT,
      "packages/ai/tests/fixtures",
      entry.fixture,
      "parsed-cv.json"
    );

    // Check PDF exists
    if (!fs.existsSync(pdfPath)) {
      console.warn(`  SKIP ${entry.pdf} — PDF not found`);
      skipped++;
      continue;
    }

    // Check fixture exists
    if (!fs.existsSync(fixturePath)) {
      console.warn(`  SKIP ${entry.fixture} — parsed-cv.json not found`);
      skipped++;
      continue;
    }

    try {
      // Run same pipeline as upload route
      const buffer = fs.readFileSync(pdfPath);
      const pdfResult = await extractPDFText(buffer);
      let text = pdfResult.text;

      const normalized = normalizeExtractedText(text);
      text = normalized.text;

      const preprocessed = preprocessExtractedText(text);
      text = preprocessed.text;

      // Hash and save
      const hash = hashString(text);
      const cacheFile = path.join(responsesDir, `cv-parse-${hash}.json`);
      const fixtureData = fs.readFileSync(fixturePath, "utf-8");

      fs.writeFileSync(cacheFile, fixtureData, "utf-8");
      console.log(`  OK ${entry.fixture} → cv-parse-${hash}.json (${text.length} chars)`);
      seeded++;
    } catch (err) {
      console.error(`  ERR ${entry.fixture}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  console.log(`\nDone: ${seeded} seeded, ${skipped} skipped, ${errors} errors`);
  console.log(`Fixtures in: ${responsesDir}`);
}

main().catch(console.error);
