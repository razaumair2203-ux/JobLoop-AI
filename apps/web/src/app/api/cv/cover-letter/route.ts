import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { loadCloudFromDB } from "@/lib/cloud-from-db";
import {
  generateCoverLetter,
  matchCloudToJD,
  parseJD,
} from "@jobloop/ai";
import type { GeneratedCoverLetter } from "@jobloop/ai";
import type { CoverLetterTone } from "@jobloop/shared";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    application_id,
    tone = "professional" as CoverLetterTone,
    focus_points,
    model_tier,
  } = body;

  if (!application_id) {
    return Response.json(
      { error: "application_id is required" },
      { status: 400 },
    );
  }

  // Load application
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

  // Load Cloud
  const cloud = await loadCloudFromDB(supabase, user.id);
  if (!cloud) {
    return Response.json(
      { error: "No profile cloud found. Upload a CV first." },
      { status: 400 },
    );
  }

  // Parse JD if needed
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

  // Generate cover letter
  let letter: GeneratedCoverLetter;
  try {
    letter = await generateCoverLetter(
      cloud,
      matchReport,
      app.jd_text,
      app.company || "the company",
      app.role || "the role",
      tone,
      focus_points,
      model_tier === "fast" ? "fast" : "quality",
    );
  } catch (err) {
    console.error("Cover letter generation failed:", err);
    return Response.json(
      {
        error: `Cover letter generation failed: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }

  return Response.json({
    letter,
    application_id,
    company: app.company,
    role: app.role,
  });
}
