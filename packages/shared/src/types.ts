// User & Auth
export type AuthProvider = "google" | "linkedin" | "email";
export type Plan = "free" | "pro" | "sprint";
export type JobSearchStatus =
  | "actively_looking"
  | "casually_browsing"
  | "employed_exploring";

// Persona — selected during onboarding Step 1, drives Socratic question framing + CV section order
export type UserPersona =
  | "early_career"    // recent graduate, education-heavy, building first CV
  | "mid_career"      // 5-15 years, results-focused, showing progression
  | "senior"          // 15+ years, deep domain expertise, breadth of impact
  | "executive"       // leadership/C-level, scope/budget/P&L, transformation
  | "career_changer"  // switching industries, transferable skills focus
  | "freelancer"      // contract/consulting background, project-based
  | "returner"        // re-entering workforce after voluntary gap
  | "laid_off"        // recently displaced, urgency-driven, reframe narrative
  | "military";       // military/gov transition, rank→leadership, clearances

export interface UserPreferences {
  target_roles: string[];
  location_type: "remote" | "hybrid" | "onsite";
  location_city?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  auth_provider: AuthProvider;
  linkedin_profile_url: string | null;
  persona: UserPersona | null;
  job_search_status: JobSearchStatus | null;
  preferences: UserPreferences;
  onboarding_completed: boolean;
  onboarding_step: number; // 1-5, tracks progress
  plan: Plan;
  plan_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Position Assessment — NOT a score. A label with transparent basis.
export type PositionLabel = "Strong position" | "Competitive" | "Stretch" | "Major gaps";

export interface PositionAssessment {
  label: PositionLabel;
  basis: string; // e.g., "6/8 requirements have evidence (75%)"
}

// Application Pipeline Stage (where the app is in our system)
export type ApplicationStage =
  | "saved"
  | "analyzing"
  | "ready_to_apply"
  | "applied";

// Outcome Status (what happened after applying — user-updated)
export type OutcomeStatus =
  | "pending"
  | "callback"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

// Outcome Signal — per-skill feedback from employer interactions
export interface SkillSignal {
  skill_id: string; // maps to CloudNode id
  signal: "positive" | "gap";
  context: string; // what the employer said/implied
  niche: string; // industry + role type (e.g., "fintech/data-eng")
  date: string;
}

// Parsed outcome feedback (from Haiku parsing user's free-text)
export interface ParsedOutcomeFeedback {
  positive_signals: SkillSignal[];
  gap_signals: SkillSignal[];
  context: string | null; // competitive loss, overqualified, etc.
}

// Application Source
export type ApplicationSource =
  | "linkedin"
  | "indeed"
  | "company_site"
  | "referral"
  | "other";

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  industry: string | null;
  seniority_level: string | null;
  source: ApplicationSource;
  source_url: string | null;
  jd_text: string;
  jd_parsed: Record<string, unknown> | null; // ParsedJD from packages/ai
  applied_date: string | null;
  cv_version_id: string | null;
  cover_letter_id: string | null;
  stage: ApplicationStage;
  position: PositionAssessment | null;

  // Outcome Intelligence v3
  outcome_status: OutcomeStatus;
  outcome_updated_at: string | null;
  user_feedback: string | null; // raw free-text
  parsed_feedback: ParsedOutcomeFeedback | null;

  // Match snapshot at time of application
  match_analysis: {
    gaps: string[];
    strengths: string[];
    bridge_strategies: string[];
    recommendation_level: "strong" | "competitive" | "stretch";
  } | null;
  cloud_snapshot_id: string | null;
  socratic_qa: Array<{ question: string; answer: string }>;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Niche Intelligence Profile (accumulated from outcome signals)
export interface NicheProfile {
  niche: string; // e.g., "fintech/data-eng"
  application_count: number;
  strong_signals: Array<{ skill_id: string; count: number }>;
  gap_signals: Array<{ skill_id: string; count: number }>;
  no_signal_skills: string[]; // ghosted = no information
}

// CV Templates
export type CVTemplateId = "professional" | "technical" | "modern";

// CV Content — the canonical structure stored in CVVersion.content, rendered to PDF/DOCX
export interface CVContent {
  contact: {
    full_name: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
  };

  summary: string;

  experience: Array<{
    company: string;
    title: string;
    start_date: string;    // "Jan 2020"
    end_date: string;       // "Present" or "Dec 2023"
    location: string;
    bullets: Array<{
      text: string;
      jd_matches: string[];       // which JD requirements this bullet addresses
      evidence_sources: string[]; // Cloud evidence IDs — powers "Why this wording?"
    }>;
  }>;

  skills: Record<string, string[]>; // { "Languages": ["Python", "Go"], ... }

  education: Array<{
    institution: string;
    degree: string;
    year: string;
    highlights: string[];
  }>;

  certifications: string[];

  settings: {
    section_order: string[];   // persona-driven, user can override
    max_pages: 1 | 2;
    template_id: CVTemplateId;
    accent_color: string;      // hex, default per template
    font: "inter" | "arial" | "calibri";
    show_photo: boolean;       // off by default, Phase 2
    photo_url: string | null;
  };

  ai_metadata: {
    changes_made: string[];
    keywords_integrated: string[];
    warnings: string[];
    keyword_match_count: number;
    evidence_citation_count: number;
    sections_improved: number;
  };
}

// CV Version — wraps CVContent with versioning metadata
export interface CVVersion {
  id: string;
  user_id: string;
  base_version_id: string | null;
  name: string;
  content: CVContent;
  change_summary: string | null;
  created_at: string;
}

// Cover Letter
export type CoverLetterTone =
  | "professional"
  | "assertive"
  | "technical"
  | "conversational";

// Structured cover letter content — powers editable UI + evidence citations
export interface CoverLetterParagraph {
  type: "opening" | "body" | "closing";
  text: string;
  evidence_used: string[];
  strategy: string; // "Why this approach?" — shown to user
}

export interface CoverLetterContent {
  paragraphs: CoverLetterParagraph[];
  tone: CoverLetterTone;
  jd_requirements_addressed: string[];
  evidence_summary: string; // one-line "Why this approach?" summary
  word_count: number;
  warnings: string[];
}

export interface CoverLetter {
  id: string;
  user_id: string;
  application_id: string;
  tone: CoverLetterTone;
  content: CoverLetterContent;
  created_at: string;
}
