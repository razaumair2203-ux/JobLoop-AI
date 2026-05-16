import type { SupabaseClient } from "@supabase/supabase-js";
import { reconstructTrajectory, computeIdentity, classifyNodeTier, skillsMatch } from "@jobloop/ai";
import type { ProfileCloud, CloudNode, CloudNodeTier } from "@jobloop/ai";

/**
 * Load a user's ProfileCloud from cloud_nodes in the database.
 * Reconstructs trajectory and identity from stored data.
 * Returns null if no nodes exist.
 */
export async function loadCloudFromDB(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileCloud | null> {
  const { data: rows } = await supabase
    .from("cloud_nodes")
    .select("id, name, type, category, tier, evidence, summary")
    .eq("user_id", userId);

  if (!rows || rows.length === 0) return null;

  const nodes: CloudNode[] = rows.map((n) => {
    const evidence = Array.isArray(n.evidence) ? n.evidence : [];
    return {
      id: n.id,
      name: n.name,
      type: n.type as "skill" | "capability" | "domain",
      category: n.category,
      tier: ((n as Record<string, unknown>).tier as CloudNodeTier) ?? classifyNodeTier(n.name, n.category, evidence),
      evidence,
      summary: n.summary ?? {
        total_months_used: 0,
        number_of_roles: 0,
        has_impact: false,
        has_external_validation: false,
        has_depth: false,
        has_project: false,
        last_used: null,
      },
    };
  });

  const trajectory = reconstructTrajectory(nodes);

  const { data: cvRows } = await supabase
    .from("cv_uploads")
    .select("parsed_cv")
    .eq("user_id", userId)
    .not("parsed_cv", "is", null);

  const education: ProfileCloud["education"] = [];
  const seenEdu = new Set<string>();
  const allCertNames: string[] = [];
  const allExperience: Array<{ title: string; company: string; start_date?: string; end_date?: string; duration_months: number; domain: string }> = [];

  if (cvRows) {
    for (const row of cvRows) {
      const parsed = row.parsed_cv as Record<string, unknown> | null;
      const eduList = (parsed?.education ?? []) as Array<{
        institution?: string; degree?: string; field?: string; field_of_study?: string;
        start_year?: number | null; end_year?: number | null; year?: string;
        grade?: string; research_topic?: string | null; highlights?: string[];
      }>;
      for (const ed of eduList) {
        // Dedup by normalized degree+field (ignore institution name variations across CVs)
        const degNorm = (ed.degree ?? "").toLowerCase().replace(/fellowship\s*\(([^)]+)\)/i, "$1").trim();
        const fieldNorm = (ed.field ?? ed.field_of_study ?? "").toLowerCase()
          .replace(/\b(anesthesia|anaesthesia)\b/, "anesthesiology").trim();
        const key = `${degNorm}|${fieldNorm}`;
        if (seenEdu.has(key)) continue;
        seenEdu.add(key);
        let startYear: number | null = ed.start_year ?? null;
        let endYear: number | null = ed.end_year ?? null;
        if (startYear === null && endYear === null && ed.year) {
          const p = parseInt(ed.year, 10);
          if (!isNaN(p)) endYear = p;
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
      const certs = (parsed?.certifications ?? []) as Array<string | { name: string }>;
      for (const c of certs) {
        allCertNames.push(typeof c === "string" ? c : c.name);
      }
      const exp = (parsed?.experience ?? []) as Array<{
        title?: string; company?: string; start_date?: string; end_date?: string;
        duration_months?: number; domain?: string;
      }>;
      for (const e of exp) {
        allExperience.push({
          title: e.title ?? "",
          company: e.company ?? "",
          start_date: e.start_date,
          end_date: e.end_date,
          duration_months: e.duration_months ?? 0,
          domain: e.domain ?? "general",
        });
      }
    }
  }

  const certNodes = nodes.filter((n) => n.evidence.some((e) => e.type === "certification"));
  const certifications = certNodes.map((n) => {
    const certEv = n.evidence.find((e) => e.type === "certification");
    return certEv as NonNullable<typeof certEv>;
  }).filter(Boolean);

  // Dedup cert names across CVs — same cert with different wording across CVs
  const seenCertKeys = new Set<string>();
  const dedupedCertNames = allCertNames.filter(c => {
    const key = c.toLowerCase()
      .replace(/american heart association/g, "aha")
      .replace(/\s+/g, " ")
      .trim();
    if (seenCertKeys.has(key)) return false;
    seenCertKeys.add(key);
    return true;
  });

  const identity = computeIdentity(education, allExperience, dedupedCertNames);

  return {
    user_id: userId,
    identity,
    nodes,
    achievements: [],
    trajectory,
    education,
    certifications,
    languages_spoken: [],
    last_updated: new Date().toISOString(),
  };
}

// ============================================================
// Outcome Context — for CV generation
// ============================================================

export interface OutcomeSignal {
  skill_id: string;
  signal: "positive" | "gap";
  context: string;
  niche: string;
  date: string;
}

export interface OutcomeContext {
  /** Per-skill outcome signals from previous applications */
  skill_signals: Array<{
    skill_name: string;
    signals: OutcomeSignal[];
  }>;
  /** Previous applications in the same niche */
  niche_history: Array<{
    company: string;
    role: string;
    outcome: string;
    feedback_summary: string | null;
  }>;
}

/**
 * Load outcome intelligence context for CV generation.
 * Reads outcome_signals from cloud_nodes + application history for the niche.
 * Returns ~200 tokens of context the CV gen prompt can use.
 */
export async function loadOutcomeContext(
  supabase: SupabaseClient,
  userId: string,
  jdIndustry: string | null,
  jdRole: string | null,
): Promise<OutcomeContext | null> {
  // Load outcome_signals from cloud nodes
  const { data: nodeRows } = await supabase
    .from("cloud_nodes")
    .select("name, outcome_signals")
    .eq("user_id", userId)
    .not("outcome_signals", "eq", "[]");

  const skill_signals: OutcomeContext["skill_signals"] = [];

  if (nodeRows) {
    for (const row of nodeRows) {
      const signals = (row.outcome_signals as OutcomeSignal[]) ?? [];
      if (signals.length === 0) continue;

      // Filter to relevant niche if we know it
      const relevant = jdIndustry
        ? signals.filter(s => s.niche.toLowerCase().includes(jdIndustry.toLowerCase()))
        : signals;

      if (relevant.length > 0) {
        skill_signals.push({ skill_name: row.name, signals: relevant });
      }
    }
  }

  // Load application history for same niche/role type
  const { data: apps } = await supabase
    .from("applications")
    .select("company, role, outcome_status, user_feedback, parsed_feedback, industry")
    .eq("user_id", userId)
    .not("outcome_status", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const niche_history: OutcomeContext["niche_history"] = [];

  if (apps) {
    for (const app of apps) {
      // Include if same industry or similar role
      const sameIndustry = jdIndustry && app.industry &&
        app.industry.toLowerCase().includes(jdIndustry.toLowerCase());
      const sameRole = jdRole && skillsMatch(app.role, jdRole);

      if (sameIndustry || sameRole) {
        const parsed = app.parsed_feedback as { context?: string } | null;
        niche_history.push({
          company: app.company,
          role: app.role,
          outcome: app.outcome_status,
          feedback_summary: app.user_feedback
            ? app.user_feedback.slice(0, 100)
            : (parsed?.context ?? null),
        });
      }
    }
  }

  // Only return if we have meaningful data
  if (skill_signals.length === 0 && niche_history.length === 0) return null;

  return { skill_signals, niche_history };
}
