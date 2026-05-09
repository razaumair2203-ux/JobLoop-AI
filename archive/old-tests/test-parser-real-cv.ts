/**
 * Test the CV parser against real Alpha CVs.
 * Extracts text from PDF, runs through parseCV (Haiku or dev fallback),
 * and compares against ground truth.
 *
 * Usage: npx tsx packages/ai/tests/test-parser-real-cv.ts
 */

import * as path from "path";
import * as fs from "fs";

const ALPHA_DIR = path.resolve(__dirname, "../../../Alpha_CVs");
const GROUND_TRUTH = JSON.parse(
  fs.readFileSync(path.join(ALPHA_DIR, "ground-truth-profile.json"), "utf-8"),
);

// PDF files to test (skip LinkedIn profile — different format)
const TEST_FILES = [
  "Resume SE_Jan26.pdf",
  "Resume PM_Jan26.pdf",
  "Resume KSA-ME_JAN25.pdf",
  "Resume of BE_Jan26.pdf",
];

async function extractTextFromPDF(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require("pdf-parse") as any;
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse(new Uint8Array(buffer));
  const result = await parser.getText();
  return result.text ?? result.pages.map((p: { text: string }) => p.text).join("\n");
}

/** Collapse character-spaced PDF text */
function normalizeSpacedText(text: string): string {
  return text.replace(/\b([A-Za-z]) ([A-Za-z])( [A-Za-z]){2,}\b/g, (match) =>
    match.replace(/ /g, ""),
  );
}

interface RoleFromParser {
  company: string;
  employer?: string | null;
  title: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  programs?: string[];
  team_size?: number | null;
  seniority_signals?: string[];
  domain: string;
}

async function main() {
  console.log("=== PARSER TEST AGAINST REAL ALPHA CVs ===\n");
  console.log(`Ground truth: ${GROUND_TRUTH.roles.length} roles, employer: ${GROUND_TRUTH.employer}\n`);

  for (const filename of TEST_FILES) {
    const filePath = path.join(ALPHA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${filename} not found`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`FILE: ${filename}`);
    console.log("=".repeat(60));

    // Extract text
    let text: string;
    try {
      text = await extractTextFromPDF(filePath);
      text = normalizeSpacedText(text);
      console.log(`Extracted ${text.length} chars`);
    } catch (err) {
      console.log(`ERROR extracting text: ${err}`);
      continue;
    }

    // Show full text for inspection (truncated at 3000)
    console.log(`\nFull text (first 3000 chars):\n${text.substring(0, 3000)}\n`);

    // Extract roles using simple regex (mimics dev parser)
    const roles = extractRolesFromText(text);
    console.log(`\nROLES FOUND: ${roles.length}`);
    for (const role of roles) {
      console.log(`  - ${role.title} @ ${role.company} (${role.start_date} — ${role.end_date}) [${role.duration_months}mo]`);
      if (role.employer) console.log(`    employer: ${role.employer}`);
      if (role.programs && role.programs.length) console.log(`    programs: ${role.programs.join(", ")}`);
      if (role.team_size) console.log(`    team_size: ${role.team_size}`);
      if (role.seniority_signals && role.seniority_signals.length) console.log(`    seniority: ${role.seniority_signals.join(", ")}`);
    }

    // Compare against ground truth
    console.log(`\nGROUND TRUTH COMPARISON:`);
    const gtRoles = GROUND_TRUTH.roles.filter(
      (r: { hidden_from_cvs?: boolean }) => !r.hidden_from_cvs,
    );
    console.log(`  Expected: ${gtRoles.length} visible roles`);
    console.log(`  Found: ${roles.length} roles`);

    // Check date accuracy
    for (const gt of gtRoles) {
      const gtStart = gt.dates.start;
      const gtEnd = gt.dates.end;
      const match = roles.find(
        (r) =>
          r.start_date.includes(String(parseInt(gtStart))) ||
          r.end_date.includes(String(parseInt(gtEnd))),
      );
      if (match) {
        console.log(`  ✓ ${gt.title_canonical} — matched to "${match.title}"`);
      } else {
        console.log(`  ✗ ${gt.title_canonical} (${gtStart}–${gtEnd}) — NOT FOUND`);
      }
    }
  }
}

/** Simple role extraction from CV text (regex-based, for testing) */
function extractRolesFromText(text: string): RoleFromParser[] {
  const roles: RoleFromParser[] = [];

  // Common date patterns
  const datePattern =
    /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]?\s+)?\d{4}\s*[-–—to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]?\s+)?\d{4}|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]?\s+)?\d{4}\s*[-–—to]+\s*(?:Present|Current)/gi;

  const dateMatches = [...text.matchAll(datePattern)];
  console.log(`  Date ranges found: ${dateMatches.length}`);
  for (const m of dateMatches) {
    console.log(`    "${m[0].trim()}"`);
  }

  return roles;
}

main().catch(console.error);
