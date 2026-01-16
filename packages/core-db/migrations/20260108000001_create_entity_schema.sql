-- Migration: Create entity-based schema for graph-first directory
-- Date: 2026-01-08
-- Purpose: Introduce normalized tables for businesses, services, and service areas
-- Note: Legacy plumbers table remains untouched for safe migration

-- ============================================================================
-- CORE ENTITY: businesses
-- ============================================================================
-- Replaces the denormalized plumbers table with a verified entity model
-- Status-driven workflow enables draft → review → publish gates
-- Owner tracking prepared for future authentication (nullable for v1)

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Business identity
  legal_name VARCHAR(255) NOT NULL,
  trading_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Contact details
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  website VARCHAR(255),

  -- Location
  street_address TEXT,
  postal_code VARCHAR(10),

  -- Publishing workflow
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'suspended')),

  -- Ownership (nullable in v1, FK to auth.users in future)
  owner_user_id UUID,

  -- Verification tracking
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by_user_id UUID,
  published_at TIMESTAMP WITH TIME ZONE,

  -- Metadata (migrate from legacy, eventual removal)
  rating DECIMAL(3,2) DEFAULT 0.0
    CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0
    CHECK (review_count >= 0),
  years_experience INTEGER
    CHECK (years_experience >= 0),
  hero_image TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.businesses IS 'Core business entities with status-driven publish workflow';
COMMENT ON COLUMN public.businesses.status IS 'draft: owner editing | pending_review: submitted for verification | published: live | suspended: hidden';
COMMENT ON COLUMN public.businesses.verified_at IS 'When credentials were verified (manual admin approval in v1)';
COMMENT ON COLUMN public.businesses.rating IS 'Temporary: migrated from legacy, will move to reviews table';

-- Indexes for businesses
CREATE INDEX idx_businesses_slug ON public.businesses(slug);
CREATE INDEX idx_businesses_status ON public.businesses(status);
CREATE INDEX idx_businesses_status_published ON public.businesses(status) WHERE status = 'published';
CREATE INDEX idx_businesses_rating ON public.businesses(rating DESC) WHERE status = 'published';
CREATE INDEX idx_businesses_created_at ON public.businesses(created_at DESC);

-- ============================================================================
-- NORMALIZED CATALOG: service_types
-- ============================================================================
-- Replaces free-text TEXT[] array with normalized service catalog
-- Enables consistent filtering, taxonomy management, SEO-friendly service pages

CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  -- Display order for UI
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.service_types IS 'Normalized catalog of plumbing services (replaces TEXT[] array)';
COMMENT ON COLUMN public.service_types.category IS 'Optional grouping: emergency, installation, maintenance, repair';

CREATE INDEX idx_service_types_slug ON public.service_types(slug);
CREATE INDEX idx_service_types_category ON public.service_types(category);

-- ============================================================================
-- GEOGRAPHIC HIERARCHY: service_areas
-- ============================================================================
-- Hierarchical model supports future expansion to regions/localities
-- v1 uses suburbs only; parent_id and area_type prepared for future

CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.service_areas(id) ON DELETE SET NULL,

  area_type VARCHAR(20) NOT NULL DEFAULT 'suburb'
    CHECK (area_type IN ('region', 'locality', 'suburb')),

  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,

  -- Location metadata
  state VARCHAR(3) DEFAULT 'WA',
  postcode VARCHAR(10),

  -- Hierarchy path for efficient queries (materialized path pattern)
  -- Example: "perth-metro/perth-south/melville" - unused in v1
  path TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.service_areas IS 'Geographic hierarchy (suburbs only in v1, hierarchical support for future)';
COMMENT ON COLUMN public.service_areas.parent_id IS 'Nullable FK for hierarchy (unused in v1)';
COMMENT ON COLUMN public.service_areas.path IS 'Materialized path for ancestor queries (unused in v1)';

CREATE INDEX idx_service_areas_slug ON public.service_areas(slug);
CREATE INDEX idx_service_areas_parent ON public.service_areas(parent_id);
CREATE INDEX idx_service_areas_type ON public.service_areas(area_type);

-- ============================================================================
-- CREDENTIALS: credentials
-- ============================================================================
-- Tracks licenses, certifications, insurance (v1: plumbing license only)
-- Supports expiry tracking, manual verification workflow

CREATE TABLE IF NOT EXISTS public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  credential_type VARCHAR(50) NOT NULL
    CHECK (credential_type IN ('plumbing_license', 'gas_license', 'electrical_license', 'insurance_liability', 'insurance_workers_comp')),

  credential_number VARCHAR(100) NOT NULL,
  issuing_authority VARCHAR(255),

  -- Verification (manual admin approval in v1)
  verified BOOLEAN DEFAULT false NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by_user_id UUID,
  verification_notes TEXT,

  -- Expiry tracking
  issued_at DATE,
  expires_at DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.credentials IS 'Business credentials with manual verification (v1: plumbing license only)';
COMMENT ON COLUMN public.credentials.verified IS 'Manual admin approval flag';
COMMENT ON COLUMN public.credentials.expires_at IS 'License expiry date (business should be suspended after expiry)';

CREATE INDEX idx_credentials_business ON public.credentials(business_id);
CREATE INDEX idx_credentials_verified ON public.credentials(verified);
CREATE INDEX idx_credentials_type ON public.credentials(credential_type);
CREATE INDEX idx_credentials_expires ON public.credentials(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- BUSINESS HOURS: availability_windows
-- ============================================================================
-- Structured hours replace JSONB blob
-- Supports regular hours + emergency availability as separate windows

CREATE TABLE IF NOT EXISTS public.availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Recurring schedule
  day_of_week INTEGER
    CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,

  -- Emergency vs regular hours
  is_emergency BOOLEAN DEFAULT false NOT NULL,

  -- Special dates/holiday hours (unused in v1)
  effective_from DATE,
  effective_until DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.availability_windows IS 'Structured business hours (regular and emergency)';
COMMENT ON COLUMN public.availability_windows.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN public.availability_windows.is_emergency IS 'true = emergency/after-hours window, false = regular hours';

CREATE INDEX idx_availability_business ON public.availability_windows(business_id);
CREATE INDEX idx_availability_day ON public.availability_windows(day_of_week);
CREATE INDEX idx_availability_emergency ON public.availability_windows(is_emergency) WHERE is_emergency = true;

-- ============================================================================
-- JUNCTION TABLES: M:M relationships
-- ============================================================================

-- business_services: M:M between businesses and service_types
CREATE TABLE IF NOT EXISTS public.business_services (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  PRIMARY KEY (business_id, service_type_id)
);

COMMENT ON TABLE public.business_services IS 'M:M junction: which services each business offers';

CREATE INDEX idx_business_services_business ON public.business_services(business_id);
CREATE INDEX idx_business_services_service ON public.business_services(service_type_id);

-- business_service_areas: M:M between businesses and service_areas
CREATE TABLE IF NOT EXISTS public.business_service_areas (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_area_id UUID NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  PRIMARY KEY (business_id, service_area_id)
);

COMMENT ON TABLE public.business_service_areas IS 'M:M junction: which areas each business serves';

CREATE INDEX idx_business_service_areas_business ON public.business_service_areas(business_id);
CREATE INDEX idx_business_service_areas_area ON public.business_service_areas(service_area_id);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON public.credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Public can read published businesses only
-- All mutations require service role (admin operations)
-- Draft/pending businesses hidden from public

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_service_areas ENABLE ROW LEVEL SECURITY;

-- Businesses: public can only read published listings
CREATE POLICY "public_read_published_businesses"
  ON public.businesses
  FOR SELECT
  TO public
  USING (status = 'published');

-- Service types: public read access (catalog is public)
CREATE POLICY "public_read_service_types"
  ON public.service_types
  FOR SELECT
  TO public
  USING (true);

-- Service areas: public read access (geography is public)
CREATE POLICY "public_read_service_areas"
  ON public.service_areas
  FOR SELECT
  TO public
  USING (true);

-- Credentials: no public read (sensitive license numbers)
-- Only service role can access via admin dashboard

-- Availability: public can read if business is published
CREATE POLICY "public_read_availability_published"
  ON public.availability_windows
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = availability_windows.business_id
        AND businesses.status = 'published'
    )
  );

-- Business services: public can read if business is published
CREATE POLICY "public_read_business_services_published"
  ON public.business_services
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = business_services.business_id
        AND businesses.status = 'published'
    )
  );

-- Business service areas: public can read if business is published
CREATE POLICY "public_read_business_service_areas_published"
  ON public.business_service_areas
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = business_service_areas.business_id
        AND businesses.status = 'published'
    )
  );

-- All INSERT/UPDATE/DELETE operations blocked for public (service role only)
-- No policies defined = implicitly deny

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT SELECT ON public.service_types TO anon, authenticated;
GRANT SELECT ON public.service_areas TO anon, authenticated;
GRANT SELECT ON public.availability_windows TO anon, authenticated;
GRANT SELECT ON public.business_services TO anon, authenticated;
GRANT SELECT ON public.business_service_areas TO anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- ANALYSIS
-- ============================================================================

ANALYZE public.businesses;
ANALYZE public.service_types;
ANALYZE public.service_areas;
ANALYZE public.credentials;
ANALYZE public.availability_windows;
ANALYZE public.business_services;
ANALYZE public.business_service_areas;
