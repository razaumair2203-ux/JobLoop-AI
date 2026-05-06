# Major Platform CV/Resume Intelligence Research (May 2026)

> Research conducted via web search. Sources cited inline. Where data is unavailable or unverifiable, stated plainly.

---

## 1. LinkedIn

### What They Actually Do

**Skills Graph & Knowledge Graph:**
- LinkedIn maintains a Knowledge Graph with trillions of relationships between skills, job titles, companies, industries, and locations.
- Skills and titles are embedded into the same high-dimensional latent space using deep learning. "ActionScript," "HTML Scripting," and "PHP" cluster near "Web Developer" after dimensionality reduction.
- The skill tagger performs both token-based and semantic-based skill matches from short phrases. "Experience with design of iOS application" maps to "Mobile Development."
- As of 2026, LinkedIn has completed the transition from keyword matching to what they call "Semantic Entity Mapping" — the algorithm understands skill neighborhoods, not just keyword hits.

**Skill Assessments:**
- Short-form standardized quizzes designed by third-party subject matter experts (via LinkedIn Learning).
- Pass at 70th percentile or above = "verified skill" badge on profile.
- These are simple multiple-choice quizzes. They do NOT test applied skill depth, project evidence, or real-world usage.
- Major known problem: the entire quiz bank has been leaked to GitHub (linkedin-skill-assessments-quizzes repo with thousands of stars). The badge is essentially gameable.

**Endorsements:**
- Social proof mechanism where connections click "+1" on your skills.
- Research (IEEE Xplore, 2018) showed serious limitations: false endorsements for self-promotion and collusive promotion are prevalent.
- LinkedIn's own algorithm gives top 3 pinned skills ~10x more algorithmic visibility than others.
- Endorsements are NOT evidence-based. They're popularity signals with no link to actual work.

**AI Resume Builder (Premium, ~$29.99/mo):**
- Uses GPT-4.1 to convert LinkedIn profile data into formatted resumes.
- 40+ templates, grammar/formatting checks, ATS optimization.
- Free version: 3-5 basic templates, minimal customization.
- This is a one-way conversion (profile -> resume). It does NOT analyze or enrich your profile.

**Job Match Score (launched Jan 2025):**
- Available to all users (free); Premium gets "advanced insights."
- Compares your profile against job listing requirements.
- Provides categorical match ratings (not numerical scores, at least publicly).
- Evaluates headline, skills, experience, endorsements as matching factors.
- Skills match is reportedly the most heavily weighted factor.

**AI Hiring Assistant (launched Oct 2024, globally available Sep 2025):**
- Recruiter-side agentic AI. Searches, screens, shortlists candidates.
- Powered by a proprietary recruiter-focused LLM + Economic Graph data.
- Drafts personalized InMails (44% higher acceptance rate).
- Recruiters review 62% fewer profiles to find qualified matches.
- Integrates with MS Teams, CRM, and ATS systems.
- This is a RECRUITER tool, not a candidate tool. Candidates don't interact with it.

### Answers to Your Specific Questions

| Question | LinkedIn Answer |
|----------|----------------|
| Multiple versions of data? | NO. One profile only. You can save multiple resumes via Resume Builder, but they're just formatted exports of the same profile data. No version management, no diff tracking. |
| Conflict detection? | NO. LinkedIn does zero conflict/inconsistency detection. Recruiters do this manually ("triangulation"). |
| Persistent evolving skill profile? | PARTIAL. Profile persists and you manually update it. Skills Graph infers some skills from job history. But there's no automatic evolution based on evidence accumulation. |
| Skills linked to evidence? | NO. Skills are flat tags. Endorsements are social signals, not evidence. Assessments are quizzes, not work proof. No link between "Python" and "built X system at Y company." |
| Interactive enrichment? | NO. No Socratic questions, no follow-up prompts, no guided profile improvement beyond generic "add a skill" suggestions. |
| Skill depth model? | NONE. Binary: you have a skill or you don't. Optional quiz badge (pass/fail). Endorsement count (vanity metric). No depth levels, no evidence tiers. |
| Biggest threat? | Scale (1B+ members), network effects, recruiter lock-in, and the Knowledge Graph's semantic matching. If LinkedIn ever decided to build evidence-based skill depth, they have the data to do it. They haven't. Their incentive is engagement and Premium subscriptions, not candidate depth. |

### Threat Assessment: HIGH (due to scale and distribution), LOW (on the specific capability we're building)

---

## 2. Indeed

### What They Actually Do

**Resume Database:**
- 245M total resumes in database (as of 2025-2026).
- Users can upload multiple resumes and customize profiles for different roles.
- Resumes stored as searchable documents, not structured profiles.

**Smart Sourcing (launched April 2024):**
- AI-powered replacement for the older "Indeed Resume" product.
- Goes beyond keyword matching using natural language prompts.
- Integrates AI-matched candidates into one streamlined list.
- Highlights relevant skills and filters by professional licenses.
- Candidates via Sourcing Assistant are 2.9x more likely to be hired.
- This is primarily an EMPLOYER tool. Candidate-side is passive matching.

**Resume Parsing:**
- Uses a combination of grammar-based, statistical, and keyword-based parsing.
- Can extract skills, work history, contact details, education, certifications.
- Standardizes varied job titles into a taxonomy.
- Does NOT build a structured skill profile from parsed data — it's search-oriented.

**Glassdoor Integration (2025-2026):**
- Indeed formally absorbed Glassdoor operations in Sep 2025 (1,300 jobs cut).
- As of Nov 2025, Glassdoor requires Indeed login for new users.
- "Connected Profile" syncs name, email, and resume between platforms.
- Indeed extracts info from resumes to enhance job match accuracy.
- This is data consolidation, not intelligence. No evidence linking, no depth analysis.

### Answers to Your Specific Questions

| Question | Indeed Answer |
|----------|--------------|
| Multiple versions of data? | YES — you can upload multiple resumes. But they're stored as separate documents, not merged or reconciled. |
| Conflict detection? | NO. No inconsistency detection between multiple uploaded resumes. |
| Persistent evolving skill profile? | NO. Your "profile" is essentially your most recent resume + manually entered fields. It doesn't evolve from evidence. |
| Skills linked to evidence? | NO. Skills are extracted keywords. No link to specific roles, durations, or impact. |
| Interactive enrichment? | NO. No questions asked, no guided enrichment, no follow-ups. |
| Skill depth model? | NONE. Self-reported proficiency labels ("novice/intermediate/expert") are suggested as resume advice, not a platform feature. |
| Biggest threat? | Volume (245M resumes, massive employer adoption). Their Smart Sourcing AI is improving fast. If they build structured profiles from their resume corpus, that's dangerous. But they're employer-focused, not candidate-focused. |

### Threat Assessment: MEDIUM (scale is real, but they don't build candidate intelligence)

---

## 3. ZipRecruiter (Phil AI)

### What They Actually Do

**Phil — AI Career Advisor:**
- Conversational AI that asks open-ended questions to understand what candidates want.
- Uses responses + resume to match with opportunities.
- Can draft profile and resume descriptions from candidate answers.
- Proactively pitches candidate profiles to employers ("reverse apply").
- Addresses a real insight: ~50% of job seekers don't have a specific job title in mind.

**Matching Engine:**
- Uses 60+ factors including: skills, job titles, years of experience, location, resume length, application rate, behavioral patterns, application history, response rates, success indicators.
- Learns from employer feedback (rejections/interviews adjust future recommendations).
- 53M resume database.

**Match Strength Indicator:**
- Tells job seekers how strong a match they are for every job.
- Categories rather than percentages (from what's publicly visible).

**Interview Scheduling (2025):**
- Built-in chat with candidates, propose time slots, automated reminders.

### Answers to Your Specific Questions

| Question | ZipRecruiter Answer |
|----------|---------------------|
| Multiple versions of data? | NO. Single profile/resume per account. |
| Conflict detection? | NO. No inconsistency detection. |
| Persistent evolving skill profile? | PARTIAL. Phil "learns from every interaction" — but this appears to be behavioral learning (search patterns, application patterns), not skill evidence accumulation. |
| Skills linked to evidence? | NO. Skills are extracted from resume text. No evidence linking. |
| Interactive enrichment? | **YES — closest competitor to our approach.** Phil asks open-ended questions about experience. However: questions are for JOB MATCHING (what do you want?), not SKILL ENRICHMENT (prove your depth). Phil helps you find jobs, not build a skill profile. |
| Skill depth model? | NONE. Binary match factors. No depth levels. |
| Biggest threat? | Phil's conversational approach is the closest thing to Socratic enrichment in the market. If they pivoted Phil from "what job do you want?" to "tell me more about this skill," they'd be in our space. But their business model is employer-side monetization, not candidate intelligence. |

### Threat Assessment: MEDIUM-LOW (Phil is conceptually adjacent but functionally different)

---

## 4. Glassdoor

### What They Actually Do

**Current State (2026):**
- Being absorbed into Indeed. CEO departed Oct 2025.
- Glassdoor's core value prop was always company reviews and salary data, NOT candidate intelligence.
- New "resume feature" lets users make resumes discoverable to employers via Indeed's Resume Search.
- Guided chat experience for uploading resume and getting job recommendations.
- Job matching based on desired pay, job title, and location.

**What They DON'T Do:**
- No resume parsing intelligence of their own (relies on Indeed's infrastructure).
- No skill profiling, no depth model, no evidence linking.
- No interactive enrichment beyond basic preference collection.

### Answers to Your Specific Questions

| Question | Glassdoor Answer |
|----------|------------------|
| Multiple versions of data? | NO. Single profile, now merged with Indeed. |
| Conflict detection? | NO. |
| Persistent evolving skill profile? | NO. |
| Skills linked to evidence? | NO. |
| Interactive enrichment? | NO (basic preference collection doesn't count). |
| Skill depth model? | NONE. |
| Biggest threat? | Zero. Glassdoor is a company review/salary platform being absorbed into Indeed. They have no candidate intelligence play. The only risk is that Indeed uses Glassdoor's company data to build better JD parsing, which doesn't threaten our CV intelligence. |

### Threat Assessment: NEGLIGIBLE

---

## 5. Monster

### What They Actually Do

**Power Resume Search (6Sense Technology):**
- Acquired from Trovix Inc. (2008 acquisition). Patented semantic search.
- Understands job titles, skills, experience levels, industries, education hierarchically.
- "Nurse" search yields "RN" and "LN" results. Handles abbreviations/acronyms.
- Contextually interprets meaning — can distinguish recent vs. dated experience.
- 97% of recruiters found qualified candidates faster vs. standard keyword search (Monster's own claim, likely from 2012-era marketing).

**SeeMore (Cloud Platform):**
- Cloud-based semantic search for companies' own resume databases.
- Allows companies to search all recruitment resources from one place.

**Current Relevance:**
- Monster's technology was genuinely innovative in 2008-2013.
- However, nearly ALL search results about Monster's parsing tech are from 2011-2013. I found NO evidence of significant technical updates in 2024-2026.
- Monster appears to be a legacy platform coasting on old technology.
- Their recent content is focused on career advice articles and trend reports, not product innovation.

### Answers to Your Specific Questions

| Question | Monster Answer |
|----------|---------------|
| Multiple versions of data? | NO. Single resume per search. |
| Conflict detection? | NO. |
| Persistent evolving skill profile? | NO. Resume is a static document in their database. |
| Skills linked to evidence? | PARTIAL — 6Sense can evaluate "depth of experience" by reading context (recent vs. dated, multiple mentions vs. single), but this is for SEARCH RANKING, not for building a candidate profile. |
| Interactive enrichment? | NO. |
| Skill depth model? | Implicit only (6Sense weighs recency and context for search ranking). Not exposed to candidates. |
| Biggest threat? | Minimal. Monster is a declining platform. Their tech was ahead in 2012, but hasn't visibly evolved. LinkedIn, Indeed, and ZipRecruiter have all surpassed them. |

### Threat Assessment: LOW

---

## 6. Workday (Skills Cloud)

### What They Actually Do

**This is the most technically sophisticated platform in this research. Pay attention.**

**Skills Ontology:**
- Universal skills ontology with 50,000+ skills.
- Uses graph technology + machine learning to map skill relationships.
- Skills are related to each other with proximity scores (how closely related).
- The ontology cleanses, normalizes, and deduplicates skill data.

**Skill Inference (LLM-Based, 2024):**
- Published engineering blog post on Medium describing their LLM-based Skill Inference service.
- Given a "skill evidence" input (job title, certification, education detail), the LLM infers relevant skills.
- Post-processes the LLM output against their Skill Ontology, sorting by relevance.
- Evaluation uses synthetic data generated by LLM + verified by human annotators.
- Optimized for latency: concise prompts, capped at 20 skills per inference.
- Architecture moved from synchronous Flask to async to handle multi-second LLM responses.

**Skill Verification (3 methods):**
1. **Self-declared** — employee adds skills to their profile.
2. **AI-inferred** — system reads job descriptions, learning completions, feedback, and infers skills.
3. **Manager validation** — managers and project owners endorse/confirm skills in context of work (gigs, projects, training, jobs).

**Skill Leveling:**
- Configurable proficiency scale: Not Applicable / Beginner / Intermediate / Experienced / Advanced / Expert.
- Employees self-rate. Managers can validate/adjust.
- Learning completion auto-updates skill records.

**Skill Endorsement:**
- Uses existing Feedback/Feedback template functionality.
- Prompts managers, project owners, and instructors to confirm skill presence.
- Context-aware: endorsement happens relative to specific work (not generic "+1").

**Evolution:**
- Skills Cloud is designed to evolve: "employees are always learning and developing new skills through on-the-job experience, courses, or hobbies" and the system tracks this dynamically.
- Learning maps to job profiles and skill taxonomies, so course completion updates skill records automatically.

### Answers to Your Specific Questions

| Question | Workday Answer |
|----------|----------------|
| Multiple versions of data? | N/A (enterprise system, not candidate-facing). Employee has one profile that accumulates data from multiple sources. |
| Conflict detection? | NOT FOUND in search results. No evidence of conflict detection between self-declared and inferred skills. |
| Persistent evolving skill profile? | **YES.** This is Workday's core value prop. Skills evolve from jobs, learning, projects, and endorsements. |
| Skills linked to evidence? | **PARTIAL.** Skills are inferred FROM evidence (job titles, certifications, learning). But the link is inference-based, not explicit. You see "Python: Advanced" but not necessarily "Python: used at Company X for 3 years building Y system." |
| Interactive enrichment? | **NO.** No Socratic questions. Skills are captured passively (AI inference) or via manual entry/endorsement. |
| Skill depth model? | **YES.** 6-level proficiency scale + manager endorsement + learning-based updates. Most sophisticated depth model among all platforms studied. |
| Biggest threat? | Workday is an ENTERPRISE HCM platform ($200K+ annual contracts). They don't serve individual job seekers. But their Skills Cloud architecture is the most technically similar to what we're building. If Workday ever released a consumer-facing product, or if a startup cloned their architecture for job seekers, that would be a real threat. The likelihood of Workday going B2C is approximately zero — their entire business model is enterprise HR. |

### Threat Assessment: LOW (enterprise-only), but HIGHEST ARCHITECTURAL SIMILARITY to our approach

---

## Comparative Matrix

| Capability | LinkedIn | Indeed | ZipRecruiter | Glassdoor | Monster | Workday |
|------------|----------|--------|--------------|-----------|---------|---------|
| Multiple data versions | No | Yes (separate docs) | No | No | No | N/A (enterprise) |
| Conflict detection | No | No | No | No | No | Not found |
| Evolving skill profile | Partial (manual) | No | Partial (behavioral) | No | No | **Yes** |
| Skills linked to evidence | No | No | No | No | Implicit (search) | **Partial** (inference) |
| Interactive enrichment | No | No | **Yes** (Phil, but for job matching) | No | No | No |
| Skill depth model | None (binary + quiz) | None | None | None | Implicit | **Yes** (6 levels) |
| Skill ontology/graph | **Yes** (Knowledge Graph) | Basic taxonomy | Proprietary (60 factors) | None | 6Sense semantic | **Yes** (50K+ skills) |
| AI-powered matching | **Yes** (semantic) | **Yes** (Smart Sourcing) | **Yes** (60 factors) | Via Indeed | 6Sense (legacy) | **Yes** (LLM inference) |

---

## Key Strategic Findings

### What NOBODY Does (Our Exploitable Gaps)

1. **Evidence-based skill depth for candidates.** Workday does proficiency levels, but for employees inside enterprises. No consumer platform links skills to verifiable evidence (role, duration, impact, metrics).

2. **Multi-document conflict detection.** Indeed lets you upload multiple resumes but does NOTHING with the conflicts between them. Nobody detects date overlaps, title mismatches, or inconsistent skill claims.

3. **Socratic enrichment.** ZipRecruiter's Phil asks questions, but for job preference discovery ("what kind of role do you want?"), NOT for skill evidence enrichment ("tell me more about your Python experience at Company X"). Nobody asks the user to prove or deepen their skill claims.

4. **Persistent skill cloud that evolves from evidence.** Workday's Skills Cloud evolves, but it's enterprise-only and inference-based (not user-confirmed). LinkedIn's profile persists but doesn't evolve intelligently. No consumer platform builds a living, evidence-enriched skill profile.

5. **CV-to-profile intelligence.** Every platform treats resumes as search documents. Nobody builds a structured, classified, gap-detected profile FROM the resume and then helps you improve it.

### Real Threats to Watch

1. **LinkedIn adding evidence linking.** If LinkedIn connected skills to specific experience entries and showed "Python: used in 3 roles over 5 years with 2 endorsements from senior engineers," that would be genuinely threatening. Their Knowledge Graph has the infrastructure. Their incentive structure (engagement, not depth) makes this unlikely in the near term.

2. **Indeed building structured profiles from 245M resumes.** They have the corpus. Smart Sourcing is getting smarter. But they're employer-focused. If they pivoted to candidate intelligence, their scale would be formidable.

3. **ZipRecruiter's Phil pivoting to skill enrichment.** Phil already asks conversational questions. If they shifted from "what job do you want?" to "how deep is your experience in X?", they'd be the first major platform in our space. Their engineering team clearly can build conversational AI.

4. **Workday going B2C.** Probability: near zero. Their contracts are $200K+/year enterprise deals. But if a startup copied their Skills Cloud architecture for consumers, that's basically us — and we need to be first.

5. **Microsoft/LinkedIn combining Copilot + LinkedIn data.** Microsoft owns LinkedIn and has Copilot everywhere. If Copilot could analyze your LinkedIn data, infer evidence-based skill depth, and generate tailored CVs with your actual career evidence, that would be a serious threat. No evidence this is in development, but the capability exists.

### What This Means for JobLoop

Our architecture is architecturally closest to Workday Skills Cloud, but built for individual job seekers instead of enterprise HR. The specific combination we offer — multi-CV parsing + conflict detection + evidence-based depth + Socratic enrichment + persistent Cloud + outcome intelligence — exists at ZERO of the major platforms.

The window is open. The question is how long it stays open.

---

## Sources

- [LinkedIn Knowledge Graph Engineering Blog](https://www.linkedin.com/blog/engineering/knowledge/building-the-linkedin-knowledge-graph)
- [LinkedIn Skills Graph: Extracting Skills from Content](https://www.linkedin.com/blog/engineering/skills-graph/extracting-skills-from-content)
- [LinkedIn Hiring Assistant](https://business.linkedin.com/hire/hiring-assistant)
- [LinkedIn Hiring Assistant Global Launch](https://news.linkedin.com/2025/hiring-assistant-globally-available)
- [LinkedIn 2025 Hiring Release Features](https://business.linkedin.com/talent-solutions/product-update/wave1-2025)
- [LinkedIn 2026 Hiring Release Features](https://business.linkedin.com/talent-solutions/product-update/hire-release)
- [LinkedIn Skill Assessments Engineering Blog](https://www.linkedin.com/blog/engineering/skills-graph/the-building-blocks-of-linkedin-skill-assessments)
- [LinkedIn Skill Assessments Help](https://www.linkedin.com/help/linkedin/answer/a507663/linkedin-skill-assessments)
- [LinkedIn AI Resume Tips Help](https://www.linkedin.com/help/linkedin/answer/a6813101)
- [LinkedIn AI Profile Optimization (2026 Guide)](https://jobright.ai/blog/ai-linkedin-profile-optimization/)
- [LinkedIn Premium Career 2026](https://bestjobsearchapps.com/articles/en/why-linkedin-premium-career-stands-out-for-aidriven-job-search-in-2026)
- [LinkedIn Job Match Tool 2025](https://blog.theinterviewguys.com/linkedins-new-ai-job-match-tool/)
- [IEEE: Endorsement-Based Skill Assessment Analysis](https://ieeexplore.ieee.org/iel7/8376143/8377622/08377696.pdf)
- [Indeed Smart Sourcing](https://www.indeed.com/employers/smart-sourcing)
- [Indeed Smart Sourcing Launch (BusinessWire)](https://www.businesswire.com/news/home/20240402174640/en/)
- [Indeed Resume Parsing Guide](https://www.indeed.com/hire/c/info/resume-parsing)
- [Indeed Matching Technology](https://www.indeed.com/hire/resources/howtohub/matched-candidates)
- [Indeed/Glassdoor Integration Deadlines](https://www.jobboarddoctor.com/2026/03/13/indeed-and-glassdoor-turn-the-screws-as-multiple-deadlines-loom/)
- [ZipRecruiter: Who is Phil](https://support.ziprecruiter.com/candidate/s/article/Who-is-Phil)
- [ZipRecruiter: Meet Phil](https://www.ziprecruiter.com/who-is-phil)
- [ZipRecruiter New Job Seeker Tools (2024)](https://www.ziprecruiter.com/blog/new-job-seeker-tools/)
- [ZipRecruiter Match Strength](https://www.ziprecruiter.com/blog/ziprecruiter-tells-you-how-strong-a-match-you-are-for-every-job/)
- [ZipRecruiter AI Analysis (Nanalyze)](https://www.nanalyze.com/2018/10/ziprecruiter-ai-recruiting/)
- [Monster Power Resume Search](https://hiring.monster.com/help-center/traditional-products/power-resume-search/)
- [Monster 6Sense Launch (BusinessWire)](https://www.businesswire.com/news/home/20120625006194/en/)
- [Monster SeeMore Cloud Platform](https://www.businesswire.com/news/home/20110721005278/en/)
- [Workday Skills Cloud Product Page](https://www.workday.com/en-us/products/human-capital-management/skills-cloud.html)
- [Workday Skills Cloud Foundation Blog](https://blog.workday.com/en-us/foundation-workday-skills-cloud.html)
- [Workday Skill Inference Engineering Blog (Medium)](https://medium.com/workday-engineering/skill-inference-building-an-llm-based-service-in-the-workday-skills-cloud-47c9cce9f7bd)
- [Workday Skills Cloud Evolution (Commit Consulting)](https://commitconsulting.com/blog/the-evolution-of-workday-skills-cloud)
- [Josh Bersin: Workday Skills Cloud Analysis](https://joshbersin.com/2020/01/workday-skills-cloud-a-big-idea-with-much-more-to-come/)
- [Workday Skills Cloud Training (CloudFoundation)](https://cloudfoundation.com/workday-skills-cloud-training)
- [PwC + Workday Skills-Based Approach](https://www.pwc.com/us/en/technology/alliances/library/workday-skills-based-approach-to-talent.html)
- [Glassdoor/Indeed Layoffs (HR Dive)](https://www.hrdive.com/news/layoffs-glassdoor-indeed-ai-headwinds/752876/)
