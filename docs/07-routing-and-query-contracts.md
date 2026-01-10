# Routing & Query Contracts

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: Route patterns and which query contracts they are allowed to call.

## Why this exists

Routes must map to clear entity intent. If routing is ambiguous, SEO and maintenance both suffer.

## Key decisions

- Use explicit routes rather than ambiguous faceted paths:
  - `/plumbers` (all published)
  - `/plumbers/service/[service]` (service-scoped)
  - `/plumbers/area/[area]` (area-scoped)
  - `/plumber/[slug]` (detail)
- Define query contracts in `lib/business-service.ts`:
  - listPublishedBusinesses
  - getPublishedBusinessBySlug
  - listPublishedBusinessesByService
  - listPublishedBusinessesByArea
- Prefer `published_businesses` view as the primary read API.
- Use RPC functions when they provide clearer / more optimized filtering.

## Implications

- Any new route must declare which contract it uses.
- A route should not require “disambiguation logic” to determine what it means.
- Route design influences SEO crawlability and internal linking; keep it predictable.
