# Outcome Intelligence v4 — Specification

> Source of truth for the Application Memory + Outcome Intelligence system.
> Replaces: outcome-intelligence-v3.md (design valid, implementation gaps addressed here)
> Date: May 15, 2026

## 1. Purpose

Outcome Intelligence is a **per-user application memory system** that makes the Profile Cloud smarter through outcome feedback. Every application creates a persistent record. Every outcome teaches the system what works in each niche. The Cloud accumulates niche-specific intelligence that silently improves future CV generation.

**Core principle**: The system remembers so the user doesn't have to. "You applied to Fintech Co A 3 months ago. They loved your data pipeline work but wanted more Kubernetes. This new role at Fintech Co B also wants Kubernetes — want to address it this time?"

## 2. Audit Findings (May 15, 2026)

### What EXISTS in code

| Component | File | Status |
|-----------|------|--------|
| Application footprint creation | `apps/web/src/app/api/analyze/route.ts` | **Working** — creates record, stores JD, runs analysis, saves match_analysis |
| Cloud snapshot at application time | analyze/route.ts:206-213 | **Working** — cloud_snapshots table, snapshot_id saved |
| JD similarity check | analyze/route.ts:166-203 | **Partial** — logs overlap % to console, no UI alert |
| Outcome status update (dropdown) | `applications/[id]/route.ts` PATCH | **Working** — updates outcome_status |
| writeOutcomeSignals() | `applications/[id]/route.ts:72-131` | **Working** — writes SkillSignals to cloud_nodes.outcome_signals |
| Gap pattern detection | `applications/route.ts` GET:30-56 | **Working** — aggregates gaps across apps, surfaces patterns at 2+ threshold |
| Funnel stats | applications/route.ts GET:59-63 | **Working** — total/applied/interviews/offers |
| Types (Application, SkillSignal, etc.) | `packages/shared/src/types.ts` | **Complete** |
| JD Socratic questions | analyze/route.ts:236-251 | **Partial** — generated but NOT persisted |

### What's SPECCED but NOT built (Critical Gaps)

| Feature | v3 Spec Section | Code Status | Impact |
|---------|----------------|-------------|--------|
| **Free-text feedback parsing** | Step 4-5 | NOT BUILT | Core learning loop broken — signals come from match_analysis, not employer feedback |
| **CV generation context injection** | Step 7 | NOT BUILT | The whole point — future CVs don't use outcome history |
| **Same company alert** | Step 8 | Console log only | User misses critical context when re-applying |
| **Gap accumulation → Socratic trigger** | Step 8 | Pattern detection exists, no Socratic trigger | System detects patterns but can't act on them |
| **Niche profiles** | "What Accumulates" | Type exists, no computation | No accumulated niche intelligence |
| **JD question persistence** | N/A (new finding) | Questions returned but not saved to DB | JD-match Socratic answers lost on refresh |
| **Application ↔ Socratic linkage** | N/A (new finding) | No application_id on JD socratic_qa rows | Can't correlate which questions were for which application |

### Bugs Found

1. **P1 — outcome_status vs outcome field mismatch**: PATCH sends `body.outcome`, stores as `outcome_status`. GET SELECT aliases `outcome:outcome_status`. Works but fragile — one route missing the alias breaks silently.
2. **P1 — writeOutcomeSignals uses match_analysis, not user feedback**: Spec says signals come from parsed free-text ("they said they liked my data pipeline work"). Code writes signals from match_analysis gaps/strengths (our analysis, not employer feedback). These are fundamentally different data sources.
3. **P2 — excitement column**: Selected in GET but may not exist in schema (flagged in MEMORY.md).
4. **P2 — industry field**: writeOutcomeSignals reads `app.industry` but analyze route never sets it.
5. **P2 — No Socratic Q&A stored per application**: spec's `socraticQA: SocraticExchange[]` field doesn't exist in code.

## 3. What Outcome Intelligence SHOULD Be

### 3.1 The Complete Application Footprint

Every JD analysis creates a **complete record** — not just tracking, but a full snapshot of context:

```
Application #7 — Fintech Co A, Senior Data Engineer
  Created: automatic when user pastes JD

  WHAT WE KNEW:
    Cloud snapshot: skills + evidence at time of application
    Match analysis: gaps, strengths, bridge strategies
    Position: "Competitive" (6/8 requirements met)

  WHAT WE DID:
    CV version used: v5 (quantified metrics emphasis)
    Cover letter: [stored]
    Socratic Q&A: "Tell me about your Kafka experience" → "Built real-time pipeline at..."
    Bridge strategies suggested: "Position your ETL work as data pipeline architecture"

  WHAT THE JD REQUIRED:
    Hard: Kafka, Kubernetes, Python, data modeling
    Preferred: Spark, Airflow, AWS
    Parsed: industry=fintech, seniority=senior, team_size=15-20

  WHAT HAPPENED:
    Applied: March 15
    Status: Interview → Closed
    User feedback: "They loved my pipeline work but wanted someone with K8s in production"
    Parsed feedback:
      + positive: data_pipeline (employer praised)
      - gap: kubernetes (employer wanted production depth)
      context: competitive — qualified but outmatched on specific skill

  WHAT WE LEARNED:
    Signals written to Cloud:
      data_pipeline: positive signal in fintech/data-eng
      kubernetes: gap signal in fintech/data-eng
    Pattern: 2nd employer in fintech flagging K8s → trigger Socratic
```

### 3.2 The Feedback Loop (8 Steps — Corrected)

**Step 1: Application footprint** (automatic, $0)
- JD analysis → persistent record with all context
- Cloud snapshot saved (for time-travel comparison)
- EXISTS in code ✓

**Step 2: JD-specific Socratic questions** (automatic, $0 in dev / $0.01 in prod)
- If gaps found → generate targeted questions
- Questions MUST be persisted to socratic_qa with application_id
- Answers enrich Cloud IMMEDIATELY (before CV generation)
- NOT WIRED — questions generated but not persisted or linked

**Step 3: CV generation with outcome context** (silent, $0 extra)
- CV gen prompt gets ~200 extra tokens of application history for this niche
- "Previous fintech apps: data pipeline → praised, system design → ghosted, K8s → gap"
- NOT BUILT — CV gen has zero outcome awareness

**Step 4: User applies** ($0)
- Status → Applied
- Date recorded
- EXISTS ✓

**Step 5: Outcome update** (user dropdown, $0)
- Pending → Callback → Interview → Offer → Closed → Ghosted
- EXISTS ✓

**Step 6: Free-text feedback parsing** (optional, 1 Haiku call, $0.004)
- Prompt: "What did they say?" → natural language
- Haiku extracts: positive skills, gap skills, context (competitive/overqualified/underqualified)
- Maps casual language to Cloud node names ("K8s" → "Kubernetes")
- NOT BUILT — field exists but no parsing

**Step 7: Cloud enrichment from REAL employer feedback** ($0)
- Parsed feedback → SkillSignals → cloud_nodes.outcome_signals
- This is the CORRECT signal source (not our match_analysis guess)
- PARTIALLY BUILT — writeOutcomeSignals exists but uses wrong data source

**Step 8: Active interventions** (threshold-triggered, mostly $0)
- Same company alert (exact + fuzzy match, UI notification, $0)
- Gap accumulation → Socratic trigger (2+ mentions in same niche, 1 Haiku call)
- Pattern insight → Dashboard card ("Your fintech apps show K8s keeps coming up")
- PARTIALLY BUILT — pattern detection exists, no interventions

### 3.3 Same Company Intelligence

When user analyzes a JD from a company they've applied to before:

```
"You applied to Fintech Co A 3 months ago for Senior Data Engineer.
 Status: Interview → Closed
 Your note: 'Liked pipeline work, wanted more K8s depth.'

 This new role is Data Engineering Manager.
 Since then, your Cloud gained:
   - Socratic evidence about Kubernetes (from your answer last month)
   - 2 more months at current role

 Shall I emphasize leadership + your proven pipeline expertise,
 and address the K8s gap with your recent depth?"
```

Detection: company name fuzzy match (Levenshtein ≤ 2, or substring match after stripping Inc/Ltd/LLC).
Data: full history of previous applications to this company.
Cost: $0 (pure data lookup).

### 3.4 Niche Intelligence Profiles

After 5+ applications in a niche, compute accumulated intelligence:

```typescript
interface NicheProfile {
  niche: string;                    // "fintech/data-eng"
  application_count: number;        // 8
  strong_signals: SkillWithCount[]; // data_pipeline (2 positive), metrics (3 callbacks)
  gap_signals: SkillWithCount[];    // kubernetes (2 employers), streaming (1)
  no_signal: string[];              // system_design (ghosted twice — no info)
  table_stakes: string[];           // python (never mentioned — assumed baseline)
  avg_outcome_by_emphasis: Map<string, OutcomeDistribution>; // what emphasis correlates with progress
}
```

**Calibration rule (from v3 research)**: Niche profiles are NEVER flattened into global signals. A gap in fintech/data-eng means nothing for healthcare/nursing. Always scoped to niche.

### 3.5 CV Generation Context Injection

The critical missing piece. When generating a CV for a new JD:

```
// Added to CV generation prompt (~200 extra tokens)

Application history for similar roles ({niche}):
  #7 Fintech Co A (Senior Data Engineer): Led with data_pipeline → Interview, then Closed
     Feedback: "Loved pipeline work, wanted K8s in production"
  #9 Fintech Co B (Data Engineer): Led with system_design → Ghosted
  #11 Startup C (Data Platform): Led with ML projects → Closed (wanted K8s depth)

Cloud insights for this niche:
  - "data_pipeline": 2 positive signals (praised by employers)
  - "kubernetes": gap flagged by 2 employers — user has NEW Socratic evidence since last app
  - "system_design" emphasis: 0 signals (ghosted = no information)
  - Table stakes: Python, SQL (never mentioned by employers — assumed baseline)

Recommendation: Lead with data pipeline expertise (proven winner in this niche).
Address kubernetes proactively — user has new depth evidence.
Don't lead with system_design (no positive signal yet).
```

Cost: $0 extra (adds ~200 tokens to existing CV gen prompt).
The AI makes better emphasis decisions informed by what actually worked.

## 4. Competitive Landscape

> Research: `research/application-tracker-intelligence-research.md` (350 lines, 30+ sources, May 15 2026)

### 4.1 Application Trackers — Nobody Does Learning

| Platform | Tracks Apps | Tracks Outcomes | Parses WHY | Cross-App Patterns | Feeds Back to Profile | Uses in CV Gen |
|----------|------------|----------------|-----------|-------------------|---------------------|---------------|
| Teal ($free-Pro) | Yes + Kanban | Status only | No | No | No | No |
| Huntr ($40/mo) | Yes + Chrome ext | Status + notes | No | No | No | No |
| LoopCV ($free-paid) | Auto-apply + track | Email open/reply rates | No | No | No | **A/B by open rate** |
| ApplyArc (£19/mo) | Kanban + AI coach | Status | **Claims yes** | **Claims yes** | No | No |
| Careerflow | Yes + analytics | Status + stages | No | No | No | No |
| Simplify | Auto-fill + track | Status only | No | No | No | No |
| LazyApply | Auto-apply + track | Status only | No | No | No | No |
| Jobright AI | Yes + AI matching | Status only | No | No | No | No |
| Jobscan ($49.95/mo) | No (score only) | N/A | N/A | N/A | N/A | N/A |
| **JobLoop** | **Auto from JD analysis** | **Status + free-text** | **Haiku parse** | **Gap accumulation** | **Cloud enrichment** | **Silent context** |

**The gap**: Every tracker is a passive ledger. Record what happened, display it. None ask "what did they say?", none learn from it, none use it to generate better CVs next time.

**Two closest competitors**:

1. **LoopCV** — the only primitive feedback loop. Tracks which CV *version* gets more email opens, lets you A/B test. But: (a) signal is at email open/reply level, not skill level; (b) no analysis of *why* a version works; (c) no profile enrichment; (d) email-only channel.

2. **ApplyArc** — the only product *claiming* rejection pattern analysis. Their AI career coach sits inside the Kanban and can answer "why am I getting rejected?" with observations like "rejection rate 80% for PM roles, missing Agile/Scrum in 70% of targets." **Caveat**: this is marketing copy. Likely LLM-generated insights from application metadata (status + role type), not structured outcome intelligence. No profile enrichment, no CV generation feedback.

**Huntr industry data** (1.7M tracked applications, 2025): tailored resumes convert at 5.8% (1.6× untailored). Median time to first offer: 57 days (Q1 2025) → 83 days (Q4 2025). Google Jobs 11.3% response rate vs LinkedIn lower.

### 4.2 CRM Parallels — Where Intelligence Already Exists

Sales CRMs pioneered the outcome feedback loop. The architectural parallels are precise:

| CRM Concept | Our Equivalent |
|-------------|---------------|
| Deal stage tracking | Application stages |
| Closed-lost reason (HubSpot dropdown + free-text) | Outcome dropdown + optional feedback |
| Win/loss reports by segment | Niche profiles |
| Next-best-action | CV gen context injection |
| Account history | Same company intelligence |
| Rejection reasons report (Greenhouse ATS) | Gap accumulation patterns |

**Gong (Deal Intelligence)** — closest architectural parallel:
- Analyzes 300+ signals per deal: engagement, communication cadence, competitor mentions, stakeholder involvement
- AI Deal Predictor trained on historical outcomes → predicts close probability (claims 21% more accurate than human reps)
- Closed-lost intelligence: captures blockers and competitive evaluations in buyer's own words
- Continuous model improvement: retrains on new outcome data
- **Parallel to JobLoop**: Gong feeds deal outcomes back into prediction. We feed application outcomes back into the Profile Cloud. Difference: Gong has millions of cross-company deals. We're per-user (correct for privacy, but no ML — contextual memory instead).

**Greenhouse ATS** — mirror image intelligence:
- Rejection Reasons Report aggregates structured reasons across all candidates
- Pass-through rates by stage show where the pipeline leaks
- Required rejection reasons ensure data collection
- **Key insight**: Greenhouse does FOR EMPLOYERS what we do FOR CANDIDATES. They see rejection patterns across their pipeline. We show candidates rejection patterns across their applications.

The difference: CRMs serve sales teams with 1000+ deals and dashboards. We serve individual job seekers with 5-50 applications and need the system to think for them.

### 4.3 Open Source Landscape

GitHub projects (JobSync, CareerSync, VibeHired, CareerFlow-academic) all implement Kanban + CRUD + basic analytics. Zero implement outcome-to-profile feedback, cross-application pattern detection, or niche-specific signal accumulation. Analytics = counting (how many applied/interviewed), not intelligence (WHY outcomes differ).

### 4.4 Academic Validation

**Van Hooft et al. (2022)** — Job Search Quality Scale (SAGE, peer-reviewed):
- Four dimensions: (1) goal establishment & planning, (2) preparation & alignment, (3) emotion regulation & persistence, (4) **learning & improvement**
- The "learning & improvement" dimension explicitly describes our feedback loop: "preliminary outcomes provide job seekers with feedback which may, in turn, lead to goal revision"
- Key finding: most job seekers lack tools to actually DO this — they rely on gut feeling or crude spreadsheet counts

**Van Hooft & Wanberg (2013)** — Self-Regulatory Framework:
- Four-phase cyclical model: goal establishment → planning → goal striving → **reflection**
- The reflection phase is where Outcome Intelligence lives — but no tool systematically enables it

**Job Search Self-Efficacy (2025, PMC)**: Feedback orientation positively related to learning goal orientation and job satisfaction. Structured feedback improves job search quality.

**KEY ACADEMIC GAP**: No paper was found that studies personal application outcome feedback loops — the concept of feeding individual outcomes back into profile/resume optimization. Van Hooft provides the theoretical basis (reflection phase), but no one has operationalized it in a tool or studied its effectiveness. This is genuinely novel territory.

### 4.5 What Makes Our Approach Unique

| Capability | Market Status | Our Implementation |
|-----------|--------------|-------------------|
| Qualitative feedback parsing | Nobody does this | "They said X" → Haiku → structured SkillSignals |
| Profile enrichment from outcomes | Nobody does this | Signals written to cloud_nodes, read by all systems |
| Silent CV gen context injection | Nobody does this | ~200 extra tokens of outcome history, $0 extra cost |
| Same company memory | Trackers only prevent duplicates | Full history recall + Cloud diff since last app |
| Gap accumulation → Socratic | Nobody does this | 2+ employers flag same gap → targeted question |
| Niche profiles | Nobody does this | Fintech signals ≠ healthcare signals, always scoped |
| Skill-level outcome signals | LoopCV at doc level only | Per-skill positive/gap signals with employer context |
| Cross-app pattern detection | ApplyArc claims (unverified) | Structured aggregation with Socratic trigger |

**The competitive moat**: Every existing tool is a passive ledger with optional AI commentary. We're the first to close the loop — outcomes enrich the profile, the enriched profile generates better CVs, better CVs produce better outcomes. Van Hooft's "reflection phase" operationalized as software.

## 5. Data Model

### Existing (keep as-is)
- `applications` table — complete, well-designed
- `cloud_nodes.outcome_signals` JSONB column — exists
- `cloud_snapshots` table — exists
- `socratic_qa` table — needs application_id column

### Changes Needed

```sql
-- Add application_id to socratic_qa for JD-match question linkage
ALTER TABLE socratic_qa ADD COLUMN application_id UUID REFERENCES applications(id);

-- Add industry to applications (writeOutcomeSignals needs it)
-- Check if column exists — may already be in schema
ALTER TABLE applications ADD COLUMN IF NOT EXISTS industry TEXT;
```

### Computed (not stored, derived at read time)
- NicheProfile: computed from outcome_signals across cloud_nodes
- Same company detection: company name fuzzy match at JD analysis time
- Pattern insights: gap aggregation across applications (already in GET route)

## 6. Implementation Plan

### Phase 1: Wire the Loop (MVP — must-have for launch)
- [ ] Fix writeOutcomeSignals to use parsed user feedback (not just match_analysis)
- [ ] Build feedback parsing (Haiku prompt for free-text → SkillSignals)
- [ ] Persist JD Socratic questions to socratic_qa with application_id
- [ ] Add application_id to socratic_qa table
- [ ] Same company detection with UI alert (not just console.log)
- [ ] Set industry field on application creation (from JD parse)

### Phase 2: CV Gen Integration (the payoff)
- [ ] Add outcome context block to CV generation prompt
- [ ] Load niche-relevant outcome signals at CV gen time
- [ ] Build computeNicheProfile() from cloud_nodes outcome_signals
- [ ] Include niche profile in CV gen context

### Phase 3: Active Intelligence
- [ ] Gap accumulation → Socratic trigger (2+ same-niche gap → question)
- [ ] Dashboard pattern insights card
- [ ] Same company full history panel (UI)
- [ ] Niche profile visualization

### Phase 4: Advanced
- [ ] Outcome timeline view (how profile evolved over applications)
- [ ] Cloud diff between application snapshots ("your Cloud gained X since last app")
- [ ] Bridge strategy effectiveness tracking (which bridges led to callbacks?)
- [ ] Application coaching mode ("for roles like this, here's what's worked")

## 7. Cost Analysis

| Action | API Call | Cost | Frequency |
|--------|---------|------|-----------|
| Application footprint | None | $0.00 | Every JD analysis |
| Outcome dropdown | None | $0.00 | Per application |
| Free-text feedback parsing | 1 Haiku call | $0.004 | Optional, per outcome |
| CV gen context injection | None (extra tokens) | $0.00 | Every CV gen |
| Same company alert | None (data lookup) | $0.00 | When detected |
| Gap accumulation Socratic | 1 Haiku call | $0.004 | Rare (2+ threshold) |

**Total extra cost per active user per month**: $0.04-0.20
**Negligible vs $7-19/month subscription.**

## 8. Psychological Design (retained from v3)

- **Never show raw rejection counts** — "3 of 8 applications progressed" not "5 rejected"
- **Lead with controllables** — process quality, evidence strength, not outcome luck
- **Temporal comparison only** — "your applications are getting stronger" not "you're below average"
- **Advocate framing always** — "here's how to strengthen your next application" not "you failed because X"
- **"Closed" not "Rejected"** — language matters, we're the user's advocate
- **Ghosted = no information** — never penalize for ghosts, never infer meaning from silence

## 9. What This System Does NOT Do

```
Does NOT predict outcomes ("you have a 73% chance of getting this job")
Does NOT cross-user aggregate ("candidates like you typically...")
Does NOT train models (it's contextual memory, not ML)
Does NOT require email/mailbox access
Does NOT make causal claims ("data pipeline CAUSED the callback")
Does NOT show "match scores" or fabricated percentages
Does NOT share data across users
```

It provides CONTEXT, not CAUSATION.
