# Routing & Query Strategy

## Route Philosophy

Routes map directly to **query intent**, not UI structure.

Examples:

- `/plumbers` → all published businesses
- `/plumbers/service/[service]` → service-scoped query
- `/plumbers/area/[area]` → area-scoped query
- `/plumber/[slug]` → single entity

No ambiguous routes.

## Why Not `/plumbers/[service]/[area]`

Although compact, combined faceted routes:
- Require disambiguation logic
- Complicate static generation
- Reduce clarity

We prefer explicit separation with optional filters.

## URL as State

All filtering is driven by search params:

- `?emergency=true`
- `?minRating=4`
- `?sort=rating&direction=desc`
- `?page=2`

Client components **only update the URL**.
Server components **own interpretation**.

This enables:
- Bookmarking
- Shareability
- SSR consistency
- Debuggability
