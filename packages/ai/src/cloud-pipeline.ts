/**
 * Cloud-Based Analysis Pipeline
 *
 * The CORRECT pipeline that uses the Living Profile Cloud:
 *
 * 1. PARSE JD (AI or dev files) — Extract structured requirements
 * 2. MATCH against Cloud (code) — Evidence-based comparison
 * 3. GENERATE INSIGHTS (AI) — Advocate-framed analysis with "because" chains
 * 4. GENERATE CV (AI) — Cloud-enriched, evidence-backed tailoring
 *
 * This replaces analyzeSuitability() which bypasses the Cloud.
 */

import { parseJD } from "./analyze";
import { buildCloudFromParsedCV } from "./cloud";
import type { ProfileCloud } from "./cloud";
import { matchCloudToJD, type CloudMatchReport } from "./cloud-matcher";
import { generateInsights, type SuitabilityInsights } from "./insights";
import type { ParsedJD, ParsedCV } from "./types";

// ============================================================
// FULL CLOUD PIPELINE
// ============================================================

export interface CloudAnalysisResult {
  parsed_jd: ParsedJD;
  match_report: CloudMatchReport;
  insights: SuitabilityInsights;
}

/**
 * Analyze a JD against an existing Profile Cloud.
 * This is the primary analysis path once a user has uploaded their CV.
 */
export async function analyzeWithCloud(
  cloud: ProfileCloud,
  jdText: string
): Promise<CloudAnalysisResult> {
  // Step 1: Parse JD (AI in production, file-based in dev)
  const parsed_jd = await parseJD(jdText);

  // Step 2: Match against Cloud — always code, never AI
  const match_report = matchCloudToJD(cloud, parsed_jd);

  // Step 3: Generate insights (AI in production, placeholder in dev)
  const insights = await generateInsights(match_report, cloud, parsed_jd);

  return { parsed_jd, match_report, insights };
}

/**
 * Quick analysis — for first-time users who haven't built a Cloud yet.
 * Builds a temporary Cloud from parsed CV, then runs the full pipeline.
 */
export async function analyzeQuick(
  parsedCV: ParsedCV,
  jdText: string
): Promise<CloudAnalysisResult> {
  const cloud = buildCloudFromParsedCV(parsedCV);
  return analyzeWithCloud(cloud, jdText);
}
