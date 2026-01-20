/**
 * Admin Ingestion Data Access Layer
 * Server-side only - uses service role client for all queries
 *
 * All functions in this module require admin authorization.
 * Always call requireAdmin() before using these functions.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type {
  IngestionRun,
  IngestionStatus,
  IngestionSource,
  RawLead,
  LeadEvidence,
  LeadMatch,
  SuggestedUpdate,
  UpdateStatus,
} from '@/packages/core-ingestion/src/types'

// ============================================================================
// Ingestion Runs
// ============================================================================

export interface IngestionRunFilters {
  source?: IngestionSource
  instanceKey?: string
  status?: IngestionStatus
  limit?: number
}

/**
 * List ingestion runs with optional filters
 * Most recent runs first
 */
export async function listIngestionRuns(
  filters?: IngestionRunFilters
): Promise<IngestionRun[]> {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(filters?.limit ?? 50)

  if (filters?.source) {
    query = query.eq('source', filters.source)
  }
  if (filters?.instanceKey) {
    query = query.eq('instance_key', filters.instanceKey)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Ingestion Data] Error listing runs:', error)
    throw new Error(`Failed to list ingestion runs: ${error.message}`)
  }

  return (data ?? []).map(transformIngestionRunRow)
}

/**
 * Get a single ingestion run by ID
 */
export async function getIngestionRun(runId: string): Promise<IngestionRun | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[Ingestion Data] Error getting run:', error)
    throw new Error(`Failed to get ingestion run: ${error.message}`)
  }

  return data ? transformIngestionRunRow(data) : null
}

// ============================================================================
// Raw Leads
// ============================================================================

/**
 * List raw leads for a specific ingestion run
 */
export async function listRawLeadsForRun(runId: string): Promise<RawLead[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('raw_leads')
    .select('*')
    .eq('ingestion_run_id', runId)
    .order('fetched_at', { ascending: false })

  if (error) {
    console.error('[Ingestion Data] Error listing raw leads:', error)
    throw new Error(`Failed to list raw leads: ${error.message}`)
  }

  return (data ?? []).map(transformRawLeadRow)
}

/**
 * Get a single raw lead by ID
 */
export async function getRawLead(leadId: string): Promise<RawLead | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('raw_leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[Ingestion Data] Error getting raw lead:', error)
    throw new Error(`Failed to get raw lead: ${error.message}`)
  }

  return data ? transformRawLeadRow(data) : null
}

// ============================================================================
// Lead Evidence
// ============================================================================

/**
 * Get evidence claims for a raw lead
 */
export async function getLeadEvidence(leadId: string): Promise<LeadEvidence[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('lead_evidence')
    .select('*')
    .eq('raw_lead_id', leadId)
    .order('observed_at', { ascending: false })

  if (error) {
    console.error('[Ingestion Data] Error getting evidence:', error)
    throw new Error(`Failed to get lead evidence: ${error.message}`)
  }

  return (data ?? []).map(transformLeadEvidenceRow)
}

// ============================================================================
// Lead Matches
// ============================================================================

/**
 * Get match information for a raw lead
 */
export async function getLeadMatches(leadId: string): Promise<LeadMatch[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('lead_matches')
    .select('*')
    .eq('raw_lead_id', leadId)
    .order('match_score', { ascending: false })

  if (error) {
    console.error('[Ingestion Data] Error getting matches:', error)
    throw new Error(`Failed to get lead matches: ${error.message}`)
  }

  return (data ?? []).map(transformLeadMatchRow)
}

// ============================================================================
// Suggested Updates
// ============================================================================

export interface SuggestedUpdateFilters {
  status?: UpdateStatus
  businessId?: string
  rawLeadId?: string
  fieldName?: string
  minConfidence?: number
  limit?: number
}

/**
 * List suggested updates with optional filters
 * Most recent first
 */
export async function listSuggestedUpdates(
  filters?: SuggestedUpdateFilters
): Promise<SuggestedUpdate[]> {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from('suggested_updates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.businessId) {
    query = query.eq('business_id', filters.businessId)
  }
  if (filters?.rawLeadId) {
    query = query.eq('raw_lead_id', filters.rawLeadId)
  }
  if (filters?.fieldName) {
    query = query.eq('field_name', filters.fieldName)
  }
  if (filters?.minConfidence !== undefined) {
    query = query.gte('confidence', filters.minConfidence)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Ingestion Data] Error listing suggested updates:', error)
    throw new Error(`Failed to list suggested updates: ${error.message}`)
  }

  return (data ?? []).map(transformSuggestedUpdateRow)
}

/**
 * Get a single suggested update by ID
 */
export async function getSuggestedUpdate(id: string): Promise<SuggestedUpdate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('suggested_updates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[Ingestion Data] Error getting suggested update:', error)
    throw new Error(`Failed to get suggested update: ${error.message}`)
  }

  return data ? transformSuggestedUpdateRow(data) : null
}

// ============================================================================
// Business Lookup (for context in admin UI)
// ============================================================================

export interface BusinessSummary {
  id: string
  slug: string
  tradingName: string
  legalName: string
  status: string
}

/**
 * Get basic business info by ID (for linking in admin UI)
 */
export async function getBusinessSummary(businessId: string): Promise<BusinessSummary | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('businesses')
    .select('id, slug, trading_name, legal_name, status')
    .eq('id', businessId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[Ingestion Data] Error getting business:', error)
    throw new Error(`Failed to get business: ${error.message}`)
  }

  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    tradingName: data.trading_name,
    legalName: data.legal_name,
    status: data.status,
  }
}

// ============================================================================
// Data Transformation Functions (snake_case → camelCase)
// ============================================================================

function transformIngestionRunRow(row: any): IngestionRun {
  return {
    id: row.id,
    source: row.source,
    instanceKey: row.instance_key,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    params: row.params_json ?? {},
    stats: row.stats_json,
    createdBy: row.created_by,
  }
}

function transformRawLeadRow(row: any): RawLead {
  return {
    id: row.id,
    ingestionRunId: row.ingestion_run_id,
    source: row.source,
    sourceUrl: row.source_url,
    sourceExternalId: row.source_external_id,
    payload: row.payload_json,
    payloadHash: row.payload_hash,
    fetchedAt: row.fetched_at,
    businessId: row.business_id,
  }
}

function transformLeadEvidenceRow(row: any): LeadEvidence {
  return {
    id: row.id,
    rawLeadId: row.raw_lead_id,
    claimType: row.claim_type,
    claimValue: row.claim_value,
    confidence: parseFloat(row.confidence),
    provenance: row.provenance,
    observedAt: row.observed_at,
  }
}

function transformLeadMatchRow(row: any): LeadMatch {
  return {
    id: row.id,
    rawLeadId: row.raw_lead_id,
    businessId: row.business_id,
    matchScore: parseFloat(row.match_score),
    matchStrategy: row.match_strategy,
    createdAt: row.created_at,
  }
}

function transformSuggestedUpdateRow(row: any): SuggestedUpdate {
  return {
    id: row.id,
    businessId: row.business_id,
    rawLeadId: row.raw_lead_id,
    fieldName: row.field_name,
    currentValue: row.current_value,
    suggestedValue: row.suggested_value,
    confidence: parseFloat(row.confidence),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    status: row.status,
  }
}
