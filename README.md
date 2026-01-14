# Graph-First Local Business Directory

**Current Implementation:** Melville Plumbers (Demo/Testing Instance)

Entity-centric local business directory built with Next.js 14, TypeScript, and Supabase. Designed for service-based businesses with normalized entity relationships, status-driven publishing workflow, and database-enforced business logic.

**Key Features:**
- Graph-first entity model (businesses ↔ services ↔ areas)
- Status-driven publishing workflow (draft → review → published)
- Database-enforced security (RLS policies, status gates)
- SEO-optimized routing (service/area-scoped pages)
- Trade-agnostic architecture (extend to any service industry)

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Run development server:**
   ```bash
   pnpm dev
   ```
   Opens at http://localhost:3000

## Development Commands

```bash
pnpm dev        # Start dev server (http://localhost:3000)
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # Run TypeScript type checking
pnpm lint       # Run ESLint
```

**Quick fix**: Run `/fix` to automatically check and fix all type and lint errors in parallel.

## Project Structure

```
app/                          # Next.js App Router
├── page.tsx                  # Home page with search
├── plumbers/
│   ├── page.tsx              # Directory listing (server component, URL filters)
│   ├── service/[service]/    # Service-scoped pages
│   └── area/[area]/          # Area-scoped pages
├── plumber/[slug]/
│   ├── page.tsx              # Business profile (server component)
│   └── edit/
│       ├── page.tsx          # Edit form (client component)
│       ├── edit-form.tsx     # Form implementation
│       └── actions.ts        # Server actions (service role)
├── list-your-business/
│   ├── page.tsx              # Registration form (client)
│   ├── list-business-form.tsx
│   └── actions.ts            # Server actions
├── api/                      # API routes
│   ├── add-plumbers/         # Bulk operations (admin)
│   └── check-database/       # Health checks
├── admin/                    # Admin utilities
├── layout.tsx                # Root layout
└── loading.tsx               # Loading UI

lib/                          # Service layer (DATA ACCESS BOUNDARY)
├── business-service.ts       # ⭐ ALL business queries (entity-based)
├── plumber-service.ts        # Legacy service (deprecated)
├── directory-admin.ts        # Admin operations
├── utils.ts                  # Utilities (cn, formatters)
└── supabase/
    ├── client.ts             # Browser client (anon key)
    ├── server.ts             # Server client (service role)
    └── service-role.ts       # Service role client

components/
├── plumber-card.tsx          # Listing card
├── plumbers-filters.tsx      # Filter UI (client bridge component)
├── filter-sidebar.tsx        # Desktop filters
├── mobile-filter-menu.tsx    # Mobile filters
├── header.tsx                # Site header
├── breadcrumb.tsx            # Navigation breadcrumbs
└── ui/                       # shadcn/ui primitives

types/
├── business.ts               # ⭐ Core types (PublishedBusiness, filters)
└── plumber.ts                # Legacy types (deprecated)

supabase/migrations/          # Production migrations (applied to live DB)
├── 20260108_create_entity_schema.sql
├── 20260108_migrate_legacy_data.sql
├── 20260108_create_publish_gates.sql
├── 20260109_add_edit_tokens.sql
├── 20260109_phase1_corrections.sql
├── SCHEMA_RATIONALE.md       # Design decisions
└── README.md                 # Migration guide

scripts/                      # Development/seed scripts (NOT applied to prod)
├── 001_create_plumbers_table.sql
├── 002_seed_plumbers_data.sql
└── ...

docs/                         # Architecture documentation
├── 01-architecture-principles.md
├── 02-graph-first-data-model.md
├── 06-phase-2-application-architecture.md
└── ...

data/                         # Static data files
public/images/                # Static assets
```

## Architecture Principles

**Data access (⭐ CRITICAL):**
- ALL business queries → `lib/business-service.ts` (never direct Supabase calls in components)
- Service layer transforms database rows (snake_case) to application types (camelCase)
- Browser components → `lib/supabase/client.ts` (anon key, read-only)
- Server actions → `lib/supabase/server.ts` (service role, bypasses RLS)
- Routes query `published_businesses` view, NOT base `businesses` table

**Component patterns:**
- Server components (default) → pages, data fetching, static content
- Client components (`"use client"`) → forms, filters, interactive UI
- Server actions → `actions.ts` files, always call `revalidatePath()`
- URL search params → canonical state for filters/pagination/sorting

**Database contracts:**
- Public reads → `published_businesses` view (status='published' enforced)
- Admin writes → base tables via service role client
- RLS policies prevent direct access to draft/pending businesses
- Views denormalize M:M relationships into arrays for read efficiency

**File organization:**
- API routes → `app/api/[name]/route.ts`
- Components → `components/`, one per file
- UI primitives → `components/ui/` (shadcn)
- Types → `types/business.ts` (core), co-locate feature-specific types
- Path alias → `@/*` for all imports

For detailed architecture, see `architecture.md`.

## Database Architecture

**Schema location:**
- Production migrations: `supabase/migrations/` (applied to live DB via Supabase CLI)
- Development scripts: `scripts/` (one-off utilities, NOT applied to production)

**Core entity tables:**
```sql
businesses             # Core business entity
  ├── id (UUID)
  ├── slug (unique)
  ├── legal_name, trading_name
  ├── status (draft | pending_review | published | suspended)
  └── rating, review_count (temporary, will move to reviews table)

service_types          # Normalized service catalog
  ├── id (UUID)
  ├── slug (unique)
  └── name, description, category

service_areas          # Geographic hierarchy (suburbs in v1)
  ├── id (UUID)
  ├── slug (unique)
  ├── name, area_type
  └── parent_id (self-referencing FK for hierarchy)

business_services      # M:M junction table
business_service_areas # M:M junction table
credentials            # Verifiable credentials (licenses, insurance)
availability_windows   # Service hours + emergency capability
```

**Public query contract:**
- Routes query `published_businesses` view (NOT base tables)
- View aggregates M:M relationships into arrays: `services[]`, `service_areas[]`
- View computes derived fields: `emergency_available`, `is_verified`
- View enforces `status='published'` filter at DB level

**Data transformation:**
- Database uses `snake_case` (PostgreSQL convention)
- Application uses `camelCase` (JavaScript convention)
- `lib/business-service.ts` transforms via `transformBusinessRow()`
- Rating stored as NUMERIC(3,2), returned as string by Supabase, converted to number in service layer

**RLS (Row Level Security) policies:**
- Public read: Only `status='published'` businesses visible
- Public insert: Registration form creates `status='draft'` businesses
- Updates: Require service role (server actions only)
- Draft/pending businesses: Only admins can view/edit

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
pnpm typecheck
pnpm lint
```

Fix ALL errors/warnings before continuing.

**Quick fix**: Run `/fix` to automatically check and fix all type and lint errors in parallel.

If changes affect pages/routes (not hot-reloadable):
1. Restart dev server: `pnpm dev`
2. Check browser console + terminal for errors
3. Fix ALL warnings/errors before continuing

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js (App Router) | 14.2.35 | Server-first rendering, file-based routing |
| **Language** | TypeScript | 5.x | Type safety across frontend/backend |
| **Database** | Supabase (PostgreSQL) | 15+ | Relational storage, RLS, real-time |
| **UI Framework** | Tailwind CSS | 4.1.9 | Utility-first styling |
| **Component Library** | shadcn/ui (Radix UI) | Latest | Accessible primitives |
| **Forms** | React Hook Form + Zod | Latest | Client validation, type-safe schemas |
| **Icons** | Lucide React | 0.454+ | Icon library |
| **Package Manager** | pnpm | Latest | Fast, disk-efficient |
| **Deployment** | Vercel | Latest | Edge-optimized hosting |

For detailed architecture, see **[architecture.md](./architecture.md)**.

## Security Model

### Two-Client Pattern

**Browser client** (`lib/supabase/client.ts`):
```typescript
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createBrowserClient()
```
- ✅ Read-only access to `published_businesses` view
- ✅ Can insert `draft` businesses (registration form)
- ❌ Cannot update/delete (blocked by RLS)
- ⚠️  Exposed to browser - never use for mutations

**Server client** (`lib/supabase/server.ts`):
```typescript
// Uses SUPABASE_SERVICE_ROLE_KEY
const supabase = createServerClient()
```
- ✅ Full database access (bypasses RLS)
- ✅ Can update/delete any row
- ⚠️  Only used in server actions (never exposed to browser)

### RLS Policies

```sql
-- Public can read published businesses
CREATE POLICY "public_read_published" ON businesses
  FOR SELECT USING (status = 'published');

-- Public can register (create drafts)
CREATE POLICY "public_insert_draft" ON businesses
  FOR INSERT WITH CHECK (status = 'draft');

-- Only service role can update (no policy = admin-only)
```

**Why this matters:**
- Prevents users from bypassing publish workflow
- Prevents editing other businesses
- Prevents viewing draft/pending businesses
- Database enforces security - impossible to leak unpublished data

## Extending the System

### Adding a New Trade (e.g., Electricians)

1. **Seed service types:**
   ```sql
   INSERT INTO service_types (slug, name, category) VALUES
     ('electrical-repairs', 'Electrical Repairs', 'repair'),
     ('switchboard-upgrades', 'Switchboard Upgrades', 'installation');
   ```

2. **Register businesses** (same `businesses` table - trade-agnostic)

3. **Create route:**
   ```
   app/electricians/page.tsx
   ```

4. **Query through service layer:**
   ```typescript
   const electricians = await listBusinesses({
     filters: { service: 'electrical-repairs' }
   })
   ```

### Adding Geographic Hierarchy (Regions)

Currently v1 uses flat suburbs. To add regions:

```sql
-- Create region
INSERT INTO service_areas (slug, name, area_type, parent_id)
VALUES ('perth-south', 'Perth South', 'region', NULL);

-- Link suburbs to region
UPDATE service_areas
SET parent_id = (SELECT id FROM service_areas WHERE slug = 'perth-south')
WHERE slug IN ('melville', 'myaree', 'booragoon');
```

Then query descendants via recursive CTE (example in `architecture.md`).

## Documentation

- **[architecture.md](./architecture.md)** - Comprehensive technical architecture
- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines for Claude Code
- **[supabase/migrations/SCHEMA_RATIONALE.md](./supabase/migrations/SCHEMA_RATIONALE.md)** - Database design decisions
- **[docs/](./docs/)** - Detailed architecture documentation

## Migration Status

### Phase 1: Database Schema (✅ Complete)
- Entity-based schema with normalized relationships
- All 20 legacy plumbers migrated to `businesses` table
- Services normalized into `service_types` (14 unique)
- Areas normalized into `service_areas` (3 suburbs)
- Status-driven publishing workflow implemented
- RLS policies and security gates in place

### Phase 2: Application Layer (🚧 In Progress)
- ✅ New type system (`types/business.ts`)
- ✅ Service layer (`lib/business-service.ts`)
- ✅ `/plumbers` page (server-rendered, URL filters)
- ✅ `/plumber/[slug]` profile pages
- ✅ Edit forms with server actions
- ⏳ Service/area-scoped pages (`/plumbers/service/[service]`)
- ⏳ Admin verification queue UI
- ⏳ Archive legacy `plumber-service.ts`

### Phase 3: Features (📅 Planned)
- Authentication (business owner portal)
- Review system (replace placeholder rating)
- Image uploads
- Multi-trade support (electricians, gardeners, etc.)

**Legacy Status:**
- `plumbers` table exists (read-only, deprecated)
- `lib/plumber-service.ts` exists (use `business-service.ts` instead)
- All new features use entity-based architecture

## Key Code Patterns

### Server Components (Data Fetching)
```typescript
// app/plumbers/page.tsx
import { listBusinesses } from '@/lib/business-service'

export default async function PlumbersPage({ searchParams }) {
  // Extract filters from URL
  const filters = {
    service: searchParams.service,
    area: searchParams.area,
    minRating: searchParams.minRating ? parseFloat(searchParams.minRating) : undefined,
  }

  // Query through service layer
  const { data, total } = await listBusinesses({ filters, pagination })

  return <PlumbersList businesses={data} total={total} />
}
```

### Server Actions (Mutations)
```typescript
'use server'
// app/plumber/[slug]/edit/actions.ts
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBusiness(slug: string, formData: FormData) {
  const supabase = createServerClient() // Service role - bypasses RLS

  const { error } = await supabase
    .from('businesses')
    .update({ trading_name: formData.get('tradingName') })
    .eq('slug', slug)

  if (error) throw error

  revalidatePath(`/plumber/${slug}`) // Clear Next.js cache
  return { success: true }
}
```

### Data Transformation (Service Layer)
```typescript
// lib/business-service.ts
function transformBusinessRow(row: PublishedBusinessRow): PublishedBusiness {
  return {
    // snake_case → camelCase
    legalName: row.legal_name,
    tradingName: row.trading_name,
    reviewCount: row.review_count,

    // String → Number (rating)
    rating: row.rating ? parseFloat(row.rating) : 0,

    // Computed field
    displayName: row.trading_name || row.legal_name,

    // Safe defaults
    services: row.services || [],
    serviceAreas: row.service_areas || [],
  }
}
```

### URL-Driven Filters
```typescript
// Filters live in URL, not React state
// /plumbers?service=emergency-repairs&area=melville&minRating=4

interface BusinessFilters {
  service?: string      // Service slug
  area?: string         // Area slug
  minRating?: number    // 0-5
  emergency?: boolean   // Only emergency-capable businesses
  verified?: boolean    // Only verified businesses
  search?: string       // Text search
}
```
