# JobLoop AI — Visual Competitive Audit
## Honest Assessment: Our Wireframes vs Shipped Competition
## Date: 2026-04-29
## Based on: 48 competitor screenshots + 6 analysis MDs + our 19 Figma screens

---

## Screen-by-Screen Comparison

### 1. Kanban Tracker: Us vs Huntr vs Careerflow

| Dimension | Huntr | Careerflow | Us |
|---|---|---|---|
| Overall feel | Polished product. Purple brand, real company logos (Shopify, Google, Snapchat), drag animation shown mid-flight | Wireframe-y marketing mockup. Soft pastel cards, placeholder gray lines | Clean dark mode. Company initials (not logos), colored borders per column, evidence strength per card |
| Information per card | Company logo + title + company + time + colored border | Company logo + title + colored left border | Company initial + title + evidence count + date |
| They have, we don't | Real company logos (Clearbit API), drag-and-drop animation, "Share" and "Documents" tabs | Gentler color palette | Nothing meaningful |
| We have, they don't | — | — | Evidence strength per card ("4 Strong"), "Closed" not "Rejected", table/board toggle |
| Winner | Huntr (polish + logos) | We beat Careerflow | Huntr's polish > ours, but ours has more useful information |

**Gap to close:** Company logos via Clearbit/Logo.dev API (one integration during development).

---

### 2. Resume/CV Analysis: Us vs Rezi vs Careerflow

| Dimension | Rezi | Careerflow | Us |
|---|---|---|---|
| Core display | Simple checklist: green check = matched, gray circle = missing. No explanations | Big 95% circle + category progress bars. Looks impressive but opaque | Evidence strength bar, requirement breakdown accordion, bridge strategies, citations [1][2][3], "APPLY WITH REPOSITIONING" coaching |
| Information density | Very low. One keyword per line | Medium. Score + 3 categories. No WHY | High. Every requirement mapped to evidence with citations, gaps have bridges |
| Emotional impact | "Here's a checklist, fix it yourself" | "95%! You're great!" (but why?) | "You're a strong candidate. Lead with Python + AWS. Here's how to reframe the K8s gap" |
| Visual quality | Minimal, clean, boring | Marketing-polished hero shot | Production wireframe quality. Readable, well-structured, lacks micro-polish |

**Verdict:** Functionally the best by far. No competitor shows WHY, HOW to bridge, or WHAT strategy to use. Careerflow's 95% circle is visually punchier — wrong info presented beautifully vs right info in good (not great) packaging.

---

### 3. CV Builder: Us vs Kickresume vs Teal

| Dimension | Kickresume | Teal | Us |
|---|---|---|---|
| Template quality | Beautiful. Gold sections, professional photo, excellent typography | Dozens of templates, deep customization (fonts, colors, spacing) | White paper preview with professional typography. One template shown |
| Editor UX | WYSIWYG in-place editing | Form-based left, preview right. Inline AI buttons per section | Form-based left, preview right. Section tabs, AI buttons + "Why this wording?" |
| They have, we don't | Gorgeous template gallery, photo support | Template gallery, design customization tab, font picker | — |
| We have, they don't | — | — | "Why this wording?" evidence chain, version history per JD, "Matches 3 job requirements" |

**Gap to close:** Template variety (3-4 polished templates minimum for MVP). Template customization (font, color, spacing) can be Phase 2.

---

### 4. Dashboard: Us vs Careerflow vs Simplify

| Dimension | Simplify | Careerflow | Us |
|---|---|---|---|
| Layout | Kanban with funnel overlay. Light mode, cramped | Widget-based command center. Activity, analytics, follow-ups | Stat row + funnel + recent analyses + pattern insights + skills demand + upcoming |
| Analytics | Basic funnel | Application trends, success rates, response rates | Visual funnel + pattern insights ("Python + FastAPI in 8/12") + skills demand + upcoming |
| Unique value | Auto-populates from extension | AI pattern detection | Cross-application intelligence ("25% interview rate -- evidence-rich CVs correlate") |

**Verdict:** Our dashboard is the most information-rich of any competitor. Pattern insights card is unique. This is one of our strongest screens.

---

### 5. Before/After Comparison: Us vs Jobscan

| Dimension | Jobscan | Us |
|---|---|---|
| Layout | Side-by-side with both match rates | Side-by-side with diff highlighting, margin markers, evidence citations, legend |
| Metrics shown | "Match Rate: 42% -> 87%" (opaque) | "Evidence Strength: Weak -> Strong" + keyword matches + citations + sections improved |
| Diff visualization | Basic | Red/green backgrounds, +/- margin markers, color legend |

**Verdict:** Clearly better. This screen is a genuine visual differentiator.

---

### 6. Streaming Analysis: Us vs Everyone

No competitor has anything equivalent. Closest is Perplexity's citation streaming, but that's a search tool, not job analysis. Our streaming screen with source cards at top + split JD requirements vs evidence + bridge strategies + skeleton loading + "HEADS UP" red flags + connection lines is unique in the job search space.

**Verdict:** Unique. No comparison possible.

---

### 7. Login/Onboarding: Us vs Simplify

| Dimension | Simplify | Us |
|---|---|---|
| Login | Standard OAuth + email | Split layout: brand story left, auth right |
| Onboarding | Multi-step wizard + progress bar + skip buttons | 5-step: persona -> CV upload -> Cloud building (skill bubbles) -> Socratic -> Ready |
| Proven UX patterns | Progress bar + skip is well-tested | Persona selection and Socratic questions are unique but unproven |

**Verdict:** Our onboarding is more ambitious. Simplify's is more mature UX. Ours is a bet on differentiation.

---

### 8. Cover Letter: Us vs Teal vs Jobscan

| Dimension | Teal | Jobscan | Us |
|---|---|---|---|
| Controls | Length (Short/Med/Long), Tone (Formal/Casual), Custom prompt | Simple: resume + JD -> generate | Tone selector (4 options), letter with inline citations [1]-[6], "WHY THIS APPROACH?" explanation, evidence sources panel |
| Intelligence | Generic generation | Generic generation | Every paragraph cites Cloud evidence, explains approach rationale |

**Verdict:** Ours is considerably better. Citations in a cover letter and explaining the approach is unique.

---

## Overall Visual Scorecard

| Category | vs Competition | Notes |
|---|---|---|
| Color system | BETTER | Emerald/sky/amber > red/green binary. Dark mode > all-white competitors. Advocate palette is emotionally smarter |
| Typography | EQUAL | Inter Variable, same as Linear/Teal. Professional, clean |
| Layout architecture | BETTER | Linear-inspired 3-panel > Teal's cluttered top-nav. Collapsible sidebar > fixed nav |
| Information design | MUCH BETTER | Evidence chains, bridge strategies, citations -- nobody else has this depth |
| Information density | BETTER | Dashboard, analysis, before/after show more useful info per pixel |
| Component polish | WEAKER | Wireframe-quality vs shipped-product-quality. No hover/focus/active states |
| Visual "wow factor" | MIXED | Streaming + before/after are impressive. Other screens are solid not breathtaking |
| Template quality | WEAKER | One clean template vs Kickresume's gorgeous gallery |
| Micro-interactions | MISSING | No hover, focus, active, loading, transition states designed |
| Responsive design | MISSING | No mobile breakpoints designed |
| Illustrations/graphics | MISSING | No custom illustrations. Some emoji placeholders for icons |
| Empty/error states | MISSING | No zero-data, error, offline, or permission-denied states |
| Company logos | MISSING | Letter initials vs Huntr's real Clearbit logos |
| Skeleton/loading states | PARTIAL | Streaming screen has them, other screens don't |

---

## Gaps Ranked by Impact

### Must Fix Before/During MVP Development

| # | Gap | Impact | Effort | How to Close |
|---|---|---|---|---|
| 1 | Emoji icons -> proper icon library | High (looks amateur) | Low | Replace with Lucide icons during development. ~30 minutes |
| 2 | Company logos | High (looks unfinished) | Low | Clearbit Logo API or Logo.dev. One utility function |
| 3 | Hover/focus/active states | High (feels dead) | Medium | Tailwind hover: classes + Framer Motion. Built during component development |
| 4 | Loading/skeleton states | Medium (feels broken on slow connections) | Medium | Skeleton components from shadcn/ui. Add per page |
| 5 | Error states | Medium (breaks trust on first error) | Medium | Toast notifications + error boundaries. Standard patterns |
| 6 | Empty states | Medium (confusing for new users) | Medium | Illustrated empty states per section ("No applications yet") |

### Should Fix for Launch Quality

| # | Gap | Impact | Effort | How to Close |
|---|---|---|---|---|
| 7 | CV template variety | High (first impression of CV builder) | High | Design 3-4 templates: Professional, Modern, Minimal, Academic |
| 8 | Responsive/mobile breakpoints | High (50%+ traffic is mobile) | High | Tailwind responsive classes. Bottom tab bar <768px per spec |
| 9 | Transition animations | Medium (feels premium) | Medium | Framer Motion: panel slides, card reveals, progress animations |
| 10 | Dark/light mode toggle | Low-Medium | Medium | CSS variables already defined. Add toggle in settings |

### Nice to Have (Post-Launch)

| # | Gap | Impact | Effort | How to Close |
|---|---|---|---|---|
| 11 | Custom illustrations | Low-Medium (brand personality) | High | Commission or use AI-generated brand illustrations |
| 12 | Template customization (fonts, colors) | Low | High | Font picker, accent color picker in CV builder |
| 13 | Drag-and-drop animations | Low | Medium | dnd-kit with spring physics per spec |
| 14 | Keyboard shortcuts visual guide | Low | Low | Cmd+K already designed. Add shortcut hints to tooltips |

---

## Where We Stand: Summary

### Considerably Better Than Competition
- Information architecture (what we show, where, how)
- Evidence-based approach (citations, bridge strategies, "because" chains)
- Advocacy/mentoring layer (recommendation + coaching + strategy)
- Color philosophy (no red for fit, advocate palette)
- Streaming analysis (unique in market)
- Before/After comparison (best implementation)
- Cover letter intelligence (citations + rationale)
- Dashboard insights (cross-application patterns)

### On Par With Competition
- Typography and spacing
- Layout structure
- Form-based editing
- Authentication flow
- Navigation patterns

### Behind Competition (Gaps to Close)
- Component micro-polish (hover states, transitions) -- closes during development
- Company logos -- one API integration
- CV template variety -- needs 3-4 templates before launch
- Responsive design -- needs mobile breakpoints
- Empty/error states -- standard patterns, build during development
- Icon quality -- emoji -> Lucide, trivial fix

### Missing Entirely (Not in Any Competitor Either)
- Evidence credibility tiers in UI (see evidence-credibility-model.md) -- our unique addition
- Cross-application pattern learning displayed -- our unique addition
- Outcome intelligence integration -- our unique addition

---

## The Bottom Line

**Wireframe quality:** Our information design is the best in the market. The WHAT we show is considerably better. The HOW we show it (visual polish) has gaps that are normal for wireframes and will close during development.

**Development will close most gaps:** Hover states, transitions, skeleton loading, error states, responsive breakpoints, and proper icons all come naturally when building with Tailwind + shadcn/ui + Framer Motion. These aren't design decisions that need wireframing -- they're implementation details.

**Three gaps need deliberate design work:**
1. CV templates (3-4 variants) -- design during development
2. Empty states with illustrations -- design during development
3. Mobile responsive layouts -- design during development

**No gap is architectural.** Every weakness is cosmetic or incremental. The foundation -- what we show, how we structure information, how we guide users -- is stronger than any competitor's shipped product.
