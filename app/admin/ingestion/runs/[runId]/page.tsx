import { requireAdmin } from '@/lib/admin/requireAdmin'
import { getIngestionRun, listRawLeadsForRun } from '@/lib/admin/ingestion-data'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  params: Promise<{ runId: string }>
}

export default async function IngestionRunDetailPage({ params }: PageProps) {
  // Require admin authorization
  await requireAdmin()

  const { runId } = await params

  // Fetch run details and leads
  const [run, leads] = await Promise.all([
    getIngestionRun(runId),
    listRawLeadsForRun(runId),
  ])

  if (!run) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ingestion Run Detail</h1>
        <Link href="/admin/ingestion/runs" className="text-blue-600 hover:underline">
          ← Back to Runs
        </Link>
      </div>

      {/* Run Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Run Information</CardTitle>
            <Badge
              variant={
                run.status === 'completed'
                  ? 'default'
                  : run.status === 'failed'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {run.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Run ID</dt>
              <dd className="mt-1 font-mono text-xs">{run.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Source</dt>
              <dd className="mt-1">{run.source}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Instance Key</dt>
              <dd className="mt-1">{run.instanceKey}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Created By</dt>
              <dd className="mt-1">{run.createdBy}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Started At</dt>
              <dd className="mt-1">{new Date(run.startedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Ended At</dt>
              <dd className="mt-1">
                {run.endedAt ? new Date(run.endedAt).toLocaleString() : 'Still running...'}
              </dd>
            </div>
          </dl>

          {run.stats && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-sm mb-3">Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(run.stats).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-semibold">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(run.params).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-sm mb-3">Parameters</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(run.params, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Leads List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Raw Leads ({leads.length})</h2>

        {leads.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No raw leads found for this run</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/admin/ingestion/leads/${lead.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {lead.source} - {lead.sourceExternalId || 'No external ID'}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Lead ID: {lead.id}
                      </p>
                      {lead.sourceUrl && (
                        <a
                          href={lead.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                        >
                          View source ↗
                        </a>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500">Fetched</p>
                      <p className="text-gray-700">
                        {new Date(lead.fetchedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Preview of payload if it has a name field */}
                  {lead.payload?.name && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Name:</span> {lead.payload.name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
