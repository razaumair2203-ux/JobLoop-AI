import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

/**
 * PATCH /api/applications/[id]
 *
 * Update an application's outcome, stage, notes, or excitement.
 * Only the owner can update their own applications.
 * When outcome changes to a signal-bearing value, writes SkillSignals
 * to the matching cloud_nodes (outcome intelligence loop).
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

  const { id } = await params;
  const body = await request.json();

  // Whitelist updatable fields
  const allowed: Record<string, unknown> = {};
  if (body.outcome !== undefined) allowed.outcome_status = body.outcome;
  if (body.stage !== undefined) allowed.stage = body.stage;
  if (body.notes !== undefined) allowed.notes = body.notes;
  if (body.excitement !== undefined) allowed.excitement = body.excitement;
  if (body.applied_date !== undefined) allowed.applied_date = body.applied_date;

  if (Object.keys(allowed).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("applications")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id); // ownership check

  if (error) {
    console.error("Failed to update application:", error);
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }

  // Write outcome signals to Cloud when outcome carries employer feedback
  const SIGNAL_OUTCOMES = ["callback", "interview", "offer", "closed"];
  if (body.outcome !== undefined && SIGNAL_OUTCOMES.includes(body.outcome)) {
    try {
      await writeOutcomeSignals(supabase, user.id, id, body.outcome as string);
    } catch (err) {
      console.error("[outcome-signals] Failed to write signals (non-critical):", err);
      // Don't fail — outcome_status already saved successfully
    }
  }

  return Response.json({ success: true });
}

/**
 * Appends SkillSignals to cloud_nodes based on application outcome.
 *
 * Positive outcomes (callback/interview/offer): strength skills get positive signals.
 * Closed outcome: gap skills get gap signals — employer chose someone with those skills.
 * Ghosted/pending: no information — no signals written.
 */
async function writeOutcomeSignals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  applicationId: string,
  outcome: string,
) {
  // Load the application to get match analysis + context
  const { data: app } = await supabase
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

  // Load user's cloud nodes to find matching IDs
  const { data: nodes } = await supabase
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
    await supabase
      .from("cloud_nodes")
      .update({ outcome_signals: [...existing, newSignal] })
      .eq("id", node.id as string);
  }
}
