import Link from 'next/link'
import {
  getBusinessForEdit,
  getAllServiceSlugs,
  getAllAreaSlugs,
} from '@/lib/directory-admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EditBusinessForm } from './edit-form'
import { unwrap } from '@/lib/next/params'

interface PageProps {
  params: { slug: string }
  searchParams: Promise<{ token?: string }>
}

export default async function EditBusinessPage({ params, searchParams }: PageProps) {
  const { slug } = params
  const sp = await unwrap(searchParams)
  const token = sp.token

  // Missing token
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Missing edit token. Please use the link provided when you submitted your business.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Validate token and fetch business
  const business = await getBusinessForEdit(slug, token)

  // Invalid token or business not found
  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">Invalid edit token or business not found.</p>
            <p className="text-sm text-gray-600">
              If you lost your edit link, please contact support or submit a new listing.
            </p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid - load services/areas for dropdowns and render edit form
  const [services, areas] = await Promise.all([
    getAllServiceSlugs(),
    getAllAreaSlugs(),
  ])

  return (
    <>
      {/* Referrer-Policy meta tag to prevent token leakage */}
      <meta name="referrer" content="no-referrer" />

      <EditBusinessForm
        business={business}
        slug={slug}
        token={token}
        availableServices={services}
        availableAreas={areas}
      />
    </>
  )
}
