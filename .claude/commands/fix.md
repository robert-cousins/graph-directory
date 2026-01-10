---
name: fix
description: Run typechecking and linting, then spawn parallel agents to fix all issues
---

# Project Code Quality Check

This command runs all linting and typechecking tools for this project, collects errors, groups them by domain, and spawns parallel agents to fix them.

## Step 1: Run Linting and Typechecking

Run the appropriate commands for this Next.js TypeScript project:

```bash
pnpm typecheck
pnpm lint
```

Capture the full output from both commands.

## Step 2: Collect and Parse Errors

Parse the output from the linting and typechecking commands. Group errors by domain:

- **Type errors**: Issues from TypeScript (`tsc --noEmit`)
  - Look for error codes like `TS####`
  - Parse file paths and line numbers
  - Extract error messages

- **Lint errors**: Issues from ESLint (`next lint`)
  - Look for warning/error markers
  - Parse file paths and line numbers
  - Categorize by rule violations

Create a structured list:
1. Count total errors by domain
2. List all affected files
3. Group specific errors by file

## Step 3: Spawn Parallel Agents

**IMPORTANT**: If there are errors, use a SINGLE response with MULTIPLE Task tool calls to run agents in parallel.

For each domain that has issues, spawn an agent:

**Type Fixer Agent** (if type errors exist):
- Prompt: "Fix all TypeScript type errors in the following files: [file list]. The specific errors are: [error details]. After fixing, run `pnpm typecheck` to verify all type errors are resolved."
- Use Task tool with subagent_type: "general-purpose"

**Lint Fixer Agent** (if lint errors exist):
- Prompt: "Fix all ESLint errors in the following files: [file list]. The specific errors are: [error details]. After fixing, run `pnpm lint` to verify all lint errors are resolved."
- Use Task tool with subagent_type: "general-purpose"

Example parallel execution:
```
[Single message with multiple tool calls]
- Task tool call #1: type-fixer agent
- Task tool call #2: lint-fixer agent
```

## Step 4: Verify All Fixes

After all agents complete:

1. Run the full check again:
   ```bash
   pnpm typecheck
   pnpm lint
   ```

2. Verify that all errors are resolved

3. Report final status:
   - ✅ All type errors fixed
   - ✅ All lint errors fixed
   - Or list any remaining issues

## Special Notes for This Project

- TypeScript strict mode is enabled
- Next.js App Router patterns (server vs client components)
- Database column transformations (snake_case → camelCase)
- Always use `@/*` path aliases for imports
- Server actions require `"use server"` directive
