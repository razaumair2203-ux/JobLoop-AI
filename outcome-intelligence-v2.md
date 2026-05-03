# Outcome Intelligence v2: Research-Backed Redesign
## Date: 2026-05-01
## Status: Replaces outcome-intelligence-final.md
## Research: 5 agents, 40+ sources, 2 meta-analyses (N=165,933 + N=19,951)
## Validation: All 20 claims independently verified May 2026. 4 critical errors corrected (wrong authors, wrong numbers, invented dimensions). See validation notes below.

---

## The Fundamental Shift

**v1 was a personal analytics dashboard.** Show counts, show rates, show patterns.

**v2 is a self-regulation support system.** Help the user observe, reflect, adjust, and persist — without destroying their motivation.

The research is unambiguous: raw rejection data causes learned helplessness and information avoidance. People literally choose to earn LESS money to avoid seeing rejection signals (Falk et al. 2026, JEBO). 72% of job seekers report negative mental health impact (Resume Genius 2024, N=1,000). The dashboard must be designed for the user checking it after 5 rejections in a row.

---

## 7 Research-Backed Design Principles

### 1. Track Process, Not Outcomes
Show what the user DID (tailored applications, bridge strategies used, skills demonstrated) not what HAPPENED TO THEM (rejection count, callback rate).

**Why:** Locke & Latham (2002/2006): for novel complex tasks, learning goals ("discover 2 strategies") outperform performance goals ("get 3 callbacks"). Demonstrated in specific experiments (e.g., Latham & Brown MBA study). Job search is a novel complex task for most users.

### 2. Never Show Raw Rejection Rates
Every metric must include: benchmark context + controllable action + evidence of possibility.

**Why:** Falk et al. (2026): rejection imposes psychological cost that motivates active information avoidance. Coffman et al. (2025, Harvard): rejection makes people feel less qualified and apply less. Showing "4% callback rate" without context is psychologically dangerous.

**Instead of:** "You've been rejected from 87% of applications"
**Show:** "3 of your applications got responses — applications where you used evidence-backed skills had 2x the response rate. Here's how to apply that pattern."

### 3. Pull Model for Analytics, Push Model for Wins
Let users choose to view the dashboard (pull). Push only celebrations and actionable discoveries. Never push negative analytics.

**Why:** Orji et al. (2018, Digital Health): self-tracking feels "oppressive and punishy" when it functions as accountability rather than insight. Notification research: 46% opt out after 2-5 messages/week.

### 4. Temporal Comparison Only, Never Social
Compare users to their own past. Never to other users.

**Why:** Fukubayashi & Fuji (2021, Frontiers in Psychology): upward social comparison on social media increases career frustration (N=309 + N=1,254). Matthews & Kelemen (2025): aggregate adverse effects of social comparison outweigh benefits. Fu et al. (2019): social information changes behavior but not always helpfully.

### 5. Attribution Framing on Every Data Point
Every metric must suggest a controllable, specific, temporary cause — never an uncontrollable, global, permanent one.

**Why:** Abramson, Seligman & Teasdale (1978): pessimistic attributional style (permanent + personal + pervasive) predicts helplessness and depression. Optimistic style (temporary + external + specific) protects. The system must help users frame outcomes as "this application wasn't tailored enough" not "I'm not good enough."

### 6. Surface Small Wins Aggressively
In a process dominated by rejection, actively manufacture visibility for progress.

**Why:** Amabile & Kramer (2011, 12,000 diary entries): nothing contributed more to positive work life than making progress — even small progress. Progress of some kind was present on 76% of best-mood days. Weick (1984): reframing large problems as achievable small wins reduces anxiety.

### 7. Design for the Worst Day
The user checking after 5 consecutive rejections should see: what they did well, what they can adjust, and evidence that adjustment works. Never just the raw rejection count.

**Why:** Bandura (1997): early failure before any success is especially detrimental to self-efficacy. Recovery is harder once low self-efficacy is established. The system must protect efficacy during the inevitable rejection streaks.

---

## What Gets Tracked (Capture Everything, Show Selectively)

### Metadata captured on every application:
```
- Application date + time
- Job source (LinkedIn, Indeed, company site, referral, other)
- Company name + size + industry
- Role title + seniority level
- CV version used
- Cover letter used (yes/no, which version)
- Bridge strategies applied (which ones)
- Skill match % (from our JD analysis)
- Tailoring level (full tailor / light edit / base CV)
- Status: applied → response → interview → offer / rejection / ghost
- Response date (if any)
- Response type: ghost / auto-reject / delayed auto-reject / personal email / phone / feedback
- Interview format (if reached): phone / video / onsite / panel / technical
- User notes (free text)
```

### NEW: Rejection Quality Tracking (Novel Differentiator)
No competitor tracks this. Users categorize rejection type:

| Type | What It Tells Us | Strategic Value |
|---|---|---|
| Ghost (no response) | Nothing — 60% of applications. Normal. | Don't read into it |
| Auto-reject (instant) | Likely knockout question (visa, location) | Check pre-screening criteria |
| Delayed auto-reject (days/weeks) | Role filled or batch processing | No action needed |
| Personal email (named recruiter) | Application was reviewed by human | Company worth reapplying to |
| Phone rejection | Reached late stages | Strong signal — very close |
| Rejection with feedback | Rarest, most valuable | Act on specific feedback |

**Why this matters:** 79% of candidates would reapply to a company that gave feedback after an interview (Greenhouse 2024, N=2,900). Tracking rejection quality helps users identify "warm" companies vs "black holes."

---

## What Gets Shown (Tiered, Gated, Framed)

### Tier 0: From Application #1 — Activity + Easy Wins

**Show immediately. Zero inference. Focused on process and quick wins.**

```
YOUR SEARCH THIS WEEK
  Applications submitted: 8
  Tailored (full): 3
  With bridge strategies: 2
  Average skill match: 74%

TIMING INSIGHT
  You applied at 11 PM Saturday. Industry data suggests Tuesday
  6-10 AM may get significantly more responses. Want to save
  drafts and submit Tuesday morning?

SOURCE INSIGHT
  Company career pages show 2-3x higher response rates than LinkedIn
  Easy Apply (Huntr, 1.7M applications). 3 of your 8 applications
  went through LinkedIn. Consider applying directly on company sites
  for your top choices.

SMALL WIN
  You completed 3 fully tailored applications this week.
  Tailored resumes get ~1.6x more callbacks than generic ones (Huntr, 243K resumes).
```

**What's NOT shown at Tier 0:**
- Callback rate (too early, sample too small, psychologically harmful)
- Rejection count (not actionable)
- "No response" count (normal, not a signal)

### Tier 1: After 15+ Applications — Source Channel Performance

```
WHERE YOUR APPLICATIONS GO
  LinkedIn Easy Apply: 8 applications
  Indeed: 4 applications
  Company websites: 3 applications

BENCHMARK CONTEXT (from Huntr 2025, 1.7M applications)
  Google Jobs: 11.3% response rate
  Company sites: 5-11% response rate
  Indeed: 4.5% response rate
  LinkedIn: 3.1% response rate

  Most of your applications (53%) went through LinkedIn, which has
  the lowest industry response rate. Consider shifting toward
  company career pages for your strongest-fit roles.
```

**Note:** We show INDUSTRY benchmarks (from Huntr's aggregate data), not the user's own rate. This contextualizes without personalizing the rejection.

### Tier 2: After 30+ Applications — Process Quality Score

**NEW: Inspired by Van Hooft's research on search quality (2021, N=165,933; 2022 JSQS validation). Our 5 dimensions are our own operationalization adapted for a tracking tool — Van Hooft's validated scale has 4 different dimensions (goal establishment, preparation, emotion regulation, learning).**

Instead of counting outcomes (which the user can't control), we score the PROCESS (which they can).

```
YOUR SEARCH QUALITY (this month)

  Targeting: 7/10
    You're applying to roles with 70%+ skill match.
    That's strong focus. Keep it up.

  Preparation: 8/10
    You tailored 80% of applications and used bridge strategies
    on 5 of them. This is above what most seekers do.

  Source diversity: 4/10
    90% of applications through one channel.
    Diversifying sources is one of the strongest levers.

  Timing: 6/10
    Half your applications went out on weekdays before noon.
    That's decent. Tuesday mornings are optimal.

  Reflection: ?/10
    You haven't reviewed your patterns yet this month.
    Take 5 minutes to look at what's working.

OVERALL QUALITY: Strong preparation, narrow sourcing.
Consider: apply to 3 roles through company career pages this week.
```

**Why this works:**
- Van Hooft (2021): search QUALITY predicts finding good jobs. Intensity alone doesn't.
- Every dimension is CONTROLLABLE by the user
- No rejection data shown
- Specific, actionable suggestion
- Learning goal framing ("discover strategies") not performance goal ("get callbacks")

### Tier 3: After 30+ Applications AND 5+ Responses — Guarded Observations

```
WHAT YOUR RESPONSES HAVE IN COMMON (5 responses from 34 applications)

  4 of 5 were roles with 80%+ skill match
  3 of 5 were through company career pages
  4 of 5 used your CV version with quantified metrics
  3 of 5 were applied Tuesday-Thursday before 10 AM

  These are patterns from a small sample. They suggest areas
  to focus on, not guarantees. Your mileage will change as
  you apply more.

WHAT YOU MIGHT TRY
  Your quantified-metrics CV version appears to perform better.
  Consider using it as your default for tailored applications.
```

**Framing rules:**
- "Responses" not "callbacks" (warmer language)
- "What they have in common" not "what caused success" (correlation, not causation)
- Explicit sample size warning
- Suggestion framed as experiment, not prescription

### Tier 4: After 50+ Applications AND 10+ Responses — Trends

```
YOUR SEARCH OVER TIME (12 weeks)

  Weeks 1-4:  18 applications, 1 response (5.6%)
  Weeks 5-8:  20 applications, 4 responses (20%)
  Weeks 9-12: 16 applications, 5 responses (31%)

  Your response rate has improved steadily.
  Changes you made during this period:
    - Switched to quantified CV (week 4)
    - Started using company career pages (week 6)
    - Added bridge strategies to tailored CVs (week 7)

  These changes correlate with your improvement.
  Keep refining what's working.

INDUSTRY CONTEXT
  Average response rate across platforms: 3-5%
  Your current rate (31%) is well above average.
  You're doing something right.
```

**Why show rates NOW:**
- 10+ responses gives statistical meaning to large effects
- Shown as TREND (improving) not SNAPSHOT (low)
- Always benchmarked against industry ("above average")
- Connected to controllable actions the user took
- Celebrates progress (small wins principle)

---

## What We NEVER Show (At Any Tier)

| Never Show | Why | What We Show Instead |
|---|---|---|
| Raw rejection count | Triggers helplessness (Seligman) | Process quality score |
| "87% rejected" | Information avoidance (Falk) | "3 responses, with these in common..." |
| Comparison to other users | Career frustration (Fukubayashi & Fuji) | Comparison to user's own past |
| "ATS rejected your CV" | ATS myth (92% human review) | "Check pre-screening questions" |
| "This role is unlikely to respond" | Gatekeeping (anti-advocate) | "Here's how to apply strongest" |
| Predicted outcomes | Can't predict with small n | Process quality trends |
| Performance goals ("get 5 callbacks") | Counterproductive for novel tasks (Locke & Latham) | Learning goals ("try 2 new strategies") |
| Unsolicited negative analytics | Causes abandonment (Orji et al.) | User pulls dashboard, wins are pushed |

---

## Easy Wins (Ship First, High Value, Low Harm)

### 1. Application Timing Insight
**Data:** Tuesday 6-10 AM associated with higher response rates (up to 4-5x in one industry analysis). 22% of new jobs posted Tuesday (ZipRecruiter, 10M+ listings).
**Effort:** Track submission timestamp, compare to optimal window.
**Harm risk:** Zero. Actionable, non-judgmental.
**Source:** TalentWorks (~1,600 applications — industry data, not peer-reviewed). ZipRecruiter for Tuesday posting data. Treat as directional, not definitive.

### 2. Source Channel Benchmarks
**Data:** Company sites 5-11% vs LinkedIn 3.1% vs Indeed 4.5% vs Google Jobs 11.3% (2-3x difference).
**Effort:** Track source as metadata, show Huntr benchmarks after 10+ applications.
**Harm risk:** Low. Shows industry data, not personal failure.
**Source:** Huntr 2025 Annual Report (1.7M applications, 59,437 resume authors).

### 3. Rejection Quality Tracking
**Data:** No competitor tracks rejection type. 79% would reapply to feedback-giving companies.
**Effort:** One dropdown per application outcome (ghost / auto / personal / phone / feedback).
**Harm risk:** Low. Reframes rejection as data, not judgment.
**Source:** Novel — no competitor does this.

### 4. Tailoring Impact (Aggregate, Not Personal)
**Data:** Tailored resumes: 5.8% vs ~3.6% callback (1.6x improvement). Huntr, 243K resumes.
**Effort:** Track whether CV was tailored. Show research stat, not personal rate.
**Harm risk:** Zero. Motivating — "tailoring works, and you're doing it."
**Source:** Huntr 2025 Annual Report (243,973 resumes, 64.5% job-tailored).

---

## Process Quality Score: The Core Innovation

Inspired by Van Hooft's Job Search Quality research. Van Hooft's validated JSQS (2022) has 4 dimensions: goal establishment & planning, preparation & alignment, emotion regulation & persistence, learning & improvement. Our 5 dimensions below are our own operationalization for a tracking tool context — not the validated scale directly.

### 5 Dimensions (all controllable):

| Dimension | What We Measure | How User Improves |
|---|---|---|
| **Targeting** | Average skill match % of applications | Apply to higher-match roles |
| **Preparation** | % of apps with tailored CV + bridge strategies | Use JobLoop's CV tailoring more |
| **Source Diversity** | Distribution across channels | Apply through company sites, not just LinkedIn |
| **Timing** | % of apps submitted in optimal windows | Schedule submissions for Tue-Thu morning |
| **Reflection** | Did user review patterns this week? | View dashboard, adjust strategy |

### Why This Matters
- Van Hooft (2021, N=165,933): search QUALITY predicts employment quality. Intensity does not.
- No competitor measures search quality. Everyone counts applications.
- Every dimension is something the user can CONTROL and IMPROVE
- Progress on process quality builds self-efficacy (Bandura's mastery experiences)
- It's a learning goal framework, not a performance goal framework

---

## Notification Strategy

### PUSH (max 2/week):
- Small wins: "You completed 5 tailored applications this week"
- Milestones: "Your search quality score improved from 6 to 8"
- Actionable discovery: "Your company-site applications are getting responses — try 2 more this week"
- Timing nudge: "You have 3 draft applications ready. Tuesday morning is optimal — want a reminder?"

### NEVER PUSH:
- Rejection counts
- Declining rates
- "You haven't applied in X days"
- Comparison to anyone

### PULL (user opens dashboard):
- Full process quality breakdown
- Source channel analysis
- Response pattern observations (if enough data)
- Trends over time

---

## Implementation Phases

### Phase 1 (MVP): Track + Easy Wins
- Capture all metadata on every application
- Show: timing insights, source benchmarks (industry data), tailoring encouragement
- Small win notifications
- No pattern analysis yet

### Phase 2 (After 1 month): Process Quality
- Process Quality Score (5 dimensions)
- Rejection quality tracking (dropdown)
- Source channel performance (personal + benchmark)
- Weekly summary (pull)

### Phase 3 (After traction): Guarded Observations
- Response pattern commonalities (Tier 3, gated behind 5+ responses)
- CV version directional comparison
- Trend visualization (Tier 4, gated behind 10+ responses)
- Never A/B testing claims, never causal language

---

## What Changed From v1

| v1 (outcome-intelligence-final.md) | v2 (this document) | Why |
|---|---|---|
| Personal analytics dashboard | Self-regulation support system | Dashboards without framing cause helplessness |
| Show callback rate from Tier 1 | Hide rates until Tier 4, always with benchmark | Raw rates trigger information avoidance (Falk) |
| Count applications + outcomes | Process Quality Score (5 controllable dimensions) | Quality predicts success, not intensity (Van Hooft) |
| Neutral framing | Advocate framing on every metric | Attribution framing prevents helplessness (Seligman) |
| Push analytics | Pull analytics, push only wins | "Oppressive and punishy" (Orji et al. 2018) |
| No timing insights | Application timing as easy win | Real data, zero harm, actionable |
| No source benchmarks | Industry source data from Huntr | Contextualizes without personalizing rejection |
| No rejection quality tracking | Track rejection type (novel differentiator) | No competitor does this; 79% value it |
| Show distributions at 30 apps | Process Quality Score at 30 apps | Controllable > uncontrollable metrics |
| Basic tier system | Research-calibrated gates + framing rules | Behavioral science on every decision |

---

## Key Research References

| Paper | Year | Key Finding | How We Use It |
|---|---|---|---|
| Van Hooft et al. (JAP, N=165,933) | 2021 | Quality predicts good jobs; intensity doesn't | Process Quality Score |
| Harkin et al. (Psych Bulletin, N=19,951) | 2016 | Self-monitoring works; recording > mental noting | Application tracker as intervention |
| Locke & Latham (35-year review) | 2002/2006 | Learning goals > performance goals for novel tasks | Learning goal framing throughout |
| Bandura (Self-Efficacy) | 1997 | Mastery experiences build efficacy; early failure especially detrimental | Small wins, protect early experience |
| Amabile & Kramer (12K diaries) | 2011 | Progress present on 76% of best-mood days | Surface small wins aggressively |
| Falk et al. (JEBO) | 2026 | People avoid information to escape rejection signals | Never push rejection data |
| Coffman et al. (Harvard) | 2025 | Rejection makes people feel less qualified, apply less | Attribution framing on every metric |
| Abramson, Seligman & Teasdale | 1978 | Pessimistic attribution → helplessness → depression | Controllable/specific/temporary framing |
| Orji et al. (Digital Health) | 2018 | Self-tracking feels "oppressive and punishy" as accountability | Insight function, not accountability |
| Fukubayashi & Fuji (Frontiers) | 2021 | Social comparison → career frustration (N=309 + N=1,254) | Temporal comparison only |
| Gollwitzer & Brandstatter (JPSP) | 1997 | Implementation intentions 3x goal completion | "When X, I will Y" prompts |
| Liu et al. (Psych Bulletin) | 2014 | Job search interventions: 2.67x employment | Skill + motivation both required |
| Huntr Annual Report (1.7M apps) | 2025 | Source rates, tailoring impact (1.6x), timing | Industry benchmarks |

---

## Validation Notes (May 2026)

All 20 claims independently verified. Corrections applied:

| Claim | Issue | Fix |
|---|---|---|
| "Epstein et al. 2015" | Wrong authors + venue | Corrected to Orji et al. (2018), Digital Health |
| "Lim & Choi 2021" | Wrong authors | Corrected to Fukubayashi & Fuji (2021) |
| "Company pages 4x" | Unverifiable source | Replaced with Huntr data (2-3x) |
| "JSQS 5 dimensions" | Our dimensions don't match validated scale | Acknowledged as our own operationalization |
| "Gollwitzer 1999 3x" | 3x from different paper | Corrected to Gollwitzer & Brandstatter (1997) |
| "Huntr 598K apps" | Wrong subset number | Corrected to 1.7M (full report) |
| "5.95% vs 2.9%" | Wrong numbers | Corrected to 5.8% vs ~3.6% (1.6x) |
| "28% of good days" | Mischaracterized statistic | Corrected to "76% of best-mood days had progress" |
| "40,000+ participants" for learning goals | Conflated with broader theory | Removed; cited specific experiments |
| "92% human review, 8% ATS" | Verified but small sample | Added caveat: Enhancv 2025, N=25 |
| "79% reapply after feedback" | Verified | Added qualifier: "after an interview" (Greenhouse 2024, N=2,900) |
| "72% mental health impact" | Missing source | Added: Resume Genius 2024, N=1,000 |
| Timing "5x" | Non-peer-reviewed | Flagged as industry data (TalentWorks, N=1,600) |

---

## Relationship to Other Systems (Unchanged)

```
AutoResearch (our test bank) → better prompts for ALL users
Outcome Intelligence (user's data) → their personal self-regulation support

These DO NOT interact across the user boundary.
User outcomes never improve our prompts.
Our prompts never use their outcomes.
```
