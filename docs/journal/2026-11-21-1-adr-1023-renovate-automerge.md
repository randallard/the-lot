# 2026-11-21 (1): template ADR-1023, Renovate automerge

Template ADR-1023 (GitHub `04a73e3`): routine Renovate updates merge themselves once CI passes;
majors stay manual. It came from clearing 26 Renovate PRs by hand in cycle-in and branching-video.
Ryan: *"do 1, 2, and 3"* (template, cycle-in branch protection, adopt downstream).

- `docs/adr/1023-…`, copied byte-identical, plus its index row.
- `renovate.json` gets the template's two rules. Minor and patch updates of 1.0+ packages automerge,
  and so do digest, pin and lockfile-maintenance updates. Majors and 0.x minors stay manual, which
  here includes `three` (0.187) and anything else still below 1.0. `renovate-config-validator` passes.

**The precondition (ADR-1023):** `main` had no branch protection. It now requires 8 checks
(`detect languages`, `docs hygiene`, `ts fast gates`, `ts supply chain`, `SBOM`,
`OSV scan / osv-scan`, `api lint`, `secret scan`), branches must be up to date, a PR is required
(0 approvals), and conversations must be resolved. Admins aren't bound by it. Local `main` was one
Renovate merge behind GitHub (#10, checkout v7.0.1), so it was fast-forwarded first.

Open Renovate PRs (10 or more, several of them majors: vitest 5, vite 8, globals 17,
`@vitejs/plugin-react` 6, jest-dom 8, setup-node v7) are not triaged here. Once this merges, the
green non-major ones should merge themselves. The majors need a person.
