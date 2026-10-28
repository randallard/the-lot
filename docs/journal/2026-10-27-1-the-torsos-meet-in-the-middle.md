# 2026-10-27 (1): the torsos meet in the middle

🧪 Exploratory, no ADR. Step 3b of the reordered plan
(`work/square-dance-planning/review2/PROGRESS.md`), following 10-26-4's question about
accommodations.

Ryan's answer: *"I think 2 but can both the belle and the beau grow/shrink so the solve meets in
the middle?"* Then: *"proportional, torso first, keep belle-ducks as a style — build it"*.

## What was built

**Each dancer's height is a solver setting at every sample** (`whole-move.ts`, `PER` 26 → 28: index
26 is the beau's growth and 27 the belle's, in metres of body height).

- **The body changes as the floor draws a reshape** (`Body.rise`, `wornBody`): `growBody` plus
  `standingLift` (ADR-0043). The feet stay put, the torso's top and the head rise one for one, and a
  shoulder rises as `computePositions` gives it. That's half the change for a body with an authored
  `shoulderY` (myco). The arms ride the shoulder at their own lengths. A test checks this against
  `bodyOf(growBody(…))` on four bodies, ember's lean included.
- **Styles** (`GrowStyle`, `growRoom`):
  - `meet`: the two trade height in proportion to their heights. When one grows by a share of their
    own height, the other shrinks by the same share of theirs (`tradeCost`, held firmly at
    `WEIGHTS.clip`). When one of them reaches the editor's limit, the other may go on alone. That's
    `growBody`'s own rule of a change asked for against a change taken.
  - `duck`: the belle shrinks, and the beau stays as built.
  - `none`: as built, which is every solve before today. With nobody growing, the growth variables
    take no step and no noise, so ryan → ryan's solve is the same seed for seed (cost 137).
- **Torso first:** a change costs `WEIGHTS.grow` (4) × `g² / height` per sample, well under what the
  same reach costs in arm stretch. On the first and last samples it costs `WEIGHTS.clip`, so a call
  starts and ends as built and the next call doesn't begin with a pop. Before that pin, the
  ryan → ryan duck started 9 cm down.
- **Gravity** (held arms like to be low) is measured against the dancer's own shoulder, so growing
  isn't paid for twice.
- **The exact gradient** carries growth through. The gradient test now runs with both dancers
  growing, the trade and its limits in play.
- **The floor** (`DanceFloor`): under a drawn bake, each dancer wears the bake's `<d>.torso.grow` as
  a reshape (`reshaped`, `standingLift`), where before it was 0. A belle dancing `DUCK_UNDER` gets
  the `duck` bake, and everyone else gets `meet` (`findBake`'s new `grow` argument, falling back to
  a bake with no style). `bodyPrint` leaves `rise` out, so every existing print is unchanged.
- **Scripts:**
  - `solve.ts --grow=` and `--pair=beau,belle`, which takes the paths from `couplePaths` and writes
    them beside the output.
  - `bake.ts --grow=`, which writes `<call>.<pairing>.<style>.json`.
  - `dataset.ts --grow=`.
  - `train.ts` reads each row's style.
  - `try-grow.ts` solves one stock couple in each style.

## Finding 1: meeting in the middle had to be tied, and the tie had to give way

- **Left free, each dancer used their height for their own reach.** On ryan → ryan the beau grew
  39 cm while she shrank 15. On myco → sprout both grew.
- **So the two changes are one trade,** with shares proportional to their heights.
- **Tied rigidly, the editor's limit capped the trade.** Ryan, myco and sprout have 30 cm torsos,
  and the shape editor's floor is 10 cm, so they can shrink only 20 cm. Myco → ryan's beau could
  grow only the matching share, 19.7 cm, and his arms still stretched 2.34×.
- **The tie now gives way at a limit** (within a 1 cm band). Myco → ryan's beau grows 47 cm while
  she's at her 20 cm, and the stretch falls to 2.26×.

## Finding 2: it helps, but reach, not height, is what most couples lack

Stock couples (margin 6 cm, best of 4):

| couple | as built | meet | duck |
|---|---|---|---|
| ryan → ryan | cost 137, stretch 1.59× | **71, 1.30×**, +20 / −20 cm | 86, 1.42×, belle −20 cm |
| myco → ryan | 605, 2.97×, hands 4.7 cm | 380, 2.26×, +47 / −21 cm | 477, 2.58×, −20 cm |
| sprout → ryan | 604, 2.80×, hands 5.8 cm | 290, 2.18×, +43 / −21 cm | 466, 2.47×, −20 cm |
| ember → sprout | 586, 1.74×, jump 126° | 515, 1.45×, hands 2.1 cm | 534, 1.51× |
| sprout → ember | 1503, clips 3.2 cm | 897, still clips 3.4 cm | 989, clips 3.5 cm |

All 600 sampled couples (clean = clipping ≤ 0.5 cm, hands within 2 cm, stretch ≤ 2×):

| style | clean | stock couples clean | median stretch | median change |
|---|---|---|---|---|
| as built (10-26-4) | 94 (16%) | 3 of 25 | 2.36× | none |
| **meet** | **135 (22%)** | **5 of 25** (+ player → sprout, sprout → sprout) | 2.28× | beau 12.8 cm, belle 11.8 cm |
| duck | 123 (20%) | 4 of 25 (+ player → sprout) | 2.28× | belle 4.9 cm |

*Of the couples still not clean under meet, 424 of 600 have the hands more than 2 cm apart, 412
stretch more than 2×, and 180 clip. If stretch up to 2.5× counted as clean, 167 would be clean.*

- **Most couples that still fail, fail on reach:** the hands are more than 2 cm apart. Myco's and
  sprout's arms reach about 35 cm and 30 cm, against ryan's 69 cm. Growing moves the shoulder up but
  adds no length, which is why the floor's own answer for these pairs is the reach (lengthening the
  forearm, ADR-0048) and then the break.
- **ryan → ryan gains the most:** the cost halves (137 → 71), the stretch falls from 1.59× to 1.30×,
  and the hands sit closer (1.0 → 0.5 cm).
- **The meet bake dips the wrong way early:** around t ≈ 0.1 the beau shrinks 3–4 cm and she grows
  the same, before the trade turns over. It's small, but it's worth a look on the floor.

## Finding 3: the nearest solve plus a polish still works with growth

Held-out clean couples, median / 90th percentile:

| style | start + polish | clean | cost vs the full solve | time |
|---|---|---|---|---|
| meet | nearest + 100 | 24/27 | 1.73× | 18 ms |
| meet | **nearest + 300** | **24/27** | **1.08×** | **54 ms** |
| meet | nearest + 600 | 26/27 | 0.97× | 107 ms |
| duck | nearest + 300 | 22/26 | 1.11× | 52 ms |
| duck | nearest + 600 | 23/26 | 1.03× | 103 ms |

The library is per style: a meet solve doesn't warm-start a duck. Ridge regression still trails
(meet + 600: 16/27).

## Baked for a look

- `src/dance/baked/california-twirl.ryan-ryan.meet.json`: the beau +20 cm and the belle −20 cm at the
  arch, back to built at both ends.
- `src/dance/baked/california-twirl.ryan-ryan.duck.json`: the belle −20 cm, the beau as built.
- From `scripts/whole-move/ryan-ryan-california-twirl.{meet,duck}.solved.json` (📂 loadable in
  `#review2`), at a 6 cm margin. **Every floor now draws the meet bake for ryan → ryan** in place of
  the as-built one, which stays for comparison. A belle dancing `DUCK_UNDER` gets the duck.

## Not done

- **Reach in the solver.** The floor lengthens a forearm before it lets go (ADR-0048). The solver
  already lets arms stretch, at a cost, but it caps nothing and draws no break. Whether stretch
  above 2× should count as clean, or turn into a reach or a break, is the next question.
- **The editor's 10 cm torso floor** limits every 30 cm torso to a 20 cm shrink. A dancer could
  duck further by other means (sinking the head, bending), but that's a new look and Ryan's call.
- **The old dataset** (`ds600`, `PER` 26) no longer loads in `train.ts`. `dataset.ts` regenerates
  any style in about 5 minutes.
