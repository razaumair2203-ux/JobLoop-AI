# Huntr (huntr.co) UI/UX Research -- Exhaustive Analysis

160,000+ users. Chrome extension 4.9 stars. Ranked #1 resume builder 2026.

---

## 1. KANBAN JOB TRACKER (Signature Feature)

### Layout
- Full-width horizontal Kanban board -- primary view
- Default columns: Wishlist -> Applied -> Interview -> Offer (+ Networking)
- Columns customizable: rename, reorder, add/remove, choose colors + symbols
- Cards stack vertically, scrollable per-column, drag-and-drop between
- Left sidebar (collapsible to icon-only)
- "+ Create" button (purple accent) top right
- Board selector at top -- multiple boards per campaign

### Card Design
- Company logo (auto-populated from millions DB)
- Company name (prominent, bold)
- Job title (secondary)
- Salary range, location
- Color-customizable (can match company branding)
- Deadline badge (optional)
- Internal: posting URL, full JD, notes, contacts, tasks, activity timeline

### Color & Style
- Primary accent: **Purple** for CTAs
- Clean white/light backgrounds
- Column + card colors customizable
- "Invisible design" -- users focus on data, not UI
- Nature-themed template naming (Cedar, Hemlock, Spruce, Maple, Aspen, Bonsai)

---

## 2. RESUME BUILDER

### Four Tabs
1. **Editor** -- structured form, inline AI tools, drag-and-drop sections, live preview
2. **Layout & Style** -- 9 curated font pairings, font size, line height, margins, date format
3. **Templates** -- 7 ATS-friendly templates with color swatches
4. **Score** -- resume scoring + JD match analysis

### Score Tab (Key Feature)
- Base Resume: Section Completion + Content Quality + Content Length
- Tailored Resume: Qualifications + Responsibilities + Keywords + Job Title match
- Rating: Poor -> Weak -> Fair -> Good -> Great
- Shows **Covered vs Not Covered** checklists
- Accept suggestions individually or by category
- Score climbs visually as improvements made

---

## 3. JOB DETAIL MODAL (Expanded View)
- Modal overlay on card click
- Tabbed: Details, Activities, Notes, Contacts, Documents, Tasks, AI Tools
- **Auto-activity logging** -- moving card to "Applied" auto-logs activity
- **Gmail + Google Calendar sync** -- related emails/events surface in card
- **Glassdoor integration** -- company reviews pulled into card

## 4. CONTACT TRACKER (CRM)
- Bidirectional linking: contacts in job cards, jobs in contact records
- Fields: name, title, company, email, phone, LinkedIn, GitHub
- Free tier includes this (not paywalled)
- Manual entry only -- no LinkedIn import

## 5. CHROME EXTENSION
- Popup widget, context-aware
- Auto-populates: company, title, keywords, location, JD, URL
- One-click save to board (select board + stage)
- One-click autofill application forms
- Works on LinkedIn, Indeed, Glassdoor, ZipRecruiter, 100s more

## 6. ANALYTICS (Pro only, $40/mo)
- 4-stage funnel: Jobs Saved -> Applications -> Interviews -> Offers
- Conversion percentages between stages
- Activity tracking by day/week/month
- Date range picker

## 7. ONBOARDING
- Extension-first: get Chrome extension installed immediately
- Simple 4-stage mental model: Save -> Apply -> Interview -> Offer
- No interactive tour or sample data

---

## Navigation (Left Sidebar)
Dashboard, Job Boards (Kanban), Contacts, Activities, Documents, Metrics, AI Tools (12), Map, Autofill Settings, Settings

## Component Patterns
- Kanban cards (logo + info, drag-and-drop)
- Modal overlays (tabbed internal nav)
- Collapsible sidebar (icon-only mode)
- Funnel charts (analytics)
- Score indicators (Poor-Great scale)
- Covered/Not Covered checklists
- Activity timelines
- Color swatches (template colors)

---

## STEAL THESE
1. **Kanban board** -- users love it, intuitive metaphor
2. **Company logo auto-population** -- polished feel, zero effort
3. **Auto-activity logging** on stage changes
4. **Real-time score climbing** -- motivating feedback
5. **Collapsible sidebar** -- maximize content area
6. **One-click Chrome extension save**
7. **Gmail/Calendar sync** in job cards
8. **Covered/Not Covered checklists** -- actionable gap view
9. **Nature-themed cohesive naming** -- brand elevation

## EXPLOIT THESE
1. **No table/list view** -- Kanban only (Teal has tables, we can have both)
2. **100-job limit on free plan**
3. **No automation** -- organizes but doesn't help apply stronger
4. **$40/mo for Pro** is steep
5. **Chrome-only extension**
6. **No progressive onboarding** -- overwhelming feature depth
7. **No evidence-based skill analysis** -- simple keyword presence
8. **No transferable skill mapping**
9. **Modal-only detail view** -- can't see board + details simultaneously
10. **Analytics paywalled** -- basic funnel should be free
11. **No predictive insights**
12. **Manual-only CRM** -- no LinkedIn/CSV import
