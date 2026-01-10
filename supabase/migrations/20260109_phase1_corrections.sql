-- Migration: Phase 1 Corrections
-- Date: 2026-01-09
-- Purpose: Fix misalignments identified in Phase 1 code review
-- Fixes: status defaults, placeholder emails, email nullability, raw hours preservation

-- ============================================================================
-- CORRECTION 1: Make email nullable on businesses table
-- ============================================================================
-- Issue: email VARCHAR(255) NOT NULL forced placeholder emails in migration
-- Fix: Allow NULL emails for businesses without known email addresses

ALTER TABLE public.businesses
  ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN public.businesses.email IS 'Business email address (nullable - may be unknown for legacy businesses)';

-- ============================================================================
-- CORRECTION 2: Add column to preserve raw business hours
-- ============================================================================
-- Issue: Regex parsing of JSONB hours may fail, original data lost
-- Fix: Preserve original JSONB for manual review/cleanup

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS raw_business_hours JSONB;

COMMENT ON COLUMN public.businesses.raw_business_hours IS 'Original business_hours JSONB from legacy plumbers table (for manual review if availability_windows parsing failed)';

-- ============================================================================
-- CORRECTION 3: Update all migrated businesses to pending_review status
-- ============================================================================
-- Issue: Migration set status='published' for all legacy businesses
-- Fix: Set to 'pending_review' - requires manual license verification before publish

UPDATE public.businesses
SET
  status = 'pending_review',
  verified_at = NULL,          -- Not yet verified
  published_at = NULL           -- Not yet published
WHERE status = 'published'
  AND verified_at IS NOT NULL   -- Only update migrated businesses (identified by auto-set verified_at)
  AND verified_by_user_id IS NULL;  -- Ensure we don't touch manually verified ones

-- ============================================================================
-- CORRECTION 4: Remove placeholder emails
-- ============================================================================
-- Issue: Migration generated fake emails like "0412345678@placeholder.example.com"
-- Fix: Set to NULL for proper data integrity

UPDATE public.businesses
SET email = NULL
WHERE email LIKE '%@placeholder.example.com';

-- ============================================================================
-- CORRECTION 5: Populate raw_business_hours from legacy plumbers table
-- ============================================================================
-- Preserve original JSONB for businesses where hours parsing may have failed

UPDATE public.businesses b
SET raw_business_hours = p.business_hours
FROM public.plumbers p
WHERE b.slug = p.slug
  AND p.business_hours IS NOT NULL;

-- ============================================================================
-- CORRECTION 6: Update check_publication_requirements to handle nullable email
-- ============================================================================
-- Issue: Function checks email IS NOT NULL, but email is now nullable
-- Fix: Remove email from required fields check (optional for v1)

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

  -- Email is now optional (nullable)
  -- Removed: email required check

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

COMMENT ON FUNCTION public.check_publication_requirements IS 'Validates business meets publication requirements (verified license, services, areas, required fields). Email is optional.';

-- ============================================================================
-- CORRECTION 7: Add comment clarifying emergency_available derivation
-- ============================================================================
-- Clarify that emergency availability is a capability flag (has emergency windows),
-- not a real-time availability check

COMMENT ON VIEW public.published_businesses IS 'Public directory query contract: published businesses with aggregated relationships. emergency_available is derived as: business has any availability_windows with is_emergency=true (capability flag, not time-based)';

-- ============================================================================
-- CORRECTION 8: Flag businesses with potentially invalid hours parsing
-- ============================================================================
-- Identify businesses where hours parsing may have failed for manual review

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count businesses with suspicious default hours (09:00-17:00 on all days)
  SELECT COUNT(DISTINCT business_id) INTO v_count
  FROM public.availability_windows
  WHERE is_emergency = false
    AND open_time = '09:00'::TIME
    AND close_time = '17:00'::TIME
  GROUP BY business_id
  HAVING COUNT(*) = 7;  -- All 7 days have default hours

  IF v_count > 0 THEN
    RAISE NOTICE 'WARNING: % businesses have default 9-5 hours on all days - likely parsing failures. Review raw_business_hours for manual correction.', v_count;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  published_count INTEGER;
  pending_count INTEGER;
  null_email_count INTEGER;
  placeholder_email_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count FROM public.businesses WHERE status = 'published';
  SELECT COUNT(*) INTO pending_count FROM public.businesses WHERE status = 'pending_review';
  SELECT COUNT(*) INTO null_email_count FROM public.businesses WHERE email IS NULL;
  SELECT COUNT(*) INTO placeholder_email_count FROM public.businesses WHERE email LIKE '%@placeholder.example.com';

  RAISE NOTICE '=== PHASE 1 CORRECTIONS SUMMARY ===';
  RAISE NOTICE 'Published businesses: % (should be 0 unless manually verified)', published_count;
  RAISE NOTICE 'Pending review businesses: %', pending_count;
  RAISE NOTICE 'Businesses with NULL email: %', null_email_count;
  RAISE NOTICE 'Businesses with placeholder email: % (should be 0)', placeholder_email_count;
END $$;

-- Update statistics
ANALYZE public.businesses;
