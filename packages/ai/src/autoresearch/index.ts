export {
  scoreCVGeneration,
  scoreJDParsing,
  compareScorecards,
} from "./scorecard";
export type {
  CheckResult,
  ScorecardResult,
  GateVerdict,
  CVScorecardInput,
  JDScorecardInput,
} from "./scorecard";

export {
  selectMutation,
  buildMutationPrompt,
  getMutationStats,
  MUTATION_DIRECTIVES,
} from "./mutations";
export type {
  MutationType,
  MutationRecord,
  MutationInstruction,
} from "./mutations";

export {
  initLoopState,
  selectTrainingBatch,
  scorePromptVariant,
  runIteration,
  shouldStop,
  shouldValidate,
  toTSVLine,
  TSV_HEADER,
  DEFAULT_CONFIG,
} from "./loop-runner";
export type {
  TargetPrompt,
  TestPair,
  IterationResult,
  LoopState,
  LoopConfig,
} from "./loop-runner";

export {
  oneWayANOVA,
  analyzePretestResults,
} from "./anova-pretest";
export type {
  PretestResult,
} from "./anova-pretest";

export {
  checkDrift,
  checkRegression,
  checkDeploymentReadiness,
  checkHeldOutStaleness,
  checkOverfitting,
  bayesianCredibleInterval,
  runSafeguardChecks,
  promptSimilarity,
} from "./safeguards";
export type {
  DriftCheckResult,
  RegressionTestResult,
  DeploymentReadiness,
  HeldOutStaleness,
  OverfitCheckResult,
  BayesianCI,
  SafeguardReport,
} from "./safeguards";
