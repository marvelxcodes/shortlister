/** Centralized check for whether real Supabase credentials are present. */
export function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE,
  );
}

export function hasNim() {
  return Boolean(process.env.NVIDIA_NIM_API_KEY);
}
