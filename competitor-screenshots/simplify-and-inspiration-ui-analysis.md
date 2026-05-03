# Simplify + Design Inspiration (Linear, Perplexity, v0) -- UI/UX Research

---

## 1. SIMPLIFY (simplify.jobs)

### Chrome Extension (Copilot)
- Floating icon turns blue when autofill available on supported ATS (100+ systems)
- Compact popup overlay anchored to corner -- minimal, doesn't obscure form
- "Autofill" primary CTA + gear icon for settings
- Manual activation (user clicks, not auto-submit)
- Every submission auto-saves to dashboard tracker (zero-friction capture)

### Job Tracker (Kanban)
- Columns: Wishlist/Saved -> Applied -> Phone Screen -> Interview -> Offer -> Rejected
- Cards: company, title, date, status. Drag-and-drop between columns
- Auto-populates from Copilot submissions
- Light-mode-first, white/gray backgrounds, subtle shadows

### Resume Builder
- Two-panel: edit left, live preview right
- Dozens of free templates
- Keyword gap analysis: JD mentions vs resume content
- One-click PDF download

### Onboarding
- Multi-step wizard with progress bar
- Skip functionality on non-essential fields
- Collects: personal info, work history, education, skills, preferences, dealbreakers
- "Well done" -- progress bar + step-by-step + skip makes it painless

### Pricing: Free (unlimited tracking/autofill), Simplify+ $39.99/mo (AI features)

### STEAL: Auto-save from analysis, progress bar onboarding, skip functionality
### EXPLOIT: Black-box AI, keyword-stuffing approach, Chrome-extension-dependent

---

## 2. LINEAR (linear.app) -- DESIGN SYSTEM GOLD STANDARD

### Sidebar Navigation
- Collapsible left sidebar (keyboard: `[` to toggle)
- Sections: My Issues, Inbox, then team sections with sub-menu flyouts
- Active item: subtle background change (not bold border)
- Background: slightly elevated from main content
- Font: Inter Variable, 12-14px, tight letter-spacing
- Icons: monoline, thin stroke, matching text color
- Collapse animation: 150-200ms smooth width transition

### Issue Detail Panel (Slides from Right)
- Click item -> detail slides in from right (200-300ms ease-out)
- Split View: list remains visible beside detail
- Title editable inline, rich text description with markdown
- Right-side metadata sidebar: Assignee, Priority, Labels, Status, Due Date
- Below: activity feed (comments, status changes, linked PRs)
- Priority colors: Urgent=red, High=orange, Medium=yellow, Low=blue, None=gray
- Labels as colored pills/chips

### Command Palette (Cmd+K)
- Full-screen modal with dark semi-transparent backdrop
- Large search input, no visible border, just text + blinking cursor
- Results grouped: Recent, Issues, Projects, Teams, Actions
- Fuzzy search (partial strings, typos, abbreviations)
- Selected item: subtle highlight (slightly lighter bg)
- Category headers: small, uppercase, muted gray
- Powered by `cmdk` library (same as Raycast, Superhuman)
- shadcn/ui provides `<Command>` component

### Typography & Spacing
- Primary: **Inter Variable**
- Mono: **Berkeley Mono**
- Hero headers: 62px/800, Section labels: 12px/600/uppercase/11px letter-spacing
- Body large: 18px/400, Body default: 14px/400, Small: 12px/400 muted
- 4px/8px grid system, card padding 12-16px, list gap 1-2px (very tight)

### Dark Mode (THE reference implementation)
- **Dark-first design** -- light mode is secondary
- 2025 refresh: cool blue-ish -> warmer gray
- **LCH color space** (perceptually uniform -- colors look equally light)
- **4-level surface elevation:**
  1. Base background (#0a0a0a - #111111)
  2. Primary elevated (sidebar, cards -- slightly lighter)
  3. Secondary elevated (nested cards, hover, active)
  4. Overlay (modals, tooltips -- lightest, backdrop blur)
- 3 defining variables: base color + accent color + contrast -> generates all 98 vars
- Community themes possible

### Suggested CSS Tokens for JobLoop
```css
--surface-base: lch(8% 2 250);       /* deepest background */
--surface-raised: lch(12% 2 250);    /* sidebar, cards */
--surface-overlay: lch(16% 2 250);   /* nested cards, hover */
--surface-modal: lch(20% 2 250);     /* modals, dropdowns */
```

### Design Tokens Source
- copycats.design/linear-app -- Tailwind config, Figma variables, CSS custom properties
- 361 brand colors + 154 typography styles extracted from live DOM
- Figma community files:
  - Linear Design System: figma.com/community/file/1222872653732371433
  - Linear UI Kit: figma.com/community/file/1279162640816574368

---

## 3. PERPLEXITY (perplexity.ai) -- CITATION PATTERN

### Inline Citations [1][2][3]
- Every claim has numbered references inline after supporting text
- Clickable -- links to source
- Hover tooltip: favicon + source title + snippet
- Small colored badges or superscript, visually distinct but not distracting

### Source Panel
- Sources at TOP of response as horizontal scrollable cards (before answer)
- Each card: favicon, domain, title, snippet (~200px wide, 60-80px tall)
- Dual approach: source panel (scanning) + inline citations (verification)

### Streaming Text
- Token-by-token rendering with blinking cursor
- Markdown formats in real-time (not after completion)
- Auto-scrolls to keep cursor visible
- Suggested follow-up questions at end

### Design Principles
- Inline cues for sentence-level claims
- Panels/drawers for long-form exploration
- Point to exact passages, not broad documents

### JobLoop Adaptation
- Evidence citations [1][2] pointing to Cloud evidence, not web sources
- Evidence panel at top: which CV sections, projects, skills contributed
- Streaming with real-time markdown rendering (Vercel AI SDK)
- Suggested actions after analysis: "Generate CV", "Analyze another JD"

---

## 4. V0 (v0.app by Vercel) -- PROGRESSIVE AI INTERACTION

### Layout
- Left panel (~40%): chat/conversation thread
- Right panel (~60%): live preview + code tabs
- Left sidebar: project list, history, env vars

### Interaction Pattern
- Natural language -> AI generates component
- Conversational refinement: "make padding larger", "swap blue for teal"
- Preview updates real-time as code generates
- Bidirectional: edit preview -> code updates, edit code -> preview updates

### 2026 Updates
- VS Code-style editor integrated
- Git panel for branches/PRs from chat
- Database integrations, sandbox runtime

### JobLoop Adaptation
- CV builder: questions/editing left, live PDF preview right
- Tabs on right: Preview (rendered CV), Analysis (Cloud match), Raw (plain text)
- Socratic answers -> CV preview updates to show improvement

---

## 5. SYNTHESIZED ARCHITECTURE FOR JOBLOOP

### Information Architecture
```
[Logo] JobLoop AI  [Cmd+K Search]             [User] [Settings]
+----------+------------------------------------------------+
| SIDEBAR  | MAIN CONTENT                                   |
| (Linear) |                                                 |
|          | Dashboard: summary cards + recent activity       |
| Dashboard| Applications: kanban OR list (Simplify+Linear)  |
| Applctns | JD Analysis: evidence panel + analysis (Perplx) |
| Cloud    | CV Builder: split-panel chat + preview (v0)     |
| Settings | Cloud: skill graph visualization                |
|          |                                                 |
| [Collaps]|                                                 |
+----------+------------------------------------------------+
```

### Component -> Inspiration Mapping
| Component | Inspiration | Priority |
|-----------|-------------|----------|
| Sidebar Navigation | Linear | P0 |
| Streaming Text | Perplexity + Vercel AI SDK | P0 |
| Evidence Citations [1][2] | Perplexity inline | P0 |
| Source/Evidence Cards | Perplexity source cards | P0 |
| CV Builder Split Panel | v0 chat + preview | P0 |
| Application Tracker | Simplify kanban + Linear list | P0 |
| Detail Slide Panel | Linear issue detail | P1 |
| Command Palette (Cmd+K) | Linear + cmdk | P1 |
| Dark Mode Theme | Linear LCH 4-level | P1 |
| Onboarding Wizard | Simplify progress bar | P1 |

### Animation Principles
- Panel transitions: 200-300ms ease-out slide
- Sidebar collapse: 150-200ms width
- Streaming text: real-time token + blinking cursor
- Hover states: 100ms color transition
- Modal backdrop: 200ms fade-in + slight blur
- Kanban drag: spring physics (dnd-kit)
- Philosophy: "Calm" -- no bouncy, no delays, no gratuitous motion
