# Teal (tealhq.com) -- Exhaustive UI/UX Research

---

## 1. GLOBAL NAVIGATION & APP SHELL

**Primary Navigation (Top Bar -- not a left sidebar)**
- Horizontal top nav with sections: Job Tracker, Resume Builder, Contacts, Companies, Career Hub
- Teal logo at far left, Upgrade-to-Teal+ CTA in nav area
- Redesigned to feel "more like a job search companion than a chatbot"

**Color Palette**
- Primary brand: Deep teal/cyan (~#0D9488)
- Background: White with light gray (#F5F5F5) for secondary panels
- Text: Dark charcoal body, medium gray secondary
- Accents: Yellow/amber for stars, Red/orange for missing keywords, Green for matched, Purple/gold for Teal+ premium
- Light mode only -- NO dark mode

**Typography**
- Sans-serif throughout (Inter/DM Sans style)
- Page titles: ~24-28px semibold, Section headers: ~18-20px, Body: 14-16px, Labels: 12-13px gray

---

## 2. DASHBOARD / HOME (Job Tracker)

**Pipeline Stages (horizontal bar at top)**
Bookmarked -> Applying -> Applied -> Interviewing -> Negotiating -> Hired (with counts)

**Job Tracker = Spreadsheet Table**
- NOT kanban -- full-width sortable table
- Columns: Job title, Company, Max salary, Location, Status dropdown, Date saved/applied, Follow-up date, Deadline, Excitement (1-5 stars yellow), Notes icon
- Inline editing, grouping by status, click-to-sort
- Row click opens slide-over detail panel with tabs: Notes, Resumes, Contacts, Email Templates, Interview Checklist

**Design Wins**: Pipeline bar = instant overview; table is familiar; excitement stars motivational; inline editing low-friction
**Design Failures**: No kanban alternative; no charts/analytics; no conversion metrics; feels like a spreadsheet

---

## 3. RESUME BUILDER (Split-Panel)

**Layout**: Left = form-based editing (~55%), Right = live PDF preview (~45%)

**Resume Builder Home (List View)**
- Card list of all resume versions
- Actions: + New Resume, Start from JD, Start from template, New Cover Letter

**Content Editing (Left Panel)**
- Form sections: Contact, Summary, Work Experience, Education, Skills (tags), Projects, Certifications, Custom
- Inline AI buttons per section: "Add achievement", "Write with AI" (3 samples), "Improve with AI", "Customize AI"
- AI = small contextual buttons inline, NOT a chatbot

**Top Sub-Tabs**
1. Content -- main editing
2. Design ("Designer") -- template, font, color, spacing, margins
3. Analysis / Matching -- JD comparison
4. Cover Letter -- tone/length controls

**Design Mode**
- Presentation: template gallery, font picker, accent color, line height, margins slider
- Sections: drag-and-drop reorder, toggle on/off
- Settings: show/hide dates/locations, display format
- Advanced: bullet symbols, separators, border controls

**Analysis / Matching Mode**
- Split view: resume vs JD side-by-side
- Large match score % (80%+ = green)
- Keywords tabbed: Hard Skills / Soft Skills / Emphasis Words (green=matched, red=missing)
- Free: top 5 keywords; Teal+: full list (rest blurred)
- 15+ factors analyzed

**Cover Letter Tab**
- Config: Length (Short/Medium/Long), Tone (Formal/Casual/Match JD), Custom Prompt
- Preview matches resume template design

---

## 4. CHROME EXTENSION
- 4.9 stars, 3000+ reviews
- Slide-in sidebar panel on right (not popup)
- Auto-populates: title, company, location, salary, JD text
- "Save Link to Teal" = 2-click save
- Can rate excitement + add notes from extension
- Works on 40-50+ job boards

---

## 5. ONBOARDING
- Path selection: build resume / track jobs / explore
- Resume import: Upload file, LinkedIn URL (fastest), Manual entry
- Creates "master resume" -- all future versions branch from it
- Lands in Resume Builder with data populated

---

## 6. COMPONENT PATTERNS

| Component | Details |
|-----------|---------|
| Primary Button | Solid teal bg, white text, 6-8px radius |
| Secondary Button | Ghost/outline teal |
| AI Button | Small inline, sparkle icon |
| Cards | White bg, subtle border/shadow, 8-12px radius |
| Table | Spreadsheet-style, alternating rows, sortable, inline edit |
| Tags/Badges | Rounded pills for skills; color-coded status; Teal+ badges |
| Tabs | Horizontal, active = teal underline |
| Stars | 5-star yellow/amber for excitement |
| Forms | Labels above inputs, teal focus border, auto-save |
| Progress | Large % for match score; per-keyword indicators |

---

## STEAL THESE
1. Side-by-side resume/JD matching with live score
2. Chrome extension 2-click save
3. Real-time resume preview
4. Table-based job tracker -- familiar, flexible
5. Deep template customization
6. AI as inline contextual buttons
7. Master resume -> branch architecture
8. Pipeline stage overview bar

## EXPLOIT THESE
1. **Messy/cluttered interface** -- #1 user complaint
2. **No guided workflow** -- users feel lost
3. **Score-centric matching** -- reduces nuance to a number
4. **No kanban view**
5. **No analytics/insights** on search progress
6. **AI is generate-only** -- no conversational guidance, no Socratic, no strategy
7. **No application strategy** -- WHAT missing, not HOW to present
8. **No dark mode**
9. **Cover letter disconnected** from resume strategy
10. **Extension can't do matching** -- just saves
11. **Paywall on full keyword list** feels extractive
12. **No evidence-based skill validation**
