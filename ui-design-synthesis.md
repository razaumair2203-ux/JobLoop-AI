# JobLoop AI — UI Design Synthesis & Touchpoint Spec
## From Research to Design: What to Build and Why

> Synthesized April 2026 from 10 competitor analyses + UX best practices research.
> Companion to: research-ui-ux-design.md (foundations), competitive-comparison.html (raw data)

---

## 1. Competitor Pattern Matrix — What Works, What Doesn't

### Patterns Every Competitor Uses (Table Stakes)
| Pattern | Who Does It | Our Version |
|---------|------------|-------------|
| Split-screen resume editor | Teal, Jobscan, Kickresume, Rezi | Split-panel: JD left, evidence right |
| Live preview | Teal, Kickresume | Streaming structured output |
| Keyword highlighting | Teal, Jobscan | Evidence citations inline [1][2][3] |
| Match score/percentage | Jobscan, Rezi, Jobright, Careerflow | NO SCORES — evidence language only |
| Chrome extension | Teal, Careerflow, Simplify | Phase 3 (Plasmo, Manifest V3) |
| Application tracker | Huntr, Teal, Careerflow, Simplify | Phase 1 basic table, Phase 2 Kanban |
| Template gallery | Kickresume, Rezi, Teal | Deferred — 3 clean ATS templates first |

### Patterns Only Some Use (Differentiators to Evaluate)
| Pattern | Who | Adopt? | Reasoning |
|---------|-----|--------|-----------|
| Kanban job board | Huntr, Teal, Careerflow | YES (Phase 2) | Natural for tracking pipeline |
| AI chat interface | Jobright (Orion) | NO | Our Socratic is structured, not chat |
| Before/after comparison | Jobscan | YES | Show original CV vs tailored CV |
| ATS detection | Jobscan (Workday/Greenhouse) | NO | We don't perpetuate ATS mythology |
| Profile score overlay | Careerflow (LinkedIn) | NO | Requires extension, scores are anti-pattern |
| Section-by-section editing | Rezi | YES | Progressive disclosure per CV section |
| Tab-based editor panels | Teal (Content/Designer/Presentation) | PARTIAL | Tabs for Analysis/Evidence/CV/Letter |

### Anti-Patterns to Avoid (Competitor Failures)
| Anti-Pattern | Offender | Why It Fails | Our Alternative |
|-------------|----------|--------------|-----------------|
| Opaque match scores | Jobscan (%), Rezi (1-100), Jobright (0-100) | Users don't trust numbers they can't verify | Evidence language: "Strong/Related/Gap/Tell me more" |
| Traffic-light colors for fit | Rezi (red/yellow/green), Jobscan (red/green) | Red = "don't apply" = gatekeeper | Advocate palette: emerald/sky/amber/gray |
| Auto-apply | Simplify, Jobright | 2-3% response rate, spam reputation | Never. Manual apply with best materials. |
| Credit-gated AI | Jobright (daily limits) | Frustrating mid-workflow | Subscription model, unlimited within tier |
| Floating AI suggestions | Notion AI pattern | Distracting, unsolicited | AI runs on explicit user action only |
| Score on every job card | Jobright (0-100 per listing) | Creates anxiety, false precision | No job feed. User brings their own JDs. |

---

## 2. The 7 Surfaces of JobLoop

Based on competitor analysis and our product spec, JobLoop has 7 distinct UI surfaces. Each is detailed below with the specific patterns to adopt.

### Surface Map
```
1. Onboarding        — First visit, CV upload, initial Cloud build
2. Dashboard         — Home base, Cloud summary, recent activity
3. Analysis Page     — THE core surface: JD paste -> streaming analysis
4. CV Builder        — Tailored CV generation + editing
5. Application Track — Table/Kanban of tracked applications
6. Profile Cloud     — Visual evidence graph (living profile)
7. Settings          — Account, preferences, export
```

---

## 3. Surface 1: Onboarding

### Flow
```
Step 1: Landing -> "Upload your CV" (single CTA, no distractions)
Step 2: CV parsing (skeleton shimmer, "Reading your experience...")
Step 3: Initial Cloud preview (evidence nodes appearing with animation)
Step 4: Socratic Gate 1 (3-5 targeted questions about CV gaps)
Step 5: "Paste a job description" prompt (transition to Analysis)
```

### Design References
- **Kickresume**: Drag-and-drop upload zone, clean and inviting
- **Huntr**: Minimal onboarding, get to value fast
- **v0**: Chat-like progressive interaction

### Key Decisions
- NO multi-step wizard upfront. One action per screen.
- CV upload accepts: PDF, DOCX, plain text paste
- Show Cloud building in real-time (nodes animate in as parsing completes)
- Socratic questions appear as cards, not a chat thread
- Skip option on questions (3-gate system respects user time)

### Empty State (Pre-Upload)
```
+----------------------------------------------------------+
|                                                          |
|     [Subtle cloud illustration with dotted nodes]        |
|                                                          |
|     "Your Living Profile starts here"                    |
|     Upload your CV and I'll build an evidence-based      |
|     picture of your professional story.                  |
|                                                          |
|     [========= Upload CV (PDF/DOCX) =========]          |
|     or paste your resume text                            |
|                                                          |
+----------------------------------------------------------+
```

---

## 4. Surface 2: Dashboard

### Layout (Post-Onboarding)
```
+------------------+----------------------------------------+
| Sidebar (240px)  | Dashboard                              |
|                  |                                        |
| [Logo]           | +----------------------------------+   |
| Dashboard  *     | | Cloud Summary Card               |   |
| Analysis         | | "47 evidence points across       |   |
| CV Builder       | |  12 skill areas"                 |   |
| Applications     | | [Mini cloud visualization]       |   |
| Profile Cloud    | +----------------------------------+   |
| Settings         |                                        |
|                  | +---------------+ +------------------+  |
| ──────────       | | Recent        | | Quick Actions    |  |
| Cmd+K to search  | | Analysis      | |                  |  |
|                  | | - Sr Dev @Co  | | [Analyze a Job]  |  |
|                  | | - PM @Startup | | [Update CV]      |  |
|                  | | - Lead @Corp  | | [Track App]      |  |
|                  | +---------------+ +------------------+  |
|                  |                                        |
|                  | +----------------------------------+   |
|                  | | Application Pipeline (mini)      |   |
|                  | | Applied: 3 | Interview: 1 |      |   |
|                  | | Offered: 0 | Rejected: 1  |      |   |
|                  | +----------------------------------+   |
|                  |                                        |
|                  | +----------------------------------+   |
|                  | | Pattern Insights (after 5+ apps) |   |
|                  | | "K8s gap appeared in 4/6 roles"  |   |
|                  | | "Docker reframing: 2 callbacks"  |   |
|                  | +----------------------------------+   |
+------------------+----------------------------------------+
```

### Design References
- **Careerflow**: Command center dashboard with multiple widget cards
- **Linear**: Clean sidebar, high-density content without clutter
- **Huntr**: Collapsible left nav with clear section icons

### Key Decisions
- Dashboard is a summary, not the primary workspace
- Cloud Summary Card shows a mini visualization (clickable -> full Cloud)
- Pattern Insights only appear after 5+ tracked applications (footprint model)
- Quick Actions: big, clear buttons for the 3 most common tasks
- Recent analyses show the last 3-5 with one-line summaries

---

## 5. Surface 3: Analysis Page (CORE)

This is the primary surface. 80% of user time happens here.

### Phase 1: JD Input
```
+------------------+----------------------------------------+
| Sidebar          | New Analysis                           |
|                  |                                        |
|                  | +----------------------------------+   |
|                  | |                                  |   |
|                  | |  Paste a job description          |   |
|                  | |                                  |   |
|                  | |  [                              ]|   |
|                  | |  [     Large textarea           ]|   |
|                  | |  [     with placeholder:        ]|   |
|                  | |  [     "Paste the full job      ]|   |
|                  | |  [      posting here..."        ]|   |
|                  | |  [                              ]|   |
|                  | |                                  |   |
|                  | |  [====== Analyze This Role =====]|   |
|                  | |                                  |   |
|                  | +----------------------------------+   |
|                  |                                        |
+------------------+----------------------------------------+
```

### Phase 2: Streaming Analysis (Split-Panel)
```
+------------------+--------------------+-------------------+
| Sidebar          | JD REQUIREMENTS    | YOUR EVIDENCE     |
|                  |--------------------|-------------------|
|                  |                    |                   |
|                  | Required Skills    | Strong Matches    |
|                  |                    |                   |
|                  | [Python 5+ yrs]---|-->[8 yrs Python   |
|                  |  highlighted       |    at Acme [1]]   |
|                  |                    |                   |
|                  | [AWS experience]---|-->[AWS SA Cert    |
|                  |  highlighted       |    2023 [3]]      |
|                  |                    |                   |
|                  | [Kubernetes]       | Gaps to Address   |
|                  |  highlighted       |                   |
|                  |  (amber)           | [No K8s evidence  |
|                  |                    |  yet. Docker exp  |
|                  |                    |  is related [5]]  |
|                  |                    | [+ Tell me more]  |
|                  |                    |                   |
|                  |--------------------|-------------------|
|                  | Nice to Have       | Transferable      |
|                  |                    |                   |
|                  | [GraphQL]----------|-->[REST APIs with |
|                  |                    |    similar data   |
|                  |                    |    patterns [7]]  |
+------------------+--------------------+-------------------+
```

### Phase 3: Full Analysis View (After Streaming)
```
+------------------+----------------------------------------+
| Sidebar          | Analysis: Senior Developer @ TechCorp  |
|                  |----------------------------------------|
|                  | [Tabs: Overview | Evidence | Gaps |    |
|                  |        CV Draft | Cover Letter ]       |
|                  |----------------------------------------|
|                  |                                        |
|                  | OVERVIEW TAB:                          |
|                  |                                        |
|                  | Advocate Summary                       |
|                  | "You bring 8 years of Python [1] and  |
|                  |  AWS certification [3] that directly   |
|                  |  address their core stack. Your Docker |
|                  |  experience [5] provides a bridge to   |
|                  |  their Kubernetes requirement, though  |
|                  |  this is an area to strengthen in your |
|                  |  application materials." [Why?]        |
|                  |                                        |
|                  | +----------------------------------+   |
|                  | | Evidence Strength                |   |
|                  | | [=====] Strong: 5 requirements   |   |
|                  | | [===  ] Related: 2 requirements  |   |
|                  | | [=    ] Gap: 1 requirement       |   |
|                  | +----------------------------------+   |
|                  |                                        |
|                  | Requirement Breakdown                  |
|                  | [Expandable sections per requirement]  |
|                  |                                        |
|                  | > Python (5+ years) ......... Strong   |
|                  |   [Expand: evidence chain]             |
|                  | > AWS Cloud ................ Strong     |
|                  | > Kubernetes ............... Gap        |
|                  |   [Expand: bridge strategy]            |
|                  | > Team Leadership .......... Strong     |
|                  |                                        |
+------------------+----------------------------------------+
```

### Design References
- **Jobscan**: Two-pane scanner layout (JD left, resume right)
- **Teal**: Keyword highlighting with toggle
- **Perplexity**: Inline citations [1][2][3] with source panel
- **v0**: Split-panel with live preview as AI generates
- **Rezi**: Section-by-section progressive disclosure

### Key Decisions
- Split-panel during streaming, full-width tabs after completion
- Connection lines between JD requirements and evidence (visual mapping)
- Citations are clickable — hover shows source, click scrolls to it
- Gaps show bridge strategies immediately (advocate framing)
- "Tell me more" buttons on gaps trigger Socratic questions
- Evidence Strength bar uses advocate colors (emerald/sky/amber), never red
- Tab navigation: Overview | Evidence | Gaps | CV Draft | Cover Letter
- Responsive: on mobile, tabs switch between JD and Evidence views

---

## 6. Surface 4: CV Builder

### Layout
```
+------------------+--------------------+-------------------+
| Sidebar          | CV EDITOR          | LIVE PREVIEW      |
|                  |--------------------|-------------------|
|                  |                    |                   |
|                  | [Section tabs:     | [PDF-like render  |
|                  |  Summary|Exp|      |  of the CV,       |
|                  |  Skills|Edu|       |  updates as you   |
|                  |  Custom]           |  edit left side]  |
|                  |                    |                   |
|                  | SUMMARY            | +--------------+  |
|                  | [AI-generated,     | | John Doe     |  |
|                  |  editable textarea | | Sr Developer  |  |
|                  |  with "because"    | |              |  |
|                  |  annotations]      | | Summary:     |  |
|                  |                    | | 8 years of...|  |
|                  | [Regenerate]       | |              |  |
|                  | [Why this wording?]| | Experience:  |  |
|                  |                    | | ...          |  |
|                  | EXPERIENCE         | |              |  |
|                  | > Acme Corp [edit] | |              |  |
|                  | > StartupX [edit]  | |              |  |
|                  |                    | +--------------+  |
|                  |                    |                   |
|                  |--------------------+-------------------|
|                  | [Export: PDF] [Export: DOCX] [Copy]     |
+------------------+----------------------------------------+
```

### Design References
- **Teal**: Split editor (left edit, right preview), tab system
- **Kickresume**: Live preview with typographer-quality templates
- **Rezi**: Section-by-section AI writing with inline controls

### Key Decisions
- Left panel: structured editor with collapsible sections
- Right panel: live PDF preview (updates on every edit)
- Each section has: [Regenerate] [Why this wording?] [Edit manually]
- "Why this wording?" expands to show the evidence chain that led to this text
- Before/after toggle: show original CV text vs. tailored version (Jobscan pattern)
- Export: PDF (@react-pdf/renderer) and DOCX (docx npm)
- 3 clean ATS-safe templates at launch (no template gallery bloat)
- Section ordering is drag-and-drop

---

## 7. Surface 5: Application Tracker

### Phase 1: Table View
```
+------------------+----------------------------------------+
| Sidebar          | Applications                           |
|                  |----------------------------------------|
|                  | [Search] [Filter: Status v] [+ Track]  |
|                  |----------------------------------------|
|                  | Company    | Role      | Status    | Source   | Date     |
|                  |------------|-----------|-----------|----------|----------|
|                  | TechCorp   | Sr Dev    | Applied   | LinkedIn | Apr 25   |
|                  | StartupX   | Lead Eng  | Interview | Referral | Apr 22   |
|                  | BigCo      | Staff Eng | Rejected  | Cold     | Apr 18   |
|                  |                                        |
|                  | [Click row -> expands to show:]        |
|                  | - Analysis summary                     |
|                  | - CV version used                      |
|                  | - Cover letter                         |
|                  | - Socratic Q&A from this application   |
|                  | - Outcome + notes                      |
+------------------+----------------------------------------+
```

### Phase 2: Kanban View
```
+------------------+----------------------------------------+
| Sidebar          | Applications [Table | Kanban]           |
|                  |----------------------------------------|
|                  |                                        |
|                  | Saved    | Applied  | Interview | Offer |
|                  | ------   | -------  | --------- | ----- |
|                  | [Card]   | [Card]   | [Card]    |       |
|                  | [Card]   | [Card]   |           |       |
|                  | [Card]   |          |           |       |
|                  |                                        |
|                  | [Drag cards between columns]           |
|                  |                                        |
+------------------+----------------------------------------+
```

### Design References
- **Huntr**: Customizable Kanban columns, color-coded cards
- **Teal**: Job tracker with status pipeline
- **Careerflow**: CRM-style with networking links

### Key Decisions
- Phase 1: Table only (simpler, faster to build)
- Phase 2: Add Kanban toggle
- Each application links to its full footprint (analysis, CV, letter, Q&A)
- Source tracking mandatory (referral/LinkedIn/cold/company site)
- Outcome tracking (no response/rejected/interview/offer)
- After 5+ apps: cross-application insights appear on Dashboard

---

## 8. Surface 6: Profile Cloud

### Visualization
```
+------------------+----------------------------------------+
| Sidebar          | Your Living Profile                    |
|                  |----------------------------------------|
|                  |                                        |
|                  |        [Python]----[Django]             |
|                  |           |    \                        |
|                  |        [AWS]    [REST APIs]             |
|                  |           |         |                   |
|                  |     [Docker]    [GraphQL]               |
|                  |           |                             |
|                  |   [Leadership]--[Mentoring]             |
|                  |                                        |
|                  | Legend:                                 |
|                  | [===] Strong (3+ evidence points)      |
|                  | [== ] Related (1-2 evidence points)    |
|                  | [=  ] Emerging (mentioned, no depth)   |
|                  |                                        |
|                  | Click any node to see evidence chain   |
|                  |                                        |
+------------------+----------------------------------------+
```

### Node Click -> Detail Panel (Slides from Right)
```
| [Python]                                          |
| ------------------------------------------------- |
| Evidence: 5 points                                |
|                                                   |
| 1. "8 years professional use" [CV: Acme Corp]    |
| 2. "Led team of 5 Python devs" [CV: Mercury]     |
| 3. "Built ML pipeline in Python" [Socratic Q#3]  |
| 4. "Matched 4/6 recent JDs" [Application data]   |
| 5. "User confirmed: advanced" [Socratic Q#1]     |
|                                                   |
| Related Skills: Django, Flask, FastAPI            |
| Gap Pattern: "Async Python came up 3x, no proof" |
```

### Design References
- **No direct competitor has this** — this is unique to JobLoop
- Inspired by: knowledge graphs, skill maps, D3.js force-directed layouts
- **Linear**: Detail panel slides from right (no page navigation)

### Key Decisions
- Visual graph using D3.js or react-force-graph
- Nodes sized by evidence strength
- Edges show skill relationships
- Click node -> right panel with full evidence chain
- Cloud grows visually over time (new nodes animate in)
- Phase 4: Full interactive visualization. Phase 1: simplified list/card view of Cloud data

---

## 9. Surface 7: Settings

Minimal surface. Standard patterns.

```
Sections:
- Profile (name, email, LinkedIn URL)
- Preferences (dark mode, notification settings)
- Export (download all data as JSON)
- Account (plan, billing — Phase 2)
- Danger Zone (delete account)
```

---

## 10. Design System Specification

### Color Tokens (Advocate Palette)

```css
/* Evidence Strength — NEVER use red for job fit */
--evidence-strong:     oklch(0.72 0.19 160);  /* emerald — direct match */
--evidence-related:    oklch(0.74 0.15 230);  /* sky blue — transferable */
--evidence-gap:        oklch(0.80 0.16 85);   /* amber — opportunity */
--evidence-missing:    oklch(0.55 0.01 260);  /* muted gray — tell me more */

/* UI Semantics */
--color-advocate:      oklch(0.65 0.18 250);  /* calm blue — primary brand */
--color-success:       oklch(0.72 0.19 160);  /* emerald — actions completed */
--color-warning:       oklch(0.80 0.16 85);   /* amber — needs attention */
--color-destructive:   oklch(0.63 0.21 25);   /* rose — delete/destroy ONLY */
--color-info:          oklch(0.74 0.15 230);  /* sky — informational */

/* Citation */
--citation-badge-bg:   oklch(0.92 0.04 250);  /* light blue chip */
--citation-badge-text: oklch(0.45 0.18 250);  /* dark blue text */
--citation-hover-bg:   oklch(0.88 0.07 250);  /* hover state */
```

### Typography
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Scale */
--text-display: 2.25rem;   /* 36px — page titles */
--text-h1:     1.875rem;   /* 30px — section headers */
--text-h2:     1.5rem;     /* 24px — card titles */
--text-h3:     1.25rem;    /* 20px — subsection */
--text-body:   0.875rem;   /* 14px — default */
--text-small:  0.75rem;    /* 12px — labels, meta */
--text-tiny:   0.6875rem;  /* 11px — badges */
```

### Spacing (4px base, Tailwind scale)
```
gap-1: 4px    gap-2: 8px    gap-3: 12px   gap-4: 16px
gap-6: 24px   gap-8: 32px   gap-12: 48px  gap-16: 64px
```

### Component Library
shadcn/ui (Radix primitives + Tailwind) with these custom components:

| Component | Purpose | Priority |
|-----------|---------|----------|
| `AnalysisCard` | Streaming AI analysis with inline citations | P0 |
| `EvidenceChip` | Clickable [1] citation badge with hover preview | P0 |
| `ComparisonView` | Split-panel JD vs evidence with connection lines | P0 |
| `StreamingText` | Text streams with cursor, transitions to static | P0 |
| `SkeletonAnalysis` | Shimmer loading matching analysis layout | P0 |
| `StatusBadge` | Evidence strength: Strong/Related/Gap/Missing | P0 |
| `ProgressiveSection` | Expandable section with chevron + animation | P0 |
| `EmptyState` | Reusable: illustration + text + CTA | P1 |
| `CommandPalette` | Cmd+K fuzzy search (Phase 2) | P1 |
| `SkillNode` | Cloud visualization node (Phase 1: card, Phase 4: graph) | P1 |
| `SocraticCard` | Question card with skip/answer options | P0 |
| `CVSection` | Editable CV section with regenerate + "why" | P0 |
| `FootprintRow` | Application tracker row with expandable detail | P1 |

---

## 11. Interaction Patterns

### Streaming Protocol
```
User pastes JD -> clicks "Analyze"
  1. Button state: "Analyzing..." (disabled, spinner)
  2. Split panel slides in (250ms ease-in-out)
  3. Left panel: JD text with requirements highlighting (progressive)
  4. Right panel: Skeleton shimmer (3-5 lines, decreasing width)
  5. Streaming begins: evidence cards build up one by one
  6. Connection lines animate between matched pairs
  7. Gaps appear last with amber styling + bridge strategies
  8. Stream complete: action buttons fade in
     [Build Tailored CV] [Generate Cover Letter] [Track Application]
```

### Citation Interaction
```
Hover [1] -> tooltip: "CV: Acme Corp, Python Developer, 2018-2026"
Click [1] -> scrolls to and highlights the source in evidence panel
All citations listed in expandable "Sources" section at bottom
```

### Socratic Interaction
```
Question appears as a card (not inline text):
+----------------------------------------+
| About your experience                  |
|                                        |
| "You mention Docker in your CV but     |
|  not container orchestration. Have you  |
|  worked with Kubernetes, Docker Swarm,  |
|  or similar tools?"                    |
|                                        |
| [Text input area]                      |
|                                        |
| [Answer]  [Skip - I'll add this later] |
| Gate: 2 of 3 questions remaining       |
+----------------------------------------+
```

### Keyboard Shortcuts
```
Cmd+K       — Command palette
Cmd+Enter   — Submit (analyze, save, export)
N           — New analysis
/           — Focus search
J/K         — Navigate list items
Enter       — Open/expand selected
Esc         — Close panel/modal
?           — Show shortcuts help
```

---

## 12. Responsive Behavior

### Desktop (>1280px)
- Full sidebar (240px) + split-panel content
- Detail panels slide from right
- Multi-column dashboard widgets

### Tablet (768-1280px)
- Collapsed sidebar (64px, icons only)
- Split-panel still works at 50:50
- Dashboard: 2-column grid

### Mobile (<768px)
- Bottom tab bar replaces sidebar (5 icons: Home, Analyze, CV, Apps, Cloud)
- Split-panel becomes tabs ("JD" | "Evidence")
- Full-screen modals for Socratic questions
- Stacked cards for dashboard
- Command palette goes full-screen

---

## 13. Dark Mode Strategy

### Implementation
- CSS variables with `data-theme="dark"` attribute
- Respect `prefers-color-scheme` for auto-detection
- Manual toggle persisted to localStorage + user profile
- Ship dark mode from day one (not v2)

### Rules
- Never pure black (#000) — use dark grays (#121212, #1A1A1A)
- Never pure white text — use off-whites (#E0E0E0)
- Evidence colors adjust: colored borders on dark cards (not colored backgrounds)
- Test all evidence strength colors against dark backgrounds
- Reduce opacity of large colored surfaces in dark mode

---

## 14. Animation Budget

All animations serve a purpose. No decoration.

| Animation | Trigger | Duration | Purpose |
|-----------|---------|----------|---------|
| Skeleton shimmer | AI processing | 1.5s loop | "Working on it" |
| Stream cursor blink | AI streaming | 500ms step | "Still generating" |
| Card scale-in | Evidence appears | 200ms ease | "New info found" |
| Panel slide | Detail opens | 250ms ease | Spatial context |
| Connection line draw | Match found | 300ms ease | Visual mapping |
| Fade-in buttons | Stream complete | 200ms ease | "Ready for action" |
| Status color cross-fade | State change | 200ms ease | Smooth transition |

Reduced motion: all animations → 0.01ms.

---

## 15. Build Order (Phase 1 MVP)

Based on the 7 surfaces, build in this order:

### Sprint 1: Foundation
1. App shell: sidebar + main content area + routing
2. Design tokens: colors, typography, spacing (Tailwind config)
3. `SkeletonAnalysis`, `StreamingText`, `StatusBadge` components
4. Dark mode toggle + theme system

### Sprint 2: Analysis (Core Surface)
5. JD input page with textarea
6. `ComparisonView` split-panel
7. `AnalysisCard` with streaming output
8. `EvidenceChip` citations with hover/click
9. `ProgressiveSection` for requirement breakdown

### Sprint 3: CV & Socratic
10. `SocraticCard` question interface
11. `CVSection` editor with left edit / right preview
12. PDF export (@react-pdf/renderer)
13. DOCX export (docx npm)
14. Before/after CV comparison toggle

### Sprint 4: Tracking & Cloud
15. Application tracker table view
16. `FootprintRow` with expandable detail
17. Profile Cloud card view (simplified, not graph yet)
18. Dashboard with summary widgets
19. `EmptyState` for all surfaces

### Sprint 5: Polish
20. `CommandPalette` (Cmd+K)
21. Keyboard shortcuts
22. Responsive: mobile bottom tab bar
23. Onboarding flow
24. Error states and edge cases

---

## 16. What Makes This Different From Every Competitor

| Competitor Pattern | JobLoop Evolution |
|-------------------|-------------------|
| Match score (number) | Evidence language (never a score) |
| Red/green keywords | Emerald/sky/amber evidence strength |
| Static resume analysis | Living Profile that compounds across applications |
| One-shot AI generation | Socratic questioning that enriches over time |
| Opaque AI suggestions | "Because" chains with clickable citations [1][2][3] |
| Template gallery (50+) | 3 clean ATS templates (quality > quantity) |
| AI chatbot sidebar | Structured Socratic cards (not free-form chat) |
| Job score feed | User brings own JDs (we optimize, not discover) |
| Extension-first | Web-first, extension in Phase 3 |
| Credit-limited AI | Unlimited within subscription tier |

The UI itself communicates the advocate philosophy: no red for fit, no opaque scores, every conclusion has a "because," and gaps are "opportunities" not "failures."
