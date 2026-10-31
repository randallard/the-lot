# 2026-10-31 (12): chain-join.test.ts

Ryan: *"start on chain-join.test.ts."* 56 findings, all `!`, but only a handful of distinct
values: the two joined tracks (`a!`, `b!` on nearly every line), keyframe reads
(`track.keyframes[i]!.values`), dial reads (`end[key]!`), path samples (`paths.beau[i]!` three
times per line, in two copies of the same `path(i)` builder), and two `chooseBake(...)!` and a
`.find(...)!`.

Each value is now narrowed once, where it's made, with `defined()` (10-31 (5)), so a missing one
fails with its name:

- **The joined tracks** are `defined(joined[0], "the first twirl")` and so on, so the tests use
  plain `a` and `b`. The same goes for `x`, `w1`, `w2`, `h1` and `twirl`.
- **Three small helpers** at the top replace the repetition:
  - `valuesAt(track, i)`, a keyframe's dials;
  - `dial(values, key)`, one named dial;
  - `placed(beau, belle, i)`, the standing couple's placements for `standingFrame`, replacing two
    copies of `path(i)` and a third inline one.
- **The bakes and the hand** go through `defined(…, "ryan's twirl bake")`, and so on.

No assertion changed. A missing value used to show up as `NaN` in an `expect`; now it throws
naming what was missing. `chain-join.test.ts`: 7 pass. `tsc -b` is clean; `pnpm lint` has 0
errors and 8 warnings; 1,240 tests pass. **The strict count: 722 → 666.**

## Next

`arm-pose.ts` (45), then `launch-game.test.ts` (27) and `pose-rules.ts` (26).
