"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UpdateDatabaseHeroes() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<string>("")

  const updateHeroImages = async () => {
    setIsUpdating(true)
    setResult("")

    try {
      console.log("[v0] Starting hero image update...")

      const response = await fetch("/api/update-hero-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      console.log("[v0] Update response:", data)

      if (response.ok) {
        setResult(`✅ Success! Updated ${data.updatedCount} plumber records with the correct hero image.`)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Update error:", error)
      setResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Update Database Hero Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This will update all plumber records in the database to use the correct photorealistic hero image instead of
            placeholder.svg references.
          </p>

          <Button onClick={updateHeroImages} disabled={isUpdating} className="w-full">
            {isUpdating ? "Updating..." : "Update All Hero Images"}
          </Button>

          {result && (
            <div className="p-4 rounded-lg bg-gray-50 border">
              <p className="text-sm">{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
