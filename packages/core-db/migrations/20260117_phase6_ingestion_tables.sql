-- Migration: Phase 6 - Ingestion Plane Tables
-- Date: 2026-01-17
-- Purpose: Implement ingestion pipeline with audit trails and evidence tracking
-- Approach: Additive migration preserving existing contracts

-- ============================================================================
-- STEP 1: Create ingestion_runs table (audit trail for each ingestion execution)
-- ============================================================================

CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('seed', 'dataforseo_serp_maps', 'dataforseo_business_listings', 'google_places')),
  instance_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  params_json JSONB NOT NULL,
  stats_json JSONB,
  created_by TEXT NOT NULL,
  CONSTRAINT ingestion_runs_unique_run UNIQUE (source, instance_key, started_at)
);

-- Add comments for ingestion_runs table
COMMENT ON TABLE ingestion_runs IS 'Tracks each ingestion execution with metadata, status, and configuration';
COMMENT ON COLUMN ingestion_runs.source IS 'Source of the ingestion (seed, dataforseo_serp_maps, dataforseo_business_listings, google_places)';
COMMENT ON COLUMN ingestion_runs.instance_key IS 'Instance identifier (e.g., plumbers-perth)';
COMMENT ON COLUMN ingestion_runs.status IS 'Current status of the ingestion run';
COMMENT ON COLUMN ingestion_runs.params_json IS 'Configuration parameters used for this ingestion run';
COMMENT ON COLUMN ingestion_runs.stats_json IS 'Statistics about the ingestion results (counts, timing, etc.)';
COMMENT ON COLUMN ingestion_runs.created_by IS 'User or system that initiated this ingestion run';

-- ============================================================================
-- STEP 2: Create raw_leads table (immutable evidence storage)
-- ============================================================================

CREATE TABLE raw_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingestion_run_id UUID NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT,
  source_external_id TEXT,
  payload_json JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT raw_leads_unique_payload UNIQUE (source, payload_hash)
);

-- Add comments for raw_leads table
COMMENT ON TABLE raw_leads IS 'Stores raw lead data from external sources with complete audit trail';
COMMENT ON COLUMN raw_leads.source IS 'Source of this lead data';
COMMENT ON COLUMN raw_leads.source_url IS 'URL where this data was fetched from (if applicable)';
COMMENT ON COLUMN raw_leads.source_external_id IS 'External identifier (place ID, DataForSEO ID, etc.)';
COMMENT ON COLUMN raw_leads.payload_json IS 'Complete raw payload from the source API';
COMMENT ON COLUMN raw_leads.payload_hash IS 'Hash of the payload for deduplication';
COMMENT ON COLUMN raw_leads.fetched_at IS 'When this data was retrieved from the source';

-- ============================================================================
-- STEP 3: Create lead_evidence table (structured claims with confidence)
-- ============================================================================

CREATE TABLE lead_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_lead_id UUID NOT NULL REFERENCES raw_leads(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('name', 'phone', 'address', 'website', 'category', 'hours', 'rating', 'review_count', 'emergency_available')),
  claim_value TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  provenance TEXT NOT NULL,
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add comments for lead_evidence table
COMMENT ON TABLE lead_evidence IS 'Structured evidence claims extracted from raw leads with confidence scoring';
COMMENT ON COLUMN lead_evidence.claim_type IS 'Type of claim being made (name, phone, address, etc.)';
COMMENT ON COLUMN lead_evidence.claim_value IS 'The actual value of the claim';
COMMENT ON COLUMN lead_evidence.confidence IS 'Confidence score (0.0 - 1.0) in this claim';
COMMENT ON COLUMN lead_evidence.provenance IS 'Where this claim came from (API field, heuristic, etc.)';
COMMENT ON COLUMN lead_evidence.observed_at IS 'When this evidence was recorded';

-- ============================================================================
-- STEP 4: Create lead_matches table (deduplication and matching)
-- ============================================================================

CREATE TABLE lead_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_lead_id UUID NOT NULL REFERENCES raw_leads(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  match_score NUMERIC(5,4) NOT NULL,
  match_strategy TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_matches_unique_lead UNIQUE (raw_lead_id)
);

-- Add comments for lead_matches table
COMMENT ON TABLE lead_matches IS 'Maps raw leads to existing businesses with similarity scores';
COMMENT ON COLUMN lead_matches.business_id IS 'Existing business this lead matches (NULL if new business created)';
COMMENT ON COLUMN lead_matches.match_score IS 'Similarity score (0.0 - 1.0)';
COMMENT ON COLUMN lead_matches.match_strategy IS 'Strategy used for matching (external_id, domain, phone, name_suburb)';

-- ============================================================================
-- STEP 5: Create suggested_updates table (admin review queue)
-- ============================================================================

CREATE TABLE suggested_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  raw_lead_id UUID NOT NULL REFERENCES raw_leads(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Add comments for suggested_updates table
COMMENT ON TABLE suggested_updates IS 'Proposed updates to existing businesses for admin review';
COMMENT ON COLUMN suggested_updates.field_name IS 'Field that should be updated';
COMMENT ON COLUMN suggested_updates.current_value IS 'Current value in the database';
COMMENT ON COLUMN suggested_updates.suggested_value IS 'Value suggested by ingestion';
COMMENT ON COLUMN suggested_updates.confidence IS 'Confidence in this suggestion (0.0 - 1.0)';
COMMENT ON COLUMN suggested_updates.status IS 'Review status (pending, approved, rejected)';

-- ============================================================================
-- STEP 6: Add indexes for performance optimization
-- ============================================================================

-- Index for deduplication
CREATE INDEX idx_raw_leads_payload_hash ON raw_leads(payload_hash);

-- Index for external ID matching
CREATE INDEX idx_raw_leads_source_external_id ON raw_leads(source_external_id) WHERE source_external_id IS NOT NULL;

-- Index for business matching
CREATE INDEX idx_lead_matches_business_id ON lead_matches(business_id);

-- Index for ingestion run queries
CREATE INDEX idx_raw_leads_ingestion_run_id ON raw_leads(ingestion_run_id);

-- Index for evidence lookup
CREATE INDEX idx_lead_evidence_raw_lead_id ON lead_evidence(raw_lead_id);

-- ============================================================================
-- STEP 7: Add business_id column to raw_leads for direct linking (optional)
-- ============================================================================

ALTER TABLE raw_leads ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

-- Add comment for the new column
COMMENT ON COLUMN raw_leads.business_id IS 'Direct link to business record (populated after matching)';

-- Create index for the new column
CREATE INDEX idx_raw_leads_business_id ON raw_leads(business_id);

-- ============================================================================
-- STEP 8: Create ingestion views for monitoring and reporting
-- ============================================================================

-- View for ingestion statistics
CREATE OR REPLACE VIEW ingestion_statistics AS
SELECT
  ir.id AS ingestion_run_id,
  ir.source,
  ir.instance_key,
  ir.status,
  ir.started_at,
  ir.ended_at,
  ir.created_by,
  COUNT(DISTINCT rl.id) AS total_leads,
  COUNT(DISTINCT lm.id) FILTER (WHERE lm.business_id IS NOT NULL) AS matched_leads,
  COUNT(DISTINCT lm.id) FILTER (WHERE lm.business_id IS NULL) AS new_businesses,
  COUNT(DISTINCT su.id) AS suggested_updates,
  (ir.stats_json->>'duration_ms')::NUMERIC AS duration_ms,
  (ir.stats_json->>'leads_created')::NUMERIC AS leads_created,
  (ir.stats_json->>'leads_updated')::NUMERIC AS leads_updated,
  (ir.stats_json->>'leads_skipped')::NUMERIC AS leads_skipped
FROM ingestion_runs ir
LEFT JOIN raw_leads rl ON rl.ingestion_run_id = ir.id
LEFT JOIN lead_matches lm ON lm.raw_lead_id = rl.id
LEFT JOIN suggested_updates su ON su.raw_lead_id = rl.id
GROUP BY ir.id;

-- View for recent ingestion activity
CREATE OR REPLACE VIEW recent_ingestion_activity AS
SELECT
  ir.id AS ingestion_run_id,
  ir.source,
  ir.instance_key,
  ir.status,
  ir.started_at,
  ir.ended_at,
  ir.created_by,
  rl.id AS lead_id,
  rl.source AS lead_source,
  rl.fetched_at AS lead_fetched_at,
  lm.business_id,
  b.slug AS business_slug,
  b.trading_name AS business_name,
  b.status AS business_status
FROM ingestion_runs ir
JOIN raw_leads rl ON rl.ingestion_run_id = ir.id
LEFT JOIN lead_matches lm ON lm.raw_lead_id = rl.id
LEFT JOIN businesses b ON b.id = lm.business_id
WHERE ir.started_at > NOW() - INTERVAL '30 days'
ORDER BY ir.started_at DESC, rl.fetched_at DESC;

-- ============================================================================
-- STEP 9: Grant appropriate permissions
-- ============================================================================

-- Grant full access to service role for ingestion operations
GRANT ALL PRIVILEGES ON TABLE ingestion_runs TO service_role;
GRANT ALL PRIVILEGES ON TABLE raw_leads TO service_role;
GRANT ALL PRIVILEGES ON TABLE lead_evidence TO service_role;
GRANT ALL PRIVILEGES ON TABLE lead_matches TO service_role;
GRANT ALL PRIVILEGES ON TABLE suggested_updates TO service_role;

-- Grant read access to admin role for monitoring
GRANT SELECT ON TABLE ingestion_runs TO authenticated;
GRANT SELECT ON TABLE raw_leads TO authenticated;
GRANT SELECT ON TABLE lead_evidence TO authenticated;
GRANT SELECT ON TABLE lead_matches TO authenticated;
GRANT SELECT ON TABLE suggested_updates TO authenticated;

-- Grant read access to views
GRANT SELECT ON ingestion_statistics TO authenticated;
GRANT SELECT ON recent_ingestion_activity TO authenticated;

-- ============================================================================
-- STEP 10: Analysis and optimization
-- ============================================================================

ANALYZE ingestion_runs;
ANALYZE raw_leads;
ANALYZE lead_evidence;
ANALYZE lead_matches;
ANALYZE suggested_updates;
ANALYZE ingestion_statistics;
ANALYZE recent_ingestion_activity;
