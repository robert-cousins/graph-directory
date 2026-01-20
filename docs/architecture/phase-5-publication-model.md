# Phase 5.1 — Publication Model (Intent Encoding Only)

Status: **Authoritative draft** (Phase 5.1)
Scope: **Documentation only** — no runtime or schema changes in this stage.

This document defines the publication lifecycle, visibility rules, and transition authority for Graph-Directory.

It is designed to:
- make public visibility deterministic and enforceable at the database/view layer,
- support safe editorial workflows (draft → review → publish),
- preserve Phase 4 boundaries (Core vs Instance separation).

---

## Goals

1. **Deterministic public visibility**
   - Public pages must only render content that is explicitly *published*.
   - The “published surface” must be definable via DB views / public RPCs.

2. **Explicit lifecycle semantics**
   - A record has a defined lifecycle state.
   - State transitions are explicit operations (not side-effects).

3. **Clear authority**
   - Only `core-mutators` may change lifecycle state.
   - Token/admin gates apply per transition.

4. **Auditability**
   - Publishing is an action attributable to a principal (admin/user/service).
   - Key timestamps and actors are captured.

---

## Non-Goals

- No automation/enrichment (later phases)
- No multi-instance enablement work (later phases)
- No ranking strategy overhaul (later phase)
- No schema.org implementation (later phase)
- No behaviour change in Phase 5.1

---

## Terms

- **Entity**: A graph node (e.g., business, suburb, category) represented in the DB and surfaced via views/RPCs.
- **Listing**: The primary public “business profile” entity in the plumbers instance (generalises to “published entity”).
- **Editorial surface**: Admin/editor-only ability to view and modify non-published content.
- **Public surface**: Everything visible to anonymous users and indexed by search engines.
- **Lifecycle State**: The publication status of a record.

---

## Lifecycle States

We define a minimal set of states that support common workflows while remaining strict.

### `draft`
Work-in-progress. Not publicly visible.

### `review`
Editorially complete and awaiting approval. Not publicly visible.

### `published`
Publicly visible and eligible for indexing. The only state that appears in public views.

### `archived` (optional)
Previously published but intentionally removed from public surface.
Not publicly visible.

> Note: `archived` is optional. If omitted, “unpublish” can transition back to `draft`.
> If included, it provides a clearer semantic distinction between “not ready yet” and “removed”.

---

## State Diagram

draft ── submit_for_review ──▶ review ── publish ──▶ published
▲ │ │
│ └──── request_changes ◀─────┘
│
└──── unpublish / archive ◀────── published

swift
Copy code

If `archived` is implemented:

published ── archive ──▶ archived
archived ── restore ──▶ draft (or review, policy-defined)

yaml
Copy code

---

## Visibility Rules (Authoritative)

### Public visibility
A record is public **if and only if**:

- `lifecycle_state = published`, AND
- any additional constraints required for public correctness are satisfied (e.g., completeness flags, not soft-deleted).

**Only published content appears in:**
- `packages/core-data` read paths (public mode),
- `published_*` views,
- public RPCs.

### Editorial visibility
Admins (and potentially token-authenticated editors) may see:
- `draft`, `review`, `published`, `archived` (depending on policy),
through **admin-only views/RPCs** exposed via core-data.

### Canonical enforcement location
The canonical enforcement should be at the **DB view/RPC boundary**, not in page code.

- Public Next.js routes must not “filter in JS” to enforce publication.
- They should rely on the published surface already being correct.

---

## Transition Authority & Policy

All transitions are performed via `core-mutators` only.

### Who can do what (baseline policy)

| Transition | From → To | Authority |
|---|---|---|
| submit_for_review | draft → review | token-authenticated editor OR admin (policy choice) |
| request_changes | review → draft | admin (or reviewer role) |
| publish | review → published | admin only |
| unpublish | published → draft (or archived) | admin only |
| archive (optional) | published → archived | admin only |
| restore (optional) | archived → draft (or review) | admin only |

> Policy note: If you want a “self-serve listing” workflow, allow token editors to move `draft → review`, but keep `publish` admin-only.

---

## Required Audit Fields (Conceptual)

When implemented (Phase 5.2+), the following fields should exist or be derivable:

- `lifecycle_state`
- `published_at` (nullable)
- `published_by` (nullable, references principal)
- `review_submitted_at` (nullable)
- `review_submitted_by` (nullable)
- `updated_at` (already typical)
- `created_at` (already typical)

Optional but recommended:
- `archived_at`, `archived_by`
- `publication_notes` or `review_notes` (text)

> These should live in core-db migrations and be referenced in `packages/core-db/CONTRACT.md`.

---

## DB Contract Updates (Planned for Phase 5.2)

### Public views
- Update/define `published_*` views so they only return `lifecycle_state = 'published'`.

### Admin views/RPCs
- Add admin-only read access to draft/review entities via RLS + SECURITY DEFINER RPCs or admin-restricted views (implementation choice).
- These must still be consumed through `core-data`, never via raw table queries in apps/instances.

### RLS invariants
- Public role cannot read non-published records.
- Service role access remains server-only and must not leak to instance/app code.

---

## App-Level Expectations (Planned for Phase 5.3)

- Public routes:
  - continue using `core-data` published reads.
  - do not branch behaviour on lifecycle state beyond “not found”.

- Admin/editor routes:
  - use `core-data` admin reads (new).
  - use `core-mutators` transitions.
  - never write directly.

---

## Success Criteria for Phase 5.1 (This Stage)

Phase 5.1 is complete when:

- This document exists and is agreed as the publication “constitution”.
- The team can answer unambiguously:
  1) What content is public?
  2) Where is that enforced?
  3) Who may publish?
  4) What are allowed transitions?
- No schema, view, RPC, or app changes have been made.

---

## Open Decisions (Must be resolved before Phase 5.2)

1. **Do we include `archived`?**
   - Yes if we want an explicit “removed” state.
   - No if we prefer a minimal lifecycle.

2. **Who can submit for review?**
   - Admin-only (simpler), or token editors (self-serve).

3. **Do we need a separate reviewer role?**
   - Probably not initially; admin acts as reviewer.

4. **Do we require completeness checks before publish?**
   - Optional: enforce via DB constraints/flags, or via mutator validation.

---

## Compatibility with Phase 4 Boundary

This model preserves Phase 4 rules:

- `apps/*` only read through `core-data` and write through `core-mutators`.
- Public visibility is enforced by the published surface (views/RPCs).
- Instances cannot bypass gates or query raw tables.
