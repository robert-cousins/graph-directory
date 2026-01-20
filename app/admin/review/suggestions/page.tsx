import { requireAdmin } from '@/lib/admin/requireAdmin'
import { listSuggestedUpdates, getBusinessSummary } from '@/lib/admin/ingestion-data'
import { rejectSuggestion, approveSuggestion } from '@/app/admin/review/actions'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function SuggestionsQueuePage() {
  // Require admin authorization
  await requireAdmin()

  // Fetch pending suggestions (most recent first)
  const suggestions = await listSuggestedUpdates({
    status: 'pending',
    limit: 100,
  })

  // Fetch business summaries for context
  const businessIds = [...new Set(suggestions.map((s) => s.businessId))]
  const businesses = await Promise.all(
    businessIds.map((id) => getBusinessSummary(id))
  )
  const businessMap = new Map(
    businesses.filter((b) => b !== null).map((b) => [b!.id, b!])
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Review Queue - Suggested Updates</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← Back to Admin
        </Link>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No pending suggestions found</p>
            <p className="text-sm text-gray-400 mt-2">
              All suggested updates have been reviewed
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const business = businessMap.get(suggestion.businessId)
            return (
              <Card key={suggestion.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Badge variant="outline">{suggestion.fieldName}</Badge>
                        {business && (
                          <Link
                            href={`/plumber/${business.slug}`}
                            className="text-blue-600 hover:underline"
                          >
                            {business.tradingName || business.legalName}
                          </Link>
                        )}
                        {!business && (
                          <span className="text-gray-400 text-sm">
                            Business not found
                          </span>
                        )}
                      </CardTitle>
                      {business && (
                        <p className="text-sm text-gray-500 mt-1">
                          Status:{' '}
                          <Badge
                            variant={
                              business.status === 'published'
                                ? 'default'
                                : business.status === 'draft'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {business.status}
                          </Badge>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(suggestion.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Current Value
                      </p>
                      <p className="text-sm bg-red-50 border border-red-200 p-2 rounded">
                        {suggestion.currentValue || (
                          <span className="italic text-gray-400">None</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Suggested Value
                      </p>
                      <p className="text-sm bg-green-50 border border-green-200 p-2 rounded">
                        {suggestion.suggestedValue}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex gap-2 text-xs">
                      <Link
                        href={`/admin/ingestion/leads/${suggestion.rawLeadId}`}
                        className="text-blue-600 hover:underline"
                      >
                        View lead evidence →
                      </Link>
                      {business && (
                        <Link
                          href={`/plumber/${business.slug}`}
                          className="text-blue-600 hover:underline"
                        >
                          View business →
                        </Link>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <form action={rejectSuggestion} className="inline">
                        <input type="hidden" name="suggestionId" value={suggestion.id} />
                        <Button size="sm" variant="outline" type="submit">
                          Reject
                        </Button>
                      </form>
                      <form action={approveSuggestion} className="inline">
                        <input type="hidden" name="suggestionId" value={suggestion.id} />
                        <Button size="sm" type="submit">
                          Approve
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
          <p className="text-sm text-gray-600">
            <strong>Total pending suggestions:</strong> {suggestions.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Suggestions are ordered by most recent first. Only pending suggestions are
            shown.
          </p>
        </div>
      )}
    </div>
  )
}
