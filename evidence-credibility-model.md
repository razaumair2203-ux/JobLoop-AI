# JobLoop AI — Evidence Credibility Model (v3 — Final)
## Extends: wireframe-audit-findings.md (v1)
## Date: 2026-04-29
## Status: Approved for implementation

---

## Problem Statement

The Living Profile Cloud stores evidence as typed objects `{type, desc, metrics, company, date}` but never differentiates evidence quality. A CKA certification and a self-declared "I know Kubernetes" both produce the same "Strong" confidence level if the count threshold is met. This undermines our core philosophy of transparency and evidence-based advocacy.

## Solution: Evidence Credibility Tiers (No Scores)

We do NOT score evidence. We describe it — count + source type breakdown. The user sees "3 evidence points: 2 work projects, 1 certification" vs "1 evidence point: self-declared only" and understands the difference without a number.

## Competitive Landscape (April 2026)

NO competitor differentiates evidence quality:
- Jobscan/Teal/Simplify/Careerflow: Pure keyword counting. "Python" in skills list = same as 5 years production Python
- Rezi: Checks for quantified metrics in bullets, but doesn't compare evidence types
- Huntr: LLM-based qualification matching (most sophisticated), but no evidence depth assessment
- Jobright: Keyword stuffing approach, no semantic analysis
- LinkedIn: Only platform with actual skill verification (quiz badges), but binary and separate from job matching
- Industry direction: "Skills-based methods are 5x more predictive" (2026 research). Moving toward living credentials + real-world evidence. Nobody has implemented this in a job search tool yet.
We are first to market with evidence-quality-aware matching.

---

## Tier Definitions

### Tier 1: VERIFIED (Highest Credibility)
Externally verifiable. A third party can confirm.

| Evidence Type | Example | Edge Cases |
|---|---|---|
| Industry certification | AWS SA Pro, CKA, PMP, CPA | Expired certs: still evidence but weaker (see Recency Rules). Boot camp certs (Coursera, Udemy): Tier 2. Internal company certs: Tier 2 (unverifiable externally) |
| Published work | Research papers, patents, OSS with adoption | Pre-prints (not peer-reviewed): Tier 2. Abandoned repos with 0 stars: Tier 3. Co-authored: valid but note contribution level |
| Awards/recognition | "Engineering Excellence Award Q3 2025" | Team awards: shared credit, still valid. Participation awards ("Completed hackathon"): Tier 2. Self-created awards: rejected |
| Quantified outcomes with company attribution | "Reduced latency by 40% at Stripe" | Team outcomes claimed individually: common, accept but don't inflate. Vanity metrics: accept but context matters |
| Open source contributions (substantial) | Feature PRs merged to major repos | Docs/typo fixes: Tier 2. Issue comments only: Tier 3 |

### Tier 2: DEMONSTRATED (High Credibility)
Evidence of doing the work, but not externally verified.

| Evidence Type | Example | Edge Cases |
|---|---|---|
| Work experience with specifics | "3 years building ML pipelines at Stripe, team of 8" | Short stints (<6 months): accept but note duration. Contractor vs FTE: same work, accept equally |
| Project descriptions with metrics | "Migrated 12 microservices to K8s, 40% cost reduction" | Solo vs team: note which. Hobby project: valid but lower production pressure. One-time task vs sustained: note |
| Socratic-enriched evidence | User answered follow-up with specific details | Harder to fabricate depth through follow-ups. User could still exaggerate but multi-question probing catches shallow answers |
| Education from recognized institution | "MS Computer Science, Stanford" | Degree != competence for specific skills. Bootcamps: Tier 2 (structured learning). Unfinished degrees: note "attended" vs "graduated". Online degrees: legitimate, accept equally |
| Teaching/mentoring a skill | "Trained 5 engineers on K8s" | Teaching requires understanding. Strong evidence |
| Boot camp / course certificates | Coursera specialization, Udemy completion | Proves exposure and effort, not production ability |
| Internal company certifications | Company-specific training programs | Unverifiable externally but real learning |
| Personal projects with documentation | Portfolio site, documented GitHub projects | Tier 2 if well-documented with outcomes. Tier 3 if just "I played with it" |
| Freelance/consulting with specifics | "Built 15 client websites, $X revenue" | Could be stronger than FTE if full ownership per project |

### Tier 3: CORROBORATED (Medium Credibility)
Claimed with some supporting context, but no hard proof.

| Evidence Type | Example | Edge Cases |
|---|---|---|
| Skill listed with years but no project evidence | "Python — 5 years" | Inflated years common ("used once in 2019 = 7 years"). Accept but mark as needing enrichment |
| Role titles without description | "Senior Developer at TechCorp, 2020-2024" | Title inflation at small companies. Multiple hats. Misleading titles |
| Transferable skill claims | "My Docker experience transfers to K8s" | Proximity matters: Docker->K8s is close. "Project management"->K8s is a stretch |
| Education coursework | "Took 3 ML courses in my MS program" | Theoretical vs applied. Grade unknown |
| Adjacent role at same company | "I was on the team that built the ML pipeline" | Proximity != contribution. Needs Socratic follow-up |
| Manager claiming IC skills | Engineering manager says "I know K8s" | Tier 2 if architected/reviewed. Tier 3 if purely managerial |
| Recommendations/endorsements (imported) | "15 LinkedIn endorsements for Python" | Easily gamed. Reciprocal endorsements. Non-expert endorsers |
| Old experience (>3 years stale) | "Used Python extensively in 2020, nothing since" | Was evidence, may not be current. See Recency Rules |

### Tier 4: SELF-DECLARED (Lowest Credibility)
User stated it. No supporting context.

| Evidence Type | Example | Edge Cases |
|---|---|---|
| Skill name listed without context | "Skills: Python, Java, K8s, React" | Might be real — expert who didn't elaborate. Could be keyword stuffing |
| Vague claims | "Experienced in cloud technologies" | Which cloud? What level? Doing what? |
| Self-assessed proficiency | "Expert in Python" | Dunning-Kruger (beginners overrate). Impostor syndrome (experts underrate) |
| Implied skills (inferred, not stated) | Worked at data company -> probably knows SQL | Wrong inference possible (marketing role at data company). Right inference at unknown depth |
| Buzz-phrases | "Passionate about AI", "Strong communicator" | Not evidence of anything measurable |

---

## Recency Rules

Evidence quality degrades with time for technical skills (not for domain knowledge or leadership):

| Time Since Last Use | Effect |
|---|---|
| < 2 years | Full tier value |
| 2-3 years | Full tier value but flag as "not recent" |
| 3-5 years | Downgrade one tier (Tier 1 -> Tier 2, etc.) |
| > 5 years | Downgrade two tiers (minimum Tier 3) |
| > 10 years | Tier 4 maximum regardless of original evidence |

**Exceptions:**
- Foundational skills (programming languages, math, algorithms): slower decay, max 1 tier downgrade
- Domain knowledge (fintech, healthcare): does not decay — industry understanding is cumulative
- Leadership/soft skills: does not decay
- Certifications with active renewal: no decay while active

---

## Confidence Level Rules (Updated)

These replace the spec's vague "based on evidence count" rule:

```
STRONG = Any of:
  - 2+ Tier 1 evidence points, OR
  - 1 Tier 1 + 2 Tier 2, OR
  - 3+ Tier 2 evidence points
  AND last_used within 3 years (for technical skills)

MODERATE = Any of:
  - 1 Tier 1 or Tier 2 evidence point, OR
  - 2+ Tier 3 evidence points
  OR: was STRONG but last_used > 3 years ago

MENTIONED =
  - Only Tier 4 (self-declared) evidence exists
  - No depth, no projects, no metrics
```

---

## UI Representation (No Scores)

### Current (gap):
```
Python (5+ years)                    Strong
Kubernetes / Container Orch.         Gap
```

### Target:
```
Python (5+ years)                                    Strong
  3 evidence points: 2 work projects, 1 education

Kubernetes / Container Orchestration                  Gap
  1 evidence point: self-declared only
  Bridge: Your Docker + CI/CD is directly transferable
```

The count + source type breakdown naturally communicates credibility without a number.

### Evidence Chip Tooltip (on hover):
```
[1] 3 years production ML at Stripe         (work)
[2] Built pipeline processing 2M records    (work)
[3] MS Computer Science, ML focus           (education)
```

Source type shown in parentheses. User sees the quality without us judging it.

---

## Additional Boundary Cases

| Case | Resolution |
|---|---|
| Expired certification (<2 years) | Tier 1, note expiry date |
| Expired certification (2-5 years) | Tier 2, show "expired [date]" |
| Expired certification (>5 years) | Tier 3 |
| Different skill name, same capability | Alias map handles matching. Credibility = underlying evidence tier |
| User contradicts themselves | Flag to user: "Your CV says X but your answers suggest Y. Which should we lead with?" |
| Skills from a job user was fired from | Evidence is valid. Exit reason doesn't invalidate the skill |
| Non-English credentials | Accept at face value. Our job isn't to judge institution prestige |
| Acqui-hire | Company name carries weight but role may differ. Tier 2, needs Socratic enrichment |
| Ghost experience (company shut down) | Accept. Unverifiable but not fabricated. Tier 2 |
| Volunteer work | Same tier rules as paid work. Evidence is evidence |
| Academic research | Tier 1 if published. Tier 2 if thesis/dissertation. Tier 3 if coursework |
| Hackathon projects | Tier 2 if won/placed. Tier 3 if participated |
| YouTube/blog content | Tier 2 if substantial (series, audience). Tier 3 if occasional |
| Conference talks | Tier 1 if major conference. Tier 2 if meetup/internal |

---

## Critical Challenge: Quality WITHIN Evidence Types

A "work project" can be a trivial local script or a national-scale platform. A "certification" can be a Coursera completion or a CKA. The AI engine must classify quality within each type, not just the type itself.

### What AI Can Reliably Classify (Automatic, No Human Input)

| Capability | Accuracy | How |
|---|---|---|
| Evidence type (cert/work/education/self-declared) | ~95% | Structural text patterns — reliable |
| Specificity (metrics, numbers, details present?) | ~90% | Text analysis — "processed 2M records" vs "worked on projects" |
| Scope signals (company, team size, user scale) | ~85% | Explicit signals in text — "team of 8", "serving 10M users" |
| Relative quality within same type | ~70% | "3 years at Google" vs "6 months unknown startup" — reasonable but has blind spots |

### What AI CANNOT Reliably Classify

| Capability | Accuracy | Why |
|---|---|---|
| Truth verification | ~0% | Cannot confirm if "processed 10M records at Stripe" actually happened |
| True complexity/difficulty | ~50% | "Government portal" could be national defense system or local DMV scheduler |
| Cross-domain comparison | ~40% | Cannot compare "1M RPS backend" vs "brand identity across 200 stores" |
| Understated vs overstated | ~60% | Buzzword-heavy mediocrity scores higher than humble excellence |

### The Three-Layer Solution

```
Layer 1: AI CLASSIFICATION (automatic, on CV import)
  - Classifies evidence type (work/cert/education/self-declared)
  - Extracts specificity signals (metrics, scale, company, team)
  - Tags: "specific with metrics" vs "vague/general" vs "unsubstantiated"
  - ~85% accuracy. Instant. No human input.
  - DOES NOT claim to verify. Describes what it sees.

Layer 2: SOCRATIC ENRICHMENT (semi-automatic, user answers)
  - Targets vague or thin evidence
  - "You mention a government portal — what was the scale? How many users?"
  - Multi-question probing catches shallow claims (~95% for enriched items)
  - Much harder to fabricate depth under follow-up questioning
  - This is our UNFAIR ADVANTAGE — no competitor probes

Layer 3: OUTCOME CORRELATION (long-term, automatic)
  - After enough applications: "Users with 3+ specific evidence points
    get 2x more callbacks than users with vague claims"
  - Validates whether our classification is actually predictive
  - Adjusts what qualifies as "sufficient evidence" based on real results
  - AutoResearch loop (spec §36) handles this
```

### Quality Signals AI Extracts Per Evidence Item

```typescript
interface EvidenceQualitySignals {
  // Extracted automatically from text
  has_metrics: boolean;           // "40% reduction", "2M records", "$1.2M"
  has_company_context: boolean;   // Named company vs "a company" vs none
  has_team_scope: boolean;        // "team of 8" vs solo vs unspecified
  has_user_scale: boolean;        // "serving 10M users" vs unspecified
  has_duration: boolean;          // "3-year initiative" vs unspecified
  has_specific_technology: boolean; // "K8s, Docker, Helm" vs "cloud"
  has_outcome: boolean;           // "reduced costs" vs "worked on"
  specificity_level: 'high' | 'medium' | 'low';  // composite of above

  // NOT extracted — we don't claim these
  // is_truthful: never;         // can't verify
  // project_importance: never;  // can't judge without domain expertise
  // difficulty_level: never;    // can't compare across domains
}
```

### How This Affects the Display

```
Python (5+ years)                                    ● Strong
  From: 3 work projects with metrics, 1 active certification

Kubernetes                                           ● Gap
  From: skills list only — no project evidence
  Bridge: Docker + CI/CD transfers directly
  [Strengthen this evidence →]

Government Portal Project                            ● Related
  From: 1 work project, low specificity — no scale or metrics mentioned
  Consider adding: user count, technical scope, measurable outcomes
```

The third example shows how AI handles the "local vs national project" case — it doesn't GUESS the scale, it tells the user "low specificity — no scale or metrics mentioned" and asks them to add detail. Socratic follow-up: "What scale was this portal? How many users? What was the technical challenge?"

### What We Explicitly Do NOT Do

1. DO NOT rank "importance" of projects — "national vs local" depends on context, domain, and JD
2. DO NOT create a "project quality score" — same trap as competitor scores
3. DO NOT claim verification — we describe what we see, not vouch for truth
4. DO NOT penalize understated evidence — Socratic questioning draws it out instead
5. DO NOT fabricate CV bullets from thin evidence — if only self-declared, we say so and ask for more

### The Hard Gate (Final Version)

```
IF skill has ONLY self-declared evidence (no work/project/credential/education):
  → Cloud confidence: "MENTIONED" (regardless of how many times listed)
  → JD match cap: "Related" maximum (never "Strong")
  → Socratic priority: HIGH (target for enrichment)
  → CV generation: WILL NOT fabricate bullet points
  → User sees: "skills list only — no project evidence"

IF skill has at least ONE work/credential source:
  → Eligible for "Strong" (depending on JD match specifics)
  → Specificity signals determine if it reaches Strong vs Moderate
  → CV generation can use the evidence for bullets

IF skill has work evidence but LOW specificity (no metrics/scale):
  → Cloud confidence: "MODERATE"
  → Socratic targets it: "Can you add metrics or scale?"
  → User sees: "1 project, low specificity — consider adding details"
```

Gate is assigned by: source type (binary: self-declared only vs has evidence) + specificity signals (AI-extracted). NOT by a human threshold. NOT by comparing to JD. This is profile-level quality, independent of any specific job.

---

## Implementation Notes

### Database Changes (skill_nodes table)
```sql
-- Evidence JSONB array gets quality signals
-- evidence: [{type, desc, metrics, company, date, specificity_level, quality_signals}]
-- quality_signals: {has_metrics, has_company, has_team_scope, has_user_scale, has_outcome}
-- All computed by AI during import, enriched by Socratic answers

-- Add to skill_nodes
ALTER TABLE skill_nodes ADD COLUMN evidence_summary jsonb default '{}';
-- evidence_summary: {
--   total_count: number,
--   source_types: {work: 2, credential: 1, education: 0, self_declared: 1},
--   high_specificity_count: number,
--   has_non_self_declared: boolean  -- THE hard gate flag
-- }
```

### AI Engine Changes
- CV parser: classify evidence type + extract specificity signals on import
- Socratic engine: target skills where has_non_self_declared = false OR specificity_level = 'low'
- CV generation: prioritize high-specificity evidence for bullet points. REFUSE to fabricate from self-declared-only skills
- Analysis display: show "From: X work projects with metrics, Y credentials" per skill
- JD matching: self-declared-only skills capped at "Related" match strength
- Quality signal extraction: automatic on import, ~85% accuracy, no verification claims

### Spec Section Updates Needed
- Section 4.1: Add evidence quality signals to Cloud schema
- Section 4.2: Socratic targeting rule — prioritize self-declared-only AND low-specificity evidence
- Section 5.2: "Evidence depth" uses source type + specificity, not tier scores
- Section 37.3: Cloud matching display shows source summary in plain language

### UI Changes (Finalized)
- NO tier icons (◆✦✧○) — dropped, not universal
- NO credibility scores — against our philosophy
- Plain text source summaries: "From: 3 work projects with metrics, 1 cert"
- Low-specificity prompt: "Consider adding: user count, metrics, technical scope"
- Socratic upgrade message: "Answering adds project evidence to your profile"
- Hard gate visible as: "skills list only — no project evidence" with [Strengthen →] link
