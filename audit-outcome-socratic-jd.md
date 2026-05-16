# Outcome Intelligence + Socratic JD-Match — Code Audit

> Cross-reference between specs and actual code.
> Date: May 15, 2026

## PART A: Outcome Intelligence Gaps

### A1. Free-text feedback parsing — NOT BUILT
**Spec**: User types "they liked my pipeline work" → Haiku parses → SkillSignals
**Code**: `applications/[id]/route.ts` PATCH saves `user_feedback` (if body.notes is sent). But:
- No parsing endpoint exists
- No Haiku prompt for feedback extraction
- `parsed_feedback` column exists in types but is never set in code
- `writeOutcomeSignals()` (line 72-131) uses `match_analysis.strengths/gaps` (OUR analysis) — not employer feedback

**Fix needed**: New endpoint or hook in PATCH that:
1. When `body.feedback` is provided, call Haiku with feedback + Cloud skills
2. Parse into SkillSignals (positive + gap)
3. Write to cloud_nodes.outcome_signals
4. Save parsed_feedback on application row

### A2. CV generation context injection — NOT BUILT
**Spec**: CV gen prompt gets ~200 extra tokens of outcome history
**Code**:
- `packages/ai/src/generate-cv.ts` — zero references to outcomes, application history, or niche
- `packages/ai/src/prompts/cv-generation.ts` — zero references to outcomes or niche
- No function to load outcome signals for a given niche
- No function to compute niche profile from cloud_nodes

**Fix needed**:
1. `computeNicheProfile(userId, niche)` — aggregate outcome_signals from cloud_nodes
2. `loadOutcomeContext(userId, parsedJD)` — load relevant niche profile + previous applications
3. Add outcome context block to CV_GENERATION_PROMPT
4. Wire into CV generation route

### A3. Same company detection — PARTIAL (console.log only)
**Spec**: UI alert when user analyzes JD from previously-applied company
**Code**: `analyze/route.ts:166-203` does JD similarity check (keyword overlap), logs to console
- Only checks JD keyword similarity, not company name matching
- Even the JD similarity result is only logged, never returned to frontend

**Fix needed**:
1. Compare `body.company` against previous applications' company names (fuzzy match)
2. If match found, load full history for that company
3. Return `same_company_history` in API response
4. Frontend shows alert with context

### A4. Gap accumulation → Socratic trigger — PARTIAL
**Spec**: When 2+ employers in same niche flag same gap → Socratic question
**Code**: `applications/route.ts` GET (line 30-56) computes gap patterns:
```typescript
const patterns = [...gapCounts.entries()]
  .filter(([, v]) => v.count >= 2)
  .map(([gap, v]) => ({ skill: gap, frequency: v.count, ... }));
```
But:
- Patterns returned in GET response but no trigger fires
- No Socratic question generated from patterns
- No connection to Socratic engine

**Fix needed**:
1. When pattern.frequency >= 2, generate a targeted Socratic question
2. Persist to socratic_qa (gate = "gap_accumulation")
3. Show in dashboard/Cloud view

### A5. industry field not set — BUG
**Spec**: writeOutcomeSignals uses `app.industry` for niche computation
**Code**: `analyze/route.ts` never sets `industry` on the application record
- `applications/[id]/route.ts:103`: `const niche = [app.industry, app.role].filter(Boolean).join("/")`
- Because industry is never set, niche = just the role title
- This degrades niche intelligence quality

**Fix needed**: Extract industry from parsed JD and set on application record in analyze route

### A6. SocraticContext not passed to JD questions — BUG
**Code**: `analyze/route.ts:246`:
```typescript
const jdQuestions = await generateJDQuestions(cloud, result.parsed_jd);
// Missing: no ctx parameter!
```
- generateJDQuestions accepts SocraticContext as 3rd arg
- But analyze route doesn't load persona or candidate_context
- Result: all JD questions are generic, no persona awareness

**Fix needed**: Load persona + candidate_context (same pattern as cloud/route.ts:37-62)

---

## PART B: Socratic JD-Match Gaps

### B1. JD questions not persisted — CRITICAL
**Code**: `analyze/route.ts:240-251` generates questions but:
```typescript
socraticQuestions = jdQuestions.map(q => ({ question: q.question, skill_targeted: q.skill_name }));
```
- Questions returned in response but NEVER saved to socratic_qa
- User answers will fail because there's no question row to update
- Contrast with cloud/route.ts which DOES persist (line 90-98)

**Fix needed**: After generating, insert into socratic_qa with:
- `gate = "jd_match"`
- `application_id = app.id`
- `answer = null`
Then re-fetch for DB-generated UUIDs (same pattern as cloud/route.ts)

### B2. No application_id on socratic_qa — SCHEMA GAP
**Code**: socratic_qa table doesn't have application_id column
- `socratic/answer/route.ts:39` accepts `application_id` in body
- `socratic/answer/route.ts:145` tries to insert with `application_id`
- But the column likely doesn't exist in the table schema

**Fix needed**: ALTER TABLE socratic_qa ADD COLUMN application_id UUID REFERENCES applications(id)

### B3. No priority ordering — MISSING FEATURE
**Code**: `socratic.ts:729` iterates uniqueSkills in arbitrary order
```typescript
for (const skillName of uniqueSkills) {
```
- Hard JD requirements and preferred requirements treated equally
- No sorting by gap severity

**Fix needed**:
1. Separate hard vs preferred requirements from ParsedJD
2. Process hard first
3. Within each tier, sort by gap severity (no evidence > thin evidence > some evidence)

### B4. No volume control — MISSING FEATURE
**Code**: `generateJDQuestions()` has no limit
- Could generate 10+ questions for a JD with many requirements
- CV-upload has adaptive volume (line 596-604), JD-match does not

**Fix needed**: Add volume control:
- Strong position: 1-2 max
- Competitive: 2-3 max
- Stretch: 1-2 max (focus on addressable gaps)
- Hard ceiling: 3

### B5. No dedup against answered questions — MISSING FEATURE
**Code**: `generateJDQuestions()` checks Cloud evidence (via gates) but NOT socratic_qa history
- If user answered about Python during CV-upload, JD-match may ask again
- The evidence gap gate partially catches this (Socratic evidence exists → skip) but:
  - Only if the ANSWER was processed (not skipped)
  - Only within 90-day window
  - Doesn't catch "same skill, different node name" cases

**Fix needed**: Before generating JD questions, load recent socratic_qa answers for this user and skip skills already answered

### B6. Hardcoded fallback question — LOW QUALITY
**Code**: `analyze/route.ts:83-89`:
```typescript
const socratic = gapReq
  ? {
      question: `Can you tell me about any experience you have related to "${gapReq.name}"?...`,
      skill_targeted: gapReq.name,
    }
  : null;
```
- This is SEPARATE from generateJDQuestions() output
- It's a generic, low-quality fallback
- Both are returned in the response (socratic + socratic_questions), confusing

**Fix needed**: Remove this hardcoded question. Use generateJDQuestions() output exclusively.

### B7. No bridge questions — MISSING FEATURE
**Code**: generateJDQuestions() only asks about skills the Cloud HAS (line 730-734):
```typescript
const node = cloud.nodes.find(n => skillsMatch(n.name, skillName));
if (!node) continue;  // <-- skips skills not in Cloud entirely
```
- If JD requires "data pipeline architecture" and Cloud has "ETL engineering", this might match via skillsMatch()
- But if JD requires "Terraform" and Cloud has "CloudFormation" — no match, no question, no bridge
- Bridge questions ("how does your CloudFormation work relate to IaC broadly?") are never generated

**Fix needed**:
1. For unmatched JD requirements, check for ADJACENT skills in Cloud
2. If adjacent found → generate bridge question
3. If no adjacent → generate gap question (can they acquire this?)

### B8. No outcome context in questions — MISSING FEATURE
**Code**: generateJDQuestions() doesn't load outcome_signals or previous application history
- Can't generate "two employers flagged K8s" type questions
- Misses the cross-system intelligence loop

**Fix needed**: Load outcome_signals for skills matching JD requirements before generating questions

---

## PART C: Cross-System Issues

### C1. Two separate question return paths
**Code**: analyze/route.ts returns:
```typescript
return Response.json({
  ...analysis,           // includes analysis.socratic (hardcoded fallback)
  socratic_questions: socraticQuestions,  // engine-generated
});
```
- Frontend gets TWO different question sources
- No clear contract on which to use

**Fix**: Remove hardcoded `socratic` from analysis. Use `socratic_questions` exclusively.

### C2. Answer route doesn't refresh analysis
**Code**: `/api/socratic/answer` updates Cloud nodes but doesn't re-evaluate the JD match
- User answers "I deployed K8s clusters at scale"
- Cloud node updated ✓
- But the analysis page still shows "gap" for Kubernetes
- Position assessment not updated

**Fix**: After processing JD-match answers, optionally re-run or incrementally update the match analysis

### C3. No feedback loop completion
**Spec**: outcome signals → better JD questions → better CVs → better outcomes
**Code**: outcome_signals are written to cloud_nodes but NEVER READ by any system:
- generateJDQuestions() doesn't read outcome_signals
- CV generation doesn't read outcome_signals
- analyzeWithCloud() doesn't read outcome_signals
- The signals are write-only — dead data

**Fix**: This is the central gap. Every system that reads Cloud data should also consider outcome_signals.

---

## Summary: Priority-Ordered Fix List

### P0 (Blocking — breaks user experience)
1. **B1** — Persist JD questions to socratic_qa
2. **A6/B10** — Pass SocraticContext to generateJDQuestions
3. **B6/C1** — Remove hardcoded fallback, use engine exclusively

### P1 (Critical for Outcome Intelligence to work at all)
4. **A1** — Build free-text feedback parsing
5. **A2** — CV generation context injection
6. **C3** — Make outcome_signals readable (not write-only)
7. **A5** — Set industry field on applications
8. **B2** — Add application_id column to socratic_qa

### P2 (Quality improvements)
9. **B3** — Priority ordering by JD requirement importance
10. **B4** — Volume control for JD questions
11. **B5** — Dedup against previously answered questions
12. **A3** — Same company detection (UI alert)
13. **A4** — Gap accumulation → Socratic trigger

### P3 (Advanced features)
14. **B7** — Bridge questions for adjacent skills
15. **B8** — Outcome context in JD questions
16. **C2** — Live analysis refresh after answers
