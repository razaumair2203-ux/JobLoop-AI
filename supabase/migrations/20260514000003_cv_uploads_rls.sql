-- Enable RLS on cv_uploads (may already be enabled via dashboard)
alter table public.cv_uploads enable row level security;

-- Users can read their own CVs
create policy "Users can read own CVs"
  on public.cv_uploads for select
  using (auth.uid() = user_id);

-- Users can insert their own CVs
create policy "Users can insert own CVs"
  on public.cv_uploads for insert
  with check (auth.uid() = user_id);

-- Users can update their own CVs
create policy "Users can update own CVs"
  on public.cv_uploads for update
  using (auth.uid() = user_id);

-- Users can delete their own CVs
create policy "Users can delete own CVs"
  on public.cv_uploads for delete
  using (auth.uid() = user_id);
