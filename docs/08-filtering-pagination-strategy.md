# Filtering & Pagination Strategy

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: How filtering/sorting/pagination works end-to-end (URL → server → UI).

## Why this exists

Filtering is where systems become inconsistent: UI state drifts from backend state, results differ across devices, and SEO pages become unshareable.

## Key decisions

- Canonical state is the URL search params:
  - emergency, verified, minRating, search, page, pageSize, sort, direction
- Server components parse params and call query contracts.
- Client UI controls update URL params (not local-only state).
- Use limit/offset pagination for v1:
  - simple, understandable, sufficient for expected dataset size

## Implications

- Any interactive filter component must have a URL-sync strategy.
- Bookmarking and sharing must reproduce identical results.
- If dataset size grows substantially, cursor pagination can be added later without breaking contracts (as long as the contract remains stable or versioned).
