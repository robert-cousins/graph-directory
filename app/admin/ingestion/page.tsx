import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/requireAdmin'

export default async function IngestionPage() {
  // Require admin authorization
  await requireAdmin()

  // Redirect to runs overview
  redirect('/admin/ingestion/runs')
}
