-- Add hero_image column if it doesn't exist
ALTER TABLE plumbers ADD COLUMN IF NOT EXISTS hero_image TEXT;

-- Clear existing data to avoid conflicts
DELETE FROM plumbers;

-- Insert all plumber data with hero images
INSERT INTO plumbers (
  name, slug, phone, email, address, suburb, website, rating, review_count,
  services, description, business_hours, emergency_available, years_experience,
  license_number, hero_image, created_at, updated_at
) VALUES 
-- Melville Plumbers
(
  'AquaFlow Plumbing', 'aquaflow-plumbing', '(08) 9330 1234', 'info@aquaflowplumbing.com.au',
  '123 Canning Highway, Melville WA 6156', 'Melville', 'https://aquaflowplumbing.com.au',
  4.8, 127, ARRAY['Emergency Repairs', 'Hot Water Systems', 'Blocked Drains', 'Leak Detection'],
  'Professional plumbing services with over 15 years of experience serving Melville and surrounding areas.',
  '{"Monday": "7:00 AM - 6:00 PM", "Tuesday": "7:00 AM - 6:00 PM", "Wednesday": "7:00 AM - 6:00 PM", "Thursday": "7:00 AM - 6:00 PM", "Friday": "7:00 AM - 6:00 PM", "Saturday": "8:00 AM - 4:00 PM", "Sunday": "Emergency Only"}'::jsonb,
  true, 15, 'PL8901', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  '24/7 Plumbing Melville', '24-7-plumbing-melville', '(08) 9330 5678', 'emergency@247plumbingmelville.com.au',
  '456 Leach Highway, Melville WA 6156', 'Melville', 'https://247plumbingmelville.com.au',
  4.6, 89, ARRAY['Emergency Repairs', 'Pipe Relining', 'Gas Fitting', 'Bathroom Renovations'],
  'Round-the-clock emergency plumbing services. No job too big or small.',
  '{"Monday": "24 Hours", "Tuesday": "24 Hours", "Wednesday": "24 Hours", "Thursday": "24 Hours", "Friday": "24 Hours", "Saturday": "24 Hours", "Sunday": "24 Hours"}'::jsonb,
  true, 12, 'PL8902', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Melville Master Plumbers', 'melville-master-plumbers', '(08) 9330 9012', 'contact@melvillemasterplumbers.com.au',
  '789 Stock Road, Melville WA 6156', 'Melville', 'https://melvillemasterplumbers.com.au',
  4.9, 156, ARRAY['Hot Water Systems', 'Bathroom Renovations', 'Kitchen Plumbing', 'Leak Detection'],
  'Master plumbers with exceptional craftsmanship and attention to detail.',
  '{"Monday": "6:00 AM - 7:00 PM", "Tuesday": "6:00 AM - 7:00 PM", "Wednesday": "6:00 AM - 7:00 PM", "Thursday": "6:00 AM - 7:00 PM", "Friday": "6:00 AM - 7:00 PM", "Saturday": "7:00 AM - 5:00 PM", "Sunday": "Emergency Only"}'::jsonb,
  true, 20, 'PL8903', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Rapid Response Plumbing', 'rapid-response-plumbing', '(08) 9330 3456', 'info@rapidresponseplumbing.com.au',
  '321 Riseley Street, Melville WA 6156', 'Melville', 'https://rapidresponseplumbing.com.au',
  4.7, 98, ARRAY['Emergency Repairs', 'Blocked Drains', 'Pipe Repairs', 'Water Pressure Issues'],
  'Fast, reliable plumbing solutions when you need them most.',
  '{"Monday": "7:00 AM - 8:00 PM", "Tuesday": "7:00 AM - 8:00 PM", "Wednesday": "7:00 AM - 8:00 PM", "Thursday": "7:00 AM - 8:00 PM", "Friday": "7:00 AM - 8:00 PM", "Saturday": "8:00 AM - 6:00 PM", "Sunday": "9:00 AM - 5:00 PM"}'::jsonb,
  true, 10, 'PL8904', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'EcoFlow Plumbing Solutions', 'ecoflow-plumbing-solutions', '(08) 9330 7890', 'hello@ecoflowplumbing.com.au',
  '654 Marmion Street, Melville WA 6156', 'Melville', 'https://ecoflowplumbing.com.au',
  4.5, 73, ARRAY['Eco-Friendly Solutions', 'Water Efficiency', 'Solar Hot Water', 'Rainwater Systems'],
  'Environmentally conscious plumbing solutions for sustainable living.',
  '{"Monday": "8:00 AM - 5:00 PM", "Tuesday": "8:00 AM - 5:00 PM", "Wednesday": "8:00 AM - 5:00 PM", "Thursday": "8:00 AM - 5:00 PM", "Friday": "8:00 AM - 5:00 PM", "Saturday": "9:00 AM - 3:00 PM", "Sunday": "Closed"}'::jsonb,
  false, 8, 'PL8905', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Premier Plumbing Perth', 'premier-plumbing-perth', '(08) 9330 2468', 'service@premierplumbingperth.com.au',
  '987 Canning Highway, Melville WA 6156', 'Melville', 'https://premierplumbingperth.com.au',
  4.8, 134, ARRAY['Luxury Bathrooms', 'High-End Fixtures', 'Custom Plumbing', 'Maintenance Plans'],
  'Premium plumbing services for discerning homeowners and businesses.',
  '{"Monday": "7:00 AM - 6:00 PM", "Tuesday": "7:00 AM - 6:00 PM", "Wednesday": "7:00 AM - 6:00 PM", "Thursday": "7:00 AM - 6:00 PM", "Friday": "7:00 AM - 6:00 PM", "Saturday": "8:00 AM - 4:00 PM", "Sunday": "Emergency Only"}'::jsonb,
  true, 18, 'PL8906', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'All Hours Plumbing', 'all-hours-plumbing', '(08) 9330 1357', 'contact@allhoursplumbing.com.au',
  '147 Leach Highway, Melville WA 6156', 'Melville', 'https://allhoursplumbing.com.au',
  4.4, 67, ARRAY['Emergency Repairs', 'General Plumbing', 'Maintenance', 'Inspections'],
  'Reliable plumbing services available when you need them.',
  '{"Monday": "6:00 AM - 10:00 PM", "Tuesday": "6:00 AM - 10:00 PM", "Wednesday": "6:00 AM - 10:00 PM", "Thursday": "6:00 AM - 10:00 PM", "Friday": "6:00 AM - 10:00 PM", "Saturday": "7:00 AM - 9:00 PM", "Sunday": "8:00 AM - 8:00 PM"}'::jsonb,
  true, 9, 'PL8907', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Melville Drain Specialists', 'melville-drain-specialists', '(08) 9330 8024', 'drains@melvilledrains.com.au',
  '258 Stock Road, Melville WA 6156', 'Melville', 'https://melvilledrains.com.au',
  4.6, 91, ARRAY['Blocked Drains', 'Drain Cleaning', 'CCTV Inspections', 'Pipe Relining'],
  'Specialists in all types of drain problems and solutions.',
  '{"Monday": "7:00 AM - 6:00 PM", "Tuesday": "7:00 AM - 6:00 PM", "Wednesday": "7:00 AM - 6:00 PM", "Thursday": "7:00 AM - 6:00 PM", "Friday": "7:00 AM - 6:00 PM", "Saturday": "8:00 AM - 4:00 PM", "Sunday": "Emergency Only"}'::jsonb,
  true, 14, 'PL8908', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),

-- Myaree Plumbers
(
  'Myaree Plumbing Pros', 'myaree-plumbing-pros', '(08) 9330 4567', 'info@myareeplumbingpros.com.au',
  '123 North Lake Road, Myaree WA 6154', 'Myaree', 'https://myareeplumbingpros.com.au',
  4.7, 112, ARRAY['Hot Water Systems', 'Bathroom Renovations', 'Emergency Repairs', 'Gas Fitting'],
  'Professional plumbing services tailored to Myaree residents and businesses.',
  '{"Monday": "7:00 AM - 6:00 PM", "Tuesday": "7:00 AM - 6:00 PM", "Wednesday": "7:00 AM - 6:00 PM", "Thursday": "7:00 AM - 6:00 PM", "Friday": "7:00 AM - 6:00 PM", "Saturday": "8:00 AM - 4:00 PM", "Sunday": "Emergency Only"}'::jsonb,
  true, 16, 'PL8909', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'South Perth Plumbing Co', 'south-perth-plumbing-co', '(08) 9330 6789', 'service@southperthplumbing.com.au',
  '456 Leach Highway, Myaree WA 6154', 'Myaree', 'https://southperthplumbing.com.au',
  4.5, 85, ARRAY['Leak Detection', 'Pipe Repairs', 'Toilet Repairs', 'Tap Installation'],
  'Experienced plumbers serving South Perth region with quality workmanship.',
  '{"Monday": "8:00 AM - 5:00 PM", "Tuesday": "8:00 AM - 5:00 PM", "Wednesday": "8:00 AM - 5:00 PM", "Thursday": "8:00 AM - 5:00 PM", "Friday": "8:00 AM - 5:00 PM", "Saturday": "9:00 AM - 3:00 PM", "Sunday": "Closed"}'::jsonb,
  false, 11, 'PL8910', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Express Plumbing Myaree', 'express-plumbing-myaree', '(08) 9330 8901', 'urgent@expressplumbingmyaree.com.au',
  '789 Hulme Court, Myaree WA 6154', 'Myaree', 'https://expressplumbingmyaree.com.au',
  4.8, 143, ARRAY['Emergency Repairs', 'Blocked Drains', 'Hot Water Systems', 'Burst Pipes'],
  'Fast response times and reliable emergency plumbing services.',
  '{"Monday": "24 Hours", "Tuesday": "24 Hours", "Wednesday": "24 Hours", "Thursday": "24 Hours", "Friday": "24 Hours", "Saturday": "24 Hours", "Sunday": "24 Hours"}'::jsonb,
  true, 13, 'PL8911', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Myaree Drain Solutions', 'myaree-drain-solutions', '(08) 9330 2345', 'help@myareedrains.com.au',
  '321 Winterfold Road, Myaree WA 6154', 'Myaree', 'https://myareedrains.com.au',
  4.6, 76, ARRAY['Blocked Drains', 'Drain Cleaning', 'Pipe Relining', 'Stormwater Drains'],
  'Drain specialists with advanced equipment and proven solutions.',
  '{"Monday": "7:00 AM - 7:00 PM", "Tuesday": "7:00 AM - 7:00 PM", "Wednesday": "7:00 AM - 7:00 PM", "Thursday": "7:00 AM - 7:00 PM", "Friday": "7:00 AM - 7:00 PM", "Saturday": "8:00 AM - 5:00 PM", "Sunday": "9:00 AM - 4:00 PM"}'::jsonb,
  true, 12, 'PL8912', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Quality Plumbing Myaree', 'quality-plumbing-myaree', '(08) 9330 5432', 'quality@qualityplumbingmyaree.com.au',
  '654 North Lake Road, Myaree WA 6154', 'Myaree', 'https://qualityplumbingmyaree.com.au',
  4.9, 167, ARRAY['Bathroom Renovations', 'Kitchen Plumbing', 'Luxury Fixtures', 'Custom Solutions'],
  'Premium quality plumbing with attention to detail and customer satisfaction.',
  '{"Monday": "7:00 AM - 6:00 PM", "Tuesday": "7:00 AM - 6:00 PM", "Wednesday": "7:00 AM - 6:00 PM", "Thursday": "7:00 AM - 6:00 PM", "Friday": "7:00 AM - 6:00 PM", "Saturday": "8:00 AM - 4:00 PM", "Sunday": "Emergency Only"}'::jsonb,
  true, 19, 'PL8913', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
),
(
  'Reliable Plumbing Services', 'reliable-plumbing-services', '(08) 9330 7654', 'reliable@reliableplumbingservices.com.au',
  '987 Leach Highway, Myaree WA 6154', 'Myaree', 'https://reliableplumbingservices.com.au',
  4.4, 58, ARRAY['General Plumbing', 'Maintenance', 'Repairs', 'Inspections'],
  'Dependable plumbing services for all your residential and commercial needs.',
  '{"Monday": "8:00 AM - 5:00 PM", "Tuesday": "8:00 AM - 5:00 PM", "Wednesday": "8:00 AM - 5:00 PM", "Thursday": "8:00 AM - 5:00 PM", "Friday": "8:00 AM - 5:00 PM", "Saturday": "9:00 AM - 3:00 PM", "Sunday": "Closed"}'::jsonb,
  false, 7, 'PL8914', '/placeholder.svg?height=400&width=800',
  NOW(), NOW()
);

-- Update the updated_at timestamp
UPDATE plumbers SET updated_at = NOW();
