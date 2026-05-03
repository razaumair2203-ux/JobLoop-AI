# Real JD Style Analysis — for Test Bank Diversity

Collected from Greenhouse.io, Lever.co job boards (May 2026).
Purpose: ensure test pairs cover the actual distribution of JD formats users will paste.

## 5 Distinct JD Styles Identified

### Style 1: Startup Technical (Layer Health)
- **Tone**: Mission-driven, specific about technology
- **Structure**: About Company → Responsibilities → Required Qualifications → Preferred Qualities
- **Characteristics**:
  - Requires MD/DO + Python + SQL for clinical informatics (much more technical than expected)
  - Specific tech standards (FHIR, HL7, CCDA, ICD10, CPT, RxNorm)
  - Flat list of requirements, no must-have/nice-to-have distinction — all are required
  - Mentions salary ($140K-160K + stock)
  - "Fast-paced, ambitious" language
- **Implication for test bank**: JDs that assume cross-domain expertise (clinical + coding)

### Style 2: Defense/Cleared (Anduril)
- **Tone**: Urgent, mission-focused, patriotic undertones
- **Structure**: About Team → About Job → Responsibilities → Required → Preferred
- **Characteristics**:
  - Security clearance as must-have ("active U.S. Secret")
  - Relocation requirement ("relocate to Costa Mesa for 3-6 months")
  - Specific systems (NetSuite, JIRA — not SAP)
  - Mixed seniority: 7+ years BUT associate's degree acceptable
  - Mentions 5S/lean but NOT Six Sigma Black Belt
  - "Demonstrate urgency and enthusiasm daily" — culture signal
- **Implication for test bank**: JDs with hard constraints (clearance, relocation) that the CV can't address

### Style 3: Vague/Culture-First (Stripe)
- **Tone**: Minimal, culture-forward
- **Structure**: Short description → Minimum Requirements (very few)
- **Characteristics**:
  - Only 2-5 years required for "senior" level
  - "Language-agnostic evaluation" — no specific tech stack
  - "Entrepreneurial mindset" — values over skills
  - No education requirement listed at all
  - Very few bullet points (4-5 total requirements)
- **Implication for test bank**: JDs where the CV generator must infer what to emphasize

### Style 4: Enterprise SaaS (Veeva Systems)
- **Tone**: Professional, specific but not prescriptive
- **Structure**: About Role → Requirements list
- **Characteristics**:
  - "5+ years of product design experience"
  - Portfolio requirement (not testable by CV generator)
  - Emphasis on collaboration ("diverse teams, rapid growth")
  - "Go-getter and self-sufficient" — personality language mixed with skills
  - No education requirement explicitly listed
- **Implication for test bank**: JDs mixing personality traits with technical requirements

### Style 5: Entry-Level/Graduate (various)
- **Tone**: Encouraging, explains what you'll learn
- **Structure**: About Role → What You'll Do → Who You Are
- **Characteristics**:
  - "Entry-level, full-time opportunity designed for recent graduates"
  - "Real datasets, real revenue impact" — selling the role
  - Looser requirements ("proficiency in SQL, Python, and/or R")
  - Communication skills weighted equally with technical
  - Often no specific years of experience required
- **Implication for test bank**: JDs where the candidate has more academic than work evidence

## Coverage Gap in Current Test Bank

Current 14 pairs ALL use Style 4 format (structured enterprise requirements).
Missing:
- Style 1: Technical cross-domain (0 pairs)
- Style 2: Cleared/constrained (0 pairs — pair-001 is defense but uses synthetic JD)
- Style 3: Vague/minimal (0 pairs)
- Style 5: Graduate-friendly (pair-008 has structured JD, not graduate-style)

## Recommendation

Next batch of pairs should include at least one of each missing style.
Use real JD text (lightly edited for length) rather than synthesizing.
The company name doesn't matter — the JD STRUCTURE matters for prompt optimization.
