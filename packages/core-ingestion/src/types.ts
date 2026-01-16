/**
 * Core Ingestion Types
 * Type definitions for the ingestion pipeline
 */

import { z } from 'zod';

// ============================================================================
// Ingestion Run Types
// ============================================================================

export type IngestionSource = 'seed' | 'dataforseo_serp_maps' | 'dataforseo_business_listings' | 'google_places';
export type IngestionStatus = 'running' | 'completed' | 'failed';

export interface IngestionRun {
  id: string;
  source: IngestionSource;
  instanceKey: string;
  status: IngestionStatus;
  startedAt: string;
  endedAt: string | null;
  params: Record<string, any>;
  stats?: Record<string, any>;
  createdBy: string;
}

// ============================================================================
// Raw Lead Types
// ============================================================================

export interface RawLead {
  id: string;
  ingestionRunId: string;
  source: string;
  sourceUrl: string | null;
  sourceExternalId: string | null;
  payload: any;
  payloadHash: string;
  fetchedAt: string;
  businessId: string | null;
}

// ============================================================================
// Lead Evidence Types
// ============================================================================

export type ClaimType =
  | 'name'
  | 'phone'
  | 'address'
  | 'website'
  | 'category'
  | 'hours'
  | 'rating'
  | 'review_count'
  | 'emergency_available';

export interface LeadEvidence {
  id: string;
  rawLeadId: string;
  claimType: ClaimType;
  claimValue: string;
  confidence: number;
  provenance: string;
  observedAt: string;
}

// ============================================================================
// Normalized Lead Types
// ============================================================================

export interface NormalizedLead {
  source: IngestionSource;
  sourceUrl: string | null;
  sourceExternalId: string | null;
  rawPayload: any;
  payloadHash: string;
  fetchedAt: string;

  // Normalized business data
  name: string;
  legalName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  description?: string;
  services?: string[];
  serviceAreas?: string[];
  businessHours?: Record<string, string>;
  yearsExperience?: number;
  emergencyAvailable?: boolean;
  rating?: number;
  reviewCount?: number;

  // Evidence trail
  evidence: Array<{
    type: ClaimType;
    value: string;
    confidence: number;
    provenance: string;
    observedAt: string;
  }>;
}

// ============================================================================
// Matching and Deduplication Types
// ============================================================================

export type MatchStrategy = 'external_id' | 'domain' | 'phone' | 'name_suburb' | 'new_creation';

export interface LeadMatch {
  id: string;
  rawLeadId: string;
  businessId: string | null;
  matchScore: number;
  matchStrategy: MatchStrategy;
  createdAt: string;
}

// ============================================================================
// Suggested Updates Types
// ============================================================================

export type UpdateStatus = 'pending' | 'approved' | 'rejected';

export interface SuggestedUpdate {
  id: string;
  businessId: string;
  rawLeadId: string;
  fieldName: string;
  currentValue: string | null;
  suggestedValue: string;
  confidence: number;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  status: UpdateStatus;
}

// ============================================================================
// Ingestion Result Types
// ============================================================================

export type IngestionAction = 'created' | 'updated_draft' | 'suggested_updates' | 'skipped_published';

export interface IngestionResult {
  success: boolean;
  action: IngestionAction;
  businessId: string | null;
  lifecycleState: string;
  rawLeadId: string;
  suggestionsCount?: number;
  error?: string;
}

// ============================================================================
// DataForSEO API Types
// ============================================================================

export interface DataForSEOTaskResponse {
  id: string;
  status: string;
  result_count: number;
  result?: Array<{
    type: string;
    id: string;
    title: string;
    address: string;
    phone: string;
    website: string;
    rating: number;
    reviews_count: number;
    hours: string;
    categories: string[];
    latitude: number;
    longitude: number;
    [key: string]: any;
  }>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface IngestionConfig {
  dryRun?: boolean;
  batchSize?: number;
  rateLimit?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const NormalizedLeadSchema = z.object({
  source: z.enum(['seed', 'dataforseo_serp_maps', 'dataforseo_business_listings', 'google_places']),
  sourceUrl: z.string().nullable(),
  sourceExternalId: z.string().nullable(),
  rawPayload: z.any(),
  payloadHash: z.string(),
  fetchedAt: z.string(),

  name: z.string().min(1),
  legalName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  services: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).optional(),
  businessHours: z.record(z.string(), z.string()).optional(),
  yearsExperience: z.number().int().min(0).optional(),
  emergencyAvailable: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),

  evidence: z.array(z.object({
    type: z.enum(['name', 'phone', 'address', 'website', 'category', 'hours', 'rating', 'review_count', 'emergency_available']),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    provenance: z.string(),
    observedAt: z.string()
  }))
});

export type ValidatedNormalizedLead = z.infer<typeof NormalizedLeadSchema>;
