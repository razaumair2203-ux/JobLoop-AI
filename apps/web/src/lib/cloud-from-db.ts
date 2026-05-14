import type { SupabaseClient } from "@supabase/supabase-js";
import { reconstructTrajectory } from "@jobloop/ai";
import type { ProfileCloud, CloudNode } from "@jobloop/ai";

/**
 * Load a user's ProfileCloud from cloud_nodes in the database.
 * Reconstructs trajectory from role evidence so domain maturity works.
 * Returns null if no nodes exist.
 */
export async function loadCloudFromDB(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileCloud | null> {
  const { data: rows } = await supabase
    .from("cloud_nodes")
    .select("id, name, type, category, evidence, summary")
    .eq("user_id", userId);

  if (!rows || rows.length === 0) return null;

  const nodes: CloudNode[] = rows.map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type as "skill" | "capability" | "domain",
    category: n.category,
    evidence: Array.isArray(n.evidence) ? n.evidence : [],
    summary: n.summary ?? {
      total_months_used: 0,
      number_of_roles: 0,
      has_impact: false,
      has_external_validation: false,
      has_depth: false,
      has_project: false,
      last_used: null,
    },
  }));

  // Reconstruct trajectory from role evidence (not stored separately in DB)
  const trajectory = reconstructTrajectory(nodes);

  // Load education from parsed CVs
  const { data: cvRows } = await supabase
    .from("cv_uploads")
    .select("parsed_cv")
    .eq("user_id", userId)
    .not("parsed_cv", "is", null);

  const education: ProfileCloud["education"] = [];
  const seenEdu = new Set<string>();
  if (cvRows) {
    for (const row of cvRows) {
      const parsed = row.parsed_cv as Record<string, unknown> | null;
      const eduList = (parsed?.education ?? []) as Array<{
        institution?: string; degree?: string; field?: string; field_of_study?: string;
        start_year?: number | null; end_year?: number | null; year?: string;
        grade?: string; research_topic?: string | null; highlights?: string[];
      }>;
      for (const ed of eduList) {
        const key = `${ed.institution ?? ""}|${ed.degree ?? ""}`.toLowerCase();
        if (seenEdu.has(key)) continue;
        seenEdu.add(key);
        let startYear: number | null = ed.start_year ?? null;
        let endYear: number | null = ed.end_year ?? null;
        if (startYear === null && endYear === null && ed.year) {
          const parsed = parseInt(ed.year, 10);
          if (!isNaN(parsed)) endYear = parsed;
        }
        education.push({
          institution: ed.institution ?? "",
          degree: ed.degree ?? "",
          field: ed.field ?? ed.field_of_study ?? "",
          start_year: startYear,
          end_year: endYear,
          grade: ed.grade ?? null,
          research_topic: ed.research_topic ?? null,
          highlights: ed.highlights ?? [],
        });
      }
    }
  }

  // Extract certifications from cloud nodes
  const certNodes = nodes.filter((n) => n.evidence.some((e) => e.type === "certification"));
  const certifications = certNodes.map((n) => {
    const certEv = n.evidence.find((e) => e.type === "certification");
    return certEv as NonNullable<typeof certEv>;
  }).filter(Boolean);

  return {
    user_id: userId,
    nodes,
    achievements: [],
    trajectory,
    education,
    certifications,
    languages_spoken: [],
    last_updated: new Date().toISOString(),
  };
}
