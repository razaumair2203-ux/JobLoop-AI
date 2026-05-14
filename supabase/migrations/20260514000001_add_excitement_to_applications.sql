-- Add excitement (interest rating 1-5) to applications
-- Used by tracker UI to let users rate their enthusiasm for a role
-- Helps prioritise application effort

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS excitement integer CHECK (excitement BETWEEN 1 AND 5);
