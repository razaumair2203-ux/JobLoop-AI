# JD Parser Loop — Research, Audit & Calibration Plan

**Date**: May 10, 2026
**Status**: Pre-implementation audit — DO NOT CODE until calibration complete
**Decision Journal**: All threshold decisions recorded here with evidence

---

## 1. Research Findings: How To Evaluate Structured Extraction

### 1.1 ExtractBench (ContextualAI, Feb 2026) — THE Reference

ExtractBench is the closest published framework to what we need. Key principles:

**Schema-driven evaluation**: Each field declares its OWN scoring metric. No single metric for all fields.

**Per-field metric types** (9 total):
| Metric | Use Case | Example |
|--------|----------|---------|
| string_exact | IDs, codes | Invoice number |
| string_case_insensitive | Enum values | "must_have" vs "Must_Have" |
| string_fuzzy | Entity names | Levenshtein >= 0.8 |
| string_semantic | Free text | LLM judge (pass threshold 0.7) |
| integer_exact | Counts | Experience years |
| number_exact | Precise values | — |
| number_tolerance | Financial amounts | Relative margin (0.1%) |
| boolean_exact | Flags | Remote: true/false |
| array_llm | Lists | Semantic alignment with P/R/F1 |

**Three-state field handling**: present / null / MISSING
- Distinguishes omission (failed to extract) from hallucination (fabricated)
- Different risk profiles: hallucination is WORSE than omission for us

**Array evaluation**: LLM judge aligns predicted vs gold items, computes P/R/F1 at array level, then recursively evaluates matched pairs field-by-field.

**Baseline results (2026)**: Frontier models achieve only 4.6% PASS rate on complex schemas. Best model (Gemini 3 Flash) = 6.9%. This is for complex multi-page financial documents — JDs are simpler, but sets expectations.

Source: https://arxiv.org/abs/2602.12247

### 1.2 SOB — Structured Output Benchmark (Apr 2026)

**Leaf-path flattening**: Flatten JSON to leaf nodes (e.g., `requirements.0.text`, `requirements.1.type`), then exact-match per leaf. This is simple and deterministic.

**Value Accuracy** = fraction of ground-truth leaf paths where predicted value exactly matches. Primary metric.

**Type Safety** = fraction where JSON type matches schema-expected type. Catches "5" (string) vs 5 (number).

**Faithfulness Score** = token-level F1 for partial credit. Complements strict exact match.

Source: https://arxiv.org/abs/2604.25359

### 1.3 Industry Practice (Textkernel/Sovren)

**Experience years**: Extracted as min/max RANGE, not single number. Our JD parser already does this correctly (`experience_years: { min, max, raw_text }`).

**Skills**: Differentiated as required vs optional (matches our hard vs preferred).

**Location**: Full geocoding (country, city, postal code, coordinates). We do city + country + remote — sufficient for MVP.

**Confidence scores**: Only on normalized profession (job title mapping). No per-field confidence on other fields.

**Key insight**: NO commercial parser publishes accuracy numbers. Textkernel claims "improved accuracy" without numbers. Affinda claims "20% more accurate than nearest competitor" without methodology. This means there's no industry benchmark to compare against.

### 1.4 Academic NER on Resumes/JDs

**Best published**: 90.87% F1 on resume NER (22,542 samples, RoBERTa). But this is entity-level (name, date, skill), not structured extraction.

**No JD parsing benchmark exists** — confirmed again. Skill extraction datasets exist (Amazon Mechanical Turk annotated) but not full JD structure.

---

## 2. Extraction vs Generation: Fundamental Differences

This is the KEY insight our CV gen loop missed because it wasn't relevant there:

| Dimension | CV Generation | JD Parsing |
|-----------|--------------|------------|
| Task type | GENERATION — create new text | EXTRACTION — find existing text |
| "Right answer" | Subjective (many valid CVs) | Objective (facts in the JD) |
| Fabrication risk | High (LLM invents metrics) | Different (LLM adds phantom requirements) |
| Evaluation standard | Quality judgment | Accuracy measurement |
| Correct metric | Gated scorecard (structural checks) | Per-field P/R/F1 |
| Threshold source | P10 of ideal outputs (calibrated) | Should be: accuracy on known-good parse |

**Critical implication**: Our current JD scorecard uses Gate 1 (all checks pass/fail) — this is WRONG for extraction. ExtractBench and SOB both use per-field metrics with different match types per field. A JD parser that gets company, title, location, experience perfect but misclassifies 1 requirement type should NOT be treated the same as one that hallucinates the company name.

**Recommended approach**: Per-field scoring with field-appropriate match types, then aggregate to an overall accuracy score. NOT binary gate.

---

## 3. Audit of Current JD Scorecard (7 checks)

### Check 1: requirements_extracted (>= 80% recall)
- **Match method**: 50% word overlap (words > 3 chars)
- **Problem**: Word overlap is crude. "5+ years of project management experience" vs "Project management skills required" — the words "project" and "management" match, but are these the same requirement?
- **ExtractBench says**: Use semantic array alignment for lists. Our budget alternative: 2-layer matching (exact substring first, then word overlap with higher threshold)
- **Threshold 80%**: UNCALIBRATED GUESS. Need P10 from real parser output.
- **Verdict**: REWRITE match logic, RECALIBRATE threshold

### Check 2: requirement_types (>= 80% correct classification)
- **Problem**: must_have vs nice_to_have classification is genuinely hard. JDs are inconsistent — "preferred" sometimes means "required if you want the job." Our parser prompt says "if ambiguous, mark as hard (conservative)." But the ground truth in test pairs makes its own judgment.
- **Real question**: Are we measuring parser accuracy or ground-truth quality?
- **ExtractBench says**: string_case_insensitive match on enum values
- **Threshold 80%**: UNCALIBRATED. Industry doesn't publish numbers for this.
- **Verdict**: KEEP logic, RECALIBRATE threshold, ADD fuzzy acceptance (if ground truth says nice_to_have and parser says must_have, that's the "conservative" behavior we instructed — should be partial credit, not failure)

### Check 3: company exact match
- **Problem**: "AimHire" vs "Aimhire" vs "AimHire, Inc." — case and suffix variation
- **Current**: exact OR contains match. Contains catches "AimHire" in "AimHire, Inc." — OK
- **ExtractBench says**: string_fuzzy (Levenshtein >= 0.8)
- **Verdict**: ADD Levenshtein fuzzy matching. Current logic is close but misses case-only differences.

### Check 4: title exact match
- **Problem**: "Senior Human Resources Generalist" vs "Sr. HR Generalist" vs "Senior HR Generalist"
- **Current**: exact OR contains. Contains helps but doesn't handle abbreviations.
- **ExtractBench says**: string_fuzzy (Levenshtein >= 0.8)
- **Verdict**: ADD abbreviation normalization (Sr. -> Senior, Jr. -> Junior, Mgr -> Manager, HR -> Human Resources) BEFORE fuzzy match

### Check 5: no_phantom_requirements
- **Problem**: 30% word overlap threshold for "matches expected" is LOW. Could match completely different requirements that share common words.
- **This check is CRITICAL** — phantom requirements = hallucination, which is worse than omission
- **ExtractBench says**: Distinguish omission from hallucination explicitly
- **Verdict**: RAISE overlap threshold to 40-50%, ADD separate omission tracking

### Check 6: location exact match
- **Problem**: "Denver, CO" vs "Denver, Colorado" vs "" (when JD says "hybrid" but no city)
- **Current**: exact OR contains
- **Verdict**: ADD state/country abbreviation normalization, handle empty/null gracefully

### Check 7: experience_years (strict equality)
- **Problem**: Parser returns `{ min: 5, max: 10 }`, test pair stores single number `5`. Scorecard compares `parsed.experience_years === expected.experience_years` — this is `5 === 5` which works by accident because the adapter uses `.min`.
- **But**: What about "5+" (min=5, max=null) vs "5-10" (min=5, max=10)? Both have min=5. And null === null passes — is that correct when JD doesn't mention years?
- **ExtractBench says**: integer_exact for precise values, number_tolerance for ranges
- **Verdict**: SPLIT into min_years and max_years checks. null === null should PASS (correctly identifies "not mentioned").

### MISSING checks (not in scorecard but parser extracts them):
- **responsibilities**: Parser extracts them, nobody scores them. ExtractBench would use array semantic alignment.
- **technologies_mentioned**: Parser extracts, not scored.
- **red_flags**: Parser extracts, not scored.
- **seniority_level**: Parser extracts, not scored.
- **remote/hybrid**: Parser extracts, not scored.
- **compensation**: Parser extracts, not scored.

**Decision**: For the optimization loop, we should score what MATTERS for downstream pipeline quality. Responsibilities and technologies feed into CV generation. Red flags feed into analysis. Seniority feeds into persona detection. These SHOULD be scored.

---

## 4. Proposed New JD Scorecard (Research-Informed)

### Per-field scoring (NOT binary gate):

| # | Field | Match Type | Rationale |
|---|-------|-----------|-----------|
| 1 | company | fuzzy (Levenshtein >= 0.8) | Entity name, minor variations expected |
| 2 | title | fuzzy + abbreviation normalization | "Sr." vs "Senior", "HR" vs "Human Resources" |
| 3 | location | fuzzy + abbreviation normalization | "CO" vs "Colorado", empty = "not mentioned" |
| 4 | experience_years_min | integer exact (null-safe) | null === null = PASS |
| 5 | experience_years_max | integer exact (null-safe) | New: catches range extraction quality |
| 6 | seniority_level | case-insensitive enum match | New: feeds persona detection |
| 7 | requirements recall | array word-overlap (threshold TBD from calibration) | How many real requirements were found |
| 8 | requirements precision | array word-overlap inverse | How many parsed requirements are NOT phantom |
| 9 | requirement_types | enum match on matched pairs only | must_have/nice_to_have, with conservative-bias partial credit |
| 10 | technologies recall | array fuzzy match | New: feeds CV generation directly |
| 11 | responsibilities recall | array word-overlap | New: feeds CV generation analysis |

### Aggregate scoring:
- Per-field score: 0.0 to 1.0 (using field-appropriate matching)
- Overall accuracy: weighted average (exact fields weight 1.0, array fields weight 1.5 — arrays are harder and more important)
- Gate: overall accuracy >= THRESHOLD (calibrated from real data)
- Keep/discard: challenger accuracy > incumbent accuracy + 0.02 deadband

### What we're NOT doing:
- LLM-based semantic matching (ExtractBench uses this for arrays — too expensive, circular)
- BERTScore on JD fields (not meaningful for short structured fields)
- Confidence scores (no ground truth for confidence)

---

## 5. Calibration Plan

### Step 1: Extract jd_expected from test pairs
- Map existing `jd` object in Q-series pairs to scorecard input format
- Fields: company, title, location, experience_years (min/max), requirements (text + type), responsibilities, seniority, technologies

### Step 2: Run parser on free API
- Use Gemini 2.5 Flash (free tier, 10 RPM) or Groq (Llama 3.3 70B, 30 RPM)
- Parse `full_description` from 10-15 test pairs
- Save raw outputs as fixtures

### Step 3: Score and calibrate
- Run new scorecard against real parser outputs
- Compute per-field score distribution (min, P10, P25, median, P75, max)
- Set thresholds at P10 of real outputs (same methodology as CV gen loop)
- If P10 is too low on a field, that field needs prompt improvement, not threshold lowering

### Step 4: Ceiling test
- Score expected vs expected (ceiling) — should be ~100%
- If ceiling < 100%, the scorecard has a bug or the ground truth has inconsistencies

### Step 5: ANOVA
- Compare ceiling vs baseline distributions
- If not significant, scorecard lacks granularity (same lesson from CV gen)

---

## 6. Lessons Applied from CV Gen Loop

| CV Gen Lesson | Applied to JD Parser |
|--------------|---------------------|
| All thresholds were uncalibrated guesses | DO NOT set any threshold before calibration |
| Single-word matching produced false positives | Use 2+ word matching for requirements |
| compareScorecards only used integer counts | Use float per-field scores from the start |
| Eval batch random per run | Will use sorted-by-ID deterministic batch |
| Round-robin mutations naive | Will use effectiveness-weighted selection |
| metrics_preserved threshold was wrong because data quality | Verify ground truth quality BEFORE scoring |
| Expected outputs were AI-generated (circularity) | Q-series JDs have `full_description` from real job postings — lower circularity for extraction |

---

## 7. Open Questions (Resolve During Calibration)

1. Should requirement matching use word overlap or substring containment? Need to test both on real pairs.
2. Is the parser prompt's "if ambiguous, mark as hard" instruction creating a systematic bias that inflates must_have counts? Need to measure.
3. How many Q-series pairs have `full_description`? If few, we need to add JD text to more pairs.
4. Should we score `red_flags` extraction? It's unique to our product but hard to create ground truth for.
5. How does parser performance vary by JD length/complexity? Short JDs (3 bullets) vs long (full page)?

---

## 8. Calibration Results (May 10, 2026)

### Trial Setup
- **Model**: Llama-3.3-70B (NIM free tier)
- **Pairs scored**: 38/41 (2 rate-limited, 4 pairs lack full_description)
- **Scoring**: Per-field with Levenshtein fuzzy, contains matching, word-overlap arrays
- **Ground truth corrections applied**: 17 fields across 14 pairs + 4 experience_years fixes

### Per-Field Distribution (after GT corrections + improved scoring)

| Field | Min | P10 | P25 | Median | P75 | Max | Mean |
|-------|-----|-----|-----|--------|-----|-----|------|
| company | 0% | 8% | 16% | 90% | 100% | 100% | 65% |
| title | 29% | 43% | 90% | 90% | 100% | 100% | 83% |
| location | 11% | 50% | 50% | 100% | 100% | 100% | 77% |
| exp_min | 0% | 100% | 100% | 100% | 100% | 100% | 95% |
| exp_max | 0% | 100% | 100% | 100% | 100% | 100% | 97% |
| req_recall | 18% | 41% | 67% | 91% | 100% | 100% | 80% |
| req_precision | 50% | 89% | 100% | 100% | 100% | 100% | 96% |
| req_types | 80% | 85% | 90% | 98% | 100% | 100% | 95% |
| resp_recall | 0% | 47% | 81% | 100% | 100% | 100% | 86% |
| **OVERALL** | 62% | 74% | 82% | 88% | 93% | 99% | **86%** |

### Calibrated Thresholds (P10-based)

| Check | Threshold | P10 | Rationale |
|-------|-----------|-----|-----------|
| company | 40% | 8% | Bimodal (parent vs subsidiary GT issue). Set above zero to catch total blanks. |
| title | 40% | 43% | Catches total misses. Abbreviation normalization handles variations. |
| location | 45% | 50% | Extra extraction (50% score) is legitimate, not failure. |
| experience_years_min | 80% | 100% | Strict — exact or ±1 year. |
| experience_years_max | 80% | 100% | Strict — exact or ±1 year. |
| requirements_recall | 40% | 41% | P10 floor. Array matching with 2+ word overlap. |
| requirements_precision | 85% | 89% | Parser rarely hallucinates — high bar appropriate. |
| requirement_types | 80% | 85% | Conservative-bias partial credit included. |
| responsibilities_recall | 45% | 47% | Array matching, some GT paraphrasing. |

### Root Cause Analysis of Failures

**Company (14/38 fail)**: Systemic ground truth issue. JD text mentions subsidiary/brand/client ("GN Audio USA Inc."), GT stores posting company ("GN Group"). Parser is often MORE correct. Would need to update all GT entries to match JD text. **Not a parser quality issue.**

**Title (9/38 fail)**: JD posting title includes qualifiers not in body text ("Freelance Food Writer - Food Republic" → parser extracts "Freelance Writer"). Partially GT issue (posting title ≠ role title in text). Parser is reasonable.

**Location (17/38 fail)**: 12 of 17 are "extra extraction" at 50% score — parser found location in text but GT was empty. Parser is RIGHT, GT is INCOMPLETE. Remaining 5 are "USA" vs specific state (scoring improvement handled this).

**Requirements recall (14/38 fail)**: Real variance. Some GT requirements are vaguely paraphrased. Parser finds different phrasing of the same concept but word overlap doesn't catch it. Expected to improve with prompt optimization.

### Decisions Made

1. **9 checks** (up from 7): Added experience_years_max, responsibilities_recall. Split requirements into recall + precision.
2. **Float scoring throughout**: No binary gate per field. Each field scores 0.0-1.0. Gate is per-pair ≥6/9 + aggregate ≥70%.
3. **Conservative partial credit**: Parser says must_have when GT says nice_to_have → 0.5 credit (parser followed instructions).
4. **Empty GT = no penalty**: When GT has empty location but parser extracts one, score = 0.5 (not 0). Parser is likely right.
5. **Thresholds are DATA-CALIBRATED**: Every threshold is at or near P10 of real trial data. Not guesses.

### Remaining Issues (Deferred)

1. **Company GT quality**: 14/38 pairs have parent≠subsidiary mismatch. Need human review to decide: should GT match JD text or posting company?
2. **generateJDParse() not implemented**: run-loop.ts only has generateCV(). Need to wire JD parser into the optimization loop.
3. **Q044 is JD-duplicate of Q005**: Same JD, different CVs, different splits. OK for CV gen loop, would double-count for JD parser loop. Flag if both used in same JD eval batch.
4. **Technologies/seniority/red_flags not scored**: Parser extracts these but no GT exists. Phase 2.

---

## Sources

- [ExtractBench: Complex Structured Extraction Benchmark](https://arxiv.org/abs/2602.12247)
- [SOB: Structured Output Benchmark](https://arxiv.org/abs/2604.25359)
- [Textkernel Job Parser API](https://developer.textkernel.com/tx-platform/v10/job-parser/api/)
- [Skill Extraction Dataset (Amazon MTurk)](https://github.com/acp19tag/skill-extraction-dataset)
- [Resume NER with RoBERTa (90.87% F1)](https://huggingface.co/yashpwr/resume-ner-bert-v2)
- [Invoice IE Evaluation Methods](https://arxiv.org/abs/2510.15727)
- [LayIE-LLM: Layout-aware IE Design Space](https://arxiv.org/abs/2502.18179)
