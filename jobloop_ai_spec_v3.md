# JobLoop AI — Final MVP Specification (v2)

---

## 1. Product Definition

JobLoop AI is an AI-assisted job search system that:

- Analyzes job suitability BEFORE applying
- Generates ATS-optimized, role-specific CVs
- Produces high-impact cover letters
- Tracks every application and CV version
- Learns from outcomes and improves strategy

Goal:
Maximize interview conversion through intelligent positioning and continuous learning.

---

## 2. Core System Layers

### 2.1 Base Profile (Stable)

- Master CV
- Skills inventory
- Project/achievement bank
- Role categories
- Constraints (location, salary, visa)

---

### 2.2 Adaptive Layer (Per Job)

- Summary
- Bullet emphasis
- Skills ordering
- Keywords
- Cover letter tone

---

## 3. Suitability Analysis Engine (Core Feature)

### Purpose:
Determine whether the user should apply and how.

---

### 3.1 Evaluation Parameters

#### 1. Skills Match
- Required vs optional
- Evidence depth

#### 2. Experience Alignment
- Domain relevance
- Role similarity
- Years of experience

#### 3. Semantic JD Match
- LLM-based intent matching

#### 4. Achievement Strength
- Quantification
- Impact level

#### 5. Positioning Fit
- How profile is presented vs JD expectation

---

### 3.2 Output Format

#### Fit Level:
- Strong Fit
- Moderate Fit
- Weak Fit

#### Strengths:
- Key aligned areas

#### Risks:
- Gaps and mismatches

#### Recommendation:
- Apply
- Apply with repositioning
- Skip

---

## 4. CV Generation System

### Features:

- ATS-compliant formatting
- JD-aligned keyword integration
- Impact-focused rewriting
- Role-specific tailoring

---

### 4.1 Writing Enhancements

- Weak bullet detection
- Generic language removal
- Impact amplification
- Action verb optimization

---

### 4.2 Grammar Layer

- Integrated grammar checker (Grammarly-style API or open-source equivalent)
- Ensures:
  - correctness
  - clarity
  - tone consistency

---

## 5. Cover Letter Engine

- JD-specific
- Role-aligned narrative
- Tone options:
  - Professional
  - Assertive
  - Technical

---

## 6. CV Versioning

Each application stores:

- cv_version_id
- base_version_id
- job_id
- change_summary
- timestamp

---

## 7. Application Tracker

Stores:

- job_id
- company
- role
- source
- applied_date
- cv_version_id
- status
- response_time

---

## 8. Outcome Intelligence

### Outcome Types:

| Type | Interpretation |
|------|--------------|
| <2 days rejection | ATS mismatch |
| 3–10 days | recruiter screening |
| >10 days | competition |
| no response 14+ | weak negative |
| interview | strong positive |

---

## 9. Experimentation Engine

Tracks:

- CV variations
- changes made
- performance

Rules:

- One major change at a time
- Minimum sample threshold

---

## 10. Natural Language Feedback

User input → structured signals

Example:

"LinkedIn not working, focus embedded"

→ channel_issue: LinkedIn  
→ positioning_shift: embedded  

---

## 11. Mailbox Integration

- Gmail/Outlook sync
- Detect:
  - rejections
  - interview invites
- Auto-update tracker

---

## 12. Insight Engine

Outputs:

- What works
- What fails
- What to change

---

## 13. Frontend UX

### Screen 1: Job Input
- Paste JD / link
- Select CV

---

### Screen 2: Suitability Analysis

Displays:

- Fit Level
- Strengths
- Risks
- Recommendation

---

### Screen 3: CV + Cover Letter

- Editable CV
- Version control
- Tone selector
- Impact feedback

---

### Screen 4: Tracker

Simple application table

---

### Screen 5: Insights

- Trends
- Performance signals

---

## 14. AI Usage

Used for:

- JD parsing
- CV generation
- rewriting
- insight explanation

---

## 15. Tech Stack

Frontend:
- Next.js
- Tailwind

Backend:
- Supabase

AI:
- OpenAI / Claude

---

## 16. MVP Scope

Include:

- Suitability analysis
- CV generation
- cover letter generation
- tracker
- insights

Exclude:

- auto apply
- scraping
- advanced agents

---

## 17. Key Differentiator

System answers:

- Should I apply?
- How strong is my position?
- What should I change?
- What worked before?

---

## 18. Success Metric

Primary:
- Interview conversion rate

Secondary:
- Time to first interview

---

## 19. Future

- deeper analytics
- automation
- company intelligence


---

## 20. Critical Product Principles (Non-Negotiable)

To ensure real market success, the system MUST adhere to the following:

### 1. Brutally Honest Fit Analysis
- Do not inflate suitability
- Clearly highlight risks and gaps
- Allow user to make informed decisions

### 2. Superior CV Rewriting Quality
- Output must be noticeably better than generic LLM tools (e.g., ChatGPT)
- Focus on:
  - impact phrasing
  - specificity
  - role alignment
- Avoid generic or templated language

### 3. Strong Memory + Feedback Loop
- Track every application and CV version
- Learn from weak signals (no response, timing, channel)
- Continuously improve recommendations
- Never lose historical context

These principles are essential for differentiation and product success.
