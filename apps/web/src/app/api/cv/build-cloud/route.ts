import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  classifyNodeTier,
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

  const db = createAdminClient();
  await ensureUserExists(db, user);

  // Load all parsed CVs (status = "parsed" — set by Claude Code after manual parse)
  const { data: allParsed } = await db
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
  const { data: userRow } = await db
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

  // Extract candidate_context from first parsed CV that has it (parser Step 0)
  let candidateContext: { primary_profession?: string; specialization?: string; career_level?: string; country_of_qualification?: string; candidate_name?: string } | undefined;
  for (const row of allParsed) {
    const parsed = row.parsed_cv as Record<string, unknown> | null;
    if (parsed?.candidate_context) {
      candidateContext = parsed.candidate_context as typeof candidateContext;
      break;
    }
  }

  const { cloud } = buildCloudFromParsedCV({
    ...cleanParsedCV,
    candidate_context: candidateContext,
  });

  // STEP 5: Preserve Socratic evidence from previous Cloud
  const { data: oldNodes } = await db
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
        tier: classifyNodeTier(skillName, "other", evidence),
        evidence,
        summary: computeSummary(evidence),
      });
    }
  }

  // STEP 6: Persist the clean Cloud
  await db.from("cloud_nodes").delete().eq("user_id", user.id);

  // Clear unanswered Socratic questions (stale after re-build — new ones generated in Step 7)
  await db.from("socratic_qa")
    .delete()
    .eq("user_id", user.id)
    .is("answer", null);

  const nodeRows = cloud.nodes.map((node) => ({
    user_id: user.id,
    name: node.name,
    type: node.type,
    category: node.category,
    evidence: node.evidence,
    summary: node.summary,
  }));

  if (nodeRows.length > 0) {
    await db.from("cloud_nodes").insert(nodeRows);
  }

  // STEP 7: Phase 2 — Enrichment questions with context
  const socraticCtx = {
    persona: persona ?? undefined,
    candidate_context: candidateContext,
  };

  let socraticQuestions: Array<{ id: string; question: string; skill_name: string; why_asking: string }> = [];
  try {
    const questions = await generateInitialQuestions(cloud, undefined, socraticCtx);

    // Persist questions to socratic_qa so they survive page refresh
    for (const q of questions) {
      await db.from("socratic_qa").insert({
        user_id: user.id,
        question: q.question,
        skill_targeted: q.skill_name,
        gate: "cv_upload",
        answer: null,
        answered_at: null,
      });
    }

    // Re-fetch to get DB-generated UUIDs
    const { data: savedQs } = await db
      .from("socratic_qa")
      .select("id, question, skill_targeted")
      .eq("user_id", user.id)
      .eq("gate", "cv_upload")
      .is("answer", null);

    socraticQuestions = (savedQs ?? []).map((q) => ({
      id: q.id,
      question: q.question,
      skill_name: q.skill_targeted ?? "",
      why_asking: "",
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
