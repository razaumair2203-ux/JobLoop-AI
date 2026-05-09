/**
 * AutoResearch Mutation Engine
 *
 * 6 explicit mutation operators for prompt optimization.
 * Each operator forces a specific type of structural change,
 * preventing the loop from cycling through minor variations.
 *
 * Based on: PromptBreeder (DeepMind 2023), autoresearch-validation.md §5
 */

export type MutationType =
  | "ADD_CONSTRAINT"
  | "ADD_NEGATIVE"
  | "RESTRUCTURE"
  | "TIGHTEN_LANGUAGE"
  | "REMOVE_BLOAT"
  | "ADD_COUNTEREXAMPLE";

export interface MutationRecord {
  type: MutationType;
  description: string;
  diff_summary: string;
  iteration: number;
  timestamp: string;
}

export interface MutationInstruction {
  type: MutationType;
  directive: string;
  examples: string[];
}

const MUTATION_DIRECTIVES: Record<MutationType, MutationInstruction> = {
  ADD_CONSTRAINT: {
    type: "ADD_CONSTRAINT",
    directive: "Add a specific rule or boundary condition to the prompt. This should prevent a class of errors observed in recent outputs.",
    examples: [
      "Add: 'Never list more than 8 skills per category'",
      "Add: 'Each bullet must contain at least one measurable outcome'",
      "Add: 'If the JD mentions a technology not in the Cloud, acknowledge the gap instead of fabricating experience'",
    ],
  },
  ADD_NEGATIVE: {
    type: "ADD_NEGATIVE",
    directive: "Add a 'do NOT do this' instruction with a concrete bad example. Target the most common failure pattern in recent scorecard results.",
    examples: [
      "Add: 'Do NOT invent metrics. Bad: \"Improved efficiency by 40%\" when no number exists in source. Good: \"Improved operational efficiency through process redesign\"'",
      "Add: 'Do NOT merge two separate roles into one entry'",
    ],
  },
  RESTRUCTURE: {
    type: "RESTRUCTURE",
    directive: "Reorganize the prompt's sections, reorder instructions, or change the flow. Do not add or remove content — only change the order and grouping.",
    examples: [
      "Move the output format section before the instructions (so the model knows the target shape before processing rules)",
      "Group all 'do not' rules into a dedicated constraints section at the end",
    ],
  },
  TIGHTEN_LANGUAGE: {
    type: "TIGHTEN_LANGUAGE",
    directive: "Replace vague or ambiguous instructions with precise, specific ones. Target instructions that use words like 'appropriate', 'relevant', 'good', 'ensure'.",
    examples: [
      "Change: 'Use appropriate action verbs' → 'Start every bullet with a past-tense action verb from this list: Led, Managed, Designed, Developed, Implemented, Delivered, Coordinated, Executed'",
      "Change: 'Ensure good coverage of requirements' → 'Address at least 70% of JD requirements. For each must-have requirement, include evidence from a specific role.'",
    ],
  },
  REMOVE_BLOAT: {
    type: "REMOVE_BLOAT",
    directive: "Delete redundant, repetitive, or low-value instructions. Target instructions that are implied by other rules or that the model would follow anyway.",
    examples: [
      "Remove: 'Write in professional language' (implied by the CV context)",
      "Remove duplicate instructions that say the same thing in different words",
    ],
  },
  ADD_COUNTEREXAMPLE: {
    type: "ADD_COUNTEREXAMPLE",
    directive: "Add an edge case example showing correct handling of a tricky situation. Pick from recent scorecard failures or known difficult inputs.",
    examples: [
      "Add example: Military career with 6 rotational postings under one employer — show correct consolidation",
      "Add example: JD requires 'AWS experience' but Cloud only has 'cloud infrastructure' — show how to bridge without fabricating",
    ],
  },
};

/**
 * Select the next mutation type based on history and effectiveness.
 *
 * Strategy:
 *   - First pass (< 6 iterations): round-robin to try each type once
 *   - After that: weight by keep rate (operators that produce KEEPs get more turns)
 *   - On plateau (10+ consecutive discards): force RESTRUCTURE
 *   - Minimum floor: every type gets at least 10% chance (exploration)
 *
 * Research basis: PromptBreeder (DeepMind 2024) tracks operator effectiveness.
 * Karpathy's original uses agent-driven selection guided by failures.
 * Our approach: deterministic weighted selection (no RNG, reproducible).
 */
export function selectMutation(
  history: MutationRecord[],
  consecutiveDiscards: number,
): MutationInstruction {
  const types: MutationType[] = [
    "ADD_CONSTRAINT",
    "ADD_NEGATIVE",
    "RESTRUCTURE",
    "TIGHTEN_LANGUAGE",
    "REMOVE_BLOAT",
    "ADD_COUNTEREXAMPLE",
  ];

  // Plateau detection: force RESTRUCTURE after 10 consecutive discards
  if (consecutiveDiscards >= 10) {
    return MUTATION_DIRECTIVES.RESTRUCTURE;
  }

  // First pass: round-robin to build baseline keep rates for each type
  if (history.length < types.length) {
    const usedTypes = new Set(history.map(h => h.type));
    const nextType = types.find(t => !usedTypes.has(t)) || types[0];
    return MUTATION_DIRECTIVES[nextType];
  }

  // After first pass: select the type with highest keep rate
  // that hasn't been used most recently (avoid repeating same type)
  const keepRates: Record<string, { kept: number; total: number }> = {};
  for (const t of types) {
    keepRates[t] = { kept: 0, total: 0 };
  }
  for (const record of history) {
    keepRates[record.type].total++;
    if (record.diff_summary === "KEPT") {
      keepRates[record.type].kept++;
    }
  }

  // Score each type: keep_rate + exploration bonus for under-tried types
  const avgTotal = history.length / types.length;
  const scored = types.map(t => {
    const { kept, total } = keepRates[t];
    const keepRate = total > 0 ? kept / total : 0.5; // Untried = optimistic 50%
    // Exploration: boost types that have been tried less than average
    const explorationBonus = total < avgTotal ? 0.1 : 0;
    return { type: t, score: keepRate + explorationBonus, total };
  });

  // Don't repeat the last used type
  const lastType = history[history.length - 1].type;
  const candidates = scored.filter(s => s.type !== lastType);

  // Pick highest score
  candidates.sort((a, b) => b.score - a.score);
  return MUTATION_DIRECTIVES[candidates[0].type];
}

/**
 * Build the mutation prompt for the AI agent.
 * This is injected into the agent's context alongside the current prompt
 * and recent scorecard results.
 */
export function buildMutationPrompt(
  instruction: MutationInstruction,
  currentPrompt: string,
  recentFailures: string[],
  iterationNumber: number,
): string {
  const failureContext = recentFailures.length > 0
    ? `\n\nRecent scorecard failures to address:\n${recentFailures.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
    : "";

  return `# Mutation Task (Iteration ${iterationNumber})

## Mutation Type: ${instruction.type}

${instruction.directive}

## Examples of this mutation type:
${instruction.examples.map(e => `- ${e}`).join("\n")}
${failureContext}

## Current Prompt to Mutate:
\`\`\`
${currentPrompt}
\`\`\`

## Rules:
- Apply EXACTLY ONE mutation of type ${instruction.type}
- Do not change the prompt's input/output contract (same inputs, same output shape)
- Do not add comments like "// Added by AutoResearch" — the prompt should read naturally
- Return ONLY the complete modified prompt text — no preamble, no explanation, no description of changes
- Your entire response must be the prompt and nothing else`;
}

/**
 * Get mutation type statistics from history.
 */
export function getMutationStats(history: MutationRecord[]): Record<MutationType, { total: number; kept: number }> {
  const types: MutationType[] = [
    "ADD_CONSTRAINT", "ADD_NEGATIVE", "RESTRUCTURE",
    "TIGHTEN_LANGUAGE", "REMOVE_BLOAT", "ADD_COUNTEREXAMPLE",
  ];

  const stats: Record<string, { total: number; kept: number }> = {};
  for (const t of types) {
    stats[t] = { total: 0, kept: 0 };
  }

  for (const record of history) {
    stats[record.type].total++;
    // kept records are determined externally — this just counts attempts
  }

  return stats as Record<MutationType, { total: number; kept: number }>;
}

export { MUTATION_DIRECTIVES };
