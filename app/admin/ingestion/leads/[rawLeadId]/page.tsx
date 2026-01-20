import { requireAdmin } from '@/lib/admin/requireAdmin'
import {
  getRawLead,
  getLeadEvidence,
  getLeadMatches,
  getBusinessSummary,
} from '@/lib/admin/ingestion-data'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  params: Promise<{ rawLeadId: string }>
}

export default async function LeadDetailPage({ params }: PageProps) {
  // Require admin authorization
  await requireAdmin()

  const { rawLeadId } = await params

  // Fetch lead details, evidence, and matches
  const [lead, evidence, matches] = await Promise.all([
    getRawLead(rawLeadId),
    getLeadEvidence(rawLeadId),
    getLeadMatches(rawLeadId),
  ])

  if (!lead) {
    notFound()
  }

  // Fetch business summaries for matches
  const matchedBusinesses = await Promise.all(
    matches
      .filter((m) => m.businessId)
      .map((m) => getBusinessSummary(m.businessId!))
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Raw Lead Detail</h1>
        <Link href="/admin/ingestion/runs" className="text-blue-600 hover:underline">
          ← Back to Runs
        </Link>
      </div>

      {/* Lead Metadata Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Lead ID</dt>
              <dd className="mt-1 font-mono text-xs">{lead.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Source</dt>
              <dd className="mt-1">{lead.source}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">External ID</dt>
              <dd className="mt-1 font-mono text-xs">
                {lead.sourceExternalId || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Fetched At</dt>
              <dd className="mt-1">{new Date(lead.fetchedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Payload Hash</dt>
              <dd className="mt-1 font-mono text-xs">{lead.payloadHash}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Ingestion Run</dt>
              <dd className="mt-1">
                <Link
                  href={`/admin/ingestion/runs/${lead.ingestionRunId}`}
                  className="text-blue-600 hover:underline"
                >
                  View run
                </Link>
              </dd>
            </div>
          </dl>

          {lead.sourceUrl && (
            <div className="mt-4 pt-4 border-t">
              <dt className="font-medium text-gray-500 text-sm">Source URL</dt>
              <dd className="mt-1">
                <a
                  href={lead.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {lead.sourceUrl} ↗
                </a>
              </dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Payload Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Raw Payload (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-blue-600 hover:underline mb-2">
              Click to expand raw payload
            </summary>
            <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(lead.payload, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>

      {/* Evidence Claims */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Evidence Claims ({evidence.length})</h2>

        {evidence.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No evidence claims found for this lead</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {evidence.map((item) => (
              <Card key={item.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.claimType}</Badge>
                        <span className="text-sm font-medium">{item.claimValue}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Provenance: {item.provenance}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {Math.round(item.confidence * 100)}% confidence
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.observedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lead Matches */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Matches ({matches.length})</h2>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No matches found for this lead</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match, index) => {
              const business = matchedBusinesses[index]
              return (
                <Card key={match.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{match.matchStrategy}</Badge>
                          {business && (
                            <Link
                              href={`/plumber/${business.slug}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {business.tradingName || business.legalName}
                            </Link>
                          )}
                          {!business && match.businessId && (
                            <span className="text-gray-500 font-mono text-xs">
                              Business ID: {match.businessId}
                            </span>
                          )}
                          {!match.businessId && (
                            <span className="text-gray-500 italic">New business created</span>
                          )}
                        </div>
                        {business && (
                          <div className="mt-1 text-xs">
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
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Math.round(match.matchScore * 10000) / 100}% match
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(match.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
