# Phase 1: Database Design

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: The Phase 1 schema foundations and what correctness rules are enforced in the DB.

## Why this exists

Phase 1 established a normalized schema, publication lifecycle, and DB-level query contracts. This is the foundation everything else relies on.

## Key decisions

- Create normalized entity tables and edges:
  - businesses, service_types, service_areas, credentials, availability_windows
  - business_services, business_service_areas
- Use UUID primary keys for new core entities to avoid enumeration and to support distributed creation.
- Introduce a status lifecycle:
  - `draft` → `pending_review` → `published` → `suspended`
- Make email nullable (legacy/mock data may not include it).
- Model emergency availability as a **capability** (presence of an emergency window), not real-time schedule logic.

## Implications

- The schema supports multi-trade extensibility by adding a “trade” dimension later (or a parent `business_categories` model), without rewriting core edges.
- Any future “publish gate” must be enforceable via SQL checks or functions — not UI-only validation.
- Migration should be idempotent where possible and should never mutate legacy tables.
