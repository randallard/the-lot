# 2026-10-27 (6): the held arms may come close

🧪 Exploratory, no ADR. Follows 10-27-5's "not done": sprout → sprout's hands opened 3.4 cm at
the join between two twirls. Ryan re-watched it: *"looks better"*. Committed.

## What was wrong

10-27-5 guessed the cause was the arch: their arms are at full reach holding it at their standing
width. Lowering the arch (0.9–0.97 of the reach) changed nothing, so that wasn't it. Neither was
the hold weight on its own (8000: 1.8 cm), nor the beau's own hand against his own head (a 2 cm
own-body margin made it 4.1 cm).

**It was the margin between the two held arms.** The join's polish runs at the bakes' 6 cm
clearance. In an arch over a short couple, the two held arms rise side by side: his forearm along
her upper arm, upper arm along upper arm. The solver bought those 6 cm by stepping the beau
**out 15–17 cm**, which took the couple from 0.49 m to 0.66 m apart, past where sprout's arms can
meet. Only the hands, the wrist behind them, and the two forearms were exempt (10-27-4).

## The fix

`whole-move.ts`: the rest of the two held arms (upper arm on upper arm, upper arm on forearm)
keep at most `HELD_MARGIN` (2 cm, the solver's default margin) between them, whatever margin the
solve asks of everything else. It's in `frameCost` and in the gradient's plan (`exempt` = 2), so
the gradient test still holds.

At no margin, the held arms crossed into each other (0.1–0.5 cm of clip). At 1–3 cm there was no
clip, and 2 cm gave the best hands.

## Result (two twirls, the last beat and the join; `scripts/whole-move/try-join-sweep.ts`)

| couple | before | after |
|---|---|---|
| **sprout → sprout** | 3.4 cm | **0.6 cm** |
| player → sprout | 5.4 | 2.2 |
| myco → myco | 7.5 | 4.9 |
| sprout → myco | 3.3 | 2.1 |
| ryan → ryan | 2.0 | 0.5 |
| player → player | 3.3 | 2.3 |
| myco → sprout | 3.5 | 3.1 |
| **ember → ryan** | 2.4 | **3.3** (worse) |
| the other 17 | — | unchanged (±0.2) |
| **sum over 25** | 48.2 | **36.2** |

No new clipping. ember → player clips 4.6 cm both before and after; its bake does.

- **Test:** `chain-join.test.ts` "closes sprout → sprout's hands at the join": the hands are
  within 1.5 cm over the last beat and the join, with no clip.
- **The bakes are unchanged.** They're committed JSON. A re-bake would solve with the new margin,
  but none was run.

## Not done

- **ember → ryan got worse (2.4 → 3.3 cm)**, at samples 36–37: the hands climb to 165 cm, and the
  beau side-steps 13.7 cm. It looks like the polish settling differently, not a mechanism.
- **myco → myco is still 4.9 cm,** and myco → sprout is 3.1. Both are short-armed couples.
- **The forearm's heading still turns about 270° across the join** (from 10-27-5).
- 38 tests in `src/dance` fail at HEAD, the same as before this change (see PROGRESS).

## Later: the hands came down after each twirl

Ryan watched: *"ryan ryan looks good - sprout sprout looks ok but the hands come down after each
twirl"*.

**Why:** each bake lowers the hands for its own end, and for sprout it lowers them early. They
peak at 100 cm mid-twirl and are down to 77 cm by sample 30, where the join's window began. The
window's edges are frozen, so the join lifted them back to 104 at the join, and the next bake's
start sank them to 75 again. ryan → ryan's bake holds 155–160 cm the whole way, so it never
showed. Lifting the floor under the hands (rising from each edge to the arch) changed nothing:
the edges themselves were the low points.

**The fix:** the join gets its own, wider window (`JoinOptions.join`, default **15** samples a
side; a call's start and end keep 10). Swept on all 25 stock couples. The *dip* is how far the
hands sink between the first twirl's middle and the second's (`try-chain.ts` prints it now):

| join window | dip, summed | hands' worst gap, summed | clip, summed |
|---|---|---|---|
| 10 (was) | 914 cm | 100.0 cm | 36.9 cm |
| **15** | **707 cm** | **95.4 cm** | 36.8 cm |
| 19 | 653 cm | 111.4 cm | 37.4 cm |

At 19 the window reaches back into the pass under the arch (it starts at sample 21, the peak),
and some couples' hands opened: ryan → myco 5.1 → 12.8 cm, myco → sprout 3.4 → 6.7.

- **sprout → sprout:** dip 21 → 6 cm. The hands hold 91–106 cm between the twirls.
- **ember → ember** 64 → 22, **ember → player** 49 → 12, **player → ryan** 49 → 28.
- **A join costs about 340 ms** (from 260).
- **Tests:** the sprout test also checks the beau's hand stays over 88 cm through the join. The
  two 10-27-5 tests now cover the 15-sample window. The upper-arm bound is the bake's own longest
  (37 / 43 cm), since the wider window reaches samples where the bake itself is stretched.

**Still dipping 40–70 cm:** myco → ryan, sprout → ryan, sprout → myco, sprout → ember,
player → myco, myco → myco, myco → ember. Their bakes spike to 140–155 cm only while the belle
passes under, then drop within a beat, and the arch the join can hold at their standing width
(`archHeight`) is lower. Holding those up means reaching into the pass itself, or a step in at
the join.
