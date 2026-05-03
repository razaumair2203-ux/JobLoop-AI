# JobLoop AI — Consolidated Design Plan
## Best Cues from 8 Competitors + 3 Inspiration Sources
## Based on 48 actual screenshots + exhaustive text research

Date: 2026-04-28
Status: Ready for Figma wireframing

---

## VISUAL REFERENCE INDEX (48 images in this directory)

### Huntr (10 screenshots)
- huntr-homepage-1.png — **Kanban board** (WISHLIST/APPLIED/INTERVIEW columns, company logos, drag-and-drop)
- huntr-homepage-2.png — Resume builder overview
- huntr-homepage-3.png — Resume score/match view
- huntr-homepage-4.png — Chrome extension
- huntr-homepage-5.png — Analytics funnel
- huntr-homepage-6-10.png — Additional feature screens

### Kickresume (10 screenshots)
- kickresume-editor.png — **Professional resume template** (gold sections, photo, beautiful typography)
- kickresume-templates.png — Template gallery grid
- kickresume-ai-writer.gif — AI rewrite animation
- kickresume-ai.png, kickresume-checker.png — AI feature UI
- kickresume-template-sharp/postcard/soft.png — Individual template previews

### Rezi (5 screenshots)
- rezi-keyword-targeting.webp — **Matched/missing keyword checklist** (green checks + gray circles)
- rezi-editor-1/2/3.webp — Editor views
- rezi-sections.svg — Section structure

### Simplify (7 screenshots)
- simplify-job-tracker.png — **Kanban + analytics overlay** (funnel chart embedded)
- simplify-job-matches.png — Job matching feed
- simplify-resume-ats.png — ATS score view
- simplify-cover-letter/career-journal/networking/job-lists.png — Feature screens

### Careerflow (4 screenshots)
- careerflow-resume-builder.webp — **AI resume with 95% score circle** + progress bars
- careerflow-job-fit.webp — Job fit analyzer
- careerflow-autofill.webp — Application autofill
- careerflow-job-tracker.webp — Tracker view

### Linear (12 screenshots — light+dark pairs)
- linear-sidebar-dark.png — **3-panel dark UI: sidebar + inbox + detail** (OUR APP SHELL MODEL)
- linear-sidebar-light.png — Same in light mode
- linear-board-dark.png — **Board view with issue detail panel** (OUR TRACKER DETAIL MODEL)
- linear-board-light.png — Same in light mode
- linear-detail-dark/light.png — Detail panel close-up
- linear-tabs-dark/light.png — Tab navigation
- linear-full-dark/light.png — Full app view
- linear-ui-1/2.png — Marketing hero shots

### Missing (sites block scraping)
- Teal: teal-ui-analysis.md has exhaustive text description
- Jobscan: jobscan-ui-analysis.md has exhaustive text description

---

## THE BEST CUE FROM EACH — WHAT WE STEAL

### App Shell & Navigation
**FROM: Linear (dark mode)**
- 3-panel layout: collapsible sidebar (240px -> 64px icons) + main content + detail panel
- Warm dark gray surfaces with 4-level elevation
- Subtle sidebar: dimmer than main content, main area takes visual precedence
- Sidebar sections with icons + text labels, collapsible with `[` key
- Detail panel slides from right (200-300ms ease-out)

### Kanban Job Tracker
**FROM: Huntr**
- Horizontal columns: WISHLIST -> APPLIED -> INTERVIEW -> OFFER
- Cards with company logos (auto-populated), colored left borders per column
- Uppercase column headers with job counts
- Drag-and-drop between columns
- "+ Create" button (prominent accent color) top right

### Analytics Overlay
**FROM: Simplify**
- "Your Job Search Summarized" card overlaying the tracker
- Funnel chart: Applications -> Screen -> Interview -> Offer
- Compact, non-intrusive, shows patterns at a glance

### Resume/CV Editor
**FROM: Kickresume + Teal**
- Split-panel: editor left (~50%), live preview right (~50%)
- Section-by-section editing with form inputs (Rezi tab pattern)
- Per-section AI buttons inline: small, contextual (Teal pattern)
- Beautiful template typography (Kickresume quality)
- Real-time preview updates on every edit

### Keyword/Skill Analysis
**FROM: Rezi + Jobscan (adapted)**
- Matched skills: green checkmarks with skill names
- Missing/gap skills: gray circles with suggestions
- BUT WE DON'T: use scores, red/green traffic lights, or keyword-stuffing language
- WE DO: evidence language ("3 evidence points" not "matched"), amber for gaps (not red), "Tell me more" buttons

### Resume Scoring/Analysis
**FROM: Careerflow (INVERTED)**
- They show: 95% circle + category progress bars (Keyword Usage, Structure, Measurable Results)
- WE show: Evidence strength bar (emerald/sky/amber), NOT a score
- WE show: "5 Strong | 2 Related | 1 Gap" text, NOT "85%"
- WE show: "Because" chains with citations [1][2][3]

### Before/After Comparison
**FROM: Jobscan**
- Side-by-side: original CV (left) vs tailored CV (right)
- Visual diff highlighting
- Both versions visible simultaneously

### Onboarding
**FROM: Simplify**
- Multi-step wizard with progress bar
- Skip functionality on non-essential fields
- One action per screen (progressive disclosure)

### Citations & Evidence
**FROM: Perplexity (described in text research)**
- Inline [1][2][3] badges after supporting claims
- Hover tooltip: evidence source + snippet
- Evidence source cards as horizontal scrollable row at top of analysis
- Streaming text with real-time markdown rendering

### Command Palette
**FROM: Linear**
- Cmd+K -> centered modal, fuzzy search, grouped results
- Use cmdk library + shadcn/ui Command component
- Categories: Recent, Applications, Skills, Actions

---

## OUR UNIQUE ELEMENTS (NO COMPETITOR HAS THESE)

1. **Evidence language**: "3 strong matches, 2 transferable, 1 gap to address" — not a score
2. **Advocate palette**: emerald (strong) / sky (related) / amber (gap) — never red for job fit
3. **"Because" chains**: every claim cites Cloud evidence [1][2][3] with hover tooltips
4. **Living Profile Cloud**: skill graph that grows with every application (Phase 1: card view)
5. **Socratic cards**: structured question cards (not chat), 3-gate system, never repeat
6. **Application footprint**: persistent record per JD that compounds learning
7. **Cross-application patterns**: "K8s gap appeared in 4/6 roles" (after 5+ apps)

---

## DESIGN SYSTEM

### Color Tokens
```
Evidence Strength (NEVER red for fit):
  Strong:   emerald oklch(0.72 0.19 160)
  Related:  sky     oklch(0.74 0.15 230)
  Gap:      amber   oklch(0.80 0.16 85)
  Missing:  gray    oklch(0.55 0.01 260)

Brand:
  Primary:  calm blue oklch(0.65 0.18 250)
  Destructive: rose oklch(0.63 0.21 25) — delete actions ONLY

Dark Mode Surfaces (Linear 4-level):
  Base:     lch(8% 2 250)    — deepest background
  Raised:   lch(12% 2 250)   — sidebar, cards
  Overlay:  lch(16% 2 250)   — nested cards, hover
  Modal:    lch(20% 2 250)   — modals, dropdowns
```

### Typography
```
Sans:  Inter Variable (fallback: system)
Mono:  Berkeley Mono / JetBrains Mono

Scale:
  Display: 36px / 700      — page titles
  H1:      30px / 600      — section headers
  H2:      24px / 600      — card titles
  Label:   12px / 600 UPPERCASE — section labels (Linear pattern)
  Body:    14px / 400      — default text
  Small:   12px / 400      — metadata, timestamps
```

### Spacing
4px base grid (Tailwind scale)

### Components (shadcn/ui base)
- StatusBadge: Strong/Related/Gap/Missing with colored dots
- EvidenceChip: clickable [1] badge with hover tooltip
- SocraticCard: question + answer input + skip button + gate counter
- StreamingText: token-by-token with cursor (Vercel AI SDK)
- ComparisonView: split-panel with connection lines
- ProgressiveSection: expandable with chevron + animation

---

## FIGMA APPROACH

### Philosophy
- Design dark mode FIRST (Linear approach — it's the "designed" version)
- Use actual competitor screenshots as reference images in Figma (place above wireframes)
- Start with components, then compose pages
- Aim for ELEGANT, not just functional — the UI itself communicates advocacy

### File Structure
- **File 3** (Component Library): Design tokens + all reusable components
- **File 1** (Analysis + CV Builder): Core surfaces using components from File 3
- **File 2** (Dashboard + Onboarding + Tracker): Secondary surfaces

### Build Order
1. **Component Library** (File 3)
   - Color styles + typography styles + spacing
   - StatusBadge, EvidenceChip, SocraticCard
   - Buttons, inputs, cards, tabs, sidebar nav items
   - StreamingText skeleton, SkeletonAnalysis

2. **Analysis Page** (File 1) — 80% of user time
   - Phase 1: JD input (centered textarea + CTA)
   - Phase 2: Split-panel streaming (JD left, evidence right)
   - Phase 3: Full analysis with tabs (Overview/Evidence/Gaps/CV/Letter)

3. **CV Builder** (File 1)
   - Split-panel: editor left, live preview right
   - Section tabs, inline AI buttons
   - Before/after toggle
   - Export bar

4. **Dashboard** (File 2)
   - Cloud summary card + recent analyses + quick actions
   - Pipeline mini bar (counts per stage)
   - Pattern insights (after 5+ apps)

5. **Onboarding** (File 2)
   - 5-step flow with progress bar
   - CV upload zone, Cloud preview, Socratic questions

6. **Application Tracker** (File 2)
   - Table view (Phase 1) with expandable rows
   - Detail slide panel (Linear pattern)

### Key Design Decisions
- Dark mode first, light mode second
- Two-panel max (never three-column — Kickresume's mistake)
- Sidebar collapsible to icons on smaller screens
- Bottom tab bar on mobile (<768px)
- "Calm" animations only — no bouncy, no gratuitous motion
- Every AI output cites evidence — no black box claims
- Gaps are "opportunities" — amber, never red
