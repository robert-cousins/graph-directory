# Known Tradeoffs & Non-Goals

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: What we deliberately chose not to do (yet), and the cost of those choices.

## Why this exists

Every architecture is a set of tradeoffs. Naming them prevents future “why didn’t we…?” confusion and makes scope control easier.

## Key decisions

Non-goals for Phases 1–2:
- No authentication flows
- No admin UI (SQL/manual is acceptable)
- No business onboarding UX redesign
- No styling refactor
- No automated license verification
- No full geo hierarchy or radius search

Tradeoffs accepted:
- Manual verification is slower but simpler and safer.
- Suburb-only service areas avoid premature complexity.
- URL-driven filtering requires bridge components for legacy UI.
- Limit/offset pagination is simple but less ideal at very large scale.

## Implications

- Later phases can add these features, but must preserve the existing contracts or version them explicitly.
- If a future feature pressures the boundaries (e.g., auth + ownership), implement it as a new phase with a clear migration plan.
