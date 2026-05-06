# Cloud Pipeline Specification
# CV Parsing -> Cloud Building -> Visualization

> Version: 1.0 | May 2026
> Status: SPECIFICATION (implementation partially exists, gaps identified)
> This is the source of truth for how raw CV text becomes a visual Profile Cloud.

---

## 1. THE PROBLEM

A user uploads 1-5 CVs. Same person, different framings. The same role appears with:
- Different titles ("Maintenance Supervisor" vs "Engineering Operations Manager")
- Different date ranges ("2016-18" vs "2016-17" vs "Dec 2015-Nov 2017")
- Different skill emphasis (one CV highlights AMOS, another highlights EVM)
- Some roles collapsed (3 roles merged into "2020-23")
- Some roles hidden (Crotale posting absent from all CVs)

We must turn this messy, conflicting input into a single, accurate, evidence-grounded
profile. No fabrication. No inflation. When in doubt, mark as uncertain and let
Socratic questions resolve it.

---

## 2. PIPELINE STAGES

```
Stage 1: TEXT EXTRACTION
  PDF/DOCX -> raw text (pdf-parse, mammoth)

Stage 2: STRUCTURAL PARSING
  raw text -> sections + roles + skills + education + certs + awards + projects

Stage 3: CROSS-CV DEDUPLICATION
  N parsed CVs -> 1 canonical profile (resolve conflicts)

Stage 4: CLOUD BUILDING
  canonical profile -> CloudNodes with evidence chains

Stage 5: TAXONOMY CLASSIFICATION
  CloudNodes -> Domain > Category > Skill hierarchy + depth assessment

Stage 6: ANCHOR POINT COMPUTATION
  Per domain: years, progression, organizations, certs, programs, impact

Stage 7: VISUALIZATION
  Anchor points -> visual components (breadth, depth, timeline, gaps)
```

---

## 3. STAGE 2: STRUCTURAL PARSING — What Must Be Extracted

### 3.1 Roles (the hardest part)

For each role, we need:
```
{
  title: string            // "Deputy Director, PMO"
  organization: string     // "Pakistan Air Force — PMO, JF-17 Program"
  employer: string         // "Pakistan Air Force" (may differ from organization)
  start_date: string       // "Nov 2017" (month+year when available)
  end_date: string         // "Dec 2019" or "Present"
  duration_months: number  // computed or stated
  bullets: string[]        // what they actually did
  technologies_used: string[]  // skills demonstrated IN this role
  metrics: string[]        // quantified impact ("saved $1.27M", "135+ systems")
  programs: string[]       // named programs/platforms ("JF-17 Thunder", "AEW&C")
  team_size: number|null   // "80 engineers and technicians"
  domain: string           // aviation, defense, management, academic, etc.
  seniority_signals: string[]  // "Director", "Lead", "Senior", "Deputy"
}
```

### 3.2 Education
```
{
  institution: string
  degree: string           // "BE", "MS", "PhD"
  field: string            // "Aeronautical/Avionics Engineering"
  start_year: number
  end_year: number
  research_topic: string|null  // "Novel ECCM algorithm for ground-based radars"
  relevance: string        // how this connects to career skills
}
```

### 3.3 Certifications (WEIGHTED)

Not all certs are equal. Classification matters for depth assessment:

| Tier | Examples | Weight in Depth |
|------|----------|-----------------|
| **Industry Gold** | PMP, PMI-ACP, PE, EASA Part-66, AWS SA Pro | High — proves validated expertise |
| **Specialization** | Google PM Certificate (6 courses), Rice Eng PM (3 courses) | Medium — structured learning |
| **Course** | Single Coursera/edX course | Low — awareness, not mastery |
| **Military/Govt** | Type Rating, Staff Course, Security Clearance | Context-dependent — high in defense |

```
{
  name: string
  issuer: string           // "PMI", "Google via Coursera", "PAF"
  tier: "gold" | "specialization" | "course" | "military"
  year: number|null
  pdus: number|null        // continuing ed credits
  credential_id: string|null
}
```

### 3.4 Skills

Must distinguish between:
- **Demonstrated**: Appears in role bullets with context ("Led Agile delivery of...")
- **Listed**: Appears in skills section only (weakest evidence)
- **Certified**: Has certification backing
- **Inferred**: Not listed explicitly but implied by role context

### 3.5 Awards & Recognition
```
{
  title: string            // "Chief of Air Staff Commendation"
  issuer: string           // Organization granting it
  significance: string     // "Highest operational-level commendation in PAF"
  related_skills: string[] // What this proves
}
```

### 3.6 Programs & Platforms

Named programs are anchor points — they ground skills in real context:
```
{
  name: string             // "JF-17 Thunder Block III"
  type: string             // "fighter aircraft", "AEW&C platform", "weapons system"
  roles_involved: number[] // which roles touched this program
  user_contribution: string // "Systems integration lead"
}
```

---

## 4. STAGE 3: CROSS-CV DEDUPLICATION — The Hard Problem

### 4.1 Same Role, Different Titles

**Problem**: Role at CADI China (2017-2019) appears as:
- "Avionics Systems Integration Lead" (KSA-ME CV)
- "Aerospace Systems Integration Lead" (PM CV)
- "Lead Systems Integration Expert" (SE CV)

**Solution**: Match by DATE RANGE first, company second, title last.
```
Priority 1: Same start_year AND end_year -> same role (regardless of title)
Priority 2: Overlapping dates (within 1 year) + same company -> likely same role
Priority 3: Same dates but different company -> flag for user confirmation
```

When merging, KEEP the longest title as canonical, merge all bullets.

### 4.2 Collapsed Roles

**Problem**: Roles 5+6+7 (2020-2023) collapsed into single "Deputy Director" entry.

**Detection signals**:
- Duration > 3 years with vague bullets covering different responsibilities
- Title changes implied ("Assistant Director" early, "Deputy Director" later)
- Different programs mentioned in same entry (JF-17 vs Crotale)

**Solution**: Flag for Socratic decomposition. "Your 2020-2023 role spans 3 years
and mentions both PMO governance and field weapons operations. Were these the same
posting or different assignments?"

### 4.3 Hidden Roles (Timeline Gaps)

**Problem**: Crotale posting (Apr 2021 - Sep 2022) absent from all CVs.

**Detection**: Find gaps > 6 months between known roles.
```
Role ends Dec 2020, next role starts Sep 2022 -> 21 month gap detected
```

**Solution**: Socratic question. "There's an 21-month gap between your PMO role
and your next posting. What were you doing during Apr 2021 - Sep 2022?"

### 4.4 Conflicting Dates

**Problem**: Same role shows different dates across CVs:
- SE CV: "2016-17"
- PM CV: "2016-18"
- Actual: "Dec 2015 - Nov 2017"

**Rules**:
1. Use the WIDEST date range (union, not intersection) — it's likely closest to truth
2. Prefer month+year dates over year-only
3. Flag conflicts > 1 year for Socratic confirmation
4. Education dates are NEVER career dates

### 4.5 Single Employer, Multiple Postings (Military Pattern)

**Detection**: All roles share the same employer but different organizations/locations.

**Handling**: Group under employer umbrella, show as rotational assignments.
```
Pakistan Air Force (2008 - present)
  ├── PAC Kamra (2008-2013) — Systems & Design
  ├── Air University (2013-2015) — MS Research
  ├── AEW&C Squadron (2015-2017) — Maintenance
  ├── CADI China (2017-2019) — Integration Lead
  ├── PMO JF-17 (2020-2021) — Asst Director
  ├── Field Unit (2021-2022) — Crotale Weapons
  ├── PMO JF-17 (2022-2023) — Deputy Director
  ├── PMO AEW&C (2023-2024) — PMO Officer
  ├── NUTECH (2024-2025) — Quality Academics
  └── College of Aero Eng (2025-present) — Research & Faculty
```

---

## 5. STAGE 5: TAXONOMY — Grounded in Standards

### 5.1 Sources
- **ESCO** (European): 13,890 skills, 4-level hierarchy
- **O*NET** (US): 46 skill areas, 325 intermediate work activities
- **SFIA** (IT-specific): 7 levels, 121 professional skills
- Our taxonomy is a CURATED SUBSET relevant to the user's domains

### 5.2 Skill Synonyms

Users don't use taxonomy terms. They write what they know:
```
User writes              ->  Taxonomy maps to
"led team of 80"         ->  Team Leadership (leadership > people)
"RAID logs"              ->  Risk Management (management > risk_governance)
"AMOS"                   ->  AMOS (tools > aviation_tools) + Aircraft Maintenance
"FMECA"                  ->  FMECA (defense_aerospace > systems_integration)
"OBE frameworks"         ->  Outcome-Based Education (quality_compliance > quality)
"C-check"                ->  Aircraft Maintenance (maintenance_ops > maintenance)
```

The taxonomy must be ALIAS-AWARE. A flat dictionary won't work — need fuzzy
matching + context from surrounding text.

### 5.3 Domain Assignment Rules

Skills often belong to multiple domains. Assignment priority:
1. Where the skill has the MOST evidence (most roles, most months)
2. The user's PRIMARY domain (if ambiguous)
3. The most specific domain (prefer "defense_aerospace" over "general")

---

## 6. STAGE 6: ANCHOR POINTS — What Makes a Domain Compelling

This is the core intellectual contribution. For each domain, compute:

### 6.1 Experience Anchor
```
{
  total_years: number          // sum of role durations in this domain
  role_count: number           // distinct roles
  progression: string[]        // ["Engineer", "Lead", "Asst Director", "Deputy Director"]
  highest_seniority: string    // "Deputy Director"
  is_current: boolean          // still active in this domain?
}
```

### 6.2 Organization Anchor
```
{
  organizations: Array<{
    name: string
    type: "military" | "government" | "corporate" | "academic" | "startup"
    country: string
    prestige_signal: string|null  // "National defense program", "Fortune 500"
  }>
  international_count: number    // countries worked in
  has_international: boolean
}
```

### 6.3 Certification Anchor
```
{
  gold_certs: string[]         // PMP, PE, PMI-ACP
  specializations: string[]    // Google PM, Rice PM
  courses: string[]            // individual Coursera courses
  military_quals: string[]     // Type ratings, staff courses
  total_pdus: number
}
```

### 6.4 Program Anchor
```
{
  named_programs: Array<{
    name: string               // "JF-17 Thunder Block III"
    type: string               // "fighter aircraft development"
    role_in_program: string    // "Systems integration lead"
    impact: string|null        // "135+ systems deployed"
    scale: string|null         // "multi-billion dollar joint development"
  }>
}
```

### 6.5 Impact Anchor
```
{
  quantified_impacts: Array<{
    metric: string             // "$1.27M saved", "11 countries exported to"
    context: string            // "Indigenous backup mission computer program"
    program: string|null
  }>
  team_sizes: number[]         // [80, 15, ...]
  awards: string[]
}
```

### 6.6 Depth Score (Internal, NOT shown to user)

For ranking/sorting only. Based on evidence, not self-declaration:
```
depth = (
  role_months * 0.3 +         // duration weight
  role_count * 15 +            // breadth across roles
  has_impact * 10 +            // quantified results
  gold_cert_count * 12 +       // industry validation
  specialization_count * 5 +   // structured learning
  award_count * 8 +            // recognition
  program_count * 6 +          // named program context
  international * 5            // global experience
)
```

---

## 7. STAGE 7: VISUALIZATION — Purpose-Driven Views

Every visualization must answer a SPECIFIC question for the user.

### 7.1 Breadth Radar — "Where do I have coverage?"
- **Question answered**: Which domains do I span? Where am I deepest?
- **Data**: Domain anchor scores normalized to 0-1
- **Visual**: Radar/spider chart, 1 axis per domain
- **Interaction**: Hover shows domain summary (years, roles, top skills)

### 7.2 Depth Drill-Down — "How deep am I in each area?"
- **Question answered**: Within each domain, which skills have real evidence?
- **Data**: Skills per domain with depth assessment
- **Visual**: Horizontal bars, grouped by category, colored by depth level
- **Interaction**: Click skill to see evidence chain (which roles, which programs)

### 7.3 Career Timeline — "What's my trajectory?"
- **Question answered**: How have I progressed? Where did I pivot?
- **Data**: Roles sorted chronologically, colored by domain
- **Visual**: Horizontal swim lanes with year axis
- **Key detail**: Seniority progression visible (title gets bolder/larger)
- **Interaction**: Click role to see skills demonstrated

### 7.4 Anchor Summary — "What makes me compelling?"
- **Question answered**: What are my strongest selling points?
- **Data**: Top anchor points across all domains
- **Visual**: Cards/chips highlighting: programs, impacts, certs, international
- **NOT a chart**: This is curated narrative, not data visualization

### 7.5 Gap Identification — "Where should I grow?"
- **Question answered**: What adjacent skills would strengthen my profile?
- **Data**: detectGaps() with adjacency + primary domain checks
- **Visual**: Simple list with Socratic CTA
- **Rules**: Only suggest in primary domains, only adjacent to existing skills

---

## 8. WHAT THE CURRENT PARSER CAN vs CANNOT DO

### CAN (dev-mode regex parser):
- [x] Detect section headers (EXPERIENCE, EDUCATION, SKILLS, etc.)
- [x] Find date ranges (multiple formats)
- [x] Extract skill names from known dictionary (~120 skills)
- [x] Match certifications by pattern
- [x] Extract metrics/numbers from text
- [x] Basic role extraction (title + company + dates)
- [x] Deduplicate roles within a single CV

### CANNOT:
- [ ] Parse multi-column PDF text correctly
- [ ] Handle roles with no clear date range
- [ ] Detect role progression/seniority from titles
- [ ] Distinguish employer vs organization vs posting location
- [ ] Extract program/platform names from context
- [ ] Detect team sizes from bullets
- [ ] Identify award significance/tier
- [ ] Classify certification tier (gold vs course)
- [ ] Handle military career patterns (single employer, rotational)
- [ ] Detect collapsed roles (multiple roles merged into one entry)
- [ ] Find timeline gaps between roles
- [ ] Resolve conflicting dates across CVs
- [ ] Extract research topics from education
- [ ] Map user's wording to taxonomy synonyms with context

### WHAT'S NEEDED:
The regex parser was always a dev-mode fallback. Production needs Claude Haiku
with the CV_PARSER_SYSTEM_PROMPT (already written at packages/ai/src/prompts/cv-parser.ts).

But even with AI parsing, Stage 3 (cross-CV deduplication) and Stage 6 (anchor
point computation) need dedicated logic that doesn't exist yet.

---

## 9. IMPLEMENTATION PRIORITY

```
P0 — Without these, Cloud is useless:
  1. Production AI parser (switch to Haiku mode)
  2. Cross-CV role deduplication by date range (DONE in addEvidence)
  3. Education vs career date filtering (DONE in classifyCloud)
  4. Basic depth assessment (DONE in inferDepthLevel)

P1 — Without these, Cloud is misleading:
  5. Certification tier classification
  6. Role seniority detection
  7. Program/platform extraction
  8. Collapsed role detection + Socratic decomposition
  9. Timeline gap detection + Socratic questions

P2 — Without these, Cloud is functional but not compelling:
  10. Organization prestige signals
  11. International experience detection
  12. Award significance classification
  13. Full anchor point computation
  14. D3.js bubble/force visualization (for dedicated Cloud page, not onboarding)
```

---

## 10. EXAMPLE: What the Cloud Should Show for the Test User

For M. Umair Raza (ground-truth-profile.json):

### Domain: Defense & Aerospace
- **18 years** across 10 roles (PAF career)
- **Progression**: Engineer → Lead → Asst Director → Deputy Director
- **Programs**: JF-17 Thunder (3 roles), AEW&C Erieye (2 roles), Crotale SHORAD (1 role)
- **International**: China deputation (CADI, 2 years)
- **Impact**: $1.27M saved (mission computer), $11.6M revenue (export), 135+ systems deployed
- **Certs**: PMP (gold), PMI-ACP (gold), PE (gold)
- **Team scale**: Up to 80 personnel

### Domain: Program Management
- **7 years** direct PM roles (PMO x3)
- **Certs**: PMP, PMI-ACP, Google PM (specialization), Rice Eng PM (specialization)
- **Tools**: EVM, RAID, MS Project
- **Adjacent**: 7 Coursera courses in PM/leadership

### Domain: Maintenance & Operations
- **~4 years** (AEW&C + Crotale)
- **Fleet**: 9-aircraft AEW&C fleet
- **Tools**: AMOS, Part-145 compliance
- **Skills**: MTBF/MTTR, fault diagnosis, staggered maintenance

### Domain: Academic/Quality
- **2 years** (NUTECH + College of Aero Eng)
- **Scope**: QA head, PEC/HEC accreditation, OBE frameworks
- **Teaching**: Systems Engineering

THIS is what the visualization should show. Not "171 skills identified."
