-- User reports (App Store guideline 1.2: a way to flag objectionable content).
--
-- Anyone signed in can report a generated result (their own job), a community
-- showcase post, or a template/app preview. One report per user and item.
--   - The reporter stops seeing a reported showcase post right away (showcase-feed
--     skips posts the caller reported).
--   - A post with 3 reports from different users goes into public.blocked_content
--     and is hidden for everyone until someone reviews it (delete the row to restore).

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_type  text not null check (target_type in ('job', 'showcase', 'effect')),
  target_id    text not null,
  reason       text not null check (reason in ('sexual', 'violent', 'hateful', 'real_person', 'minor', 'other')),
  note         text check (char_length(note) <= 500),
  status       text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at   timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index reports_open_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;

create policy "insert own reports" on public.reports
  for insert to authenticated with check (user_id = auth.uid());

create policy "read own reports" on public.reports
  for select to authenticated using (user_id = auth.uid());

-- Content hidden for everyone. Written by the trigger below (or by hand after review).
create table public.blocked_content (
  target_type  text not null check (target_type in ('job', 'showcase', 'effect')),
  target_id    text not null,
  created_at   timestamptz not null default now(),
  primary key (target_type, target_id)
);

alter table public.blocked_content enable row level security;
-- No policies: only Edge Functions (service role) read it.

create or replace function public.block_reported_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_type = 'showcase' and (
    select count(distinct user_id) from public.reports
     where target_type = new.target_type and target_id = new.target_id
  ) >= 3 then
    insert into public.blocked_content (target_type, target_id)
    values (new.target_type, new.target_id)
    on conflict do nothing;
    update public.showcase set enabled = false where id = new.target_id;
  end if;
  return new;
end;
$$;

create trigger reports_block_content
  after insert on public.reports
  for each row execute function public.block_reported_content();
