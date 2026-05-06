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

  return {
    user_id: userId,
    nodes,
    achievements: [],
    trajectory,
    education: [],
    certifications: [],
    languages_spoken: [],
    last_updated: new Date().toISOString(),
  };
}
