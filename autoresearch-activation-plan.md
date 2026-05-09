# AutoResearch Activation Plan — Alpha Phase (May 7-20)

## Status: Built but DORMANT. Zero production iterations.

## Why Activate NOW
Boss is User #1 for 2-3 weeks. Real JDs, real CVs, real quality judgement.
Every "this CV is wrong" → feedback that can drive prompt mutations.
By launch (May 30), prompts should be v3-v5, not v000.

---

## Phase 1: Run Baseline (Day 1 — May 7)

```bash
# Score current prompts against all 50 pairs
npx tsx packages/ai/src/autoresearch/run-baseline-scoring.ts

# Check ANOVA pretest (verify scorecard has signal)
npx tsx packages/ai/src/autoresearch/anova-pretest.ts
```

Expected: ~60% pass rate on training set. ANOVA F=19.68 confirms signal.

---

## Phase 2: Run First Optimization (Day 2-3)

```bash
# Run 20 iterations on cv-generation prompt
# Requires ANTHROPIC_API_KEY in .env
npx tsx packages/ai/src/autoresearch/run-loop.ts \
  --target cv-generation \
  --iterations 20 \
  --deploy \
  --pretest
```

This will:
1. Load 50 test pairs
2. Mutate cv-generation prompt (6 operators)
3. Score each mutation against 10-pair minibatch
4. Keep improvements, discard regressions
5. Run safeguards before deploy
6. If safe: overwrite packages/ai/src/prompts/cv-generation.ts

---

## Phase 3: Seed JD Parser Test Pairs (Day 3-5)

Currently 0 test pairs for JD parsing. Need ~20.

Source: Real JDs boss pastes during alpha testing.
Format per pair:
```json
{
  "id": "jd-pair-001",
  "split": "train",
  "persona": "military",
  "jd_text": "raw pasted JD text",
  "expected_output": {
    "title": "...",
    "company": "...",
    "requirements": { "hard": [...], "soft": [...] },
    "technologies_mentioned": [...],
    "experience_years": 5,
    "location": "..."
  }
}
```

Action: After boss tests 10-15 JDs, extract the JD text + manually verify/correct the parse output → save as test pairs.

---

## Phase 4: Wire Feedback During Alpha (Day 5-10)

When boss says "this CV sucks" or "this match is wrong":
1. Classify feedback (feedback-classifier.ts already exists)
2. Store in user_feedback table
3. feedback-weighter.ts picks up signals
4. Next loop run prioritizes similar pair types

Manual shortcut for alpha: boss rates each generated CV 1-5 in a simple JSON log.
This feeds directly into feedback weighting.

---

## Phase 5: Nightly Automation (Day 10+)

Option A: Windows Task Scheduler
```
schtasks /create /tn "AutoResearch" /tr "cd e:\AIloop&JobSpec && npx tsx packages/ai/src/autoresearch/cron-entry.ts" /sc daily /st 03:00
```

Option B: GitHub Actions (post-push or scheduled)
```yaml
on:
  schedule:
    - cron: '0 3 * * *'  # 3am daily
jobs:
  autoresearch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx tsx packages/ai/src/autoresearch/cron-entry.ts
```

Option C: Trigger.dev (already in tech stack)
- Create scheduled task in Trigger.dev dashboard
- Runs cron-entry.ts, logs results

---

## Prompts That SHOULD Be Optimized (Priority Order)

### P0: cv-generation.ts (READY NOW)
- 50 pairs exist
- Scorecard validated
- THIS IS THE PRODUCT — every improvement directly = better user outcomes
- Target: v000 → v005 by May 20

### P1: jd-parser.ts (READY AFTER 20 JD PAIRS)
- Scorecard written (7 checks)
- Needs real JD test pairs from alpha testing
- Bad JD parse → wrong match → wrong CV emphasis
- Target: Create pairs by May 15, optimize by May 20

### P2: cv-parser.ts (NEEDS NEW SCORECARD)
- Foundation of everything
- Needs: test pairs (raw PDF text → expected ParsedCVOutput)
- Needs: new scorecard checks (role extraction accuracy, date accuracy, skill extraction)
- Could use boss's 5 alpha CVs + ground-truth-profile.json as seed
- Target: Define scorecard by May 12, 5 test pairs from alpha CVs

### P3: socratic.ts (NEEDS DESIGN WORK)
- Question quality = onboarding conversion
- Needs: new scorecard (question relevance, specificity, persona-appropriateness)
- Needs: test pairs (Cloud state + expected question characteristics)
- Challenge: "good question" is subjective — need human evaluation criteria
- Target: Phase 2 (post-launch)

### P4: cover-letter.ts (LOW PRIORITY)
- Revenue feature but not core differentiator
- Can piggyback on cv-generation improvements
- Target: June (post-launch)

---

## What Changes in Production After Activation

Before: Static prompts, hand-tuned once, never improved
After: Prompts evolve nightly, bounded by 6 safeguards

```
Day 1:  cv-generation v000 (hand-written, ~60% pass)
Day 5:  cv-generation v003 (3 successful mutations, ~72% pass)
Day 10: cv-generation v005 (plateau detection kicks in, ~78% pass)
Day 15: Prompts stabilize, nightly runs produce no improvements
Day 20: LAUNCH with battle-tested v005+ prompts
```

The prompts your users see on May 30 should be the FIFTH generation,
not the first draft you wrote in April.

---

## Cost of Running AutoResearch

Per iteration: 1 Haiku call (mutation) + 10 Sonnet calls (generate CVs for 10-pair batch)
= ~$0.25 per iteration

20 iterations/night = ~$5/night
14 nights of alpha = ~$70 total

$70 to go from v000→v005 prompts. Worth it.

---

## Key Insight

AutoResearch exists to prove your CLAIM that "prompts are the product."
If prompts are the product, they need the same CI/CD rigor as code.
Right now, prompts have zero automated quality gates.
That's like shipping code without tests.

Activate the loop. Let it run during alpha. Ship optimized prompts on May 30.
