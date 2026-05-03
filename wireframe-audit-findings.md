# Wireframe Audit — First Pass Findings
## Date: 2026-04-29
## Status: VALIDATED against spec + competitor plan

---

## CATEGORY 1: PHILOSOPHY VIOLATIONS (Must Fix First)

### F1. ATS Score in Before/After screen
- **Screen**: Before/After CV Comparison (File 1, 22:2)
- **Issue**: Shows "ATS Score Est. 42% -> 87%" in improvement stats bar
- **Violation**: Spec explicitly says NO SCORES. This is the exact anti-pattern we criticize competitors for.
- **Fix**: Replace with "Evidence Strength: Weak -> Strong" or remove entirely. Keep other stats (Keyword Matches, Evidence Citations, Sections Improved) which are counts, not scores.
- **Effort**: 5 min

### F2. Dashboard "Avg. Match: 5.2 strong per role"
- **Screen**: Dashboard (File 2, 2:2)
- **Issue**: "5.2" reads like a score/rating
- **Fix**: Change to "Avg. 5 strong matches per role" (integer, evidence count language)
- **Effort**: 2 min

---

## CATEGORY 2: MISSING MENTORING/ADVOCACY LAYER (Core Differentiator)

This is the biggest gap. The spec describes JobLoop as an **advocate that guides the user** through their application. The wireframes show data but don't coach.

### F3. No "Bridge Strategy" on gaps
- **Screen**: Streaming Analysis (File 1, 18:2) + Full Analysis (File 1, 19:2)
- **Spec says**: "Gaps show bridge strategies immediately (advocate framing)" — e.g., "No K8s evidence, but Docker expertise provides a strong foundation. Consider: complete a K8s course, your containerization skills make this a quick bridge."
- **Currently**: Kubernetes shows "Gap -- Opportunity" badge and a single sentence. No actionable strategy.
- **Fix**: Add a "Bridge Strategy" expandable section under each gap in the evidence panel. Include: what transferable skill bridges the gap + specific action recommendation.
- **Effort**: 15 min

### F4. No "Tell me more" buttons on gaps
- **Screen**: Streaming Analysis + Full Analysis
- **Spec says**: "'Tell me more' buttons on gaps trigger Socratic questions" — this is how gaps become conversations, not dead ends.
- **Currently**: Gaps are shown but have no interactive call-to-action.
- **Fix**: Add amber "Tell me more" button under each Gap evidence card. This triggers a Socratic question card inline.
- **Effort**: 10 min

### F5. No "Why this wording?" in CV Builder
- **Screen**: CV Builder (File 1, 20:2)
- **Spec says**: "Each section has: [Regenerate] [Why this wording?] [Edit manually]" — this shows the evidence chain behind every AI-generated sentence. It's our UNIQUE feature — no competitor explains their AI's reasoning.
- **Currently**: Has "AI Rewrite / Match to JD / Add Metrics / Suggestions" — functional but doesn't explain WHY.
- **Fix**: Add "Why this wording?" link per section that expands to show: "This bullet emphasizes your team leadership [2] because the JD prioritizes 'mentor junior engineers.' Your 8-person team lead experience [1] is the strongest evidence."
- **Effort**: 15 min

### F6. No Socratic questions during JD analysis
- **Screen**: Full Analysis (File 1, 19:2)
- **Spec says**: Socratic questions appear DURING analysis when gaps are found — not just during onboarding. The full Socratic flow (Section 37.4) shows questions appearing inline after gap identification: "This JD values 'mentor junior engineers.' I don't have mentorship evidence. Have you ever..."
- **Currently**: Socratic cards exist only in onboarding Step 4. The analysis flow has no questioning mechanism.
- **Fix**: Add a "Questions to Strengthen Your Application" section in Full Analysis (below the overview, above the action buttons). Show 1-2 Socratic cards for the identified gaps. This is where the AI TALKS to the user.
- **Effort**: 15 min

### F7. No "Recommendation" / positioning advice
- **Screen**: Full Analysis (File 1, 19:2)
- **Spec says**: Analysis result includes "recommendation: apply | apply_with_repositioning | skip" and "repositioning_advice: Emphasize your DevOps adjacent work..."
- **Currently**: Has "Recommended Next Steps" which is generic. Missing the clear "APPLY -- with this approach:" framing that positions the user as an advocate would.
- **Fix**: Replace "Recommended Next Steps" with "Application Strategy" card: "Apply with repositioning: Lead with your Docker + CI/CD experience to bridge the Kubernetes gap. Frame it as 'container orchestration exposure' rather than listing skills you don't have."
- **Effort**: 10 min

---

## CATEGORY 3: MISSING VISUAL DIFFERENTIATORS

### F8. No connection lines between JD requirements and evidence
- **Screen**: Streaming Analysis (File 1, 18:2)
- **Spec says**: "Connection lines between JD requirements and evidence (visual mapping)" — dashed/solid lines connecting matched pairs across the split panel. This is a MAJOR visual differentiator.
- **Currently**: Split panel shows JD left and evidence right, but no visual connection between them.
- **Fix**: Add dashed lines from each JD requirement row to its corresponding evidence card on the right. Color-coded: emerald for Strong, sky for Related, amber for Gap.
- **Effort**: 20 min (complex positioning)

### F9. No per-requirement expandable accordion in Full Analysis
- **Screen**: Full Analysis (File 1, 19:2)
- **Spec says**: "Expandable sections per requirement" with expand/collapse chevrons. User should see each JD requirement as a row they can expand to see the full evidence chain.
- **Currently**: Overview tab shows a summary paragraph and Evidence Strength bar. No requirement-by-requirement breakdown.
- **Fix**: Add expandable requirement rows below the Evidence Strength bar. Each row shows: requirement name + badge + expand chevron. Expanded state shows evidence chain with citations.
- **Effort**: 15 min

---

## CATEGORY 4: LOGICAL/UX ISSUES

### F10. Onboarding Step 5 CTA is illogical
- **Screen**: Onboarding Step 5 Ready (File 2, 23:2)
- **Issue**: Offers "Build a Tailored CV" as equal CTA alongside "Analyze a Job Description." But user hasn't analyzed a JD yet — can't build a tailored CV without a target JD.
- **Fix**: Make "Analyze Your First Job" the primary (big, blue) CTA. "Build a Tailored CV" should be secondary/dimmed or removed. Add "or explore your Dashboard" as tertiary link.
- **Effort**: 5 min

### F11. Login screen has no Sign In / Sign Up toggle
- **Screen**: Login/Signup (File 2, 18:2)
- **Issue**: Says "Get Started" — no way for returning users to know this is also their login.
- **Fix**: Add "Already have an account? Sign in" / "New here? Sign up" toggle text below the form.
- **Effort**: 5 min

### F12. Kanban "Rejected" column — negative psychology
- **Screen**: Kanban Tracker (File 2, 6:2)
- **Issue**: Red "Rejected" column creates anxiety. Against advocate philosophy.
- **Fix**: Rename to "Closed" (neutral) or move to a filter/dimmed state. Or keep but use gray (not red-ish tinting).
- **Effort**: 5 min

---

## CATEGORY 4B: MISSING PRODUCT VISION ELEMENTS (Deep Spec Cross-Reference)

These are features from the spec (v4) that have NO representation in the wireframes.

### F16. No "Recommendation Badge" (apply / apply_with_repositioning / skip)
- **Spec Section**: 5.3 Output Format
- **Spec says**: Every analysis outputs a clear recommendation: "apply", "apply_with_repositioning", or "skip". This is the ADVOCATE'S VERDICT — the most important output of the analysis.
- **Currently**: Full Analysis shows evidence strength bar and summary, but no clear recommendation verdict. The user sees data but isn't told what to DO.
- **Fix**: Add a prominent recommendation badge at the top of the Full Analysis, right under the breadcrumb: "APPLY with repositioning" (amber badge) or "STRONG FIT -- Apply" (emerald badge). This is the first thing the user should see.
- **Impact**: HIGH — this is the primary output of the tool

### F17. No Cover Letter preview/generation screen
- **Spec Section**: 8. Cover Letter Engine
- **Spec says**: Full cover letter generation with tone options (Professional/Assertive/Technical/Conversational), 250-400 words, structured as Hook/Achievement/Bridge/CTA.
- **Currently**: Full Analysis has a "Letter" tab but no wireframe shows what it looks like. CV Builder has "Write Cover Letter" action button but no destination screen.
- **Fix**: Add a Cover Letter screen or tab content showing: tone selector (4 options), generated letter preview, "Why this approach?" explanation, edit mode. Can be a tab pane in Full Analysis.
- **Impact**: MEDIUM — users expect this

### F18. No outcome tracking / learning loop visualization
- **Spec Section**: 11. Outcome Intelligence
- **Spec says**: System interprets outcomes (rejection speed = ATS mismatch vs recruiter screening vs competition), shows learning loop (which CV versions get interviews, which sources convert best).
- **Currently**: Application Tracker shows basic status but no outcome interpretation or learning signals.
- **Fix**: Add to Tracker detail panel: "Outcome Signal" section — "Rejection in <2 days suggests ATS keyword mismatch. Consider: add more matching keywords to your summary." This is the advocate LEARNING and COACHING between applications.
- **Impact**: HIGH — this is the compounding intelligence differentiator

### F19. No JD input methods beyond paste
- **Spec Section**: 6.1 Input Methods
- **Spec says**: MVP supports paste text + paste URL + file upload. Currently only shows paste textarea.
- **Fix**: Add URL input field and file upload button below the textarea on JD Input screen. "Paste text, enter URL, or upload PDF"
- **Impact**: MEDIUM — convenience feature

### F20. No CV version history / comparison
- **Spec Section**: 9. CV Versioning
- **Spec says**: Master CV + job-specific versions, AI-generated change summaries, restore any version. The "History" button is shown in the spec's CV Editor wireframe.
- **Currently**: CV Builder shows one version. No version history, no way to see what changed between versions.
- **Fix**: Add a "History" dropdown or panel in CV Builder showing: "v3 for TechCorp (Apr 25) — Emphasized Python leadership", "v2 for CloudScale (Apr 23) — Added AWS metrics", "v1 Master CV".
- **Impact**: MEDIUM — essential for the "application footprint" concept

### F21. No "Source" column in Application Tracker
- **Spec Section**: 10.1 Data Model, field: source
- **Spec says**: source (linkedin | indeed | company_site | referral | other) — mandatory field. The tracker should show WHERE each application was submitted.
- **Currently**: Tracker table has Role, Company, Status, Match, Date. No source column.
- **Fix**: Add "Source" column to tracker table with icons (LinkedIn, Indeed, Direct, Referral).
- **Impact**: MEDIUM — needed for outcome intelligence ("which sources convert best?")

### F22. No confidence level / JD quality indicator
- **Spec Section**: 5.4 Honesty Rules
- **Spec says**: "Show confidence level: if JD is vague, say 'medium confidence — JD lacks detail'"
- **Currently**: Analysis shows evidence strength but doesn't flag when the JD itself is weak/incomplete.
- **Fix**: Add a "Confidence: High" or "Confidence: Medium — JD lacks salary and specific requirements" indicator near the analysis header.
- **Impact**: LOW-MEDIUM — honesty feature

### F23. No "red flags" display from JD parsing
- **Spec Section**: 6.2 JD Structured Output, field: red_flags
- **Spec says**: JD parsing detects red flags like "unrealistic requirements, potential discrimination signals, unicorn job postings."
- **Currently**: JD requirements are shown neutrally. No warning about suspicious JDs.
- **Fix**: If red flags exist, show a subtle amber alert: "Heads up: This JD lists 15+ required technologies across 3 domains — this may be a wishlist, not actual requirements."
- **Impact**: MEDIUM — advocate protecting the user

### F24. No interview prep section
- **Spec Section**: 13. Interview Preparation (Phase 3)
- **Spec says**: Question generation, STAR response builder, company briefing.
- **Currently**: No wireframe for interview prep. Not even a placeholder.
- **Fix**: Can defer (Phase 3) but should show in the tracker detail panel: "Prepare for Interview" button when status = interview. Even a stub shows the vision.
- **Impact**: LOW (Phase 3) but shows product depth

### F25. No natural language feedback input
- **Spec Section**: 14. Natural Language Feedback
- **Spec says**: User can type "Got rejected from 3 DevOps roles" and the system parses + acts.
- **Currently**: No visible input for natural language commands.
- **Fix**: The Cmd+K palette could serve this dual purpose — "Search commands, pages, or tell me something..." with examples like "I got the TechCorp interview" or "Stop suggesting remote roles."
- **Impact**: LOW-MEDIUM — could be a Cmd+K enhancement

### F26. No insight dashboard metrics (trend charts, conversion funnel with %)
- **Spec Section**: 15.1 Dashboard Metrics
- **Spec says**: Funnel with percentages (Applied 100% -> Screening 26.7% -> Interview 11.1% -> Offer 2.2%), trend charts (apps/week, interview rate over time), AI recommendations.
- **Currently**: Dashboard has funnel bars but no percentages. No trend charts. Pattern Insights card has some recommendations but not the spec's data-driven ones.
- **Fix**: Add percentages to funnel. Add a mini line chart showing "Interview rate this month" trend.
- **Impact**: MEDIUM — makes the dashboard actually useful for strategy

---

## CATEGORY 5: MISSING SCREENS/STATES

### F13. No Settings page
- **Spec says**: Surface 7 — Profile, Preferences, Export, Account, Danger Zone
- **Impact**: Low for wireframes, but it's a listed surface. Can defer.

### F14. No empty states
- **Spec says**: Every surface needs an empty state with illustration + text + CTA
- **Impact**: Medium. The Dashboard, Tracker, Analysis history all need "first visit" states showing what happens when there's no data.
- **Fix**: Add one representative empty state (e.g., Dashboard empty state with "Welcome! Start by analyzing your first job description")

### F15. No mobile responsive wireframes
- **Spec says**: Bottom tab bar for <768px, split panel becomes tabs
- **Impact**: Low for wireframe phase. Can defer to development.

---

## CATEGORY 6: THINGS THAT ARE CORRECT AND GOOD

- Dark mode first (Linear approach) -- CORRECT
- Advocate palette (emerald/sky/amber, never red for fit) -- CORRECT
- Evidence language ("5 Strong, 2 Related, 1 Gap") -- CORRECT
- Source cards in streaming (Perplexity cue) -- UNIQUE, no competitor has this
- Profile Cloud (Phase 1 card view) -- UNIQUE, no competitor has this
- Socratic cards in onboarding -- CORRECT, matches spec
- Funnel chart on Dashboard (Simplify cue) -- CORRECT
- Cmd+K command palette (Linear cue) -- CORRECT
- Table/Board toggle on tracker -- CORRECT
- Collapsed sidebar (64px) -- CORRECT
- Split-panel CV editor with live preview -- CORRECT
- Before/After diff highlighting -- CORRECT (minus the ATS score violation)
- 4-level surface elevation -- CORRECT

---

## FULL SCORECARD: VISION vs WIREFRAMES

| Spec Feature | In Wireframes? | Gap Severity |
|---|---|---|
| Evidence language (no scores) | Mostly (F1/F2 violations) | Fix now |
| Advocate palette | Yes | - |
| Bridge strategies for gaps | NO (F3) | HIGH |
| "Tell me more" on gaps | NO (F4) | HIGH |
| "Why this wording?" in CV | NO (F5) | HIGH |
| Socratic during analysis | NO (F6) | HIGH |
| Recommendation badge | NO (F16) | HIGH |
| Application Strategy advice | NO (F7) | HIGH |
| Connection lines JD<>Evidence | NO (F8) | HIGH |
| Expandable requirement breakdown | NO (F9) | MEDIUM |
| Cover Letter tab content | NO (F17) | MEDIUM |
| Outcome intelligence | NO (F18) | MEDIUM |
| JD red flags | NO (F23) | MEDIUM |
| Analysis confidence level | NO (F22) | LOW-MED |
| CV version history | NO (F20) | MEDIUM |
| Source column in tracker | NO (F21) | MEDIUM |
| Funnel with percentages | NO (F26) | LOW-MED |
| JD URL/file input methods | NO (F19) | LOW-MED |
| Interview prep stub | NO (F24) | LOW (Phase 3) |
| Natural language feedback | NO (F25) | LOW |
| Settings page | NO (F13) | LOW |
| Empty states | NO (F14) | LOW |
| Mobile responsive | NO (F15) | Defer |
| Source cards in streaming | Yes | - |
| Profile Cloud card view | Yes | - |
| Socratic in onboarding | Yes | - |
| Cmd+K palette | Yes | - |
| Dark mode + 4-level elevation | Yes | - |
| Split-panel CV + live preview | Yes | - |
| Before/After diff | Yes (minus F1) | - |
| Kanban + Table toggle | Yes | - |
| Funnel chart | Yes | - |
| Collapsed sidebar | Yes | - |

**Score: 15/26 core features present = 58%**
The advocacy/mentoring layer (the thing that makes us DIFFERENT) is almost entirely absent.

---

## PRIORITY ORDER FOR FIXES

### Batch 1: Philosophy Fixes (12 min)
1. F1 — Remove ATS Score from Before/After
2. F2 — Fix Avg Match language on Dashboard
3. F10 — Fix Onboarding Step 5 CTA logic
4. F12 — Fix Kanban "Rejected" to "Closed"
5. F11 — Add sign in/up toggle to Login

### Batch 2: The Advocacy Layer — CORE DIFFERENTIATOR (60 min)
This is what makes us JobLoop and not "another Jobscan clone."
6. F16 — Add Recommendation Badge to Full Analysis (apply/reposition/skip)
7. F7 — Add "Application Strategy" card (repositioning advice)
8. F6 — Add Socratic questions during analysis (not just onboarding)
9. F3 — Add bridge strategies to gap evidence cards
10. F4 — Add "Tell me more" buttons on gaps
11. F5 — Add "Why this wording?" to CV Builder sections

### Batch 3: Visual + Data Differentiators (40 min)
12. F9 — Add expandable requirement accordion in Full Analysis
13. F8 — Add connection lines in Streaming Analysis
14. F17 — Add Cover Letter tab content (tone selector + preview)
15. F23 — Add JD red flags warning

### Batch 4: Tracker + Intelligence (30 min)
16. F18 — Add outcome signals to tracker detail panel
17. F21 — Add Source column to tracker table
18. F19 — Add URL/file upload to JD Input
19. F20 — Add CV version history panel
20. F22 — Add confidence indicator to analysis

### Deferred to Development
21. F26 — Funnel percentages + trend charts (better done in code)
22. F24 — Interview prep (Phase 3)
23. F25 — Natural language feedback (Cmd+K enhancement)
24. F13 — Settings page
25. F14 — Empty states
26. F15 — Mobile responsive

---

## WHEN DO WE START CODING?

After Batch 1-3 (minimum), ideally through Batch 4.

At that point the wireframes represent the FULL product vision including:
- The advocacy layer that no competitor has
- The mentoring/coaching UX that guides users
- The evidence-based transparency model
- The compounding intelligence features

Then coding begins in apps/web:
1. Sprint 1: App shell + design tokens + core components
2. Sprint 2: Analysis flow (the core surface, 80% of user time)
3. Sprint 3: CV Builder + Socratic
4. Sprint 4: Tracker + Cloud
5. Sprint 5: Polish + Cmd+K + responsive

Total remaining wireframe work: Batch 1-4 = ~2.5 hours.
Then we code.
