# Project Intent: Graph-First Directory Architecture

## Purpose

This project is a deliberate re-architecture of a simple local business directory
(plumbers in Melville / Myaree / Booragoon) into a **graph-first, entity-driven system**
designed for:

- Entity-based SEO
- Scalable directory expansion
- AI-assisted reasoning and validation
- Clean separation of data, queries, and presentation

This is *not* a generic CRUD directory.

It is an experiment in:
- Explicit data contracts
- Database-enforced publishing rules
- URL-driven state
- Human-readable + machine-tractable structure

## Non-goals (Important)

The following are intentionally excluded **for now**:

- User authentication flows
- Admin dashboards
- Business self-onboarding UX
- Real-time editing
- Styling refactors
- Over-abstracted frameworks

This allows architectural clarity before feature accretion.

## Guiding Principles

1. **Entities before pages**
2. **Database as source of truth**
3. **Views and functions as contracts**
4. **URLs are state**
5. **Server-side rendering by default**
6. **Legacy compatibility during transition**
7. **Every decision must be explainable**

This document set exists so future contributors (human or AI)
can understand *why* things look the way they do.
