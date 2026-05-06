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
  total_experience_years: number;
  experience: Array<{
    company: string;
    title: string;
    start_date?: string;
    end_date?: string;
    duration_months: number;
    technologies_used: string[];
    metrics_mentioned: string[];
    domain: string;
  }>;
  skills: {
    languages: string[];
    frameworks: string[];
    infrastructure: string[];
    databases: string[];
    tools: string[];
    other: string[];
  };
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
  certifications: string[];
}
