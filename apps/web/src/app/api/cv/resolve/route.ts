import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/ensure-user";
import { getAuthUser } from "@/lib/auth";
import {
  mergeResolvedProfile,
  resolvedProfileToParsedCV,
  buildCloudFromParsedCV,
} from "@jobloop/ai";
import type { AnswerParseResult } from "@jobloop/ai";

/**
 * POST /api/cv/resolve
 *
 * Accepts user resolution data (from conflict UI + Socratic answers),
 * merges all CVs into a single ResolvedProfile, builds the Cloud,
 * and persists Cloud nodes to the database.
 *
 * Body:
 *   answer_results: AnswerParseResult[]  — parsed Socratic answers
 *   employer_confirmed: string | null     — confirmed employer name
 *   is_single_employer: boolean           — all roles under one org?
 *   persona: string                       — user's persona type
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserExists(supabase, user);

  const body = await request.json();
  const {
    answer_results = [],
    employer_confirmed = null,
    is_single_employer = false,
    persona = "mid_career",
  } = body;

  // Load all parsed CVs
  const { data: uploads, error: loadError } = await supabase
    .from("cv_uploads")
    .select("id, filename, parsed_cv")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .not("parsed_cv", "is", null);

  if (loadError || !uploads || uploads.length === 0) {
    return NextResponse.json(
      { error: "No parsed CVs found. Upload at least one CV first." },
      { status: 400 },
    );
  }

  // Map DB rows to InputCV shape
  const parsedCVs = uploads.map((u) => {
    const cv = u.parsed_cv as Record<string, unknown>;
    const experience = (cv.experience ?? []) as Array<{
      title: string;
      company: string;
      start_date: string;
      end_date: string;
      duration_months?: number;
      bullets: string[];
      technologies_used?: string[];
      metrics_mentioned?: string[];
      domain?: string;
      programs?: string[];
      team_size?: number | null;
    }>;
    const education = (cv.education ?? []) as Array<{
      institution: string;
      degree: string;
      field: string;
      dates?: string;
      start_year?: number | null;
      end_year?: number | null;
    }>;
    const certifications = (cv.certifications ?? []) as string[];

    return {
      id: u.id as string,
      name: u.filename as string,
      roles: experience.map((r) => ({
        title: r.title,
        company: r.company,
        start_date: r.start_date ?? "",
        end_date: r.end_date ?? "",
        duration_months: r.duration_months,
        bullets: r.bullets ?? [],
        technologies_used: r.technologies_used,
        metrics_mentioned: r.metrics_mentioned,
        domain: r.domain,
        programs: r.programs,
        team_size: r.team_size,
      })),
      education,
      certifications,
    };
  });

  // Merge into ResolvedProfile
  const resolved = mergeResolvedProfile(
    parsedCVs,
    answer_results as AnswerParseResult[],
    { employer_confirmed, is_single_employer },
    persona,
  );

  // Convert to ParsedCV shape and build Cloud
  const parsedCV = resolvedProfileToParsedCV(resolved);
  const cloud = buildCloudFromParsedCV(parsedCV);

  // Delete existing cloud nodes for this user (full rebuild)
  await supabase.from("cloud_nodes").delete().eq("user_id", user.id);

  // Insert all new cloud nodes
  const nodeRows = cloud.nodes.map((node) => ({
    user_id: user.id,
    name: node.name,
    type: node.type,
    category: node.category,
    evidence: node.evidence,
    summary: node.summary,
  }));

  if (nodeRows.length > 0) {
    const { error: insertError } = await supabase
      .from("cloud_nodes")
      .insert(nodeRows);

    if (insertError) {
      console.error("Failed to insert cloud nodes:", insertError);
      return NextResponse.json(
        { error: "Failed to save profile cloud" },
        { status: 500 },
      );
    }
  }

  // Store the resolved profile for reference
  await supabase.from("users").update({
    resolved_profile: resolved,
  }).eq("id", user.id);

  return NextResponse.json({
    success: true,
    roles_count: resolved.roles.length,
    education_count: resolved.education.length,
    certifications_count: resolved.certifications.length,
    cloud_nodes_count: cloud.nodes.length,
    meta: resolved.meta,
  });
}
