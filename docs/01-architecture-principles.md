# Architecture Principles

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: The foundational rules that should not be casually violated.

## Why this exists

Without explicit principles, directories tend to devolve into:
- ad-hoc tables
- leaky queries
- duplicated logic
- SEO pages that don’t map to real data

These principles keep the system scalable, auditable, and agent-friendly.

## Key decisions

1. **Contract-first reads**
   - Public reads flow through `published_businesses` (view) and approved RPCs only.
2. **Database-enforced correctness**
   - Publication gates and eligibility checks live in SQL, not React components.
3. **URLs are state**
   - Filtering/pagination/sorting are encoded in URL search params.
4. **Thin application layer**
   - Next.js routes render results; business logic lives in the service layer and DB contracts.
5. **Prefer missing data to false certainty**
   - Especially for hours and “emergency” semantics; conservative migration is safer.

## Implications

- If a page “needs a field,” the field must come from the published contract — not a table join invented in a route.
- Any change that makes the system easier but less correct is a regression.
- Refactors must preserve boundaries: Tables → Views/RPC → Service layer → Routes → UI.
