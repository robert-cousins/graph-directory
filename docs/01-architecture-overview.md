# Architecture Overview

## High-Level Stack

- Next.js 14 (App Router)
- Supabase (Postgres + RPC + Views)
- Server Components for data fetching
- Client Components only for interactive UI state
- Claude Code as the primary implementation agent

## Architectural Shape

This system follows a **contract-first** architecture:

Database (tables)
↓
Database contracts (views + RPC)
↓
Service layer (TypeScript)
↓
Routes (server components)
↓
UI components

markdown
Copy code

No route or component is allowed to query base tables directly.

## Why Graph-First (Without a Graph DB)

Although PostgreSQL is relational, the *logical model* is graph-like:

- Businesses
- Services
- Service Areas
- Credentials
- Availability

These form a many-to-many network that supports:
- Faceted navigation
- SEO page generation
- Entity reasoning

We deliberately avoid RDF / Neo4j for:
- Operational simplicity
- Strong typing
- SQL-native validation
- Supabase compatibility

## Server vs Client Boundary

- **Server components**:
  - Fetch data
  - Apply filters
  - Enforce contracts

- **Client components**:
  - Manipulate URL params
  - Provide interactive controls
  - Never own canonical data

This keeps hydration minimal and logic auditable.
