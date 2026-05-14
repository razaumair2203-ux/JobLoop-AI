import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

/**
 * Admin API for AutoResearch loop management.
 *
 * GET  — Returns latest loop status + last deploy info
 * POST — Triggers a loop run OR exports feedback weights
 *
 * Auth: requires authenticated admin user.
 * Set ADMIN_EMAILS env var (comma-separated) to allowlist admins.
 * In dev bypass mode, the dev user is always allowed.
 */

const RESULTS_DIR = path.join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "ai",
  "src",
  "autoresearch",
  "results",
);

const ALLOWED_TARGETS = ["cv-generation", "jd-parser"] as const;
const MAX_ITERATIONS = 100;

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;

  // Dev bypass user is always admin
  if (email === "dev@jobloop.local" && process.env.DEV_AUTH_BYPASS === "true") {
    return true;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

// ============================================================
// GET — Status
// ============================================================

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const status: Record<string, unknown> = {
    available_targets: ALLOWED_TARGETS,
  };

  // Load latest state for each target
  for (const target of ALLOWED_TARGETS) {
    const statePath = path.join(RESULTS_DIR, `${target}-state.json`);
    const deployPath = path.join(RESULTS_DIR, `${target}-last-deploy.json`);
    const safeguardPath = path.join(RESULTS_DIR, `${target}-safeguards.json`);

    if (fs.existsSync(statePath)) {
      try {
        status[`${target}_state`] = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      } catch { /* ignore parse errors */ }
    }
    if (fs.existsSync(deployPath)) {
      try {
        status[`${target}_last_deploy`] = JSON.parse(fs.readFileSync(deployPath, "utf-8"));
      } catch { /* ignore */ }
    }
    if (fs.existsSync(safeguardPath)) {
      try {
        status[`${target}_safeguards`] = JSON.parse(fs.readFileSync(safeguardPath, "utf-8"));
      } catch { /* ignore */ }
    }
  }

  // Check if feedback weights exist
  const feedbackPath = path.join(RESULTS_DIR, "feedback-weights.json");
  status.feedback_weights_exists = fs.existsSync(feedbackPath);
  if (status.feedback_weights_exists) {
    try {
      const fw = JSON.parse(fs.readFileSync(feedbackPath, "utf-8"));
      status.feedback_weights_summary = {
        record_count: fw.feedback?.length ?? 0,
        generated_at: fw.generated_at ?? null,
      };
    } catch { /* ignore */ }
  }

  return Response.json(status);
}

// ============================================================
// POST — Trigger loop or export feedback
// ============================================================

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "export_feedback":
      return await exportFeedbackWeights(supabase);

    case "trigger_loop":
      return await triggerLoop(body);

    default:
      return Response.json(
        { error: `Unknown action: ${action}. Use "export_feedback" or "trigger_loop"` },
        { status: 400 },
      );
  }
}

/**
 * Export user feedback from DB to JSON file for AutoResearch consumption.
 */
async function exportFeedbackWeights(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Fetch last 30 days of feedback
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: feedback, error } = await supabase
    .from("user_feedback")
    .select("task_type, classified_signal, classified_intent, created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return Response.json({ error: `DB error: ${error.message}` }, { status: 500 });
  }

  // Enrich with persona/domain from applications if available
  const enriched = (feedback ?? []).map((f) => ({
    task_type: f.task_type,
    classified_signal: f.classified_signal,
    classified_intent: f.classified_intent,
    created_at: f.created_at,
    persona: undefined as string | undefined,
    domain: undefined as string | undefined,
  }));

  // Write to results dir for AutoResearch to pick up
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outputPath = path.join(RESULTS_DIR, "feedback-weights.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    feedback: enriched,
    exported_at: new Date().toISOString(),
    record_count: enriched.length,
  }, null, 2));

  return Response.json({
    success: true,
    exported: enriched.length,
  });
}

/**
 * Trigger an AutoResearch loop run as a background process.
 */
async function triggerLoop(body: {
  target?: string;
  iterations?: number;
  deploy?: boolean;
}) {
  const target = body.target ?? "cv-generation";
  const iterations = body.iterations ?? 20;
  const deploy = body.deploy ?? false;

  // Validate target against allowlist
  if (!ALLOWED_TARGETS.includes(target as typeof ALLOWED_TARGETS[number])) {
    return Response.json(
      { error: `Invalid target: ${target}. Allowed: ${ALLOWED_TARGETS.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate iterations bounds
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) {
    return Response.json(
      { error: `Iterations must be an integer between 1 and ${MAX_ITERATIONS}` },
      { status: 400 },
    );
  }

  // Build CLI args
  const args = [
    "packages/ai/src/autoresearch/run-loop.ts",
    "--target", target,
    "--iterations", String(iterations),
  ];
  if (deploy) args.push("--deploy");

  // Spawn as background process (non-blocking)
  const loopProcess = spawn("npx", ["tsx", ...args], {
    cwd: path.join(process.cwd(), "..", ".."),
    detached: true,
    stdio: "ignore",
  });
  loopProcess.unref();

  return Response.json({
    success: true,
    message: `AutoResearch loop triggered: ${target} x${iterations} iterations${deploy ? " (auto-deploy)" : ""}`,
    pid: loopProcess.pid,
  });
}
