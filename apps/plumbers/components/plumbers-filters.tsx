"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterSidebar } from '@/components/filter-sidebar'
import { MobileFilterMenu } from '@/components/mobile-filter-menu'
import type {
  ServiceType,
  RatingFilter,
  AvailabilityFilter,
  SortOption,
  SuburbFilter
} from '@/types/plumber'

// ============================================================================
// Mapping Functions: UI state ↔ URL params
// ============================================================================

function ratingFilterToMinRating(filter: RatingFilter): number | undefined {
  switch (filter) {
    case "4+ Stars": return 4
    case "3+ Stars": return 3
    case "All Ratings": return undefined
  }
}

function minRatingToRatingFilter(minRating: number | undefined): RatingFilter {
  if (minRating === undefined) return "All Ratings"
  if (minRating >= 4) return "4+ Stars"
  return "3+ Stars"
}

function availabilityToEmergency(availability: AvailabilityFilter): boolean | undefined {
  if (availability === "All") return undefined
  // Both "Available Today" and "Available This Week" mean emergency=true for now
  return true
}

function emergencyToAvailability(emergency: boolean | undefined): AvailabilityFilter {
  return emergency ? "Available Today" : "All"
}

function sortOptionToParams(sortBy: SortOption): { sort: string; direction: string } {
  switch (sortBy) {
    case "Highest Rated":
      return { sort: 'rating', direction: 'desc' }
    case "Most Reviews":
      return { sort: 'review_count', direction: 'desc' }
    case "A-Z":
      return { sort: 'trading_name', direction: 'asc' }
    case "Recently Added":
      return { sort: 'published_at', direction: 'desc' }
  }
}

function paramsToSortOption(sort: string | null, direction: string | null): SortOption {
  const key = `${sort || 'rating'}:${direction || 'desc'}`
  const map: Record<string, SortOption> = {
    'rating:desc': 'Highest Rated',
    'review_count:desc': 'Most Reviews',
    'trading_name:asc': 'A-Z',
    'published_at:desc': 'Recently Added',
  }
  return map[key] || 'Highest Rated'
}

// ============================================================================
// Desktop Filter Bridge
// ============================================================================

export function DesktopFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInitializing = useRef(true)

  // Initialize state from URL
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])
  const [selectedRating, setSelectedRating] = useState<RatingFilter>(() => {
    const minRating = searchParams.get('minRating')
    return minRatingToRatingFilter(minRating ? parseFloat(minRating) : undefined)
  })
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityFilter>(() => {
    const emergency = searchParams.get('emergency')
    return emergencyToAvailability(emergency === 'true' ? true : undefined)
  })
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbFilter>("All Suburbs")
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sort = searchParams.get('sort')
    const direction = searchParams.get('direction')
    return paramsToSortOption(sort, direction)
  })

  // Update URL when filters change (skip on mount)
  useEffect(() => {
    if (isInitializing.current) {
      isInitializing.current = false
      return
    }

    const params = new URLSearchParams(searchParams.toString())

    // Always reset to page 1 when filters change
    params.set('page', '1')

    // Rating filter
    const minRating = ratingFilterToMinRating(selectedRating)
    if (minRating !== undefined) {
      params.set('minRating', String(minRating))
    } else {
      params.delete('minRating')
    }

    // Availability filter
    const emergency = availabilityToEmergency(selectedAvailability)
    if (emergency !== undefined) {
      params.set('emergency', 'true')
    } else {
      params.delete('emergency')
    }

    // Sort
    const { sort, direction } = sortOptionToParams(sortBy)
    if (sort !== 'rating') {
      params.set('sort', sort)
    } else {
      params.delete('sort')
    }
    if (direction !== 'desc') {
      params.set('direction', direction)
    } else {
      params.delete('direction')
    }

    // Only push if params actually changed
    const newUrl = `/plumbers?${params.toString()}`
    const currentUrl = `/plumbers?${searchParams.toString()}`
    if (newUrl !== currentUrl) {
      router.push(newUrl, { scroll: false })
    }
  }, [selectedServices, selectedRating, selectedAvailability, selectedSuburb, sortBy, router, searchParams])

  return (
    <FilterSidebar
      selectedServices={selectedServices}
      setSelectedServices={setSelectedServices}
      selectedRating={selectedRating}
      setSelectedRating={setSelectedRating}
      selectedAvailability={selectedAvailability}
      setSelectedAvailability={setSelectedAvailability}
      selectedSuburb={selectedSuburb}
      setSelectedSuburb={setSelectedSuburb}
      sortBy={sortBy}
      setSortBy={setSortBy}
    />
  )
}

// ============================================================================
// Mobile Filter Bridge
// ============================================================================

export function MobileFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInitializing = useRef(true)

  const [isOpen, setIsOpen] = useState(false)

  // Initialize state from URL
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])
  const [selectedRating, setSelectedRating] = useState<RatingFilter>(() => {
    const minRating = searchParams.get('minRating')
    return minRatingToRatingFilter(minRating ? parseFloat(minRating) : undefined)
  })
  const [selectedAvailability, setSelectedAvailability] = useState<AvailabilityFilter>(() => {
    const emergency = searchParams.get('emergency')
    return emergencyToAvailability(emergency === 'true' ? true : undefined)
  })
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbFilter>("All Suburbs")
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sort = searchParams.get('sort')
    const direction = searchParams.get('direction')
    return paramsToSortOption(sort, direction)
  })

  // Update URL when filters change (skip on mount)
  useEffect(() => {
    if (isInitializing.current) {
      isInitializing.current = false
      return
    }

    const params = new URLSearchParams(searchParams.toString())

    // Always reset to page 1 when filters change
    params.set('page', '1')

    // Rating filter
    const minRating = ratingFilterToMinRating(selectedRating)
    if (minRating !== undefined) {
      params.set('minRating', String(minRating))
    } else {
      params.delete('minRating')
    }

    // Availability filter
    const emergency = availabilityToEmergency(selectedAvailability)
    if (emergency !== undefined) {
      params.set('emergency', 'true')
    } else {
      params.delete('emergency')
    }

    // Sort
    const { sort, direction } = sortOptionToParams(sortBy)
    if (sort !== 'rating') {
      params.set('sort', sort)
    } else {
      params.delete('sort')
    }
    if (direction !== 'desc') {
      params.set('direction', direction)
    } else {
      params.delete('direction')
    }

    // Only push if params actually changed
    const newUrl = `/plumbers?${params.toString()}`
    const currentUrl = `/plumbers?${searchParams.toString()}`
    if (newUrl !== currentUrl) {
      router.push(newUrl, { scroll: false })
    }
  }, [selectedServices, selectedRating, selectedAvailability, selectedSuburb, sortBy, router, searchParams])

  return (
    <MobileFilterMenu
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      selectedServices={selectedServices}
      setSelectedServices={setSelectedServices}
      selectedRating={selectedRating}
      setSelectedRating={setSelectedRating}
      selectedAvailability={selectedAvailability}
      setSelectedAvailability={setSelectedAvailability}
      selectedSuburb={selectedSuburb}
      setSelectedSuburb={setSelectedSuburb}
      sortBy={sortBy}
      setSortBy={setSortBy}
    />
  )
}
