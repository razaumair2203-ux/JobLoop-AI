/**
 * Fix Ground Truth in JD Test Pairs
 *
 * Problem: Ground truth company/title/location don't match what's in full_description.
 * The parser correctly extracts from full_description, but scores low because GT is wrong.
 *
 * Principle: Ground truth = what the JD text ACTUALLY SAYS.
 * - Company: the company name as it appears in the JD text
 * - Title: the job title as it appears in the JD text (usually first line / "Role:" field)
 * - Location: the location as stated in the JD text (NOT empty when JD clearly states a city)
 * - Experience years: extract min/max range, not just min
 *
 * Usage:
 *   npx tsx packages/ai/src/autoresearch/fix-ground-truth.ts [--apply] [--verbose]
 *
 * Without --apply: dry run, shows proposed changes
 * With --apply: writes changes to test pair files
 */

import * as fs from "fs";
import * as path from "path";

const TEST_BANK_DIR = path.join(__dirname, "test-bank");

interface TestPairJD {
  title: string;
  company: string;
  location: string;
  experience_years: number | null;
  experience_years_min?: number | null;
  experience_years_max?: number | null;
  requirements: Array<{ text: string; type: string }>;
  responsibilities: string[];
  full_description: string;
}

interface Correction {
  field: string;
  old_value: string;
  new_value: string;
  source: string; // Where in full_description we found it
}

// ============================================================
// EXTRACTION FROM full_description
// ============================================================

function extractCompanyFromJD(fullDesc: string, currentCompany: string): { company: string; source: string } | null {
  // If currentCompany appears literally in the text, it's fine — no fix needed
  if (fullDesc.toLowerCase().includes(currentCompany.toLowerCase())) {
    return null;
  }

  // Only use HIGH CONFIDENCE patterns — "About X" and "Why Work with X"
  // The "at X" pattern is too noisy with concatenated JD text

  // Pattern: "About <Company>" section — very reliable
  const aboutMatch = fullDesc.match(/About\s+([A-Z][A-Za-z0-9\s&.'()-]{2,40})(?:\n|:|$)/);

  // Pattern: "Why Work with/at <Company>"
  const whyMatch = fullDesc.match(/Why\s+(?:Work|Join)\s+(?:with|at|for)\s+([A-Z][A-Za-z0-9\s&.'()-]{2,40})(?:\n|:|!|$)/i);

  if (whyMatch) {
    const name = whyMatch[1].trim();
    if (name.length >= 3 && !/^(Us|The|Our|You|This|A\b)/.test(name)) {
      return { company: name, source: `"Why Work with ${name}"` };
    }
  }

  if (aboutMatch) {
    const name = aboutMatch[1].trim();
    // Filter out generic words that aren't company names
    if (name.length >= 3 && !/^(Us|The|Our|You|This|A\b|Role|Position|Job)/.test(name)) {
      return { company: name, source: `"About ${name}"` };
    }
  }

  // Not confident enough to extract — skip
  return null;
}

function extractTitleFromJD(fullDesc: string, currentTitle: string): { title: string; source: string } | null {
  // If current title appears literally in full_description, no fix needed
  if (fullDesc.includes(currentTitle)) {
    return null;
  }

  // Only extract from explicit "Role: <Title>" pattern — high confidence
  // Don't use first-line heuristics — too noisy with concatenated JD text
  const roleMatch = fullDesc.match(/(?:^|[\n])(?:Role|Job\s*Title)\s*:\s*([^\n]{5,100}?)(?:Location|$)/i);
  if (roleMatch) {
    const title = roleMatch[1].trim();
    // Sanity: must look like a job title (not a salary or description)
    if (title.length > 5 && title.length < 100
      && !/^\$/.test(title)
      && !/^(?:The|This|We|Our|Description|Minimum|What|As the)/i.test(title)
      && title !== currentTitle) {
      return { title, source: `"Role: ${title}"` };
    }
  }

  // Not confident enough — skip. Better to keep a slightly wrong title than replace with garbage.
  return null;
}

function extractLocationFromJD(fullDesc: string, currentLocation: string): { location: string; source: string } | null {
  // If current location is already populated, skip
  if (currentLocation && currentLocation.trim()) return null;

  // Pattern 1: "Location: <city, state>" — highest confidence
  const locMatch = fullDesc.match(/Location\s*:\s*(.+?)(?:\n|$)/i);
  if (locMatch) {
    let loc = locMatch[1].trim();
    // Clean common suffixes and noise
    loc = loc.replace(/\s*[-–]\s*(?:Hybrid|Remote|On-?site|In-Office).*$/i, "").trim();
    loc = loc.replace(/\s*\(.*?\)\s*$/g, "").trim();
    // If "Location: Remote" — that's valid
    if (/^Remote$/i.test(loc)) {
      return { location: "Remote", source: '"Location: Remote"' };
    }
    // Must look like a location, not a run-on sentence
    if (loc.length > 2 && loc.length < 50 && !/[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/i.test(loc)) {
      return { location: loc, source: `"Location: ${loc}"` };
    }
    // Location field contains garbage (concatenated text) — try city,ST extraction within it
    const cityInLoc = loc.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
    if (cityInLoc) {
      const cleanLoc = `${cityInLoc[1]}, ${cityInLoc[2]}`;
      return { location: cleanLoc, source: `Extracted "${cleanLoc}" from Location field` };
    }
  }

  // Pattern 2: "based in <city>" or "located in <city>" — good confidence
  const basedMatch = fullDesc.match(/(?:based|located)\s+in\s+([A-Z][A-Za-z\s,]{3,40}?)(?:\.|,\s+(?:and|with|this|paying)|\n)/i);
  if (basedMatch) {
    const loc = basedMatch[1].trim();
    // Sanity: must be short and look like a place
    if (loc.length >= 3 && loc.length < 40 && !/^(?:the|a|an|this|our)\b/i.test(loc)) {
      return { location: loc, source: `"based in ${loc}"` };
    }
  }

  // Pattern 3: city + state abbreviation in first 500 chars — moderate confidence
  // Use lookbehind-aware pattern to catch "New York, NY" not just "York, NY"
  const earlyText = fullDesc.slice(0, 500);
  const cityStateMatch = earlyText.match(/\b((?:[A-Z][a-z]+\s+)*[A-Z][a-z]+),\s*([A-Z]{2})\b/);
  if (cityStateMatch) {
    const state = cityStateMatch[2];
    // Filter false positives: "Excel, MS" is not a location
    const falsePositives = new Set(["MS", "AS", "IS", "IT", "OR", "IN", "ME", "BI", "NA", "PM", "AM", "HR"]);
    if (!falsePositives.has(state)) {
      const loc = `${cityStateMatch[1]}, ${state}`;
      return { location: loc, source: `Found "${loc}" in text` };
    }
  }

  // Pattern 4: "Work Location: Remote" at end of JD
  if (/Work\s*Location\s*:\s*Remote/i.test(fullDesc)) {
    return { location: "Remote", source: '"Work Location: Remote"' };
  }

  return null;
}

function extractExperienceRange(fullDesc: string, currentMin: number | null): {
  min: number | null;
  max: number | null;
  source: string;
} | null {
  // Pattern: "5-10 years" or "5+ years" or "minimum 5 years" or "at least 5 years"
  const rangeMatch = fullDesc.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:\+\s*)?(?:years?|yrs?)/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return { min, max, source: `"${rangeMatch[0]}"` };
  }

  const plusMatch = fullDesc.match(/(\d+)\+\s*(?:years?|yrs?)/i);
  if (plusMatch) {
    const min = parseInt(plusMatch[1]);
    return { min, max: null, source: `"${plusMatch[0]}"` };
  }

  const minMatch = fullDesc.match(/(?:minimum|at\s+least|min\.?)\s*(?:of\s+)?(\d+)\s*(?:years?|yrs?)/i);
  if (minMatch) {
    const min = parseInt(minMatch[1]);
    return { min, max: null, source: `"${minMatch[0]}"` };
  }

  const yearsMatch = fullDesc.match(/(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp\.?)/i);
  if (yearsMatch) {
    const min = parseInt(yearsMatch[1]);
    if (min !== currentMin) {
      return { min, max: null, source: `"${yearsMatch[0]}"` };
    }
  }

  return null;
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const verbose = args.includes("--verbose");

  console.log("\n========================================");
  console.log("  Ground Truth Fixer — JD Test Pairs");
  console.log(`  Mode: ${apply ? "APPLY (writing changes)" : "DRY RUN (preview only)"}`);
  console.log("========================================\n");

  const files = fs.readdirSync(TEST_BANK_DIR)
    .filter(f => f.startsWith("pair-") && f.endsWith(".json"))
    .sort();

  let totalPairs = 0;
  let pairsWithFixes = 0;
  let totalFixes = 0;
  const allCorrections: Array<{ file: string; corrections: Correction[] }> = [];

  for (const file of files) {
    const filepath = path.join(TEST_BANK_DIR, file);
    const raw = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    const jd = raw.jd as TestPairJD | undefined;

    if (!jd?.full_description) continue;
    totalPairs++;

    const corrections: Correction[] = [];

    // 1. Fix location (most common issue — empty when JD has a location)
    const locFix = extractLocationFromJD(jd.full_description, jd.location);
    if (locFix) {
      corrections.push({
        field: "location",
        old_value: jd.location || "(empty)",
        new_value: locFix.location,
        source: locFix.source,
      });
    }

    // 2. Fix experience years (add max if range exists)
    const expFix = extractExperienceRange(jd.full_description, jd.experience_years);
    if (expFix && (expFix.min !== jd.experience_years || expFix.max !== (jd.experience_years_max ?? null))) {
      if (expFix.min !== jd.experience_years) {
        corrections.push({
          field: "experience_years",
          old_value: String(jd.experience_years),
          new_value: String(expFix.min),
          source: expFix.source,
        });
      }
      if (expFix.max !== undefined && expFix.max !== null) {
        corrections.push({
          field: "experience_years_max (NEW)",
          old_value: "(not set)",
          new_value: String(expFix.max),
          source: expFix.source,
        });
      }
    }

    // 3. Fix company (only if current doesn't appear in full_description)
    const companyFix = extractCompanyFromJD(jd.full_description, jd.company);
    if (companyFix) {
      corrections.push({
        field: "company",
        old_value: jd.company,
        new_value: companyFix.company,
        source: companyFix.source,
      });
    }

    // 4. Fix title (only if current doesn't appear in full_description)
    const titleFix = extractTitleFromJD(jd.full_description, jd.title);
    if (titleFix) {
      corrections.push({
        field: "title",
        old_value: jd.title,
        new_value: titleFix.title,
        source: titleFix.source,
      });
    }

    if (corrections.length > 0) {
      pairsWithFixes++;
      totalFixes += corrections.length;
      allCorrections.push({ file, corrections });

      console.log(`${file}:`);
      for (const c of corrections) {
        console.log(`  ${c.field}: "${c.old_value}" -> "${c.new_value}"`);
        if (verbose) console.log(`    Source: ${c.source}`);
      }
      console.log();

      // Apply changes if --apply
      if (apply) {
        for (const c of corrections) {
          if (c.field === "location") {
            raw.jd.location = c.new_value;
          } else if (c.field === "experience_years") {
            raw.jd.experience_years = parseInt(c.new_value) || null;
          } else if (c.field === "experience_years_max (NEW)") {
            raw.jd.experience_years_max = parseInt(c.new_value) || null;
          } else if (c.field === "company") {
            raw.jd.company = c.new_value;
          } else if (c.field === "title") {
            raw.jd.title = c.new_value;
          }
        }
        fs.writeFileSync(filepath, JSON.stringify(raw, null, 2) + "\n");
      }
    }
  }

  console.log("========================================");
  console.log(`  SUMMARY`);
  console.log("========================================");
  console.log(`  Total pairs scanned: ${totalPairs}`);
  console.log(`  Pairs with fixes: ${pairsWithFixes}`);
  console.log(`  Total corrections: ${totalFixes}`);
  console.log();

  if (!apply && totalFixes > 0) {
    console.log("  Run with --apply to write changes to files.");
    console.log("  Run with --verbose for source details.");
  }

  if (apply) {
    console.log("  Changes applied to test pair files.");

    // Save correction log
    const logPath = path.join(__dirname, "results", "ground-truth-corrections.json");
    fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
    fs.writeFileSync(logPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      total_pairs: totalPairs,
      pairs_fixed: pairsWithFixes,
      total_corrections: totalFixes,
      corrections: allCorrections,
    }, null, 2));
    console.log(`  Correction log: ${logPath}`);
  }
}

main();
