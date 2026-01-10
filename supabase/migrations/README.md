# Supabase Migrations

This folder contains SQL migrations for the Supabase database.

## Migrations

### Legacy Migrations (Applied)
- `20260108_fix_rls_policies_and_add_indexes.sql` - Optimized RLS policies and added performance indexes

### Phase 1: Entity Schema Migration (NEW - Pending)
- `20260108_create_entity_schema.sql` - Create normalized entity tables
- `20260108_migrate_legacy_data.sql` - Transform legacy plumbers table data
- `20260108_create_publish_gates.sql` - Create views/functions for publish workflow

See **Phase 1 Migration Guide** section below for detailed instructions.

---

## How to Apply Migrations (Legacy)

### Using Supabase CLI

```bash
# Link to your project
supabase link --project-ref ninzegcsynnolhdlfwdo

# Apply migrations
supabase db push
```

### Using Supabase Dashboard

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the migration SQL
3. Execute it

### Using MCP Supabase Plugin (Claude Code)

The migrations in this folder have already been applied to production. They are kept here for:
- Version control
- Documentation
- Applying to new environments (dev, staging, etc.)

## Migration Status

✅ Legacy migrations applied to production (`ninzegcsynnolhdlfwdo`)
⏳ Phase 1 migrations pending (see guide below)

---

# Phase 1 Migration Guide

## Overview

Phase 1 transforms the legacy denormalized `plumbers` table into a graph-first entity model with:
- Normalized services and service areas
- Status-driven publish workflow (draft → pending → published)
- Credential verification tracking
- Structured business hours

**Safety:** Legacy `plumbers` table remains intact. All new tables created alongside.

---

## Migration Files (Apply in Order)

### 1. Create Entity Schema
**File:** `20260108_create_entity_schema.sql`

**Creates:**
- `businesses` - Core business entities with status workflow
- `service_types` - Normalized service catalog
- `service_areas` - Geographic hierarchy
- `credentials` - License tracking with verification
- `availability_windows` - Structured hours
- `business_services` / `business_service_areas` - M:M junctions

**Apply:**
```bash
supabase db push  # Applies all pending migrations
# Or manually:
psql $DATABASE_URL -f supabase/migrations/20260108_create_entity_schema.sql
```

---

### 2. Migrate Legacy Data
**File:** `20260108_migrate_legacy_data.sql`

**Transforms:**
1. Extracts unique services from TEXT[] → `service_types`
2. Extracts unique suburbs → `service_areas`
3. Migrates plumber records → `businesses` (all status='published')
4. License numbers → `credentials` (verified=false)
5. JSONB hours → structured `availability_windows`

**Apply:**
```bash
psql $DATABASE_URL -f supabase/migrations/20260108_migrate_legacy_data.sql
```

**Validation:**
```sql
SELECT
  'plumbers (legacy)' AS source,
  COUNT(*) FROM plumbers
UNION ALL
SELECT 'businesses (new)', COUNT(*) FROM businesses;
-- Should show equal counts
```

---

### 3. Create Publish Gates
**File:** `20260108_create_publish_gates.sql`

**Creates:**
- `published_businesses` view - Public query contract
- `pending_review_queue` view - Admin moderation queue
- `check_publication_requirements()` - Validation function
- `get_businesses_by_service()` / `get_businesses_by_area()` - Query functions

**Apply:**
```bash
psql $DATABASE_URL -f supabase/migrations/20260108_create_publish_gates.sql
```

**Test:**
```sql
SELECT * FROM published_businesses LIMIT 5;
SELECT * FROM get_businesses_by_area('melville');
```

---

## Post-Migration Tasks

### 1. Verify License Credentials

All migrated businesses have `credentials.verified=false`. Manual verification required:

```sql
-- Check pending credentials
SELECT
  b.slug,
  b.trading_name,
  c.credential_number
FROM businesses b
JOIN credentials c ON c.business_id = b.id
WHERE c.credential_type = 'plumbing_license'
  AND c.verified = false;

-- After manual verification against WA registry:
UPDATE credentials
SET
  verified = true,
  verified_at = NOW(),
  verification_notes = 'Verified against WA Building Services Board'
WHERE id = 'CREDENTIAL_UUID';
```

---

### 2. Fix Business Hours

Legacy JSONB parsing is best-effort. Review:

```sql
-- Businesses with incomplete hours
SELECT
  b.slug,
  b.trading_name,
  COUNT(aw.*) AS window_count
FROM businesses b
LEFT JOIN availability_windows aw ON aw.business_id = b.id
WHERE aw.is_emergency = false
GROUP BY b.id, b.slug, b.trading_name
HAVING COUNT(aw.*) < 7;
```

---

### 3. Update Placeholder Emails

Legacy allowed NULL emails. Migration created placeholders:

```sql
-- Find placeholder emails
SELECT slug, email
FROM businesses
WHERE email LIKE '%@placeholder.example.com';

-- Update with real email
UPDATE businesses
SET email = 'real@email.com'
WHERE id = 'BUSINESS_UUID';
```

---

## Validation Queries

### Check Data Integrity

```sql
-- 1. Orphaned junctions (should be 0)
SELECT COUNT(*) FROM business_services bs
WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE id = bs.business_id);

-- 2. Businesses without services (should be 0)
SELECT slug FROM businesses
WHERE NOT EXISTS (SELECT 1 FROM business_services WHERE business_id = id);

-- 3. Businesses without areas (should be 0)
SELECT slug FROM businesses
WHERE NOT EXISTS (SELECT 1 FROM business_service_areas WHERE business_id = id);
```

### Test Query Contracts

```sql
-- Published businesses view
SELECT COUNT(*) FROM published_businesses;

-- Service-scoped query
SELECT * FROM get_businesses_by_service('emergency-repairs');

-- Area-scoped query
SELECT * FROM get_businesses_by_area('melville');

-- Publication requirements check
SELECT slug, check_publication_requirements(id)
FROM businesses LIMIT 3;
```

---

## Rollback Procedure

If migration fails:

```sql
-- Drop new tables (legacy plumbers table intact)
DROP TABLE IF EXISTS business_service_areas CASCADE;
DROP TABLE IF EXISTS business_services CASCADE;
DROP TABLE IF EXISTS availability_windows CASCADE;
DROP TABLE IF EXISTS credentials CASCADE;
DROP TABLE IF EXISTS service_areas CASCADE;
DROP TABLE IF EXISTS service_types CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- Drop functions/views
DROP FUNCTION IF EXISTS check_publication_requirements CASCADE;
DROP FUNCTION IF EXISTS get_businesses_by_service CASCADE;
DROP FUNCTION IF EXISTS get_businesses_by_area CASCADE;
DROP VIEW IF EXISTS published_businesses CASCADE;
DROP VIEW IF EXISTS pending_review_queue CASCADE;
DROP VIEW IF EXISTS business_with_details CASCADE;
```

Application can continue using legacy `plumbers` table.

---

## Next Steps After Migration

1. **Update application queries** to use new schema (Phase 2)
2. **Build admin dashboard** for manual verification
3. **Monitor for 30 days** before deprecating legacy table
4. **Backup and drop** `plumbers` table when confident

See `SCHEMA_RATIONALE.md` for detailed design decisions.
