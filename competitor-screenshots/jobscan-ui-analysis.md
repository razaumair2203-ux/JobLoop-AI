# Jobscan UI/UX Exhaustive Research (April 2026)

Compiled from 30+ sources including reviews, walkthroughs, official pages, and user feedback.

---

## 1. Resume Scanner / Match Rate View (The Core Product)

### Layout Structure
- **Input Phase**: Two-panel layout. Left panel: resume paste/upload area. Right panel: job description paste area. Large "Scan" button below or between the panels.
- **Results Phase**: Left sidebar shows the Match Score and complete skills list. Main content area shows the detailed report sections.
- The scanner page is the default landing zone on the dashboard -- users scroll down on the dashboard to reach it.

### Match Rate Display
- Score displayed as a percentage (1-100%) -- the famous "Match Rate" number.
- **Target zones**: 75%+ is "good" (green zone), 80%+ is "recommended." Below 75% is underperforming.
- Large, prominent percentage number dominates the top of the results view as the primary visual anchor.

### Report Sections (Toggle-able Headings)
1. **Hard Skills** -- JD keyword vs resume frequency, green/red color-coded
2. **Soft Skills** -- same format, lower weight
3. **Searchability** -- binary pass/fail indicators
4. **Recruiter Tips** -- measurable results, action verbs
5. **Formatting** -- 8 areas: file type, font, headings, dates, etc.

### Color Palette (Match Report)
- **Green**: Skills found, good match, passed checks
- **Red**: Skills missing, needs attention, failed checks
- **Primary brand**: Blue-toned palette (navy/medium blue for CTAs)
- **Score gradient**: Red-to-green spectrum based on match percentage

---

## 2. Resume Builder / Editor (Power Edit)

### Layout Structure
- **Two-panel layout**: Left sidebar = JD keywords color-coded, Right = WYSIWYG resume editor
- Real-time scoring as you edit

### Power Edit Features
- Left sidebar keyword checklist: red = missing, green = present
- Keywords update red-to-green in real-time as added
- **One-Click Optimize** (GPT-4): inline accept/reject suggestions
- **Compare Mode** (three-dots menu): side-by-side original vs optimized with both match rates
- **Phrase Suggestions**: click keyword -> 3 bullet point options

### Templates
- 9 ATS-friendly, single-column templates
- Tested against Taleo, Greenhouse, iCIMS, Workday

---

## 3. Dashboard / Home
- Central hub, scanner embedded on dashboard
- Top nav with "Platform" dropdown menu
- Desktop-first (mobile is "painful")

## 4. ATS Detection (Unique)
- Identifies which specific ATS a company uses
- No competitor offers this

## 5. Before/After Comparison
- Side-by-side: original (left) vs optimized (right)
- Both match rates displayed prominently
- Visual diff highlighting

## 6. LinkedIn Optimization
- 3-step: connect profile -> paste 3+ JDs -> view report
- 7 sections, 25+ checks
- Requires constant tab-switching (design failure)

## 7. Keyword Analysis
- Hard/soft skill separation with frequency counters
- "JD: 3x | Resume: 1x" style display
- Green checkmark / red X indicators
- Cannot distinguish must-have vs nice-to-have

## 8. Cover Letter Builder
- Simple generation: resume + JD -> generate
- Less sophisticated than resume editor

## 9. Job Tracker
- Kanban-style columns
- Chrome extension saves jobs from Indeed/LinkedIn/Glassdoor

---

## Design Wins (STEAL THESE)
1. Real-time match rate feedback loop -- gamifies optimization
2. Red-to-green keyword progression -- satisfying visual progress
3. Inline accept/reject suggestions -- faster than re-upload
4. Compare mode -- side-by-side before/after
5. ATS detection -- builds trust
6. Hard/soft skill separation -- prioritization
7. Keyword frequency matching -- "JD 3x, you 1x" is actionable

## Design Failures (EXPLOIT THESE)
1. Desktop-only, mobile is painful
2. Clunky interface, too many clicks between tools
3. Parser failures -- missing names, wrong locations
4. Keyword stuffing risk with One-Click Optimize
5. Score-chasing trap -- 80%+ still no callbacks
6. No semantic matching ("SEO" vs "Search Engine Optimization")
7. Can't distinguish must-have vs nice-to-have
8. Opaque scoring -- match rate doesn't explain WHY
9. $49.95/month is steep
