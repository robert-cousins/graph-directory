# Architecture Overview

**Last Updated:** 2026-01-10
**Project:** Graph-First Local Business Directory
**Current Implementation:** Melville Plumbers (Demo/Testing Instance)

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Application Architecture](#application-architecture)
4. [Data Flow Patterns](#data-flow-patterns)
5. [Query Contracts](#query-contracts)
6. [Migration Status](#migration-status)
7. [Extension Points](#extension-points)

---

## System Architecture

### Design Philosophy

This project implements a **graph-first, entity-centric** directory platform where:

1. **Entity relationships are explicit** - Normalized tables with junction tables for M:M relationships
2. **Database enforces business logic** - Publishing gates, RLS policies, and validation at DB level
3. **Public contract is stable** - Application queries predefined views/functions, not base tables
4. **URL encodes state** - Filters, pagination, and sorting live in URL search params
5. **Thin application layer** - Next.js renders results; logic lives in service layer and DB

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 (App Router) | Server-first rendering, file-based routing |
| **Language** | TypeScript 5 | Type safety across frontend/backend |
| **Database** | Supabase (PostgreSQL 15+) | Relational storage with RLS |
| **UI** | Tailwind CSS 4, shadcn/ui | Component library, design system |
| **Forms** | React Hook Form + Zod | Client validation, server actions |
| **Package Manager** | pnpm | Fast, disk-efficient |
| **Deployment** | Vercel | Edge-optimized hosting |

---

## Database Schema

### Core Entities (Phase 1)

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   businesses    │       │  service_types   │       │  service_areas  │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (UUID) PK    │       │ id (UUID) PK     │       │ id (UUID) PK    │
│ slug (unique)   │       │ slug (unique)    │       │ slug (unique)   │
│ legal_name      │       │ name             │       │ name            │
│ trading_name    │       │ description      │       │ area_type       │
│ description     │       │ category         │       │ parent_id FK    │
│ phone           │       │ display_order    │       │ state           │
│ email           │       └──────────────────┘       │ postcode        │
│ website         │                │                 │ path            │
│ street_address  │                │                 └─────────────────┘
│ status ──────────────────────────┼─────────────────────────┐
│ rating          │                │                         │
│ review_count    │                │                         │
│ years_experience│                │                         │
│ hero_image      │                │                         │
│ published_at    │                │                         │
│ verified_at     │                │                         │
└─────────────────┘                │                         │
         │                         │                         │
         │                         │                         │
         ▼                         ▼                         ▼
┌────────────────────┐    ┌─────────────────┐    ┌──────────────────────┐
│ business_services  │    │  credentials    │    │ business_service_    │
├────────────────────┤    ├─────────────────┤    │      areas           │
│ business_id FK     │    │ id (UUID) PK    │    ├──────────────────────┤
│ service_type_id FK │    │ business_id FK  │    │ business_id FK       │
└────────────────────┘    │ type            │    │ service_area_id FK   │
                          │ verified        │    └──────────────────────┘
                          │ verified_at     │
                          └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │ availability_windows│
                          ├─────────────────────┤
                          │ business_id FK      │
                          │ day_of_week         │
                          │ start_time          │
                          │ end_time            │
                          │ is_emergency        │
                          └─────────────────────┘
```

### Status-Driven Publishing Workflow

```
┌─────────┐      ┌────────────────┐      ┌───────────┐      ┌───────────┐
│  draft  │─────▶│ pending_review │─────▶│ published │◀────▶│ suspended │
└─────────┘      └────────────────┘      └───────────┘      └───────────┘
   ▲                                             │
   │                                             │
   └─────────────────────────────────────────────┘
                (rejected/edit)
```

| Status | Visibility | Who Can Edit | RLS Policy |
|--------|-----------|--------------|------------|
| `draft` | Owner only | Owner | `owner_user_id = auth.uid()` |
| `pending_review` | Admin queue | Admin | Admin role only |
| `published` | Public directory | Admin (service role) | Public read access |
| `suspended` | Hidden | Admin | Admin role only |

### Key Database Constraints

```sql
-- Status workflow enforcement
CHECK (status IN ('draft', 'pending_review', 'published', 'suspended'))

-- Rating bounds
CHECK (rating >= 0 AND rating <= 5)

-- Non-negative counters
CHECK (review_count >= 0)
CHECK (years_experience >= 0)
```

### Public Query Contract: `published_businesses` View

```sql
CREATE VIEW published_businesses AS
SELECT
  b.id, b.slug, b.legal_name, b.trading_name, b.description,
  b.phone, b.email, b.website, b.street_address,
  b.rating, b.review_count, b.years_experience, b.hero_image,
  b.published_at, b.created_at,

  -- Aggregated arrays
  ARRAY_AGG(DISTINCT st.name) FILTER (WHERE st.name IS NOT NULL) AS services,
  ARRAY_AGG(DISTINCT sa.name) FILTER (WHERE sa.name IS NOT NULL) AS service_areas,

  -- Computed flags
  EXISTS(SELECT 1 FROM availability_windows aw
         WHERE aw.business_id = b.id AND aw.is_emergency = true) AS emergency_available,
  EXISTS(SELECT 1 FROM credentials c
         WHERE c.business_id = b.id AND c.verified = true) AS is_verified,
  COUNT(c.id) FILTER (WHERE c.verified = true) AS verified_credentials_count

FROM businesses b
LEFT JOIN business_services bs ON b.id = bs.business_id
LEFT JOIN service_types st ON bs.service_type_id = st.id
LEFT JOIN business_service_areas bsa ON b.id = bsa.business_id
LEFT JOIN service_areas sa ON bsa.service_area_id = sa.id
LEFT JOIN credentials c ON b.id = c.business_id

WHERE b.status = 'published'
GROUP BY b.id;
```

**Why This View Exists:**
- ✅ Guarantees only `published` businesses appear in directory
- ✅ Denormalizes M:M relationships into arrays for efficient reads
- ✅ Computes derived fields (`emergency_available`, `is_verified`) server-side
- ✅ Provides stable API contract - application doesn't need to know join logic
- ✅ Changes to underlying tables don't break application code

---

## Application Architecture

### Directory Structure

```
graph-directory/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page (search hero)
│   ├── plumbers/
│   │   ├── page.tsx              # Directory listing (server component)
│   │   ├── service/[service]/    # Service-scoped pages (/plumbers/emergency-repairs)
│   │   └── area/[area]/          # Area-scoped pages (/plumbers/melville)
│   ├── plumber/[slug]/
│   │   ├── page.tsx              # Business profile (server component)
│   │   └── edit/
│   │       ├── page.tsx          # Edit form (client component)
│   │       ├── edit-form.tsx     # Form implementation
│   │       └── actions.ts        # Server actions (service role)
│   ├── list-your-business/
│   │   ├── page.tsx              # Registration form (client component)
│   │   ├── list-business-form.tsx
│   │   └── actions.ts            # Server actions
│   ├── api/                      # API routes
│   │   ├── add-plumbers/         # Bulk operations (admin)
│   │   └── check-database/       # Health checks
│   └── admin/                    # Admin utilities
│
├── lib/                          # Service layer (DATA ACCESS BOUNDARY)
│   ├── business-service.ts       # ⭐ ALL business queries go here
│   ├── plumber-service.ts        # Legacy service (deprecated)
│   ├── directory-admin.ts        # Admin operations
│   ├── utils.ts                  # Utilities (cn, formatters)
│   └── supabase/
│       ├── client.ts             # Browser client (anon key)
│       ├── server.ts             # Server client (service role)
│       └── service-role.ts       # Service role client
│
├── components/
│   ├── plumber-card.tsx          # Listing card
│   ├── plumbers-filters.tsx      # Filter UI (client bridge component)
│   ├── filter-sidebar.tsx        # Desktop filters
│   ├── mobile-filter-menu.tsx    # Mobile filters
│   ├── header.tsx                # Site header
│   ├── breadcrumb.tsx            # Navigation breadcrumbs
│   ├── theme-provider.tsx        # Theme context provider
│   └── ui/                       # shadcn/ui primitives
│
├── types/
│   ├── business.ts               # ⭐ Core types (PublishedBusiness, filters)
│   └── plumber.ts                # Legacy types (deprecated)
│
├── supabase/migrations/          # Production migrations (apply to live DB)
│   ├── 20260108_create_entity_schema.sql
│   ├── 20260108_migrate_legacy_data.sql
│   ├── 20260108_create_publish_gates.sql
│   ├── 20260109_add_edit_tokens.sql
│   ├── SCHEMA_RATIONALE.md       # Design decisions
│   └── README.md                 # Migration guide
│
├── scripts/                      # Development/seed scripts (NOT applied to prod)
│   ├── 001_create_plumbers_table.sql
│   ├── 002_seed_plumbers_data.sql
│   └── ...
│
├── docs/                         # Architecture documentation
│   ├── 01-architecture-principles.md
│   ├── 02-graph-first-data-model.md
│   ├── 06-phase-2-application-architecture.md
│   └── ...
│
└── data/                         # Static data files
```

### Component Patterns

#### Server Components (Default)
```tsx
// app/plumber/[slug]/page.tsx
import { getPublishedBusinessBySlug } from '@/lib/business-service'

export default async function PlumberPage({ params }: { params: { slug: string } }) {
  const business = await getPublishedBusinessBySlug(params.slug)
  // Direct DB access in server component
  return <ProfileView business={business} />
}
```

#### Client Components (Interactive UI)
```tsx
'use client'
// components/plumbers-filters.tsx
export function PlumbersFilters({ onFilterChange }: Props) {
  // Manages UI state, syncs to URL via router.push()
}
```

#### Server Actions (Mutations)
```tsx
'use server'
// app/plumber/[slug]/edit/actions.ts
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBusiness(formData: FormData) {
  const supabase = createServerClient() // Service role
  // ... mutation with RLS bypass
  revalidatePath(`/plumber/${slug}`)
}
```

---

## Data Flow Patterns

### Read Flow (Public Directory)

```
┌──────────────┐
│ User Request │
│  /plumbers   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ app/plumbers/page.tsx   │  Server Component
│ (URL search params)     │
└──────┬──────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ lib/business-service.ts      │  Service Layer
│ • listPublishedBusinesses()  │  ⭐ DATA ACCESS BOUNDARY
│ • transformBusinessRow()     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Supabase Client (anon key)   │
│ Query: published_businesses  │  Public view only
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ PostgreSQL + RLS             │
│ Filter: status='published'   │  DB-level security
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ PublishedBusiness[]          │  Typed response
│ (camelCase, rating: number)  │
└──────────────────────────────┘
```

### Write Flow (Business Updates)

```
┌──────────────┐
│ User Submits │
│  Edit Form   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ Server Action           │  'use server'
│ updateBusiness()        │
└──────┬──────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Supabase Client              │
│ (service role key)           │  Bypasses RLS
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ UPDATE businesses SET ...    │
│ WHERE id = $1                │  Direct table access
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ revalidatePath()             │  Clear Next.js cache
│ Redirect to profile          │
└──────────────────────────────┘
```

### Data Transformation Layer

```typescript
// lib/business-service.ts

/**
 * Transforms database row to application type
 * - snake_case → camelCase
 * - rating string → number (clamped 0-5)
 * - computed displayName
 */
function transformBusinessRow(row: PublishedBusinessRow): PublishedBusiness {
  const rating = row.rating ? Math.max(0, Math.min(5, parseFloat(row.rating))) : 0

  return {
    id: row.id,
    slug: row.slug,
    legalName: row.legal_name,
    tradingName: row.trading_name,
    displayName: row.trading_name || row.legal_name,
    phone: row.phone,
    email: row.email,
    website: row.website,
    streetAddress: row.street_address,
    rating,
    reviewCount: row.review_count,
    yearsExperience: row.years_experience,
    heroImage: row.hero_image,
    services: row.services || [],
    serviceAreas: row.service_areas || [],
    emergencyAvailable: row.emergency_available,
    isVerified: row.is_verified,
    // ...
  }
}
```

**Why This Exists:**
- Database uses `snake_case` (PostgreSQL convention)
- Application uses `camelCase` (JavaScript convention)
- Supabase returns `rating` as string (NUMERIC type), app needs number
- Centralized transformation prevents drift between routes

---

## Query Contracts

### Service Layer API

All routes query through `lib/business-service.ts` - **no direct Supabase calls in components**.

```typescript
// Public directory queries
listPublishedBusinesses(options?: BusinessListOptions): Promise<PaginatedResponse<PublishedBusiness>>
getPublishedBusinessBySlug(slug: string): Promise<PublishedBusiness | null>
listPublishedBusinessesByService(serviceSlug: string, options?): Promise<PaginatedResponse<PublishedBusiness>>
listPublishedBusinessesByArea(areaSlug: string, options?): Promise<PaginatedResponse<PublishedBusiness>>

// Metadata
getAllPublishedServices(): Promise<string[]>
getAllPublishedAreas(): Promise<string[]>

// Note: Search is implemented via the 'search' filter in listPublishedBusinesses() options
```

### URL-Driven State (Server Components)

Filters, pagination, and sorting live in URL search params:

```
/plumbers?service=emergency-repairs&area=melville&minRating=4&page=2&sortBy=rating
```

```tsx
// app/plumbers/page.tsx
export default async function PlumbersPage({ searchParams }: { searchParams: URLSearchParams }) {
  const filters: BusinessFilters = {
    service: searchParams.service,
    area: searchParams.area,
    minRating: searchParams.minRating ? parseFloat(searchParams.minRating) : undefined,
    emergency: searchParams.emergency === 'true',
  }

  const pagination: PaginationParams = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    pageSize: 20,
  }

  const { data, total, hasNextPage } = await listPublishedBusinesses({ filters, pagination })

  return <PlumbersList businesses={data} total={total} />
}
```

**Benefits:**
- ✅ Shareable URLs (copy/paste filters)
- ✅ Browser back/forward works
- ✅ Server-side rendering (SEO)
- ✅ No client state management complexity

---

## Migration Status

### Phase 1: Database Schema (✅ Complete)

**Migrations Applied:**
- `20260108_create_entity_schema.sql` - Core entity tables
- `20260108_migrate_legacy_data.sql` - Migrated `plumbers` table data
- `20260108_create_publish_gates.sql` - RLS policies, status workflow
- `20260109_add_edit_tokens.sql` - Token-based editing (future auth)
- `20260109_phase1_corrections.sql` - Bug fixes

**Legacy Table Status:**
- `plumbers` table still exists (read-only, deprecated)
- All new data flows through `businesses` table
- `published_businesses` view is the canonical source

**Migration Validation:**
- All 20 legacy plumbers migrated to `businesses`
- Services normalized into `service_types` (14 unique services)
- Areas normalized into `service_areas` (3 suburbs)
- Junction tables populated

### Phase 2: Application Layer (🚧 In Progress)

**Completed:**
- ✅ `types/business.ts` - New type system
- ✅ `lib/business-service.ts` - Service layer
- ✅ `/plumbers` page - Server-rendered with URL filters
- ✅ `/plumber/[slug]` - Profile pages
- ✅ Edit forms with server actions

**Remaining:**
- ⏳ Delete test routes (still present):
  - `/test-add-plumbers`
  - `/test-connection`
  - `/update-database-heroes`
  - `/update-heroes`
- ⏳ Archive legacy `lib/plumber-service.ts`
- ⏳ Remove legacy `types/plumber.ts`
- ⏳ Implement service/area-scoped pages (`/plumbers/service/[service]`)
- ⏳ Admin verification queue UI

### Phase 3: Features (📅 Planned)

- Authentication (business owner portal)
- Review system (replace placeholder rating/reviewCount)
- Image uploads (replace hero_image paths)
- Multi-trade support (electricians, gardeners, etc.)
- Geographic hierarchy (regions, localities)

---

## Extension Points

### Adding a New Trade (e.g., Electricians)

**Schema unchanged** - entity model is trade-agnostic:

1. Seed new `service_types`:
   ```sql
   INSERT INTO service_types (slug, name, category) VALUES
     ('electrical-repairs', 'Electrical Repairs', 'repair'),
     ('switchboard-upgrades', 'Switchboard Upgrades', 'installation');
   ```

2. Register new businesses:
   ```sql
   INSERT INTO businesses (slug, legal_name, trading_name, ...)
   VALUES ('sparky-electrics', 'Sparky Electrics Pty Ltd', 'Sparky Electrics', ...);
   ```

3. Link services:
   ```sql
   INSERT INTO business_services (business_id, service_type_id) ...
   ```

4. Create new route:
   ```
   app/electricians/page.tsx
   ```

### Adding Geographic Hierarchy

Currently v1 uses flat suburbs. To add regions:

1. Seed parent areas:
   ```sql
   INSERT INTO service_areas (slug, name, area_type, parent_id)
   VALUES ('perth-south', 'Perth South', 'region', NULL);
   ```

2. Link suburbs to regions:
   ```sql
   UPDATE service_areas
   SET parent_id = (SELECT id FROM service_areas WHERE slug = 'perth-south')
   WHERE slug IN ('melville', 'myaree', 'booragoon');
   ```

3. Query descendants:
   ```sql
   -- Recursive CTE to find all businesses in Perth South (including suburbs)
   WITH RECURSIVE area_tree AS (
     SELECT id FROM service_areas WHERE slug = 'perth-south'
     UNION ALL
     SELECT sa.id FROM service_areas sa
     JOIN area_tree at ON sa.parent_id = at.id
   )
   SELECT DISTINCT b.* FROM businesses b
   JOIN business_service_areas bsa ON b.id = bsa.business_id
   WHERE bsa.service_area_id IN (SELECT id FROM area_tree);
   ```

### Adding Reviews (Replace Placeholder Rating)

1. Create `reviews` table:
   ```sql
   CREATE TABLE reviews (
     id UUID PRIMARY KEY,
     business_id UUID REFERENCES businesses(id),
     reviewer_name VARCHAR(255),
     rating INT CHECK (rating >= 1 AND rating <= 5),
     comment TEXT,
     created_at TIMESTAMP
   );
   ```

2. Update `published_businesses` view:
   ```sql
   -- Replace hardcoded rating/review_count with aggregated reviews
   AVG(r.rating) AS rating,
   COUNT(r.id) AS review_count
   FROM reviews r WHERE r.business_id = b.id
   ```

3. Remove deprecated columns from `businesses` table:
   ```sql
   ALTER TABLE businesses DROP COLUMN rating, DROP COLUMN review_count;
   ```

---

## Key Architectural Decisions

### Why Not Use Legacy `plumbers` Table?

| Issue | Legacy Approach | Entity-Based Fix |
|-------|----------------|------------------|
| **Services** | `TEXT[]` array ("Emergency Repairs", "emergency repairs") | Normalized `service_types` table with slugs |
| **Areas** | `TEXT[]` array ("Melville", "melville") | Normalized `service_areas` with hierarchy support |
| **Verification** | No verification model | `credentials` table + `verified_at` workflow |
| **Publishing** | No draft/review workflow | Status-driven gates (`draft` → `published`) |
| **SEO** | No service/area pages | Scoped routes: `/plumbers/emergency-repairs/melville` |
| **Multi-trade** | Hardcoded "plumber" assumption | Trade-agnostic `businesses` table |

### Why Database Views Instead of Application Logic?

**Publishing gate enforcement:**

❌ **Wrong (leaky):**
```tsx
// app/plumbers/page.tsx
const { data } = await supabase.from('businesses')
  .select('*')
  .eq('status', 'published') // ← Easy to forget!
```

✅ **Correct (enforced):**
```tsx
const { data } = await supabase.from('published_businesses').select('*')
// View GUARANTEES status='published' - impossible to leak drafts
```

### Why Server Actions Instead of API Routes?

**Server actions are co-located, type-safe, and automatic:**

```tsx
// app/plumber/[slug]/edit/actions.ts
'use server'
export async function updateBusiness(formData: FormData) {
  // Automatic CSRF protection, no API route needed
}
```

```tsx
// app/plumber/[slug]/edit/page.tsx
import { updateBusiness } from './actions'

<form action={updateBusiness}>...</form>
```

**Benefits:**
- ✅ Type-safe (TypeScript across client/server boundary)
- ✅ Co-located with UI (no separate `/api` folder)
- ✅ Automatic request handling (no `POST` boilerplate)
- ✅ Built-in revalidation (`revalidatePath()`)

---

## Security Model

### RLS Policies (Row Level Security)

```sql
-- Public read access to published businesses
CREATE POLICY "public_read_published"
  ON businesses FOR SELECT
  USING (status = 'published');

-- Public insert for registration form
CREATE POLICY "public_insert_draft"
  ON businesses FOR INSERT
  WITH CHECK (status = 'draft' AND owner_user_id IS NULL);

-- Admin-only updates (service role bypasses RLS)
-- No policy needed - server actions use service role client
```

### Two-Client Pattern

```typescript
// lib/supabase/client.ts (Browser)
export const createBrowserClient = () => {
  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
// ✅ Read-only access to published_businesses
// ❌ Cannot update/delete (RLS blocks)

// lib/supabase/server.ts (Server)
export const createServerClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}
// ✅ Full database access
// ⚠️  Only used in server actions (never exposed to browser)
```

**Why This Matters:**
- Public can read listings and register businesses (anon key)
- Only server-side code can update/delete (service role bypasses RLS)
- Edit forms MUST use server actions - client mutations would fail

---

## Performance Considerations

### Database Indexes

```sql
-- Optimized for common queries
CREATE INDEX idx_businesses_status_published ON businesses(status) WHERE status = 'published';
CREATE INDEX idx_businesses_rating ON businesses(rating DESC) WHERE status = 'published';
CREATE INDEX idx_service_types_slug ON service_types(slug);
CREATE INDEX idx_service_areas_slug ON service_areas(slug);

-- Junction table indexes
CREATE INDEX idx_business_services_business ON business_services(business_id);
CREATE INDEX idx_business_services_service ON business_services(service_type_id);
```

### View Materialization (Future)

`published_businesses` is currently a standard view (computed on each query). For scale:

```sql
CREATE MATERIALIZED VIEW published_businesses_mv AS ...;
CREATE UNIQUE INDEX ON published_businesses_mv(id);
REFRESH MATERIALIZED VIEW CONCURRENTLY published_businesses_mv;
```

Trigger refresh on:
- Business status → `published`
- Services/areas updated
- Credentials verified

---

## Testing & Validation

### Type Safety

```bash
pnpm typecheck  # Zero errors enforced
```

**Key invariants:**
- `PublishedBusinessRow` matches DB exactly (snake_case, rating as string)
- `PublishedBusiness` is application type (camelCase, rating as number)
- Service layer transforms between them

### Database Validation

```sql
-- supabase/migrations/VALIDATION_QUERIES.sql
-- Ensures data integrity after migrations

SELECT COUNT(*) FROM businesses WHERE status NOT IN ('draft', 'pending_review', 'published', 'suspended');
-- Expected: 0 (all businesses have valid status)

SELECT COUNT(*) FROM business_services bs
LEFT JOIN service_types st ON bs.service_type_id = st.id
WHERE st.id IS NULL;
-- Expected: 0 (no orphaned service links)
```

---

## Related Documentation

- `CLAUDE.md` - Development guidelines for Claude Code
- `README.md` - Quick start guide
- `supabase/migrations/SCHEMA_RATIONALE.md` - Detailed DB design decisions
- `docs/01-architecture-principles.md` - Core principles
- `docs/02-graph-first-data-model.md` - Entity model philosophy
- `docs/06-phase-2-application-architecture.md` - Frontend migration notes

---

## Glossary

| Term | Definition |
|------|------------|
| **Entity-centric** | Data model where entities (businesses, services, areas) are explicit tables with normalized relationships |
| **Graph-first** | Mental model treats entities as nodes with edges, even though storage is relational |
| **Published contract** | Public API exposed via `published_businesses` view - routes query this, not base tables |
| **Status gate** | Publishing workflow enforced at DB level via `status` CHECK constraint and RLS policies |
| **Service role** | Supabase client with full DB access, bypasses RLS - used only in server actions |
| **Junction table** | M:M relationship table (e.g., `business_services` links businesses ↔ service_types) |
| **Transformation layer** | Service layer function that converts DB rows (snake_case, strings) to app types (camelCase, proper types) |
