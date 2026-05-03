/**
 * AutoResearch Loop Runner
 *
 * The Karpathy keep/discard loop for prompt optimization.
 * Runs nightly against the test bank, mutates prompts, scores results,
 * and keeps only improvements.
 *
 * Based on: Karpathy autoresearch, autoresearch-validation.md §1-8
 *
 * Loop flow:
 *   1. Load current prompt + results history
 *   2. Select mutation operator (round-robin, plateau-aware)
 *   3. Apply mutation via LLM
 *   4. Run mutated prompt against 10 random training pairs
 *   5. Score with gated scorecard
 *   6. Gate 1 pass + better than incumbent → KEEP
 *   7. Otherwise → DISCARD
 *   8. Log result, repeat (max 50 iterations or plateau)
 *   9. Every 10th iteration: validate against full validation set
 */

import { scoreCVGeneration, scoreJDParsing, compareScorecards } from "./scorecard";
import type { ScorecardResult, CVScorecardInput, JDScorecardInput } from "./scorecard";
import { selectMutation, buildMutationPrompt } from "./mutations";
import type { MutationRecord, MutationType } from "./mutations";

// ============================================================
// TYPES
// ============================================================

export type TargetPrompt = "cv-generation" | "jd-parser";

export interface TestPair {
  id: string;
  split: "train" | "validation" | "held_out";
  persona: string;
  /** Input: the Cloud profile / CV data */
  cloud_input: CVScorecardInput["generated"];
  /** Input: JD requirements */
  jd_requirements: string[];
  /** Input: Cloud skills */
  cloud_skills: string[];
  /** Expected: ground truth output */
  expected_output: CVScorecardInput["expected"];
  /** For JD parser pairs */
  jd_text?: string;
  jd_expected?: JDScorecardInput["expected"];
}

export interface IterationResult {
  iteration: number;
  timestamp: string;
  target_prompt: TargetPrompt;
  mutation_type: MutationType;
  mutation_description: string;
  verdict: "keep" | "discard";
  /** Scorecard from this iteration's mutated prompt */
  scorecard: ScorecardResult;
  /** Scorecard from the incumbent prompt (for comparison) */
  incumbent_scorecard: ScorecardResult;
  /** Number of training pairs evaluated */
  pairs_evaluated: number;
  /** Consecutive discards at this point */
  consecutive_discards: number;
}

export interface LoopState {
  target_prompt: TargetPrompt;
  current_prompt_version: number;
  best_prompt_version: number;
  total_iterations: number;
  total_kept: number;
  total_discarded: number;
  consecutive_discards: number;
  mutation_history: MutationRecord[];
  iteration_results: IterationResult[];
  /** Summary of last 20 results + top 5 (for context management) */
  context_summary: string;
}

export interface LoopConfig {
  max_iterations: number;        // default: 50
  training_batch_size: number;   // default: 10
  validation_interval: number;   // default: 10 (every 10th iteration)
  plateau_threshold: number;     // default: 10 (consecutive discards)
  hard_plateau_threshold: number; // default: 20 (reset to best)
  context_reset_interval: number; // default: 50
}

const DEFAULT_CONFIG: LoopConfig = {
  max_iterations: 50,
  training_batch_size: 10,
  validation_interval: 10,
  plateau_threshold: 10,
  hard_plateau_threshold: 20,
  context_reset_interval: 50,
};

// ============================================================
// LOOP RUNNER
// ============================================================

/**
 * Initialize a new loop state.
 */
export function initLoopState(target: TargetPrompt): LoopState {
  return {
    target_prompt: target,
    current_prompt_version: 0,
    best_prompt_version: 0,
    total_iterations: 0,
    total_kept: 0,
    total_discarded: 0,
    consecutive_discards: 0,
    mutation_history: [],
    iteration_results: [],
    context_summary: "",
  };
}

/**
 * Select random training pairs for a minibatch.
 */
export function selectTrainingBatch(
  pairs: TestPair[],
  batchSize: number,
): TestPair[] {
  const trainPairs = pairs.filter(p => p.split === "train");
  if (trainPairs.length <= batchSize) return trainPairs;

  // Fisher-Yates shuffle, take first batchSize
  const shuffled = [...trainPairs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, batchSize);
}

/**
 * Score a prompt variant against a set of test pairs.
 * Returns the aggregate scorecard (average across pairs).
 */
export function scorePromptVariant(
  pairs: TestPair[],
  target: TargetPrompt,
  generatedOutputs: CVScorecardInput["generated"][],
): ScorecardResult {
  if (target === "cv-generation") {
    const results = pairs.map((pair, i) =>
      scoreCVGeneration({
        generated: generatedOutputs[i],
        expected: pair.expected_output,
        jd_requirements: pair.jd_requirements,
        cloud_skills: pair.cloud_skills,
      })
    );
    return aggregateScorecards(results);
  }

  // JD parser scoring would go here
  throw new Error("JD parser scoring not yet implemented in batch mode");
}

/**
 * Aggregate multiple scorecards into one (average across pairs).
 */
function aggregateScorecards(results: ScorecardResult[]): ScorecardResult {
  if (results.length === 0) {
    throw new Error("Cannot aggregate zero scorecards");
  }

  // Gate 1: ALL pairs must pass all checks for the variant to pass
  const allGate1Pass = results.every(r => r.gate1_verdict === "pass");
  const totalPassed = results.reduce((sum, r) => sum + r.gate1_passed, 0);
  const totalChecks = results.reduce((sum, r) => sum + r.gate1_total, 0);

  // Collect all unique failure names
  const allFailures = new Set<string>();
  for (const r of results) {
    for (const f of r.gate1_failures) {
      allFailures.add(f);
    }
  }

  // BERTScore: average across pairs (if available)
  const bertScores = results
    .filter(r => r.bertscore_f1 !== null)
    .map(r => r.bertscore_f1!);
  const avgBert = bertScores.length > 0
    ? bertScores.reduce((a, b) => a + b, 0) / bertScores.length
    : null;

  // Legacy composite: average
  const avgLegacyStructural = results.reduce((s, r) => s + r.legacy_structural_avg, 0) / results.length;
  const avgLegacyComposite = results.reduce((s, r) => s + r.legacy_composite, 0) / results.length;

  // Merge all checks (flatten — for logging)
  const mergedChecks = results[0].checks.map((check, i) => ({
    name: check.name,
    passed: results.every(r => r.checks[i].passed),
    score: results.reduce((s, r) => s + r.checks[i].score, 0) / results.length,
    detail: `Avg across ${results.length} pairs`,
  }));

  return {
    checks: mergedChecks,
    gate1_verdict: allGate1Pass ? "pass" : "fail",
    gate1_passed: totalPassed,
    gate1_total: totalChecks,
    gate1_failures: [...allFailures],
    bertscore_f1: avgBert,
    bertscore_available: bertScores.length > 0,
    legacy_structural_avg: avgLegacyStructural,
    legacy_composite: avgLegacyComposite,
  };
}

/**
 * Run one iteration of the loop.
 *
 * This is the core keep/discard step. The caller is responsible for:
 *   1. Calling the LLM to generate the mutated prompt
 *   2. Running the mutated prompt against pairs to get generatedOutputs
 *   3. Passing both the incumbent and challenger outputs here
 */
export function runIteration(
  state: LoopState,
  config: LoopConfig,
  pairs: TestPair[],
  mutationType: MutationType,
  mutationDescription: string,
  incumbentOutputs: CVScorecardInput["generated"][],
  challengerOutputs: CVScorecardInput["generated"][],
): IterationResult {
  const incumbentScore = scorePromptVariant(pairs, state.target_prompt, incumbentOutputs);
  const challengerScore = scorePromptVariant(pairs, state.target_prompt, challengerOutputs);

  const winner = compareScorecards(incumbentScore, challengerScore);
  const verdict = winner === "challenger" ? "keep" : "discard";

  const result: IterationResult = {
    iteration: state.total_iterations + 1,
    timestamp: new Date().toISOString(),
    target_prompt: state.target_prompt,
    mutation_type: mutationType,
    mutation_description: mutationDescription,
    verdict,
    scorecard: challengerScore,
    incumbent_scorecard: incumbentScore,
    pairs_evaluated: pairs.length,
    consecutive_discards: verdict === "discard"
      ? state.consecutive_discards + 1
      : 0,
  };

  // Update state
  state.total_iterations++;
  state.iteration_results.push(result);
  state.mutation_history.push({
    type: mutationType,
    description: mutationDescription,
    diff_summary: verdict === "keep" ? "KEPT" : "DISCARDED",
    iteration: result.iteration,
    timestamp: result.timestamp,
  });

  if (verdict === "keep") {
    state.total_kept++;
    state.consecutive_discards = 0;
    state.current_prompt_version++;
    state.best_prompt_version = state.current_prompt_version;
  } else {
    state.total_discarded++;
    state.consecutive_discards++;
  }

  // Context management: summarize after threshold
  if (state.total_iterations % config.context_reset_interval === 0) {
    state.context_summary = buildContextSummary(state);
  }

  return result;
}

/**
 * Check if the loop should stop.
 */
export function shouldStop(state: LoopState, config: LoopConfig): { stop: boolean; reason: string } {
  if (state.total_iterations >= config.max_iterations) {
    return { stop: true, reason: `Max iterations reached (${config.max_iterations})` };
  }

  if (state.consecutive_discards >= config.hard_plateau_threshold) {
    return { stop: true, reason: `Hard plateau: ${config.hard_plateau_threshold} consecutive discards. Prompt may have reached its ceiling.` };
  }

  return { stop: false, reason: "" };
}

/**
 * Check if validation should run this iteration.
 */
export function shouldValidate(state: LoopState, config: LoopConfig): boolean {
  return state.total_iterations % config.validation_interval === 0;
}

/**
 * Build a context summary (last 20 results + top 5 best).
 * Used to manage context window when feeding history to the AI agent.
 */
function buildContextSummary(state: LoopState): string {
  const results = state.iteration_results;
  const last20 = results.slice(-20);
  const top5 = [...results]
    .filter(r => r.verdict === "keep")
    .sort((a, b) => b.scorecard.gate1_passed - a.scorecard.gate1_passed)
    .slice(0, 5);

  const lines: string[] = [
    `# AutoResearch Context Summary (Iteration ${state.total_iterations})`,
    `Total: ${state.total_iterations} iterations, ${state.total_kept} kept (${((state.total_kept / state.total_iterations) * 100).toFixed(1)}% keep rate)`,
    `Current streak: ${state.consecutive_discards} consecutive discards`,
    "",
    "## Last 20 Results:",
  ];

  for (const r of last20) {
    lines.push(`  ${r.iteration}. [${r.verdict.toUpperCase()}] ${r.mutation_type} — Gate1: ${r.scorecard.gate1_passed}/${r.scorecard.gate1_total} — ${r.mutation_description}`);
  }

  if (top5.length > 0) {
    lines.push("", "## Top 5 Best Kept Variants:");
    for (const r of top5) {
      lines.push(`  ${r.iteration}. ${r.mutation_type} — Gate1: ${r.scorecard.gate1_passed}/${r.scorecard.gate1_total} — ${r.mutation_description}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a single iteration result as a TSV line for results.tsv
 */
export function toTSVLine(result: IterationResult): string {
  return [
    result.iteration,
    result.timestamp,
    result.target_prompt,
    result.mutation_type,
    result.verdict,
    `${result.scorecard.gate1_passed}/${result.scorecard.gate1_total}`,
    result.scorecard.gate1_verdict,
    result.scorecard.bertscore_f1?.toFixed(4) ?? "N/A",
    result.scorecard.legacy_composite.toFixed(4),
    result.consecutive_discards,
    `"${result.mutation_description.replace(/"/g, '""')}"`,
    `"${result.scorecard.gate1_failures.join("; ")}"`,
  ].join("\t");
}

export const TSV_HEADER = [
  "iteration", "timestamp", "target", "mutation_type", "verdict",
  "gate1_score", "gate1_verdict", "bertscore_f1", "legacy_composite",
  "consecutive_discards", "description", "failures",
].join("\t");

export { DEFAULT_CONFIG };
