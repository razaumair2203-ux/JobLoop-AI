# AutoResearch run-loop.ts — Design Validation Report
# Date: May 6, 2026
# Status: Architecture SOUND, Execution BROKEN in 3 critical areas

---

## What It Is

The AutoResearch `run-loop.ts` is the Karpathy keep/discard optimization loop:
1. Load test pairs (50 total: 20 train / 15 val / 15 held-out)
2. Load current prompt from prompts/*.ts
3. For each iteration:
   a. Pick mutation operator (6 types, round-robin + plateau-aware)
   b. LLM mutates the prompt
   c. LLM generates CVs with MUTATED prompt against 10 random pairs
   d. LLM generates CVs with CURRENT prompt against SAME 10 pairs
   e. Score both with 8-check scorecard
   f. If mutant beats incumbent → KEEP, else → DISCARD
4. After loop: ANOVA pre-test on held-out + 6 safeguard checks
5. If --deploy + safeguards pass → overwrite prompt .ts file

---

## VALIDATED: Design Choices That Are Correct

1. Binary keep/discard (Karpathy-faithful)
2. Same batch for challenger AND incumbent (fair comparison)
3. 20/15/15 train/val/held-out split (standard ML)
4. Scorecard is deterministic code (no LLM judge circularity)
5. 6 safeguards gate deployment (prevents regression)
6. TSV + JSON logging (full audit trail)
7. Prompt version history (rollback possible)
8. Feedback weighting (user signals boost relevant pairs)
9. Plateau detection (10 consecutive discards → force RESTRUCTURE)
10. Validation every 10th iteration (catch overfitting)

---

## CONFIRMED BROKEN: 3 Critical Flaws

### Flaw 1: Mock Makes Loop Non-Functional (lines 179-235)

```typescript
// Line 183: If no API key → mock
if (!apiKey) {
  return mockLLMResponse(systemPrompt, userPrompt);
}

// Line 226-234: Mock returns empty CV
return {
  text: JSON.stringify({
    summary: "Mock CV summary for dev mode testing",
    experience: [],
    skills: {},
    certifications: [],
  }),
};
```

**Impact:** Empty CV → ALL scorecard checks fail identically for both mutant and incumbent → always discard → zero learning. Confirmed by state.json showing 5 iterations, all discarded, identical scores.

**Fix needed:** Replace with Claude CLI call (`claude --print --model haiku`)

---

### Flaw 2: Test Pair Input Doesn't Match Production (lines 241-254)

**What AutoResearch gives the prompt:**
```
cloud_skills: ["Python", "AWS", "Leadership"]     ← flat string list
jd_requirements: ["5+ years Python", "AWS cert"]  ← flat string list
```

**What production gives the prompt:**
```
Full ProfileCloud: {
  nodes: [{ name: "Python", depth: "proficient", evidence: [...], duration_months: 48 }],
  domains: [...],
  trajectory: [...]
}
ParsedJD: { requirements: { hard: [...], preferred: [...] }, technologies: [...], seniority: "senior" }
CloudMatchReport: { requirements: [{ text: "...", verdict: "strong_evidence", evidence_detail: [...] }] }
Persona: "military"
```

**Impact:** Prompt gets optimized for simplified input. Improvements found in AutoResearch might not transfer to production where input is 10x richer. Optimizing for wrong interface.

**Fix needed:** Test pairs must contain real Cloud structure + real ParsedJD + real match report — same shape the prompt receives in production (`generate-cv.ts` line 75).

---

### Flaw 3: Only 2 Targets Supported (line 33 of loop-runner.ts)

```typescript
export type TargetPrompt = "cv-generation" | "jd-parser";
```

**Impact:** Can't optimize cv-parser, socratic, or cover-letter. 3 of 5 agents locked out.

**Fix needed:** Expand type union + add target-specific `generateOutput()` and scorecard routing.

---

## CONFIRMED: Secondary Issues

4. **Mutation response used raw** (line 392) — no validation that LLM returned a valid prompt vs explanation/refusal
5. **No caching** — same prompt+pair generates CV again each run (wasteful)
6. **No crash recovery** — if loop dies at iteration 15, restarts from 0
7. **No parallel generation** — sequential CV generation (slow)
8. **No cost tracking** — no token accounting
9. **cloud_input = expected_output** (line 98 of run-loop.ts) — circular data

---

## Test Pair Quality (Validated)

Pair-001 (real data from boss's CV):
- Has full JD with 10 requirements, 8 responsibilities
- Has expected_output with real roles, real bullets, real dates
- Has sensitivity info (platform name sanitization rules)
- Has persona ("military")
- MISSING: actual Cloud structure, match report, evidence depth

Pairs 005-050 (synthetic):
- Well-structured JDs with requirements/responsibilities
- Expected outputs are Claude-generated (medium circularity)
- No real Cloud data (same flat list problem)

---

## Conclusion

The LOOP LOGIC is architecturally correct and Karpathy-faithful.
The EXECUTION is broken in 3 ways that make it produce zero value.
All 3 fixes are needed before the loop can improve any agent.
