# 2026-10-26 (4) — a model for the twirl: the nearest solve, polished

🧪 Exploratory, no ADR. **Uncommitted.** Step 3 of the reordered plan
(`work/square-dance-planning/briefs/solve-the-whole-move.md`): sample body pairs, solve them,
train, predict, polish, and measure. This is proof 1 of the north star: can posing keep up with
live calls?

## What was built

- **`engine-paths.ts`, `couplePaths(call, shapes, sizing)`:** a couple's floor paths with no
  browser. It feeds square-one the numbers `DanceFloor` feeds it for two bodies (handhold width,
  passing clearance, grip radius, the arch sized by `sizeArch`), samples the engine, and places
  each state as `DanceFloor` places a rig. It matches the 10-24 hand capture of ryan → ryan to
  0.35 cm and 0.5°, which is the capture's rounding (test). It takes 16.6 ms per couple. This also
  covers the headless-capture part of plan step 7.
- **`body-sample.ts`:** bodies **around the stock cast**. Each dancer is a blend of two stock
  bodies with ±10% jitter on every dimension the pose depends on, clamped to `SHAPE_BOUNDS`. All
  of `SHAPE_BOUNDS` is mostly not a dancer (heads of 0.6, bodies 0.1 tall). Samples 0–24 are the
  25 stock pairings exactly.
- **A solver rule for any body, `restGap`:** an upper arm needn't be clearer of its own head or
  torso than it is at rest. Blends attach the arm against or inside their own head (one beau's
  was 6.6 cm inside). The 6 cm own-head margin then couldn't be met on any frame, and it swamped
  the cost (k27: 37,341, falling to 88 under the rule). The stock cast has 15 cm at rest, more than
  the margin, so its solves don't change.
- **`solve` options and defaults:** `init` (start from a given set of variables; the floor path
  stays the base the step is measured from), and the raw variables `v` are returned.
  `solveBest` now defaults to `SCHEDULE`. Before this, a caller that didn't pass it in got 1,500
  plain iterations.
- **`scripts/whole-move/dataset.ts`:** solves sample indices `[from, to)` into JSON lines. 600
  samples across 30 processes took about 5 minutes.
- **`twirl-model.ts`** (`features`, `unwrapLike`, `fitRidge`, `predictRidge`) and
  **`scripts/whole-move/train.ts`:** these split the clean samples 4:1, predict, polish for N
  iterations (a step falling 0.01 → 0.001, no noise), and report.

## Finding 1: most of the stock cast can't twirl as built

A sample counts as clean with no clipping over 0.5 cm, hands within 2 cm, and stretch at most
2×. **94 of the 600 samples (16%) are clean, and so are only 3 of the 25 stock pairings:**
ryan → ryan, ember → ryan and player → ryan. Several others miss by 2–3 cm. With myco or
sprout as the beau, the arms need 2.4–5.5× stretch and the hands still don't meet (sprout →
myco: 13.5 cm apart). Some belles' arms attach at their heads, so raising the held arm drives it
3–4 cm into the head.

**The cause:** the floor makes these couples fit with an accommodation. `sizeArch`'s reshape
grows the beau's torso and shrinks the belle's; a break lets go. 10-26-1 turned the reshape off
under a drawn bake, so the solve and the floor agree on bodies as built. That's harmless for
ryan → ryan, whose reshape is small (1.04× / 0.96×), but wrong for most of the cast. **The solver
has to know about accommodations before the twirl can go beyond these couples.** That's a
question for Ryan (below).

## Finding 2: the nearest solve plus a short polish is fast and clean; ridge regression isn't

On the held-out clean couples (19, every 5th blend), median / 90th percentile:

| start | polish | clean | clipping | hands apart | cost vs the full solve | time |
|---|---|---|---|---|---|---|
| ridge | none | 0/19 | 17 / 33 cm | 34 / 82 cm | 124× | 0 ms |
| ridge | 600 | 10/19 | 0 / 0.9 cm | 1.5 / 5.2 cm | 1.16× | 93 ms |
| nearest | none | 0/19 | 2.8 / 26 cm | 10 / 39 cm | 20× | 0 ms |
| nearest | 100 | 12/19 | 0 / 0.5 cm | 1.2 / 11 cm | 1.28× | 16 ms |
| nearest | 200 | 15/19 | 0 / 0 | 1.0 / 5.1 cm | 1.08× | 31 ms |
| **nearest** | **300** | **17/19** | **0 / 0** | **1.0 / 4.3 cm** | **1.04×** | **47 ms** |
| nearest | 600 | 17/19 | 0 / 0 | 1.1 / 2.7 cm | 1.00× | 93 ms |

*The full solve is about 5,500 ms (best of 4).*

- **Ridge fails because the solves aren't one smooth family.** The seeds land in different
  valleys (10-26-3), so averaging across couples gives poses no couple has.
- **The nearest couple's solve, polished, works:** 300 iterations, 47 ms, clean 17 times in 19,
  at 1.04× the full solve's cost. This is the brief's path C.1 ("retarget the nearest bake and
  polish it"), measured. A trained network isn't needed for the twirl yet. A library of solves
  plus a nearest lookup is the model.
- **Budget for five squares:** 20 couples × (17 ms of paths + 47 ms of polish) ≈ 1.3 s on one
  thread, about 0.3 s on 4 workers. That's inside the beat or two a call gives (1–2 s). **Proof 1
  passes for the twirl,** with the caveat of finding 1: it holds only for couples whose bodies
  can do the twirl as built.

## The question for Ryan: how should the solver accommodate?

1. **Solve on the bodies the floor reshapes** (recommended). It reuses `sizeArch`'s reshape and
   its existing style. The floor keeps the reshape under a drawn bake, and the solve is given the
   same reshaped bodies, so they agree again. A pair that drew a break gets its own solve (a bake
   per accommodation, as the coin flip already does). The cost: myco's and sprout's torsos stretch
   a lot as beaus, as they already do on the floor without a bake.
2. **The belle ducks.** A new solver variable lowers her (knees) for a cost, and the solver
   chooses how much. It's probably the most natural look, but it's new machinery, and the floor's
   reshape would have to stay off.
3. **Leave it:** only couples who can twirl as built get a solve, and the rest keep the floor's
   rules (`arm-pose.ts`).

## Not done

- **Accommodations in the solver:** Ryan's choice comes first (finding 1).
- **No browser wiring of the lookup.** The library would ship as data (about 94 solves × 1,066
  numbers × 8 bytes ≈ 0.8 MB, or a quarter of that as float16) plus a worker polish.
  `solveInWorkers` already takes an `init` through its options.
- **The nearest-neighbour library** isn't saved anywhere in the repo yet. The dataset is in the
  session scratchpad; `dataset.ts` regenerates it deterministically in about 5 minutes on this
  machine.
- **A trained network** stays the fallback if a call's solves turn out to need more examples than a
  library can hold.
