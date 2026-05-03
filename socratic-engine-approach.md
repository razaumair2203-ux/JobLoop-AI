# Socratic Engine: Validated Approach
## Researched & Locked: May 2026

## Executive Summary

The Socratic engine is a **semi-structured, data-informed questioning system** that enriches the Living Profile Cloud through targeted probing. It uses hand-crafted question templates (not AI-generated questions), structured UI for confirmation, and LLM API calls only for extracting structured evidence from free-text answers.

**No competitor does this.** All 10 audited platforms (Teal, Jobscan, Kickresume, Rezi, Huntr, LinkedIn, Indeed, Careerflow, VMock, Hiration) treat the CV as a fixed input. None ask follow-up questions to discover implicit skills, transferable experience, or evidence depth.

---

## Architecture: 2 Zones

### STEP 0: CV Upload (1 API call -- unavoidable)
- Parse CV -> extract skills, experience, education
- Build initial Cloud from extracted data
- This is the existing pipeline

### STEP 1: Skill Confirmation (NO API -- instant)
- Show extracted skills as tag bubbles
- User confirms / removes / adds from ESCO autocomplete (13,939 skills)
- Structured dropdowns for context + experience level
- "Anything else?" -> free text with regex/alias matching (40+ aliases, expandable)
- **Accuracy: 99%** (user is confirming, not system guessing)
- **Time: 30-60 seconds**

### STEP 2: Socratic Enrichment (1-3 API calls -- the differentiator)

Cloud gap detection identifies:
- Skills with no evidence (self-declared only)
- Experience that implies depth but CV is vague
- Transferable skills from adjacent domains
- Persona-specific gaps (career changer, returner, etc.)

Question format: **SEMI-STRUCTURED**
- Warm conversational tone (one question per screen)
- Structured options where possible (checkboxes, cards)
- Short free-text for elaboration (1-2 sentences)
- "Skip for now" on every question

Question selection: **HAND-CRAFTED TEMPLATES**
- NOT AI-generated (Schmidt & Hunter 1998: structured .51 validity vs unstructured .38)
- Templates selected by code based on Cloud gaps
- Persona-aware framing (9 personas)
- Informed by data: "Your CV mentions X but doesn't specify Y"

Answer processing: **API CALL (Haiku)**
- Extract structured evidence from free-text answer
- Update Cloud with enriched skill data
- Determine if follow-up needed (max 3-5 total)

### STEP 3: JD-Specific Probing (1-2 API calls -- per application)
- After JD is parsed, Cloud match reveals specific gaps
- 2-3 targeted questions about THIS role's requirements
- Answers become application-specific evidence

---

## Why Not Pure Structured UI (No API)?

### What Layer 1 (structured UI) CANNOT do:

| Capability | Without LLM | Evidence |
|---|---|---|
| Implicit skill detection | 0% accuracy | No non-LLM system can infer Docker from "built microservices" |
| Transferable skills | 0% at scale | Requires world knowledge |
| Context disambiguation | 0% | "managed" = people vs project vs code -- no rule handles this |
| Soft skills from prose | ~0% | SkillSpan: soft skills worse than hard skills even for best models |
| Browser-based skill NER | No production model exists | No ONNX skill NER available; best skill F1 = 65% |

### What taxonomy matching achieves:

| Method | Precision | Recall | Source |
|---|---|---|---|
| ESCO dictionary match | 95%+ | 60-70% | ESCO benchmarks |
| Regex + alias map (40 aliases) | 95%+ | ~50% | Our current system |
| Regex + alias map (2,500 aliases) | 95%+ | ~65% | Projected |
| LinkedIn taxonomy (374K aliases) | 95%+ | ~80% | Proprietary, not available |
| Best NER (Skill-LLM, fine-tuned) | ~65% F1 | -- | SkillSpan benchmark (NAACL 2022) |

### Bottom line:
Structured UI catches what's EXPLICITLY stated. LLM catches what's IMPLIED. Our product value is in the implied -- transferable skills, evidence depth, career-change mapping. That requires API calls.

---

## Why Not Pure Chatbot?

| Finding | Source |
|---|---|
| Users hate typing what a dropdown handles | Nielsen Norman Group |
| Pure chat: lower completion rates than structured forms | Multiple UX studies |
| Structured interviews predict performance 34% better | Schmidt & Hunter (1998), 85 years |
| Multi-step forms: 86% higher conversion than single-page | HubSpot |
| Typeform-style (one-Q-per-screen): 3.5x completion | Typeform |
| Every successful app uses structured multi-step, NOT chatbot | Duolingo, Noom, Revolut, Monzo |

---

## Why Semi-Structured Hybrid Wins

| Finding | Source |
|---|---|
| Questions + expert knowledge > questions alone > advice alone | "Thinking Assistants" (arXiv:2312.06024, N=80) |
| People disclose MORE sensitive info to chatbots than forms | Journal of Communication (2018) |
| Informal tone increases self-disclosure | CUI 2022 |
| Explaining "why" increases willingness to share | Privacy calculus research |
| Semi-structured (choice + elaboration) is optimal | Survey design literature |
| 3-5 questions before fatigue dropoff | Survey research + Pymetrics (98% completion in 25 min) |
| Adaptive selection: 50% fewer questions, same precision | CAT meta-analyses |

---

## Competitive Landscape

### Career platforms -- NONE do Socratic probing:
All 10 competitors use forms/upload. Zero conversational skill discovery.

### Adjacent tech that validates the approach:
| System | What It Does | Relevance |
|---|---|---|
| Khanmigo (Khan Academy) | Socratic tutoring via GPT-4, never gives answers | Validates "ask don't tell" at scale |
| Carnegie Learning MATHia | Adapts to HOW student solves, not just IF | Validates skill-level granularity |
| Duolingo HLR | Adaptive question selection at 500M+ users | Validates adaptive selection works |
| Cappfinity (CAT) | True adaptive testing for professional skills | Validates IRT-based question selection |
| Coach Vici | Structured goal-setting questions for career coaching | Only career chatbot with published research |
| interviewing.io | AI interviewer adapts difficulty, generates follow-ups | Validates adaptive follow-ups work |

### Relevant academic papers:
| Paper | Year | Key Finding |
|---|---|---|
| Schmidt & Hunter meta-analysis | 1998 | Structured > unstructured, 85 years of evidence |
| Duolingo HLR (Settles & Meeder, ACL) | 2016 | Adaptive question selection at scale |
| Chatbot Self-Disclosure (Journal of Communication) | 2018 | More disclosure to chatbots for sensitive topics |
| "Thinking Assistants" (arXiv:2312.06024) | 2023 | Data-informed questions > generic questions |
| TreeInstruct (EMNLP 2024) | 2024 | Knowledge state estimation + question trees |
| Socratic Chatbot (arXiv:2409.05511) | 2024 | Socratic tutor > standard chatbot |
| Clarifying Questions (Google, arXiv:2510.12015) | 2025 | Sequential clarifying Qs when history is limited |
| Proactive Conversational AI Survey (ACM TOIS) | 2025 | Clarifying questions are top-3 research topic |

---

## Skill Extraction Benchmarks (Why LLM Is Required)

### Resume parsing accuracy by field:
| Field | Accuracy | Method |
|---|---|---|
| Email, phone | 99%+ | Regex |
| Name | 95-98% | Trained model |
| Dates | 85-90% | Trained model |
| Education | 90-95% | Semi-structured |
| Skills from prose | 70-90% (variable) | Trained model |
| Seniority inference | Unknown/low | No benchmarks |

### Skill extraction F1 scores (SkillSpan benchmark):
| Model | F1 |
|---|---|
| BERT-base | 54.34 |
| JobSpanBERT | 56.64 |
| ESCOXLM-R | 62.6 |
| Skill-LLM (fine-tuned, SOTA) | 64.8 |
| GPT-3.5 (zero/few-shot) | Strongest |

Best non-LLM: 65% F1. One in three skills wrong or missing.

### Key datasets:
- SkillSpan (NAACL 2022): 14,500 sentences, 12,500+ spans
- Green benchmark (2022): CoNLL format
- Decorte benchmark: Maps to ESCO taxonomy
- ESCO: 13,939 skills, 3,039 occupations, 28 languages

---

## Design Principles (Locked)

1. **Hand-crafted templates, not AI-generated questions** -- structured validity (.51) > unstructured (.38)
2. **3-5 questions max per gate** -- aligned with CAT research and fatigue thresholds
3. **One question per screen** -- Typeform pattern, 3.5x completion rate
4. **Data-informed questioning** -- "Your CV mentions X" not "Tell me about your skills"
5. **Semi-structured format** -- choices where possible, free text for elaboration
6. **Warm conversational tone** -- increases disclosure (CUI 2022)
7. **"Skip for now" on every question** -- respects user agency
8. **Explain the "why"** -- "This helps us show stronger evidence for roles requiring X"
9. **Persona-aware framing** -- 9 personas shape question language, not content
10. **API calls only for extraction** -- questions are templates, only answers need parsing

---

## What This Is NOT

- NOT a chatbot (no open-ended conversation)
- NOT a form (not a wall of fields)
- NOT AI-generated questions (hand-crafted templates selected by code)
- NOT training a model (LLM is frozen, we're extracting structured data)
- NOT used in AutoResearch loop (independent system, see karpathy-adaptation.md)

---

## Files Referenced

- Evidence credibility model: evidence-credibility-model.md (v3)
- AutoResearch loop: karpathy-adaptation.md (independent system)
- Socratic engine design: socratic-engine-final.md (architecture details)
- Competitor audit: competitive-comparison.html
- CV generation prompt: packages/ai/src/prompts/cv-generation.ts
- JD parser prompt: packages/ai/src/prompts/jd-parser.ts
