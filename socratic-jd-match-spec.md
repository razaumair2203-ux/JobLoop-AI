# Socratic JD-Match Questioning — Specification

> Source of truth for how the Socratic engine behaves when a JD is analyzed.
> Companion to: socratic-engine-spec-v4.md (CV-upload Socratic behavior)
> Date: May 15, 2026

## 1. Purpose

When a user pastes a job description, the system does two things:
1. **Analyzes fit** — matches Cloud evidence against JD requirements (this works)
2. **Asks targeted questions** — fills gaps that matter for THIS specific application

The JD-match Socratic is fundamentally different from CV-upload Socratic:

| | CV-Upload Socratic | JD-Match Socratic |
|---|---|---|
| **Goal** | Enrich the Cloud broadly | Fill gaps that matter for THIS job |
| **Priority** | User's strongest skills first | JD's hardest requirements first |
| **Trigger** | Once, after upload | Every JD analysis (if gaps exist) |
| **Urgency** | "Let's build your profile" | "You're about to apply — let's strengthen your case" |
| **Volume** | 3-6 questions (adaptive) | 1-3 questions (focused, fast) |
| **Persistence** | Enriches Cloud permanently | Enriches Cloud + linked to this application |
| **Context** | What the CV shows | What the CV shows + what the JD demands |

**Core principle**: JD Socratic questions are application-specific. "This role needs Kubernetes production experience. Your Cloud shows K8s listed but no depth. Do you have deployment experience you haven't mentioned?"

## 2. Audit Findings (May 15, 2026)

### What EXISTS

| Component | File | Status |
|-----------|------|--------|
| `generateJDQuestions()` | `packages/ai/src/socratic.ts:713-761` | **Working** — uses same 3-gate system |
| Called from analyze route | `apps/web/src/app/api/analyze/route.ts:244-251` | **Working** — generates questions for gaps |
| Hardcoded fallback question | analyze/route.ts:83-89 | **Working but BAD** — bypasses engine entirely |
| SocraticContext support | socratic.ts:716 | **Working** — ctx param accepted |
| Gap complexity classification | socratic.ts:215-261 | **Working** — simple/complex/gray_zone |

### Critical Gaps

1. **Questions NOT persisted** — JD questions returned in API response but never saved to socratic_qa. If user refreshes, questions are gone. If they answer, the answer route can't find the original question row.

2. **No application_id linkage** — When a JD question is answered, there's no way to correlate it back to the specific application. The answer route supports `application_id` in the body, but analyze route doesn't persist questions to create the rows.

3. **No priority ordering by JD requirement** — `generateJDQuestions()` iterates JD skills in array order. Hard requirements should be asked first, preferred requirements last. A gap in a "must-have" is worth more than a gap in a "nice-to-have."

4. **No volume control** — CV-upload has adaptive volume (3/5/6 based on maturity). JD-match has no limit — could generate 10+ questions for a complex JD. Users should get 1-3 focused questions, not a questionnaire.

5. **No bridge questions** — Only asks about gaps ("do you have X?"). Never asks bridge questions ("how does your Y experience relate to the X they're asking for?"). Bridge questions are unique to career changers and stretch applications.

6. **No dedup against answered questions** — If user answered "tell me about your Python experience" during CV-upload Socratic, JD-match will ask about Python again if the JD requires it. Wastes user's time.

7. **Hardcoded fallback bypasses engine** — `mapToResponse()` at line 83-89 generates a hardcoded question `"Can you tell me about any experience..."` that bypasses all gating, node-type awareness, and context. This is the WORSE version of what `generateJDQuestions()` produces. If the engine produces questions, this fallback is redundant. If the engine fails, this fallback is low-quality.

8. **No frontend flow for JD questions** — Analyze page returns questions but there's no structured UI to answer them. Users would need to see the questions, type answers, and submit — all within the analysis result view.

9. **No previous application context** — If user applied to similar roles before and got feedback ("they wanted more K8s"), JD-match Socratic should know this. "Two previous employers in this niche flagged Kubernetes. Can you describe any K8s production work?"

10. **SocraticContext not passed from analyze route** — `generateJDQuestions(cloud, result.parsed_jd)` is called without the third `ctx` parameter. No persona or candidate_context reaches the question generator.

## 3. Desired Capabilities

### 3.1 The JD-Match Questioning Flow

```
User pastes JD
  → System analyzes fit (match_report)
  → For each GAP or WEAK requirement:
      Gate 1: Is this requirement HARD or PREFERRED?
      Gate 2: Does the Cloud ALREADY have evidence? (dedup check)
      Gate 3: Has user answered about this skill before? (socratic_qa check)
      Gate 4: Would an answer help THIS application? (marginal value)
      → If all pass: generate a question
  → Priority sort: hard requirements first, then by gap severity
  → Volume limit: max 3 questions (user is about to apply, not onboarding)
  → Persist to socratic_qa with application_id + gate="jd_match"
  → Return in analysis response
  → User answers (inline in analysis view)
  → Answers enrich Cloud + linked to this application
  → CV generation IMMEDIATELY uses the new evidence
```

### 3.2 Question Types (JD-Specific)

**Gap question** (skill not in Cloud at all):
```
"This role requires Terraform experience. Your profile doesn't show it directly.
Have you worked with any infrastructure-as-code tools — CloudFormation, Ansible,
or similar? Even exposure counts."
```

**Depth question** (skill in Cloud but thin):
```
"The JD emphasizes Kubernetes in production. Your Cloud shows K8s exposure at
TechCo but without deployment details. Can you describe a specific K8s deployment
you managed — cluster size, services, challenges?"
```

**Bridge question** (adjacent skill needs repositioning):
```
"This role needs 'data pipeline architecture.' Your Cloud has strong ETL evidence
from your analytics work. How would you describe the architectural decisions in
your ETL systems? Think: scalability, fault tolerance, monitoring."
```

**Outcome-informed question** (previous feedback in same niche):
```
"Two previous employers in fintech flagged Kubernetes production depth. Your Cloud
has grown since then — can you describe your most recent K8s production work?"
```

### 3.3 Four-Gate System (JD-Specific)

The CV-upload Socratic uses three gates. JD-match adds a **priority gate**:

**Gate 1 — JD Priority**: Is this a hard or preferred requirement?
- Hard requirement with gap → always ask (high urgency)
- Preferred requirement with gap → ask if room remains
- "Nice to have" → skip unless nothing else to ask

**Gate 2 — Dedup**: Has user already answered about this skill?
- Check socratic_qa for any answer targeting this skill (any gate)
- If answered <90 days ago AND evidence was added → skip (already enriched)
- If answered but answer was a skip → ask differently ("last time you skipped X, but this JD specifically requires it")

**Gate 3 — Cloud Evidence**: What does the Cloud already know?
- Strong evidence (depth + impact + multiple roles) → skip
- Some evidence (1 role, no impact) → ask for depth/impact
- No evidence but adjacent skill exists → ask bridge question
- No evidence at all → ask gap question

**Gate 4 — Marginal Value**: Will an answer help THIS application?
- If the gap is the biggest risk → high marginal value (ask first)
- If the gap is one of many → lower marginal value
- If the user is in a stretch position (3+ gaps) → focus on the 1-2 most addressable gaps, not all of them

### 3.4 Adaptive Volume (JD-Match Specific)

JD-match questions must be FAST. User is evaluating whether to apply.

| Scenario | Max Questions | Reasoning |
|----------|-------------|-----------|
| Strong position (1-2 weak areas) | 1-2 | Minor gaps, quick enrichment |
| Competitive (3-4 gaps) | 2-3 | Focus on hardest requirements |
| Stretch (5+ gaps) | 1-2 | Don't overwhelm — pick the most addressable |
| Re-application (same company) | 1 | "What's changed since last time?" |
| Similar niche (has outcome data) | 1-2 | Outcome-informed, more targeted |

**Hard ceiling**: 3 questions. This is analysis time, not onboarding.

### 3.5 Persistence & Linkage

JD questions MUST be:
1. Saved to `socratic_qa` with `gate = "jd_match"` and `application_id`
2. Retrievable if user returns to the analysis page
3. Linked so outcome intelligence can correlate "which questions led to better outcomes"

```sql
-- socratic_qa row for JD-match question
INSERT INTO socratic_qa (
  user_id, application_id, question, skill_targeted,
  gate, answer, answered_at
) VALUES (
  $user_id, $application_id, $question, $skill_name,
  'jd_match', NULL, NULL
);
```

### 3.6 Answer Processing

When user answers a JD-match question:
1. Process answer through `processAnswer()` → Cloud node updated
2. Save answer to socratic_qa row (update existing, same as CV-upload)
3. The ANALYSIS should reflect the new evidence immediately:
   - Re-evaluate the gap that triggered the question
   - Update position assessment if evidence strengthens
   - Update bridge strategies if new evidence enables better positioning
4. CV generation (when user proceeds) uses the enriched Cloud

### 3.7 Integration with Outcome Intelligence

JD Socratic questions create a feedback arc:

```
JD analysis → gaps identified → Socratic questions generated
  → user answers → Cloud enriched → CV generated with stronger evidence
  → user applies → outcome received → feedback parsed
  → NEXT similar JD analysis → outcome signals inform questions
    "Two employers in fintech flagged K8s. Your answer from March
     added evidence but didn't fully address production scale.
     Can you elaborate on cluster sizes and deployment frequency?"
```

This is the **cross-system intelligence loop**:
- Socratic enriches Cloud → better CVs
- Outcomes teach what matters → better Socratic questions
- Better questions → richer Cloud → even better CVs

### 3.8 Corner Cases

**User applies to 3 similar JDs in one day**:
- First JD: full question set (1-3 Qs)
- Second JD: dedup check — only ask about NEW gaps or gaps not yet answered
- Third JD: likely 0-1 questions (most gaps already addressed)

**User has zero Cloud** (somehow got to JD analysis without CV):
- Reject with "Upload a CV first" (already handled in code)

**JD has no hard requirements** (vague JD):
- Fall back to preferred requirements
- If JD is truly empty, no questions (nothing to target)

**User skips all JD questions**:
- Track skip count per application
- If user skips >50% across applications, reduce future JD question volume
- Never block the user — they can always proceed without answering

**JD requires a skill the Cloud has STRONG evidence for**:
- No question needed — gates correctly filter this out
- But: if the POSITION assessment still shows "stretch," consider asking about adjacent skills

**User answered during CV-upload but evidence is stale (>90 days)**:
- Re-ask with JD context: "You mentioned K8s work 4 months ago. This role specifically needs production deployment. Has anything changed since then?"

**Same skill, different JD framing**:
- JD A says "data pipeline architecture"
- JD B says "ETL engineering"
- Skill matching (skillsMatch()) must recognize these as the same concept
- Don't ask the same question twice with different wording

## 4. Competitive Landscape (Researched May 15, 2026)

### JD-Specific Questioning — Two-Context Systems

| Platform | Resume+JD Input | Gap-Specific Questions | Profile Enrichment | Persistent |
|----------|----------------|----------------------|-------------------|-----------|
| Teal "Coach Me" | Per-section only | Generic per section | No | No |
| Rezi | Score-based flags | No questions | No | No |
| Jobscan | Keyword match % | No questions | No | No |
| Final Round AI | Resume + role | Role-specific prep, NOT gap-specific | No | Session only |
| SocraticPrep.ai | Resume claims | Claim-verification (not gap-filling) | No | Tracks weaknesses |
| **Parakeet AI** | **Resume + JD via NLP** | **Explicit gap-targeting** | **No** | **Session only** |
| GlowUp My Resume | Resume only | Weakness probing | No | Session only |
| Interviews Chat | Resume + JD paste | Potential interview Qs | No | No |
| **JobLoop** | **Cloud + parsed JD** | **Evidence-gap + bridge + outcome-informed** | **Yes — Cloud enrichment** | **Persisted + outcome-correlated** |

**Parakeet AI** is the closest commercial competitor (researched May 2026): explicitly cross-references resume with JD using NLP, identifies mismatches, generates behavioral/technical/situational questions for gap areas. Their docs say: "If your resume lacks a skill the job requires, the AI generates questions designed to probe that area." But:
1. It's interview prep, not evidence discovery (helps you practice, not surface hidden experience)
2. No persistent profile enrichment (answers don't improve future applications)
3. No outcome correlation (doesn't learn from what worked)
4. No bridge questions (doesn't connect adjacent skills)

**SocraticPrep.ai** verifies claims you made in documents (Socratic method, interrupts on vague claims). But does NOT use JD context at all — it defends what you wrote, not what you're missing.

**Greenhouse** (recruiter-side): AI generates structured interview questions from JD→attributes→questions→scorecard. Same pipeline as ours but reversed — they ask interviewers, we ask candidates. Critically: **no ATS adapts screening questions per-candidate based on their individual resume.** All candidates get the same questions for the same role.

### Academic Foundations

**Cognitive Diagnostic Computerized Adaptive Testing (CD-CAT)**:
- Maintains a **knowledge state vector** (alpha) representing mastery of each attribute — structurally identical to our Cloud skill-by-skill evidence map
- Item selection maximizes information gain for the **most uncertain attributes** — ask about the skill where Cloud evidence is weakest relative to JD requirement
- Methods: Kullback-Leibler information index, Shannon entropy, posterior-weighted KL
- Key papers: "Combining CAT with cognitive diagnosis" (Behavior Research Methods), "Stratified Item Selection in CD-CAT" (PMC7433381)

**TestAgent** (arXiv 2506.03032, June 2025):
- First LLM-based adaptive testing agent. Selects questions adaptively based on test-taker's estimated state
- Achieves same accuracy with **20% fewer questions** than SOTA baselines
- Directly relevant: use LLM to decide which gap question yields most evidence, not just ask all gaps sequentially

**FATA Framework** (arXiv 2508.08308, August 2025):
- "First Ask Then Answer" — LLM generates structured checklist of needed information BEFORE responding
- Addresses gap between what user provided and what system needs
- Our analog: when JD arrives, proactively identify what Cloud is missing before generating CV

**Intelligent Tutoring Systems (ITS)**:
- Student Model (current state) vs Domain Model (target) → Pedagogical Module selects questions
- Zone of Proximal Development: match challenge to learner's competence
- Our analog: Cloud (current evidence) vs JD Requirements (target) → questions in the "zone of useful enrichment"
- Gen AI enables dynamic question formulation based on actual user input (beyond item-bank selection)

**Medical Differential Diagnosis**:
- Patient profile + suspected conditions → adaptive questions to confirm/disqualify
- AMIE (Google/DeepMind, Nature 2025): LLM for diagnostic reasoning with targeted follow-ups
- Q4Dx (Nature Scientific Reports 2026): measures LLM questioning efficiency under varying information constraints
- Adaptive Top-K Algorithm (TPKA): dynamically adjusts which symptoms/diseases to consider
- Strongest two-context analog: known evidence + target match → information-theoretic question selection

### What Nobody Does (Our Whitespace — Confirmed by Research)

Research confirmed these are genuinely novel (no tool, paper, or open-source project does them):

1. **Evidence-discovery questioning from profile+JD**: Parakeet AI asks gap questions for interview prep. Nobody asks "you might have experience but your CV doesn't show it — tell us more?" to enrich a persistent profile
2. **Bridge questioning**: No system generates "how does your CloudFormation work relate to the Terraform they're asking for?" — they either ask about X or Y, never the connection
3. **Outcome-informed JD questions**: No system feeds "two employers flagged K8s" back into question generation for the next similar JD
4. **Progressive dedup across applications**: No tracker remembers questions asked across applications
5. **Immediate profile enrichment**: No system takes the answer, enriches the profile, and uses it in CV generation — all in one flow
6. **Per-candidate adaptive screening**: No ATS adapts questions based on individual resume — all candidates get same questions

### Architectural Patterns Worth Stealing

| Pattern | Source | Application to JobLoop |
|---------|--------|----------------------|
| CD-CAT item selection (maximize info gain) | Psychometrics | Ask about skill with highest uncertainty first, not just any gap |
| TestAgent LLM-based adaptive testing | Assessment (arXiv) | Use LLM to rank which gap question yields most evidence |
| FATA proactive checklist | NLP/Dialogue (arXiv) | Generate full gap checklist before starting CV gen |
| Greenhouse JD→attributes→questions→scorecard | Recruiting | Mirror on candidate side: JD→requirements→gap Qs→evidence→Cloud |
| Differential diagnosis adaptive questioning | Medicine | Re-rank remaining gaps after each answer (Phase 4 mid-stream) |
| Model-tracing from ITS | Education | If user's answer reveals misunderstanding of JD requirement, correct |

Sources: Parakeet AI Blog, SocraticPrep.ai, Final Round AI, GlowUp My Resume, Greenhouse Support, arXiv 2506.03032 (TestAgent), arXiv 2508.08308 (FATA), PMC7433381 (CD-CAT), Nature 2025 (AMIE), Nature Scientific Reports 2026 (Q4Dx), PMC11431395 (Adaptive Top-K), Springer (CD-CAT item selection), PMC12078640 (ITS review), Brookings (Gen AI in tutoring), Frontiers 2025 (CD-CAT in surgical education)

## 5. Dev Mode Behavior

In dev mode (Claude Code is the LLM):

`generateJDQuestions()` MUST:
1. Accept and use SocraticContext (persona + candidate_context)
2. Use dev templates that reference the ACTUAL JD requirement text
3. Distinguish between gap, depth, and bridge questions
4. Respect the 3-question hard ceiling
5. Priority-sort by JD requirement importance (hard > preferred > nice-to-have)

Dev templates should feel like:
```
"This role at {company} specifically requires {jd_requirement}.
Your Cloud shows {evidence_summary_for_skill}. {targeted_question}"
```

NOT:
```
"Tell me about your experience with {skill}."  // generic garbage
```

## 6. Implementation Plan

### Phase 1: Fix Critical Gaps (pre-launch) — DONE May 15, 2026
- [x] Pass SocraticContext to generateJDQuestions from analyze route
- [x] Add priority sorting (hard requirements first, then preferred)
- [x] Add volume control (max 3 in both engine + route)
- [x] Persist JD questions to socratic_qa with application_id
- [x] Remove hardcoded fallback question from mapToResponse()
- [x] Set industry field on applications from parsed JD
- [x] Same company detection with history returned to frontend
- [ ] Dedup against previously answered questions (needs socratic_qa lookup in engine)

### Phase 2: Bridge Questions + Outcome Integration
- [ ] Add bridge question type (adjacent skill → target requirement)
- [ ] Load outcome signals for similar niche before generating questions
- [ ] Outcome-informed question templates
- [ ] Re-evaluate analysis after answers submitted

### Phase 3: Frontend Flow
- [ ] Inline question/answer UI in analysis result view
- [ ] "Answer to strengthen your application" framing
- [ ] Live update of position assessment as answers come in
- [ ] "Skip — apply anyway" always available

### Phase 4: Mid-Stream Adaptation (POST-LAUNCH)
- [ ] After user answers Q1, re-analyze gaps before generating Q2
- [ ] Architecture ready: processAnswer() updates Cloud in-memory
- [ ] Best for stretch applications with complex gaps
- [ ] See socratic-engine-spec-v4.md Phase 4

## 7. Data Flow Diagram

```
User pastes JD
    │
    ▼
analyze/route.ts
    ├── analyzeWithCloud(cloud, jdText) → match_report + insights
    ├── generateJDQuestions(cloud, parsedJD, ctx) → questions
    │     ├── For each JD skill:
    │     │     ├── Gate 1: JD Priority (hard/preferred)
    │     │     ├── Gate 2: Dedup (socratic_qa check)
    │     │     ├── Gate 3: Cloud Evidence (same as CV-upload)
    │     │     └── Gate 4: Marginal Value (for THIS application)
    │     ├── Priority sort (hard first, gap severity)
    │     ├── Volume limit (1-3 max)
    │     └── Return questions
    ├── Persist questions → socratic_qa (gate=jd_match, application_id)
    └── Return analysis + questions to frontend
            │
            ▼
    Frontend: Analysis Result View
    ├── Show match report, position, strategies
    ├── Show Socratic questions (if any)
    │     ├── User answers inline
    │     ├── Submit → POST /api/socratic/answer
    │     │     ├── processAnswer() → Cloud node updated
    │     │     ├── Save answer to socratic_qa
    │     │     └── Return updated node
    │     └── Analysis updates live
    └── User proceeds to CV generation
            │
            ▼
    CV generation uses ENRICHED Cloud
    (including fresh Socratic evidence from JD questions)
```
