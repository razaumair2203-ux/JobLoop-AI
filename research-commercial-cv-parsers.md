# Commercial CV/Resume Parser Research (May 2026)

**Purpose**: Honest assessment of what the best commercial parsers ACTUALLY do, versus what JobLoop AI is building. No marketing fluff.

**Method**: Web searches of developer docs, API references, engineering blogs, product announcements, and third-party reviews. Where I could not verify a claim, I say so.

---

## 1. Textkernel (formerly Sovren)

**What they are**: The 800-pound gorilla. 60%+ of global HR Tech uses their parser. 2 billion docs/year. Founded 1996 (as Sovren), acquired by Textkernel.

### Actual Pipeline
```
Upload (PDF/DOCX/HTML/etc, 29 languages)
  -> Text extraction (in-memory, nothing stored to disk)
  -> NER + ML extraction (proprietary models)
  -> Skills normalization against Textkernel taxonomy (V2)
  -> Optional: LLM Parser layer (GPT-3.5 powered, per-request)
  -> Output: structured JSON or HR-XML
```

### What They Actually Extract (Verified from Developer Docs)
- **Skills with depth data**: YES. Each skill gets:
  - `Years` -- duration of skill usage calculated from work history
  - `LastUsed` -- YYYY-MM-DD inferred from work history (or `__NOWSTRING__` if current)
  - `FoundIn` -- comma-separated list of Work History item IDs (e.g., `exp_3, edu_2`) showing WHERE the skill was found
  - `percentOfOverall` -- skill's weight relative to total profile
  - `totalMonths` -- total months of experience with that skill
- **Skills taxonomy**: 4 categories (Professional, Soft, IT, Languages). Hierarchical: TaxonomyRoot > subtaxonomies > individual skills
- **Language proficiency**: normalized to Textkernel Language Skill Level classification (`LevelCode`, `LevelDescription`)
- **Skills Intelligence API** (separate product): Extract, normalize, suggest skills. Returns `confidence`, `matches` (with `begin_span`, `end_span`, `likelihood`, `surface_form`). Can translate proficiency levels [1-5] into weights [0.2-1.0]

### LLM Parser (launched ~2023-2024)
- Powered by GPT-3.5 + Textkernel proprietary taxonomies
- Per-request opt-in (not default)
- Handles non-standard/niche CVs better than classic parser
- Can generate custom outputs (e.g., interview questions from resume)
- Resume anonymization (flag PII for redaction)
- Claims "remaining errors reduced by up to 30%"

### Critical Assessment Against Our Questions

| Question | Textkernel Answer |
|----------|------------------|
| Multiple CVs from same person? | **NO**. Single-document parser. No merge capability found in docs. |
| Conflict/inconsistency detection? | **NO**. No evidence of any cross-document or intra-document conflict detection. |
| Persistent skill profile? | **NO**. Stateless -- parses in-memory, returns JSON, forgets. Profile persistence is the ATS's job. |
| Socratic/interactive enrichment? | **NO**. Zero interactivity. One-shot parse. |
| Evidence-based skill depth? | **PARTIAL**. `FoundIn` links skills to work history items. `totalMonths` and `LastUsed` provide temporal depth. But NO qualitative depth (no "led team of 50" vs "mentioned in skills section" distinction). |
| Gates on data quality? | **NO**. Parses whatever you send it. |
| Verifies extracted data against source? | **PARTIAL**. `FoundIn` traces skills back to source sections. Skills Intelligence API returns `surface_form` (the actual text found). But no explicit "this extraction is uncertain" flag beyond confidence scores. |

### Bottom Line
Textkernel is the closest to what we're building in ONE dimension: the `FoundIn` field + `totalMonths` + `LastUsed` is genuinely evidence-linked skill depth. They can tell you "Python was found in exp_3 and exp_5, used for 48 months, last used 2025-03-01." That's real. But it's purely temporal/positional evidence -- not qualitative. They don't distinguish "architected Python microservices serving 10M users" from "Python listed in skills section." And they have ZERO multi-document, ZERO conflict detection, ZERO interactive enrichment.

---

## 2. Daxtra

**What they are**: Enterprise parser, 100M+ CVs/month, 400+ ATS integrations. Cloud or on-premise.

### Actual Pipeline
```
Upload (DOC/DOCX/RTF/PDF/HTML/etc)
  -> Text extraction (OCR for images/scanned docs)
  -> NLP + ML extraction (150+ data fields)
  -> Skills mapped to native taxonomy (57 industries, 16,000+ skills, ~100K aliases)
  -> Competency + weighting scoring (context/proximity-based)
  -> Output: structured XML or JSON
  -> Candidate Profile created with unique External ID
```

### What They Actually Extract
- **150+ data fields** across work history, education, skills, certifications, etc.
- **Skills with competency weighting**: Skills receive a "competency and weighting relevant to the context and proximity of the skill found in the extracted text." This means skills mentioned in a job title or primary duties get higher weight than skills in a list.
- **Taxonomy**: 57 industry-specific taxonomies (IT, Finance, Healthcare, Oil & Gas, etc.) with 16,000+ skills expanding to ~100K aliases. Custom taxonomy mapping tools available.
- **~90% estimated accuracy** (their own claim)

### Critical Assessment

| Question | Daxtra Answer |
|----------|--------------|
| Multiple CVs from same person? | **NO**. Single-document parser. Creates one Candidate Profile per parse. |
| Conflict/inconsistency detection? | **NO**. No evidence in any documentation. |
| Persistent skill profile? | **SORT OF**. Creates a "Candidate Profile" with External ID, but this is just the output of one parse stored in Daxtra's DB -- not an evolving profile. |
| Socratic/interactive enrichment? | **NO**. |
| Evidence-based skill depth? | **PARTIAL**. Context/proximity-based competency weighting is interesting -- a skill mentioned as a job title duty gets higher weight than one in a list. But it's an opaque score, not traceable evidence. No `FoundIn` equivalent. |
| Gates on data quality? | **NO**. |
| Verifies extracted data against source? | **NO** evidence of this. |

### Bottom Line
Daxtra's competency/proximity weighting is the one interesting feature -- it's a crude form of "where was this skill mentioned" intelligence. But it's an opaque weight, not linked evidence. Their taxonomy is massive (100K aliases) which is genuinely useful for normalization. No multi-doc, no conflicts, no enrichment.

---

## 3. HireAbility (ALEX Parser)

**What they are**: Pure parser company. ALEX is their main product. 50+ languages.

### Actual Pipeline
```
Upload (Word/PDF/OpenOffice/Excel/HTML/RTF/plain text/social media profiles)
  -> Also accepts: bulk via email/FTP, email body parsing, email attachments
  -> NLP + pattern recognition extraction
  -> Output: HR-XML or JSON
```

### What They Actually Extract
- Standard fields: contact info, work history, education, skills, certifications
- Social media profile parsing (LinkedIn, etc.)
- Bulk processing capability (email/FTP)
- Available on Eden AI as a provider

### Critical Assessment

| Question | HireAbility Answer |
|----------|--------------------|
| Multiple CVs from same person? | **NO**. |
| Conflict/inconsistency detection? | **NO**. |
| Persistent skill profile? | **NO**. |
| Socratic/interactive enrichment? | **NO**. |
| Evidence-based skill depth? | **NO**. Binary skill extraction only (present/absent). |
| Gates on data quality? | **NO**. |
| Verifies extracted data against source? | **NO**. |

### Bottom Line
HireAbility is a competent but undifferentiated parser. No advanced features beyond basic extraction and normalization. Their main value prop is format coverage and language support, not intelligence.

---

## 4. Affinda

**What they are**: Australian AI company. NextGen Resume Parser (v4, launched April 2024). Self-hosted option. API v3.

### Actual Pipeline
```
Upload (any format, 56 languages)
  -> ML extraction (refreshed model in NextGen v4)
  -> 100+ customizable data fields extracted
  -> Skills mapped to pre-built taxonomies (3,000+ soft/hard skills)
  -> Optional: candidate matching, redaction, summarization
  -> Output: JSON via API v3
  -> Self-hosted option: Docker containers, identical API
```

### What They Actually Extract
- **100+ data fields** (customizable -- can add/remove fields)
- **Skills**: mapped to multiple default taxonomies, 3,000+ skills
- **Skill duration**: "number of months using skills" is an output field
- **Language proficiency**: included in output
- **Beyond parsing**: candidate matching (resume-to-JD), resume redaction, summarization
- Claims "up to 50% greater accuracy than competing products" and "95% accuracy across formats" -- unverifiable marketing claims

### Critical Assessment

| Question | Affinda Answer |
|----------|---------------|
| Multiple CVs from same person? | **NO**. Single-document parser. |
| Conflict/inconsistency detection? | **NO**. No evidence in any documentation. |
| Persistent skill profile? | **NO**. Stateless API. |
| Socratic/interactive enrichment? | **NO**. |
| Evidence-based skill depth? | **PARTIAL**. "Number of months using skills" is temporal depth. Skill taxonomy mapping exists. But no `FoundIn` equivalent linking skills to specific roles/evidence. |
| Gates on data quality? | **NO**. |
| Verifies extracted data against source? | **NO** evidence of this. |

### Bottom Line
Affinda is the most modern of the enterprise parsers and has the broadest field extraction (100+ customizable). The self-hosted Docker option is notable for compliance. Their candidate matching feature puts them slightly beyond pure parsing. But fundamentally still single-doc, stateless, no conflict detection, no enrichment.

---

## 5. Eden AI (Aggregator)

**What they are**: API aggregator that wraps multiple resume parsers behind a unified API. Not a parser themselves.

### Available Providers (verified)
- Affinda
- Daxtra
- HireAbility
- Hirize (claims 98% accuracy with GPT-3 + OCR + NLP)
- RChilli
- Superparser
- CV Parser
- SenseLoaf
- Klippa

### How It Works
```
Your App -> Eden AI unified API -> Provider of your choice -> Structured JSON (standardized format)
```
- Same input/output structure regardless of provider
- Can switch providers without code changes
- Standardized response format via Eden AI's matching algorithms

### Their Own Benchmark
- Tested with 40+ resumes across 3 APIs
- Compared: full name, phone, address, education, work experience (description + date), skills
- Finding: "Some providers perform well on basic information but don't retrieve experiences while others perform on experience and education but not on basic information"
- **No provider won across all categories**

### Critical Assessment
Eden AI adds zero intelligence. It's a routing layer. The "best parser" depends on your use case. Their benchmark is tiny (40 resumes). The real value is vendor-switching flexibility, not parsing quality. None of the aggregated parsers have multi-doc merge, conflict detection, or enrichment.

---

## 6. ATS Platforms (Lever / Greenhouse / Workday)

### Greenhouse

**Parser Architecture** (verified from support docs):
```
Upload (PDF/DOCX)
  -> Native PDF/DOCX text extraction
  -> NER pipeline (contact, work history, education, skills)
  -> Series of fine-tuned LLMs (each trained for specific extraction task)
  -> Embedding generation for skills and job titles (semantic search)
  -> Talent Matching: AI scoring against job requirements
  -> Output: structured candidate profile + semantic index
```

**Notable**: Greenhouse uses **multiple fine-tuned LLM models**, each specialized for one extraction task (skills, job titles, dates, companies). Not one big model. Also uses third-party models (OpenAI). Talent Matching generates a ranking but is explicitly a "decision-support tool, not a decision-making tool." Does NOT use names/contact info in matching (bias mitigation). Recruiter primarily reads the uploaded PDF -- parsed profile is secondary.

### Lever

**Parser Architecture**:
```
Upload
  -> AI-driven extraction (5 field groups: contact, current role, work history, education, full-text index)
  -> Full-text indexing for search
  -> Gem AI layer (from acquisition): semantic matching + historical pipeline signals
  -> Output: structured candidate card (primary artifact) + original PDF (secondary)
```

**Notable**: Lever is unique in that the **parsed profile is the primary artifact** recruiters see, not the PDF. Claims 90%+ parsing accuracy. Gem acquisition brought semantic understanding -- "software engineer" matches "web developer." Less keyword-dependent than competitors.

### Workday

**Parser Architecture**:
```
Upload (Quick Apply / Prospect form)
  -> Resume parsing (enterprise-grade, integrated with HCM)
  -> Skills Cloud ontology mapping (73,000+ standardized skills)
  -> Illuminate AI: semantic skills matching against job requirements
  -> Spotlight: letter grades (A-D) for candidate-job match
  -> Parsed data pre-fills application form (candidate sees it)
```

**Notable**: Workday is the most advanced ATS in terms of skill intelligence:
- **Skills Cloud**: 73,000+ skills with graph-based relational mapping. ML-maintained. Not just a list -- skills are related to each other.
- **Illuminate AI** (launched Sept 2024, expanded 2025): AI agents for recruiting, semantic matching ("meaning behind the words, not keywords")
- **Candidate grading**: A-D letter grades based on resume-job match
- When candidate uploads resume, system suggests skills from Skills Cloud ontology (exact + related matches)
- Tightly integrated with HCM -- parsed data flows through recruiting to onboarding

### ATS Critical Assessment

| Question | Greenhouse | Lever | Workday |
|----------|-----------|-------|---------|
| Multiple CVs from same person? | NO | NO | NO |
| Conflict detection? | NO | NO | NO |
| Persistent skill profile? | NO (per-application) | NO (per-application) | PARTIAL (Skills Cloud persists for employees, not candidates) |
| Socratic/interactive enrichment? | NO | NO | NO |
| Evidence-based skill depth? | NO (binary extraction + semantic matching) | NO (semantic relevance only) | PARTIAL (Skills Cloud has relational depth, but for employees not candidates) |
| Gates on data quality? | NO | NO | NO |
| Source verification? | NO | NO | NO |

---

## 7. Bonus: RChilli (Worth Noting)

RChilli deserves mention because they have some features others don't:
- **Skill Proficiency Levels**: Actually calculates proficiency levels per skill (not just present/absent)
- **Taxonomy 3.0**: Enriches skills with standardized proficiency indicators, synonyms, domain/subdomain categorization
- **Skill Gap Detection Plugin API**: AI-driven analysis comparing candidate skills vs job requirements, highlighting missing skills using job zones and industry standards
- **LLM Parser (Beta)**: Recently launched
- **skillProficiencyWeight**: Match scoring adjusts based on proficiency levels

Still no multi-doc, no conflict detection, no Socratic enrichment. But closer to skill depth than most.

---

## Summary Matrix

| Capability | Textkernel | Daxtra | HireAbility | Affinda | Greenhouse | Lever | Workday | RChilli | **JobLoop AI** |
|------------|-----------|--------|-------------|---------|-----------|-------|---------|---------|---------------|
| Multi-CV merge | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Conflict detection | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Persistent profile | NO | NO | NO | NO | NO | NO | Partial* | NO | **YES (Cloud)** |
| Socratic enrichment | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Skill depth (temporal) | YES | Partial | NO | Partial | NO | NO | Partial* | YES | **YES** |
| Skill depth (qualitative) | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Evidence linking | YES (`FoundIn`) | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Data quality gating | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| Source text verification | Partial | NO | NO | NO | NO | NO | NO | NO | **YES (planned)** |
| Skill taxonomy | 4 cats, V2 | 57 industries, 100K aliases | Basic | 3K+ skills | Semantic embeddings | Semantic (Gem) | 73K skills, graph | Domain/subdomain | ESCO-inspired |
| LLM integration | GPT-3.5 (optional) | NO | NO | Custom ML | Fine-tuned LLMs | Gem AI | Illuminate AI | LLM (beta) | Claude (maturity-driven) |

*Workday Skills Cloud persists for employees within HCM, not for external candidates during application.

---

## Key Findings

### What Textkernel Does That's Actually Good
The `FoundIn` field is the only real evidence-linking mechanism in any commercial parser. It tells you "this skill was found in work experience #3 and education #2." Combined with `totalMonths` and `LastUsed`, it gives genuine temporal + positional skill depth. This is the closest thing to what we're building -- and it's been available for years. We should acknowledge this honestly.

### What Nobody Does (Our Actual Moat)

1. **Multi-CV merge**: ZERO products handle multiple CVs from the same person. Every parser treats each document as independent. This is genuinely uncontested.

2. **Conflict detection**: ZERO products detect inconsistencies (date overlaps, title mismatches, skill contradictions). Not even Textkernel with all their sophistication.

3. **Socratic enrichment**: ZERO products ask follow-up questions. Every parser is one-shot: document in, JSON out, done. No interactivity whatsoever.

4. **Qualitative evidence depth**: Textkernel knows a skill was used for 48 months. We know a skill was used for 48 months AND the person "architected microservices handling 10M daily requests" vs merely "listed Python in skills section." Nobody else distinguishes evidence quality.

5. **Pipeline gating**: ZERO products stop processing when data quality is insufficient. They all parse whatever garbage you send them and return whatever they can extract.

6. **Profile evolution**: ZERO products build a profile that gets smarter over time. Every parse is stateless. Workday's Skills Cloud is the closest concept, but it's for employees, not candidates, and it doesn't evolve from application outcomes.

### What We Should Steal (Honestly)

1. **Textkernel's `FoundIn` pattern**: Linking skills to specific work history items by ID. Our evidence model is richer, but their implementation pattern of referencing source sections by ID is clean.

2. **Daxtra's proximity weighting**: Context-aware skill importance based on WHERE in the document a skill appears (job title > bullet point > skills list). We should formalize this in our depth inference.

3. **Workday's Skills Cloud graph**: 73K skills with relational mapping. Our ESCO-inspired taxonomy should learn from their graph approach -- skills related to each other, not just categorized.

4. **Greenhouse's multi-model architecture**: Fine-tuned LLMs per extraction task instead of one big model. We might benefit from specialized extraction models for different CV sections.

5. **RChilli's skill proficiency levels**: They actually calculate per-skill proficiency. Their methodology is opaque, but the concept of output proficiency levels maps to our depth tiers.

6. **Textkernel's taxonomy scale**: 100K+ aliases (via Daxtra) or multi-version taxonomies. Our current taxonomy is much smaller. At scale we'll need comparable alias coverage.

### Honest Risks

1. **Textkernel could add multi-doc**: They already have `FoundIn` linking. Adding cross-document merge is architecturally straightforward for them. If they decide to serve the candidate-side market (they currently serve employers), they could build what we're building with their existing data model.

2. **Workday could extend Skills Cloud to candidates**: They already have the ontology and the AI. If they made Skills Cloud available during the application process (not just post-hire), it would be similar to our Cloud concept.

3. **Greenhouse's fine-tuned LLMs**: Their multi-model approach is architecturally modern. If they add post-parse intelligence (enrichment, conflict detection), they have the ML infrastructure to do it.

4. **LLM-native parsers are coming**: Textkernel already has GPT-3.5. RChilli has LLM beta. The accuracy gap between traditional ML parsers and LLM-based parsing is closing. Our advantage isn't parsing accuracy -- it's what we do AFTER parsing.

---

## Conclusion for JobLoop AI

The research confirms what we suspected but with important nuances:

**Our genuine moat is NOT parsing** -- Textkernel and Daxtra parse better than we ever will with our regex fallback and Claude-based pipeline. Our moat is the POST-PARSE pipeline: multi-CV merge, conflict detection, Socratic enrichment, evidence-based depth, and the living Cloud that evolves.

**Textkernel's evidence linking is real** -- we are NOT the first to link skills to source evidence. Textkernel does it with `FoundIn`. But we are the first to assign QUALITATIVE depth to that evidence, and the first to BUILD ON IT with interactive enrichment.

**The "nobody does X" claims from our competitive analysis hold up** -- multi-CV merge, conflict detection, Socratic enrichment, and pipeline gating are genuinely uncontested across all 8+ products researched.

**The risk is convergence, not competition** -- these companies could build what we're building. Our advantage is that we're building for candidates, not employers. Enterprise parsers optimize for recruiter workflow, not candidate self-knowledge. That's a market orientation difference, not a technical moat.

---

## Sources

- [Textkernel Parse API v9](https://developer.textkernel.com/tx-platform/v9/resume-parser/api/)
- [Textkernel Parser Output](https://developer.textkernel.com/tx-platform/v9/resume-parser/overview/parser-output/)
- [Textkernel CV/Resume Parsing Data Model](https://developer.textkernel.com/Parser/master/data_model/candidate-data-model/)
- [Textkernel Skills Intelligence API](https://developer.textkernel.com/SkillsIntelligence/master/)
- [Textkernel Extract Skills](https://developer.textkernel.com/SkillsIntelligence/master/skills/v2/extract/)
- [Textkernel Normalize Skills](https://developer.textkernel.com/SkillsIntelligence/master/skills/v2/normalize/)
- [Textkernel LLM Parser](https://www.textkernel.com/solutions/llm-parser/)
- [Textkernel LLM Parser Announcement](https://www.textkernel.com/learn-support/blog/textkernel-introduces-llm-parser/)
- [Textkernel FAQ v10](https://developer.textkernel.com/tx-platform/v10/faq/)
- [Daxtra Resume Parsing Software](https://www.daxtra.com/products/resume-parsing-software/)
- [Daxtra Parser Features](http://cn.daxtra.com/daxtra-parser/the-features.html)
- [Daxtra World Leader Blog](https://info.daxtra.com/blog/daxtra-world-leader-in-cv-resume-parsing)
- [Daxtra Parser Technical Specifications](https://cvxdemo.daxtra.com/cvx/download/Parser%20Technical%20Specifications.pdf)
- [HireAbility ALEX Parser](https://www.hireability.com/products/)
- [Affinda Resume Parser](https://www.affinda.com/resume-parser)
- [Affinda NextGen Launch](https://www.affinda.com/blog/nextgen-resume-parser-launch)
- [Affinda API Docs](https://docs.affinda.com/api-reference/resume-parser/upload-a-resume-for-parsing)
- [Affinda Data Extracted](https://docs.affinda.com/page/data-extracted-by-resume-parser)
- [Eden AI Resume Parser APIs 2025](https://www.edenai.co/post/best-resume-parser-apis)
- [Eden AI Resume Parsing OCR Comparison](https://www.edenai.co/post/resume-parsing-ocr-which-solution-to-choose)
- [Greenhouse Talent Matching FAQ](https://support.greenhouse.io/hc/en-us/articles/41131616864283-Talent-Matching-Data-Processing-FAQ)
- [Greenhouse ATS Resume Guide](https://resumeoptimizerpro.com/blog/greenhouse-ats-resume-guide)
- [Lever ATS Resume Guide](https://resumeoptimizerpro.com/blog/lever-ats-resume-guide)
- [Workday vs Greenhouse vs Lever Parsing Comparison](https://www.hireflow.net/blog/workday-vs-greenhouse-vs-lever-which-parses-best)
- [How Resume Parsers Actually Work](https://resumeoptimizerpro.com/blog/how-resume-parsers-actually-work)
- [Workday Skills Cloud](https://www.workday.com/en-us/products/human-capital-management/skills-cloud.html)
- [Workday Skills Cloud Foundation](https://blog.workday.com/en-us/foundation-workday-skills-cloud.html)
- [Workday Illuminate 2025](https://newsroom.workday.com/2025-09-16-Workday-Illuminate-TM-Expands-with-New-AI-Agents-for-HR,-Finance,-and-Industry)
- [RChilli Skill Proficiency](https://help.rchilli.com/hc/en-us/articles/900005316386-How-is-proficiency-level-calculated-and-captured-for-skills)
- [RChilli Resume Parser](https://www.rchilli.com/solutions/resumeparser)
- [RChilli LLM Parser Launch](https://www.onrec.com/news/launch/rchilli-launches-llm-parser-beta-transforming-resume-parsing-industry)
- [Nesta Skills Taxonomy v2 (using Textkernel data)](https://github.com/nestauk/skills-taxonomy-v2)
