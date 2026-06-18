-- Structured role context (department, seniority, location, etc.) that
-- the recruiter fills in on the New shortlister run form. Stored as
-- jsonb so the shape can evolve without further DDL.
alter table public.jobs add column if not exists metadata jsonb;
