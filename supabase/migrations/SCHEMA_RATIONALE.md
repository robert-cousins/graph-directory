# Database Schema Rationale

**Migration Date:** 2026-01-08
**Purpose:** Entity-centric relational model for graph-first directory
**Scope:** Phase 1 - v1 implementation (manual verification, suburbs only)

---

## Design Principles

### 1. Entity-Centric Modeling
- **Rationale:** "Graph-first" means explicit entities with normalized relationships, not denormalized keyword bags
- **Implementation:** Normalized tables with junction tables for M:M relationships
- **Benefit:** Clean separation of concerns, extensible to other trades without schema redesign

### 2. Explicit Query Contracts
- **Rationale:** Pages query predefined database views/functions, not ad-hoc application logic
- **Implementation:** Views (`published_businesses`, `pending_review_queue`) and functions (`get_businesses_by_service`)
- **Benefit:** Database enforces business logic; application becomes thin presentation layer

### 3. Status-Driven Publishing
- **Rationale:** Businesses must be verified before appearing in public directory
- **Implementation:** `status` column with CHECK constraint + RLS policies filtering on `status='published'`
- **Benefit:** Publish gates enforced at database level, impossible to bypass from application code

### 4. Minimal v1 Scope
- **Rationale:** Build foundation for future features without implementing everything now
- **Implementation:** Schema supports hierarchies/automation, but v1 uses manual verification and flat suburbs
- **Benefit:** Low-risk initial deployment with clear extension path

---

## Table Rationale

### `businesses`
**Purpose:** Core entity representing verified plumbing businesses

**Key Design Decisions:**

| Column/Constraint | Rationale |
|-------------------|-----------|
| `UUID PRIMARY KEY` | UUIDs avoid ID enumeration attacks, support distributed systems, prevent business count inference |
| `slug UNIQUE` | SEO-friendly URLs (`/plumber/melville-master-plumbers`), human-readable, shareable |
| `legal_name` + `trading_name` | Legal compliance (invoicing, contracts) vs. customer-facing branding |
| `status CHECK (...)` | Enforces workflow states at DB level; impossible to have invalid status |
| `status DEFAULT 'draft'` | New businesses start unpublished, require explicit progression through workflow |
| `owner_user_id` nullable | v1 has no authentication, but FK prepared for future owner portal |
| `verified_at` + `verified_by_user_id` | Audit trail: who verified this business and when |
| `published_at` | Track when business went live (analytics, sorting by "recently added") |
| `rating` + `review_count` | Temporary: migrated from legacy, will move to separate `reviews` table in v2 |
| `years_experience` | Trust signal for users, optional field |
| `updated_at` trigger | Automatic timestamp maintenance prevents stale data |

**Why NOT use SERIAL ID:**
- Legacy `plumbers.id` was SERIAL (1, 2, 3...) which leaks business count to competitors
- UUIDs are opaque, non-sequential, distributed-safe

**Why separate legal_name and trading_name:**
- Legal name required for verification against business registry
- Trading name is customer-facing display name (can differ, e.g., "ABC Plumbing Pty Ltd" vs "ABC Plumbing")

---

### `service_types`
**Purpose:** Normalized catalog of plumbing services

**Key Design Decisions:**

| Column/Constraint | Rationale |
|-------------------|-----------|
| Separate table (not TEXT[]) | Enables service-scoped pages (`/plumbers/emergency-repairs`), consistent taxonomy, admin-managed catalog |
| `slug UNIQUE` | SEO-friendly service URLs, e.g., `/plumbers/emergency-repairs/melville` |
| `category` column | Grouping services (emergency, installation, repair) for UI navigation and filtering |
| `display_order` | Admin-controlled sort order for UI dropdowns and navigation menus |

**Why NOT TEXT[] array:**
- Legacy `plumbers.services` had inconsistencies: "Emergency Repairs" vs "Emergency Services" vs "Emergency Plumbing"
- Free-text arrays prevent faceted filtering, SEO service pages, taxonomy control
- Normalized table allows adding descriptions, pricing tiers, service certifications later

**Migration strategy:**
- Extract unique services from legacy TEXT[] arrays
- Deduplicate via slug (handles "Emergency Repairs" and "emergency-repairs" as same)
- Admin can merge/rename services post-migration

---

### `service_areas`
**Purpose:** Geographic hierarchy (v1: suburbs only)

**Key Design Decisions:**

| Column/Constraint | Rationale |
|-------------------|-----------|
| `parent_id` self-referencing FK | Supports future hierarchy (suburb → locality → region), unused in v1 |
| `area_type CHECK (...)` | Explicitly typed geography prevents ambiguity |
| `slug UNIQUE` | SEO-friendly area URLs, e.g., `/plumbers/melville` |
| `path` materialized | Future: ancestor queries without recursive CTEs (e.g., "perth-metro/perth-south/melville") |
| `state` + `postcode` | Supports multi-state expansion, postcode radius queries (future) |

**Why hierarchical schema in v1:**
- v1 only uses suburbs (Melville, Myaree, Booragoon), but schema prepared for expansion
- When v2 adds "Perth South" or "Perth Metro" groupings, no schema migration required
- `parent_id` NULL in v1, populated in v2

**Why NOT flat suburb table:**
- Flat table would require schema change when adding regions/localities
- Hierarchy enables rollup queries: "businesses serving Perth South" = all suburbs under that parent

---

### `credentials`
**Purpose:** Track business licenses and certifications with verification status

**Key Design Decisions:**

| Column/Constraint | Rationale |
|-------------------|-----------|
| Separate table (not column) | Business may have multiple credentials (plumbing license, gas license, insurance) |
| `credential_type CHECK (...)` | Explicit enum prevents typos, enables type-specific validation logic |
| `verified` boolean | v1: manual admin approval; v2: API validation against WA Building Services Board |
| `verified_by_user_id` | Audit trail: which admin approved this credential |
| `expires_at` | Businesses with expired licenses should auto-suspend (future cron job) |
| `verification_notes` | Admin notes field for manual review findings |

**Why separate table:**
- Legacy `plumbers.license_number` was single column, limiting to one credential type
- Separate table supports multiple credentials (gas license, electrical, insurance certificates)
- Enables credential-specific expiry tracking and renewal workflows

**v1 vs v2 verification:**
- v1: Admin manually checks license number against WA registry, sets `verified=true`
- v2: API integration auto-validates against government registry

---

### `availability_windows`
**Purpose:** Structured business hours (regular + emergency)

**Key Design Decisions:**

| Column/Constraint | Rationale |
|-------------------|-----------|
| Structured table (not JSONB) | Enables time-based queries ("open now"), prevents parsing errors |
| `day_of_week` 0-6 | Integer for easy "current day" filtering (`EXTRACT(DOW FROM NOW())`) |
| `open_time` + `close_time` TIME | Proper time type allows range queries, prevents "9am" vs "09:00" inconsistencies |
| `is_emergency` boolean | Separates regular hours from emergency availability windows |
| `effective_from` + `effective_until` | Future: holiday hours, temporary closures (unused in v1) |

**Why NOT JSONB:**
- Legacy `business_hours` JSONB had inconsistent formats: `{"monday": "9am-5pm"}` vs `{"Monday": "9:00 AM - 5:00 PM"}`
- Parsing free-text time ranges is fragile and error-prone
- Structured times enable queries like "businesses open right now"

**Emergency availability:**
- v1: Boolean capability ("offers 24/7 emergency service")
- Implementation: Create 7 rows (one per day) with `is_emergency=true`, `00:00-23:59`
- Future: Could support emergency-only hours (e.g., "emergency calls 6pm-8am only")

---

### `business_services` (Junction Table)
**Purpose:** M:M relationship between businesses and service types

**Key Design Decisions:**

| Column/Constraint | Rationale |
|-------------------|-----------|
| Composite PRIMARY KEY | Enforces one row per (business, service) pair, prevents duplicates |
| ON DELETE CASCADE | If business deleted, junction rows auto-delete (referential integrity) |
| No additional columns | Pure junction table; service pricing/descriptions belong in separate table if needed |

**Why M:M:**
- One business offers many services (e.g., "Emergency Repairs", "Blocked Drains", "Hot Water")
- One service offered by many businesses (many plumbers do "Leak Detection")
- M:M junction is canonical relational design for this relationship

**Migration strategy:**
- Legacy `plumbers.services` TEXT[] → unnest into rows
- Join on `service_types.name` to get normalized IDs
- Handles duplicates gracefully (ON CONFLICT DO NOTHING)

---

### `business_service_areas` (Junction Table)
**Purpose:** M:M relationship between businesses and service areas

**Key Design Decisions:**

| Column/Constraint | Rationale |
|-------------------|-----------|
| Composite PRIMARY KEY | One row per (business, area) pair |
| ON DELETE CASCADE | Referential integrity |

**Why M:M:**
- One business serves many suburbs (e.g., "We serve Melville, Myaree, and Booragoon")
- One suburb served by many businesses (competitive directory)

**v1 simplification:**
- Legacy had `suburb` single column → migrate to junction with one row per business
- v2 will allow businesses to select multiple suburbs from list

---

## Constraints Rationale

### CHECK Constraints

| Constraint | Table | Rationale |
|------------|-------|-----------|
| `status IN (...)` | businesses | Finite state machine enforced at DB level; application cannot save invalid state |
| `rating 0-5` | businesses | Star rating scale validation, prevents negative or >5 values |
| `review_count >= 0` | businesses | Prevents negative review counts (data integrity) |
| `credential_type IN (...)` | credentials | Explicit enum prevents typos, enables type-specific logic |
| `day_of_week 0-6` | availability_windows | Sunday=0, Saturday=6 (PostgreSQL convention) |

**Why CHECK vs application validation:**
- Database enforces constraints even if application bypassed (API, SQL console, batch scripts)
- Single source of truth for business rules
- Prevents data corruption from future code bugs

### Foreign Key Constraints

**All FK constraints use `ON DELETE CASCADE`:**
- Rationale: If business deleted, orphan credentials/hours/junctions have no meaning
- Benefit: Prevents orphan data, simplifies deletion logic

**Why `parent_id` uses `ON DELETE SET NULL`:**
- Rationale: If region deleted (e.g., "Perth South"), suburbs don't disappear—they become top-level
- Benefit: Prevents cascading deletes destroying entire geographic hierarchy

### UNIQUE Constraints

| Constraint | Table | Rationale |
|------------|-------|-----------|
| `slug UNIQUE` | businesses, service_types, service_areas | URL uniqueness, SEO-friendly paths |

**Why slug uniqueness matters:**
- Prevents routing conflicts (`/plumber/melville-plumbing` must resolve to exactly one business)
- Enforces canonical URLs for SEO (no duplicate pages)

---

## Indexes Rationale

### Single-Column Indexes

| Index | Table | Rationale |
|-------|-------|-----------|
| `idx_businesses_slug` | businesses | Most common query: detail page by slug (`/plumber/[slug]`) |
| `idx_businesses_status` | businesses | Admin dashboard filters by status ("show pending") |
| `idx_businesses_status_published` (partial) | businesses | 99% of queries want `status='published'`, partial index shrinks size |
| `idx_businesses_rating` | businesses | Sorting by "highest rated" (directory listing default sort) |

**Why partial index on `status='published'`:**
- 95% of rows will be `status='published'` in production
- Partial index only includes published rows, making it 20x smaller
- Queries with `WHERE status='published'` use smaller, faster index

### Composite Indexes

| Index | Table | Rationale |
|-------|-------|-----------|
| None in v1 | - | Single-column indexes sufficient for v1 query patterns |

**Future composite indexes (v2):**
- `(service_area_id, rating DESC)` for "highest-rated in suburb X"
- `(credential_type, verified, expires_at)` for expiry monitoring

### GIN Indexes (Legacy)

**Not used in new schema:**
- Legacy had GIN on `services TEXT[]` for array overlap queries
- New schema uses junction table with standard B-tree indexes (more efficient)

---

## Row Level Security (RLS) Rationale

### Public Read Policies

| Policy | Table | Logic | Rationale |
|--------|-------|-------|-----------|
| `public_read_published_businesses` | businesses | `status='published'` | Only verified businesses visible to public |
| `public_read_service_types` | service_types | `true` | Service catalog is public information |
| `public_read_service_areas` | service_areas | `true` | Geographic data is public |
| `public_read_availability_published` | availability_windows | Business is published | Hours only visible for published businesses |

**Why filter on `status='published'`:**
- Draft/pending businesses are work-in-progress, shouldn't leak to public
- RLS enforces at database level (even if app queries `SELECT * FROM businesses`)

**Why no policy = deny:**
- `credentials` table has NO public read policy → implicitly denied
- Rationale: License numbers are sensitive, only admin should see

### No Public Write Policies

**All tables block INSERT/UPDATE/DELETE for `anon` and `authenticated` roles:**
- Rationale: All mutations go through service role (admin operations)
- v1: No user authentication, no self-service editing
- v2: Will add RLS for business owners (`UPDATE WHERE owner_user_id = auth.uid()`)

**Why service role only:**
- Prevents malicious users from bypassing application validation
- Admin dashboard uses service role key, full control
- Application cannot accidentally expose write access

---

## Views and Functions Rationale

### `published_businesses` View

**Purpose:** Primary query contract for public directory

**Why a view:**
- Encapsulates join logic (businesses + services + areas)
- Application queries view, not raw tables
- Can change underlying schema without breaking application queries

**What it aggregates:**
- Services → TEXT[] array (compatibility with legacy code)
- Service areas → TEXT[] array
- Emergency availability → derived boolean from `availability_windows`

**Performance:**
- View is not materialized (always current)
- Backed by indexes on `status`, `rating`, `slug`

---

### `check_publication_requirements` Function

**Purpose:** Validation gate for publishing workflow

**What it checks:**
1. Verified plumbing license exists
2. At least one service defined
3. At least one service area defined
4. Required fields populated (name, phone, email, description)

**Returns JSONB:**
```json
{
  "eligible": true,
  "errors": [],
  "requirements": {
    "verified_license": true,
    "has_services": true,
    "has_service_areas": true,
    "required_fields_complete": true
  }
}
```

**Why JSONB return:**
- Rich error messages for admin UI ("Missing verified license")
- Structured data easy to parse in application code
- Extensible (can add new requirements without changing function signature)

**Who calls this:**
- Admin dashboard: "Can I publish this business?"
- Business owner portal (v2): "What's blocking my publication?"

---

### `pending_review_queue` View

**Purpose:** Admin dashboard view of businesses awaiting verification

**Why a view:**
- Aggregates business + credentials for single-query admin page load
- Sorted by oldest first (FIFO queue)
- Includes publication check results inline

**Not accessible to public:**
- No GRANT statement → service role only
- Contains unverified license numbers (sensitive)

---

### `get_businesses_by_service` / `get_businesses_by_area` Functions

**Purpose:** Query contracts for faceted directory pages

**Why functions not views:**
- Parameterized (take service/area slug as input)
- Can be called from application code with dynamic slug
- Return type matches `published_businesses` structure

**URL mapping examples:**
- `/plumbers/emergency-repairs` → `SELECT * FROM get_businesses_by_service('emergency-repairs')`
- `/plumbers/melville` → `SELECT * FROM get_businesses_by_area('melville')`

**Performance:**
- Functions return pre-filtered, pre-sorted results
- Application doesn't filter in code; database does heavy lifting

---

## Migration Strategy Rationale

### Why Keep Legacy `plumbers` Table

**Decision:** Migration does NOT drop legacy table

**Rationale:**
1. **Safety:** Can rollback by switching application to query old table
2. **Comparison:** Can validate new schema against legacy data
3. **Gradual cutover:** Application can read from both tables during transition
4. **Audit:** Preserve original data for forensics if migration has bugs

**When to drop:**
- After v1 deployed to production successfully
- After 30-day monitoring period confirms no data loss
- After exporting legacy table to backup storage

### Migration Order

**Why this sequence:**

1. **Schema creation** (20260108_create_entity_schema.sql)
   - Creates empty tables with constraints
   - No data dependencies

2. **Data migration** (20260108_migrate_legacy_data.sql)
   - Populates tables from legacy data
   - Requires schema to exist first

3. **Publish gates** (20260108_create_publish_gates.sql)
   - Creates views/functions
   - Requires tables populated with data

**Why separate files:**
- Each can be rolled back independently
- Clear separation of concerns (DDL vs DML vs query logic)
- Re-runnable (uses `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)

---

## Future Extensions

### Prepared But Unused in v1

| Feature | Schema Support | v1 Status |
|---------|----------------|-----------|
| Geographic hierarchy | `parent_id`, `area_type`, `path` columns exist | Unused; only suburbs |
| Automated verification | `verified_by_user_id` tracks who verified | Manual admin only |
| User authentication | `owner_user_id` FK prepared | Nullable; no auth in v1 |
| Holiday hours | `effective_from/until` on availability | Unused; only recurring hours |
| Gas/electrical licenses | `credential_type` enum includes them | Only plumbing license verified |

### Extension Path (v2 and beyond)

**No schema changes required for:**
1. Adding ABN verification (new row in `credentials` table with `type='abn'`)
2. Adding insurance tracking (new row with `type='insurance_liability'`)
3. Business owner self-service (populate `owner_user_id`, add RLS for updates)
4. Regional rollups (populate `parent_id` on service_areas, query via path)
5. Multi-state expansion (add rows to `service_areas` with `state='NSW'`)

**Schema changes required for:**
1. Reviews (new `reviews` table with FK to `businesses`)
2. Photos/galleries (new `business_photos` table)
3. Bookings/scheduling (new `bookings`, `appointments` tables)

---

## Summary

This schema balances v1 simplicity with long-term extensibility:

- **Normalized tables** replace denormalized arrays (services, areas)
- **Status-driven workflow** enforces publish gates at database level
- **Views and functions** define explicit query contracts
- **Prepared for future** (hierarchies, auth, automation) without over-engineering v1

Key constraint: **v1 remains minimal** (manual verification, suburbs only) while schema supports **v2 automation** without migration pain.
