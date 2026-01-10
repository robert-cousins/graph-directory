/**
 * @deprecated This file uses the legacy plumbers table.
 * Use lib/business-service.ts instead, which queries the published_businesses view.
 * This file will be removed in a future version.
 */

import { createServerClientSimple } from "./supabase/server"
import type { Plumber } from "@/types/plumber"

// Get a server client instance
function getClient() {
  try {
    return createServerClientSimple()
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    return null
  }
}

export interface PlumberFilters {
  suburb?: string
  services?: string[]
  minRating?: number
  emergencyOnly?: boolean
  sortBy?: "rating" | "reviews" | "name"
}

function transformDatabaseRow(row: any): Plumber {
  if (!row) {
    throw new Error("Cannot transform null or undefined database row")
  }

  return {
    id: row.id || "",
    businessName: row.business_name || row.name || "Unknown Business",
    slug: row.slug || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    suburb: row.suburb || "",
    services: Array.isArray(row.services) ? row.services : [],
    description: row.description || "",
    rating: typeof row.rating === "number" ? row.rating : 0,
    reviewCount: typeof row.review_count === "number" ? row.review_count : 0,
    emergencyAvailable: Boolean(row.emergency_available),
    businessHours: typeof row.business_hours === "object" && row.business_hours !== null ? row.business_hours : {},
    reviews: Array.isArray(row.reviews) ? row.reviews : [],
    heroImage: row.hero_image || "/images/plumber-business-hero.png",
  }
}

export async function getAllPlumbers(filters?: PlumberFilters): Promise<Plumber[]> {
  const supabase = getClient()

  if (!supabase) {
    console.error("Supabase client is not available - environment variables may be missing")
    return []
  }

  let query = supabase.from("plumbers").select("*")

  // Apply filters
  if (filters?.suburb) {
    query = query.eq("suburb", filters.suburb)
  }

  if (filters?.minRating) {
    query = query.gte("rating", filters.minRating)
  }

  if (filters?.emergencyOnly) {
    query = query.eq("emergency_available", true)
  }

  if (filters?.services && filters.services.length > 0) {
    query = query.overlaps("services", filters.services)
  }

  // Apply sorting
  switch (filters?.sortBy) {
    case "rating":
      query = query.order("rating", { ascending: false })
      break
    case "reviews":
      query = query.order("review_count", { ascending: false })
      break
    case "name":
      query = query.order("business_name", { ascending: true }) // Updated to use correct database column
      break
    default:
      query = query.order("rating", { ascending: false })
  }

  const { data, error } = await query

  console.log("Database query result:", { data: data?.length || 0, error })

  if (error) {
    console.error("Database error details:", error)
    return []
  }

  if (!data || data.length === 0) {
    console.warn("No plumbers found in database")
    return []
  }

  console.log("Successfully fetched plumbers from database:", data.length)
  return data.map(transformDatabaseRow)
}

export async function getPlumberBySlug(slug: string): Promise<Plumber | null> {
  console.log("Looking for plumber with slug:", slug)

  const supabase = getClient()

  if (!supabase) {
    console.error("Supabase client is not available - environment variables may be missing")
    return null
  }

  const { data, error } = await supabase.from("plumbers").select("*").eq("slug", slug).maybeSingle()

  if (error) {
    console.error("Database error for slug lookup:", error)
    return null
  }

  if (!data) {
    const { data: allPlumbers } = await supabase.from("plumbers").select("slug, business_name") // Updated column name
    console.warn(`Plumber not found with slug: ${slug}`)
    console.log("Available slugs in database:")
    allPlumbers?.forEach((p, index) => {
      console.log(`${index + 1}. "${p.slug}" - ${p.business_name}`) // Updated column name
    })
    return null
  }

  console.log("Successfully found plumber:", data.business_name || data.name) // Updated column name
  return transformDatabaseRow(data)
}

export async function getPlumbersBySuburb(suburb: string): Promise<Plumber[]> {
  return getAllPlumbers({ suburb })
}

export async function getAllSuburbs(): Promise<string[]> {
  const supabase = getClient()

  if (!supabase) {
    console.error("Supabase client is not available - environment variables may be missing")
    return []
  }

  const { data, error } = await supabase.from("plumbers").select("suburb").order("suburb")

  if (error) {
    console.error("Error fetching suburbs:", error)
    return []
  }

  if (!data || data.length === 0) {
    console.warn("No suburbs found in database")
    return []
  }

  const suburbs = [...new Set(data?.map((item) => item.suburb) || [])]
  return suburbs
}

export async function getAllServices(): Promise<string[]> {
  const supabase = getClient()

  if (!supabase) {
    console.error("Supabase client is not available - environment variables may be missing")
    return []
  }

  const { data, error } = await supabase.from("plumbers").select("services")

  if (error) {
    console.error("Error fetching services:", error)
    return []
  }

  if (!data || data.length === 0) {
    console.warn("No services found in database")
    return []
  }

  const allServices = data?.flatMap((item) => item.services || []) || []
  const uniqueServices = [...new Set(allServices)]
  return uniqueServices.sort()
}
