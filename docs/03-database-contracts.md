# Database Contracts

## Immutable Contracts

The following are considered **public contracts**:

- View: `published_businesses`
- RPC:
  - `get_businesses_by_service(slug)`
  - `get_businesses_by_area(slug)`
  - `check_publication_requirements(business_id)`

Application code must depend ONLY on these.

## Why Views Matter

Views provide:
- Stable schemas
- Aggregated relationships
- Centralized business logic
- RLS compatibility

Changing a view requires intent and documentation.

## Publication Rules

A business may only be published if:

- Status = `published`
- At least one verified credential exists
- At least one service exists
- At least one service area exists
- Required fields are present

These rules live in the database, not the UI.

## Legacy Table Policy

The legacy `plumbers` table:
- Remains untouched
- Is used only as a migration source
- Is never queried by application routes

This avoids breaking historical assumptions.
