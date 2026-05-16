import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/cv/list
 *
 * Returns all source CVs for the authenticated user.
 * These are the "ground truth" CVs that build the Profile Cloud (max 5).
 * Tailored CVs per JD are stored on applications, not here.
 */
export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const MAX_SOURCE_CVS = 5;

  const { data: cvs, count } = await db
    .from("cv_uploads")
    .select("id, filename, file_size, status, created_at, parsed_cv", { count: "exact" })
    .eq("user_id", user.id)
    .not("status", "eq", "error")
    .order("created_at", { ascending: false });

  const items = (cvs ?? []).map((cv) => {
    const parsed = cv.parsed_cv as Record<string, unknown> | null;
    const experience = Array.isArray(parsed?.experience) ? parsed.experience : [];
    const skills = Array.isArray(parsed?.skills) ? parsed.skills : [];

    return {
      id: cv.id,
      filename: cv.filename,
      file_size: cv.file_size,
      status: cv.status,
      created_at: cv.created_at,
      skills_found: skills.length,
      experience_count: experience.length,
    };
  });

  return Response.json({
    cvs: items,
    count: count ?? 0,
    max_allowed: MAX_SOURCE_CVS,
    remaining: Math.max(0, MAX_SOURCE_CVS - (count ?? 0)),
  });
}
