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
 * Model selection is driven by Cloud maturity (the master signal):
 *   - Thin Cloud → quality tier for everything (can't afford mistakes)
 *   - Rich Cloud → fast tier (known territory, save cost)
 *   - User escalation → quality tier regardless
 *
 * This replaces analyzeSuitability() which bypasses the Cloud.
 */

import { parseJD, classifyJDComplexity } from "./analyze";
import { buildCloudFromParsedCV } from "./cloud";
import type { ProfileCloud } from "./cloud";
import { matchCloudToJD, type CloudMatchReport } from "./cloud-matcher";
import { generateInsights, type SuitabilityInsights } from "./insights";
import { computeCloudMaturity, selectModel } from "./cloud-maturity";
import type { ParsedJD, ParsedCV } from "./types";

// ============================================================
// FULL CLOUD PIPELINE
// ============================================================

export interface CloudAnalysisResult {
  parsed_jd: ParsedJD;
  match_report: CloudMatchReport;
  insights: SuitabilityInsights;
}

export interface AnalysisOptions {
  /** Explicit model tier override — if omitted, derived from Cloud maturity + JD complexity */
  modelTier?: "fast" | "quality";
  /** User explicitly requested better quality (re-generation, dissatisfaction) */
  userEscalation?: boolean;
  /** Domain context hint (extracted from JD or user profile) */
  domain?: string | null;
}

/**
 * Analyze a JD against an existing Profile Cloud.
 * This is the primary analysis path once a user has uploaded their CV.
 *
 * Model selection: Cloud maturity × JD complexity → fast tier or quality tier.
 */
export async function analyzeWithCloud(
  cloud: ProfileCloud,
  jdText: string,
  options?: AnalysisOptions
): Promise<CloudAnalysisResult> {
  // Compute the master signal
  const maturity = computeCloudMaturity(cloud);
  const jdComplexity = classifyJDComplexity(jdText);

  // Select model: maturity + JD complexity + user escalation
  const modelTier = options?.modelTier ?? selectModel(maturity, "jd_parse", {
    domain: options?.domain,
    taskComplexity: jdComplexity === "complex" ? "complex" : "simple",
    userEscalation: options?.userEscalation,
  });

  // Step 1: Parse JD
  const parsed_jd = await parseJD(jdText, modelTier);

  // Step 2: Match against Cloud — always code, never AI
  const match_report = matchCloudToJD(cloud, parsed_jd);

  // Step 3: Generate insights — use maturity-driven model for insights too
  const insightsTier = options?.modelTier ?? selectModel(maturity, "insights", {
    domain: options?.domain,
    taskComplexity: jdComplexity === "complex" ? "complex" : "simple",
    userEscalation: options?.userEscalation,
  });
  const insights = await generateInsights(match_report, cloud, parsed_jd, insightsTier);

  return { parsed_jd, match_report, insights };
}

/**
 * Quick analysis — for first-time users who haven't built a Cloud yet.
 * Builds a temporary Cloud from parsed CV, then runs the full pipeline.
 * Cloud will be "thin" → quality tier used automatically.
 */
export async function analyzeQuick(
  parsedCV: ParsedCV,
  jdText: string
): Promise<CloudAnalysisResult> {
  const { cloud } = buildCloudFromParsedCV(parsedCV);
  return analyzeWithCloud(cloud, jdText);
}
