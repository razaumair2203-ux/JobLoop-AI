import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth";
import { loadCloudFromDB } from "@/lib/cloud-from-db";
import { parseOutcomeFeedback, mapFeedbackToNodeSignals } from "@jobloop/ai";

/**
 * PATCH /api/applications/[id]
 *
 * Update an application's outcome, stage, notes, feedback, or excitement.
 * Only the owner can update their own applications.
 *
 * When outcome changes to a signal-bearing value AND user provides feedback,
 * parses feedback into structured SkillSignals and enriches the Cloud.
 * Falls back to match_analysis-based signals when no feedback is provided.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { id } = await params;
  const body = await request.json();

  // Whitelist updatable fields
  const allowed: Record<string, unknown> = {};
  if (body.outcome !== undefined) allowed.outcome_status = body.outcome;
  if (body.stage !== undefined) allowed.stage = body.stage;
  if (body.notes !== undefined) allowed.notes = body.notes;
  if (body.excitement !== undefined) allowed.excitement = body.excitement;
  if (body.applied_date !== undefined) allowed.applied_date = body.applied_date;
  if (body.feedback !== undefined) allowed.user_feedback = body.feedback;

  if (Object.keys(allowed).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await db
    .from("applications")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id); // ownership check

  if (error) {
    console.error("Failed to update application:", error);
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }

  // Write outcome signals to Cloud when outcome carries signal value
  const SIGNAL_OUTCOMES = ["callback", "interview", "offer", "closed"];
  if (body.outcome !== undefined && SIGNAL_OUTCOMES.includes(body.outcome)) {
    try {
      // If user provided free-text feedback, parse it with LLM (the correct signal source)
      if (body.feedback && body.feedback.trim().length >= 10) {
        await writeFeedbackSignals(db, user.id, id, body.feedback);
      } else {
        // Fallback: use match_analysis (our guess, less accurate than employer feedback)
        await writeOutcomeSignals(db, user.id, id, body.outcome as string);
      }
    } catch (err) {
      console.error("[outcome-signals] Failed to write signals (non-critical):", err);
    }
  }

  return Response.json({ success: true });
}

/**
 * Parse free-text feedback with LLM and write structured signals to Cloud.
 * This is the CORRECT signal source — actual employer feedback, not our analysis guess.
 */
async function writeFeedbackSignals(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  applicationId: string,
  feedback: string,
) {
  // Load application context
  const { data: app } = await db
    .from("applications")
    .select("company, role, industry")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .single();

  if (!app) return;

  // Load user's Cloud for skill name matching
  const cloud = await loadCloudFromDB(db, userId);
  if (!cloud) return;

  // Parse feedback with LLM
  const parsed = await parseOutcomeFeedback(feedback, cloud, app.role);

  // Save parsed feedback to application record
  await db
    .from("applications")
    .update({
      parsed_feedback: {
        positive_signals: parsed.positive_signals,
        gap_signals: parsed.gap_signals,
        context: parsed.context,
      },
    })
    .eq("id", applicationId);

  // Map to cloud node signals and write
  const niche = [app.industry, app.role].filter(Boolean).join("/").slice(0, 80) || app.company;
  const nodeSignals = mapFeedbackToNodeSignals(cloud, parsed, app.company, app.role, niche);

  // Load current outcome_signals for each affected node
  const nodeIds = nodeSignals.map(s => s.node_id);
  if (nodeIds.length === 0) return;

  const { data: nodes } = await db
    .from("cloud_nodes")
    .select("id, outcome_signals")
    .in("id", nodeIds);

  if (!nodes) return;

  for (const ns of nodeSignals) {
    const node = nodes.find(n => n.id === ns.node_id);
    const existing = (node?.outcome_signals as unknown[]) ?? [];
    await db
      .from("cloud_nodes")
      .update({ outcome_signals: [...existing, ns.signal] })
      .eq("id", ns.node_id);
  }
}

/**
 * Fallback: write signals from match_analysis when no free-text feedback provided.
 * Less accurate than parsed feedback — uses OUR analysis, not employer's words.
 */
async function writeOutcomeSignals(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  applicationId: string,
  outcome: string,
) {
  const { data: app } = await db
    .from("applications")
    .select("match_analysis, company, role, industry")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .single();

  if (!app?.match_analysis) return;

  const match = app.match_analysis as { gaps?: string[]; strengths?: string[] };
  const isPositive = ["callback", "interview", "offer"].includes(outcome);
  const skillsToSignal = isPositive ? (match.strengths ?? []) : (match.gaps ?? []);
  const signalType = isPositive ? "positive" : "gap";

  if (skillsToSignal.length === 0) return;

  const { data: nodes } = await db
    .from("cloud_nodes")
    .select("id, name, outcome_signals")
    .eq("user_id", userId);

  if (!nodes || nodes.length === 0) return;

  const niche = [app.industry, app.role].filter(Boolean).join("/").slice(0, 80) || app.company;
  const date = new Date().toISOString().split("T")[0];

  for (const skillName of skillsToSignal) {
    const nameLower = skillName.toLowerCase();
    const node = nodes.find((n) =>
      n.name.toLowerCase() === nameLower ||
      n.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(n.name.toLowerCase())
    );
    if (!node) continue;

    const newSignal = {
      skill_id: node.id as string,
      signal: signalType,
      context: isPositive
        ? `Application at ${app.company} progressed to ${outcome}`
        : `Flagged as gap when applying at ${app.company} for ${app.role}`,
      niche,
      date,
    };

    const existing = (node.outcome_signals as unknown[]) ?? [];
    await db
      .from("cloud_nodes")
      .update({ outcome_signals: [...existing, newSignal] })
      .eq("id", node.id as string);
  }
}
