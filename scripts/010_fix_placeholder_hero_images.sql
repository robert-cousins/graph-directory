-- Update all plumber records that have placeholder.svg hero images
-- Replace them with the correct photorealistic hero image

UPDATE plumbers 
SET hero_image = '/images/plumber-business-hero.png'
WHERE hero_image LIKE '%placeholder.svg%' 
   OR hero_image IS NULL 
   OR hero_image = '';

-- Verify the update
SELECT business_name, hero_image 
FROM plumbers 
ORDER BY business_name;
