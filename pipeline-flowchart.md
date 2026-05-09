# CV-to-Cloud Pipeline — First Run Flowchart
# Input: 5 CVs with conflicting roles, dates, titles
# Output: Enriched Profile Cloud

```
=============================================================================
PHASE 1: EXTRACTION (Parser — per CV, no cross-reference)
=============================================================================

  CV1 (KSA-ME.pdf) ──→ [pdf-parse: extract text] ──→ raw text 1
  CV2 (PM.pdf)      ──→ [pdf-parse: extract text] ──→ raw text 2
  CV3 (SE.pdf)      ──→ [pdf-parse: extract text] ──→ raw text 3
  CV4 (BE.pdf)      ──→ [pdf-parse: extract text] ──→ raw text 4
  CV5 (LinkedIn.pdf) ─→ [pdf-parse: extract text] ──→ raw text 5
       │                                                │
       │                CODE (free, instant)             │
       └────────────────────────────────────────────────┘
                            │
                            ▼
  raw text 1 ──→ [LLM + Parser Prompt] ──→ ParsedCV JSON 1
  raw text 2 ──→ [LLM + Parser Prompt] ──→ ParsedCV JSON 2
  raw text 3 ──→ [LLM + Parser Prompt] ──→ ParsedCV JSON 3
  raw text 4 ──→ [LLM + Parser Prompt] ──→ ParsedCV JSON 4
  raw text 5 ──→ [LLM + Parser Prompt] ──→ ParsedCV JSON 5
       │                                        │
       │         5 x LLM API calls              │
       │         ($0.01 each = $0.05 total)      │
       └────────────────────────────────────────┘

  PARSER SCORECARD checks each ParsedCV:
    [ ] Did it find all roles listed in this CV?
    [ ] Did it capture all dates as written?
    [ ] Did it extract all certifications?
    [ ] Did it extract all skills from bullets?
    [ ] Did it find named programs (JF-17, Erieye)?
    [ ] Did it capture contact info?

=============================================================================
PHASE 2: CLEANING (Code — per ParsedCV, no LLM)
=============================================================================

  ParsedCV 1 ──┐
  ParsedCV 2 ──┤
  ParsedCV 3 ──┼──→ [cv-cleaner.ts]
  ParsedCV 4 ──┤
  ParsedCV 5 ──┘
                      │
                      ├── cleanTitle(): "Sr." → "Senior", "Eng." → "Engineer"
                      ├── filterGarbageBullets(): remove headers parsed as bullets
                      ├── validateDates(): end > start, no future dates, no >50yr
                      ├── extractContactDetails(): name, email, phone, location
                      └── verifySkills(): skills match what's in bullet text
                      │
                      ▼
               5 x CleanedParsedCV JSONs
               │
               │  CODE (free, instant, deterministic)
               │  No LLM needed
               └──────────────────────────

=============================================================================
PHASE 3: CONFLICT DETECTION (Code — cross-CV comparison, no LLM)
=============================================================================

  CleanedCV 1 ──┐
  CleanedCV 2 ──┤
  CleanedCV 3 ──┼──→ [conflict-detector.ts]
  CleanedCV 4 ──┤
  CleanedCV 5 ──┘
                      │
                      ├── Date conflicts:
                      │     CV1 says "2018-19", CV2 says "2018-20",
                      │     LinkedIn says "Nov 2017-Dec 2019"
                      │     → FLAG: 3 different date ranges for same role
                      │
                      ├── Title conflicts:
                      │     CV1: "Maintenance Supervisor"
                      │     CV2: "Engineering Operations Manager"
                      │     CV3: "Maintenance Support Engineer"
                      │     → FLAG: 3 different titles, same company, same dates
                      │
                      ├── Employer grouping:
                      │     All roles from military postings?
                      │     → GROUP: likely single employer with rotational postings
                      │
                      ├── Timeline gaps:
                      │     No CV covers Apr 2021 - Sep 2022
                      │     → FLAG: unexplained gap of 17 months
                      │
                      └── Duplicate detection:
                            Same role appears in 4 CVs with different bullets
                            → MERGE bullets, flag overlaps
                      │
                      ▼
               ConflictReport {
                 date_conflicts: [...],
                 title_conflicts: [...],
                 employer_groups: [...],
                 timeline_gaps: [...],
                 duplicate_roles: [...],
                 merged_bullets: [...]  // union of all bullets per role
               }
               │
               │  CODE (free, instant, deterministic)
               │  No LLM needed — pattern matching + date math
               └──────────────────────────

  ╔═══════════════════════════════════════════════════════════╗
  ║  GATE: Are there conflicts?                              ║
  ║                                                          ║
  ║  YES (conflicts found) → STOP. Do NOT build Cloud yet.   ║
  ║                          Go to Phase 4 (Socratic).       ║
  ║                                                          ║
  ║  NO (clean data)      → Skip to Phase 5 (Build Cloud).   ║
  ╚═══════════════════════════════════════════════════════════╝

=============================================================================
PHASE 4: SOCRATIC CONFLICT RESOLUTION (LLM + User)
=============================================================================

  ConflictReport + All 5 CleanedCVs
       │
       ▼
  [LLM + Socratic Prompt]
       │
       │  LLM sees ALL conflicts and generates questions:
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  BUCKET A: Conflict Resolution Questions                │
  │                                                         │
  │  Q1: "Your CADI China role shows 3 different date       │
  │       ranges across your CVs: 2018-19, 2018-20, and    │
  │       Nov 2017-Dec 2019. What are the actual dates?"    │
  │                                                         │
  │  Q2: "For your AEW&C role, one CV says 'Maintenance     │
  │       Supervisor' and another says 'Engineering         │
  │       Operations Manager'. What was your actual title?" │
  │                                                         │
  │  Q3: "All your roles appear to be military postings.    │
  │       Were you employed by Pakistan Air Force            │
  │       throughout, posted to different organizations?"   │
  │                                                         │
  │  Q4: "The team of 80 engineers appears under your CADI  │
  │       China role in one CV but under AEW&C in another.  │
  │       Which role had the 80-person team?"               │
  │                                                         │
  │  BUCKET B: Gap Discovery Questions                      │
  │                                                         │
  │  Q5: "There's a gap from Apr 2021 to Sep 2022 across   │
  │       all your CVs. What were you doing during this     │
  │       period?"                                          │
  │                                                         │
  │  Q6: "Your MS research (2013-15) isn't listed as work   │
  │       experience. Did you do research work during       │
  │       this period?"                                     │
  └─────────────────────────────────────────────────────────┘
       │
       │  1 LLM call ($0.01-0.03)
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  USER ANSWERS                                           │
  │                                                         │
  │  A1: "Nov 2017 to Dec 2019, LinkedIn is correct"        │
  │                                                         │
  │  A2: "My actual title was Maintenance Support Engineer  │
  │       for AEW&C fleet"                                  │
  │                                                         │
  │  A3: "Yes, Pakistan Air Force throughout. All postings  │
  │       are PAF rotations including CADI which was a      │
  │       deputation"                                       │
  │                                                         │
  │  A4: "80 engineers was AEW&C, not CADI China"           │
  │                                                         │
  │  A5: "I was Senior Engineering Officer on Crotale       │  ← NEW DISCOVERY
  │       SHORAD weapons system, airfield defense"          │     not in any CV
  │                                                         │
  │  A6: "Yes, I developed a novel ECCM algorithm for       │  ← NEW DISCOVERY
  │       ground-based radars, deployed on MPDR systems"    │     was in Education only
  └─────────────────────────────────────────────────────────┘
       │
       ▼
  [LLM + Answer Parser Prompt]  — parse free-text answers into structured data
       │
       │  1 LLM call ($0.01-0.03)
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  RESOLVED DATA                                          │
  │                                                         │
  │  Conflict Resolutions:                                  │
  │    - CADI dates: Nov 2017 - Dec 2019 (CORRECTED)        │
  │    - AEW&C title: Maintenance Support Engineer (PICKED) │
  │    - Employer: Pakistan Air Force for ALL roles (SET)    │
  │    - Team of 80: assigned to AEW&C role (MOVED)         │
  │                                                         │
  │  New Discoveries:                                       │
  │    - NEW ROLE: Crotale SHORAD, Apr 2021 - Sep 2022      │
  │    - ENRICHED: MS Research = actual role with output     │
  │                                                         │
  │  These go DIRECTLY into Cloud. Parser is NOT re-run.    │
  └─────────────────────────────────────────────────────────┘
       │
       │  [resolution-merger.ts] — CODE, merges all resolutions
       │  into a single ResolvedProfile
       │
       ▼

=============================================================================
PHASE 5: BUILD CLOUD (Code — deterministic graph construction)
=============================================================================

  ResolvedProfile (all conflicts resolved, new discoveries included)
       │
       ▼
  [cloud.ts — buildCloudFromParsedCV()]
       │
       ├── For each role:
       │     Create CloudNode per skill
       │     Link evidence: "Python used at CADI China (2017-19)"
       │     Calculate duration: 25 months
       │     Set depth: applied / proficient / expert
       │
       ├── For new discoveries:
       │     Crotale → CloudNodes for field ops, weapons maintenance, etc.
       │     ECCM research → CloudNodes for radar, signal processing, etc.
       │
       ├── Dedup:
       │     "Configuration Management" appears in 3 roles
       │     → Single node, 3 evidence sources, depth = expert (3+ roles)
       │
       └── Classify:
             [taxonomy.ts] → domain, category, depth level per skill
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PROFILE CLOUD v1                                       │
  │                                                         │
  │  22 skill nodes, 10 roles, 7 domains                    │
  │  Each node has:                                         │
  │    - skill name                                         │
  │    - evidence sources (which roles, what bullets)        │
  │    - depth (mentioned → applied → proficient → expert)  │
  │    - duration (total months across all roles)            │
  │    - domain classification                              │
  │                                                         │
  │  Example node:                                          │
  │    "Configuration Management"                           │
  │    depth: expert (3 roles, 96 months, CMDB project)     │
  │    evidence:                                            │
  │      - PAC Kamra (2008-13): "Implemented CMDB"          │
  │      - CADI China (2017-19): "configuration governance" │
  │      - PMO (2022-23): "fleet serviceability >90%"       │
  └─────────────────────────────────────────────────────────┘
       │
       │  CODE (free, instant, deterministic)
       │  No LLM needed — graph construction + math
       └──────────────────────────

=============================================================================
PHASE 6: ENRICHMENT QUESTIONS (LLM + User — OPTIONAL)
=============================================================================

  Profile Cloud v1
       │
       ▼
  [LLM + Enrichment Prompt]
       │
       │  LLM analyzes Cloud for WEAK nodes — skills with:
       │    - Only "mentioned" depth (skills section, no role evidence)
       │    - Single role evidence (could be deeper)
       │    - Missing metrics (no quantified impact)
       │    - Domain gaps (has aviation + defense, but Cloud is thin on PM tools)
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  ENRICHMENT QUESTIONS                                   │
  │                                                         │
  │  Q1: "You mention JIRA in your skills but no role       │
  │       shows JIRA usage. Where did you use JIRA?"        │
  │                                                         │
  │  Q2: "Your PAC Kamra role mentions 135+ systems.        │
  │       What was your specific role — design, test,       │
  │       production, or all three?"                        │
  │                                                         │
  │  Q3: "You have MBSE (Cameo) in skills. Which projects   │
  │       used Cameo specifically, and what did you model?" │
  │                                                         │
  │  Q4: "Your Crotale role — how large was the team you    │
  │       managed, and what was the fleet size?"            │
  └─────────────────────────────────────────────────────────┘
       │
       │  1 LLM call ($0.01-0.03)
       │
       ▼
  User answers → [LLM parses answers] → Cloud updates
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PROFILE CLOUD v2 (enriched)                            │
  │                                                         │
  │  Same 22+ nodes but DEEPER:                             │
  │    - JIRA: now linked to PMO role (was orphaned)        │
  │    - PAC Kamra: design + test + production (was vague)  │
  │    - MBSE: specific Cameo models identified             │
  │    - Crotale: team of 15, 4 weapons systems             │
  │                                                         │
  │  CLOUD IS NOW SEALED — ready for JD matching            │
  └─────────────────────────────────────────────────────────┘


=============================================================================
PIPELINE SUMMARY
=============================================================================

  PHASE    │ WHAT              │ WHO/WHAT      │ COST    │ LLM?
  ─────────┼───────────────────┼───────────────┼─────────┼──────
  1        │ Extract text      │ pdf-parse     │ $0      │ NO
  1        │ Parse each CV     │ LLM (Haiku)   │ $0.05   │ YES (5 calls)
  2        │ Clean data        │ Code          │ $0      │ NO
  3        │ Detect conflicts  │ Code          │ $0      │ NO
  ─────────┼───── GATE ────────┼───────────────┼─────────┼──────
  4        │ Generate Qs       │ LLM (Sonnet)  │ $0.03   │ YES (1 call)
  4        │ User answers      │ USER          │ $0      │ NO
  4        │ Parse answers     │ LLM (Haiku)   │ $0.01   │ YES (1 call)
  4        │ Merge resolutions │ Code          │ $0      │ NO
  5        │ Build Cloud       │ Code          │ $0      │ NO
  6        │ Enrichment Qs     │ LLM (Sonnet)  │ $0.03   │ YES (1 call)
  6        │ User answers      │ USER          │ $0      │ NO
  6        │ Update Cloud      │ Code          │ $0      │ NO
  ─────────┼───────────────────┼───────────────┼─────────┼──────
  TOTAL    │                   │               │ ~$0.12  │ 8 LLM calls


=============================================================================
WHAT GETS OPTIMIZED WHERE
=============================================================================

  COMPONENT              │ OPTIMIZED BY        │ SCORECARD
  ───────────────────────┼─────────────────────┼────────────────────────
  Parser Prompt          │ AutoResearch        │ "Did it extract all info
  (Phase 1)              │ (automated)         │  from each CV correctly?"
                         │                     │
  Conflict Detector      │ Manual code fixes   │ Unit tests — known conflicts
  (Phase 3)              │ (deterministic)     │  in known CVs detected?
                         │                     │
  Socratic Prompt        │ AutoResearch        │ Built from USER RATINGS
  (Phase 4 + 6)          │ (after ratings)     │  "Was this question useful?"
                         │                     │
  Answer Parser Prompt   │ AutoResearch        │ "Did it parse the answer
  (Phase 4)              │ (automated)         │  into correct structured data?"
                         │                     │
  Cloud Builder          │ Manual code fixes   │ Unit tests — known profile
  (Phase 5)              │ (deterministic)     │  produces expected Cloud?
                         │                     │
  Enrichment Prompt      │ AutoResearch        │ Built from USER RATINGS
  (Phase 6)              │ (after ratings)     │  "Was this question useful?"


=============================================================================
WHAT NEEDS API KEY vs WHAT DOESN'T
=============================================================================

  DOESN'T NEED API KEY (can build/test NOW):
    - Phase 2: cv-cleaner.ts (pure code)
    - Phase 3: conflict-detector.ts (pure code)
    - Phase 4: resolution-merger.ts (pure code)
    - Phase 5: cloud.ts (pure code)
    - Phase 5: taxonomy.ts (pure code)
    - All scorecards (pure code)
    - All unit tests

  NEEDS API KEY (for LLM calls):
    - Phase 1: Parser calls (5 x Haiku)
    - Phase 4: Socratic question generation (1 x Sonnet)
    - Phase 4: Answer parsing (1 x Haiku)
    - Phase 6: Enrichment question generation (1 x Sonnet)
    - AutoResearch optimization runs

  WORKAROUND WITHOUT API KEY:
    - Phase 1: Claude Code (me) can parse CVs manually → save as fixtures
    - Phase 4: Claude Code (me) can generate Socratic questions → save
    - All downstream code works on fixtures without any API
```
