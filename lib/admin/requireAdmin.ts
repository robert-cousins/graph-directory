/**
 * Admin authorization guard
 * Server-side only - NEVER import into client components
 *
 * Enforces email-based allowlist with deny-by-default security.
 * If ADMIN_EMAIL_ALLOWLIST is missing or empty, all access is denied.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface AdminUser {
  id: string
  email: string
}

/**
 * Require admin access for the current request
 *
 * @returns The authenticated admin user
 * @throws Redirects to '/' if not authenticated or not in allowlist
 *
 * Usage:
 * ```typescript
 * // In server components or server actions
 * const admin = await requireAdmin()
 * ```
 */
export async function requireAdmin(): Promise<AdminUser> {
  // Get current user from auth session
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Check if user is authenticated
  if (error || !user || !user.email) {
    console.warn('[Admin Guard] Unauthenticated access attempt')
    redirect('/')
  }

  // Load admin email allowlist from environment
  const allowlistEnv = process.env.ADMIN_EMAIL_ALLOWLIST

  // Deny-by-default: if allowlist is missing or empty, deny all access
  if (!allowlistEnv || allowlistEnv.trim() === '') {
    console.error(
      '[Admin Guard] CRITICAL: ADMIN_EMAIL_ALLOWLIST environment variable is not set. ' +
      'All admin access is denied. Please set ADMIN_EMAIL_ALLOWLIST in your .env.local file.'
    )
    redirect('/')
  }

  // Parse allowlist (comma-separated emails, trimmed)
  const allowedEmails = allowlistEnv
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0)

  // Check if user's email is in the allowlist
  const userEmail = user.email.toLowerCase()
  if (!allowedEmails.includes(userEmail)) {
    console.warn(
      `[Admin Guard] Unauthorized access attempt by ${user.email}. ` +
      `This email is not in the ADMIN_EMAIL_ALLOWLIST.`
    )
    redirect('/')
  }

  // User is authorized
  console.log(`[Admin Guard] Admin access granted to ${user.email}`)

  return {
    id: user.id,
    email: user.email,
  }
}

/**
 * Check if the current user is an admin (without redirecting)
 *
 * @returns True if user is admin, false otherwise
 *
 * Usage:
 * ```typescript
 * const isAdmin = await checkIsAdmin()
 * if (isAdmin) {
 *   // Show admin UI
 * }
 * ```
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch {
    return false
  }
}
