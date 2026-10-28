# 2026-10-28 (9): room for the arms, a forearm hold, and the first bakes beyond the twirl

🧪 Exploratory, no ADR. **Uncommitted, waits for Ryan's look.** It needs square-one's
uncommitted `pass` change for one figure (ember ×4's Pass Thru, which isn't baked anyway); the rest
runs on 0.7.0.

Ryan, on (8): *"commit it and do all 4"* (step 7 committed, `b83cf5d`). The four:

## 1. An arm-aware clearance (`passing.ts`)

`passingClearance(a, b)`: the wider of the bodies' clearance (torsos and heads, as before) and the
arms' (`armsClearance`: each shoulder's distance out from the body's centre line, a hand, and 4 cm,
Right and Left Thru's formula since 10-27-8). It is what square-one is given to pass in, from
`DanceFloor` (`clearanceEngine`) and from `figurePaths`. Right and Left Thru now uses it too (same
numbers). Standing (`placeHold`) and arches (`sizeArch`) still read the bodies' measure.

`solve-all`, before → after (uncapped):

| | median step | worst step | over 11 cm |
|---|---|---|---|
| Partner Trade | 17 → 3 cm | 39 → 15 | 17 → 4 |
| Dosado | 12 → 2 cm | 39 → 5 | 13 → 0 |
| Pass Thru | 13 → 2 cm | 41 → 26 | 16 → 1 |

Capped at 10 cm, clipping solves fell from **23 to 1**.

## 2. square-one's centred pass, solved for its closest moment

In square-one, uncommitted (its journal 27): a body clearance above the figure's own sets the gap
at the crossing to `c·s / √(s² − c²)`, so the pair's closest moment, on the way in, is the
clearance. Ember ×4's Pass Thru went from 10.4 to 5.1 cm of clip.

**What's left there is ember's head**, which sits 28 cm forward of its body. Facing, two embers'
heads meet before their bodies do: at t = 0.3 the bodies are 109 cm apart and the heads 72 cm, 92
needed. A side-by-side clearance can't see that. It needs a forward reach the engine doesn't
measure. Ember ×4's Pass Thru isn't baked.

## 3. A forearm hold (`whole-move.ts`)

`Hold.forearm`: each hand at the other's **elbow**, both ways, in the readable cost, the exact
gradient (added to the central-difference test with every term in play) and `metrics`. The hand on
the elbow may touch the other's upper arm, whose end the elbow is. Without that, the hold pulled
the hand onto the elbow and the clearance pushed it about 11 cm off (hands 9–14 cm, every pairing).
`figureMove` turns square-one's `forearm` grip spans into these holds.

**All 25 Allemande Lefts solve, none clean**: hands 3–9 cm off the elbow, arms stretched
1.3–1.9×, and arm flips. Neither a smaller circle (0.8×, 0.65×) nor starting the arms at the
floor's grip height (`planForearm`) helped consistently; the solves land in different minima per
pair. Next: a shape hint of its own, as the twirl has its arch guide, with the elbows on the grip
line through the turn, and the floor's reshape for pairs whose elbows can't reach it.

## 4. The first bakes beyond the twirl

`solve-all --bake` writes each **clean** solve (no outlier flag) as a bake, in the twirl's format.
**74 written**: Partner Trade and Dosado × 25, Pass Thru × 24 (not ember ×4). Allemande Left none.

`DanceFloor`: only the twirl's bakes go through `joinChain` (its joins hold his right in her
left). Any other figure's bake is drawn as baked.

Checked in Chrome on `#review` (cells are `figure/step/pairing`): Dosado ryan ×4 and sprout–ember,
Pass Thru ryan ×4 and Partner Trade ryan–sprout show **"baked solve: drawn"**, rules all kept.
Pass Thru ember ×4 shows no bake. (A first check used `figure/pairing` ids, which fell back to the
twirl's first cell and read its bake; it is not evidence.)

Report: [`docs/solve-all/2026-10-28-arm-aware-baked.md`](../solve-all/2026-10-28-arm-aware-baked.md).

## Checks

`npx tsc -b` clean; eslint clean on the touched files (`DanceFloor`'s one warning is older);
vitest 38 failed (the known ones) | 1146 passed.

## Not yet

- The hands-free bakes end with the arms hanging. The floor's standing handhold between calls
  isn't in them, so a Partner Trade in a sequence will still want a join like the twirl's.
- The Allemande's shape hint.
- Ember's forward head.

## Next

Ryan looks → square-one commit and 0.8.0 (the `pass` change) → pin here → commit. Then the
Allemande, or the joins for the hands-free bakes.
