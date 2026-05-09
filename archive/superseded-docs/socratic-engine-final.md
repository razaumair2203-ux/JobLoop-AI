# JobLoop AI — Socratic Engine: Final Design
## Research-Validated, Corrected for Fabrications
## Date: 2026-04-29
## Status: Finalized design — ready for implementation
## Replaces: socratic-engine-design-problems.md (which remains as problem inventory)

---

## What the Socratic Engine Actually Is

A **structured data collection system** with an LLM as the conversational interface.
NOT an AI that gets wiser. NOT a chatbot. NOT magic.

The intelligence is in the **architecture** (what to ask, when to stop, how to use evidence).
The LLM is just the interface that makes it conversational instead of a form.

---

## Research Foundation

### Socratic Questioning in AI — What Research Actually Shows

- Socratic AI tutoring shows **statistically significant** improvements over direct-answer approaches (p < 0.001) in educational settings (Frontiers in Education, 2025)
- Students find Socratic AI feedback useful for **identifying knowledge gaps** and promoting deep learning (Journal of Learning Development in Higher Education)
- Key finding: Socratic method develops **higher-order thinking** — analyzing, evaluating, synthesizing — vs passive retrieval (multiple 2024-2026 studies)
- BUT: all research is in **education**, not in professional information elicitation. No research exists on Socratic questioning for CV enrichment specifically.

### Progressive Profiling UX — What Research Actually Shows

- Conversion decreases **7% per additional required field** (form research)
- **>7 fields = 50% higher bounce rate** vs 3 fields (form abandonment statistics)
- Best practice: **3 questions maximum per interaction**, continue over multiple sessions
- Multi-step forms significantly outperform single long forms
- Timing matters: don't interrupt during conversion milestones

### LLM Resume Parsing — What Research Actually Shows

- LLMs can interpret unstructured resumes and extract meaning
- But they can **omit fields, return incorrect types, or introduce inconsistencies** — especially on unstructured resumes
- No published benchmark specifically measures accuracy of evidence signal extraction from CVs
- Our claimed accuracy numbers (95%, 90%, 85%) are **fabricated** — real accuracy is unknown until we test

### Probing Techniques — What Research Actually Shows

- DICE framework: Descriptive Detail, Idiographic Memory, Clarifying, Explanatory probes
- Funnel approach: open-ended → closed-ended, using 5W1H
- Maximum 3 questions per interaction is a validated best practice
- "Can you give me a specific example?" is the most effective probe type

---

## The Corrected Architecture

### What Drives Quality (Honest Assessment)

| Component | What Drives It | LLM Importance |
|-----------|---------------|----------------|
| Deciding WHAT to ask | Cloud state — which signals are missing | LOW — this is if/else logic |
| Deciding WHEN to ask | Gate system + threshold + question count | LOW — this is rules |
| Phrasing the question well | Prompt quality + persona awareness | MEDIUM — decent prompt is 90% there |
| Parsing the answer | LLM text understanding | MEDIUM — modern LLMs handle this well |
| Knowing when to STOP | Cloud completeness + skip tracking | LOW — this is data checking |

**The LLM is the least important part.** Architecture > Data > Prompts.

### Karpathy AutoResearch for Socratic Prompts

**Verdict: LOW value.** Karpathy nightly optimization should focus on cv-generation.ts (HIGH value) and jd-parser.ts (MEDIUM value), not on Socratic prompts where architecture matters more than phrasing.

Socratic prompts should be:
1. Hand-crafted with care (one-time design effort)
2. Tested against 50 real CVs pre-launch
3. Improved manually based on user feedback post-launch
4. NOT part of the nightly AutoResearch loop (waste of compute)

---

## The 3-Gate System (Validated Against UX Research)

### Gate 1: On CV Upload (Mandatory, 3-5 questions max)

Research says: 7+ fields = 50% higher bounce. 3 questions per interaction is optimal.

```
Trigger: CV imported, Cloud built with gaps
Budget: 3-5 questions MAXIMUM (research-backed limit)
Target: Self-declared-only skills + biggest specificity gaps
Priority order:
  1. Skills with NO evidence (self-declared only) — ask for ANY project/use
  2. Work experience with NO metrics — ask for scale/outcome
  3. Vague role descriptions — ask for specific contribution
Skip: Always available. "Skip all — I'll add details later"
Stop: After 5 questions OR user skips 2 in a row
```

### Gate 2: On JD Analysis (Optional, 2-3 questions max)

Research says: don't interrupt during conversion milestones. Analysis streaming IS the milestone. Ask AFTER.

```
Trigger: JD analyzed, gaps found where enrichment would change result
Budget: 2-3 questions MAXIMUM
Timing: AFTER streaming analysis completes (not during)
Target: JD-critical skills where Cloud evidence is thin
Show: Why this question matters ("This role requires K8s. You have Docker.
  Have you used K8s in any capacity?")
Skip: "Skip all — generate CV with current evidence"
Real-time update: Answer → Cloud updates → analysis result re-evaluates
```

### Gate 3: User-Initiated (No limit)

```
Trigger: User clicks [Strengthen this evidence -->]
Budget: No limit (user chose to be here)
Target: Specific evidence item user wants to improve
Deep dive: Multiple follow-ups on one topic are fine
```

### Question Budget Across Session

```
First CV upload: 3-5 questions (Gate 1)
First JD analysis: 2-3 questions (Gate 2)
Total first session: 5-8 questions MAXIMUM

Subsequent JDs (same domain): 0-2 questions
Subsequent JDs (new domain): 1-3 questions
After Cloud is rich: 0 questions ("Your evidence covers this role well")
```

---

## Question Generation — Simple Rules, Not AI Magic

### The Logic (Not a Prompt Problem — An Architecture Problem)

```typescript
function generateSocraticTarget(skill: SkillNode): SocraticTarget | null {
  // Priority 1: No evidence at all (self-declared only)
  if (!skill.evidence.some(e => e.type !== 'self_declared')) {
    return {
      signal: 'any_evidence',
      template: 'describe_project',
      question: `You list ${skill.name}. Can you describe a specific
        project or task where you used it? What were you building,
        for whom?`
    };
  }

  // Priority 2: Has evidence but no metrics/outcome
  const hasMetrics = skill.evidence.some(e => e.quality_signals?.has_metrics);
  const hasOutcome = skill.evidence.some(e => e.quality_signals?.has_outcome);

  if (!hasOutcome && !hasMetrics) {
    const bestEvidence = skill.evidence.find(e => e.type === 'work');
    return {
      signal: 'has_outcome',
      template: 'ask_outcome',
      question: `You ${bestEvidence?.desc || 'worked with ' + skill.name}.
        What changed as a result? Any measurable outcome —
        even approximate?`
    };
  }

  // Priority 3: Has outcome but no scope
  const hasScope = skill.evidence.some(e => e.quality_signals?.has_team_scope);
  if (!hasScope) {
    return {
      signal: 'has_team_scope',
      template: 'ask_scope',
      question: `Was this solo work or with a team?
        How many people were involved?`
    };
  }

  // Skill is sufficiently evidenced
  return null;
}
```

### Question Templates (Hand-Crafted, Not Auto-Generated)

| Missing Signal | Template | Example Question |
|---------------|----------|-----------------|
| Any evidence (self-declared) | describe_project | "You list [skill]. Can you describe a specific project or task where you used it?" |
| has_outcome | ask_outcome | "You [evidence desc]. What changed as a result? Any measurable outcome?" |
| has_metrics | ask_metrics | "Can you quantify the impact? Think: users, records, percentage, cost, time saved." |
| has_team_scope | ask_scope | "Was this solo or team work? How many people?" |
| has_company_context | ask_company | "Which company or client was this for?" |
| has_duration | ask_duration | "How long did this project/role span?" |
| has_specific_technology | ask_tech | "What specific tools or technologies did you use?" |
| no_metrics_alternative | ask_qualitative | "Not every role produces numbers. Can you describe the scope, outcome, or any recognition?" |

### The "I Don't Have Metrics" Path

Research confirms many legitimate roles produce no hard metrics (HR, design, support, legal, admin).

```
When user says "I don't have metrics":

System pivots to qualitative evidence:
  "No problem. Instead of numbers, can you describe:
   - The SCOPE: how many people/systems/projects?
   - The OUTCOME: what changed because of your work?
   - Any RECOGNITION: feedback, promotion, repeat engagement?"

Updated specificity calculation:
  'high':   has_outcome AND (has_metrics OR (has_scope AND has_company))
  'medium': has_outcome OR (has_scope AND has_company)
  'low':    none of the above

Key: has_outcome is the most important signal.
"What changed?" is always answerable, even without numbers.
Non-quantitative roles CAN reach 'Strong' confidence.
```

---

## Persona Awareness (Framing, Not Different Logic)

Persona detection from CV analysis adjusts question FRAMING, not the underlying logic. The signals we're extracting are the same. The words we use to ask change.

### Detection (Automatic from CV Parse — confirms or refines onboarding selection)

```
Education only, no work history          → early_career
5-15 years across 2-4 employers         → mid_career
Single employer >10 years OR 15+ years   → senior (+ long_tenure sub-signal if single employer)
VP/Director/C-level titles               → executive
Multiple industries across roles         → career_changer
Many short engagements                   → freelancer
Timeline gap >1 year (voluntary)         → returner
Recent end date + no current role        → laid_off
Military keywords (rank, MOS, clearance) → military
```

If auto-detection disagrees with onboarding selection, show gentle confirmation:
"Based on your CV, you might also identify as [detected]. Would you like to adjust?"

### Framing Adjustments (Injected Into Question Templates)

| Persona | Key Adjustments |
|---------|----------------|
| early_career | "Let's find what you DO have." Prioritize: capstone > internship > coursework > projects. Never make them feel inadequate. |
| mid_career | Shift from task-focused to results-focused. Probe for quantified impact, progression, and leadership moments. Ask about scope growth over time. |
| senior | Depth = strength. Ask about breadth of impact, mentoring, architectural decisions. Single employer >10 years: role progression within org, internal transfers count. |
| executive | Ask about scope/budget/team, not technical details. Before/after states. Business outcomes. P&L responsibility. Board-level communication. |
| career_changer | Previous domain = valuable. Probe transferable tools. Don't ask about target domain experience. |
| freelancer | Ask for top 3-5 projects, not all 50. Aggregate stats are valid. Client names/portfolio if possible. |
| returner | Don't ask WHY they took a break. Focus on pre-gap strength + any during-gap activity. Domain knowledge doesn't decay. |
| laid_off | Never frame as failure. Focus on what they built before displacement. Probe for reframe narrative: "What were you most proud of in that role?" Urgency-aware: prioritize actionable evidence. |
| military | Ask about TYPE not details (classified). Translate rank → leadership. Ask about clearances (Tier 1 evidence). MOS → civilian skill mapping. Don't ask about classified operations. |

---

## Answer Parsing

### What the Parser Does

User answers in natural language → extract structured signals → update Cloud evidence.

### What It Must NOT Do

1. **Hallucinate numbers** — if user says "large team", store has_team_scope: true, NOT team_size: 50
2. **Rewrite the user's words** — preserve original phrasing in evidence description
3. **Auto-resolve contradictions** — if new answer conflicts with CV, ask user which to keep
4. **Claim verification** — we describe what was said, never vouch for truth

### Confidence and Fallback

```
High confidence parse (clear, specific answer):
  → Update Cloud directly
  → Show user: "Got it. Stored: [summary]"

Medium confidence parse (some ambiguity):
  → Store + show user: "I captured: [summary]. Does that look right?"
  → User confirms or corrects

Low confidence parse (vague, off-topic, confusing):
  → Store raw text, flag for re-review
  → Show: "Thanks — I've saved your answer."
  → Don't attempt structured extraction from bad input
```

### Contradiction Handling

```
CV says "5 years Python" but Socratic answer says "used Python once in a course":
  → Don't silently overwrite
  → Show: "Your CV says [X] but your answer suggests [Y].
           Which should we lead with?"
  → User picks → Cloud updates with chosen value
  → Audit trail: both versions stored

NOT a contradiction (just elaboration):
  CV says "Python developer" → answer adds "specifically ML pipelines"
  → Additive, not conflicting → merge
```

---

## The Quieting Mechanism

The engine asks fewer questions over time. NOT because it's smarter — because the Cloud has more data.

```
Application #1:  Cloud empty → 5-8 questions (Gates 1+2)
Application #3:  Cloud has core skills → 1-2 questions (new gaps only)
Application #8:  Cloud rich for this domain → 0-1 questions
Application #15: Cloud covers all requirements → "No questions needed"
Application #30: Only asks for genuinely novel requirements
```

### Repeat Prevention

```
Before generating any question, check enrichment_dialogues:
  - Already asked about this skill + this signal AND user answered?
    → NEVER ask again
  - Already asked AND user skipped?
    → Ask again ONLY if: different JD context + 30+ days since skip + max 2 attempts total
  - After 2 skips on same topic → accept user won't answer, work with what we have
```

---

## Pre-Launch Testing (Non-Negotiable)

### The 50-CV Test

```
1. Collect 50 diverse CVs:
   - 10 tech (junior to senior)
   - 5 military/government
   - 5 career changers
   - 5 freelancers
   - 5 recent graduates
   - 5 executives
   - 5 returners (career gaps)
   - 5 non-English background
   - 5 non-tech (HR, design, finance, legal, admin)

2. For each CV:
   a. Run CV parser → check: correct evidence type classification?
   b. Run Socratic target selection → check: reasonable question chosen?
   c. Write simulated answers (3 quality levels per question)
   d. Run answer parser → check: correct signal extraction?
   e. Compare Socratic questions to ChatGPT equivalent → is ours better?

3. Measure:
   - Evidence type classification accuracy (claimed ~95%, verify)
   - Signal extraction accuracy (claimed ~90%, verify)
   - Question relevance (human judgment, not LLM)
   - Parser precision (does it extract ONLY what was said?)

4. Minimum thresholds:
   - Evidence type: >90% accuracy
   - Signal extraction: >80% accuracy
   - Question relevance: >85% (human judged)
   - Parser precision: >90% (never hallucinate signals)

5. If thresholds not met → improve prompts → retest → iterate
```

---

## Relationship to AutoResearch

### Corrected Priority

| Prompt | AutoResearch Priority | Why |
|--------|----------------------|-----|
| cv-generation.ts | **HIGH** — nightly loop | Prompt quality = CV output quality. Users see this directly. Small changes = big impact. |
| jd-parser.ts | **MEDIUM** — nightly loop | Parsing accuracy affects everything downstream. Measurable, improvable. |
| insights.ts | **MEDIUM** — post-launch | Phrasing affects user engagement. Needs real user data to optimize. |
| socratic.ts | **LOW** — manual improvement | Architecture matters more than phrasing. Hand-craft, test, improve manually. |
| socratic-parser.ts | **LOW** — manual improvement | Modern LLMs parse well. Edge cases improve slowly with more test cases. |

### Why Socratic Is NOT in the Nightly Loop

1. Question quality is 90% architecture (which signal to target) and 10% phrasing
2. The cost of running 50 profile × 3 answer variants × LLM generation + parsing = expensive for marginal gains
3. Hand-crafted question templates tested against real CVs will outperform auto-optimized prompts
4. Manual improvement from user feedback (post-launch) is more effective than blind nightly optimization

### What IS in the Nightly Loop

```
Nightly AutoResearch (Karpathy loop):
  1. cv-generation.ts — optimize against test bank, edit distance metric
  2. jd-parser.ts — optimize against test bank, parsing accuracy metric

Monthly manual review:
  3. socratic.ts — review question quality, update templates
  4. socratic-parser.ts — review parsing accuracy, add edge cases
  5. insights.ts — review user engagement data (post-launch)
```

---

## What We Explicitly Corrected

| Original Claim | Correction | Source |
|----------------|-----------|--------|
| "~95% evidence type classification" | UNKNOWN — need benchmark | Fabricated number |
| "~90% specificity extraction" | UNKNOWN — need benchmark | Fabricated number |
| "Multi-question probing catches shallow claims ~95%" | NO EVIDENCE — Socratic method helps in education but no data on CV enrichment | Fabricated number |
| "Karpathy nightly loop for all 5 prompts" | Only cv-generation and jd-parser in nightly loop. Socratic: manual improvement. | Over-engineering for low-value prompt |
| "Composite user behavior score with weights 0.4/0.2/0.2/0.1/0.1" | FABRICATED weights — no data. Log raw signals, let data determine weights later. | Invented numbers |
| "AI judging AI for question quality rubric" | REMOVED — circular. Use human judgment for test bank, user behavior post-launch. | Circularity problem |
| "specificity_delta as primary Socratic metric" | DEMOTED — depends on parser (LLM), making it circular. Primary: human evaluation pre-launch, user behavior post-launch. | Circularity problem |
| "Compound effect: Socratic → Cloud → CV → outcomes → better prompts" | BROKEN at last step — user outcome data can't feed into system-wide prompt optimization (privacy). Compound effect is per-user data accumulation, not system learning. | Privacy constraint |
