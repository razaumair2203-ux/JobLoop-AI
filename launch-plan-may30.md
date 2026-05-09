# JobLoop AI — Launch Plan: May 30, 2026

## Timeline

| Phase | Dates | Goal |
|-------|-------|------|
| Alpha (You = User #1) | May 7-20 | Post real JDs, mature pipeline, fix bugs |
| Infrastructure | May 12-18 | Hosting + domain + payment + auth live |
| Beta polish | May 18-25 | End-to-end flow working, UI functional |
| Soft launch | May 26-30 | Landing page + payment + first external users |
| Launch | May 30 | Live product accepting payments |

---

## Alpha Phase (May 7-20): You Are User #1

Your CVs: already in `alpha/` folder (5 PDFs)
Your workflow:
1. Upload CVs → verify Cloud builds correctly
2. Post 10-15 real JDs (mix of stretch, match, reach)
3. Test: Socratic questions relevance, CV generation quality, evidence depth
4. Track: what breaks, what's slow, what's confusing
5. Iterate daily on prompts, gating logic, UI flow

Success criteria:
- Cloud has correct roles, evidence, depth for your career
- JD analysis produces genuinely useful match insights
- Generated CVs are better than your manual CVs
- Outcome tracking loop works (paste JD → track → update → see history)

---

## Infrastructure Setup (May 12-18)

### Hosting: Vercel (Next.js native)
- Why: Zero-config Next.js 16, preview deployments, edge functions
- Cost: $20/mo Pro plan (sufficient for launch)
- Scaling: move to Railway if costs balloon post-traction
- Alternative: Railway at $8-15/mo if Vercel feels expensive pre-revenue

### Database: Supabase Pro ($25/mo)
- Already chosen and validated
- JSONB + normalized tables + Auth
- pgvector deferred (not needed for MVP)

### Payment: Lemon Squeezy
- Why: Merchant of Record (handles tax/VAT globally), built-in affiliate system
- Cost: 5% + $0.50 per transaction
- Setup: <10 minutes, hosted checkout, webhook integration
- Pricing to implement: $7/week OR $19/month (no annual — job search is 3-5 months)
- Free tier: 3 CV tailorings, then paywall
- Now owned by Stripe — reliable infrastructure, same developer quality
- Alternative considered: Paddle (same MoR model, 5% + $0.50, more enterprise-oriented)
- Why NOT raw Stripe: Tax compliance burden in every jurisdiction. Not worth it pre-scale.

### Domain + DNS
- Register domain (jobloop.ai or similar)
- Vercel custom domain setup
- Email: Supabase Auth requires custom SMTP (Resend @ $0/mo for 100 emails/day)

### Auth: Supabase Auth
- Google OAuth + LinkedIn OAuth (already designed)
- Magic link email as fallback
- Custom SMTP via Resend

---

## Technology Stack Edges (Our Moat)

### 1. Evidence Graph Architecture
No competitor has a persistent, versioned skill graph with:
- 9 evidence types (role, impact, cert, award, project, education, workshop, publication, socratic)
- 4 depth levels (mentioned → applied → proficient → expert)
- Evidence preservation across rebuilds
- Outcome signals enriching skills over time

### 2. Zero-Cost Conflict Detection
Pure algorithmic logic ($0 per run):
- Date parsing + Jaccard similarity + fuzzy company matching
- Persona-aware filtering (freelancer overlaps ≠ conflicts)
- Pipeline GATING (blocks bad data from entering Cloud)
- Nobody else even attempts this

### 3. Socratic Engine with 3-Gate System
- Relevance × Evidence Gap × Marginal Value
- Dynamic model selection (Cloud maturity → Haiku/Sonnet)
- Cross-answer contradiction detection
- Persona-aware question framing
- 90-day stale evidence re-ask

### 4. Cost-Optimized AI Pipeline
- Onboarding: $0.06-0.19 per user (conflict detection = $0, Cloud build = $0)
- JD analysis: ~$0.05-0.10 per JD (maturity-driven model selection)
- CV generation: ~$0.03-0.08 (depending on Cloud richness)
- Outcome feedback: $0.004 per update (Haiku)
- Total per active user/month: ~$7-8 → 69% margin at $19/month

### 5. Three-Tier Dev Mode (Ships Faster)
- Tier 1: Fixture cache (instant, $0, deterministic tests)
- Tier 2: Real Haiku API + auto-cache (first run = API, subsequent = cached)
- Tier 3: Explicit error (never silent failures)
- Means: you can develop offline, test without API costs, CI is free

### 6. AutoResearch Loop (Prompt Optimization)
- 50-pair test bank (20 train / 15 val / 15 held-out)
- 8-metric scorecard, ANOVA-validated signal (F=19.68, p=0.000009)
- 6 mutation operators for prompt evolution
- Karpathy-faithful design (one loop, not three)
- When activated: prompts get better autonomously

### 7. Outcome Intelligence (Per-User Learning)
- Application footprints accumulate silently
- Niche profiles build over time (fintech signals vs healthcare signals)
- Same-company memory (full context recall)
- Gap accumulation (2+ employers flag same gap → Socratic trigger)
- Zero extra cost (context injected into existing CV gen prompt)

---

## What To Build (Priority Order, May 7-30)

### Must-Have for Launch
1. Working upload → Cloud → view flow (onboarding)
2. JD paste → streaming analysis → match display
3. CV generation → PDF download
4. Payment gate (3 free, then paywall)
5. Landing page (what it does, pricing, CTA)
6. Auth (Google OAuth minimum)

### Nice-to-Have (Week 3 if time)
7. Outcome tracking (dropdown + Kanban)
8. Cover letter generation
9. Application history view
10. Socratic during JD analysis (Phase 2 questions)

### Post-Launch (June+)
11. Chrome extension
12. Mobile-responsive polish
13. More CV templates
14. Referral system via Lemon Squeezy affiliates

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Parser accuracy on random CVs | You test with YOUR 5 CVs first. Post-launch: monitor and fix per user |
| Socratic bounce rate | Make skip prominent, defer to dashboard, show "why" for each question |
| Payment conversion | 3 free tailorings = enough to prove value before paywall |
| Vercel costs at scale | Monitor. Move to Railway if >$100/mo before 100 users |
| AI cost per user spikes | Cloud maturity drives Haiku (cheap) for rich profiles. Only new users = expensive |
