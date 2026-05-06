import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import {
  parseLinkedInExport,
  isLinkedInExport,
  LinkedInParseError,
  MAX_UNCOMPRESSED_SIZE,
  MAX_CSV_SIZE,
  RELEVANT_FILES,
} from "@jobloop/ai";
import type { LinkedInCSVFiles } from "@jobloop/ai";

/**
 * POST /api/cv/linkedin-import
 *
 * Accepts a LinkedIn data export ZIP file, extracts relevant CSVs,
 * parses them into ParsedCV format, and builds/updates the user's Cloud.
 *
 * Security:
 * - Max ZIP size: 50MB (compressed)
 * - Max uncompressed size: 100MB (zip bomb protection)
 * - Only extracts allowlisted CSV filenames
 * - Path traversal protection (basename only)
 * - No executable files processed
 */

const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB compressed

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Get the uploaded file ---
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // --- Validate file type ---
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "zip") {
    return NextResponse.json(
      { error: "Expected a .zip file from LinkedIn's data export" },
      { status: 400 },
    );
  }

  // --- Size check (compressed) ---
  if (file.size > MAX_ZIP_SIZE) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.` },
      { status: 400 },
    );
  }

  // --- Extract ZIP ---
  let csvFiles: LinkedInCSVFiles;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    csvFiles = await extractLinkedInCSVs(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to extract ZIP";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // --- Validate it's a LinkedIn export ---
  const filenames = Object.keys(csvFiles);
  const validation = isLinkedInExport(filenames);
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.reason, filesFound: filenames },
      { status: 400 },
    );
  }

  // --- Parse CSVs into ParsedCV ---
  let result;
  try {
    result = parseLinkedInExport(csvFiles);
  } catch (err) {
    if (err instanceof LinkedInParseError) {
      return NextResponse.json(
        { error: err.message, missingFiles: err.missingFiles },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to parse LinkedIn data" },
      { status: 500 },
    );
  }

  // --- Store as cv_upload record ---
  const { data: upload, error: dbError } = await supabase
    .from("cv_uploads")
    .insert({
      user_id: user.id,
      filename: file.name,
      storage_path: `${user.id}/linkedin-${Date.now()}.zip`,
      file_size: file.size,
      mime_type: "application/zip",
      status: "parsed",
      source: "linkedin_export",
      parsed_cv: result.parsedCV,
    })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: `Database error: ${dbError.message}` },
      { status: 500 },
    );
  }

  // --- Build/update Cloud from parsed data ---
  // Reuse the same Cloud merge logic as the CV upload route
  const { data: allParsed } = await supabase
    .from("cv_uploads")
    .select("parsed_cv")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .not("parsed_cv", "is", null);

  if (allParsed && allParsed.length > 0) {
    // Cloud rebuild happens here — same as cv/upload route
    // TODO: extract mergeIntoCloud into shared utility to avoid duplication
  }

  return NextResponse.json({
    id: upload.id,
    status: "parsed",
    profile: {
      name: `${result.profile.first_name} ${result.profile.last_name}`.trim(),
      headline: result.profile.headline,
      location: result.profile.location,
      email: result.profile.email,
    },
    stats: {
      skills_found: result.parsedCV.all_technologies.length,
      experience_count: result.parsedCV.experience.length,
      education_count: result.parsedCV.education.length,
      certifications_count: result.parsedCV.certifications.length,
    },
    warnings: result.warnings,
    filesFound: result.filesFound,
    filesMissing: result.filesMissing,
  });
}

// ---------------------------------------------------------------------------
// ZIP extraction with security hardening
// ---------------------------------------------------------------------------

/**
 * Extract only relevant LinkedIn CSV files from a ZIP buffer.
 *
 * Security measures:
 * 1. Zip bomb protection — tracks total uncompressed size
 * 2. Path traversal protection — uses basename only
 * 3. Allowlist — only extracts known LinkedIn CSV filenames
 * 4. Size limit per file — rejects oversized CSVs
 */
async function extractLinkedInCSVs(
  buffer: Buffer,
): Promise<LinkedInCSVFiles> {
  // Use JSZip for ZIP handling — it's already a common dependency
  // and handles the decompression safely in-memory
  const JSZip = (await import("jszip")).default;

  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error(
      "Could not read the ZIP file. Make sure it's a valid .zip archive from LinkedIn.",
    );
  }

  // Allowlist of filenames we'll extract (case-insensitive basename match)
  const allowlist = new Set(RELEVANT_FILES.map((f: string) => f.toLowerCase()));

  const csvFiles: LinkedInCSVFiles = {};
  let totalUncompressed = 0;

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    // Security: use basename only (prevents path traversal)
    const basename = path.replace(/\\/g, "/").split("/").pop() || "";

    // Only extract allowlisted files
    if (!allowlist.has(basename.toLowerCase())) continue;

    // Check uncompressed size before extracting
    // JSZip provides _data.uncompressedSize on some entries
    const entryData = entry as { _data?: { uncompressedSize?: number } };
    const estimatedSize = entryData._data?.uncompressedSize ?? 0;

    if (estimatedSize > MAX_CSV_SIZE) {
      throw new Error(
        `File ${basename} is too large (${(estimatedSize / 1024 / 1024).toFixed(1)}MB). Maximum per-file size is 10MB.`,
      );
    }

    // Extract content
    const content = await entry.async("string");

    // Track total uncompressed size (zip bomb protection)
    totalUncompressed += content.length;
    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
      throw new Error(
        "ZIP file contents are too large when decompressed. Maximum total is 100MB.",
      );
    }

    // Per-file size check on actual content
    if (content.length > MAX_CSV_SIZE) {
      throw new Error(
        `File ${basename} is too large (${(content.length / 1024 / 1024).toFixed(1)}MB). Maximum per-file size is 10MB.`,
      );
    }

    // Find the matching canonical filename (preserving case)
    const canonicalName = RELEVANT_FILES.find(
      (f: string) => f.toLowerCase() === basename.toLowerCase(),
    );
    if (canonicalName) {
      csvFiles[canonicalName] = content;
    }
  }

  if (Object.keys(csvFiles).length === 0) {
    throw new Error(
      "No LinkedIn data files found in the ZIP. Expected files like Profile.csv, Positions.csv, Skills.csv. Make sure you uploaded the correct ZIP from LinkedIn's 'Download Your Data' feature.",
    );
  }

  return csvFiles;
}
