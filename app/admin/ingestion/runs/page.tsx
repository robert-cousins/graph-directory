import { requireAdmin } from '@/lib/admin/requireAdmin'
import { listIngestionRuns } from '@/lib/admin/ingestion-data'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function IngestionRunsPage() {
  // Require admin authorization
  await requireAdmin()

  // Fetch ingestion runs
  const runs = await listIngestionRuns()

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ingestion Runs</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← Back to Admin
        </Link>
      </div>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No ingestion runs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <Card key={run.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    <Link
                      href={`/admin/ingestion/runs/${run.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {run.source} - {run.instanceKey}
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Run ID: {run.id}
                  </p>
                </div>
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
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Started</p>
                    <p className="text-gray-600">
                      {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Ended</p>
                    <p className="text-gray-600">
                      {run.endedAt ? new Date(run.endedAt).toLocaleString() : 'Running...'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Created By</p>
                    <p className="text-gray-600">{run.createdBy}</p>
                  </div>
                </div>

                {run.stats && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-medium text-sm mb-2">Statistics</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {Object.entries(run.stats).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-gray-500">{key.replace(/_/g, ' ')}</p>
                          <p className="font-medium">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
