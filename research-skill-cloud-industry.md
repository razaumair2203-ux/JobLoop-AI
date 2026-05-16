# Skill Cloud / Skill Graph Industry Research

**Date**: May 14, 2026
**Purpose**: Understand how the industry models, structures, and visualizes professional skills to inform JobLoop AI's Profile Cloud design.
**Method**: Web search across product documentation, engineering blogs, academic papers, and framework specs. No citations fabricated -- gaps noted explicitly.

---

## 1. What Exists in Market

### LinkedIn Skills Graph
- **Scale**: ~41,000 standardized skills, ~374,000 aliases, 200,000+ connections between skills (as of 2023, grown ~35% since Feb 2021)
- **Data Model**: Graph with **nodes** (individual skills) and **edges** called "knowledge lineages" reflecting how skills relate (e.g., both part of a career specialization, or one is a tool used to apply another)
- **Taxonomy**: Hierarchical, curated by human taxonomists + ML (KGBert model predicts relationships). NOT a flat list -- skills form clusters and lineages
- **Extraction**: Hybrid approach -- trie-based tagger (token lookup, scales well) + semantic model (two-tower architecture with multilingual BERT encoders)
- **Normalization**: Aliases consolidated (e.g., "data analytics" = "data analysis"). Up to 20+ synonyms per skill
- **Proficiency**: LinkedIn does NOT model proficiency levels explicitly. Skills are binary (you have it or you don't). Strength is inferred from endorsements (social proof), years of experience, and skill prominence on profile
- **Connections**: Skills connect to members, jobs, courses, companies, and other skills
- **Sources**: [LinkedIn Engineering - Skills Taxonomy](https://www.linkedin.com/blog/engineering/data/building-maintaining-the-skills-taxonomy-that-powers-linkedins-skills-graph), [LinkedIn Engineering - Skills Extraction](https://www.linkedin.com/blog/engineering/skills-graph/extracting-skills-from-content), [Linked Data Orchestration analysis](https://linkeddataorchestration.com/2023/12/13/how-linkedin-is-moving-towards-a-skills-based-economy-with-the-skills-graph/)

### Workday Skills Cloud
- **Scale**: 5 billion+ skill instances across all customer tenants (grown from 25 million at launch in 2018)
- **Data Model**: Ontology built into Workday HCM. Uses graph technology to map skill relationships. Skills have synonyms (20+ per skill common), related skills, and contextual metadata
- **Proficiency Levels**: Configurable 5-point scale (+ N/A):
  - Beginner
  - Intermediate ("proficient in fundamentals, demonstrated in varied situations")
  - Experienced ("extends beyond fundamentals, no guidance needed")
  - Advanced ("deep knowledge, complex situations")
  - Expert ("specializes, mentors others, most complex situations")
- **Self-Assessment**: Workers self-rate 1-5 on selected skills. Can also request ratings from others
- **Skill Inference (2025)**: LLM-based service that infers relevant skills from minimal input (e.g., a job title). Scalable inference engine
- **Integration**: Skills Cloud feeds into Recruiting, Learning, Talent Management, People Analytics
- **Sources**: [Workday Skills Cloud Product Page](https://www.workday.com/en-us/products/human-capital-management/skills-cloud.html), [Workday Engineering - Skill Inference](https://medium.com/workday-engineering/skill-inference-building-an-llm-based-service-in-the-workday-skills-cloud-47c9cce9f7bd), [Josh Bersin analysis](https://joshbersin.com/2020/01/workday-skills-cloud-a-big-idea-with-much-more-to-come/)

### Eightfold.ai
- **Scale**: 1.6 million skills derived from 1.6 billion career trajectories
- **Data Model**: Talent Intelligence Platform analyzing: skills, adjacent skills, professional networks, companies, time in roles, education, work locations
- **Approach**: Skills taxonomy as foundation, with AI connecting people to roles via inferred and explicit skills
- **Differentiation**: Predictive -- not just "what skills do you have" but "what skills COULD you have based on trajectory"
- **Sources**: [Eightfold Talent Intelligence](https://eightfold.ai/products/), [Knowlee analysis of Eightfold/Beamery/Gloat](https://www.knowlee.ai/blog/ai-talent-intelligence)

### Beamery
- **Scale**: ~16,000 canonical skills derived from ~20 million unnormalized skills in their Talent Graph
- **Data Model**: Uses SARO (Skills and Recruitment Ontology, from EU Horizon 2020). Skills disaggregated into:
  - **Product skills**: competence using a specific product (e.g., "Hadoop")
  - **Topic skills**: capability in a domain/role-specific area (e.g., "Data Analytics")
- **Metadata per skill**: Entry source (HRIS, ATS, JD), Prevalence (how common across org), Importance (must-have vs nice-to-have), seniority context, proficiency, industry relevance
- **Key Insight**: Beamery explicitly argues that skills should be DISAGGREGATED -- a single "skill" label hides too much. Context (where used, how deeply, in what industry) matters as much as the label
- **2025 Update**: Launched Job Architecture capabilities powered by skills inference engine
- **Sources**: [Beamery Part 1 - Representing Skills](https://medium.com/hacking-talent/skills-beamery-part-1-representing-skills-for-today-and-the-unknown-of-tomorrow-d87e114771a3), [Beamery Part 2 - Disaggregating Skills](https://medium.com/hacking-talent/skills-beamery-part-2-disaggregating-a-skill-72fa4f4d1cfa), [Beamery Talent Graph](https://beamery.com/talent-graph-and-ai/)

### Phenom
- **Data Model**: Dynamic skills ontology powered by AI, tailored per organization
- **Key Feature**: Graph algorithms to identify career paths and progression. Employees can visualize growth potential
- **Approach**: Contextualizes skills to the specific organization's workforce data, not just generic taxonomy
- **Sources**: [Phenom - AI and Skills Ontologies](https://www.phenom.com/blog/ai-skills-ontologies-for-talent-management), [Phenom - Demystifying Skill Ontologies](https://www.phenom.com/blog/demystifying-skill-ontologies)

### Degreed
- **Approach**: Learning platform that connects skills to learning paths. Skills assessed through:
  - Self-assessment
  - Manager assessment
  - Verified credentials from partners (HackerEarth, iMocha, Workera, Skillable)
  - Badges for verified achievements
- **Architecture**: "Skills+" orchestrates the skill lifecycle -- users choose their taxonomy, systems to draw from, and priority skills
- **Key Concept**: Skills as "signals" -- standardized way to measure and communicate career-relevant skills
- **Sources**: [Degreed Skills](https://degreed.com/experience/skills/), [Degreed Skill Certification](https://www.gettingsmart.com/2017/09/10/measure-verify-and-signal-any-skill-with-degreeds-new-skill-certification/)

### skill-graph.com
- **Approach**: Individual-focused (students, graduates, early-career). Extracts skills from CV, certificates, transcripts, project evidence
- **Data Model**: Three primitives:
  1. **Nodes**: 15-30 top-level skills grouped into 3-6 domains, with hierarchical expansion
  2. **Edges**: Prerequisites, adjacencies, skill families, transfer paths
  3. **Depth Levels**: Exposure → Working → Proficient → Expert (evidence-anchored)
- **Key Insight**: "The difference between a spreadsheet of city names and an actual map with roads, distances, and terrain"
- **Evidence Requirement**: Depth levels require evidence anchors (shipped projects, certs, publications) -- NOT self-assessment alone
- **Sources**: [skill-graph.com - What Is a Skill Graph](https://skill-graph.com/docs/what-is-a-skill-graph)

---

## 2. What a Skill Cloud Should Contain

### Entities (synthesized across all platforms)

| Entity | Description | Who Uses It |
|--------|-------------|-------------|
| **Skill** | Atomic capability (e.g., "Python", "Patient Assessment") | Everyone |
| **Skill Group/Domain** | Cluster of related skills (e.g., "Backend Engineering", "Clinical Medicine") | LinkedIn, ESCO, Workday |
| **Competency** | Broader behavioral capability (e.g., "Leadership", "Problem Solving") | SFIA, O*NET, Workday |
| **Role/Occupation** | Job title or function | LinkedIn, ESCO, O*NET |
| **Certification** | Verified credential from issuing body | Degreed, Beamery, skill-graph |
| **Education** | Degree, training program, course completion | LinkedIn, ESCO, Eightfold |
| **Project/Experience** | Specific work artifact or engagement | skill-graph (evidence anchor) |
| **Knowledge** | Domain-specific facts and principles | O*NET, SFIA, ESCO |

### Relationships

| Relationship | Example | Who Models It |
|-------------|---------|---------------|
| **Skill → Skill** (hierarchy) | "Machine Learning" is-child-of "Data Science" | LinkedIn (knowledge lineages), ESCO (broader/narrower) |
| **Skill → Skill** (adjacency) | "React" co-occurs-with "TypeScript" | LinkedIn, Eightfold, skill-graph |
| **Skill → Skill** (prerequisite) | "Linear Algebra" prerequisite-for "Machine Learning" | skill-graph |
| **Skill → Role** | "Anesthesiology" essential-for "Anesthesiologist" | ESCO (essential/optional), O*NET |
| **Skill → Certification** | "FCPS" validates "Anesthesiology" | Degreed, Beamery |
| **Skill → Project** | "Python" used-in "Production Service X" | skill-graph (evidence) |
| **Role → Role** (progression) | "Registrar" → "Consultant" | Phenom (career paths), Eightfold |
| **Skill → Education** | "MBBS" teaches "Clinical Medicine" | LinkedIn, ESCO |

### Metadata per Skill

| Metadata | Description | Who Uses It |
|----------|-------------|-------------|
| **Proficiency/Depth** | Level of mastery | SFIA (7 levels), Workday (5), O*NET (0-7), skill-graph (4) |
| **Recency** | When last used/demonstrated | Eightfold (time in roles), Beamery |
| **Evidence** | What proves this skill | skill-graph (artifacts), Degreed (badges) |
| **Source** | Where this data came from | Beamery (HRIS/ATS/JD), Degreed (self/manager/verified) |
| **Importance** | How critical for a role | O*NET (1-5 scale), Beamery (must-have/nice-to-have), ESCO (essential/optional) |
| **Context** | Industry, seniority, domain where applied | Beamery (industry relevance), Phenom (org-specific) |
| **Endorsements** | Social validation | LinkedIn (endorsements) |
| **Duration** | How long practiced | Eightfold, LinkedIn |

### Identity vs. Skills (Critical Distinction)

The research reveals a clear separation that most platforms handle poorly:

- **Professional Identity** = WHO you are: "Anesthesiology Consultant", "Senior Backend Engineer". This is portable, intrinsic, crafted over a career. It connects your experiences, values, and the story you tell.
- **Skills** = WHAT you can do: "Intubation", "Python", "Regional Anesthesia". These are atomic capabilities that can be listed, measured, and matched.
- **Certifications/Credentials** = PROOF of what you've earned: "FCPS", "AWS Solutions Architect". These validate but don't define.

**No major platform models this cleanly.** LinkedIn treats everything as flat skills. Workday groups by role but doesn't separate identity. skill-graph.com comes closest with its domain grouping + evidence anchors.

---

## 3. How They Determine Skill Depth/Proficiency

### Framework Comparison

| Framework | Levels | Scale | Evidence Basis |
|-----------|--------|-------|----------------|
| **SFIA 9** (Oct 2024) | 7 | Responsibility-based (autonomy, influence, complexity, business skills, knowledge) | 3-tier: Knowledge ("can explain") → Skill ("can do without instruction") → Competency ("significant professional experience") |
| **O*NET** | 7 (0-7, normalized to 0-100) | Dual: Importance (1-5) AND Level (0-7) separately | Expert analyst ratings linked to occupations. Same skill can be important for many roles but at different LEVELS |
| **Workday** | 5 (+N/A) | Self-assessed + peer-assessed | Self-rating 1-5, can request ratings from others |
| **ESCO** | None | Essential vs Optional per occupation | No proficiency levels -- binary (you have it or you don't, for a given role) |
| **skill-graph.com** | 4 | Exposure → Working → Proficient → Expert | Evidence-anchored: shipped projects, certs, publications, incidents resolved |
| **LinkedIn** | None | Binary (have/don't have) | Endorsements (social), years of experience (inferred), prominence on profile |
| **Degreed** | Varies | Multi-source | Self-assessment + manager assessment + verified partner assessments + badges |

### Self-Declared vs Evidence-Based vs Endorsement

**The industry is clearly moving AWAY from self-declaration:**

1. **Self-declared** (LinkedIn endorsements, Workday self-rating): Cheapest to collect, least reliable. LinkedIn endorsements are widely regarded as meaningless (people endorse strangers). Workday self-ratings have the Dunning-Kruger problem.

2. **Endorsement-based** (LinkedIn, Degreed manager assessment): Better than self, but still subjective. Useful for soft skills where objective measurement is hard.

3. **Assessment-based** (Degreed partner integrations, TestGorilla, Microsoft Applied Skills): Growing fast. The US federal government set a 2025 deadline to move ~100,000 IT jobs away from self-assessment to validated skills-based assessments. TestGorilla's 2024 report shows 90% of candidates prefer skills-based assessment over self-declaration.

4. **Evidence-based** (skill-graph.com, SFIA Competency level): The gold standard. Proficiency proven through artifacts (shipped code, clinical outcomes, published research, resolved incidents). SFIA explicitly requires "sufficient evidence" of professional application.

### Handling "I know Python" vs "I led Python teams for 10 years"

**No platform solves this elegantly.** Here's how they try:

- **O*NET**: Separates Importance from Level -- the same skill at different depths for different roles
- **SFIA**: 7 levels of responsibility (follow → assist → apply → enable → ensure/advise → initiate/influence → set strategy/inspire). A Level 2 Python developer follows instructions; a Level 6 sets organizational Python strategy
- **skill-graph.com**: 4-level depth with evidence anchors -- "Exposure" (tutorials) vs "Expert" (teaches, architects, handles edge cases)
- **Workday**: 5-point self-assessment, but "Intermediate" and "Expert" descriptions make the distinction clear
- **Beamery**: Disaggregates the skill itself -- adds seniority context, industry context, duration. Not just "Python" but "Python in fintech at senior level for 8 years"

**Key Insight**: The problem is not the scale (4 levels vs 7 levels). The problem is what COUNTS as evidence at each level. Without evidence anchors, any scale degrades to self-declaration.

---

## 4. How They Visualize

### Visualization Approaches

| Type | Used By | Strengths | Weaknesses |
|------|---------|-----------|------------|
| **Radar/Spider Chart** | Uxcel, NN/g skill maps, team competency tools | Immediate shape recognition, strengths/weaknesses visible at glance | Limited to ~8-12 axes before unreadable. Poor for large skill sets. No hierarchy |
| **Bubble Chart** | Skills Base competency analysis | Size=count, position=level. Good for team overview | Poor for individual deep-dive. No relationships shown |
| **Network/Graph** | skill-graph.com, LinkedIn (internal), Beamery (internal) | Shows relationships, prerequisites, clusters. Most information-dense | Complex UX, can overwhelm users. Needs good layout algorithm |
| **Matrix/Grid** | NN/g skill mapping, Figma templates | Clear, tabular, easy to compare across people | Static, no relationships, no depth beyond column values |
| **Bar/Progress Bars** | Most resume builders, Workday | Simple, familiar, works at any scale | Oversimplifies depth. "75% Python" is meaningless without context |
| **Skill Tree** | Gaming (not found in HR tools) | Shows progression paths, prerequisites | Too linear for real career complexity |
| **Timeline** | Career progression tools | Shows growth over time | Doesn't show breadth or relationships |

### What's Interactive vs Static

- **Interactive**: skill-graph.com (clickable nodes, expandable evidence), Uxcel (hover for details), NN/g skill maps (team collaboration on shared maps)
- **Mostly Static**: LinkedIn skill section, resume builders (Rezi, Teal, Kickresume -- skill bars and keyword lists)
- **Enterprise Internal Only**: Workday, Eightfold, Beamery -- rich visualizations but locked behind enterprise dashboards

### Career Progression Over Time

- **Eightfold**: Uses 1.6 billion career trajectories to predict future skill development. Shows "what's next" based on people with similar trajectories
- **Phenom**: Graph algorithms identify career path options and progression
- **SFIA**: Career progression modeled explicitly through 7 levels -- you can map yourself today and see what's needed for next level
- **Nobody does this well for individuals**: Most tools show a snapshot, not a timeline. skill-graph.com mentions "compounds over time" but implementation details unclear

---

## 5. Critical Design Questions for JobLoop AI

### How Should Certifications Rank vs Core Skills?

**Research synthesis**: Certifications are VALIDATORS, not skills themselves. The industry consensus (from TalentGuard, CompTIA, SFIA):

- **Certifications validate competency at a point in time** -- "FCPS in Anesthesiology" proves you passed rigorous examination in anesthesiology, but it's NOT a separate skill from anesthesiology
- **Certifications follow progression hierarchies**: CompTIA Core → Infrastructure → Cybersecurity. MBBS → FCPS → Fellowship. These are progression markers, not independent skills
- **Certifications should be LINKED to the skills they validate**, not listed as separate nodes

**Recommendation for JobLoop**:
```
Professional Identity: "Anesthesiology Consultant"
  └── Core Skill: "Anesthesiology" (Expert depth)
       ├── Validated by: FCPS (2018)
       ├── Validated by: MBBS (2010)
       └── Evidence: 12 years clinical practice, 5000+ cases
  └── Supporting Skill: "Regional Anesthesia" (Proficient)
       └── Evidence: Fellowship training, 2 published papers
  └── Differentiator Cert: "Heart Saver" (from AHA)
       └── Links to: "Emergency Response" (Working depth)
```

Heart Saver is a DIFFERENTIATOR -- it doesn't define the profession but shows additional capability. FCPS DEFINES the profession -- it's evidence for the core identity, not a standalone item.

### How to Distinguish Identity vs Skills?

Based on the research, a three-layer model:

1. **Identity Layer** (WHO you are): Professional title + specialization + career stage. This is the TOP of the hierarchy. "Consultant Anesthesiologist" or "Senior Backend Engineer". This is NOT a skill -- it's the integration of skills, experience, and credentials into a professional identity.

2. **Skill Layer** (WHAT you can do): Atomic capabilities grouped by domain. Each with depth level and evidence. This is where matching happens against JD requirements.

3. **Credential Layer** (WHAT proves it): Certifications, degrees, licenses. These ATTACH to skills as validation evidence, not as separate top-level entities.

**No competitor does this.** LinkedIn treats everything as flat skills. Workday groups by role but doesn't model identity. This is a genuine differentiator for JobLoop.

### How to Handle Professional Hierarchies?

MBBS → FCPS → Consultant is a PROGRESSION, not 3 separate items:

- **MBBS** = foundational qualification (Exposure/Working level in clinical medicine)
- **FCPS** = specialization validation (Proficient/Expert level in anesthesiology)
- **Consultant** = professional identity (integrates all of the above)

Model as: A CAREER ARC that shows progression over time. Each step builds on the previous. The Cloud should show the current identity prominently, with the progression path visible but secondary.

**How SFIA handles this**: Levels 1-7 are explicitly about progression. Level 2 (Assist) → Level 4 (Enable) → Level 6 (Initiate/Influence). Each level subsumes the previous.

**How CompTIA handles this**: Certification paths are explicitly sequential. Core → Infrastructure → Cybersecurity. You build incrementally.

---

## 6. What Makes a Skill Graph USEFUL for Job Matching

### How It Connects to JD Requirements

The research reveals a clear evolution in matching approaches (2024-2025):

1. **Keyword Matching** (Rezi, most resume builders): Exact string match. "Python" in JD, "Python" on resume. Simple, fast, misses semantic similarity. Teal scored only 78% match rate vs Jobscan's 87% because it suggested irrelevant keywords.

2. **Semantic Matching** (SkillSync, Resume2Vec, newer tools): Uses BERT/sentence embeddings. "Machine Learning" matches "ML". "AWS Lambda" matches "Serverless Computing". Much better but still treats skills as flat list.

3. **Graph-Based Matching** (academic, 2025): Graph Neural Networks construct bipartite graphs connecting candidates to jobs through skill nodes. Edge weights from embedding similarity. Can reason about adjacent/transferable skills.

4. **Gap Analysis** (emerging standard): Not just "do you match?" but "what's missing and how big is the gap?" SkillSync provides explainable gap analysis with upskilling suggestions.

### How Evidence Quality Matters

**Critical finding**: No consumer resume tool differentiates evidence quality. They all treat skills as binary or keyword-density.

Enterprise platforms (Beamery, Workday) track evidence SOURCE but not evidence QUALITY:
- Beamery records: HRIS, ATS, JD as sources
- Workday: self-rated vs peer-rated
- Degreed: self vs manager vs verified partner assessment

**What's missing in the market** (and where JobLoop can differentiate):
- "Used Python in production for 10 years at 3 companies" > "Completed Python tutorial"
- "Published 2 papers on regional anesthesia" > "Self-declared regional anesthesia skill"
- Evidence from OUTCOMES (hired, promoted, published) > evidence from INPUTS (courses, tutorials)

### How Resume Builders Model Skills

| Tool | Skill Model | JD Matching | Evidence? |
|------|-------------|-------------|-----------|
| **Rezi** | Keyword list + real-time ATS score | Keyword scanning against JD | No -- just keyword density |
| **Teal** | Keyword scanner + match score | Highlights missing keywords from JD | No -- just keyword presence |
| **Kickresume** | Template-based skill sections | Basic keyword matching | No |
| **Jobscan** | Keyword density analysis | Most detailed JD comparison (87% accuracy in tests) | No -- pure keyword optimization |
| **Resume Optimizer Pro** | JD-specific tailoring | Reads JD and adjusts content | No |
| **FastApply** | AI rewrite per JD | Full content tailoring | No |

**Key Finding**: ZERO consumer resume tools model skills as a graph. ZERO use evidence quality. ZERO distinguish identity from skills. They're all keyword optimizers with varying sophistication.

---

## 7. Summary: What JobLoop Should Take From This Research

### Validated by Industry Research
1. **Skills are nodes in a graph, not a flat list** -- LinkedIn, Beamery, ESCO, skill-graph.com all confirm this
2. **Skills need relationships** -- hierarchy (parent/child), adjacency (co-occurrence), prerequisite (dependency), transfer (portability)
3. **Proficiency needs evidence, not just numbers** -- SFIA, skill-graph.com, and the federal government's move away from self-declaration all confirm this
4. **Certifications are validators, not skills** -- they attach to skills as evidence, not as standalone entities
5. **Skills should be disaggregated** -- Beamery explicitly argues for context (industry, seniority, duration) attached to each skill instance

### NOT Validated / Gaps in Industry
1. **Nobody models professional identity separately from skills** -- this is a genuine gap JobLoop can fill
2. **Nobody tracks evidence quality** at the consumer level -- all resume builders treat skills as binary
3. **Nobody shows career progression as a timeline** integrated with a skill graph -- it's always snapshot-only
4. **Nobody connects outcome data back to skill evidence** -- JobLoop's Outcome Intelligence is genuinely novel

### Recommended Data Model for JobLoop Cloud

```
ProfileCloud {
  identity: {
    profession: string          // "Anesthesiology Consultant"
    specialization: string      // "Cardiac Anesthesia"
    career_stage: string        // "Senior Specialist" (from persona)
    country: string             // "Pakistan"
    career_span_years: number   // 12
  }

  domains: [{                   // 3-6 domain clusters
    name: string                // "Clinical Anesthesia"
    skills: [{
      name: string              // "General Anesthesia"
      depth: enum               // Exposure | Working | Proficient | Expert
      evidence: [{
        type: string            // "role" | "certification" | "publication" | "project" | "outcome"
        description: string     // "5000+ cases at Aga Khan University Hospital"
        source: string          // "cv_upload" | "socratic" | "outcome_signal"
        quality_tier: number    // 1-4 (AI-inferred → Socratic-enriched → cert-verified → outcome-correlated)
        recency: string         // "2014-2026"
      }]
      certifications: [{        // Validators, not separate skills
        name: string            // "FCPS"
        issuer: string          // "CPSP"
        year: number            // 2018
      }]
      relationships: [{
        target_skill: string    // "Regional Anesthesia"
        type: string            // "adjacent" | "prerequisite" | "parent" | "child"
      }]
    }]
  }]

  career_arc: [{                // Progression timeline
    role: string                // "Registrar"
    employer: string            // "Aga Khan"
    period: string              // "2014-2018"
    skills_demonstrated: string[] // ["General Anesthesia", "ICU Management"]
  }]

  differentiators: [{           // Certs that don't define profession but add value
    name: string                // "Heart Saver"
    issuer: string              // "AHA"
    linked_skills: string[]     // ["Emergency Response", "BLS"]
  }]
}
```

### Visualization Recommendation

Based on what works and what doesn't in the research:

1. **NOT radar chart** -- limited to ~8 axes, doesn't show relationships, oversimplifies. Fine for team overview, poor for individual deep-dive.
2. **NOT progress bars** -- "75% Python" is meaningless without context. Every resume builder does this.
3. **CONSIDER network graph** -- most information-dense, shows relationships and clusters. But needs excellent UX to avoid overwhelming users. skill-graph.com does this.
4. **CONSIDER domain-grouped cards with expandable evidence** -- each domain is a cluster, each skill within it shows depth + evidence chain. Click to expand. This is more accessible than a network graph.
5. **ADD career arc timeline** -- nobody does this well. Show the progression from MBBS → FCPS → Consultant with skills accumulating over time. This would be the "gasp moment."

**The gasp moment** = seeing your entire professional life not as a resume but as a living landscape: your identity at the center, domains radiating out, skills within each domain showing depth through evidence, career progression flowing as a timeline, and gaps visible where JD requirements aren't met. No competitor offers this.

---

## Sources

- [LinkedIn Engineering - Building Skills Taxonomy](https://www.linkedin.com/blog/engineering/data/building-maintaining-the-skills-taxonomy-that-powers-linkedins-skills-graph)
- [LinkedIn Engineering - Skills Extraction](https://www.linkedin.com/blog/engineering/skills-graph/extracting-skills-from-content)
- [LinkedIn Engineering - Building Skills Graph](https://www.linkedin.com/blog/engineering/skills-graph/building-linkedin-s-skills-graph-to-power-a-skills-first-world)
- [Linked Data Orchestration - LinkedIn Skills Graph Analysis](https://linkeddataorchestration.com/2023/12/13/how-linkedin-is-moving-towards-a-skills-based-economy-with-the-skills-graph/)
- [Workday Skills Cloud Product Page](https://www.workday.com/en-us/products/human-capital-management/skills-cloud.html)
- [Workday Engineering - Skill Inference (Medium)](https://medium.com/workday-engineering/skill-inference-building-an-llm-based-service-in-the-workday-skills-cloud-47c9cce9f7bd)
- [Josh Bersin - Workday Skills Cloud](https://joshbersin.com/2020/01/workday-skills-cloud-a-big-idea-with-much-more-to-come/)
- [Workday - Next-Generation Skills Technology](https://blog.workday.com/en-us/2022/how-workday-delivering-next-generation-skills-technology-scale.html)
- [Eightfold.ai - Talent Intelligence Platform](https://eightfold.ai/products/)
- [Knowlee - AI Talent Intelligence (Eightfold, Beamery, Gloat)](https://www.knowlee.ai/blog/ai-talent-intelligence)
- [Eightfold - Skills and AI in Talent Management](https://eightfold.ai/blog/skills-ai-talent-management/)
- [Beamery Part 1 - Representing Skills (Medium)](https://medium.com/hacking-talent/skills-beamery-part-1-representing-skills-for-today-and-the-unknown-of-tomorrow-d87e114771a3)
- [Beamery Part 2 - Disaggregating Skills (Medium)](https://medium.com/hacking-talent/skills-beamery-part-2-disaggregating-a-skill-72fa4f4d1cfa)
- [Beamery - Talent Graph and AI](https://beamery.com/talent-graph-and-ai/)
- [Beamery - Job Architectures Launch (PR)](https://www.prnewswire.com/news-releases/beamery-unveils-job-architectures-powered-by-skills-intelligence-to-help-businesses-close-critical-skills-gaps-faster-302383648.html)
- [Phenom - AI and Skills Ontologies](https://www.phenom.com/blog/ai-skills-ontologies-for-talent-management)
- [Phenom - Demystifying Skill Ontologies](https://www.phenom.com/blog/demystifying-skill-ontologies)
- [Degreed - Skills Platform](https://degreed.com/experience/skills/)
- [Degreed - Skill Certification](https://www.gettingsmart.com/2017/09/10/measure-verify-and-signal-any-skill-with-degreeds-new-skill-certification/)
- [Degreed - Skill Validation Partners](https://degreed.com/experience/blog/improve-talent-decisions-with-our-skill-validation-partners-2/)
- [skill-graph.com - What Is a Skill Graph](https://skill-graph.com/docs/what-is-a-skill-graph)
- [SFIA 9 - How SFIA Works](https://sfia-online.org/en/about-sfia/how-sfia-works)
- [SFIA 9 Home](https://sfia-online.org/en/sfia-9)
- [SFIA NZ - Knowledge, Skill and Competency](https://help.sfia.nz/hc/en-nz/articles/4407220198553-Knowledge-Skill-and-Competency)
- [O*NET Content Model](https://www.onetcenter.org/content.html)
- [O*NET Scales and Ratings](https://www.onetonline.org/help/online/scales)
- [ESCO Classification](https://esco.ec.europa.eu/en/classification)
- [ESCO Skills Pillar](https://esco.ec.europa.eu/en/classification/skill_main)
- [ESCO Ontology Data Model](https://data.europa.eu/esco/model)
- [ESCO Skill-Occupation Matrix Tables](https://esco.ec.europa.eu/en/about-esco/data-science-and-esco/esco-skill-occupation-matrix-tables-linking-occupation-and-skill-groups)
- [NN/g - Skill Mapping](https://www.nngroup.com/articles/skill-mapping/)
- [Uxcel - Skill Graph 2.0](https://uxcel.com/blog/skill-graph-2-0)
- [Skills Base - Competency Analysis](https://support.skills-base.com/kb/articles/11000070657-competency-analysis-report)
- [TestGorilla - State of Skills-Based Hiring 2024](https://www.testgorilla.com/skills-based-hiring/state-of-skills-based-hiring-2024/)
- [TalentGuard - Mapping Certifications to Skills](https://www.talentguard.com/blog/mapping-employee-certifications-skills-proficiency-levels-cant-overlooked)
- [365Talents - Skills Taxonomy Guide](https://365talents.com/en/resources/your-comprehensive-guide-to-skills-taxonomy/)
- [FastApply - How to Tailor Resume with AI 2026](https://blog.fastapply.co/how-to-tailor-your-resume-with-ai-in-2026)
- [ToolNavs - AI Resume Tool Comparison](https://toolnavs.com/en/article/1408-how-to-choose-an-ai-resume-tool-rezi-teal-kickresume-jobscan-who-is-better-for-y)
- [Rezi - Best AI Resume Builders 2026](https://www.rezi.ai/posts/best-ai-resume-builders)
- [GNN for Candidate-Job Matching (Springer, 2025)](https://link.springer.com/article/10.1007/s41019-025-00293-y)
- [SkillSync - Explainable AI Framework (IJERT)](https://www.ijert.org/skillsync-an-explainable-ai-framework-for-resume-evaluation-skill-gap-analysis-and-career-alignment-ijertconv14is010027)
- [Microsoft Applied Skills](https://techcommunity.microsoft.com/blog/skills-hub-blog/announcing-microsoft-applied-skills-the-new-credentials-to-verify-in-demand-tech/3775645)
- [Federal Skills-Based Hiring (OPM)](https://federalnewsnetwork.com/hiring-retention/2024/04/wh-aims-to-transition-nearly-100k-federal-it-jobs-to-skills-based-hiring/)
