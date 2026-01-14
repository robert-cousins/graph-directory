/**
 * lib/directory-admin.ts
 * Pure data layer for public business submissions and edits
 * NO Next.js dependencies - keeps this module portable and testable
 *
 * NEVER import into client components - server actions/components only
 */

import crypto from 'crypto'
import { z } from 'zod'
import { createServiceRoleClient } from './supabase/service-role'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Type Definitions
// ============================================================================

export interface BusinessSubmissionInput {
  trading_name: string
  phone: string
  email: string | null
  license_number: string
  services: string[]  // Service slugs
  service_areas: string[]  // Area slugs
  legal_name?: string
  description?: string
  website?: string
  street_address?: string
  years_experience?: number
  emergency_available?: boolean
  raw_business_hours?: Record<string, string>
}

export interface BusinessUpdateInput {
  trading_name?: string
  legal_name?: string
  description?: string
  phone?: string
  email?: string | null
  website?: string
  street_address?: string
  years_experience?: number
  emergency_available?: boolean
  raw_business_hours?: Record<string, string>
  services?: string[]
  service_areas?: string[]
  license_number?: string
}

export interface CreateBusinessResult {
  success: boolean
  slug: string
  editPath: string  // Relative path with token embedded (no origin)
  error?: string
  // NOTE: token is NOT returned separately - it's embedded in editPath
}

export interface RateLimitOptions {
  rateLimitKey: string  // IP or 'global' - extracted in action layer
}

export interface EditableBusinessData {
  id: string
  slug: string
  trading_name: string
  legal_name: string
  description: string | null
  phone: string
  email: string | null
  website: string | null
  street_address: string | null
  years_experience: number | null
  emergency_available: boolean
  raw_business_hours: Record<string, string> | null
  status: 'draft' | 'pending_review' | 'published' | 'suspended'
  services: string[]
  service_areas: string[]
  license_number: string | null
  created_at: string
  updated_at: string
}

export interface UpdateBusinessResult {
  success: boolean
  slug: string
  error?: string
}

// ============================================================================
// Validation Schemas
// ============================================================================

const BusinessSubmissionSchema = z.object({
  trading_name: z.string().min(1).max(255),
  phone: z.string().min(1).regex(/^[\d\s\+\-\(\)]+$/),
  email: z.string().email().nullable(),
  license_number: z.string().min(1),
  services: z.array(z.string()).min(1),
  service_areas: z.array(z.string()).min(1),
  legal_name: z.string().max(255).optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  street_address: z.string().optional(),
  years_experience: z.number().int().min(0).optional(),
  emergency_available: z.boolean().optional(),
  raw_business_hours: z.record(z.string()).optional(),
})

const BusinessUpdateSchema = BusinessSubmissionSchema.partial()

// ============================================================================
// Token Security
// ============================================================================

function generateEditToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function hashEditToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Constant-time comparison of hex-encoded hashes
 * Converts hex strings to Buffers before comparison
 * CRITICAL: Must use timingSafeEqual on Buffers, NOT strings
 */
function constantTimeCompare(hexA: string, hexB: string): boolean {
  try {
    // Convert hex strings to Buffers
    const bufferA = Buffer.from(hexA, 'hex')
    const bufferB = Buffer.from(hexB, 'hex')

    // Length check (both hex strings should be 64 chars = 32 bytes)
    if (bufferA.length !== bufferB.length) return false

    // Constant-time comparison on Buffers
    return crypto.timingSafeEqual(bufferA, bufferB)
  } catch {
    // Handle any conversion errors
    return false
  }
}

// ============================================================================
// Rate Limiting (In-Memory) - Key Passed from Action Layer
// ============================================================================

/**
 * ⚠️ IMPORTANT: This in-memory rate limiter is BEST-EFFORT ONLY on serverless platforms.
 * On Vercel/serverless, instances may reset or fragment, causing the Map to clear.
 * This is NOT a reliable security control against brute force attacks.
 * For production, consider DB-backed throttling or a dedicated rate limit service.
 * This is acceptable for MVP as a basic abuse prevention measure.
 */
const rateLimiter = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(rateLimitKey: string, maxRequests = 5, windowMs = 60000): boolean {
  const now = Date.now()
  const record = rateLimiter.get(rateLimitKey)

  if (!record || record.resetAt < now) {
    rateLimiter.set(rateLimitKey, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// ============================================================================
// Slug Generation
// ============================================================================

function generateSlug(tradingName: string): string {
  const baseSlug = tradingName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const timestamp = Date.now()
  return `${baseSlug}-${timestamp}`
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getServiceIdsBySlugs(
  slugs: string[],
  supabase: SupabaseClient
): Promise<string[]> {
  // De-duplicate slugs
  const uniqueSlugs = [...new Set(slugs)]

  const { data, error } = await supabase
    .from('service_types')
    .select('id, slug')
    .in('slug', uniqueSlugs)

  if (error) throw error

  // Strict validation: ensure all requested slugs were found
  if (!data || data.length !== uniqueSlugs.length) {
    const foundSlugs = data?.map(row => row.slug) || []
    const missingSlugs = uniqueSlugs.filter(s => !foundSlugs.includes(s))
    throw new Error(`Unknown service slugs: ${missingSlugs.join(', ')}`)
  }

  return data.map(row => row.id)
}

async function getAreaIdsBySlugs(
  slugs: string[],
  supabase: SupabaseClient
): Promise<string[]> {
  // De-duplicate slugs
  const uniqueSlugs = [...new Set(slugs)]

  const { data, error } = await supabase
    .from('service_areas')
    .select('id, slug')
    .in('slug', uniqueSlugs)

  if (error) throw error

  // Strict validation: ensure all requested slugs were found
  if (!data || data.length !== uniqueSlugs.length) {
    const foundSlugs = data?.map(row => row.slug) || []
    const missingSlugs = uniqueSlugs.filter(s => !foundSlugs.includes(s))
    throw new Error(`Unknown service area slugs: ${missingSlugs.join(', ')}`)
  }

  return data.map(row => row.id)
}

async function fetchBusinessServices(
  businessId: string,
  supabase: SupabaseClient
): Promise<{ slug: string }[]> {
  const { data, error } = await supabase
    .from('business_services')
    .select('service_type_id, service_types(slug)')
    .eq('business_id', businessId)

  if (error) throw error
  return (data || []).map((row: any) => ({ slug: row.service_types.slug }))
}

async function fetchBusinessServiceAreas(
  businessId: string,
  supabase: SupabaseClient
): Promise<{ slug: string }[]> {
  const { data, error } = await supabase
    .from('business_service_areas')
    .select('service_area_id, service_areas(slug)')
    .eq('business_id', businessId)

  if (error) throw error
  return (data || []).map((row: any) => ({ slug: row.service_areas.slug }))
}

async function fetchBusinessCredentials(
  businessId: string,
  supabase: SupabaseClient
): Promise<{ credential_number: string }[]> {
  const { data, error } = await supabase
    .from('credentials')
    .select('credential_number')
    .eq('business_id', businessId)
    .eq('credential_type', 'plumbing_license')

  if (error) throw error
  return data || []
}

// ============================================================================
// Public API
// ============================================================================

export async function createBusinessSubmission(
  input: BusinessSubmissionInput,
  options: RateLimitOptions
): Promise<CreateBusinessResult> {
  try {
    // Rate limiting
    if (!checkRateLimit(options.rateLimitKey)) {
      return {
        success: false,
        slug: '',
        editPath: '',
        error: 'Rate limit exceeded. Please try again in a minute.',
      }
    }

    // Validate input
    const validated = BusinessSubmissionSchema.parse(input)

    // Generate slug and token
    const slug = generateSlug(validated.trading_name)
    const token = generateEditToken()
    const tokenHash = hashEditToken(token)

    // Get service role client
    const supabase = createServiceRoleClient()

    // Resolve service and area IDs (with strict validation)
    const serviceIds = await getServiceIdsBySlugs(validated.services, supabase)
    const areaIds = await getAreaIdsBySlugs(validated.service_areas, supabase)

    // Call atomic RPC function
    const { data, error } = await supabase.rpc('create_business_with_relationships', {
      p_slug: slug,
      p_legal_name: validated.legal_name || validated.trading_name,
      p_trading_name: validated.trading_name,
      p_description: validated.description || null,
      p_phone: validated.phone,
      p_email: validated.email,
      p_website: validated.website || null,
      p_street_address: validated.street_address || null,
      p_years_experience: validated.years_experience || null,
      p_emergency_available: validated.emergency_available || false,
      p_raw_business_hours: validated.raw_business_hours || null,
      p_edit_token_hash: tokenHash,
      p_license_number: validated.license_number,
      p_service_ids: serviceIds,
      p_area_ids: areaIds,
    })

    if (error) throw error

    // Build relative edit path (no origin)
    const editPath = `/plumber/${slug}/edit?token=${token}`

    // CRITICAL: Do NOT log token or editPath (contains sensitive token)
    return {
      success: true,
      slug,
      editPath,
      // token is NOT returned separately - it's embedded in editPath
    }
  } catch (error) {
    console.error('createBusinessSubmission error:', error)
    return {
      success: false,
      slug: '',
      editPath: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getBusinessForEdit(
  slug: string,
  token: string
): Promise<EditableBusinessData | null> {
  try {
    const tokenHash = hashEditToken(token)
    const supabase = createServiceRoleClient()

    const { data: business, error } = await supabase
      .from('businesses')
      .select(`
        id, slug, legal_name, trading_name, description, phone, email,
        website, street_address, years_experience,
        raw_business_hours, status, created_at, updated_at, edit_token_hash
      `)
      .eq('slug', slug)
      .single()

    if (error || !business) return null

    // CRITICAL: Check if hash is null/empty BEFORE comparison
    if (!business.edit_token_hash) {
      return null
    }

    // Constant-time token validation (compares Buffers, not strings)
    if (!constantTimeCompare(tokenHash, business.edit_token_hash)) {
      return null
    }

    // Fetch related data + derive emergency_available from availability_windows
    const [services, areas, credentials, emergencyCheck] = await Promise.all([
      fetchBusinessServices(business.id, supabase),
      fetchBusinessServiceAreas(business.id, supabase),
      fetchBusinessCredentials(business.id, supabase),
      supabase
        .from('availability_windows')
        .select('id')
        .eq('business_id', business.id)
        .eq('is_emergency', true)
        .limit(1)
        .maybeSingle()
    ])

    return {
      id: business.id,
      slug: business.slug,
      trading_name: business.trading_name,
      legal_name: business.legal_name,
      description: business.description,
      phone: business.phone,
      email: business.email,
      website: business.website,
      street_address: business.street_address,
      years_experience: business.years_experience,
      emergency_available: !!emergencyCheck.data,  // Derived from availability_windows
      raw_business_hours: business.raw_business_hours,
      status: business.status,
      services: services.map(s => s.slug),
      service_areas: areas.map(a => a.slug),
      license_number: credentials[0]?.credential_number || null,
      created_at: business.created_at,
      updated_at: business.updated_at,
    }
  } catch (error) {
    console.error('getBusinessForEdit error:', error)
    return null
  }
}

export async function updateBusinessWithToken(
  slug: string,
  token: string,
  patch: BusinessUpdateInput,
  options: RateLimitOptions
): Promise<UpdateBusinessResult> {
  try {
    // Rate limiting
    if (!checkRateLimit(options.rateLimitKey)) {
      return {
        success: false,
        slug,
        error: 'Rate limit exceeded. Please try again in a minute.',
      }
    }

    // Validate token
    const business = await getBusinessForEdit(slug, token)
    if (!business) {
      return { success: false, slug, error: 'Invalid token or business not found' }
    }

    // Validate patch
    const validated = BusinessUpdateSchema.parse(patch)
    const supabase = createServiceRoleClient()

    // Update business fields
    const businessFields = Object.keys(validated).filter(
      k => !['services', 'service_areas', 'license_number', 'emergency_available'].includes(k)
    )
    if (businessFields.length > 0) {
      const updateData: any = {}
      businessFields.forEach(key => {
        updateData[key] = (validated as any)[key]
      })
      updateData.updated_at = new Date().toISOString()

      await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', business.id)
    }

    // Update services (atomic: delete + insert)
    if (validated.services) {
      const serviceIds = await getServiceIdsBySlugs(validated.services, supabase)

      await supabase.from('business_services').delete().eq('business_id', business.id)

      if (serviceIds.length > 0) {
        await supabase.from('business_services').insert(
          serviceIds.map(id => ({ business_id: business.id, service_type_id: id }))
        )
      }
    }

    // Update service areas (atomic: delete + insert)
    if (validated.service_areas) {
      const areaIds = await getAreaIdsBySlugs(validated.service_areas, supabase)

      await supabase.from('business_service_areas').delete().eq('business_id', business.id)

      if (areaIds.length > 0) {
        await supabase.from('business_service_areas').insert(
          areaIds.map(id => ({ business_id: business.id, service_area_id: id }))
        )
      }
    }

    // Update credentials (upsert pattern - never set verified=true)
    if (validated.license_number) {
      await supabase
        .from('credentials')
        .upsert({
          business_id: business.id,
          credential_type: 'plumbing_license',
          credential_number: validated.license_number,
          issuing_authority: 'WA Building Services Board',
          verified: false,  // NEVER auto-verify
          verification_notes: 'Awaiting manual verification',
        }, {
          onConflict: 'business_id,credential_type'
        })
    }

    // Update emergency availability (via availability_windows table)
    // emergency_available is NOT a column on businesses - it's derived from availability_windows
    if (validated.emergency_available !== undefined) {
      // Delete existing emergency windows
      await supabase
        .from('availability_windows')
        .delete()
        .eq('business_id', business.id)
        .eq('is_emergency', true)

      // If enabling emergency service, create new window
      if (validated.emergency_available === true) {
        await supabase
          .from('availability_windows')
          .insert({
            business_id: business.id,
            is_emergency: true,
          })
      }
    }

    // NO revalidatePath here - moved to action layer

    return { success: true, slug }
  } catch (error) {
    console.error('updateBusinessWithToken error:', error)
    return {
      success: false,
      slug,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// NOTE: submitForReview function REMOVED - using Option A (direct to pending_review)
// New submissions start as 'pending_review' immediately, no draft flow needed

// Utility: Get all service slugs for form dropdowns
export async function getAllServiceSlugs(): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('service_types')
      .select('slug')
      .order('name')

    if (error) throw error
    return (data || []).map(row => row.slug)
  } catch (error) {
    console.error('getAllServiceSlugs error:', error)
    return []
  }
}

// Utility: Get all area slugs for form dropdowns
export async function getAllAreaSlugs(): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('service_areas')
      .select('slug')
      .order('name')

    if (error) throw error
    return (data || []).map(row => row.slug)
  } catch (error) {
    console.error('getAllAreaSlugs error:', error)
    return []
  }
}
