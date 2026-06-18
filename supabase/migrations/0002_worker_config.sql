-- Free-tier compatible worker config: a single-row table the cron tick
-- reads from, replacing the original `current_setting('app.worker_url')`
-- approach (free-tier roles can't ALTER DATABASE SET on this project).
-- The secret value seeded here is rotated per environment via:
--   update app_config set worker_secret = '<new>' where id = 1;

create table if not exists app_config (
  id smallint primary key default 1,
  worker_url text,
  worker_secret text,
  updated_at timestamptz not null default now(),
  constraint app_config_singleton check (id = 1)
);

insert into app_config (id) values (1)
  on conflict (id) do nothing;

alter table app_config enable row level security;
-- No policies on purpose: anon + authenticated see nothing, service role
-- bypasses RLS.

create or replace function tick_worker() returns void as $$
declare
  cfg record;
begin
  select worker_url, worker_secret into cfg from app_config where id = 1;
  if cfg.worker_url is null or cfg.worker_url = '' then
    return;
  end if;
  perform net.http_post(
    url := cfg.worker_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || coalesce(cfg.worker_secret, '')
    ),
    body := '{}'::jsonb
  );
end; $$ language plpgsql;
