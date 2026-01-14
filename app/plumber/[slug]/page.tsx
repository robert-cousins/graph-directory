import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Star, Phone, Mail, MapPin, Clock, Calendar, Pencil } from "lucide-react"

import { Header } from "@/components/header"
import { Breadcrumb } from "@/components/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { getPublishedBusinessBySlug, listPublishedBusinesses } from "@/lib/business-service"

// This route depends on runtime data (Supabase). Force dynamic rendering so CI builds
// don’t require DB env vars during prerender.
export const dynamic = 'force-dynamic'

interface PlumberPageProps {
  params: {
    slug: string
  }
}

export default async function PlumberPage({ params }: PlumberPageProps) {
  const business = await getPublishedBusinessBySlug(params.slug)

  if (!business) {
    notFound()
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Plumbers in Melville", href: "/plumbers" },
    { label: business.displayName },
  ]

  const uniqueServices = Array.from(new Set(business.services || []))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumb items={breadcrumbItems} />

        {/* Edit button */}
        <div className="flex justify-end mb-4">
          <Link href={`/plumber/${business.slug}/edit`}>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Pencil className="h-4 w-4" />
              Edit Listing
            </Button>
          </Link>
        </div>

        {/* Hero */}
        <div className="mb-8">
          <div className="relative h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden shadow-lg">
            <Image
              src={business.heroImage || "/images/plumber-business-hero.png"}
              alt={`${business.displayName} - Professional Plumbing Services`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">{business.displayName}</h1>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 text-lg font-semibold text-white">{business.rating}</span>
                  <span className="text-white/80 ml-1">({business.reviewCount} reviews)</span>
                </div>

                {business.emergencyAvailable ? (
                  <Badge className="bg-green-600 hover:bg-green-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Emergency Available
                  </Badge>
                ) : null}
              </div>

              <p className="text-white/90 text-lg max-w-2xl">{business.description}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Description</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{business.displayName}</h2>
                    <p className="text-gray-600">
                      {business.description ||
                        `Professional plumbing services${business.serviceAreas && business.serviceAreas.length > 0 ? ` in ${business.serviceAreas.join(', ')}` : ''} with a focus on quality workmanship and customer satisfaction.`}
                    </p>
                  </div>

                  {/* Mobile contact buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
                    <a href={`tel:${business.phone}`} className="flex-1">
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </Button>
                    </a>
                    <a href={`mailto:${business.email}?subject=Quote Request`} className="flex-1">
                      <Button variant="outline" className="w-full bg-transparent">
                        <Mail className="h-4 w-4 mr-2" />
                        Get Quote
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Services Offered
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uniqueServices.length ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {uniqueServices.map((service, index) => (
                      <div key={`${service}-${index}`} className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
                        <span className="font-medium text-gray-900">{service}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No services listed</p>
                )}
              </CardContent>
            </Card>

            {/* Service Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Service Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {business.serviceAreas && business.serviceAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {business.serviceAreas.map((area, index) => (
                      <span
                        key={`${area}-${index}`}
                        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No service areas listed</p>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Customer Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mock reviews for demo - TODO: Implement reviews functionality */}
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">Mark D.</span>
                        <div className="flex items-center ml-3">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">Jan 22, 2024</span>
                    </div>
                    <p className="text-gray-600">
                      Outstanding service! They arrived promptly and fixed our hot water system efficiently. Very
                      professional and reasonably priced.
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">Jennifer L.</span>
                        <div className="flex items-center ml-3">
                          {[...Array(4)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                          <Star className="h-4 w-4 text-gray-300" />
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">Jan 19, 2024</span>
                    </div>
                    <p className="text-gray-600">
                      Good service overall. The plumber was knowledgeable and completed the job well. Would recommend
                      for general plumbing needs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-20 z-10 shadow-lg border-2 border-blue-100">
              <CardHeader className="pb-3 bg-blue-50">
                <CardTitle className="text-lg sm:text-xl text-blue-900">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-4 bg-white">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm sm:text-sm text-gray-500">Phone</p>
                    <a
                      href={`tel:${business.phone}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base"
                    >
                      {business.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-sm text-gray-500">Email</p>
                    <a
                      href={`mailto:${business.email}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base break-all"
                    >
                      {business.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm sm:text-sm text-gray-500">Address</p>
                    <p className="text-gray-900 text-sm sm:text-base leading-relaxed">{business.streetAddress}</p>
                  </div>
                </div>

                <div className="pt-4 space-y-3 hidden lg:block">
                  <a href={`tel:${business.phone}`} className="block">
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>
                  </a>
                  <a href={`mailto:${business.email}?subject=Quote Request`} className="block">
                    <Button variant="outline" className="w-full bg-transparent">
                      <Mail className="h-4 w-4 mr-2" />
                      Get Quote
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-medium">{business.rating}/5</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reviews</span>
                  <span className="font-medium">{business.reviewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Emergency Service</span>
                  <span className={`font-medium ${business.emergencyAvailable ? "text-green-600" : "text-gray-500"}`}>
                    {business.emergencyAvailable ? "Available" : "Not Available"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Services</span>
                  <span className="font-medium">{business.services?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
