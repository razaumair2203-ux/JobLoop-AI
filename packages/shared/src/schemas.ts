import { z } from "zod";

// Job Description Input
export const jdInputSchema = z.object({
  text: z.string().min(50, "Job description must be at least 50 characters"),
  url: z.string().url().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
});
export type JDInput = z.infer<typeof jdInputSchema>;

// User Preferences
export const userPreferencesSchema = z.object({
  target_roles: z.array(z.string()).min(1),
  location_type: z.enum(["remote", "hybrid", "onsite"]),
  location_city: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().default("USD"),
  job_search_status: z.enum([
    "actively_looking",
    "casually_browsing",
    "employed_exploring",
  ]),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Cover Letter Generation Request
export const coverLetterRequestSchema = z.object({
  application_id: z.string().uuid(),
  tone: z.enum(["professional", "assertive", "technical", "conversational"]),
  focus_points: z.array(z.string()).optional(),
});
export type CoverLetterRequest = z.infer<typeof coverLetterRequestSchema>;

// Application Status Update
export const statusUpdateSchema = z.object({
  application_id: z.string().uuid(),
  status: z.enum([
    "saved",
    "analyzing",
    "ready_to_apply",
    "applied",
    "interviewing",
    "offered",
    "rejected",
    "withdrawn",
    "no_response",
  ]),
  notes: z.string().optional(),
});
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;
