# 2026-08-19 — the hand in the gap

_Documents `9ce307e` ([ADR-0030](../adr/0030-the-arch-clearance-is-measured-from-the-worse-accommodation.md)),
alongside square-one's `b3a02eb`. Committed unverified: the `#dance=two-twirls` watch is still
owed._

[The arch nobody can reach](2026-08-18-7-the-arch-nobody-can-reach.md) got the hands into the air.
Ryan watched a break and said:

> the beau's hand clips through the belle's head — it shouldn't push into the beau's own head
> either though

Two clips in one sentence, and they turned out to be one number.

## The pass had a third thing in it

square-one passes the two dancers at half the couple's width, because that is what the figure
gives: he is at the top of the arc, she is at its centre, a whole radius apart with nothing tuned
to make it so. On the cast that is on screen that is **0.570** world units, and:

| what has to fit through the gap | wants |
|---|---|
| two torsos, side by side | 0.520 |
| two heads | 0.710 |
| two heads with a **joined hand** between them | **1.084** |

The last row is the finding. With hands free two dancers have to clear each other; with hands
joined and raised there is a hand up in the gap **as well**, at head height — where a head is the
widest thing either of them has — and it belongs to neither dancer, so neither dancer's own width
accounts for it. A couple standing 1.140 apart needs 1.084 to pass under their own arch. **An arch
very nearly forbids the pair to approach each other at all.**

Both of Ryan's clips are that one number: the beau's hand is in the belle's head *and* in his own,
because the gap is a hand-width short at both ends of it.

## Measuring it means picking a plan before the coin is flipped

The figure is sized once and the accommodation is drawn per execution, so `archClearance` plans
**both** — break and reshape — grows each dancer by that plan's own body delta, and takes the
worst. The break is usually the binding one: its beau never gets his hand up, so it sits lower,
where a head is wider. And the measurement is at the hand's own height, because `sideExtentAt`
narrows a head toward its poles and a hand over a crown costs less than one at eye level.

Then it is a number, divided by the frame scale, through the same seam `coupleWidth` already uses.
The engine bows the beau's arc out to meet it. **This module measures; square-one chooses the
path.** Neither could have done it alone, which is the seam working rather than a workaround.

## What it cost

The pass goes **0.570 → 1.314**, the beau's own head clears by 0.194 where it was grazing at
0.001, and the two of them never come closer than the 1.140 they stand at.

But the arc peaks at **1.152× the couple's width** where it peaked at 0.5×, and he covers all of
it in the same 4 beats. **That is the one thing this measurement cannot tell us.** Whether he now
reads as sprinting is a look, and it is the watch this chunk is waiting on.

## And the instrument was pointed at one call

Ryan then watched `#dance=two-twirls` and said:

> it looks like the first california twirl is good but the second still has the smaller path

Right, and it was square-one's bug — `reformCouple` dropped both clearances at the call boundary,
so a pair with real bodies bowed on the first call and walked the bare radius on every one after.
Fixed there (its ADR-0019), and nothing in this module changed.

What is worth writing down here is **why our own measurement missed it**. The penetration harness
walked one call, beat by beat, in both accommodations, and reported worst penetration 0.175 → none.
Every number in it was correct. Ryan was watching a *sequence*.

**A figure that is right in isolation and wrong in a sequence is exactly what a per-call instrument
cannot see** — and this is the fourth time this month the shape of the week has been *what is the
renderer actually drawing, and is that what I measured?* This one is its sibling: **is the thing I
measured the thing on screen?** One call was measured. Two were watched.
