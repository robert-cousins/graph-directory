# Publish Workflow & Gates

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: What “published” means, how a business becomes visible publicly, and which checks enforce this.

## Why this exists

Directories fail when unverified or incomplete listings leak into public pages. The publish gate is the core trust mechanism.

## Key decisions

- A business is publicly visible only if:
  - `businesses.status = 'published'`
  - at least one verified credential exists (license)
  - at least one service exists
  - at least one service area exists
  - required fields are complete
- Encapsulate this logic in SQL:
  - `published_businesses` view filters to published only
  - `check_publication_requirements(business_id)` provides an explicit eligibility report
- Model manual verification as first-class:
  - credentials have `verified`, `verified_at`

## Implications

- Public pages should never implement their own “is this safe to show?” logic.
- Admin tooling can be lightweight initially (SQL updates), because the correctness boundary is already in the database.
- “Verification” must be auditable: timestamps and explicit flags.
