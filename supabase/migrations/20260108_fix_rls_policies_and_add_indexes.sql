-- Migration: Fix RLS policies and add performance indexes
-- Date: 2026-01-08
-- Applied to: ninzegcsynnolhdlfwdo (supabase-melville-plumber)

-- Drop all existing RLS policies on plumbers table
DROP POLICY IF EXISTS "Allow service role full access to plumbers" ON public.plumbers;
DROP POLICY IF EXISTS "Allow public read access to plumbers" ON public.plumbers;
DROP POLICY IF EXISTS "Restrict public write access to plumbers" ON public.plumbers;
DROP POLICY IF EXISTS "Restrict public update access to plumbers" ON public.plumbers;
DROP POLICY IF EXISTS "Restrict public delete access to plumbers" ON public.plumbers;

-- Create optimized RLS policies with single, clear rules
-- Policy 1: Allow everyone to read plumber listings (public directory)
CREATE POLICY "public_read_plumbers"
  ON public.plumbers
  FOR SELECT
  TO public
  USING (true);

-- Policy 2: Allow anyone to insert new business listings (public form)
CREATE POLICY "public_insert_plumbers"
  ON public.plumbers
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy 3: Prevent public updates (use service role in code for authenticated updates)
CREATE POLICY "prevent_public_update"
  ON public.plumbers
  FOR UPDATE
  TO anon, authenticated
  USING (false);

-- Policy 4: Prevent public deletes (use service role in code for admin operations)
CREATE POLICY "prevent_public_delete"
  ON public.plumbers
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- Add performance indexes
-- Index on slug for detail page lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_plumbers_slug ON public.plumbers(slug);

-- Index on suburb for filtering
CREATE INDEX IF NOT EXISTS idx_plumbers_suburb ON public.plumbers(suburb);

-- Index on rating for sorting
CREATE INDEX IF NOT EXISTS idx_plumbers_rating ON public.plumbers(rating DESC);

-- GIN index on services array for filtering
CREATE INDEX IF NOT EXISTS idx_plumbers_services ON public.plumbers USING GIN(services);

-- Index on emergency_available for filtering
CREATE INDEX IF NOT EXISTS idx_plumbers_emergency ON public.plumbers(emergency_available) WHERE emergency_available = true;

-- Index on created_at for "Recently Added" sorting
CREATE INDEX IF NOT EXISTS idx_plumbers_created_at ON public.plumbers(created_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_plumbers_suburb_rating ON public.plumbers(suburb, rating DESC);

-- Update statistics
ANALYZE public.plumbers;
