# Phase 1 Corrections Summary

## Critical Issues Identified and Fixed

### Issue 1: Businesses Auto-Published Without Verification ❌ → ✅
**Problem:** Migration set `status='published'` for all legacy businesses
**Impact:** Bypassed verification workflow, all 24 businesses immediately public
**Fix:**
- Corrective migration sets all to `status='pending_review'`
- Clears `verified_at` and `published_at` timestamps
- Requires manual license verification before publishing

**Files:**
- `20260109_phase1_corrections.sql` (lines 26-35)
- `20260108_migrate_legacy_data_CORRECTED.sql` (lines 79-81)

---

### Issue 2: Placeholder Emails Generated ❌ → ✅
**Problem:** Migration created fake emails like `0412345678@placeholder.example.com`
**Impact:** Database contaminated with invalid email addresses
**Fix:**
- Made `businesses.email` nullable (ALTER COLUMN DROP NOT NULL)
- Removed all placeholder emails (UPDATE SET NULL)
- Corrected migration preserves NULL emails from legacy data

**Files:**
- `20260109_phase1_corrections.sql` (lines 11-15, 36-41)
- `20260108_migrate_legacy_data_CORRECTED.sql` (line 71)

---

### Issue 3: Emergency Availability Time-Based Logic ❌ → ✅
**Problem:** Migration created `00:00-23:59` time windows for emergency service
**Impact:** Implied time-based "available now" logic instead of capability flag
**Fix:**
- Corrected migration creates emergency windows with NULL day/time fields
- `is_emergency=true` with NULL times = "offers emergency service" (capability)
- Updated view comment to clarify capability-based derivation

**Files:**
- `20260109_phase1_corrections.sql` (line 171)
- `20260108_migrate_legacy_data_CORRECTED.sql` (lines 155-170)

---

### Issue 4: Non-Conservative Hours Parsing ❌ → ✅
**Problem:** Regex parsing with `09:00-17:00` fallback defaults masked failures
**Impact:** Original hours data lost, invalid default hours stored
**Fix:**
- Added `raw_business_hours` JSONB column to preserve original data
- Corrected migration only parses high-confidence formats
- Uncertain parses left NULL for manual review
- Warning notice for businesses with suspicious default hours

**Files:**
- `20260109_phase1_corrections.sql` (lines 18-23, 42-50, 174-188)
- `20260108_migrate_legacy_data_CORRECTED.sql` (lines 115-150)

---

### Issue 5: Email Required in Validation Function ❌ → ✅
**Problem:** `check_publication_requirements()` checked email IS NOT NULL
**Impact:** Function failed when email nullable
**Fix:**
- Updated function to remove email from required fields check
- Email now optional in v1 (can be added via admin later)

**Files:**
- `20260109_phase1_corrections.sql` (lines 52-130)

---

## Migration Paths

### Path A: Fresh Migration (Recommended)
Use corrected migration file from the start:

```bash
# 1. Create schema
psql $DB_URL -f supabase/migrations/20260108_create_entity_schema.sql

# 2. Use CORRECTED data migration
psql $DB_URL -f supabase/migrations/20260108_migrate_legacy_data_CORRECTED.sql

# 3. Create publish gates
psql $DB_URL -f supabase/migrations/20260108_create_publish_gates.sql
```

**Result:** All corrections applied from the start, no placeholder data.

---

### Path B: Apply Corrections to Existing Migration
If original migration already applied:

```bash
# Run corrective migration after the original sequence
psql $DB_URL -f supabase/migrations/20260109_phase1_corrections.sql
```

**Result:** Fixes applied retroactively, original migration history preserved.

---

## Validation

After applying migrations (either path), run validation queries:

```bash
psql $DB_URL -f supabase/migrations/VALIDATION_QUERIES.sql
```

**Expected results:**
1. ✅ 0 published businesses without verified credentials
2. ✅ 0 placeholder emails
3. ✅ `businesses.email` is nullable
4. ✅ Emergency windows have NULL day/time fields (capability flag)
5. ✅ No invalid hours (open_time >= close_time)
6. ✅ All businesses have ≥1 service and ≥1 service area
7. ✅ All migrated businesses in `status='pending_review'`
8. ✅ 0 orphaned junction rows
9. ✅ All businesses ineligible for publication (no verified licenses yet)
10. ✅ `raw_business_hours` preserved for manual review
11. ✅ Public cannot see pending_review businesses (RLS working)
12. ✅ Service role can update businesses

---

## Post-Correction Manual Tasks

### 1. Verify Licenses (Required)
```sql
-- Query pending credentials
SELECT
  b.slug,
  b.trading_name,
  c.credential_number
FROM businesses b
JOIN credentials c ON c.business_id = b.id
WHERE c.credential_type = 'plumbing_license'
  AND c.verified = false;

-- After manual check against WA Building Services Board:
UPDATE credentials
SET
  verified = true,
  verified_at = NOW(),
  verified_by_user_id = 'YOUR_ADMIN_USER_ID',
  verification_notes = 'Verified against WA registry on YYYY-MM-DD'
WHERE id = 'CREDENTIAL_UUID';
```

---

### 2. Fix Business Hours (Manual Review)
```sql
-- Businesses with incomplete/uncertain hours
SELECT
  slug,
  trading_name,
  raw_business_hours,
  (SELECT COUNT(*) FROM availability_windows WHERE business_id = businesses.id AND is_emergency = false) AS parsed_windows
FROM businesses
WHERE raw_business_hours IS NOT NULL
  AND (
    SELECT COUNT(*)
    FROM availability_windows
    WHERE business_id = businesses.id AND is_emergency = false
  ) < 7;  -- Less than 7 days = incomplete

-- Manually insert corrected hours:
INSERT INTO availability_windows (business_id, day_of_week, open_time, close_time, is_emergency)
VALUES ('BUSINESS_UUID', 1, '08:00', '17:00', false);  -- Monday
```

---

### 3. Add Missing Emails (Optional)
```sql
-- Businesses without email
SELECT slug, trading_name, phone
FROM businesses
WHERE email IS NULL;

-- Add email when known:
UPDATE businesses
SET email = 'realcontact@business.com.au'
WHERE id = 'BUSINESS_UUID';
```

---

### 4. Publish Verified Businesses
```sql
-- Check publication eligibility
SELECT
  slug,
  trading_name,
  check_publication_requirements(id)
FROM businesses
WHERE status = 'pending_review';

-- Publish when eligible:
UPDATE businesses
SET
  status = 'published',
  published_at = NOW()
WHERE id = 'BUSINESS_UUID'
  AND (check_publication_requirements(id)->>'eligible')::boolean = true;
```

---

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `PHASE1_CODE_REVIEW.md` | Comprehensive inventory of all database objects | ✅ Complete |
| `20260109_phase1_corrections.sql` | Corrective migration (apply after original) | ✅ Ready |
| `20260108_migrate_legacy_data_CORRECTED.sql` | Replacement data migration (use instead of original) | ✅ Ready |
| `VALIDATION_QUERIES.sql` | Post-migration verification queries | ✅ Ready |
| `README.md` | Updated with correction guidance | ✅ Updated |

---

## Summary

**Original migrations created:**
- 7 tables
- 3 views
- 4 functions
- 22 indexes
- 6 RLS policies
- 2 triggers

**Corrections applied:**
- ✅ Businesses set to `pending_review` (not published)
- ✅ Email nullable (no placeholders)
- ✅ Emergency as capability flag (not time-windowed)
- ✅ Conservative hours parsing (raw data preserved)
- ✅ Validation function updated for optional email

**Phase 1 is now aligned with approved constraints and ready for safe migration.**

---

## Recommendation

**Use Path A (fresh migration with corrected file)** for cleanest result.

If original migration already applied, use Path B (corrective migration).

Run validation queries after either path to confirm all corrections applied successfully.

**Do not proceed to Phase 2 until all validation queries pass.**
