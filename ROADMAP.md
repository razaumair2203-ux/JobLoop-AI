# JobLoop AI — Product Roadmap
# Architecture: 5-Agent Self-Improving Pipeline
# Status: CLEAN (dead code removed, May 6 2026)
# Deadline: May 30, 2026 — LAUNCH

---

## Architecture Summary

```
Agent 1 (CV Parser) → Agent 2 (Socratic) → CLOUD (sealed) → Agent 3 (JD Parser) → Agent 4 (CV+CL Gen)
       ↓                    ↓                                      ↓                    ↓
  AutoResearch          AutoResearch                           AutoResearch         AutoResearch
  (own scorecard)       (own scorecard)                        (own scorecard)      (own scorecard)
```

Each agent: prompt + scorecard + test pairs + optimization loop via Claude CLI.
Cloud: persistent evidence graph, sealed before JD, enriched by outcomes.
Cloud verifier: PENDING — needs real failure data from alpha before building. No pseudo-checks.
Dev: Claude CLI (same model quality). Production: Claude API (same model, swapped call method).

---

## Current State (Post-Cleanup)

### What's LIVE (compiles, tested)
- 5 prompts written (varying maturity)
- AutoResearch infrastructure complete (loop, mutations, safeguards, scoring)
- Pipeline: conflict detection, resolution merger, Cloud build, cleaner, taxonomy
- 50 cv-gen test pairs (ANOVA-validated scorecard)
- Web UI scaffold (all pages, mock data)
- 3 packages compile clean (0 TS errors)
- Full app simulation PASSES (5 CVs, 13/13 checks)

### What's REMOVED (archived)
- dev-parser.ts (700 lines regex) → archive/dead-code/
- matcher.ts (200 lines flat matcher) → archive/dead-code/
- analyzeSuitability() + narrateMatchReport() → deleted from analyze.ts
- 8 dead test files → archive/old-tests/
- 11 superseded docs → archive/superseded-docs/
- Total: ~1,400 lines dead TS removed, 11 stale docs archived

---

## Agent Design Optimizations Needed

### AGENT 1: CV Parser
**Current prompt: 300+ lines, production quality**

Design optimizations needed:
1. **Format resilience scoring** — currently no way to measure if parser handles two-column, creative, academic, or international CV formats. Need test pairs with diverse layouts.
2. **Information preservation metric** — "did it extract everything?" requires comparing output fields against source text sections. Currently unmeasured.
3. **Role dedup at parse level** — when same role appears in multiple CVs, parser should flag it (currently handled downstream in conflict-detector, could be earlier).
4. **Seniority inference** — parser extracts `seniority_signals` but prompt doesn't strongly guide inference logic. Needs few-shot examples of correct seniority mapping.
5. **Technology disambiguation** — "Go" (language) vs "go" (verb), "C" vs "C++", "React" vs "React Native". Prompt mentions but doesn't have examples.

Scorecard needed (6 checks):
- role_count_accuracy (extracted roles vs actual roles in source)
- date_parsing_accuracy (start/end dates correct)
- skill_extraction_completeness (technologies + skills vs source mentions)
- no_information_loss (bullets captured vs bullets in source)
- format_resilience (consistent output across different CV layouts)
- seniority_inference_accuracy (matches expected from title + years)

Test pairs needed: 20+ (6 from alpha CVs + 14 synthetic diverse formats)

### AGENT 2: Socratic Engine
**Current prompt: 25 lines — WEAKEST AGENT**

Design optimizations needed:
1. **Prompt expansion** — 25 lines is a placeholder. Needs 150+ lines with:
   - Persona-aware question framing (military vs doctor vs tech)
   - Negative examples (questions to NEVER ask)
   - Evidence type targeting (what each question should reveal)
   - Depth progression (shallow → deep within a skill)
2. **Conflict question templates** — Phase 1 questions (date overlaps, employer dedup) should have persona-specific phrasing. Currently generic.
3. **Answer quality detection** — when user gives vague answer ("it was good"), Socratic should probe deeper. Currently no re-ask logic.
4. **Question prioritization** — which gap matters most? Currently 3-gate system (relevance × evidence gap × marginal value) but the WEIGHTS aren't tuned.
5. **Cloud update verification** — after Socratic answer, did the Cloud actually get richer? No measurement exists.

Scorecard needed (5 property-based checks):
- is_specific (not vague/generic — measurable by word patterns)
- not_yes_no (question requires explanation)
- fills_stated_gap (question targets the stated missing evidence)
- persona_appropriate (framing matches the user's persona)
- not_redundant (doesn't repeat info already in Cloud)

Test pairs needed: 15+ (Cloud state + gap info → expected question properties)

### AGENT 3: JD Parser
**Current prompt: 69 lines, well-structured output schema**

Design optimizations needed:
1. **Requirement classification accuracy** — "5+ years Python" is both experience AND skill requirement. Currently picks one category. Need multi-label support.
2. **Implicit requirements** — "fast-paced startup" implies self-direction, adaptability. Parser currently only extracts explicit requirements. Consider an `implied` category.
3. **Red flag detection improvement** — current `red_flags` field exists but prompt guidance is minimal. Needs examples: unrealistic combos, salary-to-requirements mismatch, "unicorn" JDs.
4. **Seniority inference from context** — JD says "lead a team of 8" but no explicit seniority. Parser should infer from responsibility language.
5. **Technology version awareness** — "React 18" vs "React" vs "React Native" are different. Current prompt doesn't emphasize version extraction.

Scorecard exists (7 checks in scorecard.ts):
- title_match, company_match, location_match
- requirements_coverage (hard + preferred)
- experience_years_accuracy
- responsibilities_coverage
- technology_extraction_completeness

Test pairs needed: 20+ (from alpha JD testing — each real JD = a pair)

### AGENT 4: CV + Cover Letter Generator
**Current: cv-gen 118+ lines (most mature), cover-letter 80+ lines**

Design optimizations for CV Generation:
1. **metrics_preserved bottleneck** — scorecard shows 7/8 failures on this check. Prompt needs stronger instruction: "ALWAYS carry forward quantified achievements verbatim from source."
2. **Evidence selection logic** — which Cloud nodes to emphasize for a given JD? Currently prompt says "prioritize relevant" but doesn't define selection criteria precisely.
3. **Persona-aware formatting** — military CV structure differs from tech CV. Executive summary style differs from entry-level objective. Prompt doesn't differentiate by persona.
4. **Anti-fabrication hardening** — `no_fabricated_skills` check exists but prompt could be more explicit about what counts as fabrication vs inference.
5. **Length calibration** — different markets expect different CV lengths (1 page entry, 2 pages mid, 3+ academic). Prompt doesn't adapt.

Design optimizations for Cover Letter:
1. **Tone consistency** — 4 tones exist (professional, conversational, confident, humble) but prompt examples are limited. Need 2-3 full examples per tone.
2. **Evidence citation density** — how many specific citations per paragraph? Currently unmeasured.
3. **Company research injection** — cover letter should reference company-specific info. Currently depends on whatever JD mentions. Could add a "research this company" step.
4. **Opening hook variety** — prompt says "hook-first" but only has generic guidance. Need diverse hook patterns.

Scorecard (cv-gen): EXISTS (8 checks, ANOVA-validated, 60% baseline)
Scorecard (cover-letter): MISSING — needs: tone_adherence, evidence_citations, word_count_250_400, hook_quality, company_specificity

Test pairs (cv-gen): 50 exist (20/15/15 split)
Test pairs (cover-letter): MISSING — need 15+ (Cloud + JD → expected properties)

---

## Execution Plan

### WEEK 1 (May 7-13): Unblock + Alpha Start

| Day | Action |
|-----|--------|
| 1 | Wire Claude CLI into run-loop.ts (replace mock with `claude --print`) |
| 1 | Fix metrics_preserved: add "preserve quantified metrics verbatim" to cv-gen prompt |
| 2 | Run first REAL AutoResearch iteration on cv-generation (via CLI) |
| 2 | Upload 6 CVs (boss 5 + wife 1) — test Agent 1 (parser) |
| 3 | Fix any parser failures → those fixes = cv-parser v001 |
| 3 | Expand socratic.ts prompt from 25 → 150+ lines |
| 4-5 | Paste 5 JDs — test Agent 3 (JD parser) + Agent 4 (CV gen) |
| 5 | Save each tested JD as test pair for jd-parser |
| 5 | Write cv-parser scorecard (6 checks) |

### WEEK 2 (May 14-20): All Agents Grinding

| Day | Action |
|-----|--------|
| 6-7 | Write socratic scorecard + 10 test pairs from simulation data |
| 7 | Wire cv-parser and socratic as AutoResearch targets |
| 8-9 | All 4 targets running via CLI (cv-gen, jd-parser, cv-parser, socratic) |
| 9-10 | Paste 10 more JDs — grow jd-parser test bank to 15+ |
| 10-12 | Write cover-letter scorecard + 10 test pairs |
| 12 | Wire cover-letter as 5th AutoResearch target |
| 13-14 | All 5 agents grinding. Review winning prompts. |

### WEEK 3 (May 21-27): Infrastructure + UI + Polish

| Day | Action |
|-----|--------|
| 15 | Deploy Vercel Pro + Supabase Pro + custom domain |
| 15-16 | Lemon Squeezy payment integration (free tier → paywall) |
| 16-17 | Google OAuth via Supabase Auth |
| 17-19 | Connect UI to real API (onboarding → analysis → CV gen → download) |
| 19-20 | PDF/DOCX export working |
| 20-21 | Landing page (what + pricing + CTA) |
| 21 | End-to-end test: signup → upload → analyze → generate → download → pay |

### WEEK 4 (May 28-30): Launch

| Day | Action |
|-----|--------|
| 22 | Freeze prompts at current version (all should be v003-v005+) |
| 22 | Final end-to-end test with fresh account |
| 23 | Soft launch — open to first external users |
| 24 | May 30 — LIVE |

---

## Post-Launch (June+)

- Switch AutoResearch from CLI to Haiku API ($5/night)
- Outcome Intelligence wiring (feedback → Cloud enrichment)
- Nightly prompt optimization runs
- Cover letter generation
- Application tracker with outcome tracking
- Chrome extension (Phase 3)

---

## What We DON'T Build

| Anti-feature | Why |
|---|---|
| Auto-apply | Proven failure (2-3% response rate) |
| Local LLM (Ollama) | Same model via CLI = no quality gap. Don't introduce one. |
| Manual prompt editing as primary | AutoResearch grinds. Human feeds data. |
| Three separate loops | ONE loop per agent, parameterized |
| ATS scores | No real ATS scores exist |
| Cross-user learning | Simpson's Paradox, 100K+ needed |
| Features before pipeline works | Pipeline quality = product quality |

---

## Files That Matter (Post-Cleanup)

```
packages/ai/src/
  prompts/         — THE 5 AGENT PROMPTS (the product)
  autoresearch/    — THE OPTIMIZATION INFRASTRUCTURE
  socratic.ts      — Agent 2 engine
  cloud.ts         — Cloud builder
  cloud-pipeline.ts — Full pipeline orchestrator
  analyze.ts       — Parsers (Agent 1 + Agent 3)
  generate-cv.ts   — Agent 4 (CV mode)
  generate-cover-letter.ts — Agent 4 (CL mode)
  conflict-detector.ts — Pipeline gating
  resolution-merger.ts — Resolved profile builder
  cv-cleaner.ts    — Pre-Cloud data quality
  cloud-matcher.ts — Cloud vs JD matching
  cloud-maturity.ts — Model selection signal
  insights.ts      — Positioning advice
  skill-matching.ts — Word boundary + alias matching
  taxonomy.ts      — Skill classification
  answer-parser.ts — Socratic answer parsing
  feedback-classifier.ts — User feedback intent
  certificate-extractor.ts — Cert PDF extraction
  gap-filling.ts   — Template questions for gaps

apps/web/src/
  app/api/         — API routes (analyze, upload, resolve, cloud, feedback)
  app/onboarding/  — 5-step onboarding flow
  app/(app)/       — Main app pages (dashboard, analyze, cv, cloud, tracker)

Key docs:
  ROADMAP.md                          — THIS FILE (source of truth)
  agent-architecture-gap-analysis.md  — Where we are vs need to be
  competitive-architecture-comparison.md — 22 competitors analyzed
  launch-plan-may30.md                — Infrastructure decisions
  autoresearch-activation-plan.md     — Activation sequence
```
