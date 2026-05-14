import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/ensure-user";
import { getAuthUser } from "@/lib/auth";
import {
  buildCloudFromParsedCV,
  generateInitialQuestions,
  skillsMatch,
  computeSummary,
  detectConflicts,
  mergeResolvedProfile,
  resolvedProfileToParsedCV,
  cleanParsedCVs,
  buildConflictQuestions,
} from "@jobloop/ai";
import type { ProfileCloud, Evidence, ConflictReport, PersonaType } from "@jobloop/ai";

/**
 * POST /api/cv/build-cloud
 *
 * Dev-mode endpoint: after Claude Code parses CVs and writes parsed_cv + status="parsed"
 * back to Supabase, call this endpoint to run the conflict detection → Cloud build pipeline.
 *
 * In production, this pipeline runs inline in the upload route (after DeepSeek parses).
 * In dev mode, parsing is async (Claude Code), so Cloud building is a separate step.
 *
 * This is the SAME pipeline as upload/route.ts steps 1-7, extracted for dev-mode use.
 */
export async function POST() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserExists(supabase, user);

  // Load all parsed CVs (status = "parsed" — set by Claude Code after manual parse)
  const { data: allParsed } = await supabase
    .from("cv_uploads")
    .select("id, filename, parsed_cv, extracted_text")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .not("parsed_cv", "is", null);

  if (!allParsed || allParsed.length === 0) {
    return NextResponse.json(
      { error: "No parsed CVs found. Parse CVs first (set status to 'parsed' with parsed_cv populated)." },
      { status: 400 },
    );
  }

  // STEP 1: Clean each parsed CV
  const { cleanedCVs, reports: cleaningReports } = cleanParsedCVs(
    allParsed.map((row) => ({
      id: row.id,
      filename: row.filename,
      parsed_cv: row.parsed_cv as Record<string, unknown>,
      source_text: (row.extracted_text as string) ?? undefined,
    })),
  );

  for (const report of cleaningReports) {
    if (report.date_issues.length > 0 || report.source_mismatches.length > 0 || report.skills_rejected > 0) {
      console.warn(`[cv-cleaner] CV ${report.cv_id}: ${report.roles_removed} roles removed, ${report.bullets_removed} bullets removed, ${report.skills_rejected} skills rejected`);
    }
  }

  // STEP 2: Detect conflicts
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

  const conflictReport: ConflictReport = detectConflicts(documents, persona);

  // STEP 3: GATE — If conflicts exist, return them
  const hasBlockingConflicts =
    conflictReport.conflicts.length > 0 ||
    conflictReport.gaps.length > 0;

  if (hasBlockingConflicts) {
    await supabase
      .from("cv_uploads")
      .update({ status: "conflicts_detected" })
      .eq("user_id", user.id)
      .eq("status", "parsed");

    const phase1Questions = buildConflictQuestions(conflictReport);

    return NextResponse.json({
      status: "conflicts_detected",
      conflict_report: {
        conflicts: conflictReport.conflicts,
        gaps: conflictReport.gaps,
        employer_groups: conflictReport.employer_groups,
        stats: conflictReport.stats,
      },
      questions: phase1Questions,
      phase1_questions: phase1Questions,
      message: `Found ${conflictReport.conflicts.length} conflict(s) and ${conflictReport.gaps.length} gap(s). Resolve before Cloud build.`,
    });
  }

  // STEP 4: No conflicts — merge cleanly
  const resolvedProfile = mergeResolvedProfile(
    cleanedCVs,
    [],
    { employer_confirmed: null, is_single_employer: false },
    persona ?? "mid_career",
  );

  const cleanParsedCV = resolvedProfileToParsedCV(resolvedProfile);
  const { cloud } = buildCloudFromParsedCV(cleanParsedCV);

  // STEP 5: Preserve Socratic evidence from previous Cloud
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

  // STEP 6: Persist the clean Cloud
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

  // STEP 7: Phase 2 — Enrichment questions
  let socraticQuestions: Array<{ id: string; question: string; skill_name: string; why_asking: string }> = [];
  try {
    const questions = await generateInitialQuestions(cloud);
    socraticQuestions = questions.map((q) => ({
      id: q.id,
      question: q.question,
      skill_name: q.skill_name,
      why_asking: q.why_asking,
    }));
  } catch (err) {
    console.error("[build-cloud] Phase 2 Socratic question generation failed:", err);
    // Non-critical — Cloud is built; user can be prompted later
  }

  return NextResponse.json({
    status: "cloud_built",
    cloud_nodes_count: cloud.nodes.length,
    socratic_questions: socraticQuestions,
    conflict_report: { stats: conflictReport.stats },
  });
}
