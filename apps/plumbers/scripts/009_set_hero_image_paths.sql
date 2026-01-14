-- Update all plumber records to use the correct hero image
UPDATE plumbers 
SET hero_image = '/images/plumber-business-hero.png'
WHERE hero_image IS NULL 
   OR hero_image = '' 
   OR hero_image = '/placeholder.svg' 
   OR hero_image = 'placeholder.svg'
   OR hero_image LIKE '%placeholder%';

-- Verify the update
SELECT business_name, hero_image FROM plumbers ORDER BY business_name;
