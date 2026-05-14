import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/applications
 *
 * Returns all applications for the authenticated user, ordered by most recent.
 * Includes match_analysis (gaps, strengths, bridge_strategies) for pattern detection.
 */
export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, company, role, stage, source, source_url, applied_date, position, match_analysis, outcome:outcome_status, notes, excitement, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch applications:", error);
    return Response.json({ error: "Failed to fetch applications" }, { status: 500 });
  }

  // Pattern detection: aggregate gaps across all applications
  const gapCounts = new Map<string, { count: number; companies: string[] }>();
  for (const app of apps ?? []) {
    const gaps = (app.match_analysis as { gaps?: string[] })?.gaps ?? [];
    for (const gap of gaps) {
      const normalized = gap.toLowerCase().trim();
      const existing = gapCounts.get(normalized);
      if (existing) {
        existing.count++;
        if (!existing.companies.includes(app.company)) {
          existing.companies.push(app.company);
        }
      } else {
        gapCounts.set(normalized, { count: 1, companies: [app.company] });
      }
    }
  }

  // Surface patterns: gaps that appear in 2+ applications
  const patterns = [...gapCounts.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([gap, v]) => ({
      skill: gap,
      frequency: v.count,
      companies: v.companies,
      message: `Your applications show a pattern: ${v.count} JDs flagged "${gap}" as a gap. Want to address this in your Cloud?`,
    }));

  // Funnel stats
  const total = apps?.length ?? 0;
  const applied = apps?.filter(a => a.stage === "applied").length ?? 0;
  const interviews = apps?.filter(a => a.outcome === "interview" || a.outcome === "callback").length ?? 0;
  const offers = apps?.filter(a => a.outcome === "offer").length ?? 0;

  return Response.json({
    applications: apps ?? [],
    patterns,
    stats: { total, applied, interviews, offers },
  });
}
