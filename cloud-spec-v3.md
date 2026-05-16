# Profile Cloud -- Definitive Specification v3

> Version: 3.0 | May 14, 2026
> Status: ACTIVE -- single source of truth
> Replaces: cloud-definition-v2.md, cloud-pipeline-spec.md, cloud-visualization-design.md
> Born from: 11 original issues + 8 new issues found in live testing. Every line exists because something broke.

---

## 0. CONSOLIDATED ISSUE REGISTRY

Every issue that has occurred, whether it was "fixed" or not. If it's listed here, the implementation MUST prevent it.

### Issues 1-11 (Original, from live user testing May 13-14, 2026)

| # | Issue | Root Cause | Fix Status | Recurring? |
|---|-------|-----------|------------|------------|
| 1 | Parser has zero candidate context | Prompt processes bullets in isolation | Parser Step 0 added | NO |
| 2 | Career span shows 2026 years | parseInt("Jan 2014") = NaN | extractYearFromDate() | NO |
| 3 | Education duplicated (MBBS x2, FCPS + Fellowship) | Multi-CV merge no dedup | normalizeDegreeName() added | **YES -- still duped in UI** |
| 4 | ACLS/BLS/PALS missing from Cloud | Cert objects vs strings bug | Standalone cert nodes | NO -- but ranked wrong |
| 5 | Domain classification garbage (12 "General") | Taxonomy too thin | Expanded taxonomy | **YES -- only 2 domains** |
| 6 | Static radar chart, no drill-down | Placeholder shipped as feature | SkillBar redesign | **YES -- still no gasp** |
| 7 | Depth bars meaningless, no scale | All skills treated equal | Depth dots added | **YES -- all show "4yr 1r Proficient"** |
| 8 | Career path empty | Trajectory not persisted | Chart built | **YES -- wrong (dip, unicode)** |
| 9 | Domain bars no scale or meaning | No data model for what bars represent | Evidence summary | **YES -- no cert/core distinction** |
| 10 | Pipeline order (Cloud before Socratic) | Cloud built too early | Socratic stage added | **PARTIAL -- not fully wired** |
| 11 | Solutions overfit to medical | Hardcoded medical patterns | Rule enforced | **YES -- inferSeniority() has medical hardcodes** |

### Issues 12-19 (New, from May 14 2026 live testing)

| # | Issue | Description |
|---|-------|-------------|
| 12 | FCPS listed twice | "FCPS Anesthesiology" skill node AND "Fellow of College of Physicians & Surgeons (FCPS) in Anesthesiology" cert node. Same thing. |
| 13 | Heart Saver at #2 in depth | Voluntary cert outranking core domain skills. Category weighting specced but NEVER implemented in scoring code. |
| 14 | Career path shows residency as demotion | "Residency Training" mapped to "Junior" seniority. Training/fellowship roles must be progression UP. |
| 15 | Dual role period (2022-2024) not visible | Residency + AHA Instructor running parallel. Career path shows single line, missing the boost. |
| 16 | Identity card shows degree not profession | "FCPS Anesthesiology" instead of "Anesthesiologist". Degree is what you HAVE, profession is who you ARE. |
| 17 | No name shown in identity card | Parser extracts name but UI doesn't display it. |
| 18 | Stat cards not clickable | Career span, evidence points -- static text, no drill-down. |
| 19 | Error banner shows dev message | "Set DEEPSEEK_API_KEY" shown to user. Internal error exposed. |

### Issues 20-31 (Independent Visual Audit, May 15, 2026 — zero-context Opus agent)

| # | Issue | Component | Severity | Detail |
|---|-------|-----------|----------|--------|
| 20 | Summary line is a template, not narrative | identity-card.tsx:124 | CRITICAL | `buildSummaryLine` produces "X years, Y roles, Z domains" — identical structure for every user. Should use actual domains, companies, countries. |
| 21 | Seniority line uses array index, not seniority_level | career-path.tsx:177 | CRITICAL | Y-coordinate is `i * LANE_HEIGHT` (lane index). `seniority_level` field exists but is IGNORED. Career arc visualization is decorative noise. |
| 22 | Skill names truncated | depth-view.tsx:91 | HIGH | `truncate` CSS class applied. "System-of-Systems Integration (MBSE)" gets cut. Direct spec violation. |
| 23 | Bar scaling hardcoded to 8 | depth-view.tsx:166 | HIGH | `(total / 8) * 100`. 12 evidence items = same bar as 8. Should scale to dataset max. |
| 24 | No sorting within tiers | depth-view.tsx:47 | HIGH | Nodes render in API arrival order. Expert skill could appear below mentioned skill. |
| 25 | foreignObject tooltip breaks Safari | career-path.tsx:164 | HIGH | ~25% mobile audience affected. Replace with div overlay or SVG group. |
| 26 | No expand/collapse animation | depth-view.tsx:129 | MEDIUM | Evidence chain appears instantly. No slide-down transition. |
| 27 | No tab transition animation | cloud-visualization.tsx:53 | MEDIUM | Instant content swap between Depth and Career. Feels like 2010 website. |
| 28 | Stat grid breaks on mobile | identity-card.tsx:100 | MEDIUM | `grid-cols-4` at 375px = crushed chips. No responsive breakpoint. |
| 29 | Career title/company truncated at 22 chars | career-path.tsx:122 | MEDIUM | Critical career info lost. Off-by-one: checks >22 but slices at 20. |
| 30 | Dead totalMonths parameter | depth-view.tsx:154 | LOW | Accepted but never used. Abandoned design artifact. |
| 31 | Unused TrendingUp import | cloud-visualization.tsx:4 | LOW | Dead import. |

### Meta-Issue: WHY DO FIXES KEEP REVERTING?

Because fixes were applied at the **symptom level** (tweak UI text, add a dot) instead of the **architecture level** (enforce hierarchy in data model, weight categories in scoring). The data model treats all CloudNodes identically. Until the data model enforces the three-tier hierarchy, the UI will keep displaying garbage.

---

## 1. THE THREE LAYERS (Architecture)

Every professional has three layers. The Cloud MUST model them separately, not collapse them into a flat list.

```
LAYER 1: IDENTITY -- Who you ARE
  Computed from: terminal degree + longest domain + most recent title
  Displayed as: hero card at top
  Example: "Dr. Sibgha Saliha -- Anesthesiologist, Senior Registrar"

LAYER 2: CAPABILITIES -- What you CAN DO
  Three tiers (NEVER mixed in display):

  Tier A: CORE DOMAIN SKILLS (the profession itself)
    Anesthesiology, Critical Care, Pain Management, Emergency Medicine
    These ALWAYS appear first because they ARE the profession. Not because of
    a scoring multiplier -- because of CLASSIFICATION. An anesthesiologist's
    core skills are anesthesiology skills. This is identity, not math.
    Sorted within tier by: evidence depth (months in roles, impact metrics, certs backing it)

  Tier B: CERTIFICATIONS & QUALIFICATIONS (proof, not skill)
    Split into:
      B1: Professional Qualifications -- FCPS, MBBS, Board Certifications
          Binary: have/don't have. NOT depth-assessed. They prove identity.
      B2: Industry Standard -- ACLS, BLS, PALS (for medical); AWS SA, PMP (for tech)
          Show level: Instructor vs Provider vs Holder
      B3: Voluntary/Elective -- Heart Saver, First Aid, online courses
          Listed only. NEVER in top skills. NEVER in identity.
    Displayed in SEPARATE section. Never mixed with or ranked against core skills.
    The reason certs don't outrank core skills is NOT a 0.3x multiplier -- it's
    because they live in a different section entirely. You don't compare apples to oranges.

  Tier C: EDUCATION (foundation)
    MBBS, FCPS degrees with institution, year, field
    NOT ranked. NOT scored. Displayed as foundation layer.
    Professional qualifications (B1) and education (C) may overlap -- show once,
    in whichever section is more natural (e.g., FCPS as qualification, MBBS as education)

  NO FAKE SCORES. NO MULTIPLIERS.
    The hierarchy is enforced by CLASSIFICATION (which tier does this belong to?)
    and SEPARATION (tiers never compete against each other in display).
    Within each tier, items are sorted by real evidence: months in roles,
    number of roles, impact metrics, certifications backing them.
    When analyzing a specific JD, contextual importance shifts -- the JD determines
    what matters most for THAT application. The Cloud shows everything; the JD
    analysis highlights what's relevant.

LAYER 3: EVIDENCE -- How we KNOW
  9 types: Role, Impact, Certification, Award, Project, Education,
  Workshop, Publication, Socratic
  Every claim in Layers 1-2 traces back to Layer 3 evidence.
  Evidence is ALWAYS expandable (click to see chain).
```

### 1.1 Qualification Intelligence (Parser Must Understand)

The parser prompt MUST instruct the LLM to understand professional qualification systems:

**Universal rules (profession-agnostic):**
- A **degree** (MBBS, FCPS, BE, MBA) is a qualification earned through study + examination
- A **residency/fellowship/training** is clinical/practical experience AT a hospital/company that LEADS to a degree or specialization. It is BOTH education AND experience.
- A **license** (PMDC, SCFHS, PE, CPA) is legal permission to practice. Binary: valid/expired.
- A **certification** (ACLS, AWS SA, PMP) is proof of specific competency. Has levels (Instructor > Provider > Holder).
- A **voluntary cert** (Heart Saver, First Aid, online course) is supplementary. Never core.

**What the parser should output for Dr. Sibgha:**
```json
{
  "candidate_context": {
    "primary_profession": "Anesthesiologist",
    "specialization": "Critical Care",
    "career_level": "Consultant/Specialist",
    "country_of_qualification": "Pakistan"
  },
  "qualification_chain": [
    { "type": "degree", "name": "MBBS", "institution": "King Edward Medical University", "year": 2014, "enables": "Medical practice" },
    { "type": "license", "name": "PMDC", "year": 2014, "status": "active", "enables": "Practice in Pakistan" },
    { "type": "degree+experience", "name": "FCPS Anesthesiology", "institution": "CPSP", "year": 2024,
      "training_component": { "hospital": "PAF Hospital + Bolan Medical Complex", "duration_months": 48, "is_clinical_experience": true },
      "exam_component": { "parts": ["FCPS Part-I", "FCPS Part-II"], "note": "Part-I is prerequisite for residency" },
      "enables": "Consultant Anesthesiologist designation" },
    { "type": "license", "name": "SCFHS Senior Registrar", "year": 2025, "status": "active", "enables": "Practice in Saudi Arabia" }
  ]
}
```

**Key insight**: FCPS is BOTH a degree (qualification) AND 4 years of clinical experience (hospital work). The parser must output BOTH aspects. The residency training period is NOT a gap, NOT a demotion -- it's the most intensive clinical experience in the career.

**For engineering equivalent**: A PE (Professional Engineer) license requires a degree (BS Engineering) + 4 years supervised experience + exam. Same pattern: degree+experience → license.

---

## 2. WHAT THE CLOUD MUST SHOW (Visual Specification)

### 2.0 The Reveal Experience

NOT a dashboard dump. A progressive reveal inspired by Spotify Wrapped:

**Step 1: Identity Statement** (bold, emotional)
```
+------------------------------------------------------------------+
|                                                                    |
|  Dr. Sibgha Saliha                                                |
|  ANESTHESIOLOGIST                                                  |
|  Senior Registrar -- ICU Physician                                 |
|                                                                    |
|  Qualified in Pakistan (MBBS + FCPS Anesthesiology)               |
|  9 years -- 5 roles -- 3 countries                                 |
|                                                                    |
|  What sets you apart:                                              |
|  AHA Instructor (ACLS/BLS/PALS) -- 400+ professionals trained    |
|  Research: 2 publications (IF: 7.187)                              |
|                                                                    |
+------------------------------------------------------------------+
```
This is NOT a "card". It's a full-screen moment. Bold typography. The user reads WHO THEY ARE before seeing any chart.

**Step 2: Your Breadth** (what domains you cover)
**Step 3: Your Depth** (how deep in each area)
**Step 4: Your Journey** (career progression over time)

After reveal, all views stay as tabs.

### 2.1 Identity Card (Hero Section -- Always Visible)

```
+------------------------------------------------------------------+
|  [Avatar]  Dr. Sibgha Saliha                                      |
|            Anesthesiologist -- Senior Registrar                    |
|            Qualified in Pakistan                                   |
|                                                                    |
|  [clock] 9 years        [layers] 19 evidence     [globe] 3 countries
|  5 roles, 2 domains     points                     PK, CN, SA     |
|                                                                    |
|  QUALIFICATIONS                                                    |
|  [grad-cap] MBBS (King Edward, 2014)                              |
|  [grad-cap] FCPS Anesthesiology (CPSP, 2024)                     |
|                                                                    |
|  LICENSES                                                          |
|  [shield] PMDC (active)  [shield] SCFHS Sr. Registrar (active)   |
|                                                                    |
|  DIFFERENTIATORS                                                   |
|  [star] AHA Instructor: ACLS, BLS, PALS                          |
|  [book] 2 peer-reviewed publications                               |
|  [globe] International experience (Pakistan, China, Saudi Arabia) |
+------------------------------------------------------------------+
```

**Rules:**
- Name from parsed CV (candidate_context.candidate_name or parsed name field)
- Core profession from identity computation (NOT from top skill)
- Career stage from most recent title analysis (NOT from years / 5)
- Everything clickable: degrees expand to show institution details, licenses show status/year, differentiators show evidence
- Career span (9 years) clickable -> expands to role timeline
- Evidence points clickable -> expands to evidence type breakdown

### 2.2 View 1: BREADTH -- "What domains do I cover?"

**Visual: Sunburst chart** (Nivo @nivo/sunburst)

Center = the person's core profession ("Anesthesiology")
Ring 1 = domain categories:
  - Clinical Practice (Anesthesiology, Critical Care, Emergency Medicine, Pain Management)
  - Clinical Education (AHA Instruction, Simulation Teaching, Competency Development)
  - Research (Publications, Methodology)
  - Leadership (Team Management, Mentorship)

Ring 2 = individual skills within each category

Arc size = months of evidence (NOT count of skills)
Arc color = depth tier (Expert=dark, Proficient=medium, Applied=light, Mentioned=faint)

**Interaction:**
- Click any arc -> zooms into that category, showing individual skills
- Click a skill -> shows evidence chain (roles, certs, impacts)
- Breadcrumb trail to navigate back

**Fallback for < 4 categories:** Grouped horizontal bars instead of sunburst

**What this replaces:** The current flat radar chart that shows "Healthcare 7, General 3" with no drill-down

### 2.3 View 2: DEPTH -- "How deep is my expertise?"

**Visual: Three-section layout** (NOT a single sorted list)

```
CORE DOMAIN SKILLS
  Anesthesiology        [====|====|====|==]     9yr, 4 roles, 1 cert    Expert
                         ^role ^cert ^impact
  Critical Care         [====|====|==]          6yr, 3 roles            Proficient
  Emergency Medicine    [====|====]             4yr, 2 roles            Proficient
  Pain Management       [====|==]               4yr, 1 role, 1 pub     Applied

  Each bar is SEGMENTED:
    Blue  = role evidence (months in roles using this skill)
    Gold  = certification evidence (active cert backing this skill)
    Green = impact evidence (quantified outcomes)
    Purple = publication/research evidence

-------------------------------------------------------------

CERTIFICATIONS (separate section -- NEVER ranked against skills)
  ACLS          [Instructor]  AHA, 2023   Active   60+ courses conducted
  BLS           [Instructor]  AHA, 2022   Active   400+ trained
  PALS          [Instructor]  AHA, 2025   Active
  Heart Saver   [Provider]    AHA         Active

  Show: cert name, level (Instructor/Provider/Holder), issuer, year, status, impact if any
  Click to expand: when earned, renewal date, evidence of use

-------------------------------------------------------------

EDUCATION (foundation -- not ranked, not scored)
  FCPS Anesthesiology   CPSP (Fazaia PMI + Bolan Medical Complex)  2020-2024
  MBBS                  King Edward Medical University, Lahore      2009-2014
```

**Segmented evidence bars:**
Each bar's total width = total months of evidence across all types.
Segments within the bar show WHERE evidence comes from:
- Role segment (blue): months spent using this skill in actual roles
- Cert segment (gold): backed by active certification
- Impact segment (green): has quantified outcomes (500+ emergencies, 400+ trained)
- Research segment (purple): published research on this topic

Click any segment -> expands to show specific evidence items.

**What this replaces:** The current uniform "4yr - 1r - Proficient" bars where Heart Saver is #2

### 2.4 View 3: CAREER PATH -- "How have I progressed?"

**Visual: Expanded role timeline** (NOT a single-line seniority chart)

```
ROLE                                    TIMELINE                         LEVEL
                           2014  2016  2018  2020  2022  2024  2026
Medical Officer            [=========]                                   Mid
  Mayo Hospital, Lahore
  Emergency & Critical Care

Clinical Observership             [=========]                            Mid
  Aier Eye Hospital, China
  Research + Emergency Systems

Residency Training (FCPS)                   [=================]         Senior*
  PAF Hospital + Bolan Medical                                          (*training
  500+ critical emergencies                                              toward FCPS)

AHA Instructor                                    [================>    Mid
  CPSP, Pakistan
  60+ courses, 400+ trained

ICU Physician                                                  [===>    Specialist
  KAMC, Jeddah, Saudi Arabia
  Multidisciplinary critical care
```

**Rules:**
- X-axis: time (years)
- Y-axis: roles (one row per role, NOT seniority levels)
- Bar width: role duration
- Bar color: domain (clinical=blue, education=green, research=purple)
- Parallel roles visible (Residency + AHA Instructor overlap 2022-2024)
- Training roles labeled specially: "Training toward FCPS" not "Junior"
- No false dips. Ever. A residency after Medical Officer is UP, not down.
- Current roles have animated right edge (ongoing)
- Click any role -> expand to see: bullets, skills demonstrated, impact metrics

**Seniority progression line** (optional overlay):
A subtle line connecting role midpoints showing progression direction.
Calculated from: title-based seniority, NOT years.

Medical -> Residency -> Specialist is UP-UP-UP.
Medical -> Residency is NOT a dip because residency is TRAINING to become specialist.

**What this replaces:** The current line chart where Residency Training dips to "Junior" and dates show `\u2013` escape sequences

### 2.5 Differentiators Panel (Below tabs)

```
DIFFERENTIATORS -- What makes you stand out

  Certified    ACLS (Instructor) | BLS (Instructor) | PALS (Instructor)
  Licensed     PMDC (Pakistan) | SCFHS Senior Registrar (Saudi Arabia)
  Published    2 papers in Indo-American Journal of Pharmaceutical Sciences (IF: 7.187)
  International  Pakistan -> China -> Saudi Arabia
  Impact       400+ professionals trained | 500+ critical emergencies handled | 60+ courses
  Awards       IP Distinction (CPSP) | 8th Position MCAT (National)
```

Each item clickable for details.

---

## 3. DATA MODEL CHANGES

### 3.1 CloudNode Must Have a Tier

```typescript
interface CloudNode {
  // ... existing fields ...
  tier: "core_skill" | "technical_skill" | "certification" | "education" | "soft_skill";
  cert_level?: "instructor" | "provider" | "holder";  // for certifications
  cert_status?: "active" | "expired";                   // for certifications
  is_qualification?: boolean;                            // FCPS, MBBS, PE, CPA
}
```

### 3.2 Display Order Is Classification, Not Scoring

There are NO score multipliers. The display hierarchy is enforced by TIER CLASSIFICATION:

```typescript
// Tiers determine WHICH SECTION a node appears in, not a score multiplier
const TIER_DISPLAY_ORDER = ["core_skill", "technical_skill", "certification", "education", "soft_skill"];

// Within each tier, sort by real evidence (no fake weights):
function sortWithinTier(nodes: CloudNode[]): CloudNode[] {
  return nodes.sort((a, b) => {
    // 1. More roles using this skill = deeper evidence
    const roleCountDiff = b.evidence.filter(e => e.type === "role").length
                        - a.evidence.filter(e => e.type === "role").length;
    if (roleCountDiff !== 0) return roleCountDiff;

    // 2. More months of practice = more experience
    const monthsDiff = (b.depth?.totalMonths ?? 0) - (a.depth?.totalMonths ?? 0);
    if (monthsDiff !== 0) return monthsDiff;

    // 3. Has quantified impact = stronger evidence
    const aImpact = a.evidence.some(e => e.type === "impact") ? 1 : 0;
    const bImpact = b.evidence.some(e => e.type === "impact") ? 1 : 0;
    return bImpact - aImpact;
  });
}
```

When a JD is analyzed, contextual importance overrides display order:
- JD requires "ICU experience" → ICU-related skills highlighted regardless of tier
- JD requires "ACLS certified" → ACLS cert highlighted in context
- The Cloud stays the same; the JD analysis layer determines what to emphasize

### 3.3 Career Trajectory Must Handle Training Roles

```typescript
function inferSeniority(title: string): { level: number; isTraining: boolean } {
  const t = title.toLowerCase();

  // Training/fellowship roles -- mark as training, level = previous + 1
  if (/\b(residency|fellowship|training programme|trainee.*specialist)\b/.test(t)) {
    return { level: -1, isTraining: true }; // -1 means "inherit previous + 1"
  }

  // Standard seniority detection (profession-agnostic)
  if (/\b(chief|director|vp|vice president|head of|c-suite|cto|cmo|cfo)\b/.test(t)) return { level: 5, isTraining: false };
  if (/\b(consultant|principal|staff|attending|specialist)\b/.test(t)) return { level: 4, isTraining: false };
  if (/\b(senior|sr\.|lead|supervisor|manager)\b/.test(t)) return { level: 3, isTraining: false };
  if (/\b(medical officer|engineer|analyst|developer|officer|registrar)\b/.test(t)) return { level: 2, isTraining: false };
  if (/\b(junior|intern|trainee|apprentice|house officer|assistant)\b/.test(t)) return { level: 1, isTraining: false };

  return { level: 2, isTraining: false }; // default mid
}
```

When `isTraining: true`, the career path sets level = max(previous_level, 2) + 0.5 -- visually between previous and next role, trending upward. Never a dip.

### 3.4 Deduplication Must Be Unified

One function for all dedup (certs, education, skills):

```typescript
function normalizeCredential(name: string): string {
  let s = name.toLowerCase().trim();

  // Strip prefixes
  s = s.replace(/^(fellow of|fellowship in|fellowship|certificate in|diploma in|bachelor of|master of|doctor of)\s+/i, "");

  // Normalize field names
  s = s.replace(/\bana?esthesi(a|ology)\b/g, "anesthesiology");
  s = s.replace(/\bmedicine and surgery\b/g, "medicine");
  s = s.replace(/\bcomputer science\b/g, "cs");
  // ... more normalizations

  // Extract acronym if present
  const acronymMatch = s.match(/\b(fcps|mbbs|mrcp|frcs|md|ms|phd|be|bs|mba|cfa|cpa|pmp|pe)\b/);
  if (acronymMatch) {
    const acronym = acronymMatch[1];
    const field = s.replace(acronym, "").replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, "_");
    return field ? `${acronym}_${field}` : acronym;
  }

  return s.replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, "_");
}
```

"FCPS Anesthesiology", "Fellowship (FCPS) in Anesthesia", "Fellow of CPSP in Anesthesiology" all normalize to `fcps_anesthesiology`.

---

## 4. PARSER PROMPT IMPROVEMENTS

Add to CV_PARSER_SYSTEM_PROMPT after Step 0 (Candidate Context):

```
Step 0.5: QUALIFICATION CHAIN

Before extracting experience and skills, identify the candidate's qualification chain:

For each degree/qualification found:
1. Is it a DEGREE (earned through study + exam)? -> type: "degree"
2. Does it include TRAINING/RESIDENCY (clinical/practical hours)? -> type: "degree+experience"
   - The training period IS clinical experience. Extract it as BOTH education AND experience.
   - Example: FCPS requires 4-year residency. That residency is hospital work.
3. Is it a LICENSE (permission to practice)? -> type: "license"
   - PMDC, SCFHS, GMC, state medical board, PE license
   - Binary: active/expired/pending
4. Is it a CERTIFICATION (proof of competency)? -> type: "certification"
   - Has levels: Instructor > Provider > Holder
   - Has issuer and year
5. Is it a VOLUNTARY CERT (supplementary)? -> type: "voluntary"
   - Heart Saver, First Aid, online courses, MOOCs

Output a "qualification_chain" array with type, name, institution, year, status,
and for degree+experience types, include the training_component with hospital and duration.

IMPORTANT: If the candidate mentions a professional qualification (FCPS, PE, CPA, FRCS)
that requires supervised practice/residency, the practice period IS clinical/professional
experience. Do NOT create a gap for it. Do NOT classify the training as "Junior" level --
it is progression TOWARD specialist status.
```

---

## 5. SOCRATIC ENRICHMENT -- What It Is, How It Works

### 5.1 What "Enrichment of Claims" Means

A CV is a collection of CLAIMS. "Managed 500+ critical emergencies" is a claim. "ACLS Instructor" is a claim.
Claims have varying levels of evidence:

```
LEVEL 0: MENTIONED -- skill listed in skills section, no backing
  "Pain Management" in skills list but no role mentions it
  → Socratic asks: "You listed pain management. Where did you practice it?"

LEVEL 1: USED -- skill appears in a role bullet
  "Advanced techniques: regional anaesthesia, video-assisted intubation"
  → Socratic asks: "How many regional anaesthesia procedures have you performed?"

LEVEL 2: DEMONSTRATED -- skill with quantified outcome
  "Handled over 500 critical emergencies"
  → Already evidence-backed. Don't ask.

LEVEL 3: VALIDATED -- skill backed by cert + role + impact
  "ACLS Instructor, conducted 60+ courses, trained 400+ professionals"
  → Fully enriched. Don't ask.
```

Enrichment = moving claims UP the evidence ladder.
- Level 0 → ask WHERE they used it
- Level 1 → ask HOW MUCH / WHAT OUTCOME
- Level 2-3 → already enriched, skip

### 5.2 What Triggers Enrichment Questions

Questions are generated from the MERGED profile (after conflict resolution), targeting evidence gaps:

```
FOR EACH skill/claim in the merged profile:
  1. Count evidence sources (roles mentioning it, certs backing it, impact metrics)
  2. If evidence_count == 0 (mentioned only):
     → Ask: "You listed [SKILL]. Can you tell us where you used it and for how long?"
  3. If evidence_count == 1 and no impact metric:
     → Ask: "You used [SKILL] at [COMPANY]. What specific outcomes did you achieve?"
  4. If cert exists but no role uses the skill:
     → Ask: "You're certified in [CERT]. Do you actively use this in your current role?"

PRIORITIZE by:
  1. Core domain skills with gaps (most important to enrich)
  2. Skills used in most roles but missing impact
  3. Recent skills (last 3 years) over old ones

SKIP if:
  - Skill already has 2+ evidence sources
  - Skill has quantified impact
  - Skill is voluntary cert (don't ask about Heart Saver depth)

MAX: 5 questions. Quality over quantity. Each question must target a SPECIFIC gap.
```

### 5.3 Question Templates

Questions are CODE-generated templates (not LLM), filled with user's actual data:

```
TEMPLATE 1: Evidence Gap (skill mentioned, no role backing)
  "You listed [SKILL] as a competency. Can you describe a specific situation
   where you applied it and what the outcome was?"
  WHY: "Your profile mentions [SKILL] but we couldn't find it in your role
   descriptions. Adding context helps us represent your expertise accurately."

TEMPLATE 2: Impact Gap (skill used in role, no metrics)
  "At [COMPANY], you [BULLET_SUMMARY]. Can you quantify the impact?
   (e.g., number of cases, team size, outcomes achieved)"
  WHY: "Quantified achievements make your profile significantly stronger.
   Even approximate numbers help."

TEMPLATE 3: Certification Context (cert exists, usage unclear)
  "You hold [CERT] from [ISSUER]. How do you currently use this
   certification in your practice?"
  WHY: "Understanding how you apply your certifications helps us
   distinguish active expertise from credentials on paper."

TEMPLATE 4: Career Transition (domain change detected)
  "You moved from [DOMAIN_A] to [DOMAIN_B] around [YEAR].
   What motivated this transition and what skills transferred?"
  WHY: "Career transitions often involve transferable expertise that
   isn't obvious from job titles alone."

TEMPLATE 5: Team/Scale (leadership signals but no numbers)
  "You [LEADERSHIP_SIGNAL] at [COMPANY]. How large was your team
   and what did you achieve together?"
  WHY: "Leadership scale and outcomes strengthen your senior-level positioning."
```

### 5.4 Start, Flow, and Quit Mechanism

```
START: After conflict resolution completes (Step 5) and merge is done (Step 6).
  - Generate questions from merged profile
  - If 0 questions (profile already rich) → skip to Cloud build
  - If 1-5 questions → show Socratic UI

FLOW:
  - One question at a time (card UI)
  - Progress indicator: "Question 2 of 4"
  - Text input for answer (multi-line)
  - Three buttons: [Skip] [Next] [I'm Done]

QUIT MECHANISM:
  - [Skip]: marks this question as skipped, moves to next
  - [I'm Done]: stops asking, builds Cloud with whatever answers were given
  - All questions answered: builds Cloud automatically
  - Skipped questions = no evidence added (skill stays at current level)
  - No penalty for skipping. Cloud builds with what we have.

ANSWER PROCESSING:
  - Each answer is sent to /api/socratic/answer immediately (not batched)
  - Backend adds SocraticEvidence to the relevant CloudNode
  - Evidence tagged: source="socratic_enrichment", original_answer=user_text
  - No LLM parsing of answers during onboarding (keep it fast)
  - Raw answer stored; LLM parsing happens when generating CV for a JD

AFTER ALL QUESTIONS:
  - Cloud is built with enriched evidence included
  - User sees their Cloud for the first time -- already containing their answers
```

### 5.5 Current Pipeline Bugs (Must Fix)

Three bugs prevent Socratic from working:

```
BUG 1: handleSocraticComplete() in step-cloud.tsx does NOT send answers to backend.
  Answers are collected in React state (Map<string, string>) but never posted to
  /api/socratic/answer. When user clicks "Done", answers are LOST.
  FIX: Loop through socraticAnswers Map, POST each to /api/socratic/answer.

BUG 2: /api/cv/resolve does NOT return socratic_questions.
  After conflict resolution, frontend expects socratic_questions in response
  (line 277 of step-cloud.tsx) but the resolve endpoint never generates them.
  FIX: Add generateInitialQuestions(cloud) call to resolve endpoint.

BUG 3: /api/cloud (GET) does NOT return socratic_questions.
  Frontend checks for socratic_questions (line 210) but the GET endpoint
  only returns classified cloud data.
  FIX: Generate questions if cloud exists but no socratic_qa records found.
```

---

## 6. PIPELINE FLOW (Corrected)

```
1. CV UPLOAD -> text extraction -> store extracted_text
2. CV PARSING (LLM) -> structured ParsedCV with candidate_context + qualification_chain
3. CLEANING (CODE) -> remove hallucinations, fix dates, validate
4. CONFLICT DETECTION (CODE) -> cross-CV comparison
5. CONFLICT RESOLUTION (User) -> answer conflict questions (max 6)
6. MERGE (CODE) -> single canonical profile
7. CLOUD BUILD v0 (CODE) -> build Cloud from merged profile (needed to generate questions)
8. ENRICHMENT QUESTIONS (Socratic Phase 2) -> max 5 questions, targeting evidence gaps
   - Each answer persisted to /api/socratic/answer immediately
   - Cloud nodes updated with SocraticEvidence
9. CLOUD BUILD v1 (CODE) -> rebuild Cloud with enriched evidence
   OR: skip rebuild if answers were added to nodes in real-time (step 8)
10. CLOUD DISPLAY -> reveal experience, then tabs
```

Correction from v2 spec: Cloud must be built BEFORE questions (to know what gaps exist),
but user doesn't SEE the Cloud until AFTER answering. The reveal shows the ENRICHED Cloud.

The flow from user's perspective:
- Upload CVs → answer conflict questions → answer enrichment questions → see Cloud
- They never see the "before enrichment" version. Their first view is already complete.

---

## 6A. COMPETITIVE BAR — What "Better Than Competition" Means (Per Aspect)

> Updated: May 15, 2026. Every aspect has a DEFINITION of what "better" means,
> a competitive benchmark, and measurable criteria. No vague "make it better."

### A1. IDENTITY CARD — "Who You Are"

**What competitors do:**
- LinkedIn: Name + headline + photo. Static. No narrative.
- Resume.io: Name + contact. No story.
- MuchSkills: No identity layer at all — jumps straight to skills.
- Enhancv: Colorful resume header, but just data fields.

**What "better" means for us:**
1. **Narrative, not fields.** "18 years of aerospace defense leadership across 3 countries" not "Years: 18, Roles: 5"
2. **Emotional typography.** Name is the BIGGEST thing on screen (min 2rem). Profession in accent color. Not a form field.
3. **Animated reveal that builds anticipation.** Name first (0.3s), then profession fades in (1.2s), then summary builds word-by-word or line-by-line (2.2s), then stats cascade in (3s). Not all-at-once fade-in.
4. **Qualification chips that MEAN something.** "FCPS Anesthesiology" with graduation cap icon tells a story. Not a grey badge.
5. **Differentiator callouts.** The 2-3 things that make this person UNIQUE — visible immediately. "400+ professionals trained" not buried in a list.
6. **Dark mode premium feel.** zinc-900 gradient with subtle indigo/violet glows. Not white card on white background.

**Measurable criteria:**
- [ ] User reads their name and profession and feels "yes, that's me" within 2 seconds
- [ ] Summary line reads as human narrative, not template fill-in
- [ ] At least 3 differentiated visual elements (chips, badges, stat grid) — not a wall of text
- [ ] Animation has distinct phases with breathing room between them (not rapid-fire)
- [ ] Card would look good as a LinkedIn screenshot (shareability test)

### A2. DEPTH VIEW — "How Deep Is Your Expertise"

**What competitors do:**
- LinkedIn: Skill endorsement counts (meaningless social proof)
- MuchSkills: Radial doughnut — size = self-reported proficiency. Pretty but self-assessed.
- Pluralsight: Skill IQ — adaptive testing gives a number. Opaque.
- Enhancv: Simple progress bars — 80% Python, 60% Java. Arbitrary.
- Resume.io: Dot indicators (3/5 dots). Arbitrary scale.

**What "better" means for us:**
1. **Evidence, not scores.** No percentages, no dots, no arbitrary scales. Width = real evidence count.
2. **Segmented bars tell a STORY.** Each color segment = different evidence source. User sees "4 roles used this (blue) + 1 certification (amber) + 2 impacts (green)" in ONE glance.
3. **Tier separation is architecture, not decoration.** Core Skills section is physically ABOVE Certifications section. Not sorted by score — separated by classification.
4. **Click-to-expand evidence chain.** THE differentiator. No competitor shows WHY a skill is rated at a certain depth. We show: "Used React at Company A for 3 years, built the checkout system, led to 40% conversion increase." The evidence IS the depth.
5. **Within-tier sorting reflects real expertise.** Most evidence first, most months first, most impact first. Natural, explainable order.
6. **Depth label is earned, not assigned.** "Expert" = 3+ roles + impact + certification. "Applied" = 1 role, no impact. Labels are deterministic from evidence, not vibes.
7. **Skill names are full, never truncated.** If "System-of-Systems Integration (MBSE)" doesn't fit, the LAYOUT adapts. Not the content.
8. **Evidence bar scales to dataset maximum.** The skill with most evidence = full width. Others proportional. Not arbitrary "8 = full."
9. **Empty tiers are hidden; empty view has call-to-action.** If no licenses exist, don't show empty "Licenses" section. If NO nodes exist, show "Upload a CV to see your expertise map."

**Measurable criteria:**
- [ ] User can explain WHY a skill is ranked where it is (evidence chain visible)
- [ ] Core profession skills appear FIRST, certifications SECOND — always
- [ ] No skill name is truncated in the default view
- [ ] Bar widths are proportional to evidence (visually distinguishable — 2 evidence vs 8 evidence must look different)
- [ ] Expanded evidence chain shows real role names, durations, and bullet text
- [ ] Depth labels match deterministic rules (not all showing same label)

### A3. CAREER PATH — "How Have You Progressed"

**What competitors do:**
- LinkedIn: Simple role list (reverse chronological). No visualization.
- Visier: Career journey analytics — Sankey diagrams for org-level attrition. Enterprise, not personal.
- Most competitors: No career visualization at all. Just a resume list.
- Nightingale magazine: Hand-crafted "career river" infographics. Beautiful but manual.

**What "better" means for us:**
1. **Time IS the X-axis.** Not a list. A TIMELINE. Users see their career as a river, not a bullet list.
2. **Parallel roles are VISIBLE.** Two roles running simultaneously (e.g., Residency 2020-2024 + AHA Instructor 2022-present) both appear as overlapping bars. No competitor handles this.
3. **Training is progression, not demotion.** Residency bar is labeled "TRAINING" and seniority line trends UP through it. Never dips.
4. **Domain color coding.** Different domains = different colors. User sees their career transitions instantly (blue=clinical, green=education, purple=research).
5. **Current roles pulse.** Animated indicator on roles ending "Present." Alive, not static.
6. **Hover reveals full context.** Date range, duration, company — tooltip on hover.
7. **Seniority progression line follows ACTUAL seniority.** Uses `seniority_level` per role (1-5), not index position. Lateral moves = flat line. Promotions = upward slope. Training = upward slope (never dip).
8. **Role titles are readable.** If title is long, layout adapts. Tooltip shows full title. Truncation is graceful with full text on hover.
9. **Year grid lines provide temporal context.** Dashed vertical lines at each year boundary. User can estimate durations visually.
10. **Domain legend is automatic.** Only shows domains that exist in this person's career. Not a fixed list of 9 colors.

**Measurable criteria:**
- [ ] Career path reads left-to-right chronologically with correct date positions
- [ ] Overlapping roles are visually distinct (separate swim lanes)
- [ ] No seniority dips for training/residency/fellowship roles
- [ ] Current ("Present") roles have animated indicator
- [ ] Hover/click on any role reveals full title + company + dates + duration
- [ ] Domain colors are distinguishable (not all grey)
- [ ] Seniority line reflects actual role levels, not just order

### A4. OVERALL EXPERIENCE — "The Gasp Moment"

**What competitors do:**
- LinkedIn: Dump all data on one page. No pacing. No emotion.
- MuchSkills: Nice radial chart. But no narrative, no reveal, no identity.
- Spotify Wrapped: Perfect pacing. But shallow data (one stat per card).
- Pluralsight: Data-rich but clinical. No emotional connection.

**What "better" means for us:**
1. **Progressive reveal, not data dump.** First visit = animated entrance. Subsequent visits = instant but organized.
2. **Tab navigation between views.** Not a scrolling dashboard — distinct views (Depth, Career) with clean switching.
3. **Every element is interactive.** Nothing is dead text. Stats expand. Skills expand. Roles have tooltips. Evidence is clickable.
4. **Information hierarchy is VISUAL.** Most important info is biggest, boldest, highest on page. Not everything the same size.
5. **Color system is consistent and meaningful.** Indigo=roles, amber=certs, emerald=impact, violet=other. Same colors everywhere (bars, dots, legends). Not random.
6. **Micro-interactions make it feel alive.** Hover states, transitions, expand/collapse animations. Not static HTML.
7. **Responsive and accessible.** Works on mobile. Tab-navigable. Color-blind safe (use patterns + labels, not just color).
8. **The screenshot test.** A screenshot of the Cloud should make someone think "what tool is this?" — visually distinctive enough to be recognizable.

**Measurable criteria:**
- [ ] First-time reveal takes 3-4 seconds of animated entrance (not instant dump)
- [ ] User can navigate between Depth and Career views with one click
- [ ] At least 3 distinct hover/interaction states visible across the view
- [ ] Color system is consistent (same color = same meaning everywhere)
- [ ] Mobile viewport (375px) renders without horizontal scroll
- [ ] A non-user looking at a screenshot would say "that looks professional/premium"

---

## 6B. VISUAL DESIGN REFERENCES (Researched May 14, 2026)

Our design combines the best elements from 6 sources, copying none:

| Source | What We Took | What We Rejected |
|--------|-------------|-----------------|
| **Spotify Wrapped** | Sequential reveal (name -> profession -> stats), bold typography, celebratory tone | One-stat-per-card is too shallow; we show richer data |
| **MuchSkills Doughnut** | "Personal fingerprint" feeling, radial grouping by category | Proficiency-as-radius is self-assessed; we use evidence-based depth |
| **Nivo Sunburst** | Hierarchical concentric rings for breadth view (future Phase 2) | Built-in zoom is limited; labels unreadable on narrow arcs |
| **Pluralsight Skill IQ** | Sub-skill dimensional breakdown, progress tracking | Opaque scores, peer percentiles, black-box adaptive testing |
| **Nightingale (Will Chase)** | Career as flowing river (swim-lanes, not ladder), transitions as connections | Requires editorial annotation; hard to auto-generate |
| **HBR Skills Article** | Evidence > self-assessment, radar charts are lies, multi-dimensional per skill | Proposed 4-dimension encoding is cognitively heavy |

### Design Principles (from synthesis):

1. **Dark identity card** (Wrapped-inspired): Bold name reveal on zinc-900 gradient, profession in indigo, animated phased entrance
2. **Segmented evidence bars** (HBR-inspired): Each skill shows WHERE evidence comes from (roles=blue, certs=gold, impact=green, other=purple) -- not a single score
3. **Three-section depth view** (anti-MuchSkills): Skills separated by TIER (Core/Cert/Education), never mixed -- classification not scoring
4. **Swim-lane career path** (Nightingale-inspired): SVG timeline, X=time, each role=horizontal bar, parallel roles visible, training roles labeled, domain colors, animated "present" pulse
5. **No radar charts** (HBR-validated): "Connecting dots with lines implies relationships between skills that don't exist"
6. **Evidence bars, not progress bars**: Width = evidence count (NOT percentage to some arbitrary max). Empty space = room to grow, not failure.

### Implementation Status (May 15, 2026):
- Identity Card: BUILT, NEEDS REWORK (summary is template-fill, animation is basic fade, no shareability)
- Depth View: BUILT, NEEDS REWORK (bars scale to arbitrary 8, names truncated, no sorting, no empty state)
- Career Path: BUILT, NEEDS REWORK (seniority line is index-based, foreignObject tooltips, limited domain colors, title truncation)
- Breadth/Sunburst: DEFERRED to Phase 2 (requires @nivo/sunburst install)
- Tab container: BUILT (CloudVisualization), needs micro-interaction polish
- All wired into `CloudVisualization` component, rendering in step-cloud.tsx

---

## 6B. REACT LIBRARIES

| Component | Library | Why |
|-----------|---------|-----|
| Breadth sunburst | @nivo/sunburst | Hierarchical, interactive zoom, React-native API |
| Breadth fallback (< 4 categories) | @nivo/bar (grouped) | Clean grouped bars |
| Depth evidence bars | Custom (div + CSS) | Segmented bars are simple enough for CSS, no chart library needed |
| Career timeline | Custom (div + CSS grid) | Swim-lane layout is better done with CSS than chart libraries |
| Career seniority overlay (optional) | recharts ResponsiveContainer + LineChart | Simple line overlay |
| Stat card drill-down | Headless UI Disclosure or native details/summary | Click to expand |

**Do NOT use:**
- Radar charts (common, not distinctive, unreadable with > 8 axes)
- Pie charts (don't show hierarchy)
- Generic bar charts for the main Cloud view (too dashboard-y)

---

## 7. IMPLEMENTATION CHECKLIST

Each item must be completed, tested, and validated against this spec before marking done.

### Phase 1: Data Model (backend -- no UI changes yet)

- [x] 1a. Add `tier` field to CloudNode type and cloud.ts builder
- [x] 1b. Implement tier-based classification: `classifyNodeTier()` — core_skill/certification/education/voluntary/license
- [x] 1c. Implement within-tier sorting by real evidence (role count, months, impact presence)
- [x] 1d. Unify dedup: `normalizeCredential()` + post-build dedup pass
- [x] 1e. Fix `inferSeniority()` — training roles return mid+ level, `isTrainingRole()` helper
- [x] 1f. Add `qualification_chain` to parser prompt output schema
- [x] 1g. Update parser prompt with Step 0.5 (Qualification Chain) + candidate_context output
- [ ] 1h. Test parser via subagent (Gate 10) with Dr. Sibgha's CV

### Phase 2: API Layer

- [x] 2a. `/api/cloud` returns identity + nodes (with tier) + trajectory + stats
- [x] 2b. Each node includes tier (via classifyNodeTier at build or load time)
- [x] 2c. Career trajectory includes isTraining flag + seniority_level per role
- [ ] 2d. Parse May26 CV, ensure all 5 CVs have parsed_cv

### Phase 3: UI -- Identity Card

- [x] 3a. Show candidate name (from identity or candidate_context)
- [x] 3b. Show core profession (from identity.core_profession)
- [x] 3c. Show career stage from specializations
- [x] 3d. Show qualification country + degrees as chips
- [x] 3e. Show differentiators as amber badges
- [x] 3f. Stat cards in grid (years, roles, skills, evidence)
- [x] 3g. Error banner handled by step-cloud.tsx loading states
- [ ] 3h. Summary line: narrative sentence, not template fill-in (A1 criteria)
- [ ] 3i. Animation: distinct phases with breathing room, not rapid fade-in
- [ ] 3j. Stat chips clickable (expand to detail)
- [ ] 3k. Shareability: card looks good as standalone screenshot

### Phase 4: UI -- Breadth View (DEFERRED to Phase 2 of product)

- [ ] 4a-g. Sunburst visualization — requires @nivo/sunburst, lower priority than depth/career

### Phase 5: UI -- Depth View

- [x] 5a. Five-section layout: Core Skills, Certifications, Education, Licenses, Voluntary
- [x] 5b. Core Skills sorted by evidence (role count > months > impact)
- [x] 5c. Segmented evidence bars (role=indigo, cert=amber, impact=emerald, other=violet)
- [x] 5d. Click row to expand full evidence chain
- [x] 5e-f. All sections show structured data with icons
- [x] 5g. Heart Saver classified as "voluntary" tier -- never in Core Skills
- [ ] 5h. Bar scale: proportional to dataset max, not arbitrary "8 = full" (A2 criteria)
- [ ] 5i. Skill names: full display, never truncated. Layout adapts, not content.
- [ ] 5j. Within-tier sorting: evidence count desc, months desc, impact presence
- [ ] 5k. Empty state: "Upload a CV to see your expertise map" when no nodes
- [ ] 5l. Depth labels: deterministic from evidence rules, verified different across skills
- [ ] 5m. Evidence expand animation: smooth slide-down, not instant appear
- [ ] 5n. Hover state on rows: background highlight before click

### Phase 6: UI -- Career Path View

- [x] 6a. SVG swim-lane layout: one row per role, X-axis = time
- [x] 6b. Bar width = duration, color = domain
- [x] 6c. Parallel roles visible (multiple rows)
- [x] 6d. Training roles labeled "TRAINING"
- [x] 6e. No false dips -- training level >= previous level
- [x] 6f. Hover tooltip shows date range + duration
- [x] 6g. SVG text rendering (no unicode issues)
- [x] 6h. Current roles have animated pulse
- [ ] 6i. Seniority line: use actual seniority_level for y-position, not array index (A3 criteria)
- [ ] 6j. Domain colors: expand palette, handle "defense_aerospace" and other compound domains
- [ ] 6k. Role titles: graceful truncation with full title on hover/tooltip
- [ ] 6l. Tooltip: use div overlay instead of foreignObject (Safari compat)
- [ ] 6m. Company names: readable, not truncated at 22 chars
- [ ] 6n. Overlap indication: visual hint when roles run concurrently (bracket or label)

### Phase 7: Pipeline

- [x] 7a. Socratic questions generated by `/api/cv/resolve` and `/api/cloud` GET
- [x] 7b. `handleSocraticComplete()` POSTs each answer to `/api/socratic/answer`
- [x] 7c. Cloud rebuilt after enrichment (build-cloud called post-answers)
- [x] 7d. Identity card animated reveal on first view

### Phase 8: Validation

- [ ] 8a. Screenshot comparison: our Cloud vs MuchSkills skill doughnut
- [ ] 8b. Screenshot comparison: our depth vs Pluralsight Skill IQ
- [ ] 8c. Screenshot comparison: our career path vs Visier career journey
- [ ] 8d. User test: "Does this describe who you are?" -- identity test
- [ ] 8e. User test: "Is Anesthesiology above ACLS?" -- hierarchy test
- [ ] 8f. User test: "Does the career path make sense?" -- trajectory test
- [ ] 8g. User test: "Did you gasp?" -- the ultimate test

---

## 8. SUCCESS CRITERIA

The Cloud is RIGHT when:

1. **Identity**: User sees "Anesthesiologist" not "Heart Saver" or "FCPS Anesthesiology"
2. **Hierarchy**: Core domain skills (Anesthesiology) ALWAYS above certs (ACLS) in depth view
3. **No duplicates**: FCPS appears ONCE. MBBS appears ONCE.
4. **Career makes sense**: Residency is UP, dual roles are visible, no false dips
5. **Everything clickable**: Stats, skills, certs, education -- all expand to show evidence
6. **Three tiers visible**: Core Skills section, Certification section, Education section -- distinct in UI
7. **Profession-agnostic**: Same logic works for doctor, engineer, accountant, pilot
8. **The gasp**: "Oh my god. This is my career." Not "This is a list of keywords."

---

## 9. WHAT "OH MY GOD" LOOKS LIKE

The user uploads 5 versions of their CV. They answer 1-2 conflict questions and 3-5 enrichment questions. Then:

Screen fades. Bold text appears:

> **Dr. Sibgha Saliha**
> **ANESTHESIOLOGIST**

Pause. Then:

> 9 years building expertise across 4 institutions, 3 countries,
> and 500+ critical emergencies.

Pause. Then the sunburst blooms outward from center -- their career domains radiating from their core identity. They click Clinical Practice and see Anesthesiology > Critical Care > Pain Management nested inside.

They switch to Depth. Core skills at top with segmented evidence bars -- each segment a different color showing WHERE that evidence came from. Below: their certifications with "Instructor" badges. Below that: their degrees as the foundation layer.

They switch to Career Path. Five horizontal lanes, each a role. Two lanes overlap (2022-2024: Residency + AHA Instructor). The timeline tells a story of consistent upward progression from Medical Officer through training to ICU Physician in Saudi Arabia.

At the bottom: Differentiators. "400+ professionals trained. 2 peer-reviewed publications. International experience across 3 countries."

The user thinks: "This system actually understands me."

That is the spec. That is what we build.
