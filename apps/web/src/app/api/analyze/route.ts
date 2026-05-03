import { createClient } from "@/lib/supabase/server";

// Dev-mode mock analysis for a Senior Frontend Engineer role
function getMockAnalysis(company: string, role: string) {
  return {
    company: company || "TechCorp",
    role: role || "Senior Frontend Engineer",
    position: {
      label: "Competitive" as const,
      basis: "5/8 requirements have strong evidence, 2 related, 1 gap",
    },
    sources: [
      { name: "Work Experience", icon: "briefcase", count: 12 },
      { name: "Skills", icon: "code", count: 8 },
      { name: "Projects", icon: "folder", count: 4 },
      { name: "Education", icon: "graduation-cap", count: 2 },
    ],
    requirements: [
      {
        id: "r1",
        name: "React & Next.js expertise",
        strength: "strong" as const,
        evidence: "4 years building production React apps at Scale Corp, migrated legacy Angular app to Next.js 14 serving 2M users/month.",
        citations: [1, 2],
        bridge: null,
      },
      {
        id: "r2",
        name: "TypeScript proficiency",
        strength: "strong" as const,
        evidence: "All production projects since 2021 in strict TypeScript. Contributed to DefinitelyTyped. Set up monorepo-wide tsconfig.",
        citations: [1, 3],
        bridge: null,
      },
      {
        id: "r3",
        name: "Performance optimization",
        strength: "strong" as const,
        evidence: "Reduced LCP by 40% through code splitting and lazy loading. Implemented virtual scrolling for 100K+ row tables.",
        citations: [2],
        bridge: null,
      },
      {
        id: "r4",
        name: "Design system experience",
        strength: "strong" as const,
        evidence: "Built component library with 60+ components used by 3 product teams. Storybook documentation, accessibility audits.",
        citations: [1, 4],
        bridge: null,
      },
      {
        id: "r5",
        name: "CI/CD & testing",
        strength: "strong" as const,
        evidence: "Set up GitHub Actions pipelines, 85% test coverage with Vitest + Playwright. Reduced deploy time from 20min to 4min.",
        citations: [2, 3],
        bridge: null,
      },
      {
        id: "r6",
        name: "GraphQL API experience",
        strength: "related" as const,
        evidence: "Extensive REST API experience and some Apollo Client usage. Built a GraphQL gateway prototype during hackathon.",
        citations: [3],
        bridge: null,
      },
      {
        id: "r7",
        name: "Team leadership (5+ engineers)",
        strength: "related" as const,
        evidence: "Led 3-person frontend pod for 18 months. Mentored 2 junior developers. No direct experience leading 5+.",
        citations: [1],
        bridge: null,
      },
      {
        id: "r8",
        name: "Kubernetes & container orchestration",
        strength: "gap" as const,
        evidence: null,
        citations: [],
        bridge: "Your Docker experience and CI/CD work show infrastructure awareness. Consider framing your containerization skills and mention willingness to expand into K8s orchestration.",
      },
    ],
    strategy:
      "Lead with your React/Next.js depth and performance wins — these directly match their core needs. For the K8s gap, position your Docker + CI/CD experience as a strong foundation. The team leadership gap is minor — your pod lead experience and mentoring demonstrate leadership readiness at scale.",
    socratic: {
      question:
        "You mentioned building a component library used by 3 teams. Can you describe a specific time you had to resolve conflicting requirements between those teams?",
      skill_targeted: "Cross-team Collaboration",
    },
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { text, url, company, role } = body;

  if (!text || text.length < 50) {
    return Response.json(
      { error: "Job description must be at least 50 characters" },
      { status: 400 }
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
      { status: 500 }
    );
  }

  // Dev mode: return mock analysis
  const analysis = getMockAnalysis(company, role);

  // Update application with analysis
  await supabase
    .from("applications")
    .update({
      stage: "ready_to_apply",
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
          (analysis.position.label as string) === "Strong position"
            ? "strong"
            : (analysis.position.label as string) === "Competitive"
              ? "competitive"
              : "stretch",
      },
    })
    .eq("id", app.id);

  return Response.json({
    application_id: app.id,
    ...analysis,
  });
}
