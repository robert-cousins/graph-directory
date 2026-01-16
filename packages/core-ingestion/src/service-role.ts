/**
 * Ingestion Service Role Client
 * Lazy initialization to prevent import-time side effects
 *
 * TODO: Consolidate with packages/core-mutators/src/service-role.ts
 * to avoid duplication. Keep separate for now to maintain isolation,
 * but refactor into shared core package in future.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Lazy service role client factory
 * No side effects on import - only creates client when called
 */
export function createIngestionServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cached client for performance
 * Still lazy - only creates on first call
 */
let cachedClient: ReturnType<typeof createClient> | null = null;

export function getIngestionServiceRoleClient() {
  if (!cachedClient) {
    cachedClient = createIngestionServiceRoleClient();
  }
  return cachedClient;
}
