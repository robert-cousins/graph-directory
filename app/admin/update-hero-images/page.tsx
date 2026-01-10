"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UpdateHeroImagesPage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<string>("")

  const updateHeroImages = async () => {
    setIsUpdating(true)
    setResult("")

    try {
      const response = await fetch("/api/update-hero-images", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`Success: Updated ${data.updatedCount} plumber records`)
      } else {
        setResult(`Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const checkDatabase = async () => {
    try {
      const response = await fetch("/api/check-database")
      const data = await response.json()

      if (response.ok) {
        setResult(
          `Database check: Found ${data.plumbers.length} plumbers. Hero images: ${JSON.stringify(
            data.plumbers.map((p: any) => ({ name: p.business_name, heroImage: p.hero_image })),
            null,
            2,
          )}`,
        )
      } else {
        setResult(`Error checking database: ${data.error}`)
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Update Hero Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={updateHeroImages} disabled={isUpdating} className="flex-1">
              {isUpdating ? "Updating..." : "Update Hero Images"}
            </Button>
            <Button onClick={checkDatabase} variant="outline" className="flex-1 bg-transparent">
              Check Database
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
