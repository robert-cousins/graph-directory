# Legacy Migration & Deprecation

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: What legacy elements exist, why they remain, and the plan to remove them safely.

## Why this exists

Legacy removal is risky when done opportunistically. We want an intentional, phased deletion to avoid breaking routes or functionality.

## Key decisions

- Keep legacy types and services temporarily:
  - `types/plumber.ts` is deprecated
  - `lib/plumber-service.ts` is deprecated
- Keep legacy routes until Phase 3 cleanup is complete.
- New development must not depend on legacy modules.

## Implications

- Legacy code should not receive “new features.”
- Phase 3 should remove or redirect legacy routes once new routes are stable.
- Removing legacy is a project milestone, not a refactor footnote.
