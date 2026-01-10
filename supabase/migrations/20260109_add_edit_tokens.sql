-- Phase 3: Add edit token support for public submissions
-- Enables token-based editing without user authentication

-- Add edit token columns to businesses table
ALTER TABLE public.businesses
  ADD COLUMN edit_token_hash TEXT NULL,
  ADD COLUMN edit_token_created_at TIMESTAMPTZ NULL,
  ADD COLUMN edit_token_last_rotated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.businesses.edit_token_hash IS
  'SHA-256 hash of edit token - allows public editing without auth';
COMMENT ON COLUMN public.businesses.edit_token_created_at IS
  'When edit token was first generated (at business creation)';
COMMENT ON COLUMN public.businesses.edit_token_last_rotated_at IS
  'When edit token was last rotated (optional security feature)';

-- Partial index for token hash lookups (only businesses with tokens)
CREATE INDEX idx_businesses_edit_token_hash ON public.businesses(edit_token_hash)
  WHERE edit_token_hash IS NOT NULL;

-- Ensure slug uniqueness (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_slug_unique'
  ) THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Ensure credential uniqueness (no duplicate credentials per business/type)
ALTER TABLE public.credentials
  ADD CONSTRAINT credentials_business_type_unique
  UNIQUE (business_id, credential_type);

-- Atomic business creation RPC function (ensures transactional correctness)
-- All inserts succeed or all fail - prevents partial data corruption
CREATE OR REPLACE FUNCTION public.create_business_with_relationships(
  p_slug TEXT,
  p_legal_name TEXT,
  p_trading_name TEXT,
  p_description TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_website TEXT,
  p_street_address TEXT,
  p_years_experience INT,
  p_emergency_available BOOLEAN,
  p_raw_business_hours JSONB,
  p_edit_token_hash TEXT,
  p_license_number TEXT,
  p_service_ids UUID[],
  p_area_ids UUID[]
) RETURNS TABLE (
  business_id UUID,
  business_slug TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_business_id UUID;
  v_service_id UUID;
  v_area_id UUID;
BEGIN
  -- Set stable search_path for security
  SET search_path = public;

  -- Insert business (status defaults to 'pending_review')
  INSERT INTO public.businesses (
    slug, legal_name, trading_name, description, phone, email,
    website, street_address, years_experience, emergency_available,
    raw_business_hours, status, edit_token_hash, edit_token_created_at
  ) VALUES (
    p_slug, p_legal_name, p_trading_name, p_description, p_phone, p_email,
    p_website, p_street_address, p_years_experience, p_emergency_available,
    p_raw_business_hours, 'pending_review', p_edit_token_hash, NOW()
  ) RETURNING id INTO v_business_id;

  -- Insert credential (always unverified initially)
  INSERT INTO public.credentials (
    business_id, credential_type, credential_number,
    issuing_authority, verified, verification_notes
  ) VALUES (
    v_business_id, 'plumbing_license', p_license_number,
    'WA Building Services Board', FALSE, 'Awaiting manual verification'
  );

  -- Insert services (M:M junction)
  FOREACH v_service_id IN ARRAY p_service_ids LOOP
    INSERT INTO public.business_services (business_id, service_type_id)
    VALUES (v_business_id, v_service_id);
  END LOOP;

  -- Insert service areas (M:M junction)
  FOREACH v_area_id IN ARRAY p_area_ids LOOP
    INSERT INTO public.business_service_areas (business_id, service_area_id)
    VALUES (v_business_id, v_area_id);
  END LOOP;

  -- Return result
  RETURN QUERY SELECT v_business_id, p_slug;
END;
$$;

COMMENT ON FUNCTION public.create_business_with_relationships IS
  'Atomically creates business with all related records (credential, services, areas). All-or-nothing transaction.';
