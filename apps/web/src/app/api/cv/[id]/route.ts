import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

/**
 * DELETE /api/cv/[id]
 *
 * Delete a specific source CV. Removes from storage + database.
 * Cloud should be rebuilt after deletion (caller's responsibility via /api/cv/build-cloud).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the CV (ownership check via user_id)
  const { data: cv } = await supabase
    .from("cv_uploads")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!cv) {
    return Response.json({ error: "CV not found" }, { status: 404 });
  }

  // Delete from storage
  if (cv.storage_path) {
    await supabase.storage.from("cvs").remove([cv.storage_path]);
  }

  // Delete from database
  await supabase.from("cv_uploads").delete().eq("id", cv.id);

  // Count remaining CVs
  const { count } = await supabase
    .from("cv_uploads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("status", "eq", "error");

  return Response.json({
    success: true,
    remaining_cvs: count ?? 0,
    rebuild_cloud: true,
  });
}

/**
 * GET /api/cv/[id]
 *
 * Get details of a specific source CV.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: cv } = await supabase
    .from("cv_uploads")
    .select("id, filename, file_size, status, created_at, parsed_cv")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!cv) {
    return Response.json({ error: "CV not found" }, { status: 404 });
  }

  const parsed = cv.parsed_cv as Record<string, unknown> | null;
  const experience = Array.isArray(parsed?.experience) ? parsed.experience : [];
  const skills = Array.isArray(parsed?.skills) ? parsed.skills : [];

  return Response.json({
    id: cv.id,
    filename: cv.filename,
    file_size: cv.file_size,
    status: cv.status,
    created_at: cv.created_at,
    skills_found: skills.length,
    experience_count: experience.length,
  });
}
