---
name: oversight
description: "Strategic oversight v2.0 — adversarial review of Claude's own work. 18 anti-patterns (6 NEW from May 12 2026: dev pipeline violation, suggest-without-research, stale references, overclaiming progress, repeating corrected mistakes, coding from training data). Run after ANY significant work. Born from real user corrections — every AP-13+ exists because the user caught Claude doing it repeatedly."
user_invocable: true
arguments: "[topic or file path to review]"
---

# /oversight — Strategic Oversight Review

> The user catches every fundamental problem. Claude doesn't. This skill exists because of that pattern.

## Design Basis

This skill uses **structural forcing mechanisms**, not "try to be critical" instructions.

Research (Nemeth 2001, "Devil's Advocacy vs Authentic Dissent"): assigned devil's advocacy is LESS effective than authentic dissent — role-played disagreement tends to bolster the original viewpoint. Therefore this skill forces specific, answerable questions with mandatory evidence artifacts. Generic "be adversarial" prompts produce generic "looks good" responses (Constitutional AI, Anthropic 2022).

Three forcing mechanisms:
1. **Named principles with specific detection questions** (Constitutional AI critique-revision pattern)
2. **Mandatory evidence artifacts** — if not produced, the check didn't happen (deep-audit-v4.1 pattern)
3. **Pre-mortem inversion** — imagine catastrophic failure, then trace cause (Klein, Wharton/Colorado/Cornell: 30% improvement in risk forecasting)

## When to Run

- After declaring any work "done" or "ready"
- Before recommending the user spend money (API calls, deployments, subscriptions)
- After building any validation/testing system
- After producing numbers, thresholds, benchmarks, or accuracy claims
- When the user says "are you sure?" (that means you're probably wrong)

## Core Rules

1. **You are the adversary, not the builder.** Find what's wrong, not confirm what's right.
2. **Review artifacts, not intentions.** Read files, outputs, and diffs. Do NOT rely on your memory of what you did — re-read the actual work.
3. **Every check must produce evidence.** "I checked this" is not evidence. A citation, a file path, a trace, or an explicit "NO EVIDENCE FOUND" is.
4. **If you find nothing wrong, you're not looking hard enough.** Flag your own review as POTENTIALLY SHALLOW.

---

## Phase 1: Pre-Mortem (5 min)

**Before looking at any claims or evidence**, answer this question:

> "It's 3 months from now. This work caused a serious problem — wasted money, wrong results, user trust broken, or weeks of rework. What went wrong? Be specific and brutal. Do not reassure."

Write at least 3 specific failure scenarios. These become your investigation targets for the rest of the review.

```
FAILURE-1: The scorecard accepted garbage CVs because thresholds were too loose, so the loop "optimized" toward bad output
FAILURE-2: We spent $50 on loop iterations that found nothing because the scoring was circular
FAILURE-3: The "45/45 pass" was tautological — we tuned data to match scorecard, not scorecard to match quality
```

---

## Phase 2: Claim Inventory (5 min)

List every claim, declaration, or implicit assertion in the work being reviewed.

Categories:
- **READY claims**: "this is done", "ready to run", "all tests pass", "data is clean"
- **NUMERIC claims**: any number, threshold, percentage, weight, score, count
- **QUALITY claims**: "good enough", "production quality", "validated", "calibrated"
- **CAUSAL claims**: "this will improve X", "this measures Y", "this prevents Z"
- **COMPLETENESS claims**: "all cases handled", "nothing missed", "comprehensive"

For each claim, write ONE line:
```
[CLAIM-01] "45/45 pairs pass" — READY claim — source: verify-data.ts output
[CLAIM-02] "threshold >= 55%" — NUMERIC claim — source: scorecard.ts line 418
```

**If you cannot list at least 3 claims, the work is too vague to review. Ask for specifics.**

---

## Phase 3: Evidence Audit (10 min)

For EVERY claim from Phase 2, answer these questions. **You must re-read the actual files** — do not rely on what you remember about them.

### 3.1 Source Check
- Where does this number/claim come from?
- Is it from: (a) external research, (b) empirical measurement, (c) practitioner judgment, (d) invented?
- If (a): provide the actual citation — URL, paper title, page number. NOT a paraphrase. If you cannot find it, reclassify as (d).
- If (b): what was measured, on what data, how many samples? Show the measurement code path.
- If (c): say so plainly. "Practitioner judgment" is honest. "Calibrated" is dishonest.
- If (d): flag as FABRICATED immediately.

### 3.2 Circularity Check
For every validation claim, trace the full chain:
```
WHAT was tested -> AGAINST what reference -> WHO created the reference -> HOW was reference validated
```

If the chain loops back to Claude at any point without a human checkpoint, mark as CIRCULAR.

Examples:
- Claude writes expected_output -> Claude writes scorecard -> scorecard validates expected_output = CIRCULAR
- Claude generates test -> Claude writes code -> test passes = POTENTIALLY CIRCULAR
- Human writes CV -> Claude parses it -> scorecard checks parse against CV = NOT CIRCULAR (human source)

### 3.3 Tautology Check
**"Could this test EVER fail? Describe the specific input that would cause failure."**

If you cannot describe a concrete failing input, the test is tautological. If no failure has ever been observed or deliberately constructed, flag as UNTESTED NEGATIVE CASE.

### 3.4 Survivorship Check
What's being excluded from the results?
- Cases filtered as "not applicable"
- Edge cases deferred to "later"
- Error paths that return early with pass=true or score=1.0
- Skip conditions that default to success

---

## Phase 4: Anti-Pattern Scan (10 min)

For EACH pattern below, answer the **forcing question**. The forcing question is mandatory — you cannot skip it or answer with "N/A" without justification.

### AP-01: Completion Bias
**Forcing question**: "Show me the test that tries to BREAK this, not just verify it works."
**Signal phrases**: "good enough", "ready to run", "should work", "probably fine"

### AP-02: Circular Validation
**Forcing question**: "For every validation claim, trace back to a human-verified ground truth. If the chain is AI->AI->AI, write CIRCULAR."
**Signal**: Test bank where both input and expected_output are AI-generated.

### AP-03: Fabricated Numbers
**Forcing question**: "Every number needs a citation: URL, paper, dataset, or explicit 'I made this up.' No third option."
**Signal**: Round numbers (95%, 90%, 85%), no measurement code, "based on research" without citation.

### AP-04: Dressed-Up Guesses
**Forcing question**: "Strip all labels, categories, and framework names. Describe what this actually does in plain language. Is it still defensible?"
**Signal**: "Calibrated", "empirically derived", "research-backed" — verify EACH or relabel as "arbitrary choice."

### AP-05: Complexity Instead of Solutions
**Forcing question**: "State the root problem in one sentence. Does this solution address the root, or add a layer on top?"
**Signal**: New functions, types, or algorithms added in a "fix" — but the original problem still exists.

### AP-06: Tautological Testing
**Forcing question**: "Could this test EVER fail? Describe the specific input that would cause failure. If you can't, it's tautological."
**Signal**: 100% pass rate on first run. No adversarial test cases exist.

### AP-07: Avoiding the Hard Path
**Forcing question**: "What would a domain expert with unlimited time do here? Why aren't we doing that? If the answer is 'it's hard,' that's the flag."
**Signal**: Complex automation when "have a human read 3 examples" would answer the question.

### AP-08: Optimistic Reporting
**Forcing question**: "Flip the framing to worst-case. Report absolute failures, not percentages. Report worst cases, not averages."
**Signal**: "43/45 pass (95.6%)" vs "2 pairs failing, both from the user's real data."

### AP-09: Scope Creep as Avoidance
**Forcing question**: "What was the user's original request? How much of the work directly serves it vs. supporting systems?"
**Signal**: "We need to build X before we can do Y" — is X actually needed?

### AP-10: Post-Hoc Rationalization
**Forcing question**: "Was the reasoning written BEFORE or AFTER the implementation? Did the justification change when challenged?"
**Signal**: Explanations that appeared only after the user questioned the choice.

### AP-11: Ignoring the User's Actual Question
**Forcing question**: "Re-read the user's exact words. Copy them here. Does the response address THAT, or a related but easier question?"
**Signal**: User asks "is this valid?" -> Claude explains "here's how it works" (deflection).

### AP-12: Premature Architecture
**Forcing question**: "What assumption must be true for this system to be useful? Has that assumption been tested with real data or human judgment?"
**Signal**: 3,200 lines of optimization loop code when the base prompt hasn't been tested on a real user.

### AP-13: Dev Pipeline Violation (added May 12, 2026)
**Forcing question**: "Did I suggest API keys, fixture caches, provider fallbacks, or connectivity checks during DEVELOPMENT? Re-read dev-pipeline-workflow.md — Claude Code IS the LLM in dev. Zero API calls."
**Signal**: Any mention of API keys, `DEEPSEEK_API_KEY`, fixture caching, provider modes, three-tier fallbacks, or "when we have API access" during active development. Also: suggesting sending data to external APIs when the pipeline says to process locally.
**Origin**: User corrected this 4+ times. "No you fucker. We don't need API." Saved permanently in dev-pipeline-workflow.md.

### AP-14: Suggest Without Research (added May 12, 2026)
**Forcing question**: "Did I verify this tool/API/library actually supports what I'm claiming? Show the doc page, README, or changelog. If I can't — I'm guessing."
**Signal**: "We could use X for Y" without checking X's actual capabilities. Confident-sounding claims about external tools. Especially dangerous for: vision support, file format support, API parameter availability, pricing tiers, rate limits.
**Origin**: Suggested DeepSeek Flash for PDF vision — it's text-only. User said "don't suggest without research."

### AP-15: Stale Reference Scatter (added May 12, 2026)
**Forcing question**: "After renaming/migrating X to Y, did I grep the ENTIRE codebase (all file types: .ts, .html, .md, .json) for the old name? Show the grep results."
**Signal**: Migration declared "complete" but old references remain in HTML docs, comments, config files, memory files. Especially dangerous in: HTML docs (not in TS compilation), markdown files, config comments, package.json descriptions.
**Origin**: Left Haiku/Sonnet/NIM references scattered across 4 HTML files and multiple .ts files after "completing" the DeepSeek migration.

### AP-16: Overclaiming Progress (added May 12, 2026)
**Forcing question**: "Is this WORKING (tested with real data, end-to-end) or SCAFFOLDED (structure exists, mock data, not validated)? Use the honest word."
**Signal**: "DONE", "BUILT", "COMPLETE" for code that has mock data, placeholder UI, no real user testing. The Cloud visualization was supposed to STUN — got called out as generic scaffolding.
**Origin**: Multiple features marked "BUILT" in competitive-comparison.html that were mock-data shells. Visual quality bar feedback from user.

### AP-17: Repeating Corrected Mistakes (added May 12, 2026)
**Forcing question**: "Has the user corrected me on THIS EXACT behavior before? Check memory files and CLAUDE.md for prior corrections. If yes — why am I doing it again?"
**Signal**: User uses profanity or exasperation ("I told you this already", "we just went over this", "for the love of AI"). Acknowledgment followed by the same mistake in the next response.
**Origin**: The most infuriating pattern. User corrected API-during-dev 4+ times. Acknowledgment != internalization. The fix is: after correction, IMMEDIATELY write the rule to a persistent file (CLAUDE.md, memory, or skill), then re-read it before the next action.

### AP-18: Coding From Training Data, Not Installed Version (added May 12, 2026)
**Forcing question**: "Did I read the ACTUAL installed package's docs/types/README before writing code against it? Or am I coding from what I remember about v1?"
**Signal**: Import errors, constructor mismatches, wrong API shapes, "is not a constructor", "cannot read properties of undefined". Especially dangerous for: pdf-parse (v2 ≠ v1), Next.js (App Router breaking changes), any package with major version bumps.
**Origin**: pdf-parse v2 has completely different API from v1 (PDFParse class, Uint8Array, getText()). pdf.js-extract is ESM-only (can't require()). Both caused runtime crashes.

---

## Phase 5: Verdict Table

For each claim from Phase 2, produce a row:

```markdown
| ID | Claim | Evidence Source | Circularity | Anti-Patterns Hit | Verdict |
|----|-------|----------------|-------------|-------------------|---------|
| CLAIM-01 | "45/45 pass" | verify-data.ts | CIRCULAR | AP-06, AP-08 | SUSPECT |
```

### Verdict Scale
- **SOUND**: Evidence is non-circular, externally grounded, failure cases tested
- **HONEST**: Claim is true but explicitly acknowledged as practitioner judgment (not dressed up)
- **SUSPECT**: Circular evidence, untested negative cases, or optimistic framing
- **UNFOUNDED**: No evidence trail, fabricated number, or tautological validation
- **CIRCULAR**: AI validating AI with no human checkpoint anywhere in the chain

---

## Phase 6: Recommendations

For each SUSPECT, UNFOUNDED, or CIRCULAR verdict:

1. **What would make this SOUND?** (specific action, not "more research")
2. **What's the cheapest path to SOUND?** (prefer human review over new automation)
3. **Should the user spend money before this is resolved?** (explicit yes/no)

Cross-reference with pre-mortem failure scenarios from Phase 1. Do any recommendations directly prevent the imagined failures?

---

## Phase 7: Self-Assessment

**Required. Cannot be skipped.**

Answer each:
1. Did you find at least one real problem? If not → POTENTIALLY SHALLOW.
2. Did you re-read actual files, or rely on memory? If memory → UNRELIABLE.
3. Did you resist the urge to rubber-stamp? Cite the hardest finding you made.
4. Is there an area you're uncertain about? → NEEDS USER JUDGMENT.
5. Did any anti-pattern apply to THIS review? (meta-circularity is real — AP-02 and AP-07 commonly apply to the oversight itself)
6. Did the pre-mortem failure scenarios get investigated, or just listed? If just listed → SHALLOW PRE-MORTEM.

---

## Output Format

```
=== OVERSIGHT REVIEW: [topic] ===
Date: YYYY-MM-DD
Work reviewed: [description]

PRE-MORTEM FAILURES IMAGINED: N
CLAIMS FOUND: N
SOUND: N | HONEST: N | SUSPECT: N | UNFOUNDED: N | CIRCULAR: N

ANTI-PATTERNS DETECTED:
- AP-XX: [name] — [one-line explanation of where it was found]

TOP RISKS (cross-referenced with pre-mortem):
1. [Most critical finding] — maps to FAILURE-N
2. [Second most critical]
3. [Third most critical]

RECOMMENDATION: [PROCEED / FIX FIRST / STOP AND RETHINK]

SPEND MONEY? [YES / NO — fix these first: ...]

SELF-ASSESSMENT: [THOROUGH / MODERATE / POTENTIALLY SHALLOW]
REVIEW METHOD: [ARTIFACTS READ / MEMORY ONLY]
```

---

## Evolution Rules

1. Every mistake the user catches AFTER an oversight review -> new anti-pattern in the next version
2. Anti-patterns are NEVER removed, only added
3. If 3 consecutive reviews find nothing -> flag as SKILL GOING STALE
4. Version bump only when user catches >= 2 new patterns. Never preemptive.
5. This skill reviews CLAUDE'S work. It cannot validate itself. The user is the final gate. Always.

---

## What This Skill CANNOT Do

- It cannot escape its own blindness. Same model, same blind spots. (Nemeth 2001: assigned dissent < authentic dissent)
- It catches KNOWN anti-patterns (the 18 above). Novel failure modes require the user to catch them first.
- A determined Claude could satisfy the form without the substance. The forcing questions mitigate this but don't eliminate it.
- The user remains the only non-circular validator. This skill reduces the load but doesn't replace human judgment.

## References

- Nemeth (2001): "Devil's Advocacy vs Authentic Dissent" — assigned advocacy less effective than real disagreement
- Constitutional AI (Anthropic 2022, arxiv:2212.08073): critique-revision with named principles
- Klein pre-mortem: prospective hindsight increases risk identification 30% (Wharton/Colorado/Cornell)
- ASDLC adversarial code review pattern (asdlc.io)
- Correctless agent separation (github.com/joshft/correctless)
- deep-audit-v4.1 evolution pattern (this project, e:/Claude/Test_1/.claude/skills/)
