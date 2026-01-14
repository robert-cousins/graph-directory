import Link from "next/link"
import { Star, Phone, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { PublishedBusiness } from "@graph-directory/core-contracts"

interface PlumberCardProps {
  business: PublishedBusiness
}

export function PlumberCard({ business }: PlumberCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Business Name and Rating - Mobile Optimized */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">{business.displayName}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 font-medium">{business.rating}</span>
                  <span className="text-gray-500 text-sm ml-1">({business.reviewCount})</span>
                </div>
                {business.emergencyAvailable && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Emergency
                  </Badge>
                )}
              </div>
            </div>

            {/* Phone Number - Prominent on Mobile */}
            <div className="flex items-center">
              <Phone className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <a
                href={`tel:${business.phone}`}
                className="text-blue-600 hover:text-blue-800 font-medium text-lg sm:text-base"
              >
                {business.phone}
              </a>
            </div>
          </div>

          {/* Services - Mobile Optimized */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {business.services.slice(0, 3).map((service) => (
              <Badge key={service} variant="outline" className="text-xs px-2 py-1">
                {service}
              </Badge>
            ))}
            {business.services.length > 3 && (
              <Badge variant="outline" className="text-xs text-gray-500 px-2 py-1">
                +{business.services.length - 3}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed">{business.description}</p>

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <a href={`tel:${business.phone}`} className="flex-1">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base">
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </a>
            <Link href={`/plumber/${business.slug}`} className="flex-1">
              <Button variant="outline" className="w-full bg-transparent text-sm sm:text-base">
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
