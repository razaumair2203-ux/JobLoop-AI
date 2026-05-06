# Taxonomy & Competitor References — For When Parser Is Ready

> Saved: May 4, 2026
> Status: REFERENCE. These sources inform our skill classification, visualization, and depth assessment.
> Use when: parser can reliably extract roles, programs, certs, seniority — then map to these taxonomies.

---

## Taxonomy Standards

### ESCO (European Skills, Competences, Qualifications and Occupations)
- **Scale**: 13,890 skill concepts, 4 sub-classifications
- **Structure**: Skills & Competences → Knowledge → Transversal skills → Language skills
- **Hierarchy**: 4-level (Skill Pillar > Skill Group > Skill > Sub-skill)
- **URL**: https://esco.ec.europa.eu/
- **Use for us**: Canonical skill naming. When user writes "RAID logs" we map to ESCO's "risk management" concept. Alias-aware matching.
- **Weakness**: Euro-centric, bureaucratic naming conventions. Needs curation for our domains.

### O*NET (Occupational Information Network)
- **Scale**: 46 skill areas, 325 intermediate work activities, 900+ detailed work activities
- **Structure**: Skills → Abilities → Knowledge → Work Activities → Work Context
- **Hierarchy**: Occupation > Task > Skill (with importance + level ratings per occupation)
- **URL**: https://www.onetonline.org/
- **Use for us**: Domain-expected skills (what skills SHOULD someone in this occupation have?). Gap detection baseline. Seniority progression benchmarks.
- **Weakness**: US-centric, slow to update for emerging tech skills.

### SFIA (Skills Framework for the Information Age)
- **Scale**: 7 responsibility levels, 121 professional skills
- **Structure**: Level 1 (Follow) → Level 7 (Set strategy, inspire)
- **Categories**: 6 categories, 20 subcategories
- **URL**: https://sfia-online.org/
- **Use for us**: Depth/seniority mapping. SFIA Level 5 = "Ensure, advise" maps to our "proficient". Level 7 = "Set strategy" maps to our "expert". Best framework for measuring PROGRESSION not just presence.
- **Weakness**: IT-heavy. Needs adaptation for defense, aerospace, maintenance domains.

### Skill-graph.com
- **Data model**: Node (skill) + Edge (relationship) + Depth (evidence-based) + Evidence (role-linked)
- **Layout**: D3.js force-directed graph with collision detection
- **Key params**: forceCollide(), velocity Verlet, 300-500 simulation steps, center + repulsion + collision forces
- **Use for us**: Visual layout algorithm reference. When we build the dedicated Cloud page (not onboarding), use their physics approach for interactive skill web.
- **Weakness**: Needs real D3 physics. Raw SVG math = jumbled mess (we proved this).

### MuchSkills (muchskills.com)
- **Visual**: Constrained bubble chart, responsive, normalized. Red Dot Design Award winner.
- **Bubble size**: User-declared priority/interest (NOT proficiency, NOT evidence)
- **Interaction**: Drag to resize any bubble; others shrink proportionally (zero-sum constraint)
- **Grouping**: Flat with soft visual clustering, no hierarchy
- **Use for us**: Visual design inspiration (gradients, typography, clean feel). Their zero-sum resize interaction is clever but irrelevant — we don't let users self-declare.
- **Weakness**: Pretty but hollow. No evidence backing. "I want to use this more" ≠ "I'm good at this."
- **Our advantage**: Evidence-based depth (verifiable from CV) vs self-declared interest (meaningless).

### AIHR Skills Taxonomy (Academy to Innovate HR)
- **Framework**: Hierarchical skills taxonomy best practices for HR/talent
- **Structure**: Skill Family > Skill Group > Individual Skill > Proficiency Level
- **Key insight**: Recommends 4-5 proficiency levels max (aligns with our mentioned/applied/proficient/expert)
- **Use for us**: Validates our 4-level depth model. Their "skill family" = our "domain", their "skill group" = our "category".
- **URL**: https://www.aihr.com/

---

## How These Map to Our Pipeline

| Our Concept | Primary Source | Secondary Source |
|---|---|---|
| Domain assignment | O*NET occupations | ESCO skill pillars |
| Skill naming/aliases | ESCO concepts | O*NET skills |
| Depth/seniority levels | SFIA 7 levels | AIHR 4-5 levels |
| Gap detection baseline | O*NET work activities | SFIA skill expectations per level |
| Visual layout | Skill-graph.com (D3) | MuchSkills (bubble design) |
| Evidence model | Our own (no competitor does this) | — |

---

## When to Apply

These taxonomies become actionable AFTER parsing can extract:
1. Accurate roles with dates (cross-CV deduped)
2. Programs/platforms per role
3. Certification tiers
4. Seniority signals from titles
5. Team sizes and quantified impact

Until then, our taxonomy engine (taxonomy.ts) does basic domain/category mapping with a curated subset. The full ESCO/O*NET integration is Phase 2.
