# 2026-10-30 (8): the compliance gaps, worked

Ryan, after the [10-30 compliance review](../compliance/2026-10-30.md): *"all that and commit"*.

## What was done

- **square-one released `v0.11.0`** (its standards batch, Star Thru, Standard Applications) and
  the-lot re-pinned to it (`package.json`, the `allowBuilds` key). Checked the way CI installs:
  `SQUARE_ONE_NO_LINK=1 pnpm install --frozen-lockfile` exits 0, `tsc -b` is clean and the suite is
  at the 38 known failures against the published tag, not the sibling checkout.
- **Exact pins**: the 26 ranged dependencies pinned to their locked versions.
- **`fast-check`** (4.9.0, square-one's version) and property tests over arbitrary action
  sequences for both screen reducers: 7 for `voice-test-session` (calls known and in naming order,
  the floor always known formations or null and moved only by free-mode finals, trials added one
  at a time, chain trials exactly when a chain was shown, segments well formed, no NaN) and 6 for
  `review2-session` (moment, spacing and opacity in range; the seek token never goes down; no
  unkept edits while playing or in another timeline; turned only with turn-around; every couple
  placed; notice counter only up).
- **A real bug, found by them**: in `#review2`, Shift+↑/↓ nudges the hand width
  (`Review2Scene.tsx:726`) even while playing, and the reducer kept that edit against the moment
  play began, hidden by `editsHere` until a pause or a "not kept" notice. The sliders are already
  disabled while playing; the reducer now refuses `edit` and `nudge` while playing too, with an
  example test.
- **ADRs 1000–1017** and the `project-conventions` and `stance-review` skills, copied unchanged
  from the template's published `main` (`12f6468`), indexed in `docs/adr/README.md`.
- **Tier**: README now says none is claimed yet, and why (CI's test job is red; ADR-1011's bar isn't
  met). Claiming provable-lite would have been the dishonest kind ADR-1002 forbids.
- **ADR-1012 / 1015 answers**, Proposed for Ryan: 0066 no `any` registry until the strict lint
  pass (most of ~160 casts go in it), 0067 jsx-a11y for the HTML overlays, 0068 no Rust core.

## What wasn't, and why

The strict pass was measured, not done. Dry runs: the three tsconfig flags raise **179 type errors**
across ~40 files; `strictTypeChecked` with the three rules raises **2,756 findings in 173 files**
(879 non-null assertions, 837 unnecessary assertions, 369 confusing void expressions, 357
unnecessary conditions…). That's a codebase-wide change through the dance code, where 38 tests
already fail, so it's its own job, file by file, with TypeScript 6 after it. The first stance
review is its own job too.

## Next

Ryan decides 0066–0068. Then the strict pass, and the stance review.
