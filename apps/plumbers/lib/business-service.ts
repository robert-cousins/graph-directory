/**
 * Business Service Layer
 * Data access for published businesses using entity-based schema
 * Queries public.published_businesses view and SQL functions
 */

import { createServerClientSimple } from './supabase/server'
import type {
  PublishedBusinessRow,
  PublishedBusiness,
  BusinessFilters,
  PaginationParams,
  PaginatedResponse,
  BusinessListOptions,
  BusinessSortBy,
  SortDirection,
} from '@/types/business'

// ============================================================================
// Supabase Client
// ============================================================================

function getClient() {
  const client = createServerClientSimple()
  if (!client) {
    throw new Error('Supabase client not initialized - check environment variables')
  }
  return client
}

// ============================================================================
// Row Transformation
// ============================================================================

/**
 * Transform database row to application type
 * - Snake_case → camelCase
 * - Rating string → number (clamped 0-5)
 * - Dates kept as ISO strings
 * - Computed displayName
 */
function transformBusinessRow(row: PublishedBusinessRow): PublishedBusiness {
  // Rating conversion with clamping
  let rating = 0
  if (row.rating !== null && row.rating !== undefined) {
    const parsed = parseFloat(row.rating)
    if (!isNaN(parsed)) {
      // Clamp rating between 0 and 5
      rating = Math.max(0, Math.min(5, parsed))
    }
  }

  return {
    id: row.id,
    slug: row.slug,
    legalName: row.legal_name,
    tradingName: row.trading_name,
    displayName: row.trading_name || row.legal_name, // Fallback to legal name
    description: row.description,
    phone: row.phone,
    email: row.email,
    website: row.website,
    streetAddress: row.street_address,
    rating,
    reviewCount: row.review_count,
    yearsExperience: row.years_experience,
    heroImage: row.hero_image,
    publishedAt: row.published_at, // Keep as ISO string
    createdAt: row.created_at, // Keep as ISO string
    services: row.services,
    serviceAreas: row.service_areas,
    emergencyAvailable: row.emergency_available,
    isVerified: row.is_verified,
    verifiedCredentialsCount: row.verified_credentials_count,
  }
}

// ============================================================================
// Pagination Helpers
// ============================================================================

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function normalizePagination(pagination?: PaginationParams): {
  page: number
  pageSize: number
  offset: number
} {
  const page = Math.max(1, pagination?.page || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, pagination?.pageSize || DEFAULT_PAGE_SIZE)
  )
  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }
}

function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  }
}

// ============================================================================
// Query Contract 1: Main Listing with Filters & Pagination
// ============================================================================

/**
 * List published businesses with optional filters, sorting, and pagination
 * Queries: public.published_businesses view
 */
export async function listPublishedBusinesses(
  options?: BusinessListOptions
): Promise<PaginatedResponse<PublishedBusiness>> {
  const supabase = getClient()
  const { page, pageSize, offset } = normalizePagination(options?.pagination)

  // Build base query
  let query = supabase.from('published_businesses').select('*')

  // Apply filters
  if (options?.filters) {
    const { emergency, verified, minRating, search } = options.filters

    if (emergency === true) {
      query = query.eq('emergency_available', true)
    }

    if (verified === true) {
      query = query.eq('is_verified', true)
    }

    if (minRating !== undefined && minRating > 0) {
      query = query.gte('rating', minRating)
    }

    if (search) {
      // Search in trading_name, legal_name, and description
      query = query.or(
        `trading_name.ilike.%${search}%,legal_name.ilike.%${search}%,description.ilike.%${search}%`
      )
    }
  }

  // Apply sorting
  const sortBy = options?.sortBy || 'rating'
  const sortDirection = options?.sortDirection || 'desc'
  query = query.order(sortBy, { ascending: sortDirection === 'asc' })

  // Get total count (optimized - doesn't fetch rows)
  const countQuery = supabase
    .from('published_businesses')
    .select('*', { count: 'exact', head: true })

  // Apply same filters to count query
  if (options?.filters) {
    const { emergency, verified, minRating, search } = options.filters

    if (emergency === true) {
      countQuery.eq('emergency_available', true)
    }

    if (verified === true) {
      countQuery.eq('is_verified', true)
    }

    if (minRating !== undefined && minRating > 0) {
      countQuery.gte('rating', minRating)
    }

    if (search) {
      countQuery.or(
        `trading_name.ilike.%${search}%,legal_name.ilike.%${search}%,description.ilike.%${search}%`
      )
    }
  }

  // Execute count query
  const { count, error: countError } = await countQuery

  if (countError) {
    console.error('Error fetching count:', countError)
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  const total = count || 0

  // If no results, return empty pagination
  if (total === 0) {
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  // Execute data query with pagination
  const { data, error } = await query.range(offset, offset + pageSize - 1)

  if (error) {
    console.error('Error fetching businesses:', error)
    return buildPaginatedResponse([], total, page, pageSize)
  }

  // Transform and return
  const businesses = (data || []).map(transformBusinessRow)
  return buildPaginatedResponse(businesses, total, page, pageSize)
}

// ============================================================================
// Query Contract 2: Single Business by Slug
// ============================================================================

/**
 * Get a single published business by slug
 * Queries: public.published_businesses view
 */
export async function getPublishedBusinessBySlug(
  slug: string
): Promise<PublishedBusiness | null> {
  if (!slug) {
    throw new Error('Slug is required')
  }

  const supabase = getClient()

  const { data, error } = await supabase
    .from('published_businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error(`Error fetching business with slug "${slug}":`, error)
    return null
  }

  if (!data) {
    return null
  }

  return transformBusinessRow(data)
}

// ============================================================================
// Query Contract 3: Filter by Service
// ============================================================================

/**
 * List businesses offering a specific service
 * Uses: get_businesses_by_service(p_service_slug) SQL function
 */
export async function listPublishedBusinessesByService(
  serviceSlug: string,
  options?: {
    pagination?: PaginationParams
    additionalFilters?: Omit<BusinessFilters, 'service'>
  }
): Promise<PaginatedResponse<PublishedBusiness>> {
  if (!serviceSlug) {
    throw new Error('Service slug is required')
  }

  const supabase = getClient()
  const { page, pageSize, offset } = normalizePagination(options?.pagination)

  // Call RPC function
  const { data, error } = await supabase.rpc('get_businesses_by_service', {
    p_service_slug: serviceSlug,
  })

  if (error) {
    console.error(`Error fetching businesses for service "${serviceSlug}":`, error)
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  if (!data || data.length === 0) {
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  // Transform rows
  let businesses = data.map(transformBusinessRow)

  // Apply additional filters if provided
  if (options?.additionalFilters) {
    const { emergency, verified, minRating } = options.additionalFilters

    if (emergency === true) {
      businesses = businesses.filter((b: PublishedBusiness) => b.emergencyAvailable)
    }

    if (verified === true) {
      businesses = businesses.filter((b: PublishedBusiness) => b.isVerified)
    }

    if (minRating !== undefined && minRating > 0) {
      businesses = businesses.filter((b: PublishedBusiness) => b.rating >= minRating)
    }
  }

  const total = businesses.length

  // Apply pagination
  const paginatedData = businesses.slice(offset, offset + pageSize)

  return buildPaginatedResponse(paginatedData, total, page, pageSize)
}

// ============================================================================
// Query Contract 4: Filter by Area
// ============================================================================

/**
 * List businesses serving a specific area
 * Uses: get_businesses_by_area(p_area_slug) SQL function
 */
export async function listPublishedBusinessesByArea(
  areaSlug: string,
  options?: {
    pagination?: PaginationParams
    additionalFilters?: Omit<BusinessFilters, 'area'>
  }
): Promise<PaginatedResponse<PublishedBusiness>> {
  if (!areaSlug) {
    throw new Error('Area slug is required')
  }

  const supabase = getClient()
  const { page, pageSize, offset } = normalizePagination(options?.pagination)

  // Call RPC function
  const { data, error } = await supabase.rpc('get_businesses_by_area', {
    p_area_slug: areaSlug,
  })

  if (error) {
    console.error(`Error fetching businesses for area "${areaSlug}":`, error)
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  if (!data || data.length === 0) {
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  // Transform rows
  let businesses = data.map(transformBusinessRow)

  // Apply additional filters if provided
  if (options?.additionalFilters) {
    const { emergency, verified, minRating } = options.additionalFilters

    if (emergency === true) {
      businesses = businesses.filter((b: PublishedBusiness) => b.emergencyAvailable)
    }

    if (verified === true) {
      businesses = businesses.filter((b: PublishedBusiness) => b.isVerified)
    }

    if (minRating !== undefined && minRating > 0) {
      businesses = businesses.filter((b: PublishedBusiness) => b.rating >= minRating)
    }
  }

  const total = businesses.length

  // Apply pagination
  const paginatedData = businesses.slice(offset, offset + pageSize)

  return buildPaginatedResponse(paginatedData, total, page, pageSize)
}

// ============================================================================
// Query Contract 5: Combined Service + Area Filter (Helper Only)
// ============================================================================

/**
 * List businesses offering a specific service in a specific area
 * Helper function - NO ROUTE in Phase 2 (reserved for future faceted navigation)
 * Uses: Intersection of get_businesses_by_service and get_businesses_by_area
 */
export async function listPublishedBusinessesByServiceAndArea(
  serviceSlug: string,
  areaSlug: string,
  options?: {
    pagination?: PaginationParams
    additionalFilters?: Omit<BusinessFilters, 'service' | 'area'>
  }
): Promise<PaginatedResponse<PublishedBusiness>> {
  if (!serviceSlug) {
    throw new Error('Service slug is required')
  }

  if (!areaSlug) {
    throw new Error('Area slug is required')
  }

  const supabase = getClient()
  const { page, pageSize, offset } = normalizePagination(options?.pagination)

  // Fetch both result sets
  const [serviceResult, areaResult] = await Promise.all([
    supabase.rpc('get_businesses_by_service', { p_service_slug: serviceSlug }),
    supabase.rpc('get_businesses_by_area', { p_area_slug: areaSlug }),
  ])

  if (serviceResult.error) {
    console.error(`Error fetching service businesses:`, serviceResult.error)
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  if (areaResult.error) {
    console.error(`Error fetching area businesses:`, areaResult.error)
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  // Find intersection (businesses in both result sets)
  const serviceIds = new Set((serviceResult.data || []).map((b: any) => b.id))
  const intersectionRows = (areaResult.data || []).filter((b: any) =>
    serviceIds.has(b.id)
  )

  if (intersectionRows.length === 0) {
    return buildPaginatedResponse([], 0, page, pageSize)
  }

  // Transform rows
  let businesses = intersectionRows.map(transformBusinessRow)

  // Apply additional filters if provided
  if (options?.additionalFilters) {
    const { emergency, verified, minRating } = options.additionalFilters

    if (emergency === true) {
      businesses = businesses.filter((b: PublishedBusiness) => b.emergencyAvailable)
    }

    if (verified === true) {
      businesses = businesses.filter((b: PublishedBusiness) => b.isVerified)
    }

    if (minRating !== undefined && minRating > 0) {
      businesses = businesses.filter((b: PublishedBusiness) => b.rating >= minRating)
    }
  }

  const total = businesses.length

  // Apply pagination
  const paginatedData = businesses.slice(offset, offset + pageSize)

  return buildPaginatedResponse(paginatedData, total, page, pageSize)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all published service names
 */
export async function getAllPublishedServices(): Promise<string[]> {
  const supabase = getClient()

  const { data, error } = await supabase
    .from('published_businesses')
    .select('services')

  if (error) {
    console.error('Error fetching services:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Flatten and deduplicate
  const allServices = data.flatMap((row) => row.services || [])
  const uniqueServices = [...new Set(allServices)]

  return uniqueServices.sort()
}

/**
 * Get all published service area names
 */
export async function getAllPublishedAreas(): Promise<string[]> {
  const supabase = getClient()

  const { data, error } = await supabase
    .from('published_businesses')
    .select('service_areas')

  if (error) {
    console.error('Error fetching areas:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Flatten and deduplicate
  const allAreas = data.flatMap((row) => row.service_areas || [])
  const uniqueAreas = [...new Set(allAreas)]

  return uniqueAreas.sort()
}
