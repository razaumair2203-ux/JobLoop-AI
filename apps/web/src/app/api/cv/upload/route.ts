import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext)) {
      results.push({ filename: file.name, error: "Invalid file type" });
      continue;
    }

    if (file.size > 10 * 1024 * 1024) {
      results.push({ filename: file.name, error: "File too large (max 10MB)" });
      continue;
    }

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: storageError } = await supabase.storage
      .from("cvs")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      results.push({ filename: file.name, error: `Storage: ${storageError.message}` });
      continue;
    }

    // Create cv_uploads record
    const { data: upload, error: dbError } = await supabase
      .from("cv_uploads")
      .insert({
        user_id: user.id,
        filename: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        status: "extracting",
      })
      .select("id")
      .single();

    if (dbError) {
      results.push({ filename: file.name, error: `DB: ${dbError.message}` });
      continue;
    }

    // Extract text from file
    let extractedText: string;
    try {
      if (ext === "pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } else {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      }
    } catch (err) {
      await supabase
        .from("cv_uploads")
        .update({
          status: "error",
          error_message: `Text extraction failed: ${err instanceof Error ? err.message : "unknown"}`,
        })
        .eq("id", upload.id);

      results.push({ filename: file.name, error: "Text extraction failed" });
      continue;
    }

    if (!extractedText || extractedText.trim().length < 50) {
      await supabase
        .from("cv_uploads")
        .update({
          status: "error",
          extracted_text: extractedText,
          error_message: "Could not extract meaningful text from file",
        })
        .eq("id", upload.id);

      results.push({ filename: file.name, error: "No readable text found" });
      continue;
    }

    // Save extracted text, mark as ready for parsing
    await supabase
      .from("cv_uploads")
      .update({
        extracted_text: extractedText,
        status: "parsing",
      })
      .eq("id", upload.id);

    // Parse CV with AI (or dev mode placeholder)
    let parsedCV;
    try {
      parsedCV = await parseCV(extractedText);
    } catch (err) {
      await supabase
        .from("cv_uploads")
        .update({
          status: "error",
          error_message: `AI parsing failed: ${err instanceof Error ? err.message : "unknown"}`,
        })
        .eq("id", upload.id);

      results.push({ filename: file.name, error: "AI parsing failed" });
      continue;
    }

    // Save parsed result
    await supabase
      .from("cv_uploads")
      .update({
        parsed_cv: parsedCV,
        status: "parsed",
      })
      .eq("id", upload.id);

    results.push({
      id: upload.id,
      filename: file.name,
      status: "parsed",
      skills_found: countSkills(parsedCV),
      experience_count: parsedCV.experience?.length ?? 0,
    });
  }

  // After all files parsed, rebuild the user's Cloud
  const { data: allParsed } = await supabase
    .from("cv_uploads")
    .select("parsed_cv")
    .eq("user_id", user.id)
    .eq("status", "parsed")
    .not("parsed_cv", "is", null);

  if (allParsed && allParsed.length > 0) {
    const mergedCloud = mergeIntoCloud(
      user.id,
      allParsed.map((r) => r.parsed_cv),
    );

    // Upsert cloud nodes
    for (const node of mergedCloud.nodes) {
      await supabase.from("cloud_nodes").upsert(
        {
          user_id: user.id,
          name: node.name,
          type: node.type,
          category: node.category,
          evidence: node.evidence,
          summary: node.summary,
        },
        { onConflict: "user_id,name" },
      );
    }
  }

  return NextResponse.json({ results });
}

// ============================================================
// CV PARSING — dev mode returns structured placeholder
// ============================================================

async function parseCV(text: string) {
  // Dev mode: extract what we can without AI
  // In production, this calls Claude with CV_PARSER_SYSTEM_PROMPT
  const lines = text.split("\n").filter((l) => l.trim());

  const skills = extractSkillsFromText(text);
  const experience = extractExperienceFromText(text);

  return {
    name: lines[0]?.trim() ?? "Unknown",
    email: text.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] ?? null,
    phone: text.match(/[\+]?[\d\s\-().]{7,15}/)?.[0]?.trim() ?? null,
    location: { city: null, country: null },
    links: { linkedin: null, github: null, portfolio: null, other: [] },
    summary: null,
    total_experience_years: experience.length * 2, // rough estimate
    experience,
    education: [],
    skills: {
      languages: skills.filter((s) =>
        ["javascript", "typescript", "python", "java", "c#", "c++", "go", "rust", "ruby", "php", "swift", "kotlin"].includes(s.toLowerCase()),
      ),
      frameworks: skills.filter((s) =>
        ["react", "angular", "vue", "next.js", "express", "django", "flask", "spring", "rails", "laravel", "svelte", "nuxt"].includes(s.toLowerCase()),
      ),
      infrastructure: skills.filter((s) =>
        ["aws", "gcp", "azure", "docker", "kubernetes", "terraform", "jenkins", "ci/cd", "linux", "nginx"].includes(s.toLowerCase()),
      ),
      databases: skills.filter((s) =>
        ["postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "sqlite", "cassandra"].includes(s.toLowerCase()),
      ),
      tools: skills.filter((s) =>
        ["git", "jira", "figma", "slack", "vscode", "postman", "webpack", "babel"].includes(s.toLowerCase()),
      ),
      other: [],
    },
    certifications: [],
    all_technologies: skills,
  };
}

function extractSkillsFromText(text: string): string[] {
  const knownSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Go", "Rust", "Ruby", "PHP",
    "React", "Angular", "Vue", "Next.js", "Express", "Django", "Flask", "Spring", "Node.js",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Jenkins",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
    "Git", "Jira", "Figma", "GraphQL", "REST", "gRPC", "Kafka", "RabbitMQ",
    "HTML", "CSS", "Sass", "Tailwind", "Bootstrap",
    "TensorFlow", "PyTorch", "Machine Learning", "Data Science",
    "Agile", "Scrum", "CI/CD", "Linux", "Nginx",
    "Swift", "Kotlin", "React Native", "Flutter",
    "SQL", "NoSQL", "Microservices", "Serverless",
    "Project Management", "Team Leadership", "Communication",
  ];

  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const skill of knownSkills) {
    if (lower.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }
  return found;
}

function extractExperienceFromText(text: string): Array<{
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  technologies_used: string[];
  metrics_mentioned: string[];
  domain: string;
}> {
  // Very basic extraction — looks for date patterns near company-like lines
  const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/gi;
  const dates = text.match(datePattern) || [];

  // In dev mode, return minimal placeholder
  if (dates.length >= 2) {
    return [
      {
        company: "Extracted from CV",
        title: "Role detected",
        start_date: dates[dates.length - 1] || "unknown",
        end_date: dates[0] || "present",
        duration_months: 24,
        technologies_used: extractSkillsFromText(text).slice(0, 5),
        metrics_mentioned: [],
        domain: "technology",
      },
    ];
  }

  return [];
}

function countSkills(parsedCV: Record<string, unknown>): number {
  const skills = parsedCV.skills as Record<string, string[]> | undefined;
  if (!skills) return 0;
  return Object.values(skills).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
}

// ============================================================
// CLOUD MERGE — combine multiple parsed CVs into one Cloud
// ============================================================

interface CloudNode {
  name: string;
  type: string;
  category: string;
  evidence: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
}

function mergeIntoCloud(
  userId: string,
  parsedCVs: Array<Record<string, unknown>>,
): { nodes: CloudNode[] } {
  const nodeMap = new Map<string, CloudNode>();

  for (const cv of parsedCVs) {
    const skills = cv.skills as Record<string, string[]> | undefined;
    const experience = cv.experience as Array<Record<string, unknown>> | undefined;
    const allTech = cv.all_technologies as string[] | undefined;

    // Add skills as nodes
    if (skills) {
      const categories: Array<[string, string[]]> = [
        ["language", skills.languages || []],
        ["framework", skills.frameworks || []],
        ["infrastructure", skills.infrastructure || []],
        ["database", skills.databases || []],
        ["tool", skills.tools || []],
        ["other", skills.other || []],
      ];

      for (const [category, items] of categories) {
        for (const skillName of items) {
          const key = skillName.toLowerCase();
          if (!nodeMap.has(key)) {
            nodeMap.set(key, {
              name: skillName,
              type: "skill",
              category,
              evidence: [],
              summary: {},
            });
          }
        }
      }
    }

    // Add tech from all_technologies that might not be in skills
    if (allTech) {
      for (const tech of allTech) {
        const key = tech.toLowerCase();
        if (!nodeMap.has(key)) {
          nodeMap.set(key, {
            name: tech,
            type: "skill",
            category: "unknown",
            evidence: [],
            summary: {},
          });
        }
      }
    }

    // Add role evidence from experience
    if (experience) {
      for (const role of experience) {
        const techUsed = (role.technologies_used as string[]) || [];
        const metrics = (role.metrics_mentioned as string[]) || [];
        const company = (role.company as string) || "Unknown";
        const title = (role.title as string) || "Unknown";
        const duration = (role.duration_months as number) || 0;

        for (const tech of techUsed) {
          const key = tech.toLowerCase();
          if (!nodeMap.has(key)) {
            nodeMap.set(key, {
              name: tech,
              type: "skill",
              category: "unknown",
              evidence: [],
              summary: {},
            });
          }

          const node = nodeMap.get(key)!;
          // Deduplicate: don't add same company+title twice
          const alreadyHas = node.evidence.some(
            (e) =>
              e.type === "role" && e.company === company && e.title === title,
          );
          if (!alreadyHas) {
            node.evidence.push({
              type: "role",
              company,
              title,
              duration_months: duration,
              context: `Used in role: ${title} at ${company}`,
              start_date: (role.start_date as string) || "unknown",
              end_date: (role.end_date as string) || "unknown",
            });
          }
        }

        // Add metrics as impact evidence
        for (const metric of metrics) {
          for (const tech of techUsed) {
            const node = nodeMap.get(tech.toLowerCase());
            if (node) {
              node.evidence.push({
                type: "impact",
                description: metric,
                source_role: company,
                metric,
              });
            }
          }
        }

        // Domain node
        const domain = role.domain as string;
        if (domain) {
          const domainKey = domain.toLowerCase();
          if (!nodeMap.has(domainKey)) {
            nodeMap.set(domainKey, {
              name: domain,
              type: "domain",
              category: "domain",
              evidence: [],
              summary: {},
            });
          }
          const dNode = nodeMap.get(domainKey)!;
          const alreadyHas = dNode.evidence.some(
            (e) => e.type === "role" && e.company === company,
          );
          if (!alreadyHas) {
            dNode.evidence.push({
              type: "role",
              company,
              title,
              duration_months: duration,
              context: `Worked in ${domain} domain`,
              start_date: (role.start_date as string) || "unknown",
              end_date: (role.end_date as string) || "unknown",
            });
          }
        }
      }
    }
  }

  // Compute summaries
  for (const node of nodeMap.values()) {
    const roles = node.evidence.filter((e) => e.type === "role");
    const impacts = node.evidence.filter((e) => e.type === "impact");
    const totalMonths = roles.reduce(
      (sum, r) => sum + ((r.duration_months as number) || 0),
      0,
    );

    node.summary = {
      total_months_used: totalMonths,
      number_of_roles: roles.length,
      has_impact: impacts.length > 0,
      has_external_validation: false,
      has_depth: false,
      has_project: false,
      last_used: null,
    };
  }

  return { nodes: Array.from(nodeMap.values()) };
}
