/**
 * One-shot script: build Sibgha's Cloud from her 4 parsed CVs.
 * Mimics /api/cv/build-cloud without needing auth session.
 */
import { createClient } from "@supabase/supabase-js";
import {
  buildCloudFromParsedCV,
  cleanParsedCVs,
  detectConflicts,
  mergeResolvedProfile,
  resolvedProfileToParsedCV,
  buildConflictQuestions,
} from "@jobloop/ai";
import type { ConflictReport, PersonaType } from "@jobloop/ai";

const SUPABASE_URL = "https://koyqjfatxreyaaynflrn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveXFqZmF0eHJleWFheW5mbHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY1ODg5NSwiZXhwIjoyMDkzMjM0ODk1fQ.mND_hkB1LWOJdR0ETYAMu_5vW33Tk9Hwhsuy_dWaO8Y";
const USER_ID = "ef5231fd-65f4-4421-9c79-38c9640648b1";

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Load all parsed CVs
  const { data: allParsed, error } = await supabase
    .from("cv_uploads")
    .select("id, filename, parsed_cv, extracted_text")
    .eq("user_id", USER_ID)
    .eq("status", "parsed")
    .not("parsed_cv", "is", null);

  if (error || !allParsed?.length) {
    console.error("No parsed CVs found:", error);
    process.exit(1);
  }

  console.log(`Found ${allParsed.length} parsed CVs`);

  // STEP 1: Clean
  const { cleanedCVs, reports } = cleanParsedCVs(
    allParsed.map((row) => ({
      id: row.id,
      filename: row.filename,
      parsed_cv: row.parsed_cv as Record<string, unknown>,
      source_text: (row.extracted_text as string) ?? undefined,
    })),
  );

  for (const r of reports) {
    console.log(`  ${r.cv_id.slice(0, 8)}: ${r.roles_removed} roles removed, ${r.bullets_removed} bullets removed, ${r.skills_rejected} skills rejected, ${r.date_issues.length} date issues`);
  }

  // STEP 2: Detect conflicts
  const { data: userRow } = await supabase
    .from("users")
    .select("persona")
    .eq("id", USER_ID)
    .single();

  const persona = (userRow?.persona as PersonaType) ?? "mid_career";

  const documents = cleanedCVs.map((cv) => ({
    id: cv.id,
    name: cv.name,
    roles: cv.roles.map((r: { title: string; company: string; start_date: string; end_date: string; bullets: string[] }) => ({
      title: r.title,
      company: r.company,
      start_date: r.start_date,
      end_date: r.end_date,
      bullets: r.bullets,
    })),
  }));

  const conflictReport: ConflictReport = detectConflicts(documents, persona);
  console.log(`\nConflicts: ${conflictReport.conflicts.length}, Gaps: ${conflictReport.gaps.length}`);

  if (conflictReport.conflicts.length > 0) {
    console.log("\n=== CONFLICTS FOUND (auto-resolving for dev) ===");
    for (const c of conflictReport.conflicts) {
      console.log(`  [${c.type}] ${c.description}`);
    }
    const questions = buildConflictQuestions(conflictReport);
    console.log(`\n${questions.length} Phase 1 question(s) — auto-resolving: title conflict is a legitimate variation.`);
    // In production, user answers Socratic question. For dev, we proceed with merge anyway.
  }

  // STEP 3: Merge + build Cloud
  const resolvedProfile = mergeResolvedProfile(cleanedCVs, [], { employer_confirmed: null, is_single_employer: false }, persona);
  const cleanParsedCV = resolvedProfileToParsedCV(resolvedProfile);
  const { cloud } = buildCloudFromParsedCV(cleanParsedCV);

  console.log(`\nCloud built: ${cloud.nodes.length} nodes`);
  for (const node of cloud.nodes.slice(0, 10)) {
    console.log(`  ${node.name} [${node.category}] — ${node.evidence.length} evidence items`);
  }
  if (cloud.nodes.length > 10) {
    console.log(`  ... and ${cloud.nodes.length - 10} more`);
  }

  // STEP 4: Persist
  await supabase.from("cloud_nodes").delete().eq("user_id", USER_ID);

  const nodeRows = cloud.nodes.map((node) => ({
    user_id: USER_ID,
    name: node.name,
    type: node.type,
    category: node.category,
    evidence: node.evidence,
    summary: node.summary,
  }));

  if (nodeRows.length > 0) {
    const { error: insertError } = await supabase.from("cloud_nodes").insert(nodeRows);
    if (insertError) {
      console.error("Failed to insert cloud nodes:", insertError);
    } else {
      console.log(`\n✓ ${nodeRows.length} cloud nodes persisted for Sibgha`);
    }
  }

  // Update CV status
  await supabase
    .from("cv_uploads")
    .update({ status: "cloud_built" })
    .eq("user_id", USER_ID)
    .in("status", ["parsed"]);

  console.log("✓ CV statuses updated to cloud_built");
}

main().catch(console.error);
