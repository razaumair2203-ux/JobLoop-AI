/**
 * AutoResearch Safeguards
 *
 * Prevents the optimization loop from drifting, overfitting, or deploying garbage.
 * All checks are deterministic — no LLM calls.
 *
 * Based on:
 *   - ZEDD (arXiv 2601.12359, NeurIPS 2025 workshop): cosine similarity for drift detection
 *   - "When Better Prompts Hurt" (arXiv 2601.22025, Jan 2026): MVES framework, regression testing,
 *     held-out rotation, failure-driven augmentation
 *   - Bowyer et al. (arXiv 2503.01747, ICML 2025 Spotlight): Bayesian CIs for small-N evaluation
 *   - p1 (arXiv 2604.08801, Apr 2026): prompt optimizer overfitting evidence (GEPA memorizes)
 *   - Evidently AI: 40/40/20 split, anti-overfit instructions
 *   - HackerNoon: 5-20% train-test accuracy gap as overfitting signal
 *   - LaunchDarkly: progressive rollout, no auto-deploy
 *
 * What we implement:
 *   1. Semantic drift detector (cosine similarity against v0)
 *   2. Regression test gate (v0 vs current on held-out)
 *   3. Human validation gate (no auto-deploy — blocks until reviewed)
 *   4. Held-out staleness detector (rotation metadata)
 *   5. Overfitting detector (train-test gap)
 *   6. Bayesian credible intervals (not CLT) for small N
 */

// ============================================================
// 1. SEMANTIC DRIFT DETECTOR
// ============================================================

/**
 * Compute n-gram overlap between two prompts as a lightweight
 * semantic similarity proxy. No embedding model needed.
 *
 * For production: replace with text-embedding-3-large cosine similarity (Promptfoo pattern).
 * For dev/testing: this n-gram Jaccard is sufficient and has zero dependencies.
 *
 * ZEDD (arXiv 2601.12359) uses GMM-fitted thresholds on cosine similarity.
 * We use a simpler fixed threshold since we're comparing prompt variants, not arbitrary text.
 *
 * @returns similarity 0-1 (1 = identical)
 */
export function promptSimilarity(promptA: string, promptB: string, n: number = 3): number {
  const ngramsA = extractNgrams(promptA, n);
  const ngramsB = extractNgrams(promptB, n);

  if (ngramsA.size === 0 && ngramsB.size === 0) return 1;

  let intersection = 0;
  for (const gram of ngramsA) {
    if (ngramsB.has(gram)) intersection++;
  }
  const union = ngramsA.size + ngramsB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function extractNgrams(text: string, n: number): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 0);
  const ngrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

export interface DriftCheckResult {
  similarity: number;
  drifted: boolean;
  severity: "none" | "mild" | "severe";
  message: string;
}

/**
 * Check if the current prompt has drifted too far from v0.
 *
 * Thresholds (no universal standard per literature — these are our conservative defaults):
 *   - >= 0.60: OK (normal mutation accumulation)
 *   - 0.40-0.59: MILD drift warning (log but continue)
 *   - < 0.40: SEVERE drift — halt loop, require human review
 *
 * Rationale: Promptfoo uses 0.80 for output similarity, but prompts are expected
 * to change more than outputs. We use 0.40 as the hard floor because below that,
 * the prompt has lost more than 60% of its original instruction structure.
 */
export function checkDrift(
  originalPrompt: string,
  currentPrompt: string,
  mildThreshold: number = 0.60,
  severeThreshold: number = 0.40,
): DriftCheckResult {
  const similarity = promptSimilarity(originalPrompt, currentPrompt);

  if (similarity >= mildThreshold) {
    return { similarity, drifted: false, severity: "none", message: `Similarity ${(similarity * 100).toFixed(1)}% — within normal range` };
  }

  if (similarity >= severeThreshold) {
    return {
      similarity,
      drifted: true,
      severity: "mild",
      message: `Similarity ${(similarity * 100).toFixed(1)}% — mild drift detected. The prompt has changed significantly from v0. Review recommended.`,
    };
  }

  return {
    similarity,
    drifted: true,
    severity: "severe",
    message: `Similarity ${(similarity * 100).toFixed(1)}% — SEVERE drift. The prompt has lost most of its original structure. Loop should halt for human review.`,
  };
}

// ============================================================
// 2. REGRESSION TEST GATE
// ============================================================

/**
 * Compare current best prompt against the original (v0) on held-out pairs.
 * If the improvement is below the minimum threshold, the optimization is not worth it.
 *
 * Based on:
 *   - "When Better Prompts Hurt" (arXiv 2601.22025): replacement caused -10pp pass rate,
 *     -13.3pp compliance. Improvements must be verified on held-out data.
 *   - p1 (arXiv 2604.08801): GEPA memorizes training set. Held-out is essential.
 */
export interface RegressionTestResult {
  original_pass_rate: number;
  optimized_pass_rate: number;
  improvement: number;
  /** Is the improvement meaningful (> threshold)? */
  meaningful: boolean;
  /** Is the optimized prompt WORSE than the original? */
  regressed: boolean;
  message: string;
}

export function checkRegression(
  originalPassRate: number,
  optimizedPassRate: number,
  minImprovementThreshold: number = 0.02, // 2% minimum meaningful improvement
): RegressionTestResult {
  const improvement = optimizedPassRate - originalPassRate;
  const regressed = improvement < 0;
  const meaningful = improvement >= minImprovementThreshold;

  let message: string;
  if (regressed) {
    message = `REGRESSION: Optimized prompt is ${(Math.abs(improvement) * 100).toFixed(1)}pp WORSE than original. Do NOT deploy.`;
  } else if (!meaningful) {
    message = `Improvement of ${(improvement * 100).toFixed(1)}pp is below the ${(minImprovementThreshold * 100).toFixed(0)}% threshold. Optimization may not be worthwhile.`;
  } else {
    message = `Improvement of ${(improvement * 100).toFixed(1)}pp is meaningful. Proceed to human review.`;
  }

  return {
    original_pass_rate: originalPassRate,
    optimized_pass_rate: optimizedPassRate,
    improvement,
    meaningful,
    regressed,
    message,
  };
}

// ============================================================
// 3. HUMAN VALIDATION GATE
// ============================================================

/**
 * Deployment readiness check. Blocks auto-deployment.
 *
 * Based on:
 *   - No optimizer (DSPy, TextGrad, PromptBreeder, CAPO) includes mandatory human gates.
 *     We add one because we're deploying to real users, not running benchmarks.
 *   - LaunchDarkly CI/CD: validate → quality test → config sync → safe deploy.
 *   - Our approach: the loop produces a candidate; a human must approve before it
 *     replaces the production prompt.
 */
export interface DeploymentReadiness {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  requires_human_review: boolean;
  review_checklist: string[];
}

export function checkDeploymentReadiness(
  drift: DriftCheckResult,
  regression: RegressionTestResult,
  anovaSignificant: boolean,
  keepRate: number,
  iterationsRun: number,
): DeploymentReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Hard blockers — cannot deploy
  if (drift.severity === "severe") {
    blockers.push(`Severe prompt drift (${(drift.similarity * 100).toFixed(0)}% similarity to v0)`);
  }
  if (regression.regressed) {
    blockers.push(`Prompt regressed: ${(Math.abs(regression.improvement) * 100).toFixed(1)}pp worse than original`);
  }
  if (!anovaSignificant) {
    blockers.push("Improvement is NOT statistically significant (ANOVA p >= 0.05)");
  }

  // Warnings — can deploy but flag
  if (drift.severity === "mild") {
    warnings.push(`Mild prompt drift detected (${(drift.similarity * 100).toFixed(0)}% similarity)`);
  }
  if (keepRate < 0.10) {
    warnings.push(`Very low keep rate (${(keepRate * 100).toFixed(1)}%) — most mutations were rejected`);
  }
  if (iterationsRun < 10) {
    warnings.push(`Only ${iterationsRun} iterations run — may be insufficient for reliable optimization`);
  }
  if (!regression.meaningful) {
    warnings.push(`Improvement (${(regression.improvement * 100).toFixed(1)}pp) is below 2% threshold — may not be worth the risk`);
  }

  const ready = blockers.length === 0;

  return {
    ready,
    blockers,
    warnings,
    requires_human_review: true, // ALWAYS true — no auto-deploy
    review_checklist: [
      "Compare v0 prompt side-by-side with optimized prompt",
      "Run optimized prompt against 3-5 REAL user CVs + JDs (not test bank)",
      "Verify no fabrication in generated outputs",
      "Check that prompt still follows the advocate framing (no discouraging language)",
      "Confirm education is separate from certifications in output",
      "Test sensitivity handling (military platform names)",
      "If all pass → deploy to 10% of users first, monitor for 48h",
    ],
  };
}

// ============================================================
// 4. HELD-OUT STALENESS DETECTOR
// ============================================================

/**
 * Track when held-out pairs were last rotated.
 *
 * Based on:
 *   - "When Better Prompts Hurt" (arXiv 2601.22025): held-out sets must be periodically
 *     refreshed. Failure-driven augmentation creates a "living test suite."
 *   - CAPO (arXiv 2504.16005): acknowledges test set contamination as a limitation.
 *   - Our cadence: quarterly rotation (every 90 days) as per autoresearch-validation.md.
 */
export interface HeldOutStaleness {
  last_rotated: string; // ISO date
  days_since_rotation: number;
  is_stale: boolean;
  message: string;
}

export function checkHeldOutStaleness(
  lastRotatedDate: string,
  currentDate: string = new Date().toISOString().split("T")[0],
  maxDays: number = 90, // Quarterly rotation
): HeldOutStaleness {
  const last = new Date(lastRotatedDate);
  const current = new Date(currentDate);
  const daysDiff = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  return {
    last_rotated: lastRotatedDate,
    days_since_rotation: daysDiff,
    is_stale: daysDiff >= maxDays,
    message: daysDiff >= maxDays
      ? `Held-out set is ${daysDiff} days old (>${maxDays}). Rotate with fresh pairs to prevent overfitting.`
      : `Held-out set is ${daysDiff} days old. Next rotation in ${maxDays - daysDiff} days.`,
  };
}

// ============================================================
// 5. OVERFITTING DETECTOR
// ============================================================

/**
 * Detect overfitting by comparing train vs held-out performance.
 *
 * Based on:
 *   - HackerNoon analysis: 5-20% train-test accuracy gap is normal for prompt optimization.
 *     Above 20% indicates overfitting.
 *   - p1 (arXiv 2604.08801): GEPA memorizes training set at K=1.
 */
export interface OverfitCheckResult {
  train_pass_rate: number;
  heldout_pass_rate: number;
  gap: number;
  is_overfit: boolean;
  severity: "none" | "mild" | "severe";
  message: string;
}

export function checkOverfitting(
  trainPassRate: number,
  heldoutPassRate: number,
  mildGapThreshold: number = 0.15, // 15% gap
  severeGapThreshold: number = 0.25, // 25% gap
): OverfitCheckResult {
  const gap = trainPassRate - heldoutPassRate;

  let severity: "none" | "mild" | "severe";
  let message: string;

  if (gap < mildGapThreshold) {
    severity = "none";
    message = `Train-holdout gap is ${(gap * 100).toFixed(1)}pp — no overfitting detected.`;
  } else if (gap < severeGapThreshold) {
    severity = "mild";
    message = `Train-holdout gap is ${(gap * 100).toFixed(1)}pp — within the 5-20% range typical for prompt optimization (HackerNoon). Monitor.`;
  } else {
    severity = "severe";
    message = `Train-holdout gap is ${(gap * 100).toFixed(1)}pp — above 25%. Prompt is likely overfit to training pairs. Consider: (1) add more diverse test pairs, (2) reduce training iterations, (3) use p1's transferable approach over GEPA.`;
  }

  return {
    train_pass_rate: trainPassRate,
    heldout_pass_rate: heldoutPassRate,
    gap,
    is_overfit: gap >= mildGapThreshold,
    severity,
    message,
  };
}

// ============================================================
// 6. BAYESIAN CREDIBLE INTERVALS
// ============================================================

/**
 * Compute Bayesian credible interval for a pass rate.
 *
 * Based on:
 *   - Bowyer, Aitchison & Ivanova (arXiv 2503.01747, ICML 2025 Spotlight):
 *     "Don't Use the CLT in LLM Evals With Fewer Than a Few Hundred Datapoints"
 *     CLT-based CIs dramatically underestimate uncertainty at small N.
 *   - Uses Beta-Binomial conjugate prior (uninformative Beta(1,1) = uniform prior).
 *   - For N=50 with 40 passes: Beta(41,11) → 95% CI = [0.67, 0.90]
 *     vs CLT which would give [0.69, 0.91] — CLT is tighter but unreliable.
 */
export interface BayesianCI {
  point_estimate: number;
  ci_lower: number;
  ci_upper: number;
  ci_width: number;
  n: number;
  successes: number;
  method: "bayesian_beta_binomial";
  credibility: number; // e.g., 0.95 for 95% CI
}

/**
 * Compute credible interval using Beta-Binomial conjugate.
 * Uses the quantile function of Beta distribution (inverse CDF).
 *
 * @param successes - number of checks that passed
 * @param total - total number of checks
 * @param credibility - e.g., 0.95 for 95% CI
 * @param priorAlpha - Beta prior alpha (1 = uninformative)
 * @param priorBeta - Beta prior beta (1 = uninformative)
 */
export function bayesianCredibleInterval(
  successes: number,
  total: number,
  credibility: number = 0.95,
  priorAlpha: number = 1,
  priorBeta: number = 1,
): BayesianCI {
  const postAlpha = priorAlpha + successes;
  const postBeta = priorBeta + (total - successes);
  const tail = (1 - credibility) / 2;

  const lower = betaQuantile(tail, postAlpha, postBeta);
  const upper = betaQuantile(1 - tail, postAlpha, postBeta);
  const pointEstimate = successes / total;

  return {
    point_estimate: pointEstimate,
    ci_lower: lower,
    ci_upper: upper,
    ci_width: upper - lower,
    n: total,
    successes,
    method: "bayesian_beta_binomial",
    credibility,
  };
}

/**
 * Beta distribution quantile function (inverse CDF).
 * Uses Newton's method on the regularized incomplete beta function.
 * Reuses the statistical functions from anova-pretest.ts approach.
 */
function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Initial guess using normal approximation
  let x = a / (a + b);

  // Newton-Raphson iteration
  for (let iter = 0; iter < 100; iter++) {
    const cdf = regularizedBetaIncomplete(x, a, b);
    const pdf = betaPDF(x, a, b);

    if (pdf === 0) break;

    const delta = (cdf - p) / pdf;
    x = Math.max(1e-10, Math.min(1 - 1e-10, x - delta));

    if (Math.abs(delta) < 1e-10) break;
  }

  return x;
}

function betaPDF(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0;
  const logB = logGamma(a) + logGamma(b) - logGamma(a + b);
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB);
}

function regularizedBetaIncomplete(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use continued fraction (same approach as anova-pretest.ts)
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;

  let f = 1, c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  f = d;

  for (let m = 1; m <= 200; m++) {
    let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    f *= c * d;

    num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1) < 1e-10) break;
  }

  return front * f;
}

function logGamma(x: number): number {
  if (x <= 0) return Infinity;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < c.length; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// ============================================================
// FULL SAFEGUARD REPORT
// ============================================================

export interface SafeguardReport {
  drift: DriftCheckResult;
  regression: RegressionTestResult;
  deployment: DeploymentReadiness;
  staleness: HeldOutStaleness;
  overfitting: OverfitCheckResult;
  bayesian_ci: BayesianCI;
  overall_safe: boolean;
  summary: string;
}

/**
 * Run all safeguard checks and produce a comprehensive report.
 * This is called after the loop completes, before any deployment decision.
 */
export function runSafeguardChecks(input: {
  originalPrompt: string;
  currentPrompt: string;
  originalPassRate: number;
  optimizedPassRate: number;
  trainPassRate: number;
  heldoutPassRate: number;
  anovaSignificant: boolean;
  keepRate: number;
  iterationsRun: number;
  heldoutLastRotated: string;
  heldoutSuccesses: number;
  heldoutTotal: number;
}): SafeguardReport {
  const drift = checkDrift(input.originalPrompt, input.currentPrompt);
  const regression = checkRegression(input.originalPassRate, input.optimizedPassRate);
  const deployment = checkDeploymentReadiness(
    drift, regression, input.anovaSignificant, input.keepRate, input.iterationsRun,
  );
  const staleness = checkHeldOutStaleness(input.heldoutLastRotated);
  const overfitting = checkOverfitting(input.trainPassRate, input.heldoutPassRate);
  const bayesian_ci = bayesianCredibleInterval(input.heldoutSuccesses, input.heldoutTotal);

  const overall_safe = deployment.ready && !overfitting.is_overfit && !staleness.is_stale;

  const lines: string[] = [
    `=== AutoResearch Safeguard Report ===`,
    ``,
    `Drift: ${drift.severity.toUpperCase()} (${(drift.similarity * 100).toFixed(0)}% similar to v0)`,
    `Regression: ${regression.regressed ? "FAILED" : regression.meaningful ? "PASSED" : "MARGINAL"} (${(regression.improvement * 100).toFixed(1)}pp)`,
    `Overfitting: ${overfitting.severity.toUpperCase()} (${(overfitting.gap * 100).toFixed(1)}pp train-holdout gap)`,
    `Staleness: ${staleness.is_stale ? "STALE" : "OK"} (${staleness.days_since_rotation} days)`,
    `Bayesian 95% CI: [${(bayesian_ci.ci_lower * 100).toFixed(1)}%, ${(bayesian_ci.ci_upper * 100).toFixed(1)}%] (width: ${(bayesian_ci.ci_width * 100).toFixed(1)}pp)`,
    ``,
    `Blockers: ${deployment.blockers.length > 0 ? deployment.blockers.join("; ") : "None"}`,
    `Warnings: ${deployment.warnings.length > 0 ? deployment.warnings.join("; ") : "None"}`,
    ``,
    `OVERALL: ${overall_safe ? "SAFE — proceed to human review" : "BLOCKED — resolve issues before review"}`,
    ``,
    `Human review checklist:`,
    ...deployment.review_checklist.map(item => `  [ ] ${item}`),
  ];

  return {
    drift,
    regression,
    deployment,
    staleness,
    overfitting,
    bayesian_ci,
    overall_safe,
    summary: lines.join("\n"),
  };
}
