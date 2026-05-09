# Socratic Model Selection — Independent Audit

> Auditing the dynamic model selection design for the Socratic engine.
> Date: May 4, 2026

---

## THE DESIGN UNDER AUDIT

Dynamic model selection based on 3 signals:
1. Gap novelty (seen before? skip)
2. Bridge difficulty (short = Haiku, long = Sonnet)
3. Answer complexity (option = $0, short text = Haiku, long text = Sonnet)

Plus: Cloud maturity determines baseline (young = Sonnet-heavy, mature = Haiku-heavy).

---

## FINDING 1: THE CLASSIFIER BOOTSTRAP PROBLEM

**Severity: CRITICAL**

The design says: "simple gap = Haiku, complex gap = Sonnet." But WHO decides if a gap is simple or complex? That classification itself requires intelligence.

Example: JD says "Experience with airworthiness certification." Cloud has "airworthiness" mentioned in AEW&C role bullets. Is this:
- Simple match? (Haiku: "You have airworthiness experience from AEW&C — confirm?")
- Complex bridge? (Sonnet: "Your airworthiness was military DGCA, this JD implies EASA Part 21 — different regulatory framework. Do you have civilian airworthiness exposure?")

Haiku would call this a simple match. Sonnet would catch the regulatory distinction. **If Haiku classifies gaps, it will misclassify complex ones as simple — and you'll never know.**

**Fix options:**
- (A) Always use Sonnet for gap CLASSIFICATION, Haiku only for question delivery and simple answer parsing. Classification is ~200 tokens, cheap even with Sonnet.
- (B) Rule-based pre-classifier: domain match (same industry = simple, different industry = complex), seniority jump (same level = simple, 2+ levels = complex), keyword overlap ratio (>70% = simple, <40% = complex). Then Sonnet only for the gray zone (40-70%).
- (C) Always Sonnet for first 3 JDs per domain niche. After that, pattern established, use rules.

**Recommendation: (B) with (C) as fallback.** Rule-based handles 70% of cases. Sonnet for gray zone and new domains.

---

## FINDING 2: WORD COUNT IS A BAD PROXY FOR COMPLEXITY

**Severity: HIGH**

The design uses 50 words as the Haiku/Sonnet boundary for answer parsing.

Counter-examples:
- 60 words, SIMPLE: "I worked at PAC Kamra from Oct 2008 to Oct 2013 as a System Design Engineer. Main work was avionics sub-system development for JF-17 and glass cockpit modification of Super Mushshak trainer aircraft. Also involved in flight testing. Team was about 14 engineers."
- 30 words, COMPLEX: "Did both PMO and field engineering overlapping, plus consulting for CADI on the side during leave periods, and some NUTECH work started before the PMO ended."

The second answer is shorter but has overlapping timelines, moonlighting, and ambiguous role boundaries. Haiku would struggle. Word count doesn't capture this.

**Fix:** Replace word count with structural complexity signals:
- Multiple date references in one answer → Sonnet
- Words like "overlapping", "at the same time", "while also", "on the side" → Sonnet
- Multiple organization names → Sonnet
- Single role confirmation → Haiku
- Date correction only → Haiku

This is a cheap regex pre-scan on the answer text before choosing the model. No API needed.

---

## FINDING 3: HAIKU FAILURE IS SILENT

**Severity: HIGH**

If Haiku parses "jun 2021 to sept 2022" as "Jun 2021 to Sep 2023" (misread), bad data enters the Cloud with no validation. The user never sees "here's what I understood" before it's committed.

In our test, Opus parsed your answers correctly. But Haiku has known issues with:
- Ambiguous date formats (12/01 = Dec 1 or Jan 12?)
- Implied dates ("then I moved there" — when?)
- Typo-heavy input (your actual typing style)

**Fix:** After ANY LLM-parsed answer, show a confirmation card:

```
"Here's what I understood:
  Role: Senior Engineering Officer, Crotale SHORAD
  Dates: Jun 2021 — Sep 2022
  Organization: PAF Field Unit

  Is this correct? [Yes] [Edit]"
```

This adds 1 click per parsed answer but prevents bad data from entering Cloud. No extra API cost — just a UI step.

**This is non-negotiable.** The whole system's value is accuracy. One wrong date corrupts every CV generated from that Cloud.

---

## FINDING 4: QUESTION COUNT ISN'T BOUNDED PER PERSONA

**Severity: MEDIUM**

The test generated 6 questions for a 16-year military career with 5 conflicting CVs. But the design doesn't cap questions per persona:

| Persona | Expected conflicts | Expected questions |
|---|---|---|
| Early career (1-2 years) | 0-1 | 0-1 |
| Mid career (5-15 years) | 2-4 | 2-3 |
| Senior (15+ years) | 5-12 | 4-6 |
| Executive (20+ years) | 8-15 | Could be 10+! |
| Career changer | Special — intentional differences, not conflicts | 1-2 |
| Freelancer | Every client looks like a "conflict" | FALSE POSITIVES |

An executive with 20+ years and 5 CVs could trigger 15+ conflicts and 10+ questions. That's not "30 seconds" — that's an interrogation. Users will abandon onboarding.

**Fix:** Hard cap of 6 questions per onboarding. Prioritize by:
1. CRITICAL conflicts first (collapsed roles, employer pattern)
2. IMPORTANT conflicts next (date/title mismatches)
3. MINOR conflicts — auto-resolve with best guess, flag for later correction in profile settings

If there are 12 conflicts but only 6 question slots: group related conflicts into combo questions (already done in our test — Q4 combined China + AEW&C dates, Q5 combined all title mismatches). If still over 6, defer remaining to "Profile Review" section in dashboard.

---

## FINDING 5: FREELANCER/CONSULTANT PERSONA = FALSE POSITIVE STORM

**Severity: MEDIUM**

The conflict detection algorithm flags:
- Different companies across CVs → employer pattern conflict
- Different titles across CVs → title mismatch
- Overlapping dates → collapsed role

For a freelancer with 3 concurrent clients, different project titles per client, and overlapping timelines — EVERY role triggers a false positive. The system would generate 15 questions asking "were these the same job?" when the answer is obviously "no, I'm a freelancer."

**Fix:** Persona-aware conflict detection:
- If persona = freelancer or consultant: DISABLE employer pattern detection, DISABLE collapsed role detection for overlapping dates, ONLY flag date conflicts within the same client
- If persona = military: ENABLE employer pattern (high signal)
- If persona = career_changer: DISABLE title mismatch for different-era CVs (intentional reframing)

The persona is selected in Step 1 of onboarding, BEFORE CV upload. Use it.

---

## FINDING 6: "SEEN BEFORE" SKIP LOGIC NEEDS TIME DECAY

**Severity: MEDIUM**

The design says: if Cloud already has an answer for this gap type, skip the question. But:

- User said "no Kubernetes experience" 4 months ago. They just completed a K8s course. System skips the question → stale Cloud.
- User said "no management experience" but just got promoted to team lead. System skips → missed upgrade.

**Fix:** Time decay on skip decisions:
- Evidence < 30 days old → skip confidently
- Evidence 30-90 days old → skip but note "Based on your previous answer from [date]..." with an [Update] button on the analysis page
- Evidence > 90 days old → ask again (skills change, especially for active job seekers)

Also: if the user UPDATES their CV or uploads a new one, invalidate all skip decisions and re-detect conflicts.

---

## FINDING 7: FIRST JD IS THE MOST IMPORTANT — ALWAYS SONNET

**Severity: MEDIUM**

After onboarding, the user's first JD analysis is their first impression of the product's intelligence. If Haiku generates a weak question like "Do you have Python experience?" when the real gap is a nuanced domain mismatch, the user thinks the product is dumb.

**Fix:** First 3 JDs per user = always Sonnet for gap analysis and question generation, regardless of Cloud maturity. After 3 JDs, switch to dynamic selection. Cost: ~$0.06-0.10 extra per user, one-time. Worth it for retention.

---

## FINDING 8: DYNAMIC UI FOR UNKNOWN ROLE COUNT

**Severity: LOW-MEDIUM**

When we detect a collapsed role ("2020-2023 looks like multiple roles"), we don't know if it's 2, 3, or 4 roles. The UI currently shows one free-text box. Your answer revealed 4 roles in one paragraph.

Better UI for collapsed role resolution:

```
"This 3-year period might contain multiple roles."

Role 1: [Title field] [Start month] [End month] [Org field]
Role 2: [Title field] [Start month] [End month] [Org field]
[+ Add another role]

Brief description of responsibilities:
[Text area per role]
```

This gives structured data (no LLM parsing needed for dates/titles) while still allowing the free-text richness for responsibilities (LLM parses only the descriptions).

**Impact:** Reduces Sonnet dependency for the most expensive parsing task (collapsed roles).

---

## FINDING 9: NO CONTRADICTORY ANSWER DETECTION

**Severity: LOW**

User answers Q1: "Yes, all PAF — single employer." Then in Q2's free text mentions "I also did some consulting for Boeing during my China posting." These contradict. The system has no cross-answer validation.

**Fix:** After all questions answered, one validation pass:
- Extract entities/claims from all answers
- Check for contradictions (multiple employers after claiming single employer, overlapping dates, etc.)
- If found: one follow-up question — "You mentioned all PAF, but also Boeing consulting. Can you clarify?"

Cost: 1 additional Haiku/Sonnet call at end. Only triggered if contradiction detected.

---

## FINDING 10: MISSING — WHAT HAPPENS WHEN CLOUD IS WRONG?

**Severity: LOW**

The design covers: onboarding → Cloud built → JD Socratic. But what if the user looks at their Cloud and sees wrong data? A date is off, a title was misheard, a role is missing.

Currently no path for: "User manually corrects Cloud" → "System learns from correction."

**Fix:** Profile editor in dashboard with:
- Edit any role (title, dates, org, bullets)
- Add missing role
- Merge duplicate roles
- Each edit = Cloud version increment (vN+1)
- Corrections feed back into conflict resolution learning (if the system got this wrong, why? Was it a parsing error or a Socratic question failure?)

This is Phase 2 feature work, but the data model needs to support it from day 1 (Cloud versioning is already designed).

---

## SUMMARY

| # | Finding | Severity | Fix complexity |
|---|---------|----------|----------------|
| 1 | Classifier bootstrap — can't use Haiku to decide if Haiku is enough | CRITICAL | Medium — rule-based pre-classifier |
| 2 | Word count ≠ complexity | HIGH | Low — regex pre-scan for structural signals |
| 3 | Haiku parsing failures are silent | HIGH | Low — confirmation card UI |
| 4 | Question count unbounded per persona | MEDIUM | Low — hard cap + priority grouping |
| 5 | Freelancer persona = false positive storm | MEDIUM | Medium — persona-aware detection |
| 6 | "Seen before" skip needs time decay | MEDIUM | Low — timestamp + 90-day rule |
| 7 | First JD should always be Sonnet | MEDIUM | Trivial — flag in user record |
| 8 | Dynamic UI for unknown role count | LOW-MED | Medium — structured sub-fields |
| 9 | No cross-answer contradiction detection | LOW | Low — one validation pass |
| 10 | No Cloud manual correction path | LOW | Designed but not built |

---

## REVISED DESIGN (incorporating fixes)

### Model Selection — Final

```
QUESTION GENERATION:
  Onboarding conflict detection    → Pure logic ($0)
  Onboarding question wording      → Templates ($0)
  JD gap classification            → Rule-based pre-classifier ($0)
    If gray zone (40-70% overlap)  → Sonnet classifies ($0.005)
  JD gap — simple                  → Template question ($0)
  JD gap — complex                 → Sonnet generates ($0.02)
  JD gap — seen <90 days ago       → Skip ($0)
  First 3 JDs per user             → Always Sonnet ($0.02)

ANSWER PARSING:
  User picked option               → No API ($0)
  User typed, no structural complexity signals → Haiku ($0.002)
  User typed, structural complexity detected   → Sonnet ($0.02)
  Structured sub-fields (date pickers, etc.)   → No API ($0)

  ALWAYS: Show confirmation card after LLM parsing.

VALIDATION:
  After all answers: cross-answer contradiction check
    No contradictions → proceed ($0)
    Contradictions    → 1 follow-up question (Sonnet, $0.02)

CONSTRAINTS:
  Max 6 Phase 1 questions per onboarding
  Persona-aware conflict detection (freelancer ≠ military)
  First 3 JDs = Sonnet regardless of Cloud maturity
  Skip decisions expire after 90 days
```

### Cost Profile — Final (revised)

```
Onboarding (5 CVs, complex career):  $0.04-0.10
Onboarding (1 CV, simple career):    $0.00-0.02
First 3 JDs:                         $0.02-0.06 each
JDs 4-20 (same domain):              $0.002-0.02 each
Domain pivot JD:                     $0.02-0.06
Mature Cloud, familiar niche:        $0.002-0.005
```
