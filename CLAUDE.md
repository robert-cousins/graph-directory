# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Melville Plumbers Directory

Local business directory for finding plumbers in Melville/Myaree, WA. Built with Next.js 14, TypeScript, and Supabase.

## Project Structure

```
app/
├── page.tsx                     # Home page with search
├── plumbers/page.tsx            # Directory listing with filters
├── plumber/[slug]/
│   ├── page.tsx                 # Business profile page
│   └── edit/                    # Edit forms + server actions
├── list-your-business/          # Registration form + actions
├── admin/                       # Admin utility pages
└── api/                         # API endpoints

lib/
├── plumber-service.ts           # DATA ACCESS LAYER - all DB queries
├── utils.ts                     # Utility functions
└── supabase/
    ├── client.ts                # Browser client (anon key)
    └── server.ts                # Server client (service role)

components/
├── ui/                          # shadcn/ui primitives
├── plumber-card.tsx             # Listing cards
├── filter-sidebar.tsx           # Filters (desktop)
└── mobile-filter-menu.tsx       # Filters (mobile)

types/
└── plumber.ts                   # Core interfaces

scripts/                         # Database setup/seed scripts
supabase/migrations/             # Production migrations
```

## Organization Rules

**Data access:**
- ALL database queries → `lib/plumber-service.ts` (never direct Supabase calls)
- Browser components → `lib/supabase/client.ts`
- Server actions/components → `lib/supabase/server.ts`

**Component patterns:**
- Server components (default) → pages, static content
- Client components (`"use client"`) → forms, filters, interactive UI
- Server actions → `actions.ts` files, always call `revalidatePath()`

**File organization:**
- API routes → `app/api/[name]/route.ts`
- Components → `components/`, one per file
- UI primitives → `components/ui/` (shadcn)
- Path alias → `@/*` for all imports

**Database:**
- Database uses `snake_case` columns
- Transform to camelCase in `transformDatabaseRow()` in service layer
- RLS: Public read/insert enabled, updates require service role

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

- Next.js 14 (App Router), React 18, TypeScript 5
- Supabase (PostgreSQL + RLS)
- Tailwind CSS 4, shadcn/ui
- React Hook Form + Zod
- Package manager: pnpm
