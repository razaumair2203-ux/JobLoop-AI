import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/ensure-user";
import { getAuthUser } from "@/lib/auth";
import { loadCloudFromDB } from "@/lib/cloud-from-db";
import { processAnswer, skillsMatch, detectContradictions } from "@jobloop/ai";
import type { SocraticAnswer } from "@jobloop/ai";

/**
 * POST /api/socratic/answer
 *
 * Accepts a Socratic answer, updates the Profile Cloud (source of truth),
 * and persists both the Q&A record and the updated Cloud node.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserExists(supabase, user);

  const body = await request.json();
  const { question_id, skill_name, answer, application_id, question_text } = body;

  if (!question_id || !skill_name || !answer) {
    return Response.json(
      { error: "Missing required fields: question_id, skill_name, answer" },
      { status: 400 }
    );
  }

  if (typeof answer !== "string" || answer.trim().length < 5) {
    return Response.json(
      { error: "Answer must be at least 5 characters" },
      { status: 400 }
    );
  }

  // Load user's Cloud from DB (with trajectory reconstruction)
  const cloud = await loadCloudFromDB(supabase, user.id);

  if (!cloud) {
    return Response.json(
      { error: "No profile cloud found. Upload a CV first." },
      { status: 400 }
    );
  }

  // Track which nodes existed before (store names for alias-aware comparison later)
  const existingNodeNames = cloud.nodes.map((n) => n.name);

  // Process the answer — updates existing node or creates new one
  const updatedCloud = processAnswer(
    cloud,
    { question_id, skill_name, answer: answer.trim() },
    application_id || null
  );

  // Find the affected node (either updated or newly created)
  // Use skillsMatch for alias-aware lookup — must match how processAnswer finds nodes
  const affectedNode = updatedCloud.nodes.find(
    (n) => skillsMatch(n.name, skill_name)
  );

  if (!affectedNode) {
    // Should not happen — processAnswer always creates or updates
    return Response.json(
      { error: "Failed to process answer" },
      { status: 500 }
    );
  }

  // Persist: upsert the affected Cloud node
  const isNewNode = !existingNodeNames.some((name) => skillsMatch(name, affectedNode.name));

  if (isNewNode) {
    // INSERT new node
    const { error: insertError } = await supabase.from("cloud_nodes").insert({
      user_id: user.id,
      type: affectedNode.type,
      name: affectedNode.name,
      category: affectedNode.category,
      evidence: affectedNode.evidence,
      summary: affectedNode.summary,
    });

    if (insertError) {
      console.error("Failed to insert new cloud node:", insertError);
      return Response.json(
        { error: "Failed to save new skill to cloud" },
        { status: 500 }
      );
    }
  } else {
    // UPDATE existing node
    const { error: updateError } = await supabase
      .from("cloud_nodes")
      .update({
        evidence: affectedNode.evidence,
        summary: affectedNode.summary,
      })
      .eq("id", affectedNode.id);

    if (updateError) {
      console.error("Failed to update cloud node:", updateError);
      return Response.json(
        { error: "Failed to update cloud" },
        { status: 500 }
      );
    }
  }

  // Save Q&A record — store the actual question text, not just the ID
  const { error: qaError } = await supabase.from("socratic_qa").insert({
    user_id: user.id,
    application_id: application_id || null,
    question: question_text || question_id, // prefer text, fall back to ID
    answer: answer.trim(),
    gate: application_id ? "jd_match" : "cv_upload",
    skill_targeted: affectedNode.name,
    answered_at: new Date().toISOString(),
  });

  if (qaError) {
    console.error("Failed to save socratic Q&A record:", qaError);
    // Non-critical — Cloud was already updated, don't fail the request
  }

  // Check for contradictions across all Socratic answers for this user
  // Only runs when we have 2+ answered questions (meaningful cross-check)
  let contradictions = null;
  const { data: allQA } = await supabase
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
    node_updated: affectedNode.name,
    is_new_skill: isNewNode,
    evidence_count: affectedNode.evidence.length,
    summary: affectedNode.summary,
    contradictions,
  });
}
