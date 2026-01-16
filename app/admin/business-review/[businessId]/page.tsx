'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBusinessForAdminReview } from '@/packages/core-data'
import { publishBusiness, requestChangesForBusiness, unpublishBusiness } from '@/packages/core-mutators'

export default function BusinessReviewPage() {
  const params = useParams()
  const router = useRouter()
  const businessId = params.businessId as string
  const [business, setBusiness] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    async function fetchBusiness() {
      try {
        setLoading(true)
        const data = await getBusinessForAdminReview(businessId)
        setBusiness(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching business for review:', err)
        setError('Failed to load business details')
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchBusiness()
    }
  }, [businessId])

  const handlePublish = async () => {
    if (!business) return

    setActionLoading(true)
    setActionResult(null)

    try {
      // In a real app, you would get the current admin user ID from auth context
      const adminUserId = 'admin-user-id' // Placeholder - replace with real auth

      const result = await publishBusiness(business.id, adminUserId)

      if (result.success) {
        setActionResult({ success: true, message: 'Business published successfully!' })
        // Refresh business data to show updated status
        const updatedBusiness = await getBusinessForAdminReview(businessId)
        setBusiness(updatedBusiness)
      } else {
        setActionResult({ success: false, message: result.error || 'Failed to publish business' })
      }
    } catch (err) {
      console.error('Publish error:', err)
      setActionResult({ success: false, message: 'Failed to publish business' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestChanges = async () => {
    if (!business) return

    setActionLoading(true)
    setActionResult(null)

    try {
      // In a real app, you would get the current admin user ID from auth context
      const adminUserId = 'admin-user-id' // Placeholder - replace with real auth

      const result = await requestChangesForBusiness(business.id, adminUserId)

      if (result.success) {
        setActionResult({ success: true, message: 'Changes requested successfully!' })
        // Refresh business data to show updated status
        const updatedBusiness = await getBusinessForAdminReview(businessId)
        setBusiness(updatedBusiness)
      } else {
        setActionResult({ success: false, message: result.error || 'Failed to request changes' })
      }
    } catch (err) {
      console.error('Request changes error:', err)
      setActionResult({ success: false, message: 'Failed to request changes' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnpublish = async () => {
    if (!business) return

    setActionLoading(true)
    setActionResult(null)

    try {
      // In a real app, you would get the current admin user ID from auth context
      const adminUserId = 'admin-user-id' // Placeholder - replace with real auth

      const result = await unpublishBusiness(business.id, adminUserId)

      if (result.success) {
        setActionResult({ success: true, message: 'Business unpublished successfully!' })
        // Refresh business data to show updated status
        const updatedBusiness = await getBusinessForAdminReview(businessId)
        setBusiness(updatedBusiness)
      } else {
        setActionResult({ success: false, message: result.error || 'Failed to unpublish business' })
      }
    } catch (err) {
      console.error('Unpublish error:', err)
      setActionResult({ success: false, message: 'Failed to unpublish business' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBackToQueue = () => {
    router.push('/admin/editorial-queue')
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Business Review</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Business Review</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Button onClick={handleBackToQueue} className="mt-4">
          Back to Queue
        </Button>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Business Review</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Business not found
        </div>
        <Button onClick={handleBackToQueue} className="mt-4">
          Back to Queue
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Business Review</h1>
        <Link href="/admin/editorial-queue" className="text-blue-600 hover:underline">
          Back to Queue
        </Link>
      </div>

      {actionResult && (
        <div
          className={`mb-6 p-4 rounded ${
            actionResult.success
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}
        >
          <h3 className="font-bold mb-1">{actionResult.success ? 'Success' : 'Error'}</h3>
          <p>{actionResult.message}</p>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">
                {business.trading_name || business.legal_name}
              </CardTitle>
              <CardDescription>
                {business.legal_name !== business.trading_name && business.legal_name}
              </CardDescription>
            </div>
            <Badge
              variant={
                business.status === 'published'
                  ? 'default'
                  : business.status === 'pending_review'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {business.status === 'published'
                ? 'Published'
                : business.status === 'pending_review'
                ? 'In Review'
                : 'Draft'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Contact Information</h3>
              <p><strong>Phone:</strong> {business.phone}</p>
              <p><strong>Email:</strong> {business.email}</p>
              <p><strong>Website:</strong> {business.website || 'N/A'}</p>
              <p><strong>Address:</strong> {business.street_address || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Business Details</h3>
              <p><strong>Rating:</strong> {business.rating || 'Not rated'}</p>
              <p><strong>Review Count:</strong> {business.review_count || 0}</p>
              <p><strong>Years Experience:</strong> {business.years_experience || 'N/A'}</p>
              <p><strong>Emergency Available:</strong> {business.emergency_available ? 'Yes' : 'No'}</p>
              <p><strong>Verified:</strong> {business.is_verified ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Services</h3>
            <div className="flex flex-wrap gap-2">
              {business.services && business.services.length > 0 ? (
                business.services.map((service: string) => (
                  <Badge key={service} variant="outline">
                    {service}
                  </Badge>
                ))
              ) : (
                <p>No services listed</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Service Areas</h3>
            <div className="flex flex-wrap gap-2">
              {business.service_areas && business.service_areas.length > 0 ? (
                business.service_areas.map((area: string) => (
                  <Badge key={area} variant="outline">
                    {area}
                  </Badge>
                ))
              ) : (
                <p>No service areas listed</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p>{business.description || 'No description provided'}</p>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Audit Information</h3>
            <p><strong>Created:</strong> {new Date(business.created_at).toLocaleString()}</p>
            <p><strong>Updated:</strong> {new Date(business.updated_at).toLocaleString()}</p>
            {business.review_submitted_at && (
              <p>
                <strong>Submitted for Review:</strong> {new Date(business.review_submitted_at).toLocaleString()}
              </p>
            )}
            {business.published_at && (
              <p>
                <strong>Published:</strong> {new Date(business.published_at).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {business.status === 'draft' && (
              <Button
                onClick={handlePublish}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? 'Processing...' : 'Publish'}
              </Button>
            )}

            {business.status === 'pending_review' && (
              <>
                <Button
                  onClick={handlePublish}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? 'Processing...' : 'Approve & Publish'}
                </Button>
                <Button
                  onClick={handleRequestChanges}
                  disabled={actionLoading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {actionLoading ? 'Processing...' : 'Request Changes'}
                </Button>
              </>
            )}

            {business.status === 'published' && (
              <Button
                onClick={handleUnpublish}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? 'Processing...' : 'Unpublish'}
              </Button>
            )}

            <Button
              onClick={handleBackToQueue}
              variant="outline"
              disabled={actionLoading}
            >
              Back to Queue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
