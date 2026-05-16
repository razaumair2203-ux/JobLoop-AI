import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserExists } from "@/lib/ensure-user";
import { getAuthUser } from "@/lib/auth";
import { loadCloudFromDB } from "@/lib/cloud-from-db";
import { processAnswer, skillsMatch, detectContradictions } from "@jobloop/ai";
import type { SocraticAnswer } from "@jobloop/ai";

const SKIP_PATTERNS = /^(skip|skipped|n\/a|na|none|no|pass|-|\.{1,3})$/i;

/**
 * POST /api/socratic/answer
 *
 * Accepts Socratic answers (single or batch), updates the Profile Cloud,
 * and persists Q&A records.
 *
 * Body: { answers: Array<{ question_id, skill_name, answer, question_text? }> }
 *   OR: { question_id, skill_name, answer, answer_text?, question_text? } (legacy single)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  await ensureUserExists(db, user);

  const body = await request.json();

  // Support both batch and single answer formats
  const answerList: Array<{
    question_id: string;
    skill_name: string;
    answer: string;
    question_text?: string;
    application_id?: string;
  }> = body.answers
    ? body.answers
    : [{
        question_id: body.question_id,
        skill_name: body.skill_name,
        answer: body.answer ?? body.answer_text,
        question_text: body.question_text,
        application_id: body.application_id,
      }];

  // Load user's Cloud from DB (with trajectory reconstruction)
  const cloud = await loadCloudFromDB(db, user.id);

  if (!cloud) {
    return Response.json(
      { error: "No profile cloud found. Upload a CV first." },
      { status: 400 }
    );
  }

  const results: Array<{ skill: string; status: "updated" | "skipped" | "error"; is_new?: boolean }> = [];
  let updatedCloud = cloud;

  for (const item of answerList) {
    const { question_id, skill_name, answer: rawAnswer, question_text, application_id } = item;

    if (!question_id || !skill_name) {
      results.push({ skill: skill_name ?? "unknown", status: "error" });
      continue;
    }

    const answer = typeof rawAnswer === "string" ? rawAnswer.trim() : "";

    // Handle skips — mark question as skipped, don't create garbage evidence
    const isSkip = !answer || answer.length < 5 || SKIP_PATTERNS.test(answer);

    if (isSkip) {
      // Update existing question row (if persisted from /api/cloud) to mark as skipped
      await db.from("socratic_qa")
        .update({ answer: null, answered_at: new Date().toISOString() })
        .eq("id", question_id)
        .eq("user_id", user.id);

      results.push({ skill: skill_name, status: "skipped" });
      continue;
    }

    // Track existing nodes for new-node detection
    const existingNodeNames = updatedCloud.nodes.map((n) => n.name);

    // Process the answer — updates existing node or creates new one
    updatedCloud = processAnswer(
      updatedCloud,
      { question_id, skill_name, answer },
      application_id || null
    );

    // Find the affected node
    const affectedNode = updatedCloud.nodes.find(
      (n) => skillsMatch(n.name, skill_name)
    );

    if (!affectedNode) {
      results.push({ skill: skill_name, status: "error" });
      continue;
    }

    const isNewNode = !existingNodeNames.some((name) => skillsMatch(name, affectedNode.name));

    // Persist Cloud node update
    if (isNewNode) {
      const { error: insertError } = await db.from("cloud_nodes").insert({
        user_id: user.id,
        type: affectedNode.type,
        name: affectedNode.name,
        category: affectedNode.category,
        evidence: affectedNode.evidence,
        summary: affectedNode.summary,
      });
      if (insertError) console.error("Failed to insert new cloud node:", insertError);
    } else {
      const { error: updateError } = await db
        .from("cloud_nodes")
        .update({
          evidence: affectedNode.evidence,
          summary: affectedNode.summary,
        })
        .eq("id", affectedNode.id);
      if (updateError) console.error("Failed to update cloud node:", updateError);
    }

    // Update the question row with the answer (if it was pre-persisted from /api/cloud)
    const { error: updateQError } = await db.from("socratic_qa")
      .update({
        answer: answer,
        skill_targeted: affectedNode.name,
        answered_at: new Date().toISOString(),
      })
      .eq("id", question_id)
      .eq("user_id", user.id);

    // If update matched 0 rows (question wasn't pre-persisted), insert new row
    if (updateQError) {
      await db.from("socratic_qa").insert({
        user_id: user.id,
        application_id: application_id || null,
        question: question_text || question_id,
        answer: answer,
        gate: application_id ? "jd_match" : "cv_upload",
        skill_targeted: affectedNode.name,
        answered_at: new Date().toISOString(),
      });
    }

    results.push({
      skill: affectedNode.name,
      status: "updated",
      is_new: isNewNode,
    });
  }

  // Check for contradictions across all answered questions
  let contradictions = null;
  const { data: allQA } = await db
    .from("socratic_qa")
    .select("question, answer, skill_targeted")
    .eq("user_id", user.id)
    .not("answer", "is", null);

  if (allQA && allQA.length >= 2) {
    const answers: SocraticAnswer[] = allQA.map((qa) => ({
      question_id: qa.question,
      skill_name: qa.skill_targeted ?? "",
      answer: qa.answer,
    }));
    const result = detectContradictions(answers, updatedCloud);
    if (result.found) {
      contradictions = {
        items: result.contradictions,
        follow_up: result.follow_up_question,
      };
    }
  }

  return Response.json({
    success: true,
    results,
    contradictions,
  });
}
