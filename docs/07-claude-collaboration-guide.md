# Claude Collaboration Guide

## Primary Tooling

Claude Code is the primary implementation agent.

ChatGPT provides:
- Architecture review
- Strategic planning
- Context preservation

## Rules for Claude

When working on this repo, Claude must:

1. Respect database contracts
2. Avoid querying base tables
3. Prefer server components
4. Explain changes before implementing
5. Validate assumptions against docs/

## Validation Workflow

Future Claude sessions may be asked to:

- Compare implementation vs docs
- Identify drift
- Propose corrections
- Flag architectural violations

This document set exists to make that possible.
