# JobLoop AI — Socratic Engine: Design Problems
## Each Issue Treated as a Formal Design Problem
## Date: 2026-04-29
## Status: Design phase — solutions proposed, none implemented
## Depends on: evidence-credibility-model.md, karpathy-adaptation (AutoResearch)

---

## Design Problem #1: The System Prompt Does Not Exist

### Problem
The spec (section 4.2) has human-readable question templates ("You said '[action]' — what was the measurable outcome?") but these are examples, not a production system prompt. The AI needs a complete system prompt that receives structured context and generates ONE precise, contextual question. Without this, the Socratic engine is ChatGPT with a different UI.

### Constraints
- Must generate questions BETTER than a raw LLM (ChatGPT) conversation — this is the product differentiator
- Must use Cloud state as context (not ask things we already know)
- Must respect the 3-gate threshold system (spec section 4.2 lines 198-210)
- Must not repeat questions already asked (stored in enrichment_dialogues table)
- Must produce questions in advocate tone — never interrogative, never judgmental
- Token budget per question generation: ~2K tokens max (cost control)

### Solution

The system prompt receives a structured input envelope:

```typescript
interface SocraticPromptInput {
  // What we know
  cloud_state: {
    skill: string;
    current_evidence: EvidenceItem[];
    current_confidence: 'mentioned' | 'moderate' | 'strong';
    specificity_signals: EvidenceQualitySignals;
    missing_signals: string[];  // e.g., ['has_metrics', 'has_team_scope']
  };

  // Context
  user_persona?: 'veteran' | 'career_changer' | 'freelancer' | 'recent_grad' | 'executive' | 'returner' | 'general';
  trigger: 'onboarding' | 'jd_analysis' | 'user_initiated';
  jd_requirement?: string;  // If triggered by JD gap

  // History
  questions_asked_this_session: number;
  previous_questions: string[];  // To avoid repeats
  user_skip_count: number;  // Affects threshold

  // Constraints
  threshold: number;  // Dynamic, from spec section 4.2
}
```

The system prompt structure:

```
ROLE: You are an evidence extraction specialist for JobLoop AI.
You help users articulate the depth of their professional experience.

CONTEXT: You are given a skill with its current evidence state.
Your job is to generate ONE question that fills the most critical
missing signal.

RULES:
1. NEVER ask about information already in the evidence array
2. NEVER ask generic questions — reference specific evidence the user provided
3. Target the FIRST missing signal in priority order:
   has_metrics > has_outcome > has_team_scope > has_user_scale > has_duration > has_specific_technology
4. Frame as curiosity, not interrogation: "I see you [X] — can you tell me [Y]?"
5. Provide skip-friendly framing: acknowledge if the user might not have the data
6. One question only. Follow-ups come in next cycle.

PERSONA ADJUSTMENTS:
[Injected per persona — see Design Problem #5]

INPUT: [Structured SocraticPromptInput]

OUTPUT (JSON):
{
  "question": "string — the actual question to display",
  "target_signal": "string — which missing signal this question targets",
  "skip_text": "string — compassionate skip option text",
  "expected_extraction": "string — what we hope to extract from the answer"
}
```

### What Makes This Better Than ChatGPT
- ChatGPT doesn't know what signals are MISSING — it asks generically
- ChatGPT doesn't have the Cloud — it asks things the user already told it
- ChatGPT doesn't have signal priority — it asks whatever seems interesting
- ChatGPT doesn't stop — it keeps conversing. We ask ONE question per gap.
- ChatGPT doesn't structure output — we parse into typed evidence objects

### Acceptance Criteria
- [ ] System prompt written and version-controlled in `packages/ai/prompts/socratic.ts`
- [ ] Generates different questions for the same skill with different missing signals
- [ ] Never asks about data already in evidence array (tested with 10 diverse profiles)
- [ ] Questions are noticeably more specific than ChatGPT given the same CV
- [ ] Output is valid JSON, parseable by Zod schema
- [ ] Runs within 2K token budget

### Test Plan
- 10 synthetic profiles with known gaps → generate questions → human-evaluate specificity
- Same 10 profiles through ChatGPT ("ask me about my Python experience") → compare
- Blind evaluation: which question would YOU rather answer?

---

## Design Problem #2: Answer Parser Has No Prompt or Validation

### Problem
User answers in natural language. We need to extract structured evidence signals. This parsing step has no prompt, no Zod schema, no fallback strategy. If parsing fails silently, the Cloud stores garbage and downstream CV generation uses garbage.

### Constraints
- Must handle varied answer styles: brief ("about 2M users"), verbose (3 paragraphs), evasive ("I think it was a decent-sized project"), multilingual (mixed English/other)
- Must not hallucinate signals the user didn't provide — if they said "large team" but no number, has_team_scope = true but team_size = undefined, NOT team_size = 50
- Must gracefully degrade — if parsing confidence is low, store raw text and flag for re-parse
- Must handle contradictions with existing evidence

### Solution

```typescript
interface AnswerParserInput {
  question_asked: string;
  target_signal: string;
  user_answer: string;
  existing_evidence: EvidenceItem[];  // To detect contradictions
}

interface AnswerParserOutput {
  extracted_signals: Partial<EvidenceQualitySignals>;
  new_evidence_item?: {
    type: 'work' | 'credential' | 'education' | 'self_declared';
    desc: string;
    metrics?: string[];
    company?: string;
    team_scope?: string;
    user_scale?: string;
    duration?: string;
    outcome?: string;
    specific_tech?: string[];
  };
  confidence: 'high' | 'medium' | 'low';
  contradiction_detected?: {
    field: string;
    existing_value: string;
    new_value: string;
    suggested_resolution: string;  // "Your CV says X but you mentioned Y. Which should we use?"
  };
  raw_answer: string;  // Always stored regardless of parse quality
}
```

Parser system prompt:

```
ROLE: You are an evidence signal extractor.

INPUT: A question we asked, the answer the user gave, and their existing evidence.

RULES:
1. Extract ONLY what the user explicitly stated or strongly implied
2. NEVER infer numbers the user didn't provide
   - "large team" → has_team_scope: true, but NO team_size number
   - "about 2 million" → has_user_scale: true, user_scale: "~2M"
3. If the answer is vague or evasive, set confidence: 'low'
4. If the answer contradicts existing evidence, flag it — don't silently overwrite
5. Preserve the user's original phrasing in desc — don't rewrite
6. If answer contains NO extractable signals, return empty extracted_signals

OUTPUT: [AnswerParserOutput as JSON]
```

### Fallback Strategy

```
IF parser confidence = 'high':
  → Update Cloud evidence directly
  → Show user: "Got it. [summary of what was stored]"

IF parser confidence = 'medium':
  → Store parsed signals + raw text
  → Show user: "I captured: [parsed summary]. Did I get that right?"
  → User confirms or corrects

IF parser confidence = 'low':
  → Store raw text only, flag for re-parse
  → Show user: "Thanks — I've saved your answer. I may ask a follow-up later to make sure I captured this accurately."
  → Re-parse attempted during next AutoResearch cycle with improved prompt

IF contradiction detected:
  → Don't update Cloud
  → Show user: "Your CV says [X] but your answer suggests [Y]. Which should we lead with?"
  → User picks → Cloud updates with chosen value
```

### Acceptance Criteria
- [ ] Parser prompt written and version-controlled in `packages/ai/prompts/socratic-parser.ts`
- [ ] Zod schema validates parser output — malformed JSON caught and handled
- [ ] Never hallucinates numbers or details user didn't provide (tested with 50 answers)
- [ ] Contradiction detection works: parser flags when new data conflicts with existing evidence
- [ ] Confidence rating is calibrated: 'high' answers are actually correctly parsed >90% of time
- [ ] Raw answer ALWAYS stored regardless of parse quality (never lose user input)

### Test Plan
- 50 synthetic answers (10 brief, 10 verbose, 10 evasive, 10 multilingual, 10 contradictory)
- For each: does parser extract correct signals? Does it avoid hallucination?
- Measure: precision (signals extracted are correct) and recall (signals present are extracted)
- Target: >85% precision, >75% recall. Precision > recall — better to miss than fabricate.

---

## Design Problem #3: No Ground Truth Metric for Socratic AutoResearch

### Problem
The AutoResearch loop (spec section 36) optimizes prompts using keep/discard logic against a metric. For CV generation, the metric is edit distance. For Socratic prompts, no metric exists. Without a metric, the Socratic prompt cannot enter the AutoResearch loop and cannot self-improve.

### Constraints
- Metric must be computable automatically (no human in the loop for nightly runs)
- Metric must be deterministic and comparable across prompt variants
- Metric must actually correlate with question quality (not just measure engagement)
- Must work from day 1 (can't wait for outcome data)

### Solution: Specificity Delta

```
specificity_delta = signals_after_answer - signals_before_question

For each Q&A cycle:
  Before: skill has {has_metrics: false, has_team_scope: false, has_outcome: true}
         = 1 signal present out of 7

  After:  skill has {has_metrics: true, has_team_scope: true, has_outcome: true}
         = 3 signals present out of 7

  specificity_delta = 3 - 1 = 2

Higher delta = question successfully extracted new information.
Zero delta = question was useless (user gave nothing new).
```

### Why This Works as val_bpb Equivalent

| Property | Karpathy's val_bpb | Our specificity_delta |
|----------|-------------------|----------------------|
| Deterministic | Yes (math) | Yes (signal count) |
| Comparable | Lower = better | Higher = better |
| Computable automatically | Yes | Yes (parser output) |
| Correlates with quality | Yes (model accuracy) | Yes (question effectiveness) |
| Available from day 1 | Yes | Yes (test bank provides answers) |

### The Test Bank for Socratic Prompts

```
50 synthetic profiles, each with:
- A CV with known gaps (we know what's missing)
- Pre-written "user answers" at different quality levels:
  - Answer A: detailed, specific (should yield delta 3-5)
  - Answer B: moderate, some details (should yield delta 1-2)
  - Answer C: evasive, vague (should yield delta 0-1)

For each profile:
1. Run Socratic prompt variant → generates question
2. Feed appropriate pre-written answer
3. Run parser → measure specificity_delta
4. Compare across prompt variants
5. Keep variant with highest average delta. Discard worse.
```

### Secondary Metrics (Available Post-Launch)

```
Tier 1 (immediate):
  - specificity_delta (primary, day 1)
  - answer_rate: did user answer or skip? (engagement proxy)

Tier 2 (after 100+ users):
  - answer_length: longer = more engaged = better question
  - follow_up_needed: did we need to ask again? (lower = better first question)

Tier 3 (after 100+ outcomes):
  - enriched_vs_unenriched_callback_rate: do enriched profiles get more interviews?
  - cv_quality_delta: does enriched evidence produce better CVs (measured by edit distance)?
```

### AutoResearch Loop Integration

```
Nightly at 2 AM UTC (alongside cv-generation and jd-parser):

1. Select socratic.ts prompt
2. AI agent proposes modification to system prompt
3. Run modified prompt against 50-profile test bank
4. Measure: average specificity_delta across all profiles
5. If higher average delta → keep. If lower → discard.
6. Log: [prompt_version, avg_specificity_delta, status, description]
7. REPEAT

Budget: ~$3-5/night for Socratic loop (50 profiles x ~1K tokens each)
```

### Acceptance Criteria
- [ ] specificity_delta computation implemented and tested
- [ ] Test bank of 50 profiles with pre-written answers created
- [ ] Socratic prompt enters AutoResearch nightly loop
- [ ] First 30 days of nightly runs show measurable improvement trend
- [ ] Secondary metrics collection wired up in production

### Test Plan
- Run 3 intentionally different prompt variants against same test bank
- Verify that the "obviously better" prompt scores higher delta
- If metric can't distinguish good from bad prompts, metric is wrong — redesign

---

## Design Problem #4: Evidence Source Summary Display Is Opaque

### Problem
"3 work projects with metrics, 1 cert" tells the user nothing about WHICH projects or what quality. The user cannot evaluate their own evidence strength without seeing the actual evidence items. This makes our display only marginally better than competitor scores — we replaced a number with a sentence, but neither shows the real picture.

### Constraints
- Must show enough detail that the user understands WHY a skill is Strong/Gap
- Must not overwhelm — user is scanning, not reading an essay
- Must drive action — weak evidence should naturally prompt the user to enrich
- Must work at three zoom levels: card (tracker), row (analysis), detail (expanded)
- Must show the ACTUAL evidence items, not just counts

### Solution: Three-Level Progressive Disclosure

**Level 1: Card/Row (scanning — Application Tracker, Analysis requirement rows)**
```
Python (5+ years)                                          Strong
  3 work + 1 credential — high specificity
```

One line. Count + source types + specificity qualifier. User knows at a glance.

**Level 2: Expanded Row (click to expand — Analysis requirement detail)**
```
Python (5+ years)                                          Strong
  [1] ML pipeline at Stripe — 2M records/day, team of 8   (work)
  [2] Data migration project — 40% cost reduction          (work)
  [3] Side script — "used Python for automation"           (work, low specificity)
  [4] AWS Solutions Architect Pro — active                 (credential)

  [Strengthen evidence #3 -->]
```

Each evidence item shown with its source type and specificity visible through the description itself. Item [3] is obviously weaker — the user SEES it without us scoring it. The action link targets the weakest item specifically.

**Level 3: Full Evidence Detail (hover tooltip or side panel)**
```
Evidence #1: ML pipeline at Stripe
  Type: work project
  Company: Stripe (named)
  Metrics: 2M records/day processing
  Team: 8 engineers, tech lead role
  Outcome: Reduced false positives 40%
  Duration: 2020-2023 (3 years)
  Specificity: high (6/7 signals present)
  Source: CV import + Socratic enrichment (Gate 1)
  Last verified: 2026-04-15
```

Full transparency. Every signal we extracted, how we got it, when it was last touched. User can correct anything.

### Where Each Level Appears

| Screen | Level | Why |
|--------|-------|-----|
| Application Tracker card | Level 1 | Scanning dozens of applications |
| Analysis requirement rows (collapsed) | Level 1 | Quick overview of all requirements |
| Analysis requirement rows (expanded) | Level 2 | User investigating specific skill match |
| Dashboard Cloud Summary | Level 1 (aggregate) | Bird's-eye: "47 evidence points: 22 work, 8 credential, 10 education, 7 self-declared" |
| CV Builder section header | Level 1 | Context for which evidence is being used |
| Evidence detail tooltip/panel | Level 3 | Full transparency on demand |
| [Strengthen -->] target | Level 2 → Socratic | Clicking opens Socratic for that specific evidence item |

### The "Strengthen" Action

When a user clicks [Strengthen -->] on a low-specificity evidence item, the system:
1. Identifies which signals are missing for THAT specific item
2. Opens Socratic Gate 3 (user-initiated, no limit)
3. Asks targeted question about THAT evidence: "You mention 'used Python for automation' — what were you automating? What was the scale? Who used it?"
4. Answer updates THAT specific evidence item in the Cloud
5. Display updates in real-time: "Side script" → "Automated 12 monthly reports for finance team, saving 8 hours/month"

This creates a direct feedback loop: see weakness → act → see improvement.

### Visual Design Rules

```
Level 1 line:
  Font: 12px, secondary color (muted)
  Format: "[count] [source types] — [specificity qualifier]"
  Indent: 16px from parent skill name

Level 2 items:
  Font: 12px, secondary color
  Citation numbers: [1][2][3] in accent color (emerald), clickable
  Source type: (work), (credential), (education) in parentheses, tertiary color
  Low-specificity items: slightly dimmer + [Strengthen -->] link in amber

Level 3 detail:
  Appears in: tooltip on hover OR slide-out panel on click
  Shows: all extracted signals with labels
  Editable: user can correct any field
```

### Acceptance Criteria
- [ ] Three levels designed and wireframed
- [ ] Level 1 summary line shows count + types + specificity in one line
- [ ] Level 2 shows actual evidence items with visible quality differences
- [ ] [Strengthen -->] link connects to Socratic Gate 3 for that specific item
- [ ] Level 3 shows full signal transparency with edit capability
- [ ] Works on Analysis, Tracker, Dashboard, and CV Builder screens

### Test Plan
- Mock 5 diverse skill profiles (strong/weak/mixed evidence)
- Render all 3 levels for each
- User test: can someone unfamiliar with the system tell which evidence is strong vs weak?
- If they can't → display isn't effective enough → iterate

---

## Design Problem #5: No Persona-Specific Question Paths

### Problem
A veteran with 18 years in the Air Force, a recent graduate with coursework only, and a freelancer with 50 small projects all get the same generic Socratic questions. The questions that work for a tech worker at Google are irrelevant or offensive to a career changer or military member. Without persona awareness, the Socratic engine feels robotic and one-size-fits-all.

### Constraints
- Persona detection must be automatic from CV analysis (user shouldn't self-label beyond initial onboarding)
- Personas may overlap (veteran AND career changer)
- Must not stereotype — persona informs question FRAMING, not assumptions about capability
- Question substance stays the same (extract specificity signals) — only framing changes
- Must handle unknown/ambiguous personas gracefully (default to general)

### Solution

**Step 1: Persona Detection (automatic, from CV parse)**

```typescript
interface PersonaSignals {
  employment_count: number;
  max_tenure_years: number;
  has_military_service: boolean;
  has_education_only: boolean;  // No work experience
  has_domain_shift: boolean;    // Different industries across roles
  has_timeline_gap: boolean;    // >1 year unexplained gap
  has_freelance_pattern: boolean;  // Many short engagements, varied clients
  seniority_level: 'junior' | 'mid' | 'senior' | 'executive';
  evidence_richness: 'sparse' | 'moderate' | 'rich';
}

function detectPersona(signals: PersonaSignals): PersonaType[] {
  const personas: PersonaType[] = [];

  if (signals.has_military_service) personas.push('veteran');
  if (signals.has_education_only) personas.push('recent_grad');
  if (signals.has_domain_shift) personas.push('career_changer');
  if (signals.has_timeline_gap) personas.push('returner');
  if (signals.has_freelance_pattern) personas.push('freelancer');
  if (signals.seniority_level === 'executive') personas.push('executive');
  if (signals.employment_count === 1 && signals.max_tenure_years > 10) personas.push('long_tenure');

  if (personas.length === 0) personas.push('general');
  return personas;  // Can return multiple — handled by priority merge
}
```

**Step 2: Persona-Specific Question Framing**

Each persona gets a framing layer injected into the Socratic system prompt:

### Veteran Persona
```
PERSONA CONTEXT: This user has military service experience.

FRAMING RULES:
- Ask about TYPE of work, not classified details: "Without going into sensitive details,
  what type of systems did you work with?"
- Translate military concepts proactively: rank → leadership level,
  MOS/AFSC → job specialization, deployment → high-pressure project delivery
- Security clearances are Tier 1 evidence — always ask: "Do you hold any
  active or inactive clearances?"
- Single long employer is STRENGTH (depth, commitment) — never frame as limitation
- Military certifications may be unfamiliar to civilian recruiters — ask for
  civilian equivalents or help translate
- Team structures are well-defined in military — ask about team size,
  reporting structure, span of control
- DO NOT ask about "company culture fit" or "startup experience" — irrelevant framing

QUESTION PRIORITY FOR THIS PERSONA:
1. Security clearances (high value, often omitted from CV)
2. Team/command size and scope
3. System types (unclassified description)
4. Training/certifications (military quals often map to civilian certs)
5. Measurable outcomes (missions, operations, improvements — abstracted)
```

### Recent Graduate Persona
```
PERSONA CONTEXT: This user has limited or no professional work experience.

FRAMING RULES:
- NEVER make them feel inadequate about lack of experience
- Frame questions as discovery: "Let's find the evidence you DO have"
- Prioritize in order: capstone/thesis → internships → coursework projects →
  open source → hackathons → personal projects → relevant coursework
- Academic research IS evidence: "Did you publish anything or present at conferences?"
- Group projects count: ask about their specific contribution
- Part-time/volunteer work counts: same evidence rules as paid work
- GPA: DO NOT ask. Not relevant to skill evidence.
- Frame coursework as exposure: "Which courses gave you hands-on project experience?"

QUESTION PRIORITY FOR THIS PERSONA:
1. Capstone/thesis/final project (usually the strongest evidence)
2. Internship specifics (what did YOU do, not what the company does)
3. Personal/open source projects with any traction
4. Relevant coursework with hands-on components
5. Leadership in student orgs (team/scope signals)
```

### Career Changer Persona
```
PERSONA CONTEXT: This user is transitioning between industries or roles.

FRAMING RULES:
- Previous domain experience is VALUABLE, not irrelevant
- Actively probe for transferable skills: "In your finance role, which
  technical tools did you use daily?"
- Quantitative skills transfer across domains — help user see this
- Don't ask about target domain experience (they don't have it — that's the point)
- Ask about self-directed learning: bootcamps, courses, side projects in new domain
- Frame the shift as strategic: "Your [old domain] background gives you [advantage]"
- Domain knowledge (fintech, healthcare, etc.) does NOT decay — it's cumulative

QUESTION PRIORITY FOR THIS PERSONA:
1. Technical tools used in previous role (hidden transferable skills)
2. Quantitative/analytical work (transfers broadly)
3. New domain learning: courses, bootcamps, certifications
4. Side projects or freelance in target domain
5. Transferable soft skills with evidence (led teams, managed stakeholders)
```

### Freelancer Persona
```
PERSONA CONTEXT: This user has many clients/projects rather than traditional employment.

FRAMING RULES:
- Don't ask about each of 50 projects — ask for top 3-5 by scope/challenge
- Aggregate stats are evidence: "Built 50+ client projects" is a valid data point
- Full ownership per project is STRENGTH: no "team did it" ambiguity
- Client confidentiality: "Can you name any clients, or describe the industry?"
- Revenue/business metrics are relevant: "What was the revenue or project value?"
- Testimonials/repeat clients = external validation (approaches Tier 1)
- Portfolio links = demonstrable evidence

QUESTION PRIORITY FOR THIS PERSONA:
1. Top 3-5 most complex/impactful projects (specifics)
2. Aggregate stats (total projects, total revenue, years freelancing)
3. Named clients or public portfolio
4. Repeat clients (implies quality)
5. Largest scope project (team size if any, budget, duration)
```

### Executive Persona
```
PERSONA CONTEXT: This user operates at strategic level with vague descriptions.

FRAMING RULES:
- "Led digital transformation" needs: before state, after state, budget, timeline
- Ask about SCOPE not technical details: team size, budget, org impact
- Business outcomes matter: revenue, market position, cost reduction
- Board-level visibility, cross-functional leadership = evidence
- Don't ask about individual contributions the way you would for ICs
- P&L responsibility is strong evidence of scope

QUESTION PRIORITY FOR THIS PERSONA:
1. Scope: budget managed, team size, org level impacted
2. Business outcomes: revenue, cost, market position changes
3. Before/after: what changed measurably under their leadership
4. Strategic decisions: which bets paid off, which didn't (shows judgment)
5. Recognition: board presentations, industry awards, media mentions
```

### Returner Persona
```
PERSONA CONTEXT: This user has a career gap (parenting, health, sabbatical, etc.).

FRAMING RULES:
- Gap is acknowledged but NEVER penalized or dwelt upon
- DO NOT ask why they took a break — irrelevant to skill evidence
- Ask about pre-gap experience depth (may be very strong)
- Ask about during-gap activity: freelance, volunteer, courses, self-study
- Recency rules for technical skills apply but frame constructively:
  "Your Python work was in 2021 — have you done anything with it since,
  even casually? Courses, side projects?"
- Domain knowledge doesn't decay — if they were in fintech, they still know fintech
- Soft skills don't decay — leadership, communication, stakeholder management

QUESTION PRIORITY FOR THIS PERSONA:
1. Strongest pre-gap evidence (what was your peak role/achievement?)
2. During-gap activity (any professional development?)
3. Current refreshment: recent courses, certifications, projects
4. Skills that DON'T decay: domain knowledge, leadership, communication
5. Target role alignment with pre-gap experience
```

### Long Tenure Persona
```
PERSONA CONTEXT: This user worked at one organization for 10+ years.

FRAMING RULES:
- Long tenure = depth, loyalty, institutional expertise — STRENGTH
- But may lack breadth vocabulary — help translate internal terms to market terms
- Ask about role progression WITHIN the organization (promotions, team changes)
- Internal transfers count as different experiences
- May have deep expertise that's hard to articulate — probe patiently
- Internal certifications/training programs are Tier 2 evidence
- "I did everything" is common — help them identify top 3-5 achievement areas

QUESTION PRIORITY FOR THIS PERSONA:
1. Role progression: how did your responsibilities change over 10+ years?
2. Biggest projects/initiatives you led or contributed to
3. Internal recognition: promotions, awards, special assignments
4. Skills developed across different phases of tenure
5. Scale: how did the team/org/product grow while you were there?
```

**Step 3: Multi-Persona Handling**

When user matches multiple personas (e.g., veteran + career changer):
```
1. Merge question priorities — veteran's clearance question + career changer's transferable skills
2. Use the MORE specific framing when conflicts arise (veteran framing > general)
3. Never exceed question budget — merged priorities are ranked, not added
4. Log detected personas for future refinement
```

### Acceptance Criteria
- [ ] Persona detection function implemented, tested against 20 diverse CVs
- [ ] 7 persona framing templates written and injected into Socratic system prompt
- [ ] Multi-persona merge logic handles overlapping cases
- [ ] Persona detection never stereotypes — only informs question FRAMING
- [ ] Each persona template tested against 3 real-world-style CVs of that type
- [ ] Unknown persona falls back gracefully to 'general'

### Test Plan
- 7 synthetic CVs, one per persona type, plus 3 multi-persona CVs
- Run persona detection → verify correct persona(s) assigned
- Run Socratic question generation → verify framing matches persona
- Adversarial: give a veteran CV to 'general' path and to 'veteran' path — is veteran path noticeably better?

---

## Design Problem #6: No Contradiction Detection

### Problem
User's CV says "3 years Python" but Socratic answer says "I used Python once in a course." Or CV says "Senior Developer" but answers reveal junior-level understanding. Or user claims "led a team of 20" in CV but says "I was the only developer" in Socratic. These contradictions, if undetected, store conflicting evidence in the Cloud and produce incoherent CVs.

### Constraints
- Must not accuse the user of lying — advocate framing
- Must surface contradictions to the USER for resolution, not auto-resolve
- Must distinguish between contradiction (conflicting facts) and elaboration (adding detail)
- Must handle ambiguity ("3 years" could mean continuous or cumulative)

### Solution

**Detection Layer (in answer parser):**

```typescript
interface ContradictionCheck {
  existing_evidence: EvidenceItem[];
  new_answer: string;

  // Check categories:
  // 1. Numeric contradictions: "3 years" vs "used once"
  // 2. Scope contradictions: "team of 20" vs "solo developer"
  // 3. Role contradictions: "led the project" vs "helped with"
  // 4. Timeline contradictions: "2020-2023" vs "started last year"
  // 5. Skill level contradictions: "expert" vs reveals beginner knowledge
}

// Resolution is ALWAYS user-driven:
interface ContradictionResolution {
  message: string;  // "Your CV says [X] but your answer suggests [Y]. Which should we lead with?"
  option_a: string; // Keep CV version
  option_b: string; // Use Socratic answer
  option_c: string; // "Both are true — let me explain"
}
```

**What is NOT a contradiction:**
- Elaboration: CV says "Python developer" → answer adds "specifically ML pipelines" → not contradictory, additive
- Rounding: CV says "~50 projects" → answer says "47 projects" → close enough, accept
- Different framing: CV says "managed team" → answer says "was tech lead of 8" → same thing, richer detail

**What IS a contradiction:**
- Magnitude conflict: CV says "5 years" → answer says "used it briefly in one project"
- Role conflict: CV says "led" → answer reveals "I was one of many"
- Existence conflict: CV lists a skill → answer reveals no actual experience with it

### Acceptance Criteria
- [ ] Parser prompt includes contradiction detection instructions
- [ ] Contradictions surfaced to user with compassionate framing
- [ ] User resolution stored in Cloud with audit trail
- [ ] Elaboration vs contradiction correctly distinguished (tested with 20 cases)
- [ ] No auto-resolution — always user-driven

### Test Plan
- 10 contradiction scenarios + 10 elaboration scenarios
- Parser must correctly classify: contradiction vs elaboration
- UI mock: contradiction resolution flow doesn't feel accusatory

---

## Design Problem #7: Question Quality Has No Evaluation Criteria

### Problem
How do we know a generated question is GOOD? "Tell me about your experience" is bad. "You mention Python at Stripe but list no metrics — what throughput did your services handle?" is good. Without formal criteria, we can't evaluate, can't test, and the AutoResearch loop can't optimize.

### Constraints
- Criteria must be evaluatable automatically (for AutoResearch loop)
- Must correlate with actual question effectiveness (specificity_delta)
- Must be simple enough to compute within token budget

### Solution: Question Quality Rubric (5 dimensions)

```
1. SPECIFICITY (weight: 30%)
   Does the question reference specific details from the user's profile?
   - 1: Generic ("Tell me about your experience")
   - 3: References skill name ("Tell me about your Python experience")
   - 5: References specific evidence ("You mention Python at Stripe — what scale?")

2. TARGET CLARITY (weight: 25%)
   Does the question clearly target ONE missing signal?
   - 1: Asks about everything at once
   - 3: Asks about 2-3 things
   - 5: Asks about exactly one missing signal with clear framing

3. ANSWERABILITY (weight: 20%)
   Can the user reasonably answer this in 1-3 sentences?
   - 1: Requires an essay or deep reflection
   - 3: Needs some thought but answerable
   - 5: User can answer immediately with a fact or number

4. SKIP SENSITIVITY (weight: 15%)
   Does the question acknowledge that the user might not have this data?
   - 1: Demands information ("You MUST provide metrics")
   - 3: Neutral ("What were the metrics?")
   - 5: Compassionate ("If you have any metrics — even approximate — they'd strengthen this")

5. NON-REDUNDANCY (weight: 10%)
   Does the question avoid asking what we already know?
   - 1: Asks about information already in evidence array
   - 3: Partially overlaps with known information
   - 5: Targets only unknown signals
```

### How AutoResearch Uses This

```
For each prompt variant in nightly loop:
1. Generate question for each test profile
2. Score question against rubric (LLM-as-judge, separate prompt)
3. Combine rubric score with specificity_delta from test answer
4. Final score = 0.4 * specificity_delta + 0.6 * rubric_score
5. Keep/discard based on final score vs current best
```

### The Circular Judgment Problem

Using LLM to judge LLM output IS circular (identified in karpathy-adaptation.md). Mitigation:
- Rubric score is 60% of final score, specificity_delta is 40%
- specificity_delta is NOT LLM-judged — it's a mechanical signal count
- Monthly: human reviews top 10 and bottom 10 questions to calibrate rubric
- If rubric scores don't correlate with human judgment, adjust rubric

### Acceptance Criteria
- [ ] 5-dimension rubric defined and documented
- [ ] LLM-as-judge prompt written for rubric scoring
- [ ] Rubric scores correlate with human judgment (tested on 30 questions)
- [ ] Integrated into AutoResearch final score computation
- [ ] Monthly human calibration process defined

### Test Plan
- Generate 30 questions across quality spectrum
- Human-score them on the 5 dimensions
- LLM-score them on the 5 dimensions
- Measure correlation: if <0.7 Spearman correlation, rubric needs adjustment

---

## Design Problem #8: No Quality Gate Between Socratic Output and CV Generation

### Problem
If the Socratic engine misparses an answer (stores "team of 80" when user said "team of 8"), or stores vague evidence that shouldn't be used for bullet points, the CV generation system will use this bad data. There's no checkpoint between "evidence stored in Cloud" and "evidence used in generated CV."

### Constraints
- Must not create another user interruption (they already answered Socratic questions)
- Must be automatic for high-confidence evidence
- Must flag uncertain evidence before CV generation uses it
- Must never fabricate bullet points from self-declared-only evidence (hard gate)

### Solution

```typescript
interface EvidenceUsabilityCheck {
  // Before CV generation pulls evidence, each item is checked:

  confidence: 'high' | 'medium' | 'low';
  source: 'cv_import' | 'socratic_enrichment' | 'user_manual';

  // Usability rules:
  // HIGH confidence + any source → use freely in CV bullets
  // MEDIUM confidence + cv_import → use (user wrote it themselves)
  // MEDIUM confidence + socratic → use but flag "AI-interpreted" in editor
  // LOW confidence + any source → DO NOT use in generated bullets
  //                              → store but mark as "needs verification"
  // self_declared ONLY → hard gate: no bullet generation (from credibility model)
}
```

**In CV Builder UI:**
```
Experience Section:
  > Built fraud detection pipeline, reducing false positives by 34%    [cloud-verified]
  > Led team of 8 engineers on real-time processing system             [cloud-verified]
  > Automated reporting workflows for finance team                      [needs detail]
    └ This evidence has low specificity. [Add details] or [Remove from CV]
```

### Acceptance Criteria
- [ ] Evidence usability check runs before CV generation
- [ ] Low-confidence evidence excluded from auto-generated bullets
- [ ] Self-declared-only skills never produce fabricated bullets
- [ ] "Needs detail" flag visible in CV builder for uncertain evidence
- [ ] User can override: manually keep or remove flagged items

### Test Plan
- 5 profiles with mixed evidence quality (high + low + self-declared)
- Generate CV → verify low-confidence items excluded
- Verify self-declared-only skills appear as "skills list" not fabricated bullets
- Verify user can manually add/override

---

## Design Problem #9: Fabricated Accuracy Numbers Need Real Benchmarks

### Problem
I claimed ~95% accuracy for evidence type classification, ~90% for specificity extraction, ~85% for scope signals. These numbers are fabricated — plausible but unverified. If real accuracy is 60%, our entire credibility model breaks. We need real benchmarks before launch.

### Constraints
- Must test before launch, not after (if accuracy is low, we need to know NOW)
- Must use diverse test data (not just tech resumes)
- Must test the ACTUAL prompts we'll use, not theoretical capability
- Must define minimum acceptable accuracy for each capability

### Solution: Pre-Launch Benchmark Protocol

```
Step 1: Build Test Corpus
  - 50 real-world CVs (diverse: tech, non-tech, military, academic, executive,
    freelance, career changer, recent grad)
  - For each CV: human annotates the "ground truth":
    - Which skills have which evidence types
    - Which evidence items have which specificity signals
    - What the correct tier/confidence would be
  - This corpus doubles as the AutoResearch test bank

Step 2: Run Classification
  - Run CV parser + evidence classifier against each CV
  - Compare AI output vs human ground truth
  - Compute: precision, recall, F1 for each capability

Step 3: Define Minimum Accuracy Thresholds

  | Capability | Claimed | Minimum Acceptable | Why |
  |---|---|---|---|
  | Evidence type classification | ~95% | 90% | If we misclassify work as self-declared, user loses confidence level |
  | Specificity signal extraction | ~90% | 80% | Missing a metric is annoying but not catastrophic |
  | Scope signal extraction | ~85% | 75% | Team size, scale are harder — lower bar acceptable |
  | Contradiction detection | never tested | 70% | Missing some contradictions is OK; false positives are worse |
  | Persona detection | never tested | 80% | Wrong persona = wrong question framing, but not dangerous |

Step 4: Iterate Until Thresholds Met
  - If accuracy < minimum: improve prompts, add examples, refine parsing
  - Re-test until all capabilities meet minimum thresholds
  - Document final achieved accuracy in product documentation
  - Be transparent with users: "Our AI is ~X% accurate at [capability]"
```

### Acceptance Criteria
- [ ] 50-CV test corpus built with human annotations
- [ ] Each capability benchmarked with precision/recall/F1
- [ ] All capabilities meet minimum accuracy thresholds
- [ ] Results documented with real numbers replacing fabricated ones
- [ ] Any capability below threshold has improvement plan before launch

### Test Plan
- This IS the test plan. No separate test needed.
- Timeline: must complete before user-facing launch
- Cost estimate: ~$20-30 in API costs for 50 CVs through full pipeline
- Human annotation: ~10 hours of work (12 minutes per CV)

---

## Design Problem #10: Socratic Engine Behavior During JD Analysis Is Undefined

### Problem
Gate 2 (JD Analysis) triggers 2-3 Socratic questions when a JD reveals gaps in the Cloud. But: When exactly during analysis? Before results are shown? After? Inline? In a modal? This interaction flow isn't designed. If we ask questions MID-STREAM during analysis, it interrupts the experience. If we ask AFTER, the user has already seen gaps and may not want to engage.

### Constraints
- Must not interrupt streaming analysis (the "wow" moment)
- Must feel natural, not forced
- Must only trigger when enrichment would actually change the result
- Must show the user WHY they're being asked (connect question to JD requirement)

### Solution

```
FLOW:
1. User pastes JD → clicks "Analyze"
2. Streaming analysis runs completely → user sees full results
3. At bottom of results, IF gaps exist where enrichment would help:

   ┌─────────────────────────────────────────────────────────────────┐
   │ STRENGTHEN YOUR APPLICATION                                      │
   │                                                                   │
   │ 2 requirements could improve with more evidence from you:         │
   │                                                                   │
   │ ┌─────────────────────────────────────────────────────────────┐  │
   │ │ Kubernetes (JD: Required, You: Gap)                         │  │
   │ │                                                             │  │
   │ │ You list Docker experience. Have you used Kubernetes in     │  │
   │ │ any capacity — even local development, tutorials, or        │  │
   │ │ a side project?                                             │  │
   │ │                                                             │  │
   │ │ [Type your answer...]                                       │  │
   │ │ [Skip — I have no K8s experience]                           │  │
   │ └─────────────────────────────────────────────────────────────┘  │
   │                                                                   │
   │ ┌─────────────────────────────────────────────────────────────┐  │
   │ │ Team Leadership (JD: Preferred, You: Moderate)              │  │
   │ │                                                             │  │
   │ │ You managed a team at [company]. How many people, and       │  │
   │ │ what was the team's main deliverable?                       │  │
   │ │                                                             │  │
   │ │ [Type your answer...]                                       │  │
   │ │ [Skip this question]                                        │  │
   │ └─────────────────────────────────────────────────────────────┘  │
   │                                                                   │
   │ [Skip all — generate CV with current evidence]                    │
   └─────────────────────────────────────────────────────────────────┘

4. User answers (or skips) → Cloud updates → analysis result updates live
5. User sees updated result: "Kubernetes: Gap → Related (Docker + K8s tutorial)"
```

### Why AFTER, Not During
- Streaming analysis is the product showcase — don't interrupt it
- User needs to SEE the gaps to understand WHY they're being asked
- The question cards feel like helpful coaching AFTER seeing results, not interrogation BEFORE

### Real-Time Update After Answer
- User answers Kubernetes question → parser extracts evidence → Cloud updates
- Analysis result re-evaluates → "Gap" changes to "Related" with bridge strategy
- Animated transition: gap row fades from amber to sky-blue
- User SEES the impact of their answer immediately — powerful feedback loop

### Acceptance Criteria
- [ ] Gate 2 questions appear AFTER streaming analysis completes
- [ ] Questions reference specific JD requirements (not generic)
- [ ] Answer → Cloud update → analysis re-evaluation → visual update in real-time
- [ ] "Skip all" option always available
- [ ] Maximum 3 questions per analysis (threshold system enforces)
- [ ] If all requirements are Strong, no questions shown (system is quiet)

### Test Plan
- Profile with 3 gaps against JD → verify 2-3 questions appear
- Profile with no gaps → verify no questions appear
- Answer a question → verify analysis result updates in real-time
- Skip all → verify CV generation proceeds with current evidence

---

## Design Problem #11: What Happens When User Says "I Don't Have Metrics"

### Problem
The spec has a button: [I don't have metrics for this]. But what does the system DO? If the user genuinely has no metrics (common in support roles, creative roles, management without P&L), the Socratic engine shouldn't keep pushing. It needs an alternative path to build evidence depth without quantification.

### Constraints
- Many legitimate roles produce no hard metrics (HR, legal, design, support, admin)
- "I don't have metrics" is NOT the same as "I refuse to answer"
- User shouldn't feel punished for not having numbers
- Evidence must still be distinguishable from self-declared

### Solution: Alternative Evidence Paths

```
When user clicks [I don't have metrics]:

System response:
"No problem — not every role produces numbers. Let me ask differently:

Instead of metrics, can you describe:
• The SCOPE: How many people/systems/projects were involved?
• The OUTCOME: What changed because of your work? (even qualitative)
• The RECOGNITION: Did anyone notice? Feedback, promotion, repeat engagement?

[Type your answer...]
[Skip — I'd rather not elaborate on this one]"
```

This pivots from `has_metrics` to `has_team_scope` + `has_outcome` + recognition signals. The evidence won't be as specific as "40% cost reduction" but "Redesigned onboarding flow, team adopted it company-wide, manager cited it in my promotion review" is still strong Tier 2 evidence.

### Specificity Without Numbers

```
QUANTITATIVE EVIDENCE:
  "Reduced false positives by 34%"
  → has_metrics: true, specificity: high

QUALITATIVE BUT SPECIFIC EVIDENCE:
  "Redesigned the onboarding flow for 200 new hires annually.
   HR director said it cut ramp-up time from weeks to days.
   Adopted across all 3 regional offices."
  → has_metrics: false, but has_scope: true, has_outcome: true
  → specificity: medium-high (not LOW just because no numbers)

STILL VAGUE:
  "I did onboarding stuff"
  → has_metrics: false, has_scope: false, has_outcome: false
  → specificity: low
```

### Updated Specificity Calculation

```
specificity_level calculation:
  signal_count = count of TRUE signals in EvidenceQualitySignals

  'high':   signal_count >= 5, OR (has_metrics AND has_outcome)
  'medium': signal_count >= 3, OR (has_outcome AND (has_scope OR has_company))
  'low':    signal_count < 3 AND NOT has_outcome

  Key insight: has_outcome is the most important single signal.
  "What changed?" is always answerable, even without numbers.
```

### Acceptance Criteria
- [ ] "I don't have metrics" triggers alternative evidence path, not dead end
- [ ] Alternative path extracts scope, outcome, and recognition signals
- [ ] Specificity calculation doesn't penalize absence of metrics alone
- [ ] Qualitative-but-specific evidence reaches 'medium' specificity, not 'low'
- [ ] Roles without natural metrics (HR, design, support) can reach 'Strong' confidence

### Test Plan
- 5 profiles in non-quantitative roles (HR, designer, support, admin, legal)
- Run through Socratic with "no metrics" path
- Verify: can they reach 'Strong' confidence without any numbers?
- If not → specificity calculation is biased toward technical roles → fix it

---

## Design Problem #12: How the Socratic Engine Gets Quieter Over Time

### Problem
Spec section 4.2 says "the system gets quieter as it gets smarter" with a progression from 5-8 questions (app #1) to 0 questions (app #15+). But the actual mechanism isn't implemented. How does the engine know it has "enough" for a given application? What prevents it from asking the same types of questions repeatedly across applications?

### Constraints
- Must respect user time — question fatigue is real
- Must still ask when genuinely new gaps appear
- Must never ask about evidence already in the Cloud
- Must distinguish "Cloud has this skill" from "Cloud has this skill WITH DEPTH"

### Solution: Cloud Completeness Score Per Skill

```typescript
function skillCompleteness(skill: SkillNode): number {
  const signals = skill.evidence.flatMap(e => e.quality_signals);

  // Each evidence item can contribute signals
  // A skill is "complete" when it has sufficient breadth AND depth

  let score = 0;

  // Breadth: at least 2 evidence items from different sources
  const sourceTypes = new Set(skill.evidence.map(e => e.type));
  if (sourceTypes.size >= 2) score += 30;
  else if (sourceTypes.size === 1 && !sourceTypes.has('self_declared')) score += 15;

  // Depth: highest specificity item has strong signals
  const bestSpecificity = Math.max(...skill.evidence.map(e => countSignals(e)));
  score += Math.min(bestSpecificity * 10, 50); // max 50 from depth

  // Recency: last used within 3 years for technical skills
  if (skill.last_used && isWithinYears(skill.last_used, 3)) score += 20;
  else if (skill.last_used && isWithinYears(skill.last_used, 5)) score += 10;

  return Math.min(score, 100);
}

// Application-level completeness
function applicationReadiness(cloud: Cloud, jd: ParsedJD): {
  ready: boolean;
  gaps: SkillGap[];
  questions_needed: number;
} {
  const requirements = jd.required_skills;
  const gaps = requirements
    .map(req => matchToCloud(req, cloud))
    .filter(match => match.completeness < 60 || match.strength === 'gap');

  return {
    ready: gaps.length === 0,
    gaps: gaps,
    questions_needed: Math.min(gaps.length, 3) // never more than 3 per analysis
  };
}
```

### The Quieting Mechanism

```
Application #1: Cloud is empty
  → 12 skills from JD, 10 have completeness < 60
  → 5-8 questions (Gate 1: onboarding) fill the biggest gaps
  → After onboarding: 6 skills now at completeness > 60

Application #3: Cloud has core skills evidenced
  → Same domain as before? Most skills already at > 60
  → Only 1-2 NEW requirements trigger questions
  → Questions are about NEW gaps only

Application #8: Cloud is rich for this role type
  → Maybe 1 niche skill is new (e.g., "Terraform" when user knows AWS)
  → 0-1 questions
  → System message: "Your Cloud already covers this role well."

Application #15: Domain fully mapped
  → "No questions needed. Your evidence covers all requirements."
  → BUT: if user applies to a completely new domain (finance dev → ML engineer)
    → New gaps appear → questions resume for new domain only

Application #30: Cross-domain Cloud is rich
  → Only asks if JD has genuinely novel requirement never seen before
  → Rare. The Cloud is mature.
```

### What Prevents Repeat Questions

```typescript
// enrichment_dialogues table tracks ALL questions ever asked
// Before generating a new question:

function shouldAskAbout(skill: string, signal: string, history: DialogueHistory): boolean {
  const previousAttempts = history.filter(
    h => h.skill === skill && h.target_signal === signal
  );

  if (previousAttempts.length === 0) return true;  // Never asked

  // Already asked and user ANSWERED → don't ask again
  if (previousAttempts.some(a => !a.skipped)) return false;

  // Already asked and user SKIPPED → only ask again if:
  //   - Different JD context (maybe they didn't see relevance before)
  //   - At least 30 days since last skip
  //   - Maximum 2 total attempts ever (then accept the user doesn't want to answer)
  const lastSkip = previousAttempts[previousAttempts.length - 1];
  const daysSinceSkip = daysBetween(lastSkip.date, now());

  return daysSinceSkip > 30 && previousAttempts.length < 2;
}
```

### Acceptance Criteria
- [ ] skillCompleteness() computation implemented
- [ ] Application readiness check determines question count
- [ ] Question count decreases with Cloud maturity (tested across 10 sequential analyses)
- [ ] Repeat question prevention works (same question never asked more than 2x)
- [ ] Novel domain shift correctly triggers new questions
- [ ] User can always skip — system works with incomplete Cloud

### Test Plan
- Simulate 15 sequential applications for one user profile
- Measure questions asked per application → must show declining trend
- Application #1: 5-8 questions. Application #10+: 0-1 questions.
- Domain shift at application #12: questions should spike for new domain only

---

## Implementation Priority

| Problem | Priority | Blocks | Phase |
|---------|----------|--------|-------|
| #1 System Prompt | P0 | Everything | Build |
| #2 Answer Parser | P0 | Evidence quality | Build |
| #4 Evidence Display | P0 | UI effectiveness | Build + Wireframe |
| #9 Accuracy Benchmarks | P0 | Launch confidence | Pre-launch |
| #3 AutoResearch Metric | P1 | Self-improvement | Post-launch week 1 |
| #5 Persona Paths | P1 | User experience quality | Build |
| #7 Question Quality Rubric | P1 | AutoResearch effectiveness | Post-launch week 1 |
| #10 JD Analysis Flow | P1 | Analysis screen UX | Build |
| #11 No-Metrics Path | P1 | Non-technical user support | Build |
| #12 Quieting Mechanism | P1 | User experience over time | Build |
| #6 Contradiction Detection | P2 | Edge case handling | Post-MVP |
| #8 CV Generation Gate | P2 | Output quality | Post-MVP |

---

## Relationship to AutoResearch Loop

The Socratic engine is the FOURTH prompt in the AutoResearch optimization system:

```
AutoResearch Loop (Nightly, 2 AM UTC):

  Prompt 1: cv-generation.ts
    Metric: edit distance vs human-verified ideal

  Prompt 2: jd-parser.ts
    Metric: parsing accuracy vs manual parse

  Prompt 3: insights.ts
    Metric: user engagement with generated insights

  Prompt 4: socratic.ts            ← THIS DOCUMENT
    Metric: specificity_delta per question (Design Problem #3)
    Quality: question rubric score (Design Problem #7)

  Prompt 5: socratic-parser.ts     ← NEW (identified in this document)
    Metric: parsing precision/recall vs human-annotated answers
```

The compound effect:
```
Better socratic.ts prompts
  → Better questions asked
  → Richer evidence extracted (better socratic-parser.ts)
  → Higher specificity in Cloud
  → Better CV generation (cv-generation.ts has richer input)
  → Higher callback rate
  → Outcome data validates the entire chain
  → AutoResearch improves ALL prompts simultaneously
  → COMPOUND IMPROVEMENT — this is the moat
```
