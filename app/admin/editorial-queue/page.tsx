'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { listEditorialBusinesses } from '@/packages/core-data'
import { useRouter } from 'next/navigation'

export default function EditorialQueuePage() {
  const [businesses, setBusinesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchEditorialBusinesses() {
      try {
        setLoading(true)
        const data = await listEditorialBusinesses()
        setBusinesses(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching editorial businesses:', err)
        setError('Failed to load editorial queue')
      } finally {
        setLoading(false)
      }
    }

    fetchEditorialBusinesses()
  }, [])

  const handleReviewClick = (businessId: string) => {
    router.push(`/admin/business-review/${businessId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Editorial Queue</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Editorial Queue</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Editorial Queue</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          Back to Admin
        </Link>
      </div>

      {businesses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No businesses in editorial queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {businesses.map((business) => (
            <Card key={business.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {business.trading_name || business.legal_name}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {business.legal_name !== business.trading_name && business.legal_name}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={business.status === 'pending_review' ? 'default' : 'secondary'}
                  >
                    {business.status === 'pending_review' ? 'In Review' : 'Draft'}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => handleReviewClick(business.id)}
                  >
                    Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Contact:</p>
                    <p>{business.phone}</p>
                    <p>{business.email}</p>
                  </div>
                  <div>
                    <p className="font-medium">Services:</p>
                    <p>{business.service_count} services</p>
                  </div>
                  <div>
                    <p className="font-medium">Areas:</p>
                    <p>{business.area_count} service areas</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-medium">Submitted:</p>
                  <p>{new Date(business.submitted_at).toLocaleString()}</p>
                </div>
                {business.status === 'pending_review' && (
                  <div className="mt-4">
                    <p className="font-medium">Review Status:</p>
                    <p>
                      {business.publication_check?.eligible ? (
                        <span className="text-green-600">✓ Meets publication requirements</span>
                      ) : (
                        <span className="text-red-600">✗ Needs attention</span>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
