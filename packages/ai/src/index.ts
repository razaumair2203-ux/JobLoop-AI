// Cloud — the core data model
export { buildCloudFromParsedCV, findNode, computeSummary, getValidatedSkills, getWeakClaims, getRepeatedSkills, reconstructTrajectory } from "./cloud";
export type { ProfileCloud, CloudNode, Evidence, EvidenceSummary, Achievement, CareerTrajectory } from "./cloud";
export type { RoleEvidence, ImpactEvidence, CertificationEvidence, AwardEvidence, ProjectEvidence, SocraticEvidence } from "./cloud";

// Socratic questioning
export { generateInitialQuestions, generateJDQuestions, processAnswer, detectContradictions } from "./socratic";
export type { SocraticQuestion, SocraticAnswer, ContradictionResult } from "./socratic";

// Cloud matcher (JD vs Cloud evidence)
export { matchCloudToJD } from "./cloud-matcher";
export type { CloudMatchReport, CloudRequirementMatch, CloudTechMatch, MatchVerdict } from "./cloud-matcher";

// Cloud pipeline (the correct full pipeline)
export { analyzeWithCloud, analyzeQuick } from "./cloud-pipeline";
export type { CloudAnalysisResult, AnalysisOptions } from "./cloud-pipeline";

// Flat matcher (legacy — works without cloud, from parsed CV)
export { matchCVToJD } from "./matcher";
export type { MatchReport, RequirementMatch, TechMatch, ExperienceComparison, DomainOverlap, PositionAssessment, MatchStatus } from "./matcher";

// Parsers (AI extraction)
export { parseJD, parseCV, classifyJDComplexity } from "./analyze";

// Dev-mode parser (regex fallback when no API key)
export { parseCVLocal } from "./dev-parser";

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
export type { ParsedRole, RoleConflict, TimelineGap, EmployerGroup, ConflictReport, PersonaType } from "./conflict-detector";
export { companiesMatch, titlesOverlap, parseRoleDate, monthsBetween } from "./conflict-detector";

// Socratic answer parsing (Phase 1)
export { parseAnswer, detectComplexitySignals, selectModelTier, saveAnswerParseResponse } from "./answer-parser";
export type { AnswerParseResult, ParsedRoleFromAnswer, ModelTier } from "./answer-parser";

// Resolution merger (parsed CVs + answers → resolved profile)
export { mergeResolvedProfile, resolvedProfileToParsedCV } from "./resolution-merger";
export type { ResolvedProfile, ResolvedRole, ResolvedEducation, InputCV, InputRole, DirectAnswers } from "./resolution-merger";

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
  initLoopState, selectTrainingBatch, selectWeightedTrainingBatch, runIteration, shouldStop, shouldValidate,
  toTSVLine, TSV_HEADER, DEFAULT_CONFIG,
  oneWayANOVA, analyzePretestResults,
  computeFeedbackWeights, selectWeightedBatch,
} from "./autoresearch";
export type {
  CheckResult, ScorecardResult, GateVerdict, CVScorecardInput, JDScorecardInput,
  MutationType, MutationRecord, MutationInstruction,
  TargetPrompt, TestPair, IterationResult, LoopState, LoopConfig,
  PretestResult,
  FeedbackRecord, PairWeight, FeedbackWeights,
} from "./autoresearch";

// Skill Taxonomy & Classification
export { classifySkill, classifyCloud, inferDepthLevel, detectGaps } from "./taxonomy";
export type {
  DepthLevel, DepthAssessment, ClassifiedSkill, ClassifiedCloud, ClassifiedRole,
  TaxonomyDomain, TaxonomyCategory, SkillGap,
} from "./taxonomy";

// Cloud Maturity — the master signal for model selection
export { computeCloudMaturity, getMaturityForDomain, selectModel, interpretFeedback, checkJDSimilarity } from "./cloud-maturity";
export type {
  CloudMaturity, DomainMaturity, MaturityLevel,
  TaskType, TaskComplexity,
  FeedbackSignal, UserFeedback,
  JDSimilarityResult,
} from "./cloud-maturity";

// Natural Language Feedback Classification
export { classifyFeedback, toUserFeedback } from "./feedback-classifier";
export type { FeedbackIntent, ClassifiedFeedback } from "./feedback-classifier";

// CV Cleaner — pre-Cloud data quality
export { cleanTitle, filterGarbageBullets, validateDates, verifyAgainstSourceText, verifySkills, extractContactDetails, buildConflictQuestions, cleanParsedCVs } from "./cv-cleaner";
export type { DateValidationIssue, SourceVerificationResult, CleaningReport, Phase1Question, ExtractedContact } from "./cv-cleaner";

// Config
export { MODELS } from "./client";
