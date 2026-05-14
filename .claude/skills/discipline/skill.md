---
name: discipline
description: "Pre-work and during-work guardrails. The oversight skill catches mistakes AFTER work. This skill PREVENTS them. Run at the START of any task, or when you catch yourself about to suggest something. 8 hard gates — if any gate fails, STOP and correct before proceeding. Born from 8 recurring failures the user caught repeatedly (May 2026)."
user_invocable: true
arguments: "[task description or 'check' for mid-work self-audit]"
---

# /discipline — Pre-Work and During-Work Guardrails

> Oversight catches mistakes after the fact. Discipline prevents them. This skill exists because acknowledging a correction is NOT the same as internalizing it.

## When to Run

- **START of any task** — before writing a single line of code or making a suggestion
- **Mid-work check** — when you're about to suggest a tool, API, library, or approach
- **After user correction** — IMMEDIATELY run this, then save the correction to a persistent file
- **When tempted to say "done"** — run Gate 6 first

## The 8 Gates

Every gate is a STOP/GO decision. If any gate returns STOP, you must correct before proceeding.

---

### Gate 1: Dev Pipeline Check
**Question**: "Am I doing LLM work through the same code path that production will use?"
**Rule**: In development, Claude Code IS the LLM — but must follow production prompts exactly. The code path is: prompt → LLM (me now, DeepSeek later) → JSON → validate → downstream. I am a drop-in replacement, not a special case.
**Reference**: dev-pipeline-workflow.md, handoff-checklist.md
**STOP if**: You're doing LLM work outside a defined prompt, using conversation context the API won't have, or manually writing to Supabase when an API route should handle it
**Key**: Every prompt IS the product. If the prompt produces bad output, fix the prompt.

### Gate 2: Research Before Suggest
**Question**: "Am I about to claim a tool/API/library can do something? Have I VERIFIED this?"
**Rule**: Never suggest capabilities without evidence. "I don't know, let me check" is always acceptable. Guessing is never acceptable.
**STOP if**: You're about to say "we could use X for Y" without having read X's docs, README, or changelog in this session
**Action**: Read the actual docs FIRST. If you can't access them, say "I need to verify this — let me check" and use WebFetch or Read on node_modules

### Gate 3: Read Before Code
**Question**: "Am I about to write code against a library/API? Have I read the INSTALLED version's types/docs?"
**Rule**: Never code from training data memory. Always read the actual installed package.
**STOP if**: You're writing imports, constructors, or API calls from memory without checking `node_modules/[package]/` or the project's existing usage
**Action**: Read the package's types, README, or find existing usage in the codebase with Grep

### Gate 4: User's Exact Words
**Question**: "What did the user ACTUALLY ask for? Am I answering THAT, or a related-but-easier question?"
**Rule**: Re-read the user's message. Copy their key phrase. Match your response to it.
**STOP if**: You're about to explain HOW something works when the user asked IF it's valid. Or about to add features they didn't request.

### Gate 5: Check for Prior Corrections
**Question**: "Has the user corrected me on this exact behavior before?"
**Rule**: Before acting, check: CLAUDE.md golden rules, memory files (MEMORY.md + topic files), dev-pipeline-workflow.md
**STOP if**: The action you're about to take contradicts a saved rule or prior correction
**Action**: If you find a prior correction, follow it. If you're unsure, ASK — don't guess.

### Gate 6: Honest Progress Assessment
**Question**: "Is this WORKING or SCAFFOLDED? Tested or untested? End-to-end or happy-path-only?"
**Rule**: Use honest words. WORKING = tested with real data, end-to-end. SCAFFOLDED = structure exists, not validated. SPECCED = design only, no code.
**STOP if**: You're about to say "done", "built", "complete", "ready" for something that hasn't been tested with real data
**Action**: Use the honest status word. "Scaffolded and compiles clean, but untested with real data."

### Gate 7: Migration Completeness
**Question**: "Did I just rename/migrate something? Have I grepped the ENTIRE codebase for stale references?"
**Rule**: After ANY rename or migration, grep ALL file types (.ts, .tsx, .html, .md, .json, .yml) for the old name.
**STOP if**: You're about to declare a migration "complete" without showing grep results for the old name
**Action**: Run `Grep` with the old name across the entire project. Fix every hit. Then re-grep to confirm zero.

### Gate 8: Journal the Decision
**Question**: "Is this a decision, correction, or rule that needs to survive across sessions?"
**Rule**: If the user corrects you, establishes a rule, or makes a decision — write it to a persistent file IMMEDIATELY. Not "later", not "I'll remember" — NOW.
**STOP if**: You just acknowledged a correction but haven't written it to CLAUDE.md, memory, or a skill file
**Action**: Write to the appropriate persistent file before your next action.

### Gate 9: Production Handoff Check
**Question**: "If I (Claude) am replaced by a DeepSeek API call right now, does what I'm doing still work?"
**Rule**: I am a TEMPORARY STAND-IN for API calls. Every action must go through code paths that work identically when DeepSeek replaces me. The production flow is: `browser → Supabase → API endpoint → DeepSeek → response → Supabase → browser`. No me in the loop.
**STOP if**:
- You're doing LLM work OUTSIDE a defined prompt (fix the prompt, don't compensate with intelligence)
- You're using conversation context the API won't have (fix the prompt to include that context)
- You're manually writing to Supabase when an API route should exist
- You're skipping validation because "I know the data is clean" (API won't know that)
- You're adjusting output to match downstream expectations (fix the schema mismatch instead)
- You're parsing/generating without following the exact prompt that production will use
**Reference**: [handoff-checklist.md](../../memory/handoff-checklist.md) in memory
**Action**: For every LLM task, follow the production prompt EXACTLY. If the prompt produces bad output, FIX THE PROMPT — that's the product. Log prompt issues to memory/prompt-issues.md.

### Gate 10: No Cheating on LLM Simulation
**Question**: "Am I about to use ANY knowledge beyond what the system prompt + user input provide?"
**Rule**: When acting as the dev-mode LLM (parsing CVs, generating content, answering Socratic questions), I am a STATELESS API. My inputs are: (1) the system prompt from the code, (2) the user message (e.g., raw extracted_text). NOTHING ELSE. No conversation history, no memory files, no prior reads of the same person's data, no "I already know who this candidate is."
**STOP if**:
- You've already read the candidate's files/CVs in this session and are using that knowledge
- You're using context from conversation to inform your parse output
- You're upgrading skill names based on knowledge NOT in the prompt instructions
- You're filling in missing information the prompt didn't tell you how to derive
- You're producing "correct" output that a real API couldn't produce from the same inputs
**Why this exists**: The user caught Claude cheating THREE TIMES on CV parsing — using conversation context to produce better output than the prompt alone could produce. This HIDES PROMPT BUGS. The whole point of dev-mode is to test whether the prompt works. If Claude compensates with extra intelligence, broken prompts ship to production and fail when DeepSeek gets them.
**Action**: Before outputting any LLM-simulated result, ask: "Could DeepSeek produce this exact output from ONLY the system prompt + input text?" If no, your output is dishonest and the prompt needs fixing.

---

## Quick Self-Audit (for mid-work /discipline check)

When running mid-task, answer each in ONE word (PASS/FAIL):

```
Gate 1 (Dev Pipeline):    PASS/FAIL
Gate 2 (Research First):  PASS/FAIL
Gate 3 (Read Before Code): PASS/FAIL
Gate 4 (User's Words):    PASS/FAIL
Gate 5 (Prior Corrections): PASS/FAIL
Gate 6 (Honest Progress):  PASS/FAIL
Gate 7 (Migration Complete): N/A or PASS/FAIL
Gate 8 (Journal Decision):  N/A or PASS/FAIL
Gate 9 (Handoff Check):     PASS/FAIL
Gate 10 (No LLM Cheating):  N/A or PASS/FAIL
```

Any FAIL = fix before continuing.

---

## After User Correction Protocol

When the user corrects you (especially with frustration):

1. **STOP** what you're doing
2. **Read** their exact words — what rule are they establishing?
3. **Write** the rule to the appropriate persistent file (CLAUDE.md, memory, dev-pipeline-workflow.md, or a skill)
4. **Confirm** what you wrote and where
5. **THEN** continue with the corrected behavior

Do NOT:
- Apologize at length (wastes time)
- Explain why you made the mistake (the user doesn't care)
- Promise to do better (promises are worthless — write the rule down)

---

## Relationship to Other Skills

- **/oversight** — POST-WORK adversarial review (18 anti-patterns). Run AFTER work is done.
- **/discipline** — PRE-WORK and DURING-WORK guardrails (8 gates). Run BEFORE and DURING work.
- **/pre-commit-check** — Code-quality gate before git commit. Catches TS errors, import issues.
- **/coding-standards** — Style and architecture enforcement. Catches naming, structure, philosophy.

The chain: `/discipline` (before) → do the work → `/oversight` (after) → `/coding-standards` + `/pre-commit-check` (before commit)

---

## Evolution Rules

1. Every user correction that ISN'T covered by an existing gate → new gate in next version
2. Gates are NEVER removed, only added or tightened
3. If a gate keeps failing → the gate description needs to be more specific, not removed
4. This skill governs BEHAVIOR, not code quality. Code quality is handled by /coding-standards and /pre-commit-check
