-- Enable RLS on the public tables + lock function search paths.
-- The dashboard reads jobs + candidate_jobs over Supabase Realtime as
-- the anon role; all writes go through the service-role key on the
-- server side, which bypasses RLS. So: public SELECT policies, no
-- write policies.

alter table public.jobs enable row level security;
alter table public.candidate_jobs enable row level security;

drop policy if exists jobs_select_public on public.jobs;
create policy jobs_select_public on public.jobs
  for select to anon, authenticated using (true);

drop policy if exists candidate_jobs_select_public on public.candidate_jobs;
create policy candidate_jobs_select_public on public.candidate_jobs
  for select to anon, authenticated using (true);

alter function public.touch_updated_at() set search_path = public, pg_catalog;
alter function public.maybe_finalize_job() set search_path = public, pg_catalog;
alter function public.tick_worker() set search_path = public, pg_catalog;
