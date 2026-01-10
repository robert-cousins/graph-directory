# Phase 2: Application Architecture

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: How the frontend was migrated to the new DB contracts, and what boundaries exist now.

## Why this exists

Phase 2 is where most systems drift: routes start querying base tables, types diverge, filters become inconsistent. This document locks the shape of the app layer.

## Key decisions

- Introduce a new typed model aligned to the public view:
  - `PublishedBusinessRow` (DB shape)
  - `PublishedBusiness` (app shape)
- Centralize data access in `lib/business-service.ts`
  - rating conversion string → number occurs here
  - safe defaults (no throwing) to protect rendering
- Convert `/plumbers` to server-side rendering using URL search params.
- Implement a client “bridge” component to keep legacy filter UI functional while moving to URL-driven state.

## Implications

- Type conversions belong in the service layer, not in UI components.
- Client components are allowed to manage UI state but must sync to URL (the canonical state).
- New routes should be built by extending query contracts rather than inventing new ad-hoc Supabase queries.
