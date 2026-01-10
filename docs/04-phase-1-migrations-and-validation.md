# Phase 1: Migrations & Validation

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: How Phase 1 migrations were executed, what issues occurred, and how validation is performed.

## Why this exists

Migrations are where reality differs from intent. This document records the safe execution approach and the reasoning behind “conservative parsing” and validation scripts.

## Key decisions

- Treat legacy/mock hours data as untrusted:
  - Prefer preserving raw values rather than forcing parsing that can fail or silently corrupt.
- Maintain explicit validation queries to confirm invariants:
  - published requires verified license
  - email nullable
  - no orphan junction rows
  - pending_review is default post-migration
- Keep the legacy `plumbers` table untouched as a source-of-truth snapshot for migration testing.

## Implications

- If migrations fail due to malformed time strings, it is acceptable to skip migrating hours entirely (especially for mock data).
- Validation scripts are not optional — they are the “unit tests” for the database state.
- The database should be considered correct only after validation queries pass.
