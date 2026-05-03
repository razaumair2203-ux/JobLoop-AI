/**
 * AutoResearch Loop Orchestrator
 *
 * CLI script that runs the full Karpathy keep/discard loop:
 *   1. Loads test pairs from test-bank/
 *   2. Loads the current prompt (cv-generation or jd-parser)
 *   3. For each iteration:
 *      a. Select mutation operator
 *      b. Call LLM to mutate the prompt
 *      c. Call LLM with mutated prompt against training batch
 *      d. Score with gated scorecard
 *      e. Keep or discard
 *   4. After N iterations, run ANOVA pre-test on held-out set
 *   5. Save results to results.tsv + prompt versions
 *
 * Usage:
 *   npx tsx packages/ai/src/autoresearch/run-loop.ts [--target cv-generation|jd-parser] [--iterations 20] [--pretest]
 *
 * Dev mode: uses file-based AI responses (no API calls)
 * Prod mode: calls Anthropic API via Vercel AI SDK
 */

import * as fs from "fs";
import * as path from "path";
import {
  initLoopState,
  selectTrainingBatch,
  runIteration,
  shouldStop,
  shouldValidate,
  toTSVLine,
  TSV_HEADER,
  DEFAULT_CONFIG,
} from "./loop-runner";
import type { TestPair, LoopConfig, TargetPrompt } from "./loop-runner";
import { selectMutation, buildMutationPrompt } from "./mutations";
import { scoreCVGeneration } from "./scorecard";
import type { CVScorecardInput } from "./scorecard";
import { analyzePretestResults } from "./anova-pretest";
import { runSafeguardChecks } from "./safeguards";

// ============================================================
// CONFIG
// ============================================================

const TEST_BANK_DIR = path.join(__dirname, "test-bank");
const PROMPTS_DIR = path.join(__dirname, "..", "prompts");
const RESULTS_DIR = path.join(__dirname, "results");
const PROMPT_VERSIONS_DIR = path.join(RESULTS_DIR, "prompt-versions");

// ============================================================
// TEST PAIR LOADING
// ============================================================

interface RawTestPair {
  id: string;
  split: "train" | "validation" | "held_out";
  persona: string;
  jd: {
    title: string;
    company: string;
    location: string;
    experience_years: number;
    requirements: Array<{ text: string; type: string }>;
    responsibilities: string[];
  };
  expected_output: {
    summary: string;
    experience: Array<{
      company: string;
      title: string;
      start_date: string;
      end_date: string;
      bullets: string[];
    }>;
    skills: Record<string, string[]>;
    certifications: string[];
    education?: string[];
  };
  jd_requirements: string[];
  cloud_skills: string[];
}

function loadTestPairs(): TestPair[] {
  const files = fs.readdirSync(TEST_BANK_DIR).filter(f => f.startsWith("pair-") && f.endsWith(".json"));
  const pairs: TestPair[] = [];

  for (const file of files) {
    const raw: RawTestPair = JSON.parse(fs.readFileSync(path.join(TEST_BANK_DIR, file), "utf-8"));
    pairs.push({
      id: raw.id,
      split: raw.split,
      persona: raw.persona,
      cloud_input: raw.expected_output, // The "ideal" output is also the input shape for scoring
      jd_requirements: raw.jd_requirements,
      cloud_skills: raw.cloud_skills,
      expected_output: raw.expected_output,
    });
  }

  console.log(`Loaded ${pairs.length} test pairs (${files.join(", ")})`);
  return pairs;
}

// ============================================================
// PROMPT LOADING / SAVING
// ============================================================

function loadCurrentPrompt(target: TargetPrompt): string {
  const filename = target === "cv-generation" ? "cv-generation.ts" : "jd-parser.ts";
  const filepath = path.join(PROMPTS_DIR, filename);
  const content = fs.readFileSync(filepath, "utf-8");

  // Extract the system prompt string from the TypeScript file
  const match = content.match(/`([\s\S]*?)`/);
  if (!match) throw new Error(`Could not extract prompt from ${filepath}`);
  return match[1];
}

function savePromptVersion(target: TargetPrompt, version: number, prompt: string): void {
  fs.mkdirSync(PROMPT_VERSIONS_DIR, { recursive: true });
  const filename = `${target}-v${version.toString().padStart(3, "0")}.txt`;
  fs.writeFileSync(path.join(PROMPT_VERSIONS_DIR, filename), prompt);
}

// ============================================================
// LLM INTERFACE (dev mode = mock, prod mode = Anthropic API)
// ============================================================

interface LLMResponse {
  text: string;
  usage: { input_tokens: number; output_tokens: number };
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
  // Check for ANTHROPIC_API_KEY — if absent, use dev mode
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log("  [DEV MODE] No ANTHROPIC_API_KEY — using mock LLM response");
    return mockLLMResponse(systemPrompt, userPrompt);
  }

  // Production: use Anthropic API directly
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter(c => c.type === "text")
    .map(c => (c as { type: "text"; text: string }).text)
    .join("");

  return {
    text,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

function mockLLMResponse(_system: string, userPrompt: string): LLMResponse {
  // In dev mode, return the prompt slightly modified (simulates mutation)
  if (userPrompt.includes("Mutation Task")) {
    // Extract the current prompt and make a trivial change
    const promptMatch = userPrompt.match(/```\n([\s\S]*?)\n```/);
    const currentPrompt = promptMatch ? promptMatch[1] : "";
    return {
      text: currentPrompt + "\n\n<!-- AutoResearch mutation applied (dev mode) -->",
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }

  // For CV generation, return a mock CV
  return {
    text: JSON.stringify({
      summary: "Mock CV summary for dev mode testing",
      experience: [],
      skills: {},
      certifications: [],
    }),
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

// ============================================================
// CV GENERATION VIA PROMPT
// ============================================================

async function generateCV(
  prompt: string,
  pair: TestPair,
): Promise<CVScorecardInput["generated"]> {
  const userPrompt = `## Cloud Profile Skills
${pair.cloud_skills.join(", ")}

## JD Requirements
${pair.jd_requirements.join("\n")}

## Expected Output Shape
Generate a tailored CV as JSON with: summary, experience (array of {company, title, start_date, end_date, bullets}), skills (categorized), certifications.

Return ONLY valid JSON.`;

  const response = await callLLM(prompt, userPrompt);

  try {
    const parsed = JSON.parse(response.text);
    return {
      summary: parsed.summary || "",
      experience: parsed.experience || [],
      skills: parsed.skills || {},
      certifications: parsed.certifications || [],
    };
  } catch {
    // If LLM response isn't valid JSON, return empty (will fail scorecard — correct behavior)
    console.log("  [WARN] LLM returned invalid JSON — scorecard will fail this variant");
    return { summary: "", experience: [], skills: {}, certifications: [] };
  }
}

// ============================================================
// MAIN LOOP
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const target: TargetPrompt = args.includes("--target")
    ? (args[args.indexOf("--target") + 1] as TargetPrompt)
    : "cv-generation";
  const maxIterations = args.includes("--iterations")
    ? parseInt(args[args.indexOf("--iterations") + 1])
    : 20;
  const runPretest = args.includes("--pretest");

  console.log(`\n=== AutoResearch Loop ===`);
  console.log(`Target: ${target}`);
  console.log(`Max iterations: ${maxIterations}`);
  console.log(`Pretest mode: ${runPretest}`);
  console.log();

  // Setup
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const pairs = loadTestPairs();
  const trainPairs = pairs.filter(p => p.split === "train");
  const valPairs = pairs.filter(p => p.split === "validation");
  const heldOutPairs = pairs.filter(p => p.split === "held_out");

  console.log(`Train: ${trainPairs.length}, Validation: ${valPairs.length}, Held-out: ${heldOutPairs.length}`);

  if (trainPairs.length === 0) {
    console.error("ERROR: No training pairs found. Add pairs with split='train' to test-bank/");
    process.exit(1);
  }

  // Load prompt
  let currentPrompt = loadCurrentPrompt(target);
  savePromptVersion(target, 0, currentPrompt);
  console.log(`Loaded ${target} prompt (${currentPrompt.length} chars)`);

  // Init state
  const config: LoopConfig = { ...DEFAULT_CONFIG, max_iterations: maxIterations };
  const state = initLoopState(target);

  // TSV log
  const tsvPath = path.join(RESULTS_DIR, `${target}-results.tsv`);
  fs.writeFileSync(tsvPath, TSV_HEADER + "\n");

  // Generate incumbent baseline
  console.log("\nGenerating incumbent baseline...");
  const baselineBatch = selectTrainingBatch(pairs, config.training_batch_size);
  const incumbentOutputs: CVScorecardInput["generated"][] = [];
  for (const pair of baselineBatch) {
    const output = await generateCV(currentPrompt, pair);
    incumbentOutputs.push(output);
  }

  // Score baseline
  const baselineScores = baselineBatch.map((pair, i) =>
    scoreCVGeneration({
      generated: incumbentOutputs[i],
      expected: pair.expected_output,
      jd_requirements: pair.jd_requirements,
      cloud_skills: pair.cloud_skills,
    })
  );
  const baselinePassRate = baselineScores.filter(s => s.gate1_verdict === "pass").length / baselineScores.length;
  console.log(`Baseline pass rate: ${(baselinePassRate * 100).toFixed(1)}% (${baselineScores.filter(s => s.gate1_verdict === "pass").length}/${baselineScores.length})`);
  console.log();

  // Main loop
  console.log("Starting optimization loop...\n");

  for (let i = 0; i < maxIterations; i++) {
    const stopCheck = shouldStop(state, config);
    if (stopCheck.stop) {
      console.log(`\nStopping: ${stopCheck.reason}`);
      break;
    }

    // 1. Select mutation
    const mutation = selectMutation(state.mutation_history, state.consecutive_discards);
    console.log(`[${i + 1}/${maxIterations}] ${mutation.type}...`);

    // 2. Build mutation prompt + get failures for context
    const recentFailures = state.iteration_results
      .slice(-5)
      .filter(r => r.verdict === "discard")
      .flatMap(r => r.scorecard.gate1_failures);

    const mutationPrompt = buildMutationPrompt(
      mutation,
      currentPrompt,
      [...new Set(recentFailures)],
      state.total_iterations + 1,
    );

    // 3. Call LLM to mutate
    const mutationResponse = await callLLM(
      "You are a prompt engineer optimizing prompts for CV generation quality. Apply the requested mutation precisely.",
      mutationPrompt,
    );
    const mutatedPrompt = mutationResponse.text;

    // 4. Generate CVs with mutated prompt
    const batch = selectTrainingBatch(pairs, config.training_batch_size);
    const challengerOutputs: CVScorecardInput["generated"][] = [];
    for (const pair of batch) {
      const output = await generateCV(mutatedPrompt, pair);
      challengerOutputs.push(output);
    }

    // 5. Also run incumbent on same batch (fair comparison)
    const incumbentBatchOutputs: CVScorecardInput["generated"][] = [];
    for (const pair of batch) {
      const output = await generateCV(currentPrompt, pair);
      incumbentBatchOutputs.push(output);
    }

    // 6. Score and compare
    const result = runIteration(
      state,
      config,
      batch,
      mutation.type,
      `${mutation.type}: ${mutationResponse.text.slice(0, 100)}...`,
      incumbentBatchOutputs,
      challengerOutputs,
    );

    // 7. Log
    fs.appendFileSync(tsvPath, toTSVLine(result) + "\n");

    if (result.verdict === "keep") {
      currentPrompt = mutatedPrompt;
      savePromptVersion(target, state.current_prompt_version, currentPrompt);
      console.log(`  -> KEPT (v${state.current_prompt_version}) | Gate1: ${result.scorecard.gate1_passed}/${result.scorecard.gate1_total}`);
    } else {
      console.log(`  -> DISCARD (streak: ${state.consecutive_discards}) | Gate1: ${result.scorecard.gate1_passed}/${result.scorecard.gate1_total} | Failures: ${result.scorecard.gate1_failures.join(", ")}`);
    }

    // 8. Validation check
    if (shouldValidate(state, config) && valPairs.length > 0) {
      console.log(`\n  [VALIDATION] Running on ${valPairs.length} validation pairs...`);
      const valOutputs: CVScorecardInput["generated"][] = [];
      for (const pair of valPairs) {
        const output = await generateCV(currentPrompt, pair);
        valOutputs.push(output);
      }
      const valScores = valPairs.map((pair, idx) =>
        scoreCVGeneration({
          generated: valOutputs[idx],
          expected: pair.expected_output,
          jd_requirements: pair.jd_requirements,
          cloud_skills: pair.cloud_skills,
        })
      );
      const valPassRate = valScores.filter(s => s.gate1_verdict === "pass").length / valScores.length;
      console.log(`  Validation pass rate: ${(valPassRate * 100).toFixed(1)}%\n`);
    }
  }

  // Summary
  console.log("\n=== Loop Complete ===");
  console.log(`Iterations: ${state.total_iterations}`);
  console.log(`Kept: ${state.total_kept} (${((state.total_kept / Math.max(1, state.total_iterations)) * 100).toFixed(1)}%)`);
  console.log(`Discarded: ${state.total_discarded}`);
  console.log(`Final prompt version: v${state.current_prompt_version}`);
  console.log(`Results: ${tsvPath}`);

  // ANOVA pre-test
  if (runPretest && heldOutPairs.length > 0) {
    console.log(`\n=== ANOVA Pre-Test (${heldOutPairs.length} held-out pairs) ===`);

    // Score original prompt on held-out
    const originalPrompt = loadCurrentPrompt(target);
    const origScores: number[] = [];
    const optScores: number[] = [];

    for (const pair of heldOutPairs) {
      const origOutput = await generateCV(originalPrompt, pair);
      const optOutput = await generateCV(currentPrompt, pair);

      const origScore = scoreCVGeneration({
        generated: origOutput,
        expected: pair.expected_output,
        jd_requirements: pair.jd_requirements,
        cloud_skills: pair.cloud_skills,
      });
      const optScore = scoreCVGeneration({
        generated: optOutput,
        expected: pair.expected_output,
        jd_requirements: pair.jd_requirements,
        cloud_skills: pair.cloud_skills,
      });

      origScores.push(origScore.legacy_structural_avg);
      optScores.push(optScore.legacy_structural_avg);
    }

    const pretestResult = analyzePretestResults(
      origScores,
      optScores,
      state.total_iterations,
      state.total_kept,
    );

    console.log(pretestResult.summary);
    console.log(`Recommendation: ${pretestResult.recommendation.toUpperCase()}`);

    // Save pretest results
    const pretestPath = path.join(RESULTS_DIR, `${target}-pretest.json`);
    fs.writeFileSync(pretestPath, JSON.stringify(pretestResult, null, 2));
    console.log(`Pretest results: ${pretestPath}`);
  }

  // Safeguard checks (run after loop, before any deployment decision)
  const originalPrompt = loadCurrentPrompt(target);
  console.log("\n=== Safeguard Checks ===");

  // Score original on training pairs for regression + overfitting checks
  let optTrainPassRate = 0;
  let origHeldoutPassRate = 0;
  let optHeldoutPassRate = 0;
  let heldoutSuccesses = 0;
  let anovaSignificant = false;

  // Quick train pass rate for current prompt
  const trainScores = baselineBatch.map((pair, i) =>
    scoreCVGeneration({
      generated: incumbentOutputs[i],
      expected: pair.expected_output,
      jd_requirements: pair.jd_requirements,
      cloud_skills: pair.cloud_skills,
    })
  );
  optTrainPassRate = trainScores.filter(s => s.gate1_verdict === "pass").length / trainScores.length;

  // Held-out scoring for regression + overfitting
  if (heldOutPairs.length > 0) {
    let origPasses = 0, optPasses = 0;
    for (const pair of heldOutPairs) {
      const origOutput = await generateCV(originalPrompt, pair);
      const optOutput = await generateCV(currentPrompt, pair);
      const origScore = scoreCVGeneration({
        generated: origOutput, expected: pair.expected_output,
        jd_requirements: pair.jd_requirements, cloud_skills: pair.cloud_skills,
      });
      const optScore = scoreCVGeneration({
        generated: optOutput, expected: pair.expected_output,
        jd_requirements: pair.jd_requirements, cloud_skills: pair.cloud_skills,
      });
      if (origScore.gate1_verdict === "pass") origPasses++;
      if (optScore.gate1_verdict === "pass") optPasses++;
    }
    origHeldoutPassRate = origPasses / heldOutPairs.length;
    optHeldoutPassRate = optPasses / heldOutPairs.length;
    heldoutSuccesses = optPasses;
    anovaSignificant = optHeldoutPassRate > origHeldoutPassRate; // Simplified; full ANOVA in pretest mode
  }

  const safeguardReport = runSafeguardChecks({
    originalPrompt,
    currentPrompt,
    originalPassRate: origHeldoutPassRate,
    optimizedPassRate: optHeldoutPassRate,
    trainPassRate: optTrainPassRate,
    heldoutPassRate: optHeldoutPassRate,
    anovaSignificant,
    keepRate: state.total_kept / Math.max(1, state.total_iterations),
    iterationsRun: state.total_iterations,
    heldoutLastRotated: new Date().toISOString().split("T")[0], // First run = today
    heldoutSuccesses,
    heldoutTotal: heldOutPairs.length,
  });

  console.log(safeguardReport.summary);

  // Save safeguard report
  const safeguardPath = path.join(RESULTS_DIR, `${target}-safeguards.json`);
  fs.writeFileSync(safeguardPath, JSON.stringify(safeguardReport, null, 2));
  console.log(`\nSafeguard report: ${safeguardPath}`);

  // Save final state
  const statePath = path.join(RESULTS_DIR, `${target}-state.json`);
  fs.writeFileSync(statePath, JSON.stringify({
    ...state,
    iteration_results: state.iteration_results.slice(-20),
  }, null, 2));
  console.log(`State: ${statePath}`);
}

main().catch(err => {
  console.error("AutoResearch loop failed:", err);
  process.exit(1);
});
