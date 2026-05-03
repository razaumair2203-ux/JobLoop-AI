# JobLoop AI: Cost Analysis & Pricing Model
## Extreme Case Analysis — May 2026 (Revised with Job Search Duration Research)

## Job Search Duration Data (Why Annual Plans Don't Work)

| Metric | Value | Source |
|---|---|---|
| Median unemployment duration (US, March 2026) | 11.5 weeks (~3 months) | BLS/FRED |
| Mean unemployment duration (US, March 2026) | 25.3 weeks (~6 months) | BLS/FRED |
| 70% of seekers find job within | 3 months | ResumeBuilder |
| 30% take longer than | 3 months | ResumeBuilder |
| Tech workers specifically (2026) | 4.7 months median | SkillSyncer |
| Software engineers | 20 weeks (~5 months) | Boterview |
| IT roles | 17 weeks (~4 months) | Boterview |
| Entry-level / career changers | 6-12 months | Poozle |
| Long-term unemployed (27+ weeks) | 25.4% of all unemployed | BLS |

**Key insight:** Job search is a 3-5 month problem. Nobody buys annual for a temporary need.
Reddit and review sites are hostile to annual plans for career tools.
LinkedIn Premium consensus: "subscribe 1-3 months, then cancel."

### Tech job market context (2025-2026):
- Tech unemployment: 5.8% (highest since dot-com bust)
- Tech layoffs: ~80,000 in Q1 2026 alone
- ~50% of cuts AI-related
- Experience requirements tightened: 37% -> 42% require 5+ years
- Re-employment time: 3.2 months (2024) -> 4.7 months (2026)

---

## API Calls Per User Action

### One-time (Onboarding)
| Action | Model | Input/Output Tokens | Cost |
|---|---|---|---|
| CV Parse | Haiku | ~3K / 1K | $0.003 |
| Socratic Enrichment (3 Qs) | Haiku | ~1K / 0.5K x 3 | $0.006 |
| **Onboarding Total** | | | **$0.009** |

### Per Application
| Action | Model | Input/Output Tokens | Cost |
|---|---|---|---|
| JD Parse | Haiku | ~2K / 1K | $0.003 |
| JD Socratic (2 Qs) | Haiku | ~1K / 0.5K x 2 | $0.004 |
| CV Generation | Sonnet | ~4K / 3K | $0.040 |
| **Per Application Total** | | | **$0.047** |

### Pricing Reference (Anthropic, May 2026)
| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| Claude Haiku 4.5 | $0.80 | $4.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |

---

## Realistic User Profiles (Active Job Seekers Apply 20-30/day)

### Not all applications need tailored CVs:
| Application Type | % of Daily Apps | Tailored CV? | API Cost |
|---|---|---|---|
| Quick-apply (Easy Apply, Indeed) | 60-70% | No — base CV | $0.003 (JD parse only) |
| Moderate fit | 20-25% | Light tailor | $0.047 |
| Strong fit — full tailor | 10-15% | Full tailor | $0.047 |

### User profiles with realistic daily volumes:

**Casual User (10 apps/month, all tailored)**
| Monthly Cost: **$0.48** |
|---|

**Active Seeker (20/day = 600/month, 5 tailored/day)**
```
600 JD parses x $0.003      = $1.80
150 tailored CVs x $0.047   = $7.05
                     MONTHLY = $8.85
```

**Heavy Seeker (30/day = 900/month, 5-7 tailored/day)**
```
900 JD parses x $0.003      = $2.70
200 tailored CVs x $0.047   = $9.40
                     MONTHLY = $12.10
```

**Extreme (50/day = 1,500/month, 10 tailored/day)**
```
1,500 JD parses x $0.003    = $4.50
300 tailored CVs x $0.047   = $14.10
                     MONTHLY = $18.60
```

**Abuse Scenario (100/day, all tailored — theoretical)**
```
3,000 tailored CVs x $0.047 = $141.00
```

---

## Competitor Pricing (Full Breakdown)

| Tool | Weekly | Monthly | Quarterly (eff/mo) | Annual (eff/mo) | Lifetime |
|---|---|---|---|---|---|
| Teal | $13 | $29 | $26 | N/A | No |
| Careerflow | $9 | $24 | $18 | $14 | No |
| Jobscan | No | $50 | $30 | $25 | No |
| Kickresume | No | $24 | $18 | $8 | No |
| Rezi | No | $29 | N/A | $12 | $149 |
| Huntr | No | $40 | $30 | N/A | No |

**Patterns:**
- Weekly billing exists (Teal $13, Careerflow $9) — career-tool-specific pattern
- Annual discounts are 40-67% — much steeper than SaaS average (18-28%), because competitors know users churn fast
- Rezi offers lifetime at $149 (low marginal cost — no AI API per use)
- Per-application pricing: ReApply does $1/app (niche, not mainstream)

---

## Pricing Model (FINAL)

### No annual plan. Job search is a 3-5 month problem.

| Plan | Price | Limits | Max API Cost | Min Margin |
|---|---|---|---|---|
| **Free** | $0 | 3 tailored CVs total, unlimited JD analysis | ~$0.15 | Trial/conversion |
| **Weekly** | $7/week | 35 tailored CVs/week (5/day), unlimited JD analysis | ~$1.65/week | 76% |
| **Monthly** | $19/month | 150 tailored CVs/month (5/day), unlimited JD analysis | ~$7.05/month | 63% |

### Why these numbers:

**Weekly at $7:**
- Cheaper than Teal ($13) and Careerflow ($9)
- Lowest friction entry: "try it this week"
- 76% margin even at max usage (35 CVs/week)
- If used for full 4-month search: 17 weeks x $7 = $119 total revenue

**Monthly at $19:**
- Saves ~30% vs weekly ($28/month equivalent)
- Undercuts Teal ($29), Jobscan ($50), Rezi ($29), Huntr ($40)
- Competitive with Careerflow ($24) and Kickresume ($24) while offering more
- 63% margin at max usage (150 CVs)
- If used for full 4-month search: 4 x $19 = $76 total revenue

**No annual:** Users searching 3-5 months don't want 12-month commitment.
**No lifetime:** We have ongoing API costs per user. Rezi's $149 works because their marginal cost is near zero. Ours isn't.
**No Pro tier (yet):** One paid tier. Simple. Add Pro later only if data demands it.

### Cover letters: included in paid plans (same API call cost as CV gen, ~$0.04)

---

## Revenue Per Typical User (Full Search Duration)

| Plan | Avg Search Duration | Total Revenue | API Cost | Profit |
|---|---|---|---|---|
| Weekly (casual, 8 weeks) | 2 months | $56 | ~$8 | $48 |
| Weekly (active, 17 weeks) | 4 months | $119 | ~$28 | $91 |
| Monthly (active, 4 months) | 4 months | $76 | ~$28 | $48 |
| Monthly (long search, 6 months) | 6 months | $114 | ~$42 | $72 |

---

## Platform-Level Economics

### Scenario: 1,000 paying users (blended weekly + monthly)

Assumptions: 40% weekly, 60% monthly. Average active seeker (150 tailored CVs/month).

| | Monthly |
|---|---|
| Weekly users (400 x $28/month eff) | $11,200 |
| Monthly users (600 x $19/month) | $11,400 |
| **Total Revenue** | **$22,600** |
| API Cost (~$7/user avg) | $7,000 |
| Infrastructure | $100 |
| **Profit** | **$15,500** |
| **Margin** | **69%** |

### Scenario: 10,000 paying users

| | Monthly |
|---|---|
| Revenue | $226,000 |
| API Cost | $70,000 |
| Infrastructure | $400 |
| **Profit** | **$155,600** |
| **Margin** | **69%** |

### Scenario: 50,000 paying users

| | Monthly |
|---|---|
| Revenue | $1,130,000 |
| API Cost | $350,000 |
| Infrastructure | $1,000 |
| **Profit** | **$779,000** |
| **Margin** | **69%** |

---

## Infrastructure Costs (Beyond API)

| Service | Monthly Cost | Notes |
|---|---|---|
| Supabase Pro | $25 | Database, auth, storage |
| Vercel Pro | $20 | Hosting, edge functions |
| Domain + email | $10 | Custom SMTP for auth emails |
| Monitoring (Sentry) | $26 | Error tracking |
| Analytics | $0-20 | PostHog free tier or paid |
| **Infrastructure Total** | **~$100** | Scales with usage |

### At scale:
| Users | Supabase | Vercel | Total Infra |
|---|---|---|---|
| 1,000 | $25 | $20 | ~$100 |
| 10,000 | $75 | $150 | ~$400 |
| 50,000 | $200 | $400 | ~$1,000 |

---

## Abuse Protection

- Rate limit: 5 tailored CVs per hour (prevents scripted abuse)
- Daily cap: 35 CVs/day for weekly, 5/day average for monthly (150/month)
- Fair use: sustained >300 CVs/month triggers review
- These limits are generous — even 30/day applicants only tailor 5-10

---

## Extreme Case Summary

| Scenario | Daily Apps | Tailored CVs/month | Monthly API Cost | Covered by $19/mo? |
|---|---|---|---|---|
| Casual | 2-3 | 10 | $0.48 | Yes (97% margin) |
| Active seeker | 20/day | 150 | $8.85 | Yes (53% margin) |
| Heavy seeker | 30/day | 200 | $12.10 | Tight (36% margin) |
| Extreme | 50/day | 300 | $18.60 | Break-even (rate limit caps at 150) |
| Abuse | 100/day | 3,000 | $141.00 | No (rate limited to 150) |

**Rate limiting at 150 CVs/month (monthly plan) protects us.** The 5/day cap is generous for any real user. Automated/scripted abuse gets blocked.

---

## Key Insights

1. **API cost per user averages ~$7/month** for active seekers (not $1.25 as originally estimated — corrected for 20-30 daily applications).

2. **CV generation is 85% of cost** ($0.04/call). Everything else is pennies.

3. **Weekly billing is the right default** for career tools. Lower friction, higher total revenue per user ($119 vs $76 for 4-month search).

4. **No annual plan.** 70% find jobs in 3 months. Annual creates resentment, increases refund requests, damages brand.

5. **Rate limiting (not pricing tiers) handles abuse.** Cap at 5 tailored CVs/day. Real users never hit this. Bots do.

6. **At 10K users: $226K revenue, $70K cost = $156K monthly profit** before team costs.

---

## Cost Optimization Levers (if ever needed)

| Lever | Savings | Trade-off |
|---|---|---|
| Use Haiku for CV generation | 85% reduction on biggest cost | Lower quality output |
| Cache JD parses for identical JDs | ~20% reduction on JD parsing | Complexity |
| Skip JD Socratic for repeat role types | ~50% on JD Socratic | Less personalization |
| Batch similar applications | Variable | Latency increase |
| Prompt caching (Anthropic feature) | ~50% on cached prefix | Already available |
| Fine-tune small model for JD parsing | ~90% on parsing | Maintenance burden |

### Prompt caching impact (most likely first optimization):
Anthropic's prompt caching charges 10% of normal input cost for cached tokens.
Our system prompts (~2K tokens) are identical across all calls.
At 10K users: saves ~$5K-10K/month on repeated prefixes.
