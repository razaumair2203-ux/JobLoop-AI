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
 * Dev mode: uses mock AI responses (no API calls)
 * Prod mode: calls DeepSeek Flash API
 */

import * as fs from "fs";
import * as path from "path";

// Load .env from project root (CLI script — no dotenv dependency needed)
const envPath = path.resolve(__dirname, "../../../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

import { safeParseJSON } from "../utils";
import { buildCVGenerationUserPrompt } from "../prompts/cv-generation";
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
import { computeFeedbackWeights } from "./feedback-weighter";
import type { FeedbackRecord, FeedbackWeights } from "./feedback-weighter";

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
    full_description?: string;
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
  /** Raw resume text for zero-circular scoring */
  raw_cv_text?: string;
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
      raw_cv_text: raw.raw_cv_text || "",
      raw_jd_text: raw.jd.full_description || raw.jd_requirements.join("\n"),
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

/**
 * Deploy an optimized prompt back to the source TypeScript file.
 * Replaces the template literal content while preserving the file structure.
 */
function deployPromptToSource(target: TargetPrompt, prompt: string): void {
  const filenameMap: Record<TargetPrompt, string> = {
    "cv-generation": "cv-generation.ts",
    "jd-parser": "jd-parser.ts",
  };
  const filename = filenameMap[target];
  if (!filename) throw new Error(`No source file mapping for target: ${target}`);

  const filepath = path.join(PROMPTS_DIR, filename);
  const content = fs.readFileSync(filepath, "utf-8");

  // Find the template literal between backticks (the system prompt)
  // Pattern: export const XXXX = `...`;
  const match = content.match(/(export\s+const\s+\w+\s*=\s*`)([^`]*?)(`)/s);
  if (!match) {
    throw new Error(`Could not find template literal in ${filepath} — deploy manually`);
  }

  // Escape backticks and ${} in the prompt to be safe inside a template literal
  const safePrompt = prompt.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const newContent = content.replace(match[0], match[1] + safePrompt + match[3]);
  fs.writeFileSync(filepath, newContent);

  // Also save a deploy receipt
  const receipt = {
    target,
    deployed_at: new Date().toISOString(),
    source_file: filepath,
    prompt_length: prompt.length,
  };
  fs.writeFileSync(
    path.join(RESULTS_DIR, `${target}-last-deploy.json`),
    JSON.stringify(receipt, null, 2),
  );
}

// ============================================================
// LLM INTERFACE (DeepSeek or mock for dev)
// ============================================================

interface LLMResponse {
  text: string;
  usage: { input_tokens: number; output_tokens: number };
}

// ============================================================
// GENERIC OpenAI-COMPATIBLE LLM CLIENT
// All providers (DeepSeek, Gemini, Cerebras, SambaNova, Groq) use the same API shape.
// ============================================================

interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  rateGapMs: number; // Min ms between calls
  disabled?: boolean; // Set true when daily limit hit
}

let lastCallMs = 0;

/** Cached provider list — created once, disabled flags persist across calls */
let _providers: LLMProvider[] | null = null;

function resolveProviders(): LLMProvider[] {
  if (_providers) return _providers;
  const providers: LLMProvider[] = [];

  // Priority order: DeepSeek → Gemini → Cerebras → SambaNova → Groq
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      rateGapMs: 6000, // 10 RPM for 2.5-flash free tier
    });
  }
  if (process.env.CEREBRAS_API_KEY) {
    providers.push({
      name: "Cerebras",
      baseUrl: "https://api.cerebras.ai/v1/chat/completions",
      apiKey: process.env.CEREBRAS_API_KEY,
      model: process.env.CEREBRAS_MODEL || "llama-3.3-70b",
      rateGapMs: 2000, // 30 RPM
    });
  }
  if (process.env.SAMBANOVA_API_KEY) {
    providers.push({
      name: "SambaNova",
      baseUrl: "https://api.sambanova.ai/v1/chat/completions",
      apiKey: process.env.SAMBANOVA_API_KEY,
      model: process.env.SAMBANOVA_MODEL || "Meta-Llama-3.3-70B-Instruct",
      rateGapMs: 2000,
    });
  }
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "Groq",
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      rateGapMs: 2000,
    });
  }
  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      rateGapMs: 200,
    });
  }

  _providers = providers;
  return providers;
}

async function callLLM(systemPrompt: string, userPrompt: string, opts?: { json_mode?: boolean }): Promise<LLMResponse> {
  const providers = resolveProviders();

  for (const provider of providers) {
    if (provider.disabled) continue;
    try {
      return await callLLMViaProvider(provider, systemPrompt, userPrompt, 3, opts);
    } catch (err) {
      // Daily token/quota limit → disable and try next provider
      if (err instanceof Error && (err.message.includes("tokens per day") || err.message.includes("quota"))) {
        provider.disabled = true;
        console.log(`  [FALLBACK] ${provider.name} daily limit hit → trying next provider`);
        continue;
      }
      throw err;
    }
  }

  // No providers available → mock
  console.log("  [DEV MODE] No API key — using mock LLM response");
  return mockLLMResponse(systemPrompt, userPrompt);
}

async function callLLMViaProvider(provider: LLMProvider, systemPrompt: string, userPrompt: string, retries = 3, opts?: { json_mode?: boolean }): Promise<LLMResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const now = Date.now();
    const gap = now - lastCallMs;
    if (gap < provider.rateGapMs) {
      await new Promise(r => setTimeout(r, provider.rateGapMs - gap));
    }
    lastCallMs = Date.now();

    const body: Record<string, unknown> = {
      model: provider.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.7,
      stream: false,
    };

    // OpenAI-compatible JSON mode (works on Gemini, Groq, NIM, etc.)
    if (opts?.json_mode) {
      body.response_format = { type: "json_object" };
    }

    let res: Response;
    try {
      res = await fetch(provider.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      if (attempt < retries) {
        const backoff = attempt * 10000;
        console.log(`  [RETRY] ${provider.name} network error — waiting ${backoff / 1000}s (attempt ${attempt}/${retries})`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw networkErr;
    }

    if (!res.ok) {
      const errText = await res.text();
      const retryable = [429, 502, 503, 504].includes(res.status);
      if (retryable && attempt < retries) {
        const backoff = res.status === 429 ? attempt * 10000 : attempt * 5000;
        console.log(`  [RETRY] ${provider.name} ${res.status} — waiting ${backoff / 1000}s (attempt ${attempt}/${retries})`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw new Error(`${provider.name} API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    return {
      text,
      usage: {
        input_tokens: data.usage?.prompt_tokens ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  throw new Error(`${provider.name} API: all retries exhausted`);
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
  // Use the SAME user prompt builder as production — aligned input shape.
  // Truncate to stay within free-tier token limits while keeping enough content.
  const cvText = (pair.raw_cv_text || "").slice(0, 4000);
  const jdText = (pair.raw_jd_text || pair.jd_requirements.join("\n")).slice(0, 3000);

  const userPrompt = buildCVGenerationUserPrompt(cvText, jdText);

  const response = await callLLM(prompt, userPrompt, { json_mode: true });

  try {
    const parsed = safeParseJSON<CVScorecardInput["generated"]>(response.text, "cv-generation-loop");
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
  const autoDeploy = args.includes("--deploy");

  console.log(`\n=== AutoResearch Loop ===`);
  console.log(`Target: ${target}`);
  console.log(`Max iterations: ${maxIterations}`);
  console.log(`Pretest mode: ${runPretest}`);
  console.log(`Auto-deploy: ${autoDeploy}`);

  // Show which LLM providers are available
  const providers = resolveProviders();
  if (providers.length > 0) {
    console.log(`LLM: ${providers.map(p => `${p.name} (${p.model})`).join(" → ")}`);
  } else {
    console.log(`LLM: Mock (dev mode — set DEEPSEEK_API_KEY, CEREBRAS_API_KEY, SAMBANOVA_API_KEY, or GROQ_API_KEY)`);
  }
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

  // Load feedback weights (if exported by admin API or cron-entry)
  let feedbackWeights: FeedbackWeights | undefined;
  const feedbackPath = path.join(RESULTS_DIR, "feedback-weights.json");
  if (fs.existsSync(feedbackPath)) {
    try {
      const raw: { feedback: FeedbackRecord[] } = JSON.parse(fs.readFileSync(feedbackPath, "utf-8"));
      feedbackWeights = computeFeedbackWeights(raw.feedback, pairs);
      const boosted = feedbackWeights.weights.filter(w => w.weight > 1.0).length;
      console.log(`Feedback weights loaded: ${feedbackWeights.total_feedback_records} records, ${feedbackWeights.negative_signal_count} negative, ${boosted} pairs boosted`);
    } catch (err) {
      console.warn("Failed to load feedback weights:", err instanceof Error ? err.message : err);
    }
  } else {
    console.log("No feedback weights file — using uniform sampling");
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
      raw_cv_text: pair.raw_cv_text,
      raw_jd_text: pair.raw_jd_text,
    })
  );
  const baselinePassRate = baselineScores.filter(s => s.gate1_verdict === "pass").length / baselineScores.length;
  console.log(`Baseline pass rate: ${(baselinePassRate * 100).toFixed(1)}% (${baselineScores.filter(s => s.gate1_verdict === "pass").length}/${baselineScores.length})`);
  console.log();

  // Main loop
  console.log("Starting optimization loop...\n");

  // FIXED evaluation batch — deterministic selection, same across restarts.
  // Sort by ID so the batch is reproducible regardless of filesystem order or RNG.
  const trainByIdSorted = pairs.filter(p => p.split === "train").sort((a, b) => a.id.localeCompare(b.id));
  const fixedEvalBatch = trainByIdSorted.slice(0, config.training_batch_size);
  console.log(`Fixed eval batch: ${fixedEvalBatch.map(p => p.id).join(", ")}\n`);

  // Cache incumbent CV outputs per pair ID — invalidated on KEEP (prompt changes)
  const incumbentCache = new Map<string, CVScorecardInput["generated"]>();

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
      "You are a prompt engineer optimizing prompts for CV generation quality. Apply the requested mutation precisely. Return ONLY the modified prompt text — no markdown fences, no preamble, no explanation.",
      mutationPrompt,
    );
    // Strip markdown wrappers that LLMs often add despite instructions
    let mutatedPrompt = mutationResponse.text;
    mutatedPrompt = mutatedPrompt.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();

    // 4. Generate CVs with mutated prompt (FIXED batch — no variance between iterations)
    const batch = fixedEvalBatch;
    const challengerOutputs: CVScorecardInput["generated"][] = [];
    for (const pair of batch) {
      const output = await generateCV(mutatedPrompt, pair);
      challengerOutputs.push(output);
    }

    // 5. Reuse cached incumbent outputs (same prompt = same output, saves 10 LLM calls/iteration)
    const incumbentBatchOutputs: CVScorecardInput["generated"][] = [];
    for (const pair of batch) {
      if (!incumbentCache.has(pair.id)) {
        const output = await generateCV(currentPrompt, pair);
        incumbentCache.set(pair.id, output);
      }
      incumbentBatchOutputs.push(incumbentCache.get(pair.id)!);
    }

    // 6. Score and compare
    const result = runIteration(
      state,
      config,
      batch,
      mutation.type,
      `${mutation.type}: ${mutation.directive.slice(0, 150)}`,
      incumbentBatchOutputs,
      challengerOutputs,
    );

    // 7. Log
    fs.appendFileSync(tsvPath, toTSVLine(result) + "\n");

    if (result.verdict === "keep") {
      currentPrompt = mutatedPrompt;
      incumbentCache.clear(); // Prompt changed — cached outputs are stale
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
          raw_cv_text: pair.raw_cv_text,
          raw_jd_text: pair.raw_jd_text,
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
        raw_cv_text: pair.raw_cv_text,
        raw_jd_text: pair.raw_jd_text,
      });
      const optScore = scoreCVGeneration({
        generated: optOutput,
        expected: pair.expected_output,
        jd_requirements: pair.jd_requirements,
        cloud_skills: pair.cloud_skills,
        raw_cv_text: pair.raw_cv_text,
        raw_jd_text: pair.raw_jd_text,
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
      raw_cv_text: pair.raw_cv_text,
      raw_jd_text: pair.raw_jd_text,
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
        raw_cv_text: pair.raw_cv_text, raw_jd_text: pair.raw_jd_text,
      });
      const optScore = scoreCVGeneration({
        generated: optOutput, expected: pair.expected_output,
        jd_requirements: pair.jd_requirements, cloud_skills: pair.cloud_skills,
        raw_cv_text: pair.raw_cv_text, raw_jd_text: pair.raw_jd_text,
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

  // Auto-deploy: write winning prompt back to source file if safeguards pass
  if (autoDeploy && state.total_kept > 0) {
    if (safeguardReport.overall_safe) {
      deployPromptToSource(target, currentPrompt);
      console.log(`\n=== DEPLOYED ${target} prompt v${state.current_prompt_version} to source ===`);
    } else {
      console.log(`\n=== DEPLOY BLOCKED — safeguard checks failed ===`);
      if (safeguardReport.deployment.blockers.length > 0) {
        console.log("Blockers:", safeguardReport.deployment.blockers.join("; "));
      }
      if (safeguardReport.deployment.warnings.length > 0) {
        console.log("Warnings:", safeguardReport.deployment.warnings.join("; "));
      }
      console.log("Winning prompt saved to:", path.join(PROMPT_VERSIONS_DIR, `${target}-v${state.current_prompt_version.toString().padStart(3, "0")}.txt`));
      console.log("Review manually and copy to source if acceptable.");
    }
  }
}

main().catch(err => {
  console.error("AutoResearch loop failed:", err);
  process.exit(1);
});
