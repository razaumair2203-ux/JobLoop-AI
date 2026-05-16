# Skill & Evidence Visualization Design Research
**Date**: May 15, 2026
**Purpose**: Concrete details on how real products visualize skills, evidence, and career data
**Method**: WebSearch + WebFetch on live product pages, help docs, engineering blogs

---

## 1. MuchSkills (muchskills.com)

### What the user sees
- **Bubble-based interface**: Skills are displayed as circular bubbles. Each skill is a separate bubble.
- **Bubble SIZE = proficiency/interest**: Users increase or decrease the size of each bubble to indicate proficiency and interest. Larger bubble = higher proficiency or greater desire to use that skill.
- **Two chart types**: Bubble Chart (maps interest — "I want to use skill X more than Y") and Sector Chart (alternative layout for categories).
- **Color coding**: Pastel palette — lavender purple (#E3CCFF), mint green (#B7FEE4), soft yellow (#F8D247), light blue (#CFE5FF), pink salmon. Colors appear to map to skill categories, not proficiency levels.
- **Soft skills vs. technical skills**: Technical skills shown as colored bubbles with icons. Soft skills displayed as labeled black bubbles. Clear visual distinction between types.
- **Profile view**: Circular chart of technical skills (with icons) alongside the bubble layout. Multi-layered — chart + bubbles together.

### How they explain it
- **3x3 proficiency scale**: Described as "intuitive, reduces assessment bias, and supports continuous skills development." The scale itself is not numerically labeled — just bubble size.
- **Patented input model**: Users tap/click bubbles to resize them. The interaction IS the explanation — direct manipulation.
- **Skill-Will matrix**: Two dimensions captured — skill proficiency AND interest level. Creates a matrix view.
- **Philosophy**: "Data that cannot be read at a glance will not be used consistently." Design prioritizes instant comprehension.

### Data encoding
| Channel | Encodes |
|---------|---------|
| Bubble size | Proficiency/interest level |
| Color | Skill category (not proficiency) |
| Fill style | Technical (colored) vs. soft (black label) |
| Spatial grouping | Category clusters |
| Icons | Skill type identifiers |

### Self-explanatory?
Partially. The bubble size metaphor is intuitive (bigger = more), but the distinction between proficiency and interest requires explanation. The interaction model (tap to resize) teaches by doing.

### Inspiration
Founders were inspired by the **Fontainebleau rock climbing grading system** — color-coded grips where colors indicate difficulty: white (children's routes), yellow (easy), orange (fairly difficult), blue (difficult), red (very difficult), black-and-white (extremely difficult). They adapted the concept of using color as a universal difficulty indicator.

---

## 2. LinkedIn Skills

### What the user sees
- **Text list**: Skills displayed as a flat list of text labels, ordered by endorsement count (most endorsed at top).
- **Endorsement count**: Small number next to each skill showing how many connections endorsed it. E.g., "Project Management · 47"
- **Verification badges**: Skills validated via LinkedIn assessments (now discontinued) or third-party certifications show a badge icon.
- **Top 5 skills**: Prominently displayed in the About section landing area of the profile.
- **Skill-credential linking**: Skills can be tagged to certifications (e.g., Microsoft, Google Cloud, Zendesk partner badges).

### How they explain it
- Minimal explanation. Endorsement counts are self-evident. Badge presence/absence is binary.
- No proficiency levels — LinkedIn deliberately avoids rating skill depth.
- The system relies on social proof (endorsement count) rather than self-assessment.

### Data encoding
| Channel | Encodes |
|---------|---------|
| Position (ordering) | Endorsement popularity (most endorsed first) |
| Number | Endorsement count |
| Badge icon | Verified via assessment or certification |
| Text label | Skill name |

### Self-explanatory?
Yes. Extremely simple — text + number + optional badge. No learning curve. But also very shallow — tells you nothing about actual depth.

### Key insight
Profiles with verified skill badges rank **30% higher** in recruiter searches for that skill. The badge is the only visual differentiator between "claimed" and "proven."

---

## 3. Pluralsight Skill IQ

### What the user sees
- **Numeric score**: 0-300 scale displayed prominently after assessment.
- **Five proficiency levels**: Mapped to percentile ranges:
  - Novice: 0-19.9th percentile
  - Proficient Emerging: 20-39.9th percentile
  - Proficient Average: 40-59.9th percentile
  - Proficient Above Average: 60-79.9th percentile
  - Expert: 80-100th percentile
- **Bar chart distribution**: Shows how users across the platform are distributed across the five levels for each skill. Each level gets its own column/bar.
- **Proficiency chart**: Below the chart, personalized skill analysis and learning recommendations appear.
- **Progress tracking**: Users who retake assessments see before/after comparison — initial score vs. most recent score.
- **Privacy layer**: Team managers see only the level name (e.g., "Expert"), NOT the numeric score.

### How they explain it
- **Percentile-based**: Score explicitly described as "how you compare to peers who took the same assessment." This is norm-referenced, not criterion-referenced.
- **Clear level names**: The five names (Novice through Expert) are displayed alongside the score.
- **Recommendations below**: After viewing the score, users see a curated learning path to improve.

### Data encoding
| Channel | Encodes |
|---------|---------|
| Numeric score (0-300) | Absolute position |
| Level name | Qualitative bucket |
| Bar chart | Population distribution across levels |
| Before/after scores | Progress over time |

### Self-explanatory?
Mostly. The percentile framing is clear ("you're better than X% of people"). The 0-300 scale is less intuitive than the level names. The bar chart showing how others scored provides essential context.

### Key design decision
Pluralsight separates the **score** (precise, for the learner) from the **level** (general, for the manager). Different audiences get different granularity from the same data.

---

## 4. Spotify Wrapped

### What the user sees
- **Story-format slides**: Instagram Stories-style vertical cards, swiped through sequentially.
- **One stat per slide**: Each card presents a single data point (top artist, total minutes, top genre) with bold typography and background color.
- **Visual metaphors instead of charts**:
  - "Audio Aura" (2021): Listening frequency mapped to color intensity — genre frequency = color brightness.
  - "Sound Town" (2023): Listening preferences mapped to a coordinate on a world map.
  - "Listening Personality" (2022+): 4-letter acronym like Myers-Briggs, derived from listening habits.
- **Neon geometric graphics**: Bold, high-contrast visual identity. Sparing with text, generous with color.
- **Customizable sharing**: Users can change background/font colors before sharing to social media.

### How they explain it
- **No legend. No axis labels. No traditional charts.** Data is presented as narrative text + visual metaphor.
- **Progressive reveal**: Generic brand animations play first, then personalized data fades in. The animation sequence IS the explanation — it builds context before showing data.
- **Natural language**: Stats presented as sentences, not numbers. "You listened to Taylor Swift more than 99% of listeners" instead of "Percentile: 99."
- **3-minute experience**: Entire thing takes ~3 minutes. Brevity enforces clarity.

### Data encoding
| Channel | Encodes |
|---------|---------|
| Color palette | Mood/genre association |
| Color intensity | Listening frequency |
| Typography size | Emphasis/importance |
| Spatial position (map) | Geographic taste affinity |
| Sequential slides | Narrative arc (build-up to reveal) |
| 4-letter acronym | Listening personality type |

### Self-explanatory?
Completely. Zero learning curve because there is nothing to "learn." Every data point is a sentence. Visual metaphors (aura = color, town = map pin) use familiar concepts. Users understand immediately because the format is narrative, not analytical.

### Key design pattern for JobLoop
**The "reveal" pattern**: Don't show all data at once. Build up to it. Spotify doesn't dump a dashboard — it tells a story. The "gasp moment" comes from progressive revelation, not information density.

---

## 5. Enhancv / Kickresume / Resume.io — Resume Skill Displays

### What the user sees

**Common formats across resume builders:**
- **Filled bars**: Horizontal bars filled to a certain percentage. E.g., JavaScript: [========--] (80%).
- **Dots/circles**: Row of 5 dots, filled to indicate level. E.g., Python: ●●●●○ (4/5).
- **Stars**: Similar to dots but with star shapes.
- **Percentage labels**: "Excel — 90%"
- **Text labels only**: "Beginner / Intermediate / Proficient / Expert" — no visual indicator.

**Enhancv specifically:**
- WYSIWYG editor with real-time visual assembly.
- Skill bars toggle on/off. Decorative icons and images used as visual elements only — never as text containers.
- All text remains in the text layer for ATS compatibility.
- Four proficiency tiers: Expert, Proficient, Intermediate, Beginner.

**Kickresume specifically:**
- Progress bars ranging from "novice" to "expert."
- Sliders for rating proficiency in the editor.
- Some templates use percentage-based bars (e.g., "JavaScript 80%").

**Resume.io specifically:**
- Skill level bar can be toggled on/off in the skills and languages section.
- Stars, bars, or other graphic elements recommended.
- Four tiers: Expert, Proficient, Intermediate, Beginner.

### How they explain it
- Minimal. The visual encoding IS the explanation — a partially filled bar intuitively means "not full = not expert."
- Level labels (Beginner/Intermediate/Proficient/Expert) sometimes shown alongside bars.
- No onboarding or tooltips needed — the pattern is universally understood.

### Data encoding
| Channel | Encodes |
|---------|---------|
| Bar fill percentage | Self-assessed proficiency |
| Filled vs. empty dots | Level out of total |
| Label text | Named proficiency tier |
| Position in list | Implied priority/importance |

### Self-explanatory?
Yes, but **meaningless**. This is the critical finding: filled bars are universally understood but convey zero evidence. "JavaScript: 80%" means nothing — 80% of what? Compared to whom? Based on what? Every resume builder uses this pattern and every recruiter ignores it.

### Critical ATS warning
ATS systems **cannot parse visual skill bars**. They read "JavaScript ████░░░░ 80%" as garbage. Kickresume templates with skill bars actively hurt applications. This is a well-documented anti-pattern.

---

## 6. GitHub Contribution Graph

### What the user sees
- **Calendar heatmap**: Grid of small squares (11x11 pixels, 4px spacing), one per day, spanning 52 weeks (one year).
- **Rows**: 7 rows = days of the week. Labels on left: Mon, Wed, Fri (alternating).
- **Columns**: ~52 columns = weeks. Month labels across the top: Jan, Feb, Mar...
- **Color gradient**: 4-5 shades of green, from lightest to darkest:
  - Empty/gray: 0 contributions
  - Light green (#d6e685 or #9be9a8): Low activity
  - Medium green (#8cc665 or #40c463): Moderate activity
  - Dark green (#44a340 or #30a14e): High activity
  - Darkest green (#1e6823 or #216e39): Very high activity
- **Legend**: Bottom-right corner, horizontal strip showing the gradient from light to dark, labeled "Less" on the left and "More" on the right. No numbers.
- **Total count**: "X contributions in the last year" displayed above the graph.

### How they explain it
- **Tooltip on hover**: "5 contributions on Monday, August 08, 2024" — exact count + exact date.
- **"Less" / "More" legend**: Minimalist. Does not define thresholds. Just shows the color scale with directional labels.
- **No onboarding**: Zero explanation needed. The pattern of darker = more is universally understood from physical metaphors (heat, density, ink).
- **Relative, not absolute**: Color buckets are relative to the user's own activity range (min/max), not absolute thresholds. Your "dark green" might be 3 commits; another user's might be 30.

### Data encoding
| Channel | Encodes |
|---------|---------|
| Color intensity (green) | Contribution count (relative) |
| Position (x-axis) | Week of year |
| Position (y-axis) | Day of week |
| Tooltip text | Exact count + date |
| Legend gradient | Scale direction (less to more) |

### Self-explanatory?
**The gold standard of self-explanatory data visualization.** No tutorial, no onboarding, no configuration. Three elements make it work: (1) universal metaphor (darker = more), (2) spatial familiarity (calendar grid), (3) hover details on demand. The "Less/More" legend is deliberately vague — it avoids defining thresholds that would require explanation.

### Key design pattern for JobLoop
**Deliberate vagueness in legends**: GitHub doesn't say "1-3 contributions = light green." It says "Less...More." This avoids false precision and works universally. The exact numbers are available on hover for those who want them.

---

## 7. Uxcel Skill Graph (Bonus — relevant competitor)

### What the user sees
- **Radar chart**: Six axes radiating from center, each representing a core skill category.
- **Six categories** (for UX designers): Content Strategy, Product Thinking, Interaction Design, Leadership, Research, Visual Design.
- **Filled polygon**: Your scores form a shape on the radar. Larger area = stronger overall.
- **20-minute Pulse assessment**: Provides baseline Skill Graph.
- **Progress tracking**: Every past assessment remains visible. You can trace development over time.

### How they explain it
- Categories are labeled on each axis.
- Shape comparison: Your current shape vs. previous shapes shows growth.
- The platform describes it as showing "how strong and proficient you are in each area."

### Data encoding
| Channel | Encodes |
|---------|---------|
| Distance from center | Proficiency in category |
| Polygon shape | Skill profile pattern |
| Shape comparison (over time) | Growth trajectory |

### Self-explanatory?
Partially. Radar charts are familiar to data-literate users but confusing for general audiences. The area comparison is misleading (a common HBR criticism — radar chart areas distort relative differences). The six fixed categories limit flexibility.

---

## 8. Career Timeline Visualizations (Swim Lanes / River Charts)

### Best patterns found

**Swim Lane Timelines:**
- Horizontal lanes, each representing a person/department/category.
- Time runs left to right. Bars or blocks span durations.
- Used in project management (Gantt charts) but adaptable to career visualization.
- Each lane could represent: a role, a skill domain, an employer, a career phase.
- Color of blocks can encode: employer, seniority level, role type.
- Width/height of blocks can encode: duration, significance.

**Stream/River Graphs (Alluvial Plots):**
- Flowing, organic shapes that show how categories change over time.
- Width of each stream = quantity/frequency at that time point.
- Color = category (e.g., skill domain, industry).
- Flow crossings = transitions between categories.
- Best for: showing career pivots, skill evolution, domain transitions.
- Used in data journalism (NYT, The Pudding) for temporal categorical data.

**Design principles for career flow:**
| Element | Encodes |
|---------|---------|
| Stream width | Duration or intensity in a role/domain |
| Stream color | Skill category or industry |
| Flow crossings | Career transitions/pivots |
| Vertical stacking | Concurrent activities |
| Horizontal axis | Time |

### Self-explanatory?
Stream graphs look beautiful but require explanation for most users. Swim lane timelines are more universally understood because they map to calendar/Gantt chart mental models most people have.

---

## 9. Progressive Disclosure in Data Visualization (Design Pattern)

### Core principle
Present only essential information initially. Reveal deeper layers as users interact.

### Concrete techniques
1. **High-level summary first**: Start with aggregated view, then drill down.
2. **Hover for details**: GitHub's tooltip pattern — summary visible, details on demand.
3. **Expandable panels**: Click to reveal additional context (like an accordion).
4. **Drill-through links**: Click a data point to navigate to a detailed view.
5. **Guided exploration**: Tutorials, tips, or prompts that introduce features incrementally.
6. **Customizable views**: Let users select which metrics matter to them.

### Application to skill visualization
- **Level 1**: Skill name + visual indicator (bubble, bar, depth dot).
- **Level 2 (hover/tap)**: Evidence summary — "Used in 3 roles over 8 years, certified by ACLS."
- **Level 3 (click/expand)**: Full evidence chain — specific roles, employers, dates, outcomes, certifications.
- **Level 4 (drill-through)**: Individual evidence items — actual CV bullet, certification details, Socratic enrichment answers.

---

## Summary: What Works, What Doesn't, What to Steal

### STEAL THESE PATTERNS:

| Pattern | Source | Why it works |
|---------|--------|-------------|
| Bubble size = depth | MuchSkills | Intuitive (bigger = more). Direct manipulation teaches instantly. |
| "Less...More" legend | GitHub | Deliberately vague. Avoids false precision. Works universally. |
| Story-format reveal | Spotify Wrapped | Progressive disclosure + narrative arc = emotional impact. |
| Hover for exact details | GitHub | Summary visible, precision available on demand. |
| Percentile context | Pluralsight | "Compared to peers" framing makes numbers meaningful. |
| Score vs. Level separation | Pluralsight | Different granularity for different audiences. |
| Social proof badges | LinkedIn | Binary verified/unverified is clearer than percentage bars. |
| Natural language stats | Spotify | "You used X in 3 roles over 8 years" > "Experience: 85%." |

### AVOID THESE ANTI-PATTERNS:

| Anti-pattern | Source | Why it fails |
|--------------|--------|-------------|
| Percentage skill bars | Enhancv/Kickresume | Meaningless without context. 80% of what? ATS can't parse them. |
| Radar charts | Uxcel | Distort relative differences. Confuse non-data-literate users. |
| Numeric scores without context | Pluralsight (partial) | 0-300 means nothing without the percentile framing. |
| Endorsement counts | LinkedIn | Social popularity =/= skill depth. Easily gamed. |
| Complex charts without onboarding | Stream graphs | Beautiful but require explanation. Not self-explanatory. |

### DESIGN PRINCIPLES FOR JOBLOOP CLOUD:

1. **Evidence over scores**: Show WHERE the skill comes from (role, cert, training), not HOW MUCH.
2. **Natural language first**: "Practiced in 4 roles across 12 years" beats any bar or number.
3. **Progressive disclosure**: Bubble/dot at glance level, evidence chain on interaction.
4. **Deliberate vagueness in legends**: Use qualitative tiers (Core / Practiced / Emerging / Related), not percentages.
5. **Story reveal for onboarding**: First time seeing your Cloud should be a Wrapped-style progressive reveal, not a dump.
6. **Hover = precision on demand**: Exact evidence details appear on hover/tap, not by default.
7. **Category color, not proficiency color**: Color encodes WHAT (domain/category), size/intensity encodes HOW DEEP.
8. **No false precision**: Never show "87% proficiency." That number is fabricated. Show evidence count + breadth instead.

---

## Sources

- [MuchSkills - What Is MuchSkills](https://www.muchskills.com/what-is-muchskills)
- [MuchSkills - Skills Visualization Blog](https://www.muchskills.com/blog/muchskills-skills-visualisation)
- [MuchSkills - For Individuals](https://www.muchskills.com/for-individuals)
- [MuchSkills - Competency Mapping](https://www.muchskills.com/skill-competency-mapping)
- [MuchSkills - Data Visualization Blog](https://www.muchskills.com/blog/why-any-skills-matrix-is-incomplete-without-data-visualisation)
- [LinkedIn - Endorsements Guide (Jobright)](https://jobright.ai/blog/how-to-get-and-give-linkedin-endorsements/)
- [LinkedIn - Endorsements Guide (Hyperclapper)](https://www.hyperclapper.com/blog-posts/how-to-effectively-endorse-people-on-linkedin-a-2025-guide)
- [LinkedIn - Profile Optimization 2026](https://resumevera.com/blogs/linkedin-profile-optimization-guide-2026)
- [Pluralsight - Skill IQ Product Page](https://www.pluralsight.com/product/skill-iq)
- [Pluralsight - Introduction to Skill IQ](https://help.pluralsight.com/hc/en-us/articles/24394106940180-Introduction-to-Skill-IQ)
- [Pluralsight - Skills Inventory Analytics](https://help.pluralsight.com/hc/en-us/articles/24279501319316-Skills-inventory-analytics-advanced)
- [Spotify Engineering - Animation in 2023 Wrapped](https://engineering.atspotify.com/2024/01/exploring-the-animation-landscape-of-2023-wrapped)
- [Storysoft - Spotify Wrapped Data Storytelling](https://storysoft.io/data-storytelling-spotify-wrapped/)
- [Datakulture - How Spotify Wrapped Works](https://datakulture.com/blog/how-does-spotify-wrapped-work/)
- [University of Miami - Spotify Data Spotlight](https://customcareer.miami.edu/blog/2020/12/30/data-spotlight-how-spotify-wrapped-makes-music-data-feel-personable/)
- [Enhancv - Resume Skills Section Guide](https://enhancv.com/blog/resume-skills-section/)
- [Enhancv vs Kickresume Comparison](https://enhancv.com/blog/enhancv-vs-kickresume/)
- [Kickresume - Skills on Resume Guide](https://www.kickresume.com/en/help-center/how-write-skills-resume/)
- [Resume.io - Skill Levels on Resume](https://resume.io/blog/skill-levels-on-a-resume)
- [DEV Community - GitHub Heatmap in JS](https://dev.to/ajaykrupalk/github-like-contribution-heatmap-in-js-4201)
- [HackerNoon - Recreating GitHub Contribution Graph](https://medium.com/hackernoon/how-to-recreate-githubs-contribution-graph-a0a8d4d91011)
- [Uxcel - Skill Graph Help](https://help.uxcel.com/articles/10484277-how-to-build-and-maintain-your-design-score-and-skill)
- [Uxcel - Skill Map Templates](https://uxcel.com/blog/best-skill-map-templates-for-ux-designers)
- [Dev3lop - Progressive Disclosure in Visualization](https://dev3lop.com/progressive-disclosure-in-complex-visualization-interfaces/)
- [IxDF - Progressive Disclosure](https://ixdf.org/literature/topics/progressive-disclosure)
- [UXPin - Progressive Disclosure](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)
- [Datylon - Stream Graph Deep Dive](https://www.datylon.com/blog/stream-graph-deep-dive)
- [DEV Community - Don't Put Skill Bars on Resume](https://dev.to/tim012432/do-not-put-skill-bars-on-your-resume-lh6)
