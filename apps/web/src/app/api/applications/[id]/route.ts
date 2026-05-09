import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

/**
 * PATCH /api/applications/[id]
 *
 * Update an application's outcome, stage, notes, or excitement.
 * Only the owner can update their own applications.
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
  if (body.outcome !== undefined) allowed.outcome = body.outcome;
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

  return Response.json({ success: true });
}
