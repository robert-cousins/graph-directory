# Entity Model & SEO Logic

## Core Entities

- Business
- Service
- Service Area (suburb-level)
- Credential (license)
- Availability (capability, not schedule promises)

Each entity exists independently and is linked via junction tables.

## Emergency Plumbing Clarification

"Emergency plumber" is **not** a standalone entity.

Instead:
- Emergency availability is a *capability*
- Represented by presence of `is_emergency = true` availability windows
- Surfaces as `emergency_available` in the published view

This avoids SEO duplication and semantic confusion.

## SEO Philosophy

Pages are generated from **entity intersections**, not keyword stuffing:

Examples:
- /plumbers
- /plumbers/service/blocked-drains
- /plumbers/area/melville
- /plumbers/service/blocked-drains?emergency=true

Each page:
- Has a clear entity scope
- Is query-backed
- Can be reasoned about by machines

## Why This Matters for AI

This structure allows:
- Validation of completeness
- Detection of thin pages
- Automated expansion (future)
- Entity graph visualization (future)

SEO becomes a **systems problem**, not a content problem.
