/**
 * Skill Matching — Smart string matching with word boundaries and aliases.
 *
 * Solves the .includes() problem where "Java" matches "JavaScript",
 * "Go" matches "Google", "C" matches everything, etc.
 */

// Common technology aliases and variations
const SKILL_ALIASES: Record<string, string[]> = {
  "javascript": ["js", "ecmascript", "es6", "es2015"],
  "typescript": ["ts"],
  "python": ["py"],
  "kubernetes": ["k8s", "kube"],
  "docker": ["containerization"],
  "react": ["reactjs", "react.js"],
  "react native": ["reactnative"],
  "vue": ["vuejs", "vue.js"],
  "angular": ["angularjs"],
  "node.js": ["nodejs", "node"],
  "next.js": ["nextjs", "next"],
  "express": ["expressjs", "express.js"],
  "postgresql": ["postgres", "psql"],
  "mongodb": ["mongo"],
  "dynamodb": ["dynamo"],
  "elasticsearch": ["elastic", "es"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp", "google cloud"],
  "microsoft azure": ["azure"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous deployment"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "natural language processing": ["nlp"],
  "graphql": ["gql"],
  "rest api": ["restful", "rest apis", "restful api"],
  "terraform": ["tf"],
  "github actions": ["gh actions"],
  "c#": ["csharp", "c sharp"],
  "c++": ["cpp", "cplusplus"],
  "objective-c": ["objc"],
  "ruby on rails": ["rails", "ror"],
  "spring boot": ["springboot"],
  ".net": ["dotnet"],
  "html": ["html5"],
  "css": ["css3"],
  "tailwind": ["tailwindcss", "tailwind css"],
  "sass": ["scss"],
  "redis": [],
  "kafka": ["apache kafka"],
  "rabbitmq": ["rabbit mq"],
  "nginx": [],
  "apache": [],
  "linux": [],
  "git": [],
  "jira": [],
  "figma": [],
  "aws lambda": ["lambda"],
  "s3": ["aws s3", "amazon s3"],
  "ec2": ["aws ec2"],
  "sqs": ["aws sqs"],
  "sns": ["aws sns"],
};

// Build reverse lookup: alias -> canonical name
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  ALIAS_TO_CANONICAL.set(canonical, canonical);
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias, canonical);
  }
}

/**
 * Normalize a skill name to its canonical form.
 * "K8s" -> "kubernetes", "JS" -> "javascript", etc.
 */
export function normalizeSkillName(name: string): string {
  const lower = name.toLowerCase().trim();
  return ALIAS_TO_CANONICAL.get(lower) || lower;
}

/**
 * Check if two skill names refer to the same technology.
 * Uses word boundary matching + alias resolution.
 */
export function skillsMatch(skillA: string, skillB: string): boolean {
  const normA = normalizeSkillName(skillA);
  const normB = normalizeSkillName(skillB);

  // Exact match after normalization
  if (normA === normB) return true;

  // One contains the other as a complete word (word boundary check)
  if (wordBoundaryMatch(normA, normB) || wordBoundaryMatch(normB, normA)) {
    return true;
  }

  return false;
}

/**
 * Find the best matching node name from a list of candidates.
 * Returns null if no match found.
 */
export function findBestSkillMatch(
  target: string,
  candidates: string[]
): string | null {
  const normTarget = normalizeSkillName(target);

  // Exact match first
  for (const candidate of candidates) {
    if (normalizeSkillName(candidate) === normTarget) {
      return candidate;
    }
  }

  // Word boundary match
  for (const candidate of candidates) {
    const normCandidate = normalizeSkillName(candidate);
    if (wordBoundaryMatch(normTarget, normCandidate) || wordBoundaryMatch(normCandidate, normTarget)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Check if `needle` appears as a complete word within `haystack`.
 * Prevents "Java" matching "JavaScript" or "Go" matching "Google".
 */
function wordBoundaryMatch(needle: string, haystack: string): boolean {
  if (needle.length < 2) return needle === haystack; // Single chars must be exact
  try {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(haystack);
  } catch {
    return needle === haystack;
  }
}
