-- Migration: Phase 5 - Add lifecycle audit fields and enforce publication semantics
-- Date: 2026-01-16
-- Purpose: Implement Phase 5 publication lifecycle with audit tracking
-- Approach: Additive migration preserving existing contracts and status field

-- ============================================================================
-- STEP 1: Add audit fields to businesses table
-- ============================================================================

-- Add review submission tracking fields
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS review_submitted_by UUID;

-- Add published_by field (published_at already exists)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS published_by UUID;

-- Add comments for new fields
COMMENT ON COLUMN public.businesses.review_submitted_at IS 'When business was submitted for review (draft → pending_review transition)';
COMMENT ON COLUMN public.businesses.review_submitted_by IS 'User ID who submitted for review';
COMMENT ON COLUMN public.businesses.published_by IS 'User ID who published the business';

-- ============================================================================
-- STEP 2: Update published_businesses view to enforce status = 'published'
-- ============================================================================

-- Replace the existing view to ensure it only returns published status
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

-- Phase 5 enforcement: ONLY published status businesses
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

-- ============================================================================
-- STEP 3: Extend pending_review_queue for editorial workflow
-- ============================================================================

-- Replace existing view to include both draft and pending_review statuses
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
  b.review_submitted_at,
  b.review_submitted_by,

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

-- Phase 5 editorial workflow: include both draft and pending_review
WHERE b.status IN ('draft', 'pending_review')

GROUP BY b.id, b.slug, b.legal_name, b.trading_name, b.phone, b.email, b.status, b.created_at, b.review_submitted_at, b.review_submitted_by

ORDER BY
  -- Show pending_review first, then draft
  CASE WHEN b.status = 'pending_review' THEN 0 ELSE 1 END,
  -- Within each group, oldest first
  b.created_at ASC;

-- ============================================================================
-- STEP 4: Update RLS policies for lifecycle enforcement
-- ============================================================================

-- Ensure public can only read published businesses
DROP POLICY IF EXISTS "public_read_published_businesses" ON public.businesses;
CREATE POLICY "public_read_published_businesses"
  ON public.businesses
  FOR SELECT
  TO public
  USING (status = 'published');

-- Ensure public functions only return published businesses
-- (enforced by the view, but add explicit policy for safety)
DROP POLICY IF EXISTS "public_read_published_businesses_view" ON public.published_businesses;
CREATE POLICY "public_read_published_businesses_view"
  ON public.published_businesses
  FOR SELECT
  TO public
  USING (true); -- View already filters, but explicit policy for clarity

-- ============================================================================
-- STEP 5: Create admin-only view for editorial access
-- ============================================================================

-- Create a dedicated admin view for editorial workflow
CREATE OR REPLACE VIEW public.editorial_businesses AS
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
  b.status,
  b.created_at,
  b.updated_at,
  b.review_submitted_at,
  b.review_submitted_by,
  b.published_at,
  b.published_by,

  -- Aggregated services
  COALESCE(
    array_agg(DISTINCT st.name ORDER BY st.name) FILTER (WHERE st.id IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) AS services,

  -- Aggregated service areas
  COALESCE(
    array_agg(DISTINCT sa.name ORDER BY sa.name) FILTER (WHERE sa.id IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) AS service_areas,

  -- Emergency availability
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

-- Admin can see draft, pending_review, and published businesses
WHERE b.status IN ('draft', 'pending_review', 'published')

GROUP BY
  b.id, b.slug, b.legal_name, b.trading_name, b.description,
  b.phone, b.email, b.website, b.street_address, b.status,
  b.created_at, b.updated_at, b.review_submitted_at,
  b.review_submitted_by, b.published_at, b.published_by, b.verified_at;

-- Grant access to service role only (admin access)
REVOKE ALL ON public.editorial_businesses FROM public;
GRANT SELECT ON public.editorial_businesses TO service_role;

-- ============================================================================
-- STEP 6: Create lifecycle transition functions
-- ============================================================================

-- Function to submit business for review (draft -> pending_review)
CREATE OR REPLACE FUNCTION public.submit_for_review(
  p_business_id UUID,
  p_submitted_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status and set audit fields
  UPDATE public.businesses
  SET
    status = 'pending_review',
    review_submitted_at = NOW(),
    review_submitted_by = p_submitted_by,
    updated_at = NOW()
  WHERE
    id = p_business_id
    AND status = 'draft';

  -- If no rows updated, raise exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found or not in draft state';
  END IF;
END;
$$;

-- Function to request changes (pending_review -> draft)
CREATE OR REPLACE FUNCTION public.request_changes(
  p_business_id UUID,
  p_requested_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status and clear review audit fields
  UPDATE public.businesses
  SET
    status = 'draft',
    review_submitted_at = NULL,
    review_submitted_by = NULL,
    updated_at = NOW()
  WHERE
    id = p_business_id
    AND status = 'pending_review';

  -- If no rows updated, raise exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found or not in pending_review state';
  END IF;
END;
$$;

-- Function to publish business (pending_review -> published)
CREATE OR REPLACE FUNCTION public.publish_business(
  p_business_id UUID,
  p_published_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status and set audit fields
  UPDATE public.businesses
  SET
    status = 'published',
    published_at = NOW(),
    published_by = p_published_by,
    updated_at = NOW()
  WHERE
    id = p_business_id
    AND status = 'pending_review';

  -- If no rows updated, raise exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found or not in pending_review state';
  END IF;
END;
$$;

-- Function to unpublish business (published -> draft)
CREATE OR REPLACE FUNCTION public.unpublish_business(
  p_business_id UUID,
  p_unpublished_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status and clear publication audit fields
  UPDATE public.businesses
  SET
    status = 'draft',
    published_at = NULL,
    published_by = NULL,
    updated_at = NOW()
  WHERE
    id = p_business_id
    AND status = 'published';

  -- If no rows updated, raise exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found or not in published state';
  END IF;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION public.submit_for_review TO service_role;
GRANT EXECUTE ON FUNCTION public.request_changes TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_business TO service_role;
GRANT EXECUTE ON FUNCTION public.unpublish_business TO service_role;

-- ============================================================================
-- STEP 7: Analysis
-- ============================================================================

ANALYZE public.businesses;
ANALYZE public.published_businesses;
ANALYZE public.pending_review_queue;
ANALYZE public.editorial_businesses;
