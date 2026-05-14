-- Fix cv_uploads status CHECK constraint
-- Missing: 'conflicts_detected' (set by upload route when cross-CV conflicts found)
--          'pending_parse' (set in dev mode when Claude Code parses via Supabase)

alter table public.cv_uploads drop constraint cv_uploads_status_check;

alter table public.cv_uploads add constraint cv_uploads_status_check
  check (status in (
    'uploaded', 'extracting', 'parsing', 'parsed', 'error',
    'conflicts_detected', 'pending_parse'
  ));
