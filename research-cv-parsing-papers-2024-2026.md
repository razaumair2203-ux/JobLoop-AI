# CV/Resume Parsing State of the Art: Academic Papers 2024-2026

**Compiled**: May 6, 2026
**Purpose**: Deep research for JobLoop AI pipeline architecture decisions
**Methodology**: Searched arxiv, Google Scholar, Springer, ACL Anthology, HuggingFace Papers, DeepWiki
**Honesty note**: WebFetch and Bash were denied during research. All details below come from web search snippets, paper abstracts, blog summaries, and repository documentation. Where I could not verify a specific claim from the full paper text, I mark it with [UNVERIFIED FROM FULL TEXT]. I did NOT fabricate any details.

---

## 1. Layout-Aware Parsing Meets Efficient LLMs (Alibaba SmartResume)

**Paper**: "Layout-Aware Parsing Meets Efficient LLMs: A Unified, Scalable Framework for Resume Information Extraction and Evaluation"
**ArXiv**: [2510.09722](https://arxiv.org/abs/2510.09722) (October 2025)
**Authors**: Fanwei Zhu, Jinke Yu, Zulong Chen, et al. (Alibaba Group)
**Code**: [github.com/alibaba/SmartResume](https://github.com/alibaba/SmartResume) | [HuggingFace](https://huggingface.co/Alibaba-EI/SmartResume)
**Deployed**: Alibaba Group's intelligent HR platform (production, real-time parsing)

### Pipeline Architecture (3 stages, not 4)

**Stage 1: Layout-Aware Parsing and Regeneration**
- Hybrid content fusion: integrates PDF metadata extraction AND OCR
- Fine-tuned YOLOv10 for layout detection: ~500 resumes annotated with bounding boxes for major layout segments
- Two-level hierarchical sorting: detected layout segments sorted globally top-to-bottom, left-to-right
- Output: single indexed sequence (line numbers) from complex multi-column layouts
- Layout detection: 92.1% mAP

**Stage 2: Parallelized Instruction-Tuned LLM Extraction**
- Model: Qwen3-0.6B-SFT (fine-tuned, only 600M params)
- Parallelized task decomposition: each extraction task (basic_info, work_experience, education) handled independently with specialized instruction prompts
- **Index-based pointer mechanism** (KEY INNOVATION): Instead of generating verbatim text, the LLM returns line number ranges (e.g., [15, 25]) referencing the indexed text from Stage 1. This transforms complex generation into simple span identification, requiring only a few output tokens
- **Source text verification** (ANTI-HALLUCINATION): During post-processing, returned indices are used to re-extract content directly from the ORIGINAL document. A verification step discards any entity whose key identifying fields cannot be found in the original document text, pruning hallucinations
- Result: 100% content fidelity guaranteed by design (pointer + verification)
- Performance: F1 0.846 for long text (vs 0.136 without SFT), overall 93.1% extraction accuracy
- Beats Claude-4 baseline (F1 0.548 naive) with their full pipeline (F1 0.854)
- 3-4x faster inference than top-tier models

**Stage 3: Two-Stage Automated Evaluation**
- Hungarian algorithm for robust entity alignment (handles variable-order entities)
- Multi-strategy matching logic for field-level comparison
- New benchmark: RealResume dataset

### Post-Processing Details [PARTIALLY VERIFIED]
The paper describes a "rigorous post-processing pipeline" that transforms raw LLM outputs into clean, trustworthy, structured data. Based on search snippets, this includes at minimum:
1. **Index resolution**: Map pointer ranges back to source text
2. **Source text verification**: Discard entities not found in original document
3. **Entity deduplication**: [UNVERIFIED FROM FULL TEXT — inferred from pipeline description]
4. **Field normalization**: [UNVERIFIED FROM FULL TEXT — inferred from pipeline description]

### Assessment Against Our Criteria

| Criterion | Status |
|---|---|
| Multi-document handling | NO — single resume only |
| Conflict detection | NO |
| Skill depth model | NO — flat extraction (name, not depth) |
| Evidence linking | NO — extracts facts, doesn't link skills to evidence |
| Interactive/Socratic enrichment | NO |
| Source text verification | YES — pointer mechanism + verification step |
| Anti-hallucination | YES — architectural (pointer, not generative) |
| Data quality gating | YES — Hungarian algorithm evaluation |

### What's Genuinely Novel
- Pointer mechanism eliminates hallucination BY DESIGN (not by post-hoc checking)
- Tiny model (0.6B) outperforms Claude-4 on this specific task via SFT + pipeline
- Production-deployed at Alibaba scale
- YOLOv10 for resume layout detection is novel application

### What's Incremental
- Layout detection with YOLO is well-established for documents (DocLayNet)
- SFT of small LLMs is standard practice
- Single-document, single-pass — no profile building

### Relevance to JobLoop
**HIGH**. The pointer mechanism is the single most important idea from this survey. Our current pipeline generates text and then checks it. Their approach makes hallucination architecturally impossible for extraction. We should consider: instead of asking Claude to extract and generate skill descriptions, ask it to identify LINE RANGES in the source text, then we extract. This would make our `buildCloudFromParsedCV()` step provably faithful to the source document.

---

## 2. Smart-Hiring: Explainable End-to-End Pipeline

**Paper**: "Smart-Hiring: An Explainable end-to-end Pipeline for CV Information Extraction and Job Matching"
**ArXiv**: [2511.02537](https://arxiv.org/abs/2511.02537) (November 2025)
**Authors**: Kenza Khelkhal, Dihia Lanasri

### Pipeline Architecture

1. **Document Parsing**: Unstructured resume text ingestion
2. **Named Entity Recognition**: Hybrid CNN-BiLSTM-CRF architecture for NER on resumes. Improves generalization to unseen layouts vs pure rule-based or pure transformer approaches
3. **Skill Extraction**: Fuzzy matching against a comprehensive skills lexicon derived from LinkedIn. Captures variations ("JS" vs "JavaScript")
4. **Semantic Encoding**: all-MiniLM-L6-v2 (sentence-transformers) encodes skills into shared vector space. Captures semantic similarity ("Linux" and "Ubuntu" recognized as compatible)
5. **Job Matching**: Cosine similarity between candidate and job description embeddings in shared vector space
6. **Explainability Layer**: Highlights most influential factors (matching skills, experience, qualifications) for each recommendation

### Assessment Against Our Criteria

| Criterion | Status |
|---|---|
| Multi-document handling | NO |
| Conflict detection | NO |
| Skill depth model | NO — binary (has skill or not) |
| Evidence linking | NO — skills extracted but not linked to roles/duration/impact |
| Interactive/Socratic enrichment | NO |
| Source text verification | NO |
| Anti-hallucination | N/A (NER-based, not generative) |
| Data quality gating | NO explicit gating |

### What's Genuinely Novel
- Hybrid CNN-BiLSTM-CRF for resume NER (combines CNN character features, BiLSTM context, CRF sequence constraints)
- Fuzzy skill matching against LinkedIn-derived lexicon
- Explainability as first-class design principle (not bolted on)

### What's Incremental
- BiLSTM-CRF for NER is well-established (Lample et al., 2016)
- Sentence-transformer matching is standard
- No profile building, no depth model

### Relevance to JobLoop
**MEDIUM**. The fuzzy skill matching against a real-world lexicon (LinkedIn-derived) is relevant — our alias map (40+ entries) does similar work but manually. Their CNN-BiLSTM-CRF approach is more robust for unseen layouts than pure LLM prompting. The explainability layer aligns with our advocate philosophy. But they don't do anything with skill depth or evidence — they stop at binary "has/doesn't have."

---

## 3. GraphRank Pro+: Knowledge Graphs and Sentiment-Enhanced Skill Profiling

**Paper**: "GraphRank Pro+: Advancing Talent Analytics Through Knowledge Graphs and Sentiment-Enhanced Skill Profiling"
**ArXiv**: [2502.18315](https://arxiv.org/abs/2502.18315) (February 2025, originally SAI 2024)
**Springer**: [LNNS vol. 1018](https://link.springer.com/chapter/10.1007/978-3-031-62269-4_21)
**Authors**: Sirisha Velampalli, Chandrashekar Muniyappa

### Pipeline Architecture

1. **Text Extraction**: Resume text extraction from semi-structured documents
2. **NLP Processing**: Entity extraction using NLP techniques
3. **Knowledge Graph Construction**: Raw resume data transformed into structured Knowledge Graph. Entities (skills, roles, companies, education) become nodes; relationships become edges
4. **Skill Dictionary Construction**: Systematic dictionaries assigning skill weights (method: [UNVERIFIED FROM FULL TEXT] — likely TF-IDF or frequency-based from corpus)
5. **Sentiment-Enhanced Profiling**: Sentiment analysis on resume text to enhance skill profiles (novel idea: detecting enthusiasm/confidence signals around skill mentions)
6. **Query-Based Filtering & Ranking**: Graph querying for candidate ranking

### Assessment Against Our Criteria

| Criterion | Status |
|---|---|
| Multi-document handling | UNCLEAR — likely single document |
| Conflict detection | NO |
| Skill depth model | PARTIAL — skill weights (not levels, but weighted) |
| Evidence linking | PARTIAL — knowledge graph links skills to contexts (edges) |
| Interactive/Socratic enrichment | NO |
| Source text verification | NO |
| Anti-hallucination | N/A (graph construction, not generative) |
| Data quality gating | NO explicit gating |

### What's Genuinely Novel
- Sentiment-enhanced skill profiling: using sentiment analysis around skill mentions to infer confidence/enthusiasm is a genuinely creative idea
- Knowledge graph representation for resumes (graph > flat list)
- Skill weight dictionaries (beyond binary)

### What's Incremental
- Knowledge graphs for talent management exist (LinkedIn's internal systems)
- Graph-based ranking (PageRank variants) is well-established
- The paper is relatively thin on evaluation rigor

### Relevance to JobLoop
**MEDIUM-HIGH**. The knowledge graph approach validates our Cloud architecture — skills as nodes with evidence edges is exactly what our Profile Cloud does. The sentiment analysis idea is interesting but fragile (resume text is typically neutral/formal). The skill weighting approach is different from our depth model (they weight by corpus frequency; we weight by evidence quality). Their graph structure is closer to our architecture than any other paper in this survey.

---

## 4. ResumeFlow: LLM-Facilitated Resume Generation and Refinement

**Paper**: "ResumeFlow: An LLM-facilitated Pipeline for Personalized Resume Generation and Refinement"
**ArXiv**: [2402.06221](https://arxiv.org/abs/2402.06221) (February 2024)
**Published**: SIGIR 2024, Washington DC
**Authors**: Saurabh Bhausaheb Zinjad, Amrita Bhattacharjee, Amey Bhilegaonkar, Huan Liu (Arizona State University)
**Code**: [github.com/Ztrimus/ResumeFlow](https://github.com/Ztrimus/job-llm)
**Demo**: https://job-aligned-resume.streamlit.app

### Pipeline Architecture

1. **Job Description Extraction**: LLM (GPT-4/Gemini) extracts structured requirements from JD
2. **Resume Parsing**: LLM extracts role-specific details from user's resume
3. **Section-Specific Processing**: Personal details extracted WITHOUT LLM modification (factual preservation). Other sections processed with section-specific prompts
4. **Resume Generation**: LLM generates tailored resume content matching JD requirements
5. **Refinement**: Iterative refinement based on alignment metrics
6. **LaTeX Rendering**: Output as formatted PDF via LaTeX templates

### Assessment Against Our Criteria

| Criterion | Status |
|---|---|
| Multi-document handling | NO — single resume + single JD |
| Conflict detection | NO |
| Skill depth model | NO — extraction only |
| Evidence linking | NO |
| Interactive/Socratic enrichment | NO |
| Source text verification | PARTIAL — personal details preserved without LLM modification |
| Anti-hallucination | PARTIAL — task-specific evaluation metrics to control alignment and hallucination |
| Data quality gating | PARTIAL — alignment metrics |

### What's Genuinely Novel
- Section-specific prompt design (different prompts for different resume sections)
- Factual preservation rule: personal details bypass LLM entirely
- Task-specific evaluation metrics for resume quality (alignment + hallucination control)
- End-to-end system with working demo

### What's Incremental
- GPT-4 for resume generation is straightforward application
- LaTeX template rendering is standard
- Single pass, no learning, no profile building

### Relevance to JobLoop
**MEDIUM**. Their factual preservation rule (personal details skip LLM) is exactly right and we should ensure our pipeline does this. Their section-specific prompts align with our approach. But they don't build a persistent profile, don't handle multiple CVs, and don't do evidence-based depth. Their evaluation metrics for hallucination control could inform our AutoResearch scorecard.

---

## 5. Resume Refactorer: Modular LLM-Based System

**Paper**: "Resume Refactorer: A Modular LLM-Based System for Job-Aligned Resume Generation"
**Published**: [Springer LNNS vol. 1874](https://link.springer.com/chapter/10.1007/978-3-032-19681-1_42) (ICTCS 2025 proceedings, published 2026)
**Authors**: Gopika S., B H.C., Devnandan A.D., G V.

### Pipeline Architecture

1. **Resume Ingestion**: User uploads existing resume
2. **Job Description Input**: Target job description provided
3. **RAG-Based Retrieval**: Retrieval-Augmented Generation pulls relevant context
4. **LLM Processing**: Previously LLaMA 3.2 and fine-tuned TinyLlama, faced context handling limitations. Current version uses improved model [UNVERIFIED which specific model]
5. **Modular Toggle Interface**: Users can toggle individual modules on/off
6. **ATS Scoring**: ATS Utilities 3.3.2 calculates ATS compatibility scores
7. **Output**: Optimized resume with cosine similarity and ATS scores

### Assessment Against Our Criteria

| Criterion | Status |
|---|---|
| Multi-document handling | NO |
| Conflict detection | NO |
| Skill depth model | NO |
| Evidence linking | NO |
| Interactive/Socratic enrichment | NO (toggle interface is user control, not enrichment) |
| Source text verification | NO |
| Anti-hallucination | NO explicit mechanism |
| Data quality gating | PARTIAL — ATS score as quality signal |

### What's Genuinely Novel
- Modular toggle interface (user controls which optimization modules apply)
- RAG for resume optimization (retrieves relevant examples/patterns)
- Progression from TinyLlama to larger models documented

### What's Incremental
- ATS scoring is widely available commercially
- Cosine similarity evaluation is standard
- Small-scale evaluation (10 job positions)

### Relevance to JobLoop
**LOW**. This is a relatively straightforward LLM-based resume optimizer. The modular toggle concept is interesting for UX (letting users control what gets optimized) but doesn't advance parsing or profile building. Their ATS scoring approach contradicts our design philosophy (we deliberately avoid opaque ATS scores).

---

## 6. Additional Papers (2024-2026)

### 6a. SRICL: Job Skill Extraction via LLM-Centric Multi-Module Framework

**ArXiv**: [2604.21525](https://arxiv.org/abs/2604.21525) (April 2026)
**Authors**: City University of Hong Kong + Renmin University of China

**Pipeline**: Semantic Retrieval (SR) + In-Context Learning (ICL) + Supervised Fine-Tuning (SFT) + Deterministic Verifier

**Key Innovation**: Addresses the specific failure modes of LLMs in skill extraction:
- Malformed spans (skill text boundaries wrong)
- Boundary drift (extracting too much or too little)
- Hallucinated skills (inventing skills not in text)
- Long-tail term failures (rare/specialized skills missed)

**Verifier**: Deterministic (not LLM-based) — enforces BIO legality, non-overlap, and span pairing with minimal retries.

**ESCO Integration**: Uses ESCO taxonomy definitions as part of format-constrained prompts.

**Evaluation**: 6 public span-labeled corpora, multiple sectors and languages.

**Relevance to JobLoop**: **HIGH**. The deterministic verifier concept directly addresses our no_fabricated_skills scorecard check. Using ESCO definitions in prompts could improve our skill extraction. Their failure mode taxonomy (malformed spans, boundary drift, hallucination, long-tail) is a useful diagnostic framework.

### 6b. Skill-LLM: Repurposing General-Purpose LLMs for Skill Extraction

**ArXiv**: [2410.12052](https://arxiv.org/abs/2410.12052) (October 2024)
**Authors**: AstrumU Inc.
**Code**: [github.com/herandy/Skill-LLM](https://github.com/herandy/Skill-LLM)

**Approach**: Fine-tune a specialized "Skill-LLM" for skill extraction from job descriptions. Outperforms both traditional supervised methods AND LLM zero/few-shot approaches on F1.

**Key Insight**: General-purpose LLMs are mediocre at skill extraction out of the box. Fine-tuning a small model specifically for this task beats much larger models.

**Relevance to JobLoop**: **MEDIUM**. Validates that specialized models beat general ones for skill extraction. But they focus on JDs, not CVs, and don't handle evidence linking.

### 6c. From Text to Talent: Pipeline for Extracting Insights from Candidate Profiles

**ArXiv**: [2503.17438](https://arxiv.org/abs/2503.17438) (March 2025, ITADATA 2024)
**Authors**: Paolo Frazzetto et al.

**Approach**: LLMs + Graph Neural Networks. LLMs extract multifaceted information (soft/hard skills, education, work experience). Represents profiles as multimodal embeddings. Graph similarity measures for candidate-job matching.

**Novel Element**: Addresses multiple vacancies simultaneously (understudied problem).

**Relevance to JobLoop**: **MEDIUM**. The multimodal embedding approach is interesting for our Cloud representation. Graph similarity for matching is relevant to our JD analysis.

### 6d. AI Hiring with LLMs: Multi-Agent Framework for Resume Screening

**ArXiv**: [2504.02870](https://arxiv.org/abs/2504.02870) (April 2025, CVPR 2025 Workshop)
**Authors**: Frank P.-W. Lo et al.

**Architecture**: 4 agents — Resume Extractor, Evaluator, Summarizer, Score Formatter. RAG integration within evaluator for external knowledge (certifications, university rankings, company hiring criteria).

**Relevance to JobLoop**: **LOW-MEDIUM**. Multi-agent approach is over-engineered for our use case. RAG for external knowledge enrichment is interesting but we handle this via Socratic questions instead.

### 6e. AI-Driven Decision-Making System for Hiring Process

**ArXiv**: [2512.20652](https://arxiv.org/abs/2512.20652) (December 2025)
**Authors**: Vira Filatova, Andrii Zelenchuk, Dmytro Filatov

**Architecture**: Modular multi-agent hiring assistant with:
1. Document + video preprocessing
2. **Structured candidate profile construction** (closest to our Cloud concept)
3. **Public-data verification** (checks claims against public sources)
4. Technical/culture-fit scoring with explicit risk penalties
5. Human-in-the-loop validation via interactive interface

**Novel Elements**:
- Public-data verification is genuinely novel (cross-references resume claims)
- Risk penalty system (explicit negative signals)
- Configurable aggregation (hiring manager controls weights)
- Evaluated on 64 real applicants

**Relevance to JobLoop**: **MEDIUM-HIGH**. Profile construction + public verification is the closest any paper gets to our Cloud + conflict detection approach. Their human-in-the-loop validation aligns with our Socratic philosophy. The risk penalty approach could inform our gap detection.

### 6f. Multi-Granularity Multi-Modal Pre-Training for Resume Understanding

**ArXiv**: [2404.13067](https://arxiv.org/abs/2404.13067) (April 2024, ICME 2024)
**Authors**: Feihu Jiang et al.

**Key Insight**: Resume information is hierarchical (document > section > field > value). Existing approaches ignore this hierarchy.

**Approach**: Layout-aware multi-modal fusion transformer encoding resume segments with integrated textual, visual, and layout information. Three self-supervised pre-training tasks on unlabeled resumes. Fine-tuned with multi-granularity sequence labeling.

**Relevance to JobLoop**: **MEDIUM**. The hierarchical insight is correct and validates our domain > category > skill > evidence hierarchy. Pre-training on unlabeled resumes is interesting for future model fine-tuning.

### 6g. Let's Get You Hired: Job Seeker's Perspective on Multi-Agent Recruitment

**ArXiv**: [2505.20312](https://arxiv.org/abs/2505.20312) (May 2025)
**Authors**: Aditya Bhattacharya, Katrien Verbert (KU Leuven)

**Focus**: Unique — written from JOB SEEKER perspective (not recruiter). Multi-agent system that explains hiring decisions to candidates.

**User Study**: 20 active job seekers, qualitative interviews. System perceived as more actionable, trustworthy, and fair vs traditional methods.

**Relevance to JobLoop**: **HIGH for philosophy, LOW for tech**. This validates our advocate framing. The finding that explanation = trust = fairness is exactly our design thesis. But the technical contribution is thin.

### 6h. CareerBERT: Matching Resumes to ESCO Jobs

**ArXiv**: [2503.02056](https://arxiv.org/abs/2503.02056) (March 2025)

**Approach**: Fine-tunes BERT for resume-to-ESCO-job matching in a shared embedding space. Uses ESCO taxonomy data + EURES job advertisements as training corpus.

**Relevance to JobLoop**: **MEDIUM**. ESCO integration is relevant to our taxonomy engine. Shared embedding space approach could improve our JD matching.

### 6i. Enhancing Job Matching: ESCO and EQF Taxonomy Linking

**ArXiv**: [2512.03195](https://arxiv.org/abs/2512.03195) (December 2025)

**Contribution**: Evaluation framework + 3 novel datasets for occupation linking, qualification linking, and occupation title similarity against ESCO and EQF taxonomies.

**Relevance to JobLoop**: **MEDIUM**. The datasets could be useful for evaluating our taxonomy engine. ESCO/EQF alignment is a future consideration.

---

## Comparative Matrix: All Papers vs JobLoop Requirements

| Paper | Multi-Doc | Conflict Detection | Skill Depth | Evidence Linking | Socratic | Source Verification | Anti-Hallucination | Quality Gate |
|---|---|---|---|---|---|---|---|---|
| SmartResume (2510.09722) | NO | NO | NO | NO | NO | **YES** | **YES (pointer)** | YES |
| Smart-Hiring (2511.02537) | NO | NO | NO | NO | NO | NO | N/A (NER) | NO |
| GraphRank Pro+ (2502.18315) | UNCLEAR | NO | PARTIAL (weights) | PARTIAL (graph) | NO | NO | N/A (graph) | NO |
| ResumeFlow (2402.06221) | NO | NO | NO | NO | NO | PARTIAL | PARTIAL | PARTIAL |
| Resume Refactorer (Springer) | NO | NO | NO | NO | NO | NO | NO | PARTIAL |
| SRICL (2604.21525) | NO | NO | NO | NO | NO | NO | **YES (verifier)** | YES |
| Skill-LLM (2410.12052) | NO | NO | NO | NO | NO | NO | NO | NO |
| Text to Talent (2503.17438) | NO | NO | NO | NO | NO | NO | NO | NO |
| AI Hiring Multi-Agent (2504.02870) | NO | NO | NO | NO | NO | NO | NO | NO |
| AI Decision System (2512.20652) | PARTIAL | NO | NO | PARTIAL (profile) | NO | **YES (public)** | NO | YES |
| Multi-Granularity (2404.13067) | NO | NO | PARTIAL (hierarchy) | NO | NO | NO | NO | NO |
| Let's Get You Hired (2505.20312) | NO | NO | NO | NO | NO | NO | NO | NO |
| **JobLoop AI (ours)** | **YES** | **YES** | **YES (4 levels)** | **YES** | **YES** | **PARTIAL** | **PARTIAL** | **YES** |

---

## Key Takeaways for JobLoop

### 1. We Are Genuinely Unique in Multiple Dimensions
No paper in this survey handles:
- Multi-CV merging with conflict detection
- Evidence-based skill depth (mentioned/applied/proficient/expert)
- Socratic enrichment (interactive follow-up questions)
- Persistent profile building across documents

This is not just competitive advantage — this is genuinely uncharted territory in the academic literature as of May 2026.

### 2. Steal the Pointer Mechanism (SmartResume)
The index-based pointer mechanism from 2510.09722 is the most important technical idea in this survey. Instead of asking the LLM to GENERATE extracted text (which can hallucinate), ask it to POINT to line ranges in the source document, then extract verbatim. This eliminates an entire class of hallucination. Consider retrofitting this into our CV parser pipeline.

### 3. Add a Deterministic Verifier (SRICL)
The deterministic verifier from 2604.21525 that enforces structural validity (BIO legality, non-overlap, span pairing) is simple, cheap ($0), and catches exactly the failure modes we care about: fabricated skills, malformed extractions, boundary drift. We should add a similar post-extraction verification step.

### 4. Sentiment-Enhanced Skill Profiling is Interesting but Fragile (GraphRank Pro+)
The idea of detecting enthusiasm/confidence around skill mentions is creative. But resume text is typically formal/neutral, making sentiment signals unreliable. Worth noting but not worth building.

### 5. Factual Preservation Rule (ResumeFlow)
Personal details (name, phone, address) should NEVER go through LLM processing. ResumeFlow's approach of bypassing the LLM for factual fields is correct and we should ensure our pipeline does this.

### 6. The Academic Field is Focused on Recruiter Tools, Not Job Seeker Tools
Of 12 papers surveyed, only 1 (Let's Get You Hired) takes the job seeker's perspective. The rest are recruiter-side screening/ranking tools. This confirms our market positioning: the job seeker side of this problem is massively under-researched.

### 7. ESCO Integration is Becoming Standard
Multiple papers (SRICL, CareerBERT, 2512.03195) are integrating with ESCO taxonomy. Our custom taxonomy in packages/ai/src/taxonomy.ts should consider ESCO alignment for future interoperability.

### 8. Nobody Does Cross-User Learning (Validates Our Decision)
No paper attempts cross-user aggregate learning from application outcomes. This validates our decision to reject cross-user learning (Simpson's Paradox, bias amplification) in favor of per-user contextual memory.

---

## Action Items for JobLoop Pipeline

1. **INVESTIGATE**: Pointer mechanism for CV parser (source text verification by design)
   - Instead of `parseCV()` generating text, have it return line ranges
   - Extract verbatim from source document
   - Eliminates fabrication risk at extraction stage
   - Estimated effort: Medium (requires indexed source text)

2. **IMPLEMENT**: Deterministic verifier post-extraction
   - Check: extracted skill exists in source text (word boundary match)
   - Check: date ranges are valid and non-overlapping
   - Check: role titles exist in source text
   - Cost: $0 (regex/string matching)
   - Estimated effort: Low

3. **IMPLEMENT**: Factual field bypass
   - Personal details (name, email, phone, address) extracted via regex, NOT LLM
   - Already partially done in our parser but should be hardened
   - Estimated effort: Low

4. **RESEARCH**: ESCO taxonomy alignment
   - Map our custom taxonomy categories to ESCO skill hierarchy
   - Enables future interoperability and benchmark comparison
   - Estimated effort: Medium (ESCO has 13,890 skills)

5. **DOCUMENT**: Our unique contributions in academic framing
   - Multi-document conflict detection
   - Evidence-based 4-level depth model
   - Socratic enrichment loop
   - Per-user application memory (Outcome Intelligence)
   - These are publishable contributions

---

## Sources

- [SmartResume paper](https://arxiv.org/abs/2510.09722)
- [SmartResume GitHub](https://github.com/alibaba/SmartResume)
- [SmartResume HuggingFace](https://huggingface.co/Alibaba-EI/SmartResume)
- [Smart-Hiring paper](https://arxiv.org/abs/2511.02537)
- [GraphRank Pro+ paper](https://arxiv.org/abs/2502.18315)
- [GraphRank Pro+ Springer](https://link.springer.com/chapter/10.1007/978-3-031-62269-4_21)
- [ResumeFlow paper](https://arxiv.org/abs/2402.06221)
- [ResumeFlow SIGIR](https://dl.acm.org/doi/10.1145/3626772.3657680)
- [ResumeFlow GitHub](https://github.com/Ztrimus/job-llm)
- [Resume Refactorer Springer](https://link.springer.com/chapter/10.1007/978-3-032-19681-1_42)
- [SRICL paper](https://arxiv.org/abs/2604.21525)
- [Skill-LLM paper](https://arxiv.org/abs/2410.12052)
- [Skill-LLM GitHub](https://github.com/herandy/Skill-LLM)
- [From Text to Talent](https://arxiv.org/abs/2503.17438)
- [AI Hiring Multi-Agent (CVPR 2025W)](https://arxiv.org/abs/2504.02870)
- [AI Decision System](https://arxiv.org/abs/2512.20652)
- [Multi-Granularity Resume Understanding (ICME 2024)](https://arxiv.org/abs/2404.13067)
- [Let's Get You Hired](https://arxiv.org/abs/2505.20312)
- [CareerBERT](https://arxiv.org/abs/2503.02056)
- [ESCO/EQF Job Matching](https://arxiv.org/abs/2512.03195)
- [SmartResume blog post](https://towardsai.net/p/machine-learning/from-resumespdfs-to-clean-data-layout-aware-parsing-with-tiny-llms)
- [SmartResume DeepWiki](https://deepwiki.com/alibaba/SmartResume/6.1-command-line-interface)
