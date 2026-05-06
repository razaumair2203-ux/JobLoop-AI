# Competitor Visual Orchestration — Reference

> Saved: May 2026. Source: WebSearch + WebFetch research across 8 tools.
> Status: REFERENCE ONLY. Our visual orchestration is PENDING — blocked by parsing quality.

## What Each Competitor Does

### MuchSkills (muchskills.com)
- **Layout**: Constrained bubble chart (responsive, normalized)
- **Bubble size**: Priority/interest (user-declared), NOT proficiency
- **Interaction**: Drag to resize any bubble; others shrink proportionally (zero-sum)
- **Grouping**: Flat with soft visual clustering, no hierarchy
- **Key insight**: This is a PREFERENCE interface ("I want to use this more"), not evidence
- **Weakness**: No evidence backing. Pretty but hollow.

### skill-graph.com
- **Layout**: Force-directed graph (D3.js physics)
- **Algorithm**: Collision detection via `d3-force .forceCollide()`, velocity Verlet integration
- **Readability**: Forces naturally cluster related skills, prevent overlap
- **Key params**: Padding between circles, 300-500 simulation steps, center + repulsion + collision forces
- **Weakness**: Needs real physics engine. Raw SVG angle math = jumbled mess (we proved this)

### Teal (tealhq.com)
- **Layout**: Flat category list + static infographic card
- **Career Visual**: Pre-computed Feltron report (not interactive) — breadth, depth, transitions, leadership trajectory
- **Data source**: LinkedIn profile parsing
- **Weakness**: Static, not personalized per JD

### LinkedIn Skills
- **Layout**: Vertical ranked list + endorsement count + endorser photos
- **Top 3 pinned**: 10x more algorithmic visibility
- **Limit**: 50 skills max, 4+ hidden behind "Show all"
- **Weakness**: Social proof only. No depth measurement.

### Resume.io
- **Layout**: Horizontal or circular progress bars per skill
- **Levels**: Beginner > Intermediate > Advanced > Expert (visual bars)
- **Categories**: Hard Skills vs Soft Skills
- **Weakness**: Self-declared levels. No evidence.

### Rezi (rezi.ai)
- **Layout**: Category list + achievement bullet points under each skill
- **Philosophy**: "Show, don't tell" — proof achievements, not bars
- **Weakness**: Text-heavy, no visual hierarchy

### Flourish Bubble Charts (SaaS pattern)
- **Layout**: Auto-responsive bubble chart
- **Options**: Scatter, circular clustering, grid
- **Overlap prevention**: Fixed padding, min/max radius limits
- **Recommendation**: Max 25 bubbles for clean layout

## Key Technical Patterns

### Circle Packing (D3.js)
```
forceCollide():
  - Bubbles as physical circles
  - Distance constraint: center-to-center >= radius1 + radius2 + padding
  - 300-500 iteration steps until convergence
  - Forces: center (pull), manyBody (repel), collide (hard constraint)
```

### What Works for Readability
| Approach           | Best For                    | Readability | Complexity |
|--------------------|-----------------------------|-------------|------------|
| Bubble chart       | Prioritization              | High        | Low        |
| Force-directed     | Complex relationships       | Medium      | HIGH       |
| Category + bars    | Quick proficiency scan      | Very High   | Low        |
| Ranked list        | Social proof                | Very High   | Low        |
| Circle packing     | Many items, no clutter      | Medium      | Medium     |

## The Gap NO Competitor Fills

**No one combines evidence + visual depth simultaneously.**
- MuchSkills = pretty bubbles, no evidence
- LinkedIn = social proof, weak visual
- Teal = static infographic, not interactive
- Resume.io/Rezi = self-declared levels, no proof

**Our opportunity**: Evidence-grounded visualization. Every bubble/bar/node backed by
traceable role evidence, not self-declaration. BUT — this requires parsing quality
we don't have yet.

## Status: BLOCKED

Our visual orchestration is pending because we cannot reliably:
1. Parse roles from multi-column/complex PDF text
2. Deduplicate roles across multiple CVs of the same person
3. Extract accurate date ranges (education vs career)
4. Compute true skill depth (months, roles, impact per skill)
5. Detect role progression (title seniority over time)
6. Classify certification weight (PMI gold standard vs Coursera supplementary)
7. Identify program/platform context per role (JF-17, AEW&C, Crotale)

Until parsing is production-quality, the visualization is painting on sand.
