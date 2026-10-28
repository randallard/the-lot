# 2026-10-28 (1): Right and Left Thru in `#review2`; square-one v0.6.0 pinned

🧪 Exploratory, no ADR. **Uncommitted, waits for Ryan's look** (the pin and the type fixes are
committed, `a3105ad`).

Ryan: *"commit it and do the release and pin - then I'll need all review2 functionality in
solve4"*, then *"or let's discuss whether it would be easier to add rtl-thru to review 2"*. It
was: nearly all of `#review2` (the dials, picking a part, `applyToRigs` / `readRigs`, keyframes,
save / load, the transport) is per dancer index, and the motion comes in at one seam, the
`DanceFloor` in each couple's slot. So the call came to `#review2` rather than `#review2`'s
controls going to `#solve4`. Ryan: *"pin then move ahead with this plan"*.

## The release and the pin

- Step 5 committed first (`7e57487`).
- square-one **v0.6.0** (`ad22696`, the waits): tagged, pushed to `origin` and `data`.
- The pin moved, and `allowBuilds`' key with it (`git rev-parse v0.6.0^{}`). pnpm wrote a second
  key back in with its suggestion text as the value (`set this to true or false`), the exact
  thing the comment above it warns about. Removed.
- **Validated against the fetched tarball**, not the link (`SQUARE_ONE_NO_LINK=1`). Two snags:
  `pnpm install` with a current lockfile doesn't re-link a removed `node_modules/square-one`, even
  with `--force`, so the link was pointed at the `.pnpm` store copy by hand; and `pnpm build` runs
  `link-engine` itself, so the check is `tsc -b` and `vite build` run directly. Clean, and the 38
  known test failures.

### 🔴 `tsc -b` had 14 errors nobody saw

There is **no `typecheck` script** in this repo; the "typecheck clean" in 10-27-7 and 10-27-8
was `pnpm -s typecheck` failing silently. Vitest doesn't type-check. `tsc -b` (the build's) had:
- 2 since before `fa87c3b`: `DanceFloor` passed `shapes` (an array) where `couplePaths` and
  `joinChain` take a pair.
- 4 from `60ad1e5`: `ReviewFigure` had no `waits`.
- 8 from `7e57487`: `isBack`'s guard named `{ dancer; back }`, which isn't `NHold.b`'s member,
  so the other branch never narrowed to `HandRef`. Now `BackRef`.

All fixed in `a3105ad`. **The check is `npx tsc -b`.**

## Right and Left Thru in `#review2`

- **`review2-figures.ts`:** `#review2`'s own list: the review catalog's figures and a
  `SolvedFigure` (`solved: "right-and-left-thru"`, 8 beats, five named moments). Apart from
  `REVIEW_FIGURES` because `#review` draws every figure there on a `DanceFloor`.
- **A pairing means both couples:** pairing X is couple X facing couple X (beau, belle, beau,
  belle). The pairing list, drawer, locks and per-couple keyframes all keep working. Mixed sets
  later.
- **`SolvedFloor.tsx`:** four `Dancer`s under one parent, posed by `applyToRigs` from the solve.
  It takes `DanceFloor`'s `paused` / `seek` / `onBeat` and keeps its rules: a seek is a cut,
  consumed once a token, and a fresh mount hasn't seen the token; paused, nothing is written
  except on a seek, so `PoseOverride` sits on top; it stops at the last beat and `#review2`'s
  loop seeks every floor to 0. 120 bpm, as the floor.
- **Bakes (`baked-four.ts`, `src/dance/baked-four/`):** all 25 sets, baked by
  `scripts/whole-move/bake-four.ts` (≈3.8 s a set, 100 s in all). Compact rows (15 numbers a dancer
  a sample, 0.1 mm / 0.0001 rad), 34 KB a set, loaded one set at a time when drawn. Matched by
  `bodyPrint`; a set with no bake, or a reshaped body, is solved when it mounts. A test says every
  pairing has a bake on today's bodies.
- **Scene:** the crowd spreads ×2 for a set (`SET_SPREAD`), the focus ring doubles, and a dancer
  is named with their couple (*NPC Ryan (belle, couple 2)*). `turn around each loop` works as
  is: the set ends turned half way round its middle.
- `#solve4` stays as the solver's bench; `frameAt` moved to `baked-four.ts` for both.

Checked in Chrome at `#review2=right-and-left-thru/ryan-ryan`: 25 sets drawn, stepping to beat
1.6 shows the pull-by, clicking a torso names the dancer with readings, a dial moves the pose and
↺ puts it back, play loops. `#review2=california-twirl/ryan-sprout` is unchanged. Keyframes
weren't set in the browser (Ryan's pose log is in that IndexedDB).

## The pull-by hold: the middle half

Baking all 25 found three bad sets. Held for the whole window the shoulders are in reach, the
smaller bodies' hands stayed apart and the arm swung as it let go. Holding only the middle half,
round the crossing:

| set | before | after |
|---|---|---|
| player ×4 | hands 11.4 cm, jump 78°, step 53 cm | hands 0.1 cm, jump 78°, step 27 cm |
| ryan–player | hands 4.4 cm, jump 78° | hands 0.2 cm, jump 42° |
| the other 22 | | the same or better |

### Still open: ember ×4

Hands 7.6 cm, jump 112°, steps 62 cm. Its cost is 40× four Ryans' and it isn't the holds: jerk
(`smooth2`, 2149) and dial limits (`range`, 831) dominate, and all four hang back about 50 cm
through the pull-by (samples 12–24). 6000 iterations only takes the cost from 3816 to 3356. Ember
has the longest arms (0.94 m) and a lane of 0.97 m. Look there first.

## Next

1. Ryan looks at `#review2=right-and-left-thru/<pairing>`, then commit.
2. Ember ×4; and the 78° / 42° jumps (player ×4, ryan–player) at the pull-by's release.
3. Mixed sets (625 of them): a cast picker, and bake on demand or in a worker.
4. Spec facing couples and Right and Left Thru in square-one; swap the paths.
