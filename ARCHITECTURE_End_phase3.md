Perfect timing to do this. Below is a **clean, durable capture of the architecture** you’ve actually built (not aspirational), plus **explicit phase boundaries** you can reuse for future chats and Claude prompts.

You can treat this as canonical. If you paste this into your repo as `ARCHITECTURE.md`, it will also serve as an anchor document for future AI work.

---

# ARCHITECTURE.md

**Graph-First Local Services Directory**

*Last updated: Phase 2 complete*

---

## 1. Purpose & Design Philosophy

This project is a **graph-first, entity-based local services directory** built with:

* **Next.js 14 (App Router)**
* **Supabase / PostgreSQL**
* **Server-side data contracts**
* **Explicit publication gates**

It is designed to:

* Avoid keyword-stuffed SEO pages
* Treat businesses, services, areas, and credentials as **first-class entities**
* Enforce correctness at the database boundary
* Allow public submissions without full user auth
* Scale cleanly to other trades (electricians, HVAC, etc.)

> The application is intentionally thin.
> The database is the source of truth.

---

## 2. High-Level System Overview

```
Browser
  │
  │  (URL params = state)
  ▼
Next.js Server Components
  │
  │  (typed query contracts)
  ▼
Supabase (Postgres)
  │
  ├── Tables (authoritative data)
  ├── Views (public read contracts)
  └── Functions (optimized filters)
```

Key rule:

> **Pages never query raw tables directly.**
> Public pages read from `published_businesses` or approved SQL functions only.

---

## 3. Core Domain Model (Graph)

### Primary Entities

* **businesses**

  * Core node representing a company
  * Lifecycle controlled by `status`
  * Owns relationships to services, areas, credentials

* **service_types**

  * Normalized service catalog (e.g. “Blocked Drains”)
  * Many-to-many with businesses

* **service_areas**

  * Geographic coverage (currently suburbs)
  * Many-to-many with businesses

* **credentials**

  * Licenses / certifications
  * Verification is **manual**
  * Publication requires at least one verified license

* **availability_windows**

  * Used primarily for emergency capability
  * Emergency is modeled as a **capability**, not live scheduling

### Junction Tables

* `business_services`
* `business_service_areas`

---

## 4. Publication Gate (Critical)

A business is visible publicly **only if**:

* `businesses.status = 'published'`
* At least one verified credential exists
* At least one service is attached
* At least one service area is attached
* Required fields are present

This logic is enforced by:

* Database views
* SQL validation functions
* Server-side write paths

There is **no client-side bypass**.

---

## 5. Read Model (Public Contract)

### `published_businesses` (VIEW)

This is the **only public read contract**.

It:

* Joins and aggregates services and areas
* Computes `emergency_available`
* Exposes verification metadata
* Filters out unpublished businesses

Public pages depend on this view exclusively.

---

## 6. Application Layers

### 6.1 Types (Explicit Boundaries)

Three layers of types exist:

1. **Database Row Types**

   * Match Supabase exactly
   * e.g. `rating: string`

2. **Application Types**

   * Normalized for UI
   * e.g. `rating: number`
   * CamelCase fields
   * Computed fields (e.g. `displayName`)

3. **Filter / Query Types**

   * Define URL-driven state
   * Used by service layer only

---

### 6.2 Data Access Layer

`lib/business-service.ts`

Responsibilities:

* Encapsulate all Supabase queries
* Convert DB rows → app types
* Handle pagination, sorting, filtering
* Never throw; always return safe shapes

Key contracts:

* `listPublishedBusinesses`
* `getPublishedBusinessBySlug`
* `listPublishedBusinessesByService`
* `listPublishedBusinessesByArea`

---

### 6.3 Routing Model

Routes are **entity-oriented**, not keyword-oriented.

* `/plumbers`
* `/plumbers/service/[service]`
* `/plumbers/area/[area]`
* `/plumber/[slug]`

Filtering and pagination are URL-driven:

```
?emergency=true
&verified=true
&minRating=4
&page=2
```

---

## 7. Client vs Server Responsibilities

### Server Components

* Fetch data
* Enforce contracts
* Render results

### Client Components

* Manage UI state only
* Sync state ↔ URL params
* Never fetch business lists directly

### Bridge Pattern (Important)

Because legacy filter components were stateful, a **client bridge component** was introduced:

* Reads URL params
* Manages filter UI state
* Pushes changes back to URL
* Avoids infinite loops

This preserves:

* Server-side data correctness
* Client-side UX flexibility

---

## 8. Submission & Editing Model (Planned / In Progress)

Because there is no auth yet:

* Businesses are owned via **edit tokens**
* Token is generated on submission
* Only a hash is stored server-side
* Edit URL acts as a magic link

All writes:

* Occur server-side
* Use service role
* Respect publication gates

---

## 9. What Is Explicitly *Not* Implemented (By Design)

* No automatic credential verification
* No user accounts
* No live availability scheduling
* No SEO keyword pages
* No direct client writes to the database
* No styling refactors during architecture phases

---

## 10. Phase Boundaries (Very Important)

Use these boundaries to keep future work clean and future chats focused.

---

### ✅ Phase 1 — Data Foundation (Complete)

**Scope**

* New normalized schema
* Migration from legacy data
* Publication gates
* Views and SQL functions
* Validation scripts

**Locked**

* Schema structure
* Publication rules
* Verification model

---

### ✅ Phase 2 — Read & Browse Experience (Complete)

**Scope**

* Server-side filtering & pagination
* Service & area routes
* Detail pages
* Type safety
* Client filter bridge
* Build passes

**Locked**

* Read contracts
* Routing patterns
* URL-driven state model

---

### ▶ Phase 3 — Submission & Ownership (Current)

**Scope**

* `/list-your-business`
* `/plumber/[slug]/edit`
* Edit token model
* Server-side write paths
* Status transitions

**Not yet locked**

* Token rotation policy
* Email confirmation rules
* Admin moderation UX

---

### ⏳ Phase 4 — SEO & Entity Surfaces (Future)

**Scope**

* Metadata generation
* Schema.org markup
* Entity landing pages
* Internal linking strategy

---

### ⏳ Phase 5 — Trust & Scale (Future)

**Scope**

* Auth (optional)
* Reviews
* Abuse prevention
* Audit trails
* Multi-region support

---

## 11. How to Start a New Chat (Canonical Prompt)

When starting a new chat, paste this:

```text
We are working on a graph-first local services directory.

Current state:
- Phase 1 and Phase 2 complete
- Normalized Postgres schema with publish gates
- Public reads from published_businesses view only
- Server-side filtering, pagination, service & area routes
- No auth yet
- Manual credential verification
- Client filter bridge syncing UI state to URL params

- Phase 3 is now complete
- Public submission
- Secure edit-token ownership
- Server-side writes only
- No auto-publish
