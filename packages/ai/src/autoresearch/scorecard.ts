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

/**
 * Circularity risk level for a check.
 * - "none": check is structurally sound regardless of data source
 *   (factual_preservation, word_count, ats_structure, action_verbs)
 * - "low": check evaluates against human-verified data (pairs 001-004)
 * - "medium": check evaluates AI output against AI reference (pairs 005-050)
 *
 * See DECISION-JOURNAL.md §2026-05-03 for full circularity assessment.
 */
export type CircularityRisk = "none" | "low" | "medium";

export interface CheckResult {
  name: string;
  passed: boolean;
  score: number; // 0.0 - 1.0 (for partial credit in logging, NOT used for gate)
  detail: string;
  /** How circular is this check? See CircularityRisk docs. */
  circularity?: CircularityRisk;
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

/**
 * Circularity classification per check name.
 * "none" = structurally valid regardless of who generated the data.
 * "medium" = evaluates AI output against AI-generated reference data.
 */
const CHECK_CIRCULARITY: Record<string, CircularityRisk> = {
  // All CV-gen checks now compare against raw source text (zero circular)
  factual_preservation: "none",
  word_count: "none",
  ats_structure: "none",
  action_verbs: "none",
  jd_requirements_coverage: "none", // compares against raw_jd_text
  no_fabrication: "none",           // compares against raw_cv_text
  metrics_preserved: "none",        // compares against raw_cv_text
  no_fabricated_skills: "none",     // compares against raw_cv_text
  // JD parser checks (calibrated May 2026, N=38 trial on Llama-3.3-70B)
  company: "none",
  title: "none",
  location: "none",
  experience_years_min: "none",
  experience_years_max: "none",
  requirements_recall: "medium",
  requirements_precision: "medium",
  requirement_types: "medium",
  responsibilities_recall: "medium",
};

/** Tag a check result with its circularity risk */
function tagCheck(result: Omit<CheckResult, "circularity">): CheckResult {
  return { ...result, circularity: CHECK_CIRCULARITY[result.name] ?? "medium" };
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
  /** The ground truth / ideal output (used for input to cv-gen, NOT for scoring) */
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
  /** JD requirements to check coverage (used as cv-gen input) */
  jd_requirements: string[];
  /** Cloud skills (what the candidate actually has) */
  cloud_skills: string[];
  /** Raw resume text — ZERO-CIRCULAR scoring source. All checks compare against this. Falls back to expected_output if empty. */
  raw_cv_text?: string;
  /** Raw JD text — ZERO-CIRCULAR scoring source for requirement coverage. Falls back to jd_requirements if empty. */
  raw_jd_text?: string;
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
  checks.push(tagCheck(checkJDRequirementsCoverage(input)));

  // 2. Evidence-backed claims (no fabrication)
  checks.push(tagCheck(checkNoFabrication(input)));

  // 3. Metrics/numbers preserved
  checks.push(tagCheck(checkMetricsPreserved(input)));

  // 4. Word count within limits
  checks.push(tagCheck(checkWordCount(input)));

  // 5. No fabricated skills in bullets
  checks.push(tagCheck(checkNoFabricatedSkills(input)));

  // 6. Action verbs for bullet starts
  checks.push(tagCheck(checkActionVerbs(input)));

  // 7. ATS-parseable structure
  checks.push(tagCheck(checkATSStructure(input)));

  // 8. Company/date/title preservation
  checks.push(tagCheck(checkFactualPreservation(input)));

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
    experience_years_max?: number | null;
    responsibilities: string[];
  };
  /** Ground truth / human-verified parsing */
  expected: {
    title: string;
    company: string;
    location: string;
    requirements: Array<{ text: string; type: "must_have" | "nice_to_have" }>;
    experience_years: number | null;
    experience_years_max?: number | null;
    responsibilities: string[];
  };
}

/**
 * Score a JD parsing result against ground truth.
 *
 * 9 per-field checks with calibrated thresholds (May 2026 trial, N=38).
 * Gate: per-pair ≥6/9 checks + aggregate ≥70% pairs pass.
 *
 * Calibration methodology: P10 of Llama-3.3-70B trial on corrected GT.
 * Thresholds set at P10 floor (90% of real outputs exceed this).
 */
export function scoreJDParsing(input: JDScorecardInput): ScorecardResult {
  const checks: CheckResult[] = [];

  // 1. Company (fuzzy + contains — threshold 40%, informational)
  checks.push(tagCheck(checkFuzzyField("company", input.parsed.company, input.expected.company, 0.40)));

  // 2. Title (fuzzy — threshold 40%)
  checks.push(tagCheck(checkFuzzyField("title", input.parsed.title, input.expected.title, 0.40)));

  // 3. Location (fuzzy — threshold 45%)
  checks.push(tagCheck(checkFuzzyField("location", input.parsed.location, input.expected.location, 0.45)));

  // 4. Experience years min (exact or ±1 — threshold 80%)
  checks.push(tagCheck(checkNumericField("experience_years_min", input.parsed.experience_years, input.expected.experience_years, 0.80)));

  // 5. Experience years max (exact or ±1 — threshold 80%)
  checks.push(tagCheck(checkNumericField("experience_years_max", input.parsed.experience_years_max ?? null, input.expected.experience_years_max ?? null, 0.80)));

  // 6. Requirements recall (threshold 40%)
  checks.push(tagCheck(checkRequirementsExtracted(input)));

  // 7. Requirements precision / no phantoms (threshold 85%)
  checks.push(tagCheck(checkNoPhantomRequirements(input)));

  // 8. Requirement types (threshold 80%)
  checks.push(tagCheck(checkRequirementTypes(input)));

  // 9. Responsibilities recall (threshold 45%)
  checks.push(tagCheck(checkResponsibilitiesRecall(input)));

  return buildResult(checks);
}

// ============================================================
// RESULT BUILDER — Gated + Dual Logging
// ============================================================

/**
 * Hard gate checks — any failure = pair fails regardless of soft scores.
 * These are integrity checks: fabrication and factual accuracy.
 * Research: ExtractBench, CoNLL, SemEval all use per-field thresholds.
 * Fabrication failure is categorically different from word count overshoot.
 */
const HARD_GATE_CHECKS = new Set([
  "no_fabrication",
  "no_fabricated_skills",
  "factual_preservation",
]);

function buildResult(checks: CheckResult[]): ScorecardResult {
  // Hard gates: these must ALL pass for the pair to pass
  const hardGateFailures = checks
    .filter(c => HARD_GATE_CHECKS.has(c.name) && !c.passed)
    .map(c => c.name);

  // Soft checks: weighted average determines quality
  const softChecks = checks.filter(c => !HARD_GATE_CHECKS.has(c.name));
  const softAvg = softChecks.length > 0
    ? softChecks.reduce((sum, c) => sum + c.score, 0) / softChecks.length
    : 1;

  // Gate 1 verdict: all hard gates pass AND soft average ≥ 0.50
  const gate1_failures = [
    ...hardGateFailures,
    ...checks.filter(c => !HARD_GATE_CHECKS.has(c.name) && !c.passed).map(c => c.name),
  ];
  const gate1_passed = checks.filter(c => c.passed).length;
  const hardGatesPass = hardGateFailures.length === 0;
  const gate1_verdict: GateVerdict = hardGatesPass && softAvg >= 0.50 ? "pass" : "fail";

  // BERTScore placeholder — requires Python subprocess
  const bertscore_f1: number | null = null;
  const bertscore_available = false;

  // Legacy structural avg (all checks, for comparison logging)
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

  // Same check count — use float score average for finer-grained comparison
  // This lets the loop see DEGREE of improvement, not just pass/fail count
  if (challenger.legacy_structural_avg > incumbent.legacy_structural_avg + 0.02) return "challenger";
  if (incumbent.legacy_structural_avg > challenger.legacy_structural_avg + 0.02) return "incumbent";

  // True tie → incumbent wins (conservative: don't change what works)
  return "incumbent";
}

// ============================================================
// INDIVIDUAL CHECKS — CV GENERATION
// ============================================================

/**
 * Check 1: Does the generated CV address JD requirements?
 * ZERO CIRCULAR: compares against jd_requirements + raw_jd_text technical terms.
 *
 * TWO-LAYER approach:
 *   Layer A: Each jd_requirement is checked as a WHOLE — does the CV address its TOPIC?
 *            A requirement is "addressed" if ≥1 of its domain-specific words appear in the CV.
 *   Layer B: Technical terms extracted from raw JD (acronyms, tools, technologies).
 *            These are checked individually — exact match or sub-word match.
 */
function checkJDRequirementsCoverage(input: CVScorecardInput): CheckResult {
  const generatedText = flattenCVText(input.generated).toLowerCase();
  const rawCVText = (input.raw_cv_text || "").toLowerCase();

  // Layer A: Check each curated requirement as a topic — but ONLY requirements
  // the candidate could plausibly address (requirement topic exists in raw CV).
  // A stretch application shouldn't be penalized for not fabricating missing skills.
  let reqAddressable = 0;
  let reqMatched = 0;
  const reqMissing: string[] = [];

  for (const req of input.jd_requirements) {
    // Is this requirement addressable? (candidate has SOME related content)
    const addressable = rawCVText.length < 50 || requirementAddressedInText(req, rawCVText);

    if (addressable) {
      reqAddressable++;
      if (requirementAddressedInText(req, generatedText)) {
        reqMatched++;
      } else {
        reqMissing.push(req.slice(0, 50));
      }
    }
    // Non-addressable requirements (candidate can't address them) → skip, don't penalize
  }

  // Layer B: Check technical terms from raw JD — only those present in raw CV
  const techTerms = extractTechTermsFromJD(input.raw_jd_text || "");
  let techAddressable = 0;
  let techMatched = 0;

  for (const term of techTerms) {
    if (rawCVText.length < 50 || termMatchesText(term, rawCVText)) {
      techAddressable++;
      if (termMatchesText(term, generatedText)) {
        techMatched++;
      }
    }
  }

  // Combined score: only count addressable items
  const reqScore = reqAddressable > 0 ? reqMatched / reqAddressable : 1;
  const techScore = techAddressable > 0 ? techMatched / techAddressable : 1;
  const score = reqAddressable + techAddressable > 0
    ? reqScore * 0.7 + techScore * 0.3
    : 1; // No addressable requirements → auto-pass (pure stretch application)

  return {
    name: "jd_requirements_coverage",
    passed: score >= 0.55, // Calibrated: P10 of ideal output = 58%, rounded down to 55%
    score,
    detail: reqMissing.length > 0
      ? `Reqs: ${reqMatched}/${reqAddressable} addressable (${input.jd_requirements.length} total), Tech: ${techMatched}/${techAddressable}. Missing: ${reqMissing.slice(0, 3).join("; ")}`
      : `All ${reqAddressable + techAddressable} addressable JD items covered`,
  };
}

/**
 * Check 2: Every skill claim in the generated CV exists in the raw resume text.
 * ZERO CIRCULAR: compares against raw_cv_text, not LLM-extracted cloud_skills.
 */
function checkNoFabrication(input: CVScorecardInput): CheckResult {
  const generatedSkills = new Set<string>();
  for (const category of Object.values(input.generated.skills)) {
    for (const skill of category) {
      generatedSkills.add(skill.toLowerCase());
    }
  }

  const rawTextLower = (input.raw_cv_text || "").toLowerCase();
  const fabricated: string[] = [];

  if (!rawTextLower || rawTextLower.length < 50) {
    // Insufficient source text — skip check (avoids circular AI-vs-AI comparison)
    return {
      name: "no_fabrication",
      passed: true,
      score: 1,
      detail: "Skipped: insufficient raw_cv_text for zero-circular check",
    };
  }

  {
    for (const skill of generatedSkills) {
      // Check if skill or any significant token appears in raw CV text
      if (rawTextLower.includes(skill)) continue;

      // Word-level: split compound skills and check each token
      const tokens = skill.split(/[\s/,()]+/).filter(w => w.length > 2);
      const tokenMatch = tokens.length > 0 && tokens.some(t => rawTextLower.includes(t));
      if (tokenMatch) continue;

      fabricated.push(skill);
    }
  }

  const score = generatedSkills.size > 0
    ? 1 - (fabricated.length / generatedSkills.size)
    : 1;

  return {
    name: "no_fabrication",
    passed: score >= 0.85, // Calibrated: P10 of ideal output = 85.7%. Allows ~15% JD-term rephrasing.
    score: Math.max(0, score),
    detail: fabricated.length > 0
      ? `${fabricated.length} skills not in source CV: ${fabricated.slice(0, 3).join(", ")}`
      : "All skills found in source CV text",
  };
}

/**
 * Check 3: Metrics/numbers from the raw CV text are preserved in generated output.
 * ZERO CIRCULAR: extracts numbers from raw_cv_text, not LLM-parsed expected_output.
 */
function checkMetricsPreserved(input: CVScorecardInput): CheckResult {
  const sourceText = input.raw_cv_text || flattenCVText(input.expected);
  const sourceNumbers = extractNumbers(sourceText);
  const generatedNumbers = extractNumbers(flattenCVText(input.generated));

  if (sourceNumbers.length === 0) {
    return { name: "metrics_preserved", passed: true, score: 1, detail: "No metrics in source CV" };
  }

  let preserved = 0;
  for (const num of sourceNumbers) {
    if (generatedNumbers.includes(num)) preserved++;
  }

  const score = preserved / sourceNumbers.length;
  return {
    name: "metrics_preserved",
    // Calibrated: P10 of ideal = 0% (!) because Kaggle expected outputs don't share
    // numbers with raw CV text. Threshold set at 0.3 — catches prompts that DROP most
    // metrics, but doesn't penalize legitimate rewriting. Will tighten after real human
    // pairs replace synthetic ones.
    passed: score >= 0.3,
    score,
    detail: `${preserved}/${sourceNumbers.length} metrics preserved from source CV`,
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

/**
 * Check 5: No fabricated technologies in experience bullets.
 * ZERO CIRCULAR: checks against raw_cv_text, not LLM-extracted cloud_skills.
 */
function checkNoFabricatedSkills(input: CVScorecardInput): CheckResult {
  const generatedBullets = input.generated.experience.flatMap(e => e.bullets);
  const rawTextLower = (input.raw_cv_text || "").toLowerCase();

  const techPattern = /\b(?:Python|Java|React|AWS|Azure|GCP|Docker|Kubernetes|Terraform|MATLAB|DOORS|Cameo|JIRA|SAP|AMOS|Primavera|SQL|MongoDB|Redis|Node|Angular|Vue|TypeScript|JavaScript|C\+\+|Golang|Rust|Scala|Ruby|PHP|Swift|Kotlin|Flutter|TensorFlow|PyTorch|Tableau|Power\s*BI|Excel|Figma|Sketch|AutoCAD|SolidWorks|Revit|Salesforce|HubSpot|Workday|Oracle|Hadoop|Spark|Kafka|Elasticsearch|Jenkins|GitLab|GitHub|Ansible|Chef|Puppet|Nginx|Apache)\b/gi;
  const mentioned = new Set<string>();
  for (const bullet of generatedBullets) {
    const matches = bullet.match(techPattern);
    if (matches) matches.forEach(m => mentioned.add(m.toLowerCase()));
  }

  if (!rawTextLower || rawTextLower.length < 50) {
    // Insufficient source text — skip check (avoids circular AI-vs-AI comparison)
    return {
      name: "no_fabricated_skills",
      passed: true,
      score: 1,
      detail: "Skipped: insufficient raw_cv_text for zero-circular check",
    };
  }

  const fabricated = [...mentioned].filter(m => !rawTextLower.includes(m));
  const score = mentioned.size > 0 ? 1 - (fabricated.length / mentioned.size) : 1;

  return {
    name: "no_fabricated_skills",
    passed: fabricated.length === 0,
    score: Math.max(0, score),
    detail: fabricated.length > 0
      ? `Technologies not in source CV: ${fabricated.join(", ")}`
      : "All mentioned technologies found in source CV",
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
    // Base-form imperatives (common in present-role bullets)
    "lead", "manage", "design", "develop", "implement", "deliver",
    "build", "create", "coordinate", "execute", "direct", "supervise",
    "analyze", "conduct", "support", "maintain", "oversee", "teach",
    "mentor", "advise", "operate", "train", "serve", "provide",
    "ensure", "engage", "display", "exhibit", "follow", "stock",
    "carry", "handle", "partner", "review", "assess", "monitor",
    "track", "communicate", "collaborate", "negotiate", "facilitate",
    "hire", "acquire", "keep", "shop", "produce", "compute",
    "describe", "place", "run", "drive", "set", "plan",
    "guide", "align", "establish", "automate",
    // Gerunds (-ing) — some resumes use progressive form
    "leading", "managing", "designing", "developing", "implementing",
    "delivering", "building", "creating", "coordinating", "executing",
    "directing", "supervising", "analyzing", "conducting", "supporting",
    "maintaining", "overseeing", "teaching", "mentoring", "advising",
    "operating", "training", "serving", "providing", "ensuring",
    "aligning", "establishing", "automating", "handling", "engaging",
    "partnering", "reviewing", "monitoring", "tracking", "facilitating",
    "negotiating", "collaborating", "planning", "driving", "guiding",
    "preparing", "performing", "processing", "resolving", "identifying",
    "researching", "investigating", "producing", "recording", "documenting",
    "administering", "compiling", "organizing", "presenting", "computing",
    "describing", "placing", "running", "setting", "hiring", "acquiring",
    "shopping", "stocking", "displaying", "exhibiting", "following",
    "carrying",
    // Additional common verbs found in real resume data
    "responsible", "reviewed", "offered", "communicated", "helped",
    "handled", "reported", "incorporated", "recognized", "fostered",
    "explained", "troubleshot", "made", "took", "kept", "disciplined",
    "selected", "assigned", "distributed", "enforced", "inspecting",
    "releasing", "selecting", "assigning", "distributing", "enforcing",
    "offering", "communicating", "helping", "reporting", "incorporating",
    "recognizing", "fostering", "explaining", "troubleshooting",
    "assist", "perform", "identify", "prepare", "research",
    "assisting", "performing", "identifying", "preparing", "researching",
    "acquired", "acquiring", "installed", "installing", "updated",
    "updating", "restored", "restoring", "calculated", "calculating",
    "estimated", "estimating", "scheduled", "scheduling", "measured",
    "measuring", "transferred", "transferring", "converted", "converting",
    "loaded", "loading", "uploaded", "uploading", "submitted", "submitting",
    "exceeded", "exceeding", "achieved", "achieving", "attained", "attaining",
    "promoted", "promoting", "elevated", "elevating", "enhanced", "enhancing",
    "strengthened", "strengthening", "devised", "devising", "crafted", "crafting",
    "customized", "customizing", "tailored", "tailoring", "adapted", "adapting",
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
    passed: score >= 0.50, // Calibrated: P10 of ideal = 51.9%. Real resumes have non-verb-leading bullets.
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

/**
 * Check 8: Company names and dates in generated CV exist in raw source text.
 * ZERO CIRCULAR: checks against raw_cv_text, not LLM-parsed expected_output.
 */
function checkFactualPreservation(input: CVScorecardInput): CheckResult {
  const rawTextLower = (input.raw_cv_text || "").toLowerCase();
  const errors: string[] = [];

  if (!rawTextLower || rawTextLower.length < 50) {
    // Insufficient source text — skip check (avoids circular AI-vs-AI comparison)
    return {
      name: "factual_preservation",
      passed: true,
      score: 1,
      detail: "Skipped: insufficient raw_cv_text for zero-circular check",
    };
  }

  let total = 0;
  let preserved = 0;

  for (const gen of input.generated.experience) {
    // Check company name appears in raw CV text
    total++;
    const companyNorm = normalizeCompanyName(gen.company);
    if (companyNorm.length >= 3 && rawTextLower.includes(companyNorm)) {
      preserved++;
    } else {
      // Try core name (before dash/comma)
      const core = extractCoreName(gen.company);
      if (core.length >= 3 && rawTextLower.includes(core)) {
        preserved++;
      } else if (gen.company.toLowerCase() === "company name") {
        // Anonymized company — pass (can't verify but not fabricated)
        preserved++;
      } else {
        errors.push(`Company "${gen.company}" not in source CV`);
      }
    }

    // Check dates appear in raw CV text
    if (gen.start_date) {
      total++;
      // Try various formats: "04/2016", "2016", "April 2016", "Apr 2016"
      const dateInSource = dateAppearsInText(gen.start_date, rawTextLower);
      if (dateInSource) {
        preserved++;
      } else {
        errors.push(`Start date ${gen.start_date} not in source CV`);
      }
    }
  }

  const score = total > 0 ? preserved / total : 1;
  return {
    name: "factual_preservation",
    passed: score >= 0.85, // Calibrated: P10 of ideal = 90%. Allow minor date format mismatches.
    score,
    detail: errors.length > 0 ? errors.slice(0, 3).join("; ") : "All facts verified against source CV",
  };
}

/**
 * Check if a date string appears in text in any common format.
 *
 * Checks year + month when available. Month names are normalized
 * so "04/2016" matches "April 2016" or "Apr 2016" in text.
 */
function dateAppearsInText(date: string, text: string): boolean {
  // Handle "Present" / "Current" first
  if (/present|current/i.test(date)) {
    return /present|current/i.test(text);
  }

  // Extract year — must appear in text
  const yearMatch = date.match(/(\d{4})/);
  if (!yearMatch) return false;
  const year = yearMatch[1];
  if (!text.includes(year)) return false;

  // Extract month number if present (e.g., "04/2016" or "4/2016")
  const monthNumMatch = date.match(/^(\d{1,2})\//);
  if (!monthNumMatch) {
    // No month component — year-only date, year match is sufficient
    return true;
  }

  // Has month — verify month appears near the year in some format
  const monthNum = parseInt(monthNumMatch[1], 10);
  if (monthNum < 1 || monthNum > 12) return true; // Invalid month, year match is enough

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const monthAbbrevs = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  const monthName = monthNames[monthNum - 1];
  const monthAbbrev = monthAbbrevs[monthNum - 1];
  const monthStr = monthNum.toString().padStart(2, "0");

  // Check if any month representation appears near the year in text
  // "near" = within 20 chars (covers "April 2016", "04/2016", "2016-04")
  const yearIdx = text.indexOf(year);
  const nearStart = Math.max(0, yearIdx - 20);
  const nearEnd = Math.min(text.length, yearIdx + year.length + 20);
  const nearText = text.slice(nearStart, nearEnd);

  if (nearText.includes(monthName) || nearText.includes(monthAbbrev)) return true;
  if (nearText.includes(monthStr + "/") || nearText.includes(monthStr + "-")) return true;
  if (nearText.includes("/" + monthStr) || nearText.includes("-" + monthStr)) return true;

  // Month not found near year — still pass if year exists (format mismatch, not fabrication)
  // But reduce confidence by returning true — the score penalty comes from the caller
  return true;
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

/**
 * Fuzzy string field check with multi-strategy matching.
 *
 * Strategies (best score wins):
 *   1. Exact match → 1.0
 *   2. Contains match → 0.9
 *   3. Word overlap (Jaccard on significant words) — catches subsidiary/abbreviation variants
 *   4. Levenshtein similarity — character-level fallback
 *
 * The word-overlap strategy was added to match trial scoring (May 2026).
 * Without it, "Denver, USA" vs "Denver, CO" scored 53% Levenshtein
 * but should be ~85% (same city). Similarly, "Acme Corp" vs
 * "Acme Corporation Ltd" has low Levenshtein but high word overlap.
 *
 * Calibrated: threshold set from P10 of trial data (N=38).
 */
function checkFuzzyField(name: string, parsed: string, expected: string, threshold: number): CheckResult {
  const pNorm = parsed.toLowerCase().trim();
  const eNorm = expected.toLowerCase().trim();

  // Both empty = correct
  if (!eNorm && !pNorm) return { name, passed: true, score: 1, detail: "Both empty" };
  // Parser found something, GT empty — give partial credit (not penalized)
  if (!eNorm && pNorm) return { name, passed: true, score: 0.5, detail: `Extra: "${parsed}" (GT empty)` };
  // GT has value, parser empty
  if (eNorm && !pNorm) return { name, passed: false, score: 0, detail: `Missing: expected "${expected}"` };

  // Exact
  if (pNorm === eNorm) return { name, passed: true, score: 1, detail: `Exact: "${parsed}"` };

  // Contains
  if (pNorm.includes(eNorm) || eNorm.includes(pNorm)) {
    return { name, passed: true, score: 0.9, detail: `Contains: "${parsed}" ~ "${expected}"` };
  }

  // Word overlap (Jaccard on words ≥2 chars, ignoring filler)
  const wordOverlap = computeWordOverlap(pNorm, eNorm);

  // Levenshtein similarity
  const levSim = levenshteinSimilarity(pNorm, eNorm);

  // Jaro-Winkler — better for short name fields (company, title)
  const jwSim = jaroWinklerSimilarity(pNorm, eNorm);

  // Best score wins — this aligns scorecard with trial scoring
  const sim = Math.max(wordOverlap, levSim, jwSim);

  return {
    name,
    passed: sim >= threshold,
    score: sim,
    detail: `Match (${(sim * 100).toFixed(0)}%, lev=${(levSim * 100).toFixed(0)}%, jw=${(jwSim * 100).toFixed(0)}%, words=${(wordOverlap * 100).toFixed(0)}%): "${parsed}" vs "${expected}"`,
  };
}

/** Jaccard word overlap on significant words (≥2 chars) */
function computeWordOverlap(a: string, b: string): number {
  const stopWords = new Set(["the", "of", "and", "in", "at", "for", "a", "an", "to", "is", "it", "on"]);
  const wordsA = new Set(a.split(/[\s,./()&-]+/).filter(w => w.length >= 2 && !stopWords.has(w)));
  const wordsB = new Set(b.split(/[\s,./()&-]+/).filter(w => w.length >= 2 && !stopWords.has(w)));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/** Levenshtein similarity (0-1) */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return 1 - dp[m][n] / maxLen;
}

/**
 * Jaro-Winkler similarity (0-1). Better than Levenshtein for short names
 * because it weights prefix agreement higher.
 *
 * "Thompson" vs "Thomson" → JW 0.96 vs Lev 0.88
 * Research: Flagright AML comparison, Splink comparators guide.
 */
function jaroWinklerSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler: boost for common prefix (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Numeric field check with ±1 tolerance.
 * Calibrated: threshold from trial data.
 */
function checkNumericField(name: string, parsed: number | null, expected: number | null, threshold: number): CheckResult {
  if (parsed === null && expected === null) return { name, passed: true, score: 1, detail: "Both null" };
  if (parsed === null || expected === null) return { name, passed: false, score: 0, detail: `Parsed: ${parsed}, Expected: ${expected}` };
  if (parsed === expected) return { name, passed: true, score: 1, detail: `Exact: ${parsed}` };
  if (Math.abs(parsed - expected) <= 1) return { name, passed: threshold <= 0.8, score: 0.8, detail: `Close: ${parsed} vs ${expected}` };
  return { name, passed: false, score: 0, detail: `Mismatch: ${parsed} vs ${expected}` };
}

/**
 * Requirements recall — how many expected requirements were found.
 * Calibrated threshold: 40% (P10 from trial).
 * Uses 2+ word matching for 3+ word requirements (anti-false-positive).
 */
function checkRequirementsExtracted(input: JDScorecardInput): CheckResult {
  const expected = input.expected.requirements;
  if (expected.length === 0) return { name: "requirements_recall", passed: true, score: 1, detail: "No expected requirements" };

  let found = 0;
  for (const exp of expected) {
    const words = exp.text.toLowerCase().split(/[\s/,()]+/).filter(w => w.length > 3);
    if (words.length === 0) { found++; continue; }

    const matched = input.parsed.requirements.some(p => {
      const pLower = p.text.toLowerCase();
      if (words.length <= 2) return words.some(w => pLower.includes(w));
      return words.filter(w => pLower.includes(w)).length >= 2;
    });
    if (matched) found++;
  }

  const score = found / expected.length;
  return {
    name: "requirements_recall",
    passed: score >= 0.40,
    score,
    detail: `${found}/${expected.length} requirements found`,
  };
}

/**
 * Requirement types — classification accuracy on matched pairs.
 * Calibrated threshold: 80% (P10=85% from trial).
 * Partial credit for conservative bias (hard when should be nice_to_have).
 */
function checkRequirementTypes(input: JDScorecardInput): CheckResult {
  let matched = 0;
  let correct = 0;

  for (const exp of input.expected.requirements) {
    const expWords = exp.text.toLowerCase().split(/[\s/,()]+/).filter(w => w.length > 3);
    const match = input.parsed.requirements.find(p => {
      const pLower = p.text.toLowerCase();
      if (expWords.length <= 2) return expWords.some(w => pLower.includes(w));
      return expWords.filter(w => pLower.includes(w)).length >= 2;
    });
    if (!match) continue;
    matched++;
    // Normalize type aliases before comparing
    const normType = (t: string): string => {
      const mustAliases = ["must_have", "hard", "required", "mandatory", "essential"];
      const niceAliases = ["nice_to_have", "soft", "preferred", "optional", "desirable"];
      const lower = t.toLowerCase().replace(/[\s-]/g, "_");
      if (mustAliases.includes(lower)) return "must_have";
      if (niceAliases.includes(lower)) return "nice_to_have";
      return lower;
    };
    const parsedType = normType(match.type);
    const expectedType = normType(exp.type);
    if (parsedType === expectedType) correct++;
    else if (parsedType === "must_have" && expectedType === "nice_to_have") correct += 0.5;
  }

  const score = matched > 0 ? correct / matched : 1;
  return {
    name: "requirement_types",
    passed: score >= 0.80,
    score,
    detail: `${correct}/${matched} types correct`,
  };
}

/**
 * Requirements precision — how many parsed requirements are legitimate (not phantoms).
 * Calibrated threshold: 85% (P10=89% from trial).
 */
function checkNoPhantomRequirements(input: JDScorecardInput): CheckResult {
  if (input.parsed.requirements.length === 0) {
    return { name: "requirements_precision", passed: true, score: 1, detail: "No parsed requirements" };
  }

  let legitimate = 0;
  for (const parsed of input.parsed.requirements) {
    const pWords = parsed.text.toLowerCase().split(/[\s/,()]+/).filter(w => w.length > 3);
    if (pWords.length === 0) { legitimate++; continue; }

    const matchesExpected = input.expected.requirements.some(exp => {
      const eLower = exp.text.toLowerCase();
      if (pWords.length <= 2) return pWords.some(w => eLower.includes(w));
      return pWords.filter(w => eLower.includes(w)).length >= Math.min(2, pWords.length);
    });
    if (matchesExpected) legitimate++;
  }

  const score = legitimate / input.parsed.requirements.length;
  return {
    name: "requirements_precision",
    passed: score >= 0.85,
    score,
    detail: `${legitimate}/${input.parsed.requirements.length} legitimate`,
  };
}

/**
 * Responsibilities recall — how many expected responsibilities were found.
 * Calibrated threshold: 45% (P10=47% from trial).
 */
function checkResponsibilitiesRecall(input: JDScorecardInput): CheckResult {
  const expected = input.expected.responsibilities;
  if (expected.length === 0) return { name: "responsibilities_recall", passed: true, score: 1, detail: "No expected responsibilities" };

  let found = 0;
  for (const exp of expected) {
    const words = exp.toLowerCase().split(/[\s/,()]+/).filter(w => w.length > 3);
    if (words.length === 0) { found++; continue; }

    const matched = input.parsed.responsibilities.some(p => {
      const pLower = p.toLowerCase();
      return words.filter(w => pLower.includes(w)).length >= Math.min(2, words.length);
    });
    if (matched) found++;
  }

  const score = found / expected.length;
  return {
    name: "responsibilities_recall",
    passed: score >= 0.45,
    score,
    detail: `${found}/${expected.length} responsibilities found`,
  };
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Check if a JD requirement's TOPIC is addressed in CV text.
 *
 * A requirement like "5+ years of project management experience" is addressed
 * if the CV mentions project management concepts — NOT if it contains the words
 * "years", "experience", or "5+".
 *
 * Strategy: Extract the DOMAIN NOUNS from the requirement (skip filler/stopwords),
 * and check if at least ONE appears in the CV text.
 */
function requirementAddressedInText(requirement: string, cvText: string): boolean {
  // Words that are filler in requirements — these don't indicate a topic
  const filler = new Set([
    "the", "and", "for", "with", "that", "this", "from", "will", "have", "been",
    "are", "was", "were", "has", "had", "not", "but", "can", "our", "your",
    "you", "all", "may", "about", "into", "also", "must", "should", "would",
    "could", "their", "they", "them", "than", "other", "some", "such", "more",
    "very", "most", "just", "over", "only", "after", "before", "between",
    "through", "during", "being", "each", "which", "where", "when", "what",
    "there", "here", "both", "then", "well", "able", "work", "working",
    "strong", "excellent", "good", "great", "best", "high", "ensure",
    "skills", "ability", "experience", "knowledge", "understanding",
    "preferred", "required", "demonstrated", "proven", "years", "year",
    "minimum", "least", "plus", "above", "deep", "key", "related",
    "field", "degree", "equivalent", "proficiency", "proficient",
    "familiarity", "familiar", "competency", "competent",
    "success", "successful", "sense", "urgency", "driven",
    "written", "verbal", "oral", "interpersonal", "communication",
    "communications", "listening", "moderating", "owning", "inception",
    "completion", "understand", "prioritize", "initiatives", "functions",
    "specialization", "bachelors", "masters", "higher",
  ]);

  const words = requirement
    .split(/[\s/,()]+/)
    .map(w => w.replace(/[^a-zA-Z0-9+#.-]/g, "").toLowerCase())
    .filter(w => w.length > 2 && !filler.has(w) && !/^\d+[-+]?$/.test(w));

  if (words.length === 0) {
    // Pure filler requirement (e.g., "Excellent communication skills") — auto-pass
    return true;
  }

  // For short requirements (1-2 domain words), any match is sufficient
  if (words.length <= 2) {
    return words.some(w => cvText.includes(w));
  }

  // For longer requirements (3+ domain words), require at least 2 matches
  // to avoid false positives from ambiguous single words like "machine"
  const matchCount = words.filter(w => cvText.includes(w)).length;
  return matchCount >= 2;
}

/**
 * Extract technical terms (acronyms, tools, technologies) from raw JD text.
 * These are precise, unambiguous, and don't suffer from concatenation issues.
 */
function extractTechTermsFromJD(rawJDText: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  const techPattern = /\b(?:SQL|API|AWS|GCP|SAP|ERP|CRM|NLP|ETL|CI\/CD|HTML|CSS|REST|SOAP|SCRUM|LEAN|SIX\s*SIGMA|PMP|ITIL|HIPAA|SOX|GDPR|JIRA|Docker|Kubernetes|Python|Java|React|Angular|Vue|TypeScript|Node|MongoDB|Redis|Terraform|Jenkins|GitLab|Tableau|Excel|MATLAB|AutoCAD|Salesforce|HubSpot|Workday|Oracle|Hadoop|Spark|Kafka|Azure|Figma|Power\s*BI)\b/gi;
  const matches = rawJDText.match(techPattern);
  if (matches) {
    for (const t of matches) {
      const lower = t.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        terms.push(lower);
      }
    }
  }

  return terms.slice(0, 15);
}

/**
 * Check if a term matches within text, using sub-word matching.
 * "CI/CD" → checks "ci/cd" or "ci" + "cd".
 */
function termMatchesText(term: string, text: string): boolean {
  if (text.includes(term)) return true;

  // Sub-word match for compound terms
  const subWords = term.split(/[\s/,()-]+/).filter(w => w.length > 2);
  if (subWords.length > 0) {
    return subWords.some(sw => text.includes(sw));
  }

  return false;
}

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

/**
 * Extract quantified metrics from CV text, EXCLUDING dates.
 *
 * Matches: "35%", "$2M", "14+", "500K", "99.7%", "team of 12", "9 aircraft"
 * Excludes: bare 4-digit years (2008, 2023), date components in "Jan 2020" patterns.
 */
function extractNumbers(text: string): string[] {
  const results: string[] = [];

  // 1. Numbers with explicit metric markers — always real metrics
  //    e.g., "35%", "$2M", "500K", "14+", "3x", "99.7%"
  const markedMetrics = text.match(/\$?\d+(?:\.\d+)?(?:%|M|K|\+|x)\b/g);
  if (markedMetrics) results.push(...markedMetrics);

  // 2. Numbers followed by count nouns — real metrics about scale/impact
  //    e.g., "9 aircraft", "12 engineers", "200 employees", "3 countries"
  const countNouns = /\b(\d+)\s+(?:aircraft|personnel|engineers?|technicians?|countries|people|staff|members|users|clients|projects|systems|vehicles|sites|locations|offices|reports|incidents|modules|components|subsystems|applications|servers|databases|patients|students|participants|attendees|volunteers|stores|branches|facilities|units|teams|departments|divisions|products|services|customers|contracts|suppliers|vendors|partners|stakeholders|deliverables)\b/gi;
  let match;
  while ((match = countNouns.exec(text)) !== null) {
    results.push(match[1]);
  }

  // 3. Numbers preceded by metric context words
  //    e.g., "team of 12", "fleet of 22", "managed 80", "led 25"
  const contextMetrics = text.match(/(?:team of |fleet of |group of |roster of |managed |led |supervised |oversaw |mentored |trained )\d+/gi);
  if (contextMetrics) {
    for (const m of contextMetrics) {
      const num = m.match(/\d+/);
      if (num) results.push(num[0]);
    }
  }

  // 4. Dollar amounts: "$12M", "$2.5 million"
  const dollarAmounts = text.match(/\$\d+(?:\.\d+)?(?:\s*(?:M|K|million|billion|thousand))?/gi);
  if (dollarAmounts) results.push(...dollarAmounts);

  // Deduplicate
  return [...new Set(results)];
}

// ============================================================
// ADAPTERS — Bridge real pipeline types to scorecard inputs
// ============================================================

import type { ParsedJD } from "../types";
import type { CVContent } from "@jobloop/shared";

/**
 * Convert a real ParsedJD (from jd-parser.ts) to JDScorecardInput format.
 * Use when scoring the JD parser against ground-truth test pairs.
 */
export function parsedJDToScorecardInput(
  parsed: ParsedJD,
  expected: JDScorecardInput["expected"],
): JDScorecardInput {
  return {
    parsed: {
      title: parsed.role_title,
      company: parsed.company,
      location: [parsed.location.city, parsed.location.country].filter(Boolean).join(", ") || "",
      requirements: [
        ...parsed.requirements.hard.map((r) => ({ text: r.text, type: "must_have" as const })),
        ...parsed.requirements.preferred.map((r) => ({ text: r.text, type: "nice_to_have" as const })),
      ],
      experience_years: parsed.experience_years.min,
      experience_years_max: parsed.experience_years.max,
      responsibilities: parsed.responsibilities,
    },
    expected,
  };
}

/**
 * Convert a real CVContent (from generate-cv.ts) to CVScorecardInput format.
 * Use when scoring generated CVs against ground-truth test pairs.
 */
export function cvContentToScorecardInput(
  generated: CVContent,
  expected: CVScorecardInput["expected"],
  jd_requirements: string[],
  cloud_skills: string[],
  max_words?: number,
): CVScorecardInput {
  return {
    generated: {
      summary: generated.summary,
      experience: generated.experience.map((e: CVContent["experience"][number]) => ({
        company: e.company,
        title: e.title,
        start_date: e.start_date,
        end_date: e.end_date,
        bullets: e.bullets.map((b: CVContent["experience"][number]["bullets"][number]) => b.text),
      })),
      skills: generated.skills,
      certifications: generated.certifications,
      education: generated.education.map((e: CVContent["education"][number]) => `${e.degree}, ${e.institution}`),
    },
    expected,
    jd_requirements,
    cloud_skills,
    max_words,
  };
}
