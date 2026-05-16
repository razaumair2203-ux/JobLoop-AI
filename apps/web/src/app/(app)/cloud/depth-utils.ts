/**
 * Client-side depth inference — mirrors packages/ai/src/taxonomy.ts inferDepthLevel()
 * Used when the API returns summary but not pre-computed depth.
 */
export function inferDepthLevel(summary: {
  total_months_used: number;
  number_of_roles: number;
  has_impact: boolean;
  has_external_validation: boolean;
  has_depth: boolean;
  has_project: boolean;
  last_used: string | null;
}): {
  level: "mentioned" | "applied" | "proficient" | "expert";
  totalMonths: number;
  roleCount: number;
  hasImpact: boolean;
  hasCertification: boolean;
} {
  const roleCount = summary.number_of_roles;
  const totalMonths = summary.total_months_used;
  const hasImpact = summary.has_impact;
  const hasCert = summary.has_external_validation;

  let level: "mentioned" | "applied" | "proficient" | "expert" = "mentioned";

  if (roleCount >= 3 && totalMonths >= 60 && (hasImpact || hasCert)) {
    level = "expert";
  } else if (roleCount >= 2 || totalMonths >= 24) {
    level = "proficient";
  } else if (roleCount >= 1) {
    level = "applied";
  }

  return { level, totalMonths, roleCount, hasImpact, hasCertification: hasCert };
}
