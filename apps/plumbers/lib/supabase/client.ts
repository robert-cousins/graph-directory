import { createBrowserClient } from "@supabase/ssr"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Lazy initialization - client is only created when first accessed
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Supabase docs call this "PUBLISHABLE_KEY" now, but it is the same idea as your ANON key.
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase client not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
      )
    }
    supabaseClient = createClient()
  }
  return supabaseClient
}

// Legacy export for backward compatibility - now uses lazy initialization
export const supabase = getSupabaseClient()
