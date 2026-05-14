#!/usr/bin/env node
/**
 * LLM Isolation Guard — PreToolUse hook on Bash
 *
 * Fires when Claude fetches CV/extracted_text data from Supabase via Bash.
 * Injects a visible warning: the next step MUST be spawning an Agent tool,
 * not processing the data inline in the conversation.
 *
 * Enforces: CLAUDE.md "LLM Simulation (HARD RULE)" + /discipline Gate 10
 *
 * Does NOT block the fetch — only warns. Blocking would prevent legitimate
 * data retrieval. The guard is a speed bump, not a hard gate.
 */

process.stdin.resume();
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const cmd = input.tool_input?.command || "";

    // Detect: fetching from Supabase AND the data is LLM task input
    const isSupabaseFetch =
      cmd.includes("supabase") ||
      cmd.includes("rest/v1") ||
      cmd.includes("SB_URL") ||
      cmd.includes("SB_KEY") ||
      cmd.includes("koyqjfatxreyaaynflrn");

    const isLLMTaskData = [
      "extracted_text",
      "pending_parse",
    ].some((pattern) => cmd.includes(pattern));

    if (isSupabaseFetch && isLLMTaskData) {
      const warning = [
        "",
        "=== LLM-ISOLATION GUARD (Gate 10) ===",
        "Detected: Supabase fetch of extracted_text / LLM task input.",
        "",
        "REQUIRED next step:",
        "  1. Read CV_PARSER_SYSTEM_PROMPT from packages/ai/src/prompts/cv-parser.ts",
        "  2. Spawn Agent tool with ONLY: system_prompt + extracted_text",
        "  3. Zero conversation context in the Agent prompt",
        "",
        "FORBIDDEN:",
        "  - Processing this data inline in the conversation",
        "  - Using any prior knowledge of the candidate",
        "  - 'Improving' the subagent output manually",
        "",
        "Gate 10 test: Could DeepSeek produce the same output from prompt alone?",
        "  If no -> the PROMPT is broken. Fix the prompt, not the output.",
        "======================================",
        "",
      ].join("\n");

      const response = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          additionalContext: warning,
        },
      };

      process.stdout.write(JSON.stringify(response));
    }
    // If no match: exit 0 silently — allow the tool call
  } catch {
    // Never block on hook errors — fail open
  }

  process.exit(0);
});
