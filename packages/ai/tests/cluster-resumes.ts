/**
 * Resume Clustering Script
 *
 * Clusters resumes from both datasets (master_resumes.jsonl + resume-atlas.csv)
 * into industry × seniority buckets, picks diverse representatives for test pair generation.
 *
 * Usage: npx tsx packages/ai/tests/cluster-resumes.ts
 *
 * Output: datasets/clustered-resumes.json (representatives per cluster)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const MASTER_RESUMES = path.resolve(__dirname, "../../../datasets/master_resumes.jsonl");
const RESUME_ATLAS = path.resolve(__dirname, "../../../datasets/resume-atlas.csv");
const OUTPUT = path.resolve(__dirname, "../../../datasets/clustered-resumes.json");

// ============================================================
// TYPES
// ============================================================

interface ClusteredResume {
  id: string;
  source: "master_resumes" | "resume_atlas";
  industry: string;
  seniority: string;
  title: string;
  skills_count: number;
  experience_years: number;
  location_country: string;
  /** For resume-atlas: raw text. For master_resumes: structured summary. */
  summary: string;
  /** Full record for later test pair generation */
  raw: unknown;
}

interface Cluster {
  industry: string;
  seniority: string;
  count: number;
  representatives: ClusteredResume[];
}

// ============================================================
// SENIORITY NORMALIZATION
// ============================================================

function normalizeSeniority(raw: string): string {
  const l = raw.toLowerCase().trim();
  if (l === "intern" || l === "internship") return "intern";
  if (l === "entry" || l === "entry-level" || l === "junior" || l === "fresher") return "entry";
  if (l === "mid" || l === "mid-level" || l === "mid-senior") return "mid";
  if (l === "senior" || l === "lead" || l === "principal" || l === "staff") return "senior";
  if (l === "manager" || l === "director" || l === "executive" || l === "vp" || l === "c-level") return "executive";
  return "unknown";
}

// ============================================================
// INDUSTRY NORMALIZATION (map resume-atlas categories → standard)
// ============================================================

const ATLAS_INDUSTRY_MAP: Record<string, string> = {
  "Accountant": "finance",
  "Agriculture": "agriculture",
  "Apparel": "retail_fashion",
  "Architecture": "architecture",
  "Arts": "arts_media",
  "Automobile": "automotive",
  "Aviation": "aviation",
  "Banking": "finance",
  "Blockchain": "technology",
  "BPO": "operations",
  "Building and Construction": "construction",
  "Business Analyst": "consulting",
  "Civil Engineer": "engineering",
  "Consultant": "consulting",
  "Data Science": "technology",
  "Database": "technology",
  "Designing": "design",
  "DevOps": "technology",
  "Digital Media": "arts_media",
  "DotNet Developer": "technology",
  "Education": "education",
  "Electrical Engineering": "engineering",
  "ETL Developer": "technology",
  "Finance": "finance",
  "Food and Beverages": "hospitality",
  "Health and Fitness": "healthcare",
  "Human Resources": "hr",
  "Information Technology": "technology",
  "Java Developer": "technology",
  "Management": "management",
  "Mechanical Engineer": "engineering",
  "Network Security Engineer": "technology",
  "Operations Manager": "operations",
  "PMO": "management",
  "Public Relations": "communications",
  "Python Developer": "technology",
  "React Developer": "technology",
  "Sales": "sales",
  "SAP Developer": "technology",
  "SQL Developer": "technology",
  "Testing": "technology",
  "Web Designing": "technology",
  "Advocate": "legal",
};

function normalizeIndustry(raw: string, source: "master_resumes" | "resume_atlas"): string {
  if (source === "resume_atlas") {
    return ATLAS_INDUSTRY_MAP[raw] ?? raw.toLowerCase().replace(/\s+/g, "_");
  }
  // master_resumes: most are "Technology" or "Unknown"
  const l = raw.toLowerCase();
  if (l.includes("technology") || l.includes("software") || l.includes("it ")) return "technology";
  if (l.includes("banking") || l.includes("finance")) return "finance";
  if (l.includes("energy") || l.includes("renewable")) return "energy";
  if (l.includes("education")) return "education";
  if (l.includes("health") || l.includes("medical")) return "healthcare";
  if (l.includes("engineering")) return "engineering";
  if (l.includes("automation")) return "technology";
  if (l === "unknown" || l === "" || l === "not provided") return "unknown";
  return l.replace(/\s+/g, "_");
}

// ============================================================
// PARSE MASTER_RESUMES.JSONL
// ============================================================

async function parseMasterResumes(): Promise<ClusteredResume[]> {
  const results: ClusteredResume[] = [];
  const stream = fs.createReadStream(MASTER_RESUMES, "utf-8");
  const rl = readline.createInterface({ input: stream });

  let idx = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      idx++;

      // Determine seniority from experience levels
      const levels = (d.experience ?? []).map((e: { level?: string }) => e.level ?? "unknown");
      const bestLevel = levels.includes("senior") ? "senior"
        : levels.includes("mid") ? "mid"
        : levels.includes("junior") ? "entry"
        : "unknown";

      // Determine industry from company_info
      let industry = "unknown";
      for (const exp of (d.experience ?? [])) {
        const ind = exp.company_info?.industry;
        if (ind && ind !== "Unknown" && ind !== "Not Provided" && ind !== "") {
          industry = ind;
          break;
        }
      }

      // Calculate experience years
      const expYears = (d.experience ?? []).reduce((sum: number, exp: { dates?: { duration?: string } }) => {
        const dur = exp.dates?.duration ?? "";
        const yearMatch = dur.match(/(\d+)\s*year/i);
        const monthMatch = dur.match(/(\d+)\s*month/i);
        return sum + (yearMatch ? parseInt(yearMatch[1]) : 0) + (monthMatch ? parseInt(monthMatch[1]) / 12 : 0);
      }, 0);

      // Count skills
      const techSkills = d.skills?.technical ?? {};
      let skillsCount = 0;
      for (const cat of Object.values(techSkills)) {
        if (Array.isArray(cat)) skillsCount += cat.length;
      }

      results.push({
        id: `mr-${idx.toString().padStart(5, "0")}`,
        source: "master_resumes",
        industry: normalizeIndustry(industry, "master_resumes"),
        seniority: normalizeSeniority(bestLevel),
        title: (d.experience ?? [])[0]?.title ?? "Unknown",
        skills_count: skillsCount,
        experience_years: Math.round(expYears * 10) / 10,
        location_country: d.personal_info?.location?.country ?? "Unknown",
        summary: d.personal_info?.summary ?? "",
        raw: d,
      });
    } catch {
      // Skip malformed lines
    }
  }
  return results;
}

// ============================================================
// PARSE RESUME-ATLAS.CSV
// ============================================================

async function parseResumeAtlas(): Promise<ClusteredResume[]> {
  const results: ClusteredResume[] = [];
  const content = fs.readFileSync(RESUME_ATLAS, "utf-8");
  const lines = content.split("\n");

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // CSV format: Category,Text (text may contain commas, quotes)
    const firstComma = line.indexOf(",");
    if (firstComma === -1) continue;

    const category = line.substring(0, firstComma).trim().replace(/^"/, "").replace(/"$/, "");
    let text = line.substring(firstComma + 1).trim().replace(/^"/, "").replace(/"$/, "");

    // Infer seniority from text
    const textLower = text.toLowerCase();
    let seniority = "unknown";
    if (/\b(?:director|vp|vice president|chief|cto|cfo|ceo)\b/.test(textLower)) seniority = "executive";
    else if (/\b(?:senior|lead|principal|staff|10\+|15\+|20\+)\s*(?:years?|yr)/.test(textLower)) seniority = "senior";
    else if (/\b(?:manager|team lead)\b/.test(textLower)) seniority = "senior";
    else if (/\b(?:5\+|6\+|7\+|8\+|9\+)\s*(?:years?|yr)/.test(textLower)) seniority = "mid";
    else if (/\b(?:junior|entry|intern|fresher|graduate|0-2|1-2)\b/.test(textLower)) seniority = "entry";
    else if (/\b(?:3\+|4\+)\s*(?:years?|yr)/.test(textLower)) seniority = "mid";

    // Estimate years from text
    const yearsMatch = textLower.match(/(\d+)\+?\s*(?:years?|yr)/);
    const expYears = yearsMatch ? parseInt(yearsMatch[1]) : 0;

    results.push({
      id: `ra-${i.toString().padStart(5, "0")}`,
      source: "resume_atlas",
      industry: normalizeIndustry(category, "resume_atlas"),
      seniority,
      title: category,
      skills_count: 0, // Not easily extractable from raw text
      experience_years: expYears,
      location_country: "Unknown",
      summary: text.substring(0, 500),
      raw: { category, text },
    });
  }
  return results;
}

// ============================================================
// CLUSTER + SELECT REPRESENTATIVES
// ============================================================

function clusterAndSelect(
  resumes: ClusteredResume[],
  maxPerCluster: number = 3,
): { clusters: Cluster[]; stats: Record<string, number> } {
  // Group by industry × seniority
  const groups = new Map<string, ClusteredResume[]>();
  for (const r of resumes) {
    const key = `${r.industry}::${r.seniority}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const clusters: Cluster[] = [];
  const industryStats: Record<string, number> = {};

  for (const [key, members] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const [industry, seniority] = key.split("::");

    // Pick diverse representatives:
    // Prefer resume-atlas (more diverse) over master_resumes (tech-heavy)
    // Prefer those with more experience data
    const sorted = members.sort((a, b) => {
      // Prefer resume_atlas
      if (a.source !== b.source) return a.source === "resume_atlas" ? -1 : 1;
      // Then by experience years (more = more interesting)
      return b.experience_years - a.experience_years;
    });

    const reps = sorted.slice(0, maxPerCluster);
    clusters.push({ industry, seniority, count: members.length, representatives: reps });
    industryStats[industry] = (industryStats[industry] ?? 0) + members.length;
  }

  return { clusters, stats: industryStats };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== Resume Clustering Script ===\n");

  // Parse both datasets
  console.log("Parsing master_resumes.jsonl...");
  const masterResumes = await parseMasterResumes();
  console.log(`  → ${masterResumes.length} resumes parsed`);

  console.log("Parsing resume-atlas.csv...");
  const atlasResumes = await parseResumeAtlas();
  console.log(`  → ${atlasResumes.length} resumes parsed`);

  const allResumes = [...masterResumes, ...atlasResumes];
  console.log(`\nTotal: ${allResumes.length} resumes\n`);

  // Cluster
  const { clusters, stats } = clusterAndSelect(allResumes, 3);

  // Report
  console.log("=== Industry Distribution ===");
  for (const [ind, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ind}: ${count}`);
  }

  console.log(`\n=== Clusters (${clusters.length} total) ===`);
  let totalReps = 0;
  for (const c of clusters) {
    if (c.count < 5) continue; // Skip tiny clusters
    console.log(`  ${c.industry} × ${c.seniority}: ${c.count} resumes → ${c.representatives.length} reps`);
    totalReps += c.representatives.length;
  }
  console.log(`\nTotal representatives selected: ${totalReps}`);

  // Filter out tiny clusters and unknown industry
  const usableClusters = clusters.filter(c => c.count >= 5 && c.industry !== "unknown");
  const output = {
    generated_at: new Date().toISOString(),
    total_resumes: allResumes.length,
    total_clusters: usableClusters.length,
    total_representatives: usableClusters.reduce((sum, c) => sum + c.representatives.length, 0),
    clusters: usableClusters.map(c => ({
      industry: c.industry,
      seniority: c.seniority,
      pool_size: c.count,
      representatives: c.representatives.map(r => ({
        id: r.id,
        source: r.source,
        title: r.title,
        experience_years: r.experience_years,
        skills_count: r.skills_count,
        location_country: r.location_country,
        summary: r.summary.substring(0, 200),
      })),
    })),
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\nSaved to: ${OUTPUT}`);
  console.log(`Usable clusters: ${usableClusters.length} (filtered out tiny <5 and unknown industry)`);
}

main().catch(console.error);
