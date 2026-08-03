-- Radar Recap — stored monthly/yearly recap payloads.
-- Run after schema.sql. Idempotent in the same way: `if not exists`,
-- `create or replace`, and drop/create for policies. Never drops a payload.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Why a table at all: a recap is derived data, but deriving it walks the whole
-- library and every episode watch date, which is slow enough to see on open.
-- Recaps are also *historical* — last year's report should not change because
-- the library did — so the payload is snapshotted at generation time and read
-- back verbatim afterwards.

create table if not exists public.recaps (
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- 'month' | 'year'. Text + check rather than an enum: two values that the
  -- client already spells this way, and no other table needs the type.
  kind         text not null check (kind in ('month','year')),
  -- 'YYYY-MM' for a month, 'YYYY' for a year. Sorts chronologically as text,
  -- which the retention trigger below relies on.
  period_key   text not null check (period_key ~ '^\d{4}(-\d{2})?$'),
  -- The finished recap exactly as lib/recap.ts built it, including its `version`
  -- so a payload written by an older client can be recognised and rebuilt.
  payload      jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (user_id, kind, period_key)
);

-- ============================================================================
-- RETENTION — years are kept forever, months only current + previous.
-- ============================================================================
--
-- Enforced in the database rather than in the client: the invariant is about
-- what the table is allowed to hold, and a client that crashes mid-save should
-- not be able to leave a third month behind.

create or replace function private.trim_month_recaps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.recaps r
   where r.user_id = new.user_id
     and r.kind = 'month'
     and r.period_key not in (
       select period_key
         from public.recaps
        where user_id = new.user_id
          and kind = 'month'
        order by period_key desc
        limit 2
     );
  return null;
end $$;

-- AFTER ... FOR EACH ROW, so the row being written is already visible to the
-- subselect and counts as one of the two months that survive.
create or replace trigger recaps_trim_months
  after insert or update on public.recaps
  for each row
  when (new.kind = 'month')
  execute function private.trim_month_recaps();

-- ============================================================================
-- RLS — owner only. A recap is not part of the public shelf.
-- ============================================================================

alter table public.recaps enable row level security;

drop policy if exists recaps_owner_all on public.recaps;
create policy recaps_owner_all on public.recaps for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
