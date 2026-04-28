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

// Skill matching
export { skillsMatch, normalizeSkillName, findBestSkillMatch } from "./skill-matching";

// Utilities
export { safeParseJSON, generateId } from "./utils";

// Types (parsed data structures)
export type { ParsedJD, ParsedCV } from "./types";

// Provider (dev mode vs API mode)
export { setProvider, getProviderMode, saveDevParsedJD, saveDevParsedCV } from "./provider";
export type { ProviderMode } from "./provider";

// Config
export { MODELS } from "./client";
