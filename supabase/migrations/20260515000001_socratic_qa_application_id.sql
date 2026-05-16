-- Add application_id to socratic_qa for JD-match question linkage
-- Allows correlating which Socratic questions were generated for which application
ALTER TABLE socratic_qa ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id);

-- Index for fast lookup of questions per application
CREATE INDEX IF NOT EXISTS idx_socratic_qa_application_id ON socratic_qa(application_id) WHERE application_id IS NOT NULL;
