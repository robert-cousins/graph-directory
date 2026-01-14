import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Standard server client with cookie management (for auth-aware requests)
export async function createClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // ignored when called from Server Components in some flows
          }
        },
      },
    }
  );
}

// Alias for compatibility with existing imports
export const createServerClient = createClient;

// Service role client (bypasses RLS, for admin operations)
export function createSupabaseServerClientWithServiceRole() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Simple server client without cookies (for build-time and non-auth queries)
export function createServerClientSimple() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
