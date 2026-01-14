# Phase 4 Parity Checklist

**Goal:** Phase 4 is a structural extraction only. **No runtime behaviour changes** are allowed.  
**Pass condition:** Every checklist item below is verified and marked ✅ before merging Phase 4 to `main`.

---

## How to Use This Checklist

- Run checks on the Phase 4 branch and compare to baseline (Phase 3 `main`).
- If any item fails, Phase 4 is not complete.
- Manual verification is acceptable for Phase 4.

**Baseline reference:** Phase 3 behaviour and invariants.

---

## A. Repo Structure Parity (Structural Only)

- [ ] Repo has `apps/`, `packages/`, `instances/`, `docs/` in root.
- [ ] Plumbers Next.js app runs from `apps/plumbers`.
- [ ] Core logic extracted into `packages/core-*` (no plumbing-specific copy/branding inside core).
- [ ] Instance-only material lives in `instances/plumbers` (config/seeds/ranking/copy), not in core.

---

## B. Public Read Contract Parity (Non-Negotiable)

- [ ] `/plumbers` reads only from `public.published_businesses` and/or approved RPCs.
- [ ] `/plumbers/service/[service]` reads only from approved RPCs / view.
- [ ] `/plumbers/area/[area]` reads only from approved RPCs / view.
- [ ] `/plumber/[slug]` reads only from approved RPCs / view.
- [ ] No route/component queries raw tables (e.g. `businesses`, `service_types`, junctions) directly.

**Verification method (choose one):**
- [ ] Ripgrep scan: no direct `from('businesses')` / `from('service_types')` in app code
- [ ] Runtime logs / service layer inspection confirms view/RPC only

---

## C. Write Semantics Parity (Non-Negotiable)

### Submission Flow (/list-your-business)

- [ ] Submission still creates records in the correct status (Phase 3 behaviour).
- [ ] Submission still uses server action (no client-side Supabase writes).
- [ ] Success still shows **ONE-TIME** edit link + warning copy.
- [ ] Countdown + redirect behaviour unchanged.
- [ ] No cache revalidation on submission (Phase 3 invariant).

### Edit Flow (/plumber/[slug]/edit?token=...)

- [ ] Token gating unchanged (token required, validated server-side).
- [ ] Token comparison remains constant-time semantics (no naive string compare).
- [ ] Edit updates are performed server-side only.
- [ ] Behaviour for invalid token unchanged (same UX and status codes).

### Admin Gate / Publication

- [ ] Publish still requires explicit admin action (no auto-publish introduced).
- [ ] Verified credentials requirement for publish unchanged.
- [ ] “Published ≠ exists” invariant remains true.

---

## D. Emergency Availability Semantics Parity

- [ ] Emergency remains a capability derived from emergency windows / semantics.
- [ ] No “available now” real-time scheduling logic introduced.
- [ ] `emergency_available` field behaviour unchanged in public projections.

---

## E. UI / Route Behaviour Parity (User-Visible)

### Listing routes

- [ ] `/plumbers` renders and filters identically (URL search params remain canonical state).
- [ ] Filters still sync to URL search params (bridge behaviour unchanged).
- [ ] SSR behaviour unchanged (no unexpected client-only rendering introduced).

### Detail route

- [ ] `/plumber/[slug]` renders the same data fields and layout as baseline.
- [ ] 404 / not-found behaviour unchanged for missing/unpublished slugs.

### Performance & caching (sanity)

- [ ] No new revalidation triggers introduced except where Phase 3 already had them.
- [ ] Any revalidation still occurs only when public visibility changes (publish/suspend), not on draft/pending_review.

---

## F. Data Parity (Sanity Checks)

On the same Supabase database:

- [ ] The count of `published` businesses returned by `public.published_businesses` matches baseline.
- [ ] The single test published business still appears publicly.
- [ ] Pending_review businesses do not appear publicly.

Optional query notes / evidence:
- Evidence link(s) or screenshot(s):
  - [ ] Added to PR description or docs

---

## G. Boundary Enforcement Parity (Anti-Creep)

- [ ] `packages/core-*` do not import from `apps/*` or `instances/*`.
- [ ] `apps/plumbers` does not import from core internals (only public entrypoints).
- [ ] Instance code cannot bypass core-mutators for writes.
- [ ] Service layer contract remains the only path from routes to DB reads.

---

## H. Build & CI Parity

- [ ] `pnpm lint` passes on the Phase 4 branch.
- [ ] `pnpm typecheck` passes on the Phase 4 branch.
- [ ] `pnpm build` passes on the Phase 4 branch.
- [ ] GitHub Actions CI is green.

---

## Phase 4 Final Sign-off

- [ ] I confirm Phase 4 introduced **no behaviour changes**, only structural extraction.
- [ ] I confirm the plumbers instance is identical to Phase 3 in runtime behaviour.
- [ ] I confirm core vs instance boundary is structurally encoded and enforced.

**Signed-off by:** _______________________  
**Date:** _______________________

