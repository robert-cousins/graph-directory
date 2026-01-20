'use server'

/**
 * Server Actions for Admin Review Queue
 * All actions require admin authorization and use service role client
 */

import { requireAdmin } from '@/lib/admin/requireAdmin'
import { getSuggestedUpdate } from '@/lib/admin/ingestion-data'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { revalidatePath } from 'next/cache'

// Field allowlist for applying suggestions (tight v1 list)
const ALLOWED_FIELDS = new Set([
  'phone',
  'email',
  'website',
  'street_address',
  'description',
])

/**
 * Reject a suggested update
 * Marks the suggestion as rejected with audit trail
 */
export async function rejectSuggestion(formData: FormData): Promise<void> {
  const suggestionId = formData.get('suggestionId') as string

  // Require admin authorization
  const admin = await requireAdmin()

  // Verify suggestion exists
  const suggestion = await getSuggestedUpdate(suggestionId)
  if (!suggestion) {
    throw new Error('Suggestion not found')
  }

  // Check if already reviewed
  if (suggestion.status !== 'pending') {
    throw new Error(`Suggestion is already ${suggestion.status}`)
  }

  // Update suggestion to rejected
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('suggested_updates')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq('id', suggestionId)

  if (error) {
    console.error('[Admin Action] Error rejecting suggestion:', error)
    throw new Error(`Failed to reject suggestion: ${error.message}`)
  }

  // Revalidate review queue page
  revalidatePath('/admin/review/suggestions')
}

/**
 * Approve a suggested update
 * Applies the update to the business record (draft-only) with field allowlist
 */
export async function approveSuggestion(formData: FormData): Promise<void> {
  const suggestionId = formData.get('suggestionId') as string

  // Require admin authorization
  const admin = await requireAdmin()

  // Verify suggestion exists
  const suggestion = await getSuggestedUpdate(suggestionId)
  if (!suggestion) {
    throw new Error('Suggestion not found')
  }

  // Check if already reviewed
  if (suggestion.status !== 'pending') {
    throw new Error(`Suggestion is already ${suggestion.status}`)
  }

  // Verify field is in allowlist
  if (!ALLOWED_FIELDS.has(suggestion.fieldName)) {
    console.warn(
      `[Admin Action] Attempted to approve suggestion for disallowed field: ${suggestion.fieldName}`
    )
    throw new Error(`Field "${suggestion.fieldName}" is not in the allowed update list`)
  }

  // Fetch the target business
  const supabase = createServiceRoleClient()
  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('id, slug, status')
    .eq('id', suggestion.businessId)
    .single()

  if (fetchError || !business) {
    console.error('[Admin Action] Error fetching business:', fetchError)
    throw new Error('Target business not found')
  }

  // SAFETY CHECK: Only apply to draft businesses
  if (business.status !== 'draft') {
    console.warn(
      `[Admin Action] Attempted to approve suggestion for non-draft business (${business.status}): ${business.id}`
    )

    // Mark as rejected instead, with note explaining why
    const { error: rejectError } = await supabase
      .from('suggested_updates')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq('id', suggestionId)

    if (rejectError) {
      console.error('[Admin Action] Error auto-rejecting suggestion:', rejectError)
    }

    revalidatePath('/admin/review/suggestions')
    throw new Error(`Cannot apply update to ${business.status} business. Suggestion auto-rejected.`)
  }

  // Apply the update to the business
  const { error: updateError } = await supabase
    .from('businesses')
    .update({
      [suggestion.fieldName]: suggestion.suggestedValue,
    })
    .eq('id', business.id)

  if (updateError) {
    console.error('[Admin Action] Error updating business:', updateError)
    throw new Error(`Failed to apply update to business: ${updateError.message}`)
  }

  // Mark suggestion as approved with audit trail
  const { error: approveError } = await supabase
    .from('suggested_updates')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq('id', suggestionId)

  if (approveError) {
    console.error('[Admin Action] Error marking suggestion as approved:', approveError)
    // Business was updated, but audit trail failed - log but don't fail
  }

  // Revalidate pages
  revalidatePath('/admin/review/suggestions')
  revalidatePath(`/plumber/${business.slug}`)
}
