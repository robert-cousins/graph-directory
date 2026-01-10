"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestAddPlumbersPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const addPlumbers = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("[v0] Calling add-plumbers API...")
      const response = await fetch("/api/add-plumbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      console.log("[v0] API response:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to add plumbers")
      }

      setResult(data)
    } catch (err) {
      console.error("[v0] Error adding plumbers:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const checkPlumberCount = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Checking plumber count...")
      const response = await fetch("/api/check-database")
      const data = await response.json()
      console.log("[v0] Current plumber count:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to check database")
      }

      setResult(data)
    } catch (err) {
      console.error("[v0] Error checking database:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Test Add Plumbers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={addPlumbers} disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add 10 Plumbers"}
            </Button>
            <Button onClick={checkPlumberCount} disabled={loading} variant="outline" className="flex-1 bg-transparent">
              {loading ? "Checking..." : "Check Count"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-semibold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800">Result:</h3>
              <pre className="text-sm text-green-700 mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
