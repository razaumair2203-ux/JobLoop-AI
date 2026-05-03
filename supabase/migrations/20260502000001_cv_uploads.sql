-- CV Uploads — tracks raw uploaded CV files
-- Each file is stored in Supabase Storage, text extracted server-side

create table public.cv_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  storage_path text not null, -- path in Supabase Storage bucket
  file_size integer not null,
  mime_type text not null,
  extracted_text text, -- raw text extracted from PDF/DOCX
  parsed_cv jsonb, -- ParsedCV output from AI
  status text not null default 'uploaded' check (status in (
    'uploaded', 'extracting', 'parsing', 'parsed', 'error'
  )),
  error_message text,
  created_at timestamptz default now()
);

create index idx_cv_uploads_user on public.cv_uploads(user_id);

-- Storage bucket (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false);
