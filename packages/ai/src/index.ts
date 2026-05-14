// Cloud — the core data model
export { buildCloudFromParsedCV, findNode, computeSummary, getValidatedSkills, getWeakClaims, getRepeatedSkills, reconstructTrajectory } from "./cloud";
export type { ProfileCloud, CloudNode, Evidence, EvidenceSummary, Achievement, CareerTrajectory, VocabularyUpgrade, SkillClassificationReport } from "./cloud";
export type { RoleEvidence, ImpactEvidence, CertificationEvidence, AwardEvidence, ProjectEvidence, SocraticEvidence } from "./cloud";

// Socratic questioning
export { generateInitialQuestions, generateJDQuestions, processAnswer, detectContradictions } from "./socratic";
export type { SocraticQuestion, SocraticAnswer, ContradictionResult } from "./socratic";

// Cloud matcher (JD vs Cloud evidence)
export { matchCloudToJD } from "./cloud-matcher";
export type { CloudMatchReport, CloudRequirementMatch, CloudTechMatch, MatchVerdict, EligibilityGate, EligibilityCheck, EligibilityStatus } from "./cloud-matcher";

// Cloud pipeline (the correct full pipeline)
export { analyzeWithCloud, analyzeQuick } from "./cloud-pipeline";
export type { CloudAnalysisResult, AnalysisOptions } from "./cloud-pipeline";

// Flat matcher REMOVED (May 6, 2026) — use matchCloudToJD from cloud-matcher.ts

// Parsers (AI extraction)
export { parseJD, parseCV, classifyJDComplexity } from "./analyze";

// Dev-mode parser REMOVED (May 6, 2026) — use three-tier dev mode (fixtures/CLI/error)

// Suitability Insights (transparent reasoning, not scores)
export { generateInsights } from "./insights";
export type { SuitabilityInsights, Insight, InsightType } from "./insights";

// Legacy analyzeSuitability REMOVED (May 6, 2026) — use analyzeWithCloud from cloud-pipeline.ts

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
  scoreCVGeneration, scoreJDParsing, compareScorecards, parsedJDToScorecardInput, cvContentToScorecardInput,
  selectMutation, buildMutationPrompt, getMutationStats,
  initLoopState, selectTrainingBatch, selectWeightedTrainingBatch, runIteration, shouldStop, shouldValidate,
  toTSVLine, TSV_HEADER, DEFAULT_CONFIG,
  oneWayANOVA, analyzePretestResults,
  computeFeedbackWeights, selectWeightedBatch,
} from "./autoresearch";
export type {
  CheckResult, ScorecardResult, GateVerdict, CVScorecardInput, JDScorecardInput, CircularityRisk,
  MutationType, MutationRecord, MutationInstruction,
  TargetPrompt, TestPair, IterationResult, LoopState, LoopConfig,
  PretestResult,
  FeedbackRecord, PairWeight, FeedbackWeights,
} from "./autoresearch";

// Skill Taxonomy & Classification
export { classifySkill, classifyCloud, inferDepthLevel, detectGaps, normalizeDomain, normalizeCategory, normalizeTaxonomy, getTaxonomyGaps, clearTaxonomyGaps, APPROVED_DOMAINS } from "./taxonomy";
export type {
  DepthLevel, DepthAssessment, ClassifiedSkill, ClassifiedCloud, ClassifiedRole,
  TaxonomyDomain, TaxonomyCategory, SkillGap, TaxonomyGapEntry,
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

// Text Normalizer — pre-LLM extraction cleanup
export { normalizeExtractedText, assessExtractionQuality } from "./text-normalizer";
export type { NormalizedText, ExtractionQuality } from "./text-normalizer";

// Text Pre-Processor — multi-column layout fix (runs after normalizer, before LLM)
export { preprocessExtractedText } from "./text-preprocessor";
export type { PreprocessResult } from "./text-preprocessor";

// PDF Extractor — position-aware multi-column extraction
export { extractPDFText } from "./pdf-extractor";
export type { PDFExtractionResult } from "./pdf-extractor";

// CV Cleaner — pre-Cloud data quality
export { cleanTitle, filterGarbageBullets, validateDates, verifyAgainstSourceText, verifySkills, extractContactDetails, buildConflictQuestions, cleanParsedCVs } from "./cv-cleaner";
export type { DateValidationIssue, SourceVerificationResult, CleaningReport, Phase1Question, ExtractedContact } from "./cv-cleaner";

// Schema Validation — runtime Zod validation for LLM output
export { ParsedCVOutputSchema, validateParsedCVOutput, repairLLMOutput } from "./schema-validator";
export type { ValidatedParsedCVOutput, ValidationResult } from "./schema-validator";

// Pipeline Errors — typed error categories
export {
  PipelineError, ExtractionError, ExtractionQualityError, SchemaValidationError,
  ModelTimeoutError, ModelRateLimitError, TaxonomyGapError, EmptyCVError,
  UnsupportedFileError, GenerationSafetyError, NoProviderError,
} from "./errors";

// Config
export { MODELS } from "./client";

// Country/Profession Licensing Lookup — structured, zero hallucination
export { lookupLicensingRequirement } from "./licensing-lookup";
export type { LicensingRequirement, LicensingLookupResult } from "./licensing-lookup";
