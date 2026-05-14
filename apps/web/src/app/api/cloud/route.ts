import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { classifyCloud, detectGaps } from "@jobloop/ai";
import { loadCloudFromDB } from "@/lib/cloud-from-db";

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloud = await loadCloudFromDB(supabase, user.id);

  if (!cloud) {
    return NextResponse.json({ classified: null });
  }

  const classified = classifyCloud(cloud.nodes);
  classified.gaps = detectGaps(classified);

  return NextResponse.json({
    classified,
    education: cloud.education,
    certifications: cloud.certifications,
    achievements: cloud.achievements,
    trajectory: cloud.trajectory,
  });
}
