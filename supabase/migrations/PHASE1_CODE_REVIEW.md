# Phase 1 Code Review

**Migration Files:** `20260108_create_entity_schema.sql`, `20260108_migrate_legacy_data.sql`, `20260108_create_publish_gates.sql`

**Purpose:** Comprehensive inventory of all database objects added in Phase 1

---

## Tables Created (7)

### 1. `businesses`
**Columns:**
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `slug` VARCHAR(255) UNIQUE NOT NULL
- `legal_name` VARCHAR(255) NOT NULL
- `trading_name` VARCHAR(255) NOT NULL
- `description` TEXT
- `phone` VARCHAR(20) NOT NULL
- `email` VARCHAR(255) NOT NULL ⚠️ **ISSUE: Should be nullable**
- `website` VARCHAR(255)
- `street_address` TEXT
- `postal_code` VARCHAR(10)
- `status` VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'suspended'))
- `owner_user_id` UUID
- `verified_at` TIMESTAMP WITH TIME ZONE
- `verified_by_user_id` UUID
- `published_at` TIMESTAMP WITH TIME ZONE
- `rating` DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5)
- `review_count` INTEGER DEFAULT 0 CHECK (review_count >= 0)
- `years_experience` INTEGER CHECK (years_experience >= 0)
- `hero_image` TEXT
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL

**Indexes:**
- `idx_businesses_slug` ON (slug)
- `idx_businesses_status` ON (status)
- `idx_businesses_status_published` ON (status) WHERE status = 'published' (partial)
- `idx_businesses_rating` ON (rating DESC) WHERE status = 'published' (partial)
- `idx_businesses_created_at` ON (created_at DESC)

**Triggers:**
- `update_businesses_updated_at` BEFORE UPDATE → calls `update_updated_at_column()`

**RLS:**
- Enabled: YES
- Policies: `public_read_published_businesses` (SELECT WHERE status='published')

**Migration Behavior:**
- ⚠️ **ISSUE:** Sets all migrated businesses to `status='published'`
- ⚠️ **ISSUE:** Generates placeholder emails `{phone}@placeholder.example.com` for NULL emails

---

### 2. `service_types`
**Columns:**
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `slug` VARCHAR(100) UNIQUE NOT NULL
- `name` VARCHAR(255) NOT NULL
- `description` TEXT
- `category` VARCHAR(100)
- `display_order` INTEGER DEFAULT 0
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL

**Indexes:**
- `idx_service_types_slug` ON (slug)
- `idx_service_types_category` ON (category)

**RLS:**
- Enabled: YES
- Policies: `public_read_service_types` (SELECT USING true)

**Migration Behavior:**
- Extracts unique services from `plumbers.services TEXT[]`
- Creates slugs via `lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))`
- Infers category via CASE (emergency, installation, repair, maintenance, general)

---

### 3. `service_areas`
**Columns:**
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `parent_id` UUID REFERENCES service_areas(id) ON DELETE SET NULL
- `area_type` VARCHAR(20) NOT NULL DEFAULT 'suburb' CHECK (area_type IN ('region', 'locality', 'suburb'))
- `name` VARCHAR(255) NOT NULL
- `slug` VARCHAR(100) UNIQUE NOT NULL
- `state` VARCHAR(3) DEFAULT 'WA'
- `postcode` VARCHAR(10)
- `path` TEXT
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL

**Indexes:**
- `idx_service_areas_slug` ON (slug)
- `idx_service_areas_parent` ON (parent_id)
- `idx_service_areas_type` ON (area_type)

**RLS:**
- Enabled: YES
- Policies: `public_read_service_areas` (SELECT USING true)

**Migration Behavior:**
- Extracts unique suburbs from `plumbers.suburb`
- All rows: `area_type='suburb'`, `parent_id=NULL`, `state='WA'`

---

### 4. `credentials`
**Columns:**
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `business_id` UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
- `credential_type` VARCHAR(50) NOT NULL CHECK (credential_type IN ('plumbing_license', 'gas_license', 'electrical_license', 'insurance_liability', 'insurance_workers_comp'))
- `credential_number` VARCHAR(100) NOT NULL
- `issuing_authority` VARCHAR(255)
- `verified` BOOLEAN DEFAULT false NOT NULL
- `verified_at` TIMESTAMP WITH TIME ZONE
- `verified_by_user_id` UUID
- `verification_notes` TEXT
- `issued_at` DATE
- `expires_at` DATE
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL

**Indexes:**
- `idx_credentials_business` ON (business_id)
- `idx_credentials_verified` ON (verified)
- `idx_credentials_type` ON (credential_type)
- `idx_credentials_expires` ON (expires_at) WHERE expires_at IS NOT NULL (partial)

**Triggers:**
- `update_credentials_updated_at` BEFORE UPDATE → calls `update_updated_at_column()`

**RLS:**
- Enabled: YES
- Policies: NONE (no public read access - implicitly denied)

**Migration Behavior:**
- Extracts `plumbers.license_number` → creates credentials with `type='plumbing_license'`
- Sets `verified=false`, `issuing_authority='WA Building Services Board'`
- Adds note: "Migrated from legacy plumbers.license_number - requires verification"

---

### 5. `availability_windows`
**Columns:**
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `business_id` UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
- `day_of_week` INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6)
- `open_time` TIME
- `close_time` TIME
- `is_emergency` BOOLEAN DEFAULT false NOT NULL
- `effective_from` DATE
- `effective_until` DATE
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL

**Indexes:**
- `idx_availability_business` ON (business_id)
- `idx_availability_day` ON (day_of_week)
- `idx_availability_emergency` ON (is_emergency) WHERE is_emergency = true (partial)

**RLS:**
- Enabled: YES
- Policies: `public_read_availability_published` (SELECT WHERE business is published)

**Migration Behavior:**
- Parses `plumbers.business_hours` JSONB → extracts day-of-week + hours text
- ⚠️ **ISSUE:** Regex parsing `(\d{1,2}):(\d{2})\s*(AM|PM)` may create invalid windows
- ⚠️ **ISSUE:** No preservation of raw hours text for failed parses
- If `plumbers.emergency_available=true`, creates 7 rows (all days) with `is_emergency=true`, `00:00-23:59`

---

### 6. `business_services` (Junction Table)
**Columns:**
- `business_id` UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
- `service_type_id` UUID NOT NULL REFERENCES service_types(id) ON DELETE CASCADE
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
- PRIMARY KEY (business_id, service_type_id)

**Indexes:**
- `idx_business_services_business` ON (business_id)
- `idx_business_services_service` ON (service_type_id)

**RLS:**
- Enabled: YES
- Policies: `public_read_business_services_published` (SELECT WHERE business is published)

**Migration Behavior:**
- Unnests `plumbers.services TEXT[]` → joins to `service_types` by name
- Creates junction rows

---

### 7. `business_service_areas` (Junction Table)
**Columns:**
- `business_id` UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
- `service_area_id` UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
- PRIMARY KEY (business_id, service_area_id)

**Indexes:**
- `idx_business_service_areas_business` ON (business_id)
- `idx_business_service_areas_area` ON (service_area_id)

**RLS:**
- Enabled: YES
- Policies: `public_read_business_service_areas_published` (SELECT WHERE business is published)

**Migration Behavior:**
- Maps `plumbers.suburb` → `service_areas` by name
- Creates junction rows

---

## Functions Created (4)

### 1. `update_updated_at_column()`
**Type:** Trigger function
**Language:** plpgsql
**Returns:** TRIGGER
**Purpose:** Auto-update `updated_at` column on row modification
**Used By:** `businesses`, `credentials`

---

### 2. `check_publication_requirements(p_business_id UUID)`
**Type:** Validation function
**Language:** plpgsql
**Returns:** JSONB
**Stability:** STABLE

**Logic:**
- Checks: verified plumbing license exists
- Checks: ≥1 service defined
- Checks: ≥1 service area defined
- Checks: required fields (legal_name, trading_name, phone, email, description)

**Returns:**
```json
{
  "eligible": boolean,
  "errors": ["error1", "error2"],
  "requirements": {
    "verified_license": boolean,
    "has_services": boolean,
    "has_service_areas": boolean,
    "required_fields_complete": boolean
  }
}
```

---

### 3. `get_businesses_by_service(p_service_slug VARCHAR)`
**Type:** Query contract
**Language:** sql
**Returns:** TABLE (id, slug, trading_name, description, phone, email, rating, review_count, emergency_available, hero_image, service_areas[])
**Stability:** STABLE

**Logic:**
- Queries `published_businesses` view
- Filters by service slug via subquery on `service_types` + `business_services`
- Sorts by rating DESC, review_count DESC

**Grants:** EXECUTE TO anon, authenticated

---

### 4. `get_businesses_by_area(p_area_slug VARCHAR)`
**Type:** Query contract
**Language:** sql
**Returns:** TABLE (id, slug, trading_name, description, phone, email, rating, review_count, emergency_available, hero_image, services[])
**Stability:** STABLE

**Logic:**
- Queries `published_businesses` view
- Filters by area slug via subquery on `service_areas` + `business_service_areas`
- Sorts by rating DESC, review_count DESC

**Grants:** EXECUTE TO anon, authenticated

---

## Views Created (3)

### 1. `published_businesses`
**Type:** Public query contract view
**Base Query:**
- FROM `businesses` (WHERE status='published')
- LEFT JOIN `business_services` → `service_types`
- LEFT JOIN `business_service_areas` → `service_areas`
- Aggregates services → TEXT[] array
- Aggregates service_areas → TEXT[] array
- Derives `emergency_available` via EXISTS check on `availability_windows` WHERE `is_emergency=true` ⚠️ **ISSUE: Should be capability-based, not time-based**

**Columns Returned:**
- id, slug, legal_name, trading_name, description, phone, email, website, street_address
- rating, review_count, years_experience, hero_image, published_at, created_at
- services TEXT[] (aggregated)
- service_areas TEXT[] (aggregated)
- emergency_available BOOLEAN (derived)
- is_verified BOOLEAN (verified_at IS NOT NULL)
- verified_credentials_count INTEGER

**Grants:** SELECT TO anon, authenticated

---

### 2. `pending_review_queue`
**Type:** Admin moderation queue view
**Base Query:**
- FROM `businesses` WHERE status='pending_review'
- LEFT JOIN `credentials` WHERE verified=false
- Aggregates unverified credentials → JSON array
- Includes service/area counts
- Includes publication check result (via `check_publication_requirements()`)

**Columns Returned:**
- id, slug, legal_name, trading_name, phone, email, status, submitted_at (created_at)
- credentials JSON array
- service_count, area_count
- publication_check JSONB

**Grants:** NONE (service role only)

**Sort:** created_at ASC (oldest first)

---

### 3. `business_with_details`
**Type:** Complete entity view (admin/owner)
**Base Query:**
- FROM `businesses` (all statuses)
- LEFT JOIN all relationships (services, areas, credentials, availability_windows)
- Aggregates all relationships → JSON arrays

**Columns Returned:**
- All `businesses` columns
- services JSON array (structured with id, slug, name, category)
- service_areas JSON array (structured with id, slug, name, area_type, postcode)
- credentials JSON array (structured with id, type, number, verified, verified_at, expires_at)
- availability_windows JSON array (structured with day_of_week, open_time, close_time, is_emergency)

**Grants:** NONE (service role only)

---

## RLS Policies Summary

### Public Read Policies (anon, authenticated)

| Table | Policy Name | Logic |
|-------|-------------|-------|
| `businesses` | `public_read_published_businesses` | `status = 'published'` |
| `service_types` | `public_read_service_types` | `true` (all rows) |
| `service_areas` | `public_read_service_areas` | `true` (all rows) |
| `availability_windows` | `public_read_availability_published` | Business is published (EXISTS subquery) |
| `business_services` | `public_read_business_services_published` | Business is published (EXISTS subquery) |
| `business_service_areas` | `public_read_business_service_areas_published` | Business is published (EXISTS subquery) |
| `credentials` | NONE | Implicitly denied (no public access) |

### Write Policies (INSERT/UPDATE/DELETE)

**All tables:** NO policies defined for anon/authenticated → implicitly denied

**Service role:** Bypasses RLS entirely (has GRANT ALL)

✅ **Admin path clear:** Service role can perform all verification and status updates

---

## GRANTs Summary

### anon, authenticated
- SELECT on: `businesses`, `service_types`, `service_areas`, `availability_windows`, `business_services`, `business_service_areas`
- SELECT on views: `published_businesses`
- EXECUTE on functions: `get_businesses_by_service`, `get_businesses_by_area`

### service_role
- ALL ON ALL TABLES IN SCHEMA public
- ALL ON ALL SEQUENCES IN SCHEMA public

---

## Migration Data Transformations

### Step 1: Service Types
- Source: `plumbers.services TEXT[]`
- Transform: `unnest()` → deduplicate → create slugs → infer category
- Result: ~15-20 `service_types` rows

### Step 2: Service Areas
- Source: `plumbers.suburb VARCHAR(100)`
- Transform: Extract unique → create slugs → set type='suburb'
- Result: 3 `service_areas` rows (Melville, Myaree, Booragoon)

### Step 3: Businesses
- Source: `plumbers` table (all rows)
- Transform: Map columns (name→legal_name/trading_name, etc.)
- ⚠️ **ISSUE:** Sets `status='published'` (should be 'pending_review')
- ⚠️ **ISSUE:** Generates `email = phone || '@placeholder.example.com'` for NULL emails
- Default: `verified_at=NOW()`, `published_at=created_at`

### Step 4: Credentials
- Source: `plumbers.license_number` (WHERE NOT NULL)
- Transform: Create `credential_type='plumbing_license'`
- Sets: `verified=false`, needs manual verification

### Step 5: Availability Windows (Regular Hours)
- Source: `plumbers.business_hours JSONB`
- Transform: `jsonb_each_text()` → parse day names → regex extract times
- ⚠️ **ISSUE:** Regex parsing may fail, creates `09:00-17:00` defaults on failure
- ⚠️ **ISSUE:** No preservation of raw hours for failed parses

### Step 6: Availability Windows (Emergency)
- Source: `plumbers.emergency_available BOOLEAN`
- Transform: If true, create 7 rows (days 0-6) with `is_emergency=true`, `00:00-23:59`
- ⚠️ **ISSUE:** Creates time-range windows, but emergency should be capability flag only

### Step 7: Business Services Junction
- Source: `plumbers.services TEXT[]`
- Transform: `unnest()` → join to `service_types.name` → create junction rows

### Step 8: Business Service Areas Junction
- Source: `plumbers.suburb VARCHAR(100)`
- Transform: Join to `service_areas.name` → create junction rows

---

## Critical Issues Identified

### 1. ⚠️ Business Status (CRITICAL)
**Location:** `20260108_migrate_legacy_data.sql` line ~60
**Issue:** All migrated businesses set to `status='published'`
**Should be:** `status='pending_review'` (or 'draft')
**Impact:** Bypasses verification workflow, all legacy businesses immediately public

---

### 2. ⚠️ Placeholder Emails (VIOLATION)
**Location:** `20260108_migrate_legacy_data.sql` line ~65
**Issue:** Generates `phone || '@placeholder.example.com'` for NULL emails
**Should be:** Leave `email=NULL` (requires changing column to nullable)
**Impact:** Database contains fake email addresses

---

### 3. ⚠️ Emergency Availability Logic (MISALIGNMENT)
**Location:** `20260108_create_publish_gates.sql` (published_businesses view)
**Issue:** View uses `EXISTS (... WHERE is_emergency=true)` which is time-agnostic but implies windowing
**Should be:** Pure capability flag OR existence of any emergency window (current logic is actually correct, but migration creates time-based windows)
**Impact:** Migration creates `00:00-23:59` windows, suggesting time-based logic when it should be capability-only

---

### 4. ⚠️ Business Hours Parsing (DATA QUALITY)
**Location:** `20260108_migrate_legacy_data.sql` lines ~120-150
**Issue:** Regex parsing with fallback defaults (`09:00-17:00`) masks parsing failures
**Should be:** Conservative parsing, NULL if uncertain, preserve raw data
**Impact:** Invalid/uncertain hours stored as default 9-5, original data lost

---

### 5. ⚠️ Email Column Constraint
**Location:** `20260108_create_entity_schema.sql` line ~27
**Issue:** `email VARCHAR(255) NOT NULL`
**Should be:** `email VARCHAR(255)` (nullable)
**Impact:** Forces placeholder emails in migration

---

## Validation Concerns

**After migration, need to verify:**
1. Zero businesses with `status='published'` unless `credentials.verified=true`
2. Zero placeholder emails in `businesses.email`
3. Emergency flag is capability-based (not time-checked)
4. No invalid hours windows (open_time >= close_time, NULL for uncertain parses)
5. All businesses have ≥1 service and ≥1 service area

---

## Summary Statistics (Expected After Migration)

| Object Type | Count |
|-------------|-------|
| Tables | 7 |
| Indexes | 22 |
| Views | 3 |
| Functions | 4 |
| RLS Policies | 6 (read-only for public) |
| Triggers | 2 (auto-update timestamps) |
| Migrated businesses | 24 |
| Service types | ~15-20 |
| Service areas | 3 |
| Credentials | ~20-24 |
| Availability windows | ~200+ |

---

## Next Action Required

**Corrective migration file needed** to fix:
1. Change `businesses.email` to nullable
2. Update all migrated businesses to `status='pending_review'`
3. Remove placeholder emails (set to NULL)
4. Add column to preserve raw business hours for manual review
5. Clarify emergency availability as capability (update docs/comments if needed)
