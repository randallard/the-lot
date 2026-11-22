# 2026-11-22 (2): template ADR-1024, and Renovate off the Vercel build quota (ADR-0077)

Two changes on one branch, `adr-1024-and-0077`. Numbered (2) because the other machine's 11-22 work
(ADR-0076, the daily check) isn't on `data` yet.

## Template ADR-1024: an explicit `deny.toml`

Template `51b0a28` + `a013203` (GitHub `300d4e4`). It came from cargo-deny 0.22 narrowing
`unmaintained` to direct dependencies. Ryan: *"Do it"*.

- `docs/adr/1024-…`, copied byte-identical, plus its index row.
- `deny.toml`, the template's, byte-identical. This repo had none. The `rust supply chain` job is
  skipped here (no Rust yet), so nothing reads it until there's a crate.
- `ci.yml`: cargo-deny-action `3c63498…` (`# v2`, which was v2.1.1) → `17aeb3c…` v2.1.3, the
  template's line. Renovate's #18 carries the same bump. Once this merges it has nothing left to
  change, and Renovate closes it.

The other action pins still trail the template (rust-toolchain, rust-cache, pnpm/action-setup).
That's Renovate's to bring in, and not part of this change.

## ADR-0077: no previews for Renovate branches, and a Monday window

Ryan, on #18 stalling: *"the Vercel limit is something we need to factor in - is there a way to
batch these there or something to go either once in a while and leave room for builds while we're
working through something?"*

- **Measured first:** on 11-22 the-lot used roughly 140 preview builds and 8 production builds
  between 07:00 and 22:00 UTC, nearly all the previews on `renovate/*` branches. Each automerge
  sends Renovate back to rebase the other ~13 open PRs (`main` requires branches up to date), and
  Vercel builds every rebase. #18 then had all 8 required checks green and a red Vercel check
  (`build-rate-limit`), which is enough to stop Renovate's automerge.
- `vercel.json` (new): `git.deploymentEnabled` is `false` for `renovate/**`. `main` and every other
  branch deploy as before.
- `renovate.json`: `timezone` `America/Los_Angeles`, `schedule` `* 2-7 * * 1`, the same window on
  `lockFileMaintenance`. Ryan asked for 2am on Mondays. The window runs to 8am because the hosted
  app doesn't run every hour, and with up-to-date branches required, the PRs merge one rebase at a
  time. `renovate-config-validator` passes (one native-module warning from `re2`, not the config).

**Also: *Allow auto-merge* is on**, in this repo and square-one (Ryan: *"Yes auto merge"*). It's a
GitHub repo setting, not a file, so it isn't in the diff. Renovate's `platformAutomerge` default now
hands a green PR to GitHub, which merges it as soon as its checks pass, instead of waiting for
Renovate's next run. That lets more of the queue through in one Monday window. The rebase that
each merge forces on the next PR still waits for a Renovate run. square-one has no Vercel check, so
it gets neither of the file changes.

## Checks

`scripts/docs-hygiene.py` is clean locally (the same 3 long-ADR warnings as before, none new).
The rest of CI runs on the PR. The Vercel half can only be confirmed after the merge: the next
`renovate/*` push should show no Vercel check at all.
