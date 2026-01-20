import { createBrowserClient } from "@supabase/ssr"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Supabase docs call this "PUBLISHABLE_KEY" now, but it is the same idea as your ANON key.
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}
