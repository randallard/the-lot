# 2026-09-21 (3) — the arch is at full stretch for almost everybody

Third session. [09-21-2](2026-09-21-2-four-ways-to-get-an-arm-over-your-own-head.md) built the
cells; this one builds the first pose to go in one — `FULL_L`, the happy path.
[ADR-0058](../adr/0058-a-raised-hold-stands-the-upper-arm-up.md).

It also found the thing I did not expect, which is in the title.

## The L is a rotation, and that is the whole trick

Ryan's description from 08-23 is geometric and precise: *"an upside down L with the invisible
upper arm and the forearm then is horizontal over the head."* The obstacle was ADR-0027 — *"the
humerus of a hanging arm stays in the plane of its own shoulder"* — which is a good decision being
asked the wrong question. Nothing about an arch is hanging.

🔑 **Both answers are points on the same circle.** The elbow's legal positions are the
intersection of a sphere at the shoulder with one at the placed point, and that is a circle
whatever rule picks from it. ADR-0027 picks where it crosses the shoulder's own plane; the L picks
the **highest** point on it. So the whole change is one parameter that *rotates* between them —
and because it rotates, every intermediate value is a real elbow. The humerus keeps its exact
length the whole way across, so `upperArmStrain` reads zero at both ends and in between.

A lerp between two elbow *positions* would have cut the chord and shortened the upper arm in the
middle of the blend — an arm that changes length while the hands go up, on precisely the figure
where somebody is watching the arm.

And the highest point is closed form: the normalised projection of **up** onto the circle's plane,
length `√(1 − n.y²)`. No search, no constant. That mattered — ADR-0027 exists to have stopped
guessing elbows with tuned preferences, and a rule that reintroduced one would be spending exactly
what it was written to buy.

The rest follows: `TouchHold.raised` carries it, `DanceFloor` passes the arch's **own blend**, so
the humerus stands up exactly as fast as the hands climb. A threshold would pop.

## 🔴 Then I measured how often it fires: 7 of 50

Across all twenty-five orderings, both roles, at the real arch with the reach and the reshape
worn. **For 43 of 50 arms the hold is at or past full stretch** — `touchPose` falls through to
`reachPose`, the circle has collapsed to a point, and there is no elbow to place at all.

My first instinct was that this made the rule a disappointment. It does not, and reading the
numbers properly is the actual finding:

- A straight arm has no elbow freedom, **and neither does the dancer.** That is ADR-0027's own
  observation — *"the straighter the arm, the smaller the elbow's circle"* — met at the far end of
  its range rather than contradicted.
- The straight arms are mostly **already near-vertical**, 6°–29° off, because they are reaching up
  to a point above the crown. They did not need standing up.
- Where there *is* slack the rule earns its keep: `ryan/sprout`'s beau goes **44° → 28°**.

🔴 **The real news is the 43.** The arch asks almost every arm on the cast for its full length.
`archRoom` clears the **taller** dancer's crown and holds both dancers to it. That is a number for
worklist item 10 — *"the last resort is reached far too readily"* — which until now was a look
rather than a measurement. It is also, I suspect, most of why `sizeArch` reaches for
accommodations as often as it does.

🔴 And one arm is neither straight-and-vertical nor bent: **`sprout/ember`'s beau sits at 88° off
vertical, straight.** A nearly horizontal upper arm at an arch, with no elbow freedom to fix it.
Recorded, not fixed — it is a reach problem, not an elbow problem.

## Two scratch harnesses were wrong before one was right

Worth writing down because it nearly cost a wrong conclusion.

The first put the hand above the crown at the midline and reported that `raised` did nothing for
anybody. True — but only because that target is out of reach for the entire cast, so every case
fell to `reachPose`. The measurement was of my target, not of the rule.

The second posed through `poseArms` with a hand-built hold and got mixed, contradictory numbers —
some pairings improving, some getting *more* strained by a rotation that cannot add strain. That
was the tell. It had three bugs: `planArch`'s body deltas were never worn, the beau/belle role
came out of `side === "right"` and I had passed the wrong side, and a garbled expression
(`-l.insideBelle === 0 ? …`) was picking the shoulder. I deleted it rather than repairing it.

The third applied the reach, then the reshape, then asked one narrow question — *is there a circle
here at all* — and that is the one that produced the 7-of-50. **The narrow question was the one
worth asking**, and I got there by asking broad ones twice.

## The tests name the regime boundary

Two of the six failed first time, both on `ryan` at 90% of his reach — and both were my test
over-claiming, not the code. At that stretch he is already in `reachPose`, so the elbow does not
sit in the shoulder's plane and `raised` does nothing.

Rather than drop the assertions or lower the fraction until they passed, the tests now ask
`onTheCircle` and state each rule where it applies. That is better than what I first wrote: the
boundary between the two regimes is real, it is ADR-0027's own documented fall-through, and a test
that assumed one regime across the cast would be asserting the wrong thing about the pose instead
of finding a defect in it.

## What is still owed

**The head guard.** Standing the elbow up can move a forearm *toward* a head, and nothing checks.
The good news from the 43: it is a smaller problem for a **held** arm than I assumed, because a
straight arm reaching to a point above the crown passes the head rather than through it. It is the
**free** arm — the one that raises inward past horizontal, where every character on the cast fouls
their own head — that the general rule is really for. Still worklist item 11, still its own ADR.

**`DUCK_UNDER` and `CASUAL`**, which keep their *"no pose yet — don't rate it"* block. `FULL_L`'s
comes off.

**State.** `arm-pose.ts` (`standUp`, `TouchHold.raised`, threaded through `settleTouch` and
`poseArms`), `DanceFloor.tsx`, new `raised-elbow.test.ts` (6 statements). Suite **753 → 759
passing, the same 36 failures, same 8 files.** `tsc` clean, lint 0 errors / 25 known warnings,
docs-hygiene clean. Uncommitted.
