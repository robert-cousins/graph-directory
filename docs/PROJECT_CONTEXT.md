# Graph Directory – Project Context

## Overview

This project is a **Next.js 14 local services directory** (initial vertical: plumbers in Melville/Myaree, WA) backed by **Supabase (Postgres)**.

The core goal is to build a **high-integrity, publication-gated directory** where:
- Businesses are *not* public by default
- Publication requires verifiable evidence (licenses, coverage, services)
- Frontend queries only *published, verified* data
- Schema and UI are designed for future expansion to other service verticals

This is NOT a CRUD demo or SaaS template. It is a **data-governed directory system**.

---

## Key Architectural Principles

### 1. Publication Gate Is Sacred
Businesses must **never appear publicly** unless:
- They are explicitly marked `status = 'published'`
- They have at least one verified credential
- Required structural data exists (services, service areas)

This rule is enforced at **multiple layers**:
- Database views (`published_businesses`)
- SQL validation functions
- Frontend service layer contracts

No frontend component is allowed to “decide” publication status.

---

### 2. Frontend Never Queries Raw Tables
Frontend code **must not** query:
- `businesses`
- `credentials`
- `availability_windows`
- any raw junction tables

Instead, it queries:
- `published_businesses` (view)
- or approved SQL functions (`get_businesses_by_service`, etc.)

This prevents:
- accidental data leaks
- inconsistent filtering
- duplication of publication logic

---

### 3. Mock / Legacy Data Is Treated as Untrusted
Legacy `plumbers` data was:
- partially synthetic
- time data was unreliable
- inconsistent formatting (hours, emergency availability)

As a result:
- Business hours migration was intentionally conservative
- Raw hours preserved separately
- Emergency availability treated as a *capability flag*, not a schedule

The system prefers **absence of data over false certainty**.

---

### 4. URL = Source of Truth for Filters
Filtering and pagination are:
- driven by URL search params
- parsed server-side
- mirrored client-side only as a UI convenience

This ensures:
- shareable URLs
- SSR correctness
- no hidden state
- predictable caching behavior

---

### 5. Clean Break From Legacy Types
The legacy `Plumber` type is **deprecated**.

A new type was introduced:
- `PublishedBusiness`
- matches the database view exactly
- enforces snake_case → camelCase conversion in one place

This prevents schema drift and silent mismatches.

---

## Non-Goals (Explicit)

This project intentionally does NOT include:
- authentication flows
- admin dashboards
- onboarding forms
- role-based UI
- styling refactors during data-layer changes

These may exist later, but are **out of scope** for Phases 1–2.

---

## Status (as of Phase 2 completion)

- Phase 1: Database schema + publication gates ✅
- Phase 2: Frontend migration to published view ✅
- Phase 2.5: Filter bridge components added ✅
- Exactly one business published (expected) ✅

Phase 3 will focus on:
- legacy route removal
- SEO structure
- content expansion
