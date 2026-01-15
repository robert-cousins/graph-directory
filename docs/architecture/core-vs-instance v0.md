# Core vs Instance Architecture Contract

**Project:** Graph-First Directory  
**Phase:** 4 — Structural Core / Instance Extraction  
**Status:** Constitutional (binding)

---

## Purpose of This Document

This document defines the **authoritative boundary** between the **Core framework** and **Instance implementations** in the Graph-First Directory project.

It exists to:

- Prevent instance-specific logic from polluting core
- Preserve Phase 1–3 invariants
- Enable future verticals without copy-paste
- Encode architectural intent structurally, not socially

If code conflicts with this document, **the code is wrong**.

---

## Architectural Principles (Non-Negotiable)

These principles are frozen as of Phase 3 and must remain true.

1. **Graph-first does NOT mean graph database**
   - Entities + relationships are first-class
   - Postgres is the truth layer

2. **Published ≠ Exists**
   - Only `published` entities are publicly visible
   - Existence alone grants no visibility

3. **Pages are projections**
   - Pages are renderings of entity graphs
   - URLs and filters do not define data truth

4. **Public reads use stable DB contracts only**
   - Views and RPCs
   - Never raw tables

5. **Write access is framework-controlled**
   - Token-gated edits
   - Admin-gated publication
   - No client-side writes

---

## Core Framework Responsibilities

Core is **vertical-agnostic** and **brand-agnostic**.

Core owns:

### 1. Data Truth & Contracts
- Entity schema (businesses, services, areas, credentials, availability)
- Relationship tables
- Status workflow (`draft → pending_review → published → suspended`)
- Views (e.g. `published_businesses`)
- RPCs for public querying and controlled mutation

### 2. Write Semantics
- Submission flow
- Edit-by-token flow
- Admin publish / suspend actions

### 3. Guards & Invariants
- Status transition rules
- Verification requirements
- Token security (hashing, constant-time comparison)
- Emergency availability semantics (capability, not scheduling)

### 4. Query Contracts
- Canonical public read shapes
- Stable, versionable interfaces

### 5. Framework Guarantees
- No instance can weaken publish gates
- No instance can bypass verification
- No instance can redefine “published”

---

## Instance Responsibilities (Explicitly Limited)

An instance represents **one vertical expression** of the framework  
(e.g. `plumbers`, `electricians`, `venues`).

An instance may define:

- Vertical labels and terminology
- Service taxonomy and area taxonomy
- SEO copy and templates
- Ranking preferences (pure functions)
- Presentation and UX
- Which core capabilities are used

An instance may **not**:

- Write to Supabase directly
- Query raw tables
- Modify publication semantics
- Introduce new required entity fields
- Redefine emergency availability
- Weaken verification or status rules

Instances consume core — they do not modify it.

---

## Structural Enforcement

Architecture is enforced by **structure**, not convention.

### Repo-Level Enforcement

- Core logic lives only in `packages/core-*`
- Instances live only in `apps/*` and `instances/*`
- Core packages never import from instances
- Instances never import from core internals

### Data Access Enforcement

- Public app code can access:
  - Views
  - Approved RPCs
- Raw tables are inaccessible outside core-db

### Write Enforcement

- All writes flow through core-mutators
- Client code never talks to Supabase directly
- Admin actions are explicit and trusted

---

## Phase 4 Scope Control

Phase 4 explicitly **does not** include:

- New features
- Admin UI
- SEO strategy changes
- Ontology expansion
- Auth/accounts
- Automation or AI
- Behaviour changes of any kind

Any behaviour change invalidates Phase 4.

---

## Phase 4 Exit Criteria

Phase 4 is complete only when:

- Core and instance code are structurally separated
- Plumbers instance behaves identically to Phase 3
- CI passes unchanged
- A second instance could be added without copying core logic
- This document remains true

---

## Change Policy

- Changes to this document require explicit review
- Any change implies an architectural decision
- Silent drift is not allowed

This document is the **constitutional law** of the repository.

