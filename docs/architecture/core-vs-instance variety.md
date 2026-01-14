# Core vs Instance Architecture Boundary (Constitution)

## Status
Authoritative for Phase 4 and all future phases unless explicitly superseded by a versioned architecture decision record (ADR).

## Purpose
This document defines the hard boundary between the reusable **Core Framework** and any vertical **Instance** (e.g. plumbers).  
The purpose is to prevent instance creep, enforce architectural invariants, and make multi-vertical expansion possible without copy/paste.

## Phase 4 Objective (Authoritative)
Phase 4 is a structural architecture phase only. Its job is to physically encode the Core vs Instance boundary in the repo and extract reusable framework logic **without altering runtime behaviour**.

**If behaviour changes, Phase 4 has failed.**

## Non-Negotiable Architectural Invariants (Phases 1–3)
These invariants must never be violated by Core or Instance code:

1. **Public reads** come only from stable DB contracts:
   - `public.published_businesses` view (and/or explicitly approved public RPCs)
   - No direct reads from raw tables in app routes/components.

2. **No client-side writes** to Supabase (no direct browser writes).
   - All writes happen server-side only.

3. **Publishing is gated**:
   - `published` is not the same as `exists`.
   - Publish requires explicit admin action and verified credentials (as defined in DB enforcement).

4. **Ownership model** is token-based (no user accounts):
   - Edit tokens are generated once, hashed at rest, compared constant-time.
   - Token is shown once, then never retrievable again.

5. **Emergency availability** is a capability (semantic flag / windows), not “available now” scheduling logic.

6. **Pages are projections**:
   - Public pages render entity projections derived from DB contracts.
   - URL search params are the canonical UI state for filters.

## Repo Structure (Non-Negotiable)
This structure is the primary enforcement mechanism:

- `apps/plumbers/`
  - Next.js app for the plumbers instance (routing + UI + branding)

- `packages/core-db/`
  - SQL migrations, views, RPCs, policies, validation queries
  - Must include `CONTRACT.md` (canonical list of stable DB contracts)

- `packages/core-contracts/`
  - TypeScript types and query contract definitions shared by apps and core modules

- `packages/core-data/`
  - Read-only service layer (“Directory Read API”)
  - May query only views/RPC declared in `packages/core-db/CONTRACT.md`

- `packages/core-mutators/`
  - Server-only write logic (“Directory Write API”)
  - Submission, edit-by-token, and admin publish/suspend actions live here

- `instances/plumbers/`
  - Instance inputs: config, seeds, ranking, copy (no framework logic)

## Core Framework: Responsibilities
Core is responsible for:

### Core-DB (Truth + Contracts)
- Owns the canonical DB schema for graph-first entities + relationships.
- Owns public read contracts (views/RPC).
- Enforces:
  - publish gate semantics
  - verification requirements
  - status transitions
  - security policies where relevant

### Core-Contracts (Types)
- Defines stable TypeScript types matching DB contracts and app consumption.
- Defines canonical contract shapes (rows, models, filters/options).

### Core-Data (Read API)
- Provides a vertical-agnostic read API to applications:
  - list businesses (published)
  - get business by slug (published)
  - list by service / area (published)
- Implements only:
  - query composition
  - row-to-model transforms
- **No instance-specific ranking rules inside core-data.**

### Core-Mutators (Write API)
- Provides a vertical-agnostic write API:
  - submit business (creates pending_review / draft as per existing semantics)
  - edit business (token gated)
  - admin transitions (publish / suspend / etc.)
- Enforces invariants:
  - token validation / constant-time checks
  - publish gating (verified credentials etc.)
  - status transition validity
- Server-only: may use service role; must not import UI.

## Instance Layer: Responsibilities
Instances are responsible for:

### Branding & UX
- Instance-specific UI, copy, labels, routes, layout choices
- Optional instance-only components

### Vertical Definition
- Which services/areas exist for that vertical (seed data)
- Any vertical synonyms or copy rules
- SEO copy templates (future phase; allowed as config now)

### Ranking Preferences
- Pure functions for ordering results using fields exposed by core contracts
- No bypassing of public contract, no new semantics

## Not Allowed (Hard Prohibitions)
Instances must not:

1. Query raw tables directly in public pages/components.
2. Perform client-side writes to Supabase.
3. Bypass publish/verification gates “for UX reasons”.
4. Redefine emergency availability into real-time scheduling logic.
5. Add new required fields to core entities without a core contract + migration.
6. Copy core logic into instance code (no “forking core” inside apps).
7. Import server-only core-mutators into client components.

Core must not:
1. Import from `instances/*` (no vertical coupling).
2. Contain vertical-specific copy/labels/service taxonomies.
3. Add SEO/content strategies that assume any single vertical.

## Enforcement Mechanisms (Phase 4 Minimal)
Phase 4 will enforce boundaries primarily via structure and imports:

1. **Package exports**
   - Only approved entry points are exported from core packages.

2. **TypeScript path aliases**
   - Make core usage explicit and auditable.

3. (Optional) **ESLint boundary rules**
   - Only if lightweight and non-distracting in Phase 4.

## Change Policy
- Behaviour changes are not permitted in Phase 4.
- Any contract-breaking change must be:
  - explicitly proposed
  - documented
  - implemented in a later phase with migration notes
