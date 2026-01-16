/**
 * Core Ingestion Service - Apply Lead
 * Main ingestion pipeline that creates/updates businesses from leads
 * Uses lazy initialization and follows safe lifecycle patterns
 */

import { getIngestionServiceRoleClient } from './service-role';
import { createBusinessSubmission, updateBusinessWithToken } from '@graph-directory/core-mutators';
import { NormalizedLead, IngestionResult, LeadMatch, MatchStrategy } from './types';
import { getBusinessForAdminReview } from '@graph-directory/core-data';
import crypto from 'crypto';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate payload hash for deduplication
 */
function generatePayloadHash(payload: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Normalize phone number for matching
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters and normalize international format
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.startsWith('61')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith('0')) {
    return `+61${digitsOnly.substring(1)}`;
  }
  return `+${digitsOnly}`;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.split('/')[0] || '';
  }
}

// ============================================================================
// Deduplication - MVP Strategy (Deterministic)
// ============================================================================

async function findMatchingBusiness(lead: NormalizedLead): Promise<{businessId: string | null, matchStrategy: MatchStrategy, confidence: number}> {
  const supabase = getIngestionServiceRoleClient();

  // 1. External ID match (highest confidence)
  if (lead.sourceExternalId) {
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('external_place_id', lead.sourceExternalId)
      .maybeSingle();

    if (data) return { businessId: data.id, matchStrategy: 'external_id', confidence: 1.0 };
  }

  // 2. Website domain exact match
  if (lead.website) {
    const domain = extractDomain(lead.website);
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('website_domain', domain)
      .maybeSingle();

    if (data) return { businessId: data.id, matchStrategy: 'domain', confidence: 0.95 };
  }

  // 3. Phone exact match (normalized)
  if (lead.phone) {
    const normalizedPhone = normalizePhone(lead.phone);
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('normalized_phone', normalizedPhone)
      .maybeSingle();

    if (data) return { businessId: data.id, matchStrategy: 'phone', confidence: 0.9 };
  }

  // 4. Name + suburb fallback (low confidence - requires review)
  if (lead.name && lead.suburb) {
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .textSearch('search_vector', `${lead.name} ${lead.suburb}`)
      .limit(1)
      .maybeSingle();

    if (data) return { businessId: data.id, matchStrategy: 'name_suburb', confidence: 0.6 };
  }

  return { businessId: null, matchStrategy: 'none', confidence: 0 };
}

// ============================================================================
// Main Ingestion Function
// ============================================================================

export async function applyLead(lead: NormalizedLead, ingestionRunId: string): Promise<IngestionResult> {
  const supabase = getIngestionServiceRoleClient();

  try {
    // 1. Find existing business match
    const { businessId, matchStrategy, confidence } = await findMatchingBusiness(lead);

    // 2. Create raw lead record (audit trail)
    const { data: rawLead, error: rawLeadError } = await supabase
      .from('raw_leads')
      .insert({
        ingestion_run_id: ingestionRunId,
        source: lead.source,
        source_url: lead.sourceUrl,
        source_external_id: lead.sourceExternalId,
        payload_json: lead.rawPayload,
        payload_hash: lead.payloadHash,
        fetched_at: lead.fetchedAt
      })
      .select()
      .single();

    if (rawLeadError) {
      throw new Error(`Failed to create raw lead: ${rawLeadError.message}`);
    }

    // 3. Record evidence claims
    const evidenceRecords = lead.evidence.map(evidence => ({
      raw_lead_id: rawLead.id,
      claim_type: evidence.type,
      claim_value: evidence.value,
      confidence: evidence.confidence,
      provenance: evidence.provenance,
      observed_at: evidence.observedAt
    }));

    const { error: evidenceError } = await supabase
      .from('lead_evidence')
      .insert(evidenceRecords);

    if (evidenceError) {
      throw new Error(`Failed to create evidence: ${evidenceError.message}`);
    }

    // 4. Create new business if no match found
    if (!businessId) {
      const businessInput = {
        trading_name: lead.name,
        phone: lead.phone || '',
        email: lead.email || null,
        license_number: 'INGESTION_PLACEHOLDER', // Will be flagged for review
        services: lead.services || ['general-plumbing'],
        service_areas: lead.serviceAreas || ['perth'],
        legal_name: lead.legalName || lead.name,
        description: lead.description || null,
        website: lead.website || null,
        street_address: lead.address || null,
        years_experience: lead.yearsExperience || null,
        emergency_available: lead.emergencyAvailable || false,
        raw_business_hours: lead.businessHours || null
      };

      const result = await createBusinessSubmission(businessInput, {
        rateLimitKey: 'ingestion' // Special key for ingestion operations
      });

      if (!result.success) {
        throw new Error(`Business creation failed: ${result.error}`);
      }

      // Record the match
      await supabase.from('lead_matches').insert({
        raw_lead_id: rawLead.id,
        business_id: result.businessId, // This would need to be returned or fetched
        match_score: 1.0,
        match_strategy: 'new_creation'
      });

      return {
        success: true,
        action: 'created',
        businessId: result.businessId,
        lifecycleState: 'draft',
        rawLeadId: rawLead.id
      };
    }

    // 5. For existing businesses: record suggestions only (no direct updates)
    if (businessId && confidence < 0.95) {
      // Record suggested updates for admin review
      const suggestions = [];

      // Compare each field and record differences
      const currentBusiness = await getBusinessForAdminReview(businessId);
      if (!currentBusiness) {
        throw new Error('Business not found');
      }

      // Example: Phone update suggestion
      if (lead.phone && currentBusiness.phone !== lead.phone) {
        suggestions.push({
          field_name: 'phone',
          current_value: currentBusiness.phone,
          suggested_value: lead.phone,
          confidence: 0.85
        });
      }

      // Record suggestions
      if (suggestions.length > 0) {
        await supabase.from('suggested_updates').insert(
          suggestions.map(s => ({
            business_id: businessId,
            raw_lead_id: rawLead.id,
            ...s
          }))
        );
      }

      // Record the match
      await supabase.from('lead_matches').insert({
        raw_lead_id: rawLead.id,
        business_id: businessId,
        match_score: confidence,
        match_strategy: matchStrategy
      });

      return {
        success: true,
        action: 'suggested_updates',
        businessId,
        lifecycleState: currentBusiness.status,
        rawLeadId: rawLead.id,
        suggestionsCount: suggestions.length
      };
    }

    // 6. For high-confidence matches: update draft fields only
    if (businessId && confidence >= 0.95) {
      // Only update if business is in draft state
      const currentBusiness = await getBusinessForAdminReview(businessId);
      if (currentBusiness?.status !== 'draft') {
        // Record the match but don't update
        await supabase.from('lead_matches').insert({
          raw_lead_id: rawLead.id,
          business_id: businessId,
          match_score: confidence,
          match_strategy: matchStrategy
        });

        return {
          success: true,
          action: 'skipped_published',
          businessId,
          lifecycleState: currentBusiness?.status || 'unknown',
          rawLeadId: rawLead.id
        };
      }

      // Update only specific fields that are safe to auto-update
      const updateInput = {
        website: lead.website || undefined,
        street_address: lead.address || undefined,
        raw_business_hours: lead.businessHours || undefined
      };

      const updateResult = await updateBusinessWithToken(
        currentBusiness.slug,
        'INGESTION_TOKEN', // Special token for ingestion
        updateInput,
        { rateLimitKey: 'ingestion' }
      );

      if (!updateResult.success) {
        throw new Error(`Business update failed: ${updateResult.error}`);
      }

      // Record the match
      await supabase.from('lead_matches').insert({
        raw_lead_id: rawLead.id,
        business_id: businessId,
        match_score: confidence,
        match_strategy: matchStrategy
      });

      return {
        success: true,
        action: 'updated_draft',
        businessId,
        lifecycleState: 'draft',
        rawLeadId: rawLead.id
      };
    }

    // Fallback - should not reach here
    return {
      success: false,
      action: 'skipped_published',
      businessId: null,
      lifecycleState: 'unknown',
      rawLeadId: rawLead.id,
      error: 'No matching ingestion strategy found'
    };

  } catch (error) {
    console.error('Ingestion error:', error);
    return {
      success: false,
      action: 'skipped_published',
      businessId: null,
      lifecycleState: 'unknown',
      rawLeadId: '',
      error: error instanceof Error ? error.message : 'Unknown ingestion error'
    };
  }
}

// ============================================================================
// Ingestion Run Management
// ============================================================================

export async function createIngestionRun(
  source: string,
  instanceKey: string,
  params: Record<string, any>,
  createdBy: string
): Promise<string> {
  const supabase = getIngestionServiceRoleClient();

  const { data, error } = await supabase
    .from('ingestion_runs')
    .insert({
      source,
      instance_key: instanceKey,
      status: 'running',
      params_json: params,
      created_by: createdBy
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create ingestion run: ${error.message}`);
  }

  return data.id;
}

export async function completeIngestionRun(
  runId: string,
  stats: Record<string, any>
): Promise<void> {
  const supabase = getIngestionServiceRoleClient();

  const { error } = await supabase
    .from('ingestion_runs')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      stats_json: stats
    })
    .eq('id', runId);

  if (error) {
    throw new Error(`Failed to complete ingestion run: ${error.message}`);
  }
}

export async function failIngestionRun(
  runId: string,
  errorMessage: string
): Promise<void> {
  const supabase = getIngestionServiceRoleClient();

  const { error } = await supabase
    .from('ingestion_runs')
    .update({
      status: 'failed',
      ended_at: new Date().toISOString(),
      stats_json: { error: errorMessage }
    })
    .eq('id', runId);

  if (error) {
    throw new Error(`Failed to mark ingestion run as failed: ${error.message}`);
  }
}
