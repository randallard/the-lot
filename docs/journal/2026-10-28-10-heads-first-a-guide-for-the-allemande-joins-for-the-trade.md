# 2026-10-28 (10): heads first, a guide for the Allemande, joins for the Trade

🧪 Exploratory, no ADR. **Uncommitted, waits for Ryan's look**. Ember's head needs square-one's
uncommitted `FigureShape.forward` (its journal 28). It runs here through the link, and commits
after square-one 0.9.0 and the pin.

Ryan, on (9): *"do all 3"*.

## 1. Ember's head: Pass Thru solved for the heads (square-one `forward`)

Ember carries its head 28 cm forward (everyone else's is over their centre), and two embers in a
Pass Thru met head first. square-one now takes **`FigureShape.forward`**: how much nearer two
dancers' widest parts come than their centres, facing. Its centred pass widens for it (`centeredGap`:
`G = c·s / √((s − f)² − c²)`). Here: `forwardReach(a, b)` (`passing.ts`, the two heads' forward
offsets added) goes from `DanceFloor` (through `useDancePerformance`) and from `figurePaths`.

**Ember ×4's Pass Thru: clip 5.1 cm → 0, the beau's step 26 → 3 cm.** All 25 Pass Thrus clean (worst
step 4 cm); re-baked: the eight ember pairings changed, the rest came out byte for byte, and
ember ×4 has a bake now. Checked on `#review=pass-thru/shoulders/ember-ember`: drawn, rules all kept.

## 2. A guide for the Allemande: built, not clean

`Hold.gripHeight` (`whole-move.ts`): on a forearm hold, both hands and both elbows on that height
and the elbows' midpoint over the point between the two dancers' feet. Exact gradient (in the
central-difference test). `solve-all` gives it the floor's `planForearm` height, and the arms
start reaching there.

**It barely moved them**: all 25 still outliers, hands 3–10 cm off the elbow. A radius scan with the
guide on (four Ryans, player ×4) says why:

| radius (× the floor's `pairGripRadius`) | ryan ×4 | player ×4 |
|---|---|---|
| 0.6 | hands 10.0, clip 3.3 | hands 18.7, clip 8.9 |
| 1 | hands 4.9, clip 1.7, jump 178° | hands 5.6, clip 0.6, jump 139° |
| **1.5** | **hands 1.3, clip 0, jump 39°**, stretch 1.46 | **hands 1.8, clip 0, jump 21°**, stretch 1.69 |

Only at half again the floor's radius do the hands meet, and then with the arms stretched 1.5–1.7×.
**The solver's arms and the floor's forearm grip disagree about how far apart it holds two
bodies.** Most likely the solver's elbow won't fold the way the floor's pose does (its dial ranges),
so it can't bring the elbows in over the pivot. Next: find what stops the fold, then size the
engine's radius from the solver's own arms. The Allemande isn't baked.

## 3. Joins for the Trade (`chain-join.ts`)

`joinChain` knew the twirl only: his right in her left across every window. Now a bake is **held**
(the twirl) or **free** (a Partner Trade):
- **Into or out of the standing couple** (the dance's start and end, or a wait): a free bake holds
  only on the standing side of the window, so the hands join as the couple settles and let go as
  they step off.
- **Between two calls:** hands held only if both hold. A free side gets no hold, no arch and no
  lift, just the two bakes eased to their average.

`DanceFloor` sends every couple sequence's bakes through it. A facing pair's (Dosado, Pass Thru) are
drawn as baked: no standing couple to join.

Measured on the Partner Trade bakes: his right to her left is clasped (8–11 cm) at the dance's
start and end and free mid-call. Between two trades they come together (5–25 cm) without a
handhold: calls flow, square-one ADR-0026. Checked on `#review=partner-trade/quarter/ember-ember`:
drawn, rules all kept.

## Checks

`npx tsc -b` clean; vitest 38 failed (known) | 1146 passed. `whole-move-figure.test.ts`'s cap test
now forces a step (the belle walked down his line), since ember's no longer needs one; the cap is a
strong cost, not a wall (head on: 17 cm capped against 30+ free). All 75 hands-free bakes within
0.05 cm of the engine's gap. Reports: `docs/solve-all/2026-10-28-pass-thru-forward.md`,
`…-allemande-guided.md`.

## Next

Ryan looks → square-one 0.9.0 → pin → commit. Then the Allemande's fold.

## Committed

Ryan: *"commit pin and release"*. square-one released as **v0.9.0** (`3f6b7dd`); the pin and the
allowBuilds hash moved to it. Validated against the fetched tarball (`SQUARE_ONE_NO_LINK=1`):
`tsc -b` clean, `vite build` clean, 38 known failures / 1146 passed. The link is restored.
