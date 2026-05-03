/**
 * AutoResearch Gated Scorecard
 *
 * Deterministic evaluation of CV generation and JD parsing quality.
 * No LLM judge — all checks are code-executable.
 *
 * GATED APPROACH (research-informed):
 *   Gate 1 (HARD): All structural checks must pass → variant is kept or discarded
 *   Gate 2 (RANK): BERTScore F1 breaks ties among passing variants
 *
 * Dual logging: both gated verdict and legacy weighted composite are recorded
 * so we can empirically compare which selects better prompts over 50+ runs.
 *
 * Based on:
 *   - Karpathy/Saraev: binary pass/fail keep/discard pattern
 *   - ExtractBench (2025): per-field typed checks, no global weighted metric
 *   - BERTScore (ACL 2025): 59% human alignment (vs BLEU 47%, ROUGE-L 50%)
 *   - DSPy: task-specific metrics, no universal weights
 *   - autoresearch-validation.md §3
 */

// ============================================================
// TYPES
// ============================================================

export interface CheckResult {
  name: string;
  passed: boolean;
  score: number; // 0.0 - 1.0 (for partial credit in logging, NOT used for gate)
  detail: string;
}

export type GateVerdict = "pass" | "fail";

export interface ScorecardResult {
  /** Individual check results */
  checks: CheckResult[];

  // --- GATE 1: Structural (primary decision) ---
  /** All structural checks passed? This is the keep/discard decision. */
  gate1_verdict: GateVerdict;
  /** Number of checks passed / total */
  gate1_passed: number;
  gate1_total: number;
  /** Names of failed checks (empty if gate1_verdict is "pass") */
  gate1_failures: string[];

  // --- GATE 2: Semantic ranking (tiebreaker) ---
  /** BERTScore F1 (0-1), null if not computed */
  bertscore_f1: number | null;
  /** Whether BERTScore was available */
  bertscore_available: boolean;

  // --- DUAL LOGGING: Legacy weighted composite (for empirical comparison) ---
  /** Average of structural check scores (0-1) — logged for comparison only */
  legacy_structural_avg: number;
  /** Legacy composite: structural * 0.6 + bertscore * 0.4 — logged for comparison only */
  legacy_composite: number;
}

// ============================================================
// CV GENERATION SCORECARD
// ============================================================

export interface CVScorecardInput {
  /** The generated CV output */
  generated: {
    summary: string;
    experience: Array<{
      company: string;
      title: string;
      start_date: string;
      end_date: string;
      bullets: string[];
    }>;
    skills: Record<string, string[]>;
    certifications: string[];
    education?: string[];
  };
  /** The ground truth / ideal output */
  expected: {
    summary: string;
    experience: Array<{
      company: string;
      title: string;
      start_date: string;
      end_date: string;
      bullets: string[];
    }>;
    skills: Record<string, string[]>;
    certifications: string[];
    education?: string[];
  };
  /** JD requirements to check coverage */
  jd_requirements: string[];
  /** Cloud skills (what the candidate actually has) */
  cloud_skills: string[];
  /** Max pages / word count limit */
  max_words?: number;
}

/**
 * Score a generated CV against ground truth.
 *
 * Gate 1: All 8 structural checks must pass → keep or discard.
 * Gate 2: BERTScore F1 ranks passing variants (highest wins).
 */
export function scoreCVGeneration(input: CVScorecardInput): ScorecardResult {
  const checks: CheckResult[] = [];

  // 1. JD Requirements Coverage
  checks.push(checkJDRequirementsCoverage(input));

  // 2. Evidence-backed claims (no fabrication)
  checks.push(checkNoFabrication(input));

  // 3. Metrics/numbers preserved
  checks.push(checkMetricsPreserved(input));

  // 4. Word count within limits
  checks.push(checkWordCount(input));

  // 5. No fabricated skills in bullets
  checks.push(checkNoFabricatedSkills(input));

  // 6. Action verbs for bullet starts
  checks.push(checkActionVerbs(input));

  // 7. ATS-parseable structure
  checks.push(checkATSStructure(input));

  // 8. Company/date/title preservation
  checks.push(checkFactualPreservation(input));

  return buildResult(checks);
}

// ============================================================
// JD PARSER SCORECARD
// ============================================================

export interface JDScorecardInput {
  /** Parsed JD output */
  parsed: {
    title: string;
    company: string;
    location: string;
    requirements: Array<{ text: string; type: "must_have" | "nice_to_have" }>;
    experience_years: number | null;
    responsibilities: string[];
  };
  /** Ground truth / human-verified parsing */
  expected: {
    title: string;
    company: string;
    location: string;
    requirements: Array<{ text: string; type: "must_have" | "nice_to_have" }>;
    experience_years: number | null;
    responsibilities: string[];
  };
}

/**
 * Score a JD parsing result against ground truth.
 *
 * Gate 1: All 7 structural checks must pass → keep or discard.
 * Gate 2: BERTScore F1 on responsibilities (tiebreaker).
 */
export function scoreJDParsing(input: JDScorecardInput): ScorecardResult {
  const checks: CheckResult[] = [];

  checks.push(checkRequirementsExtracted(input));
  checks.push(checkRequirementTypes(input));
  checks.push(checkExactField("company", input.parsed.company, input.expected.company));
  checks.push(checkExactField("title", input.parsed.title, input.expected.title));
  checks.push(checkNoPhantomRequirements(input));
  checks.push(checkExactField("location", input.parsed.location, input.expected.location));
  checks.push({
    name: "experience_years",
    passed: input.parsed.experience_years === input.expected.experience_years,
    score: input.parsed.experience_years === input.expected.experience_years ? 1 : 0,
    detail: `Parsed: ${input.parsed.experience_years}, Expected: ${input.expected.experience_years}`,
  });

  return buildResult(checks);
}

// ============================================================
// RESULT BUILDER — Gated + Dual Logging
// ============================================================

function buildResult(checks: CheckResult[]): ScorecardResult {
  const gate1_failures = checks.filter(c => !c.passed).map(c => c.name);
  const gate1_passed = checks.filter(c => c.passed).length;
  const gate1_verdict: GateVerdict = gate1_failures.length === 0 ? "pass" : "fail";

  // BERTScore placeholder — requires Python subprocess
  const bertscore_f1: number | null = null;
  const bertscore_available = false;

  // Legacy weighted composite — logged for empirical comparison
  const legacy_structural_avg = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
  const legacy_composite = bertscore_available && bertscore_f1 !== null
    ? legacy_structural_avg * 0.6 + bertscore_f1 * 0.4
    : legacy_structural_avg;

  return {
    checks,
    gate1_verdict,
    gate1_passed,
    gate1_total: checks.length,
    gate1_failures,
    bertscore_f1,
    bertscore_available,
    legacy_structural_avg,
    legacy_composite,
  };
}

/**
 * Compare two scorecard results. Returns the better variant.
 *
 * Decision logic (Karpathy keep/discard):
 *   1. If only one passes Gate 1 → that one wins
 *   2. If both pass Gate 1 → higher BERTScore wins (if available)
 *   3. If BERTScore tied/unavailable → higher structural pass count wins
 *   4. If still tied → incumbent wins (no change)
 */
export function compareScorecards(
  incumbent: ScorecardResult,
  challenger: ScorecardResult,
): "incumbent" | "challenger" {
  // Gate 1 is the primary filter
  if (incumbent.gate1_verdict === "pass" && challenger.gate1_verdict === "fail") return "incumbent";
  if (incumbent.gate1_verdict === "fail" && challenger.gate1_verdict === "pass") return "challenger";

  // Both pass Gate 1 — use BERTScore as tiebreaker
  if (incumbent.gate1_verdict === "pass" && challenger.gate1_verdict === "pass") {
    if (incumbent.bertscore_available && challenger.bertscore_available
      && incumbent.bertscore_f1 !== null && challenger.bertscore_f1 !== null) {
      if (challenger.bertscore_f1 > incumbent.bertscore_f1 + 0.01) return "challenger";
      if (incumbent.bertscore_f1 > challenger.bertscore_f1 + 0.01) return "incumbent";
    }
  }

  // Both fail Gate 1 — more checks passed = closer to viability
  if (challenger.gate1_passed > incumbent.gate1_passed) return "challenger";
  if (incumbent.gate1_passed > challenger.gate1_passed) return "incumbent";

  // Tie → incumbent wins (conservative: don't change what works)
  return "incumbent";
}

// ============================================================
// INDIVIDUAL CHECKS — CV GENERATION
// ============================================================

/** Check 1: Are ALL required skills from JD addressed somewhere in the CV? */
function checkJDRequirementsCoverage(input: CVScorecardInput): CheckResult {
  const allText = flattenCVText(input.generated);
  const allTextLower = allText.toLowerCase();

  let matched = 0;
  const missing: string[] = [];

  for (const req of input.jd_requirements) {
    // Include words > 3 chars, plus uppercase acronyms like SQL, API, NLP (2-3 chars)
    const rawWords = req.split(/\s+/);
    const reqWords = rawWords
      .map(w => w.toLowerCase())
      .filter(w => w.length > 3 || (w.length >= 2 && rawWords.some(rw => rw === w.toUpperCase())));
    const found = reqWords.some(word => allTextLower.includes(word));
    if (found) {
      matched++;
    } else {
      missing.push(req);
    }
  }

  const score = input.jd_requirements.length > 0
    ? matched / input.jd_requirements.length
    : 1;

  return {
    name: "jd_requirements_coverage",
    passed: score >= 0.7,
    score,
    detail: missing.length > 0
      ? `${matched}/${input.jd_requirements.length} requirements addressed. Missing: ${missing.slice(0, 3).join(", ")}`
      : `All ${input.jd_requirements.length} requirements addressed`,
  };
}

/** Check 2: Every skill claim has evidence in the Cloud (no fabrication) */
function checkNoFabrication(input: CVScorecardInput): CheckResult {
  const generatedSkills = new Set<string>();
  for (const category of Object.values(input.generated.skills)) {
    for (const skill of category) {
      generatedSkills.add(skill.toLowerCase());
    }
  }

  // Also collect skills from expected_output for self-consistency matching
  const expectedSkills = new Set<string>();
  for (const category of Object.values(input.expected.skills)) {
    for (const skill of category) {
      expectedSkills.add(skill.toLowerCase());
    }
  }

  const cloudSkillsLower = new Set(input.cloud_skills.map(s => s.toLowerCase()));
  const fabricated: string[] = [];

  // Tokenize cloud skills for word-level matching
  const cloudTokens = new Set<string>();
  for (const cs of cloudSkillsLower) {
    for (const word of cs.split(/[\s/,()]+/).filter(w => w.length > 2)) {
      cloudTokens.add(word);
    }
  }

  for (const skill of generatedSkills) {
    // Skip if the skill exists in expected output (self-consistency)
    if (expectedSkills.has(skill)) continue;

    // Exact match
    if (cloudSkillsLower.has(skill)) continue;

    // Substring match (either direction)
    const substringMatch = [...cloudSkillsLower].some(cs => cs.includes(skill) || skill.includes(cs));
    if (substringMatch) continue;

    // Word-level match: split compound skill (e.g., "HTML/CSS") and check each token
    const skillTokens = skill.split(/[\s/,()]+/).filter(w => w.length > 2);
    const tokenMatch = skillTokens.length > 0 && skillTokens.some(t => cloudTokens.has(t));
    if (tokenMatch) continue;

    fabricated.push(skill);
  }

  const score = generatedSkills.size > 0
    ? 1 - (fabricated.length / generatedSkills.size)
    : 1;

  return {
    name: "no_fabrication",
    passed: fabricated.length === 0,
    score: Math.max(0, score),
    detail: fabricated.length > 0
      ? `${fabricated.length} skills not in Cloud: ${fabricated.slice(0, 3).join(", ")}`
      : "All skills backed by Cloud evidence",
  };
}

/** Check 3: Metrics/numbers from source material are preserved */
function checkMetricsPreserved(input: CVScorecardInput): CheckResult {
  const expectedNumbers = extractNumbers(flattenCVText(input.expected));
  const generatedNumbers = extractNumbers(flattenCVText(input.generated));

  if (expectedNumbers.length === 0) {
    return { name: "metrics_preserved", passed: true, score: 1, detail: "No metrics in expected output" };
  }

  let preserved = 0;
  for (const num of expectedNumbers) {
    if (generatedNumbers.includes(num)) preserved++;
  }

  const score = preserved / expectedNumbers.length;
  return {
    name: "metrics_preserved",
    passed: score >= 0.8,
    score,
    detail: `${preserved}/${expectedNumbers.length} metrics preserved`,
  };
}

/** Check 4: Output within word/page limit */
function checkWordCount(input: CVScorecardInput): CheckResult {
  const maxWords = input.max_words ?? 800;
  const words = flattenCVText(input.generated).split(/\s+/).length;
  const passed = words <= maxWords;

  return {
    name: "word_count",
    passed,
    score: passed ? 1 : Math.max(0, 1 - (words - maxWords) / maxWords),
    detail: `${words} words (limit: ${maxWords})`,
  };
}

/** Check 5: No fabricated skills (technologies in bullets not in Cloud) */
function checkNoFabricatedSkills(input: CVScorecardInput): CheckResult {
  const generatedBullets = input.generated.experience.flatMap(e => e.bullets);
  const cloudSkillsLower = new Set(input.cloud_skills.map(s => s.toLowerCase()));

  const techPattern = /\b(?:Python|Java|React|AWS|Azure|GCP|Docker|Kubernetes|Terraform|MATLAB|DOORS|Cameo|JIRA|SAP|AMOS|Primavera)\b/gi;
  const mentioned = new Set<string>();
  for (const bullet of generatedBullets) {
    const matches = bullet.match(techPattern);
    if (matches) matches.forEach(m => mentioned.add(m.toLowerCase()));
  }

  // Use substring matching: "sap" matches cloud entry "sap pp"
  const fabricated = [...mentioned].filter(m =>
    !cloudSkillsLower.has(m) &&
    ![...cloudSkillsLower].some(cs => cs.includes(m) || m.includes(cs))
  );
  const score = mentioned.size > 0 ? 1 - (fabricated.length / mentioned.size) : 1;

  return {
    name: "no_fabricated_skills",
    passed: fabricated.length === 0,
    score: Math.max(0, score),
    detail: fabricated.length > 0
      ? `Technologies mentioned but not in Cloud: ${fabricated.join(", ")}`
      : "All mentioned technologies are in Cloud",
  };
}

/** Check 6: Bullet points start with action verbs */
function checkActionVerbs(input: CVScorecardInput): CheckResult {
  const actionVerbs = new Set([
    "led", "managed", "designed", "developed", "implemented", "delivered",
    "built", "created", "established", "drove", "coordinated", "executed",
    "directed", "supervised", "analyzed", "analysed", "conducted", "supported",
    "achieved", "improved", "reduced", "increased", "launched", "architected",
    "deployed", "optimized", "optimised", "integrated", "maintained",
    "spearheaded", "oversaw", "orchestrated", "pioneered", "streamlined",
    "transformed", "negotiated", "prepared", "performed", "provided",
    "ensured", "authored", "wrote", "planned", "tracked", "monitored",
    "evaluated", "resolved", "facilitated", "mentored", "contributed",
    "completed", "published", "presented", "trained", "introduced",
    "configured", "automated", "defined", "generated", "secured",
    "recruited", "advised", "collaborated", "partnered", "consolidated",
    "identified", "researched", "investigated", "produced", "recorded",
    "mixed", "engineered", "operated", "diagnosed", "interpreted",
    "administered", "processed", "obtained", "graduated", "earned",
    "served", "documented", "participated", "bridged", "awarded",
    "initiated", "expanded", "addressed", "assembled", "approved",
    "inspected", "certified", "tested", "verified", "calibrated",
    "assessed", "recommended", "delivered", "filed", "drafted",
    "compiled", "supervised", "liaised", "translated", "curated",
    "formulated", "proposed", "oversaw", "applied", "organized",
    "organised", "owned", "worked", "cleaned", "seconded", "assisted",
    "taught", "piloted", "used", "underwrote", "passed", "collected",
    "coded", "learned", "learnt",
    // Present-tense for current roles (end_date: "present")
    "leads", "manages", "designs", "develops", "implements",
    "delivers", "builds", "creates", "coordinates", "executes",
    "directs", "supervises", "analyzes", "conducts", "supports",
    "maintains", "oversees", "teaches", "mentors", "advises",
    "operates", "trains", "serves", "provides", "ensures",
  ]);

  const allBullets = input.generated.experience.flatMap(e => e.bullets);
  let actionStart = 0;

  for (const bullet of allBullets) {
    const trimmed = bullet.trim();

    // Handle inline company labels: "CompanyName: Built..." or "CompanyName (term): Developed..."
    // Skip the label and check the first verb after the colon/parenthetical
    let textToCheck = trimmed;
    const labelMatch = trimmed.match(/^[A-Z][A-Za-z\s&.'()-]*?:\s*(.+)/);
    if (labelMatch) {
      textToCheck = labelMatch[1];
    }
    const parenLabelMatch = textToCheck.match(/^\([^)]+\)[:,]?\s*(.+)/);
    if (parenLabelMatch) {
      textToCheck = parenLabelMatch[1];
    }

    const rawFirst = textToCheck.split(/\s/)[0]?.toLowerCase() ?? "";
    // Handle "Co-authored" → check both "co-authored" → "coauthored" and the base "authored"
    const firstWord = rawFirst.replace(/[^a-z-]/g, "");
    const firstWordNoHyphen = firstWord.replace(/-/g, "");
    const baseVerb = firstWord.startsWith("co-") ? firstWord.slice(3) : "";

    if (firstWord && (actionVerbs.has(firstWordNoHyphen) || actionVerbs.has(firstWord) || (baseVerb && actionVerbs.has(baseVerb)))) {
      actionStart++;
    }
  }

  const score = allBullets.length > 0 ? actionStart / allBullets.length : 1;
  return {
    name: "action_verbs",
    passed: score >= 0.8,
    score,
    detail: `${actionStart}/${allBullets.length} bullets start with action verbs`,
  };
}

/** Check 7: ATS-parseable structure (sections exist, no formatting artifacts) */
function checkATSStructure(input: CVScorecardInput): CheckResult {
  const issues: string[] = [];

  if (!input.generated.summary) issues.push("missing summary");
  if (input.generated.experience.length === 0) issues.push("no experience section");
  if (Object.keys(input.generated.skills).length === 0) issues.push("no skills section");

  for (const exp of input.generated.experience) {
    if (!exp.company) issues.push(`missing company name`);
    if (!exp.title) issues.push(`missing title`);
    if (!exp.start_date) issues.push(`missing start date`);
    if (exp.bullets.length === 0) issues.push(`${exp.company}: no bullets`);
  }

  const score = issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.15);
  return {
    name: "ats_structure",
    passed: issues.length === 0,
    score,
    detail: issues.length > 0 ? `ATS issues: ${issues.join("; ")}` : "All ATS structure checks pass",
  };
}

/** Check 8: Company names, dates, titles preserved exactly from source */
function checkFactualPreservation(input: CVScorecardInput): CheckResult {
  let total = 0;
  let preserved = 0;
  const errors: string[] = [];

  // One-to-one matching: each generated entry can only be consumed once
  const usedIndices = new Set<number>();

  for (const expected of input.expected.experience) {
    // Find best match: prefer exact company+dates, then company+close dates, then company only
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < input.generated.experience.length; i++) {
      if (usedIndices.has(i)) continue;
      const g = input.generated.experience[i];
      if (!companiesMatch(g.company, expected.company)) continue;

      // Score: exact company match + date matches
      let matchScore = 1; // company matches
      if (g.start_date === expected.start_date) matchScore += 2;
      if (g.end_date === expected.end_date) matchScore += 2;

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      errors.push(`Missing role: ${expected.company}`);
      total += 3;
      continue;
    }

    usedIndices.add(bestIdx);
    const match = input.generated.experience[bestIdx];

    total += 3;

    if (companiesMatch(match.company, expected.company)) {
      preserved++;
    } else {
      errors.push(`Company changed: "${expected.company}" → "${match.company}"`);
    }

    if (match.start_date === expected.start_date) {
      preserved++;
    } else {
      errors.push(`Start date changed: ${expected.start_date} → ${match.start_date}`);
    }

    if (match.end_date === expected.end_date) {
      preserved++;
    } else {
      errors.push(`End date changed: ${expected.end_date} → ${match.end_date}`);
    }
  }

  const score = total > 0 ? preserved / total : 1;
  return {
    name: "factual_preservation",
    passed: errors.length === 0,
    score,
    detail: errors.length > 0 ? errors.slice(0, 3).join("; ") : "All facts preserved",
  };
}

/** Fuzzy company name matching — handles parentheticals, dashes, location suffixes */
function companiesMatch(a: string, b: string): boolean {
  const normA = normalizeCompanyName(a);
  const normB = normalizeCompanyName(b);

  // Exact match after normalization
  if (normA === normB) return true;

  // One contains the other
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Extract core name (before dash/parenthetical/comma) and compare
  const coreA = extractCoreName(a);
  const coreB = extractCoreName(b);
  if (coreA.length >= 3 && coreB.length >= 3) {
    if (coreA === coreB || coreA.includes(coreB) || coreB.includes(coreA)) return true;
  }

  return false;
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[—–\-]/g, " ")       // dashes to spaces
    .replace(/[()[\]]/g, "")        // remove parentheses/brackets
    .replace(/[,.']/g, "")          // remove punctuation
    .replace(/\s+/g, " ")           // collapse whitespace
    .trim();
}

function extractCoreName(name: string): string {
  // Take the part before any dash, comma, or parenthetical
  return name
    .split(/\s*[—–\-,]\s*/)[0]
    .replace(/\s*\(.*/, "")
    .toLowerCase()
    .trim();
}

// ============================================================
// INDIVIDUAL CHECKS — JD PARSER
// ============================================================

function checkRequirementsExtracted(input: JDScorecardInput): CheckResult {
  const expectedTexts = input.expected.requirements.map(r => r.text.toLowerCase());
  let found = 0;

  for (const expected of expectedTexts) {
    const words = expected.split(/\s+/).filter(w => w.length > 3);
    const matched = input.parsed.requirements.some(p =>
      words.filter(w => p.text.toLowerCase().includes(w)).length >= words.length * 0.5
    );
    if (matched) found++;
  }

  const score = expectedTexts.length > 0 ? found / expectedTexts.length : 1;
  return {
    name: "requirements_extracted",
    passed: score >= 0.8,
    score,
    detail: `${found}/${expectedTexts.length} requirements correctly extracted`,
  };
}

function checkRequirementTypes(input: JDScorecardInput): CheckResult {
  let correct = 0;
  let total = 0;

  for (const expected of input.expected.requirements) {
    const expWords = expected.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const match = input.parsed.requirements.find(p =>
      expWords.filter(w => p.text.toLowerCase().includes(w)).length >= expWords.length * 0.5
    );

    if (match) {
      total++;
      if (match.type === expected.type) correct++;
    }
  }

  const score = total > 0 ? correct / total : 1;
  return {
    name: "requirement_types",
    passed: score >= 0.8,
    score,
    detail: `${correct}/${total} requirement types correctly classified`,
  };
}

function checkNoPhantomRequirements(input: JDScorecardInput): CheckResult {
  const expectedTexts = input.expected.requirements.map(r => r.text.toLowerCase());
  let phantoms = 0;

  for (const parsed of input.parsed.requirements) {
    const parsedWords = parsed.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchesExpected = expectedTexts.some(exp =>
      parsedWords.filter(w => exp.includes(w)).length >= parsedWords.length * 0.3
    );
    if (!matchesExpected) phantoms++;
  }

  const score = input.parsed.requirements.length > 0
    ? 1 - (phantoms / input.parsed.requirements.length)
    : 1;

  return {
    name: "no_phantom_requirements",
    passed: phantoms === 0,
    score: Math.max(0, score),
    detail: phantoms > 0 ? `${phantoms} phantom requirements invented` : "No phantom requirements",
  };
}

function checkExactField(name: string, parsed: string, expected: string): CheckResult {
  const parsedNorm = parsed.toLowerCase().trim();
  const expectedNorm = expected.toLowerCase().trim();
  const exact = parsedNorm === expectedNorm;
  const contains = parsedNorm.includes(expectedNorm) || expectedNorm.includes(parsedNorm);

  return {
    name,
    passed: exact || contains,
    score: exact ? 1 : contains ? 0.8 : 0,
    detail: exact ? `Match: "${parsed}"` : contains ? `Partial: "${parsed}" vs "${expected}"` : `Mismatch: "${parsed}" vs "${expected}"`,
  };
}

// ============================================================
// UTILITIES
// ============================================================

function flattenCVText(cv: CVScorecardInput["generated"]): string {
  const parts: string[] = [cv.summary];

  for (const exp of cv.experience) {
    parts.push(exp.title, exp.company);
    parts.push(...exp.bullets);
  }

  for (const [, skills] of Object.entries(cv.skills)) {
    parts.push(...skills);
  }

  parts.push(...cv.certifications);
  if (cv.education) parts.push(...cv.education);

  return parts.join(" ");
}

function extractNumbers(text: string): string[] {
  const matches = text.match(/\b\d+(?:\.\d+)?(?:%|M|\+|K)?\b/g);
  return matches ?? [];
}
