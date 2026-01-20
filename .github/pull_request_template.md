## Release Safety Gate (integration)

- [ ] PR targets **integration** (not main)
- [ ] All required checks are ✅ green (build-test)
- [ ] No behaviour changes unless explicitly intended for this phase
- [ ] No secrets committed
- [ ] Manual smoke completed (if applicable)

### Notes for coding agent
(What changed, why, and any risk)

Repo merge policy (must follow):

- You may merge PRs ONLY into `integration`, never into `main`.
- You may merge only when:
  - PR is not Draft
  - All required checks (including build-test) are green
  - No merge conflicts
  - PR description includes the safety checklist and it is accurate

- Do NOT bypass branch protection rules.
- If checks are not running, do not merge; report why (workflow trigger / required checks missing).

- Only Robert merges `integration` -> `main` PRs.
