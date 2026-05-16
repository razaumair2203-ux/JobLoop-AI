import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserExists } from "@/lib/ensure-user";
import { getAuthUser } from "@/lib/auth";
import { loadCloudFromDB } from "@/lib/cloud-from-db";
import { analyzeWithCloud, generateJDQuestions, checkJDSimilarity } from "@jobloop/ai";
import type { CloudAnalysisResult, SocraticContext, PersonaType } from "@jobloop/ai";

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
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  await ensureUserExists(db, user);

  const body = await request.json();
  const { text, url, company, role } = body;

  if (!text || text.length < 50) {
    return Response.json(
      { error: "Job description must be at least 50 characters" },
      { status: 400 },
    );
  }

  // Create application record
  const { data: app, error: appError } = await db
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
  const cloud = await loadCloudFromDB(db, user.id);

  if (!cloud) {
    await db
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

  // Same company detection — check if user has applied to this company before
  let sameCompanyHistory: Array<{
    id: string;
    role: string;
    outcome: string | null;
    notes: string | null;
    applied_date: string | null;
  }> | null = null;

  if (company) {
    const companyLower = company.toLowerCase().replace(/\b(inc|ltd|llc|corp|co|plc|gmbh|pty)\b\.?/gi, "").trim();
    const { data: prevApps } = await db
      .from("applications")
      .select("id, role, outcome_status, notes, applied_date, company")
      .eq("user_id", user.id)
      .neq("id", app.id)
      .order("created_at", { ascending: false });

    if (prevApps) {
      const matches = prevApps.filter(a => {
        const prevLower = (a.company || "").toLowerCase().replace(/\b(inc|ltd|llc|corp|co|plc|gmbh|pty)\b\.?/gi, "").trim();
        return prevLower === companyLower || prevLower.includes(companyLower) || companyLower.includes(prevLower);
      });
      if (matches.length > 0) {
        sameCompanyHistory = matches.map(a => ({
          id: a.id,
          role: a.role,
          outcome: a.outcome_status,
          notes: a.notes,
          applied_date: a.applied_date,
        }));
      }
    }
  }

  // JD similarity check — log for cost awareness (still run analysis to honor user intent)
  const { data: previousApps } = await db
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
  const { data: snapshot } = await db
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
    await db
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

  // Extract industry from parsed JD for niche intelligence
  const parsedJDExt = result.parsed_jd as unknown as Record<string, unknown> | undefined;
  const industry = (typeof parsedJDExt?.industry === "string" ? parsedJDExt.industry : null);

  // Load user persona + candidate_context for Socratic question generation
  const { data: userRow } = await db
    .from("users")
    .select("persona")
    .eq("id", user.id)
    .single();

  let candidateContext: SocraticContext["candidate_context"];
  const { data: cvRows } = await db
    .from("cv_uploads")
    .select("parsed_cv")
    .eq("user_id", user.id)
    .not("parsed_cv", "is", null)
    .limit(1);

  if (cvRows && cvRows.length > 0) {
    const parsed = cvRows[0].parsed_cv as Record<string, unknown> | null;
    if (parsed?.candidate_context) {
      candidateContext = parsed.candidate_context as SocraticContext["candidate_context"];
    }
  }

  const socraticCtx: SocraticContext = {
    persona: (userRow?.persona as PersonaType) ?? undefined,
    candidate_context: candidateContext,
  };

  // Generate Socratic questions for JD gaps — with context and persistence
  let socraticQuestions: Array<{
    id: string;
    question: string;
    skill_name: string;
    why_asking: string;
  }> = [];

  const hasGaps = analysis.requirements.some(
    (r) => r.strength === "gap" || r.strength === "related",
  );

  if (hasGaps) {
    try {
      const jdQuestions = await generateJDQuestions(cloud, result.parsed_jd, socraticCtx);

      // Volume control: max 3 JD questions (user is evaluating, not onboarding)
      const limited = jdQuestions.slice(0, 3);

      // Persist questions to socratic_qa with application_id so they survive page refresh
      for (const q of limited) {
        await db.from("socratic_qa").insert({
          user_id: user.id,
          application_id: app.id,
          question: q.question,
          skill_targeted: q.skill_name,
          gate: "jd_match",
          answer: null,
          answered_at: null,
        });
      }

      // Re-fetch to get DB-generated UUIDs (scoped to THIS application only)
      const { data: savedQs } = await db
        .from("socratic_qa")
        .select("id, question, skill_targeted")
        .eq("user_id", user.id)
        .eq("application_id", app.id)
        .eq("gate", "jd_match")
        .is("answer", null);

      socraticQuestions = (savedQs ?? []).map((q) => ({
        id: q.id,
        question: q.question,
        skill_name: q.skill_targeted ?? "",
        skill_targeted: q.skill_targeted ?? "",
        why_asking: "",
      }));
    } catch (err) {
      console.error("[analyze] JD Socratic question generation failed:", err);
    }
  }

  // Update application with analysis + Cloud snapshot + parsed JD + industry
  await db
    .from("applications")
    .update({
      stage: "ready_to_apply",
      jd_parsed: result.parsed_jd,
      cloud_snapshot_id: snapshot?.id ?? null,
      position: analysis.position,
      industry: industry,
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
    same_company_history: sameCompanyHistory,
  });
}
