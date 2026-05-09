# CV/Resume Guidelines & Parser Schema Gaps

## Source: Binghamton University CV Guide + Federal Resume Guide (FBI) + USF Career Guide + Sample CVs
## Date: May 7, 2026

---

## CV vs Resume: Key Distinctions (from CV Guide)

| | Resume | CV |
|---|---|---|
| Purpose | Qualifications for a specific position | Comprehensive biographical statement |
| Position Type | Business, non-profit, technical, non-academic | Faculty, research, clinical, scientific, grad school |
| Length | 1-2 pages | 2+ pages |
| Focus | Tailored strengths | Complete history |

**Implication for our parser**: We receive BOTH formats. A PhD researcher sends a 6-page CV with publications, presentations, teaching, grants. A software engineer sends a 1-page resume with skills and 2 internships. Parser must handle both without schema mismatch.

---

## All Possible CV/Resume Sections (27 identified)

### Currently Handled by ParsedCVOutput ✅
1. **Contact Information** → name, email, phone, location, links
2. **Education** → education[]
3. **Professional Experience** → experience[]
4. **Research Experience** → experience[] (domain tagging)
5. **Teaching Experience** → experience[] (can be extracted)
6. **Skills** → skills[]
7. **Certifications/Licensures** → certifications[]
8. **Honors/Awards** → awards[]
9. **Publications** → publications[]
10. **Projects** → projects[]
11. **Languages** → languages_spoken[]
12. **Competencies/Summary** → competencies[], summary

### MISSING — Need Schema Addition ❌
13. **Leadership/Extracurricular** — every student CV, many mid-career. Fraternity chairs, club presidents, student senate, board roles
14. **Volunteer/Community Service** — Dr. Saliha has Heart Saver training for 200+ participants. Physics PhD has marathon + outreach. Common across all personas
15. **Presentations** — conference talks, poster sessions, invited lectures. Different from publications (spoken vs written). Academic CVs list 10-50 of these
16. **Professional Affiliations/Memberships** — ACCP, ASHP, MLA, IEEE, INCOSE. Shows engagement with profession
17. **Grants & Fellowships** — research grants, dissertation funding, fellowships, patents. Critical for academic personas

### Lower Priority — Can Map to Existing Fields
18. **Clerkship/Clinical Rotations** → experience[] with domain="healthcare" (add preceptor to bullets)
19. **Committees/University Service** → leadership[] (new field)
20. **Teaching Interests/Research Interests** → summary or competencies[]
21. **Creative Works** → projects[] with is_professional flag
22. **Professional Meetings Attended** → training or certifications with tier="course"
23. **Work History (non-core)** → experience[] (parser can flag domain="general" for non-career jobs)
24. **Civic Engagement** → volunteer[] (new field)

### Not Needed for Our Product
25. **References** — we should NOT store personal references (privacy)
26. **Foreign Study/Service** — can be captured in education or experience
27. **Works in Progress** — can be noted in publications with status

---

## Recommended Schema Additions

### P0 — Before Launch (May 30)

```typescript
// Add to ParsedCVOutput:

volunteer: Array<{
  organization: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
  impact: string | null;  // "200 participants trained", "organized annual food drive"
}>;

leadership: Array<{
  organization: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
  scope: string | null;  // "chapter of 150 members", "student senate"
}>;

professional_affiliations: string[];
// Simple list: ["ACCP", "ASHP", "IEEE", "INCOSE"]
```

### P1 — After Launch

```typescript
presentations: Array<{
  title: string;
  venue: string;
  date: string;
  type: "conference" | "workshop" | "seminar" | "poster" | "invited" | "grand_rounds";
}>;

grants: Array<{
  title: string;
  funder: string;
  amount: string | null;
  year: number | null;
  role: "PI" | "Co-PI" | "recipient" | null;
}>;
```

---

## Socratic Engine Integration: Missing-Section Detection

### Phase 2 Enrichment — New Category: "Missing Sections"

The rule engine should detect when a CV is MISSING sections that are standard for the person's persona and ask about them.

| Persona | Expected Sections | If Missing, Ask |
|---------|------------------|----------------|
| early_career | Leadership, Volunteer | "Did you hold any leadership roles in clubs, organizations, or student groups?" |
| early_career | Projects | "Do you have any personal projects, hackathons, or class projects you'd like to include?" |
| mid_career | Professional Affiliations | "Are you a member of any professional organizations (IEEE, PMI, etc.)?" |
| senior | Presentations, Committees | "Have you presented at conferences or served on professional committees?" |
| executive | Board Roles, Volunteer | "Do you serve on any boards or advisory committees?" |
| academic (from education) | Publications, Presentations, Grants, Teaching | "Do you have any publications, conference presentations, or research grants?" |
| healthcare | Volunteer/CSR, Certifications beyond core | "Have you done any community health outreach or hold additional certifications?" |
| military | Awards, Training Courses | "Do you have military decorations, commendations, or specialized training?" |
| career_changer | Transferable skills sections | "What activities outside your primary career demonstrate your new direction?" |
| freelancer | Projects, Portfolio | "Can you share your portfolio or list key client projects?" |

### Implementation

In the Phase 2 CODE rule engine (which selects enrichment questions based on persona × cloud gaps × categories):

```
NEW CATEGORY #9: "missing_sections"

Rule: For each persona, check which standard sections exist in the parsed CV.
If a section is absent AND the persona typically has it → generate enrichment question.

This is CODE — no LLM needed for detection.
Question text is a template per section × persona.
User's answer is parsed by Haiku (free text → structured data → new Cloud evidence).
```

### Why This Matters

From the Alpha CVs:
- **User 1 (M. Umair Raza)**: Has no publications listed in CVs, but LinkedIn shows 2. Without Socratic, we'd miss them entirely from 4/5 sources.
- **User 2 (Dr. Saliha)**: Has community/CSR section — but only in 2-page versions. 1-page version loses it.
- **AI/ML student**: Has Leadership section. If they uploaded only a shortened version, we'd miss fraternity chair + ACM secretary.

The missing-section detector catches what people FORGOT to include, not just what they included incorrectly. This is a unique Socratic capability NO competitor has.

---

## Guidelines for CV Generation (from Career Guides)

### Universal Rules (apply to ALL generated CVs)

1. **Action verbs first**: Every bullet starts with a strong action verb (Led, Developed, Managed, Designed, Implemented)
2. **Quantify everything**: Numbers > adjectives. "Managed team of 14" not "Managed a large team"
3. **Reverse chronological**: Most recent first, always
4. **Consistent formatting**: Same spacing, same font treatment, same date format throughout
5. **No personal info**: No age, gender, marital status, race, religion, photo (except where culturally expected — Middle East, parts of Europe)
6. **No pronouns**: "Led integration of..." not "I led the integration of..."
7. **Tailored to position**: Section order, emphasis, and bullet selection should match the job being applied for

### Federal Resume Specific (FBI Guide)

- **Max 2 pages** (Executive Order 14170)
- **Hours per week** required per role
- **MM/YYYY** date format required
- **GPA required** for education
- Training must include **number of hours**
- Volunteer/community service is a valued section

### Academic CV Specific (Binghamton Guide)

- **No page limit** — length = depth of career
- **Dissertation title + committee** required
- **Publications in proper citation format** (not just title)
- **Presentations separate from publications**
- **Teaching interests + research interests** sections common
- **Grants with amounts and role (PI/Co-PI)**

### Healthcare CV Specific (from Dr. Saliha + Pharmacy sample)

- **Licensure is separate from certifications**
- **Clinical rotations/clerkships listed separately** with preceptor names
- **CME/training hours matter** for credentialing
- **Research with impact factors** is valued
- **Community outreach/CSR** shows professional commitment

### Tech Resume Specific (from AI/ML sample)

- **Tech Stack per role** — explicit technologies used (gift for our parser)
- **Projects = proof of capability** — especially for early_career with few internships
- **GitHub/Portfolio links** — actionable proof
- **Certifications often inline with skills** — parser must extract from skills section too
- **GPA + Dean's List** relevant for students, irrelevant for experienced

---

## Cross-Reference: What Competitors Extract

| Section | Textkernel | Daxtra | Sovren | Us (current) | Us (after fix) |
|---------|-----------|--------|--------|-------------|---------------|
| Contact | ✅ | ✅ | ✅ | ✅ | ✅ |
| Education | ✅ | ✅ | ✅ | ✅ | ✅ |
| Experience | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skills | ✅ (12K taxonomy) | ✅ | ✅ | ✅ (LLM-classified) | ✅ |
| Certifications | ✅ | ✅ | ✅ | ✅ (with tiers) | ✅ |
| Publications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Awards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ❌ | ✅ | ✅ | ✅ |
| Volunteer | ✅ | ❌ | ✅ | ❌ | ✅ |
| Leadership | ✅ | ❌ | ❌ | ❌ | ✅ |
| Presentations | ✅ | ✅ | ✅ | ❌ | ✅ (P1) |
| Affiliations | ✅ | ❌ | ✅ | ❌ | ✅ |
| Grants | ✅ | ❌ | ❌ | ❌ | ✅ (P1) |
| Clerkships | ✅ | ❌ | ❌ | ❌ (→experience) | ❌ (→experience) |
| References | ✅ | ✅ | ✅ | ❌ (by design) | ❌ (by design) |

### After P0 fix: We match or exceed Textkernel on section coverage for 95% of real-world CVs.
### Only gap: Their 12K skill taxonomy + 300K synonyms. Our LLM handles this contextually.

---

## Key Insight: Socratic Engine as Missing-Section Detector

**No competitor detects missing sections.** Textkernel extracts what's there. If a section is missing, they return empty. They don't ask "hey, you're a senior engineer — where are your conference presentations?"

**This is a Socratic-only capability.** Phase 2 enrichment category #9 (missing_sections) fills gaps that the user didn't even know they had. It's the difference between a mirror (shows what you look like) and a coach (tells you what you're missing).
