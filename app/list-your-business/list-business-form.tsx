'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitBusinessAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Building2, Phone, MapPin, Wrench, Clock, Copy, Check } from 'lucide-react'

interface ListBusinessFormProps {
  availableServices: string[]
  availableAreas: string[]
}

export function ListBusinessForm({ availableServices, availableAreas }: ListBusinessFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editPath, setEditPath] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    description: '',
    license_number: '',
    years_experience: '',
    emergency_available: false,
    services: [] as string[],
    service_areas: [] as string[],
    business_hours: {
      Monday: '8:00 AM - 5:00 PM',
      Tuesday: '8:00 AM - 5:00 PM',
      Wednesday: '8:00 AM - 5:00 PM',
      Thursday: '8:00 AM - 5:00 PM',
      Friday: '8:00 AM - 5:00 PM',
      Saturday: '9:00 AM - 2:00 PM',
      Sunday: 'Closed',
    },
  })

  const handleServiceToggle = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }))
  }

  const handleAreaToggle = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      service_areas: prev.service_areas.includes(area)
        ? prev.service_areas.filter((a) => a !== area)
        : [...prev.service_areas, area],
    }))
  }

  const handleBusinessHoursChange = (day: string, hours: string) => {
    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: hours,
      },
    }))
  }

  const handleCopy = async () => {
    if (editPath) {
      const fullUrl = `${window.location.origin}${editPath}`
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formElement = e.currentTarget
      const formDataObj = new FormData(formElement)

      formData.services.forEach((service) => {
        formDataObj.append('services', service)
      })

      formData.service_areas.forEach((area) => {
        formDataObj.append('service_areas', area)
      })

      const result = await submitBusinessAction(formDataObj)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Show edit URL
      setEditPath(result.editPath)
    } catch (err) {
      console.error('Error submitting business:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit your business listing')
    } finally {
      setIsLoading(false)
    }
  }

  if (editPath) {
    const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${editPath}`

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-2xl w-full">
          <CardHeader className="bg-yellow-50">
            <CardTitle className="text-center text-2xl text-yellow-900">⚠️ SAVE THIS LINK</CardTitle>
            <CardDescription className="text-center text-yellow-800">
              This is the ONLY time you'll see your edit link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
              <p className="font-bold text-yellow-900 mb-2">⚠️ IMPORTANT - READ THIS</p>
              <p className="text-yellow-800 text-sm mb-3">
                There is NO account system. If you lose this link, you CANNOT edit your listing.
                Copy it now and save it somewhere safe (bookmark, email yourself, etc).
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300 break-all font-mono text-sm mb-3">
                {fullUrl}
              </div>
              <Button
                onClick={handleCopy}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Edit Link
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
              <p className="font-bold text-green-900 mb-2">✓ Submission Successful</p>
              <p className="text-green-800 text-sm mb-2">
                Your business has been submitted for review. It will appear in the directory once approved by our team.
              </p>
              <p className="text-green-800 text-sm">
                Status: <span className="font-semibold">Pending Review</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="flex-1"
              >
                Go to Home
              </Button>
              <Button
                onClick={() => router.push(editPath)}
                className="flex-1"
              >
                Edit Your Listing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">List Your Plumbing Business</h1>
          <p className="text-muted-foreground text-lg">
            Join our directory and connect with customers in your service areas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Fill out the form below to add your plumbing business to our directory</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Business Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5" />
                  <span>Business Details</span>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Business Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Melville Master Plumbers"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Tell customers about your business and what makes you unique..."
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="license_number">License Number *</Label>
                      <Input
                        id="license_number"
                        name="license_number"
                        required
                        value={formData.license_number}
                        onChange={(e) => setFormData((prev) => ({ ...prev, license_number: e.target.value }))}
                        placeholder="e.g., PL1234"
                      />
                    </div>

                    <div>
                      <Label htmlFor="years_experience">Years of Experience</Label>
                      <Input
                        id="years_experience"
                        name="years_experience"
                        type="number"
                        min="0"
                        value={formData.years_experience}
                        onChange={(e) => setFormData((prev) => ({ ...prev, years_experience: e.target.value }))}
                        placeholder="e.g., 15"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Phone className="h-5 w-5" />
                  <span>Contact Information</span>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g., (08) 9330 1234"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g., info@yourplumbing.com.au"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                      placeholder="e.g., https://www.yourplumbing.com.au"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5" />
                  <span>Location</span>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="e.g., 123 Main Street"
                    />
                  </div>

                  <div>
                    <Label>Service Areas * (select all that apply)</Label>
                    <div className="grid sm:grid-cols-2 gap-3 mt-2">
                      {availableAreas.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            id={`area-${area}`}
                            checked={formData.service_areas.includes(area)}
                            onCheckedChange={() => handleAreaToggle(area)}
                          />
                          <label
                            htmlFor={`area-${area}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {area}
                          </label>
                        </div>
                      ))}
                    </div>
                    {formData.service_areas.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">Please select at least one service area</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Wrench className="h-5 w-5" />
                  <span>Services Offered *</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {availableServices.map((service) => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={service}
                        checked={formData.services.includes(service)}
                        onCheckedChange={() => handleServiceToggle(service)}
                      />
                      <label
                        htmlFor={service}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {service}
                      </label>
                    </div>
                  ))}
                </div>
                {formData.services.length === 0 && (
                  <p className="text-sm text-muted-foreground">Please select at least one service</p>
                )}
              </div>

              {/* Business Hours */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5" />
                  <span>Business Hours</span>
                </div>

                <div className="grid gap-3">
                  {Object.entries(formData.business_hours).map(([day, hours]) => (
                    <div key={day} className="grid grid-cols-[120px_1fr] gap-4 items-center">
                      <Label htmlFor={`hours-${day}`} className="font-medium">
                        {day}
                      </Label>
                      <Input
                        id={`hours-${day}`}
                        name={day}
                        value={hours}
                        onChange={(e) => handleBusinessHoursChange(day, e.target.value)}
                        placeholder="e.g., 8:00 AM - 5:00 PM or Closed"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your operating hours for each day. Use "Closed" for days you don't operate.
                </p>
              </div>

              {/* Emergency Service */}
              <div className="space-y-4">
                <input type="hidden" name="emergency_available" value={formData.emergency_available ? 'on' : 'off'} />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emergency"
                    checked={formData.emergency_available}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, emergency_available: checked === true }))
                    }
                  />
                  <label
                    htmlFor="emergency"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    24/7 Emergency Service Available
                  </label>
                </div>
              </div>

              {Object.entries(formData.business_hours).map(([day, hours]) => (
                <input key={day} type="hidden" name={day} value={hours} />
              ))}

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || formData.services.length === 0 || formData.service_areas.length === 0}
              >
                {isLoading ? 'Submitting...' : 'List My Business'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By submitting this form, you agree to have your business listed in our directory. All listings are
                subject to review.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
