# 2026-10-27 (8): four dancers, Right and Left Thru

🧪 Exploratory, no ADR. Step 5 of the plan (*"A 4-dancer call: the solver beyond pairs"*, proof
2 of the north star). **Uncommitted, waits for Ryan's look at `#solve4`.**

Ryan picked **Right and Left Thru** (over a star) and **solver first**: the engine has no call
for four (facing couples are square-one's S2, and a call there is spec'd first), so the paths are
written here and swapped for the engine's later.

## The N-dancer solve (`whole-move-n.ts`)

`whole-move.ts` is a couple's solve all the way down: its frame, variables, holds (beau and belle)
and gradient arrays are two dancers, and only the beau may step. Rather than rework it under the
committed twirl bakes, this is the same objective over N dancers, beside it:

- **Variables per dancer:** both arms' six dials, and a step off their path (floor x, z) at
  `WEIGHTS.step`. No growing, targets, planes or lifts: nothing for four uses them yet.
- **Holds join any hand to any hand, or a hand to someone's back** (`backPoint`: the small of the
  back), each over a stretch of the move. **They ease on and off** over a quarter beat
  (`NHold.ease`, default 0.03 of the move). At full weight from the first sample, the arm snapped
  onto the hold: 67° in one sample.
- **Clearance between every two dancers** (pairs whose torsos are over 2.6 m apart are skipped),
  with the couple solve's exemptions per held pair and `HELD_MARGIN` for the held arms. Each arm
  is checked against its own body (`ownMargin`, now exported).
- **The exact gradient,** restated per dancer from `frameCostGrad`. The test checks it against
  central differences on all four dancers.
- **The start:** rest arms, and each held hand reached (`reachArm`) for a point in front of the
  pair. Between their shoulders alone is inside a side-by-side couple: the lady's hand started 22 cm
  into the gent.
- **`metricsN`:** clip (no margin), held-hand gap (fully-on holds only), worst dial jump and where,
  and the furthest step.

## Right and Left Thru (`whole-move-rlt.ts`)

Facing couples, 8 beats, at 10 samples a beat. Dancers 0–1 are the first couple, 2–3 the
opposite; the second couple is the first turned half way round.

- **Pull by (beats 0–3.5):** right hand to the opposite, passing right shoulder to right shoulder.
  The hold runs while their shoulders are within 60% of their two reaches. At 85% the arms were
  held nearly straight behind, and both couples hung back 24 cm after the crossing.
- **The lane is sized from the bodies,** and the arms pass too. It's the wider of `passingWidth`
  and the two shoulders with an arm hanging off each. Four Ryans' shoulders stand 46 cm out, past
  their 30 cm torsos, and a bodies-only lane put the gents 38 cm wide.
- **Courtesy turn (beats 3.5–8):** his left hand in her left, his right on her back, turning left
  half way round with him backing up. It's danced close (the body lane apart) with her a torso and a
  hand's breadth ahead. They open to the standing width (`touchHold`) in the last half beat, into
  the ordinary handhold (his right in her left).
- **What the steps taught:** at a 0.5 m width four Ryans stepped 20–35 cm apart, because their
  torsos alone are 0.6 m across. At their 1.14 m standing width the courtesy turn stepped 0.45 m
  closer, and wanted her ahead of him.

## Results (one seed, 3000 iterations, main thread)

| cast (gent 1, partner, gent 2, partner) | clip | hands | worst jump | worst step | time |
|---|---|---|---|---|---|
| 4 × ryan | 0.0 cm | 0.3 cm | 15° | 16 cm | 3.5 s |
| 4 × sprout | 0.0 | 0.1 | 10° | 8 | 3.9 |
| 4 × myco | 0.0 | 0.5 | 15° | 26 | 3.5 |
| myco ember sprout ryan | 0.0 | 0.5 | 19° | 27 | 3.6 |
| player ryan ember myco | 0.0 | 1.3 | 28° | 25 | 3.6 |
| ryan sprout ryan sprout | 0.1 | 0.7 | 24° | 29 | 3.9 |
| sprout ryan sprout ryan | 0.0 | 0.3 | 11° | 18 | 3.8 |

**Proof 2 passes for Right and Left Thru:** the solve holds hands across four dancers that change
partners mid-call, with nothing clipping, on every cast tried. It takes about 3.5 s a solve on
one thread, versus the couple solve's 1.6 s for 4 seeds in 4 workers.

## `#solve4`

A debug scene (`SolveFourScene.tsx`, `solve4-route.ts`). `#solve4` is four NPC Ryans;
`#solve4=myco,ember,sprout,ryan` names them. It solves when it opens (about 4 s, on the main
thread), then plays at 60 bpm on four `Dancer` rigs through `toDials` and `applyToRigs`, with a
scrub bar and the metrics. Checked in Chrome: the pull-by at beat 2 and the courtesy turn at beat
5, with the gents backing to the middle.

## Not done

- **Paths from the engine:** spec facing couples (S2) and Right and Left Thru in square-one, then
  swap these paths out.
- **A worker:** the solve runs on the page's main thread. The couple solve's
  `whole-move-client.ts` is the pattern.
- **Dancing it on the floor:** `DanceFloor` is two dancers. Four is step 6's question as well
  (20 couples, the draw budget).
- **The couple solve as N = 2:** two solvers now share their maths. Fold the couple one into this
  when it settles, checked against the committed bakes.
- **Hand on the back** is a point on the torso's surface. There's no hand turn, so the drawn hand
  points along the forearm.
