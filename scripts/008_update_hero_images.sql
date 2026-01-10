-- Update all placeholder.svg references to use the new hero image
-- Clear out any placeholder.svg references so they fall back to the new hero image
UPDATE plumbers 
SET hero_image = NULL 
WHERE hero_image = 'placeholder.svg' 
   OR hero_image = '/placeholder.svg' 
   OR hero_image LIKE '%placeholder.svg%';

-- Verify the update
SELECT business_name, hero_image 
FROM plumbers 
ORDER BY business_name;
