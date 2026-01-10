-- Migrate legacy plumbers data WITHOUT regular business hours parsing.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING / NOT EXISTS guards).

-- 1) Credentials (license) - if missing
INSERT INTO public.credentials (
  business_id,
  credential_type,
  credential_number,
  verified,
  verified_at
)
SELECT
  b.id,
  'plumbing_license',
  p.license_number,
  false,
  NULL
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
WHERE p.license_number IS NOT NULL
  AND p.license_number <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.credentials c
    WHERE c.business_id = b.id
      AND c.credential_type = 'plumbing_license'
  );

-- 2) Emergency capability marker (no times, capability only)
INSERT INTO public.availability_windows (
  business_id,
  day_of_week,
  open_time,
  close_time,
  is_emergency
)
SELECT
  b.id,
  NULL,
  NULL,
  NULL,
  true
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
WHERE p.emergency_available = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.availability_windows aw
    WHERE aw.business_id = b.id
      AND aw.is_emergency = true
      AND aw.day_of_week IS NULL
      AND aw.open_time IS NULL
      AND aw.close_time IS NULL
  );

-- 3) business_services junction
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
  st.id
FROM plumber_services ps
JOIN public.service_types st ON st.name = ps.service_name
ON CONFLICT (business_id, service_type_id) DO NOTHING;

-- 4) business_service_areas junction (suburb)
INSERT INTO public.business_service_areas (business_id, service_area_id)
SELECT DISTINCT
  b.id,
  sa.id
FROM public.plumbers p
JOIN public.businesses b ON b.slug = p.slug
JOIN public.service_areas sa ON sa.slug = lower(p.suburb)
WHERE sa.area_type = 'suburb'
ON CONFLICT (business_id, service_area_id) DO NOTHING;
