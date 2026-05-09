# JobLoop AI — Deep Analysis Report

**Date:** 2026-04-27 | **Based on:** jobloop_ai_spec_v3.md (v2)
**Method:** Parallel deep research across 4 dimensions — market, tech, frontend, spec gaps

---

## EXECUTIVE SUMMARY

JobLoop AI has a **strong core concept** — the "should I apply?" suitability engine is genuinely differentiated. Most competitors are either resume builders OR trackers OR auto-apply bots. None combine honest fit analysis + intelligent CV generation + outcome learning in one system.

However, the spec has **27 identified gaps** across 8 categories, including 5 critical blockers. The frontend architecture is undefined. The business model is missing. Key integrations (LinkedIn, browser extension) that competitors rely on for survival are absent. The tech stack choice is mostly sound but needs adjustments for AI workloads.

**Bottom line:** The idea is viable and positioned in a real market gap. But the spec is at ~40% completeness for an MVP. This report provides what's needed to get to 100%.

---

## 1. MARKET REALITY CHECK

### 1.1 Market Size & Timing
- AI recruitment market: **$752M in 2026**, projected $1.39B by 2035
- 97% of Fortune 500 use ATS; 87% of companies use AI in recruiting
- Market is fragmented — no dominant player owns the full workflow
- **Timing is good**: subscription fatigue is pushing users toward all-in-one tools

### 1.2 Competitor Landscape (Real Data)

| Tool | What It Does | Price | Rating | Fatal Weakness |
|------|-------------|-------|--------|----------------|
| **Teal HQ** | Resume builder + tracker + Chrome extension | $29/mo | Good | AI content still generic |
| **Jobscan** | ATS score optimizer | $49.95/mo | 3.6/5 Sitejabber | Analyzer only, no builder |
| **Kickresume** | Template-based CV builder | $8-24/mo | 4.6/5 | No tracking, no analysis |
| **Rezi.ai** | ATS-focused resume builder | $29/mo or $149 lifetime | 4.5/5 | AI output "not employer-ready" |
| **Careerflow** | LinkedIn optimizer + tracker | $23.99/mo | Mixed | 60% autofill accuracy on Workday, Taleo incompatible |
| **Huntr** | Job tracker + Chrome extension | $30-40/mo | Good | Expensive for a tracker |
| **Jobright.ai** | Full copilot + matching | $39.99/mo | Mixed | AI hallucinations, billing complaints |
| **Simplify** | Chrome autofill + tracker | $39.99/mo | 4.9/5 Chrome | AI output "too generic" |
| **LazyApply** | Mass auto-apply | $99-249/mo | **2.1/5 Trustpilot** | Spam strategy, 14K apps → mostly rejections |
| **LoopCV** | Auto-apply bot | €29-49/mo | Poor | 1 interview from 700 auto-apps |
| **Sonara** | Background auto-apply | $20-80/mo | Poor | **Applied with wrong user's resume** |

### 1.3 What the Market Proves

**Auto-apply is a losing strategy.** Users who send 700 automated applications get worse results than those who send 200 targeted ones. ATS semantic matching in 2026 catches generic resumes. This validates JobLoop's quality-over-quantity approach.

**The "75% rejected by ATS" stat is debunked.** Every competitor markets with it, but it traces to a defunct company (Preptel, 2013) with no methodology. There is no real "ATS score" — Greenhouse, Lever, Workday don't output scores to candidates. Tool-specific scores are proxies, not reality.

**The authenticity crisis is real.** Employers actively detect AI-generated resumes. Mid-career and senior job seekers are rejecting AI-written content. The tools that win help users sound like *better versions of themselves*, not like ChatGPT.

### 1.4 JobLoop's Competitive Position

| Dimension | JobLoop Advantage | Risk |
|-----------|------------------|------|
| Suitability analysis before applying | **Unique** — no competitor does honest pre-apply fit assessment | Must be genuinely honest, not score-inflating |
| Quality over quantity | **Aligned with market shift** away from auto-apply spam | Users may still want volume |
| Outcome learning loop | **Unique** — no competitor tracks what worked and adapts | Needs significant data before value shows |
| CV generation quality | Strong differentiator IF output beats ChatGPT | Most competitors' AI is "not employer-ready" — same risk |
| End-to-end workflow | Moderate — covers analysis through tracking | Missing interview prep, networking, salary tools |

### 1.5 The Real Competitive Threat

**It's not other tools — it's ChatGPT + Google Docs.** Many users discover that free ChatGPT achieves 80% of what paid tools offer. JobLoop must deliver value that a raw LLM conversation cannot: persistent memory, structured analysis, version tracking, outcome intelligence, and workflow integration.

---

## 2. SPEC WEAK POINTS & GAPS

### 2.1 CRITICAL Gaps (5) — Must fix before any code

| # | Gap | Why It's Critical |
|---|-----|-------------------|
| 1 | **No authentication system** | Can't have users without auth. Need OAuth (Google, LinkedIn), email/password, multi-device sync |
| 2 | **No data privacy/GDPR/CCPA** | CV data is dense PII (name, address, phone, employment, education, visa). Legal liability without compliance. Fines up to €20M |
| 3 | **No LinkedIn integration strategy** | LinkedIn is THE professional platform. Need at minimum: OAuth login, profile import, browser extension for JD extraction |
| 4 | **No business model/pricing** | Zero mention of monetization. AI costs $0.05-0.20 per analysis — uncontrolled usage = financial ruin |
| 5 | **No security architecture** | No RLS, encryption, prompt injection defense, API key management. CV breach = identity theft kit |

### 2.2 HIGH Gaps (10) — Needed for competitive viability

| # | Gap | Impact |
|---|-----|--------|
| 6 | **No browser extension** | Primary distribution channel for competitors (Teal, Huntr, Simplify). Also the best UX for "analyze this job" |
| 7 | **No interview preparation** | Every competitor offers post-application support. Spec ends at "applied" |
| 8 | **No AI cost management** | Power user doing 20 analyses/day = $600+/month in API costs |
| 9 | **No onboarding flow** | Spec starts at "Screen 1: Job Input" with no setup, import, or profile creation |
| 10 | **No API design** | No endpoints, schemas, rate limiting, versioning defined |
| 11 | **No error handling strategy** | AI APIs fail. What happens? No fallbacks, retries, circuit breakers |
| 12 | **No testing strategy** | AI output is non-deterministic — needs regression testing, scoring validation |
| 13 | **No JD URL parsing strategy** | "Paste JD / link" — but how do links work? Scraping is legally risky |
| 14 | **No user acquisition plan** | How do users discover JobLoop? No SEO, content, referral, or distribution strategy |
| 15 | **No mailbox security design** | Gmail/Outlook sync mentioned but no OAuth scopes, consent, data minimization |

### 2.3 MEDIUM Gaps (10) — Product maturity

| # | Gap |
|---|-----|
| 16 | No salary negotiation tools |
| 17 | No company research/intelligence |
| 18 | No networking/referral tracking |
| 19 | No visual analytics dashboard design |
| 20 | No caching strategy |
| 21 | No CI/CD plan |
| 22 | No monitoring/analytics (APM, user analytics, AI cost tracking) |
| 23 | No SEO strategy for organic growth |
| 24 | No data export/portability |
| 25 | No collaboration features (coach review) |

### 2.4 LOW Gaps (2)

| # | Gap |
|---|-----|
| 26 | No offline support |
| 27 | No SOC 2 roadmap |

---

## 3. TECH STACK — VERDICT & RECOMMENDATIONS

### 3.1 What the Spec Got Right

| Choice | Verdict | Notes |
|--------|---------|-------|
| **Next.js** | KEEP | Largest ecosystem, best AI SDK integration, good hiring pool. App Router is stable in 2026 |
| **Tailwind CSS** | KEEP | v4 with CSS-variable theming is the standard. Perfect for design token architecture |
| **Supabase** | KEEP (with additions) | PostgreSQL is ideal for relational job/application data. Auth, storage, RLS are solid |
| **OpenAI / Claude** | KEEP (use both strategically) | Different models for different tasks |

### 3.2 What the Spec Got Wrong / Missing

| Issue | Problem | Solution |
|-------|---------|----------|
| **Supabase Edge Functions for AI** | 200ms CPU limit, 60s wall clock. Cannot orchestrate multi-step AI workflows | Add **Trigger.dev** for background AI jobs |
| **No background job system** | AI analysis takes 5-30s. Can't block the UI | Trigger.dev: purpose-built for AI workflows, no timeouts, TypeScript |
| **No vector search** | Suitability matching needs embeddings | Add **pgvector** (Supabase native) for instant preliminary matching |
| **No PDF generation strategy** | CV builder needs PDF export. Complex problem | **@react-pdf/renderer** for client preview + Puppeteer worker for final download |
| **"OpenAI / Claude" is too vague** | Different models have 10-20x cost differences | Tiered model strategy (see below) |
| **No email integration plan** | Gmail/Outlook mentioned, no design | **Defer to post-MVP**. Use Nylas/Unipile when needed ($0.50-1/connected account/month) |

### 3.3 Recommended Final Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  Next.js 15+ (App Router) + Tailwind CSS v4                │
│  shadcn/ui + Radix UI (components)                          │
│  Plate editor (CV editing) + @dnd-kit (drag-and-drop)       │
│  TanStack Query v5 (server state) + Zustand (client state)  │
│  Zundo (undo/redo) + React Hook Form + Zod (forms)          │
│  @react-pdf/renderer (PDF preview)                          │
├─────────────────────────────────────────────────────────────┤
│                      BACKEND                                 │
│  Supabase: PostgreSQL + Auth + Storage + Realtime + RLS     │
│  pgvector: embedding-based job matching                      │
│  Trigger.dev: AI workflow orchestration + background jobs    │
│  Puppeteer worker: final PDF generation (dedicated service)  │
├─────────────────────────────────────────────────────────────┤
│                      AI LAYER                                │
│  Fast tier:  Claude Haiku / GPT-4o-mini  ($0.007-0.010/req) │
│    → JD parsing, quick suitability scores, classification    │
│  Quality tier: Claude Sonnet / GPT-4o    ($0.085-0.119/req) │
│    → CV rewriting, cover letters, deep analysis              │
│  Cache tier: pgvector embeddings (free after initial embed)  │
│    → Instant preliminary matching, no API call needed        │
│  Batch tier: OpenAI/Claude Batch API (50% discount)          │
│    → Nightly portfolio re-scoring                            │
│  Framework: Vercel AI SDK + LiteLLM (model switching)        │
├─────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE                          │
│  Hosting: Vercel (MVP) → Cloudflare/self-hosted (scale)     │
│  Monitoring: Sentry (errors) + PostHog (analytics)           │
│  PDF worker: Railway/Render ($7-25/mo)                       │
│  Mobile: PWA first → React Native if needed                  │
│  Browser extension: Chrome (Manifest V3)                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 AI Cost Model (Real Numbers)

**Per full analysis cycle:** ~12,500 input tokens + ~5,400 output tokens

| Scale | AI Cost/mo | Supabase | Hosting | Total |
|-------|-----------|----------|---------|-------|
| 1K users, 5K analyses | $35-60 | $25-40 | $20 | **$80-120/mo** |
| 10K users, 50K analyses | $350-600 | $50-100 | $100-200 | **$550-1,000/mo** |
| 100K users, 500K analyses | $3,500-6,000 | $150-400 | $200-500 | **$4,050-7,400/mo** |

**AI costs dominate at every scale.** The tiered model strategy (cheap models for scoring, expensive for writing) + prompt caching (90% discount on cached tokens) + batch processing (50% discount) can cut costs 40-60%.

---

## 4. FRONTEND ARCHITECTURE — THE WEAK POINT, SOLVED

### 4.1 The Problem

The spec lists 5 screens with 1-2 bullet points each. No component architecture, no state management, no design system, no responsive strategy, no PDF pipeline, no AI UX patterns.

### 4.2 Recommended Architecture

#### Design System: shadcn/ui + Tailwind v4

- Copy-paste components (you own the code, full customization)
- Built on Radix UI primitives (accessibility, keyboard nav, focus management)
- Tailwind v4 CSS-variable theming for dark mode and brand tokens
- Desktop-first design, mobile-adaptive (job seekers create on desktop, check on mobile)

#### CV Editor: Plate (block-based editor)

- Built on Slate.js + shadcn/ui native integration
- 50+ plugins, AI integration ready
- Block-based architecture maps to CV sections (experience, education, skills)
- Drag-and-drop section reordering via @dnd-kit
- Split-pane editor on desktop (edit left, PDF preview right)
- Toggle mode on mobile (edit OR preview)

#### State Management: Layered Approach

| Layer | Tool | What It Manages |
|-------|------|----------------|
| Server state | **TanStack Query v5** | API data, AI results, user profile, saved jobs |
| Client state | **Zustand + Immer** | CV editor state, active template, UI preferences |
| Undo/Redo | **Zundo** | CV editing history (last 50 states, <700 bytes) |
| Forms | **React Hook Form + Zod** | CV sections, job submission, settings |
| Data tables | **TanStack Table** | Application tracker (headless, sortable, filterable) |

#### PDF Generation: Dual Layer

1. **Client-side preview** — @react-pdf/renderer for instant live preview as user edits
2. **Server-side final** — Puppeteer on dedicated worker for pixel-perfect download PDF

**ATS compliance rules (non-negotiable):**
- Standard fonts only (Calibri, Arial, Garamond, Georgia, Times New Roman)
- Single-column layout (multi-column breaks ATS linear parsing)
- No images for text, no tables, no skill bars/charts
- Standard section headings: "Experience", "Education", "Skills"
- Selectable text (never render text as image paths)
- 0.5"+ margins, 10-12pt body, 14-16pt headings

#### AI UX Patterns

| Pattern | Implementation |
|---------|---------------|
| **Streaming responses** | Server-Sent Events (SSE) — tokens appear progressively |
| **Progressive suitability** | Layer 1: instant score badge → Layer 2: category breakdown → Layer 3: deep dive |
| **AI inline diffs** | Show additions green, removals red, accept/reject buttons |
| **Confidence indicators** | High/Medium/Low on each AI suggestion |
| **Stop generating button** | Always provide escape hatch during streaming |
| **Loading hierarchy** | Streaming text > Skeleton screens > Stage labels > Never spinners |

### 4.3 Screen-by-Screen Architecture

```
┌─────────────────────────────────────────────────────────┐
│ SCREEN 0: ONBOARDING (NEW — missing from spec)          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Step 1: Sign up (Google/LinkedIn OAuth or email)    │ │
│ │ Step 2: Import profile (LinkedIn or upload CV)      │ │
│ │ Step 3: Set preferences (roles, location, salary)   │ │
│ │ Step 4: First value moment (analyze a saved job)    │ │
│ └─────────────────────────────────────────────────────┘ │
│ Goal: Show value within 2 minutes. Max 3 required steps │
├─────────────────────────────────────────────────────────┤
│ SCREEN 1: DASHBOARD (NEW — missing from spec)           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ Active Apps  │ │ Recent Score │ │ Quick Actions    │ │
│ │ Pipeline     │ │ Trend Chart  │ │ + New Analysis   │ │
│ └──────────────┘ └──────────────┘ │ + Edit CV        │ │
│                                    │ + View Insights  │ │
│                                    └──────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ SCREEN 2: JOB ANALYSIS (spec Screen 1+2 combined)      │
│ ┌─────────────────────┐  ┌────────────────────────────┐│
│ │ Input Panel         │  │ Results Panel              ││
│ │ - Paste JD / URL    │  │ - Fit badge (78% match)    ││
│ │ - Select base CV    │  │ - Strengths (green)        ││
│ │ - Or browser ext    │  │ - Risks (red)              ││
│ │   trigger           │  │ - Recommendation           ││
│ │                     │  │ - "Generate CV" CTA        ││
│ └─────────────────────┘  └────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ SCREEN 3: CV EDITOR (spec Screen 3, enhanced)           │
│ ┌──────────────────────┐ ┌───────────────────────────┐ │
│ │ Plate Block Editor   │ │ Live PDF Preview          │ │
│ │ - Drag sections      │ │ - @react-pdf/renderer     │ │
│ │ - AI suggest button  │ │ - Template selector       │ │
│ │ - Inline AI diffs    │ │ - Download PDF            │ │
│ │ - Version history    │ │ - ATS score indicator     │ │
│ └──────────────────────┘ └───────────────────────────┘ │
│ Bottom: Cover letter tab (same editor, different mode)  │
├─────────────────────────────────────────────────────────┤
│ SCREEN 4: APPLICATION TRACKER (spec Screen 4, enhanced) │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ TanStack Table: sortable, filterable, searchable    │ │
│ │ Columns: Company | Role | Status | Applied | Score  │ │
│ │ Kanban toggle view (Applied→Screen→Interview→Offer) │ │
│ │ Click row → detail panel with CV version, timeline  │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ SCREEN 5: INSIGHTS (spec Screen 5, enhanced)            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ Funnel       │ │ Response by  │ │ What's Working   │ │
│ │ Visualization│ │ Channel/Role │ │ AI Recommendations│ │
│ └──────────────┘ └──────────────┘ └──────────────────┘ │
│ Cards: avg response time, best channel, top skills gap  │
├─────────────────────────────────────────────────────────┤
│ SCREEN 6: INTERVIEW PREP (NEW — missing from spec)      │
│ - Generated questions from specific JD                  │
│ - STAR response builder using achievement bank          │
│ - Company research briefing                             │
│ - Mock interview mode (future)                          │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Mobile Strategy

**User behavior data (2026):**
- 90% of job seekers use mobile during their search
- But mobile users complete 53% fewer applications
- 40-70% of job applications submitted on mobile (varies by industry)

**Conclusion:** Mobile = browse and check. Desktop = create and apply.

**Recommended approach:** PWA (Progressive Web App) first.

| Feature | Desktop | Mobile (PWA) |
|---------|---------|--------------|
| CV Editor | Full split-pane | Section-by-section form (simplified) |
| Job Tracker | Data table with sorting | Card list with swipe actions |
| Analytics | Multi-chart dashboard | Scrollable cards, one metric each |
| AI Analysis | Side panel results | Bottom sheet, expandable |
| Notifications | Browser notifications | Push notifications (PWA) |

**Add React Native later IF:**
- Push notifications become key retention driver (PWA push unreliable on iOS)
- App store presence needed for credibility
- React Native chosen over Flutter because same React/TypeScript ecosystem

---

## 5. BUSINESS MODEL RECOMMENDATION

### 5.1 Pricing Strategy

Based on competitor analysis and AI cost modeling:

| Tier | Price | Features | AI Budget |
|------|-------|----------|-----------|
| **Free** | $0 | Unlimited tracking, 3 analyses/month, 1 CV template | ~$0.30/user/mo |
| **Pro** | $19/month or $149/year | Unlimited analyses, all templates, cover letters, outcome intelligence, version history | ~$2-5/user/mo |
| **Sprint** | $9/week (no commitment) | Same as Pro, weekly billing for active job searchers | Same |

**Why this works:**
- Free tier is generous enough to demonstrate value (Teal's strategy: 90% free drives adoption)
- AI features (expensive to serve) gate the paid tier
- Weekly "Sprint" option serves unemployed users who can't commit to monthly (subscription fatigue is real in 2026)
- $149/year annual is competitive (Jobscan: $179/year, Rezi: $149 lifetime)

### 5.2 AI Cost Controls (Non-Negotiable)

| Control | Implementation |
|---------|---------------|
| Per-user daily limit | Free: 3/day, Pro: 20/day |
| Token budget per feature | Analysis: 15K tokens max, CV rewrite: 20K max |
| Model tiering | Use Haiku/4o-mini for scoring ($0.01), Sonnet/4o for writing ($0.10) |
| Prompt caching | 90% discount on cached system prompts + CV context |
| Batch processing | Nightly re-scoring at 50% discount |
| Abuse detection | Flag accounts exceeding 5x normal usage |

---

## 6. WHAT WOULD ACTUALLY WORK vs NOT

### 6.1 Will Work (High Confidence)

| Feature | Why |
|---------|-----|
| **Honest suitability analysis** | No competitor does this. Users waste time applying to bad-fit jobs. Genuine value. |
| **Quality CV tailoring** | If output genuinely beats ChatGPT (specificity, impact, voice preservation), this is the #1 pay trigger |
| **Application tracking + CV versioning** | Table stakes but linking CV versions to outcomes is unique |
| **Browser extension** | Proven acquisition channel (Teal, Huntr, Simplify all depend on it) |
| **Outcome learning over time** | No competitor remembers what worked. This compounds in value. |

### 6.2 Will NOT Work (Avoid)

| Anti-Pattern | Why |
|-------------|-----|
| **Auto-apply / mass application** | Proven failure. LazyApply: 2.1/5 stars. LoopCV: 1 interview per 700 apps. ATS catches generic resumes. |
| **Inflated ATS scores** | Users will discover scores are meaningless (there's no real "ATS score"). Honesty > gamification. |
| **Generic AI language** | The #1 complaint across ALL tools. "AI-optimized" content that sounds like ChatGPT is actively hurting users as employers detect it. |
| **Complex pricing** | Teal's weekly billing confuses users. LazyApply's annual-only locks them in. Keep it simple. |
| **Email integration at MVP** | Gmail/Outlook OAuth verification takes weeks. Complex to build. Defer until post-MVP based on demand. |

### 6.3 Risky But Worth Trying

| Feature | Risk | Mitigation |
|---------|------|-----------|
| **Voice preservation in AI writing** | Hard to implement well | Fine-tune prompts on user's own writing samples from master CV |
| **Experimentation engine** | Needs large sample sizes to be statistically meaningful | Start with qualitative A/B (user self-report) before statistical testing |
| **Outcome intelligence from timing** | Response time interpretation is fuzzy (<2 days = ATS reject is a guess) | Frame as "signals" not "facts", let data validate over time |

---

## 7. RECOMMENDED BUILD PHASES

### Phase 1: Foundation (Weeks 1-4)
- Auth system (Supabase Auth + Google/LinkedIn OAuth)
- Base profile setup + CV import (paste or upload)
- Database schema with RLS
- Design system setup (shadcn/ui + Tailwind v4 tokens)
- Basic project structure

### Phase 2: Core MVP (Weeks 5-10)
- JD input + AI suitability analysis (streaming UX)
- CV editor with Plate + PDF preview
- AI CV tailoring + cover letter generation
- Application tracker (TanStack Table)
- CV versioning

### Phase 3: Intelligence Layer (Weeks 11-14)
- Outcome tracking + signal interpretation
- Basic insights dashboard
- Prompt caching + model tiering optimization
- Interview prep (question generation from JD)

### Phase 4: Distribution (Weeks 15-18)
- Chrome browser extension ("Analyze this job")
- PWA configuration (offline, push, install)
- SEO pages (SSR landing pages for job search content)
- Freemium gate + payment integration (Stripe)

### Phase 5: Growth (Post-Launch)
- Email integration (Nylas/Unipile)
- Experimentation engine
- Company intelligence
- Networking/referral tracker
- React Native app (if data supports)

---

## 8. KEY DECISIONS NEEDED

These require your input before implementation:

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Primary AI provider | OpenAI vs Claude vs both | **Both** — OpenAI for structured output, Claude for writing quality |
| CV editor | Plate vs TipTap | **Plate** — better shadcn/ui integration, block-based fits CV sections |
| PDF approach | @react-pdf/renderer vs Puppeteer | **Both** — client preview + server final |
| Mobile | PWA vs React Native vs both | **PWA first** — ship faster, add native later if needed |
| Hosting | Vercel vs Cloudflare | **Vercel** for MVP speed, migrate later for cost |
| Email integration timing | MVP vs post-launch | **Post-launch** — complexity not justified at start |
| Business model | Freemium vs pure subscription | **Freemium** — generous free tier + Pro for AI features |
| Browser extension timing | MVP vs Phase 4 | **Phase 4** — but plan the architecture from Phase 1 |

---

## SOURCES

### Market & Competitors
- Teal HQ (tealhq.com), Jobscan, Kickresume, Rezi.ai, Careerflow, Huntr, Jobright.ai, Simplify
- AI recruitment market: $752M (2026), DemandSage, Azumo
- LazyApply Trustpilot: 2.1/5 stars (52% lowest rating)
- Careerflow Workday autofill: ~60% accuracy (n=45 tests, Feb-Mar 2026)
- ATS "75% rejection" stat debunked: Enhancv, Christine Assaf research

### Tech Stack
- Supabase Edge Functions: 200ms CPU limit (official docs)
- LLM pricing: CloudIDR, TLDL (2026 comparison)
- Trigger.dev vs BullMQ vs Inngest comparison
- PDF generation benchmark: 1RPS, PDF4.dev (2026 tests)
- Vercel vs Cloudflare: DigitalKoncept, Temps.sh (2026 analysis)

### Frontend
- Rich text editors: Liveblocks (2025), BuildPilot, PkgPulse comparisons
- State management: DEV Community, PkgPulse (2026 surveys)
- shadcn/ui vs MUI vs Ant Design: AdminLTE, Makers Den, Builder.io
- ATS resume format: ResumeAdapter, ResumeMate, Jobscan (2026 testing)
- Mobile stats: HireVire, SQ Magazine (2025-2026)
- PWA adoption: DEV Community (2026)

### Spec Gaps
- GDPR/CCPA: SecurePrivacy, CookieYes, TrustCloud
- LinkedIn API: GetPhyllo, OutX, CloseLyHQ (2026 guides)
- Job scraping legality: Mantiks, JobBoardly (2026)
- SaaS authentication: Descope, Auth0
- User acquisition: AI-powered growth showing 143% higher rates vs traditional
