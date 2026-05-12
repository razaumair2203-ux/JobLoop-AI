/**
 * Enrich Real Test Pairs — Populate expected_output via DeepSeek API
 *
 * Reads real pairs from test-bank/real-pairs/, sends raw resume text
 * through CV parser prompt, populates expected_output + cloud_skills.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=... npx tsx packages/ai/src/autoresearch/enrich-real-pairs.ts [--limit 15] [--start R001]
 */

import * as fs from "fs";
import * as path from "path";

const REAL_PAIRS_DIR = path.join(__dirname, "test-bank", "real-pairs");
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

interface RealPair {
  id: string;
  split: string;
  persona: string;
  source_resume: { id: string; dataset: string; industry: string; seniority: string };
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
    _status?: string;
    _raw_text_preview?: string;
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

// Rate limiter
let lastCallMs = 0;
async function rateLimit(): Promise<void> {
  const gap = Date.now() - lastCallMs;
  if (gap < 1500) await new Promise(r => setTimeout(r, 1500 - gap));
  lastCallMs = Date.now();
}

async function callDeepSeek(system: string, user: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  await rateLimit();

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4096,
      temperature: 0.3, // Low temp for structured extraction
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

const CV_PARSE_SYSTEM = `You are a CV/resume parser. Extract structured information from the resume text below.
Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence professional summary",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "start_date": "YYYY-MM or YYYY",
      "end_date": "YYYY-MM or Present",
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
- Extract ALL work experience entries, preserving company names and dates exactly
- Group skills into logical categories (Technical, Management, Domain, etc.)
- Include certifications and education if mentioned
- Each experience bullet should start with an action verb
- Do NOT fabricate or infer — only extract what's explicitly stated
- Return ONLY the JSON object, no markdown fences, no commentary`;

function safeParseJSON(text: string): RealPair["expected_output"] | null {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from mixed text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args.includes("--limit")
    ? parseInt(args[args.indexOf("--limit") + 1])
    : 15;
  const startId = args.includes("--start")
    ? args[args.indexOf("--start") + 1]
    : null;

  console.log(`\n=== Enriching Real Test Pairs ===`);
  console.log(`Model: ${DEEPSEEK_MODEL}`);
  console.log(`Limit: ${limit}`);
  console.log(`API key: ${process.env.DEEPSEEK_API_KEY ? "SET" : "NOT SET"}`);

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("ERROR: Set DEEPSEEK_API_KEY");
    process.exit(1);
  }

  // Load all real pairs
  const files = fs.readdirSync(REAL_PAIRS_DIR)
    .filter(f => f.endsWith(".json"))
    .sort();

  console.log(`Found ${files.length} real pairs\n`);

  let processed = 0;
  let enriched = 0;
  let failed = 0;

  for (const file of files) {
    if (processed >= limit) break;

    const filePath = path.join(REAL_PAIRS_DIR, file);
    const pair: RealPair = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Skip if already enriched
    if (pair.expected_output.summary && pair.expected_output.experience.length > 0) {
      continue;
    }

    // Skip until start ID
    if (startId && !pair.id.includes(startId) && processed === 0) {
      continue;
    }

    const rawText = pair.expected_output._raw_text_preview || "";
    if (rawText.length < 50) {
      console.log(`[SKIP] ${pair.id}: raw text too short (${rawText.length} chars)`);
      continue;
    }

    processed++;
    console.log(`[${processed}/${limit}] ${pair.id} (${pair.source_resume.industry}/${pair.source_resume.seniority})...`);

    try {
      const response = await callDeepSeek(CV_PARSE_SYSTEM, `Resume text:\n\n${rawText}`);
      const parsed = safeParseJSON(response);

      if (!parsed || !parsed.experience || parsed.experience.length === 0) {
        console.log(`  FAILED: Invalid/empty parse result`);
        failed++;
        continue;
      }

      // Extract all skills for cloud_skills
      const allSkills: string[] = [];
      if (parsed.skills) {
        for (const category of Object.values(parsed.skills)) {
          if (Array.isArray(category)) {
            allSkills.push(...category);
          }
        }
      }

      // Also extract JD requirements from full_description if sparse
      let jdReqs = pair.jd_requirements;
      if (jdReqs.length < 3 && pair.jd.full_description.length > 100) {
        try {
          const jdResponse = await callDeepSeek(
            "Extract the key requirements from this job description. Return a JSON array of strings, each being one requirement. Return ONLY the JSON array.",
            pair.jd.full_description.slice(0, 3000),
          );
          const jdParsed = safeParseJSON(`{"r":${jdResponse.trim()}}`) as { r: string[] } | null;
          if (jdParsed?.r && Array.isArray(jdParsed.r) && jdParsed.r.length > 0) {
            jdReqs = jdParsed.r.slice(0, 12);
          }
        } catch {
          // Keep original jd_requirements
        }
      }

      // Update the pair
      pair.expected_output = {
        summary: parsed.summary || "",
        experience: (parsed.experience || []).map(e => ({
          company: e.company || "",
          title: e.title || "",
          start_date: e.start_date || "",
          end_date: e.end_date || "",
          bullets: Array.isArray(e.bullets) ? e.bullets : [],
        })),
        skills: parsed.skills || {},
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
      };
      pair.cloud_skills = allSkills;
      pair.jd_requirements = jdReqs;
      pair.provenance = {
        ...pair.provenance,
        expected_output_author: `DeepSeek/${DEEPSEEK_MODEL}`,
        enriched_at: new Date().toISOString(),
        circularity_risk: "medium", // LLM-generated expected output
        needs_human_review: true,
      };

      // Save
      fs.writeFileSync(filePath, JSON.stringify(pair, null, 2));

      const skillCount = allSkills.length;
      const expCount = pair.expected_output.experience.length;
      const reqCount = jdReqs.length;
      console.log(`  OK: ${expCount} roles, ${skillCount} skills, ${reqCount} JD reqs`);
      enriched++;
    } catch (err) {
      console.log(`  ERROR: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${files.length - processed - files.filter(f => {
    const p = JSON.parse(fs.readFileSync(path.join(REAL_PAIRS_DIR, f), "utf-8"));
    return p.expected_output.summary && p.expected_output.experience?.length > 0;
  }).length}`);

  if (enriched > 0) {
    console.log(`\nNEXT: Review enriched pairs manually, then run:`);
    console.log(`  npx tsx packages/ai/src/autoresearch/run-loop.ts --target cv-generation --iterations 10`);
  }
}

main().catch(err => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
