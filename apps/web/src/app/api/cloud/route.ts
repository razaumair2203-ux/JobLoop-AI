import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { classifyCloud, detectGaps } from "@jobloop/ai";

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: nodes } = await supabase
    .from("cloud_nodes")
    .select("id, name, type, category, evidence, summary")
    .eq("user_id", user.id);

  if (!nodes || nodes.length === 0) {
    return NextResponse.json({ classified: null });
  }

  // Map DB rows to CloudNode shape
  const cloudNodes = nodes.map((n) => ({
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

  const classified = classifyCloud(cloudNodes);
  classified.gaps = detectGaps(classified);

  return NextResponse.json({ classified });
}
