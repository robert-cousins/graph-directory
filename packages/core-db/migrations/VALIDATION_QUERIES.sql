-- ============================================================================
-- PHASE 1 VALIDATION QUERIES
-- ============================================================================
-- Run these queries after applying migrations to verify correctness
-- All queries should return expected results as documented

-- ============================================================================
-- VALIDATION 1: No published businesses without verified credentials
-- ============================================================================
-- Expected: 0 rows (all businesses must have verified license before publishing)

SELECT
  b.id,
  b.slug,
  b.trading_name,
  b.status,
  COUNT(c.id) FILTER (WHERE c.verified = true AND c.credential_type = 'plumbing_license') AS verified_licenses
FROM public.businesses b
LEFT JOIN public.credentials c ON c.business_id = b.id
WHERE b.status = 'published'
GROUP BY b.id, b.slug, b.trading_name, b.status
HAVING COUNT(c.id) FILTER (WHERE c.verified = true AND c.credential_type = 'plumbing_license') = 0;

-- If this returns rows: FAIL - businesses are published without verified credentials

-- ============================================================================
-- VALIDATION 2: No placeholder emails exist
-- ============================================================================
-- Expected: 0 rows (placeholder emails should have been removed)

SELECT
  id,
  slug,
  trading_name,
  email
FROM public.businesses
WHERE email LIKE '%@placeholder.example.com';

-- If this returns rows: FAIL - placeholder emails still exist

-- ============================================================================
-- VALIDATION 3: Email column allows NULL
-- ============================================================================
-- Expected: Success (should not error)

DO $$
BEGIN
  -- Test that NULL emails are allowed
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND column_name = 'email'
      AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'PASS: businesses.email is nullable';
  ELSE
    RAISE EXCEPTION 'FAIL: businesses.email is NOT NULL';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 4: Businesses with NULL emails (informational)
-- ============================================================================
-- Expected: Variable (number of legacy businesses without known email)

SELECT COUNT(*) AS businesses_with_null_email
FROM public.businesses
WHERE email IS NULL;

-- This is informational - NULL emails are acceptable

-- ============================================================================
-- VALIDATION 5: Emergency availability is capability-based
-- ============================================================================
-- Expected: All emergency windows have NULL day_of_week and times (capability flag)
-- Or: Rows = 0 if no businesses offer emergency service

SELECT
  b.slug,
  b.trading_name,
  aw.day_of_week,
  aw.open_time,
  aw.close_time,
  aw.is_emergency
FROM public.businesses b
JOIN public.availability_windows aw ON aw.business_id = b.id
WHERE aw.is_emergency = true
  AND (
    aw.day_of_week IS NOT NULL
    OR aw.open_time IS NOT NULL
    OR aw.close_time IS NOT NULL
  );

-- If using corrected migration: Should return 0 rows (emergency is capability flag)
-- If using original migration: May return rows with 00:00-23:59 windows (FAIL)

-- ============================================================================
-- VALIDATION 6: No invalid hours windows
-- ============================================================================
-- Expected: 0 rows (open_time should be < close_time for regular hours)

SELECT
  b.slug,
  b.trading_name,
  aw.day_of_week,
  aw.open_time,
  aw.close_time,
  aw.is_emergency
FROM public.businesses b
JOIN public.availability_windows aw ON aw.business_id = b.id
WHERE aw.is_emergency = false
  AND aw.open_time IS NOT NULL
  AND aw.close_time IS NOT NULL
  AND aw.open_time >= aw.close_time;

-- If this returns rows: FAIL - invalid hours (opens >= closes)

-- ============================================================================
-- VALIDATION 7: All businesses have services and service areas
-- ============================================================================
-- Expected: 0 rows (every business must have ≥1 service and ≥1 area)

-- Businesses without services
SELECT
  id,
  slug,
  trading_name,
  'No services' AS issue
FROM public.businesses
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_services
  WHERE business_id = businesses.id
)
UNION ALL
-- Businesses without service areas
SELECT
  id,
  slug,
  trading_name,
  'No service areas' AS issue
FROM public.businesses
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_service_areas
  WHERE business_id = businesses.id
);

-- If this returns rows: FAIL - businesses missing services or areas

-- ============================================================================
-- VALIDATION 8: All migrated businesses are pending_review (not published)
-- ============================================================================
-- Expected: All migrated businesses have status='pending_review'

SELECT
  status,
  COUNT(*) AS count
FROM public.businesses
GROUP BY status
ORDER BY status;

-- Expected output (after corrections):
-- draft          | 0
-- pending_review | 24 (or total migrated count)
-- published      | 0
-- suspended      | 0

-- ============================================================================
-- VALIDATION 9: Data integrity - orphaned junction rows
-- ============================================================================
-- Expected: 0 for all queries (no orphaned relationships)

-- Orphaned business_services
SELECT 'Orphaned business_services' AS check_name, COUNT(*) AS orphan_count
FROM public.business_services bs
WHERE NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = bs.business_id)
   OR NOT EXISTS (SELECT 1 FROM public.service_types WHERE id = bs.service_type_id)
UNION ALL
-- Orphaned business_service_areas
SELECT 'Orphaned business_service_areas', COUNT(*)
FROM public.business_service_areas bsa
WHERE NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = bsa.business_id)
   OR NOT EXISTS (SELECT 1 FROM public.service_areas WHERE id = bsa.service_area_id)
UNION ALL
-- Orphaned credentials
SELECT 'Orphaned credentials', COUNT(*)
FROM public.credentials c
WHERE NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = c.business_id)
UNION ALL
-- Orphaned availability_windows
SELECT 'Orphaned availability_windows', COUNT(*)
FROM public.availability_windows aw
WHERE NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = aw.business_id);

-- All counts should be 0

-- ============================================================================
-- VALIDATION 10: Publication requirements check
-- ============================================================================
-- Expected: All businesses ineligible (no verified licenses yet)

SELECT
  slug,
  trading_name,
  status,
  check_publication_requirements(id) AS publication_check
FROM public.businesses
LIMIT 5;

-- Expected: All return {"eligible": false, "errors": ["No verified plumbing license"]}

-- ============================================================================
-- VALIDATION 11: Raw business hours preserved
-- ============================================================================
-- Expected: All migrated businesses have raw_business_hours populated (or NULL if none in legacy)

SELECT
  COUNT(*) AS businesses_with_raw_hours
FROM public.businesses
WHERE raw_business_hours IS NOT NULL;

-- Should match count of businesses that had business_hours in legacy plumbers table

-- ============================================================================
-- VALIDATION 12: Verify RLS policies work correctly
-- ============================================================================
-- Expected: 0 rows (public cannot see pending_review businesses)

-- Set role to anon (simulate public user)
SET ROLE anon;

SELECT COUNT(*) AS visible_to_public
FROM public.businesses;

-- Should be 0 (no published businesses yet)

SELECT COUNT(*) AS visible_published_view
FROM public.published_businesses;

-- Should be 0

-- Reset role
RESET ROLE;

-- ============================================================================
-- VALIDATION 13: Service role can update businesses
-- ============================================================================
-- Expected: Success (service role bypasses RLS)

DO $$
DECLARE
  test_business_id UUID;
BEGIN
  -- Get first business
  SELECT id INTO test_business_id
  FROM public.businesses
  LIMIT 1;

  -- Attempt update as service role (should succeed)
  UPDATE public.businesses
  SET description = 'Test update - ' || description
  WHERE id = test_business_id;

  -- Rollback test change
  UPDATE public.businesses
  SET description = regexp_replace(description, '^Test update - ', '')
  WHERE id = test_business_id;

  RAISE NOTICE 'PASS: Service role can update businesses';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'FAIL: Service role cannot update businesses - %', SQLERRM;
END $$;

-- ============================================================================
-- VALIDATION 14: Count summary (informational)
-- ============================================================================

SELECT
  'businesses' AS table_name,
  COUNT(*) AS row_count
FROM public.businesses
UNION ALL
SELECT 'service_types', COUNT(*) FROM public.service_types
UNION ALL
SELECT 'service_areas', COUNT(*) FROM public.service_areas
UNION ALL
SELECT 'credentials', COUNT(*) FROM public.credentials
UNION ALL
SELECT 'availability_windows', COUNT(*) FROM public.availability_windows
UNION ALL
SELECT 'business_services', COUNT(*) FROM public.business_services
UNION ALL
SELECT 'business_service_areas', COUNT(*) FROM public.business_service_areas;

-- ============================================================================
-- VALIDATION 15: Emergency capability check (informational)
-- ============================================================================
-- Count businesses offering emergency service

SELECT COUNT(DISTINCT business_id) AS businesses_with_emergency_capability
FROM public.availability_windows
WHERE is_emergency = true;

-- ============================================================================
-- VALIDATION COMPLETE
-- ============================================================================
-- All queries above should pass their expected conditions
-- If any FAIL conditions are met, migration has data quality issues
