/**
 * Type definitions for the new entity-based business model
 * Aligned with public.published_businesses database view
 */

// ============================================================================
// Database Row Types (matches Supabase exactly)
// ============================================================================

/**
 * Raw row from public.published_businesses view
 * Matches database schema exactly (snake_case, rating as string)
 */
export interface PublishedBusinessRow {
  id: string
  slug: string
  legal_name: string
  trading_name: string
  description: string
  phone: string
  email: string | null
  website: string | null
  street_address: string | null
  rating: string | null // Numeric(3,2) returned as string by Supabase
  review_count: number
  years_experience: number | null
  hero_image: string
  published_at: string // ISO timestamp
  created_at: string // ISO timestamp
  services: string[] // Aggregated service names
  service_areas: string[] // Aggregated area names
  emergency_available: boolean // Derived from availability_windows
  is_verified: boolean // Has verified credentials
  verified_credentials_count: number // BigInt returned as number
}

// ============================================================================
// Application Types (transformed for UI consumption)
// ============================================================================

/**
 * Application-level business type with transformations applied
 * - camelCase fields
 * - rating converted to number (clamped 0-5)
 * - computed displayName field
 * - dates kept as ISO strings for serialization
 */
export interface PublishedBusiness {
  id: string
  slug: string
  legalName: string
  tradingName: string
  displayName: string // Computed: trading_name || legal_name
  description: string
  phone: string
  email: string | null
  website: string | null
  streetAddress: string | null
  rating: number // Converted from string, clamped 0-5
  reviewCount: number
  yearsExperience: number | null
  heroImage: string
  publishedAt: string // ISO string
  createdAt: string // ISO string
  services: string[]
  serviceAreas: string[]
  emergencyAvailable: boolean
  isVerified: boolean
  verifiedCredentialsCount: number
}

// ============================================================================
// Filter and Pagination Types
// ============================================================================

/**
 * Filter criteria for business queries
 * All fields optional - applied as AND conditions
 */
export interface BusinessFilters {
  /** Filter by service slug */
  service?: string
  /** Filter by area slug */
  area?: string
  /** Only businesses with emergency service capability */
  emergency?: boolean
  /** Only businesses with verified credentials */
  verified?: boolean
  /** Minimum rating (0-5) */
  minRating?: number
  /** Search query for business name/description */
  search?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number
  /** Results per page (default: 20, max: 100) */
  pageSize: number
}

/**
 * Sort options for business listing
 */
export type BusinessSortBy =
  | 'rating'
  | 'review_count'
  | 'trading_name'
  | 'years_experience'
  | 'published_at'

export type SortDirection = 'asc' | 'desc'

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Page data */
  data: T[]
  /** Total matching results (across all pages) */
  total: number
  /** Current page number */
  page: number
  /** Results per page */
  pageSize: number
  /** Total pages */
  totalPages: number
  /** Has previous page */
  hasPrevPage: boolean
  /** Has next page */
  hasNextPage: boolean
}

// ============================================================================
// Query Options Type
// ============================================================================

/**
 * Options for list queries
 */
export interface BusinessListOptions {
  filters?: BusinessFilters
  pagination?: PaginationParams
  sortBy?: BusinessSortBy
  sortDirection?: SortDirection
}
