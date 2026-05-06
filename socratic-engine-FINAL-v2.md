# JobLoop AI — Complete Pre-JD Pipeline: Final Design v2

> Consolidates: socratic-engine-final.md + socratic-two-phase-design.md + model-selection-audit.md
> Date: May 4, 2026
> Status: FINALIZED — validated with real human input test
> Replaces: socratic-engine-final.md (v1), socratic-two-phase-design.md

---

## SCOPE: Everything Before a JD is Posted

```
User signup
  → Persona selection (Step 1)
  → CV Upload (Step 2)
  → Phase 1: Conflict Resolution + Cloud Build (Step 3)
  → Phase 2: Evidence Enrichment (Step 4)
  → Ready (Step 5)
  → Dashboard
  → [USER POSTS FIRST JD — out of scope for this doc]
```

---

## STEP 1: PERSONA SELECTION

**What:** User picks from 9 personas (3x3 grid)
**Model:** None ($0)
**Personas:** early_career, mid_career, senior, executive, career_changer, freelancer, returner, laid_off, military

**Why it matters downstream:**
- Persona determines conflict detection behavior (Finding 5 from audit)
- Persona determines Phase 2 question framing
- Persona determines question budget

| Persona | Phase 1 behavior | Phase 2 behavior |
|---|---|---|
| military | Employer pattern detection ON, collapsed role detection ON | Transferable skills focus, avoid classified topics |
| freelancer | Employer pattern OFF, overlapping dates = normal (not conflict) | Top 3-5 projects, aggregate stats, client names |
| career_changer | Title mismatch across eras = intentional (not conflict) | Bridge skills, transferable competencies |
| early_career | Minimal conflicts expected (1-2 roles) | Project depth, academic→professional translation |
| laid_off | Focus on recent role accuracy | Reframe narrative, urgency-aware |
| executive | Date/title conflicts likely (long career) | Scope/budget/team, strategic impact |
| senior | Similar to executive but deeper technical probe | Domain depth, architectural decisions |
| mid_career | Standard conflict detection | Results-focused, progression, leadership moments |
| returner | Gap detection adjusted (gap is known, not suspicious) | Pre-gap strength, during-gap activity |

---

## STEP 2: CV UPLOAD

**What:** User uploads 1-5 CVs (PDF/DOCX) + optional LinkedIn
**Model:** Haiku per CV ($0.002 each)
**Output:** ParsedCVOutput per document

### Parser extracts (per CV):
- Roles: title, company, employer, dates, bullets, programs, team_size, seniority_signals
- Education: institution, degree, field, start_year, end_year, research_topic
- Certifications: name, issuer, year, active, tier (gold/specialization/course/military)
- Skills, languages, awards, summary

### What happens with multiple CVs:
- Each CV parsed independently — no cross-reference during parsing
- All parsed outputs stored in Supabase (user_cvs table, parsed_cv JSONB column)
- Parser does NOT merge or resolve — that's Phase 1's job

### Cost:
- 1 CV: $0.002
- 5 CVs: $0.010
- LinkedIn (if provided): $0 (structured data, no LLM needed)

---

## STEP 3: PHASE 1 — CONFLICT RESOLUTION + CLOUD BUILD

This is the most complex step. Two sub-stages:
- 3a: Conflict detection + user questions
- 3b: Resolution + Cloud build

### 3a: CONFLICT DETECTION

**Model:** None — pure algorithmic logic ($0)

The system compares all parsed CVs against each other. No LLM needed.

#### Detection algorithms:

**1. Employer Pattern** (persona-gated: ON for military/senior, OFF for freelancer)
```
If all roles map to government/military/single-org entities:
  → Flag: "Possible single employer with rotational postings"
  → Question: confirm if single employer
```

**2. Collapsed Role** (persona-gated: OFF for freelancer overlapping dates)
```
If any role duration > 30 months AND (
  bullets mention 2+ distinct responsibility domains OR
  LinkedIn shows 2+ roles in same period OR
  multiple organizations mentioned in same entry
):
  → Flag: "This entry may be multiple roles"
  → Question: "Were these separate assignments?"
```

**3. Title Mismatch**
```
If same date range appears across 2+ CVs with 3+ different titles:
  → Flag: "Same role, different names"
  → Question: "Which title is most accurate?"
```

**4. Date Conflict**
```
If same role (matched by company+approximate dates) has start/end dates
  differing by > 2 months across CVs:
  → Flag: "Dates disagree"
  → Question: "Which dates are correct?"
```

**5. LinkedIn Split Detection**
```
If LinkedIn shows N roles where CVs show < N for the same period:
  → Flag: "LinkedIn shows more granular breakdown"
  → Used as evidence for collapsed role detection (not a separate question)
```

**6. Timeline Gap**
```
If gap > 6 months between consecutive roles (after date alignment):
  → Flag: "Unexplained gap"
  → Question: "What were you doing during this period?"
  → EXCEPTION: if persona = returner, known gap is not flagged
```

**7. Education Date Mismatch**
```
If same degree has different start/end years across CVs:
  → Flag: "Education dates disagree"
  → Question: "Which dates are correct?"
```

#### Question Generation:

Questions are generated from templates — no LLM needed.

**Hard cap: 6 questions maximum per onboarding.**

Priority order when > 6 conflicts detected:
1. CRITICAL: Employer pattern, collapsed roles (these change Cloud structure)
2. IMPORTANT: Date conflicts, title mismatches (these affect accuracy)
3. MINOR: Education dates, overlapping current roles (auto-resolve with best guess)

Group related conflicts into combo questions:
- All title mismatches → 1 question with per-period sub-items
- All date conflicts → 1 question with per-role sub-items

If still > 6 after grouping: defer remaining MINOR conflicts to Profile Review in dashboard.

### 3a: USER ANSWERS QUESTIONS

**UI:** Inline cards in Step 3 (not popup, not chatbot)

Each question card has:
- Type badge + icon (Career Pattern, Role Details, Date Confirmation, etc.)
- Priority indicator (critical = amber badge)
- Question text + context
- Pre-built options (radio buttons) — 2-4 choices
- Optional free-text area
- Progress pills (1 of N)
- Back / Next / Skip navigation

**For collapsed role questions specifically — STRUCTURED sub-fields:**
```
"This 3-year period might contain multiple roles."

Role 1: [Title field] [Start month picker] [End month picker] [Org field]
Role 2: [Title field] [Start month picker] [End month picker] [Org field]
[+ Add another role]

What did you do in each? (optional)
[Text area per role]
```

This structured input means NO LLM needed for date/title extraction.
LLM only needed for free-text responsibility descriptions.

**Skip behavior:**
- Skip individual question: conflict marked "unresolved", Cloud builds with best guess
- Skip all: Cloud builds with parser output as-is, all conflicts marked "unresolved"
- Unresolved conflicts shown in Profile Review (dashboard) for later resolution

### 3a: ANSWER PARSING

**Model selection — based on answer type, NOT word count:**

| Answer type | Model | Cost |
|---|---|---|
| User picked pre-built option | None — direct mapping | $0 |
| User filled structured sub-fields (date pickers, title fields) | None — direct mapping | $0 |
| User typed free text, NO structural complexity signals | Haiku | $0.002 |
| User typed free text, HAS structural complexity signals | Sonnet | $0.02 |

**Structural complexity signals (regex pre-scan, no LLM):**
- Multiple date references ("from jan 2020... then june 2021... then sept 2022")
- Temporal overlap words ("overlapping", "at the same time", "while also", "on the side")
- Multiple organization names in one answer
- Role transition language ("then I moved", "was promoted", "got posted")
- 3+ distinct responsibility domains mentioned

If ANY of these detected → Sonnet. Otherwise → Haiku.

**MANDATORY: Confirmation card after every LLM-parsed answer:**
```
"Here's what I understood:

  Role 1: Assistant Director Development (Avionics)
  Dates: Jan 2020 — Jun 2021
  Organization: PMO, JF-17 Program

  Role 2: Senior Engineering Officer
  Dates: Jun 2021 — Sep 2022
  Organization: Crotale SHORAD Field Unit

  Is this correct? [Yes] [Edit]"
```

No extra API cost — just a UI confirmation step. Prevents bad data in Cloud.

### 3b: CLOUD BUILD

**Model:** None ($0)
**Input:** Resolved profile (parsed CVs + user's Socratic corrections)
**Output:** ProfileCloud v1

Process:
1. Merge all CV parsed outputs into unified timeline
2. Apply user's conflict resolutions (corrected dates, titles, split roles, new roles)
3. Deduplicate bullets across CVs (same role, different wording → keep richest version)
4. Classify skills with evidence sources
5. Build ProfileCloud structure

Cloud stores:
- Canonical role timeline (no duplicates, no gaps, employer-consistent)
- Skills with evidence chains (which role, what bullet, what source CV)
- Education with correct dates
- Certifications with tiers
- Programs/platforms across career
- Metadata: persona, total experience, domain trajectory

### Step 3 Total Cost:

| Component | Cost |
|---|---|
| Conflict detection | $0 |
| Question generation | $0 |
| Answer parsing (0-3 LLM calls depending on free text) | $0 - $0.06 |
| Confirmation UI | $0 |
| Cloud build | $0 |
| **Step 3 total** | **$0 - $0.06** |

Typical case (2 free-text answers, 1 Sonnet + 1 Haiku): ~$0.022

---

## STEP 4: PHASE 2 — EVIDENCE ENRICHMENT

**When:** After Cloud v1 is built. Onboarding Step 4.
**Model:** Sonnet for question generation + answer parsing
**Budget:** 3-5 questions maximum (research-backed: 7+ fields = 50% bounce)
**Skip:** Always available — "Skip — I'll add details later"

### What Phase 2 knows that Phase 1 didn't:
- Complete role timeline (no ambiguity)
- Skill evidence map (which skills have thin evidence)
- Career trajectory (domain shifts, seniority progression)
- Persona (confirmed or auto-detected from CV data)
- Programs/platforms (which ones span multiple roles)

### Question Selection Logic:

```
Priority 1: Skills with NO evidence beyond CV bullets
  → "You list {skill}. Can you describe a specific project where you used it?"

Priority 2: Roles with team_size > 10 but no outcome metrics
  → "You managed {N} people at {company}. What outcomes did your team achieve?"

Priority 3: Programs spanning 2+ roles with no quantified impact
  → "You worked on {program} across {N} roles. What was the program's scale
     and your biggest contribution?"

Priority 4: Career domain transitions
  → "You moved from {domain_a} to {domain_b}. What skills transfer?"

Priority 5: Gold certifications in non-obvious context
  → "You hold {cert}. How did you apply it in {actual_domain}?"
```

### Persona-Aware Framing:

| Persona | Framing adjustment |
|---|---|
| military | "What transferable skills did this posting give you?" Not: "What did you do?" |
| executive | "What was the business impact?" Not: "What tools did you use?" |
| career_changer | "What from {old domain} applies to {new domain}?" |
| early_career | "Tell me about your biggest project." Encouraging, not interrogating. |
| freelancer | "Of your projects, which 3-5 had the most impact?" |
| laid_off | "What were you most proud of in that role?" Never frame as failure. |
| returner | Focus on pre-gap strength. Never ask WHY they took a break. |

### Question Generation:

**Model:** Sonnet ($0.02)
- Input: Cloud v1 + persona + question priority logic
- Output: 3-5 questions with context previews ("Here's what I found in your CV: [evidence]. Tell me more about...")
- One Sonnet call generates all questions at once

### Answer Parsing:

**Model:** Same as Phase 1 rules — structural complexity scan → Haiku or Sonnet
- But Phase 2 answers tend to be richer (narrative, not just dates/titles)
- Expect 60-70% of answers to need Sonnet

**MANDATORY: Confirmation card after every parsed answer.**

### Output:
- New evidence entries added to Cloud skill nodes
- Cloud version increment (v1 → v2)
- Each new evidence tagged: source = "socratic_enrichment", confidence = "user_confirmed"
- Future CV generation automatically uses enriched Cloud

### Step 4 Cost:

| Component | Cost |
|---|---|
| Question generation (1 Sonnet call) | $0.02 |
| Answer parsing (3-5 answers, mostly Sonnet) | $0.04-0.10 |
| **Step 4 total** | **$0.06-0.12** |

---

## STEP 5: READY

**What:** Celebration screen. Cloud summary. Dual CTA ("Paste a Job" / "Explore Dashboard").
**Model:** None ($0)

Shows:
- Total roles: N
- Skills identified: N (with evidence strength indicators)
- Career span: YYYY — Present
- "Your Cloud is ready. Paste a job description to see how it works."

---

## COMPLETE ONBOARDING COST

| Step | Model(s) | Cost range |
|---|---|---|
| 1. Persona | None | $0 |
| 2. CV Upload (1-5 CVs) | Haiku | $0.002-0.010 |
| 3. Phase 1 (conflict + Cloud) | Logic + Haiku/Sonnet for parsing | $0-0.06 |
| 4. Phase 2 (enrichment) | Sonnet | $0.06-0.12 |
| 5. Ready | None | $0 |
| **TOTAL** | | **$0.06-0.19** |

Conservative typical case (3 CVs, 6 conflicts, 4 enrichment Qs): ~$0.10

At $19/month with 69% margins → onboarding = 1.7% of first month revenue. Negligible.

---

## DATA FLOW SUMMARY

```
                    ┌─────────────┐
                    │  CV Upload  │ 1-5 PDFs + optional LinkedIn
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Haiku Parse │ $0.002/CV — independent per document
                    └──────┬──────┘
                           │
                    ┌──────▼──────────────┐
                    │ Conflict Detection  │ Pure logic ($0)
                    │ Compare all parsed  │ Persona-aware rules
                    │ CVs against each    │ Max 6 questions
                    │ other               │
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ User Answers        │ Inline cards UI
                    │ Phase 1 Questions   │ Options + structured fields
                    │                     │ + optional free text
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ Answer Parsing      │ $0 for options/fields
                    │ (if free text)      │ Haiku/Sonnet based on
                    │                     │ structural complexity
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ Confirmation Card   │ "Is this correct?" UI
                    │ (after LLM parse)   │ [Yes] [Edit]
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ Cloud Build         │ Pure logic ($0)
                    │ Merge + deduplicate │ ProfileCloud v1
                    │ + classify          │
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ Phase 2: Enrichment │ Sonnet generates Qs ($0.02)
                    │ 3-5 persona-aware   │ Sonnet parses answers
                    │ questions           │ ($0.02 each)
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ Confirmation Cards  │ Per parsed answer
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ Cloud v2            │ Enriched with Socratic
                    │ (source of truth)   │ evidence
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ Ready / Dashboard   │ User sees Cloud summary
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ [JD POSTED]         │ Out of scope for this doc
                    └─────────────────────┘
```

---

## AUDIT FIXES INCORPORATED

| Finding | Fix | Where in flow |
|---|---|---|
| Classifier bootstrap | Rule-based pre-classifier for answer complexity, not word count | Step 3a answer parsing |
| Word count bad proxy | Regex scan for structural complexity signals | Step 3a answer parsing |
| Silent Haiku failures | Mandatory confirmation card after every LLM parse | Steps 3a + 4 |
| Question count unbounded | Hard cap 6 (Phase 1) + 5 (Phase 2) with priority grouping | Steps 3a + 4 |
| Freelancer false positives | Persona-gated conflict detection rules | Step 3a detection |
| Skip logic time decay | Not applicable pre-JD (first time). Applies to JD Socratic (separate doc) | N/A here |
| First JD always Sonnet | Not applicable pre-JD. Applies to JD Socratic (separate doc) | N/A here |
| Dynamic UI for collapsed roles | Structured sub-fields: title/dates/org per role + "Add another" | Step 3a UI |
| Cross-answer contradiction | Validation pass after all Phase 1 answers collected | Step 3a end |
| Cloud manual correction | Profile editor in dashboard (Phase 2 feature, data model supports it) | Post-onboarding |

---

## WHAT WAS VALIDATED WITH REAL HUMAN INPUT (May 4, 2026)

Test: 5 real CVs (4 targeted + 1 LinkedIn) for same person (military career, 16+ years)

| Metric | Result |
|---|---|
| Conflicts detected (blind) | 12 |
| Questions generated | 6 (at cap) |
| Questions answered by real human | 6 |
| Roles resolved | 9 |
| Hidden roles discovered via Socratic | 1 (Crotale SHORAD — absent from ALL CVs + LinkedIn) |
| Simulated answers that were WRONG | 5 of 6 had incorrect details |
| Titles corrected (real title ≠ any CV version) | 1 ("System Design Engineer" — none of 5 CVs had this) |
| Dates corrected | 3 periods (AEW&C, China, MS degree) |
| Timeline gaps after resolution | 0 |
| Duplicate roles after resolution | 0 |

**Key lesson:** Simulating user answers with ground-truth knowledge proves nothing. Only real human input validates the pipeline. 5 of 6 simulated answers had wrong details — titles, dates, role boundaries, even the existence of a role (phantom PMO AEW&C was never confirmed by user).

---

## WHAT THIS DOC DOES NOT COVER

- JD-triggered Socratic questions (separate doc needed — model selection for JD gap analysis)
- Outcome Intelligence feedback loop (see outcome-intelligence-v3.md)
- AutoResearch optimization (see karpathy-adaptation.md)
- CV generation from Cloud (see cv-generation pipeline docs)
- The 50-CV pre-launch test (see socratic-engine-final.md testing section — still valid)
