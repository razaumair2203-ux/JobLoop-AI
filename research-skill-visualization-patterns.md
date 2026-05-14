# Skill Visualization Patterns Research
## Date: 2026-05-13
## Purpose: Practical patterns for Profile Cloud skill visualization (SVG + Tailwind, no paid libraries)

---

## 1. How LinkedIn Skills Section Works

### Current State (2026)
- Up to 100 skills allowed, **top 3 pinned** and prominently displayed
- Endorsement count shown as a small number next to each skill
- LinkedIn **killed Skills Assessment badges in late 2023**, removed all badges from profiles in 2024
- Official reason: "hiring managers found examples of how candidates applied skills more valuable than quiz results"
- Endorsement count still affects search ranking (50+ endorsements outranks 0)

### Visual Pattern
- Simple text list, grouped by category
- Endorsement count is the ONLY visual signal (just a number, no bar)
- No proficiency levels, no depth, no evidence linking
- "Show more" accordion for skills beyond top 3

### What We Learn
- LinkedIn ABANDONED visual skill assessment (badges) because context > quiz scores
- Endorsements are gameable and meaningless (reciprocal clicking)
- Their direction confirms our thesis: evidence of application > self-declared ratings
- **Takeaway for us**: Don't copy LinkedIn. They failed at this. Our evidence model is already better.

---

## 2. How MuchSkills Displays Skills

### Two Visualization Modes

**Sector Chart (used 99% of the time)**
- Pie/donut-like chart divided into skill categories
- Each skill has 3 levels: Beginner / Intermediate / Expert
- Self-rated by the employee
- Used for skills that CAN be compared (e.g., programming languages)
- Color-coded sectors by category

**Bubble Chart (rare)**
- Bubbles sized by INTEREST, not proficiency
- User taps bubble to increase/decrease size
- Used for skills "not easy to compare or measure"
- Bubble size = "I want to use this more" not "I'm good at this"

### Key Insight
- MuchSkills bubble size represents INTEREST (self-declared, subjective)
- Their sector chart is self-rated Beginner/Intermediate/Expert (also subjective)
- NO evidence behind any rating. Pure self-declaration.
- Pretty visualization, zero substance underneath

### What We Learn
- Bubble charts look impressive but encode meaningless data when self-declared
- Category grouping (sectors) IS useful for organizing large skill sets
- **Takeaway for us**: We can use category grouping but our depth levels MUST be evidence-derived, not self-rated. That's our entire differentiator.

---

## 3. Competency Matrices in HR Tools

### Standard Scale Patterns

**4-Level Scale (most common in industry)**
| Level | Label | Color Convention |
|-------|-------|-----------------|
| 0 | No competency / Not applicable | Gray / Empty |
| 1 | Basic / Beginner / Awareness | Light blue or yellow |
| 2 | Intermediate / Practitioner | Medium blue or orange |
| 3 | Advanced / Expert | Dark blue or green |
| 4 | Master / Can teach others | Purple or gold |

**5-Level Scale (SFIA-inspired)**
Adds a "Follow" level at bottom and "Set strategy" at top. Too granular for consumer use.

**SFIA Framework (7 levels)**
- Levels 1-7 with generic attributes: Autonomy, Influence, Complexity, Business Skills, Knowledge
- Each level has responsibility descriptions with indicative verbs: follow, assist, apply, enable, ensure, advise, initiate, influence, set strategy
- Evidence requirement: "demonstrable practice at that level in a real-world situation"
- Way too granular for a job search tool, but the EVIDENCE REQUIREMENT principle is gold

### Visual Patterns Used
- **Heat map grid**: Employees as rows, skills as columns, color intensity = level (Deel, AG5)
- **Radar/spider charts**: 5-8 skills plotted on axes, filled polygon shows profile shape (Visual Paradigm)
- **Horizontal bars with level fills**: Bar divided into segments, filled to current level
- **Traffic light dots**: Red/amber/green circles in a grid (simple but limited)
- **Star ratings**: 1-5 stars (gameable, vague)

### What We Learn
- 4 levels is the sweet spot for consumer understanding (maps perfectly to our mentioned/applied/proficient/expert)
- Color intensity (light to dark) is the most intuitive visual encoding for depth
- Heat map grids work for teams but NOT for individual profile view (too clinical)
- Radar charts are good for shape comparison but hide evidence
- **Takeaway for us**: 4-level system, color intensity encoding, with evidence drill-down that no HR tool offers

---

## 4. The Skill Bar Problem: What Makes Them Meaningful vs Meaningless

### The Universal Criticism

Every credible source agrees: **self-rated percentage skill bars are meaningless**.

Core problems:
1. "What does 80% Python mean?" -- No answer exists. 80% of what? All Python features? Compared to whom?
2. Dunning-Kruger: Beginners rate themselves 70-80%. Experts rate themselves 60-70%.
3. No consistent scale: 90% in one person's Python != 90% in another's
4. ATS can't read them (irrelevant for us, but shows industry consensus)
5. "What's the missing 20%?" -- Recruiters find this confusing, not informative

### What the Bar Length SHOULD Represent

Based on research, there are only a few defensible options for what a bar measures:

| What Bar Represents | Pros | Cons | Verdict |
|---------------------|------|------|---------|
| **Self-rated proficiency %** | Easy to create | Meaningless, Dunning-Kruger, no anchor | REJECT |
| **Years of experience** | Objective, measurable | Years != skill (10yr mediocre vs 2yr intense) | PARTIAL -- useful as one signal |
| **Evidence count** | Objective, transparent | 5 weak evidence != 1 strong evidence | PARTIAL -- needs tier weighting |
| **Evidence depth score** | Combines count + quality | Risks becoming opaque composite | USE WITH TRANSPARENCY |
| **Relative strength (vs own skills)** | Shows personal shape | "60% doesn't mean bad, just less than your best" needs explanation | GOOD for internal comparison |
| **JD match coverage** | Directly actionable | Only makes sense in JD context, not standalone profile | GOOD for analysis view |

### THE ANSWER: Segmented Evidence Bar

The bar should NOT represent a single percentage. It should be a **segmented bar showing evidence composition**:

```
Python  [||||||||||||||||||||    ]  Expert
         ^^^^^^^^^^  ^^^^^^^^  ^^
         Verified    Demonstrated  Corroborated
         (dark)      (medium)      (light)
```

- Total bar length = total evidence weight (not %)
- Segments colored by evidence TIER (our 4 tiers from evidence-credibility-model.md)
- The composition IS the information -- user sees "mostly verified evidence" vs "all self-declared"
- No percentage label needed. The visual tells the story.

### What We Learn
- Never show a percentage. Ever. It's indefensible.
- Bar length = evidence weight (tier-adjusted count), NOT self-assessment
- Segment fills by evidence tier = our unique differentiator
- Relative comparison (skill vs skill within same person) IS valid
- **Takeaway**: Segmented evidence bar is the pattern. No competitor does this.

---

## 5. Evidence-Based Visualization Patterns

### Workera's Skills Galaxy
- Interactive constellation map where related skills cluster spatially
- Color encodes proficiency: deep purple (beginner) -> magenta (developing) -> yellow/orange (accomplished)
- Proximity = skill relatedness (data science near ML, far from marketing)
- As you improve in one area, connected skills visually brighten
- Beautiful but requires WebGL/Canvas -- too heavy for our MVP

### Skill-Graph.com
- Graph network: nodes = skills, edges = relationships
- Evidence sourced from CVs, certificates, transcripts, project evidence
- Links skills to "verified signals"
- Interactive: hover states, scaling animations, drill-down
- Closest to what we want conceptually, but their implementation is opaque

### RPG Character Sheet Pattern
- Game UIs use segmented stat bars with clear level thresholds
- Visual "breakpoints" at each level boundary (vertical tick marks)
- Fill color changes at each tier (bronze -> silver -> gold)
- Hover shows the exact stat breakdown
- Familiar to younger demographics, intuitive universally

### SFIA Evidence Requirement
- "Demonstrable practice at that level in a real-world situation"
- Self-assessment must reference documented workplace evidence
- The framework itself doesn't visualize this well, but the PRINCIPLE is right

---

## 6. PRACTICAL IMPLEMENTATION PATTERNS (SVG + Tailwind)

### Pattern A: Segmented Evidence Bar (PRIMARY -- use for Profile Cloud)

```
Skill Name                                    Depth Level
[====|====|====|====|====|====|        ]      Expert
 T1    T1   T2   T2   T2   T3                4 tiers, 6 evidence points

Legend:
 [dark fill]   = Verified (Tier 1: certs, publications, quantified outcomes)
 [medium fill] = Demonstrated (Tier 2: work experience, projects, Socratic-enriched)
 [light fill]  = Corroborated (Tier 3: years claimed, titles, adjacent skills)
 [outline]     = Self-Declared (Tier 4: skill list only, no context)
```

**SVG Implementation:**
```tsx
// Each segment is a <rect> inside an <svg>
// Total width = max evidence weight (normalize across all skills)
// Segment width = proportional to evidence count at that tier
// Colors: Tailwind classes mapped to tiers

const TIER_COLORS = {
  verified:     'fill-indigo-600',    // darkest
  demonstrated: 'fill-indigo-400',    // medium
  corroborated: 'fill-indigo-200',    // light
  selfDeclared: 'fill-gray-200',      // barely there
} as const;

// Bar structure:
<svg viewBox="0 0 200 12" className="w-full h-3">
  {/* Background track */}
  <rect x="0" y="0" width="200" height="12" rx="6" className="fill-gray-100" />
  {/* Tier segments rendered left-to-right, strongest first */}
  <rect x="0" y="0" width={verifiedWidth} height="12" rx="6" className="fill-indigo-600" />
  <rect x={verifiedWidth} y="0" width={demoWidth} height="12" className="fill-indigo-400" />
  <rect x={verifiedWidth + demoWidth} y="0" width={corrobWidth} height="12" className="fill-indigo-200" />
  {/* Right end gets rounded via clipPath or last segment rx */}
</svg>
```

**Why this works:**
- Bar length = total evidence weight (comparable across skills)
- Color segments = evidence quality breakdown (transparent, not opaque)
- No percentage. No score. Just "here's what backs this up."
- Hover/click expands to show actual evidence items

---

### Pattern B: Depth Level Badge (use alongside the bar)

```
[M] Mentioned    -- gray badge, outline only
[A] Applied      -- blue badge, light fill
[P] Proficient   -- blue badge, solid fill
[E] Expert       -- indigo badge, solid fill + ring
```

**Implementation:**
```tsx
const DEPTH_BADGES = {
  mentioned:  'bg-gray-100 text-gray-500 ring-1 ring-gray-300',
  applied:    'bg-blue-50 text-blue-700 ring-1 ring-blue-300',
  proficient: 'bg-blue-500 text-white',
  expert:     'bg-indigo-600 text-white ring-2 ring-indigo-300',
} as const;

// Render:
<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DEPTH_BADGES[level]}`}>
  {level.charAt(0).toUpperCase()}
  <span className="ml-1 hidden sm:inline">{label}</span>
</span>
```

**Visual progression:**
- Gray outline -> light fill -> solid fill -> solid + glow ring
- Increasing visual weight = increasing depth
- Single letter (M/A/P/E) for compact views, full word for expanded

---

### Pattern C: Evidence Drill-Down Card (expandable, below the bar)

```
v Python                                Expert  [E]
  [========|======|====|    ]

  Expand: (click or chevron)

  +--------------------------------------------------+
  | VERIFIED                                          |
  |   AWS Certified ML Specialty (2024)        cert   |
  |   Published: "ML Pipeline Patterns" (2023) paper  |
  |                                                   |
  | DEMONSTRATED                                      |
  |   3 years ML engineering at Stripe    work 2021-24|
  |   Built pipeline processing 2M records/day  proj  |
  |   Trained 5 engineers on PyTorch     mentoring    |
  |                                                   |
  | CORROBORATED                                      |
  |   MS Computer Science, ML focus      education    |
  +--------------------------------------------------+
```

**Implementation:**
```tsx
// Accordion pattern with Tailwind
<div className="border rounded-lg">
  {/* Summary row -- always visible */}
  <button onClick={toggle} className="w-full flex items-center justify-between p-3">
    <div className="flex items-center gap-3">
      <span className="font-medium">{skill.name}</span>
      <DepthBadge level={skill.depth} />
    </div>
    <div className="flex items-center gap-2">
      <EvidenceBar tiers={skill.evidenceTiers} />
      <ChevronIcon className={`transform ${open ? 'rotate-180' : ''}`} />
    </div>
  </button>

  {/* Detail panel -- expandable */}
  {open && (
    <div className="border-t px-4 py-3 space-y-3">
      {Object.entries(groupedEvidence).map(([tier, items]) => (
        <div key={tier}>
          <h4 className="text-xs font-semibold uppercase text-gray-500">{tier}</h4>
          <ul className="mt-1 space-y-1">
            {items.map(item => (
              <li className="flex justify-between text-sm">
                <span>{item.description}</span>
                <span className="text-gray-400 text-xs">{item.type}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )}
</div>
```

---

### Pattern D: Category Grouping (for Profile Cloud overview)

Group skills by domain (from our taxonomy: Domain > Category > Skill > Evidence).

```
CLOUD & INFRASTRUCTURE (4 skills)
  Kubernetes     [========|====|  ]  Expert   [E]
  Docker         [======|====|    ]  Proficient [P]
  AWS            [====|==|        ]  Applied  [A]
  Terraform      [==|              ]  Mentioned [M]

MACHINE LEARNING (3 skills)
  PyTorch        [========|======|]  Expert   [E]
  MLOps          [======|====|    ]  Proficient [P]
  Computer Vision[====|            ]  Applied  [A]
```

**Implementation:**
- Collapsible category sections (default: expanded for top 3 categories, collapsed for rest)
- Category header shows skill count + average depth
- Skills sorted within category by depth level (expert first)
- Entire card is an accordion: click category header to collapse/expand

---

### Pattern E: Tooltip Evidence Preview (lightweight alternative to drill-down)

For compact views where full drill-down is too heavy:

```tsx
// On hover over the evidence bar:
<div className="absolute bg-white shadow-lg rounded-lg p-3 w-64 z-10">
  <p className="text-xs font-medium text-gray-900">Python -- Expert</p>
  <p className="text-xs text-gray-500 mt-1">
    6 evidence points: 2 verified, 3 demonstrated, 1 corroborated
  </p>
  <p className="text-xs text-indigo-600 mt-2">Click to see details</p>
</div>
```

This is the "evidence chip tooltip" from our evidence-credibility-model.md, implemented as a hover popover.

---

### Pattern F: Skill Constellation / Network (PHASE 2 -- not MVP)

Workera's Skills Galaxy pattern adapted:
- SVG nodes positioned by skill relatedness (force-directed layout)
- Node size = evidence weight
- Node color = depth level (gray -> light blue -> blue -> indigo)
- Edges connect related skills (Docker -- Kubernetes, Python -- ML)
- Hover highlights connected skills
- Click opens drill-down card

This is the "gasp moment" visualization but requires:
- Force-directed layout algorithm (d3-force is free, or implement simple spring physics)
- Significant interaction design work
- NOT for MVP. Pattern C (expandable cards) + Pattern A (segmented bars) delivers 80% of the value.

---

## 7. RECOMMENDED IMPLEMENTATION ORDER

### MVP (launch by May 30)
1. **Pattern A**: Segmented Evidence Bar -- the core visualization
2. **Pattern B**: Depth Level Badge -- quick scannable indicator
3. **Pattern C**: Evidence Drill-Down Card -- the "proof" layer (expandable accordion)
4. **Pattern D**: Category Grouping -- organize the Cloud view

### Post-Launch
5. **Pattern E**: Tooltip Evidence Preview -- polish for hover states
6. **Pattern F**: Constellation view -- the "gasp moment" (Phase 2)

---

## 8. SCALES AND LEGENDS

### What Scale to Show Users

DO NOT show:
- Percentages (meaningless, invites Dunning-Kruger)
- Star ratings (gameable, vague)
- Numeric scores (opaque, "what does 7/10 mean?")

DO show:
- **Depth level label**: Mentioned / Applied / Proficient / Expert (4 levels)
- **Evidence count + tier breakdown**: "3 evidence points: 2 verified, 1 demonstrated"
- **Segmented bar visual**: color composition tells the story
- **Legend**: Always visible or accessible, explaining what each color means

### Standard Legend (render at top of Cloud view)

```
Evidence Quality:
  [dark indigo]   Verified -- Certs, publications, quantified outcomes
  [medium blue]   Demonstrated -- Work experience, projects, enriched via questions
  [light blue]    Corroborated -- Years claimed, role titles, adjacent skills
  [gray]          Self-Declared -- Listed without context

Depth Level:
  [E] Expert     -- 3+ roles AND 60+ months AND impact evidence
  [P] Proficient -- 2+ roles OR 24+ months with evidence
  [A] Applied    -- Used in at least 1 role with specifics
  [M] Mentioned  -- Listed in skills section, no supporting detail
```

---

## 9. WHAT NO COMPETITOR DOES (Our Unique Position)

| Feature | LinkedIn | MuchSkills | Teal/Rezi/Jobscan | HR Matrices | Us |
|---------|----------|------------|-------------------|-------------|-----|
| Evidence behind rating | NO (killed badges) | NO (self-rated) | NO (keyword count) | PARTIAL (SFIA principle) | YES |
| Evidence QUALITY differentiation | NO | NO | NO | NO | YES (4 tiers) |
| Auto-extracted from CV | NO (manual) | NO (manual) | PARTIAL (keywords) | NO (manual) | YES |
| Depth from multiple signals | NO | NO | NO | Manual assessment | YES (auto) |
| Expandable proof per skill | NO | NO | NO | NO | YES |
| Segmented evidence bar | NO | NO | NO | NO | YES |

We are building something NO consumer product has. The segmented evidence bar with expandable proof cards is genuinely novel. Don't water it down.

---

## Sources

- [LinkedIn Skills Guide 2026](https://connectsafely.ai/articles/linkedin-skills-guide-optimization-2026)
- [LinkedIn Endorsements Guide](https://www.cleverly.co/blog/how-to-endorse-someone-on-linkedin)
- [MuchSkills Visualization](https://www.muchskills.com/blog/muchskills-skills-visualisation)
- [MuchSkills for Individuals](https://www.muchskills.com/for-individuals)
- [MuchSkills Custom Skills](https://www.muchskills.com/how-to/custom-skills)
- [AIHR Skills Matrix Guide](https://www.aihr.com/blog/create-skills-matrix-competency-matrix/)
- [Deel Skills Matrix](https://www.deel.com/blog/create-skills-matrix/)
- [Workhuman Skills Matrix 2026](https://www.workhuman.com/blog/skills-matrix/)
- [Skill-Graph.com](https://skill-graph.com/)
- [Workera: Why We Need a New Way to Visualize Skills](https://www.workera.ai/blog/why-we-need-a-new-way-to-visualize-skills)
- [SFIA Framework](https://sfia-online.org/en/about-sfia/how-sfia-works)
- [Do Not Put Skill Bars on Resume (DEV.to)](https://dev.to/tim012432/do-not-put-skill-bars-on-your-resume-lh6)
- [Don't Use Progress Bars in CV (DEV.to)](https://dev.to/iamzoka/don-t-use-progress-bars-in-your-cv-feb)
- [Skill Bar Criticism (Quora)](https://www.quora.com/Should-a-resume-have-skill-bars-where-the-level-of-skill-is-demonstrated-for-different-skills-using-varying-lengths-of-bars-Why-or-why-not)
- [Almost Inevitable: Opinion on Skill Level Bar Graphs](https://almostinevitable.com/opinion-skill-level-bar-graphs/)
- [Segmented Progress Bar (CodePen)](https://codepen.io/jkantner/pen/poPWVbV)
- [RPG Character Sheet Design Evolution](https://analoggamestudies.org/2014/12/visual-design-as-metaphor-the-evolution-of-a-character-sheet/)
- [PatternFly Card View](https://www.patternfly.org/patterns/card-view/design-guidelines/)
- [Carbon Design System Status Indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- [LinkedIn: 5 Ways to Visualize Skills](https://www.linkedin.com/pulse/5-ways-skills-driven-companies-visualize-skills-make-better-decisions-)
- [Workera SkillMap AI](https://www.workera.ai/blog/introducing-skillmap-ai-new-tool)
