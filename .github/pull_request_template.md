## What changed (summary)

## Why (context)

## Core vs Instance impact
- [ ] Core touched (packages/*)
- [ ] Instance touched (apps/* or instances/*)
- [ ] Boundary respected (no instance logic leaked into core)

## DB contracts
- [ ] No DB contract changes
- [ ] DB contract changes (views/RPC) documented in core-db notes

## Invariants checklist (must remain true)
- [ ] Public reads are only from published_* views / RPC
- [ ] No client-side writes to Supabase
- [ ] Publishing gates not weakened
- [ ] “Published” remains distinct from “Exists”

## How to test
- Steps:

## Screenshots (optional)
