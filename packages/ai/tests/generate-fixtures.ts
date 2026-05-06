/**
 * Generate CV Parse Fixtures — Calls real Haiku API and caches results
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-xxx npx tsx packages/ai/tests/generate-fixtures.ts
 *
 * This is the industry-standard approach: real API + caching.
 * After running once, all subsequent dev-mode calls hit cached fixtures (zero cost).
 *
 * Cost: ~$0.01–0.05 total for all 5 CVs via Haiku.
 */

import * as fs from "fs";
import * as path from "path";
import { setProvider } from "../src/provider";
import { parseCV } from "../src/analyze";

// Force API mode — we WANT to hit the real API and cache
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY not set. Cannot generate fixtures.");
  console.error("Run: ANTHROPIC_API_KEY=sk-xxx npx tsx packages/ai/tests/generate-fixtures.ts");
  process.exit(1);
}

// Set dev mode with project root dev-data dir — parseCV auto-caches in dev mode
const DEV_DATA_DIR = path.resolve(__dirname, "../../../dev-data");
setProvider("dev", DEV_DATA_DIR);

const ALPHA_CVS_DIR = path.resolve(__dirname, "../../../Alpha_CVs");

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === ".pdf") {
    // pdf-parse v2.x API
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { PDFParse } = require("pdf-parse") as any;
    const parser = new PDFParse(new Uint8Array(buffer));
    const pdfData = await parser.getText();
    return pdfData.text ?? pdfData.pages.map((p: { text: string }) => p.text).join("\n");
  } else if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

async function main() {
  const files = fs.readdirSync(ALPHA_CVS_DIR)
    .filter(f => f.endsWith(".pdf") || f.endsWith(".docx"))
    .map(f => path.join(ALPHA_CVS_DIR, f));

  if (files.length === 0) {
    console.error("No PDF/DOCX files found in Alpha_CVs/");
    process.exit(1);
  }

  console.log(`Found ${files.length} CV files to process:\n`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const filename = path.basename(file);
    process.stdout.write(`  ${filename}... `);

    try {
      const text = await extractText(file);
      if (text.trim().length < 50) {
        console.log("SKIP (no text extracted)");
        continue;
      }

      // parseCV in dev mode: checks cache first, if miss → calls Haiku → auto-caches
      const parsed = await parseCV(text, "fast");

      console.log(
        `OK — ${parsed.experience.length} roles, ` +
        `${parsed.total_experience_years}yr, ` +
        `${parsed.all_technologies.length} techs`
      );
      success++;
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} cached, ${failed} failed.`);
  console.log(`Fixtures saved to: ${DEV_DATA_DIR}/responses/`);

  if (success > 0) {
    console.log("\nNext dev-mode calls will use cached fixtures instantly (zero API cost).");
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
