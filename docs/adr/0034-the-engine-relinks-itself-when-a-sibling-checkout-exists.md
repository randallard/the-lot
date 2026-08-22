# ADR-0034: The engine re-links itself when a sibling checkout exists
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude

## Context

square-one is consumed as a **pinned git dependency** (planning ADR-0006) and is developed in the
same sitting as this repo. Those two facts fight, and the fight has no error message.

`pnpm install` resolves the pin, fetches the tarball and rewrites `node_modules/square-one`. Any
co-development link is gone, silently, and the scene keeps working — **on the old engine**. It
happened on 2026-08-21 while bumping the pin to v0.3.0: the link had been a symlink to
`../square-one` since ADR-0006's "local link during co-development", the bump made pnpm actually
fetch for the first time, and the symlink was replaced. Hand-symlinking it back worked until the
next install.

The failure mode is the bad kind. Nothing breaks; edits to the engine stop having any effect, and
the first symptom is a measurement that will not move.

## Decision

**A script re-links `node_modules/square-one` to `../square-one` when that checkout exists, and
does nothing when it does not.** `scripts/link-engine.mjs`, run from `dev`, `build`, `test`,
`test:coverage`, `postinstall`, and available as `pnpm link:engine`.

The condition is the **checkout itself**, which is what makes it safe: CI clones one repo, so
`../square-one` is absent and the script exits before touching anything. `pnpm install
--frozen-lockfile` in `ci.yml` resolves the pin exactly as before.

`SQUARE_ONE_NO_LINK=1` opts out for one command — the escape hatch for checking this repo against
the *published* tag, which is how a wrong `allowBuilds` key was caught the same day.

It refuses two things rather than guessing:

- **An engine with no `dist/`.** square-one's `dist` is gitignored and built by its `prepare`; a
  sibling that has never been built would replace a working dependency with a directory that has
  no entry point.
- **Anything at that path that is not a symlink.** pnpm always leaves one there. A real directory
  means something unexpected owns the path.

It prints the pinned specifier and the local version every time it links. A sibling that has
drifted from the pin is exactly what this makes easy to stop noticing, so the one place it cannot
hide is the line that does the linking.

## Alternatives considered

- **`pnpm link ../square-one`.** The first-class answer, and it writes `"square-one":
  "link:../square-one"` into `package.json` — which is committed, and then CI has no sibling to
  link to. The pin must stay a pin for everyone who is not co-developing.
- **`postinstall` alone.** Tried, and it does not hold: pnpm answers *"Already up to date"* and
  runs no lifecycle script when it believes nothing changed — which is precisely the state a
  stale link is in. Measured: deleting the link and running `pnpm install` left it deleted.
  `postinstall` is kept because it *does* fire on an install that changes something, which is the
  pin bump that started this, but it cannot be the only hook.
- **A real pnpm workspace spanning both repos.** The honest long-term shape if these two are
  always developed together. It is also a much larger change — two independent git repos, two CI
  pipelines, two release cadences — and it would dissolve the seam ADR-0002 and planning ADR-0006
  deliberately drew. Not now, and not as a side effect of a symlink bug.
- **Document the manual step and rely on remembering it.** What was in place, informally, for the
  whole of the couple work. It survived exactly as long as nothing forced an install.

## Consequences

- **Engine edits show up here again, and keep showing up.** The link is re-asserted by the
  commands actually used rather than by one that may not run.
- 🔴 **Local and CI now install differently on purpose**, which is a thing worth being uneasy
  about: a bug that only reproduces against the published tarball will not reproduce locally. The
  opt-out is the answer, and it is why the script names it in its own output — `SQUARE_ONE_NO_LINK=1
  pnpm test` is the "check me against the tag" command.
- 🔴 **A drifted sibling is now easy to dance on.** The link does not check that the local version
  matches the pin, because during co-development it deliberately will not. It prints both instead.
  If that turns out to be too quiet, the next step is to fail rather than warn on a **major**
  mismatch — not to check equality.
- **`pnpm test` and `pnpm build` gained a prelude**, so their output starts with two lines that
  are not test output. Cheap, and the alternative is a hook that does not fire.
- **Promotion condition:** if a third repo consumes square-one the same way, this script is
  copy-paste and should become the workspace instead.
