# Profile Card & Career Timeline Design Research
## Compiled May 15, 2026 — Real Product Analysis

---

## 1. Linear.app — Tab Indicators, Cards, Design System

### Design Philosophy
Linear pioneered the "Linear aesthetic" — ultra-minimal, high-density, performance-focused UI. The 2025 redesign cut back color dramatically: monochrome black/white with very few bold accent colors (purple). They rejected Apple's Liquid Glass because it prioritizes decoration over workflow clarity.

### Color System
- Uses **LCH color space** (not HSL) for theme generation — "perpetual uniformity" where colors with equal lightness appear equally bright to human eye
- Theme generation uses: base color + accent color + contrast variable (range 30–100 for accessibility)
- Reduced chrome in color calculations for "more neutral and timeless appearance"
- CSS variables: `--color-text-tertiary`, `--color-text-quaternary` for text hierarchy
- Dark mode and light mode share the same LCH generation system

### Typography
- **Headings**: Inter Display (added expression while maintaining readability)
- **Body**: Regular Inter
- CSS variables: `--text-mini-size`, `--text-small-size`, `--text-regular-size`, `--title-6-size`
- `--text-mini-line-height`, `--text-mini-letter-spacing`
- `--font-weight-medium`, `--font-weight-normal`
- Underline styling: `text-decoration-thickness: 1.5px`, `text-underline-offset: 2.5px`

### Tab Indicator Design
Linear uses a sliding indicator approach. The broader trend (which Linear popularized) has two main patterns:
- **Underline/sliding**: `position: absolute; bottom: 0` with `transition: transform 0.25s` using `translateX` + `scaleX`
- **Pill/spring**: Framer Motion `layoutId` creates a spring-animated pill that slides between tabs with a subtle bounce at the end (stiffness + damping + mass parameters)
- Linear's own tabs emphasize perfect vertical and horizontal alignment in sidebar — described as something users "feel after a few minutes" rather than notice immediately

### Hover & Interaction
- Dark-first design language (light mode exists but feels secondary)
- Accent colors pop against dark backgrounds
- Subtle borders instead of shadows for depth
- Luminance hierarchy instead of weight hierarchy
- Spring physics for hover animations (via Motion/Framer Motion): `whileHover={{ scale: 1.2 }}`

### Key Takeaway for JobLoop
The invisible precision matters most. Perfect alignment, LCH color uniformity, and "felt" quality over flashy transitions. Tab indicators should use spring-animated pills with `layoutId` for smooth, physics-based sliding.

---

## 2. Vercel Dashboard — Project Cards, Stats, Metrics

### Design System: Geist
Vercel's design system is built on **aggressive reduction** — defined as much by what it excludes as what it includes.

### Color Palette (Exact Values)
- **Background**: `#000000` (pure black)
- **Foreground**: `#FFFFFF` (pure white)
- **Gray Scale**: `#F7F7F7` through `#0A0A0A` (11-step neutral ramp, no warm/cool tints)
- **Accent Blue**: `#0070F3` (links, buttons, active states only)
- **Error**: `#EE0000`
- **Warning**: `#F5A623`
- **Success**: `#0070F3` (same as accent — intentional simplicity)
- Dark marketing site borders: white at 8% opacity
- Light dashboard borders: `gray-200` or `gray-300`

### CSS Variable System
```
--ds-background-100 (primary bg)
--ds-background-200 (secondary bg — use sparingly)
--ds-gray-100 through --ds-gray-1000 (10-step component scale)
  100 = default bg, 200 = hover bg, 300 = active bg
  400 = default border, 500 = hover border, 600 = active border
  700 = high contrast bg, 800 = hover high contrast bg
  900 = secondary text/icons, 1000 = primary text/icons
--ds-gray-alpha-100, --ds-gray-alpha-400 (transparency variants)
```

### Typography
- **Sans**: Geist (fallback: -apple-system, system-ui)
- **Mono**: Geist Mono (fallback: SFMono-Regular)
- **Size scale**: 12, 14, 16, 18, 24, 32, 48, 64px
- **Line heights**: 1.15 (tight), 1.5 (base), 1.625 (relaxed)
- **Letter spacing**: -0.04em (display headings), -0.01em (normal text)

### Shape & Space
- **Border radius**: 0px, 4px, 6px, 8px, 9999px (pill)
- **Borders**: `1px solid rgba(255, 255, 255, 0.08)` default, `rgba(255, 255, 255, 0.15)` strong
- **Spacing grid**: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px
- **Section padding**: 96–128px vertical
- No gradients on UI components
- No shadows on marketing pages
- No illustrations, no decorative color

### Project Dashboard
- Production deployment overview + active pre-production deployments
- Each deployment shows: status, triggering commit, deployment URL
- Sparkline charts in queue/metrics views showing metric changes over time
- Dashboard redesigned Feb 2026 with sidebar navigation
- Observable metrics: Web Analytics, Speed Insights, Logs

### How Stats Are Displayed
- KPI cards with: number + trend indicator (up/down arrow + percentage) + sparkline
- Sticky headers for tables, zebra striping for row distinction
- Right-aligned numbers (decimal alignment)
- F-pattern layout: most critical metric top-left

### Key Takeaway for JobLoop
The 10-step gray scale with semantic naming (100=bg, 200=hover, 400=border, 900=secondary text, 1000=primary text) is the gold standard for building a consistent dark/light theme. Border radius stays tight (4-8px). No decorative elements.

---

## 3. Raycast — Card Design Patterns

### Design Philosophy
- **Dark-first** design (light mode exists but secondary)
- Sleek dark chrome with vibrant gradient accents
- Built for productivity: high-density, low-decoration

### Visual Characteristics
- Accent colors pop against dark backgrounds
- Subtle borders instead of shadows for depth
- Luminance hierarchy instead of weight hierarchy
- Gradient accent elements for visual interest
- Components: List (multiple similar items) and Grid (more space per item with images)
- 10 UI components across 22 UI screens

### Key Takeaway for JobLoop
Raycast proves that a dark, gradient-accented UI can feel premium without being heavy. The key is using gradients ONLY on accent elements (not backgrounds), keeping the chrome dark and neutral.

---

## 4. Spotify Wrapped 2025 / Apple Music Replay — Personal Stats Cards

### Spotify Wrapped 2025 Design

#### Color Palette
- **Stripped-back**: black, white, green, red (most minimal palette in Wrapped history)
- Inspired by retro sports and urban street culture
- "Tension between chaos and clarity" — every gradient reflects unpredictable emotion

#### Typography
- **Custom font**: "Spotify Mix" — bold, dynamic, unique typographic presence
- Typography IS the main graphic element — looped and transformed across canvas
- Secondary: condensed italic fonts with retro-style outlines
- "Like something from a 1990s motocross rally"
- Black-highlighted text mimicking analog cassette tape aesthetics

#### How Stats Are Presented
- **Share cards**: modular components for individual data stories
- **Top Artist Sprint**: monthly ranking shifts shown as progress visualization
- **Listening Age**: comparative analytics vs age group cohorts
- **Fan Leaderboard**: percentile placement
- Sequential navigation with speed controls (revisit specific moments)
- Quiz mechanics ("Top Song Quiz")
- Numbers treated as design components: oversized, gradient-applied, cloned into patterns

#### Animation
- Subtle, organic movement with Bauhaus/1960s influences
- Stop-motion inspired with gritty geometric shapes
- Artist data in "subtly colored teardrop animations" that flow and overlap
- Psychedelic animations on clean black/white backgrounds
- Hand-drawn doodles and scrawled elements for nostalgic touch

#### Textures
- Grunge textures throughout
- Noise overlays for analog authenticity
- Scratchy, distressed elements
- Holographic graphic treatments

### Apple Music Replay 2025
- Full-screen animations with smooth transitions between stat cards
- Similar to Instagram Stories format
- Listening milestone badges
- "Listening Moments" highlighting peak months
- "Genre Evolution" showing taste changes over time
- Export directly to TikTok, Instagram, Threads

### Spotify Wrapped 2024 (For Comparison)
- Limited palette of high-contrast colors and gradients
- Text on flat color spaces (legibility over complexity)
- "Bold type on flat colors" — return to successful 2018 strategy
- Numbers as design components: oversized proportions, gradient fills, cloned into patterns, animated
- Structural variety: animated intros → simple text displays → shareable layouts
- Shareable cards: condensed font, larger, bolder sizing

### Key Takeaway for JobLoop
The "personal stats reveal" pattern: sequence matters. Build anticipation with animated intros, reveal data progressively (not all at once), treat numbers as visual elements (oversized, gradient-filled), and end with shareable summary cards. The Instagram Stories format (full-screen, swipe-through) is proven.

---

## 5. Bento.me / read.cv — Professional Profile Cards

### Bento.me (Note: shut down Feb 2026)
- Bento grid layout: blocks can be large, small, horizontal, vertical, or square
- Mix-and-match puzzle approach (not stacked buttons like Linktree)
- Content blocks: images, videos, maps, links, text
- Custom widgets from Figma dropped into grid (no coding)
- Visual-first approach for creatives, designers, photographers, developers
- Flexible grid = visual personality expression

### read.cv
- **Intentionally minimal** design — content over visual complexity
- Work history as a **curated visual timeline** (not a text list)
- Platform handles layout, typography, responsive design automatically
- Profiles feel "art-directed rather than algorithmically assembled"
- Editorial approach to career storytelling: shows WHAT you made + WHY + HOW
- Sections: About, Work History Timeline, Project Showcases (5-10 curated)
- PDF export capability
- Constraint of minimal format forces focus on substance
- "What you say becomes more important than layout gimmicks"

### Key Takeaway for JobLoop
read.cv's philosophy aligns perfectly: the profile should feel curated and editorial, not template-generated. The bento grid pattern (asymmetric tiles of varying importance) is ideal for the Cloud view — hero tile for identity, medium tiles for top skills, small tiles for certifications.

---

## 6. Career Timeline Visualizations

### D3.js Swimlane Chart (bunkat/1962173 — the reference implementation)

#### Structure
- **SVG dimensions**: 960x500px with margins (left: 60, right: 15, top: 20, bottom: 15)
- **Main view height**: 500 - margins - 50px buffer
- **Mini view height**: lanes.length * 12 + 50px (overview strip below main)

#### Handling Overlapping Roles
- `addToLane()` function checks for conflicts: `if (item.start < t.end && item.end > t.start)`
- Overlapping items automatically move to separate **sublanes** within parent lane
- Sublanes are vertically stacked — visually separates concurrent tasks
- Items that don't overlap share the same sublane

#### Lane Rendering
- Each lane gets a horizontal separator at `d3.round(y1(d.id)) + 0.5`
- Lane labels: left-aligned at `y1(d.id + .5)`
- Separator lines: `lightgray` stroke
- Empty lanes: `white` stroke (invisible)

#### Event Bar Styling
- **Height**: 80% of lane height (`0.8 * y1(1)`)
- **Vertical offset**: 10% of lane height + 0.5px
- **Future events**: gray fill, gray stroke
- **Past events**: `lightgreen` fill, green stroke
- Time scales use `d3.time.scale()` with dynamic tick intervals (hours/days/weeks/months based on zoom)

### React Timeline Components

#### react-svg-timeline
- SVG-based, supports multiple lanes
- Events have start/end times, allowing overlap visualization

#### react-chrono
- **4 modes**: Vertical, Horizontal, Alternating (cards left/right of central axis), Horizontal All (dashboard)
- 36 customizable theme properties: primary colors, card backgrounds, typography, borders, shadows, corner radius
- Google Fonts integration
- Auto-playing slideshow with customizable durations, transitions, progress indicators
- Full keyboard navigation
- Dark mode with dedicated properties
- Responsive: breakpoint at 768px

### Key Takeaway for JobLoop
For the CareerPath component, use the D3 swimlane pattern: horizontal lanes per employer/role type, bars at 80% lane height with 10% offset. Overlapping roles go to sublanes (vertically stacked within parent lane). Add a mini-overview strip below the main view for context. Color-code by role type or employer, not by time.

---

## 7. SaaS Dashboard Best Practices (2025-2026 Consensus)

### Card/Tile Hierarchy (Bento Grid System)
| Tier | Size | Purpose | Content |
|------|------|---------|---------|
| Hero (T1) | 4-6 cols x 2 rows | Primary KPIs | MRR, active users, churn |
| Feature (T2) | 3-4 cols x 1-2 rows | Supporting context | 30-day trends, funnels |
| Metric (T3) | 2-3 cols x 1 row | Secondary KPIs | Status indicators |
| Accent (T4) | 1-2 cols x 1 row | Quick actions | Alerts, icon stats |

### Grid Specifications
- **Foundation**: 12-column CSS Grid
- **Gap**: 16px between tiles (8px minimum, 32px maximum)
- **Container padding**: 24px
- **Sidebar width**: 240-280px

### Responsive Breakpoints
- **768px**: Hero tiles go full-width
- **375px**: All tiles stack to 12 columns (mobile)

### KPI Card Pattern (Stripe-style)
Each card contains:
1. The number (large, prominent)
2. Trend indicator (up/down arrow + percentage)
3. Sparkline (inline mini-chart)

### Color Logic
- Neutral base (soft grays, clean whites)
- 1-2 highlight colors maximum
- "Traffic light" for status: green=good, amber=warning, red=critical
- Rainbow dashboards are dead

### Specific CSS Values (from F1Studioz guide)
- CTA gradient: `linear-gradient(90deg, #ff2d75 0%, #6a3df0 100%)`
- Button shadow: `box-shadow: 0 8px 25px rgba(106, 61, 240, 0.35)`
- Hover transform: `translateY(-3px)` with elevated shadow
- Font family reference: `'Poppins', sans-serif`
- Touch target minimum: 44x44px
- Corner radius modern range: 8-12px
- Internal card padding: 24px

### Visual Hierarchy Rules
- F-pattern: most critical metric in top-left
- Bento grid: bigger tile = more important data (no labels needed)
- 3-5 metrics per view maximum
- User should understand system state within 3 seconds
- Progressive disclosure: summary card -> expanded chart -> full analysis page

### Accessibility
- ARIA labels on tile containers
- Color contrast: 4.5:1 normal text, 3:1 large text
- Focus rings: 2px solid outline, 2px offset
- Tab order follows visual reading order

### Animation Best Practices
- Hardware acceleration: animate `transform` and `opacity` only
- Target `transform: scaleX()` not `width` for progress bars (prevents layout thrashing)
- 60fps locked frame rate

---

## 8. MuchSkills — Skill Visualization Alternative

### What They Do
- Replaces traditional spreadsheet skill matrices with visual skill maps
- Database of 100,000+ skills and certifications
- AI-driven skills taxonomy per organization
- Positions itself against "spreadsheet chaos"

### Visual Approach (from marketing — exact implementation behind login)
- "Beautifully visualizes" skill data
- Dynamic, visual snapshot of capabilities (not static profiles)
- Promises managers can "see skill distributions, gaps, and patterns without interrogating a spreadsheet"
- Skill proficiency tracking over time
- Organization-wide skill views

### Key Takeaway for JobLoop
MuchSkills validates the market for visual skill representation over text lists. Their pitch — "data that cannot be read at a glance will not be used consistently" — is exactly the Cloud's principle. But their actual visualization is behind a paywall/login. Our Cloud visualization should be the individual version of what MuchSkills does for organizations.

---

## 9. Notion — Hover Cards & Progressive Disclosure

### People Profile Hover Cards
- Hover over a person to see a preview card
- Enterprise Plan: roles display in hover cards
- Card shows: top collaborators, teamspaces, recent activity
- Information revealed on demand — clean interface until user seeks detail

### Design Pattern
- Minimal base view (name, avatar, role)
- Hover triggers popover with contextual detail
- No click required for basic info
- Progressive disclosure: hover -> click -> full page

### Key Takeaway for JobLoop
For skill nodes in the Cloud: show skill name + tier indicator as base, hover reveals evidence sources + depth level + last used context, click opens full evidence chain. Three levels of progressive disclosure.

---

## 10. Synthesis — Design Decisions for JobLoop Cloud Visualization

### Identity Card
- **Inspiration**: read.cv editorial quality + Spotify Wrapped reveal animation
- Name large (32-48px), Inter Display or Geist
- Core specialty below name (18-24px, secondary text color)
- Career span + persona badge inline
- Animated reveal on first load (fade-up with spring physics, staggered)

### Skill Depth View
- **Inspiration**: Bento grid asymmetric tiles + Vercel's gray scale
- 12-column CSS grid, 16px gap, 24px container padding
- Core skills in hero tiles (4-6 cols), certs in medium tiles (3-4 cols), supporting skills in small tiles (2-3 cols)
- Each tile: skill name + segmented evidence bar + depth label
- Segmented bar: segments colored by evidence source (CV = one color, Socratic = another, Outcome = third)
- Use `transform: scaleX()` for bar animation (hardware accelerated, 60fps)
- Hover: Notion-style popover showing full evidence chain
- Border radius: 8px (modern standard)
- Internal padding: 24px
- Borders: `1px solid rgba(255, 255, 255, 0.08)` dark, `1px solid var(--ds-gray-400)` light

### Career Path Timeline
- **Inspiration**: D3 swimlane chart + react-chrono alternating mode
- Horizontal swim lanes, one per employer (or role type)
- Bars at 80% lane height, 10% offset
- Overlapping roles in sublanes (vertically stacked within parent lane)
- Mini-overview strip below main view
- Color-code by employer or domain
- Lane labels left-aligned
- Time axis with dynamic tick intervals
- Hover on bar: tooltip with role title, duration, key evidence

### Tab Navigation
- **Inspiration**: Linear's spring-animated pills
- Framer Motion `layoutId` for smooth sliding pill indicator
- Spring transition: `type: "spring", stiffness: 500, damping: 30`
- Three tabs: Overview | Depth | Career Path
- Active tab: accent color background pill, white text
- Inactive: transparent background, secondary text color
- Transition duration: ~250ms with spring bounce

### Color System
- **Dark mode primary** (following Linear/Raycast/Vercel trend)
- Adopt Vercel's 10-step gray scale naming convention
- Accent color: single brand color (avoid multi-color)
- Evidence source colors: 3-4 distinct but harmonious hues
- Status: green/amber/red for match quality indicators
- LCH color space for perceptual uniformity (Linear's approach)

### Animation on First Load
- **Inspiration**: Spotify Wrapped progressive reveal
- Step 1: Identity card fades up (0-400ms, spring)
- Step 2: Skill tiles cascade in (400-1200ms, staggered 50ms each)
- Step 3: Career path draws left-to-right (1200-2000ms)
- All animations interruptible (user scroll/click cancels remaining)
- Use `transform` + `opacity` only (GPU-accelerated)
- Subsequent visits: skip animation (localStorage flag)

---

## Sources

### Linear
- [How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Design System Analysis: Linear](https://getdesign.md/linear.app/design-md)
- [Linear Design System (Figma)](https://www.figma.com/community/file/1222872653732371433/linear-design-system)
- [Linear design: The SaaS design trend (LogRocket)](https://blog.logrocket.com/ux-design/linear-design/)

### Vercel
- [Vercel Geist Colors](https://vercel.com/geist/colors)
- [Vercel Design System Breakdown (SeedFlip)](https://seedflip.co/blog/vercel-design-system)
- [Vercel New Dashboard UX (Medium)](https://medium.com/design-bootcamp/vercels-new-dashboard-ux-what-it-teaches-us-about-developer-centric-design-93117215fe31)
- [Dashboard Navigation Redesign Rollout](https://vercel.com/changelog/dashboard-navigation-redesign-rollout)
- [Vercel Project Dashboard Docs](https://vercel.com/docs/projects/project-dashboard)

### Raycast
- [Raycast API: User Interface](https://developers.raycast.com/api-reference/user-interface)
- [Design System Inspired by Raycast](https://getdesign.md/raycast/design-md)
- [Raycast UIKit (Figma)](https://www.figma.com/community/file/1239440022662828277/raycast-uikit)
- [Raycast UI Component Examples (NicelyDone)](https://nicelydone.club/apps/raycast/components)

### Spotify Wrapped / Apple Music Replay
- [2025 Wrapped User Experience (Spotify Newsroom)](https://newsroom.spotify.com/2025-12-03/2025-wrapped-user-experience/)
- [Spotify Wrapped Design Aesthetic 2025 (Envato)](https://elements.envato.com/learn/spotify-wrapped-design-aesthetic)
- [Three Design Elements That Made Wrapped 2024 Great](https://www.alexjimenezdesign.com/blog/three-design-elements-that-made-spotify-wrapped-2024-great-b70b8)
- [Spotify Wrapped 2025 Templates (Figma)](https://www.figma.com/community/file/1580122793950964435/spotify-wrapped-2025-templates)

### Bento.me / read.cv
- [Bento.me & read.cv Analysis (Substack)](https://yashbanka.substack.com/p/bentome-and-readcv)
- [read.cv: Portfolio Platform as Living Resume (Hack Design)](https://www.hackdesign.org/toolkit/read-cv/)
- [Bento CV Figma Template](https://www.figma.com/community/file/1419781439225905906/bento-style-cv-template)

### Career Timelines
- [Swimlane Chart D3.js (bunkat)](https://gist.github.com/bunkat/1962173)
- [react-svg-timeline (npm)](https://www.npmjs.com/package/react-svg-timeline)
- [react-chrono (GitHub)](https://github.com/prabhuignoto/react-chrono)
- [d3-milestones](https://github.com/walterra/d3-milestones)

### SaaS Dashboard Design
- [Smart SaaS Dashboard Design Guide 2026 (F1Studioz)](https://f1studioz.com/blog/smart-saas-dashboard-design/)
- [Bento Grid Dashboard Design 2026 (Orbix Studio)](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics)
- [50 Best Dashboard Design Examples 2026 (Muzli)](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/)
- [SaaS Dashboard UX Design (Code Theorem)](https://codetheorem.co/blogs/saas-dashboard-ux/)

### Skill Visualization
- [MuchSkills for Individuals](https://www.muchskills.com/for-individuals)
- [MuchSkills Skills Visualisation Blog](https://www.muchskills.com/blog/muchskills-skills-visualisation)

### UI Components & Patterns
- [Animated Tooltip (Aceternity UI)](https://ui.aceternity.com/components/animated-tooltip)
- [Shadcn Hover Card](https://www.shadcn.io/ui/hover-card)
- [CSS Card Hover Effects (Subframe)](https://www.subframe.com/tips/css-card-hover-effect-examples)
- [Notion People Profiles](https://www.notion.com/help/people-profiles)
- [Modern Animated Pill Tabs (DEV)](https://dev.to/codebar_library/modern-animated-pill-tabs-2478)
- [Animated Tab Underlines in React (Medium)](https://medium.com/@mintpw/easy-guide-to-animated-tab-underlines-in-react-with-tailwindcss-80abd6acbb00)

### General Design Trends
- [UI Design Trends 2026 (Tubik)](https://blog.tubikstudio.com/ui-design-trends-2026/)
- [Dashboard Design Patterns 2026](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/)
- [Card UI Design Pattern (Figr)](https://figr.design/blog/card-ui-design-pattern)
