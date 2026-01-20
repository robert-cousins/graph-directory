"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ServiceType, RatingFilter, SortOption, SuburbFilter } from "@/types/plumber"

interface FilterSidebarProps {
  selectedServices: ServiceType[]
  setSelectedServices: (services: ServiceType[]) => void
  selectedRating: RatingFilter
  setSelectedRating: (rating: RatingFilter) => void
  selectedSuburb: SuburbFilter // Added suburb filter prop
  setSelectedSuburb: (suburb: SuburbFilter) => void // Added suburb filter setter
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void
}

const serviceTypes: ServiceType[] = [
  "Emergency Repairs",
  "Blocked Drains",
  "Hot Water Systems",
  "Bathroom Renovations",
  "Gas Fitting",
  "Leak Detection",
]

const ratingOptions: RatingFilter[] = ["4+ Stars", "3+ Stars", "All Ratings"]
const sortOptions: SortOption[] = ["Highest Rated", "Most Reviews", "A-Z", "Recently Added"]
const suburbOptions: SuburbFilter[] = ["All Suburbs", "Melville", "Myaree", "Booragoon"] // Added Booragoon to suburb options

export function FilterSidebar({
  selectedServices,
  setSelectedServices,
  selectedRating,
  setSelectedRating,
  selectedSuburb, // Added suburb filter parameter
  setSelectedSuburb, // Added suburb filter setter parameter
  sortBy,
  setSortBy,
}: FilterSidebarProps) {
  const handleServiceToggle = (service: ServiceType) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service))
    } else {
      setSelectedServices([...selectedServices, service])
    }
  }

  return (
    <div className="space-y-6">
      {/* Sort */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sort By</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Location</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedSuburb} onValueChange={(value: SuburbFilter) => setSelectedSuburb(value)}>
            {suburbOptions.map((suburb) => (
              <div key={suburb} className="flex items-center space-x-2">
                <RadioGroupItem value={suburb} id={suburb} />
                <Label htmlFor={suburb} className="text-sm font-normal cursor-pointer">
                  {suburb}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Service Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Service Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {serviceTypes.map((service) => (
              <div key={service} className="flex items-center space-x-2">
                <Checkbox
                  id={service}
                  checked={selectedServices.includes(service)}
                  onCheckedChange={() => handleServiceToggle(service)}
                />
                <Label htmlFor={service} className="text-sm font-normal cursor-pointer">
                  {service}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedRating} onValueChange={(value: RatingFilter) => setSelectedRating(value)}>
            {ratingOptions.map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <RadioGroupItem value={rating} id={rating} />
                <Label htmlFor={rating} className="text-sm font-normal cursor-pointer">
                  {rating}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

    </div>
  )
}
