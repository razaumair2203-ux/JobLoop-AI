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
 * Select the next mutation type based on history.
 *
 * Strategy:
 *   - Round-robin through all 6 types
 *   - On plateau (10+ consecutive discards), force RESTRUCTURE
 *   - After plateau RESTRUCTURE, resume round-robin
 */
export function selectMutation(
  history: MutationRecord[],
  consecutiveDiscards: number,
): MutationInstruction {
  // Plateau detection: force RESTRUCTURE after 10 consecutive discards
  if (consecutiveDiscards >= 10) {
    return MUTATION_DIRECTIVES.RESTRUCTURE;
  }

  // Round-robin through mutation types
  const types: MutationType[] = [
    "ADD_CONSTRAINT",
    "ADD_NEGATIVE",
    "RESTRUCTURE",
    "TIGHTEN_LANGUAGE",
    "REMOVE_BLOAT",
    "ADD_COUNTEREXAMPLE",
  ];

  const lastType = history.length > 0
    ? history[history.length - 1].type
    : null;

  if (!lastType) return MUTATION_DIRECTIVES[types[0]];

  const lastIndex = types.indexOf(lastType);
  const nextIndex = (lastIndex + 1) % types.length;
  return MUTATION_DIRECTIVES[types[nextIndex]];
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
- Return the COMPLETE modified prompt (not a diff)
- Briefly describe what you changed and why in a single sentence`;
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
