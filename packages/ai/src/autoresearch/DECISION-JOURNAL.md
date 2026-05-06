# AutoResearch Decision Journal

Persistent record of decisions, reviews, and corrections. Created May 3, 2026.

---

## 2026-05-03: Initial Review Session

### Test Bank Provenance Audit
- **Pairs 001-004**: REAL DATA from user's actual CV (5 PDFs in Alpha_CVs/, ground-truth-profile.json with verifiable Coursera IDs, real PAF/PAC dates). User snap-checked during creation session.
- **Pairs 005-050**: SYNTHETIC. JD styles modeled from real Greenhouse/Lever postings (documented in REAL-JD-STYLES.md). User asked Claude to check against real JDs during creation. No formal sign-off recorded.
- **Missing**: No `reviewed_on` field existed in test pairs. Added provenance metadata to all 50 pairs this session.

### Circularity Assessment
- 4/8 scorecard checks are structurally valid regardless of data source: `factual_preservation`, `word_count`, `ats_structure`, `action_verbs`
- 4/8 checks evaluate AI output against AI reference: `jd_requirements_coverage`, `no_fabrication`, `metrics_preserved`, `no_fabricated_skills`
- For real pairs (001-004): circularity is LOW — expected output derived from verified human data
- For synthetic pairs (005-050): circularity is MEDIUM — both expected and baseline are Claude-generated
- ANOVA (F=19.68, p=0.000009) is mathematically valid but measures "can the scorecard distinguish two Claude outputs" not "can the scorecard distinguish good from bad by human standards"

### Threshold Decisions (LOCKED)
- 70%/80%/80% thresholds are practitioner judgement, NOT research-backed
- DECISION: Empirically calibrate AFTER real optimization loop completes (not from baseline alone)
- DECISION: Scorecard gates judge PROMPT quality (aggregate across pairs), NOT individual CV quality
- DECISION: Context-aware — stretch app with 50% coverage is valid if it's the best honest CV
- DECISION: Hard numeric gating is shallow — thresholds are functional placeholders until full distribution seen
- Premature calibration attempted May 3 from 20 baseline scores — REJECTED (incomplete data, contradicts own decision)

### Socratic -> Cloud Decision (LOCKED — IMPLEMENTED)
- DECISION: When user provides new evidence via Socratic questions, Cloud (source of truth) MUST update
- Sequence: gap detected -> Socratic question -> user evidence -> Cloud vN+1 -> future CV gen uses it
- STATUS: IMPLEMENTED (May 3, 2026)

#### Implementation Details
- **packages/ai/src/socratic.ts** `processAnswer()` enhanced:
  - Uses `findNode()` (alias-aware) instead of manual `.find()` by exact name
  - Creates new `CloudNode` if skill not yet in Cloud (new skills revealed by Socratic answers)
  - Calls `computeSummary()` (now exported from cloud.ts) for proper summary recomputation
  - Accepts `triggeredBy` param to track which JD/application triggered the question
  - Updates `cloud.last_updated` timestamp
- **packages/ai/src/cloud.ts** `computeSummary()` exported (was private)
- **apps/web/src/app/api/socratic/answer/route.ts** created:
  - Auth guard (Supabase getUser)
  - Input validation (question_id, skill_name, answer required; answer >= 5 chars)
  - Loads Cloud from `cloud_nodes` table, calls `processAnswer()`, upserts affected node
  - Saves Q&A record in `socratic_qa` table
  - Returns affected node name, is_new_skill flag, evidence count, summary
- TS compilation: 0 errors across all 3 packages

### Literature Corrections (7 items)
1. BERTScore 59% — from ACL 2025 LongLaMP study, not original 2020 paper
2. DSPy "20 useful, 200 goes a long way" — invented paraphrase; actual docs say 30/300
3. ExtractBench — published Feb 2026, not 2025
4. ZEDD NeurIPS 2025 workshop — unverifiable venue; paper is about prompt injection
5. p1 "GEPA memorizes at K=1" — at K=1 it's p1 that overfits, not GEPA
6. CAPO — "Cost-Aware" not "Competitive"
7. TextGrad — used ~36 examples per BBH task, not 50
- STATUS: ALL 7 APPLIED to RESEARCH-LOG.md (May 3, 2026) — both inline references and bibliography entries corrected

### Technical Debt Fixed
- apps/web/tsconfig.json: ES2017 -> ES2022 (fixes regex s flag errors)
- apps/web/src/app/api/cv/upload/route.ts: pdf-parse import types fixed
- apps/web/src/app/api/analyze/route.ts: type assertion removed
- packages/ai/src/provider.ts: JSON parse error handling added
- All 3 packages compile clean (0 TS errors)

### Skills Created
- /tech-debt-pass — full technical debt audit
- /coding-standards — check files against project conventions
- /pre-commit-check — quick pre-commit validation
- CLAUDE.md created at project root

---

## Template for Future Entries

### YYYY-MM-DD: [Topic]
**Context**: Why this decision was made
**Decision**: What was decided
**Evidence**: What research/data supports it
**Alternatives Considered**: What was rejected and why
**Status**: LOCKED / PROVISIONAL / NEEDS_REVIEW
**Reviewed By**: user / claude / both
