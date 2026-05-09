/**
 * AutoResearch Cron Entry Point
 *
 * Schedulable wrapper that handles the full lifecycle:
 *   1. Export feedback from Supabase → feedback-weights.json
 *   2. Run the optimization loop (cv-generation)
 *   3. Run the optimization loop (jd-parser) — if test pairs exist
 *   4. Log results
 *
 * Usage:
 *   npx tsx packages/ai/src/autoresearch/cron-entry.ts [--deploy] [--iterations 20]
 *
 * Environment:
 *   NVIDIA_NIM_API_KEY — required for LLM calls (without it, runs in dev mode)
 *   SUPABASE_URL — required for feedback export
 *   SUPABASE_SERVICE_KEY — required for feedback export (service role, not anon)
 *
 * Scheduling:
 *   - Windows Task Scheduler: schtasks /create /tn "AutoResearch" /tr "npx tsx ..." /sc daily /st 02:00
 *   - Linux cron: 0 2 * * * cd /path/to/repo && npx tsx packages/ai/src/autoresearch/cron-entry.ts --deploy
 *   - GitHub Actions: schedule with cron expression
 *   - Trigger.dev: register as a scheduled task
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const RESULTS_DIR = path.join(__dirname, "results");
const RUN_LOOP_SCRIPT = path.join(__dirname, "run-loop.ts");

interface CronConfig {
  deploy: boolean;
  iterations: number;
  targets: Array<"cv-generation" | "jd-parser">;
}

function parseArgs(): CronConfig {
  const args = process.argv.slice(2);
  return {
    deploy: args.includes("--deploy"),
    iterations: args.includes("--iterations")
      ? parseInt(args[args.indexOf("--iterations") + 1]) || 20
      : 20,
    targets: args.includes("--target")
      ? [args[args.indexOf("--target") + 1] as "cv-generation" | "jd-parser"]
      : ["cv-generation"], // Default to cv-generation only
  };
}

/**
 * Step 1: Export feedback from Supabase to JSON.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.
 */
async function exportFeedback(): Promise<{ exported: number }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.log("[Feedback] SUPABASE_URL or SUPABASE_SERVICE_KEY not set — skipping feedback export");
    return { exported: 0 };
  }

  // Dynamic import to avoid hard dependency when running without Supabase
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("user_feedback")
    .select("task_type, classified_signal, classified_intent, created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[Feedback] DB error:", error.message);
    return { exported: 0 };
  }

  const feedback = (data ?? []).map((f) => ({
    task_type: f.task_type,
    classified_signal: f.classified_signal,
    classified_intent: f.classified_intent,
    created_at: f.created_at,
  }));

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outputPath = path.join(RESULTS_DIR, "feedback-weights.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    feedback,
    exported_at: new Date().toISOString(),
    record_count: feedback.length,
  }, null, 2));

  console.log(`[Feedback] Exported ${feedback.length} records to feedback-weights.json`);
  return { exported: feedback.length };
}

/**
 * Step 2: Run the optimization loop for a target.
 */
function runLoop(target: string, iterations: number, deploy: boolean): { success: boolean; output: string } {
  const args = [
    "tsx", RUN_LOOP_SCRIPT,
    "--target", target,
    "--iterations", String(iterations),
    "--pretest",
  ];
  if (deploy) args.push("--deploy");

  console.log(`\n[Loop] Running: npx ${args.join(" ")}`);

  try {
    const output = execSync(`npx ${args.join(" ")}`, {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      timeout: 10 * 60 * 1000, // 10 minute timeout
      env: { ...process.env },
    });
    console.log(output);
    return { success: true, output };
  } catch (err) {
    const errOutput = err instanceof Error ? (err as { stdout?: string }).stdout ?? err.message : String(err);
    console.error(`[Loop] Failed for ${target}:`, errOutput);
    return { success: false, output: errOutput };
  }
}

/**
 * Step 3: Save cron execution log.
 */
function saveLog(config: CronConfig, feedbackCount: number, results: Array<{ target: string; success: boolean }>): void {
  const logPath = path.join(RESULTS_DIR, "cron-log.json");

  let logs: Array<Record<string, unknown>> = [];
  if (fs.existsSync(logPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    } catch { /* start fresh */ }
  }

  logs.push({
    timestamp: new Date().toISOString(),
    config,
    feedback_exported: feedbackCount,
    results,
    env: {
      has_api_key: !!process.env.NVIDIA_NIM_API_KEY,
      has_supabase: !!process.env.SUPABASE_URL,
      node_version: process.version,
    },
  });

  // Keep last 100 entries
  if (logs.length > 100) logs = logs.slice(-100);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const config = parseArgs();

  console.log("=== AutoResearch Cron Entry ===");
  console.log(`Targets: ${config.targets.join(", ")}`);
  console.log(`Iterations: ${config.iterations}`);
  console.log(`Deploy: ${config.deploy}`);
  console.log(`API key: ${process.env.NVIDIA_NIM_API_KEY ? "SET" : "NOT SET (dev mode)"}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL ? "SET" : "NOT SET (no feedback)"}`);
  console.log();

  // Step 1: Export feedback
  const { exported } = await exportFeedback();

  // Step 2: Run loops
  const results: Array<{ target: string; success: boolean }> = [];
  for (const target of config.targets) {
    const result = runLoop(target, config.iterations, config.deploy);
    results.push({ target, success: result.success });
  }

  // Step 3: Log
  saveLog(config, exported, results);

  // Summary
  console.log("\n=== Cron Complete ===");
  console.log(`Feedback: ${exported} records`);
  for (const r of results) {
    console.log(`${r.target}: ${r.success ? "SUCCESS" : "FAILED"}`);
  }

  const anyFailed = results.some(r => !r.success);
  process.exit(anyFailed ? 1 : 0);
}

main().catch(err => {
  console.error("Cron entry failed:", err);
  process.exit(1);
});
