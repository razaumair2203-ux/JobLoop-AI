# Parser Gap Analysis: cv-parser.ts vs cloud-pipeline-spec.md

> Date: May 4, 2026
> Status: Gap analysis between what the Haiku parser extracts and what the pipeline spec requires

---

## Legend
- HAVE = ParsedCVOutput schema includes this field
- MISSING = Pipeline spec requires it, parser doesn't extract it
- PARTIAL = Field exists but lacks the depth/structure the spec needs

---

## 1. ROLES (Stage 2, Section 3.1)

| Spec Field | Parser Status | Notes |
|---|---|---|
| title | HAVE | `experience[].title` |
| organization | MISSING | Parser has `company` only. Spec distinguishes `organization` (posting) from `employer` (military pattern: same employer, different orgs) |
| employer | MISSING | Critical for military/rotational careers. All 10 roles share "PAF" as employer but have different organizations |
| start_date | HAVE | `experience[].start_date` |
| end_date | HAVE | `experience[].end_date` |
| duration_months | HAVE | `experience[].duration_months` |
| bullets | HAVE | `experience[].bullets` |
| technologies_used | HAVE | `experience[].technologies_used` |
| metrics | HAVE | `experience[].metrics_mentioned` |
| programs | MISSING | Named programs (JF-17, AEW&C, Crotale) not extracted as separate field. May appear in bullets but not structured |
| team_size | MISSING | "80 engineers" not extracted. Buried in bullets |
| domain | HAVE | `experience[].domain` |
| seniority_signals | MISSING | "Director", "Lead", "Senior" not extracted as structured array |

**Verdict**: 7/12 fields present. Missing: employer, organization, programs, team_size, seniority_signals (5 gaps).

---

## 2. EDUCATION (Section 3.2)

| Spec Field | Parser Status | Notes |
|---|---|---|
| institution | HAVE | |
| degree | HAVE | |
| field | HAVE | |
| start_year | MISSING | Parser only has single `year` field |
| end_year | PARTIAL | `education[].year` — single year, not start/end range |
| research_topic | MISSING | Critical for academic personas. "Novel ECCM algorithm" not extracted |
| relevance | MISSING | How education connects to career skills |

**Verdict**: 3/7 fields present. Missing: start_year, research_topic, relevance. Partial: end_year.

---

## 3. CERTIFICATIONS (Section 3.3)

| Spec Field | Parser Status | Notes |
|---|---|---|
| name | HAVE | |
| issuer | HAVE | |
| tier | MISSING | Gold/specialization/course/military classification doesn't exist |
| year | HAVE | |
| pdus | MISSING | Continuing ed credits not extracted |
| credential_id | MISSING | Not extracted |
| active | HAVE (extra) | Parser has `active` boolean, spec doesn't but useful |

**Verdict**: 3/6 spec fields present. Missing: tier, pdus, credential_id. The tier classification is the MOST IMPORTANT gap — it determines whether PMP (gold) gets weighted differently from a random Coursera course.

---

## 4. SKILLS (Section 3.4)

| Spec Requirement | Parser Status | Notes |
|---|---|---|
| Demonstrated (from role bullets) | MISSING as classification | Parser extracts `technologies_used` per role, but doesn't TAG skills as demonstrated/listed/certified/inferred |
| Listed (skills section only) | MISSING as classification | All skills lumped into flat `skills` object (languages/frameworks/tools/etc) |
| Certified (cert backing) | MISSING as classification | No link between `certifications` and `skills` |
| Inferred (from context) | MISSING as classification | Not attempted |

**Verdict**: Skills ARE extracted but without the 4-tier evidence classification the spec requires. The `skills` object is a flat tech-oriented categorization (languages/frameworks/databases/tools) not a domain taxonomy.

---

## 5. AWARDS (Section 3.5)

| Spec Field | Parser Status | Notes |
|---|---|---|
| title | HAVE | |
| issuer | HAVE | |
| significance | MISSING | "Highest operational-level commendation in PAF" — not assessed |
| related_skills | MISSING | What the award proves about competency |

**Verdict**: 2/4 fields present. Missing: significance, related_skills.

---

## 6. PROGRAMS & PLATFORMS (Section 3.6)

| Spec Field | Parser Status | Notes |
|---|---|---|
| name | MISSING | No programs extraction at all |
| type | MISSING | |
| roles_involved | MISSING | |
| user_contribution | MISSING | |

**Verdict**: 0/4 fields present. ENTIRE section missing. Programs are the strongest anchor points for defense/aerospace profiles — "worked on JF-17 Thunder Block III" is worth more than "project management experience."

---

## 7. CROSS-CV DEDUPLICATION (Stage 3)

The parser is per-CV — it doesn't know about other CVs. Dedup happens in `mergeIntoCloud()`. But the parser DOES extract `conflicts` which is good:

| Spec Requirement | Parser Status | Notes |
|---|---|---|
| Date-range role matching | N/A (post-parser) | Handled in mergeIntoCloud() — basic version exists |
| Collapsed role detection | MISSING | Parser doesn't flag "this 3-year entry might be multiple roles" |
| Timeline gap detection | PARTIAL | Parser extracts `conflicts` with type "gap", but detection logic is in the prompt, not structured |
| Conflicting date resolution | PARTIAL | `conflicts` array captures these but doesn't resolve them |
| Military pattern (single employer) | MISSING | Parser doesn't detect rotational patterns |

---

## 8. ANCHOR POINT COMPUTATION (Stage 6)

Anchor points are entirely post-parser. The parser feeds data that SHOULD enable them, but gaps in extraction mean:

| Anchor | Data Available? | Blocking Gaps |
|---|---|---|
| Experience (years, progression) | PARTIAL | Missing seniority_signals for progression detection |
| Organization (prestige, type) | MISSING | Parser has company name only, no type/prestige/country classification |
| Certification (tiered) | MISSING | No tier field — can't distinguish PMP from Coursera course |
| Program (named programs) | MISSING | No programs extraction |
| Impact (quantified) | PARTIAL | `metrics_mentioned` exists but not linked to programs or scale |

---

## SUMMARY: What Must Change in cv-parser.ts

### Must Add to ParsedCVOutput Schema (P0):
1. `experience[].employer` — separate from `organization`/`company`
2. `experience[].programs` — `string[]` of named programs per role
3. `experience[].team_size` — `number | null`
4. `experience[].seniority_signals` — `string[]`
5. `certifications[].tier` — `"gold" | "specialization" | "course" | "military"`
6. `programs` — top-level `Array<{name, type, roles_involved, user_contribution}>`

### Must Add (P1):
7. `education[].start_year` — separate start/end years
8. `education[].research_topic` — `string | null`
9. `awards[].significance` — `string`
10. `awards[].related_skills` — `string[]`
11. `certifications[].pdus` — `number | null`

### Must Restructure (P1):
12. `skills` object — current flat tech categorization (languages/frameworks/tools) needs to become domain-aware with evidence tier (demonstrated/listed/certified/inferred)

### Prompt Additions Needed:
13. Program/platform extraction instructions (detect named programs from role context)
14. Team size extraction from bullets ("managed 80 engineers", "led team of 15")
15. Seniority signal extraction from titles
16. Certification tier classification rules (with examples per tier)
17. Military/rotational career pattern handling (same employer, different orgs)
18. Collapsed role detection heuristics

### NOT Parser Responsibility (handled downstream):
- Cross-CV deduplication (mergeIntoCloud)
- Anchor point computation (new Stage 6 module)
- Depth scoring (taxonomy.ts classifyCloud)
- Visualization (step-cloud.tsx)
