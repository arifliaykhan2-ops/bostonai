-- Boson AI: profiles, jobs, credit ledger, storage buckets.
-- All credit changes go through security-definer functions that only the
-- service role (Edge Functions) may call. Clients can read their own rows only.

-- ───────────── Tables ─────────────

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  credits     integer not null default 0 check (credits >= 0),
  push_token  text,
  created_at  timestamptz not null default now()
);

create type public.job_status as enum ('queued', 'succeeded', 'failed');

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  kind            text not null check (kind in ('image', 'video')),
  model_id        text not null,
  preset_id       text,
  prompt          text not null,
  cost            integer not null check (cost >= 0),
  status          public.job_status not null default 'queued',
  input_path      text,
  output_path     text,
  fal_request_id  text,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index jobs_user_created_idx on public.jobs (user_id, created_at desc);

create table public.credit_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users on delete cascade,
  delta         integer not null,
  reason        text not null check (reason in ('signup_bonus', 'generation', 'refund', 'purchase')),
  job_id        uuid references public.jobs on delete set null,
  external_ref  text unique, -- RevenueCat event id → makes purchase grants idempotent
  created_at    timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- ───────────── Row level security ─────────────

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.credit_ledger enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- Clients may only change their push token, never their balance.
revoke update on public.profiles from authenticated, anon;
grant update (push_token) on public.profiles to authenticated;

create policy "read own jobs" on public.jobs
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "read own ledger" on public.credit_ledger
  for select to authenticated using ((select auth.uid()) = user_id);

-- ───────────── Credit functions (service role only) ─────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, credits) values (new.id, 10);
  insert into public.credit_ledger (user_id, delta, reason) values (new.id, 10, 'signup_bonus');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically spends credits and creates the job. Raises 'insufficient_credits'.
create function public.create_job(
  p_user uuid, p_kind text, p_model text, p_preset text,
  p_prompt text, p_cost integer, p_input_path text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_job uuid;
begin
  update public.profiles set credits = credits - p_cost
   where id = p_user and credits >= p_cost;
  if not found then
    raise exception 'insufficient_credits';
  end if;

  insert into public.jobs (user_id, kind, model_id, preset_id, prompt, cost, input_path)
  values (p_user, p_kind, p_model, p_preset, p_prompt, p_cost, p_input_path)
  returning id into v_job;

  insert into public.credit_ledger (user_id, delta, reason, job_id)
  values (p_user, -p_cost, 'generation', v_job);

  return v_job;
end $$;

create function public.complete_job(p_job uuid, p_output_path text) returns void
language sql security definer set search_path = '' as $$
  update public.jobs
     set status = 'succeeded', output_path = p_output_path, updated_at = now()
   where id = p_job and status = 'queued';
$$;

-- Marks a queued job failed and refunds it. Safe to call twice.
create function public.fail_job(p_job uuid, p_error text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_cost integer;
begin
  update public.jobs
     set status = 'failed', error = p_error, updated_at = now()
   where id = p_job and status = 'queued'
  returning user_id, cost into v_user, v_cost;
  if not found then return; end if;

  update public.profiles set credits = credits + v_cost where id = v_user;
  insert into public.credit_ledger (user_id, delta, reason, job_id)
  values (v_user, v_cost, 'refund', p_job);
end $$;

-- Grants purchased credits once per external event id.
create function public.grant_credits(p_user uuid, p_amount integer, p_ref text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.credit_ledger (user_id, delta, reason, external_ref)
  values (p_user, p_amount, 'purchase', p_ref)
  on conflict (external_ref) do nothing;
  if not found then return false; end if;

  update public.profiles set credits = credits + p_amount where id = p_user;
  return true;
end $$;

revoke execute on function public.create_job(uuid, text, text, text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.complete_job(uuid, text) from public, anon, authenticated;
revoke execute on function public.fail_job(uuid, text) from public, anon, authenticated;
revoke execute on function public.grant_credits(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ───────────── Realtime ─────────────

alter publication supabase_realtime add table public.jobs, public.profiles;

-- ───────────── Storage ─────────────
-- inputs/<user_id>/...  photos the user uploads for image-to-video
-- outputs/<user_id>/... finished generations (written by fal-webhook)

insert into storage.buckets (id, name, public)
values ('inputs', 'inputs', false), ('outputs', 'outputs', false)
on conflict (id) do nothing;

create policy "upload own inputs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inputs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "read own inputs and outputs" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('inputs', 'outputs')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
