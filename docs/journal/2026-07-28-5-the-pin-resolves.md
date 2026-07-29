# 2026-07-28 (5) — The pin resolves

*Documents commit `1976f7f`. Continues from
[one resolver, and a gate that wasn't running](2026-07-28-4-one-resolver-and-a-gate-that-was-not-running.md).*

Ryan pushed square-one's `v0.2.0`, so the release that had been half done since 2026-07-27
could finish. Short entry, because it went exactly as the runbook in PROGRESS.md said it
would — which is the interesting part.

## What actually got verified

The link override was the whole reason for the wait. With `square-one: link:../square-one` in
`pnpm-workspace.yaml`, the pin is inert and every green gate in this repo says nothing about a
fresh clone. That is ADR-0006's footgun stated precisely: **green-against-link and
red-against-pin are indistinguishable until you remove the link.**

So the check was not "do the tests pass" — they had been passing all along, against the
sibling checkout. It was:

- `node_modules/square-one` now resolves to
  `.pnpm/square-one@https+++codeload.github.com+…+660fe33`, not `../square-one`.
- The remote tag dereferences to `660fe33` — the same sha the `allowBuilds` key was already
  written for.
- pnpm ran square-one's `prepare` (`tsc -p tsconfig.build.json`) during install. That is the
  entire reason `allowBuilds` carries a sha-keyed entry: square-one's `dist/` is gitignored,
  so a consumer has to build it after cloning. The key had been written on 2026-07-27 and
  never exercised; now it has been.

Then the ordinary gates, from that install: `tsc -b` clean, eslint 0 errors, 295 tests, build
clean, audit 1 high ignored.

## The three files are a set

`package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` were held back through **six**
commits of M4 work rather than riding along with any of them. Committing the pin without the
lockfile, or either without the workspace file, leaves the repo describing a dependency state
it does not have. They only mean anything together, and today they landed together.

Holding them back had a second benefit nobody planned: it kept a visible reminder in
`git status` for a day and a half that a release was outstanding. A dirty working tree is a
poor todo list, but it is an insistent one.

## Checked while here: CI never had the hole

The previous entry found that `tsc --noEmit` typechecks nothing in this repo, and I had been
running it by hand all session. The obvious follow-up worry was whether CI shared the bug.

It does not. `.github/workflows/ci.yml`'s *ts fast gates* job runs `pnpm lint`, `pnpm test`,
`pnpm build` — and `pnpm build` is `tsc -b && vite build`. The nine gates were always real.
The hole was in hand-run commands only, which is its own small lesson: **the safest local
habit is to run what CI runs**, rather than a hand-rolled approximation of it. Written into
PROGRESS.md next to the warning.

Also stale and now corrected there: the note that `pnpm test` refuses to run behind
`ERR_PNPM_IGNORED_BUILDS`. It runs fine after today's reinstall.

## Where this leaves the repo

Working tree clean for the first time in days, and nothing here behaves differently from a
fresh clone. M4 is done: the frame, the driver, the arm channel, the expression layer,
ADR-0010 and its enforcement, and now the dependency it was all built against.
