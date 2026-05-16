# Profile Cloud — Visual Design Research & Synthesis
## Date: 2026-05-14
## Status: Research complete, ready for implementation spec

---

## 1. MuchSkills — Skill Doughnut / Wheel

### What It Is
MuchSkills replaces spreadsheet-based skills matrices with a radial "skill doughnut" chart. Users self-assess skills on two axes — **proficiency** (how good) and **interest** (how motivated) — creating a skill-will matrix. The visualization uses a bubble-based interface where bubble SIZE encodes proficiency and the arrangement is radial by category.

### Visual Layout & Key Design Elements
- **Radial sectors**: Skills grouped into categories (job focus, soft skills, technical) as pie-slice sectors
- **Bubble size**: Larger bubble = higher proficiency. Users drag to resize.
- **Color coding**: Inspired by rock climbing grading (Fontainebleau system) — white (beginner) through yellow, orange, blue, red, to black (expert). Intuitive difficulty progression.
- **Dual encoding**: Size = proficiency, color intensity = interest. Two dimensions in one glyph.
- **Category rings**: Can display as bubble chart OR sector chart per category
- **65,000+ skills** in their taxonomy, so the visualization must handle sparse selection from a huge universe

### What Makes It Premium
- The color system (climbing grades) is memorable and brand-distinctive
- Instant gestalt: one glance tells you "this person is deep in X, broad across Y"
- Self-service input model is engaging (drag to resize = tactile)
- Clean white backgrounds let the color coding pop

### What to Learn/Steal
- **Dual-encoding pattern**: Use arc length for depth AND color saturation for evidence quality — two dimensions in one element
- **Category sectors**: Radial grouping by domain is more visually striking than a list
- **Proficiency-as-size**: Larger visual weight = more expertise. Humans read this intuitively.
- **Color progression system**: A meaningful, named color scale (not arbitrary) gives users vocabulary

### What NOT to Copy
- **Self-assessment**: Their data is user-reported. Ours is evidence-extracted. This is a fundamental advantage — don't regress to self-report.
- **Flat hierarchy**: MuchSkills shows skills as equal peers within a category. We need DEPTH LEVELS (core speciality > sub-skills > certifications).
- **No evidence trail**: You see "Python: Expert" but not WHY. Our evidence chains are the whole point.
- **No temporal dimension**: The doughnut is a snapshot. No career progression visible.

---

## 2. Nivo Sunburst — Hierarchical Radial Visualization

### What It Is
Nivo's `@nivo/sunburst` is a React component that renders hierarchical data as concentric rings. Inner ring = parent categories, outer rings = children. It is a radial treemap — area encodes quantity, position encodes hierarchy.

### Visual Layout & Key Design Elements
- **Concentric rings**: Root at center, each level adds an outer ring. Arcs span proportional to their data value.
- **Click-to-zoom**: Clicking an arc focuses on that subtree — the clicked arc becomes the new center, children expand to fill the circle. Clicking center zooms back out. Clicking canvas resets to root.
- **Animated transitions**: Arcs morph smoothly between states (position, size, color) when data changes or user navigates.
- **Color inheritance**: Child arcs inherit parent hue but shift in lightness/saturation, creating visual grouping.
- **minSliceAngle threshold**: Arcs below a pixel threshold are culled from DOM for performance (handles large datasets).
- **Tooltips on hover**: Context info without navigating away.

### What Makes It Premium
- The zoom animation is genuinely delightful — feels like "diving into" your data
- Color inheritance creates automatic visual coherence without manual palette work
- Handles large hierarchies gracefully (hundreds of nodes)
- Built on D3 + React, so it is production-grade

### What to Learn/Steal
- **Click-to-zoom interaction**: Perfect for our "domain > skill > evidence" hierarchy. User clicks "Healthcare" arc, it expands to show sub-skills, click a sub-skill to see evidence sources.
- **Concentric rings = depth levels**: Inner ring = domains, middle ring = skills, outer ring = evidence sources. This IS our depth model.
- **Color inheritance**: Domain color propagates to child skills, creating instant visual grouping.
- **Animated transitions**: The morph between states is what separates "premium" from "functional."

### What NOT to Copy
- **Pure area encoding**: In sunburst, arc area means "quantity of data." For skills, area should mean "depth/evidence weight," not "number of sub-items."
- **No labels on small arcs**: When you have 50+ skills, outer ring labels become unreadable. Need a different labeling strategy.
- **Abstract without context**: A sunburst alone doesn't tell you WHO this person is. Needs an identity layer.
- **No temporal dimension**: Same as MuchSkills — it is a snapshot.

---

## 3. Spotify Wrapped — Progressive Reveal Experience

### What It Is
An annual campaign (300M+ users, 630M+ shares in 2025) that transforms listening data into a narrative story experience. Card-by-card reveal with bold typography, animations, and emotional framing.

### Visual Layout & Key Design Elements
- **Stories format**: Full-screen vertical cards, swipe to advance (Instagram Stories pattern)
- **Bold typography**: Oversized numbers and stats dominate each card. Minimal elements per card.
- **Psychedelic animations**: 2025 used 90s nostalgia — grunge textures, teardrop shapes, organic flowing forms
- **Data as narrative**: "You spent 788 hours finding yourself" not "47,283 minutes listened." Framing > raw numbers.
- **Progressive reveal pacing**: Builds from broad (total listening time) to specific (top artists) to emotional (your "music evolution" phases). Narrative arc: setup > rising > climax > denouement.
- **Share-optimized cards**: Every card is designed for Instagram Stories screenshot. Aspect ratio, contrast, typography all optimized for social sharing.
- **Rive animations**: Design artifact = shipping artifact. No translation loss between design and code.

### What Makes It Premium
- **Emotional framing**: Data becomes identity. "Your music DNA" not "your listening statistics."
- **Pacing**: You WANT to see the next card. Anticipation is engineered.
- **Visual boldness**: Each card has ONE big thing. No clutter. No dashboards.
- **Shareability**: Users WANT to post it. The design is the marketing.
- **Annual ritual**: Expected, anticipated, discussed. Cultural moment.

### What to Learn/Steal
- **The reveal sequence for onboarding**: When we first build someone's Cloud, don't dump the whole visualization. Reveal it: "You are a..." (identity) > "Your career spans..." (breadth) > "Your deepest expertise is..." (depth) > "Here's something surprising..." (insight) > "Your complete Cloud" (full view).
- **Emotional framing of data**: "16 years of clinical leadership" not "total_experience_years: 16"
- **One thing per screen during reveal**: Big number + big label + subtle animation. Don't crowd.
- **Design for the screenshot**: The Cloud visualization should be something users WANT to share on LinkedIn.

### What NOT to Copy
- **Ephemeral format**: Wrapped disappears. Our Cloud is persistent — users return to it.
- **Style-over-substance**: Grunge textures and psychedelic animations would be wrong for a professional tool. We need "elevated professional," not "trendy consumer."
- **Linear-only navigation**: Stories are linear. Our Cloud needs random-access exploration after the initial reveal.
- **Annual cadence**: Wrapped happens once. Our Cloud updates continuously.

---

## 4. Pluralsight Skill IQ — Proficiency Depth Display

### What It Is
Pluralsight's assessment system that scores users 0-300 on technology skills, mapped to five proficiency levels: Novice, Proficient Emerging, Proficient Average, Proficient Above Average, Expert.

### Visual Layout & Key Design Elements
- **Five-level proficiency scale**: 0-300 numeric score mapped to named levels
- **Percentile emphasis**: Visual emphasis on percentile rank rather than raw score (e.g., "Top 15%" rather than "Score: 247")
- **Horizontal segmented bars**: Skills inventory shows distribution across five levels with colored segments
- **Interactive segments**: Click a segment in the bar to see which users moved between levels over time
- **Personalized gap analysis**: Below the proficiency chart, specific recommendations for skill gaps
- **Role IQ composition**: Multiple Skill IQs compose into a Role IQ — shows how individual skills add up to role readiness

### What Makes It Premium
- **Named levels with meaning**: "Expert" and "Novice" are human-readable vs. arbitrary numbers
- **Percentile context**: Knowing you're in the top 15% is more meaningful than a score of 247
- **Actionable gaps**: Every proficiency display links to "what to do next"
- **Composition model**: Individual skills visibly roll up into role-level readiness

### What to Learn/Steal
- **Named depth levels**: Our existing model (Core Specialty > Advanced > Competent > Developing > Exposure) already does this. Reinforce it visually.
- **Segmented progress bars with meaning**: Instead of a generic progress bar, use segments that represent evidence sources (CV mentions, certifications, Socratic enrichment, outcome signals).
- **Gap-to-action linkage**: Every gap shown should link to what the user can do about it.
- **Composition view**: Show how individual skills compose into domain-level expertise.

### What NOT to Copy
- **Opaque scores**: 0-300 is meaningless without context. We committed to NO scores.
- **Assessment-based**: Their data comes from quizzes. Ours comes from career evidence. Don't regress to testing.
- **Five arbitrary levels**: Their levels are quiz-performance tiers. Our depth levels are evidence-derived. Keep them distinct.
- **Static snapshots**: Pluralsight doesn't show how your skills evolved over time.

---

## 5. Nightingale Magazine — Career Data Visualization

### What It Is
The journal of the Data Visualization Society. Most relevant: an article on using data viz for career trajectory, which overlaid career events and academic events as dual line series with a seniority backdrop.

### Visual Layout & Key Design Elements
- **Dual-series timeline**: One line for professional events, one for academic events, plotted year-by-year
- **Seniority backdrop**: Background bands showing junior/mid/senior levels, so the career line visually "climbs"
- **Skills annotations**: Technologies and skills learned annotated per year along the timeline
- **Two axes of career**: Professional AND academic shown simultaneously, acknowledging careers aren't single-track

### What Makes It Premium
- **Narrative structure**: Reading left-to-right tells a career story
- **Context layers**: The seniority backdrop gives meaning to career events without explicit scoring
- **Dual-track acknowledgment**: Most career viz ignores the academic/professional split

### What to Learn/Steal
- **Seniority backdrop concept**: Behind our skill visualization, show faint horizontal bands for career stages (early career, mid-career, senior, executive). Skills plotted against this backdrop gain temporal context.
- **Swim-lane timeline**: Skills appearing at different career points, shown as a horizontal timeline with domain swim-lanes. Each skill's "bar" starts when first evidenced and continues to present.
- **Annotation layer**: Key career moments (certifications earned, role transitions, major projects) as markers on the timeline.

### What NOT to Copy
- **Line chart format**: Too simple for our data richness. Works for an article, not for an interactive product.
- **Year-by-year granularity only**: Our data is role-based, not year-based. Roles don't align to calendar years.
- **Static**: No interactivity. No drill-down.

---

## 6. LinkedIn Skills — Endorsements and Grouping

### What It Is
LinkedIn's skills section: up to 100 skills, top 3 pinned, endorsement counts as social proof, skill assessments for verified badges.

### Visual Layout & Key Design Elements
- **Top 3 pinned skills**: Prominent display, highest visibility
- **Endorsement count**: "47 endorsements" as social proof number next to each skill
- **One-click endorsement**: Frictionless for endorsers (drives volume)
- **Verified badge**: Pass a quiz (70%+) to get a "Verified" badge on the skill
- **Contextual tagging**: Skills can be tagged to specific jobs, projects, certifications, and education entries
- **Flat list**: No hierarchy, no grouping by domain. Just a ranked list.
- **Skills-first algorithm (2026)**: LinkedIn now ranks profiles by verified skills over follower count

### What Makes It Premium
- **Social proof at scale**: 50+ endorsements on a skill is genuinely impressive signal
- **Verified badges**: Third-party validation adds credibility layer
- **Ubiquity**: Everyone knows what LinkedIn skills look like. It is the mental model.

### What to Learn/Steal
- **Contextual skill-to-role linking**: LinkedIn lets you tag skills to specific positions. Our evidence chain does this automatically and better — but the concept of "this skill was used HERE" is powerful UX.
- **Social proof concept**: We don't have endorsements, but we have EVIDENCE SOURCES. "Demonstrated in 3 roles + 1 certification" is our version of "47 endorsements."
- **Pinning/hierarchy**: Let users pin their top skills (or we auto-detect core speciality). The most important skills should be visually dominant.

### What NOT to Copy
- **Flat list with no hierarchy**: LinkedIn treats "Python" and "Microsoft Word" as equal peers. Our depth model is the whole point of differentiation.
- **Endorsement inflation**: One-click endorsements are noisy. Most endorsements are reciprocal, not meaningful. Our evidence extraction is far more rigorous.
- **No depth information**: LinkedIn says you HAVE a skill, not HOW DEEP you are. "Python" with 50 endorsements tells you nothing about whether it's a daily tool or a one-off.
- **No evidence chain**: "Endorsed by 47 people" is not the same as "Used Python for 8 years across 3 roles: built real-time monitoring at Company A, ML pipeline at Company B, data automation at Company C."
- **Quiz-based verification**: Artificial. Our evidence is career-derived.

---

## SYNTHESIS: The Combined Design

### Design Philosophy
Take the **identity reveal** from Spotify Wrapped, the **radial hierarchy** from Nivo sunburst, the **dual-encoding** from MuchSkills, the **named depth levels** from Pluralsight, the **temporal swim-lanes** from Nightingale, and the **evidence-linking** concept from LinkedIn — but execute all of it with evidence chains instead of scores, self-reports, or endorsements.

The result: a visualization that makes someone look at their career and say *"I've never seen myself this clearly."*

---

### The Two-Mode Design

The Profile Cloud has two modes:

**Mode 1: The Reveal (first-time only, Wrapped-inspired)**
Shown once after initial Cloud build. Progressive, emotional, full-screen.

**Mode 2: The Explorer (persistent, sunburst-inspired)**
The daily-use interactive visualization. Radial + timeline + evidence drill-down.

---

### Mode 1: The Reveal Sequence

A 6-card full-screen progressive reveal, shown after CV parsing + Socratic enrichment completes. Each card is one screen, user taps/clicks to advance. Clean, bold, professional. NO grunge textures — use the product's own color palette (slate backgrounds, emerald/sky/amber accents).

**Card 1 — Identity**
```
Background: Deep slate (#0F172A)
Center: Large serif text, 48px
Content: "Dr. Sibgha Mahmood"
Subtitle: "Anesthesiology Consultant"
Sub-subtitle: "Pakistan | 12 years"
Animation: Name fades in first (800ms), then title slides up (400ms), then details (400ms)
```

**Card 2 — Breadth**
```
Background: Same slate
Center: Animated counter rolling up
Content: "Your career spans [4] domains"
Below: Domain names appear one by one with their signature colors
  - Clinical Medicine (emerald)
  - Medical Education (sky blue)
  - Research (amber)
  - Administration (violet)
Animation: Counter rolls 0->4 over 1.2s. Domain pills fade in sequentially (200ms stagger)
```

**Card 3 — Depth**
```
Background: Same slate
Center: Single skill name, very large
Content: "Your deepest expertise:"
Headline: "Anesthesiology"
Evidence summary: "8 roles | 2 fellowships | 4 certifications | 12 years"
Animation: Skill name scales up from 0.8 to 1.0 with slight bounce. Evidence counters roll up.
```

**Card 4 — Trajectory**
```
Background: Same slate
Center: Minimal horizontal timeline
Content: Career arc from first role to current
Shows 3-4 key milestones as dots on a rising line
  - "2014: House Officer" (bottom-left)
  - "2017: FCPS Fellowship" (mid-rise)
  - "2020: Senior Registrar" (upper-mid)
  - "2024: Consultant" (top-right)
Animation: Line draws left-to-right (1.5s), dots pulse in sequence
```

**Card 5 — Surprise Insight**
```
Background: Same slate
Content: An AI-generated insight the user probably didn't expect
Example: "You've trained 200+ residents across 3 institutions —
         that's an education legacy most consultants never build."
Or: "Your research spans 3 specialties. That cross-domain
     range puts you in the top tier of academic clinicians."
Animation: Text types in, character by character (typewriter effect, 40ms/char)
```

**Card 6 — The Full Cloud**
```
Background: Transitions from slate to white (the product UI)
Content: "Your Profile Cloud"
The full interactive visualization fades in
CTA: "Explore your skills" + "Paste a job description"
Animation: Radial visualization builds from center outward (rings appear sequentially, 300ms per ring)
```

---

### Mode 2: The Explorer — Layout Specification

The Explorer is a split-panel layout:

```
+------------------------------------------------------------------+
|  HEADER: Identity bar                                             |
|  [Name] [Core Speciality badge] [Career span] [Domain count]     |
+------------------+-----------------------------------------------+
|                  |                                                 |
|   RADIAL VIEW    |   DETAIL PANEL                                 |
|   (left, 45%)    |   (right, 55%)                                 |
|                  |                                                 |
|   Sunburst       |   Changes based on what's selected:            |
|   visualization  |   - Nothing selected: Career summary           |
|   with 3 rings   |   - Domain selected: Domain deep-dive          |
|                  |   - Skill selected: Evidence chain              |
|                  |   - Evidence selected: Source detail            |
|                  |                                                 |
+------------------+-----------------------------------------------+
|  TIMELINE BAR (bottom, full width)                                |
|  [2014----2016----2018----2020----2022----2024----2026]            |
+------------------------------------------------------------------+
```

---

### The Radial Visualization (Left Panel)

**Three concentric rings:**

```
Ring 1 (innermost, radius ~60px): IDENTITY
  - Center circle shows core speciality icon or monogram
  - Single color: the user's primary domain color
  - Always visible, never changes on interaction

Ring 2 (middle, radius ~150px): DOMAINS
  - 3-6 arcs, one per domain (Clinical, Education, Research, etc.)
  - Arc LENGTH proportional to evidence weight in that domain
  - Arc COLOR: domain signature color (emerald, sky, amber, violet, rose, teal)
  - Hover: arc glows, tooltip shows domain name + skill count
  - Click: zooms into that domain (Ring 2 becomes Ring 1, Ring 3 expands)

Ring 3 (outermost, radius ~240px): SKILLS
  - Individual skill arcs within each domain sector
  - Arc LENGTH proportional to depth level + evidence count
  - Arc OPACITY/SATURATION encodes depth level:
    - Core Specialty: 100% saturated, 3px outer glow
    - Advanced: 85% saturated
    - Competent: 65% saturated
    - Developing: 45% saturated
    - Exposure: 25% saturated (faint)
  - Hover: skill name tooltip + depth label + evidence count
  - Click: selects skill, detail panel shows evidence chain
```

**Color Palette (domain colors):**
```
Clinical/Medical:  Emerald   #10B981 (hsl 160, 84%, 39%)
Education/Training: Sky      #0EA5E9 (hsl 199, 89%, 48%)
Research/Academic:  Amber    #F59E0B (hsl 38, 92%, 50%)
Administration:     Violet   #8B5CF6 (hsl 258, 90%, 66%)
Technology/Digital: Rose     #F43F5E (hsl 347, 89%, 60%)
Leadership/Mgmt:    Teal     #14B8A6 (hsl 173, 80%, 40%)
```

**Depth level indicators (used in both radial and detail panel):**
```
Core Specialty:  Filled circle + outer ring   (double-weight)
Advanced:        Filled circle                 (standard)
Competent:       Half-filled circle            (left-half)
Developing:      Quarter-filled circle         (bottom-quarter)
Exposure:        Empty circle with dot center  (minimal)
```

**Interaction States:**
```
Default:     All rings visible, no selection
Hover:       Hovered arc brightens, siblings dim to 40% opacity
Selected:    Selected arc stays bright, siblings dim, detail panel updates
Zoomed:      Clicked domain expands to fill Ring 2 position, its skills fill Ring 3
             Center shows domain icon, back button appears
Filtered:    Timeline scrubber active — arcs resize to show only evidence from selected time range
```

---

### The Detail Panel (Right Panel)

**State 1: Nothing Selected — Career Summary**
```
+-----------------------------------------------+
|  DR. SIBGHA MAHMOOD                            |
|  Anesthesiology Consultant                     |
|                                                |
|  Career Span: 12 years (2014-2026)             |
|  Domains: 4                                    |
|  Skills Mapped: 23                             |
|  Evidence Sources: 47                          |
|                                                |
|  DEPTH DISTRIBUTION                            |
|  [====] Core Specialty     2 skills            |
|  [===]  Advanced           5 skills            |
|  [==]   Competent          8 skills            |
|  [=]    Developing         5 skills            |
|  [.]    Exposure           3 skills            |
|                                                |
|  TOP EVIDENCE SOURCES                          |
|  CV Roles ............ 34 evidence items       |
|  Certifications ...... 8 evidence items        |
|  Socratic Enrichment . 5 evidence items        |
+-----------------------------------------------+
```

**State 2: Domain Selected — Domain Deep-Dive**
```
+-----------------------------------------------+
|  CLINICAL MEDICINE                     [back]  |
|  Your strongest domain                         |
|                                                |
|  SKILLS IN THIS DOMAIN                         |
|                                                |
|  Anesthesiology .............. Core Specialty   |
|  [||||||||||||||||||||] 12 evidence items       |
|  8 roles, 2 fellowships, FCPS, MCPS            |
|                                                |
|  Critical Care ............... Advanced         |
|  [|||||||||||||]        8 evidence items        |
|  ICU rotation x3, ACLS certified               |
|                                                |
|  Pain Management ............ Competent         |
|  [||||||||]              5 evidence items       |
|  Fellowship rotation, 2 roles                  |
|                                                |
|  Emergency Medicine ......... Developing        |
|  [|||]                   3 evidence items       |
|  ER rotation, BLS certified                    |
+-----------------------------------------------+
```

**State 3: Skill Selected — Evidence Chain**
```
+-----------------------------------------------+
|  ANESTHESIOLOGY              Core Specialty    |
|  "Your defining expertise"             [back]  |
|                                                |
|  EVIDENCE CHAIN (12 sources)                   |
|                                                |
|  [segmented bar showing source composition]    |
|  [CV|||||||][Cert||||][Socratic||][Outcome|]   |
|                                                |
|  FROM YOUR CV                                  |
|  > Consultant Anesthesiologist                 |
|    CMH Rawalpindi, 2024-present                |
|    "Led 200+ complex cardiac cases..."         |
|                                                |
|  > Senior Registrar                            |
|    AFIC/NIHD, 2020-2024                        |
|    "Managed high-risk obstetric anesthesia..." |
|                                                |
|  > Registrar                                   |
|    CMH Lahore, 2017-2020                       |
|    "Performed 500+ regional blocks..."         |
|                                                |
|  CERTIFICATIONS                                |
|  > FCPS Anaesthesiology — CPSP, 2020           |
|  > MCPS Anaesthesiology — CPSP, 2017           |
|                                                |
|  ENRICHED VIA SOCRATIC                         |
|  > "Trained 200+ residents" (Q: team size)     |
|  > "Introduced ultrasound-guided blocks" (Q:   |
|    innovations)                                |
|                                                |
|  OUTCOME SIGNALS                               |
|  > Interview callback from King Faisal         |
|    Specialist Hospital (anesthesia role)        |
+-----------------------------------------------+
```

The segmented evidence bar at the top of State 3 is a key design element. It is a single horizontal bar divided into colored segments:
```
Segment colors:
  CV evidence:        Slate-600   #475569
  Certifications:     Amber-500   #F59E0B
  Socratic enrichment: Sky-500    #0EA5E9
  Outcome signals:    Emerald-500 #10B981
```
Segment WIDTH is proportional to evidence count from that source. Hover on a segment highlights the corresponding evidence items below.

---

### The Timeline Bar (Bottom)

A full-width horizontal timeline anchored to the bottom of the viewport.

```
[2014]----[2016]----[2018]----[2020]----[2022]----[2024]----[2026]
  |                    |         |                    |
  House Officer        FCPS      Sr. Registrar        Consultant
```

**Design:**
- Thin line (2px, slate-300) with year markers
- Career milestone dots (8px circles) at role transitions, colored by domain
- **Scrubber handle**: Draggable range selector. When user drags to select a time range (e.g., 2018-2022), the radial visualization FILTERS to show only evidence from that period. Arcs resize dynamically.
- **Hover on milestone**: Tooltip with role title + employer
- **Click on milestone**: Highlights all skills that were active during that role in the radial view

**Animation:** When the timeline scrubber moves, radial arcs animate (grow/shrink) to reflect the filtered time range. This creates a "career evolution" effect — drag from left to right and watch the Cloud build over time.

---

### Typography & Spacing

```
Font stack: Inter (UI), Instrument Serif (reveal cards, headings)

Reveal cards:
  Name: Instrument Serif, 48px, weight 400, letter-spacing -0.02em
  Title: Inter, 20px, weight 500, slate-300
  Stats: Inter, 14px, weight 400, slate-400
  Big numbers: Inter, 72px, weight 700, white

Explorer:
  Panel headings: Inter, 16px, weight 600, slate-800
  Skill names: Inter, 14px, weight 500, slate-700
  Evidence text: Inter, 13px, weight 400, slate-600
  Depth labels: Inter, 11px, weight 600, uppercase, tracking 0.05em
  Tooltips: Inter, 12px, weight 400, white on slate-800

Spacing:
  Panel padding: 24px
  Between skill rows: 12px
  Between evidence items: 8px
  Ring gap: 4px
  Arc gap: 1px (hairline white separator)

Border radius:
  Panels: 12px
  Evidence cards: 8px
  Badges/pills: 9999px (full round)
  Depth level dots: 50% (circle)
```

---

### Animation Specifications

```
Reveal sequence:
  Card transitions: 300ms ease-out slide + fade
  Counter roll-up: 1200ms ease-out (use requestAnimationFrame, not CSS)
  Typewriter effect: 40ms per character
  Timeline draw: 1500ms ease-in-out, SVG stroke-dasharray animation

Explorer interactions:
  Hover highlight: 150ms ease-out opacity change
  Selection: 200ms ease-out, selected arc scales 1.02x
  Zoom into domain: 400ms spring(1, 80, 10) — slight overshoot for delight
  Detail panel content: 200ms fade-in for new content
  Timeline scrubber: arcs animate at 60fps, 100ms debounce on scrubber input
  Ring build (initial load): 300ms stagger per ring, arcs within ring stagger 50ms

Easing curves:
  Standard: cubic-bezier(0.4, 0, 0.2, 1)  — Material "standard"
  Decelerate: cubic-bezier(0, 0, 0.2, 1)   — for entrances
  Spring: Use framer-motion spring(1, 80, 10) for zoom transitions
```

---

### Implementation Notes

**Recommended library stack:**
- **Radial visualization**: D3.js arc/pie generators + React for DOM, OR visx (Airbnb) for tighter React integration. Nivo sunburst is an option but may be too opinionated for our custom depth encoding.
- **Animations**: Framer Motion for panel transitions and spring physics. D3 transitions for arc morphing. CSS transitions for simple opacity/color changes.
- **Timeline**: Custom SVG with D3 scales for positioning. HTML range input (styled) for the scrubber.
- **Reveal sequence**: Framer Motion's AnimatePresence + staggerChildren for the card sequence.

**Responsive behavior:**
- Desktop (>1024px): Split panel as described
- Tablet (768-1024px): Radial on top, detail panel below (stacked)
- Mobile (<768px): Radial fills screen, detail panel slides up as bottom sheet on skill tap. Timeline becomes scrollable horizontal strip.

**Accessibility:**
- All arcs have aria-labels: "[Skill name], [depth level], [evidence count] evidence sources"
- Detail panel is keyboard-navigable (Tab through skills, Enter to select)
- Color is never the ONLY encoding — depth level dots + labels + saturation all reinforce
- High contrast mode: white arcs on dark background, depth encoded by stroke weight instead of saturation
- Screen reader: sequential list fallback of all skills with evidence

---

### What This Design Does That No Single Reference Does

| Capability | MuchSkills | Nivo | Spotify | Pluralsight | Nightingale | LinkedIn | **Ours** |
|---|---|---|---|---|---|---|---|
| Shows WHO you are | - | - | YES | - | - | Partial | **YES** (identity card + core speciality) |
| Shows BREADTH | YES (sectors) | YES (arcs) | - | - | Partial | Flat list | **YES** (domain ring) |
| Shows DEPTH | Size only | Area only | - | Levels | - | - | **YES** (saturation + depth dots + named levels) |
| Shows EVIDENCE | - | - | - | - | - | Endorsement count | **YES** (segmented bar + drill-down chain) |
| Shows TRAJECTORY | - | - | Evolution phases | - | Timeline | - | **YES** (timeline scrubber filters radial) |
| Interactive drill-down | - | Click-to-zoom | - | - | - | - | **YES** (click arc > domain > skill > evidence) |
| Emotional first impression | - | - | YES (reveal) | - | - | - | **YES** (6-card reveal sequence) |
| Shareable | - | - | YES | - | - | - | **YES** (reveal cards designed for LinkedIn/social) |

The synthesis: **No existing tool combines identity + breadth + depth + evidence + trajectory + progressive reveal in a single visualization.** Each reference does 1-2 of these well. Our design does all six, using evidence chains (not scores, not self-reports, not endorsements) as the fundamental data source.

---

### Anti-Patterns Explicitly Avoided

1. **No opaque scores** (anti-Pluralsight, anti-LinkedIn assessment)
2. **No self-reported data** (anti-MuchSkills proficiency drag)
3. **No endorsement inflation** (anti-LinkedIn one-click endorsements)
4. **No trendy consumer aesthetics** (anti-Spotify grunge textures)
5. **No area-as-quantity** (anti-sunburst default where more sub-items = bigger arc)
6. **No flat skill lists** (anti-LinkedIn equal-weight peers)
7. **No traffic-light colors** (anti-red/yellow/green anxiety palette)
8. **No "match percentage"** anywhere in the Cloud view

---

## Sources

### MuchSkills
- [MuchSkills for Individuals](https://www.muchskills.com/for-individuals)
- [MuchSkills Skills Visualization Blog](https://www.muchskills.com/blog/muchskills-skills-visualisation)
- [How MuchSkills Was Born (Medium)](https://medium.com/@muchskills/how-muchskills-was-born-the-visualized-skill-set-1d875011e1ba)
- [MuchSkills Review (Nerdisa)](https://nerdisa.com/muchskills/)

### Nivo Sunburst
- [Nivo Sunburst Documentation](https://nivo.rocks/sunburst/)
- [Nivo GitHub](https://github.com/plouc/nivo)
- [Mastering Nivo Charts Guide (CreoWis)](https://www.creowis.com/blog/nivo-charts-with-react-comprehensive-guide)

### Spotify Wrapped
- [Spotify Wrapped 2025 UX Lessons (UX Playbook)](https://uxplaybook.org/articles/spotify-wrapped-ux-design-lessons)
- [Spotify Wrapped Design Aesthetic 2025 (Envato)](https://elements.envato.com/learn/spotify-wrapped-design-aesthetic)
- [Designing Motion for Wrapped (Spotify Design)](https://spotify.design/article/making-moves-designing-motion-for-2022-wrapped)
- [Spotify Wrapped 2025 Goes Analog (Fast Company)](https://www.fastcompany.com/91451332/spotify-wrapped-2025-goes-analog-in-the-age-of-ai)
- [Spotify Used Rive for Wrapped 2025](https://rive.app/blog/spotify-used-rive-for-spotify-wrapped-2025)

### Pluralsight Skill IQ
- [Introduction to Skill IQ](https://help.pluralsight.com/hc/en-us/articles/24394106940180-Introduction-to-Skill-IQ)
- [Skills Inventory Analytics: Advanced](https://help.pluralsight.com/hc/en-us/articles/24279501319316-Skills-inventory-analytics-advanced)
- [Personalized Skill Analysis](https://help.pluralsight.com/hc/en-us/articles/24420144880020-Personalized-skill-analysis-and-recommendations)

### Nightingale / Data Visualization
- [How I Used Data Visualization to Showcase My Career Trajectory (Nightingale)](https://nightingaledvs.com/how-i-used-data-visualization-to-showcase-my-career-trajectory/)
- [Nightingale Journal](https://nightingaledvs.com/)

### LinkedIn Skills
- [LinkedIn Verified Skills 2026](https://news.linkedin.com/2026/Professional_Edge_Skills_Verified)
- [LinkedIn Skills Guide 2026 (ConnectSafely)](https://connectsafely.ai/articles/linkedin-skills-guide-optimization-2026)
- [How to Get LinkedIn Endorsements (Jobright)](https://jobright.ai/blog/how-to-get-and-give-linkedin-endorsements/)
