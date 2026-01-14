"use client"
import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { FilterSidebar } from "@/components/filter-sidebar"
import type { ServiceType, RatingFilter, AvailabilityFilter, SortOption, SuburbFilter } from "@/types/plumber"

interface MobileFilterMenuProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selectedServices: ServiceType[]
  setSelectedServices: (services: ServiceType[]) => void
  selectedRating: RatingFilter
  setSelectedRating: (rating: RatingFilter) => void
  selectedAvailability: AvailabilityFilter
  setSelectedAvailability: (availability: AvailabilityFilter) => void
  selectedSuburb: SuburbFilter // Added suburb filter prop
  setSelectedSuburb: (suburb: SuburbFilter) => void // Added suburb filter setter
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void
}

export function MobileFilterMenu({
  isOpen,
  setIsOpen,
  selectedServices,
  setSelectedServices,
  selectedRating,
  setSelectedRating,
  selectedAvailability,
  setSelectedAvailability,
  selectedSuburb, // Added suburb filter parameter
  setSelectedSuburb, // Added suburb filter setter parameter
  sortBy,
  setSortBy,
}: MobileFilterMenuProps) {
  const activeFiltersCount =
    selectedServices.length +
    (selectedRating !== "All Ratings" ? 1 : 0) +
    (selectedAvailability !== "All" ? 1 : 0) +
    (selectedSuburb !== "All Suburbs" ? 1 : 0) // Added suburb filter to active count

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full bg-transparent">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{activeFiltersCount}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Plumbers</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <FilterSidebar
            selectedServices={selectedServices}
            setSelectedServices={setSelectedServices}
            selectedRating={selectedRating}
            setSelectedRating={setSelectedRating}
            selectedAvailability={selectedAvailability}
            setSelectedAvailability={setSelectedAvailability}
            selectedSuburb={selectedSuburb} // Added suburb filter prop
            setSelectedSuburb={setSelectedSuburb} // Added suburb filter setter
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </div>
        <div className="mt-6 pt-6 border-t">
          <Button onClick={() => setIsOpen(false)} className="w-full">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
