# 5-Agent Architecture: Where We ARE vs Where We NEED TO BE

## The Pipeline (Correct Order)

```
AGENT 1 (CV Parser) → AGENT 2 (Socratic) → CLOUD → AGENT 3 (JD Parser) → AGENT 4 (CV+CL Generator)
```

---

## AGENT 1: CV Parser

### WHERE WE ARE (Level 3/10)
- Prompt: DONE (300+ lines, production-quality, handles messy text)
- Code: packages/ai/src/prompts/cv-parser.ts
- Output schema: ParsedCVOutput (fully typed, 20+ fields)
- Handles: character spacing, multi-column, encoding, bullet chars
- Tested on: 5 alpha CVs (boss's real CVs) — works
- Called by: analyze.ts (parseCV function) via provider.ts
- Model: Claude Haiku in production, fixture in dev

### WHERE WE NEED TO BE (Level 10/10)
- AutoResearch loop running with its own scorecard
- Scorecard checks: role extraction accuracy, date parsing, skill completeness, format resilience, bullet quality, no information loss
- Test pairs: 20+ (raw CV text → expected ParsedCVOutput)
  - Source: boss's 5 CVs + wife's CV + 14 synthetic diverse formats
  - Format diversity: single-column, two-column, academic, creative, international, military
- Optimizing independently via local LLM (Ollama)
- Versioned: cv-parser-v000 → v001 → v005+
- HARD challenge: measuring "did it extract everything?" requires human-verified ground truth

### GAP (what's missing)
1. Scorecard (0 lines written for cv-parser specifically — only cv-generation and jd-parser exist in scorecard.ts)
2. Test pairs (0 for cv-parser — the 50 existing pairs are for cv-generation)
3. AutoResearch target not wired (run-loop.ts only supports "cv-generation" | "jd-parser")
4. No format diversity testing (only tested on boss's 5 CVs, all similar format)
5. No measurement of information loss (how many bullets/skills/certs were dropped?)

---

## AGENT 2: Socratic Engine

### WHERE WE ARE (Level 4/10)
- Prompt: DONE (25 lines, basic but functional)
- Code: packages/ai/src/prompts/socratic.ts + packages/ai/src/socratic.ts (500+ lines)
- Features built: 3-gate system (relevance × evidence gap × marginal value), conflict detection, skill matching (fixed), contradiction detection (fixed), Phase 1 (conflict) + Phase 2 (enrichment), dynamic model selection, hard cap (6+5 questions)
- Integration: socratic.ts generates questions, answer-parser.ts parses responses
- Dev mode: fixture-based answers for testing

### WHERE WE NEED TO BE (Level 10/10)
- AutoResearch loop optimizing question quality
- Scorecard checks: question specificity, answerable in 1-3 sentences, not yes/no, fills the stated gap, appropriate for persona, doesn't repeat prior answers
- Test pairs: 20+ (Cloud state + gap info → expected question characteristics)
  - NOT "expected exact question" (too brittle) but expected PROPERTIES
- Measures: Does the answer actually enrich the Cloud? (requires before/after comparison)
- Separate optimization for: conflict questions (Phase 1) vs enrichment questions (Phase 2)
- HARD challenge: "good question" is subjective — needs property-based scoring not exact-match

### GAP (what's missing)
1. Scorecard (nothing exists — question quality is unmeasured)
2. Test pairs (0 — no examples of "Cloud state X should produce question with properties Y")
3. AutoResearch target not wired (not in run-loop.ts type union)
4. No before/after Cloud measurement (did the answer actually make the Cloud better?)
5. The prompt itself is THIN (25 lines vs cv-parser's 300+) — needs more constraints, examples, negative patterns

---

## AGENT 3: JD Parser

### WHERE WE ARE (Level 5/10)
- Prompt: DONE (69 lines, well-structured output schema)
- Code: packages/ai/src/prompts/jd-parser.ts
- Output: Structured ParsedJD (company, title, seniority, location, requirements hard/preferred, technologies, team info, compensation, red flags)
- Scorecard: DESIGNED (7 checks exist in scorecard.ts — title match, company match, location, requirements coverage, experience years, responsibilities, technology extraction)
- AutoResearch: TARGET EXISTS in cron-entry.ts type union ("cv-generation" | "jd-parser")
- Model: Haiku in production, fixture in dev

### WHERE WE NEED TO BE (Level 10/10)
- 20+ test pairs from REAL JDs (boss's alpha testing)
- AutoResearch loop grinding against 7-check scorecard
- Test diversity: tech JDs, military JDs, medical JDs, vague startup JDs, enterprise JDs, remote-only, government with clearance
- Handles: all input formats (text paste now, URL scrape + PDF later)
- CRITICAL: When JD parser is wrong, CV generator aims at wrong target

### GAP (what's missing)
1. Test pairs: 0 (scorecard exists but nothing to score against)
2. Loop not yet run (needs pairs first)
3. Input format limited (text paste only — URL scraping and PDF upload not built)
4. No real-world validation (never tested against diverse JD formats from actual job boards)

---

## AGENT 4: CV + Cover Letter Generator

### WHERE WE ARE (Level 7/10) ← MOST MATURE
- Prompt: DONE (cv-generation: 118+ lines, cover-letter: 80+ lines)
- Code: packages/ai/src/prompts/cv-generation.ts + cover-letter.ts
- Scorecard: DONE (8 checks, ANOVA-validated F=19.68, p=0.000009)
- Test pairs: 50 (20 train / 15 val / 15 held-out, 9 personas, 40+ industries)
- Baseline: SCORED (60% pass rate, bottleneck: metrics_preserved)
- AutoResearch: FULLY WIRED (run-loop.ts, cron-entry.ts, state tracking, mutation operators)
- 5 dev-mode iterations ran (useless without real LLM, but loop mechanically works)
- 6 mutation operators, 6 safeguards, plateau detection

### WHERE WE NEED TO BE (Level 10/10)
- Local LLM (Ollama) generating real outputs → loop actually improves
- metrics_preserved bottleneck fixed (prompt tuning OR scorecard recalibration)
- v005+ by launch (currently v000)
- Cover letter shares same loop infrastructure with its own scorecard
- Cover letter scorecard checks: tone adherence, evidence citation, word count (250-400), hook quality, company specificity
- Cover letter test pairs: 20+ (Cloud + JD → expected cover letter properties)

### GAP (what's missing)
1. Local LLM not wired (loop can't improve without real outputs)
2. Cover letter has NO scorecard, NO test pairs, NOT wired as target
3. metrics_preserved bottleneck unresolved
4. Still at v000 despite having full infrastructure

---

## SUMMARY: The Maturity Map

```
                    PROMPT  SCORECARD  TEST PAIRS  LOOP WIRED  BASELINE  LOCAL LLM
Agent 1 (CV Parse)    ██░░░    ░░░░░      ░░░░░      ░░░░░      ░░░░░     ░░░░░
Agent 2 (Socratic)    █░░░░    ░░░░░      ░░░░░      ░░░░░      ░░░░░     ░░░░░
Agent 3 (JD Parse)    ██░░░    ██░░░      ░░░░░      █░░░░      ░░░░░     ░░░░░
Agent 4 (CV+CL Gen)   ███░░    █████      █████      █████      ███░░     ░░░░░
                                                                           ↑
                                                              THIS BLOCKS EVERYTHING
```

---

## HOW TO GET THERE: The Path

### Phase 0: Unblock the Loop (IMMEDIATE — before any optimization can happen)

**Problem**: AutoResearch cannot improve anything without a real LLM generating outputs.
**Solution**: Wire Ollama as local LLM provider in run-loop.ts.

```
BEFORE: no API key → mockLLMResponse() → empty JSON → always discard
AFTER:  no API key → Ollama (llama3/mistral local) → real text → real scoring → real improvement
```

This is the SINGLE blocker. Until this is done, AutoResearch is decorative.

Effort: ~100 lines of code (Ollama HTTP API is simple: POST /api/generate)
Dependencies: Ollama installed locally (free, open source)

### Phase 1: Wire Remaining Agents (Week 1 of Alpha)

Once Ollama unblocks the loop:

**1a. CV Parser Agent**
- Write scorecard (6 checks: role_count_match, date_accuracy, skill_extraction, no_information_loss, format_resilience, bullet_quality)
- Create 5 test pairs from boss's alpha CVs (raw text → expected ParsedCVOutput already exists as fixtures)
- Add "cv-parser" to run-loop.ts TargetPrompt type union
- Run loop → parser improves

**1b. JD Parser Agent**
- Test pairs: Boss pastes 10 JDs during alpha → save raw + manually verify parse → pairs
- Loop already partially wired (just needs pairs to run)
- Run loop → parser improves

**1c. Socratic Agent**
- Write scorecard (property-based: is_specific, not_yes_no, fills_stated_gap, persona_appropriate, not_redundant)
- Create 10 test pairs from full-app-simulation data (Cloud state → expected question properties)
- Add "socratic" to run-loop.ts type union
- Run loop → questions improve

**1d. Cover Letter Agent**
- Write scorecard (tone_adherence, evidence_citation, word_count_250_400, hook_quality, company_specificity)
- Create 10 test pairs (Cloud + JD → expected properties, NOT exact text)
- Add "cover-letter" to run-loop.ts type union
- Run loop → cover letters improve

### Phase 2: All Agents Grinding in Parallel (Week 2-3 of Alpha)

```
Night 1:  cv-parser v000→v001, jd-parser v000→v001, cv-gen v000→v002, socratic v000→v001
Night 5:  cv-parser v003, jd-parser v002, cv-gen v004, socratic v002, cover-letter v001
Night 10: cv-parser v004, jd-parser v003, cv-gen v005, socratic v003, cover-letter v002
          ↑ plateau detection kicks in, improvements slow
Night 15: All agents stabilize. Prompts are battle-tested.
```

**Simultaneously, boss is testing:**
- Every real JD = new test pair for JD parser
- Every parse error = new test pair for CV parser
- Every bad question = signal for Socratic scorecard
- Every weak CV = signal for cv-gen (but loop is already improving it)

Human data FEEDS the loop. Loop GRINDS the optimization. Both in parallel.

### Phase 3: API Validation (Week 3, Pre-Launch)

Local LLM found improvements. Now validate with production model:
- Take winning prompts (v005+ from Ollama iterations)
- Run ONCE against Claude Sonnet/Haiku (API key)
- Confirm quality holds at production model level
- If yes → deploy
- If no → the local LLM was finding local-LLM-specific improvements, need to recalibrate

Cost: ~$2-5 total (one-time validation, not nightly)

### Phase 4: Nightly Production Runs (Post-Launch, June+)

Switch from Ollama to Haiku for nightly runs:
- Higher quality mutations
- $5/night budget
- Prompts keep improving from real user feedback (Outcome Intelligence feeds new pairs)
- Loop never stops

---

## THE PATH IN ONE SENTENCE

Wire Ollama → build 4 missing scorecards → create test pairs from alpha testing → all 5 agents grind in parallel → ship v005+ prompts on May 30.

---

## COST SUMMARY

| Phase | Cost | Duration |
|-------|------|----------|
| Phase 0 (wire Ollama) | $0 | 1 day of coding |
| Phase 1 (wire agents) | $0 | 3-5 days of coding |
| Phase 2 (grinding) | $0 (local) | 10-15 nights running |
| Phase 3 (validate) | $2-5 | 1 day |
| Phase 4 (production) | $5/night | Ongoing |

Total cost to go from v000→v005+ across ALL agents: **under $10**.
Total time: **15-20 days** (fits exactly in alpha window May 7-25).
