# Public Resume/CV Datasets — Research & Recommendations

## Date: May 7, 2026

---

## Purpose

Evaluate public datasets that could improve our CV parser accuracy, test diversity, and provide benchmarking data for the pipeline (Steps 0-4: extraction → contact → LLM parse → clean → conflict detect).

---

## Datasets Evaluated

### 1. datasetmaster/resumes (HuggingFace)
- **Size**: 1K-10K records (estimated)
- **License**: MIT
- **Format**: JSON with structured fields (name, email, phone, education, experience, skills, certifications, projects, summary)
- **Quality**: Mix of real and synthetic. Fields map closely to our ParsedCVOutput schema.
- **Utility for us**: MEDIUM. Good for validating our schema coverage. Structured fields let us compare parser output directly. But synthetic data won't catch real-world formatting chaos.

### 2. InferencePrince555/Resume-Dataset (HuggingFace)
- **Size**: 32,481 records
- **License**: Apache 2.0
- **Format**: Instruction-based (input/output pairs for LLM fine-tuning)
- **Quality**: Designed for training resume-writing assistants, not parsing. Each record is a prompt + completion.
- **Utility for us**: LOW for parser testing. Could inform CV generation prompts (Phase 2).

### 3. opensporks/resumes (HuggingFace)
- **Size**: 2,484 records
- **License**: CC0 (public domain)
- **Format**: Raw text + HTML, categorized into 24 job categories
- **Quality**: REAL resumes from job applications. Diverse industries (HR, IT, Sales, Healthcare, Finance, Arts, etc.).
- **Utility for us**: HIGH for diversity testing. Real formatting, real industries, real mess. 24 categories let us test persona detection across domains. CC0 means zero legal risk.

### 4. Kaggle 54K Structured Resume Dataset
- **Size**: 54,000 resumes
- **License**: CC BY-SA 4.0
- **Format**: Normalized SQL tables (people, education, experience, skills, certifications)
- **Quality**: Structured ground truth. Tables match our schema almost 1:1.
- **Utility for us**: HIGHEST for parser accuracy benchmarking. We can: (1) render a resume from the structured data, (2) run our parser on it, (3) compare parser output to ground truth. This is a proper test harness at scale. The normalized tables also validate our schema design choices.

### 5. Mehyaar/Annotated_NER_PDF_Resumes (HuggingFace)
- **Size**: 5,029 CVs
- **License**: MIT
- **Format**: PDF + NER annotations (entity spans marked)
- **Quality**: IT-focused. Annotations cover name, email, phone, skills, education, experience entities.
- **Utility for us**: LOW. Too narrow (IT only). NER annotations are for token-level extraction which we don't do (we use LLM holistic parsing). Could validate Step 1 contact extraction regex.

### 6. MikePfunk28/resume-training-dataset (HuggingFace)
- **Size**: 22,855 samples
- **License**: Unspecified
- **Format**: Resume text + AI feedback conversations
- **Quality**: Synthetic feedback pairs. Designed for training resume improvement chatbots.
- **Utility for us**: LOW for parsing. Could inform Socratic question design or CV improvement suggestions.

### 7. Kaggle AI-Powered Resume Screening 2025
- **Size**: ~1K records
- **License**: CC0
- **Format**: CSV with job category labels + resume text
- **Quality**: Categorized by job type. Small but labeled.
- **Utility for us**: LOW. Too small, too simple. Already covered by opensporks with more data.

---

## Academic NER Benchmarks (for reference)

- No standard large-scale resume NER benchmark exists (unlike CoNLL for general NER)
- Published F1 scores: 68-92% depending on entity type and model
- Best results: BERT-based models on structured resumes. Worst: creative/non-standard formats
- Our approach (LLM holistic parsing) sidesteps token-level NER entirely — we parse semantically

---

## Recommendations

### Use NOW (Alpha testing, May 2026)

| Dataset | Use Case | Action |
|---------|----------|--------|
| **opensporks/resumes** (2,484, CC0) | Diversity stress-test | Run 50-100 samples through parser, check persona detection + section coverage across 24 job categories |
| **Alpha CVs** (9 PDFs, ground truth built) | Accuracy validation | Run Haiku parser, compare to manual extraction already documented |

### Use for Benchmarking (Post-launch)

| Dataset | Use Case | Action |
|---------|----------|--------|
| **Kaggle 54K structured** | Parser accuracy at scale | Build render→parse→compare pipeline. Measure field-level extraction accuracy per section type |
| **opensporks full set** | Domain coverage scoring | Parse all 2,484, measure which job categories have lowest extraction quality, target improvements |

### Skip

| Dataset | Reason |
|---------|--------|
| InferencePrince555 | Instruction format, not parsing |
| MikePfunk28 | Feedback format, not parsing |
| Mehyaar NER | IT-only, wrong paradigm (token NER vs holistic LLM) |
| AI-Powered Screening | Too small, redundant |

---

## How These Improve Our Scripts

### 1. Parser Prompt Improvement
- Run opensporks samples through parser → find failure patterns → add examples to CV_PARSER_SYSTEM_PROMPT
- Common failures we expect: multi-column layouts, creative formatting, non-English sections, combined skills/experience sections

### 2. Cleaner Validation
- Run Kaggle 54K through parser → compare to ground truth → identify what cv-cleaner.ts catches vs misses
- Validate garbage filter, title normalization, date validation against large-scale data

### 3. Taxonomy Expansion
- Extract skills from opensporks across 24 categories → identify domains with zero taxonomy coverage
- Current taxonomy is 34% tech-biased. Healthcare, finance, arts, education skills are underrepresented

### 4. Persona Detection Testing
- opensporks has labeled job categories → validate our persona classifier against real category labels
- Test: does a "Healthcare" resume get classified as healthcare persona? Does "Finance" get mid_career signals?

### 5. Conflict Detection Training
- Kaggle 54K has multiple entries per person (education[], experience[]) → can synthetically create conflict scenarios
- Generate "Person A with 3 slightly different resumes" → test conflict detector

---

## Cost Estimate

- opensporks 100 samples through Haiku: ~$0.50-1.00
- Kaggle 54K benchmark setup: ~$5 for 500-sample pilot
- Full 54K run: ~$50-70 (not needed until post-launch)

---

## Key Insight

**We don't need these datasets to TRAIN our parser** (it's Claude Haiku with a prompt, not a fine-tuned model). We need them to:
1. **TEST** — find where our prompt fails
2. **BENCHMARK** — measure accuracy with numbers, not assumptions
3. **EXPAND** — discover missing sections/domains in our schema
4. **STRESS** — throw weird formatting at the pipeline

This is quality assurance, not model training. The ROI is in finding the 5% of cases where our parser breaks before users find them.
