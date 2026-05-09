# JobLoop AI — Complete MVP Specification (v4)

**Version:** 4.0 | **Date:** 2026-04-27
**Status:** Production-ready specification
**Based on:** Deep analysis of 12+ competitors, 2026 market data, real tech benchmarks

---

## 1. Product Definition

JobLoop AI is an AI-assisted job search system that:

- Analyzes job suitability BEFORE applying (unique — no competitor does this honestly)
- Generates ATS-optimized, role-specific CVs that preserve the user's authentic voice
- Produces high-impact, JD-specific cover letters
- Tracks every application and CV version with outcome linking
- Learns from outcomes and continuously improves strategy
- Prepares users for interviews with JD-specific question generation

**Primary Goal:** Maximize interview conversion through intelligent positioning and continuous learning.

**Why this wins:** The market is split between resume builders (Kickresume, Rezi), trackers (Huntr), and failed auto-apply bots (LazyApply: 2.1/5 stars). No tool combines honest pre-apply analysis + quality generation + outcome learning. The real competitor is ChatGPT + Google Docs — JobLoop must deliver what raw LLM conversations cannot: persistent memory, structured workflow, version tracking, and compounding intelligence.

**What we explicitly do NOT do:**
- Auto-apply / mass application (proven failure: LoopCV users get 1 interview per 700 auto-apps)
- Inflate suitability scores (there is no real "ATS score" — Greenhouse, Lever, Workday don't output scores)
- Generate generic AI language (the #1 complaint across ALL competitor tools; employers actively detect it)

**Regulatory Posture (NIST AI RMF, EU AI Act, ICO, EEOC):**
JobLoop AI is a **candidate-side coaching tool**. We never rank, filter, or score candidates for employers. All analysis and suggestions are advisory — the user controls every submission. We do not make or influence hiring decisions. This positions us outside the EU AI Act's "high-risk" classification for recruitment AI (which applies to employer-side screening/ranking systems). Key commitments:
- **Transparency**: Every recommendation shows its evidence basis. No opaque scores, no hidden weighting.
- **User control**: Users approve merged profiles, resolve conflicts, and approve every generated CV before submission. No automated decisions without meaningful human involvement.
- **No discrimination risk**: We advocate for every user equally. No filtering, no rejection, no ranking against other candidates. "Closed" not "Rejected" — advocate framing throughout.
- **Data minimization**: CV data stored only for the user's benefit. No cross-user model training. No selling candidate data to employers.
- **If we ever expand to employer-side features** (ranking, screening, filtering): full compliance posture required — bias audits, impact assessments, notice/appeals processes, EEOC disparate impact review. This is a Phase 3+ decision requiring dedicated legal review.

---

## 2. Authentication & User Management

**Decision basis:** Every major competitor (Teal, Jobscan, Careerflow) offers Google + LinkedIn OAuth. LinkedIn login is critical because it bootstraps user profiles.

### 2.1 Auth Methods (Supabase Auth)

| Method | Priority | Rationale |
|--------|----------|-----------|
| Google OAuth | MVP | Most common, fastest signup, trusted |
| LinkedIn OAuth | MVP | Imports professional data (name, headline, positions, education, skills) at signup |
| Email + password | MVP | Fallback for users who avoid OAuth |
| Magic link (email) | MVP | Passwordless option, reduces friction |
| GitHub OAuth | Post-MVP | Relevant for developer-focused roles |

### 2.2 Session Management

- JWT tokens via Supabase Auth (access + refresh tokens)
- Multi-device sync: sessions persist across devices via Supabase real-time subscriptions
- Session timeout: 7 days inactive, refresh tokens valid 30 days
- Force logout on password change

### 2.3 User Data Model

```
users
├── id (uuid, primary key)
├── email (unique)
├── full_name
├── avatar_url
├── auth_provider (google | linkedin | email)
├── linkedin_profile_url (nullable)
├── onboarding_completed (boolean, default false)
├── plan (free | pro | sprint)
├── plan_expires_at (timestamp, nullable)
├── ai_credits_used_today (integer, default 0)
├── ai_credits_used_month (integer, default 0)
├── created_at
└── updated_at
```

---

## 3. Onboarding Flow

**Decision basis:** Teal shows value within 2 minutes with 3 questions. Auth0 and ProductLed research: ask only essentials upfront, progressive profiling for the rest.

### 3.1 Flow (Max 3 required steps, <2 minutes)

```
Step 1: Sign Up
├── Google / LinkedIn OAuth (one click)
├── OR email + password
└── If LinkedIn: auto-import name, headline, positions, education, skills

Step 2: Import Profile (choose one)
├── Option A: LinkedIn auto-imported (if OAuth used) → review + confirm
├── Option B: Upload existing CV (PDF/DOCX) → AI extracts structured data
├── Option C: Paste CV text → AI parses
└── Option D: Skip → manual entry later

Step 3: Set Preferences
├── Target roles (multi-select from common categories + free text)
├── Location preference (remote / hybrid / onsite + city)
├── Salary range (optional, can skip)
└── Job search status (actively looking / casually browsing / employed exploring)

→ IMMEDIATE VALUE MOMENT: "Paste a job you're interested in" → instant suitability analysis
```

### 3.2 Progressive Profiling (Post-Onboarding)

After initial setup, prompt users contextually to enrich their profile:
- After first analysis: "Add 2-3 key achievements to improve your score"
- After first CV generation: "Rate how well this captures your voice"
- After 5 applications: "Which channels are you using most?"

---

## 4. Core System Layers

### 4.1 The Living Profile Cloud (Replaces Traditional "Base Profile")

**What makes this different:** Competitors store a flat CV document. JobLoop builds a **multi-dimensional knowledge graph** of the user's professional identity — skills with depth and breadth, achievements with evidence chains, domains with transferable connections. This cloud is RICHER than any single CV could ever be. CVs are generated as **projections** from this cloud, tailored to each specific role.

**The cloud is built through Socratic interrogation (§4.2) and continuously enriched through every interaction.**

```
Living Profile Cloud (not a document — a structured graph)
│
├── SKILLS CLOUD
│   └── Each skill node:
│       ├── name: "Kubernetes"
│       ├── depth: { years: 2, projects_count: 4, certification: "CKA" }
│       ├── breadth: { related: ["Docker", "Helm", "GKE"], transferable_to: ["DevOps", "SRE", "Platform Eng"] }
│       ├── evidence: [
│       │     { type: "project", desc: "Migrated 12 microservices to K8s", metrics: "40% cost reduction", company: "Stripe" },
│       │     { type: "certification", name: "CKA", date: "2025-03" },
│       │     { type: "contribution", desc: "Wrote internal K8s onboarding docs used by 30 engineers" }
│       │   ]
│       ├── confidence: "strong" | "moderate" | "mentioned"
│       └── last_used: "2025-12"
│
├── ACHIEVEMENT CLOUD
│   └── Each achievement node:
│       ├── title: "Led fraud detection pipeline redesign"
│       ├── context: { company: "Stripe", role: "Senior ML Engineer", team_size: 8, duration: "6 months" }
│       ├── actions: ["Designed architecture", "Led team of 8", "Presented to C-suite"]
│       ├── results: [
│       │     { metric: "Reduced false positives by 34%", verified: true },
│       │     { metric: "Saved $2.1M annually", verified: true },
│       │     { metric: "Processed 10M transactions/day", verified: true }
│       │   ]
│       ├── skills_demonstrated: ["Python", "ML", "Leadership", "System Design"]
│       ├── transferable_to: ["Risk engineering", "Real-time systems", "Data engineering"]
│       ├── star_story: { situation: "...", task: "...", action: "...", result: "..." }
│       └── awards: ["Engineering Excellence Award Q3 2025"]
│
├── DOMAIN CLOUD
│   └── Each domain node:
│       ├── name: "Fintech"
│       ├── years: 5
│       ├── companies: ["Stripe", "Square"]
│       ├── sub_domains: ["Payments", "Fraud detection", "Risk"]
│       └── adjacent_domains: ["Banking", "Insurance", "Crypto"]
│
├── PROOF CHAIN (links evidence to claims)
│   ├── "I can lead teams" → proved by: [achievement_1 (8 people), achievement_3 (12 people)]
│   ├── "I know ML" → proved by: [skill_node, 4 projects, 1 certification, 2 publications]
│   └── "I work in fintech" → proved by: [5 years, 2 companies, domain expertise]
│
├── WRITING VOICE
│   ├── samples: text[] (3-5 unedited bullets from user's own writing)
│   ├── tone_profile: "concise_technical" | "narrative" | "metrics_heavy" | "action_oriented"
│   └── vocabulary_preferences: text[] (words the user naturally uses)
│
└── CONSTRAINTS
    ├── locations, remote_preference, salary_min, currency
    ├── visa_status, notice_period
    └── deal_breakers: text[] ("no finance", "must have equity", etc.)
```

**Why this wins:** When a JD asks for "Kubernetes experience," competitors check if the word appears in the CV. JobLoop knows: this user has 2 years of K8s, 4 projects, a CKA certification, migrated 12 microservices, and this is transferable to the SRE role. The generated CV bullet is specific, evidenced, and provably true — because the cloud has DEPTH, not just keywords.

---

### 4.2 Socratic Profile Enrichment Engine

**Concept:** Instead of passively accepting whatever text the user uploads, the system acts as a career coach — interrogating the CV through targeted questions to extract hidden depth, uncover missing evidence, and build the Living Cloud.

**Decision basis:** Conference Board research (2026): AI provides 90% of career coaching value when it asks the right questions. No competitor does this — they all accept CV text as-is and generate from shallow data.

#### When It Activates — Intelligent Gating (Not Numerical Limits)

**The system does NOT ask a fixed number of questions.** It asks until the EVIDENCE is sufficient for the task at hand — then stops. This means 8 questions on day 1 and zero questions by application #15.

**The Gate Formula:**

```
ASK a question IF and ONLY IF all three conditions are true:

1. RELEVANCE GATE
   The question addresses an anchor point in the current JD (or a core cloud gap
   at onboarding) with importance > 0.7

2. EVIDENCE GAP GATE
   The cloud's evidence for this anchor point is below "strong"
   (i.e., missing metrics, no proof chain, confidence = "mentioned" or "moderate")

3. MARGINAL VALUE GATE
   The expected improvement to CV output quality exceeds a dynamic threshold:
   - Threshold starts at 0.3 (ask freely at onboarding)
   - Rises by 0.05 for each question already asked this session
   - Rises by 0.1 if user skipped the previous question
   - Rises by 0.2 if user has skipped 3+ questions historically (they don't like questions)
   - Falls if user is highly engaged (fast, detailed answers)

STOP asking when:
   - No remaining gaps pass all three gates, OR
   - All JD anchor points have "strong" or "moderate" evidence, OR
   - User explicitly says "I'm done" or skips 2 consecutive questions
```

**Why this works over time:**

```
Application #1:  Cloud is empty. Most anchor points have gaps. → 5-8 questions
Application #3:  Cloud has core achievements evidenced. Same domain? → 1-2 questions
Application #8:  Cloud is rich for this role type. → 0-1 questions (maybe one new JD-specific gap)
Application #15: User's domain is fully mapped. → "No questions needed. Generating directly."
Application #30: Only asks if JD reveals a genuinely new skill/domain never seen before
```

**The system gets quieter as it gets smarter.** This is the natural consequence of a living cloud that grows — not an artificial countdown.

| Trigger | Gate Behavior |
|---------|--------------|
| First CV upload | Threshold starts low (0.3). Asks until core achievements have metrics + context |
| JD analysis | Only asks about gaps THIS specific JD reveals AND cloud doesn't cover |
| Weekly enrichment | Only triggers if cloud_completeness < 80% AND user hasn't been asked in 7 days |
| New experience added | Only asks if the new entry lacks metrics/context (confidence = "mentioned") |
| Before generation | Only confirms if using evidence the user hasn't explicitly validated |

#### The Socratic Conversation (Example: Onboarding)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROFILE ENRICHMENT                                          [3/10]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ I've parsed your CV. I see strong content but some areas need       │
│ more depth to generate truly compelling applications.                │
│                                                                     │
│ Let's start:                                                        │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ YOUR CV SAYS: "Managed a development team"                      │ │
│ │                                                                 │ │
│ │ This is weak — no numbers, no outcome, no proof.                │ │
│ │                                                                 │ │
│ │ Let me ask:                                                     │ │
│ │ • How many people were on the team?                             │ │
│ │ • What did you deliver together?                                │ │
│ │ • Any metrics — revenue impact, speed improvement, cost saved?  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [Type your answer...]                                               │
│                                                                     │
│ ──── or ────                                                        │
│                                                                     │
│ [Skip this question]  [I don't have metrics for this]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```
USER: "8 people, we built the fraud detection system, reduced false positives by 34%"

┌─────────────────────────────────────────────────────────────────────┐
│ Strong. That's a quantified leadership achievement.                 │
│                                                                     │
│ → Stored: Led 8-person team, built fraud detection, 34% FP reduction│
│                                                                     │
│ Follow-up: Was there a financial impact? Cost saved or revenue      │
│ protected?                                                          │
│                                                                     │
│ [Type your answer...]                                               │
│ [Skip — no financial data available]                                │
└─────────────────────────────────────────────────────────────────────┘
```

```
USER: "Yeah, saved about $2M a year in manual review costs"

┌─────────────────────────────────────────────────────────────────────┐
│ Excellent. $2M annual impact — very strong for senior roles.        │
│                                                                     │
│ → Stored: $2.1M annual savings                                      │
│                                                                     │
│ One more: Any recognition for this? Award, promotion, shoutout      │
│ from leadership?                                                    │
│                                                                     │
│ [Type your answer...]                                               │
│ [No recognition to mention]                                         │
└─────────────────────────────────────────────────────────────────────┘
```

```
USER: "Got the engineering excellence award that quarter"

┌─────────────────────────────────────────────────────────────────────┐
│ Your achievement is now fully evidenced:                            │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ "Led 8-person team to build fraud detection pipeline,          │  │
│ │  reducing false positives by 34% and saving $2.1M annually     │  │
│ │  in manual review costs. Awarded Engineering Excellence Q3."   │  │
│ │                                                                │  │
│ │  Evidence: team size ✓  metric ✓  financial impact ✓           │  │
│ │  Recognition: award ✓                                          │  │
│ │  Confidence: STRONG ████████████                               │  │
│ │  Transferable to: Risk eng, Real-time systems, Data eng, SRE   │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ [Next question →]  [I'm done for now — continue later]              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Question Generation Logic

The AI targets what's WEAKEST in the profile cloud:

| Weakness Detected | Question Generated |
|-------------------|-------------------|
| Bullet has no metrics | "You said '[action]' — what was the measurable outcome? Even approximate is fine." |
| Skill listed without evidence | "You list [skill] — which specific project demonstrates this best?" |
| Achievement without scope | "When you [achievement], how large was the scope? Team size? Budget? Timeline?" |
| Gap in timeline | "Between [job A] and [job B], were you doing anything relevant? Freelance, courses, open source?" |
| No leadership proof | "Have you ever led a team, mentored someone, or driven a decision? Even informally counts." |
| Skill at surface level | "You used [technology] — daily production use, or occasional? How many years?" |
| No awards/recognition | "Any awards, promotions, patents, publications, or notable feedback?" |
| Missing transferable links | "Your experience in [domain A] uses [skill]. Have you applied that elsewhere?" |
| Vague role description | "What was YOUR specific contribution vs the team's? What would NOT have happened without you?" |

#### Cloud Enrichment Rules

- Never store raw text — always structure into graph nodes with typed evidence
- Each answer enriches multiple nodes simultaneously (skill confidence, achievement evidence, domain depth)
- Confidence levels update: "mentioned" → "moderate" → "strong" based on evidence count
- Track what the system DOESN'T know — prompt for it over time (progressive)
- Users can always skip — never block progress, never frustrate
- Show cloud growth visually: "Your profile strength: ████████░░ 78% — 3 more answers would reach 85%"

---

### 4.3 Adaptive Layer (Per Job — Interactive JD Dialogue)

**This is NOT a passive generation step.** When a JD is analyzed, instead of silently outputting a tailored CV, the system first shows its reasoning, identifies anchor points, and asks 1-3 targeted questions to fill gaps.

See **§37 (Interactive JD Matching Dialogue)** for the full conversation flow.

Generated fresh for each job analysis:
- Summary (tailored to JD, using cloud evidence)
- Bullet emphasis and ordering (strongest evidence for this JD first)
- Skills ordering (matching JD priority, with depth indicators)
- Keyword integration (natural, not stuffed — because cloud has real evidence)
- Cover letter tone and angle
- Achievement selection (from cloud, ranked by transferability to this role)

### 4.4 How the Cloud Feeds Everything

```
Living Profile Cloud
    ↓ (project onto specific JD requirements)
Suitability Analysis — knows DEPTH of evidence, not just keyword presence
    ↓ (interactive dialogue fills gaps, see §37)
JD Matching Dialogue — "You have Docker. JD wants K8s. Ever used K8s?"
    ↓ (select best achievements + evidence chains for this role)
CV Generation — pulls specific metrics, awards, team sizes from cloud
    ↓ (uses voice samples + vocabulary preferences)
Cover Letter — narrative built from strongest, most relevant proof chains
    ↓ (maps likely questions to achievement STAR stories already in cloud)
Interview Prep — pre-built answers using stored STAR stories
    ↓ (compares what worked vs didn't, enriches cloud knowledge)
Outcome Intelligence — learns which evidence resonates for which roles
    ↓ (feeds back: "quantified achievements in fintech get 2x callbacks")
AutoResearch Loop — system improves how it uses the cloud over time
```

---

## 5. Suitability Analysis Engine (Core Differentiator)

### 5.1 Purpose

Determine whether the user should apply and how. This is JobLoop's unique value — no competitor provides honest pre-apply fit assessment.

### 5.2 Two-Tier Analysis

**Tier 1: Instant Score (Fast model — Claude Haiku / GPT-4o-mini, <2 seconds)**
- pgvector cosine similarity between JD embedding and profile embedding
- Keyword overlap percentage
- Years of experience match
- Output: percentage score badge + fit level

**Tier 2: Deep Analysis (Quality model — Claude Sonnet / GPT-4o, 5-15 seconds, streamed)**

#### Evaluation Parameters

**1. Skills Match (weighted 30%)**
- Required skills: matched / missing / partial
- Optional skills: bonus points
- Evidence depth: does the user have demonstrable proof?

**2. Experience Alignment (weighted 25%)**
- Domain relevance (same industry, adjacent, different)
- Role similarity (same function, related, different)
- Years of experience (meets / exceeds / under requirement)
- Seniority level match

**3. Semantic JD Intent Match (weighted 20%)**
- LLM-based understanding of what the role actually needs vs literal keywords
- Detects when user has equivalent experience under different titles
- Identifies transferable skills the user might not recognize

**4. Achievement Strength (weighted 15%)**
- Quantification level (metrics, percentages, dollar amounts)
- Impact level (individual, team, organization, industry)
- Relevance to target role

**5. Positioning Fit (weighted 10%)**
- How the user's profile narrative aligns with JD expectations
- Career trajectory coherence
- Potential red flags (gaps, frequent switches, overqualification)

### 5.3 Output Format

```
{
  "fit_level": "strong" | "moderate" | "weak",
  "score": 78,                          // 0-100, honest
  "confidence": "high" | "medium",       // based on JD completeness
  "strengths": [
    { "area": "Python + ML experience", "evidence": "3 years at X corp", "strength": "high" }
  ],
  "risks": [
    { "area": "No Kubernetes experience", "severity": "medium", "mitigation": "Mention Docker experience, express willingness to learn" }
  ],
  "missing_keywords": ["Kubernetes", "CI/CD", "Terraform"],
  "recommendation": "apply" | "apply_with_repositioning" | "skip",
  "repositioning_advice": "Emphasize your DevOps adjacent work...",  // if applicable
  "estimated_competition": "high" | "medium" | "low"                 // based on role type/market
}
```

### 5.4 Honesty Rules (Non-Negotiable)

- Never inflate scores above what evidence supports
- If the user lacks a required skill, say so clearly
- "Skip" recommendation is valid and valuable — it saves user time
- Show confidence level: if JD is vague, say "medium confidence — JD lacks detail"
- Frame risks as actionable: "You're missing X — here's how to position around it"

---

## 6. JD Input & Parsing

**Decision basis:** Scraping Indeed/Glassdoor/LinkedIn violates their ToS. Browser extension (user-initiated visible page extraction) is legal and proven (Teal, Simplify).

### 6.1 Input Methods

| Method | MVP? | How It Works |
|--------|------|-------------|
| Paste JD text | Yes | User copies JD text, AI parses into structured format |
| Paste URL | Yes | Server-side fetch of public job pages + LLM extraction. Fallback to "paste text" if blocked |
| Browser extension | Phase 4 | User clicks extension on any job page → extracts visible page content → sends to app |
| File upload | Yes | Upload JD as PDF/DOCX |

### 6.2 JD Structured Output (via OpenAI structured output — 99.9%+ schema compliance)

```
{
  "company": "string",
  "role_title": "string",
  "location": "string",
  "work_model": "remote | hybrid | onsite",
  "seniority": "junior | mid | senior | lead | principal",
  "salary_range": { "min": number, "max": number, "currency": "string" } | null,
  "required_skills": ["string"],
  "optional_skills": ["string"],
  "years_experience": number | null,
  "education": "string" | null,
  "responsibilities": ["string"],
  "benefits": ["string"],
  "red_flags": ["string"],          // detected issues (unrealistic requirements, etc.)
  "source_url": "string" | null
}
```

---

## 7. CV Generation System

### 7.1 Architecture

```
User's Base Profile + Achievement Bank
        ↓
JD Analysis Results (keywords, requirements, positioning advice)
        ↓
AI CV Generator (Claude Sonnet / GPT-4o — quality tier)
        ↓
Structured CV Output (JSON)
        ↓
Plate Editor (user edits) ←→ Live PDF Preview (@react-pdf/renderer)
        ↓
Final PDF Download (Puppeteer worker — pixel-perfect)
```

### 7.2 Generation Features

- **ATS-compliant formatting** (enforced by template system, not optional)
- **JD-aligned keyword integration** (natural placement, not stuffing)
- **Impact-focused rewriting** (metrics, outcomes, scale)
- **Role-specific tailoring** (emphasis shifts per JD)
- **Voice preservation** (uses user's writing_samples as style reference)

### 7.3 Writing Enhancement Rules

| Rule | Implementation |
|------|---------------|
| Weak bullet detection | Flag bullets without metrics, action verbs, or outcomes |
| Generic language removal | Detect and replace: "responsible for", "worked on", "helped with" |
| Impact amplification | Transform "managed a team" → "Led 8-person engineering team, delivering $2M project 3 weeks ahead of schedule" |
| Action verb optimization | Start every bullet with strong, varied action verbs |
| Voice consistency | Compare generated text against user's writing_samples for tone matching |
| Keyword density | Ensure required keywords appear naturally 1-2 times without stuffing |

### 7.4 ATS Compliance (Enforced by Templates — Non-Negotiable)

Based on 2026 ATS testing data (ResumeAdapter, ResumeMate, Jobscan):

- **Fonts:** Calibri, Arial, Helvetica, Garamond, Georgia, Times New Roman only
- **Layout:** Single-column only (multi-column breaks ATS left-to-right parsing; drops to 60% accuracy)
- **No images for text:** No skill bars, charts, icons with text, infographics
- **No tables:** ATS scrambles cell contents. Use spacing/indentation
- **Standard headings:** "Experience", "Education", "Skills", "Summary" — not creative alternatives
- **Selectable text:** All text must be cursor-highlightable (never render as paths/images)
- **Margins:** 0.5" minimum, 1" standard
- **Font size:** 10-12pt body, 14-16pt headings
- **File format:** PDF with embedded fonts (standard Type 1 or TrueType)

### 7.5 Template System

```
templates/
├── professional/     # Single column, classic, maximum ATS compatibility
│   ├── schema.ts     # Section order, required fields, layout rules
│   ├── styles.ts     # Colors, fonts, spacing tokens
│   └── preview.png   # Thumbnail for template selector
├── modern/           # Subtle color accents, clean typography
├── minimal/          # Maximum whitespace, elegant
├── executive/        # Two-page support, senior roles
└── technical/        # Skills-heavy layout, project-focused
```

- **Content and presentation are separated.** Templates define layout, typography, colors, spacing. Content is structured data.
- Templates render via @react-pdf/renderer components
- Users can switch templates without re-entering data
- All templates enforce ATS compliance rules above

---

## 8. Cover Letter Engine

### 8.1 Generation

- Input: JD analysis + user profile + selected CV version
- Model: Claude Sonnet (best prose quality per research)
- Uses achievement bank to select 2-3 most relevant achievements
- References specific company/role details from JD

### 8.2 Tone Options

| Tone | When to Use | Style |
|------|------------|-------|
| Professional | Default, most corporate roles | Formal, structured, achievement-focused |
| Assertive | Senior/leadership roles | Confident, vision-oriented, results-driven |
| Technical | Engineering/technical roles | Specific, project-detailed, problem-solution framed |
| Conversational | Startups, creative roles | Personality-forward, story-driven |

### 8.3 Structure (All Tones)

```
Paragraph 1: Hook — specific connection to company/role (NOT "I am writing to apply for...")
Paragraph 2: Strongest relevant achievement with metrics
Paragraph 3: Second achievement or skill bridge addressing a key JD requirement
Paragraph 4: Cultural/mission alignment + call to action
```

- Length: 250-400 words (research shows longer cover letters are less effective)
- AI avoids: "I am excited", "I believe I would be a great fit", "Dear Hiring Manager" when company name is known

---

## 9. CV Versioning

### 9.1 Data Model

```
cv_versions
├── id (uuid)
├── user_id (fk → users)
├── base_version_id (fk → cv_versions, nullable — null for master)
├── job_id (fk → jobs, nullable — null for master CV)
├── version_number (integer, auto-increment per user)
├── content (jsonb — full structured CV)
├── template_id (text)
├── change_summary (text — AI-generated diff description)
├── generation_method (manual | ai_generated | ai_assisted)
├── is_master (boolean, default false)
├── created_at
└── updated_at
```

### 9.2 Version Rules

- Master CV is version 0 — always preserved
- Each job-specific CV links back to its base version
- AI-generated change summaries explain what was tailored and why
- Users can restore any previous version
- Versions are never deleted (soft delete only)
- Storage: structured JSON in Supabase, generated PDFs in Supabase Storage

---

## 10. Application Tracker

### 10.1 Data Model

```
applications
├── id (uuid)
├── user_id (fk → users)
├── job_id (fk → jobs)
├── cv_version_id (fk → cv_versions)
├── cover_letter_id (fk → cover_letters, nullable)
├── company (text)
├── role (text)
├── source (linkedin | indeed | company_site | referral | other)
├── source_url (text, nullable)
├── applied_date (date)
├── status (applied | screening | interview | offer | rejected | withdrawn | no_response)
├── status_updated_at (timestamp)
├── suitability_score (integer, 0-100)
├── fit_level (strong | moderate | weak)
├── response_days (integer, nullable — auto-calculated)
├── salary_offered (integer, nullable)
├── notes (text, nullable)
├── next_action (text, nullable — "Follow up by May 5")
├── contact_name (text, nullable)
├── contact_email (text, nullable)
├── interview_dates (timestamp[], nullable)
├── created_at
└── updated_at
```

### 10.2 Views

**Table View (Default Desktop):**
- TanStack Table: sortable by any column, filterable by status/source/fit_level, full-text searchable
- Columns: Company | Role | Status (color-coded) | Applied Date | Score | Source | Next Action
- Click row → side panel with full detail, CV version, timeline, notes

**Kanban View (Toggle):**
- Columns: Applied → Screening → Interview → Offer
- Drag cards between columns to update status
- Cards show: company, role, days since status change

**Mobile View:**
- Card-based list with swipe actions (swipe right → update status, swipe left → archive)
- Tap card → full detail bottom sheet

---

## 11. Outcome Intelligence

### 11.1 Signal Interpretation

| Signal | Interpretation | Confidence | Action |
|--------|---------------|------------|--------|
| Rejection <2 days | ATS keyword mismatch | High | Improve keyword matching for similar roles |
| Rejection 3-10 days | Recruiter screening — profile didn't pass human review | Medium | Improve positioning/summary |
| Rejection >10 days | Made it to shortlist, lost to competition | Medium | Strengthen achievements, consider interview prep |
| No response 14+ days | Weak negative — application lost or deprioritized | Low | Mark as no_response, reduce weight in analysis |
| Interview invitation | Strong positive — profile resonated | High | Record what CV version was used, reinforce that approach |
| Offer | Complete success | High | Full analysis of what worked (CV version, template, keywords) |

### 11.2 Learning Loop

```
Outcome recorded
    ↓
Pattern detection (after 10+ applications):
├── Which CV versions get interviews? → Reinforce those patterns
├── Which sources convert best? → Recommend those channels
├── Which role types fit best? → Adjust suitability scoring weights
├── Which keywords appear in successful applications? → Boost those
└── What changed between a weak and strong version? → Learn improvement patterns
    ↓
Updated recommendations for next application
```

### 11.3 Framing

- All interpretations are labeled as "signals" not "facts"
- Show confidence level for each interpretation
- Minimum 10 data points before showing trends
- Allow users to correct interpretations ("I got rejected because I declined, not because of my CV")

---

## 12. Experimentation Engine (User-Facing)

**Relationship to AutoResearch (§36):** This section covers the USER-VISIBLE experiment tracking. The internal AutoResearch loop (§36) optimizes the AI system itself — prompts, rubrics, scoring weights — without user involvement. This section lets users deliberately test their own hypotheses about what works for their specific situation.

### 12.1 Design

Tracks CV variations and their outcomes to learn what changes improve conversion.

```
experiments
├── id (uuid)
├── user_id (fk → users)
├── name (text — "Stronger summary for DevOps roles")
├── hypothesis (text — "Adding K8s certification to summary increases callbacks")
├── variable_changed (text — "summary" | "bullet_emphasis" | "skills_order" | "template")
├── control_version_id (fk → cv_versions)
├── variant_version_id (fk → cv_versions)
├── applications_control (integer)
├── applications_variant (integer)
├── callbacks_control (integer)
├── callbacks_variant (integer)
├── status (active | concluded | insufficient_data)
├── result (text, nullable — AI-generated conclusion)
├── created_at
└── updated_at
```

### 12.2 Rules

- One major change at a time (isolate variables)
- Minimum 5 applications per variant before drawing conclusions (acknowledge small samples with appropriate caveats)
- AI suggests experiments based on outcome patterns: "Your summary mentions Python but not ML — try emphasizing ML for data science roles"
- Users can also create manual experiments

---

## 13. Interview Preparation (New — Phase 3)

**Decision basis:** Every competitor offers post-application support. Teal has simulated interviews. ApplyArc has STAR-method frameworks. The spec currently ends at "applied" — a significant gap.

### 13.1 Features

**Question Generation (from JD + company research):**
- Technical questions likely for the role
- Behavioral questions based on JD requirements
- Company-specific questions (based on company values, recent news)
- "Tell me about yourself" script tailored to this specific role

**STAR Response Builder:**
- Select an achievement from the user's bank
- AI structures it as: Situation → Task → Action → Result
- Generates 2-3 variations for the same achievement
- Maps achievements to likely interview questions

**Company Briefing:**
- Company overview (size, funding, industry)
- Recent news mentions
- Glassdoor sentiment summary (if available)
- Interview process notes (if available from public sources)

### 13.2 Data Model

```
interview_preps
├── id (uuid)
├── application_id (fk → applications)
├── questions (jsonb — [{question, category, suggested_answer, star_response}])
├── company_briefing (jsonb)
├── user_notes (text, nullable)
├── created_at
└── updated_at
```

---

## 14. Natural Language Feedback

User can type natural language commands that the system interprets into structured signals:

| User Input | Parsed Signal | System Action |
|-----------|---------------|---------------|
| "LinkedIn not working, focus embedded" | channel_issue: LinkedIn, positioning_shift: embedded | Deprioritize LinkedIn in source recommendations, weight embedded roles higher |
| "Got rejected from 3 DevOps roles" | role_pattern: DevOps, outcome: negative | Analyze what's weak in DevOps CVs, suggest changes |
| "I have AWS certification now" | profile_update: certification | Add to skills inventory, recalculate match scores |
| "Stop suggesting remote roles" | constraint_update: remote=false | Update profile constraints |

Parsing model: Claude Haiku (fast tier) — extracts intent + entities + action.

---

## 15. Insight Engine

### 15.1 Dashboard Metrics

**Summary Cards:**
- Total applications (this month / all time)
- Interview rate (applications → interviews, as percentage)
- Average response time
- Best performing source (by interview rate)
- Top skills gap (most commonly missing keyword across rejections)

**Funnel Visualization:**
```
Applied (45) → Screening (12) → Interview (5) → Offer (1)
  100%           26.7%            11.1%          2.2%
```

**Trend Charts:**
- Applications per week (line chart)
- Interview rate over time (shows improvement)
- Response rate by source (bar chart: LinkedIn vs Indeed vs Direct vs Referral)
- Response rate by fit level (does suitability score predict outcomes?)

**AI Recommendations:**
- "Your interview rate from company websites (18%) is 3x higher than LinkedIn (6%). Consider applying directly."
- "CVs with quantified achievements in the summary get 2x more callbacks. Your last 5 CVs didn't have metrics in the summary."
- "You've applied to 8 roles requiring Terraform but don't list it. Consider adding it if you have exposure."

### 15.2 Minimum Data Thresholds

| Insight Type | Minimum Applications |
|-------------|---------------------|
| Source comparison | 5 per source |
| Trend lines | 3 weeks of data |
| CV version comparison | 3 applications per version |
| Role type analysis | 5 per role type |

Below threshold: show "Need more data — apply to X more [role type] roles for insights"

---

## 16. Mailbox Integration (Post-MVP — Phase 5)

**Decision basis:** Gmail/Outlook OAuth verification takes weeks. Nylas/Unipile unified API costs ~$0.50-1/connected account/month but saves 2-4 weeks of dev work per provider. Not justified at MVP — manual status updates are sufficient.

### 16.1 Deferred Design (For Phase 5)

- Provider: Nylas or Unipile (unified API covering Gmail + Outlook + IMAP)
- OAuth 2.0 with minimum scopes (read-only, specific labels/folders)
- Never store email credentials — token-based access only
- Data minimization: extract ONLY rejection/interview signals, never store full email content
- Explicit user consent + ability to disconnect at any time
- Detection patterns:
  - Rejection: "unfortunately", "other candidates", "not moving forward", "position has been filled"
  - Interview: "schedule an interview", "availability", "next steps", "meet the team"
- Auto-update application tracker status when detected

### 16.2 MVP Alternative

Manual status updates via:
- Application tracker UI (click to update status)
- Browser extension quick action (future)
- Natural language: "got interview at Google" → updates tracker

---

## 17. Tech Stack (Complete)

### 17.1 Frontend

| Technology | Version | Purpose | Decision Basis |
|-----------|---------|---------|----------------|
| **Next.js** | 15+ (App Router) | Framework | Largest ecosystem, Vercel AI SDK, stable App Router in 2026, SSR for SEO pages |
| **Tailwind CSS** | v4 | Styling | CSS-variable native theming, zero runtime, industry standard |
| **shadcn/ui** | Latest | UI components | Copy-paste ownership, Radix primitives (accessibility), zero runtime |
| **Plate** | Latest | CV editor | Block-based (maps to CV sections), shadcn/ui native, 50+ plugins, AI-ready. Chosen over TipTap for tighter shadcn integration |
| **@dnd-kit/react** | Latest | Drag-and-drop | CV section reordering. Modern, TypeScript-first. Chosen over deprecated react-beautiful-dnd |
| **TanStack Query** | v5 | Server state | API data, AI results, caching, refetching, optimistic updates |
| **Zustand** | Latest + Immer | Client state | CV editor state, UI preferences. Minimal boilerplate, performant |
| **Zundo** | Latest | Undo/redo | Temporal middleware for Zustand, <700 bytes, 50-state history |
| **React Hook Form** | Latest + Zod | Forms | Performant, schema-validated forms for all input |
| **TanStack Table** | Latest | Data tables | Application tracker — headless, sortable, filterable |
| **@react-pdf/renderer** | Latest | PDF preview | Client-side live preview, native text layer (ATS-compliant), React JSX |
| **Recharts** | Latest | Charts | Insight dashboard visualizations |

### 17.1b Mobile

| Technology | Version | Purpose | Decision Basis |
|-----------|---------|---------|----------------|
| **Expo** | SDK 52+ | React Native framework | Managed workflow, EAS Build for app stores, OTA updates, same TS ecosystem |
| **NativeWind** | v4 | Styling | Tailwind syntax in React Native, shared design tokens with web |
| **React Navigation** | v7 | Navigation | Native stack/tab navigation, deep linking |
| **expo-notifications** | Latest | Push notifications | Reliable on iOS + Android (unlike PWA push) |
| **react-native-webview** | Latest | CV editor (Phase 2a) | Wraps web CV editor until native alternative built |
| **Turborepo** | Latest | Monorepo orchestration | Shared packages between web + mobile, parallel builds |

### 17.2 Backend

| Technology | Purpose | Decision Basis |
|-----------|---------|----------------|
| **Supabase** | Database (PostgreSQL), Auth, Storage, Realtime, RLS | Relational data ideal for applications/jobs. Auth bundled. $25-40/mo at 1K users. Low vendor lock-in (standard Postgres) |
| **pgvector** (Supabase extension) | Embedding storage + similarity search | Instant preliminary suitability matching without API call. Native to Supabase, no extra infra |
| **Trigger.dev** | Background job orchestration | AI workflows (5-30s), PDF generation, batch processing. No timeout limits. TypeScript. Chosen over Inngest (no self-host) and BullMQ (needs Redis) |
| **Puppeteer** (dedicated worker) | Final PDF generation | Pixel-perfect WYSIWYG PDFs. Runs on Railway/Render ($7-25/mo). NOT in serverless (memory too high) |

### 17.3 AI Layer

| Tier | Model | Cost/Request | Use Cases |
|------|-------|-------------|-----------|
| **Fast** | Claude Haiku 4.5 / GPT-4o-mini | $0.007-0.010 | JD parsing, quick suitability score, NL feedback parsing, keyword extraction |
| **Quality** | Claude Sonnet 4.6 / GPT-4o | $0.085-0.119 | CV rewriting, cover letters, deep suitability analysis, interview question generation |
| **Embedding** | text-embedding-3-small | $0.00002/1K tokens | Profile and JD embeddings for pgvector similarity search |
| **Batch** | Same models, Batch API | 50% of above | Nightly portfolio re-scoring, bulk embedding updates |

**Framework:** Vercel AI SDK for streaming + provider abstraction. LiteLLM as fallback router.

**Prompt caching:** Both OpenAI and Claude offer 90% discount on cached input tokens. Structure prompts so system prompt + user CV (stable) are prefix, JD (variable) is suffix. Cuts costs 40-60%.

### 17.4 Infrastructure

| Component | Technology | Cost (MVP) |
|-----------|-----------|-----------|
| Hosting | Vercel (Pro plan) | $20/mo |
| Database + Auth + Storage | Supabase (Pro) | $25-40/mo |
| Background jobs | Trigger.dev (free tier → $50/mo) | $0-50/mo |
| PDF worker | Railway | $7-25/mo |
| Error monitoring | Sentry (free tier) | $0 |
| User analytics | PostHog (free tier, 1M events/mo) | $0 |
| Payments | Stripe | 2.9% + $0.30/transaction |
| Domain + DNS | Cloudflare | $10/year |
| Mobile builds | EAS Build (free tier) | $0-39/mo |
| App Store accounts | Apple ($99/yr) + Google ($25) | ~$10/mo amortized |
| **Total MVP** | | **$62-184/mo** |

### 17.5 Rendering Strategy

| Page Type | Rendering | Rationale |
|-----------|-----------|-----------|
| Landing / marketing | SSG (Static) | SEO, fast load, cacheable |
| Blog / job search guides | SSG + ISR | SEO content, periodic refresh |
| Dashboard | CSR (Client) | Authenticated, interactive, no SEO need |
| CV editor | CSR | Highly interactive, real-time |
| Application tracker | CSR | Authenticated, data-heavy |
| Job analysis | CSR + Streaming | AI streaming via SSE |
| Settings / profile | CSR | Authenticated, simple |

---

## 18. Security Architecture

**Decision basis:** CV data is dense PII (name, address, phone, employment, education, visa). A breach is an identity theft kit. CarGurus breach (2025-2026) affected 12M users. This must be locked down from day 1.

### 18.1 Data Security

| Layer | Implementation |
|-------|---------------|
| **Encryption at rest** | Supabase encrypts all data at rest (AES-256). Storage buckets encrypted by default |
| **Encryption in transit** | TLS 1.3 for all API calls. HTTPS enforced (HSTS headers) |
| **Row-Level Security** | Every table has RLS policies: `auth.uid() = user_id`. Users can ONLY access their own data |
| **API keys** | OpenAI/Claude keys server-side only (env vars). Never exposed to frontend. All AI calls proxied through backend |
| **Input sanitization** | All user input sanitized before storage. XSS prevention via React's default escaping + DOMPurify for rich text |
| **SQL injection** | Supabase uses parameterized queries by default. No raw SQL in application code |

### 18.2 Prompt Injection Defense

Job descriptions are untrusted user input fed to AI models. Attack vector: malicious JD text could manipulate AI outputs.

| Defense | Implementation |
|---------|---------------|
| Input sandboxing | JD text wrapped in explicit delimiters: `<job_description>` tags with instruction that content within is data, not instructions |
| Output validation | AI outputs validated against Zod schemas before rendering. Malformed output → error, not rendered |
| Rate limiting | Per-user: Free 3/day, Pro 20/day. Per-IP: 60 requests/minute. Prevents abuse |
| Content filtering | AI outputs checked for hallucinated personal information not in user's profile |

### 18.3 Authentication Security

- Password hashing: bcrypt (Supabase Auth default)
- OAuth: state parameter validation, PKCE for public clients
- CSRF: SameSite cookies + CSRF tokens for mutations
- Rate limiting on auth endpoints: 5 failed attempts → 15-minute lockout

---

## 19. Privacy & Compliance

**Decision basis:** GDPR fines up to €20M or 4% global revenue. CCPA penalties $2,500-$7,500 per violation. CV data is legally sensitive PII.

### 19.1 GDPR Compliance (EU Users)

| Requirement | Implementation |
|------------|---------------|
| **Lawful basis** | Consent (explicit opt-in at signup) + Contract (necessary for service delivery) |
| **Right to access** | Settings → "Download my data" exports all user data as JSON/ZIP |
| **Right to erasure** | Settings → "Delete my account" removes all data within 30 days (immediate soft delete, hard delete within 30 days) |
| **Right to portability** | Data export in standard JSON format |
| **Data minimization** | Collect only what's needed. Email integration extracts signals, not full emails |
| **Consent management** | Cookie banner (PostHog analytics, marketing). AI processing consent at signup |
| **DPA** | Data Processing Agreement available for B2B customers |
| **Breach notification** | Process documented: notify authorities within 72 hours, notify users without undue delay |

### 19.2 CCPA/CPRA Compliance (California Users)

- "Do Not Sell" link in footer (we don't sell data, but link is required)
- Right to know: same as GDPR data export
- Right to delete: same as GDPR erasure
- Privacy policy detailing categories of data collected, purposes, retention periods

### 19.3 Data Retention

| Data Type | Retention | Rationale |
|----------|-----------|-----------|
| User account | Until deleted by user | Core service |
| CV versions | Until deleted by user | Version history is a feature |
| Application records | Until deleted by user | Outcome learning needs history |
| AI analysis results | 90 days after generation | Can be regenerated |
| JD text | 90 days after analysis | Can be re-pasted |
| Logs | 30 days | Debugging, then purged |
| Deleted account data | Hard deleted within 30 days of request | GDPR requirement |

### 19.4 Privacy Policy Requirements

- Clear language (no legalese)
- What data we collect and why
- How AI processes user data (user CV + JD → AI model → output; we don't train models on user data)
- Third-party processors (Supabase, OpenAI, Anthropic, Vercel, Stripe)
- User rights and how to exercise them
- Contact: dedicated privacy email

---

## 20. Frontend UX — Screen Architecture

### 20.1 Design System Foundation

**Framework:** shadcn/ui + Radix UI + Tailwind CSS v4

**Design Tokens (CSS variables via Tailwind v4 @theme):**
```css
@theme {
  /* Brand */
  --color-brand-500: oklch(0.55 0.18 250);
  --color-brand-600: oklch(0.45 0.18 250);

  /* Semantic (swap these for dark mode) */
  --color-surface: var(--color-white);
  --color-surface-elevated: var(--color-gray-50);
  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);

  /* Status */
  --color-success: oklch(0.55 0.15 145);
  --color-warning: oklch(0.70 0.15 85);
  --color-danger: oklch(0.55 0.20 25);

  /* Spacing */
  --space-page: 1.5rem;
  --space-section: 1rem;
  --space-card: 0.75rem;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

**Dark mode:** Swap semantic tokens only — no `dark:` classes scattered through components.

**Responsive breakpoints:**
- Desktop (>1024px): Full layout, split panes, side panels
- Tablet (768-1024px): Collapsible panels, stacked layout
- Mobile (<768px): Full-screen views, bottom sheets, card lists

### 20.2 Screen 0: Onboarding

See Section 3 (Onboarding Flow).

### 20.3 Screen 1: Dashboard (Home)

```
┌─────────────────────────────────────────────────────────┐
│ Nav: Dashboard | Analyze | CV Editor | Tracker | Insights│
├───────────────────┬─────────────────┬───────────────────┤
│ Pipeline Summary  │ Activity Feed   │ Quick Actions     │
│                   │                 │                   │
│ Applied: 12       │ ✓ Interview at  │ [+ New Analysis]  │
│ Screening: 3      │   Stripe (2d)   │ [Edit Master CV]  │
│ Interview: 2      │ ✗ Rejected by   │ [View Insights]   │
│ Offer: 0          │   Meta (1d)     │                   │
│                   │ → Applied to    │ Score Trend       │
│ This month: 8     │   Datadog (3d)  │ ▁▂▃▅▆▇ (line)    │
│ Interview rate:   │                 │ Avg: 72 (+5)      │
│ 16.7% ↑          │                 │                   │
└───────────────────┴─────────────────┴───────────────────┘
```

**Mobile:** Stacked cards — Pipeline → Score → Quick Actions → Activity Feed.

### 20.4 Screen 2: Job Analysis

```
┌─────────────────────────────────────────────────────────┐
│ ANALYZE A JOB                                           │
├─────────────────────┬───────────────────────────────────┤
│                     │                                   │
│ [Paste JD text]     │  ┌─ Fit Badge ─────────────────┐ │
│                     │  │    78% MATCH                 │ │
│ ──── OR ────        │  │    ■■■■■■■■□□  Strong Fit   │ │
│                     │  └─────────────────────────────┘ │
│ [Paste URL]         │                                   │
│                     │  ✓ STRENGTHS                      │
│ ──── OR ────        │  • Python + ML: 3 years (strong) │
│                     │  • Team leadership evidence       │
│ [Upload file]       │  • Domain: fintech (exact match)  │
│                     │                                   │
│ ─────────────       │  ✗ RISKS                          │
│ Base CV:            │  • No Kubernetes exp (required)   │
│ [Master CV ▾]       │  • Missing: Terraform, CI/CD      │
│                     │                                   │
│                     │  → RECOMMENDATION                 │
│                     │  Apply with repositioning:        │
│                     │  "Emphasize Docker experience,    │
│                     │   mention container orchestration  │
│                     │   exposure..."                    │
│                     │                                   │
│                     │  [Generate Tailored CV →]         │
│                     │  [Save to Tracker]                │
└─────────────────────┴───────────────────────────────────┘
```

**AI UX:**
- Tier 1 (instant): Score badge appears in <2 seconds (pgvector + fast model)
- Tier 2 (streamed): Strengths/Risks/Recommendation stream in progressively via SSE
- Stage labels during loading: "Parsing job description..." → "Matching skills..." → "Analyzing fit..."
- Stop button available during streaming

**Mobile:** Full-width input area. Results appear below as expandable bottom sheet.

### 20.5 Screen 3: CV Editor

```
┌─────────────────────────────────────────────────────────┐
│ CV EDITOR          [Template: Professional ▾] [History] │
├────────────────────────────┬────────────────────────────┤
│ PLATE BLOCK EDITOR         │ LIVE PDF PREVIEW           │
│                            │                            │
│ ≡ Summary          [AI ✨] │  ┌────────────────────┐   │
│ Results-driven ML          │  │ JOHN DOE            │   │
│ engineer with 5 years...   │  │ ML Engineer         │   │
│                            │  │                     │   │
│ ≡ Experience       [AI ✨] │  │ SUMMARY             │   │
│ ▸ Senior ML Eng — Stripe   │  │ Results-driven...   │   │
│   • Led team of 8...       │  │                     │   │
│   • Built fraud detection  │  │ EXPERIENCE          │   │
│     pipeline reducing...   │  │ Senior ML Eng...    │   │
│   [+ Add bullet]           │  │                     │   │
│                            │  │                     │   │
│ ≡ Education        [AI ✨] │  │                     │   │
│ ≡ Skills           [AI ✨] │  │                     │   │
│ ≡ Certifications           │  └────────────────────┘   │
│                            │                            │
│ [+ Add Section]            │  [Download PDF]            │
│                            │  ATS Score: ■■■■■■■■□□ 82 │
├────────────────────────────┴────────────────────────────┤
│ Tabs: [CV] [Cover Letter]                               │
└─────────────────────────────────────────────────────────┘
```

**AI ✨ button behavior:**
1. Click → "What would you like?" dropdown: Improve / Rewrite / Add metrics / Shorten / Expand
2. AI generates suggestion → shown as inline diff (green additions, red removals)
3. User clicks Accept ✓ or Reject ✗
4. Undo available via Ctrl+Z (Zundo, last 50 states)

**Drag-and-drop:** ≡ handle on each section. Drag to reorder. @dnd-kit with sortable preset.

**Split pane:** Resizable via react-resizable-panels. PDF preview re-renders on 300ms debounce after last keystroke.

**Mobile:** Section-by-section form (no split pane). Toggle button to switch between Edit and Preview modes. Simplified toolbar.

### 20.6 Screen 4: Application Tracker

See Section 10.2 (Views — Table, Kanban, Mobile).

### 20.7 Screen 5: Insights Dashboard

See Section 15.1 (Dashboard Metrics).

### 20.8 Screen 6: Interview Prep

```
┌─────────────────────────────────────────────────────────┐
│ INTERVIEW PREP — Senior ML Engineer @ Stripe            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ COMPANY BRIEFING                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Stripe: Payments infrastructure ($95B valuation)    │ │
│ │ Engineering culture: high bar, infrastructure focus │ │
│ │ Recent: Launched AI fraud detection (relevant!)      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ LIKELY QUESTIONS                          [Regenerate]  │
│                                                         │
│ Technical:                                              │
│ 1. "Explain your approach to feature engineering for    │
│     fraud detection models"                             │
│    [Prepare STAR Response →]                            │
│                                                         │
│ 2. "How would you handle class imbalance in a           │
│     real-time prediction system?"                       │
│    [Prepare STAR Response →]                            │
│                                                         │
│ Behavioral:                                             │
│ 3. "Tell me about a time you disagreed with a           │
│     technical decision"                                 │
│    [Prepare STAR Response →]                            │
│                                                         │
│ YOUR "TELL ME ABOUT YOURSELF" (tailored to this role)   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ "I'm an ML engineer with 5 years in fintech,        │ │
│ │  specializing in fraud detection and real-time       │ │
│ │  prediction systems. At [company], I led..."         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 20.9 Settings Page

- Profile management (edit name, email, password)
- Connected accounts (Google, LinkedIn — connect/disconnect)
- Subscription management (plan, billing, invoices via Stripe Customer Portal)
- Privacy controls (download data, delete account)
- Preferences (default template, notification settings, dark mode toggle)
- AI preferences (tone preference, voice samples management)

---

## 21. Browser Extension (Phase 4)

**Decision basis:** Chrome extensions are the #1 acquisition channel for Teal, Huntr, and Simplify. Also provides the best UX for "analyze this job from any page."

### 21.1 Architecture

- Chrome Manifest V3 (required for Chrome Web Store since 2024)
- Extracts visible page content (user-initiated — legal)
- Sends JD text to JobLoop API → returns suitability score
- Quick actions: Save job, Analyze, Open in JobLoop

### 21.2 UX

```
User on LinkedIn job page → clicks JobLoop extension icon
    ↓
Popup shows:
┌──────────────────────┐
│ JobLoop AI            │
│                      │
│ Senior ML Engineer   │
│ @ Stripe             │
│                      │
│ Score: 78% ■■■■■■■■  │
│ Fit: Strong          │
│                      │
│ [Full Analysis →]    │
│ [Save to Tracker]    │
│ [Generate CV →]      │
└──────────────────────┘
```

### 21.3 Distribution Value

- Chrome Web Store organic discovery (free user acquisition)
- Extension page with SEO-optimized description
- Social proof via reviews and install count
- Viral loop: users recommend the extension, not the app

---

## 22. Mobile Strategy

**Decision basis:** 90% of job seekers use mobile (HireVire 2026), but mobile users complete 53% fewer applications. Mobile = browse and check. Desktop = create and apply.

### 22.1 PWA (Progressive Web App) — MVP

| Capability | Implementation |
|-----------|---------------|
| Home screen install | Web App Manifest with icons |
| Offline viewing | Workbox service worker caches: dashboard, tracker, saved CVs |
| Push notifications | Web Push API for: interview invites detected, application status changes, follow-up reminders |
| Background sync | Queue tracker updates when offline, sync when reconnected |

### 22.2 Mobile-Specific UX Adaptations

| Screen | Desktop | Mobile |
|--------|---------|--------|
| Dashboard | 3-column grid | Stacked cards |
| Job Analysis | Side-by-side input + results | Input area → results as bottom sheet |
| CV Editor | Split pane (editor + preview) | Section-by-section form, toggle to preview |
| Tracker | Data table | Card list with swipe actions |
| Insights | Multi-chart grid | Scrollable cards, one metric each |
| Interview Prep | Full layout | Accordion sections |

### 22.3 Expo / React Native — App Store Presence (Phase 2)

**Decision reversal:** App store presence is non-negotiable for user acquisition and trust. Users expect to find tools in Play Store / App Store. A web-only product limits discoverability and perceived legitimacy.

**Approach:** Expo (React Native) — lightweight wrapper at launch, progressively native.

| Phase | Scope | Timeline |
|-------|-------|----------|
| Phase 2a | Thin wrapper: WebView of Next.js app + native push notifications + app store listing | With MVP launch |
| Phase 2b | Native screens for: Dashboard, Tracker, Notifications, Job Analysis results | Post-MVP sprint |
| Phase 3 | Full native: CV viewer (read-only), Interview Prep, Insights charts | Growth phase |

**Why Expo:**
- Same React/TypeScript ecosystem as Next.js — shared types, business logic, Zod schemas
- EAS Build handles app store submissions (no Xcode/Android Studio locally)
- OTA updates via `expo-updates` — push fixes without app store review
- Push notifications via `expo-notifications` (reliable on both iOS and Android, unlike PWA)
- 80% of code (types, API clients, validation, state logic) shared via monorepo

**Monorepo Structure:**
```
jobloop/
├── apps/
│   ├── web/          → Next.js (main product)
│   └── mobile/       → Expo (React Native)
├── packages/
│   ├── shared/       → Types, Zod schemas, API client, constants
│   ├── ui/           → Shared design tokens (Tailwind → NativeWind mapping)
│   └── store/        → Zustand stores (shared state logic)
├── turbo.json
└── package.json
```

**Mobile-specific tech:**
| Technology | Purpose |
|-----------|---------|
| Expo SDK 52+ | Framework + managed workflow |
| NativeWind v4 | Tailwind-compatible styling for React Native |
| React Navigation v7 | Native navigation stack |
| expo-notifications | Push notifications (APNs + FCM) |
| expo-secure-store | Token storage |
| react-native-webview | WebView for CV editor (Phase 2a) |
| EAS Build + Submit | CI/CD for app stores |

**Cost addition:**
| Item | Cost |
|------|------|
| Apple Developer Account | $99/year |
| Google Play Developer | $25 one-time |
| EAS Build (free tier → Pro) | $0-39/mo |

**What stays web-only (initially):**
- CV Editor (Plate is web-only; mobile shows read-only preview)
- PDF generation (server-side, downloads to device)
- Admin/settings pages

---

## 23. Business Model & Pricing

**Decision basis:** Competitor analysis shows Teal succeeds with 90% free driving adoption; Jobscan at $179/year; subscription fatigue is peak in 2026 pushing users toward fair pricing.

### 23.1 Pricing Tiers

| Tier | Price | What's Included | AI Budget |
|------|-------|----------------|-----------|
| **Free** | $0 forever | Unlimited application tracking, 3 job analyses/month, 1 CV template (Professional), basic insights, manual status updates | ~$0.30/user/mo |
| **Pro** | $19/month or $149/year | Unlimited analyses, all 5 templates, cover letter generation, CV version history, outcome intelligence, interview prep, all insights, priority AI (quality models) | ~$2-5/user/mo |
| **Sprint** | $9/week (cancel anytime) | Same as Pro, weekly billing | Same |

### 23.2 Why This Pricing

- **Free tier is generous** enough to hook users: tracking is unlimited (costs nothing to serve), 3 analyses/month demonstrates the core value
- **$19/month** undercuts Jobscan ($49.95), Huntr ($30-40), Jobright ($39.99) while offering more features
- **$149/year** beats Jobscan annual ($179) and matches Rezi lifetime ($149)
- **$9/week Sprint** serves actively job-searching users who want short commitment (addresses subscription fatigue)
- AI features gate paid tier because they're expensive to serve

### 23.3 Payment Infrastructure

- Stripe: subscriptions, invoicing, customer portal
- Stripe Checkout for conversion
- Stripe Customer Portal for self-service (plan changes, cancellation, invoices)
- Webhook handling for: subscription created, renewed, cancelled, payment failed
- 7-day grace period on failed payments before downgrade

### 23.4 AI Cost Controls

| Control | Implementation |
|---------|---------------|
| **Per-user daily limits** | Free: 1 analysis/day, Pro: 20/day |
| **Per-user monthly limits** | Free: 3 analyses/month, Pro: unlimited (but daily cap prevents abuse) |
| **Token budgets** | Analysis: 15K tokens max, CV rewrite: 20K max, Cover letter: 8K max |
| **Model tiering** | Fast tier for scoring ($0.01), quality tier for writing ($0.10) |
| **Prompt caching** | System prompt + CV context cached (90% discount). ~40-60% total cost reduction |
| **Batch processing** | Nightly portfolio re-scoring via Batch API (50% discount) |
| **Abuse detection** | Flag accounts exceeding 5x normal daily usage. Auto-throttle, manual review |
| **Cost monitoring** | PostHog custom events tracking: AI cost per user, per feature, per model |

### 23.5 Unit Economics Target

| Metric | Target |
|--------|--------|
| Free user cost | <$0.50/month (tracking infra + 3 analyses) |
| Pro user AI cost | <$5/month average |
| Pro ARPU | $19/month (monthly) or $12.42/month (annual) |
| Gross margin target | >70% (AI costs <30% of revenue) |
| Free → Pro conversion | 5-10% (industry benchmark for freemium SaaS) |

---

## 24. API Design

### 24.1 Architecture

- Next.js API Routes (App Router) for synchronous endpoints
- Trigger.dev for async AI workflows
- Supabase client SDK for direct DB queries from authenticated client (with RLS)

### 24.2 Key Endpoints

```
Auth (Supabase Auth — no custom endpoints needed)
POST /auth/signup
POST /auth/login
POST /auth/oauth/[provider]
POST /auth/logout
POST /auth/reset-password

Profile
GET    /api/profile                    → Get user profile
PUT    /api/profile                    → Update profile
POST   /api/profile/import-cv          → Upload + AI parse CV file
POST   /api/profile/import-linkedin    → Import from LinkedIn OAuth data

Jobs & Analysis
POST   /api/jobs/parse                 → Parse JD (text/URL/file) → structured format
POST   /api/jobs/analyze               → Full suitability analysis (triggers Trigger.dev job, streams via SSE)
GET    /api/jobs/:id                   → Get saved job
GET    /api/jobs/:id/analysis          → Get analysis results

CV
POST   /api/cv/generate                → Generate tailored CV (Trigger.dev → streams via SSE)
GET    /api/cv/versions                → List all CV versions
GET    /api/cv/versions/:id            → Get specific version
PUT    /api/cv/versions/:id            → Update CV content (manual edits)
POST   /api/cv/versions/:id/pdf        → Generate final PDF (Trigger.dev → Puppeteer worker)
POST   /api/cv/ai-suggest              → AI suggestion for specific section/bullet

Cover Letters
POST   /api/cover-letter/generate      → Generate cover letter (Trigger.dev → streams via SSE)
GET    /api/cover-letter/:id           → Get cover letter
PUT    /api/cover-letter/:id           → Update (manual edits)

Applications
GET    /api/applications               → List with filters/sort/pagination
POST   /api/applications               → Create new application record
PUT    /api/applications/:id           → Update status, notes, etc.
DELETE /api/applications/:id           → Soft delete

Interview Prep
POST   /api/interview-prep/generate    → Generate prep from application (Trigger.dev)
GET    /api/interview-prep/:id         → Get prep materials
PUT    /api/interview-prep/:id         → Add user notes

Insights
GET    /api/insights/summary           → Dashboard summary metrics
GET    /api/insights/funnel            → Funnel data
GET    /api/insights/trends            → Time-series data
GET    /api/insights/recommendations   → AI-generated recommendations

User
GET    /api/user/export                → GDPR data export (Trigger.dev → generates ZIP)
DELETE /api/user/account               → Account deletion request
GET    /api/user/usage                 → Current plan usage (credits, limits)
```

### 24.3 Rate Limiting

| Scope | Limit |
|-------|-------|
| Global per-IP | 60 requests/minute |
| Auth endpoints | 5 failed attempts → 15-minute lockout |
| AI endpoints (Free) | 1/day, 3/month |
| AI endpoints (Pro) | 20/day |
| PDF generation | 10/hour |
| Data export | 1/day |

### 24.4 Error Handling Strategy

| Scenario | Response | User Experience |
|----------|----------|-----------------|
| AI API timeout | Retry once with exponential backoff, then return partial results if available | "Analysis is taking longer than usual. Partial results shown." |
| AI API down | Circuit breaker (3 failures → open for 60s), return cached embeddings-only score | "AI service temporarily unavailable. Showing quick match score." |
| Rate limit hit | 429 with retry-after header | "You've reached your daily limit. Upgrade to Pro for unlimited analyses." |
| Invalid input | 400 with field-level validation errors | Inline form validation |
| Server error | 500, logged to Sentry, generic user message | "Something went wrong. We've been notified." |
| Supabase down | Retry with backoff, offline queue for writes | "Saving your changes... (will sync when connection restores)" |

---

## 25. Database Schema (Complete)

```sql
-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Users (managed by Supabase Auth, extended here)
create table public.profiles (
  id uuid references auth.users primary key,
  full_name text,
  avatar_url text,
  linkedin_profile_url text,
  onboarding_completed boolean default false,
  plan text default 'free' check (plan in ('free', 'pro', 'sprint')),
  plan_expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  ai_credits_used_today integer default 0,
  ai_credits_used_month integer default 0,
  credits_reset_date date default current_date,
  writing_samples text[],
  preferences jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Living Profile Cloud (replaces flat career_profiles)
create table public.career_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  master_cv_raw jsonb not null default '{}',     -- Original imported CV structure
  role_categories text[] default '{}',
  constraints jsonb default '{}',
  voice_tone_profile text,                        -- 'concise_technical', 'narrative', 'metrics_heavy'
  cloud_completeness integer default 0,           -- 0-100, how enriched the cloud is
  embedding vector(1536),                         -- Aggregate profile embedding for similarity search
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Skills Cloud (individual skill nodes with depth)
create table public.skill_nodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  name text not null,
  depth_years numeric(3,1),
  depth_projects_count integer default 0,
  depth_certifications text[] default '{}',
  breadth_related text[] default '{}',            -- Related skills
  breadth_transferable_to text[] default '{}',    -- Roles/domains this transfers to
  evidence jsonb not null default '[]',           -- [{type, desc, metrics, company, date}]
  confidence text not null default 'mentioned' check (confidence in ('mentioned', 'moderate', 'strong')),
  last_used date,
  embedding vector(1536),                         -- Skill-level embedding for fine matching
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, name)
);

-- Achievement Cloud (individual achievement nodes with evidence)
create table public.achievement_nodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  title text not null,
  context jsonb not null default '{}',            -- {company, role, team_size, duration}
  actions text[] default '{}',
  results jsonb not null default '[]',            -- [{metric, verified}]
  skills_demonstrated text[] default '{}',
  transferable_to text[] default '{}',
  star_story jsonb,                               -- {situation, task, action, result}
  awards text[] default '{}',
  confidence text not null default 'moderate' check (confidence in ('mentioned', 'moderate', 'strong')),
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Domain Cloud (professional domains with depth)
create table public.domain_nodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  name text not null,
  years numeric(3,1),
  companies text[] default '{}',
  sub_domains text[] default '{}',
  adjacent_domains text[] default '{}',
  created_at timestamptz default now(),
  unique(user_id, name)
);

-- Socratic Dialogue Log (conversations that enriched the cloud)
create table public.enrichment_dialogues (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  trigger_type text not null check (trigger_type in ('onboarding', 'jd_analysis', 'weekly_prompt', 'new_experience')),
  trigger_job_id uuid references public.jobs,     -- Which JD triggered this (if applicable)
  questions_asked jsonb not null default '[]',     -- [{question, answer, skipped, nodes_enriched}]
  cloud_nodes_created integer default 0,
  cloud_nodes_updated integer default 0,
  created_at timestamptz default now()
);

-- Indexes for Living Cloud
create index idx_skill_nodes_user on public.skill_nodes(user_id);
create index idx_skill_nodes_name on public.skill_nodes(user_id, name);
create index idx_skill_nodes_confidence on public.skill_nodes(user_id, confidence);
create index idx_skill_nodes_embedding on public.skill_nodes using ivfflat (embedding vector_cosine_ops);
create index idx_achievement_nodes_user on public.achievement_nodes(user_id);
create index idx_achievement_nodes_embedding on public.achievement_nodes using ivfflat (embedding vector_cosine_ops);
create index idx_domain_nodes_user on public.domain_nodes(user_id);
create index idx_enrichment_dialogues_user on public.enrichment_dialogues(user_id);

-- Parsed jobs
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  company text not null,
  role_title text not null,
  location text,
  work_model text check (work_model in ('remote', 'hybrid', 'onsite')),
  seniority text,
  salary_range jsonb,
  required_skills text[] default '{}',
  optional_skills text[] default '{}',
  years_experience integer,
  education text,
  responsibilities text[] default '{}',
  raw_text text not null,
  source_url text,
  parsed_data jsonb not null default '{}',
  embedding vector(1536),  -- JD embedding for similarity search
  created_at timestamptz default now()
);

-- Suitability analyses
create table public.analyses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  job_id uuid references public.jobs not null,
  score integer not null check (score >= 0 and score <= 100),
  fit_level text not null check (fit_level in ('strong', 'moderate', 'weak')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  strengths jsonb not null default '[]',
  risks jsonb not null default '[]',
  missing_keywords text[] default '{}',
  recommendation text not null check (recommendation in ('apply', 'apply_with_repositioning', 'skip')),
  repositioning_advice text,
  model_used text not null,
  tokens_used integer not null,
  created_at timestamptz default now()
);

-- CV versions
create table public.cv_versions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  base_version_id uuid references public.cv_versions,
  job_id uuid references public.jobs,
  version_number integer not null,
  content jsonb not null,
  template_id text not null default 'professional',
  change_summary text,
  generation_method text not null check (generation_method in ('manual', 'ai_generated', 'ai_assisted')),
  is_master boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cover letters
create table public.cover_letters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  job_id uuid references public.jobs not null,
  content text not null,
  tone text not null check (tone in ('professional', 'assertive', 'technical', 'conversational')),
  model_used text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Applications
create table public.applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  job_id uuid references public.jobs not null,
  cv_version_id uuid references public.cv_versions,
  cover_letter_id uuid references public.cover_letters,
  analysis_id uuid references public.analyses,
  source text check (source in ('linkedin', 'indeed', 'company_site', 'referral', 'other')),
  source_url text,
  applied_date date not null default current_date,
  status text not null default 'applied'
    check (status in ('applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn', 'no_response')),
  status_updated_at timestamptz default now(),
  response_days integer,
  salary_offered integer,
  notes text,
  next_action text,
  next_action_date date,
  contact_name text,
  contact_email text,
  interview_dates timestamptz[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Interview prep
create table public.interview_preps (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  application_id uuid references public.applications not null,
  questions jsonb not null default '[]',
  company_briefing jsonb default '{}',
  tell_me_about_yourself text,
  user_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Experiments
create table public.experiments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  name text not null,
  hypothesis text,
  variable_changed text not null,
  control_version_id uuid references public.cv_versions,
  variant_version_id uuid references public.cv_versions,
  applications_control integer default 0,
  applications_variant integer default 0,
  callbacks_control integer default 0,
  callbacks_variant integer default 0,
  status text default 'active' check (status in ('active', 'concluded', 'insufficient_data')),
  result text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI usage tracking (for cost monitoring)
create table public.ai_usage_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  feature text not null,  -- 'analysis', 'cv_generation', 'cover_letter', 'interview_prep'
  model text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  cost_cents integer not null,  -- cost in cents for easy aggregation
  cached_tokens integer default 0,
  created_at timestamptz default now()
);

-- Row-Level Security (CRITICAL)
alter table public.profiles enable row level security;
alter table public.career_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.analyses enable row level security;
alter table public.cv_versions enable row level security;
alter table public.cover_letters enable row level security;
alter table public.applications enable row level security;
alter table public.interview_preps enable row level security;
alter table public.experiments enable row level security;
alter table public.ai_usage_log enable row level security;

-- RLS policies (same pattern for all tables)
-- Example for applications:
create policy "Users can only access their own applications"
  on public.applications for all
  using (auth.uid() = user_id);

-- Indexes (CRITICAL for RLS performance)
create index idx_career_profiles_user on public.career_profiles(user_id);
create index idx_jobs_user on public.jobs(user_id);
create index idx_jobs_embedding on public.jobs using ivfflat (embedding vector_cosine_ops);
create index idx_career_profiles_embedding on public.career_profiles using ivfflat (embedding vector_cosine_ops);
create index idx_analyses_user_job on public.analyses(user_id, job_id);
create index idx_cv_versions_user on public.cv_versions(user_id);
create index idx_applications_user on public.applications(user_id);
create index idx_applications_status on public.applications(user_id, status);
create index idx_applications_date on public.applications(user_id, applied_date);
create index idx_ai_usage_user_date on public.ai_usage_log(user_id, created_at);
```

---

## 26. Error Handling & Resilience

### 26.1 AI API Resilience

```
AI Request Flow:
  1. Check rate limits (user daily/monthly)
  2. Try primary provider (e.g., Claude Sonnet)
  3. If timeout (>30s) → retry once with exponential backoff
  4. If still failing → fallback to secondary provider (e.g., GPT-4o)
  5. If both fail → circuit breaker opens (60s cooldown)
  6. During circuit open → return cached embeddings-only score (Tier 1)
  7. Log failure to Sentry + PostHog
```

### 26.2 Circuit Breaker Config

- Failure threshold: 3 consecutive failures
- Open duration: 60 seconds
- Half-open: allow 1 request through to test recovery
- Per-provider independent circuits

### 26.3 Graceful Degradation

| Failure | Degraded Experience |
|---------|-------------------|
| AI API down | Show embeddings-based score only (pgvector, instant), "Deep analysis unavailable" |
| PDF worker down | Show HTML preview, "PDF download temporarily unavailable" |
| Supabase Realtime down | Polling fallback (30s interval) |
| Stripe webhook failure | Retry queue (3 attempts over 24h), manual reconciliation |

---

## 27. Testing Strategy

### 27.1 Testing Pyramid

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit tests | Vitest | Business logic, scoring algorithms, utility functions. 80%+ coverage |
| Component tests | Vitest + Testing Library | UI components render correctly, user interactions work |
| Integration tests | Vitest + Supabase local | API routes, database operations, RLS policies |
| E2E tests | Playwright | Critical flows: signup → analyze → generate CV → track. Top 5 user journeys |
| AI output tests | Custom eval harness | Regression suite: known JD + CV pairs → expected score ranges and keyword detection |

### 27.2 AI-Specific Testing

AI output is non-deterministic. Testing approach:

- **Regression suite:** 50+ JD/CV pairs with expected score ranges (±10 points), required keywords, and expected fit levels
- **Structured output validation:** Every AI response validated against Zod schema before use
- **Hallucination detection:** Check AI-generated CV bullets against user's actual profile — flag any claims not in the source data
- **Voice consistency scoring:** Compare generated text against user's writing_samples using embedding similarity
- **Cost tracking tests:** Verify token budgets are respected per feature

---

## 28. CI/CD & DevOps

### 28.1 Pipeline

```
Push to main branch:
  1. Lint (ESLint + Prettier)
  2. Type check (tsc --noEmit)
  3. Unit + component tests (Vitest)
  4. Integration tests (Vitest + Supabase local via Docker)
  5. Build (next build)
  6. Deploy to preview (Vercel preview deployment)
  7. E2E tests against preview (Playwright)
  8. If all pass → auto-deploy to production

Pull requests:
  - Same pipeline minus production deploy
  - Preview URL generated automatically (Vercel)
```

### 28.2 Environments

| Environment | Purpose | Database |
|------------|---------|----------|
| Local | Development | Supabase local (Docker) |
| Preview | PR review, E2E testing | Supabase branching (preview DB) |
| Production | Live users | Supabase production |

### 28.3 Database Migrations

- Supabase CLI migrations (`supabase migration new`, `supabase db push`)
- Migrations version-controlled in Git
- Applied automatically on deploy via CI

---

## 29. Monitoring & Analytics

### 29.1 Error Monitoring: Sentry

- Client + server error tracking
- Source maps uploaded on deploy
- Alert rules: >5 errors/minute, any 500 on critical paths

### 29.2 User Analytics: PostHog

Key events to track:
- `signup_completed` (with method: google/linkedin/email)
- `onboarding_step_completed` (step number)
- `job_analyzed` (fit_level, score_range)
- `cv_generated` (template, generation_method)
- `cover_letter_generated` (tone)
- `application_created` (source, fit_level)
- `application_status_changed` (from_status, to_status)
- `interview_prep_generated`
- `plan_upgraded` (from_plan, to_plan)
- `plan_downgraded`
- `feature_limit_hit` (which limit)

### 29.3 AI Cost Tracking

- Custom PostHog events: `ai_request` (model, feature, tokens, cost_cents)
- Daily aggregation dashboard: cost per user, per feature, per model
- Alert if daily AI spend exceeds 2x projected budget

### 29.4 Uptime Monitoring

- Vercel built-in monitoring for deployment health
- External: UptimeRobot or Better Uptime (free tier) for endpoint checks
- Status page: Vercel status page or instatus.com (optional, post-MVP)

---

## 30. Growth & User Acquisition

**Decision basis:** Job search tools acquire users primarily through SEO/content, browser extensions, and word of mouth. Paid acquisition is expensive ($1.50-12/install with 80% loss in 3 days). Product-led growth with a generous free tier is the proven model.

### 30.1 Acquisition Channels (Priority Order)

| Channel | Strategy | Phase |
|---------|---------|-------|
| **SEO / Content** | SSR landing pages: "How to write a [role] resume", "Is [company] a good employer", "Resume tips for [industry]". Next.js SSG makes this native | Phase 4 |
| **Chrome Extension** | Chrome Web Store organic discovery. SEO-optimized listing. Primary CTA: "Analyze any job in 1 click" | Phase 4 |
| **Word of Mouth** | Referral program: "Give a friend 1 month Pro free, get 1 month free" | Phase 4 |
| **Social Proof** | Reddit r/resumes, r/jobs — share before/after results (with user permission). LinkedIn posts | Phase 4 |
| **Product Hunt Launch** | Launch with demo video, founder story, launch-day Pro discount | Phase 4 |
| **Career Services Partnerships** | University career centers, bootcamps — offer free Pro for students (B2B2C) | Phase 5 |
| **Content Marketing** | Blog: job search strategy, interview tips, resume guides. Establishes authority + SEO | Ongoing |

### 30.2 Retention Levers

| Lever | Implementation |
|-------|---------------|
| **Follow-up reminders** | Push/email: "You applied to Stripe 7 days ago — follow up?" |
| **Weekly digest** | Email: "This week: 3 applications, 1 interview, your insights" |
| **Outcome prompts** | "You applied to Meta 14 days ago — any update?" (updates tracker + feeds intelligence) |
| **Score improvements** | "Your average match score improved from 62 to 74 this month" |
| **New job matches** | Future: "3 new roles match your profile at 80%+" |

---

## 31. MVP Scope (Final)

### 31.1 MVP Includes (Phases 1-3)

- Authentication (Google, LinkedIn, email)
- Onboarding flow (import CV, set preferences)
- JD input (paste text, paste URL, file upload)
- Suitability analysis (two-tier: instant + deep)
- CV generation with AI tailoring
- CV editor (Plate, block-based, drag-and-drop)
- Live PDF preview + download
- Cover letter generation (4 tones)
- CV versioning
- Application tracker (table + kanban views)
- Outcome intelligence (signal interpretation)
- Basic insights dashboard (funnel, trends, AI recommendations)
- Interview preparation (question generation, STAR builder)
- Experimentation engine (user-facing, basic)
- AutoResearch loop (internal — prompt optimization from night 1, calibration from week 6+)
- Natural language feedback
- Payment integration (Stripe, 3 tiers)
- Security (RLS, encryption, prompt injection defense)
- Privacy (GDPR data export/delete)
- PWA (offline viewing, push notifications)

### 31.2 MVP Excludes (Deferred)

| Feature | Deferred To | Reason |
|---------|------------|--------|
| Browser extension | Phase 4 | Architecture planned from Phase 1, built after core stable |
| Email/mailbox integration | Phase 5 | OAuth verification complex, Nylas/Unipile when ready |
| Company intelligence | Phase 5 | Nice-to-have, not core |
| Networking/referral tracker | Phase 5 | Separate module, not critical path |
| Salary negotiation tools | Phase 5 | Post-offer feature |
| Expo mobile app (thin wrapper) | Phase 2a | App store presence from launch |
| Expo mobile app (native screens) | Phase 2b-3 | Progressive native conversion |
| Auto-apply | Never | Proven failure strategy |
| Job scraping | Never | Legal risk, no value over paste/extension |
| Advanced agents | Future | Autonomous job-search agents |

---

## 32. Build Phases (Timeline)

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project scaffolding (Next.js 15, Tailwind v4, shadcn/ui)
- [ ] Supabase setup (database, auth, storage, RLS)
- [ ] Database schema + migrations (Living Cloud tables, AutoResearch tables)
- [ ] Auth system (Google OAuth, LinkedIn OAuth, email/password)
- [ ] Onboarding flow (3 steps + Socratic profile enrichment)
- [ ] Living Profile Cloud: CV import → AI parsing → initial cloud generation
- [ ] Socratic Enrichment Engine: question generation + cloud node creation
- [ ] Design system tokens + core components
- [ ] Trigger.dev setup for background jobs
- [ ] AutoResearch: Build test bank (50 JD/CV pairs), define initial rubric, prompt versioning

### Phase 2: Core MVP (Weeks 5-10)
- [ ] JD input + parsing (text, URL, file)
- [ ] Interactive JD Matching Dialogue (anchor points + cloud matching + targeted questions)
- [ ] Suitability analysis engine (Tier 1 instant + Tier 2 deep, streaming)
- [ ] CV editor (Plate + @dnd-kit + AI suggestions)
- [ ] PDF preview (@react-pdf/renderer) + download (Puppeteer worker)
- [ ] Template system (5 templates)
- [ ] Cover letter generation (4 tones)
- [ ] CV versioning
- [ ] Application tracker (table + kanban)
- [ ] AutoResearch inner loop: activate nightly prompt optimization (runs from first night)

### Phase 3: Intelligence + Polish (Weeks 11-14)
- [ ] Outcome tracking + signal interpretation
- [ ] Insights dashboard (funnel, trends, recommendations)
- [ ] Interview preparation (questions, STAR, company briefing)
- [ ] Experimentation engine (user-facing)
- [ ] Natural language feedback
- [ ] Prompt caching + model tiering optimization
- [ ] Payment integration (Stripe, 3 tiers)
- [ ] Privacy controls (data export, account deletion)
- [ ] PWA configuration (Workbox)
- [ ] E2E testing (Playwright, critical flows)
- [ ] AutoResearch outer loop: activate rubric calibration (once 100+ outcomes exist)
- [ ] AutoResearch suitability calibration: queue for monthly (once 500+ scored outcomes)

### Phase 4: Distribution (Weeks 15-18)
- [ ] Expo mobile app — thin wrapper (WebView + native push + app store listing)
- [ ] Submit to Google Play Store + Apple App Store
- [ ] Chrome browser extension (Manifest V3)
- [ ] SEO landing pages (SSG, job search content)
- [ ] Referral program
- [ ] Product Hunt launch preparation
- [ ] Content marketing (blog, social)
- [ ] Performance optimization + monitoring setup

### Phase 5: Growth (Post-Launch)
- [ ] Email integration (Nylas/Unipile)
- [ ] Company intelligence module
- [ ] Networking/referral tracker
- [ ] Salary negotiation tools
- [ ] Career services partnerships (B2B2C)
- [ ] Expo native screens (Phase 2b-3 progressive conversion)

---

## 33. Success Metrics

### 33.1 Primary

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Interview conversion rate** | >15% of applications → interview (industry average ~10%) | applications with status=interview / total applications |

### 33.2 Secondary

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first interview | <30 days from signup | First application → first interview status |
| User retention (30-day) | >40% | Users active 30 days after signup |
| Free → Pro conversion | 5-10% | Pro subscribers / total signups |
| Weekly active users | Growing 10% week-over-week (early stage) | Users with ≥1 action per week |
| CV generation satisfaction | >4/5 rating | Post-generation "Did this capture your voice?" prompt |
| Suitability score accuracy | Score correlates with outcomes | Track if high-score apps get more interviews than low-score |

### 33.3 Business Metrics

| Metric | Target (Month 6) |
|--------|-----------------|
| MRR | $5,000 |
| Total users | 5,000 |
| Paying users | 300 |
| Churn rate | <8% monthly |
| AI cost per paying user | <$5/month |
| Gross margin | >70% |

---

## 34. Critical Product Principles (Non-Negotiable)

### 1. Brutally Honest Fit Analysis
- Never inflate suitability scores
- Clearly highlight risks and gaps with actionable mitigation
- "Skip" is a valid and valuable recommendation — it saves user time
- Show confidence levels: if JD is vague, say so

### 2. Superior CV Writing Quality
- Output must noticeably beat ChatGPT (the real competitor)
- Voice preservation via writing_samples — sound like the user, not an AI
- Focus: impact phrasing, specificity, role alignment, quantification
- Never: generic language, keyword stuffing, hallucinated achievements

### 3. Strong Memory + Feedback Loop
- Track every application and CV version with outcome linking
- Learn from weak signals (timing, channel, keywords)
- Continuously improve recommendations with more data
- Never lose historical context
- Minimum data thresholds before claiming patterns (no premature conclusions)

### 4. Privacy First
- CV data is PII — treat it as sensitive from day 1
- Users own their data — export and delete at any time
- AI providers do not train on user data (use API, not consumer products)
- Transparent about what data goes where

### 5. Sustainable Unit Economics
- AI costs must stay below 30% of revenue
- Tiered models prevent waste (don't use GPT-4o when Haiku suffices)
- Rate limits protect both the user experience and the business
- Monitor cost per user daily, alert on anomalies

---

## 35. Gap Resolution Checklist

All 27 gaps identified in the Deep Analysis Report — resolved:

| # | Gap | Resolution | Section |
|---|-----|-----------|---------|
| 1 | No authentication | Supabase Auth + Google/LinkedIn OAuth + email | §2 |
| 2 | No GDPR/CCPA | Full compliance framework + data export/delete | §19 |
| 3 | No LinkedIn integration | OAuth login + profile import + extension strategy | §2, §21 |
| 4 | No business model | 3-tier freemium: Free / Pro $19/mo / Sprint $9/wk | §23 |
| 5 | No security architecture | RLS, encryption, prompt injection defense, rate limiting | §18 |
| 6 | No browser extension | Chrome Manifest V3, Phase 4 | §21 |
| 7 | No interview preparation | JD-specific questions, STAR builder, company briefing | §13 |
| 8 | No AI cost management | Per-user limits, token budgets, model tiering, caching | §23.4 |
| 9 | No onboarding flow | 3-step flow, <2 minutes, progressive profiling | §3 |
| 10 | No API design | Full endpoint inventory + schemas + rate limits | §24 |
| 11 | No error handling | Circuit breakers, fallbacks, graceful degradation | §26 |
| 12 | No testing strategy | Vitest + Playwright + AI regression suite | §27 |
| 13 | No JD URL parsing | Text paste + URL fetch + file upload + extension (Phase 4) | §6 |
| 14 | No user acquisition | SEO, extension, referrals, Product Hunt, content | §30 |
| 15 | No mailbox security | Deferred to Phase 5 with Nylas/Unipile + OAuth design | §16 |
| 16 | No salary tools | Phase 5 | §31.2 |
| 17 | No company intelligence | Phase 5 (partial in interview prep company briefing) | §13, §31.2 |
| 18 | No networking tracker | Phase 5 | §31.2 |
| 19 | No analytics dashboard | Full dashboard with funnel, trends, AI recommendations | §15 |
| 20 | No caching strategy | Prompt caching, pgvector embeddings, TanStack Query | §17.3, §24.4 |
| 21 | No CI/CD | GitHub → Vercel pipeline with preview + E2E | §28 |
| 22 | No monitoring | Sentry + PostHog + AI cost tracking | §29 |
| 23 | No SEO strategy | SSG landing pages, content marketing, Phase 4 | §30 |
| 24 | No data export | GDPR export endpoint (ZIP download) | §19, §24.2 |
| 25 | No collaboration | Phase 5+ (coach review) | §31.2 |
| 26 | No offline support | PWA with Workbox service worker | §22 |
| 27 | No SOC 2 | Deferred, foundations in place (RLS, encryption, audit log) | §31.2 |

**All 27 gaps resolved. Spec completeness: 100%.**

---

## 36. AutoResearch Loop — Self-Improving AI Engine (Competitive Moat)

**Inspired by:** Andrej Karpathy's AutoResearch (March 2026) — an autonomous experiment loop that made 700 experiments in 2 days, found 20 optimizations, improved GPT-2 training by 11%. 66K GitHub stars. The methodology generalizes to any domain with: automatable experiments + measurable metrics + version control.

**Key insight:** AutoResearch is NOT a user-facing feature. It's an internal capability moat. Users never see it running. They just notice that JobLoop's CV generation gets better every week — that suggestions are sharper than last month — that suitability scores become weirdly accurate. ChatGPT doesn't self-improve its resume writing. JobLoop does, every night.

---

### 36.1 Architecture: Two-Speed Learning System

```
┌─────────────────────────────────────────────────────────────────────┐
│ FAST INNER LOOP — Prompt Optimization (Nightly)                      │
│                                                                      │
│ What's optimized: The AI prompts that generate CVs, cover letters,   │
│                   suitability analyses, and interview prep            │
│ Feedback speed:   Seconds (automated rubric scoring)                 │
│ Frequency:        Every night, 2 AM UTC (Trigger.dev cron)           │
│ Experiments/night: 10-30 variations                                  │
│ Cost:             $5-20/night (Haiku tier for evaluation)            │
│ Who benefits:     ALL users simultaneously (system-level improvement)│
│                                                                      │
│ The Loop:                                                            │
│   1. EXPERIMENT → AI proposes prompt modification                    │
│   2. EVALUATE  → Run against test bank, score with rubric           │
│   3. KEEP/DISCARD → Better than baseline? Keep. Worse? Revert.      │
│   4. ITERATE   → Next variation, informed by what worked            │
├─────────────────────────────────────────────────────────────────────┤
│ SLOW OUTER LOOP — Rubric Calibration (Weekly)                        │
│                                                                      │
│ What's optimized: The quality rubric itself — what "good" means      │
│ Feedback speed:   Weeks (real interview/rejection outcomes)           │
│ Frequency:        Weekly batch job (Sunday night)                     │
│ Data needed:      100+ outcomes to start, improves continuously      │
│ Who benefits:     ALL users (inner loop now optimizes for what works) │
│                                                                      │
│ The Loop:                                                            │
│   1. COLLECT  → Aggregate outcome data from all users (anonymized)   │
│   2. CORRELATE → Which rubric dimensions predict real interviews?    │
│   3. ADJUST   → Update rubric weights based on correlation strength  │
│   4. VALIDATE → Does new rubric still produce good outputs? (sanity) │
├─────────────────────────────────────────────────────────────────────┤
│ SUITABILITY CALIBRATION LOOP (Monthly)                               │
│                                                                      │
│ What's optimized: Suitability scoring weights                        │
│ Feedback speed:   Months (needs 500+ scored outcomes)                │
│ Frequency:        Monthly recalculation                              │
│ Goal:             Score predicts actual interview probability         │
│                                                                      │
│ The Loop:                                                            │
│   1. BACKTEST → Historical: did high-score apps get more interviews? │
│   2. ADJUST   → Try new weights, measure rank correlation            │
│   3. KEEP/DISCARD → If prediction accuracy improves, adopt           │
│   4. DEPLOY   → New weights applied to all future scoring            │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 36.2 Inner Loop: Prompt Optimization (Detail)

#### What Gets Optimized

Every prompt used in the system is a candidate for optimization:

| Prompt | Optimization Target |
|--------|-------------------|
| CV summary generation | Specificity, impact, voice match, keyword coverage |
| Bullet point rewriting | Metrics inclusion, action verb strength, conciseness |
| Cover letter generation | Narrative flow, company-specificity, tone accuracy |
| Suitability analysis | Risk identification accuracy, actionability of advice |
| JD parsing | Extraction completeness, skill categorization accuracy |
| Interview question generation | Relevance to JD, difficulty calibration |

#### The Quality Rubric (Multi-Dimensional)

```typescript
interface QualityRubric {
  // Each dimension scored 0-10
  specificity: number;        // Are claims specific or generic?
  metrics_count: number;      // How many quantified results per bullet?
  action_verb_strength: number; // Passive voice? Weak verbs?
  voice_match: number;        // Cosine similarity to user writing_samples (0-1 scaled to 0-10)
  keyword_coverage: number;   // Required keywords naturally present? (0-1 scaled to 0-10)
  readability: number;        // Natural prose? Or keyword-stuffed garbage?
  length_appropriateness: number; // Right length for the section type?
  no_hallucination: number;   // All claims traceable to source profile data?
  role_alignment: number;     // Content emphasizes what JD actually needs?

  // Weights (adjusted by outer loop)
  weights: {
    specificity: 0.15,
    metrics_count: 0.15,
    action_verb_strength: 0.10,
    voice_match: 0.20,       // High weight — authenticity is key differentiator
    keyword_coverage: 0.10,
    readability: 0.10,
    no_hallucination: 0.10,  // Non-negotiable minimum — hard fail below 8
    role_alignment: 0.10
  }
}
```

**Critical constraint:** `no_hallucination` has a hard floor of 8/10. Any prompt variant that hallucinates (claims not in source data) is immediately discarded regardless of other scores. This prevents the loop from optimizing toward impressive-sounding lies.

#### The Test Bank

50+ curated JD/CV pairs covering:
- 5 industries (tech, finance, healthcare, marketing, engineering)
- 3 seniority levels (junior, mid, senior)
- Various skill gaps (strong match, moderate, weak)
- Different writing styles (concise, verbose, technical, narrative)

Each pair has:
- Known "ideal" output scored by human recruiters (initial ground truth)
- Expected score range per rubric dimension
- Red flags that should never appear

#### Nightly Execution (Trigger.dev Cron)

```typescript
// trigger/autoresearch-inner-loop.ts
import { schedules } from "@trigger.dev/sdk/v3";

export const innerLoopJob = schedules.task({
  id: "autoresearch-inner-loop",
  cron: "0 2 * * *", // Every night at 2 AM UTC
  run: async () => {
    const currentBestPrompts = await getActivePrompts();
    const testBank = await getTestBank();
    const budgetRemaining = await getNightlyBudget(); // $20 cap

    for (const promptType of PROMPT_TYPES) {
      if (budgetRemaining <= 0) break;

      // 1. EXPERIMENT: AI proposes N variations
      const variations = await generatePromptVariations(
        currentBestPrompts[promptType],
        { count: 5, strategy: "targeted" } // Informed by previous failures
      );

      for (const variant of variations) {
        // 2. EVALUATE: Run variant against test bank
        const scores = await evaluateAgainstTestBank(variant, testBank, promptType);
        const compositeScore = calculateWeightedScore(scores, currentRubricWeights);

        // Hard fail check
        if (scores.no_hallucination < 8) {
          await logExperiment(variant, scores, "discarded_hallucination");
          continue;
        }

        // 3. KEEP/DISCARD
        const currentBestScore = await getCurrentBestScore(promptType);
        if (compositeScore > currentBestScore) {
          await promotePrompt(variant, promptType, compositeScore);
          await logExperiment(variant, scores, "promoted");
          // Alert: new best prompt found
          await notifyAdmin(`New best ${promptType} prompt: ${compositeScore} (was ${currentBestScore})`);
        } else {
          await logExperiment(variant, scores, "discarded_no_improvement");
        }

        budgetRemaining -= estimateCost(variant, testBank.length);
      }
    }

    // 4. ITERATE: Log summary for next night's strategy
    await generateNightlySummary();
  }
});
```

#### Variation Generation Strategy

The AI doesn't just randomly modify prompts. It uses informed strategies:

| Strategy | When Used | Example |
|----------|-----------|---------|
| **Targeted fix** | A specific rubric dimension is consistently low | "Metrics count is 4/10 — add explicit instruction: 'every bullet must include at least one number'" |
| **Example injection** | Output quality varies wildly | "Add a weak→strong transformation example to the prompt" |
| **Constraint tightening** | Outputs are too long/short/generic | "Add: 'Maximum 2 lines per bullet. No filler words.'" |
| **Structure change** | Good content but poor organization | "Reorder prompt sections: context first, then instructions, then format" |
| **Temperature exploration** | Outputs are too safe/boring | "Try temperature 0.8 for cover letters instead of 0.6" |
| **Few-shot variation** | Adding/removing/changing examples in the prompt | "Replace example 2 with a more senior-level achievement" |

---

### 36.3 Outer Loop: Rubric Calibration (Detail)

#### Why This Matters

The inner loop optimizes prompts against the rubric. But what if the rubric is wrong? What if "keyword_coverage" doesn't actually predict interviews? What if "voice_match" matters 3x more than we weighted it?

The outer loop answers: **"What does 'good' actually mean in terms of real-world outcomes?"**

#### Execution (Weekly, Sunday Night)

```typescript
// trigger/autoresearch-outer-loop.ts
export const outerLoopJob = schedules.task({
  id: "autoresearch-outer-loop",
  cron: "0 3 * * 0", // Sunday 3 AM UTC
  run: async () => {
    // Collect: All applications with known outcomes from past week
    const newOutcomes = await getRecentOutcomes({ since: "7 days" });
    const totalOutcomes = await getTotalOutcomeCount();

    // Minimum threshold check
    if (totalOutcomes < 100) {
      await log("Insufficient data for rubric calibration", { total: totalOutcomes });
      return; // Wait for more data
    }

    // For each rubric dimension, calculate correlation with positive outcomes
    const correlations = {};
    for (const dimension of RUBRIC_DIMENSIONS) {
      // Get the rubric scores that were recorded when each CV was generated
      // Correlate with outcome (interview = 1, rejection/no_response = 0)
      const r = await calculateSpearmanCorrelation(dimension, "interview_achieved");
      correlations[dimension] = r;
    }

    // Example result after 6 months:
    // { specificity: 0.32, metrics_count: 0.41, action_verb_strength: 0.15,
    //   voice_match: 0.38, keyword_coverage: 0.12, readability: 0.28,
    //   no_hallucination: 0.05 (always high, no variance), role_alignment: 0.35 }

    // Normalize correlations into new weights
    const newWeights = normalizeToWeights(correlations, {
      floor: 0.05,           // No dimension drops below 5%
      hallucination_fixed: true // no_hallucination stays hard constraint, not weighted
    });

    // Sanity check: run current test bank with new weights
    // Ensure top-scoring outputs still "feel" good (human review queue)
    const sanityResults = await runSanityCheck(newWeights);

    if (sanityResults.pass) {
      await updateRubricWeights(newWeights);
      await logCalibration(correlations, newWeights, "adopted");
      await notifyAdmin(`Rubric recalibrated. Strongest predictor: ${getStrongest(correlations)}`);
    } else {
      await logCalibration(correlations, newWeights, "failed_sanity");
      await notifyAdmin("Rubric recalibration failed sanity check — manual review needed");
    }
  }
});
```

#### Bootstrap: How to Start Without Outcome Data

The outer loop needs outcomes. On day 1, there are none. Solutions:

| Accelerator | Implementation | Timeline |
|-------------|---------------|----------|
| **Published research as initial weights** | Ladders 2023: quantified achievements +40% callbacks. Eye-tracking studies: summary is read first 80% of time. Use these as starting weights | Day 1 |
| **Expert-labeled seed data** | Pay 3-5 recruiters $500 each to score 100 CV/JD pairs: "Would you interview this person? 1-10" | Week 1-2 |
| **User history import** | Onboarding: "Upload past applications + outcomes." 50 past apps with known results = instant calibration data | Week 1+ |
| **Proxy signals before real outcomes** | Click-through on generated content (user accepts suggestion vs rejects), time spent editing (less editing = better generation) | Day 1 |

**Result:** Inner loop runs from night 1 with research-backed initial rubric. Outer loop starts calibrating as soon as 100 outcomes accumulate (~week 4-6 at 1K users applying 3x/week).

---

### 36.4 Suitability Calibration Loop (Detail)

#### Purpose

Make the suitability score PREDICTIVE. "78% match" should actually mean ~78% chance of getting past initial screening (calibrated against real outcomes over time).

#### Execution (Monthly)

```typescript
// trigger/autoresearch-suitability-calibration.ts
export const suitabilityCalibrationJob = schedules.task({
  id: "autoresearch-suitability-calibration",
  cron: "0 4 1 * *", // 1st of every month, 4 AM UTC
  run: async () => {
    const outcomes = await getAllScoredOutcomes(); // { score, got_interview }

    if (outcomes.length < 500) {
      await log("Insufficient data for suitability calibration", { total: outcomes.length });
      return;
    }

    // Current weights
    const currentWeights = await getSuitabilityWeights();
    // { skills: 0.30, experience: 0.25, semantic: 0.20, achievements: 0.15, positioning: 0.10 }

    // Generate 20 weight variations
    const variations = generateWeightVariations(currentWeights, { count: 20 });

    let bestCorrelation = await measurePredictiveAccuracy(currentWeights, outcomes);
    let bestWeights = currentWeights;

    for (const variant of variations) {
      // Recalculate all historical scores with new weights
      const recalculatedScores = await recalculateScores(outcomes, variant);
      // Measure: do higher scores predict interviews?
      const correlation = spearmanRankCorrelation(recalculatedScores, outcomes.map(o => o.got_interview));

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestWeights = variant;
      }
    }

    if (bestWeights !== currentWeights) {
      await updateSuitabilityWeights(bestWeights);
      await logCalibration({
        previous: currentWeights,
        new: bestWeights,
        correlation_improvement: bestCorrelation - await measurePredictiveAccuracy(currentWeights, outcomes),
        sample_size: outcomes.length
      });
      await notifyAdmin(`Suitability weights recalibrated. Prediction accuracy: ${bestCorrelation}`);
    }
  }
});
```

---

### 36.5 The Sparse Signal Problem — Solved

**The challenge you identified:** Job search outcomes are ~97% negative. Maybe 1-3 interviews per 100 applications. How does the loop know WHAT to improve when positive signals are this rare?

**Answer: You don't need positive signals to learn. The STRUCTURE of negatives carries information. And there are high-volume proxy signals available immediately.**

#### Signal Hierarchy (from most reliable to fastest)

```
TIER 1: OUTCOME SIGNALS (slow, reliable, sparse)
┌─────────────────────────────────────────────────────────────────────┐
│ Signal                  │ Volume │ Latency │ What It Tells You       │
├─────────────────────────┼────────┼─────────┼─────────────────────────┤
│ Got interview           │ ~3%    │ 1-4 wks │ EVERYTHING worked       │
│ Got offer               │ <1%    │ 4-8 wks │ Full pipeline success   │
├─────────────────────────┼────────┼─────────┼─────────────────────────┤

TIER 2: STRUCTURED NEGATIVE SIGNALS (medium speed, medium volume, informative)
├─────────────────────────┼────────┼─────────┼─────────────────────────┤
│ <2 day rejection        │ ~20%   │ 1-2 days│ ATS keyword mismatch    │
│   → TELLS YOU: keyword/format dimensions failed                      │
│   → INNER LOOP: optimize keyword integration + ATS formatting        │
├─────────────────────────┼────────┼─────────┼─────────────────────────┤
│ 3-10 day rejection      │ ~15%   │ 3-10 d  │ Recruiter said no       │
│   → TELLS YOU: human-readable quality failed (impact, positioning)   │
│   → INNER LOOP: optimize voice, specificity, role alignment          │
├─────────────────────────┼────────┼─────────┼─────────────────────────┤
│ >10 day rejection       │ ~10%   │ 10+ d   │ Made shortlist, lost    │
│   → TELLS YOU: fundamentally competitive, minor edge missing         │
│   → INNER LOOP: polish, not overhaul                                │
├─────────────────────────┼────────┼─────────┼─────────────────────────┤
│ No response 14+ days    │ ~50%   │ 14+ d   │ Ambiguous — ignore      │
│   → TELLS YOU: almost nothing actionable (could be many reasons)     │
│   → INNER LOOP: ignore for calibration purposes                      │
└─────────────────────────┴────────┴─────────┴─────────────────────────┘

TIER 3: PROXY SIGNALS (instant, high volume, day-1 available)
┌─────────────────────────────────────────────────────────────────────┐
│ Signal                        │ Volume    │ What It Tells You        │
├───────────────────────────────┼───────────┼──────────────────────────┤
│ User ACCEPTED AI suggestion   │ Every use │ Output quality was good  │
│ User REJECTED AI suggestion   │ Every use │ Output quality was poor  │
│ Edit distance (generated →    │ Every CV  │ Low edit = good gen      │
│   user-final version)         │           │ High edit = poor gen     │
│ Time to submit (gen → apply)  │ Every app │ Fast = confident output  │
│ User re-generated (clicked    │ Some      │ First output was bad     │
│   "try again")                │           │                          │
│ Section-level acceptance      │ Every use │ Which parts work/fail    │
│   (accepted summary, rejected │           │                          │
│    bullet 3)                  │           │                          │
│ Cloud utilization (did gen    │ Every CV  │ Is the system using the  │
│   use strongest evidence?)    │           │ cloud effectively?       │
└───────────────────────────────┴───────────┴──────────────────────────┘
```

#### How the Loop Uses Each Tier

**Inner Loop (nightly) uses Tier 3 primarily:**
- The test bank rubric is the main evaluator (automated, fast)
- BUT Tier 3 proxy signals CREATE A FEEDBACK CHANNEL: if users consistently reject a certain type of AI suggestion (e.g., "Shorten" suggestions), the test bank rubric's `length_appropriateness` dimension needs adjustment
- Proxy signals available from Day 1, at high volume (every AI interaction)
- No waiting for outcomes needed

**Outer Loop (weekly) uses Tiers 1 + 2:**
- Tier 1 (interviews) is the GOLD signal but sparse → uses it when available
- Tier 2 (structured negatives) is the WORKHORSE signal:
  - Rejection speed tells you WHICH dimension failed
  - This is 35-45% of applications (not 3%) — much higher volume than positives
  - Grouped by rejection speed → different rubric dimensions get different feedback

**The key insight:** You don't need to know "what produces interviews" (rare). You need to know "what produces fast rejections" (common) — and STOP doing that. Improvement by ELIMINATION of failure modes, not by replication of rare success.

#### Practical Example

```
Month 1 data: 500 applications across all users
├── 250 no response (ignore — uninformative)
├── 100 rejected <2 days (ATS failures)
│   └── Analysis: These CVs had 40% lower keyword_coverage scores
│       → SIGNAL: keyword optimization is failing for these roles
│       → ACTION: inner loop focuses on keyword integration improvements
├── 75 rejected 3-10 days (recruiter rejections)
│   └── Analysis: These CVs had similar keywords but lower specificity scores
│       → SIGNAL: passing ATS but not impressing humans
│       → ACTION: inner loop focuses on specificity + impact phrasing
├── 50 rejected >10 days (competitive losses)
│   └── Analysis: High quality across dimensions — lost to stronger candidates
│       → SIGNAL: nothing fundamentally wrong
│       → ACTION: minor polish, focus on differentiation
└── 25 interviews (success!)
    └── Analysis: These CVs had highest voice_match AND metrics_count
        → SIGNAL: authenticity + quantification = winning combo
        → ACTION: increase weight of these dimensions in rubric

CONCLUSION: The loop learned from ALL 500 applications:
- 250 uninformative (ignored)
- 250 informative (100 told us about ATS, 75 about recruiter appeal, 50 confirmed quality, 25 confirmed what works)
```

#### Proxy Signal Integration (Day 1, Zero Outcomes Needed)

```typescript
// Tracked on every AI interaction, fed back to inner loop weekly
interface ProxySignals {
  suggestion_acceptance_rate: number;    // % of AI suggestions user accepts
  edit_distance_ratio: number;           // 0 = no edits (perfect), 1 = complete rewrite (terrible)
  regeneration_rate: number;             // How often user clicks "try again"
  time_to_submit: number;               // Minutes from CV generation → marking as "applied"
  section_acceptance: {                  // Per-section granularity
    summary: number;                     // acceptance rate for summary suggestions
    bullets: number;                     // acceptance rate for bullet rewrites
    skills: number;                      // acceptance rate for skill ordering
    cover_letter: number;                // acceptance rate for cover letter gen
  };
  cloud_utilization: number;             // Did generated CV use top evidence from cloud?
}

// Weekly aggregation feeds back to inner loop:
// "Summary suggestions are accepted 82% of the time, but bullet rewrites only 54%.
//  The bullet rewriting prompt needs more work."
// → Next night's inner loop focuses experiments on the bullet prompt
```

#### Why This Makes the Loop VIABLE Despite Sparse Outcomes

| Concern | Resolution |
|---------|-----------|
| "Only 3% get interviews" | Tier 2 structured negatives give 35-45% informative signal (rejection speed = failure dimension) |
| "Can't A/B test with n=3 positives" | Don't need positives — learn by eliminating failure modes. What causes FAST rejection? Stop doing that |
| "What if no_response is most common?" | Ignore it. It's uninformative. Focus on the 35-45% that ARE informative |
| "How does inner loop improve without outcomes?" | Uses Tier 3 proxy signals (acceptance rate, edit distance) from Day 1. These are immediate and high-volume |
| "What if proxy signals don't correlate with real outcomes?" | Outer loop validates this correlation monthly. If acceptance_rate doesn't predict interview_rate, it's downweighted |

---

### 36.6 Safety Rails

| Risk | Mitigation |
|------|-----------|
| **Monoculture** (all CVs sound the same) | Voice match is a top-weighted dimension. Each user's writing_samples anchor their unique style. The loop optimizes structure/impact, NOT personal voice |
| **Rubric gaming** (keyword stuffing scores high) | Multi-objective with competing dimensions. Keyword coverage competes with readability. Pareto optimization, not single-metric hill climbing |
| **Runaway optimization** | Hard budget cap ($20/night). Maximum 30 experiments. Admin alerts on any >5% score jump (review before wide rollout) |
| **Hallucination reward** | `no_hallucination` is a HARD CONSTRAINT (floor: 8/10), not a weighted objective. Any variant that hallucinates is immediately discarded |
| **Regression** | Before any promoted prompt goes live, it runs against full test bank + 10 random recent real users' data (anonymized). Must beat current on ALL segments, not just average |
| **Over-confidence from small samples** | Outer loop requires minimum 100 outcomes. Suitability calibration requires 500. Bayesian priors (start with research-backed weights, update gradually) |
| **User trust** | System NEVER auto-changes a user's saved CV content. Improvements only affect FUTURE generations. Users always see "what's new" in a monthly changelog |

---

### 36.6 Data Model

```sql
-- Prompt versions (tracks the evolution)
create table public.prompt_versions (
  id uuid default uuid_generate_v4() primary key,
  prompt_type text not null, -- 'cv_summary', 'cv_bullets', 'cover_letter', 'suitability', 'jd_parsing', 'interview_questions'
  version_number integer not null,
  content text not null,     -- The actual prompt text
  composite_score numeric(5,3),
  rubric_scores jsonb,       -- Per-dimension scores against test bank
  promoted_at timestamptz,   -- When it became the active prompt
  demoted_at timestamptz,    -- When it was replaced
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Experiment log (every experiment, kept or discarded)
create table public.autoresearch_experiments (
  id uuid default uuid_generate_v4() primary key,
  loop_type text not null,   -- 'inner_prompt', 'outer_rubric', 'suitability_weights'
  prompt_type text,          -- Which prompt was being optimized (inner loop only)
  variation_strategy text,   -- 'targeted_fix', 'example_injection', etc.
  change_description text,   -- What was changed
  scores jsonb not null,     -- Rubric scores achieved
  composite_score numeric(5,3),
  baseline_score numeric(5,3),
  outcome text not null,     -- 'promoted', 'discarded_no_improvement', 'discarded_hallucination'
  cost_cents integer,
  created_at timestamptz default now()
);

-- Rubric weight history
create table public.rubric_weights_history (
  id uuid default uuid_generate_v4() primary key,
  weights jsonb not null,            -- The weight configuration
  correlations jsonb,                -- Outcome correlations that informed this
  sample_size integer,
  prediction_accuracy numeric(5,3),  -- Spearman correlation with outcomes
  active_from timestamptz default now(),
  active_until timestamptz,
  created_at timestamptz default now()
);

-- Suitability weight history
create table public.suitability_weights_history (
  id uuid default uuid_generate_v4() primary key,
  weights jsonb not null,            -- { skills: 0.30, experience: 0.25, ... }
  prediction_accuracy numeric(5,3),
  sample_size integer,
  active_from timestamptz default now(),
  active_until timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_prompt_versions_active on public.prompt_versions(prompt_type) where is_active = true;
create index idx_autoresearch_experiments_date on public.autoresearch_experiments(created_at);
create index idx_autoresearch_experiments_type on public.autoresearch_experiments(loop_type, prompt_type);
```

---

### 36.7 Observability & Admin Dashboard

Internal admin view (not user-facing):

```
┌─────────────────────────────────────────────────────────────┐
│ AUTORESEARCH DASHBOARD (Admin Only)                          │
├──────────────────┬──────────────────┬───────────────────────┤
│ INNER LOOP       │ OUTER LOOP       │ SUITABILITY           │
│                  │                  │                       │
│ Last run: 2AM    │ Last run: Sunday │ Last run: Apr 1       │
│ Experiments: 22  │ Outcomes: 2,847  │ Outcomes: 1,203       │
│ Promoted: 3      │ Status: Adopted  │ Status: No change     │
│ Discarded: 19    │                  │ (correlation stable)  │
│                  │ Top predictor:   │                       │
│ Best improvement:│ voice_match 0.38 │ Prediction accuracy:  │
│ cv_bullets +8%   │ metrics 0.41     │ Spearman r = 0.34     │
│                  │ keyword 0.12 ↓   │                       │
│ Budget used:     │                  │ Strongest weight:     │
│ $14.20 / $20     │ Weight change:   │ skills: 0.28          │
│                  │ voice ↑ keyword ↓│ experience: 0.27      │
├──────────────────┴──────────────────┴───────────────────────┤
│ SCORE TREND (composite, 30 days)                             │
│ ▁▂▂▃▃▃▄▄▄▅▅▅▅▅▆▆▆▆▆▆▇▇▇▇▇▇▇▇▇▇                           │
│ 6.2 → 7.8 (+25.8% over 30 days)                            │
├─────────────────────────────────────────────────────────────┤
│ RECENT EXPERIMENTS                                           │
│ ✓ cv_bullets: "Add XYZ format constraint" → +0.4            │
│ ✗ cv_summary: "Shorter max length" → -0.2 (discarded)       │
│ ✓ cover_letter: "Company-specific hook example" → +0.3      │
│ ✗ suitability: "Reduce experience weight" → hallucination!  │
│ ✓ cv_bullets: "Industry-specific verb list" → +0.2          │
└─────────────────────────────────────────────────────────────┘
```

---

### 36.8 Cost & ROI

| Metric | Value |
|--------|-------|
| Nightly inner loop cost | $5-20 (10-30 experiments × 50 test pairs × Haiku tier) |
| Monthly total cost | $150-600 |
| At 10K users paying $19/mo | $190K MRR |
| AutoResearch as % of revenue | <0.3% |
| Value delivered | Continuously improving output quality = lower churn, higher conversion, wider moat |

**ROI calculation:** If the loop improves CV quality enough to reduce churn by even 1% (industry SaaS churn: ~8%/month), that's worth far more than $600/month in retained revenue.

---

### 36.9 What This Means Competitively

```
Month 0: JobLoop launches with manually-tuned prompts (same as competitors)
Month 1: 30 experiments/night × 30 nights = 900 experiments. ~20 improvements found.
Month 3: 2,700 experiments. Prompts refined ~60 times. Noticeably better output.
Month 6: 5,400 experiments. Rubric calibrated against real outcomes.
         Scoring becomes predictive. Output quality measurably superior.
Month 12: 10,800 experiments. System has discovered optimizations that would
          take a human prompt engineer YEARS to find through trial and error.

Competitor trying to catch up at month 12:
- They'd need to build the same infrastructure
- Curate the same test bank
- Collect the same outcome data
- Run for the same 12 months
- By then, JobLoop is another 10,000 experiments ahead
```

**This is the moat.** Not features (copyable), not UI (copyable), not pricing (race to bottom). The moat is 10,000+ automated experiments that compound into superior AI output quality that no manual effort can replicate.

---

### 36.10 Phase Integration

| Phase | AutoResearch Activity |
|-------|---------------------|
| Phase 1 (Weeks 1-4) | Build test bank (50 JD/CV pairs). Define initial rubric from published research. Set up prompt versioning table |
| Phase 2 (Weeks 5-10) | Inner loop runs from first night after prompts are written. Immediate prompt refinement begins |
| Phase 3 (Weeks 11-14) | Outer loop starts once 100+ outcomes exist. Suitability calibration queued |
| Phase 4+ | All loops running continuously. Moat compounds daily |

### 36.11 What We Do NOT Do (Anti-Patterns)

| Anti-Pattern | Why It Fails |
|-------------|-------------|
| Auto-change user's saved CV | Destroys trust. Users must control their content |
| A/B test individual user's applications | Too slow (weeks), too noisy (confounders), too small (n=5). Dangerous bad conclusions |
| Claim causation from small samples | "Kubernetes mention increased your callbacks 50%" from n=3 is misinformation |
| Optimize for single metric | Leads to gaming (keyword stuffing if optimizing keywords alone). Multi-objective required |
| Skip human review | Admin must review promoted prompts weekly. Automated quality + human sanity check |

---

## 37. Interactive JD Matching Dialogue (Core UX Differentiator)

**What this is:** When a user pastes a JD, the system doesn't just silently score and generate. It shows its reasoning transparently and has a **short, targeted conversation** to fill gaps — co-creating the best possible application with the user.

**Why this is different from every competitor:** Teal, Jobscan, Rezi, all do: input → output (one-way). JobLoop does: input → dialogue → enriched output (collaborative). The user learns WHY their CV is being tailored a certain way. The system learns details it didn't have. Both get smarter.

**Decision basis:** AI career coaching research (Conference Board, 2026) shows conversational AI provides 90% of coaching value when asking the right questions. Socratic interaction builds user trust and produces higher-quality outputs than one-shot generation.

---

### 37.1 The Dialogue Flow

```
USER PASTES JD
     ↓
PHASE 1: Anchor Point Extraction (instant, <2 seconds)
     ↓
PHASE 2: Cloud Matching (shows what aligns + what's missing)
     ↓
PHASE 3: Targeted Questions (1-3, fills gaps)
     ↓
PHASE 4: Generation with Full Context (streamed)
```

---

### 37.2 Phase 1: Anchor Point Extraction

System identifies the JD's TRUE priorities (not just keywords — intent):

```
┌───────────���─────────────────────────────────���───────────────────────┐
│ JD ANCHOR POINTS IDENTIFIED                                          │
├───────────────────────────────��─────────────────────────────────────┤
│                                                                      │
│ This role REALLY cares about:                                        │
│                                                                      │
│ 1. ⚓ Production ML systems (mentioned 4x, in title + requirements)  │
│ 2. ⚓ Scale — "millions of transactions" (they want someone who's    │
│       handled volume, not toy projects)                              │
│ 3. ⚓ Team leadership (senior role, "mentor junior engineers")        │
�� 4. ⚓ Fraud/risk domain (specific domain expertise valued)           │
│                                                                      │
│ Secondary signals:                                                   │
│ • Python + TensorFlow (tools, not differentiators — most candidates │
│   will have these)                                                   │
│ • "Fast-paced environment" (startup energy, not corporate pace)      │
│                                                                      │
│ Red flags in this JD:                                                │
│ • "5+ years ML experience" but also "senior" — they want mid-senior │
│   not principal. Don't over-position.                                │
│                                                                      │
└────────────────���───────────────────────────────���────────────────────┘
```

---

### 37.3 Phase 2: Cloud Matching (Transparent Reasoning)

System shows what matches and what's missing — with evidence from the Living Cloud:

```
┌─────────────────���──────────────────────────��────────────────────────┐
│ YOUR PROFILE vs THIS JD                                              │
├─────────────────────────────────────────────────────────────────────┤
���                                                                      │
│ ✅ STRONG MATCHES (from your cloud):                                 │
│                                                                      │
│ ⚓ Production ML → You have: fraud detection pipeline at Stripe      │
│   (processes 10M txns/day). Evidence: STRONG ████████████            │
│   Best bullet: "Built real-time fraud detection serving 10M          │
│   daily transactions with 34% false positive reduction"              │
│                                                                      │
│ ⚓ Team leadership → You have: led 8-person team                     │
│   Evidence: STRONG (team size + metrics + award)                     │
│   Best bullet: "Led 8-person ML team delivering $2.1M savings"       │
│                                                                      │
│ ⚓ Fraud/risk domain → You have: 3 years fintech, fraud focus        │
│   Evidence: STRONG (domain match is exact)                           │
│                                                                      │
│ ⚠️  GAPS IDENTIFIED:                                                 │
│                                                                      │
│ ⚓ Scale ("millions of transactions") → Your cloud says 10M/day      │
│   BUT your current CV bullet doesn't mention the scale!              │
│   → RECOMMENDATION: Reword to include "10M daily transactions"       │
│                                                                      │
│ ⚓ Mentorship → JD says "mentor junior engineers"                     │
│   Your cloud has no mentorship evidence.                             │
│   → QUESTION INCOMING ↓                                              │
│                                                                      │
│ ⚓ TensorFlow → JD lists it. Your cloud shows PyTorch experience.    │
│   → QUESTION INCOMING ↓                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 37.4 Phase 3: Targeted Questions (1-3 max, never exhausting)

```
┌──────────────���───────────────────────────────────────────────���──────┐
│ QUICK QUESTIONS (to strengthen your application)            [1/2]    │
├───────────────────────────────��─────────────────────────────────────┤
│                                                                      │
│ 1. MENTORSHIP GAP                                                    │
│    This JD values "mentor junior engineers." I don't have            │
│    mentorship evidence in your profile.                              │
│                                                                      │
│    Have you ever:                                                     │
│    • Onboarded or trained new team members?                          │
│    • Conducted code reviews regularly?                               │
│    • Mentored anyone (even informally)?                              │
│                                                                      │
│    [Type your answer...                                    ]         │
│    [Skip — I don't have mentorship experience]                       │
│                                                                      │
│ 2. TENSORFLOW QUESTION                                               │
│    JD lists TensorFlow. Your profile shows PyTorch.                  │
│    Have you used TensorFlow at all? Even in a course or side         │
│    project? Or should we position your PyTorch as equivalent?        │
│                                                                      │
���    [I've used TF in...     ] [No TF, position PyTorch]              │
│                                                                      │
└────────────────────��────────────────────────���───────────────────────┘
```

```
USER: "I onboarded 3 new engineers last year and did weekly code reviews for the whole team"

┌─────────────────────────────────────────────────────────────────────┐
│ Got it. That's valid mentorship evidence.                            │
│                                                                      │
│ → Added to cloud: Mentorship — onboarded 3 engineers,               │
│   weekly code reviews (confidence: moderate)                         │
│                                                                      │
│ I'll include in your CV: "Mentored 3 junior engineers through        │
│ onboarding and conducted weekly code reviews across the team"        │
│                                                                      │
│ [Generating your tailored CV now... →]                               │
└───────────────────────────────────────────────���─────────────────────��
```

---

### 37.5 Phase 4: Generation with Full Context

After the dialogue, CV generation has:
- Original cloud data (deep, evidenced)
- JD anchor points (what REALLY matters, not just keywords)
- Fresh answers from dialogue (fills specific gaps for THIS role)
- Transparent reasoning (user understands every tailoring decision)

The generated CV is now:
- More specific (because the cloud has metrics, team sizes, awards)
- More relevant (because anchor points identified the JD's true priorities)
- More complete (because the dialogue filled gaps)
- More trusted (because the user participated in the reasoning)

---

### 37.6 Dialogue Rules

| Rule | Rationale |
|------|-----------|
| **Intelligent gate, not numerical limit** | System asks only when evidence gap exists AND marginal value exceeds threshold (see §4.2). Could be 0 questions or 5 — depends on cloud state |
| Only ask about GAPS the JD reveals | Don't ask generic questions — only what THIS specific JD's anchor points need |
| Always offer "Skip" | User should never feel trapped. Progress always available |
| Show WHAT you'll do with the answer | "I'll add this to your mentorship evidence and include in the summary" |
| Pre-fill when possible | "Your cloud suggests X — is this right?" (confirm, not blank question) |
| Answers enrich the cloud permanently | New evidence is stored for ALL future applications, not just this one |
| If cloud already has everything | Skip dialogue entirely — go straight to generation. "Your profile fully covers this JD!" |
| Threshold rises with user behavior | Users who skip often get asked less. Users who give detailed answers get asked more (but only when valuable) |
| System gets quieter over time | Natural consequence: as cloud matures, fewer gaps exist, fewer gates pass → fewer questions. Application #20 in the same domain = probably zero questions |

---

### 37.7 When Dialogue is Skipped (Auto-Generate)

If the Living Cloud already has strong evidence for ALL JD anchor points:

```
┌─────────────────────────────────────────────────────────────────────┐
│ PERFECT MATCH — No questions needed                                  │
│                                                                      │
│ Your profile already covers all anchor points with strong evidence:  │
│ ✅ Production ML (10M txns/day, 3 years)                             │
│ ✅ Team leadership (8 people, $2.1M impact, award)                   │
│ ✅ Fraud domain (exact match, 3 years)                               │
│ ✅ Mentorship (3 engineers onboarded — from your last application)   │
│                                                                      │
│ Generating tailored CV now...                                        │
└─────────���───────────────────────────────────────────────────────────┘
```

The dialogue becomes shorter and less frequent as the cloud matures. First applications: 2-3 questions. After 10 applications in the same domain: usually 0 questions (cloud is complete for that role type).

---

### 37.8 The Reword Suggestion Pattern

When the cloud HAS the evidence but the CV doesn't USE it effectively:

```
┌─────────────────��───────────────────────────��───────────────────────┐
│ REWORDING SUGGESTION                                                 │
├──────────────────────────────────��───────────────────────���──────────┤
│                                                                      │
│ Your current bullet:                                                 │
│ "Worked on the fraud detection system"                               │
│                                                                      │
│ But your cloud has evidence for something MUCH stronger:             │
│ • Team size: 8 people (you LED this)                                 │
│ • Scale: 10M transactions/day                                        │
│ • Impact: 34% FP reduction, $2.1M savings                           │
│ • Award: Engineering Excellence Q3                                   │
│                                                                      │
│ Suggested reword (using YOUR evidence):                              │
│ "Led 8-person team to redesign fraud detection pipeline processing   │
│  10M daily transactions, reducing false positives by 34% and saving  │
│  $2.1M annually — awarded Engineering Excellence Q3 2025"            │
│                                                                      │
│ This JD specifically values: scale ⚓ + leadership ⚓ + domain ⚓      │
│ All three are now visible in one bullet.                             │
│                                                                      │
│ [Accept ✓]  [Modify]  [Keep original]                               │
│                                                                      │
└───────────────────────────────────────────────���─────────────────────┘
```

---

### 37.9 Data Flow

```
JD Analysis triggers dialogue
     ↓
User answers enrich Living Cloud (permanent)
     ↓
Enriched cloud feeds CV generation (immediate use)
     ↓
Same evidence available for ALL future applications
     ↓
Over time: fewer questions needed (cloud is mature)
     ↓
Outcome data feeds back: "Which evidence resonated for similar roles?"
     ↓
Future dialogues become smarter: "Last time for a similar role,
  highlighting [X] led to an interview. Want to emphasize that again?"
```

---

### 37.10 Why This Is a Moat

| Dimension | Competitors | JobLoop |
|-----------|------------|---------|
| Profile depth | Flat CV text | Multi-dimensional cloud with evidence chains, confidence levels, transferability links |
| JD analysis | Score + keywords | Anchor point extraction + transparent reasoning + gap identification |
| User interaction | Paste → get output (one-way) | Dialogue → co-creation → enriched output (collaborative) |
| Learning over time | None — same shallow profile forever | Cloud grows with every interaction. 10th application is 10x better than 1st |
| Trust | "AI wrote something, hope it's good" | "AI showed me WHY it made each choice, I confirmed the evidence" |
| Evidence quality | Whatever was on the CV | Interrogated, quantified, verified, with proof chains |

**The compounding effect:** After 20 applications with dialogues, the user's Living Cloud has:
- Every achievement fully evidenced (metrics, team sizes, awards)
- Cross-domain transferability mapped
- Skill confidence levels calibrated through repeated confirmation
- STAR stories pre-built for interview prep
- Voice patterns deeply understood

At that point, generating a new tailored CV takes seconds with zero questions — because the cloud already knows everything. **The product gets EASIER to use over time, not harder.** This is the opposite of most SaaS tools (which add complexity).
