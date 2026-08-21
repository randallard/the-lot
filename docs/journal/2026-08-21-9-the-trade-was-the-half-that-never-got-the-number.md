# 2026-08-21 — the Trade was the half that never got the number

_Documents this module's half of the generalisation chunk:
[ADR-0031](../adr/0031-the-hands-free-clearance-is-passed-too.md), landed in `dbfed4f`.
square-one's half is its ADR-0020, ADR-0021 and ADR-0022, landed there in `8d436cd` and released
as **v0.3.0**._

Ryan, after square-one made every call able to take a body:

> I looked at `#dance=two-trades` and it's still too tight — if we're generalizing correctly it
> should be like `#dance=two-twirls`

He was looking at two figures that walk the **same two paths**. A California Twirl is a Partner
Trade with the inside hands joined and raised — square-one's ADR-0017 — and the only thing that
distinguishes them is what is in the gap when the dancers pass. One of them bowed and one of them
did not, which is not a difference either figure has.

## The number existed, was measured, and was not passed

This module has computed `lateralClearance` since ADR-0012, for the frame scale. It has passed the
**arch** clearance to square-one since ADR-0030. The hands-free one was withheld on purpose, and
the note said so in as many words: switching it on would bow a figure Ryan had already watched and
accepted, so it was *a look, not a number*, and it was owed rather than taken.

Two days of "owed" is fine. What made it wrong was the arch landing next to it: from that moment
the two calls were asymmetric for a reason that had nothing to do with the calls.

**A withheld number is a decision with an expiry date, and nothing in the code carries the date.**

## The other half was in the engine, and it was older

Passing the clearance took the Trade's closest approach from 0.554 to 0.670 world units — against
the 0.710 its heads want. Still short, and short in a way that turned out to have been true of
everything the couple work has measured.

square-one solves the beau's bow so the couple's minimum separation is the room the bodies need.
It solved that against the **arc**. The dancers walk a polyline: `orbit` marked a waypoint every
45° and `sampleMotion` runs straight lines between them, so the chords sag 7.6% of the radius
inside the curve. The solver was right about a shape nobody dances.

Every instrument in both repos missed it, and they missed it the same way: they all pair the two
dancers up at their shared waypoint beats, and the sag lives strictly *between* those marks. More
tests of that kind would not have found it. The one that does runs `sampleMotion` — the thing a
consumer actually uses. Detail in
[square-one ADR-0022](https://github.com/randallard/square-one/blob/main/docs/adr/0022-the-waypoints-are-the-path-so-the-arc-is-sampled-to-be-one.md).

With the arc sampled at 7.5°, the Trade delivers **0.709** against 0.710.

## The tripwire fired, and so did the finding it was protecting

Three tests in `dance-performance.test.ts` asserted the shortfall rather than hiding it. One of
them said outright it was written *"so this test fails loudly the day somebody fixes it
properly."* It did.

The one worth recording is the other one. It claimed wide bodies **structurally** could not dance
a Trade at handholding distance:

> No amount of work on this side fixes that. Either the beau's arc leaves the circle the couple
> stands on, or a Trade is a figure that wide bodies cannot dance at handholding distance. That is
> a decision about the figure and it is Ryan's.

Both halves of that were true, and the first branch is what happened — square-one built the bow
five days later and this module finally passed it the number. `cast([0.6, 0.6])` went 0.819 →
1.197 against 1.200 wanted. **A pinned finding that names the decision that would overturn it is
worth more than a passing test**, because it is what makes the overturning legible when it comes.

## What the watch is now

The Trade bows **less** than the Twirl, and it should: same bodies, but the Twirl has a joined
hand up between two heads and the Trade does not. The beau's path over four beats runs 1.789
world with no bodies, 2.033 for a Trade, 3.387 for a Twirl. If `#dance=two-trades` now reads
right, the generalisation is landed; if the beau reads as hurrying, that is the same sprint
question `#dance=two-twirls` has been carrying since 08-19, and it is 14% rather than 89%.
