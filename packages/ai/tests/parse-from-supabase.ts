/**
 * Dev-mode CV parser: reads extracted_text from Supabase,
 * matches to existing parsed fixtures, writes parsed_cv back.
 *
 * Usage: npx tsx packages/ai/tests/parse-from-supabase.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const SB_URL = "https://koyqjfatxreyaaynflrn.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => {
  // Read from .env.local
  const envPath = path.resolve(__dirname, "..", "..", "..", "apps", "web", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  throw new Error("No SUPABASE_SERVICE_ROLE_KEY found");
})();

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

function hashText(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

// Map filename patterns to fixture directory names
const FILENAME_TO_FIXTURE: Record<string, string> = {
  "copy of copy of dr. sibgha saliha resume_aug-25.pdf": "copy_of_copy_of_dr__sibgha_saliha_resume_aug-25",
  "copy of dr. sibgha saliha resume_iimct.pdf": "copy_of_dr__sibgha_saliha_resume_iimct",
  "dr. sibgha saliha resume.pdf": "dr__sibgha_saliha_resume",
  "dr. sibgha saliha resume_pak.pdf": "dr__sibgha_saliha_resume_pak",
  "resume ksa-me_jan25.pdf": "resume_ksa-me_jan25",
  "resume of be_jan26.pdf": "resume_of_be_jan26",
  "resume pm_jan26.pdf": "resume_pm_jan26",
  "resume se_jan26.pdf": "resume_se_jan26",
  "profile_linkedin.pdf": "profile_linkedin",
};

async function sbFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.method === "PATCH" ? "return=minimal" : "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  if (options.method === "PATCH") return null;
  return res.json();
}

async function main() {
  // 1. Fetch all CVs that need parsing
  const rows = await sbFetch(
    "cv_uploads?status=in.(pending_parse,parsing)&select=id,filename,extracted_text&order=created_at.desc"
  );

  if (!rows || rows.length === 0) {
    console.log("No CVs pending parse.");
    return;
  }

  console.log(`Found ${rows.length} CVs to parse:\n`);

  for (const row of rows) {
    const { id, filename, extracted_text } = row;
    console.log(`  Processing: ${filename} (${id})`);

    if (!extracted_text || extracted_text.trim().length < 50) {
      console.log(`    SKIP — no extracted text`);
      continue;
    }

    // Find matching fixture
    const fixtureName = FILENAME_TO_FIXTURE[filename.toLowerCase()];
    if (!fixtureName) {
      console.log(`    SKIP — no fixture mapping for "${filename}"`);
      continue;
    }

    const fixturePath = path.join(FIXTURES_DIR, fixtureName, "parsed-cv.json");
    if (!fs.existsSync(fixturePath)) {
      console.log(`    SKIP — fixture file not found: ${fixturePath}`);
      continue;
    }

    const parsedCV = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    // Write parsed_cv back to Supabase
    await sbFetch(`cv_uploads?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        parsed_cv: parsedCV,
        status: "parsed",
      }),
    });

    // Also save to dev-data fixture cache for future use
    const hash = hashText(extracted_text);
    const cacheDir = path.resolve(__dirname, "..", "..", "..", "dev-data", "responses");
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      path.join(cacheDir, `cv-parse-${hash}.json`),
      JSON.stringify(parsedCV, null, 2),
      "utf-8"
    );

    console.log(`    OK — parsed_cv written, status → "parsed", cache → cv-parse-${hash}.json`);
  }

  console.log(`\nDone. Frontend poll should pick up the changes.`);
}

main().catch(console.error);
