-- Migration: Migrate data from legacy plumbers table (CORRECTED VERSION)
-- Date: 2026-01-08 (corrected 2026-01-09)
-- Purpose: Transform denormalized plumbers table into normalized entity model
-- Use this version instead of 20260108_migrate_legacy_data.sql for fresh migrations
-- Corrections: status='pending_review', email=NULL allowed, conservative hours parsing

-- ============================================================================
-- STEP 1: Seed service_types catalog
-- ============================================================================
-- Extract unique services from legacy plumbers.services TEXT[] array
-- Create normalized service_type records with SEO-friendly slugs

WITH unique_services AS (
  SELECT DISTINCT unnest(services) AS service_name
  FROM public.plumbers
  WHERE services IS NOT NULL
    AND array_length(services, 1) > 0
)
INSERT INTO public.service_types (slug, name, category, display_order)
SELECT
  lower(regexp_replace(service_name, '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
  service_name,
  CASE
    -- Categorize services (basic heuristic, can be refined)
    WHEN service_name ILIKE '%emergency%' THEN 'emergency'
    WHEN service_name ILIKE '%install%' OR service_name ILIKE '%renovation%' THEN 'installation'
    WHEN service_name ILIKE '%repair%' OR service_name ILIKE '%fix%' THEN 'repair'
    WHEN service_name ILIKE '%maintenance%' OR service_name ILIKE '%service%' THEN 'maintenance'
    ELSE 'general'
  END AS category,
  row_number() OVER (ORDER BY service_name) AS display_order
FROM unique_services
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 2: Seed service_areas (suburbs)
-- ============================================================================
-- Extract unique suburbs from legacy plumbers.suburb field
-- v1: suburbs only, no hierarchy (parent_id = NULL)

WITH unique_suburbs AS (
  SELECT DISTINCT suburb
  FROM public.plumbers
  WHERE suburb IS NOT NULL AND suburb != ''
)
INSERT INTO public.service_areas (slug, name, area_type, state, parent_id, path)
SELECT
  lower(regexp_replace(suburb, '[^a-zA-Z0-9]+', '-', 'g')) AS slug,
  suburb AS name,
  'suburb' AS area_type,
  'WA' AS state,
  NULL AS parent_id,
  lower(regexp_replace(suburb, '[^a-zA-Z0-9]+', '-', 'g')) AS path
FROM unique_suburbs
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 3: Migrate plumbers → businesses
-- ============================================================================
-- CORRECTED: status='pending_review' (not 'published')
-- CORRECTED: email NULL allowed (no placeholder generation)
-- CORRECTED: verified_at=NULL (not NOW())
-- CORRECTED: published_at=NULL (not created_at)
-- CORRECTED: Preserve raw_business_hours for manual review

INSERT INTO public.businesses (
  id,
  slug,
  legal_name,
  trading_name,
  description,
  phone,
  email,
  website,
  street_address,
  status,
  verified_at,
  published_at,
  rating,
  review_count,
  years_experience,
  hero_image,
  raw_business_hours,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() AS id,
  slug,
  name AS legal_name,
  name AS trading_name,
  description,
  phone,
  email,  -- NULL allowed (no placeholder)
  website,
  address AS street_address,
  'pending_review' AS status,  -- CORRECTED: Awaits license verification
  NULL AS verified_at,          -- CORRECTED: Not yet verified
  NULL AS published_at,         -- CORRECTED: Not yet published
  rating,
  review_count,
  years_experience,
  COALESCE(hero_image, '/images/plumber-business-hero.png') AS hero_image,
  business_hours AS raw_business_hours,  -- CORRECTED: Preserve for manual review
  created_at,
  updated_at
FROM public.plumbers
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 4: Create credentials from license_number
-- ============================================================================
-- Migrate license_number field to credentials table
-- Mark as unverified (admin must manually verify in v1)

INSERT INTO public.credentials (
  business_id,
  credential_type,
  credential_number,
  issuing_authority,
  verified,
  verification_notes,
  created_at
)
SELECT
  b.id AS business_id,
  'plumbing_license' AS credential_type,
  p.license_number AS credential_number,
  'WA Building Services Board' AS issuing_authority,
  false AS verified,  -- Requires manual admin verification
  'Migrated from legacy plumbers.license_number - requires verification' AS verification_notes,
  p.created_at
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
WHERE p.license_number IS NOT NULL
  AND p.license_number != '';

-- ============================================================================
-- STEP 5: Parse business_hours JSONB → availability_windows (CONSERVATIVE)
-- ============================================================================
-- CORRECTED: Only insert windows where parsing is high-confidence
-- If parsing fails or is uncertain, leave NULL and rely on raw_business_hours

-- Regular business hours (from business_hours JSONB)
-- Conservative approach: only parse standard "HH:MM AM/PM - HH:MM AM/PM" format
WITH hours_parsed AS (
  SELECT
    b.id AS business_id,
    p.business_hours,
    jsonb_each_text(p.business_hours) AS hour_entry
  FROM public.plumbers p
  JOIN public.businesses b ON b.slug = p.slug
  WHERE p.business_hours IS NOT NULL
    AND jsonb_typeof(p.business_hours) = 'object'
),
hours_expanded AS (
  SELECT
    business_id,
    CASE lower((hour_entry).key)
      WHEN 'sunday' THEN 0
      WHEN 'monday' THEN 1
      WHEN 'tuesday' THEN 2
      WHEN 'wednesday' THEN 3
      WHEN 'thursday' THEN 4
      WHEN 'friday' THEN 5
      WHEN 'saturday' THEN 6
    END AS day_of_week,
    (hour_entry).value AS hours_text
  FROM hours_parsed
),
hours_with_confidence AS (
  SELECT
    business_id,
    day_of_week,
    hours_text,
    -- Only parse if format matches "HH:MM AM/PM - HH:MM AM/PM" pattern
    hours_text ~* '^\s*\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)\s*$' AS is_parseable
  FROM hours_expanded
  WHERE day_of_week IS NOT NULL
    AND hours_text IS NOT NULL
    AND hours_text != ''
    AND hours_text !~* 'closed|by appointment|call|24/?7'
)
INSERT INTO public.availability_windows (
  business_id,
  day_of_week,
  open_time,
  close_time,
  is_emergency
)
SELECT
  business_id,
  day_of_week,
  -- Parse open time (first HH:MM AM/PM)
  (
    regexp_match(hours_text, '(\d{1,2}):(\d{2})\s*(AM|PM)', 'i')
  )[1]::TIME AS open_time,
  -- Parse close time (second HH:MM AM/PM after dash)
  (
    regexp_match(hours_text, '-\s*(\d{1,2}):(\d{2})\s*(AM|PM)', 'i')
  )[1]::TIME AS close_time,
  false AS is_emergency
FROM hours_with_confidence
WHERE is_parseable = true  -- CORRECTED: Only insert if confident
  AND (regexp_match(hours_text, '(\d{1,2}):(\d{2})\s*(AM|PM)', 'i'))[1]::TIME IS NOT NULL
  AND (regexp_match(hours_text, '-\s*(\d{1,2}):(\d{2})\s*(AM|PM)', 'i'))[1]::TIME IS NOT NULL;

-- ============================================================================
-- STEP 6: Create emergency capability windows
-- ============================================================================
-- CORRECTED: Emergency is a capability flag (has emergency service available)
-- Create simple marker rows: is_emergency=true, time fields NULL
-- This indicates "business offers emergency service" without implying time-based availability

INSERT INTO public.availability_windows (
  business_id,
  day_of_week,
  open_time,
  close_time,
  is_emergency
)
SELECT
  b.id AS business_id,
  NULL AS day_of_week,     -- CORRECTED: NULL day = applies to all days (capability flag)
  NULL AS open_time,        -- CORRECTED: NULL = not time-based
  NULL AS close_time,       -- CORRECTED: NULL = not time-based
  true AS is_emergency
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
WHERE p.emergency_available = true;

-- ============================================================================
-- STEP 7: Create business_services junction rows
-- ============================================================================
-- Map plumbers.services TEXT[] → business_services M:M relationship

WITH plumber_services AS (
  SELECT
    b.id AS business_id,
    unnest(p.services) AS service_name
  FROM public.plumbers p
  JOIN public.businesses b ON b.slug = p.slug
  WHERE p.services IS NOT NULL
    AND array_length(p.services, 1) > 0
)
INSERT INTO public.business_services (business_id, service_type_id)
SELECT DISTINCT
  ps.business_id,
  st.id AS service_type_id
FROM plumber_services ps
JOIN public.service_types st ON st.name = ps.service_name
ON CONFLICT (business_id, service_type_id) DO NOTHING;

-- ============================================================================
-- STEP 8: Create business_service_areas junction rows
-- ============================================================================
-- Map plumbers.suburb → business_service_areas M:M relationship

INSERT INTO public.business_service_areas (business_id, service_area_id)
SELECT DISTINCT
  b.id AS business_id,
  sa.id AS service_area_id
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
JOIN public.service_areas sa ON sa.name = p.suburb
WHERE p.suburb IS NOT NULL
  AND p.suburb != ''
ON CONFLICT (business_id, service_area_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  business_count INT;
  service_count INT;
  area_count INT;
  credential_count INT;
  window_count INT;
  bs_count INT;
  bsa_count INT;
  pending_count INT;
  published_count INT;
  null_email_count INT;
BEGIN
  SELECT COUNT(*) INTO business_count FROM public.businesses;
  SELECT COUNT(*) INTO service_count FROM public.service_types;
  SELECT COUNT(*) INTO area_count FROM public.service_areas;
  SELECT COUNT(*) INTO credential_count FROM public.credentials;
  SELECT COUNT(*) INTO window_count FROM public.availability_windows;
  SELECT COUNT(*) INTO bs_count FROM public.business_services;
  SELECT COUNT(*) INTO bsa_count FROM public.business_service_areas;
  SELECT COUNT(*) INTO pending_count FROM public.businesses WHERE status = 'pending_review';
  SELECT COUNT(*) INTO published_count FROM public.businesses WHERE status = 'published';
  SELECT COUNT(*) INTO null_email_count FROM public.businesses WHERE email IS NULL;

  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'businesses: % (status=pending: %, published: %)', business_count, pending_count, published_count;
  RAISE NOTICE 'service_types: %', service_count;
  RAISE NOTICE 'service_areas: %', area_count;
  RAISE NOTICE 'credentials: % (all verified=false)', credential_count;
  RAISE NOTICE 'availability_windows: %', window_count;
  RAISE NOTICE 'business_services: %', bs_count;
  RAISE NOTICE 'business_service_areas: %', bsa_count;
  RAISE NOTICE 'businesses with NULL email: %', null_email_count;
  RAISE NOTICE '';
  RAISE NOTICE 'CORRECTED: All businesses set to status=pending_review (not published)';
  RAISE NOTICE 'CORRECTED: NULL emails preserved (no placeholders)';
  RAISE NOTICE 'CORRECTED: Emergency availability is capability flag (not time-windowed)';
  RAISE NOTICE 'CORRECTED: Conservative hours parsing (uncertain parses skipped)';
END $$;

-- Update statistics for query planner
ANALYZE public.businesses;
ANALYZE public.service_types;
ANALYZE public.service_areas;
ANALYZE public.credentials;
ANALYZE public.availability_windows;
ANALYZE public.business_services;
ANALYZE public.business_service_areas;
