# ADR-0038: The arm holding the arch up is in the gap too, and each arm is swept to its own hand
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude
- Extends: square-one's [ADR-0018](https://github.com/randallard/square-one/blob/main/docs/adr/0018-the-arch-needs-a-hands-room-between-two-heads.md), [ADR-0037](0037-the-figure-is-sized-to-the-accommodation-drawn.md)

## Context

square-one's [ADR-0018](https://github.com/randallard/square-one/blob/main/docs/adr/0018-the-arch-needs-a-hands-room-between-two-heads.md) found the third thing in the gap
a California Twirl passes through. Two dancers with hands free have to clear each other; two
dancers with hands **joined and raised** have a joined hand up there as well, belonging to neither
of them — so the figure was sized by what must fit **at the hand's height**.

That is the right question for a hand and the wrong one for the **arm holding it up**. The hand is
only the top of it.

[ADR-0037](0037-the-figure-is-sized-to-the-accommodation-drawn.md) is what made the omission
visible. While the figure was sized to the *worse* of the two accommodations, a break always bound
— and a break's join sits low, where a head is widest, so it happened to buy enough room for the
arms by accident. Sizing each execution to the accommodation it drew removed that cover. Under a
**reshape** the join rides clear above both crowns, `sideExtentAt` returns **zero** up there, and
the whole figure fell back to what the two bodies alone need. Ryan, watching the two Twirls that
produced:

> yeah they look different but now the short side is clipping the belle's arm into beau's head

Her arm runs from her shoulder up to that join. On the way it passes exactly where his head is.

**The correction then over-shot in the other direction, and that is the second half of this ADR.**
The first implementation ran *both* arms from a shoulder to the **join**. Under a break they do not
get there — ADR-0028's *"both arms reach as far as they can toward the same target, and the hands
come apart"* — so the model charged the figure for an arm longer than its owner has. On the default
pair that pushed the request past their own handholding width, which under ADR-0037 part 3 means
**let go and stand twice as wide**: 2.368 world units for a pass they can dance holding on.

## Decision

**The figure is sized to what the raised *arms* sweep through as well as what the hands need, and
each arm is swept to its own hand rather than to the join.**

Three parts, all in `arch.ts`:

1. **`ArchPlan.hands` carries a `HandPoint` per dancer — a height *and* a lateral** — instead of a
   height each against a shared join. A hold that survives puts both hands on the same point, so
   the lateral was common to them and lived on the plan once; a hold that has **broken** does not.
2. **A hand that cannot reach the join stops `handReach` along the line to it** (`reachToward`),
   short **across** as well as up. This is what `reachPose` already draws for an out-of-reach
   target — a straight arm aimed at a point it cannot touch — so the number and the render now
   describe the same arm. `DanceFloor` poses each dancer to their own `HandPoint`, lateral
   included.
3. **`armSweepClearance` solves for the separation at which every point of each arm clears the
   other dancer**, by bisection, and `sizeArch` takes it alongside `archClearance` and the
   hands-free floor.

**Solved rather than measured, because the arm slopes.** It starts at a shoulder `restX` out from
its owner's midline and ends at a hand between the two of them, so where it sits laterally depends
on the height you ask about — and *both* endpoints move when the pair move apart. Sampling a fixed
pose would answer for a separation nobody is standing at. Bisection is sound because the predicate
is monotonic: pulling the pair apart moves every point of each arm away from the other dancer.

## Alternatives considered

- **Add the arm's half-width to `archClearance` at the join's height.** The cheap version, and
  conservative in exactly the wrong place: it charges a reshape for room at a height where nobody
  has a head, dragging it back up toward the break's number and undoing the difference between the
  two accommodations that ADR-0037 exists to produce. It also answers *nothing* about the height
  where the arm actually passes a head.
- **Keep `reachCeiling` as the broken hand's position.** `reachCeiling` answers "the highest a
  hand can get **if it must arrive over the join**" — the right question while a hold is being
  planned, and the wrong one once the answer is "not that high". It spends the whole shortfall on
  height and none of it on the across, which puts the hand above a point the arm cannot span to.
  Released from the midpoint the hand comes back toward its owner and ends up slightly *higher*:
  1.635 against 1.631 on the default pair.
- **Model only the drawn forearm.** Only the forearm and hand are meshes; the upper arm is the
  undrawn gap between the shoulder and the elbow. Sweeping the whole shoulder-to-hand line is
  deliberately more conservative than what is on screen, because the elbow is off that line and
  a clip nobody can see is still a clip somebody can.

## Consequences

- **The clip Ryan reported is gone, and it cost the reshape most of ADR-0037's saving.** On the
  default pair a reshaped Twirl now asks **0.897** of the couple's width where it asked 0.685.
  🔴 **The two Twirls are therefore much closer to each other than ADR-0037 left them** — 0.897
  against 0.952, not 0.685 against 0.951 — which is honest rather than a regression: the arm is in
  the gap under *both* accommodations and only the hand was ever cheap. **The per-execution draw
  is still visible in the reshaping torsos; it is much less visible in the beau's bow.**
- **The default pair keep hold under a break.** Sweeping each arm to its own hand took the break's
  arm cost from 1.184 to 1.032, below `archClearance`'s 1.085, so the binding number is a hand's
  again and 1.085 < 1.140 fits. They stand at their handholding width instead of 2.368.

  | myco/ember | hands need | arms need | bodies need | dances at | ÷ width |
  |---|---|---|---|---|---|
  | reshape | 0.220 | **1.023** | 0.781 | 1.140 | 0.897 |
  | break | **1.085** | 1.032 | 0.781 | 1.140 | 0.952 |

- 🔴 **A sign bug came out with it.** The first `armSweepClearance` mirrored the problem into each
  dancer's own frame and carried the join's lateral across the flip **without negating it**, so
  the belle's arm was measured reaching for a point on the wrong side of the midpoint. Everything
  is written in the couple's frame now, with a `-1`/`+1` side, and the reshape's number fell 1.055
  → 1.023 on that alone. **A mirrored frame is a sign waiting to be lost**; a matched pair has a
  lateral of zero and cannot catch it.
- **`ArchPlan.gap` is now the distance between the two hands rather than the difference in their
  heights** — a hand that stopped short came away from the join in two directions.
- 🔴 **`archClearance` still measures from the couple's midpoint**, which is no longer where a
  broken hold's short hand is. It is conservative on the term that binds — the tall partner's body
  at the low hand's height — and the term it under-charges is the hand against its **own** body,
  which on the shipped cast is zero because a hand that falls short still ends above its owner's
  own crown. Left alone deliberately: it is ADR-0018's measurement, it is not wrong today, and
  folding it in here would put two decisions in one file. **Promotion condition:** a cast where a
  short hand lands *beside* its owner's head rather than above it.
- **Promotion condition for this ADR:** the sweep is a straight line from shoulder to hand in the
  couple's plane. A figure that raises an arm across the body, or a hold with a real elbow
  solution in the plane, would need the swept volume to follow the posed elbow instead.
