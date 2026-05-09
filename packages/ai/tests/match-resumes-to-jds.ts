/**
 * Resume-JD Matching Script
 *
 * Takes clustered resumes + Indeed JD dataset → matches by industry/title overlap
 * Outputs candidate test pairs for human review.
 *
 * Usage: npx tsx packages/ai/tests/match-resumes-to-jds.ts
 *
 * Prerequisites:
 *   - Run cluster-resumes.ts first (creates datasets/clustered-resumes.json)
 *   - Indeed samples cloned (datasets/indeed-samples/)
 *   - Optionally: Kaggle LinkedIn dataset (datasets/linkedin-job-postings/)
 *
 * Output: datasets/candidate-test-pairs.json
 */

import * as fs from "fs";
import * as path from "path";
const CLUSTERED = path.resolve(__dirname, "../../../datasets/clustered-resumes.json");
const INDEED_CSV = path.resolve(__dirname, "../../../datasets/indeed-samples/indeed-job-listings-information.csv");
const LINKEDIN_SAMPLE = path.resolve(__dirname, "../../../datasets/linkedin-jd-sample.jsonl");
const JD_2025 = path.resolve(__dirname, "../../../datasets/jd-2025/job_dataset.csv");
const OUTPUT = path.resolve(__dirname, "../../../datasets/candidate-test-pairs.json");

// ============================================================
// TYPES
// ============================================================

interface JDRecord {
  id: string;
  source: "indeed" | "linkedin" | "jd_2025";
  title: string;
  company: string;
  description: string;
  location: string;
  country: string;
  industry_guess: string;
  seniority_guess: string;
}

interface CandidatePair {
  pair_id: string;
  resume: {
    id: string;
    source: string;
    title: string;
    industry: string;
    seniority: string;
    experience_years: number;
    summary: string;
  };
  jd: {
    id: string;
    source: string;
    title: string;
    company: string;
    industry_guess: string;
    seniority_guess: string;
    description_preview: string;
  };
  match_score: number;
  match_reasons: string[];
}

// ============================================================
// INDUSTRY KEYWORDS FOR JD CLASSIFICATION
// ============================================================

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  technology: ["software", "developer", "engineer", "devops", "cloud", "data", "machine learning", "ai", "frontend", "backend", "fullstack", "sre", "platform", "api", "database", "python", "java", "react", "node"],
  finance: ["financial", "accounting", "banking", "audit", "tax", "investment", "analyst", "actuarial", "portfolio", "trading", "compliance", "underwriter"],
  healthcare: ["nurse", "medical", "health", "clinical", "patient", "pharma", "therapy", "physician", "dental", "radiology", "psycho", "hospital"],
  engineering: ["mechanical", "electrical", "civil", "structural", "chemical", "manufacturing", "quality", "industrial"],
  sales: ["sales", "account executive", "business development", "territory", "revenue"],
  hr: ["human resources", "recruiter", "talent", "hr ", "people operations", "compensation"],
  education: ["teacher", "professor", "instructor", "curriculum", "education", "academic", "tutor"],
  operations: ["operations", "logistics", "supply chain", "warehouse", "procurement", "fleet"],
  consulting: ["consultant", "advisory", "strategy", "management consulting"],
  communications: ["public relations", "marketing", "content", "social media", "communications", "copywriter", "editor"],
  legal: ["attorney", "lawyer", "legal", "paralegal", "compliance", "advocate"],
  aviation: ["aviation", "pilot", "aircraft", "aerospace", "flight", "avionics"],
  construction: ["construction", "building", "site", "project manager", "contractor", "foreman"],
  design: ["designer", "ux", "ui", "graphic", "creative", "visual"],
  hospitality: ["restaurant", "hotel", "chef", "food", "beverage", "hospitality", "catering"],
  agriculture: ["agriculture", "farm", "agri", "crop", "veterinary"],
  automotive: ["automotive", "vehicle", "motor", "mechanic", "dealership"],
  architecture: ["architect", "urban planning", "landscape"],
  retail_fashion: ["retail", "fashion", "apparel", "store", "merchandise"],
  management: ["program manager", "project manager", "director", "vp ", "general manager"],
  arts_media: ["writer", "journalist", "producer", "media", "film", "music", "creative"],
  energy: ["energy", "oil", "gas", "renewable", "solar", "wind", "power", "utility"],
};

function guessIndustry(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch = "unknown";
  let bestScore = 0;

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }
  return bestMatch;
}

function guessSeniority(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(?:director|vp|vice president|chief|head of|c-suite)\b/.test(text)) return "executive";
  if (/\b(?:senior|sr\.|lead|principal|staff)\b/.test(text)) return "senior";
  if (/\b(?:manager|supervisor)\b/.test(text)) return "senior";
  if (/\b(?:junior|jr\.|entry|intern|associate|graduate|trainee)\b/.test(text)) return "entry";
  if (/\b(?:mid|intermediate|experienced)\b/.test(text)) return "mid";
  return "unknown";
}

// ============================================================
// PARSE INDEED JDS
// ============================================================

function parseIndeedJDs(): JDRecord[] {
  if (!fs.existsSync(INDEED_CSV)) {
    console.log("  Indeed CSV not found, skipping");
    return [];
  }

  const content = fs.readFileSync(INDEED_CSV, "utf-8");
  const lines = content.split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"/, "").replace(/"$/, ""));

  const results: JDRecord[] = [];

  // Simple CSV parse (handle quoted fields with commas)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Use regex to split CSV properly (respecting quotes)
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = fields[idx] ?? ""; });

    const title = row["job_title"] ?? "";
    const desc = row["description_text"] ?? "";
    if (!title || desc.length < 100) continue;

    results.push({
      id: `indeed-${row["jobid"] || i}`,
      source: "indeed",
      title,
      company: row["company_name"] ?? "Unknown",
      description: desc,
      location: row["location"] ?? "",
      country: row["country"] ?? "US",
      industry_guess: guessIndustry(title, desc),
      seniority_guess: guessSeniority(title, desc),
    });
  }

  return results;
}

// ============================================================
// PARSE LINKEDIN JDS (from pre-extracted JSONL sample)
// ============================================================

function parseLinkedInJDs(): JDRecord[] {
  if (!fs.existsSync(LINKEDIN_SAMPLE)) {
    console.log("  LinkedIn JSONL sample not found. Run: python datasets/extract-linkedin-sample.py");
    return [];
  }

  const lines = fs.readFileSync(LINKEDIN_SAMPLE, "utf-8").split("\n");
  const results: JDRecord[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      const title = d.title ?? "";
      const desc = d.description ?? "";
      if (!title || desc.length < 100) continue;

      // Map LinkedIn experience levels to our seniority
      const levelMap: Record<string, string> = {
        "Entry level": "entry",
        "Associate": "entry",
        "Internship": "entry",
        "Mid-Senior level": "senior",
        "Director": "executive",
        "Executive": "executive",
      };

      results.push({
        id: `linkedin-${d.id}`,
        source: "linkedin",
        title,
        company: d.company ?? "Unknown",
        description: desc,
        location: d.location ?? "",
        country: "US",
        industry_guess: guessIndustry(title, desc),
        seniority_guess: levelMap[d.experience_level] ?? guessSeniority(title, desc),
      });
    } catch {
      // Skip malformed lines
    }
  }

  return results;
}

// ============================================================
// PARSE JD 2025 DATASET (Tech & Non-Tech Roles)
// ============================================================

function parseJD2025(): JDRecord[] {
  if (!fs.existsSync(JD_2025)) {
    console.log("  JD 2025 dataset not found, skipping");
    return [];
  }

  const content = fs.readFileSync(JD_2025, "utf-8");
  const lines = content.split("\n");
  const results: JDRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // CSV: JobID,Title,ExperienceLevel,YearsOfExperience,Skills,Responsibilities,Keywords
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    const title = fields[1] ?? "";
    const responsibilities = fields[5] ?? "";
    const skills = fields[4] ?? "";
    const desc = `${responsibilities}\n\nRequired Skills: ${skills}`;
    if (!title || desc.length < 50) continue;

    const levelMap: Record<string, string> = {
      "Entry-Level": "entry", "Junior": "entry",
      "Mid-Level": "mid",
      "Senior": "senior", "Lead": "senior",
      "Executive": "executive", "Director": "executive",
    };

    results.push({
      id: `jd2025-${fields[0] || i}`,
      source: "jd_2025",
      title,
      company: "Unknown",
      description: desc,
      location: "",
      country: "US",
      industry_guess: guessIndustry(title, desc),
      seniority_guess: levelMap[fields[2] ?? ""] ?? guessSeniority(title, desc),
    });
  }

  return results;
}

// ============================================================
// MATCH RESUMES TO JDS
// ============================================================

function matchResumesToJDs(
  clusteredPath: string,
  jds: JDRecord[],
  maxPairsPerCluster: number = 2,
): CandidatePair[] {
  const clustered = JSON.parse(fs.readFileSync(clusteredPath, "utf-8"));
  const pairs: CandidatePair[] = [];
  let pairIdx = 0;

  // Group JDs by industry
  const jdsByIndustry = new Map<string, JDRecord[]>();
  for (const jd of jds) {
    if (!jdsByIndustry.has(jd.industry_guess)) jdsByIndustry.set(jd.industry_guess, []);
    jdsByIndustry.get(jd.industry_guess)!.push(jd);
  }

  console.log("\n=== JD Industry Distribution ===");
  for (const [ind, list] of [...jdsByIndustry.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${ind}: ${list.length} JDs`);
  }

  for (const cluster of clustered.clusters) {
    const { industry, seniority, representatives } = cluster;

    // Find matching JDs: same industry, or related
    let candidateJDs = jdsByIndustry.get(industry) ?? [];

    // If no exact match, try broader match
    if (candidateJDs.length === 0) {
      // Try unknown JDs
      candidateJDs = jdsByIndustry.get("unknown") ?? [];
    }

    if (candidateJDs.length === 0) continue;

    // Score each JD by: seniority match + title word overlap with resume reps
    const repTitleWords = new Set(
      representatives.flatMap((r: { title: string }) =>
        r.title.toLowerCase().split(/[\s/,()-]+/).filter((w: string) => w.length > 3)
      )
    );

    const sortedJDs = [...candidateJDs]
      .map(jd => {
        const jdWords = jd.title.toLowerCase().split(/[\s/,()-]+/).filter(w => w.length > 3);
        const titleOverlap = jdWords.filter(w => repTitleWords.has(w)).length;
        const seniorityMatch = jd.seniority_guess === seniority ? 2 : 0;
        return { jd, relevance: titleOverlap * 3 + seniorityMatch };
      })
      .filter(x => x.relevance > 0) // ONLY keep JDs with some title overlap or seniority match
      .sort((a, b) => b.relevance - a.relevance)
      .map(x => x.jd);

    // Match top resume rep to top JD
    const usedJDs = new Set<string>();
    for (const rep of representatives.slice(0, maxPairsPerCluster)) {
      const jd = sortedJDs.find(j => !usedJDs.has(j.id));
      if (!jd) break;
      usedJDs.add(jd.id);
      pairIdx++;

      const reasons: string[] = [];
      if (jd.industry_guess === industry) reasons.push(`industry match: ${industry}`);
      if (jd.seniority_guess === seniority) reasons.push(`seniority match: ${seniority}`);
      if (jd.seniority_guess !== seniority && seniority !== "unknown") reasons.push(`seniority mismatch: resume=${seniority}, jd=${jd.seniority_guess}`);

      // Simple title word overlap score
      const resumeWords = new Set(rep.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
      const jdWords = new Set(jd.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const overlap = [...resumeWords].filter(w => jdWords.has(w)).length;
      if (overlap > 0) reasons.push(`title overlap: ${overlap} words`);

      pairs.push({
        pair_id: `cp-${pairIdx.toString().padStart(3, "0")}`,
        resume: {
          id: rep.id,
          source: rep.source,
          title: rep.title,
          industry,
          seniority,
          experience_years: rep.experience_years,
          summary: rep.summary,
        },
        jd: {
          id: jd.id,
          source: jd.source,
          title: jd.title,
          company: jd.company,
          industry_guess: jd.industry_guess,
          seniority_guess: jd.seniority_guess,
          description_preview: jd.description.substring(0, 300),
        },
        match_score: (jd.industry_guess === industry ? 2 : 0) + (jd.seniority_guess === seniority ? 1 : 0) + overlap,
        match_reasons: reasons,
      });
    }
  }

  // Sort by match score descending
  pairs.sort((a, b) => b.match_score - a.match_score);
  return pairs;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== Resume-JD Matching Script ===\n");

  if (!fs.existsSync(CLUSTERED)) {
    console.error("ERROR: Run cluster-resumes.ts first to generate clustered-resumes.json");
    process.exit(1);
  }

  // Parse all JD sources
  console.log("Parsing Indeed JDs...");
  const indeedJDs = parseIndeedJDs();
  console.log(`  → ${indeedJDs.length} JDs parsed`);

  console.log("Parsing LinkedIn JDs...");
  const linkedinJDs = parseLinkedInJDs();
  console.log(`  → ${linkedinJDs.length} JDs parsed`);

  console.log("Parsing JD 2025 dataset...");
  const jd2025 = parseJD2025();
  console.log(`  → ${jd2025.length} JDs parsed`);

  const allJDs = [...indeedJDs, ...linkedinJDs, ...jd2025];
  console.log(`\nTotal JDs: ${allJDs.length}`);

  if (allJDs.length === 0) {
    console.error("\nERROR: No JDs found. Need at least the Indeed samples.");
    console.error("Run: cd datasets && git clone https://github.com/luminati-io/Indeed-dataset-samples indeed-samples");
    process.exit(1);
  }

  // Match
  console.log("\nMatching resumes to JDs...");
  const pairs = matchResumesToJDs(CLUSTERED, allJDs, 2);

  // Stats
  const matchedIndustries = new Set(pairs.map(p => p.resume.industry));
  const avgScore = pairs.reduce((s, p) => s + p.match_score, 0) / pairs.length;
  const goodPairs = pairs.filter(p => p.match_score >= 2);

  console.log(`\n=== Results ===`);
  console.log(`Total candidate pairs: ${pairs.length}`);
  console.log(`Good matches (score >= 2): ${goodPairs.length}`);
  console.log(`Industries covered: ${matchedIndustries.size}`);
  console.log(`Average match score: ${avgScore.toFixed(1)}`);

  console.log(`\n=== Top 20 Pairs ===`);
  for (const p of pairs.slice(0, 20)) {
    console.log(`  ${p.pair_id} [${p.match_score}] ${p.resume.industry}/${p.resume.seniority}: "${p.resume.title}" ↔ "${p.jd.title}" (${p.jd.company})`);
  }

  // Save
  const output = {
    generated_at: new Date().toISOString(),
    total_pairs: pairs.length,
    good_pairs: goodPairs.length,
    industries_covered: matchedIndustries.size,
    jd_sources: {
      indeed: indeedJDs.length,
      linkedin: linkedinJDs.length,
      jd_2025: jd2025.length,
    },
    pairs: pairs,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\nSaved to: ${OUTPUT}`);
  console.log(`\nNext: Review top pairs, download LinkedIn dataset for more JDs, then generate test pairs.`);
}

main().catch(console.error);
