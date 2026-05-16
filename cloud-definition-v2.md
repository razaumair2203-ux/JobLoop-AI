# Profile Cloud -- Definition & Specification v2

> Version: 2.0 | May 14, 2026
> Status: DRAFT -- awaiting user approval before implementation
> Replaces: cloud-pipeline-spec.md (v1), cloud-visualization-design.md (v1)
> Author: Claude Code (based on existing specs, codebase audit, real-user testing)

---

## 0. WHY THIS DOCUMENT EXISTS

The Profile Cloud was designed well (see cloud-pipeline-spec.md, cloud-visualization-design.md).
The implementation drifted. Real-user testing (May 14, 2026) exposed fundamental issues:

- **Identity confusion**: "Heart Saver" (a voluntary cert) became the user's identity title.
  The user is an Anesthesiologist. The system doesn't know the difference between WHO someone
  IS and WHAT they HAVE.
- **No hierarchy**: ACLS cert ranked above Anesthesiology specialization because it had
  more "role count + months" in the scoring formula. Certifications are not core skills.
- **Deduplication failure**: FCPS appeared twice ("FCPS Anesthesiology" + "Fellowship (FCPS) -- Anesthesia").
- **Career path wrong**: Residency Training (a progression step UP) shown as a seniority "dip" to Junior.
- **No interactivity**: Career span, profile depth, certifications, education -- none clickable.
- **Education invisible**: Not shown as a first-class entity.
- **Socratic timing wrong**: Cloud was built BEFORE asking enrichment questions, then questions
  appeared as an afterthought. User decided: Socratic FIRST, Cloud AFTER.
- **Parse error**: 1 of 5 CVs failed silently (no fixture, no API key).

These are not UI bugs. They are **conceptual gaps** in how the Cloud models a person.

---

## 1. WHAT IS THE PROFILE CLOUD?

The Profile Cloud is a **structured, evidence-based representation of a person's professional identity**.

It is NOT:
- A tag cloud of keywords
- A skills checklist with self-declared proficiency
- A flat list of technologies
- A score or rating system

It IS:
- A living document that knows WHO you are, WHAT you can do, and HOW we know
- The single source of truth for all downstream features (CV generation, JD matching,
  cover letters, application strategy, interview prep)
- Evidence-first: every claim traces back to a CV bullet, a certification, a Socratic answer,
  or an outcome signal
- The user's advocate: it presents them in the strongest honest light

### 1.1 The Core Insight

Every professional has THREE layers:

```
Layer 1: IDENTITY -- Who you ARE
  "I am an Anesthesiology Consultant, qualified in Pakistan, with 9 years
   of clinical experience specializing in cardiac and critical care anesthesia."

Layer 2: CAPABILITIES -- What you CAN DO
  Domain skills (Anesthesiology, Critical Care, Pain Management)
  Certifications that prove it (FCPS, MBBS)
  Differentiators (AHA Instructor, research publications)

Layer 3: EVIDENCE -- How we KNOW
  Roles (where, when, what they did)
  Impact (measurable outcomes)
  Validation (certs, awards, publications)
  Depth answers (Socratic enrichment)
  Outcome signals (what employers responded to)
```

The current implementation collapses all three into a flat list of "cloud nodes" ranked
by a composite score. This is why Heart Saver becomes the identity.

---

## 2. CLOUD DATA MODEL

### 2.1 Professional Identity (NEW -- does not exist in current code)

```typescript
interface ProfessionalIdentity {
  // WHO they are -- computed from education + longest/deepest roles
  core_profession: string;          // "Anesthesiologist" (not "Heart Saver")
  specializations: string[];        // ["Cardiac Anesthesia", "Critical Care"]
  career_stage: string;             // "Consultant" | "Senior Registrar" | etc.
  career_stage_generic: string;     // "Experienced Professional" (from persona + years)

  // WHERE they qualified
  qualification_country: string;    // "Pakistan"
  qualification_degrees: string[];  // ["MBBS", "FCPS (Anesthesiology)"]

  // WHAT makes them distinctive
  niche_differentiators: string[];  // ["AHA Instructor (ACLS/BLS)", "PALS Provider"]

  // HOW we determined this
  identity_basis: {
    primary_education: string;      // "FCPS in Anesthesiology from CPSP"
    longest_role_domain: string;    // "Anesthesiology" (9 years across 3 roles)
    title_signals: string[];        // ["Senior Registrar Anesthesia", "Consultant Anesthesiologist"]
  };
}
```

**How identity is computed** (CODE, not LLM):

1. **Core profession**: Derived from the intersection of:
   - Highest/terminal degree field (FCPS in Anesthesiology > MBBS)
   - Longest role domain (most months spent in which domain)
   - Most recent job title (what they call themselves NOW)
   - When all three agree, confidence is high. When they disagree, ask Socratic.

2. **Career stage**: NOT just "years / 5". Must understand professional hierarchies:
   - Medical: House Officer -> Medical Officer -> Registrar -> Senior Registrar -> Consultant
   - Engineering: Junior -> Engineer -> Senior -> Lead -> Principal -> Staff -> Director
   - Academic: Lecturer -> Assistant Prof -> Associate Prof -> Professor
   - Military: ranks map to civilian equivalents
   - Generic fallback: Early (0-3yr) -> Mid (3-8yr) -> Experienced (8-15yr) -> Senior (15+yr)
   - **The stage comes from the user's MOST RECENT TITLE, not from years alone.**

3. **Specializations**: Sub-areas within the profession:
   - Parse from role titles: "Cardiac Anesthesia Fellow" -> specialization: Cardiac Anesthesia
   - Parse from education: "Fellowship in Pain Management" -> specialization: Pain Management
   - Parse from certifications: "ACLS Instructor" -> differentiator, not specialization

4. **Differentiators**: Things that set them apart from peers in the same profession:
   - Instructor/teaching certifications (AHA Instructor = differentiator)
   - Uncommon certifications for the profession
   - International experience
   - Research/publications
   - Awards

### 2.2 Skill Hierarchy (REVISED)

The current flat list of CloudNodes must become a hierarchy with clear categories:

```
PROFESSIONAL IDENTITY
  |
  +-- CORE DOMAIN SKILLS (what defines the profession)
  |     Anesthesiology, Critical Care, Pain Management
  |     These ALWAYS rank highest. They are the profession itself.
  |
  +-- CLINICAL/TECHNICAL SKILLS (tools of the trade)
  |     Regional Anesthesia, Hemodynamic Monitoring, Airway Management
  |     Evidence: demonstrated in roles, not just listed
  |
  +-- CERTIFICATIONS (proof of competence -- NEVER outrank core skills)
  |     |
  |     +-- Professional Qualifications (FCPS, MBBS, Board Cert)
  |     |     These are PREREQUISITES, not skills. They prove identity.
  |     |
  |     +-- Industry Gold (ACLS, BLS, PALS for medical; PMP, PE for engineering)
  |     |     Standardized validation. Important but supplementary.
  |     |
  |     +-- Voluntary/Elective (Heart Saver, First Aid, online courses)
  |           Nice to have. Should NEVER dominate the profile.
  |
  +-- EDUCATION (foundation, not skill)
  |     MBBS from XYZ University
  |     FCPS from CPSP
  |     Displayed as FOUNDATION, not ranked against skills
  |
  +-- SOFT SKILLS / LEADERSHIP (if evidence exists)
  |     Team Leadership, Training & Teaching, Communication
  |     Only included if demonstrated in role bullets, not self-declared
  |
  +-- DIFFERENTIATORS (what makes them unique)
        AHA Instructor status
        International experience
        Research publications
        Awards
```

### 2.3 Evidence Types (UNCHANGED -- already well-designed)

The 9 evidence types remain as-is:
- RoleEvidence, ImpactEvidence, CertificationEvidence, AwardEvidence,
  ProjectEvidence, EducationEvidence, WorkshopEvidence, PublicationEvidence,
  SocraticEvidence

### 2.4 Depth Assessment (REVISED)

The current depth model treats all skills equally. A cert and a core domain skill
use the same formula. This is wrong.

**Revised rules:**

| Skill Category | Depth Assessment | Notes |
|---------------|-----------------|-------|
| Core domain skills | Full formula (roles + months + impact + cert + award) | These are the primary skills |
| Clinical/technical skills | Full formula | Sub-skills within the domain |
| Professional qualifications | Not depth-assessed -- binary (have/don't have) | MBBS, FCPS are prerequisites |
| Industry certs | Not depth-assessed -- binary + active/expired | ACLS is valid or not |
| Voluntary certs | Not depth-assessed -- listed only | Heart Saver is listed, never ranked |
| Education | Not depth-assessed -- displayed as foundation | Not a "skill" at all |
| Soft skills | Reduced formula (roles only, no duration weight) | Evidence-gated |

**Category-aware scoring:**
```
Core domain skill:    score * 1.5  (these define who you are)
Clinical/technical:   score * 1.0  (standard)
Certification:        score * 0.3  (supporting, never dominant)
Soft skill:           score * 0.6  (important but secondary)
```

### 2.5 Career Trajectory (REVISED)

The current career path view assigns seniority based on years only. This is wrong.

**Revised seniority detection:**

1. **Title-based seniority** (primary signal):
   - Parse the actual job title for seniority keywords
   - Medical: "House Officer" < "Medical Officer" < "Registrar" < "Senior Registrar" < "Consultant"
   - Engineering: "Junior" < "Engineer" < "Senior" < "Lead" < "Principal" < "Director"
   - Generic: "Intern" < "Associate" < standard < "Senior" < "Lead" < "Head" < "Director" < "VP" < "C-level"

2. **Progression must be monotonic or explained**:
   - If seniority DROPS (e.g., Consultant -> Registrar), it's either:
     a) A career change (flagged, Socratic question)
     b) A training/fellowship role (detected by keywords: "training", "fellowship", "residency")
     c) A data error
   - Training/fellowship roles are ALWAYS progression UP, never dips
   - "Residency Training (FCPS), Anesthesiology" is a TRAINING role -- it leads to becoming
     a specialist. It's progression, not a demotion.

3. **Date display**:
   - Use en-dash (--) between dates, not \u2013 escape sequences
   - Format: "2020 -- 2024" or "2020 -- present"
   - Never show raw unicode escapes in the UI

---

## 3. PIPELINE FLOW (REVISED)

The current flow builds the Cloud too early. User's decision: **Socratic questions BEFORE Cloud build.**

### 3.1 Revised Pipeline

```
Step 1: CV UPLOAD
  User uploads 1-5 CVs (PDF/DOCX/LinkedIn ZIP)
  -> Text extraction (pdf-parse, mammoth, jszip)
  -> Store extracted_text in cv_uploads

Step 2: CV PARSING (LLM call)
  extracted_text -> structured ParsedCV
  LLM must identify: candidate context (profession, country, career level)
  -> Store parsed_cv in cv_uploads

Step 3: CLEANING (CODE)
  Remove hallucinated roles, fix dates, validate skills
  -> cleaned CVs

Step 4: CONFLICT DETECTION (CODE)
  Cross-CV comparison: date conflicts, title conflicts, timeline gaps
  -> ConflictReport

Step 5: CONFLICT RESOLUTION (Socratic Phase 1)
  Surface conflicts as questions to the user
  "Your 2020-2024 role appears differently in two CVs. Which title is correct?"
  -> User answers resolve conflicts

Step 6: MERGE (CODE)
  Resolved conflicts + cleaned CVs -> single canonical profile
  -> ResolvedProfile

Step 7: ENRICHMENT QUESTIONS (Socratic Phase 2) *** BEFORE CLOUD ***
  Based on the merged profile, ask enrichment questions:
  - Missing impact metrics
  - Shallow skills that could be deeper
  - Career gaps
  - Certification context
  Hard cap: 5 enrichment questions max
  -> SocraticEvidence added to profile

Step 8: CLOUD BUILD (CODE)
  ResolvedProfile + SocraticEvidence -> ProfileCloud
  Compute: identity, skill hierarchy, depth, career trajectory
  -> Full Cloud with all evidence

Step 9: CLOUD DISPLAY
  Show the user their complete Profile Cloud
  User can correct, add, remove
  -> Sealed Cloud (ready for JD matching)
```

**Key change**: Steps 7 and 8 are SWAPPED from current implementation.
Currently: Build Cloud -> Show Cloud -> Ask Socratic -> Update Cloud.
Revised: Ask Socratic -> Build Cloud -> Show Cloud.

This means the user's first view of their Cloud already includes their enrichment answers.
No "updating" needed. The Cloud is born complete.

---

## 4. WHAT THE CLOUD MUST SHOW (Visualization)

### 4.1 Identity Card (Hero Section)

```
+------------------------------------------------------------------+
|  Dr. Sibgha Saliha                                                |
|  Anesthesiologist -- Senior Registrar                             |
|  Qualified in Pakistan (MBBS, FCPS Anesthesiology)                |
|                                                                    |
|  9 years clinical experience | 5 roles | Healthcare domain        |
|  Differentiators: AHA Instructor (ACLS/BLS), PALS Provider        |
+------------------------------------------------------------------+
```

**What's clickable:**
- Career span (9 years) -> expands to show role timeline
- 5 roles -> expands to show role list with details
- Each differentiator -> shows evidence (which cert, when, from whom)
- Education degrees -> shows institution, year, field

**What's NOT shown here:**
- Heart Saver (it's a voluntary cert, listed under certifications, not identity)
- Depth scores or proficiency labels
- Any numeric ratings

### 4.2 Three Views (tabs)

**View 1: BREADTH -- "What domains do I cover?"**

Domain treemap OR grouped bars showing:
- Healthcare & Life Sciences (7 skills, 9 years)
  - Anesthesiology (core)
  - Critical Care
  - Emergency Medicine
  - Pain Management
  - ...
- General / Supporting (3 skills)
  - Teaching & Training
  - ...

Each domain is expandable. Click to see skills within.
Each skill is expandable. Click to see evidence chain.

Bar length = months of evidence (not a score).
Bar color = depth level (mentioned/applied/proficient/expert).
Badges = evidence types present (cert, impact, award, project).

**View 2: DEPTH -- "How deep is my expertise?"**

Sorted by CATEGORY-WEIGHTED score (core domain skills first):

```
CORE SKILLS
  Anesthesiology          ||||||||||||||||||||||||  9yr, 4 roles    Expert
  Critical Care           ||||||||||||||||||        6yr, 3 roles    Proficient
  Emergency Medicine      ||||||||||||              4yr, 2 roles    Proficient

CERTIFICATIONS (not ranked against skills -- separate section)
  FCPS (Anesthesiology)   [Active] CPSP, 2024
  MBBS                    [Active] University of XYZ, 2014
  ACLS                    [Active] AHA, Instructor level
  BLS                     [Active] AHA, Instructor level
  PALS                    [Active] AHA, Provider
  Heart Saver             [Active] AHA

EDUCATION (foundation -- not ranked)
  FCPS Anesthesiology     CPSP, 2020-2024
  MBBS                    University of XYZ, 2009-2014
```

Each item expandable to show full evidence chain.

**View 3: CAREER PATH -- "How have I progressed?"**

Timeline chart with:
- X-axis: years
- Y-axis: seniority level (derived from title, not formula)
- Each dot = a role, connected by line
- Color = domain
- Size = duration

```
Consultant  -----                                          *
Senior Reg  -----                                    *-----
Registrar   -----                              *-----
Resident    -----                     *--------
Med Officer -----            *--------
House Off   -----   *--------
                    2014  2016  2018  2020  2022  2024  2026
```

**Critical rule**: Training/fellowship roles (Residency, Fellowship) are
ALWAYS shown as PROGRESSION UP, not dips. A residency in anesthesiology
is the path FROM Medical Officer TO Specialist. It's a step up.

Below the chart: role details list
- Each role: Title | Organization | Date range | Level
- Click to expand: bullets, skills demonstrated, impact metrics

### 4.3 Differentiators Panel

Compact section below the three views:

```
CERTIFICATIONS    ACLS (Instructor) | BLS (Instructor) | PALS | Heart Saver
EDUCATION         FCPS Anesthesiology (CPSP) | MBBS (University)
AWARDS            [none yet -- Socratic can surface these]
PUBLICATIONS      [none yet]
```

Each item clickable for details.

### 4.4 What's Missing (Gap Identification)

Based on the profession and career stage, show what's expected but not found:

"For a Senior Registrar in Anesthesiology with 9 years of experience..."

**Strengthening opportunities:**
- Fellowship/sub-specialty training (Cardiac Anesthesia, ICU, Pain)
- Research publications (expected at senior level)
- Conference presentations
- Quality improvement projects

**Licensing for target markets:**
- Saudi Arabia: SMLE required for Pakistani graduates
- UAE: DHA/DOH/HAAD exam required
- UK: PLAB + GMC registration

Framing: advocate ("here's how to strengthen"), never gatekeeper ("you're missing X").

---

## 5. DEDUPLICATION RULES

### 5.1 Certification Deduplication

**Current bug**: FCPS appears as both "FCPS Anesthesiology" and "Fellowship (FCPS) -- Anesthesia".

**Rules:**
1. Normalize certification names before comparison:
   - Strip parentheses: "Fellowship (FCPS)" -> "Fellowship FCPS"
   - Normalize fields: "Anesthesiology" = "Anesthesia" = "Anaesthesia" = "Anaesthesiology"
   - Match by acronym: FCPS is FCPS regardless of how it's written
   - Match by full name: "Fellow of College of Physicians and Surgeons" = "FCPS"
2. When duplicates found: keep the most specific/complete version
3. MBBS = MBBS regardless of how it appears in different CVs

### 5.2 Education Deduplication

Same degree from same institution (or same degree type) = one entry.
- "MBBS" from CV1 + "Bachelor of Medicine and Surgery" from CV2 = one MBBS entry
- Use normalizeDegreeName() and normalizeFieldName() (already exist in resolution-merger.ts)

### 5.3 Skill Deduplication

- "Anesthesiology" = "Anesthesia" = "Anaesthesia" (spelling variants)
- "Critical Care" = "Intensive Care" = "ICU" (synonym matching)
- Use skillsMatch() from skill-matching.ts (already exists)

---

## 6. PROFESSION-AGNOSTIC DESIGN

Every rule above must work for ANY profession:

| Concept | Medical Example | Engineering Example | Business Example |
|---------|----------------|--------------------|--------------------|
| Core profession | Anesthesiologist | Software Engineer | Financial Analyst |
| Terminal degree | FCPS | MS/PhD CS | MBA/CFA |
| Industry cert | ACLS, BLS | AWS SA, PMP | CPA, CFA |
| Voluntary cert | Heart Saver | Coursera course | LinkedIn Learning |
| Career ladder | HO->MO->Reg->SR->Consultant | Junior->Mid->Senior->Staff->Principal | Analyst->Associate->VP->Director->MD |
| Training role | Residency, Fellowship | Internship, Bootcamp | Trainee, Associate |
| Specialization | Cardiac Anesthesia | Backend Systems | Derivatives Trading |

**Implementation**: The career ladder and certification tier classification should be
configurable per profession, not hardcoded for medical only.

### 6.1 How to Detect Profession

From ParsedCV, the LLM already identifies:
- `primary_profession` (from Step 0: Candidate Context in parser prompt)
- `specialization`
- `career_level`
- `country_of_qualification`

If the parser doesn't provide this (legacy data), infer from:
1. Education: MBBS -> medical, BE/BS CS -> engineering, MBA -> business
2. Longest role domain: most months in which domain
3. Certification patterns: ACLS/BLS -> medical, AWS/GCP -> tech, CPA/CFA -> finance

---

## 7. WHAT MAKES THIS DIFFERENT FROM COMPETITORS

### 7.1 vs LinkedIn Skills Graph
LinkedIn uses endorsements (meaningless -- people endorse skills they've never seen).
We use CV evidence (roles, durations, impact metrics).

### 7.2 vs Workday Skills Cloud
Workday is employer-side (HR workforce planning). We're candidate-side (job search).
Workday has 50M+ skill profiles but no evidence chains. We have deep evidence per user.

### 7.3 vs MuchSkills
MuchSkills uses self-declared proficiency (meaningless). We compute depth from evidence.
MuchSkills is for team visualization. We're for individual job search.

### 7.4 vs Teal / Rezi / Kickresume
These are resume builders. They parse to fill forms. We parse to UNDERSTAND.
They have flat skill lists. We have hierarchical evidence-backed profiles.
They score by keyword match %. We assess by evidence depth.

### 7.5 Our Unique Value
Nobody does:
1. Multi-CV reconciliation (resolve conflicts across 5 versions of the same career)
2. Evidence-based depth (not self-declared, not endorsement-based)
3. Identity-first (knows WHO you are, not just WHAT you typed)
4. Socratic enrichment (surfaces hidden strengths through targeted questions)
5. Outcome learning (Cloud gets smarter from application results)

---

## 8. IMPLEMENTATION CHECKLIST

What needs to change from current code:

### 8.1 New: ProfessionalIdentity computation
- [ ] Add identity computation in cloud.ts (core_profession, specializations, career_stage)
- [ ] Use education + roles + title signals to determine identity
- [ ] Category-weighted scoring (core skills 1.5x, certs 0.3x)

### 8.2 Fix: Skill hierarchy
- [ ] Separate certifications from skills in cloud nodes
- [ ] Professional qualifications (FCPS, MBBS) as identity proof, not ranked skills
- [ ] Industry certs (ACLS, BLS) as differentiators, not top skills
- [ ] Voluntary certs (Heart Saver) listed but never dominant

### 8.3 Fix: Career path seniority
- [ ] Title-based seniority detection (parse actual titles)
- [ ] Training roles (residency, fellowship) marked as progression UP
- [ ] Unicode rendering (en-dash, not \u2013 escape)

### 8.4 Fix: Deduplication
- [ ] FCPS dedup (acronym + full name matching)
- [ ] MBBS dedup (spelling variants)
- [ ] Field name normalization (Anesthesiology = Anesthesia)

### 8.5 Fix: Pipeline flow
- [ ] Socratic enrichment questions BEFORE Cloud build
- [ ] All CVs must parse successfully or error clearly (no silent failures)

### 8.6 Fix: UI interactivity
- [ ] Career span clickable (expand to role timeline)
- [ ] Profile depth clickable (expand to evidence breakdown)
- [ ] Certifications clickable (show details)
- [ ] Education visible as first-class section
- [ ] Breadth bars expandable (show skills within domain)
- [ ] Depth items expandable (show evidence chain)

### 8.7 Fix: Error handling
- [ ] CV parse failure shown clearly (which CV, why, how to fix)
- [ ] Never show "Set DEEPSEEK_API_KEY" to end users

---

## 9. SUCCESS CRITERIA

The Cloud is RIGHT when:

1. **Identity test**: Show the Cloud to the user. Ask "Does this describe who you are?"
   If they say "I'm not a Heart Saver, I'm an Anesthesiologist" -- we failed.

2. **Hierarchy test**: Core domain skills rank above certifications. Always.
   ACLS should never outrank Anesthesiology for an anesthesiologist.

3. **Career test**: The career path shows clear progression (or explains why not).
   A residency is NEVER a demotion.

4. **Completeness test**: Education, certifications, differentiators all visible.
   Nothing important is hidden behind a click that the user doesn't know about.

5. **Accuracy test**: Every claim traces back to evidence. No fabrication.

6. **Profession test**: Works for a doctor, an engineer, an accountant, a soldier.
   Never assumes medical terminology. Never assumes engineering terminology.

7. **Gasp test** (from boss's vision): When the user sees their Cloud for the first
   time, they should think "This system actually UNDERSTANDS me." Not "This is a
   list of keywords from my CV."

---

## 10. OPEN QUESTIONS FOR USER

1. **Socratic question count**: Currently 5 enrichment questions max. Is that right?
   Too many feels like an interrogation. Too few misses depth.

2. **Career path visualization**: Line chart (current) vs swim lane (spec'd) vs
   vertical timeline? Line chart struggles with overlapping roles.

3. **Gap identification timing**: Show gaps during Cloud view? Or only when
   analyzing a specific JD?

4. **Certification tier display**: Show "Instructor" vs "Provider" vs just the
   cert name? For medical, "ACLS Instructor" is meaningfully different from
   "ACLS Provider."

5. **Domain treemap vs bars**: The spec called for a nested treemap (area = months).
   Current implementation uses horizontal bars. Which is preferred?

---

*End of specification. Awaiting approval before implementation.*
