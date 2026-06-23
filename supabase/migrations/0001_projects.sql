-- webBuilder: projects table with per-user row-level security.
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.
--
-- Ownership/isolation is enforced here by RLS, so the client adapter never
-- filters by user_id — every query already sees only the caller's rows.

create table if not exists public.projects (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  doc        jsonb not null,            -- full PageDocument (source of truth)
  thumbnail  text,                      -- SVG data URL for the home card (nullable)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Owners can do everything with their own rows; nothing with others'.
-- `with check` also blocks inserting/updating a row to another user_id.
-- Created only if absent (Postgres has no CREATE POLICY IF NOT EXISTS), so
-- re-running this migration never drops the policy — avoiding a window where
-- the table is RLS-enabled but unprotected.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'own_rows'
  ) then
    create policy "own_rows" on public.projects
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Drives the home list (list() orders by updated_at desc, scoped to the user).
create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);
