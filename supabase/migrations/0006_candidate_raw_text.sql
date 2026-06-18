-- Store the extracted CV text on the candidate row so the worker
-- doesn't need a filesystem (Vercel functions have no shared FS).
alter table candidate_jobs add column if not exists raw_text text;
