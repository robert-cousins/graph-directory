import { Header } from '@/components/header'
import { Breadcrumb } from '@/components/breadcrumb'
import { PlumberCard } from '@/components/plumber-card'
import { listPublishedBusinessesByService } from '@/lib/business-service'
import { notFound } from 'next/navigation'
import type { BusinessFilters } from '@/types/business'

interface PageProps {
  params: {
    service: string
  }
  searchParams: Promise<{
    page?: string
    pageSize?: string
    verified?: string
    minRating?: string
  }>
}

export default async function ServicePage({ params, searchParams }: PageProps) {
  const { service } = params

  // Parse search params
  const sp = await searchParams
  const page = parseInt(sp.page || '1', 10)
  const pageSize = parseInt(sp.pageSize || '20', 10)
  const verified = sp.verified === 'true'
  const minRating = sp.minRating ? parseFloat(sp.minRating) : undefined

  // Build additional filters
  const additionalFilters: Omit<BusinessFilters, 'service'> = {}
  if (verified) additionalFilters.verified = true
  if (minRating) additionalFilters.minRating = minRating

  // Fetch businesses for this service
  const result = await listPublishedBusinessesByService(service, {
    pagination: { page, pageSize },
    additionalFilters,
  })

  // If no results on first page, might be invalid service slug
  if (result.total === 0 && page === 1) {
    // You could check if service exists in service_types table here
    // For now, show empty state (service might be valid but no businesses offer it)
  }

  // Format service name for display (kebab-case to title case)
  const serviceDisplayName = service
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Plumbers', href: '/plumbers' },
    { label: serviceDisplayName },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumb items={breadcrumbItems} />

        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {serviceDisplayName} in Melville & Myaree
            </h1>
            <p className="text-gray-600">
              {result.total} plumber{result.total !== 1 ? 's' : ''} offering {serviceDisplayName.toLowerCase()}
            </p>
          </div>

          {/* Filter Summary */}
          {(verified || minRating) && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Filters applied:</span>
                {verified && <span className="ml-2 inline-block px-2 py-1 bg-white rounded text-xs">Verified</span>}
                {minRating && <span className="ml-2 inline-block px-2 py-1 bg-white rounded text-xs">Rating {minRating}+</span>}
                <a
                  href={`/plumbers/service/${service}`}
                  className="ml-4 text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  Clear filters
                </a>
              </p>
            </div>
          )}

          {/* Business Listings */}
          <div className="space-y-4">
            {result.data.length > 0 ? (
              result.data.map((business) => (
                <PlumberCard key={business.id} business={business} />
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  No businesses found
                </h2>
                <p className="text-gray-500">
                  {page === 1 && !verified && !minRating
                    ? `No plumbers currently offer ${serviceDisplayName.toLowerCase()} in this area.`
                    : 'Try adjusting your filters to see more results.'}
                </p>
                <a
                  href="/plumbers"
                  className="mt-4 inline-block text-blue-600 hover:text-blue-800 underline"
                >
                  View all plumbers
                </a>
              </div>
            )}
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {result.hasPrevPage && (
                <a
                  href={`/plumbers/service/${service}?page=${page - 1}&pageSize=${pageSize}${
                    verified ? '&verified=true' : ''
                  }${minRating ? `&minRating=${minRating}` : ''}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Previous
                </a>
              )}

              <span className="px-4 py-2 bg-white border border-gray-300 rounded">
                Page {page} of {result.totalPages}
              </span>

              {result.hasNextPage && (
                <a
                  href={`/plumbers/service/${service}?page=${page + 1}&pageSize=${pageSize}${
                    verified ? '&verified=true' : ''
                  }${minRating ? `&minRating=${minRating}` : ''}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
