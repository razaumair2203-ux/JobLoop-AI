# Rezi, Careerflow, Jobright -- UI/UX Exhaustive Research

---

## 1. REZI (rezi.ai)

4.3M+ users. Forbes' Top Pick. ATS-focused resume builder with AI scoring.

### Brand & Color
- Primary: **Green** (logo, CTAs, highlights)
- Dark mode launched 2025
- Tone: Technical, minimal, utilitarian. "Ugly but effective"

### Resume Editor -- Three-Column
- **Left:** Section nav tabs (Contact, Summary, Experience, Education, Skills, etc.)
- **Center:** WYSIWYG editing (Word/Docs feel), AI Writer button inline with text fields
- **Right:** Live resume preview, real-time updates
- Section-by-section guided workflow via tabs
- Three inline AI tools: AI Writer, AI Editor, AI Summary Writer
- Auto-formatting adjusts font/spacing to fit template
- Cannot drag-and-drop sections

### Rezi Score (0-100)
- Target: 90+ recommended
- Updates in real-time (within 5 seconds)
- **5 scoring dimensions:** Content, Format, Optimization, Best Practices, Application Ready
- **23 individual audit criteria**
- **Color alerts:** Red (urgent), Yellow (mid-priority), Green (passing)
- **Keyword priority:** Score 3 (strict), Score 2 (preferred), Score 1 (optional)
- Scorecard/checklist hybrid -- each criterion shows pass/fail + fix text

### Real-Time Analysis Sidebar
- Runs continuously during editing
- Checks: missing punctuation, filler words, lack of measurable results
- Grammarly-like inline approach

### Templates
- Only 5 format families: Standard, Compact, Modern + 2 others
- Single-column "gold standard" for ATS
- 12 accent colors, no multi-column, no photos

### Dashboard
- Card grid of resumes + cover letters, no analytics, no job tracking

### STEAL: Section-by-section guided editing, real-time score updates, dark mode, inline AI buttons
### EXPLOIT: Only 5 templates, clunky interface, ugly design, no job tracking, no evidence trail

---

## 2. CAREERFLOW (careerflow.ai)

1M+ users. Co-founded by Meta/Amazon engineers. "Career Copilot."

### Brand & Color
- Primary: **Blue** (professional, trust)
- Higher design maturity than Rezi -- "clean, features integrate well"
- Big Tech engineering polish

### Command Center Dashboard (Signature)
- Widget-based: application status counts, recent activity, analytics, quick actions, follow-up reminders
- Analytics widgets: application trends, success rates by source, response rates, time-to-response
- AI pattern detection: which roles/companies respond favorably
- Classic SaaS dashboard (Notion/Linear vibes)

### Job Tracker (Kanban)
- Columns: Saved -> Applied -> Interviewing -> Offer -> Rejected/Archived
- **Cannot customize stages** (locked defaults)
- Cards: company logo, title, date, source, status, notes, contacts
- Right-side detail panel: activity timeline, contacts (with email), documents, notes, salary benchmarks, interview prep, follow-up reminders
- Chrome extension saves from 45+ platforms

### LinkedIn Profile Optimizer (Chrome Extension) -- DISTINCTIVE
- Right-side sidebar overlay ON LinkedIn itself
- **Score: 0-100** across 14 profile sections
- Section indicators: Green checkmark (optimized), Red stop (urgent), Yellow (recommended)
- Per-section: checklist, WHY explanation, step-by-step HOW, AI rewrite suggestions
- Eliminates context switching

### AI Resume Builder
- 11 templates (professional, minimalist, primarily B&W)
- **CRITICAL FLAW: AI applies edits DIRECTLY without asking approval**
- Templates are plain, "core resume-building experience feels underdeveloped"

### Networking/CRM
- Contact tracker, LinkedIn import, follow-up reminders, email outreach

### Pricing: Free (10 jobs), Premium $23.99/mo

### STEAL: Widget dashboard, analytics, LinkedIn overlay, contact CRM, activity timelines
### EXPLOIT: AI auto-edits without consent, locked Kanban stages, underdeveloped resume builder, cold start analytics problem

---

## 3. JOBRIGHT (jobright.ai)

500K+ users. US-only. Mobile-first (iOS + Android).

### Brand & Color
- Primary: **Blue**
- "Clean and easy to navigate"
- Mobile-first with dedicated apps

### Orion AI Copilot (Chat Interface) -- Signature
- ChatGPT-style: user messages right, Orion left, message bubbles
- Pre-loaded prompt suggestions
- One-click "deep dive into fit" per job listing
- Streaming text responses
- Can do: resume audit, interview prep, company research, fit analysis, cover letters, career guidance
- References user's resume + specific job listings

### Job Match Feed (Core Screen)
- Scrollable card feed (Indeed/LinkedIn style + AI scoring)
- Card elements: company logo, title, **0-100 match score prominently displayed**, location, salary, applicant count, freshness
- 400K+ new jobs daily
- Filters: remote/hybrid, seniority, salary, location, job type, sort by score/date

### Resume Builder
- AI-generated tailored resumes per job
- ATS keywords
- User complaints: "poor-quality resumes," AI "isn't polished"

### Application Tracker
- Applied -> In Review -> Interviewing -> Offer Received
- Auto status updates (unreliable)
- Integrated with job feed

### Insider Connections
- Contact recommendations per company (alumni, recruiters)
- Outreach templates

### Pricing: Free (limited credits), Turbo $29.99/mo

### STEAL: One-click fit analysis, pre-loaded prompts, mobile app, insider connections concept
### EXPLOIT: Generic chat UI, opaque 0-100 scores, unreliable auto-apply, poor resume quality, text-wall responses

---

## CROSS-COMPETITOR PATTERNS

### All Three Use 0-100 Scores, But For Different Things
- Rezi: scores RESUME quality
- Careerflow: scores LINKEDIN PROFILE
- Jobright: scores JOB-TO-YOU FIT
- **All are opaque. All create anxiety. JobLoop's no-score evidence model is genuinely differentiated.**

### Universal Color Coding
- Red = problems, Yellow = warnings, Green = success
- **JobLoop uses emerald/sky/amber -- NEVER red for fit**

### AI Presentation Spectrum
- Rezi: Inline buttons (invisible until needed)
- Careerflow: Background AI (auto-applies -- BAD)
- Jobright: Dedicated chat companion (always visible)
- **JobLoop: Structured Socratic cards (not chat, not auto-apply)**

### Layout Architecture (All Three)
- SaaS dashboard: top nav + left sidebar + main content
- Card-based info display
- Form-based resume editors
- Sidebar panels for scoring/analysis
