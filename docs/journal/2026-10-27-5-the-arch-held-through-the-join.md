# 2026-10-27 (5): the arch held through the join

🧪 Exploratory, no ADR. A fix to 10-27-4's `chain-join.ts` (committed un-reviewed, `1331c14`).

Ryan: *"the beaus twirl arm goes a bit wonky in #dance two twirls both npc ryan"*.

## What was wrong

Watched at 30 bpm across the join (beat 3 to 4.3), and traced on the dials:

- **The arch dipped at the join.** The joined hands came down to chest height between the two
  twirls and went back up. That's what square-one ADR-0026 says doesn't happen: two twirls are one
  unbroken arch.
- **The beau's arm tangled getting there.** His upper arm dropped from 137° raise to about 60°.
  His forearm swung its heading round about 270° in two beats (29° → −119° → ±180° → 149°). Both
  segments stretched (42 cm upper arm, 61 cm forearm, against the bake's 33 / 37).

Two causes:

1. **Each bake alone lowers the hands for its own end** (raise 37° at its last sample), and its
   first sample starts at 70°. Nothing in the join window asked the hands to stay up, and the
   solver's gravity term likes held arms low.
2. **The join pose was an average** of the two bakes' ends, angle by angle. Those are different
   arm configurations, and an average of two such poses is a tangled arm. A 1000-iteration polish
   can adjust it but not untangle it.

## The fix

- **The join's held arms are built, not averaged** (`packArch`). The hands go over the middle of
  the couple, a clasp apart, at the arch's height, and both arms are reached there by the solver's
  own IK (`reachArm`), elbows out. The two sides ease onto that pose. The free arms are still the
  average, since both bakes have them at rest.
- **How high (`archHeight`):** a hand over the taller crown, but no higher than both held arms
  reach over the middle of the couple at their natural length. Short arms can't hold an arch over
  a tall head at their standing width.
- **The arch stays up through the window** (`Move.lift`, new in the solver): a floor for the held
  hands' midpoint, 10 cm under that height (or the window's edges, if lower), costing
  `WEIGHTS.plane` per m² below it. It has an exact gradient and is in the gradient test.
- A break on either side of the join skips both: its hands only reach.

The reach fraction was measured on five couples (ryan → ryan, myco → ryan, sprout → sprout,
ember → ryan, ryan → sprout):

| reach used | ryan → ryan's arms at the join | hands, worst couple |
|---|---|---|
| 0.9× | stretched to 42 / 43 cm | 3.6 cm (sprout → sprout) |
| **1.0×** | **33 / 38 cm, the bake's own** | **3.4 cm (sprout → sprout)** |
| 1.1× | 33 / 38 | 4.3 cm (ember → ryan) |
| 1.2× | 33 / 37 | 5.7 cm (myco → ryan) |

Using the bake's own (stretched) arm lengths for the IK made it worse: a higher arch and
46 cm upper arms.

## Result (two twirls, the whole chain)

- **ryan → ryan:** across the join the beau's raise holds 120–146°, both segments stay at
  33–38 cm, and the hands are within 2 cm. Worst jump over the chain 28°, all of it in the
  bake's own end window. Watched in Chrome: the hands stay up at head height through the join.
- **myco → ryan:** hands 2.2 cm, the same as its bake. **ember → ryan:** 2.4 cm.
- **sprout → sprout:** hands 3.4 cm at the join (bake: 1.5). Their arms are at full reach there.
- **player → ember** still jumps 98° at the join. Its bake already clips 3.5 cm and fails held;
  it's a tossed couple.
- **Test:** `chain-join.test.ts` "keeps the arch up through the join": the beau's raise stays over
  120° across the window, and his arms stay at the bake's lengths.

## Not done

- **sprout → sprout's 3.4 cm** at the join. Their arms are at full reach holding the arch at their
  standing width. A lower arch there, or a step in, would close it.
- **The forearm's heading still turns about 270° across the join.** With the forearm standing up
  into the arch it barely shows, but it's the next thing to look at if the hand seems to twist.
