/**
 * ANOVA Pre-Test for AutoResearch
 *
 * Before committing to nightly runs, we must verify the loop delivers
 * statistically significant improvements. This runs 20 manual iterations
 * and tests whether the improvement is real or noise.
 *
 * Based on: "Prompt Optimization Is a Coin Flip" (April 2026, arXiv:2604.14585)
 *   - 72 optimization runs on LLM (fast tier): 49% improved (= random)
 *   - We must prove our loop beats random BEFORE investing compute
 *
 * Protocol:
 *   1. Run 20 optimization iterations
 *   2. Record scores for original prompt and best optimized prompt
 *   3. Evaluate both on held-out test set (15 pairs)
 *   4. Run one-way ANOVA: is improvement significant (p < 0.05)?
 *   5. If yes → proceed with nightly runs
 *   6. If no → investigate why, don't waste compute
 */

export interface PretestResult {
  /** Original prompt scores on held-out set (one per pair) */
  original_scores: number[];
  /** Optimized prompt scores on held-out set (one per pair) */
  optimized_scores: number[];
  /** Number of iterations run */
  iterations_run: number;
  /** Number of mutations kept */
  mutations_kept: number;
  /** Keep rate */
  keep_rate: number;
  /** ANOVA F-statistic */
  f_statistic: number;
  /** ANOVA p-value */
  p_value: number;
  /** Whether the improvement is significant */
  significant: boolean;
  /** Mean improvement */
  mean_improvement: number;
  /** Recommendation */
  recommendation: "proceed" | "investigate" | "abort";
  /** Human-readable summary */
  summary: string;
}

/**
 * One-way ANOVA (F-test) for two groups.
 *
 * Tests H0: the two groups have the same mean.
 * Returns F-statistic and approximate p-value.
 *
 * We implement this directly to avoid a stats library dependency.
 * For production, consider using a proper stats library.
 */
export function oneWayANOVA(
  group1: number[],
  group2: number[],
): { f_statistic: number; p_value: number } {
  const n1 = group1.length;
  const n2 = group2.length;
  const N = n1 + n2;

  if (n1 < 2 || n2 < 2) {
    return { f_statistic: 0, p_value: 1 };
  }

  const mean1 = group1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = group2.reduce((a, b) => a + b, 0) / n2;
  const grandMean = (group1.reduce((a, b) => a + b, 0) + group2.reduce((a, b) => a + b, 0)) / N;

  // Between-group sum of squares
  const SSB = n1 * (mean1 - grandMean) ** 2 + n2 * (mean2 - grandMean) ** 2;

  // Within-group sum of squares
  const SSW1 = group1.reduce((s, x) => s + (x - mean1) ** 2, 0);
  const SSW2 = group2.reduce((s, x) => s + (x - mean2) ** 2, 0);
  const SSW = SSW1 + SSW2;

  // Degrees of freedom
  const dfB = 1; // k - 1, k = 2 groups
  const dfW = N - 2; // N - k

  if (SSW === 0) {
    // Perfect scores — if means differ, it's significant
    return { f_statistic: mean1 !== mean2 ? Infinity : 0, p_value: mean1 !== mean2 ? 0 : 1 };
  }

  const MSB = SSB / dfB;
  const MSW = SSW / dfW;
  const f = MSB / MSW;

  // Approximate p-value using F-distribution CDF
  // For df1=1, the F-distribution relates to t-distribution: F = t^2
  // p-value ≈ 2 * (1 - Φ(sqrt(F))) for large dfW (normal approximation)
  // For better accuracy, we use the beta function relationship
  const p = fDistPValue(f, dfB, dfW);

  return { f_statistic: f, p_value: p };
}

/**
 * Approximate p-value for F-distribution using the regularized incomplete beta function.
 * For df1=1 (our case), this simplifies considerably.
 */
function fDistPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;

  // For df1=1, F-test is equivalent to two-tailed t-test
  // p = P(T > sqrt(F)) * 2 where T ~ t(df2)
  // Using approximation: for df2 >= 10, t approximates normal
  const t = Math.sqrt(f);

  if (df2 >= 30) {
    // Normal approximation (good for df2 >= 30)
    return 2 * (1 - normalCDF(t));
  }

  // For smaller df2, use a simple t-distribution approximation
  // Abramowitz & Stegun formula 26.7.4
  const x = df2 / (df2 + t * t);
  return regularizedBeta(x, df2 / 2, 0.5);
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17)
 * Accuracy: max error 7.5e-8
 */
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * x);
  const pdf = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));

  return sign === 1 ? cdf : 1 - cdf;
}

/**
 * Regularized incomplete beta function approximation.
 * Uses continued fraction expansion (good for our use case).
 */
function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use the series expansion for small x
  const maxIter = 200;
  const eps = 1e-10;

  // Lentz's continued fraction method
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;

  let f = 1;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  f = d;

  for (let m = 1; m <= maxIter; m++) {
    // Even step
    let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    f *= c * d;

    // Odd step
    numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1) < eps) break;
  }

  return front * f;
}

/**
 * Log-gamma function (Stirling's approximation + Lanczos for small values)
 */
function logGamma(x: number): number {
  if (x <= 0) return Infinity;

  // Lanczos approximation (g=7, n=9)
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < c.length; i++) {
    a += c[i] / (x + i);
  }

  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Analyze pre-test results and produce recommendation.
 */
export function analyzePretestResults(
  originalScores: number[],
  optimizedScores: number[],
  iterationsRun: number,
  mutationsKept: number,
): PretestResult {
  const { f_statistic, p_value } = oneWayANOVA(originalScores, optimizedScores);

  const meanOriginal = originalScores.reduce((a, b) => a + b, 0) / originalScores.length;
  const meanOptimized = optimizedScores.reduce((a, b) => a + b, 0) / optimizedScores.length;
  const meanImprovement = meanOptimized - meanOriginal;

  const keepRate = iterationsRun > 0 ? mutationsKept / iterationsRun : 0;
  const significant = p_value < 0.05;

  let recommendation: "proceed" | "investigate" | "abort";
  let summary: string;

  if (significant && meanImprovement > 0) {
    recommendation = "proceed";
    summary = `Improvement is statistically significant (p=${p_value.toFixed(4)}, F=${f_statistic.toFixed(2)}). `
      + `Mean improvement: +${(meanImprovement * 100).toFixed(1)}%. `
      + `Keep rate: ${(keepRate * 100).toFixed(1)}% (${mutationsKept}/${iterationsRun}). `
      + `Proceed with nightly runs.`;
  } else if (significant && meanImprovement <= 0) {
    recommendation = "abort";
    summary = `Statistically significant REGRESSION detected (p=${p_value.toFixed(4)}). `
      + `Mean change: ${(meanImprovement * 100).toFixed(1)}%. `
      + `The optimization loop is making the prompt worse. Abort and investigate scorecard design.`;
  } else if (keepRate < 0.05) {
    recommendation = "abort";
    summary = `Keep rate too low (${(keepRate * 100).toFixed(1)}%). `
      + `Only ${mutationsKept} of ${iterationsRun} mutations were kept. `
      + `The prompt may already be near-optimal, or the scorecard is too strict. `
      + `Investigate before committing compute.`;
  } else {
    recommendation = "investigate";
    summary = `Improvement is NOT statistically significant (p=${p_value.toFixed(4)}, F=${f_statistic.toFixed(2)}). `
      + `Mean change: ${(meanImprovement * 100).toFixed(1)}%. `
      + `Keep rate: ${(keepRate * 100).toFixed(1)}%. `
      + `This matches the "coin flip" finding (arXiv:2604.14585). `
      + `Options: (1) improve scorecard granularity, (2) try different mutation operators, (3) add more test pairs.`;
  }

  return {
    original_scores: originalScores,
    optimized_scores: optimizedScores,
    iterations_run: iterationsRun,
    mutations_kept: mutationsKept,
    keep_rate: keepRate,
    f_statistic,
    p_value,
    significant,
    mean_improvement: meanImprovement,
    recommendation,
    summary,
  };
}
