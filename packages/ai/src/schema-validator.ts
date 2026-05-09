/**
 * Runtime Zod validation for LLM output.
 *
 * LLM output is UNTRUSTED data. This validator runs IMMEDIATELY after
 * every LLM response, BEFORE it enters cleaner, taxonomy, or any
 * downstream processing.
 *
 * Used both at runtime (analyze.ts) and in test scripts (fixture validation).
 */

import { z } from "zod";

// ============================================================
// ParsedCVOutput schema — mirrors cv-parser.ts interface exactly
// ============================================================

const ExperienceSchema = z.object({
  company: z.string().min(1),
  employer: z.string().nullable(),
  title: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  duration_months: z.number().min(0),
  location: z.string().nullable(),
  bullets: z.array(z.string()),
  technologies_used: z.array(z.string()),
  metrics_mentioned: z.array(z.string()),
  programs: z.array(z.string()),
  team_size: z.number().nullable(),
  seniority_signals: z.array(z.string()),
  domain: z.string().min(1),
});

const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string(),
  start_year: z.number().nullable(),
  end_year: z.number().nullable(),
  grade: z.string().nullable().optional(),
  research_topic: z.string().nullable().optional(),
  highlights: z.array(z.string()),
});

const SkillSchema = z.object({
  name: z.string().min(1),
  original_text: z.string().min(1),
  domain: z.string().min(1),
  category: z.string().min(1),
  source: z.enum(["skills_section", "experience", "certification", "education", "summary"]),
});

const CertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().nullable(),
  year: z.number().nullable(),
  active: z.boolean(),
  tier: z.enum(["gold", "specialization", "course", "military"]),
});

const AwardSchema = z.object({
  title: z.string().min(1),
  issuer: z.string(),
  context: z.string(),
  significance: z.string().nullable(),
});

const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  outcome: z.string(),
  technologies: z.array(z.string()),
  is_professional: z.boolean(),
});

const PublicationSchema = z.object({
  title: z.string().min(1),
  venue: z.string(),
  year: z.number().nullable(),
  peer_reviewed: z.boolean(),
});

const VolunteerSchema = z.object({
  organization: z.string().min(1),
  role: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  description: z.string(),
  impact: z.string().nullable(),
});

const LeadershipSchema = z.object({
  organization: z.string().min(1),
  role: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  description: z.string(),
  scope: z.string().nullable(),
});

const TrainingSchema = z.object({
  name: z.string().min(1),
  provider: z.string().nullable(),
  year: z.number().nullable(),
  hours: z.number().nullable(),
});

const ConflictSchema = z.object({
  type: z.enum(["overlapping_dates", "inconsistent_title", "duplicate_role", "gap", "other"]),
  description: z.string(),
});

export const ParsedCVOutputSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.object({
    city: z.string().nullable(),
    country: z.string().nullable(),
  }),
  links: z.object({
    linkedin: z.string().nullable(),
    github: z.string().nullable(),
    portfolio: z.string().nullable(),
    other: z.array(z.string()),
  }),
  summary: z.string().nullable(),
  total_experience_years: z.number().min(0),
  experience: z.array(ExperienceSchema).min(0),
  education: z.array(EducationSchema),
  skills: z.array(SkillSchema),
  competencies: z.array(z.string()),
  certifications: z.array(CertificationSchema),
  awards: z.array(AwardSchema),
  projects: z.array(ProjectSchema),
  publications: z.array(PublicationSchema),
  volunteer: z.array(VolunteerSchema),
  leadership: z.array(LeadershipSchema),
  professional_affiliations: z.array(z.string()),
  training: z.array(TrainingSchema),
  languages_spoken: z.array(z.string()),
  all_technologies: z.array(z.string()),
  conflicts: z.array(ConflictSchema),
});

export type ValidatedParsedCVOutput = z.infer<typeof ParsedCVOutputSchema>;

// ============================================================
// Validation functions
// ============================================================

export interface ValidationResult {
  valid: boolean;
  data?: ValidatedParsedCVOutput;
  errors?: z.ZodError;
  /** Human-readable summary of what's wrong */
  errorSummary?: string;
}

/**
 * Validate LLM output against ParsedCVOutput schema.
 * Returns typed result — never throws.
 */
export function validateParsedCVOutput(data: unknown): ValidationResult {
  const result = ParsedCVOutputSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const errorSummary = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  return { valid: false, errors: result.error, errorSummary };
}

/**
 * Attempt to repair common LLM output issues before validation.
 * Fixes: missing arrays (→ []), missing nullables (→ null), string numbers (→ number).
 * Does NOT invent data — only fixes structural issues.
 */
export function repairLLMOutput(data: Record<string, unknown>): Record<string, unknown> {
  const repaired = { ...data };

  // Ensure arrays exist for all array fields
  const arrayFields = [
    "experience", "education", "skills", "competencies", "certifications",
    "awards", "projects", "publications", "volunteer", "leadership",
    "professional_affiliations", "training", "languages_spoken",
    "all_technologies", "conflicts",
  ];
  for (const field of arrayFields) {
    if (repaired[field] === undefined || repaired[field] === null) {
      repaired[field] = [];
    }
  }

  // Ensure location object exists
  if (!repaired.location || typeof repaired.location !== "object") {
    repaired.location = { city: null, country: null };
  }

  // Ensure links object exists
  if (!repaired.links || typeof repaired.links !== "object") {
    repaired.links = { linkedin: null, github: null, portfolio: null, other: [] };
  }

  // Fix string numbers in total_experience_years
  if (typeof repaired.total_experience_years === "string") {
    repaired.total_experience_years = parseFloat(repaired.total_experience_years) || 0;
  }

  // Fix experience entries
  if (Array.isArray(repaired.experience)) {
    repaired.experience = (repaired.experience as Record<string, unknown>[]).map((exp) => ({
      ...exp,
      bullets: exp.bullets ?? [],
      technologies_used: exp.technologies_used ?? [],
      metrics_mentioned: exp.metrics_mentioned ?? [],
      programs: exp.programs ?? [],
      seniority_signals: exp.seniority_signals ?? [],
      team_size: exp.team_size ?? null,
      employer: exp.employer ?? null,
      location: exp.location ?? null,
      duration_months: typeof exp.duration_months === "string"
        ? parseFloat(exp.duration_months as string) || 0
        : exp.duration_months ?? 0,
    }));
  }

  // Fix education entries
  if (Array.isArray(repaired.education)) {
    repaired.education = (repaired.education as Record<string, unknown>[]).map((edu) => ({
      ...edu,
      highlights: edu.highlights ?? [],
      start_year: edu.start_year ?? null,
      end_year: edu.end_year ?? null,
      grade: edu.grade ?? null,
      research_topic: edu.research_topic ?? null,
    }));
  }

  // Fix certification entries — handle string[] from older models
  if (Array.isArray(repaired.certifications)) {
    repaired.certifications = (repaired.certifications as unknown[]).map((cert) => {
      if (typeof cert === "string") {
        return { name: cert, issuer: null, year: null, active: true, tier: "course" as const };
      }
      return cert;
    });
  }

  return repaired;
}
