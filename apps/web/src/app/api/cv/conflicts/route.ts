import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { detectConflicts, type PersonaType } from "@jobloop/ai";

/**
 * GET /api/cv/conflicts
 *
 * Loads all parsed CVs for the authenticated user, runs conflict detection,
 * and returns the conflict report for the UI to present resolution choices.
 */
export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: uploads, error } = await supabase
    .from("cv_uploads")
    .select("id, filename, parsed_cv")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .not("parsed_cv", "is", null);

  if (error) {
    console.error("Failed to load CV uploads:", error);
    return NextResponse.json(
      { error: "Failed to load uploaded CVs" },
      { status: 500 },
    );
  }

  // Load user's persona for persona-aware conflict filtering
  const { data: profile } = await supabase
    .from("profiles")
    .select("persona")
    .eq("id", user.id)
    .single();

  const persona = (profile?.persona as PersonaType) ?? undefined;

  if (!uploads || uploads.length < 2) {
    return NextResponse.json({
      conflicts: [],
      gaps: [],
      employer_groups: [],
      unique_roles_detected: 0,
      stats: { total_documents: uploads?.length ?? 0, total_roles: 0, conflicts_found: 0, gaps_found: 0 },
      message: "Need at least 2 CVs to detect conflicts",
    });
  }

  // Map DB rows to the shape detectConflicts expects
  const documents = uploads.map((u) => {
    const cv = u.parsed_cv as Record<string, unknown>;
    const experience = (cv.experience ?? []) as Array<{
      title: string;
      company: string;
      start_date: string;
      end_date: string;
      location?: string;
      bullets: string[];
    }>;

    return {
      id: u.id as string,
      name: u.filename as string,
      roles: experience.map((r) => ({
        title: r.title,
        company: r.company,
        start_date: r.start_date ?? "",
        end_date: r.end_date ?? "",
        location: r.location,
        bullets: r.bullets ?? [],
      })),
    };
  });

  const report = detectConflicts(documents, persona);

  return NextResponse.json(report);
}
