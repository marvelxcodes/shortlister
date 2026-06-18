export function uid(_prefix = "id") {
  // Supabase stores jobs.id and candidate_jobs.id as `uuid`, so we cannot
  // ship a prefixed slug here. The prefix arg is kept for call-site
  // ergonomics but ignored.
  return crypto.randomUUID();
}
