# 2026-08-21 — the arm that does not reach the join

_Closes the over-correction committed in `0de0016` and writes the ADR that commit owed:
[ADR-0038](../adr/0038-the-arm-holding-the-arch-up-is-in-the-gap-too.md)._

The previous chunk found the fourth thing in the gap. Two dancers passing under an arch have to
clear each other, they have to clear the joined hand between them (square-one's ADR-0018), and
they have to clear **the arm holding that hand up** — which nobody had asked about, because while
the figure was sized to the worse of the two accommodations a break's low join happened to buy
enough room by accident.

It shipped with a note saying it was over-corrected, and it was, twice.

## The first over-correction was a mirror

`armSweepClearance` mirrored the problem into each dancer's own frame — "me at −s/2, them at
+s/2" — and ran the same code for both. The join's lateral is signed *toward the belle*, and the
mirror flips which side that is. It was not negated.

So the belle's arm was measured reaching for a point on the wrong side of the midpoint: 0.1 too
far across, on a quantity that was already binding. Correcting it dropped the reshape's request
from **1.055 to 1.023** on its own.

**A matched pair cannot catch this**, because their lateral is zero. Every symmetry test in the
file passes either way. The frame is the couple's now, with a `-1`/`+1` side, and there is nothing
left to mirror.

## The second was charging for a reach nobody makes

Both arms ran from a shoulder to **the join**. Under a break they do not get there — that is what
a break *is* — so the model was drawing an arm longer than its owner has and sizing the figure to
it. On the default pair that pushed the request to 1.184 against a handholding width of 1.140, and
ADR-0037's rule for a request that cannot be delivered is *let go and stand at twice the room you
need*. They stood **2.368 apart** for a pass they can dance holding on.

The fix is one function. `reachToward` puts a hand at its target when the arm can span it and at
`handReach` **along the line to it** when it cannot, so the hand comes up short *across* as well
as up. `ArchPlan.hands` carries a point per dancer instead of a height each, the sweep runs each
arm to its own hand, and `DanceFloor` poses to the same point — lateral included, which it was not
doing.

The break's arm cost fell **1.184 → 1.032**, back under `archClearance`'s 1.085, and 1.085 fits
inside 1.140. They keep hold.

## What `reachCeiling` is actually for

Worth writing down, because the wrong one of these looks exactly like the right one.

`reachCeiling` answers *"how high can this hand get **if it has to arrive over the join**"*. That
is the right question while a hold is being **planned** — it is what decides whether the pair can
make an arch at all, and it still does. It is the wrong question once the answer is "not that
high", because it spends the entire shortfall on height and none of it on the across, leaving the
hand hovering over a point the arm cannot span to.

Released from the midpoint, the short hand comes back toward its owner and ends up slightly
**higher** than the ceiling said: 1.635 against 1.631. The over-charge was never that the hand was
too high.

## The cost, stated plainly

ADR-0037's headline was that the two Twirls finally look different: 0.685 of the couple's width
for a reshape against 0.951 for a break. **That difference is mostly gone** — 0.897 against 0.952.

It is honest rather than a regression. The arm is in the gap under *both* accommodations, and only
the hand was ever cheap up there. The draw is still plainly visible in the reshaping torsos; it is
much less visible in the beau's bow. If Ryan wants the bow to carry the difference again, that is
a new question about what a reshape should cost, not a defect in this measurement.

## Also, the gate had been red for two commits

`docs-hygiene` rejects a Status line it cannot parse, and ADR-0030's supersede note had been
written as bold text with a trailing sentence of reasoning since `cb6b1b4`. The reasoning already
lives in ADR-0037's Context, where it belongs; the status line is plain again and the gate is
clean.

## What the watch is

`#dance=two-twirls`. The reshape side should have the belle's arm clear of the beau's head — the
clip Ryan reported — and **neither** Twirl should now show the pair standing at arm's length and
beyond. Half of all executions used to.

Run from a top-down camera the two bodies clear each other at the pass with room to spare. Whether
the arm reads clear of the head is Ryan's call, as it was the call that found it.
