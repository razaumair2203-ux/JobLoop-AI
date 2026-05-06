# Two-Phase Socratic Engine — Design Specification

> Date: May 4, 2026
> Status: DESIGN — validated against real CV test data
> Key insight: Conflict resolution and evidence enrichment are DIFFERENT problems needing different intelligence levels

---

## Why Two Phases?

Testing against real Alpha CVs revealed:
1. **SE CV** shows 5 entries but ground truth has 10 roles (5 collapsed, 1 hidden)
2. **PM CV** shows 4-5 entries with different titles for the same roles
3. **Date formats** vary wildly: `(2020-23)`, `(2018-20)`, `(2016-17)`, `(2008-13)`
4. **Multi-column PDF** interleaves sections — education, certs, experience all mixed

Even Haiku will parse 5 roles from this, not 10. The gap between "what parser extracts" and "what's real" needs TWO kinds of questions:
- **Structural questions** (cheap, formulaic): "Is this 1 role or 3?" — any model can ask this
- **Enrichment questions** (intelligent, persona-aware): "What made your Crotale posting transferable?" — needs understanding of the user's career narrative

---

## Phase 1: CONFLICT RESOLUTION (Haiku — $0.002/call)

### When it runs
- AFTER CV parsing, BEFORE Cloud building
- Triggered automatically when parser detects issues
- 2-3 API calls maximum (fast, cheap, blocking)

### What it detects (from parsed CV data, not raw text)

| Signal | Detection Logic | Question Template |
|---|---|---|
| **Collapsed role** | Duration > 36 months AND bullets span 2+ domains | "Your {title} role (2020-2023) spans {N} years and mentions both {domain_a} and {domain_b}. Were these the same posting or different assignments?" |
| **Timeline gap** | Gap > 6 months between consecutive roles | "There's a {N}-month gap between your {role_a} (ended {date}) and {role_b} (started {date}). What were you doing during {gap_start} - {gap_end}?" |
| **Date conflict** | Same role across CVs has dates differing by > 12 months | "Your {role} shows as {date_a} on one CV and {date_b} on another. Which is correct?" |
| **Title mismatch** | Same date range, same company, different titles across CVs | "This role appears as '{title_a}' and '{title_b}' across your CVs. Which title best represents what you did?" |
| **Suspiciously vague** | Role has < 2 bullets AND duration > 24 months | "Your {title} at {company} ({dates}) has limited detail. Can you describe 2-3 key things you did?" |

### UX Pattern
- Structured UI cards (NOT chatbot)
- User selects from options or types short answer
- Each card has: question, context snippet, 2-3 quick-answer buttons + free text
- Skip button available (marks as "unresolved" — Cloud still builds, just with uncertainty)

### Cost
- 1 Haiku call to generate all conflict questions from parsed data: ~$0.002
- User answers are processed locally (simple mapping) — NO API call needed
- Total Phase 1 cost: $0.002 (one call)

### Output
- Corrected role timeline (roles split, gaps filled, dates resolved)
- Feeds into Cloud builder as "Socratic-corrected" profile
- Each correction tagged with source: "user_confirmed" evidence type

---

## Phase 2: EVIDENCE ENRICHMENT (Sonnet — $0.01/call)

### When it runs
- AFTER Cloud is built (so we know what domains, what depth)
- Triggered on onboarding Step 4 (Socratic Questions step)
- 1-3 API calls maximum (intelligent, persona-aware)

### What it asks (from Cloud analysis, not parsed CV)

| Enrichment Type | Detection Logic | Question Template |
|---|---|---|
| **Missing impact** | Role has team_size > 10 but no metrics_mentioned | "You managed {N} people at {company}. What measurable outcomes did your team achieve? (e.g., cost savings, reliability %, delivery timeline)" |
| **Program depth** | Program mentioned in 2+ roles but no quantified impact | "You worked on {program} across {N} roles over {years} years. What was the program's scale and your biggest contribution?" |
| **Certification context** | Has gold cert (PMP, PE) in non-obvious domain | "You hold {cert} which is typically used in {typical_domain}. How did you apply this in your {actual_domain} work?" |
| **Career transition** | Domain shift detected (defense → academic, engineering → management) | "You transitioned from {domain_a} to {domain_b} around {year}. What skills from {domain_a} do you find most valuable in your current work?" |
| **Hidden depth** | Skill appears in 3+ roles but always in supporting context | "You've used {skill} across {N} roles but always alongside other skills. Would you say {skill} is something you could lead independently?" |

### Persona-Aware Question Selection
- **military**: Emphasize transferable skills, reframe field postings
- **senior/executive**: Focus on strategic impact, program scale, team leadership
- **career_changer**: Focus on bridge skills, transferable competencies
- **early_career**: Focus on project depth, academic-to-professional translation
- 3-5 questions max (research-backed: CAT adaptive testing shows 50% fewer Qs needed)

### UX Pattern
- Conversational cards with evidence previews
- "Here's what I found in your CV: [evidence]. Tell me more about..."
- Rich text input (not just buttons) — user provides narrative
- Each answer enriches Cloud nodes with new evidence

### Cost
- 1 Sonnet call to generate persona-aware questions from Cloud data: ~$0.01
- 1-2 Sonnet calls to parse user's free-text answers into structured evidence: ~$0.01 each
- Total Phase 2 cost: $0.02-0.03

### Output
- New evidence entries added to Cloud nodes
- Cloud version incremented (vN → vN+1)
- Future CV generation uses enriched Cloud automatically

---

## Full Flow

```
CV Upload → Text Extraction → Haiku Parser → Parsed CV
                                                  ↓
                                    Phase 1: Conflict Resolution
                                    (Haiku, $0.002, structural Qs)
                                                  ↓
                                    User confirms/corrects
                                                  ↓
                                    Corrected Timeline
                                                  ↓
                                    Cloud Building
                                    (classifyCloud, anchor points)
                                                  ↓
                                    Phase 2: Evidence Enrichment
                                    (Sonnet, $0.02, intelligent Qs)
                                                  ↓
                                    User provides depth
                                                  ↓
                                    Enriched Cloud v2
                                                  ↓
                                    Visualization + JD Matching
```

---

## Cost Per User (Total Onboarding)

| Step | Model | Cost |
|---|---|---|
| CV Parse (per CV, 1-5 CVs) | Haiku | $0.002-0.010 |
| Phase 1: Conflict Resolution | Haiku | $0.002 |
| Cloud Building | Local (no API) | $0.000 |
| Phase 2: Evidence Enrichment | Sonnet | $0.020-0.030 |
| **Total Onboarding** | | **$0.024-0.042** |

At $19/month pricing with 69% margins: onboarding cost is ~0.5% of first month revenue. Negligible.

---

## What This Solves from the Ground Truth Test

| Problem | Phase | How |
|---|---|---|
| 5 CV roles → 10 actual roles | Phase 1 | Collapsed role detection + user confirmation |
| Hidden Crotale posting (21-month gap) | Phase 1 | Timeline gap detection |
| Different dates across CVs (2016-17 vs 2016-18) | Phase 1 | Date conflict resolution |
| Different titles across CVs | Phase 1 | Title mismatch resolution |
| $1.27M impact buried in bullet | Phase 2 | Missing impact enrichment |
| PMP+PMI-ACP in defense context | Phase 2 | Certification context enrichment |
| 80-person team not linked to outcomes | Phase 2 | Team scale → outcome enrichment |
| Defense→Academic career pivot | Phase 2 | Career transition enrichment |

---

## Implementation Notes

- Phase 1 questions are DETERMINISTIC — generated from parsed data patterns, no AI creativity needed
- Phase 2 questions need AI intelligence — persona awareness, domain knowledge, question quality
- Both phases use the same UI component (SocraticCard) but with different interaction patterns
- Phase 1 is BLOCKING (must complete before Cloud builds) — presented during onboarding Step 3
- Phase 2 is OPTIONAL (Cloud already exists) — presented during onboarding Step 4
- Skip is always available — Cloud builds with whatever data exists, just marks gaps as "unresolved"
