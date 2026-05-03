-- JobLoop AI — Initial Database Schema
-- Supabase (PostgreSQL 15+)
-- Matches: packages/shared/src/types.ts

-- ============================================================
-- USERS
-- ============================================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  auth_provider text not null check (auth_provider in ('google', 'linkedin', 'email')),
  linkedin_profile_url text,
  persona text check (persona in (
    'early_career', 'mid_career', 'senior', 'executive',
    'career_changer', 'freelancer', 'returner', 'laid_off', 'military'
  )),
  job_search_status text check (job_search_status in (
    'actively_looking', 'casually_browsing', 'employed_exploring'
  )),
  preferences jsonb not null default '{}', -- { target_roles, location_type, salary_min, etc. }
  onboarding_completed boolean default false,
  onboarding_step integer default 1 check (onboarding_step between 1 and 5),
  plan text not null default 'free' check (plan in ('free', 'pro', 'sprint')),
  plan_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROFILE CLOUD
-- ============================================================

create table public.cloud_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('skill', 'capability', 'domain')),
  name text not null,
  category text not null, -- 'language', 'framework', 'infrastructure', 'soft_skill', etc.
  evidence jsonb not null default '[]', -- array of Evidence objects
  summary jsonb not null default '{}', -- EvidenceSummary object
  outcome_signals jsonb not null default '[]', -- array of SkillSignal (v3)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, name) -- one node per skill per user
);

create index idx_cloud_nodes_user on public.cloud_nodes(user_id);

-- Cloud snapshots (frozen state at time of application)
create table public.cloud_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  snapshot jsonb not null, -- full cloud state serialized
  created_at timestamptz default now()
);

create index idx_cloud_snapshots_user on public.cloud_snapshots(user_id);

-- ============================================================
-- CV VERSIONS
-- ============================================================

create table public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  base_version_id uuid references public.cv_versions(id),
  name text not null,
  content jsonb not null, -- structured CV content
  change_summary text,
  created_at timestamptz default now()
);

create index idx_cv_versions_user on public.cv_versions(user_id);

-- ============================================================
-- APPLICATIONS (with Application Footprint — Outcome Intelligence v3)
-- ============================================================

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company text not null,
  role text not null,
  industry text,
  seniority_level text,
  source text not null check (source in (
    'linkedin', 'indeed', 'company_site', 'referral', 'other'
  )),
  source_url text,
  jd_text text not null,
  jd_parsed jsonb, -- ParsedJD object
  applied_date timestamptz,
  cv_version_id uuid references public.cv_versions(id),
  cover_letter_id uuid, -- FK added after cover_letters table

  -- Pipeline stage
  stage text not null default 'saved' check (stage in (
    'saved', 'analyzing', 'ready_to_apply', 'applied'
  )),

  -- Position assessment
  position jsonb, -- { label, basis }

  -- Outcome Intelligence v3
  outcome_status text not null default 'pending' check (outcome_status in (
    'pending', 'callback', 'interview', 'offer', 'rejected', 'ghosted'
  )),
  outcome_updated_at timestamptz,
  user_feedback text, -- raw free-text ("Anything worth noting?")
  parsed_feedback jsonb, -- ParsedOutcomeFeedback object

  -- Match snapshot
  match_analysis jsonb, -- { gaps, strengths, bridge_strategies, recommendation_level }
  cloud_snapshot_id uuid references public.cloud_snapshots(id),

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_applications_user on public.applications(user_id);
create index idx_applications_company on public.applications(user_id, company);
create index idx_applications_niche on public.applications(user_id, industry);
create index idx_applications_outcome on public.applications(user_id, outcome_status);

-- ============================================================
-- SOCRATIC Q&A (linked to applications, never re-asked)
-- ============================================================

create table public.socratic_qa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  question text not null,
  answer text,
  gate text not null check (gate in ('cv_upload', 'jd_match', 'user_initiated')),
  skill_targeted text, -- which cloud node this enriches
  answered_at timestamptz,
  created_at timestamptz default now()
);

create index idx_socratic_user on public.socratic_qa(user_id);

-- ============================================================
-- COVER LETTERS
-- ============================================================

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  tone text not null check (tone in (
    'professional', 'assertive', 'technical', 'conversational'
  )),
  content jsonb not null, -- CoverLetterContent: paragraphs with evidence citations
  created_at timestamptz default now()
);

-- Add FK from applications to cover_letters
alter table public.applications
  add constraint fk_cover_letter
  foreign key (cover_letter_id) references public.cover_letters(id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.cloud_nodes enable row level security;
alter table public.cloud_snapshots enable row level security;
alter table public.cv_versions enable row level security;
alter table public.applications enable row level security;
alter table public.socratic_qa enable row level security;
alter table public.cover_letters enable row level security;

-- Users can only access their own data
create policy "Users insert own data" on public.users
  for insert with check (auth.uid() = id);
create policy "Users read own data" on public.users
  for select using (auth.uid() = id);
create policy "Users update own data" on public.users
  for update using (auth.uid() = id);

create policy "Own cloud nodes" on public.cloud_nodes
  for all using (auth.uid() = user_id);

create policy "Own cloud snapshots" on public.cloud_snapshots
  for all using (auth.uid() = user_id);

create policy "Own CV versions" on public.cv_versions
  for all using (auth.uid() = user_id);

create policy "Own applications" on public.applications
  for all using (auth.uid() = user_id);

create policy "Own socratic QA" on public.socratic_qa
  for all using (auth.uid() = user_id);

create policy "Own cover letters" on public.cover_letters
  for all using (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute function public.update_updated_at();
create trigger cloud_nodes_updated_at before update on public.cloud_nodes
  for each row execute function public.update_updated_at();
create trigger applications_updated_at before update on public.applications
  for each row execute function public.update_updated_at();
