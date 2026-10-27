# 2026-10-26 (2) — Ryan's keyframes steer the solve

🧪 Exploratory, no ADR. Step 1 of the reordered plan
(`work/square-dance-planning/briefs/solve-the-whole-move.md`, "Order, revised 2026-10-26").

Ryan, 10-26: can the solver *"align more to our keyframes"* (his phone typed "Jeramie's")? Until
now it didn't read them at all. Its only shape input was a guide arc written for the twirl. This
entry makes his keyframes a term in the objective.

## What was built

- **`whole-move.ts`: `Target`, `Move.targets`, `WEIGHTS.target`, `targetsFromKeyframes`.**
  - Each arm dial he **set** (`setKeys`) at a keyframe pulls that solver variable toward his value
    at that moment, as a squared difference in `frameCost`. Angles are wrapped; lengths count a
    metre as `METRE` radians, as smoothness does.
  - Only set dials pull. The rest of a keyframe is what the figure happened to show, and pulling
    toward it would pull the solve back to the floor.
  - A keyframe between two samples splits its weight between them by nearness. A locked pairing
    pulls 10×.
  - Dials the solver has no variable for (torso, head, hand turn, spot) come back as `unused`, and
    the run prints them.
  - **It stays soft:** clearance, held hands and smoothness still win. A pose that would clip is
    got as close to as it can be without clipping, and the run says how close.
- **`solve.ts`:**
  - `--targets=<bundle>` takes a `#review2` 📂 export, folded as review2 folds it.
    `--target-weight` scales the pull, and `--out` names the output.
  - It prints *wanted → solved* for every dial he set.
- **The solve's keyframes now mark nothing as set.** They used to mark every dial, so once a solve
  was loaded nobody could tell his dials from the solver's (review2 carries a keyframe's set dials
  into any edit made there). Where he has a keyframe at the same moment, the re-solved keyframe
  keeps his set dials as he set them, so the next solve still steers by them. The committed ryan →
  ryan bundle was regenerated: identical values (the solver is deterministic), `setKeys` empty. The
  bake is unchanged.

## The test run

One keyframe at under-arch (t 0.5): **the beau's held upper-arm raise at 150°**, against the solve's
164.3°. 6 cm margin, 3000 iterations, about 44 s each.

| pull | raise | clipping | closest to a head (samples / halfway) | stretch | apart at t 0.5 |
|---|---|---|---|---|---|
| none (the committed solve) | 164.3° | 0 | 5.7 / 5.5 cm | 1.60× | 1.10 m |
| `target` 60 | 160.2° | 0 | 5.7 / 5.2 cm | 1.59× | 1.11 m |
| `target` 600 | **152.2°** | 0 | 5.8 / 5.1 cm | 1.62× | 1.18 m |

At 600 it honours the dial within 2° and stays clear, paying with a little stretch and the beau
standing 7 cm further out at that moment. A dial Ryan sets is a deliberate choice, so **600 is the
default** (a locked keyframe: 6000, nearly firm). The joined hands stayed at 1.79 m: the solver
kept the arch's height by changing the forearm, which is what an elbow-only request should do.

The test bundle was a scratch file, not committed and not baked. It was a test of the mechanism,
not Ryan's taste.

## Tests

`whole-move.test.ts` +3: only set dials pull, in solver units, split between samples; locked
pulls harder; a target bends a free arm toward it, with its neighbours rising smoothly. The full
suite is 38 failed (the same 38) / 1114 passed.

## How Ryan uses it

1. In `#review2` on "play: my keyframes", pose a moment (click a part, dial it) and ◆ set the
   keyframe. Only the dials touched are marked as set.
2. 📂 save (export) the bundle.
3. Run `npx vite-node scripts/whole-move/solve.ts scripts/whole-move/ryan-ryan-twirl.paths.json 3000 --margin=0.06 --targets=<export.json>`.
   Read *wanted → solved*, then 📂 load the result and watch.
4. If it's right, bake it: `npx vite-node scripts/whole-move/bake.ts`.

## Not yet

- **Body-relative targets** (hands relative to the partner) for carrying a style to other
  bodies. That's step 8 of the plan.
- The **guide arc** is still on. With a keyframe at under-arch, it may no longer be needed for the
  topology; worth a run without it once Ryan has set real keyframes.
