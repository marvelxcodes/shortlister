-- supabase-js .rpc() targets the public schema. Expose thin
-- SECURITY DEFINER wrappers so the codebase can call them as
-- public.pgmq_send / public.pgmq_read / public.pgmq_archive without
-- having to schema-switch the client. Service-role-only.

create or replace function public.pgmq_send(qname text, msg jsonb)
returns bigint
language plpgsql
security definer
set search_path = pgmq, public, pg_catalog
as $$
declare new_msg_id bigint;
begin
  select pgmq.send(qname, msg) into new_msg_id;
  return new_msg_id;
end;
$$;

-- Column `vt` from pgmq.read collides with the parameter name `vt`, so
-- the return column is renamed `vt_at` here. The codebase only reads
-- msg_id + message, so the rename is invisible to callers.
create or replace function public.pgmq_read(qname text, vt int, qty int)
returns table(msg_id bigint, read_ct int, enqueued_at timestamptz, vt_at timestamptz, message jsonb)
language sql
security definer
set search_path = pgmq, public, pg_catalog
as $$
  select msg_id, read_ct, enqueued_at, vt as vt_at, message
  from pgmq.read(qname, vt, qty);
$$;

create or replace function public.pgmq_archive(qname text, msg_id bigint)
returns boolean
language plpgsql
security definer
set search_path = pgmq, public, pg_catalog
as $$
declare ok boolean;
begin
  select pgmq.archive(qname, msg_id) into ok;
  return ok;
end;
$$;

revoke all on function public.pgmq_send(text, jsonb) from public, anon, authenticated;
revoke all on function public.pgmq_read(text, int, int) from public, anon, authenticated;
revoke all on function public.pgmq_archive(text, bigint) from public, anon, authenticated;

grant execute on function public.pgmq_send(text, jsonb) to service_role;
grant execute on function public.pgmq_read(text, int, int) to service_role;
grant execute on function public.pgmq_archive(text, bigint) to service_role;
