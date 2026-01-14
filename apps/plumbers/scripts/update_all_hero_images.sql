-- Update all plumber records to use the correct hero image
UPDATE plumbers 
SET hero_image = '/images/plumber-business-hero.png';

-- Verify the update
SELECT id, name, hero_image 
FROM plumbers 
ORDER BY id;

-- Count records with correct hero image
SELECT COUNT(*) as total_plumbers_with_correct_hero
FROM plumbers 
WHERE hero_image = '/images/plumber-business-hero.png';
