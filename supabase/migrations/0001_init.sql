-- Shortlister · initial schema
-- Postgres 15+ with Supabase extensions

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pgmq cascade;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ------------------------------------------------------------------
-- jobs: a recruiter posting + parsed JD + tunable weights
-- ------------------------------------------------------------------
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  status text not null default 'draft', -- draft|processing|auditing|ready|failed
  jd_raw text not null,
  jd jsonb not null,                     -- ParsedJD
  jd_embedding vector(1024),
  weights jsonb not null default '{"semantic":0.5,"graph":0.4,"experience":0.1}'::jsonb,
  blind_mode boolean not null default false,
  audit jsonb
);
create index if not exists jobs_created_at_idx on jobs (created_at desc);

-- ------------------------------------------------------------------
-- candidate_jobs: one row per CV. Holds raw blob ref + parsed CV +
-- score + insights. The same row is the progress channel for the UI.
-- ------------------------------------------------------------------
create table if not exists candidate_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  filename text not null,
  blob_url text,                          -- vercel blob / s3
  status text not null default 'queued',  -- queued|extracting|parsing|embedding|scoring|insights|done|failed
  error text,
  rank int,
  cv jsonb,                               -- ParsedCV
  cv_embedding vector(1024),
  score jsonb,                            -- ScoreBreakdown
  insights jsonb                          -- CandidateInsights
);
create index if not exists candidate_jobs_job_idx on candidate_jobs (job_id);
create index if not exists candidate_jobs_status_idx on candidate_jobs (status);

-- Realtime publication so the dashboard can subscribe to status changes
alter publication supabase_realtime add table candidate_jobs;
alter publication supabase_realtime add table jobs;

-- Touch updated_at on any row change
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists candidate_jobs_touch on candidate_jobs;
create trigger candidate_jobs_touch before update on candidate_jobs
  for each row execute function touch_updated_at();
drop trigger if exists jobs_touch on jobs;
create trigger jobs_touch before update on jobs
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------------
-- pgmq queue for the per-CV worker fan-out.
-- ------------------------------------------------------------------
select pgmq.create('cv_jobs');

-- When all candidate_jobs for a job reach 'done', flip the parent job
-- to 'auditing' so the auditor route can run once.
create or replace function maybe_finalize_job() returns trigger as $$
declare pending int;
begin
  select count(*) into pending
    from candidate_jobs
    where job_id = new.job_id
      and status not in ('done', 'failed');
  if pending = 0 then
    update jobs set status = 'auditing' where id = new.job_id and status = 'processing';
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists candidate_jobs_finalize on candidate_jobs;
create trigger candidate_jobs_finalize after update of status on candidate_jobs
  for each row when (new.status in ('done','failed'))
  execute function maybe_finalize_job();

-- ------------------------------------------------------------------
-- Worker tick: pg_cron pings /api/worker every 15s via pg_net.
-- The worker route reads + processes a batch, then archives.
-- 15s keeps free-tier cron history small; still well inside the 60s
-- end-to-end budget given WORKER_CONCURRENCY=3, WORKER_BATCH_SIZE=5.
-- ------------------------------------------------------------------
-- NOTE: set these GUCs once per environment before relying on the tick:
--   alter database postgres set app.worker_url = 'https://<deploy>/api/worker';
--   alter database postgres set app.worker_secret = '<matches WORKER_SECRET>';
-- Until set, the function no-ops (current_setting(..., true) returns null
-- and net.http_post on a null url silently fails) which is the desired
-- behavior for fresh / dev projects.
create or replace function tick_worker() returns void as $$
declare
  url text := current_setting('app.worker_url', true);
  secret text := coalesce(current_setting('app.worker_secret', true), '');
begin
  if url is null or url = '' then
    return;
  end if;
  perform net.http_post(
    url := url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || secret
    ),
    body := '{}'::jsonb
  );
end; $$ language plpgsql;

select cron.schedule('shortlister-worker-tick', '*/15 * * * * *', $$ select tick_worker(); $$)
  where not exists (select 1 from cron.job where jobname = 'shortlister-worker-tick');
