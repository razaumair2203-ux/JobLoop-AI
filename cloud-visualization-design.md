# Profile Cloud Visualization — Design Document

## Research Sources
- [Skill-graph.com](https://skill-graph.com/) — Node/edge/depth/evidence data model
- [MuchSkills](https://www.muchskills.com/) — Bubble size = proficiency, sector chart alternative, Red Dot design winner
- [NNG Skill Mapping](https://www.nngroup.com/articles/skill-mapping/) — Radar chart for multi-axis comparison
- [ESCO](https://esco.ec.europa.eu/) — 13,890 skill concepts, 4 sub-classifications (Knowledge, Skills, Transversal, Language)
- [O*NET](https://www.onetcenter.org/) — 6 broad domains, 46 skill areas, 21 cognitive abilities, 325 intermediate work activities
- [SFIA](https://sfia-online.org/) — 7 responsibility levels, 121 professional skills with codes
- [AIHR Skills Taxonomy](https://www.aihr.com/blog/skills-taxonomy/) — Hierarchical: Broad Category > Specific Category > Individual Skills
- [Nightingale Career Viz](https://nightingaledvs.com/how-i-used-data-visualization-to-showcase-my-career-trajectory/) — Timeline + dual-series chart

## The Problem

Current "Cloud" is a flat tag list of 171 keywords. Countries are skills. Sentences are competencies. No structure, no insight, no wow.

## What Competitors Do (and why it's insufficient)

| Tool | After Upload | Visualization | Gap Detection |
|------|-------------|---------------|---------------|
| MuchSkills | Manual input | Bubble chart (size=interest) + sector chart (beginner/intermediate/expert) | Team-level only |
| Skill-graph.com | GitHub commits | Interactive node graph | AI gap analysis vs target role |
| Teal | Parse into form | Keyword match % | Missing keywords only |
| Rezi | Parse into editor | Flat list + ATS score | None |
| Everyone else | Template filling | None meaningful | None |

**Key insight**: MuchSkills uses SELF-DECLARED proficiency (meaningless). Skill-graph uses GitHub commits (dev-only). Nobody uses EVIDENCE from actual work history.

## Our Approach: Evidence-First Taxonomy

### Taxonomy Structure (4 levels)

```
Domain (3-6 per person)
  > Category (3-8 per domain)
    > Skill (5-20 per category)
      > Evidence (1-N per skill)
```

Example for the user's PM CV:
```
Defense & Aerospace
  > Systems Integration
    > Avionics Integration (4 roles, 12yr, impact: 135+ systems)
    > MBSE / SysML (3 roles, 8yr)
    > Interface Control (2 roles, 5yr)
  > Program Management
    > PMO Leadership (3 roles, 7yr, cert: PMP)
    > EVM Reporting (2 roles, 5yr)
    > Risk Management (3 roles, 10yr)
  > Fleet & Maintenance
    > Configuration Management (4 roles, 15yr, project: CMDB)
    > Reliability Engineering (2 roles, 5yr)
    > Spares Planning (1 role, 2yr)
Education & Training
  > Professional Education
    > Curriculum Design (1 role, 3yr)
    > Industry Partnerships (1 role, 3yr)
```

### Depth Model (Evidence-Based, NOT Self-Declared)

Adapted from skill-graph.com but using CV evidence instead of GitHub:

| Level | Our Definition | How We Detect It |
|-------|---------------|------------------|
| Mentioned | Listed in skills section only | No role evidence, self-declared |
| Applied | Used in 1 role, <2 years | 1 role evidence, <24 months |
| Proficient | Used in 2+ roles OR 2+ years | 2+ role evidence OR 24+ months |
| Deep Expert | 3+ roles AND 5+ years AND impact metrics | Multiple evidence types + measurable outcomes |

### Evidence Hierarchy (Strength Descending)
1. Quantified impact ("35% reduction", "$1.27M savings", "135+ systems")
2. National/international project involvement
3. Certification (PMP, CSEP, PE)
4. Award/commendation from external body
5. Multiple role usage (skill appears in 3+ different jobs)
6. Duration (5+ years of continuous use)
7. Single role usage
8. Skills section mention only (weakest)

## Visualization Components

### 1. Career DNA Summary (Hero Section)
Four stat cards:
- **Career Span**: 15+ years (earliest to latest role)
- **Roles**: 5 positions across 3 organizations
- **Domains**: Defense, Aviation, Education
- **Evidence Points**: 47 (total evidence items across all skills)

### 2. Domain Treemap (Breadth Visualization)
Visual: Nested rectangles where:
- AREA = total months in domain
- COLOR = domain identity (defense=red, aviation=sky, education=amber)
- Inner rectangles = skill categories within domain

Pure CSS implementation (no chart library needed):
```
+-------------------------------------+
|  Defense & Aerospace    (12yr)       |
|  +----------+  +--------+  +------+ |
|  | Systems  |  | Program|  | Fleet| |
|  | Integ.   |  | Mgmt   |  | Sust.| |
|  +----------+  +--------+  +------+ |
+-------------------------------------+
+-----------+
| Education |
| (3yr)     |
+-----------+
```

### 3. Skill Depth Bars (Depth Visualization)
Top 12 skills ranked by evidence depth score:
```
Avionics Integration  ████████████████████████  4 roles · 12yr · impact
Program Management    ██████████████████████    3 roles · 10yr · PMP
Configuration Mgmt    █████████████████████     4 roles · 15yr · project
Risk Management       ████████████████          3 roles · 10yr
Systems Integration   ██████████████            3 roles · 8yr
MBSE                  ██████████                2 roles · 5yr
EVM Reporting         ████████                  2 roles · 5yr
Team Leadership       ███████                   4 roles · 12yr
```

Bar color intensity = depth level:
- Mentioned = zinc-300 (gray)
- Applied = brand-300 (light)
- Proficient = brand-500 (medium)
- Deep Expert = gradient brand-600 to brand-400 (vibrant)

Badges on right:
- Award icon (amber) = has external validation
- Project icon (violet) = has named project
- Cert icon (blue) = has certification
- Impact icon (green) = has quantified metrics

### 4. Career Timeline (Role Flow)
Horizontal timeline showing:
```
2008        2013     2016  2018  2020  2023  Present
|-----------|--------|-----|-----|-----|-----|
| SE&I Eng  | Ops Mgr| ASI | DDAvPMO| Prog |
| PAC Kamra | AF     |CADI | AF PMO | Lead |
| Pakistan  |        |China|        | Edu  |
```
- Each role is a colored block (color = domain)
- Width = duration
- Company name below
- Click to see skills used in that role

### 5. Differentiators Panel
Compact rows:
- Certifications: PMP, PMI-ACP, PE, CSEP
- Awards: Chief of Airstaff Commendation, PAC Chairman Appreciation, CADI Commendation
- National Projects: Glass Cockpit (11 countries, $11.6M), Backup Mission Computer (135+ systems, $1.27M)
- Education: BE Aeronautical, MS Signal Processing
- Training: System Engineering (Colorado), Engineering Mgmt (Rice), PM (Google)

### 6. Gap Identification (THE DIFFERENTIATOR)
After showing what the user HAS, show what's MISSING for their expertise level:

"Based on your 15 years in Defense & Aerospace Systems Integration..."

**Expected but not found:**
- Digital Twin / Model Simulation (emerging in defense SE)
- Cybersecurity / NIST frameworks (increasingly required)
- Cloud infrastructure (AWS GovCloud / Azure Government)
- Data Engineering / MLOps (your CV mentions AI/ML interest)

**Depth gaps (present but shallow):**
- MBSE: 2 roles but no certification (INCOSE CSEP would strengthen)
- Agile: Certified but only 1 role shows Agile delivery

This is where Socratic questions come in — "Tell me more about your MBSE experience. Did you create models or just review them?"

### 7. Conflict Detection & Resolution
When multiple CVs are uploaded, detect and surface:

**Date Conflicts:**
- "PM CV says 2016-18 as Engineering Ops Manager, SE CV says 2016-17 as Maintenance Support Engineer — same period, different titles. Which is accurate?"

**Title Conflicts:**
- "PM CV: 'Aerospace Systems Integration Lead' vs SE CV: 'Lead Systems Integration Expert' (2018-20) — same role, different title. We'll use the more specific one."

**Skill Conflicts:**
- "PM CV emphasizes Project Management, SE CV emphasizes Systems Engineering — both are valid perspectives. Your Cloud includes evidence from both."

**Resolution Strategy:**
1. Auto-merge where titles are similar (fuzzy match)
2. Surface conflicts as Socratic questions: "We noticed your 2018-20 role is described differently in two CVs. Which title best represents what you did?"
3. Keep BOTH evidence sets — more evidence is always better
4. Flag gaps >12 months between roles (not as negative, just noting)

## Implementation Plan

### Phase 1: Taxonomy Engine (packages/ai)
Create `packages/ai/src/taxonomy.ts`:
- `classifySkill(name: string): { domain, category, skill }` — maps raw skill names into our taxonomy
- `inferDepthLevel(evidence: Evidence[]): DepthLevel` — calculates evidence-based depth
- `detectGaps(skills: ClassifiedSkill[], persona: Persona): Gap[]` — identifies missing skills for expertise level
- Uses a curated taxonomy map (not AI) for consistency

### Phase 2: Conflict Detector Enhancement
Enhance `packages/ai/src/conflict-detector.ts`:
- Already exists with `detectConflicts()`, `companiesMatch()`, `titlesOverlap()`
- Add: title reconciliation, evidence merge strategy, Socratic question generation for ambiguous conflicts

### Phase 3: Cloud Visualization Component
Create `apps/web/src/components/profile-cloud/`:
- `CloudSummary.tsx` — stat cards
- `DomainTreemap.tsx` — nested domain rectangles (pure CSS)
- `SkillDepthBars.tsx` — evidence bars with badges
- `CareerTimeline.tsx` — horizontal role blocks
- `Differentiators.tsx` — certs, awards, projects
- `GapAnalysis.tsx` — missing/shallow skills
- `ConflictPanel.tsx` — detected conflicts with resolution UI

### Phase 4: Radar Chart (Full Profile Page)
Install Recharts, add radar chart showing:
- 6-8 axes representing skill categories
- Area fill showing coverage
- Overlay target role requirements for gap visualization

## Parser Training (AutoResearch Application)

The dev-mode regex parser is scaffolding — it doesn't need training.

What DOES need AutoResearch:
1. **CV_PARSER_SYSTEM_PROMPT** — the Haiku prompt that parses CVs in production
   - Test bank: 50 test pairs already built
   - Mutation targets: skill extraction completeness, role detection accuracy, conflict detection
   - Scoring: factual_preservation, metrics_preserved, ats_structure, no_fabrication

2. **Taxonomy classifier** — once built, can be validated against the test bank
   - Does it classify "MBSE" correctly into Systems Engineering > Modeling?
   - Does it detect the right depth level from evidence?

3. **Gap identifier** — needs domain-specific knowledge
   - What skills are expected for a "Senior Systems Engineer" in defense?
   - This is where O*NET and ESCO data become valuable
   - Could seed from O*NET occupation profiles

## Who Identifies Conflicts?

**Parser** (first pass): Basic detection during `mergeIntoCloud()`:
- Date overlaps
- Same company different titles
- Duplicate skills with conflicting evidence

**Conflict Detector** (second pass): `detectConflicts()` in packages/ai:
- Cross-CV comparison
- Fuzzy title matching
- Timeline gap detection

**Socratic Engine** (third pass): Turns conflicts into questions:
- "Your PM CV says X, your SE CV says Y — which better describes your role?"
- "We noticed a gap between 2013-2016. Were you studying? Freelancing?"

**User** (final authority): Resolves via Socratic answers, Cloud updates.

## What Makes This Better Than MuchSkills

| Dimension | MuchSkills | JobLoop |
|-----------|-----------|---------|
| Input | Manual self-declaration | Auto-extract from CVs |
| Depth | Self-rated (meaningless) | Evidence-based (verifiable) |
| Visualization | Bubble size = interest | Bars = years + roles + impact |
| Gap detection | Team-level HR view | Individual career gaps |
| Conflict handling | N/A (single source) | Multi-CV reconciliation |
| Taxonomy | 65K pre-built skills | Domain-aware classification |
| Enrichment | None | Socratic questions fill gaps |
| Purpose | HR workforce planning | Individual job search advocacy |

The user uploads garbage. We turn it into gold. Not by making it pretty — by making it TRUE and USEFUL.
