/**
 * Parsed data types — output of AI extraction, input to matching
 */

export interface ParsedJD {
  company: string;
  role_title: string;
  seniority_level: string;
  location: {
    city: string | null;
    country: string | null;
    remote: boolean | string;
  };
  experience_years: {
    min: number | null;
    max: number | null;
    raw_text: string;
  };
  requirements: {
    hard: Array<{
      text: string;
      category: string;
      keywords: string[];
    }>;
    preferred: Array<{
      text: string;
      category: string;
      keywords: string[];
    }>;
  };
  technologies_mentioned: Array<{
    name: string;
    context: "required" | "preferred" | "mentioned";
  }>;
  responsibilities: string[];
}

export interface ParsedCV {
  // Contact (preserved for conflict detection across CVs)
  name?: string;
  email?: string | null;
  phone?: string | null;
  location?: {
    city: string | null;
    country: string | null;
  };
  links?: {
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    other: string[];
  };
  summary?: string | null;

  total_experience_years: number;

  experience: Array<{
    company: string;
    employer?: string | null;
    title: string;
    start_date?: string;
    end_date?: string;
    duration_months: number;
    location?: string | null;
    bullets?: string[];
    technologies_used: string[];
    metrics_mentioned: string[];
    programs?: string[];
    team_size?: number | null;
    seniority_signals?: string[];
    domain: string;
  }>;

  skills: Array<{
    name: string;
    original_text?: string;
    domain: string;
    category: string;
    source: string;
  }>;

  all_technologies: string[];

  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number | null;
    end_year: number | null;
    grade?: string;
    research_topic?: string | null;
    highlights?: string[];
  }>;

  // Names only — backward compatible with all downstream consumers
  certifications: string[];

  // Rich cert data from parser (issuer, year, tier) — optional, for Cloud enrichment
  certifications_detailed?: Array<{
    name: string;
    issuer: string | null;
    year: number | null;
    active: boolean;
    tier: "gold" | "specialization" | "course" | "military";
  }>;

  competencies?: string[];

  awards?: Array<{
    title: string;
    issuer: string;
    context: string;
    significance?: string | null;
  }>;

  projects?: Array<{
    name: string;
    description: string;
    outcome: string;
    technologies: string[];
    is_professional?: boolean;
  }>;

  publications?: Array<{
    title: string;
    venue: string;
    year?: number | null;
    peer_reviewed?: boolean;
  }>;

  volunteer?: Array<{
    organization: string;
    role: string;
    start_date?: string | null;
    end_date?: string | null;
    description: string;
    impact?: string | null;
  }>;

  leadership?: Array<{
    organization: string;
    role: string;
    start_date?: string | null;
    end_date?: string | null;
    description: string;
    scope?: string | null;
  }>;

  professional_affiliations?: string[];

  training?: Array<{
    name: string;
    provider?: string | null;
    year?: number | null;
    hours?: number | null;
  }>;

  languages_spoken?: string[];

  conflicts?: Array<{
    type: "overlapping_dates" | "inconsistent_title" | "duplicate_role" | "gap" | "other";
    description: string;
  }>;
}
