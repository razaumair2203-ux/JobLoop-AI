import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/ensure-user";
import { getAuthUser } from "@/lib/auth";
import { loadCloudFromDB } from "@/lib/cloud-from-db";
import { analyzeWithCloud, generateJDQuestions, checkJDSimilarity } from "@jobloop/ai";
import type { CloudAnalysisResult } from "@jobloop/ai";

/**
 * Map CloudAnalysisResult to the frontend response shape.
 * Keeps the same structure the UI already consumes.
 */
function mapToResponse(
  result: CloudAnalysisResult,
  company: string,
  role: string,
) {
  const { match_report, insights } = result;

  // Map requirement matches to frontend shape
  const requirements = match_report.requirements.map((req, i) => {
    const strength =
      req.verdict === "strong_evidence" || req.verdict === "evidence_exists"
        ? ("strong" as const)
        : req.verdict === "claimed_only" || req.verdict === "adjacent"
          ? ("related" as const)
          : ("gap" as const);

    // Build evidence source tags from evidence_detail
    const evidence_sources = req.evidence_detail.map((ev) => {
      if (ev.type === "role") {
        return { type: "role" as const, label: `${ev.title} at ${ev.company}`, detail: ev.context };
      }
      if (ev.type === "certification") {
        return { type: "certification" as const, label: ev.name, detail: ev.issuer || null };
      }
      if (ev.type === "impact") {
        return { type: "impact" as const, label: ev.metric || ev.description, detail: ev.source_role };
      }
      if (ev.type === "award") {
        return { type: "award" as const, label: ev.name, detail: ev.context || null };
      }
      if (ev.type === "project") {
        return { type: "project" as const, label: ev.name, detail: ev.description || null };
      }
      if (ev.type === "socratic") {
        return { type: "socratic" as const, label: "Your answer", detail: ev.answer.slice(0, 80) };
      }
      return { type: ev.type as string, label: "Evidence", detail: null };
    });

    return {
      id: `r${i + 1}`,
      name: req.requirement_text,
      strength,
      evidence: req.evidence_summary || null,
      evidence_sources,
      bridge: req.repositioning_hint,
    };
  });

  // Count evidence sources
  const roleCount = match_report.requirements.reduce(
    (sum, r) => sum + r.evidence_detail.filter((e) => e.type === "role").length,
    0,
  );
  const certCount = match_report.requirements.reduce(
    (sum, r) =>
      sum + r.evidence_detail.filter((e) => e.type === "certification").length,
    0,
  );

  const sources = [
    { name: "Work Experience", icon: "briefcase", count: roleCount },
    {
      name: "Skills",
      icon: "code",
      count: match_report.technologies.length,
    },
    { name: "Certifications", icon: "award", count: certCount },
  ].filter((s) => s.count > 0);

  // Generate Socratic question for the biggest gap
  const gapReq = requirements.find((r) => r.strength === "gap");
  const socratic = gapReq
    ? {
        question: `Can you tell me about any experience you have related to "${gapReq.name}"? Even indirect exposure, side projects, or coursework counts.`,
        skill_targeted: gapReq.name,
      }
    : null;

  return {
    company: company || "Unknown Company",
    role: role || "Unknown Role",
    position: match_report.position,
    sources,
    requirements,
    strategy: insights.advisor_take,
    lead_with: insights.lead_with,
    biggest_risk: insights.biggest_risk,
    insights: insights.insights,
    socratic,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserExists(supabase, user);

  const body = await request.json();
  const { text, url, company, role } = body;

  if (!text || text.length < 50) {
    return Response.json(
      { error: "Job description must be at least 50 characters" },
      { status: 400 },
    );
  }

  // Create application record
  const { data: app, error: appError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      company: company || "Unknown Company",
      role: role || "Unknown Role",
      source: "other",
      source_url: url || null,
      jd_text: text,
      stage: "analyzing",
    })
    .select("id")
    .single();

  if (appError) {
    console.error("Failed to create application:", appError);
    return Response.json(
      { error: "Failed to save application" },
      { status: 500 },
    );
  }

  // Load user's Cloud from DB (with trajectory reconstruction for domain maturity)
  const cloud = await loadCloudFromDB(supabase, user.id);

  if (!cloud) {
    await supabase
      .from("applications")
      .update({ stage: "error" })
      .eq("id", app.id);
    return Response.json(
      {
        error:
          "No profile cloud found. Upload a CV first to build your profile.",
      },
      { status: 400 },
    );
  }

  // JD similarity check — log for cost awareness (still run analysis to honor user intent)
  const { data: previousApps } = await supabase
    .from("applications")
    .select("id, jd_parsed")
    .eq("user_id", user.id)
    .not("jd_parsed", "is", null)
    .neq("id", app.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (previousApps && previousApps.length > 0) {
    const newJDWords = text
      .toLowerCase()
      .split(/[\s,;.()]+/)
      .filter((w: string) => w.length > 3);

    const prevJDs = previousApps
      .filter((a) => a.jd_parsed?.requirements)
      .map((a) => ({
        id: a.id as string,
        keywords: [
          ...(a.jd_parsed.requirements?.hard ?? []).flatMap(
            (r: { keywords: string[] }) => r.keywords,
          ),
          ...(a.jd_parsed.requirements?.preferred ?? []).flatMap(
            (r: { keywords: string[] }) => r.keywords,
          ),
        ] as string[],
      }));

    if (prevJDs.length > 0) {
      const similarity = checkJDSimilarity(newJDWords, prevJDs);
      if (similarity.is_similar) {
        console.log(
          `JD similarity: ${Math.round(similarity.overlap_ratio * 100)}% overlap with app ${similarity.similar_application_id}`,
        );
      }
    }
  }

  // Snapshot Cloud state before analysis (for Outcome Intelligence correlation)
  const { data: snapshot } = await supabase
    .from("cloud_snapshots")
    .insert({
      user_id: user.id,
      snapshot: { nodes: cloud.nodes, trajectory: cloud.trajectory },
    })
    .select("id")
    .single();

  // Run the cloud pipeline — model auto-selected from Cloud maturity + JD complexity
  let result: CloudAnalysisResult;
  try {
    result = await analyzeWithCloud(cloud, text);
  } catch (err) {
    console.error("Analysis pipeline failed:", err);
    await supabase
      .from("applications")
      .update({ stage: "error" })
      .eq("id", app.id);
    return Response.json(
      {
        error: `Analysis failed: ${err instanceof Error ? err.message : "unknown error"}`,
      },
      { status: 500 },
    );
  }

  const analysis = mapToResponse(result, company, role);

  // Generate Socratic questions for JD gaps
  const gapSkills = analysis.requirements
    .filter((r) => r.strength === "gap" || r.strength === "related")
    .map((r) => r.name);

  let socraticQuestions: Array<{
    question: string;
    skill_targeted: string;
  }> = [];
  if (gapSkills.length > 0) {
    try {
      const jdQuestions = await generateJDQuestions(cloud, result.parsed_jd);
      socraticQuestions = jdQuestions.map(q => ({ question: q.question, skill_targeted: q.skill_name }));
    } catch {
      // Non-critical — analysis still useful without questions
    }
  }

  // Update application with analysis + Cloud snapshot + parsed JD (for similarity checks)
  await supabase
    .from("applications")
    .update({
      stage: "ready_to_apply",
      jd_parsed: result.parsed_jd,
      cloud_snapshot_id: snapshot?.id ?? null,
      position: analysis.position,
      match_analysis: {
        gaps: analysis.requirements
          .filter((r) => r.strength === "gap")
          .map((r) => r.name),
        strengths: analysis.requirements
          .filter((r) => r.strength === "strong")
          .map((r) => r.name),
        bridge_strategies: analysis.requirements
          .filter((r) => r.bridge)
          .map((r) => r.bridge),
        recommendation_level:
          analysis.position.label === "Strong position"
            ? "strong"
            : analysis.position.label === "Competitive"
              ? "competitive"
              : "stretch",
      },
    })
    .eq("id", app.id);

  return Response.json({
    application_id: app.id,
    ...analysis,
    socratic_questions: socraticQuestions,
  });
}
