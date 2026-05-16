import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth";
import { classifyCloud, detectGaps, generateInitialQuestions } from "@jobloop/ai";
import type { SocraticContext } from "@jobloop/ai";
import { loadCloudFromDB } from "@/lib/cloud-from-db";

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const cloud = await loadCloudFromDB(db, user.id);

  if (!cloud) {
    return NextResponse.json({ classified: null });
  }

  const classified = classifyCloud(cloud.nodes);
  classified.gaps = detectGaps(classified);

  // Compute stats for the new CloudVisualization component
  const stats = {
    years: cloud.trajectory.total_experience_years,
    roles: cloud.trajectory.roles.length,
    skills: cloud.nodes.filter(n => n.tier === "core_skill").length,
    evidencePoints: cloud.nodes.reduce((s, n) => s + n.evidence.length, 0),
    domains: classified.domains?.length ?? 0,
    certCount: cloud.certifications.length,
  };

  // Load user persona + candidate_context for Socratic question generation
  const { data: userRow } = await db
    .from("users")
    .select("persona")
    .eq("id", user.id)
    .single();

  let candidateContext: SocraticContext["candidate_context"];
  const { data: cvRows } = await db
    .from("cv_uploads")
    .select("parsed_cv")
    .eq("user_id", user.id)
    .not("parsed_cv", "is", null)
    .limit(1);

  if (cvRows && cvRows.length > 0) {
    const parsed = cvRows[0].parsed_cv as Record<string, unknown> | null;
    if (parsed?.candidate_context) {
      candidateContext = parsed.candidate_context as SocraticContext["candidate_context"];
    }
  }

  const socraticCtx: SocraticContext = {
    persona: (userRow?.persona as string) ?? undefined,
    candidate_context: candidateContext,
  };

  // Check for unanswered Socratic questions first (cached from previous generation)
  // Only generate new questions if NO questions exist at all for this user
  let socratic_questions: Array<{ id: string; question: string; skill_name: string; why_asking: string }> = [];

  const { data: existingQA } = await db
    .from("socratic_qa")
    .select("id, question, skill_targeted, answer, answered_at")
    .eq("user_id", user.id)
    .eq("gate", "cv_upload");

  const unanswered = existingQA?.filter(q => !q.answered_at && !q.answer) ?? [];

  if (unanswered.length > 0) {
    // Return cached unanswered questions — no regeneration
    socratic_questions = unanswered.map(q => ({
      id: q.id,
      question: q.question,
      skill_name: q.skill_targeted ?? "",
      why_asking: "", // Not stored in QA table — could be empty for cached
    }));
  } else if (!existingQA || existingQA.length === 0) {
    // No questions ever generated — generate and persist them
    try {
      const questions = await generateInitialQuestions(cloud, undefined, socraticCtx);

      // Persist questions to socratic_qa (with null answer) so they survive refresh
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

      // Re-fetch to get the DB-generated UUIDs
      const { data: savedQs } = await db
        .from("socratic_qa")
        .select("id, question, skill_targeted")
        .eq("user_id", user.id)
        .eq("gate", "cv_upload")
        .is("answer", null);

      socratic_questions = (savedQs ?? []).map(q => ({
        id: q.id,
        question: q.question,
        skill_name: q.skill_targeted ?? "",
        why_asking: "",
      }));
    } catch (err) {
      console.error("Failed to generate Socratic questions:", err);
    }
  }
  // else: all questions answered — no new questions to show

  return NextResponse.json({
    classified,
    identity: cloud.identity,
    education: cloud.education,
    certifications: cloud.certifications,
    achievements: cloud.achievements,
    trajectory: cloud.trajectory,
    nodes: cloud.nodes,
    stats,
    socratic_questions,
  });
}
