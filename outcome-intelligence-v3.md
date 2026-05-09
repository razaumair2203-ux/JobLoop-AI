# Outcome Intelligence v3: Application Memory System
## Date: 2026-05-01
## Status: FINAL — Replaces v2 (outcome-intelligence-v2.md) and v1 (outcome-intelligence-final.md)
## Research: 8 agents, 60+ sources, competitive audit of all major trackers
## Key correction: v2 was a self-regulation dashboard. v3 is a per-user learning system that makes the Cloud smarter through niche-specific outcome signals.

---

## What Outcome Intelligence Actually Is

A **per-user application memory system** that enriches the Living Profile Cloud through outcome feedback, enabling smarter CV generation over time.

NOT a cross-user learning engine.
NOT an analytics dashboard showing rejection counts.
NOT a system that trains models.

The Cloud gets smarter about what matters in each niche — for THIS user, from THEIR outcomes.

---

## The Loop (8 Steps)

### Step 1: Application Footprint (automatic)
Every JD analysis creates a persistent record:

```
Application #7 — Fintech Co A, Senior Data Engineer
  JD: [stored, parsed]
  CV version used: v5 (quantified metrics)
  Cover letter: [stored]
  Cloud snapshot: [skills + evidence at time of application]
  Match analysis: [gaps, strengths, bridge strategies]
  Socratic Q&A: [what we asked, what they answered for this JD]
  Source: LinkedIn
  Date: March 15
  Status: Pending
```

No extra user effort. Created automatically when they use our system.

### Step 2: User Applies
Status set to Pending. Application appears on dashboard.

### Step 3: Outcome Update (user-driven, low friction)
Dashboard shows all applications. User updates via dropdown:

```
Status options: Pending | Callback | Interview | Offer | Rejected | Ghosted
```

### Step 4: Optional Free-Text Feedback
After status update, prompt: **"Anything worth noting?"**

User types naturally: "They said they really liked my data pipeline work but wanted someone with more Kubernetes experience"

This is optional. Skip adds no friction. Providing it costs 1 Haiku call ($0.004).

### Step 5: Haiku Parses Feedback into Cloud Data (1 API call)

Prompt structure:
```
User's Cloud skills: [list of current skills with evidence]
User's feedback: "[their natural language input]"
Role type: [from JD parse]
Industry: [from JD parse]

Extract:
- Which Cloud skills received positive signals from this employer
- Which Cloud skills were identified as gaps
- Any new information not currently in Cloud
- Map casual language to existing Cloud entries (e.g., "K8s" → Kubernetes)
```

Output:
```
Extracted:
  + Positive: "data_pipeline" — employer praised this evidence
  + Gap: "kubernetes" — employer wanted more depth
  + Context: competitive rejection (qualified, outmatched on specific skill)
  + Niche: Data Engineering / Fintech
```

### Step 6: Cloud Enrichment

Parsed feedback is attached to Cloud skill entries as outcome signals:

```
Before:
  data_pipeline: { source: "CV + Socratic", evidence: "Built ETL for 50M records" }
  kubernetes: { source: "CV", evidence: "Deployed services on K8s" }

After:
  data_pipeline: { source: "CV + Socratic", evidence: "Built ETL for 50M records",
                   outcome_signals: [
                     { niche: "fintech/data-eng", signal: "positive",
                       context: "Praised by Fintech Co A recruiter", date: "2026-03-20" }
                   ]}
  kubernetes: { source: "CV", evidence: "Deployed services on K8s",
                outcome_signals: [
                  { niche: "fintech/data-eng", signal: "gap",
                    context: "Fintech Co A wanted more depth", date: "2026-03-20" }
                ]}
```

### Step 7: Contextual CV Generation (silent, zero extra cost)

When a similar role appears, CV generation prompt includes application history as context:

```
Previous applications to similar roles (Data Engineering / Fintech):
  #7 Fintech Co A: Emphasized data pipeline → Callback (recruiter praised this)
  #9 Fintech Co B: Emphasized system design → Ghosted
  #11 Startup C: Emphasized ML projects → Rejected (wanted K8s depth)

Cloud insights for this niche:
  - "data_pipeline" evidence: 1 positive outcome signal in fintech
  - "kubernetes": flagged as gap by 1 employer in fintech
  - "system_design" emphasis: no signal (ghosted = no information)
```

This is ~200 extra tokens in a 4K prompt. Zero additional API cost.
The AI silently generates a better CV informed by what worked.

### Step 8: Active Interventions (only at thresholds)

**Same company alert (zero API cost):**
When user analyzes a JD from a company they've applied to before:

```
"You applied to Fintech Co A 2 months ago for Senior Data Engineer.
 Result: Callback → Interview → Rejected at final round.
 Your note: 'Liked technical depth, wanted more leadership examples.'

 This new role is Data Engineering Manager.
 Your Cloud now has leadership evidence from recent Socratic session.
 Shall I emphasize leadership + your proven technical depth?"
```

UI notification only. No API call.

**Gap accumulation prompt (1 Haiku call, rare):**
When 2+ employers in the same niche flag the same gap:

```
"Two employers in fintech data roles mentioned wanting stronger
 Kubernetes experience. Want to tell us more about your K8s work?"
```

This triggers a Socratic question. If the user has evidence, it enters the Cloud with enriched depth. If they don't, they know it's a real gap in their target niche.

Threshold: **2 mentions** in the same niche. Early enough to be useful, not so aggressive it's noisy.

---

## What Accumulates Over Time (Niche Profiles)

**Calibration principle (from Deep Research Report, May 2026):** If we ever convert outcome signals into predictive guidance (e.g., "roles like this typically require X"), it MUST be calibrated per job family, geography, and seniority band — never globally. A "gap" in fintech/data-eng means nothing for healthcare/nursing. Niche profiles are already structured this way; this note ensures we never flatten them into a global "what works" signal.

After enough applications in a niche, the Cloud builds niche-specific intelligence:

```
Fintech (8 applications):
  Strong signals: data pipeline (2 positive), quantified metrics (in all 3 callbacks)
  Gaps: Kubernetes (2 employers), real-time streaming (1 employer)
  No signal: system design emphasis (ghosted twice — no info)

Healthcare (6 applications):
  Strong signals: HIPAA compliance (1 positive), patient data experience (1 positive)
  Gaps: clinical workflow knowledge (1 employer)
  Table stakes: Python (never mentioned — assumed, not differentiator)
```

CV generation for fintech role #9 automatically leads with data pipelines and quantified metrics.
CV generation for healthcare role #7 leads with HIPAA and patient data.
Same user, same Cloud, different emphasis — informed by accumulated niche context.

---

## Competitive Landscape — Nobody Does This

| Feature | Teal | Huntr | Loopcv | Careerflow | JobLoop |
|---|---|---|---|---|---|
| Track applications | Yes | Yes | Yes | Yes | Yes |
| Track outcomes (Kanban) | Yes | Yes | Yes | Yes | Yes |
| Parse WHY (free-text feedback) | No | No | No | No | **Yes** |
| Enrich profile from outcomes | No | No | No | No | **Yes** |
| Use history in next CV gen | No | No | No | No | **Yes** |
| Same company memory | Prevents duplicates | Prevents duplicates | No | No | **Full context recall** |
| Niche-specific intelligence | No | No | No | No | **Yes** |
| A/B test CV versions | No | No | Yes (email open rates) | No | **Contextual** (not A/B) |

**Loopcv is closest** — they A/B test CVs and track email open/reply rates. But they don't parse outcome feedback, don't enrich a profile from it, and don't use it contextually in future CV generation. Their loop is: "CV A got more opens than CV B" (quantitative). Our loop is: "Employer A praised your data pipeline work and wanted more K8s" (qualitative + contextual).

---

## Cost Analysis

| Action | API Call | Cost | Frequency |
|---|---|---|---|
| Application footprint creation | None (data storage only) | $0.00 | Every JD analysis |
| Outcome dropdown update | None (UI only) | $0.00 | Per application |
| Free-text feedback parsing | 1 Haiku call | $0.004 | Optional, per outcome |
| Silent context in CV generation | None (extra tokens in existing call) | $0.00 | Every CV gen |
| Same company alert | None (UI notification) | $0.00 | When detected |
| Gap accumulation Socratic prompt | 1 Haiku call | $0.004 | Rare (2+ mentions threshold) |

**Total extra cost per user per month:** $0.04-0.20 (assuming 10-50 outcome updates with free-text)
**Negligible vs $7-8/month existing API cost per active user.**

---

## Data Model (Application Footprint)

```typescript
interface ApplicationFootprint {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  // JD Data
  jd: {
    rawText: string;
    parsed: ParsedJD;        // structured extraction
    company: string;
    roleTitle: string;
    industry: string;
    seniorityLevel: string;
    source: 'linkedin' | 'indeed' | 'company_site' | 'referral' | 'other';
    sourceUrl?: string;
  };

  // What We Generated
  cvVersionId: string;        // reference to CV version used
  coverLetterId?: string;     // reference to cover letter
  matchAnalysis: {
    gaps: SkillGap[];
    strengths: SkillMatch[];
    bridgeStrategies: string[];
    recommendationLevel: 'strong' | 'good' | 'stretch';
  };
  cloudSnapshotId: string;    // Cloud state at time of application
  socraticQA: SocraticExchange[];  // JD-specific questions + answers

  // Outcome (user-updated)
  outcome: {
    status: 'pending' | 'callback' | 'interview' | 'offer' | 'rejected' | 'ghosted';
    statusUpdatedAt?: Date;
    userFeedback?: string;           // raw free-text
    parsedFeedback?: {
      positiveSignals: SkillSignal[];  // skills employer praised
      gapSignals: SkillSignal[];       // skills employer wanted more of
      context?: string;                // competitive loss, overqualified, etc.
    };
  };
}

interface SkillSignal {
  skillId: string;          // maps to Cloud skill entry
  signal: 'positive' | 'gap';
  context: string;          // what the employer said/implied
  niche: string;            // industry + role type
  date: Date;
}
```

---

## How This Differs From v2 (Self-Regulation Dashboard)

v2 focused on:
- Process Quality Score (5 dimensions)
- Never showing raw rejection rates
- Temporal comparison
- Psychological safety

v3 **keeps all of v2's psychological design principles** but adds the learning loop:

| v2 (Dashboard) | v3 (Application Memory) |
|---|---|
| Shows patterns in user's data | Shows patterns AND uses them in future generation |
| "Your fintech apps get more callbacks" (display) | CV gen for fintech #9 leads with what worked (action) |
| Celebrates wins | Celebrates wins AND learns from them |
| Tracks process quality | Tracks process quality AND outcome quality |
| Static analytics | Living memory that makes Cloud smarter |

v2's psychological principles remain:
- Never show raw rejection counts without context
- Lead with controllables (process quality, not outcome luck)
- Temporal comparison only (your improvement over time)
- Advocate framing always

v3 adds:
- Outcome feedback enriches Cloud (per-user learning)
- Silent context injection in CV generation
- Same company memory with full history
- Gap accumulation detection across niche
- Niche-specific intelligence profiles

---

## What This System Does NOT Do

```
Does NOT improve prompts for other users (per-user only)
Does NOT train or fine-tune any model
Does NOT make causal claims ("data pipeline CAUSED the callback")
Does NOT require email/mailbox access
Does NOT share data across users
Does NOT predict future outcomes
Does NOT show "match scores" or fabricated percentages
```

It provides CONTEXT, not CAUSATION. The CV generation prompt gets richer history to work with. The AI uses that context to make better choices about what to emphasize. It's memory, not intelligence in the ML sense.

---

## Relationship to Other Systems

```
AutoResearch (system-wide):
  Our 50-pair test bank → better prompts for ALL users
  Optimizes prompt INSTRUCTIONS (how to write CVs)
  No user data involved

Outcome Intelligence v3 (per-user):
  User's application history → smarter Cloud for THIS user
  Provides CONTEXT to prompts (what worked for this user in this niche)
  Data never leaves user boundary

These are complementary:
  AutoResearch = better CV writing TECHNIQUE (system-wide)
  Outcome Intelligence = better CV writing CONTEXT (per-user)
```

---

## No Mailbox Access Required

Application tracking works through our own JD analysis flow:
- User pastes JD → footprint created automatically
- User updates outcome → dropdown in dashboard
- User provides feedback → optional free-text

### Future phases for auto-tracking (not required for core system):
- **Phase 2:** Chrome extension (captures apply action on job boards)
- **Phase 3:** Email forwarding model (user BCCs track@jobloop.ai — no OAuth, user controls what's shared)
- **Phase 4:** Gmail metadata scope (subject-line detection, no body reading, avoids expensive CASA audit)

Core Outcome Intelligence works without any of these integrations.

---

## Implementation Priority

1. **MVP:** Application footprint + outcome dropdown + dashboard display
2. **Phase 1.5:** Free-text feedback parsing + Cloud enrichment
3. **Phase 2:** Silent context injection in CV generation
4. **Phase 2.5:** Same company detection + alert
5. **Phase 3:** Gap accumulation detection + Socratic trigger
6. **Phase 4:** Niche intelligence profiles (accumulated view)

Steps 1-3 are the core loop. Steps 4-6 emerge naturally from accumulated data.

---

## Research Sources

### Competitive Audit
- [Huntr 2025 Annual Report](https://huntr.co/research/2025-annual-job-search-trends-report) — 1.7M apps, 243K resumes, publishes aggregate stats but does NOT feed outcomes into AI
- [Teal Job Tracker](https://www.tealhq.com/tools/job-tracker) — notes per app, no cross-application intelligence
- [Loopcv](https://www.loopcv.pro/) — A/B tests CV versions via email open/reply rates, closest competitor but no qualitative feedback loop
- [Careerflow](https://www.careerflow.ai/) — tracks stages, organizational only
- [G-Track](https://jobtrack-ai.com/) — Gmail OAuth auto-tracking, no learning from outcomes
- [RUNMAGI](https://www.runmagi.com/) — Gmail integration, no outcome-based improvement
- [CareerSync](https://github.com/Tomiwajin/CareerSync) — open source Gmail tracker, stateless, no learning

### Why Cross-User Learning Doesn't Work (validated)
- [Causal Inference with Observational Data (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8020490/) — confounders, selection bias, measurement bias
- [Simpson's Paradox (Stanford)](https://plato.stanford.edu/entries/paradox-simpson/) — aggregate correlations can be entirely spurious
- [Meta-analysis of Racial Discrimination in Hiring (PNAS)](https://www.pnas.org/doi/10.1073/pnas.1706255114) — 36% callback gap by race, outcome data encodes bias
- [RLHF Reward Model Requirements (Apple ML)](https://machinelearning.apple.com/research/data-centric-rlhf) — 50K+ preference pairs minimum for reward models

### Self-Regulation Principles (retained from v2)
- Van Hooft et al. meta-analysis (N=165,933) — search QUALITY predicts employment quality
- Locke & Latham (2002/2006) — learning goals > performance goals for novel tasks
- Abramson et al. (1978) — learned helplessness from uncontrollable negative outcomes
- Falk et al. (2026, JEBO) — people avoid information that signals rejection

### Email/Mailbox Alternatives
- [Google Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) — CASA audit $15K-$75K/year for gmail.readonly
- [Gmail API Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) — gmail.metadata (sensitive) vs gmail.readonly (restricted)
- JobShinobi email forwarding model — user-controlled, no OAuth needed
