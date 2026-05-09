# Architecture Audit: What's Useful vs Useless (May 6, 2026)
# Context: New 5-Agent Pipeline Architecture adopted. Audit everything against it.

---

## VERDICT CATEGORIES
- KEEP (CORE) = directly serves 5-agent pipeline
- KEEP (SUPPORT) = supporting infrastructure still needed
- STALE = outdated by new architecture, archive or delete
- PREMATURE = built for Phase 2+, not needed until launch
- REDUNDANT = superseded by newer version

---

## CODE AUDIT: packages/ai/src/

### KEEP (CORE) — These ARE the 5 agents

| File | Agent | Status |
|------|-------|--------|
| prompts/cv-parser.ts | Agent 1 | CORE — the CV parser prompt (300+ lines, production quality) |
| prompts/socratic.ts | Agent 2 | CORE — but THIN (25 lines, needs expansion) |
| prompts/jd-parser.ts | Agent 3 | CORE — well structured (69 lines) |
| prompts/cv-generation.ts | Agent 4 | CORE — most mature (118+ lines) |
| prompts/cover-letter.ts | Agent 4 | CORE — (80+ lines) |
| socratic.ts | Agent 2 | CORE — engine code (500+ lines, 3-gate, conflict detect) |
| analyze.ts | Agent 1+3 | CORE — parseJD(), parseCV(), classifyJDComplexity() |
| generate-cv.ts | Agent 4 | CORE — generateCloudTailoredCV() |
| generate-cover-letter.ts | Agent 4 | CORE — generateCoverLetter() |
| cloud.ts | Cloud build | CORE — buildCloudFromParsedCV() |
| answer-parser.ts | Agent 2 | CORE — parses Socratic answers |
| conflict-detector.ts | Agent 2 | CORE — pipeline gating |
| resolution-merger.ts | Agent 2 | CORE — merges resolved profile |
| cv-cleaner.ts | Agent 1→2 | CORE — pre-Cloud data quality |
| skill-matching.ts | Support | CORE — word boundary + alias map |
| utils.ts | Support | CORE — safeParseJSON, generateId |
| client.ts | Support | CORE — Anthropic SDK client |
| provider.ts | Support | CORE — dev/API mode abstraction |
| types.ts | Support | CORE — ParsedJD, ParsedCV types |
| index.ts | Support | CORE — barrel exports |

### KEEP (CORE) — AutoResearch Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| autoresearch/loop-runner.ts | Core keep/discard logic | CORE |
| autoresearch/run-loop.ts | Orchestrator | CORE — needs CLI rewire |
| autoresearch/scorecard.ts | CV gen + JD parser scorecards | CORE |
| autoresearch/mutations.ts | 6 mutation operators | CORE |
| autoresearch/safeguards.ts | 6 gates before deploy | CORE |
| autoresearch/cron-entry.ts | Automation entry point | CORE |
| autoresearch/index.ts | Barrel exports | CORE |
| autoresearch/anova-pretest.ts | Signal validation | CORE |
| autoresearch/feedback-weighter.ts | User feedback → pair weights | CORE |
| autoresearch/run-baseline-scoring.ts | Baseline measurement | CORE |
| autoresearch/run-pilot.ts | Scorecard calibration | CORE |
| autoresearch/test-bank/ (50 pairs) | Training data | CORE |

### KEEP (SUPPORT) — Still needed

| File | Purpose | Status |
|------|---------|--------|
| cloud-matcher.ts | Matches Cloud against JD requirements | SUPPORT — used by Agent 4 |
| cloud-pipeline.ts | Full pipeline orchestration | SUPPORT — analyzeWithCloud() |
| cloud-maturity.ts | Model selection signal | SUPPORT — drives Haiku/Sonnet |
| insights.ts | Narrator/positioning advice | SUPPORT — inline prompt |
| taxonomy.ts | Skill classification + gap detection | SUPPORT |
| feedback-classifier.ts | Natural language feedback → intent | SUPPORT |
| certificate-extractor.ts | PDF cert extraction (deterministic, $0) | SUPPORT |
| gap-filling.ts | Template questions for missing descriptions | SUPPORT (could merge into socratic) |

### STALE — Outdated by new architecture

| File | Why Stale | Action |
|------|-----------|--------|
| **dev-parser.ts** | DEPRECATED — regex fallback removed from critical path (May 6, 2026). Three-tier dev mode means we use fixtures or Claude CLI, never regex. | ARCHIVE — keep normalizeSpacedText() only (useful utility), delete rest |
| **matcher.ts** | "Flat matcher (legacy — works without cloud)" — bypasses the Cloud entirely. New architecture REQUIRES Cloud for everything. | ARCHIVE — dead code, only kept for "backwards compat" per index.ts comment |
| **linkedin-parser.ts** | Phase 2+ feature (LinkedIn ZIP import). No user has LinkedIn data yet. Not part of MVP pipeline. | DEFER — not stale per se, just premature. Leave but don't maintain. |

### STALE exports in index.ts

```typescript
// These should be removed/deprecated:
export { parseCVLocal } from "./dev-parser";           // DEPRECATED
export { matchCVToJD } from "./matcher";               // LEGACY, bypasses Cloud
export { analyzeSuitability } from "./analyze";        // LEGACY, bypasses Cloud
```

---

## CODE AUDIT: apps/web/src/

### KEEP (MVP) — Must-have for May 30

| File | Purpose |
|------|---------|
| app/page.tsx | Landing page |
| app/auth/ | Login/signup + callback |
| app/onboarding/ (all steps) | CV upload → Cloud build → Socratic → Ready |
| app/(app)/analyze/page.tsx | JD paste → analysis |
| app/(app)/cv/page.tsx | CV builder |
| app/(app)/cv/compare/page.tsx | Before/after comparison |
| app/(app)/cv/cover-letter/page.tsx | Cover letter generation |
| app/(app)/dashboard/page.tsx | Main dashboard |
| app/(app)/cloud/page.tsx | Profile Cloud view |
| app/(app)/tracker/page.tsx | Application tracker |
| app/api/analyze/route.ts | JD analysis API |
| app/api/cv/upload/route.ts | CV upload API |
| app/api/cv/resolve/route.ts | Conflict resolution API |
| app/api/cv/conflicts/route.ts | Conflict detection API |
| app/api/cloud/route.ts | Cloud data API |
| app/api/socratic/answer/route.ts | Socratic answer API |
| app/api/feedback/route.ts | Feedback API |
| middleware.ts | Auth middleware |
| lib/ (all) | Supabase client, auth, env, etc. |
| components/ (all) | Theme, sidebar |

### PREMATURE — Not needed for MVP, keep but don't maintain

| File | Why Premature |
|------|---------------|
| app/(app)/network/page.tsx | Contact CRM — Phase 2 feature |
| app/(app)/discover/page.tsx | Job discovery — Phase 2+ (no job board API yet) |
| app/(app)/linkedin-optimizer/page.tsx | LinkedIn optimization — Phase 2+ |
| app/(app)/settings/extensions/page.tsx | Chrome extension — Phase 3 |
| app/(app)/settings/integrations/page.tsx | Third-party integrations — Phase 2+ |
| app/api/cv/linkedin-import/route.ts | LinkedIn ZIP import — Phase 2 |
| app/api/admin/autoresearch/route.ts | Admin API for AutoResearch — useful but not MVP |
| app/(app)/cv/templates/page.tsx | Template selection — nice-to-have |

---

## DOCUMENTATION AUDIT: Top-Level .md Files

### KEEP (CURRENT) — Still relevant to new architecture

| File | Why Keep |
|------|----------|
| CLAUDE.md | Project instructions — always relevant |
| agent-architecture-gap-analysis.md | NEW — source of truth for where we are |
| competitive-architecture-comparison.md | NEW — 22 competitors, architecture-level |
| competitive-analysis-v2-may2026.md | Current competitive landscape |
| launch-plan-may30.md | Active launch plan |
| autoresearch-activation-plan.md | Still valid activation sequence |
| autoresearch-validation.md | Proves AutoResearch works |
| cost-analysis.md | Pricing/costs — always relevant |
| evidence-credibility-model.md | Core design philosophy |
| socratic-engine-FINAL-v2.md | Source of truth for Agent 2 design |
| socratic-engine-approach.md | Validated approach doc |
| cloud-pipeline-spec.md | 7-stage pipeline — still valid |
| wireframe-audit-findings.md | UI decisions — needed for dev |

### REDUNDANT — Superseded by newer versions

| File | Superseded By | Action |
|------|---------------|--------|
| competitive-comparison.md | competitive-analysis-v2-may2026.md | ARCHIVE |
| jobloop_ai_spec_v3.md | jobloop_ai_spec_v4_complete.md | ARCHIVE |
| outcome-intelligence-final.md | outcome-intelligence-v3.md | ARCHIVE |
| outcome-intelligence-v2.md | outcome-intelligence-v3.md | ARCHIVE |
| socratic-engine-final.md | socratic-engine-FINAL-v2.md | ARCHIVE |
| socratic-two-phase-design.md | socratic-engine-FINAL-v2.md | ARCHIVE |
| socratic-engine-design-problems.md | Problems were RESOLVED in FINAL-v2 | ARCHIVE |
| pipeline-competitive-analysis.md | pipeline-market-validation.md | ARCHIVE |
| socratic-model-selection-audit.md | Findings integrated into FINAL-v2 | ARCHIVE |

### STALE — No longer relevant to new architecture direction

| File | Why Stale |
|------|-----------|
| DEEP_ANALYSIS_REPORT.md | Pre-architecture analysis, findings all integrated |
| parser-gap-analysis.md | Gaps were FIXED (May 4, 2026) |
| competitor-visual-orchestration.md | Visual orchestration BLOCKED on parsing — strategy shifted |
| cloud-visualization-design.md | MuchSkills-inspired design — still valid concept but won't build until Cloud works |
| taxonomy-references.md | Reference only — findings integrated into taxonomy.ts |

### RESEARCH — Historical value, don't delete but don't reference

| File | Status |
|------|--------|
| AI-Job-Search-App-UX-Research-Report.md | Original research — superseded by ui-design-synthesis.md |
| research-commercial-cv-parsers.md | Findings in competitive docs |
| research-competitors-2026.md | Findings in competitive-architecture-comparison.md |
| research-cv-parsing-competitors.md | Findings integrated |
| research-cv-parsing-papers-2024-2026.md | Academic references — keep for citations |
| research-cv-tools-deep-dive-2026.md | Findings integrated |
| research-major-platforms.md | Findings integrated |
| research-synthesis.md | Meta-synthesis — still useful overview |
| research-warm-connections-feasibility.md | Concluded: NOT feasible via API |
| research-ui-ux-design.md | 880 lines of UI research — still valid |
| ui-design-synthesis.md | Distilled UI plan — still valid |
| visual-competitive-audit.md | Screen-by-screen audit — valid for dev phase |

---

## DIRECTORY AUDIT

| Directory | Status | Action |
|-----------|--------|--------|
| Alpha_CVs/ | CORE — boss's 5 test CVs | KEEP |
| coursera/ | SUPPORT — 7 cert PDFs for testing cert-extractor | KEEP |
| dev-data/ | CORE — fixtures for dev mode | KEEP |
| competitor-screenshots/ | SUPPORT — UI reference for dev | KEEP |
| research/ | HISTORICAL — 1 file only | KEEP (tiny) |
| supabase/migrations/ | CORE — DB schema | KEEP |
| apps/mobile/ | PREMATURE — Phase 3 scaffold | LEAVE |

---

## MEMORY FILES AUDIT

| File | Status | Action |
|------|--------|--------|
| MEMORY.md | CURRENT — project index | KEEP (needs trim) |
| architecture.md | CURRENT — just updated to 5-agent | KEEP |
| refined-roadmap.md | CURRENT — just updated | KEEP |
| agent-pipeline-architecture.md | CURRENT — new pipeline design | KEEP |
| launch-timeline.md | CURRENT — May 30 deadline | KEEP |
| karpathy-adaptation.md | STILL VALID — explains Karpathy's actual design | KEEP |
| dev-lessons.md | STILL VALID — dev mode lessons | KEEP |
| figma-workflow.md | STILL VALID — Figma plugin gotchas | KEEP |
| research-findings.md | STILL VALID — UX patterns, anti-patterns | KEEP |
| validation-findings.md | PARTIALLY STALE — P0 bugs all fixed, but tech stack validation still relevant | KEEP (note: bugs section outdated) |
| pipeline-dry-test.md | HISTORICAL — proved pipeline works. Keep for reference. | KEEP |

---

## TESTS AUDIT: packages/ai/tests/

| File | Status | Action |
|------|--------|--------|
| test-full-app-simulation.ts | CORE — proves pipeline works end-to-end | KEEP |
| test-pipeline-fixtures.ts | CORE — dev-mode pipeline validation | KEEP |
| seed-fixtures.ts | CORE — seeds dev-mode cache | KEEP |
| generate-fixtures.ts | CORE — generates fixtures from API | KEEP |
| dry-test-pipeline.ts | REDUNDANT — superseded by test-pipeline-fixtures | ARCHIVE |
| full-pipeline-simulation.ts | REDUNDANT — superseded by test-full-app-simulation | ARCHIVE |
| real-pipeline-test.ts | STALE — pre-fixture-era test | ARCHIVE |
| run-analysis.ts | STALE — old manual test | ARCHIVE |
| run-cv-gen.ts | STALE — old manual test | ARCHIVE |
| dev-run.ts | STALE — old manual runner | ARCHIVE |
| test-parser-real-cv.ts | STALE — replaced by fixture approach | ARCHIVE |
| simulate-haiku-parse.ts | STALE — replaced by fixture approach | ARCHIVE |
| test-linkedin-parser.ts | PREMATURE — Phase 2 feature | LEAVE |
| sample-cv.ts | SUPPORT — test data | KEEP |
| cross-cv-analysis.md | HISTORICAL — analysis notes | KEEP |

---

## SUMMARY: What To Actually Do

### DELETE (truly useless dead code)
1. `packages/ai/src/dev-parser.ts` — keep ONLY `normalizeSpacedText()` (move to utils.ts), delete the rest (700 lines of regex parsing that's deprecated)
2. `packages/ai/src/matcher.ts` — legacy flat matcher, bypasses Cloud. Dead path.
3. Remove stale exports from `index.ts` (parseCVLocal, matchCVToJD, analyzeSuitability)
4. Old test files: dry-test-pipeline.ts, full-pipeline-simulation.ts, real-pipeline-test.ts, run-analysis.ts, run-cv-gen.ts, dev-run.ts, test-parser-real-cv.ts, simulate-haiku-parse.ts

### ARCHIVE (move to /archive/ folder — historical value, not part of build)
- Top-level MDs: competitive-comparison.md, jobloop_ai_spec_v3.md, outcome-intelligence-final.md, outcome-intelligence-v2.md, socratic-engine-final.md, socratic-two-phase-design.md, socratic-engine-design-problems.md, pipeline-competitive-analysis.md, socratic-model-selection-audit.md, DEEP_ANALYSIS_REPORT.md, parser-gap-analysis.md

### LEAVE (premature but not harmful)
- linkedin-parser.ts, linkedin-optimizer page, network page, discover page, extensions page, integrations page, linkedin-import route, apps/mobile/

### REWIRE (architectural change needed)
- `autoresearch/run-loop.ts` — replace mockLLMResponse() with Claude CLI execution
- `index.ts` — deprecate legacy exports, add new agent-oriented exports
- `socratic.ts` prompt — expand from 25 lines to production quality (like cv-parser's 300 lines)
