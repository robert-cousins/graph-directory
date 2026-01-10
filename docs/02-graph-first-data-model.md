# Graph-First Data Model

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: The conceptual graph model and the relational implementation approach.

## Why this exists

“Graph-first” here means: the *mental model* and query patterns are graph-like even though storage is relational.

This enables entity-based SEO, faceted navigation, and future AI-driven reasoning without requiring a dedicated graph database.

## Key decisions

- Use relational tables with explicit relationships:
  - `businesses` as the primary node
  - `service_types` as normalized service catalog
  - `service_areas` as normalized geography (suburb-level in v1)
  - `credentials` as verifiable evidence
  - `availability_windows` for capability flags (especially emergency)
- Use junction tables for many-to-many edges:
  - `business_services`
  - `business_service_areas`
- Expose a public, aggregated contract via:
  - `published_businesses` view

## Implications

- New “entities” should generally be modeled explicitly (table + relationship) rather than embedded in a JSON blob.
- Not everything deserves a first-class entity (example: “emergency plumber” is a capability, not a node).
- The public contract is allowed to denormalize (arrays, computed fields) for read efficiency and stability.
