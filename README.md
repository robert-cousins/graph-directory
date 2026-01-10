# Melville Plumbers Directory

Next.js 14 local business directory connecting customers with plumbers in Melville/Myaree, WA. B2C marketplace with Supabase backend.

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
app/
├── page.tsx                    # Home page with hero + search
├── plumbers/page.tsx           # Directory listing (client, with filters)
├── plumber/[slug]/
│   ├── page.tsx                # Business profile (server)
│   ├── edit/
│   │   ├── page.tsx            # Edit form (client)
│   │   └── actions.ts          # Server actions for updates
│   └── not-found.tsx
├── list-your-business/
│   ├── page.tsx                # Registration form (client)
│   └── actions.ts              # Server actions for registration
├── admin/
│   └── update-hero-images/     # Admin utility pages
├── api/
│   ├── add-plumbers/           # Bulk add endpoint
│   ├── check-database/         # DB health check
│   ├── check-hero-images/      # Image validation
│   └── update-hero-images/     # Image update utility
├── test-connection/            # Dev-only: DB connection test
├── test-add-plumbers/          # Dev-only: Test data insertion
├── layout.tsx                  # Root layout
├── loading.tsx                 # Loading UI
└── globals.css                 # Global styles

lib/
├── plumber-service.ts          # DATA ACCESS LAYER - all DB queries
├── utils.ts                    # Utility functions (cn, etc.)
└── supabase/
    ├── client.ts               # Browser client (anon key)
    └── server.ts               # Server client (service role)

components/
├── ui/                         # shadcn/ui primitives (button, card, etc.)
├── plumber-card.tsx            # Listing cards
├── filter-sidebar.tsx          # Desktop filters
├── mobile-filter-menu.tsx      # Mobile filters
├── header.tsx                  # Site header
├── breadcrumb.tsx              # Navigation breadcrumbs
└── theme-provider.tsx          # Dark mode provider

types/
└── plumber.ts                  # Core interfaces (Plumber, Review, filters)

scripts/
├── 001_create_plumbers_table.sql       # Initial schema
├── 002_seed_plumbers_data.sql          # Seed data
├── 003_setup_security_policies.sql     # RLS policies
├── 004-010_*.sql                       # Additional migrations
├── check_plumbers_data.js              # Data validation script
└── update_hero_images.js               # Hero image update script

supabase/migrations/
└── 20260108_fix_rls_policies_and_add_indexes.sql  # Latest production migration

data/                           # Static data files
public/                         # Static assets (images)
styles/                         # Additional stylesheets
```

## Organization Rules

**Data access:**
- ALL database queries → `lib/plumber-service.ts` (never direct Supabase calls)
- Browser components → `lib/supabase/client.ts` (anon key)
- Server actions/components → `lib/supabase/server.ts` (service role)

**Component patterns:**
- Server components (default) → detail pages, static content
- Client components (`"use client"`) → forms, filters, interactive UI
- Server actions → `actions.ts` files alongside pages, always call `revalidatePath()`

**File organization:**
- API routes → `app/api/[name]/route.ts`
- Components → `components/`, one per file
- UI primitives → `components/ui/` (shadcn)
- Types → `types/` or co-located
- Path alias → `@/*` for all imports

## Database Workflow

**Schema location:**
- Production migrations: `supabase/migrations/` (applied to live DB)
- Development scripts: `scripts/` (one-off utilities and seeds)

**Database schema (`plumbers` table):**
- Uses `snake_case` columns: `business_name`, `review_count`, `emergency_available`, etc.
- Transform to camelCase in `transformDatabaseRow()` in `lib/plumber-service.ts`
- Business hours stored as JSON: `{ monday: "8:00 AM - 5:00 PM", ... }`
- Services stored as array: `["Emergency Repairs", "Blocked Drains", ...]`
- Hero images: `hero_image` column stores path to image in `/public/images/`

**RLS (Row Level Security) policies:**
- Public read access enabled (directory is publicly viewable)
- Public insert access enabled (for business registration form)
- Updates require service role (use `createServerClient()` in server actions)
- This is why edit forms use server actions - they need service role credentials

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

- **Framework**: Next.js 14 (App Router), React 18, TypeScript 5
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **UI**: Tailwind CSS 4, shadcn/ui (Radix UI primitives)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Package manager**: pnpm
- **Deployment**: Vercel

## Security Model

**Two Supabase clients:**
1. **Browser client** (`lib/supabase/client.ts`) - Uses anon key
   - Read-only access to public data
   - Used in client components for fetching

2. **Server client** (`lib/supabase/server.ts`) - Uses service role key
   - Full database access
   - Used in server actions for mutations
   - Required for updates/deletes (bypasses RLS)

**Why this matters:**
- Public can read listings and register new businesses
- Only server-side code can update/delete (prevents tampering)
- Edit forms MUST use server actions, not client-side mutations

## Key Patterns

**Server Actions template:**
```typescript
"use server"
import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateData(formData: FormData) {
  const supabase = createServerClient()
  // ... mutation
  revalidatePath("/path")
  return { success: true }
}
```

**Data transformation pattern:**
All database reads go through `transformDatabaseRow()` in `lib/plumber-service.ts` to convert:
- `business_name` → `businessName`
- `review_count` → `reviewCount`
- `emergency_available` → `emergencyAvailable`

**Filter pattern:**
Client-side filtering in `app/plumbers/page.tsx` using `PlumberFilters` interface:
```typescript
{
  suburb?: string
  services?: string[]
  minRating?: number
  emergencyOnly?: boolean
  sortBy?: "rating" | "reviews" | "name"
}
```
