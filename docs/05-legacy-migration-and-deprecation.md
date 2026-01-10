# Legacy Migration & Deprecation Strategy

## Why Legacy Is Preserved

Legacy code is preserved to:
- Avoid destabilizing working features
- Enable side-by-side validation
- Allow gradual rollout

## Current State

- `types/plumber.ts` → @deprecated
- `lib/plumber-service.ts` → @deprecated
- Routes still exist but are no longer primary

## Rules

- No new code may depend on legacy services
- Legacy code may be deleted only after:
  - Phase 2 is validated
  - Routes fully switched
  - No regressions observed

## Deletion Is a Phase, Not a Refactor

Deletion will be intentional and documented,
not opportunistic.
