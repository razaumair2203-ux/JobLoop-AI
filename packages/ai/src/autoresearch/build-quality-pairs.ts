/**
 * Build Quality Test Pairs for AutoResearch
 *
 * Sources:
 *   - CVs: snehaanbhawal/resume-dataset (2,484 LiveCareer resumes, 24 industries, CC0)
 *   - JDs: R-series real pairs (74 real LinkedIn JDs, 17 industries, avg 4,268 chars)
 *   - Alpha: 4 human-verified pairs (military/aerospace)
 *
 * Process:
 *   1. Sample 40 CVs across 20 categories (2 per category)
 *   2. Match each with industry-appropriate R-series JD
 *   3. Parse CV via NIM → structured expected_output + cloud_skills
 *   4. Extract JD requirements via NIM → structured jd_requirements
 *   5. Add 4 Alpha pairs + 6 best synthetic pairs = 50 total
 *   6. Split: 25 train / 15 validation / 10 held-out
 *
 * Usage:
 *   NVIDIA_NIM_API_KEY=... npx tsx packages/ai/src/autoresearch/build-quality-pairs.ts
 *
 * Rate limited to 40 RPM (NIM free tier). ~80 API calls = ~2 minutes.
 */

import * as fs from "fs";
import * as path from "path";

// Load .env
const envPath = path.resolve(__dirname, "../../../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ============================================================
// CONFIG
// ============================================================

const DATASET_PATH = path.resolve(__dirname, "../../../../dev-data/datasets/snehaanbhawal-resumes.json");
const REAL_PAIRS_DIR = path.join(__dirname, "test-bank", "real-pairs");
const TEST_BANK_DIR = path.join(__dirname, "test-bank");
const ARCHIVE_DIR = path.join(__dirname, "test-bank", "archive");
const NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NIM_MODEL = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.3-70b-instruct";

// Category → R-series industry mapping
const CATEGORY_TO_INDUSTRY: Record<string, string[]> = {
  "HR": ["hr"],
  "INFORMATION-TECHNOLOGY": ["technology"],
  "ENGINEERING": ["engineering"],
  "HEALTHCARE": ["healthcare"],
  "FINANCE": ["finance"],
  "SALES": ["sales"],
  "TEACHER": ["education"],
  "CONSTRUCTION": ["construction"],
  "BANKING": ["finance"],
  "AVIATION": ["aviation"],
  "DESIGNER": ["arts_media", "communications"],
  "CONSULTANT": ["consulting", "management"],
  "DIGITAL-MEDIA": ["communications", "arts_media"],
  "ACCOUNTANT": ["finance"],
  "CHEF": ["hospitality"],
  "BUSINESS-DEVELOPMENT": ["sales", "management"],
  "AGRICULTURE": ["agriculture"],
  "PUBLIC-RELATIONS": ["communications"],
  "ARTS": ["arts_media"],
  "FITNESS": ["hospitality", "healthcare"],
  "APPAREL": ["sales", "arts_media"],
  "ADVOCATE": ["legal"],
  "AUTOMOBILE": ["engineering", "operations"],
  "BPO": ["operations", "technology"],
};

// Category → persona mapping
const CATEGORY_TO_PERSONA: Record<string, string> = {
  "HR": "mid_career",
  "INFORMATION-TECHNOLOGY": "mid_career",
  "ENGINEERING": "senior",
  "HEALTHCARE": "mid_career",
  "FINANCE": "senior",
  "SALES": "mid_career",
  "TEACHER": "career_changer",
  "CONSTRUCTION": "senior",
  "BANKING": "mid_career",
  "AVIATION": "senior",
  "DESIGNER": "freelancer",
  "CONSULTANT": "senior",
  "DIGITAL-MEDIA": "early_career",
  "ACCOUNTANT": "mid_career",
  "CHEF": "career_changer",
  "BUSINESS-DEVELOPMENT": "senior",
  "AGRICULTURE": "mid_career",
  "PUBLIC-RELATIONS": "mid_career",
  "ARTS": "freelancer",
  "FITNESS": "early_career",
  "APPAREL": "mid_career",
  "ADVOCATE": "senior",
  "AUTOMOBILE": "mid_career",
  "BPO": "early_career",
};

// ============================================================
// NIM API
// ============================================================

let lastCallMs = 0;
async function rateLimit(): Promise<void> {
  const gap = Date.now() - lastCallMs;
  if (gap < 1500) await new Promise(r => setTimeout(r, 1500 - gap));
  lastCallMs = Date.now();
}

async function callNIM(system: string, user: string, maxTokens = 4096): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_NIM_API_KEY not set");

  await rateLimit();

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NIM ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ============================================================
// PROMPTS
// ============================================================

const CV_PARSE_PROMPT = `You are a CV/resume parser. Extract structured information from the resume text.
Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence professional summary",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "start_date": "MM/YYYY or YYYY",
      "end_date": "MM/YYYY or Present",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "skills": {
    "Category Name": ["skill1", "skill2"]
  },
  "certifications": ["Cert Name"],
  "education": ["Degree, Institution, Year"]
}

Rules:
- Extract ALL work experience entries with company names and dates exactly as written
- If company is anonymized (e.g., "Company Name"), keep it as-is
- Group skills into logical categories (Technical, Management, Domain, Soft Skills, etc.)
- Include certifications and education if mentioned
- Each experience bullet should start with an action verb
- Do NOT fabricate — only extract what's explicitly stated
- Return ONLY the JSON object, no markdown fences, no commentary`;

const JD_EXTRACT_PROMPT = `You are a job description parser. Extract the key requirements from this job posting.
Return ONLY valid JSON with this exact structure:
{
  "requirements": [
    {"text": "requirement description", "type": "must_have"},
    {"text": "nice-to-have requirement", "type": "nice_to_have"}
  ],
  "experience_years": null,
  "responsibilities": ["responsibility 1", "responsibility 2"]
}

Rules:
- Extract 8-15 requirements from the JD
- Classify each as "must_have" or "nice_to_have"
- If experience years are mentioned (e.g., "5+ years"), extract as a number
- Extract key responsibilities (up to 8)
- Do NOT invent requirements not in the text
- Return ONLY the JSON object, no markdown fences`;

// ============================================================
// UTILITIES
// ============================================================

function safeParseJSON(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

interface ResumeRow {
  id: number;
  category: string;
  resume_str: string;
  resume_str_len: number;
}

interface RSeriesJD {
  id: string;
  industry: string;
  seniority: string;
  title: string;
  company: string;
  location: string;
  full_description: string;
  experience_years: number | null;
}

interface TestPairOutput {
  id: string;
  split: "train" | "validation" | "held_out";
  persona: string;
  source_resume: {
    id: string;
    dataset: string;
    industry: string;
    seniority: string;
  };
  jd: {
    title: string;
    company: string;
    location: string;
    experience_years: number | null;
    requirements: Array<{ text: string; type: string }>;
    responsibilities: string[];
    full_description: string;
  };
  expected_output: {
    summary: string;
    experience: Array<{
      company: string;
      title: string;
      start_date: string;
      end_date: string;
      bullets: string[];
    }>;
    skills: Record<string, string[]>;
    certifications: string[];
    education: string[];
  };
  jd_requirements: string[];
  cloud_skills: string[];
  provenance: Record<string, unknown>;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n=== Building Quality Test Pairs ===");
  console.log(`Model: ${NIM_MODEL}`);
  console.log(`API key: ${process.env.NVIDIA_NIM_API_KEY ? "SET" : "NOT SET"}\n`);

  if (!process.env.NVIDIA_NIM_API_KEY) {
    console.error("ERROR: Set NVIDIA_NIM_API_KEY");
    process.exit(1);
  }

  // 1. Load snehaanbhawal dataset
  console.log("Loading snehaanbhawal dataset...");
  const allResumes: ResumeRow[] = JSON.parse(fs.readFileSync(DATASET_PATH, "utf-8"));
  console.log(`  ${allResumes.length} resumes loaded`);

  // 2. Load R-series JDs
  console.log("Loading R-series JDs...");
  const rSeriesJDs: RSeriesJD[] = [];
  const rFiles = fs.readdirSync(REAL_PAIRS_DIR).filter(f => f.endsWith(".json")).sort();
  for (const f of rFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(REAL_PAIRS_DIR, f), "utf-8"));
    const jd = raw.jd || {};
    if ((jd.full_description || "").length < 500) continue; // Skip short JDs
    rSeriesJDs.push({
      id: raw.id,
      industry: raw.source_resume?.industry || "unknown",
      seniority: raw.source_resume?.seniority || "unknown",
      title: jd.title || "",
      company: jd.company || "",
      location: jd.location || "",
      full_description: jd.full_description || "",
      experience_years: jd.experience_years || null,
    });
  }
  console.log(`  ${rSeriesJDs.length} R-series JDs loaded (500+ chars)`);

  // 3. Sample 40 CVs: 2 per top 20 categories
  console.log("\nSampling 40 CVs across categories...");
  const categories = Object.keys(CATEGORY_TO_INDUSTRY);
  const selectedCVs: Array<{ cv: ResumeRow; jd: RSeriesJD; category: string }> = [];

  // Group resumes by category
  const byCategory: Record<string, ResumeRow[]> = {};
  for (const r of allResumes) {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  }

  // Group JDs by industry
  const jdByIndustry: Record<string, RSeriesJD[]> = {};
  for (const jd of rSeriesJDs) {
    if (!jdByIndustry[jd.industry]) jdByIndustry[jd.industry] = [];
    jdByIndustry[jd.industry].push(jd);
  }

  // Track used JDs to avoid duplicates
  const usedJDIds = new Set<string>();

  for (const cat of categories) {
    const resumes = byCategory[cat];
    if (!resumes || resumes.length === 0) continue;

    const targetIndustries = CATEGORY_TO_INDUSTRY[cat] || [];

    // Find available JDs for this category
    let availableJDs: RSeriesJD[] = [];
    for (const ind of targetIndustries) {
      const jds = jdByIndustry[ind] || [];
      availableJDs.push(...jds.filter(j => !usedJDIds.has(j.id)));
    }

    // If no JDs available for mapped industry, try any unused JD
    if (availableJDs.length === 0) {
      availableJDs = rSeriesJDs.filter(j => !usedJDIds.has(j.id));
    }

    if (availableJDs.length === 0) {
      console.log(`  [SKIP] ${cat}: no available JDs`);
      continue;
    }

    // Pick 2 resumes with good length (>3000 chars) and diverse content
    const goodResumes = resumes
      .filter(r => r.resume_str_len > 3000)
      .sort((a, b) => b.resume_str_len - a.resume_str_len);

    const count = Math.min(2, goodResumes.length, availableJDs.length);
    for (let i = 0; i < count; i++) {
      // Pick resume: first the longest, then a mid-range one for diversity
      const cvIdx = i === 0 ? 0 : Math.floor(goodResumes.length / 2);
      const cv = goodResumes[cvIdx];

      // Pick JD: round-robin through available
      const jd = availableJDs[i % availableJDs.length];
      usedJDIds.add(jd.id);

      selectedCVs.push({ cv, jd, category: cat });
    }

    console.log(`  ${cat}: ${count} pairs selected`);
  }

  console.log(`\nTotal CV+JD pairings: ${selectedCVs.length}`);

  // 4. Parse CVs and extract JD requirements via NIM
  console.log("\n=== Parsing CVs + Extracting JD Requirements via NIM ===\n");

  const newPairs: TestPairOutput[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < selectedCVs.length; i++) {
    const { cv, jd, category } = selectedCVs[i];
    const pairNum = (i + 1).toString().padStart(3, "0");
    const pairId = `pair-Q${pairNum}`;
    const persona = CATEGORY_TO_PERSONA[category] || "mid_career";

    console.log(`[${i + 1}/${selectedCVs.length}] ${pairId} | ${category} → ${jd.industry} | ${jd.title.slice(0, 50)}...`);

    try {
      // Parse CV
      const cvResponse = await callNIM(CV_PARSE_PROMPT, `Resume text:\n\n${cv.resume_str.slice(0, 6000)}`);
      const cvParsed = safeParseJSON(cvResponse) as TestPairOutput["expected_output"] | null;

      if (!cvParsed || !cvParsed.experience || (cvParsed.experience as Array<unknown>).length === 0) {
        console.log(`  FAILED: Invalid CV parse`);
        failCount++;
        continue;
      }

      // Extract JD requirements
      const jdResponse = await callNIM(JD_EXTRACT_PROMPT, `Job Description:\n\n${jd.full_description.slice(0, 5000)}`);
      const jdParsed = safeParseJSON(jdResponse) as {
        requirements: Array<{ text: string; type: string }>;
        experience_years: number | null;
        responsibilities: string[];
      } | null;

      if (!jdParsed || !jdParsed.requirements) {
        console.log(`  FAILED: Invalid JD parse`);
        failCount++;
        continue;
      }

      // Collect all skills for cloud_skills
      const allSkills: string[] = [];
      const skills = cvParsed.skills || {};
      for (const category of Object.values(skills)) {
        if (Array.isArray(category)) {
          allSkills.push(...(category as string[]));
        }
      }

      // Build jd_requirements list
      const jdRequirements = (jdParsed.requirements || [])
        .filter((r: { text: string; type: string }) => r.type === "must_have")
        .map((r: { text: string; type: string }) => r.text)
        .slice(0, 12);

      const experience = (cvParsed.experience as Array<{
        company: string; title: string; start_date: string; end_date: string; bullets: string[];
      }>).map(e => ({
        company: e.company || "",
        title: e.title || "",
        start_date: e.start_date || "",
        end_date: e.end_date || "",
        bullets: Array.isArray(e.bullets) ? e.bullets : [],
      }));

      const pair: TestPairOutput = {
        id: pairId,
        split: "train", // Will reassign splits later
        persona,
        source_resume: {
          id: `snb-${cv.id}`,
          dataset: "snehaanbhawal_livecareer",
          industry: category.toLowerCase().replace(/-/g, "_"),
          seniority: persona === "early_career" ? "entry" : persona === "senior" ? "senior" : "mid",
        },
        jd: {
          title: jd.title,
          company: jd.company,
          location: jd.location,
          experience_years: jdParsed.experience_years || jd.experience_years,
          requirements: jdParsed.requirements.slice(0, 15),
          responsibilities: (jdParsed.responsibilities || []).slice(0, 8),
          full_description: jd.full_description,
        },
        expected_output: {
          summary: (cvParsed.summary as string) || "",
          experience,
          skills: skills as Record<string, string[]>,
          certifications: Array.isArray(cvParsed.certifications) ? cvParsed.certifications as string[] : [],
          education: Array.isArray(cvParsed.education) ? cvParsed.education as string[] : [],
        },
        jd_requirements: jdRequirements,
        cloud_skills: allSkills,
        provenance: {
          cv_source: "snehaanbhawal/resume-dataset (LiveCareer, CC0)",
          jd_source: "R-series (Kaggle LinkedIn, real postings)",
          cv_dataset_id: cv.id,
          jd_pair_id: jd.id,
          expected_output_author: `NIM/${NIM_MODEL}`,
          generated_at: new Date().toISOString(),
          circularity_risk: "medium-low",
          circularity_notes: "Real CV text + real JD text. Expected output is LLM-parsed extraction from real text (not invention). 4/8 scorecard checks structurally sound regardless.",
          needs_human_review: true,
        },
      };

      newPairs.push(pair);
      successCount++;

      const expCount = experience.length;
      const skillCount = allSkills.length;
      const reqCount = jdRequirements.length;
      console.log(`  OK: ${expCount} roles, ${skillCount} skills, ${reqCount} JD reqs`);

    } catch (err) {
      console.log(`  ERROR: ${err instanceof Error ? err.message : err}`);
      failCount++;
    }
  }

  console.log(`\n=== NIM Processing Complete ===`);
  console.log(`Success: ${successCount}, Failed: ${failCount}`);

  if (newPairs.length < 30) {
    console.error(`\nERROR: Only ${newPairs.length} pairs generated (need 30+). Fix failures and retry.`);
    process.exit(1);
  }

  // 5. Assign splits: 60% train, 30% validation, 10% held-out
  // Shuffle first for randomness
  for (let i = newPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newPairs[i], newPairs[j]] = [newPairs[j], newPairs[i]];
  }

  const trainCount = Math.round(newPairs.length * 0.6);
  const valCount = Math.round(newPairs.length * 0.3);
  // Rest = held_out

  for (let i = 0; i < newPairs.length; i++) {
    if (i < trainCount) newPairs[i].split = "train";
    else if (i < trainCount + valCount) newPairs[i].split = "validation";
    else newPairs[i].split = "held_out";
  }

  // Re-sort by ID for file naming
  newPairs.sort((a, b) => a.id.localeCompare(b.id));

  // 6. Archive old pairs
  console.log("\n=== Archiving Old Pairs ===");
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  // Archive synthetic pairs (005-050)
  const testBankFiles = fs.readdirSync(TEST_BANK_DIR).filter(f => f.startsWith("pair-") && f.endsWith(".json"));
  let archivedCount = 0;
  for (const f of testBankFiles) {
    // Keep Alpha pairs (001-004), archive everything else
    const match = f.match(/pair-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 5) {
        fs.renameSync(path.join(TEST_BANK_DIR, f), path.join(ARCHIVE_DIR, f));
        archivedCount++;
      }
    }
  }
  console.log(`  Archived ${archivedCount} synthetic pairs to test-bank/archive/`);

  // Archive R-series (keep the dir but note it's superseded)
  const rSeriesFiles = fs.readdirSync(REAL_PAIRS_DIR).filter(f => f.endsWith(".json"));
  const rSeriesArchiveDir = path.join(ARCHIVE_DIR, "real-pairs");
  fs.mkdirSync(rSeriesArchiveDir, { recursive: true });
  let rArchivedCount = 0;
  for (const f of rSeriesFiles) {
    fs.renameSync(path.join(REAL_PAIRS_DIR, f), path.join(rSeriesArchiveDir, f));
    rArchivedCount++;
  }
  console.log(`  Archived ${rArchivedCount} R-series pairs to test-bank/archive/real-pairs/`);

  // 7. Write new pairs
  console.log("\n=== Writing New Pairs ===");

  for (const pair of newPairs) {
    const industry = pair.source_resume.industry.replace(/_/g, "-");
    const filename = `${pair.id}-${industry}-${pair.persona}.json`;
    fs.writeFileSync(
      path.join(TEST_BANK_DIR, filename),
      JSON.stringify(pair, null, 2),
    );
  }
  console.log(`  Wrote ${newPairs.length} new quality pairs`);

  // Stats
  const splits = { train: 0, validation: 0, held_out: 0 };
  const personas: Record<string, number> = {};
  const industries: Record<string, number> = {};
  let totalSkills = 0;
  let totalReqs = 0;
  let totalExp = 0;

  for (const p of newPairs) {
    splits[p.split]++;
    personas[p.persona] = (personas[p.persona] || 0) + 1;
    industries[p.source_resume.industry] = (industries[p.source_resume.industry] || 0) + 1;
    totalSkills += p.cloud_skills.length;
    totalReqs += p.jd_requirements.length;
    totalExp += p.expected_output.experience.length;
  }

  console.log("\n=== Final Statistics ===");
  console.log(`Total pairs: ${newPairs.length} (+ 4 Alpha = ${newPairs.length + 4})`);
  console.log(`Splits: train=${splits.train}, validation=${splits.validation}, held_out=${splits.held_out}`);
  console.log(`Avg skills/pair: ${(totalSkills / newPairs.length).toFixed(1)}`);
  console.log(`Avg JD reqs/pair: ${(totalReqs / newPairs.length).toFixed(1)}`);
  console.log(`Avg experience entries/pair: ${(totalExp / newPairs.length).toFixed(1)}`);
  console.log(`\nPersonas: ${JSON.stringify(personas)}`);
  console.log(`Industries: ${JSON.stringify(industries)}`);

  console.log("\n=== NEXT STEPS ===");
  console.log("1. Review 15 pairs manually (human calibration layer)");
  console.log("2. Run: npx tsx packages/ai/src/autoresearch/run-loop.ts --target cv-generation --iterations 10");
}

main().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
