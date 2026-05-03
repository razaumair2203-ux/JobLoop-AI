// Cloud — the core data model
export { buildCloudFromParsedCV, findNode, getValidatedSkills, getWeakClaims, getRepeatedSkills } from "./cloud";
export type { ProfileCloud, CloudNode, Evidence, EvidenceSummary, Achievement, CareerTrajectory } from "./cloud";
export type { RoleEvidence, ImpactEvidence, CertificationEvidence, AwardEvidence, ProjectEvidence, SocraticEvidence } from "./cloud";

// Socratic questioning
export { generateInitialQuestions, generateJDQuestions, processAnswer } from "./socratic";
export type { SocraticQuestion, SocraticAnswer } from "./socratic";

// Cloud matcher (JD vs Cloud evidence)
export { matchCloudToJD } from "./cloud-matcher";
export type { CloudMatchReport, CloudRequirementMatch, CloudTechMatch, MatchVerdict } from "./cloud-matcher";

// Cloud pipeline (the correct full pipeline)
export { analyzeWithCloud, analyzeQuick } from "./cloud-pipeline";
export type { CloudAnalysisResult } from "./cloud-pipeline";

// Flat matcher (legacy — works without cloud, from parsed CV)
export { matchCVToJD } from "./matcher";
export type { MatchReport, RequirementMatch, TechMatch, ExperienceComparison, DomainOverlap, PositionAssessment, MatchStatus } from "./matcher";

// Parsers (AI extraction)
export { parseJD, parseCV } from "./analyze";

// Suitability Insights (transparent reasoning, not scores)
export { generateInsights } from "./insights";
export type { SuitabilityInsights, Insight, InsightType } from "./insights";

// Full pipeline (legacy — bypasses Cloud, kept for backwards compat)
export { analyzeSuitability } from "./analyze";
export type { FullAnalysisResult, NarratedAdvice } from "./analyze";

// CV Generation
export { generateTailoredCV, generateCloudTailoredCV } from "./generate-cv";
export type { GeneratedCV } from "./generate-cv";

// Cover Letter Generation
export { generateCoverLetter } from "./generate-cover-letter";
export type { GeneratedCoverLetter, CoverLetterParagraph } from "./generate-cover-letter";

// Skill matching
export { skillsMatch, normalizeSkillName, findBestSkillMatch } from "./skill-matching";

// Utilities
export { safeParseJSON, generateId } from "./utils";

// Types (parsed data structures)
export type { ParsedJD, ParsedCV } from "./types";

// Provider (dev mode vs API mode)
export { setProvider, getProviderMode, saveDevParsedJD, saveDevParsedCV } from "./provider";
export type { ProviderMode } from "./provider";

// LinkedIn import
export { parseLinkedInExport, isLinkedInExport, parseCSV, LinkedInParseError } from "./linkedin-parser";
export type { LinkedInCSVFiles, LinkedInProfile, LinkedInParseResult } from "./linkedin-parser";
export { MAX_UNCOMPRESSED_SIZE, MAX_CSV_SIZE, RELEVANT_FILES } from "./linkedin-parser";

// Multi-document conflict detection
export { detectConflicts } from "./conflict-detector";
export type { ParsedRole, RoleConflict, TimelineGap, EmployerGroup, ConflictReport } from "./conflict-detector";
export { companiesMatch, titlesOverlap, parseRoleDate, monthsBetween } from "./conflict-detector";

// Certificate PDF extraction
export { extractCertificate, extractCertificates, isCertificatePDF } from "./certificate-extractor";
export type { ExtractedCertificate } from "./certificate-extractor";

// Gap-filling questions (for roles with missing descriptions)
export { generateGapFillingQuestions, analyzeDescriptionGaps } from "./gap-filling";
export type { GapFillingQuestion, GapFillingContext } from "./gap-filling";

// AutoResearch loop
export {
  scoreCVGeneration, scoreJDParsing, compareScorecards,
  selectMutation, buildMutationPrompt, getMutationStats,
  initLoopState, selectTrainingBatch, runIteration, shouldStop, shouldValidate,
  toTSVLine, TSV_HEADER, DEFAULT_CONFIG,
  oneWayANOVA, analyzePretestResults,
} from "./autoresearch";
export type {
  CheckResult, ScorecardResult, GateVerdict, CVScorecardInput, JDScorecardInput,
  MutationType, MutationRecord, MutationInstruction,
  TargetPrompt, TestPair, IterationResult, LoopState, LoopConfig,
  PretestResult,
} from "./autoresearch";

// Config
export { MODELS } from "./client";
