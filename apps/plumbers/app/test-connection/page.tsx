"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAllPlumbers } from "@/lib/plumber-service"
import type { Plumber } from "@/types/plumber"

export default function TestConnectionPage() {
  const [plumbers, setPlumbers] = useState<Plumber[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("Not tested")

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setConnectionStatus("Testing...")

    try {
      console.log("[v0] Testing Supabase connection...")
      const fetchedPlumbers = await getAllPlumbers()
      console.log("[v0] Connection test successful, fetched plumbers:", fetchedPlumbers.length)

      setPlumbers(fetchedPlumbers)
      setConnectionStatus(`✅ Connected - Found ${fetchedPlumbers.length} plumbers`)
    } catch (err) {
      console.error("[v0] Connection test failed:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setConnectionStatus("❌ Connection failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Supabase Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connection Status:</p>
              <p className="font-semibold">{connectionStatus}</p>
            </div>
            <Button onClick={testConnection} disabled={loading}>
              {loading ? "Testing..." : "Test Connection"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {plumbers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Database Records ({plumbers.length} total)</h3>
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {plumbers.map((plumber) => (
                  <div key={plumber.id} className="p-3 border rounded-md bg-gray-50">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <strong>ID:</strong> {plumber.id}
                      </div>
                      <div>
                        <strong>Business:</strong> {plumber.businessName}
                      </div>
                      <div>
                        <strong>Slug:</strong> {plumber.slug}
                      </div>
                      <div>
                        <strong>Suburb:</strong> {plumber.suburb}
                      </div>
                      <div>
                        <strong>Phone:</strong> {plumber.phone}
                      </div>
                      <div>
                        <strong>Hero Image:</strong> {plumber.heroImage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
