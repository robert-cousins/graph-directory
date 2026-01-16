'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBusinessAction } from './actions'
import type { EditableBusinessData } from '@/lib/directory-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Header } from '@/components/header'

interface EditBusinessFormProps {
  business: EditableBusinessData
  slug: string
  token: string
  availableServices: string[]
  availableAreas: string[]
}

export function EditBusinessForm({
  business,
  slug,
  token,
  availableServices,
  availableAreas,
}: EditBusinessFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    trading_name: business.trading_name,
    legal_name: business.legal_name,
    description: business.description || '',
    phone: business.phone,
    email: business.email || '',
    website: business.website || '',
    street_address: business.street_address || '',
    years_experience: business.years_experience?.toString() || '',
    services: business.services,
    service_areas: business.service_areas,
    license_number: business.license_number || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateBusinessAction(slug, token, {
        trading_name: formData.trading_name,
        legal_name: formData.legal_name || undefined,
        description: formData.description || undefined,
        phone: formData.phone,
        email: formData.email || null,
        website: formData.website || undefined,
        street_address: formData.street_address || undefined,
        years_experience: formData.years_experience ? Number(formData.years_experience) : undefined,
        services: formData.services,
        service_areas: formData.service_areas,
        license_number: formData.license_number || undefined,
      })

      if (result.success) {
        setSuccess(true)
        // Optionally redirect after a delay
        setTimeout(() => router.push(`/plumber/${slug}`), 2000)
      } else {
        setError(result.error || 'Failed to update business')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service],
    }))
  }

  const toggleArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.includes(area)
        ? prev.service_areas.filter(a => a !== area)
        : [...prev.service_areas, area],
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Banner */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded">
          <p className="text-yellow-800 font-medium">
            Status: {business.status === 'pending_review' ? 'Pending Review' : business.status}
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            Your listing is awaiting manual verification by our team. You can edit your details anytime.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Your Business Listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Trading Name */}
              <div>
                <Label htmlFor="trading_name">Trading Name *</Label>
                <Input
                  id="trading_name"
                  value={formData.trading_name}
                  onChange={e => setFormData(prev => ({ ...prev, trading_name: e.target.value }))}
                  required
                />
              </div>

              {/* Legal Name */}
              <div>
                <Label htmlFor="legal_name">Legal Name</Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={e => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="street_address">Street Address</Label>
                <Input
                  id="street_address"
                  value={formData.street_address}
                  onChange={e => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                />
              </div>

              {/* Years Experience */}
              <div>
                <Label htmlFor="years_experience">Years of Experience</Label>
                <Input
                  id="years_experience"
                  type="number"
                  value={formData.years_experience}
                  onChange={e => setFormData(prev => ({ ...prev, years_experience: e.target.value }))}
                />
              </div>

              {/* License Number */}
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={e => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                />
              </div>


              {/* Services */}
              <div>
                <Label>Services Offered *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableServices.map(service => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service}`}
                        checked={formData.services.includes(service)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <label htmlFor={`service-${service}`} className="text-sm cursor-pointer">
                        {service}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service Areas */}
              <div>
                <Label>Service Areas *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableAreas.map(area => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${area}`}
                        checked={formData.service_areas.includes(area)}
                        onCheckedChange={() => toggleArea(area)}
                      />
                      <label htmlFor={`area-${area}`} className="text-sm cursor-pointer">
                        {area}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-300 rounded">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-300 rounded">
                  <p className="text-green-800">Business updated successfully! Redirecting...</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/plumber/${slug}`)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
