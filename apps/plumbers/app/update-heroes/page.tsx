"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UpdateHeroesPage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<string>("")

  const updateHeroImages = async () => {
    setIsUpdating(true)
    setResult("")

    try {
      console.log("[v0] Calling update hero images API...")
      const response = await fetch("/api/update-hero-images", {
        method: "POST",
      })

      const data = await response.json()
      console.log("[v0] API response:", data)

      if (response.ok) {
        setResult(`✅ ${data.message}`)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Error calling API:", error)
      setResult(`❌ Network error: ${error}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Update Hero Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Click the button below to update all plumber records to use the correct hero image.</p>

          <Button onClick={updateHeroImages} disabled={isUpdating} className="w-full">
            {isUpdating ? "Updating..." : "Update All Hero Images"}
          </Button>

          {result && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-mono text-sm">{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
