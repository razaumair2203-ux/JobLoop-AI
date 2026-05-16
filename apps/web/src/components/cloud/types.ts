/**
 * Cloud visualization types — shared across all Cloud UI components.
 * These map from the API response to what the UI needs.
 */

export interface CloudIdentity {
  name: string;
  core_profession: string;
  specializations: string[];
  career_stage: string;
  qualification_country: string | null;
  qualification_degrees: string[];
  niche_differentiators: string[];
}

export interface CloudEvidence {
  type: string;
  company?: string;
  title?: string;
  duration_months?: number;
  name?: string;
  issuer?: string;
  description?: string;
  context?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}

export type NodeTier = "core_skill" | "certification" | "education" | "voluntary" | "license";

export interface CloudSkillNode {
  id: string;
  name: string;
  tier: NodeTier;
  category: string;
  domain: string;
  evidence: CloudEvidence[];
  summary: {
    total_months_used: number;
    number_of_roles: number;
    has_impact: boolean;
    has_external_validation: boolean;
    has_depth: boolean;
    has_project: boolean;
    last_used: string | null;
  };
  depth?: {
    level: "mentioned" | "applied" | "proficient" | "expert";
    totalMonths: number;
    roleCount: number;
    hasImpact: boolean;
    hasCertification: boolean;
  };
}

export interface CloudTrajectoryRole {
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  domain: string;
  seniority_level: number;
  isTraining: boolean;
}

export interface CloudStats {
  years: number;
  roles: number;
  skills: number;
  evidencePoints: number;
  domains: number;
  certCount: number;
}

export interface CloudData {
  identity: CloudIdentity;
  nodes: CloudSkillNode[];
  trajectory: { roles: CloudTrajectoryRole[] };
  stats: CloudStats;
}
