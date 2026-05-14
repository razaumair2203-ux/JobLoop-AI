import { z } from "zod";

// Job Description Input
export const jdInputSchema = z.object({
  text: z.string().min(50, "Job description must be at least 50 characters"),
  url: z.string().url().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
});
export type JDInput = z.infer<typeof jdInputSchema>;

// User Preferences (stored as JSONB on users table)
export const userPreferencesSchema = z.object({
  target_roles: z.array(z.string()).min(1),
  location_type: z.enum(["remote", "hybrid", "onsite"]),
  location_city: z.string().optional(),
  salary_min: z.number().positive().optional(),
  salary_max: z.number().positive().optional(),
  salary_currency: z.string().default("USD"),
});

// Cover Letter Generation Request
export const coverLetterRequestSchema = z.object({
  application_id: z.string().uuid(),
  tone: z.enum(["professional", "assertive", "technical", "conversational"]),
  focus_points: z.array(z.string()).max(5).optional(),
});
export type CoverLetterRequest = z.infer<typeof coverLetterRequestSchema>;

// Application Stage Update (pipeline stage)
export const stageUpdateSchema = z.object({
  application_id: z.string().uuid(),
  stage: z.enum(["saved", "analyzing", "ready_to_apply", "applied"]),
});
export type StageUpdate = z.infer<typeof stageUpdateSchema>;

// Outcome Status Update (what happened after applying)
export const outcomeUpdateSchema = z.object({
  application_id: z.string().uuid(),
  outcome_status: z.enum([
    "pending",
    "callback",
    "interview",
    "offer",
    "closed",
    "ghosted",
  ]),
  user_feedback: z.string().optional(), // "Anything worth noting?"
});
export type OutcomeUpdate = z.infer<typeof outcomeUpdateSchema>;
