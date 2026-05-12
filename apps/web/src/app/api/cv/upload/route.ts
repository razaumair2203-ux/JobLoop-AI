import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/ensure-user";
import { getAuthUser } from "@/lib/auth";
import {
  parseCV as parseCVWithAI,
  buildCloudFromParsedCV,
  computeCloudMaturity,
  selectModel,
  generateInitialQuestions,
  skillsMatch,
  computeSummary,
  detectConflicts,
  mergeResolvedProfile,
  resolvedProfileToParsedCV,
  cleanParsedCVs,
  buildConflictQuestions,
  extractContactDetails,
  normalizeExtractedText,
  assessExtractionQuality,
  extractPDFText,
} from "@jobloop/ai";
import type { ProfileCloud, Evidence, ConflictReport, PersonaType } from "@jobloop/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserExists(supabase, user);

  // Determine CV parse model from existing Cloud maturity
  // Empty/thin Cloud (first-time user) → quality tier catches garbled PDF structure
  // Rich Cloud (returning user) → fast tier is fine for incremental uploads
  const { data: existingNodes } = await supabase
    .from("cloud_nodes")
    .select("id, name, type, category, evidence, summary")
    .eq("user_id", user.id);

  let cvModelTier: "fast" | "quality" = "quality"; // default to quality tier for new users
  if (existingNodes && existingNodes.length > 0) {
    const existingCloud: ProfileCloud = {
      user_id: user.id,
      nodes: existingNodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type as "skill" | "capability" | "domain",
        category: n.category,
        evidence: Array.isArray(n.evidence) ? n.evidence : [],
        summary: n.summary ?? { total_months_used: 0, number_of_roles: 0, has_impact: false, has_external_validation: false, has_depth: false, has_project: false, last_used: null },
      })),
      achievements: [],
      trajectory: { roles: [], progression_pattern: "", domain_consistency: "", avg_tenure_months: 0, total_experience_years: 0 },
      education: [],
      certifications: [],
      languages_spoken: [],
      last_updated: new Date().toISOString(),
    };
    const maturity = computeCloudMaturity(existingCloud);
    cvModelTier = selectModel(maturity, "cv_parse");
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext)) {
      results.push({ filename: file.name, error: "Invalid file type" });
      continue;
    }

    if (file.size > 10 * 1024 * 1024) {
      results.push({ filename: file.name, error: "File too large (max 10MB)" });
      continue;
    }

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: storageError } = await supabase.storage
      .from("cvs")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      results.push({ filename: file.name, error: `Storage: ${storageError.message}` });
      continue;
    }

    // Create cv_uploads record
    const { data: upload, error: dbError } = await supabase
      .from("cv_uploads")
      .insert({
        user_id: user.id,
        filename: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        status: "extracting",
      })
      .select("id")
      .single();

    if (dbError) {
      results.push({ filename: file.name, error: `DB: ${dbError.message}` });
      continue;
    }

    // Extract text from file
    let extractedText: string;
    try {
      if (ext === "pdf") {
        // Position-aware extraction with multi-column reconstruction
        const pdfResult = await extractPDFText(buffer);
        extractedText = pdfResult.text;
        if (pdfResult.isMultiColumn) {
          console.log(`[${file.name}] Multi-column PDF detected (${pdfResult.columnsDetected} columns) — reading order reconstructed`);
        }
      } else {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Text extraction error for", file.name, ":", errMsg);
      await supabase
        .from("cv_uploads")
        .update({
          status: "error",
          error_message: `Text extraction failed: ${errMsg}`,
        })
        .eq("id", upload.id);

      results.push({ filename: file.name, error: `Text extraction failed: ${errMsg}` });
      continue;
    }

    // Normalize text BEFORE sending to LLM — saves tokens, fixes encoding/spacing artifacts
    const normalized = normalizeExtractedText(extractedText);
    extractedText = normalized.text;
    if (normalized.warnings.length > 0) {
      console.warn(`[${file.name}] Normalization warnings:`, normalized.warnings);
    }

    // Assess extraction quality BEFORE sending to LLM
    const quality = assessExtractionQuality(extractedText);
    if (quality.quality === "failed") {
      await supabase
        .from("cv_uploads")
        .update({
          status: "error",
          extracted_text: extractedText,
          error_message: `Extraction quality too low: ${quality.issues.join("; ")}`,
        })
        .eq("id", upload.id);
      results.push({ filename: file.name, error: `Poor extraction quality: ${quality.issues.join("; ")}` });
      continue;
    }
    if (quality.quality === "poor") {
      console.warn(`[${file.name}] Poor extraction quality:`, quality.issues);
    }

    if (!extractedText || extractedText.trim().length < 50) {
      await supabase
        .from("cv_uploads")
        .update({
          status: "error",
          extracted_text: extractedText,
          error_message: "Could not extract meaningful text from file",
        })
        .eq("id", upload.id);

      results.push({ filename: file.name, error: "No readable text found" });
      continue;
    }

    // Extract contact details deterministically (zero LLM, near-100% accuracy)
    const contactDetails = extractContactDetails(extractedText);

    // Save extracted text, mark as ready for parsing
    await supabase
      .from("cv_uploads")
      .update({
        extracted_text: extractedText,
        status: "parsing",
      })
      .eq("id", upload.id);

    // DEV MODE: Skip LLM parsing — Claude Code parses via Supabase workflow
    // PROD MODE: Uncomment parseCVWithAI call below
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedCV: any;
    if (process.env.DEV_AUTH_BYPASS === "true") {
      // Dev: just mark as "pending_parse" — Claude Code will parse from Supabase
      await supabase
        .from("cv_uploads")
        .update({ status: "parsed", parsed_cv: null })
        .eq("id", upload.id);

      results.push({
        id: upload.id,
        filename: file.name,
        status: "pending_parse",
        skills_found: 0,
        experience_count: 0,
      });
      continue;
    }
    try {
      parsedCV = await parseCVWithAI(extractedText, cvModelTier);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "unknown";
      await supabase
        .from("cv_uploads")
        .update({
          status: "error",
          error_message: `CV parsing failed: ${errMsg}`,
        })
        .eq("id", upload.id);

      results.push({ filename: file.name, error: `CV parsing failed: ${errMsg}` });
      continue;
    }

    // Override LLM-extracted contact fields with deterministic regex extraction
    // (ResumeFlow factual bypass — personal details bypass LLM entirely)
    if (contactDetails.emails.length > 0) {
      parsedCV.email = contactDetails.emails[0];
    }
    if (contactDetails.phones.length > 0) {
      parsedCV.phone = contactDetails.phones[0];
    }
    if (contactDetails.linkedin) {
      parsedCV.linkedin = contactDetails.linkedin;
    }
    if (contactDetails.github) {
      parsedCV.github = contactDetails.github;
    }
    if (contactDetails.portfolio) {
      parsedCV.portfolio = contactDetails.portfolio;
    }

    // Save parsed result
    await supabase
      .from("cv_uploads")
      .update({
        parsed_cv: parsedCV,
        status: "parsed",
      })
      .eq("id", upload.id);

    results.push({
      id: upload.id,
      filename: file.name,
      status: "parsed",
      skills_found: countSkills(parsedCV),
      experience_count: countExperience(parsedCV),
    });
  }

  // After all files parsed: CLEAN → DETECT CONFLICTS → RESOLVE → BUILD CLOUD
  // The Cloud is the source of truth. Nothing goes in unclean.
  const { data: allParsed } = await supabase
    .from("cv_uploads")
    .select("id, filename, parsed_cv, extracted_text")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .not("parsed_cv", "is", null);

  let socraticQuestions: Array<{ id: string; question: string; skill_name: string; why_asking: string }> = [];
  let conflictReport: ConflictReport | null = null;

  if (allParsed && allParsed.length > 0) {
    // ================================================================
    // STEP 1: Clean each parsed CV (garbage filtering, normalization,
    //         date validation, source text verification)
    // ================================================================
    const { cleanedCVs, reports: cleaningReports } = cleanParsedCVs(
      allParsed.map((row) => ({
        id: row.id,
        filename: row.filename,
        parsed_cv: row.parsed_cv as Record<string, unknown>,
        source_text: (row.extracted_text as string) ?? undefined,
      })),
    );

    // Log cleaning reports for diagnostics (date issues, source mismatches)
    for (const report of cleaningReports) {
      if (report.date_issues.length > 0 || report.source_mismatches.length > 0 || report.skills_rejected > 0) {
        console.warn(`[cv-cleaner] CV ${report.cv_id}: ${report.roles_removed} roles removed, ${report.bullets_removed} bullets removed, ${report.skills_rejected} skills rejected, ${report.date_issues.length} date issues, ${report.source_mismatches.length} source mismatches`);
      }
    }

    // ================================================================
    // STEP 2: Detect conflicts across all documents ($0 — pure logic)
    // ================================================================
    const { data: userRow } = await supabase
      .from("users")
      .select("persona")
      .eq("id", user.id)
      .single();

    const persona = (userRow?.persona as PersonaType) ?? undefined;

    const documents = cleanedCVs.map((cv) => ({
      id: cv.id,
      name: cv.name,
      roles: cv.roles.map((r: { title: string; company: string; start_date: string; end_date: string; bullets: string[] }) => ({
        title: r.title,
        company: r.company,
        start_date: r.start_date,
        end_date: r.end_date,
        bullets: r.bullets,
      })),
    }));

    conflictReport = detectConflicts(documents, persona);

    // ================================================================
    // STEP 3: GATE — If conflicts exist, return them as Phase 1 questions
    // Cloud does NOT get built until conflicts are resolved.
    // ================================================================
    const hasBlockingConflicts =
      conflictReport.conflicts.length > 0 ||
      conflictReport.gaps.length > 0;

    if (hasBlockingConflicts) {
      // Store conflict report for the resolution endpoint to pick up
      await supabase
        .from("cv_uploads")
        .update({ status: "conflicts_detected" })
        .eq("user_id", user.id)
        .eq("status", "parsed");

      // Build Phase 1 Socratic questions from conflicts
      const phase1Questions = buildConflictQuestions(conflictReport);

      return NextResponse.json({
        results,
        status: "conflicts_detected",
        conflict_report: {
          conflicts: conflictReport.conflicts,
          gaps: conflictReport.gaps,
          employer_groups: conflictReport.employer_groups,
          stats: conflictReport.stats,
        },
        phase1_questions: phase1Questions,
        message: `Found ${conflictReport.conflicts.length} conflict(s) and ${conflictReport.gaps.length} gap(s) across your CVs. Please resolve these before we build your Profile Cloud.`,
      });
    }

    // ================================================================
    // STEP 4: No conflicts — merge cleanly via resolution merger
    // ================================================================
    const resolvedProfile = mergeResolvedProfile(
      cleanedCVs,
      [], // no answer results yet (no conflicts to resolve)
      { employer_confirmed: null, is_single_employer: false },
      persona ?? "mid_career",
    );

    // Convert resolved profile to ParsedCV shape for Cloud builder
    const cleanParsedCV = resolvedProfileToParsedCV(resolvedProfile);
    const { cloud } = buildCloudFromParsedCV(cleanParsedCV);

    // ================================================================
    // STEP 5: Preserve Socratic evidence from previous Cloud
    // ================================================================
    const { data: oldNodes } = await supabase
      .from("cloud_nodes")
      .select("name, evidence")
      .eq("user_id", user.id);

    const socraticBySkill = new Map<string, Evidence[]>();
    if (oldNodes) {
      for (const row of oldNodes) {
        const socEvidence = (Array.isArray(row.evidence) ? row.evidence : [])
          .filter((e: Evidence) => e.type === "socratic");
        if (socEvidence.length > 0) {
          socraticBySkill.set(row.name.toLowerCase(), socEvidence);
        }
      }
    }

    if (socraticBySkill.size > 0) {
      for (const node of cloud.nodes) {
        const exactMatch = socraticBySkill.get(node.name.toLowerCase());
        if (exactMatch) {
          node.evidence.push(...exactMatch);
          node.summary = computeSummary(node.evidence);
          socraticBySkill.delete(node.name.toLowerCase());
          continue;
        }
        for (const [oldName, evidence] of socraticBySkill) {
          if (skillsMatch(node.name, oldName)) {
            node.evidence.push(...evidence);
            node.summary = computeSummary(node.evidence);
            socraticBySkill.delete(oldName);
            break;
          }
        }
      }
      for (const [skillName, evidence] of socraticBySkill) {
        cloud.nodes.push({
          id: `orphan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: "skill",
          name: skillName,
          category: "other",
          evidence,
          summary: computeSummary(evidence),
        });
      }
    }

    // ================================================================
    // STEP 6: Persist the clean Cloud
    // ================================================================
    await supabase.from("cloud_nodes").delete().eq("user_id", user.id);

    const nodeRows = cloud.nodes.map((node) => ({
      user_id: user.id,
      name: node.name,
      type: node.type,
      category: node.category,
      evidence: node.evidence,
      summary: node.summary,
    }));

    if (nodeRows.length > 0) {
      await supabase.from("cloud_nodes").insert(nodeRows);
    }

    // ================================================================
    // STEP 7: Phase 2 — Enrichment questions (Cloud is now truthful)
    // ================================================================
    try {
      const questions = await generateInitialQuestions(cloud);
      socraticQuestions = questions.map((q) => ({
        id: q.id,
        question: q.question,
        skill_name: q.skill_name,
        why_asking: q.why_asking,
      }));
    } catch {
      // Non-critical — upload still succeeds without questions
    }
  }

  return NextResponse.json({
    results,
    status: "cloud_built",
    socratic_questions: socraticQuestions,
    conflict_report: conflictReport ? { stats: conflictReport.stats } : null,
  });
}

// ============================================================
// UTILITY FUNCTIONS
// Dev-mode parser is now in packages/ai/src/dev-parser.ts
// ============================================================

function countSkills(parsedCV: Record<string, unknown>): number {
  const skills = parsedCV.skills as Record<string, string[]> | undefined;
  if (!skills) return 0;
  return Object.values(skills).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
}

function countExperience(parsedCV: Record<string, unknown>): number {
  const experience = parsedCV.experience as Array<unknown> | undefined;
  return Array.isArray(experience) ? experience.length : 0;
}
