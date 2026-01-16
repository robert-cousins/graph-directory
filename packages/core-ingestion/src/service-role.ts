/**
 * Ingestion Service Role Client
 * Lazy initialization to prevent import-time side effects
 *
 * TODO: Consolidate with packages/core-mutators/src/service-role.ts
 * to avoid duplication. Keep separate for now to maintain isolation,
 * but refactor into shared core package in future.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy, server-only Supabase client for ingestion.
 * - No import-time side effects (CI safe)
 * - Throws only when invoked without env
 * - Uses `any` DB typing to avoid `never` table types in CI
 */
export function getIngestionServiceRoleClient(): SupabaseClient<any> {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for ingestion client'
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cachedClient;
}

/**
 * Cached client for performance
 * Still lazy - only creates on first call
 */
let cachedClient: SupabaseClient<any> | null = null;
