import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { loadCloudFromDB } from "@/lib/cloud-from-db";
import {
  generateCloudTailoredCV,
  matchCloudToJD,
  parseJD,
} from "@jobloop/ai";
import type { GeneratedCV } from "@jobloop/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { application_id, instructions, model_tier } = body;

  if (!application_id) {
    return Response.json(
      { error: "application_id is required" },
      { status: 400 },
    );
  }

  // Load application (with JD text and parsed JD)
  const { data: app, error: appError } = await supabase
    .from("applications")
    .select("id, user_id, jd_text, jd_parsed, company, role")
    .eq("id", application_id)
    .single();

  if (appError || !app) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }

  if (app.user_id !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!app.jd_text) {
    return Response.json(
      { error: "No job description found for this application" },
      { status: 400 },
    );
  }

  // Load user's Cloud
  const cloud = await loadCloudFromDB(supabase, user.id);
  if (!cloud) {
    return Response.json(
      { error: "No profile cloud found. Upload a CV first." },
      { status: 400 },
    );
  }

  // Parse JD if not already parsed
  let parsedJD = app.jd_parsed;
  if (!parsedJD) {
    try {
      parsedJD = await parseJD(app.jd_text);
    } catch (err) {
      return Response.json(
        {
          error: `Failed to parse JD: ${err instanceof Error ? err.message : "unknown"}`,
        },
        { status: 500 },
      );
    }
  }

  // Match Cloud to JD
  const matchReport = matchCloudToJD(cloud, parsedJD);

  // Generate tailored CV
  let generatedCV: GeneratedCV;
  try {
    generatedCV = await generateCloudTailoredCV(
      cloud,
      matchReport,
      app.jd_text,
      instructions,
      model_tier === "fast" ? "fast" : "quality",
    );
  } catch (err) {
    console.error("CV generation failed:", err);
    return Response.json(
      {
        error: `CV generation failed: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }

  // Save generated CV to DB (cv_versions table)
  const { data: savedCV, error: saveError } = await supabase
    .from("cv_versions")
    .insert({
      user_id: user.id,
      name: `Tailored for ${app.company || "role"}`,
      content: generatedCV,
      change_summary: `Generated for ${app.role || "position"} at ${app.company || "company"}`,
    })
    .select("id, created_at")
    .single();

  if (saveError) {
    // Non-critical — still return the generated CV even if save fails
    console.error("Failed to save generated CV:", saveError);
  }

  return Response.json({
    cv: generatedCV,
    cv_id: savedCV?.id ?? null,
    application_id,
    company: app.company,
    role: app.role,
  });
}
