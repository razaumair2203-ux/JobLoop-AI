/**
 * Feedback Weighter for AutoResearch
 *
 * Connects user feedback signals to AutoResearch pair selection.
 * Pairs matching personas/domains where users were unhappy get
 * higher sampling weight in the training batch.
 *
 * Input: exported feedback records (from admin API or DB dump)
 * Output: weight map keyed by test pair ID
 *
 * Pure functions — no DB dependency. The caller provides feedback data.
 */

import type { TestPair } from "./loop-runner";

// ============================================================
// TYPES
// ============================================================

export interface FeedbackRecord {
  task_type: string;          // "cv_generation" | "jd_parse" | "insights" | etc.
  classified_signal: string;  // "escalate" | "cloud_gap" | "de_escalate" | "maintain"
  classified_intent: string;  // "dissatisfied_quality" | "request_regenerate" | etc.
  persona?: string;           // user persona if known
  domain?: string;            // domain context if known
  created_at: string;         // ISO date
}

export interface PairWeight {
  pair_id: string;
  weight: number;       // 1.0 = normal, >1 = oversample, <1 = undersample
  reason: string;
}

export interface FeedbackWeights {
  weights: PairWeight[];
  total_feedback_records: number;
  negative_signal_count: number;
  generated_at: string;
}

// ============================================================
// WEIGHT COMPUTATION
// ============================================================

/**
 * Compute sampling weights for test pairs based on user feedback.
 *
 * Logic:
 *   - Count negative signals (escalate, cloud_gap) per persona and domain
 *   - Pairs matching high-negative personas/domains get weight boost
 *   - Pairs matching positive signals get slight weight reduction (already good)
 *   - Default weight is 1.0 (no feedback = normal sampling)
 *
 * Weight range: 0.5 (very positive area) to 3.0 (high dissatisfaction area)
 */
export function computeFeedbackWeights(
  feedback: FeedbackRecord[],
  pairs: TestPair[],
): FeedbackWeights {
  if (feedback.length === 0) {
    return {
      weights: pairs.map(p => ({ pair_id: p.id, weight: 1.0, reason: "no feedback data" })),
      total_feedback_records: 0,
      negative_signal_count: 0,
      generated_at: new Date().toISOString(),
    };
  }

  // Only consider recent feedback (last 30 days)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = feedback.filter(f => new Date(f.created_at).getTime() > cutoff);

  // Count signals per persona
  const personaSignals = new Map<string, { negative: number; positive: number }>();
  // Count signals per domain
  const domainSignals = new Map<string, { negative: number; positive: number }>();

  let negativeCount = 0;

  for (const f of recent) {
    const isNegative = f.classified_signal === "escalate" || f.classified_signal === "cloud_gap";
    const isPositive = f.classified_signal === "de_escalate";

    if (isNegative) negativeCount++;

    // Persona aggregation
    if (f.persona) {
      const key = f.persona.toLowerCase();
      if (!personaSignals.has(key)) personaSignals.set(key, { negative: 0, positive: 0 });
      const ps = personaSignals.get(key)!;
      if (isNegative) ps.negative++;
      if (isPositive) ps.positive++;
    }

    // Domain aggregation
    if (f.domain) {
      const key = f.domain.toLowerCase();
      if (!domainSignals.has(key)) domainSignals.set(key, { negative: 0, positive: 0 });
      const ds = domainSignals.get(key)!;
      if (isNegative) ds.negative++;
      if (isPositive) ds.positive++;
    }
  }

  // Compute per-pair weights
  const weights: PairWeight[] = pairs.map(pair => {
    let weight = 1.0;
    const reasons: string[] = [];

    // Persona match
    const pairPersona = pair.persona?.toLowerCase();
    if (pairPersona && personaSignals.has(pairPersona)) {
      const ps = personaSignals.get(pairPersona)!;
      if (ps.negative > 0) {
        // Each negative signal adds 0.3 weight, capped at 3.0
        const boost = Math.min(ps.negative * 0.3, 2.0);
        weight += boost;
        reasons.push(`persona "${pairPersona}": ${ps.negative} negative signals (+${boost.toFixed(1)})`);
      }
      if (ps.positive > ps.negative) {
        // Net positive = reduce weight slightly
        weight = Math.max(0.5, weight - 0.3);
        reasons.push(`persona "${pairPersona}": net positive (-0.3)`);
      }
    }

    // Domain match (check if pair's JD requirements mention the domain)
    const pairText = pair.jd_requirements.join(" ").toLowerCase();
    for (const [domain, ds] of domainSignals) {
      if (pairText.includes(domain)) {
        if (ds.negative > 0) {
          const boost = Math.min(ds.negative * 0.2, 1.0);
          weight += boost;
          reasons.push(`domain "${domain}": ${ds.negative} negative signals (+${boost.toFixed(1)})`);
        }
      }
    }

    // Clamp
    weight = Math.max(0.5, Math.min(3.0, weight));

    return {
      pair_id: pair.id,
      weight,
      reason: reasons.length > 0 ? reasons.join("; ") : "no matching feedback",
    };
  });

  return {
    weights,
    total_feedback_records: recent.length,
    negative_signal_count: negativeCount,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Select a weighted training batch.
 * Higher-weight pairs are more likely to be selected.
 */
export function selectWeightedBatch(
  pairs: TestPair[],
  weights: FeedbackWeights,
  batchSize: number,
): TestPair[] {
  const trainPairs = pairs.filter(p => p.split === "train");
  if (trainPairs.length <= batchSize) return trainPairs;

  // Build weight lookup
  const weightMap = new Map<string, number>();
  for (const w of weights.weights) {
    weightMap.set(w.pair_id, w.weight);
  }

  // Weighted random selection (reservoir sampling with weights)
  const weighted = trainPairs.map(p => ({
    pair: p,
    // Random key weighted by pair weight — higher weight = more likely to have higher key
    key: Math.pow(Math.random(), 1.0 / (weightMap.get(p.id) ?? 1.0)),
  }));

  // Sort descending by key, take top batchSize
  weighted.sort((a, b) => b.key - a.key);
  return weighted.slice(0, batchSize).map(w => w.pair);
}
