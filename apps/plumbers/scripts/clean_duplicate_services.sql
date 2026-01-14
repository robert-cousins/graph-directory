-- Remove duplicate services from all plumbers
-- This will deduplicate the services array for each plumber

UPDATE plumbers
SET services = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(services)
  )
)
WHERE array_length(services, 1) > 0;

-- Verify the changes
SELECT 
  name,
  slug,
  services,
  array_length(services, 1) as service_count
FROM plumbers
ORDER BY name;
