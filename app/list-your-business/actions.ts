'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createBusinessSubmission } from '@/lib/directory-admin'

/**
 * Extract rate limit key from request headers
 * Takes first IP from x-forwarded-for (if comma-separated list)
 * Falls back to 'global' if IP unavailable (local/dev)
 */
function getRateLimitKey(): string {
  try {
    const headersList = headers()
    const forwarded = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')

    if (forwarded) {
      // Take first IP if comma-separated list
      return forwarded.split(',')[0].trim()
    }

    if (realIp) {
      return realIp
    }

    // Fallback for local/dev
    return 'global'
  } catch {
    // headers() may fail in some contexts
    return 'global'
  }
}

export async function submitBusinessAction(formData: FormData) {
  const services = formData.getAll('services') as string[]
  const service_areas = formData.getAll('service_areas') as string[]

  const input = {
    trading_name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    email: (formData.get('email') as string) || null,
    license_number: formData.get('license_number') as string,
    services,
    service_areas,
    description: formData.get('description') as string,
    website: formData.get('website') as string,
    street_address: formData.get('address') as string,
    years_experience: Number(formData.get('years_experience')) || undefined,
    emergency_available: formData.get('emergency_available') === 'on',
    raw_business_hours: JSON.parse(formData.get('business_hours') as string || '{}'),
  }

  // Extract rate limit key
  const rateLimitKey = getRateLimitKey()

  // Call data layer
  const result = await createBusinessSubmission(input, { rateLimitKey })

  // Revalidate paths (Next.js concern - belongs in action layer)
  if (result.success) {
    revalidatePath('/plumbers')
    revalidatePath(`/plumber/${result.slug}`)
  }

  return result
}
