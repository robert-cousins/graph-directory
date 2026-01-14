'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { updateBusinessWithToken } from '@graph-directory/core-mutators'
import type { BusinessUpdateInput } from '@graph-directory/core-mutators'

/**
 * Extract rate limit key from request headers
 */
async function getRateLimitKey(): Promise<string> {
  try {
    // Next 15+ `headers()` is async
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    if (realIp) {
      return realIp
    }

    return 'global'
  } catch {
    return 'global'
  }
}

export async function updateBusinessAction(
  slug: string,
  token: string,
  patch: BusinessUpdateInput
) {
  const rateLimitKey = await getRateLimitKey()
  const result = await updateBusinessWithToken(slug, token, patch, { rateLimitKey })

  if (result.success) {
    revalidatePath(`/plumber/${slug}`)
    revalidatePath('/plumbers')
  }

  return result
}

// NOTE: submitForReviewAction REMOVED - using Option A (no draft flow)
// Businesses start as 'pending_review' immediately, no submit button needed
