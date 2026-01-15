import "server-only"
import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with service role key
 * NEVER import this into client components
 * Use ONLY in server actions, route handlers, and server components
 *
 * Service role bypasses Row Level Security (RLS) - use with caution
 * Only use for operations that require elevated permissions
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
