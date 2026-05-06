-- User Feedback — stores natural language feedback signals
-- Used by POST /api/feedback for learning and system adjustment

create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  task_type text not null,
  message text not null,
  classified_intent text not null,
  classified_signal text not null,
  specifics jsonb not null default '[]',
  new_information text,
  system_adjustment text not null,
  confidence text not null check (confidence in ('high', 'medium')),
  created_at timestamptz default now()
);

create index idx_user_feedback_user on public.user_feedback(user_id);
create index idx_user_feedback_app on public.user_feedback(application_id);

alter table public.user_feedback enable row level security;

create policy "Own feedback" on public.user_feedback
  for all using (auth.uid() = user_id);

-- Add RLS policy for cv_uploads (was missing from cv_uploads migration)
alter table public.cv_uploads enable row level security;

create policy "Own cv uploads" on public.cv_uploads
  for all using (auth.uid() = user_id);
