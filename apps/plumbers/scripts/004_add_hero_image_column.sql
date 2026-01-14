-- Add hero_image column to plumbers table
ALTER TABLE plumbers 
ADD COLUMN hero_image TEXT;

-- Update existing records with placeholder hero images
UPDATE plumbers SET hero_image = '/placeholder.svg?height=400&width=800' WHERE suburb = 'Melville';
UPDATE plumbers SET hero_image = '/placeholder.svg?height=400&width=800' WHERE suburb = 'Myaree';

-- Add some variety to the hero images
UPDATE plumbers SET hero_image = '/placeholder.svg?height=400&width=800' WHERE business_name LIKE '%Bathroom%';
UPDATE plumbers SET hero_image = '/placeholder.svg?height=400&width=800' WHERE emergency_available = true;
UPDATE plumbers SET hero_image = '/placeholder.svg?height=400&width=800' WHERE services LIKE '%Hot Water%';
UPDATE plumbers SET hero_image = '/placeholder.svg?height=400&width=800' WHERE services LIKE '%Blocked Drains%';
