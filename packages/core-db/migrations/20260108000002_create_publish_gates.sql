-- Migration: Create database views and functions for publish gate workflow
-- Date: 2026-01-08
-- Purpose: Define query contracts and validation logic at database level
-- Implements status-driven publishing without application code dependencies

-- ============================================================================
-- VIEW: published_businesses
-- ============================================================================
-- Primary query contract for public-facing directory
-- Returns only published businesses with aggregated service/area data
-- Replaces direct queries to businesses table

CREATE OR REPLACE VIEW public.published_businesses AS
SELECT
  b.id,
  b.slug,
  b.legal_name,
  b.trading_name,
  b.description,
  b.phone,
  b.email,
  b.website,
  b.street_address,
  b.rating,
  b.review_count,
  b.years_experience,
  b.hero_image,
  b.published_at,
  b.created_at,

  -- Aggregated services (array of service names for compatibility)
  COALESCE(
    array_agg(DISTINCT st.name ORDER BY st.name) FILTER (WHERE st.id IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) AS services,

  -- Aggregated service areas (array of area names)
  COALESCE(
    array_agg(DISTINCT sa.name ORDER BY sa.name) FILTER (WHERE sa.id IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) AS service_areas,

  -- Emergency availability (derived from availability_windows)
  EXISTS (
    SELECT 1 FROM public.availability_windows aw
    WHERE aw.business_id = b.id
      AND aw.is_emergency = true
  ) AS emergency_available,

  -- Verification status
  b.verified_at IS NOT NULL AS is_verified,

  -- Credential counts
  (
    SELECT COUNT(*) FROM public.credentials c
    WHERE c.business_id = b.id AND c.verified = true
  ) AS verified_credentials_count

FROM public.businesses b
LEFT JOIN public.business_services bs ON bs.business_id = b.id
LEFT JOIN public.service_types st ON st.id = bs.service_type_id
LEFT JOIN public.business_service_areas bsa ON bsa.business_id = b.id
LEFT JOIN public.service_areas sa ON sa.id = bsa.service_area_id

WHERE b.status = 'published'

GROUP BY
  b.id,
  b.slug,
  b.legal_name,
  b.trading_name,
  b.description,
  b.phone,
  b.email,
  b.website,
  b.street_address,
  b.rating,
  b.review_count,
  b.years_experience,
  b.hero_image,
  b.published_at,
  b.created_at,
  b.verified_at;

COMMENT ON VIEW public.published_businesses IS 'Public directory query contract: published businesses with aggregated relationships';

-- Grant public read access to view
GRANT SELECT ON public.published_businesses TO anon, authenticated;

-- ============================================================================
-- FUNCTION: check_publication_requirements
-- ============================================================================
-- Validates whether a business meets publication requirements
-- Returns JSON object with validation results and error messages
-- v1: requires verified plumbing license + basic fields populated

CREATE OR REPLACE FUNCTION public.check_publication_requirements(
  p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB := '{}';
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_business RECORD;
  v_has_verified_license BOOLEAN;
  v_has_services BOOLEAN;
  v_has_service_areas BOOLEAN;
BEGIN
  -- Fetch business record
  SELECT * INTO v_business
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', jsonb_build_array('Business not found')
    );
  END IF;

  -- Requirement 1: Must have verified plumbing license
  SELECT EXISTS (
    SELECT 1 FROM public.credentials
    WHERE business_id = p_business_id
      AND credential_type = 'plumbing_license'
      AND verified = true
  ) INTO v_has_verified_license;

  IF NOT v_has_verified_license THEN
    v_errors := array_append(v_errors, 'No verified plumbing license');
  END IF;

  -- Requirement 2: Must have at least one service
  SELECT EXISTS (
    SELECT 1 FROM public.business_services
    WHERE business_id = p_business_id
  ) INTO v_has_services;

  IF NOT v_has_services THEN
    v_errors := array_append(v_errors, 'No services defined');
  END IF;

  -- Requirement 3: Must have at least one service area
  SELECT EXISTS (
    SELECT 1 FROM public.business_service_areas
    WHERE business_id = p_business_id
  ) INTO v_has_service_areas;

  IF NOT v_has_service_areas THEN
    v_errors := array_append(v_errors, 'No service areas defined');
  END IF;

  -- Requirement 4: Required fields populated
  IF v_business.legal_name IS NULL OR v_business.legal_name = '' THEN
    v_errors := array_append(v_errors, 'Legal name required');
  END IF;

  IF v_business.trading_name IS NULL OR v_business.trading_name = '' THEN
    v_errors := array_append(v_errors, 'Trading name required');
  END IF;

  IF v_business.phone IS NULL OR v_business.phone = '' THEN
    v_errors := array_append(v_errors, 'Phone required');
  END IF;

  IF v_business.email IS NULL OR v_business.email = '' THEN
    v_errors := array_append(v_errors, 'Email required');
  END IF;

  IF v_business.description IS NULL OR v_business.description = '' THEN
    v_errors := array_append(v_errors, 'Description required');
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'eligible', array_length(v_errors, 1) IS NULL,
    'errors', COALESCE(to_jsonb(v_errors), '[]'::jsonb),
    'requirements', jsonb_build_object(
      'verified_license', v_has_verified_license,
      'has_services', v_has_services,
      'has_service_areas', v_has_service_areas,
      'required_fields_complete', array_length(v_errors, 1) IS NULL
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.check_publication_requirements IS 'Validates business meets publication requirements (verified license, services, areas, required fields)';

-- ============================================================================
-- VIEW: pending_review_queue
-- ============================================================================
-- Admin view: businesses awaiting verification
-- Ordered by submission date (oldest first)

CREATE OR REPLACE VIEW public.pending_review_queue AS
SELECT
  b.id,
  b.slug,
  b.legal_name,
  b.trading_name,
  b.phone,
  b.email,
  b.status,
  b.created_at AS submitted_at,

  -- Unverified credentials (for admin review)
  COALESCE(
    json_agg(
      json_build_object(
        'type', c.credential_type,
        'number', c.credential_number,
        'issuing_authority', c.issuing_authority
      )
      ORDER BY c.credential_type
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::json
  ) AS credentials,

  -- Service count
  (SELECT COUNT(*) FROM public.business_services WHERE business_id = b.id) AS service_count,

  -- Service area count
  (SELECT COUNT(*) FROM public.business_service_areas WHERE business_id = b.id) AS area_count,

  -- Publication eligibility check
  public.check_publication_requirements(b.id) AS publication_check

FROM public.businesses b
LEFT JOIN public.credentials c ON c.business_id = b.id AND c.verified = false

WHERE b.status = 'pending_review'

GROUP BY b.id, b.slug, b.legal_name, b.trading_name, b.phone, b.email, b.status, b.created_at

ORDER BY b.created_at ASC;

COMMENT ON VIEW public.pending_review_queue IS 'Admin queue: businesses awaiting manual verification';

-- No public access to pending review queue (service role only)

-- ============================================================================
-- VIEW: business_with_details
-- ============================================================================
-- Complete business entity with all relationships
-- Used for admin dashboard and business owner portal

CREATE OR REPLACE VIEW public.business_with_details AS
SELECT
  b.id,
  b.slug,
  b.legal_name,
  b.trading_name,
  b.description,
  b.phone,
  b.email,
  b.website,
  b.street_address,
  b.postal_code,
  b.status,
  b.owner_user_id,
  b.verified_at,
  b.verified_by_user_id,
  b.published_at,
  b.rating,
  b.review_count,
  b.years_experience,
  b.hero_image,
  b.created_at,
  b.updated_at,

  -- Services (structured array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', st.id,
        'slug', st.slug,
        'name', st.name,
        'category', st.category
      )
      ORDER BY jsonb_build_object('id', st.id, 'slug', st.slug, 'name', st.name, 'category', st.category)
    ) FILTER (WHERE st.id IS NOT NULL),
    '[]'::json
  ) AS services,

  -- Service areas (structured array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', sa.id,
        'slug', sa.slug,
        'name', sa.name,
        'area_type', sa.area_type,
        'postcode', sa.postcode
      )
      ORDER BY jsonb_build_object('id', sa.id, 'slug', sa.slug, 'name', sa.name, 'area_type', sa.area_type, 'postcode', sa.postcode)
    ) FILTER (WHERE sa.id IS NOT NULL),
    '[]'::json
  ) AS service_areas,

  -- Credentials (structured array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', c.id,
        'type', c.credential_type,
        'number', c.credential_number,
        'verified', c.verified,
        'verified_at', c.verified_at,
        'expires_at', c.expires_at
      )
      ORDER BY jsonb_build_object('id', c.id, 'type', c.credential_type, 'number', c.credential_number, 'verified', c.verified, 'verified_at', c.verified_at, 'expires_at', c.expires_at)
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::json
  ) AS credentials,

  -- Availability windows (structured array)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'day_of_week', aw.day_of_week,
        'open_time', aw.open_time,
        'close_time', aw.close_time,
        'is_emergency', aw.is_emergency
      )
      ORDER BY jsonb_build_object('day_of_week', aw.day_of_week, 'open_time', aw.open_time, 'close_time', aw.close_time, 'is_emergency', aw.is_emergency)
    ) FILTER (WHERE aw.id IS NOT NULL),
    '[]'::json
  ) AS availability_windows

FROM public.businesses b
LEFT JOIN public.business_services bs ON bs.business_id = b.id
LEFT JOIN public.service_types st ON st.id = bs.service_type_id
LEFT JOIN public.business_service_areas bsa ON bsa.business_id = b.id
LEFT JOIN public.service_areas sa ON sa.id = bsa.service_area_id
LEFT JOIN public.credentials c ON c.business_id = b.id
LEFT JOIN public.availability_windows aw ON aw.business_id = b.id

GROUP BY
  b.id, b.slug, b.legal_name, b.trading_name, b.description,
  b.phone, b.email, b.website, b.street_address, b.postal_code,
  b.status, b.owner_user_id, b.verified_at, b.verified_by_user_id,
  b.published_at, b.rating, b.review_count, b.years_experience,
  b.hero_image, b.created_at, b.updated_at;

COMMENT ON VIEW public.business_with_details IS 'Complete business entity with all joined relationships (admin/owner access)';

-- No public access to full details (service role only)

-- ============================================================================
-- FUNCTION: get_businesses_by_service
-- ============================================================================
-- Query contract: businesses offering a specific service
-- Returns published businesses filtered by service slug

CREATE OR REPLACE FUNCTION public.get_businesses_by_service(
  p_service_slug VARCHAR(100)
)
RETURNS TABLE (
  id UUID,
  slug VARCHAR(255),
  trading_name VARCHAR(255),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  rating DECIMAL(3,2),
  review_count INTEGER,
  emergency_available BOOLEAN,
  hero_image TEXT,
  service_areas TEXT[]
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pb.id,
    pb.slug,
    pb.trading_name,
    pb.description,
    pb.phone,
    pb.email,
    pb.rating,
    pb.review_count,
    pb.emergency_available,
    pb.hero_image,
    pb.service_areas
  FROM public.published_businesses pb
  WHERE p_service_slug = ANY(
    SELECT st.slug
    FROM public.service_types st
    JOIN public.business_services bs ON bs.service_type_id = st.id
    WHERE bs.business_id = pb.id
  )
  ORDER BY pb.rating DESC, pb.review_count DESC;
$$;

COMMENT ON FUNCTION public.get_businesses_by_service IS 'Query contract: published businesses offering a specific service';

GRANT EXECUTE ON FUNCTION public.get_businesses_by_service TO anon, authenticated;

-- ============================================================================
-- FUNCTION: get_businesses_by_area
-- ============================================================================
-- Query contract: businesses serving a specific area
-- Returns published businesses filtered by service area slug

CREATE OR REPLACE FUNCTION public.get_businesses_by_area(
  p_area_slug VARCHAR(100)
)
RETURNS TABLE (
  id UUID,
  slug VARCHAR(255),
  trading_name VARCHAR(255),
  description TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  rating DECIMAL(3,2),
  review_count INTEGER,
  emergency_available BOOLEAN,
  hero_image TEXT,
  services TEXT[]
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pb.id,
    pb.slug,
    pb.trading_name,
    pb.description,
    pb.phone,
    pb.email,
    pb.rating,
    pb.review_count,
    pb.emergency_available,
    pb.hero_image,
    pb.services
  FROM public.published_businesses pb
  WHERE p_area_slug = ANY(
    SELECT sa.slug
    FROM public.service_areas sa
    JOIN public.business_service_areas bsa ON bsa.service_area_id = sa.id
    WHERE bsa.business_id = pb.id
  )
  ORDER BY pb.rating DESC, pb.review_count DESC;
$$;

COMMENT ON FUNCTION public.get_businesses_by_area IS 'Query contract: published businesses serving a specific area';

GRANT EXECUTE ON FUNCTION public.get_businesses_by_area TO anon, authenticated;

-- ============================================================================
-- Analysis
-- ============================================================================

ANALYZE public.published_businesses;
ANALYZE public.pending_review_queue;
ANALYZE public.business_with_details;
