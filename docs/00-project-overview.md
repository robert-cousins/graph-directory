# Project Overview

> Status: Draft  
> Last updated: 2026-01-09  
> Scope: What this project is, what it is not, and how to read the docs set.

## Why this exists

We re-architected a basic local plumber directory into a **graph-first, entity-based directory system** with explicit database-backed contracts and publication gates.

This document prevents “why is it like this?” confusion and stops architectural drift as features expand (other trades, new cities, submissions, SEO, etc.).

## Key decisions

- Treat the directory as an **entity graph** (businesses, services, areas, credentials, availability) rather than a collection of keyword pages.
- Make **Postgres/Supabase** the source of truth, with public reads served via stable **views/functions**.
- Enforce publishing correctness via database rules (not frontend logic).
- Use **URL search params** as the canonical filter state to keep SSR deterministic and shareable.

## Implications

- Public pages must never read from raw tables directly.
- “Published” means “safe for the public,” not “exists in the DB.”
- Legacy schema and routes are transitional and will be removed intentionally in Phase 3+.
- These docs are written to be readable by both humans and coding agents (Claude Code).
