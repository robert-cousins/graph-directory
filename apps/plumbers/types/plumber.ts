/**
 * @deprecated Use PublishedBusiness type from @/types/business instead.
 * This type represents the legacy plumbers table and will be removed in a future version.
 */
export interface Plumber {
  id: string
  slug: string
  businessName: string
  suburb: string // Added suburb field for location filtering
  rating: number
  reviewCount: number
  phone: string
  email: string
  address: string
  services: string[]
  description: string
  emergencyAvailable: boolean
  businessHours: {
    [key: string]: string
  }
  reviews: Review[]
  heroImage: string // Added hero image field
}

export interface Review {
  id: string
  customerName: string
  rating: number
  comment: string
  date: string
}

export type ServiceType =
  | "Emergency Repairs"
  | "Blocked Drains"
  | "Hot Water Systems"
  | "Bathroom Renovations"
  | "Gas Fitting"
  | "Leak Detection"

export type RatingFilter = "4+ Stars" | "3+ Stars" | "All Ratings"
export type AvailabilityFilter = "Available Today" | "Available This Week" | "All"
export type SortOption = "Highest Rated" | "Most Reviews" | "A-Z" | "Recently Added"
export type SuburbFilter = "All Suburbs" | "Melville" | "Myaree" | "Booragoon"
