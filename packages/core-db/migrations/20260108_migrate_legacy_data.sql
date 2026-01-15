-- Migration: Migrate data from legacy plumbers table to new entity schema
-- Date: 2026-01-08
-- Purpose: Transform denormalized plumbers table into normalized entity model
-- Safety: Does not modify or drop legacy plumbers table

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
-- Map legacy plumber records to new business entity model
-- All existing plumbers assumed published (status='published')

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
  COALESCE(email, phone || '@placeholder.example.com') AS email, -- Ensure email is NOT NULL
  website,
  address AS street_address,
  'published' AS status, -- Legacy data assumed verified and published
  NOW() AS verified_at,
  created_at AS published_at,
  rating,
  review_count,
  years_experience,
  COALESCE(hero_image, '/images/plumber-business-hero.png') AS hero_image,
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
  false AS verified, -- Requires manual admin verification
  'Migrated from legacy plumbers.license_number - requires verification' AS verification_notes,
  p.created_at
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
WHERE p.license_number IS NOT NULL
  AND p.license_number != '';

-- ============================================================================
-- STEP 5: Parse business_hours JSONB → availability_windows
-- ============================================================================
-- Transform legacy JSONB business hours into structured availability windows
-- Emergency availability handled separately

-- Regular business hours (from business_hours JSONB)
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
  -- Simple parsing: extract first time as open, second as close
  -- Format: "8:00 AM - 5:00 PM" → open: 08:00, close: 17:00
  -- This is a best-effort parse; manual cleanup may be needed
  CASE
    WHEN hours_text ~* '(\d{1,2}):(\d{2})\s*(AM|PM)' THEN
      (regexp_match(hours_text, '(\d{1,2}):(\d{2})\s*(AM|PM)', 'i'))[1]::TIME
    ELSE '09:00'::TIME
  END AS open_time,
  CASE
    WHEN hours_text ~* '-.*?(\d{1,2}):(\d{2})\s*(AM|PM)' THEN
      (regexp_match(hours_text, '-.*?(\d{1,2}):(\d{2})\s*(AM|PM)', 'i'))[1]::TIME
    ELSE '17:00'::TIME
  END AS close_time,
  false AS is_emergency
FROM hours_expanded
WHERE day_of_week IS NOT NULL
  AND hours_text IS NOT NULL
  AND hours_text != ''
  AND hours_text !~* 'closed';

-- Emergency availability windows (from emergency_available boolean)
-- If business offers emergency service, create 24/7 windows marked is_emergency=true
INSERT INTO public.availability_windows (
  business_id,
  day_of_week,
  open_time,
  close_time,
  is_emergency
)
SELECT
  b.id AS business_id,
  generate_series(0, 6) AS day_of_week, -- All days of week
  '00:00'::TIME AS open_time,
  '23:59'::TIME AS close_time,
  true AS is_emergency
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
WHERE p.emergency_available = true;

-- ============================================================================
-- STEP 6: Create business_services junction rows
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
-- STEP 7: Create business_service_areas junction rows
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
-- Output counts for verification

DO $$
DECLARE
  business_count INT;
  service_count INT;
  area_count INT;
  credential_count INT;
  window_count INT;
  bs_count INT;
  bsa_count INT;
BEGIN
  SELECT COUNT(*) INTO business_count FROM public.businesses;
  SELECT COUNT(*) INTO service_count FROM public.service_types;
  SELECT COUNT(*) INTO area_count FROM public.service_areas;
  SELECT COUNT(*) INTO credential_count FROM public.credentials;
  SELECT COUNT(*) INTO window_count FROM public.availability_windows;
  SELECT COUNT(*) INTO bs_count FROM public.business_services;
  SELECT COUNT(*) INTO bsa_count FROM public.business_service_areas;

  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'businesses: %', business_count;
  RAISE NOTICE 'service_types: %', service_count;
  RAISE NOTICE 'service_areas: %', area_count;
  RAISE NOTICE 'credentials: %', credential_count;
  RAISE NOTICE 'availability_windows: %', window_count;
  RAISE NOTICE 'business_services: %', bs_count;
  RAISE NOTICE 'business_service_areas: %', bsa_count;
END $$;

-- Update statistics for query planner
ANALYZE public.businesses;
ANALYZE public.service_types;
ANALYZE public.service_areas;
ANALYZE public.credentials;
ANALYZE public.availability_windows;
ANALYZE public.business_services;
ANALYZE public.business_service_areas;
