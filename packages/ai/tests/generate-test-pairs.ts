/**
 * Generate Test Pairs for AutoResearch
 *
 * Takes the top candidate pairs from match-resumes-to-jds.ts and
 * converts them into test-bank format with full data.
 *
 * For master_resumes source: structured data → ParsedCV-like format (no LLM needed)
 * For resume_atlas source: raw text → needs LLM parsing (marks as needs_parsing)
 * For JDs: extracts requirements from description text via keyword patterns
 *
 * Usage: npx tsx packages/ai/tests/generate-test-pairs.ts
 *
 * Output: packages/ai/src/autoresearch/test-bank/real-pairs/pair-R001-*.json
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const CANDIDATE_PAIRS = path.resolve(__dirname, "../../../datasets/candidate-test-pairs.json");
const MASTER_RESUMES = path.resolve(__dirname, "../../../datasets/master_resumes.jsonl");
const RESUME_ATLAS = path.resolve(__dirname, "../../../datasets/resume-atlas.csv");
const LINKEDIN_SAMPLE = path.resolve(__dirname, "../../../datasets/linkedin-jd-sample.jsonl");
const INDEED_CSV = path.resolve(__dirname, "../../../datasets/indeed-samples/indeed-job-listings-information.csv");
const JD_2025 = path.resolve(__dirname, "../../../datasets/jd-2025/job_dataset.csv");
const OUTPUT_DIR = path.resolve(__dirname, "../src/autoresearch/test-bank/real-pairs");

const MAX_PAIRS = 80;

// ============================================================
// DATA LOADERS (build indexes for fast lookup)
// ============================================================

async function loadMasterResumesIndex(): Promise<Map<string, unknown>> {
  const index = new Map<string, unknown>();
  const stream = fs.createReadStream(MASTER_RESUMES, "utf-8");
  const rl = readline.createInterface({ input: stream });
  let idx = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      idx++;
      const d = JSON.parse(line);
      index.set(`mr-${idx.toString().padStart(5, "0")}`, d);
    } catch { /* skip */ }
  }
  return index;
}

function loadResumeAtlasIndex(): Map<string, { category: string; text: string }> {
  const index = new Map<string, { category: string; text: string }>();
  const content = fs.readFileSync(RESUME_ATLAS, "utf-8");
  const lines = content.split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const firstComma = line.indexOf(",");
    if (firstComma === -1) continue;
    const category = line.substring(0, firstComma).trim().replace(/^"/, "").replace(/"$/, "");
    const text = line.substring(firstComma + 1).trim().replace(/^"/, "").replace(/"$/, "");
    index.set(`ra-${i.toString().padStart(5, "0")}`, { category, text });
  }
  return index;
}

function loadLinkedInJDIndex(): Map<string, { title: string; company: string; description: string; location: string; experience_level: string; skills_desc: string }> {
  const index = new Map();
  if (!fs.existsSync(LINKEDIN_SAMPLE)) return index;
  const lines = fs.readFileSync(LINKEDIN_SAMPLE, "utf-8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      index.set(`linkedin-${d.id}`, d);
    } catch { /* skip */ }
  }
  return index;
}

function loadIndeedJDIndex(): Map<string, { title: string; company: string; description: string; location: string }> {
  const index = new Map();
  if (!fs.existsSync(INDEED_CSV)) return index;
  const content = fs.readFileSync(INDEED_CSV, "utf-8");
  // Simple line-by-line parse with quote handling
  const rows = parseCSVRobust(content);
  for (const row of rows) {
    const id = `indeed-${row["jobid"] || ""}`;
    index.set(id, {
      title: row["job_title"] ?? "",
      company: row["company_name"] ?? "",
      description: row["description_text"] ?? "",
      location: row["location"] ?? "",
    });
  }
  return index;
}

function parseCSVRobust(content: string): Record<string, string>[] {
  const lines = content.split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"/, "").replace(/"$/, ""));
  const results: Record<string, string>[] = [];

  let currentLine = "";
  let inQuotes = false;

  for (let i = 1; i < lines.length; i++) {
    currentLine += (currentLine ? "\n" : "") + lines[i];

    // Count unescaped quotes to determine if we're mid-field
    for (const char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
    }

    if (!inQuotes) {
      // Parse the complete record
      const fields: string[] = [];
      let field = "";
      let q = false;
      for (const char of currentLine) {
        if (char === '"') { q = !q; }
        else if (char === "," && !q) { fields.push(field); field = ""; }
        else { field += char; }
      }
      fields.push(field);

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (fields[idx] ?? "").trim(); });
      if (row[headers[0]]) results.push(row);

      currentLine = "";
    }
  }
  return results;
}

// ============================================================
// EXTRACT JD REQUIREMENTS FROM DESCRIPTION TEXT
// ============================================================

function extractRequirements(description: string): string[] {
  const reqs: string[] = [];
  const lines = description.split(/\n/);
  let inRequirementsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    // Detect requirements sections
    if (/\b(requirements?|qualifications?|what you.?ll need|must have|you should have|minimum|required)\b/i.test(lower) && trimmed.length < 80) {
      inRequirementsSection = true;
      continue;
    }
    if (/\b(responsibilities|about the|what you.?ll do|nice to have|preferred|benefits|perks|about us)\b/i.test(lower) && trimmed.length < 80) {
      inRequirementsSection = false;
      continue;
    }

    // Collect bullet points in requirements sections
    if (inRequirementsSection && trimmed.length > 10 && trimmed.length < 300) {
      const cleaned = trimmed
        .replace(/^[-•*·►▸●○]\s*/, "") // Remove bullet markers
        .replace(/^\d+[\.\)]\s*/, "")   // Remove numbered markers
        .trim();
      if (cleaned.length > 10) reqs.push(cleaned);
    }
  }

  // If no structured requirements found, extract keyword phrases
  if (reqs.length === 0) {
    const patterns = [
      /(\d+\+?\s*years?\s+(?:of\s+)?experience\s+in\s+[^,.]+)/gi,
      /(bachelor'?s?|master'?s?|ph\.?d\.?)\s+(?:degree\s+)?in\s+[^,.]+/gi,
      /(?:proficien(?:t|cy)|experience|expertise|knowledge)\s+(?:in|with|of)\s+[^,.]+/gi,
    ];
    for (const pattern of patterns) {
      const matches = description.match(pattern);
      if (matches) reqs.push(...matches.map(m => m.trim()));
    }
  }

  // Deduplicate and limit
  const unique = [...new Set(reqs)];
  return unique.slice(0, 15);
}

// ============================================================
// EXTRACT SKILLS FROM RESUME DATA
// ============================================================

function extractSkillsFromMasterResume(data: Record<string, unknown>): string[] {
  const skills: string[] = [];
  const techSkills = (data as Record<string, unknown>).skills as Record<string, unknown> | undefined;
  if (techSkills?.technical) {
    const tech = techSkills.technical as Record<string, Array<{ name: string }>>;
    for (const category of Object.values(tech)) {
      if (Array.isArray(category)) {
        for (const s of category) {
          if (typeof s === "string") skills.push(s);
          else if (s?.name) skills.push(s.name);
        }
      }
    }
  }
  // Also extract from experience technologies
  const experience = (data as Record<string, unknown>).experience as Array<Record<string, unknown>> | undefined;
  if (experience) {
    for (const exp of experience) {
      const techs = exp.technologies as string[] | undefined;
      if (techs) skills.push(...techs);
      const achievements = exp.achievements as string[] | undefined;
      if (achievements) {
        // Extract tech mentions from achievements
        for (const a of achievements) {
          const techMentions = a.match(/\b(?:[A-Z][a-z]+(?:\.[a-z]+)*|[A-Z]{2,})\b/g);
          if (techMentions) skills.push(...techMentions.filter(t => t.length > 2 && t.length < 20));
        }
      }
    }
  }
  return [...new Set(skills)].slice(0, 30);
}

function extractSkillsFromText(text: string): string[] {
  // Extract tech/skill mentions from raw CV text
  const skills: string[] = [];
  const patterns = [
    /\b(?:Python|Java|JavaScript|TypeScript|React|Angular|Vue|Node\.?js|SQL|NoSQL|AWS|Azure|GCP|Docker|Kubernetes|Terraform|Git|Linux|C\+\+|C#|Ruby|Go|Rust|Swift|Kotlin|PHP|R\b|MATLAB|Tableau|Power\s?BI|Excel|SAP|JIRA|Figma|Photoshop|AutoCAD|SolidWorks)\b/gi,
    /\b(?:machine learning|deep learning|data analysis|project management|agile|scrum|DevOps|CI\/CD|REST\s?API|microservices|cloud computing|big data|blockchain|cybersecurity|natural language processing)\b/gi,
  ];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) skills.push(...matches);
  }
  return [...new Set(skills.map(s => s.toLowerCase()))].slice(0, 30);
}

// ============================================================
// CONVERT MASTER_RESUMES RECORD TO EXPECTED OUTPUT FORMAT
// ============================================================

function masterResumeToExpected(data: Record<string, unknown>): Record<string, unknown> {
  const pi = data.personal_info as Record<string, unknown> | undefined;
  const experience = (data.experience as Array<Record<string, unknown>> | undefined) ?? [];
  const education = (data.education as Array<Record<string, unknown>> | undefined) ?? [];

  return {
    summary: (pi?.summary as string) ?? "",
    experience: experience.slice(0, 5).map(exp => ({
      company: exp.company ?? "Unknown",
      title: exp.title ?? "Unknown",
      start_date: (exp.dates as Record<string, string>)?.start ?? "",
      end_date: (exp.dates as Record<string, string>)?.end ?? "",
      bullets: [
        ...((exp.responsibilities as string[]) ?? []).slice(0, 4),
        ...((exp.achievements as string[]) ?? []).slice(0, 2),
      ],
    })),
    skills: {
      technical: extractSkillsFromMasterResume(data).slice(0, 15),
    },
    certifications: Array.isArray(data.certifications)
      ? (data.certifications as Array<string | { name: string }>).map(c => typeof c === "string" ? c : c?.name ?? "").filter(Boolean)
      : typeof data.certifications === "string" && data.certifications ? [data.certifications] : [],
    education: education.map(e => {
      const degree = (e as Record<string, unknown>).degree ?? "";
      const institution = (e as Record<string, unknown>).institution ?? "";
      const year = (e as Record<string, unknown>).graduation_year ?? "";
      return `${degree}, ${institution}${year ? ` (${year})` : ""}`;
    }),
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== Test Pair Generation Script ===\n");

  // Load candidate pairs
  const candidates = JSON.parse(fs.readFileSync(CANDIDATE_PAIRS, "utf-8"));
  const pairs = candidates.pairs as Array<Record<string, unknown>>;
  console.log(`Loaded ${pairs.length} candidate pairs`);

  // Sort by match score, take top N
  const topPairs = pairs
    .sort((a, b) => (b.match_score as number) - (a.match_score as number))
    .slice(0, MAX_PAIRS);
  console.log(`Selected top ${topPairs.length} pairs (score >= ${(topPairs[topPairs.length - 1] as Record<string, unknown>).match_score})`);

  // Load data indexes
  console.log("\nLoading data indexes...");
  const masterIndex = await loadMasterResumesIndex();
  console.log(`  master_resumes: ${masterIndex.size} records`);
  const atlasIndex = loadResumeAtlasIndex();
  console.log(`  resume_atlas: ${atlasIndex.size} records`);
  const linkedinIndex = loadLinkedInJDIndex();
  console.log(`  linkedin JDs: ${linkedinIndex.size} records`);
  const indeedIndex = loadIndeedJDIndex();
  console.log(`  indeed JDs: ${indeedIndex.size} records`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate test pairs
  let generated = 0;
  let skipped = 0;
  const splits = { train: 0, validation: 0, held_out: 0 };

  for (let i = 0; i < topPairs.length; i++) {
    const cp = topPairs[i] as Record<string, unknown>;
    const resume = cp.resume as Record<string, unknown>;
    const jd = cp.jd as Record<string, unknown>;

    const resumeId = resume.id as string;
    const jdId = jd.id as string;

    // Fetch full resume data
    let resumeData: unknown;
    let resumeSource: string;
    if (resumeId.startsWith("mr-")) {
      resumeData = masterIndex.get(resumeId);
      resumeSource = "master_resumes";
    } else {
      resumeData = atlasIndex.get(resumeId);
      resumeSource = "resume_atlas";
    }

    if (!resumeData) {
      skipped++;
      continue;
    }

    // Fetch full JD data
    let jdDescription = "";
    let jdCompany = (jd.company as string) ?? "Unknown";
    let jdTitle = (jd.title as string) ?? "Unknown";

    if (jdId.startsWith("linkedin-")) {
      const ljd = linkedinIndex.get(jdId);
      if (ljd) {
        jdDescription = ljd.description;
        jdCompany = ljd.company || jdCompany;
        jdTitle = ljd.title || jdTitle;
      }
    } else if (jdId.startsWith("indeed-")) {
      const ijd = indeedIndex.get(jdId);
      if (ijd) {
        jdDescription = ijd.description;
        jdCompany = ijd.company || jdCompany;
        jdTitle = ijd.title || jdTitle;
      }
    }

    if (!jdDescription || jdDescription.length < 100) {
      skipped++;
      continue;
    }

    // Extract JD requirements
    const jdRequirements = extractRequirements(jdDescription);

    // Extract skills from resume
    let cloudSkills: string[];
    let expectedOutput: Record<string, unknown> | null;

    if (resumeSource === "master_resumes") {
      const mrData = resumeData as Record<string, unknown>;
      cloudSkills = extractSkillsFromMasterResume(mrData);
      expectedOutput = masterResumeToExpected(mrData);
    } else {
      const raData = resumeData as { category: string; text: string };
      cloudSkills = extractSkillsFromText(raData.text);
      expectedOutput = null; // Raw text needs LLM parsing — mark for human review
    }

    // Determine split (60% train, 20% validation, 20% held_out)
    let split: string;
    const ratio = generated / MAX_PAIRS;
    if (ratio < 0.6) { split = "train"; splits.train++; }
    else if (ratio < 0.8) { split = "validation"; splits.validation++; }
    else { split = "held_out"; splits.held_out++; }

    generated++;
    const pairNum = generated.toString().padStart(3, "0");
    const industry = resume.industry as string;
    const slug = `${industry}-${(resume.seniority as string) ?? "unknown"}`.replace(/[^a-z0-9-]/g, "");

    const testPair = {
      id: `pair-R${pairNum}`,
      split,
      persona: mapToPersona(resume.seniority as string, industry),
      source_resume: {
        id: resumeId,
        dataset: resumeSource,
        industry,
        seniority: resume.seniority,
      },
      jd: {
        title: jdTitle,
        company: jdCompany,
        location: "",
        experience_years: extractYearsFromDesc(jdDescription),
        requirements: jdRequirements.map(r => ({
          text: r,
          type: "must_have", // Conservative default
        })),
        responsibilities: extractResponsibilities(jdDescription).slice(0, 8),
        full_description: jdDescription,
      },
      expected_output: expectedOutput ?? {
        _status: "NEEDS_HUMAN_REVIEW",
        _raw_text_preview: (resumeData as { text: string }).text?.substring(0, 500) ?? "",
        summary: "",
        experience: [],
        skills: {},
        certifications: [],
        education: [],
      },
      jd_requirements: jdRequirements.map(r => r.substring(0, 100)),
      cloud_skills: cloudSkills,
      provenance: {
        data_source: resumeSource === "master_resumes" ? "real_dataset" : "real_dataset_raw_text",
        jd_source: jdId.startsWith("linkedin-") ? "kaggle_linkedin" : jdId.startsWith("indeed-") ? "github_indeed" : "kaggle_jd2025",
        resume_dataset: resumeSource,
        jd_id: jdId,
        resume_id: resumeId,
        generated_at: new Date().toISOString(),
        expected_output_author: expectedOutput ? "auto_from_structured_data" : "NEEDS_HUMAN_REVIEW",
        circularity_risk: "low",
        notes: expectedOutput
          ? "Resume from real dataset (structured). JD from real job posting. Expected output auto-derived from structured resume data — needs human review to verify quality."
          : "Resume from real dataset (raw text). JD from real job posting. Expected output EMPTY — needs LLM parsing + human review.",
      },
    };

    const filename = `pair-R${pairNum}-${slug}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      JSON.stringify(testPair, null, 2)
    );
  }

  console.log(`\n=== Results ===`);
  console.log(`Generated: ${generated} test pairs`);
  console.log(`Skipped (missing data): ${skipped}`);
  console.log(`Split: train=${splits.train}, validation=${splits.validation}, held_out=${splits.held_out}`);
  console.log(`Output: ${OUTPUT_DIR}/`);
  console.log(`\nNOTE: Pairs from resume_atlas have expected_output._status = "NEEDS_HUMAN_REVIEW"`);
  console.log(`Run these through the pipeline (with API key) to generate expected outputs, then YOU review.`);
}

// ============================================================
// HELPERS
// ============================================================

function mapToPersona(seniority: string, industry: string): string {
  if (seniority === "entry") return "early_career";
  if (seniority === "mid") return "mid_career";
  if (seniority === "senior") return "senior";
  if (seniority === "executive") return "executive";
  if (industry === "aviation" || industry === "defense") return "military";
  return "mid_career";
}

function extractYearsFromDesc(desc: string): number | null {
  const match = desc.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
  return match ? parseInt(match[1]) : null;
}

function extractResponsibilities(description: string): string[] {
  const resps: string[] = [];
  const lines = description.split(/\n/);
  let inResponsibilitiesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (/\b(responsibilities|what you.?ll do|role|duties|about the role)\b/i.test(lower) && trimmed.length < 80) {
      inResponsibilitiesSection = true;
      continue;
    }
    if (/\b(requirements|qualifications|what you.?ll need|must have|benefits|perks|about us|nice to have)\b/i.test(lower) && trimmed.length < 80) {
      inResponsibilitiesSection = false;
      continue;
    }

    if (inResponsibilitiesSection && trimmed.length > 10 && trimmed.length < 300) {
      const cleaned = trimmed.replace(/^[-•*·►▸●○]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
      if (cleaned.length > 10) resps.push(cleaned);
    }
  }
  return resps;
}

main().catch(console.error);
