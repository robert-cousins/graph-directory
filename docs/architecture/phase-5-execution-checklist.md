# Phase 5 — Execution Checklist

This checklist is used to keep Phase 5 work aligned with Phase 4 boundaries and Phase 5.1 intent docs.

Related:
- `docs/architecture/phase-5-publication-model.md`
- `docs/architecture/core-vs-instance.md`
- `packages/core-db/CONTRACT.md`

---

## Constitutional invariants (never break)

- [ ] apps/* read via `core-data` only
- [ ] apps/* write via `core-mutators` only (server-only)
- [ ] core-data remains read-only
- [ ] core-mutators owns all write paths and enforces gating
- [ ] no instance/app code queries raw tables
- [ ] no instance/app code instantiates service-role clients
- [ ] public visibility is enforced by DB views / public RPCs (not JS filtering)

---

## Stage gating (Phase 5.1 → 5.2 → 5.3+)

### Phase 5.1 (Docs only)
- [ ] Publication model written and agreed
- [ ] Any “open decisions” are explicitly enumerated
- [ ] No schema/view/RPC/app changes introduced

### Phase 5.2 (DB semantics)
- [ ] `published_*` views enforce published-only visibility
- [ ] admin/editor read surface exists (admin-only views/RPCs)
- [ ] RLS invariants updated and tested
- [ ] core-data exposes admin read functions without table access
- [ ] CI green; any public behavioural change is intentional and documented

### Phase 5.3 (Admin workflow)
- [ ] Admin UI only uses core-data + core-mutators
- [ ] All transitions are explicit mutators (no implicit state changes)
- [ ] Audit fields are written consistently
- [ ] Failure modes are safe (no accidental publication)

---

## PR hygiene for Phase 5
- [ ] PR description includes: intent, boundary impact, exit criteria
- [ ] CI green on PR (build-test)
- [ ] No “drive-by” refactors outside phase scope
