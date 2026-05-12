/**
 * CLI Fixture Generator — Reproducible, Zod-validated fixture creation with metadata
 *
 * Modes:
 *   1. FROM FILE:  Read ParsedCVOutput JSON from a file, validate, save as fixture
 *      npx tsx packages/ai/tests/cli-fixture-generator.ts --text Alpha_CVs/extracted/Resume_SE_Jan26.txt --json fixtures/se-raw.json
 *
 *   2. FROM API:   Extract text, call real Haiku, validate, save as fixture (needs API key)
 *      ANTHROPIC_API_KEY=sk-xxx npx tsx packages/ai/tests/cli-fixture-generator.ts --text Alpha_CVs/extracted/Resume_SE_Jan26.txt --api
 *
 *   3. BATCH:      Process all extracted text files in a directory
 *      npx tsx packages/ai/tests/cli-fixture-generator.ts --batch Alpha_CVs/extracted/ --json-dir packages/ai/tests/fixtures/raw/
 *
 * What it does:
 *   - Validates raw JSON against ParsedCVOutput Zod schema (with repair)
 *   - Converts to ParsedCV via apiOutputToParsedCV()
 *   - Saves to dev-data cache (matching provider.ts hash for runtime lookup)
 *   - Saves fixture metadata (source, model, prompt version, timestamp)
 *   - Redacts PII from saved fixture (email → redacted, phone → redacted)
 *
 * Usage: npx tsx packages/ai/tests/cli-fixture-generator.ts [options]
 */

import * as fs from "fs";
import * as path from "path";
import { setProvider, saveDevParsedCV } from "../src/provider";
import { validateParsedCVOutput, repairLLMOutput } from "../src/schema-validator";
import type { ParsedCVOutput } from "../src/prompts/cv-parser";
import type { ParsedCV } from "../src/types";

const DEV_DATA_DIR = path.resolve(__dirname, "../../../dev-data");
const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

// Set dev mode so saveDevParsedCV writes to correct location
setProvider("dev", DEV_DATA_DIR);

// ============================================================
// PII Redaction — NEVER save real contact details in fixtures
// ============================================================

function redactPII(parsed: ParsedCV): ParsedCV {
  return {
    ...parsed,
    name: parsed.name ? parsed.name.split(" ").map((w, i) => i === 0 ? w : w[0] + ".").join(" ") : undefined,
    email: parsed.email ? "redacted@example.com" : null,
    phone: parsed.phone ? "+XX-XXXXXXXXXX" : null,
    links: parsed.links ? {
      linkedin: parsed.links.linkedin ? "https://linkedin.com/in/redacted" : null,
      github: parsed.links.github ? "https://github.com/redacted" : null,
      portfolio: parsed.links.portfolio ? "https://redacted.example.com" : null,
      other: [],
    } : undefined,
  };
}

// ============================================================
// apiOutputToParsedCV — duplicated from analyze.ts to avoid circular deps
// ============================================================

function apiOutputToParsedCV(raw: ParsedCVOutput): ParsedCV {
  const allTech = new Set<string>([
    ...raw.skills.map(s => s.name),
    ...raw.experience.flatMap(e => e.technologies_used),
  ]);

  return {
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    location: raw.location,
    links: raw.links,
    summary: raw.summary,
    total_experience_years: raw.total_experience_years,
    experience: raw.experience.map(e => ({
      company: e.company,
      employer: e.employer,
      title: e.title,
      start_date: e.start_date,
      end_date: e.end_date,
      duration_months: e.duration_months,
      location: e.location,
      bullets: e.bullets,
      technologies_used: e.technologies_used,
      metrics_mentioned: e.metrics_mentioned,
      programs: e.programs,
      team_size: e.team_size,
      seniority_signals: e.seniority_signals,
      domain: e.domain,
    })),
    skills: raw.skills,
    all_technologies: Array.from(allTech),
    education: raw.education.map(e => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      start_year: e.start_year,
      end_year: e.end_year,
      grade: e.grade ?? undefined,
      research_topic: e.research_topic ?? undefined,
      highlights: e.highlights,
    })),
    certifications: raw.certifications.map(c =>
      typeof c === "string" ? c : c.name
    ),
    certifications_detailed: raw.certifications.filter(
      (c): c is Exclude<typeof c, string> => typeof c !== "string"
    ),
    competencies: raw.competencies,
    awards: raw.awards,
    projects: raw.projects,
    publications: raw.publications,
    volunteer: raw.volunteer,
    leadership: raw.leadership,
    professional_affiliations: raw.professional_affiliations,
    training: raw.training,
    languages_spoken: raw.languages_spoken,
  };
}

// ============================================================
// Fixture metadata
// ============================================================

interface FixtureMetadata {
  fixture_id: string;
  source_file: string;
  model_used: string;
  prompt_version: string;
  reviewed_by: string;
  approved: boolean;
  created_at: string;
  stats: {
    roles: number;
    years: number;
    skills: number;
    technologies: number;
    education: number;
    certifications: number;
  };
}

// ============================================================
// Core: Validate + Convert + Save
// ============================================================

function processFixture(
  extractedText: string,
  rawJson: Record<string, unknown>,
  sourceFile: string,
  modelUsed: string,
): { parsedCV: ParsedCV; metadata: FixtureMetadata } {
  // Step 1: Repair common LLM issues
  const repaired = repairLLMOutput(rawJson);

  // Step 2: Validate against Zod schema
  const validation = validateParsedCVOutput(repaired);
  if (!validation.valid) {
    throw new Error(`Zod validation failed:\n${validation.errorSummary}`);
  }

  const parsedOutput = validation.data as unknown as ParsedCVOutput;

  // Step 3: Convert to ParsedCV
  const parsedCV = apiOutputToParsedCV(parsedOutput);

  // Step 4: Save to dev-data cache (runtime lookup uses this)
  saveDevParsedCV(extractedText, parsedCV);

  // Step 5: Save PII-redacted fixture + metadata to fixtures/
  const fixtureId = path.basename(sourceFile, path.extname(sourceFile))
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();

  const metadata: FixtureMetadata = {
    fixture_id: fixtureId,
    source_file: sourceFile,
    model_used: modelUsed,
    prompt_version: "cv-parser-v3",
    reviewed_by: "pending",
    approved: false,
    created_at: new Date().toISOString().split("T")[0],
    stats: {
      roles: parsedCV.experience.length,
      years: parsedCV.total_experience_years,
      skills: parsedCV.skills.length,
      technologies: parsedCV.all_technologies.length,
      education: parsedCV.education.length,
      certifications: parsedCV.certifications.length,
    },
  };

  // Save redacted fixture
  const redacted = redactPII(parsedCV);
  const fixtureDir = path.join(FIXTURES_DIR, fixtureId);
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(fixtureDir, "parsed-cv.json"),
    JSON.stringify(redacted, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    path.join(fixtureDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8",
  );

  return { parsedCV, metadata };
}

// ============================================================
// CLI: Parse args and run
// ============================================================

function printUsage() {
  console.log(`
Usage:
  npx tsx packages/ai/tests/cli-fixture-generator.ts --text <extracted.txt> --json <raw-output.json>
  npx tsx packages/ai/tests/cli-fixture-generator.ts --batch <extracted-dir/> --json-dir <raw-json-dir/>

Options:
  --text <file>       Path to extracted text file
  --json <file>       Path to ParsedCVOutput JSON file
  --batch <dir>       Process all .txt files in directory
  --json-dir <dir>    Directory containing matching .json files for batch mode
  --model <name>      Model name for metadata (default: "claude-opus-4-6")
  --help              Show this help
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const modelUsed = getArg("--model") ?? "claude-opus-4-6";
  const textPath = getArg("--text");
  const jsonPath = getArg("--json");
  const batchDir = getArg("--batch");
  const jsonDir = getArg("--json-dir");

  // Ensure output dirs exist
  if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  const responsesDir = path.join(DEV_DATA_DIR, "responses");
  if (!fs.existsSync(responsesDir)) fs.mkdirSync(responsesDir, { recursive: true });

  if (batchDir && jsonDir) {
    // Batch mode
    const textFiles = fs.readdirSync(batchDir).filter(f => f.endsWith(".txt") && !f.startsWith("_"));
    console.log(`Batch processing ${textFiles.length} files...\n`);

    let success = 0;
    for (const txtFile of textFiles) {
      const baseName = path.basename(txtFile, ".txt");
      const jsonFile = path.join(jsonDir, `${baseName}.json`);

      if (!fs.existsSync(jsonFile)) {
        console.log(`  SKIP: ${txtFile} (no matching .json)`);
        continue;
      }

      process.stdout.write(`  ${txtFile}... `);
      try {
        const text = fs.readFileSync(path.join(batchDir, txtFile), "utf-8");
        const rawJson = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
        const { metadata } = processFixture(text, rawJson, txtFile, modelUsed);
        console.log(`OK — ${metadata.stats.roles} roles, ${metadata.stats.years}yr, ${metadata.stats.skills} skills`);
        success++;
      } catch (err) {
        console.log(`FAIL: ${err instanceof Error ? err.message : err}`);
      }
    }
    console.log(`\nDone: ${success}/${textFiles.length} fixtures generated.`);

  } else if (textPath && jsonPath) {
    // Single file mode
    const text = fs.readFileSync(textPath, "utf-8");
    const rawJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const { metadata } = processFixture(text, rawJson, path.basename(textPath), modelUsed);
    console.log(`Fixture generated: ${metadata.fixture_id}`);
    console.log(`  Roles: ${metadata.stats.roles}, Years: ${metadata.stats.years}, Skills: ${metadata.stats.skills}`);
    console.log(`  Saved to: ${FIXTURES_DIR}/${metadata.fixture_id}/`);
    console.log(`  Cache: ${responsesDir}/`);

  } else {
    console.error("ERROR: Provide either --text + --json, or --batch + --json-dir");
    printUsage();
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
