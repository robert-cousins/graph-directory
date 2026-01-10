-- Create plumbers table
CREATE TABLE IF NOT EXISTS plumbers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  suburb VARCHAR(100) NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  services TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  business_hours JSONB,
  emergency_available BOOLEAN NOT NULL DEFAULT false,
  years_experience INTEGER,
  license_number VARCHAR(50),
  website VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on suburb for faster filtering
CREATE INDEX IF NOT EXISTS idx_plumbers_suburb ON plumbers(suburb);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_plumbers_slug ON plumbers(slug);

-- Create index on rating for sorting
CREATE INDEX IF NOT EXISTS idx_plumbers_rating ON plumbers(rating DESC);
