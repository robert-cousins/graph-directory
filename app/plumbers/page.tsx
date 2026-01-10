import { Header } from '@/components/header'
import { Breadcrumb } from '@/components/breadcrumb'
import { DesktopFilters, MobileFilters } from '@/components/plumbers-filters'
import { PlumberCard } from '@/components/plumber-card'
import { listPublishedBusinesses } from '@/lib/business-service'
import type { BusinessFilters, BusinessSortBy, SortDirection } from '@/types/business'

interface PageProps {
  searchParams: {
    page?: string
    pageSize?: string
    emergency?: string
    verified?: string
    minRating?: string
    search?: string
    sort?: string
    direction?: string
  }
}

export default async function PlumbersPage({ searchParams }: PageProps) {
  // Parse search params
  const page = parseInt(searchParams.page || '1', 10)
  const pageSize = parseInt(searchParams.pageSize || '20', 10)
  const emergency = searchParams.emergency === 'true'
  const verified = searchParams.verified === 'true'
  const minRating = searchParams.minRating ? parseFloat(searchParams.minRating) : undefined
  const search = searchParams.search || undefined
  const sortBy = (searchParams.sort as BusinessSortBy) || 'rating'
  const sortDirection = (searchParams.direction as SortDirection) || 'desc'

  // Build filters
  const filters: BusinessFilters = {}
  if (emergency) filters.emergency = true
  if (verified) filters.verified = true
  if (minRating !== undefined) filters.minRating = minRating
  if (search) filters.search = search

  // Fetch businesses server-side
  const result = await listPublishedBusinesses({
    filters,
    pagination: { page, pageSize },
    sortBy,
    sortDirection,
  })

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Plumbers in Melville & Myaree' },
  ]

  const getPageTitle = () => {
    if (search) return `Plumbers matching "${search}"`
    return 'Plumbers in Melville, Myaree & Booragoon, WA'
  }

  // Helper to preserve current query params in pagination links
  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams()

    params.set('page', String(nextPage))
    params.set('pageSize', String(pageSize))

    if (emergency) params.set('emergency', 'true')
    if (verified) params.set('verified', 'true')
    if (minRating !== undefined) params.set('minRating', String(minRating))
    if (search) params.set('search', search)

    if (sortBy && sortBy !== 'rating') params.set('sort', String(sortBy))
    if (sortDirection && sortDirection !== 'desc') params.set('direction', String(sortDirection))

    return `/plumbers?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <DesktopFilters />
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Mobile Filters (mobile only) */}
            <div className="lg:hidden mb-4">
              <MobileFilters />
            </div>

            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
                <p className="text-gray-600 mt-1">
                  {result.total} plumber{result.total !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>

            {/* Plumber Listings */}
            <div className="space-y-4">
              {result.data.length > 0 ? (
                result.data.map((business) => (
                  <PlumberCard key={business.id} business={business} />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No plumbers found matching your criteria.</p>
                  <p className="text-gray-400 mt-2">Try adjusting your filters to see more results.</p>
                </div>
              )}
            </div>

            {/* Pagination (simple) */}
            {result.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {result.hasPrevPage && (
                  <a
                    href={buildPageHref(page - 1)}
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
                    href={buildPageHref(page + 1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Next
                  </a>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
