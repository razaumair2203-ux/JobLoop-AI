-- Add tier column to cloud_nodes for classification-based display
-- Values: core_skill, certification, education, voluntary, license
-- Nullable to allow backfill from existing data via classifyNodeTier()

alter table public.cloud_nodes
  add column if not exists tier text;

-- Backfill existing rows using simple heuristics matching classifyNodeTier() logic
update public.cloud_nodes set tier = 'certification'
  where tier is null and (
    category in ('certification', 'cert') or
    name ~* '(PMP|ACLS|BLS|AWS|CISSP|CFA|Six Sigma|Scrum|ITIL|CompTIA|TOGAF|PRINCE2)'
  );

update public.cloud_nodes set tier = 'education'
  where tier is null and (
    category = 'education' or
    name ~* '(^(B\.?S|B\.?A|B\.?E|M\.?S|M\.?A|MBA|Ph\.?D|MBBS|MD|LLB|BBA|MCA|BCA)\b|Degree|Diploma|Bachelor|Master)'
  );

update public.cloud_nodes set tier = 'license'
  where tier is null and (
    category = 'license' or
    name ~* '(PE\b|PMDC|SMLE|Medical License|Bar Admission|CPA License|Professional Engineer|Registered Nurse|Licensed)'
  );

update public.cloud_nodes set tier = 'voluntary'
  where tier is null and (
    category = 'voluntary' or
    name ~* '(First Aid|Workshop|Volunteer|Heart Saver|CPR\b)'
  );

-- Everything else is a core skill
update public.cloud_nodes set tier = 'core_skill'
  where tier is null;

-- Now make it NOT NULL with a default
alter table public.cloud_nodes
  alter column tier set default 'core_skill',
  alter column tier set not null;
