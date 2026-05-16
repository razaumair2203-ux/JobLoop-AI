# Socratic Engine v4 — Specification

> Source of truth for the Socratic questioning system.
> Replaces: socratic-engine-FINAL-v2.md (architecture valid, implementation gaps addressed here)
> Date: May 15, 2026

## 1. Purpose

The Socratic engine transforms a CV (a static document) into a living, evidence-rich Profile Cloud. It does this by asking **targeted, contextual questions** that reveal information the CV didn't capture — impact metrics, depth of expertise, transferable skills, team scope, and validation.

**Core principle**: Every question must earn its place. If the Cloud already has strong evidence for a skill, don't ask. If the user is an early-career nurse, don't ask about P&L management. If they just uploaded a 4-page detailed CV, ask fewer questions than someone who uploaded a 1-page summary.

## 2. Audit Findings (May 15, 2026)

### Critical (P0)
1. **Questions not persisted** — Generated in-memory, lost on refresh. New questions generated each time.
2. **No candidate_context/persona passed to generator** — Prompt expects them, code never provides them.
3. **"skipped" answers create garbage evidence** — Literal string "skipped" treated as real answer.
4. **handleSocraticComplete() called during render** — React side-effect anti-pattern.

### High (P1)
5. **Dev mode returns generic templates** — Not contextual to actual CV content.
6. **Answers sent sequentially** — 6 API calls in a loop instead of batch.
7. **Marginal value gate is global** — 80% cloud depth kills ALL questions, even for new skills.
8. **No Cloud rebuild after Socratic** — Individual nodes updated but classified cloud not refreshed.

### Medium (P2)
9. **No question dedup across sessions** — If user re-uploads, same gaps generate same questions.
10. **No answer quality signal** — Can't distinguish "I wrote 3 sentences" from "I pasted a paragraph."

## 3. Desired Capabilities

### 3.1 Context-Awareness (THE differentiator)

The engine MUST understand:

- **WHO the user is**: profession, specialization, career level, country
  - Source: `candidate_context` from CV parser (Step 0)
  - Source: `persona` from user selection (onboarding step 1)

- **WHAT their Cloud looks like**: which skills are deep, which are shallow, which are missing impact
  - Source: `CloudNode.summary` (has_impact, has_depth, number_of_roles, has_external_validation)
  - Source: `CloudMaturity` (thin/medium/rich per domain)

- **WHERE they are in the journey**: first upload? re-upload after edits? post-JD match?
  - Source: trigger type (cv_upload vs jd_match)
  - Source: `socratic_qa` count for this user

- **WHAT they've already told us**: previous Socratic answers, conflict resolutions
  - Source: `socratic_qa` table (question + answer + skill_targeted)
  - Must NEVER re-ask something already answered

### 3.2 Question Quality

Every question must:
1. Target a SPECIFIC evidence gap (not "tell me more about X")
2. Be answerable in 1-3 sentences (onboarding, not interview)
3. Use domain-appropriate language (clinical outcomes for doctors, KPIs for business)
4. Feel like a curious expert conversation, not a form
5. Include a visible "why_asking" so user understands the value

Question types (by evidence gap):
- **Impact**: "What measurable change resulted?" → `ImpactEvidence`
- **Depth**: "Walk me through a specific challenge" → deepens role evidence
- **Scale**: "How large was the team/project/budget?" → scope context
- **Validation**: "Any recognition for this work?" → `AwardEvidence`/`CertEvidence`
- **Recency**: "When did you last use this professionally?" → staleness check
- **Transferability** (career changers): "How does X from old field apply to Y?"

### 3.3 Gating System (Three Gates)

ASK only if ALL three pass:

1. **RELEVANCE**: Is this skill worth asking about?
   - cv_upload: only ask about skills used in 1+ roles (not just listed)
   - jd_match: always relevant if JD requires it

2. **EVIDENCE GAP**: Is existing evidence thin?
   - Skip if: has Socratic depth <90 days old + has impact + has validation + 2+ roles
   - Ask if: no impact, single role, no depth beyond CV text, stale evidence

3. **MARGINAL VALUE**: Will this answer improve the Cloud?
   - **FIX**: Per-node marginal value, not global 80% threshold
   - Skip if THIS NODE already has depth (regardless of cloud-wide %)
   - Ask if THIS NODE lacks depth and the answer would add meaningful evidence

### 3.4 Question Caching & Persistence

Questions MUST be persisted to DB:
- Table: `socratic_questions` (new) or columns on `socratic_qa`
- Columns: id, user_id, skill_name, question, why_asking, evidence_gap, triggered_by, created_at, answered_at (null until answered)
- On page load: check for unanswered questions first, only generate new ones if none exist
- On re-upload: mark old unanswered questions as stale, generate fresh ones

### 3.5 Answer Processing

When user answers:
1. Validate: minimum 5 chars, not "skipped"/"skip"/"n/a" (these are SKIPS, not answers)
2. Parse: extract structured evidence (impact metrics, team sizes, dates)
3. Update Cloud node: add SocraticEvidence to the matching node
4. Persist: save Q&A to `socratic_qa`
5. Check contradictions: cross-reference with previous answers
6. Return: updated node summary + any contradictions

When user SKIPS:
1. Mark question as skipped (don't save fake answer)
2. Don't create SocraticEvidence
3. Track skip count (if user skips >50%, reduce future question count)

### 3.6 Batch Processing

Frontend should:
1. Collect all answers locally (current Map approach is fine)
2. Send ONE batch request with all answers
3. Backend processes all, rebuilds classified cloud, returns new state

### 3.7 Adaptive Question Volume

Don't always ask 6 questions. Adapt:
- **Rich CV (3+ pages, many bullets)**: 2-3 questions max (they gave us a lot already)
- **Thin CV (1 page, sparse)**: 5-6 questions (we need more)
- **Re-upload (has previous answers)**: only ask about NEW gaps
- **Post-JD match**: 1-3 targeted questions about JD-specific skills

Signal: `CloudMaturity.coverage_ratio` + `CloudMaturity.evidence_density`
- Rich (>0.6 coverage, >3 evidence/node): max 3 questions
- Medium (0.3-0.6 coverage): max 5 questions
- Thin (<0.3 coverage): max 6 questions (safety ceiling)

## 4. Competitive Positioning (Researched May 15, 2026)

### Career/Resume Market — Nobody Does This

| Platform | Follow-Up Questions? | Contextual? | Gating? | Feeds Back? |
|----------|---------------------|-------------|---------|-------------|
| Teal HQ | "Coach Me" per-section | Semi — based on section being edited | No | No — per-resume only |
| Rezi | No — score-driven flags | N/A | No | No |
| Enhancv | Minimal interview Q generation | Generic | No | No |
| Kickresume | Career Map questionnaire | Generic — same for everyone | No | Loosely |
| Jobscan | No — paste+score | N/A | No | No |
| Huntr | No — tracker only | N/A | No | No |
| Hiration | Onboarding questionnaire | Semi — can be "overwhelming" | No | Loosely |
| JobSuit AI | Conversational bot | Yes — closest to us | No | Yes — real-time resume updates |
| Resume.io | Simple onboarding Qs | Generic | No | Yes — builds CV from answers |

**Closest career competitor**: JobSuit AI (conversational, contextual, real-time updates). But no gating, no evidence graph, no two-phase design, no persona awareness, no outcome feedback.

### Interview Prep — Closest Architecture

| Platform | Resume-Based? | Adaptive Follow-Ups? | Persists Weaknesses? | Feeds Back? |
|----------|--------------|---------------------|---------------------|-------------|
| SocraticPrep.ai | YES — from actual claims | YES — interrupts on vague claims | YES — across sessions | YES — identifies persistent weak spots |
| Final Round AI | Yes — resume + role | Yes — difficulty scaling | Session history | Limited — reports only |
| Google Interview Warmup | No — role-category only | No | No | No |

**SocraticPrep.ai** is architecturally closest — reads documents, generates claim-specific questions, tracks weaknesses. But interview prep only, not profile building.

### Adjacent Markets — Gold Standards

| Platform | Domain | What Makes It Great |
|----------|--------|-------------------|
| **Ada Health** | Medical intake | 10-15 adaptive Qs, simulates physician reasoning, stops when confident, history persists |
| **Khanmigo** | AI tutoring | Never gives answers, adapts to reasoning gaps, tracks learning, adjusts difficulty |
| **Lemonade (Maya)** | Insurance | ~13 Qs conversational, personalized quote in 90s, answers create the policy |
| **Clio Draft** | Legal | Conditional display logic — hides irrelevant questions, auto-populates documents |
| **Duolingo** | Language | Deeply personalized, skips mastered material, full profile, curriculum adapts |

### What Does NOT Exist (Our Whitespace)

1. **Evidence-gated questioning** — No platform skips when evidence is already strong
2. **Two-phase Socratic design** — Nobody separates conflict resolution from enrichment
3. **Persistent living profile** — No resume tool maintains a profile that gets smarter across sessions
4. **Persona-aware question generation** — Nobody adjusts question TYPE by career stage
5. **Outcome-fed enrichment** — Nobody feeds application outcomes back into questioning
6. **Evidence classification** — Nobody distinguishes self-declared vs CV-evidenced vs Socratic-enriched vs outcome-validated

### Positioning Statement

> Every resume tool asks "paste your job description." We ask "tell me about the 47-person team you managed that nobody knows about." JobLoop reads your entire career, identifies what's missing, asks targeted questions to fill the gaps, and builds a living evidence graph that gets smarter with every application. No scores. No keyword stuffing. Just depth.

### Threat Assessment

- **Teal HQ** (medium risk): Has "Coach Me," 2M+ users, well-funded. But per-resume architecture, not persistent profile.
- **LinkedIn** (high long-term): Has the data/graph/users. But optimizes for recruiter search, not candidate advocacy.
- **Final Round AI** (medium): 10M+ users. But interview-prep DNA, not career intelligence.
- **New entrants** (low short-term): Two-phase Socratic + evidence gating + outcome intelligence is genuinely complex. Not a weekend project.

Sources: Zapier, Teal, Rezi/Jobright, Enhancv/PitchMeAI, Kickresume, Jobscan/AIContent, Huntr/ResumeHog, Hiration/AIChief, SocraticPrep.ai, FinalRoundAI, Google Interview Warmup, Ada Health, Khanmigo, Lemonade/Rasa, Clio Draft, JobSuit AI, Jobright/LinkedIn. Full citations in research agent output.

## 5. Implementation Plan

### Phase 1: Fix Critical Bugs (this session)
- [ ] Persist questions to DB (socratic_questions table or extend socratic_qa)
- [ ] Pass candidate_context + persona to question generator
- [ ] Handle skips properly (don't create garbage evidence)
- [ ] Fix handleSocraticComplete render-time call
- [ ] Per-node marginal value gate (not global 80%)

### Phase 2: Quality Improvements
- [ ] Batch answer submission (single API call)
- [ ] Adaptive question volume based on Cloud maturity
- [ ] Dedup questions across sessions
- [ ] Cloud rebuild after Socratic complete

### Phase 3: Polish
- [ ] Answer quality scoring (short vs detailed)
- [ ] Question effectiveness tracking (which questions get good answers?)
- [ ] Skip pattern detection (reduce questions for heavy skippers)

### Phase 4: Mid-Stream Adaptation (POST-LAUNCH)
**Decision (May 15, 2026)**: Analyzed and deferred. Not needed for MVP launch.

**What**: Generate questions one-at-a-time, adapting Q2 based on Q1's answer (Ada Health / Khanmigo pattern). After user answers Q1, process the answer into Cloud, then generate Q2 targeting gaps revealed by Q1's answer.

**Why not now**:
1. Current 3-question format targets independent gaps (qual depth, cert application, discovery) — answers don't inform each other
2. May 30 deadline — implementing adaptive flow adds N round trips with loading spinners (UX regression)
3. Cost: N sequential LLM calls instead of 1 batch generation
4. Current discovery question + JD-match questions already cover the "what we didn't think to ask" gap

**When to implement**: Post-launch "deep interview mode" with 8-10 questions, where later questions probe what earlier answers revealed. Best for:
- Career changers (Q1: "what transferable skills?" → Q2 probes the specific skill they mention)
- Senior/exec profiles where depth matters more than breadth
- JD-match deep dive (Q1 about a required skill → Q2 about specific experience they mention)

**Architecture ready**: `processAnswer()` already updates Cloud in-memory. Generating Q2 after processing Q1 is straightforward — no architectural changes needed, just a new UI flow mode.

**Gold standard references**: Ada Health (10-15 adaptive Qs, stops when confident), Khanmigo (never gives answers, adapts to reasoning gaps), SocraticPrep.ai (interrupts on vague claims, tracks weaknesses across sessions).

## 6. Data Model Changes

### New: `socratic_questions` table
```sql
CREATE TABLE socratic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  skill_name TEXT NOT NULL,
  question TEXT NOT NULL,
  why_asking TEXT,
  evidence_gap TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'cv_upload',  -- cv_upload | jd_match
  jd_context TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | answered | skipped | stale
  created_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ
);
```

### Existing: `socratic_qa` table (answers)
Already exists and works. Keep as-is — it stores the actual Q&A pairs with skill targeting.

## 7. Dev Mode Behavior

In dev mode (Claude Code is the LLM):
- `generateQuestion()` MUST use candidate_context + persona to generate contextual templates
- Templates should vary based on evidence gap type (impact/depth/scale/validation)
- Questions should reference actual skill names and evidence from the Cloud node
- NOT generic "tell me about X" templates

The dev mode templates are the PRODUCT — they must be as good as API mode output because they're what users experience during development and alpha testing.
