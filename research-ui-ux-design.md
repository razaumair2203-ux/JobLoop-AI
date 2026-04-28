# UI/UX Design Research for JobLoop AI
## Best Practices from AI-Powered Productivity Tools (2025-2026)

> Research compiled April 2026. This document informs the JobLoop AI design system.

---

## Table of Contents

1. [Reference Product Analysis](#1-reference-product-analysis)
2. [AI UI/UX Trends 2025-2026](#2-ai-uiux-trends-2025-2026)
3. [Layout Patterns](#3-layout-patterns)
4. [Typography and Spacing](#4-typography-and-spacing)
5. [Color Systems and Theming](#5-color-systems-and-theming)
6. [AI Output Presentation](#6-ai-output-presentation)
7. [Citations and Evidence Display](#7-citations-and-evidence-display)
8. [Loading States and Streaming](#8-loading-states-and-streaming)
9. [Progressive Disclosure](#9-progressive-disclosure)
10. [Trust and Transparency Patterns](#10-trust-and-transparency-patterns)
11. [Split-Screen and Comparison Views](#11-split-screen-and-comparison-views)
12. [Navigation and Keyboard Shortcuts](#12-navigation-and-keyboard-shortcuts)
13. [Dark Mode](#13-dark-mode)
14. [Animation and Motion](#14-animation-and-motion)
15. [Empty States and Onboarding](#15-empty-states-and-onboarding)
16. [Responsive Design](#16-responsive-design)
17. [Design System Foundation (shadcn/ui + Tailwind)](#17-design-system-foundation)
18. [JobLoop-Specific Recommendations](#18-jobloop-specific-recommendations)
19. [Sources](#19-sources)

---

## 1. Reference Product Analysis

### 1.1 Perplexity AI — Citation-Forward AI Responses

**What they do well:**
- Every AI response includes numbered inline citations [1][2][3] embedded directly with claims
- A "Sources" panel shows the sources used, with favicons, titles, and URLs
- Users can click any citation number to see the source snippet in context
- Follow-up questions are suggested as chips below each response
- The layout is a centered single-column answer area (no sidebar clutter during answers)
- Clean search bar at top, answer flows below with prose-like formatting

**Layout structure:**
- Minimal sidebar (collapsible, shows history/collections)
- Centered content column (~720px max-width for readability)
- Sources panel: horizontal scrollable cards above the answer, or inline panel
- Related questions: chip-style buttons at bottom of each answer

**Key takeaway for JobLoop:**
Perplexity's "because" model maps directly to our evidence chains. Every claim about a candidate's fit should have a clickable citation that traces back to the resume evidence or job description requirement. The inline [1][2][3] pattern is proven and familiar to users.

### 1.2 Linear — Speed, Minimalism, Keyboard-First

**What they do well:**
- Keyboard-first design: every action has a shortcut (C = create, Cmd+K = command palette, / = search, P = priority)
- Command palette (Cmd+K): fuzzy-finder modal with shortcuts shown next to each option
- Contextual menus: right-click any issue to take any action without navigating away
- Zero-friction workflows: status changes, assignments, priority all inline
- Clean, minimal interface: no clutter, no busy sidebars
- Realtime sync: changes appear instantly across all clients
- Dark mode as the default aesthetic, with carefully tuned grays

**Layout structure:**
- Left sidebar: workspace nav (narrow, icon + text, collapsible)
- Main content area: list/board views with dense but scannable rows
- Right panel: detail view slides in from right (no full page navigation)
- Information density is high but never feels cluttered due to consistent spacing

**Design philosophy:**
- "Invisible details" — the best design is the one you don't notice
- Every animation serves a purpose (state communication, not decoration)
- Performance is a feature: optimistic updates, local-first data

**Key takeaway for JobLoop:**
Adopt keyboard-first navigation. Command palette (Cmd+K) for power users. Keep the interface dense but scannable. Use a sliding right panel for detail views (e.g., clicking an evidence item shows the source). Prioritize perceived speed.

### 1.3 v0 by Vercel — AI-Generated Output with Live Preview

**What they do well:**
- Chat-based interface: user types a natural language prompt
- Split panel design: live preview on one side, code on the other
- Real-time generation: UI builds visually as the AI generates code
- Iterative refinement: "Make the header sticky" updates in place
- Version history: users can navigate between iterations
- Uses shadcn/ui components and Tailwind CSS as output

**Layout structure:**
- Left panel: chat/prompt history
- Right panel: live preview (dominant, takes ~60-70% of space)
- Code panel: toggleable, shows source code
- Responsive: on mobile, panels stack vertically

**Key takeaway for JobLoop:**
The split-panel pattern is perfect for our Resume vs. JD comparison view. Left panel shows the JD requirements, right panel shows the resume evidence. The iterative chat pattern applies to our Socratic engine — users refine their profile through conversation.

---

## 2. AI UI/UX Trends 2025-2026

### Dominant Trends

1. **AI-First Interfaces**: AI is no longer a bolt-on chatbot — it's embedded deeply into task-oriented interfaces. Right-panel assistants, inline suggestions, semantic spreadsheets.

2. **Conversational + Structured Hybrid**: The best AI tools combine chat interfaces with structured output. Not just text — cards, tables, charts, previews.

3. **Motion as Functional Layer**: Animation communicates state, hierarchy, and flow. It answers: "What just happened? What is happening? What will happen next?" This creates confidence in flow.

4. **Personalized Dynamic Interfaces**: Interfaces that adapt based on user behavior and context. By 2030, 90% of UIs will use AI to customize experiences.

5. **Accessibility as Infrastructure**: High-contrast modes, keyboard navigation, reduced motion — not features but baseline requirements. WCAG 2.1 Level AA minimum.

6. **Calm Interfaces**: The end of "visual theatrics." Transparent AI, reduced cognitive load, quiet confidence over flashy animations.

### What This Means for JobLoop

- Our analysis view should be structured (cards, sections) not just streaming text
- The Living Profile Cloud should feel like it grows naturally, not like a data dump
- Every animation should answer "what just changed?" — especially during AI streaming
- Keyboard navigation is expected by power users (job seekers who use the tool daily)

---

## 3. Layout Patterns

### F-Pattern and Z-Pattern

Eye-tracking research confirms users scan in F-shaped patterns:
- Top horizontal bar: 3-5 most important metrics/actions
- Left vertical scan: navigation, secondary information
- Content area: primary workspace

**Recommended layout for JobLoop:**

```
+------------------+----------------------------------------+
|                  |  Top bar: Search, Cmd+K, User, Theme   |
+------------------+----------------------------------------+
|                  |                                        |
|  Sidebar (nav)   |  Main Content Area                     |
|  ~240px          |  ~calc(100% - 240px)                   |
|                  |                                        |
|  - Dashboard     |  [Content changes based on route]      |
|  - Analysis      |                                        |
|  - Profile Cloud |                                        |
|  - CV Builder    |                                        |
|  - Applications  |                                        |
|                  |                                        |
+------------------+----------------------------------------+
```

### Content Area Ratios

- **Single column (reading)**: max-width 720px, centered — for AI analysis text
- **Split view (comparison)**: 50:50 or 40:60 — for Resume vs JD
- **List + Detail**: 35:65 — for application list + selected application detail
- **Sidebar**: 240px fixed (collapsible to 64px icons-only)

### Information Hierarchy

- Show 4-6 key metrics above the fold
- Primary data: prominent cards with clear typography
- Secondary data: expandable sections or tabs
- Tertiary data: accessible via "Show more" or detail panels

---

## 4. Typography and Spacing

### Recommended Type Scale

Based on best-in-class SaaS tools (Linear, Vercel, Notion):

```
Display:     36px / 2.25rem  — Page titles (rare)
H1:          30px / 1.875rem — Section headers
H2:          24px / 1.5rem   — Card titles
H3:          20px / 1.25rem  — Subsection headers
H4:          16px / 1rem     — Small headers
Body:        14px / 0.875rem — Default text (Linear uses 14px)
Small:       12px / 0.75rem  — Labels, metadata, timestamps
Tiny:        11px / 0.6875rem — Badges, status indicators
```

### Font Stack

Modern SaaS standard: system fonts for performance, Inter as the design font.

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### Spacing Scale (4px base)

```
0.5:  2px    — Tight inline spacing
1:    4px    — Minimum spacing
1.5:  6px    — Compact element gaps
2:    8px    — Default inline spacing
3:    12px   — Small section gaps
4:    16px   — Default section spacing
5:    20px   — Medium spacing
6:    24px   — Card padding
8:    32px   — Section gaps
10:   40px   — Large section gaps
12:   48px   — Page section gaps
16:   64px   — Major layout gaps
```

### Line Heights

- Headings: 1.2-1.3
- Body text: 1.5-1.6 (for readability of AI-generated prose)
- UI labels: 1.0-1.2 (compact)

---

## 5. Color Systems and Theming

### shadcn/ui Token System (Recommended)

shadcn/ui uses semantic background/foreground pairs with CSS variables:

```css
/* Core semantic tokens */
--background          /* Page background */
--foreground          /* Default text */
--card                /* Card surface */
--card-foreground     /* Card text */
--popover             /* Popover surface */
--popover-foreground  /* Popover text */
--primary             /* Primary actions (buttons, links) */
--primary-foreground  /* Text on primary */
--secondary           /* Secondary surfaces */
--secondary-foreground
--muted               /* Muted backgrounds (disabled, subtle) */
--muted-foreground    /* Muted text */
--accent              /* Hover states, highlights */
--accent-foreground
--destructive         /* Error, delete actions */
--destructive-foreground
--border              /* Default borders */
--input               /* Input borders */
--ring                /* Focus rings */
```

### Recommended Palette Direction for JobLoop

Given the "trustworthy advocate" brand:

- **Neutral base**: Zinc or Slate (not pure gray — slightly cool/warm)
- **Primary accent**: A calm blue or teal (trust, professionalism, clarity)
- **Success**: Green (match strength, evidence found)
- **Warning**: Amber (gaps, areas to address)
- **Danger**: Red/rose (only for destructive actions, never for "don't apply")
- **Info**: Blue (citations, evidence links)

**Critical brand rule**: NEVER use red/danger colors to indicate job fit. We are an advocate — red means "this action is destructive," not "you're not qualified."

### Status Colors for Job Analysis

```
Strong Evidence:   Green/emerald  — "Your experience directly maps"
Some Evidence:     Blue/sky       — "Related experience found"
Gap Identified:    Amber/yellow   — "Growth opportunity" (NOT a red flag)
No Data Yet:       Gray/muted     — "Tell me more about this"
```

---

## 6. AI Output Presentation

### Streaming Response Pattern

The industry standard for AI-generated content in 2025-2026:

1. **Pre-generation delay (500ms-2s)**: Show skeleton screen with 3-5 lines of gray shimmer at decreasing widths
2. **Streaming phase**: Tokens appear in real-time with a blinking cursor (2px vertical bar, 500ms blink rate)
3. **Post-generation**: Cursor disappears, action buttons fade in (copy, share, refine)

### Structured Output (Not Just Text)

The best AI tools go beyond streaming text:

- **Cards**: Discrete pieces of information in bordered containers
- **Tables**: Structured comparisons (skills matrix)
- **Expandable sections**: "Why?" reasoning hidden by default
- **Inline annotations**: Highlighted text with hover explanations
- **Progress indicators**: "Analyzing section 2 of 5..."

### Vercel AI Elements Library

Vercel provides production-ready React components:
- `Conversation`: Renders message list with auto-scrolling
- `Prompt`: Input component optimized for chat
- `TypingIndicator`: Shows when AI is streaming
- `ChainOfThought`: Visual representation of AI reasoning steps

**Recommendation for JobLoop**: Use the Vercel AI SDK's streaming components as a foundation, then overlay our structured output (evidence cards, skill mapping tables, gap analysis sections).

---

## 7. Citations and Evidence Display

### The Perplexity Pattern (Recommended)

Inline numbered citations are the gold standard for verifiable AI:

```
Your 8 years of Python experience [1] directly maps to their
requirement for "senior Python developer" [2]. Your AWS
certification [3] covers their cloud infrastructure needs [4].
```

Where:
- [1] links to resume line: "Python developer at Acme Corp, 2018-2026"
- [2] links to JD requirement: "5+ years Python required"
- [3] links to resume line: "AWS Solutions Architect, certified 2023"
- [4] links to JD requirement: "Cloud infrastructure (AWS preferred)"

### Citation UI Components

1. **Inline citation number**: Small superscript badge, clickable
2. **Source panel**: Expandable panel showing all sources used
3. **Source card**: Favicon + title + relevant snippet + link to original
4. **Hover preview**: On citation hover, show a tooltip with the source snippet

### Evidence Chain Display

For JobLoop's "because" chains:

```
[Skill Card: Python]
  Strength: Strong Evidence
  Because:
    - 8 years professional use [resume: Acme Corp 2018-2026]
    - Led team of 5 Python developers [resume: Project Mercury]
    - Matches: "5+ years Python required" [JD: Requirements]
  [Expand to see full evidence...]
```

**Key principle**: Limit to 3-5 evidence points per claim. More is overwhelming. Use "Show more" for additional evidence.

---

## 8. Loading States and Streaming

### Skeleton Screen Best Practices

- Match the real layout: skeleton shapes should mirror actual content structure
- Use wave/shimmer animation (left-to-right), not pulse — perceived 65% shorter wait
- Slow and steady motion — fast shimmer draws unwanted attention
- Use `background-attachment: fixed` to keep all shimmer elements in sync
- Add `aria-live` and `aria-busy` for screen reader accessibility
- Replace skeleton with real content immediately as data arrives (progressive replacement)

### AI-Specific Loading States

**Phase 1: Thinking (0-2s)**
```
[Brain icon pulse] Analyzing your resume against this role...
[Skeleton: 3-5 shimmer lines]
```

**Phase 2: Streaming (2-15s)**
```
[Streaming text with cursor]
[Progress: "Analyzing requirements... 3 of 7"]
```

**Phase 3: Complete**
```
[Full analysis with citations]
[Action buttons fade in: "Refine", "Build CV", "Share"]
```

### Critical Rule

Never show a spinner for more than 2 seconds. If the operation takes longer, switch to a skeleton screen or progress indicator with context ("Comparing 47 requirements...").

---

## 9. Progressive Disclosure

### Core Principle

Show only essential information first. Defer advanced/rarely-used content to secondary screens or expandable sections.

### Patterns (ordered by complexity)

1. **Show More / Read More**: Simplest form. Truncated text with "Show more" link.
2. **Tooltips**: Additional info on hover without leaving context.
3. **Expandable Sections / Accordions**: User-controlled content reveal. Great for FAQ-style content and detailed evidence.
4. **Tabs**: Organize content into categories. Reduce scrolling. Good for "Overview / Evidence / Gaps / Suggestions."
5. **Drill-down**: Click to navigate to a detail view. Use for deep-diving into a specific skill or evidence chain.
6. **Stepped Wizards**: Multi-step flows for complex tasks. Use for initial profile setup.

### Best Practices

- **Max 2 levels of disclosure**: Beyond that, users get lost
- **Prioritize ruthlessly**: What does the user need NOW vs. what can wait?
- **Consistent patterns**: If accordions are used in one section, use them everywhere for the same purpose
- **Clear affordances**: Make it obvious something can be expanded (chevron icon, "Show more" text)

### Application to JobLoop

```
Level 0 (always visible):  Match summary card — "Strong match: 5/7 requirements met"
Level 1 (one click):       Requirement breakdown — each requirement with evidence
Level 2 (drill down):      Full evidence chain — exact resume lines, context, reasoning
```

---

## 10. Trust and Transparency Patterns

### Why This Matters for JobLoop

We explicitly reject black-box scoring. Our "advocate, not gatekeeper" philosophy requires that every AI conclusion be verifiable.

### Trust Indicators (Research-Backed)

**Measurable user trust signals:**
- **Correction rate**: How often users edit AI output (high = low trust)
- **Verification behavior**: Whether users check other sources (indicates trust calibration)
- **Disengagement**: Users turning off AI features (ultimate no-confidence vote)

**Design strategies that increase trust:**

1. **Source links with every claim**: When AI provides source links, users get clearer context for accuracy evaluation
2. **Layered explanations**: Surface = short plain-language reason. Expand = detailed evidence. This builds trust without cognitive overload.
3. **Loading indicators + error explanations**: Systems that acknowledge delays or mistakes feel "more human and less evasive"
4. **"Why this?" affordance**: Place a "Why?" link next to every AI-generated result

**Real-world result**: Microsoft improved their threat explanation UI and saw a 62% increase in user confidence in Defender's AI decisions.

### Explainable AI (XAI) UI Patterns

1. **Rationale chips**: Expandable chips next to recommendations that reveal reasoning on click
2. **Chain of Thought display**: Step-by-step reasoning, collapsible, with bullet points and numbers
3. **Confidence language (not scores)**: "Strong evidence found" vs. "87% match" — the former is more honest about what we actually know
4. **3-5 factor limit**: Limit reasoning display to 3-5 factors. More triggers more questions than it answers.

### JobLoop Trust Design Rules

- Every analysis statement links to evidence
- Never present a conclusion without a "because" chain
- Use natural language for confidence ("strong evidence" not "92%")
- Always show what evidence is MISSING, not just what was found
- Let users challenge any conclusion ("This isn't right" button)
- Show the user exactly what the AI "saw" (highlighted resume text)

---

## 11. Split-Screen and Comparison Views

### When to Use Split-Screen

- Before/after comparisons
- Side-by-side document analysis (Resume vs. JD)
- Input/output views (prompt vs. result)
- Reference + workspace layouts

### Design Best Practices

- **Default ratio**: 50:50 for equal comparison, 40:60 when one side is primary
- **Visual connection**: Use a shared color or element to connect the two sides
- **Responsive**: Stack vertically on mobile (< 768px)
- **Draggable divider**: Let users resize panels
- **Sync scrolling**: When comparing documents, synchronized scroll is powerful
- **Highlight connections**: Draw visual lines or use matching colors between related items on each side

### JobLoop Comparison View

```
+----------------------------+----------------------------+
|  JOB DESCRIPTION           |  YOUR EVIDENCE             |
+----------------------------+----------------------------+
|                            |                            |
|  [Requirement highlighted] | [Matching evidence card]   |
|  "5+ years Python"    ------->  "8 years Python at Acme" |
|                            |                            |
|  [Requirement highlighted] | [Gap card - amber]         |
|  "Kubernetes experience"   |  "No evidence yet"         |
|                            |  [+ Add evidence]          |
|                            |                            |
+----------------------------+----------------------------+
|  [Scroll synced]           |  [Scroll synced]           |
+----------------------------+----------------------------+
```

Key features:
- Visual connection lines between matching requirements and evidence
- Color-coded: green (match), amber (gap), gray (not yet analyzed)
- "Add evidence" buttons on gaps — advocate, not gatekeeper
- Responsive: stacks on mobile with tabs ("JD" / "Evidence")

---

## 12. Navigation and Keyboard Shortcuts

### Command Palette (Cmd+K)

Inspired by Linear and VS Code:
- Fuzzy search across all actions and content
- Show keyboard shortcuts next to each option
- Recent actions at top
- Categorized results: "Actions", "Pages", "Applications", "Settings"

### Essential Keyboard Shortcuts

```
Cmd+K         — Command palette
/             — Focus search
N             — New analysis
Cmd+Enter     — Submit / confirm
Esc           — Close modal / cancel
J/K           — Navigate list items (up/down)
Enter         — Open selected item
Cmd+Shift+D   — Toggle dark mode
?             — Show keyboard shortcut help
```

### Navigation Principles

- Every action achievable via keyboard
- Shortcuts shown in tooltips and command palette
- No nested menus deeper than 2 levels
- Breadcrumbs for deep navigation
- Back button always works (proper URL routing)

---

## 13. Dark Mode

### Implementation Strategy

Use CSS variables with `data-theme` attribute (most flexible):

```css
:root {
  --background: 0 0% 100%;       /* white */
  --foreground: 240 10% 3.9%;    /* near-black */
}

[data-theme="dark"] {
  --background: 240 10% 3.9%;    /* dark gray, NOT pure black */
  --foreground: 0 0% 98%;        /* off-white, NOT pure white */
}
```

### Dark Mode Rules

1. **Never use pure black (#000000)**: Use dark grays like #121212 or #1A1A1A — less harsh
2. **Never use pure white text (#FFFFFF)**: Use off-whites like #E0E0E0 or #C9D1D9 — less eye strain
3. **Reduce opacity of large colored surfaces**: A green card in light mode becomes a dark card with a green border in dark mode
4. **Increase border visibility**: Borders need slightly more contrast in dark mode
5. **Test all status colors in both modes**: Amber on dark gray reads differently than amber on white
6. **Respect `prefers-color-scheme`**: Auto-detect system preference, but allow manual override
7. **Persist preference**: Save to localStorage and user profile

### Token Approach

Use semantic tokens so the entire theme changes with one attribute swap:
- `--color-surface-base` (not `--gray-100`)
- `--color-text-primary` (not `--gray-900`)
- `--color-interactive-default` (not `--blue-600`)

---

## 14. Animation and Motion

### 2026 Principle: Motion is Functional

Motion answers three questions:
1. **What just happened?** (Element removed, status changed)
2. **What is happening?** (Loading, streaming, processing)
3. **What will happen next?** (Hover states, drag previews)

### Recommended Transitions

```css
/* Micro-interactions: hover, focus */
--transition-fast: 150ms ease-out;

/* Panel open/close, accordion expand */
--transition-normal: 200ms ease-in-out;

/* Page transitions, modals */
--transition-slow: 300ms ease-in-out;

/* Streaming cursor blink */
--cursor-blink: 500ms step-end infinite;
```

### Specific Patterns for JobLoop

| Action | Animation | Duration |
|--------|-----------|----------|
| AI starts streaming | Fade in + slide up | 200ms |
| Evidence card appears | Scale from 0.95 to 1.0 + fade | 200ms |
| Skeleton shimmer | Left-to-right wave | 1.5s loop |
| Panel slide in (detail view) | Slide from right | 250ms |
| Citation hover | Tooltip fade in | 150ms |
| Status change | Color crossfade | 200ms |
| Modal open | Backdrop fade + content scale up | 200ms |
| Toast notification | Slide in from top-right | 200ms |

### Reduced Motion

Always respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 15. Empty States and Onboarding

### Empty State Design

Empty states are critical first impressions. They should:

1. **Explain what this area will contain** (not just "Nothing here yet")
2. **Provide a clear primary action** (big button, not small link)
3. **Use illustration or icon** (subtle, not cartoon-y for a professional tool)
4. **Offer value immediately** ("Paste a job description to get started")

### JobLoop Empty States

**Dashboard (first visit):**
```
[Professional illustration]
"Welcome to JobLoop"
"Start by pasting a job description or uploading your resume."
[Paste JD] [Upload Resume]
"JobLoop becomes your advocate — the more you share, the stronger your case."
```

**Profile Cloud (empty):**
```
[Cloud illustration with dotted outlines]
"Your Living Profile"
"As you analyze jobs and refine your profile, evidence builds here automatically."
"Each analysis adds to your professional story."
[Start First Analysis]
```

**Applications (empty):**
```
[Inbox illustration]
"No applications tracked yet"
"After analyzing a job, save it here to track your progress."
[Analyze a Job]
```

### Onboarding Flow

Progressive — don't front-load a 10-step wizard:
1. **Step 1**: Paste a JD or upload resume (immediate value)
2. **Step 2**: See first analysis (wow moment)
3. **Step 3**: Prompt to add more context (Socratic)
4. **Later**: Profile Cloud reveals itself as data accumulates

---

## 16. Responsive Design

### Breakpoints (Tailwind defaults)

```
sm:   640px   — Mobile landscape
md:   768px   — Tablet
lg:   1024px  — Small desktop
xl:   1280px  — Desktop
2xl:  1536px  — Wide desktop
```

### Mobile Strategy

- **Sidebar**: Collapses to bottom tab bar on mobile
- **Split view**: Stacks vertically with tab switcher ("JD" | "Evidence")
- **Command palette**: Full-screen on mobile
- **Cards**: Full-width, stacked
- **Tables**: Horizontal scroll or card-based layout
- **AI streaming**: Full-width, no side panels

### Tablet Strategy

- Sidebar: Collapsible icon-only (64px)
- Split view: Works at 50:50 above 768px
- Modals: Centered with max-width

### Desktop Strategy

- Sidebar: Full (240px), collapsible
- Split view: 40:60 or 50:50 with draggable divider
- Detail panels: Slide in from right
- Multi-panel layouts supported

---

## 17. Design System Foundation

### Recommended Stack

- **Component library**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Styling**: Tailwind CSS v4 with CSS variables
- **Color space**: OKLCH (Tailwind v4 default, perceptually uniform)
- **Icons**: Lucide React (consistent, MIT licensed, tree-shakeable)
- **Animation**: Framer Motion for complex animations, CSS transitions for micro-interactions
- **Charts**: Recharts or Tremor (built on Radix)

### shadcn/ui Token System

The system uses semantic background/foreground pairs:

```
bg-background    + text-foreground      — Page level
bg-card          + text-card-foreground  — Card surfaces
bg-primary       + text-primary-foreground — Primary buttons
bg-secondary     + text-secondary-foreground — Secondary actions
bg-muted         + text-muted-foreground — Subtle backgrounds
bg-accent        + text-accent-foreground — Hover states
bg-destructive   + text-destructive-foreground — Danger only
```

### Custom Tokens for JobLoop

Beyond shadcn defaults, add:

```css
/* Evidence strength colors */
--evidence-strong: /* emerald */
--evidence-related: /* sky blue */
--evidence-gap: /* amber */
--evidence-missing: /* muted gray */

/* Citation colors */
--citation-badge: /* blue */
--citation-hover: /* blue lighter */

/* Streaming */
--cursor-color: /* primary */
--skeleton-shimmer: /* muted lighter */

/* Sidebar */
--sidebar-background
--sidebar-foreground
--sidebar-accent
```

---

## 18. JobLoop-Specific Recommendations

### Priority Design Decisions

1. **Use the Perplexity citation model** for evidence chains. Inline [1][2][3] numbers linking to resume/JD sources. This is the single most important UI pattern for our "transparent AI" philosophy.

2. **Adopt Linear's keyboard-first approach.** Cmd+K command palette, keyboard shortcuts for every action. Our power users (active job seekers) will use this tool daily.

3. **Split-panel comparison view** for the core analysis page: JD requirements on left, evidence on right, with visual connection lines between matching items.

4. **Progressive disclosure at 3 levels**: Summary card (always visible) -> Requirement breakdown (one click) -> Full evidence chain (drill down).

5. **Streaming with structure**: Don't just stream text. Stream structured output — evidence cards that build up, skill mapping tables that fill in, gap analysis sections that appear one by one.

6. **Advocate-first color language**: Green = evidence found (not "good"), Amber = opportunity to strengthen (not "warning"), Gray = tell me more (not "missing"). NEVER red for job fit.

7. **Dark mode from day one**: Use CSS variables with semantic tokens. Dark mode is not a v2 feature — it's table stakes for a professional SaaS tool in 2026.

8. **Empty states that motivate**: Every empty state should show what the area WILL become and give a clear action to get there. The Living Profile Cloud should show dotted outlines of what's building.

9. **Skeleton screens for AI delays**: Shimmer animation (left-to-right wave) during the pre-generation phase, then streaming text with cursor. Never a bare spinner.

10. **Trust through transparency**: "Why this?" links on every conclusion. Expandable reasoning. Let users challenge conclusions. Show exactly what the AI "saw" in the resume.

### Component Priority for MVP

Build these components first (they cover 80% of the UI):

1. `AnalysisCard` — Streaming AI analysis with inline citations
2. `EvidenceChip` — Clickable evidence reference with source preview
3. `ComparisonView` — Split-panel JD vs. evidence layout
4. `SkillNode` — Living Profile Cloud node with evidence strength
5. `StreamingText` — Text that streams with cursor and transitions to static
6. `SkeletonAnalysis` — Shimmer loading state matching analysis layout
7. `CommandPalette` — Cmd+K fuzzy search across all actions
8. `EmptyState` — Reusable empty state with illustration, text, and CTA
9. `ProgressiveSection` — Expandable section with chevron and smooth animation
10. `StatusBadge` — Evidence strength indicator (strong/related/gap/missing)

---

## 19. Sources

### Reference Products
- [Perplexity AI](https://www.perplexity.ai)
- [Linear](https://linear.app)
- [v0 by Vercel](https://v0.app)

### AI UI/UX Trends
- [Top UX UI Design Trends in 2025 - UXPin](https://www.uxpin.com/studio/blog/ui-ux-design-trends/)
- [AI-Driven Trends in UI/UX Design 2025-2026 - Medium](https://medium.com/@designstudiouiux/ai-driven-trends-in-ui-ux-design-2025-2026-7cb03e5e5324)
- [Future Of UI UX Design: 2026 Trends - Motiongility](https://motiongility.com/future-of-ui-ux-design/)
- [12 Product Design Trends for 2026 - UXPilot](https://uxpilot.ai/blogs/product-design-trends)
- [12 UI/UX Design Trends for AI Apps in 2026 - GroovyWeb](https://www.groovyweb.co/blog/ui-ux-design-trends-ai-apps-2026)
- [UX/UI Design Trends 2026: Calm Interfaces - Envato](https://elements.envato.com/learn/ux-ui-design-trends)

### SaaS Dashboard Design
- [10 Essential Dashboard Design Best Practices for SaaS - Context](https://www.context.dev/blog/dashboard-design-best-practices)
- [Smart SaaS Dashboard Design Guide 2026 - F1Studioz](https://f1studioz.com/blog/smart-saas-dashboard-design/)
- [Effective Dashboard UX Design Principles - Excited Agency](https://excited.agency/blog/dashboard-ux-design)
- [6 Steps to Design Thoughtful Dashboards - UX Collective](https://uxdesign.cc/design-thoughtful-dashboards-for-b2b-saas-ff484385960d)

### AI Streaming and UI Patterns
- [AI UI Patterns - patterns.dev](https://www.patterns.dev/react/ai-ui-patterns/)
- [The Shape of AI - UX Patterns](https://www.shapeof.ai/)
- [A2UI - AI UI Patterns](https://a2ui.org/)
- [AI Chat UI Best Practices - TheFrontKit](https://thefrontkit.com/blogs/ai-chat-ui-best-practices)
- [14 Key AI Patterns for Designers - KoruUX](https://www.koruux.com/ai-patterns-for-ui-design/)

### Split Screen Design
- [Best Practices for Split Screen Design - UX Planet](https://uxplanet.org/best-practices-for-split-screen-design-ad8507d92e66)
- [Web Layout Best Practices - Toptal](https://www.toptal.com/designers/ui/web-layout-best-practices)
- [Split Screen Layout Material Design](https://m1.material.io/layout/split-screen.html)

### Progressive Disclosure
- [Progressive Disclosure - Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive Disclosure in AI - AI UX Design Guide](https://www.aiuxdesign.guide/patterns/progressive-disclosure)
- [Progressive Disclosure Examples - UserPilot](https://userpilot.com/blog/progressive-disclosure-examples/)
- [Progressive Disclosure - GitLab Pajamas](https://design.gitlab.com/patterns/progressive-disclosure/)

### Trust and Transparency
- [Designing AI UIs That Foster Trust - UXmatters](https://www.uxmatters.com/mt/archives/2025/04/designing-ai-user-interfaces-that-foster-trust-and-transparency.php)
- [Psychology of Trust in AI - Smashing Magazine](https://www.smashingmagazine.com/2025/09/psychology-trust-ai-guide-measuring-designing-user-confidence/)
- [Trust and Transparency Patterns - Agentic Design](https://agentic-design.ai/patterns/ui-ux-patterns/trust-transparency-patterns)
- [Explainable AI UI Design - Eleken](https://www.eleken.co/blog-posts/explainable-ai-ui-design-xai)
- [Designing Trust in AI Products - Standard Beagle](https://standardbeagle.com/designing-trust-in-ai-products/)

### AI Explainability
- [Chain of Thought Component - Vercel AI SDK](https://ai-sdk.dev/elements/components/chain-of-thought)
- [How AI Models Show Reasoning - DigestibleUX](https://www.digestibleux.com/p/how-ai-models-show-their-reasoning)
- [Explainable AI - SAP Fiori](https://www.sap.com/design-system/fiori-design-web/v1-120/foundations/ai-and-joule-design/guidelines/explainable-ai)

### Dark Mode and Design Tokens
- [Dark Mode Design Systems Guide - Muzli](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/)
- [CSS Variables Guide: Design Tokens - FrontendTools](https://www.frontendtools.tech/blog/css-variables-guide-design-tokens-theming-2025)
- [Dark Mode Best Practices 2026 - NateBal](https://natebal.com/best-practices-for-dark-mode/)
- [Developer's Guide to Design Tokens - Penpot](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)

### Skeleton Loading
- [Skeleton Screens 101 - Nielsen Norman Group](https://www.nngroup.com/articles/skeleton-screens/)
- [Skeleton Screens: Why They Feel Faster - Shefali](https://shefali.dev/skeleton-screens/)

### shadcn/ui and Tailwind
- [Theming - shadcn/ui](https://ui.shadcn.com/docs/theming)
- [Tailwind Colors - shadcn/ui](https://ui.shadcn.com/colors)

### Linear Design Philosophy
- [Invisible Details - Linear Blog](https://medium.com/linear-app/invisible-details-2ca718b41a44)
- [Linear's Delightful Design Patterns - Gunpowder Labs](https://gunpowderlabs.com/2024/12/22/linear-delightful-patterns)
- [Command Palette UI Design - Mobbin](https://mobbin.com/glossary/command-palette)

### Perplexity Citation Design
- [Perplexity Platform Guide: Citation-Forward Answers - Unusual AI](https://www.unusual.ai/blog/perplexity-platform-guide-design-for-citation-forward-answers)
- [The Perplexity Playbook: Citations & Collections - Agenxus](https://agenxus.com/blog/perplexity-playbook-citations-collections-sources-how-to)

### Job Search App Design
- [Job Search App Designs - Dribbble](https://dribbble.com/tags/job-search-app)
- [Job App UI Projects - Behance](https://www.behance.net/search/projects/job%20app%20ui)
- [Job Finder UI App Kit - Figma Community](https://www.figma.com/community/file/1095632577663801003/job-finder-ui-app-kit)
