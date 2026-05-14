-- Rename outcome_status value: "rejected" → "closed" (advocate framing)
-- Golden rule: "Closed" not "Rejected"

-- 1. Update existing rows
UPDATE public.applications SET outcome_status = 'closed' WHERE outcome_status = 'rejected';

-- 2. Replace the CHECK constraint
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_outcome_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_outcome_status_check
  CHECK (outcome_status IN ('pending', 'callback', 'interview', 'offer', 'closed', 'ghosted'));
