UPDATE plumbers 
SET hero_image = '/images/plumber-business-hero.png'
WHERE hero_image LIKE '%placeholder.svg%';

-- Verify the update
SELECT COUNT(*) as updated_count 
FROM plumbers 
WHERE hero_image = '/images/plumber-business-hero.png';

-- Show all records to confirm
SELECT id, name, hero_image 
FROM plumbers 
ORDER BY id;
