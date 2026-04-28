// User & Auth
export type AuthProvider = "google" | "linkedin" | "email";
export type Plan = "free" | "pro" | "sprint";
export type JobSearchStatus =
  | "actively_looking"
  | "casually_browsing"
  | "employed_exploring";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  auth_provider: AuthProvider;
  linkedin_profile_url: string | null;
  onboarding_completed: boolean;
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

// Application Tracking
export type ApplicationStatus =
  | "saved"
  | "analyzing"
  | "ready_to_apply"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn"
  | "no_response";

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  source: string;
  url: string | null;
  jd_text: string;
  applied_date: string | null;
  cv_version_id: string | null;
  cover_letter_id: string | null;
  status: ApplicationStatus;
  position: PositionAssessment | null;
  response_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// CV
export interface CVVersion {
  id: string;
  user_id: string;
  base_version_id: string | null;
  job_id: string | null;
  name: string;
  content: Record<string, unknown>;
  change_summary: string;
  created_at: string;
}

// Cover Letter
export type CoverLetterTone =
  | "professional"
  | "assertive"
  | "technical"
  | "conversational";

export interface CoverLetter {
  id: string;
  user_id: string;
  application_id: string;
  tone: CoverLetterTone;
  content: string;
  created_at: string;
}
