# ADR-0039: A joined hand is charged against the other dancer only, and from where it actually is
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude
- Extends: square-one's [ADR-0018](https://github.com/randallard/square-one/blob/main/docs/adr/0018-the-arch-needs-a-hands-room-between-two-heads.md), [ADR-0038](0038-the-arm-holding-the-arch-up-is-in-the-gap-too.md)

## Context

`archClearance` answers square-one's `Couple.archClearance`: how far apart must this pair stand
for the thing at the hand's height to get past both of them. Since ADR-0018 it has been one loop:

```ts
for (const height of [plan.hands.beau.height, plan.hands.belle.height]) {
  const widest = Math.max(sideExtentAt(b.parts, height), sideExtentAt(l.parts, height));
  need = Math.max(need, 2 * (widest + hand));
}
```

Two things are folded into that `2 × max(…)`, and until now nothing could show either.

**A hand was charged against its own owner.** Taking the *max* of the two cross-sections and
doubling it says every hand must clear **both** bodies by a half-separation. A joined hand hangs
off a shoulder. It does not have to clear the dancer it is attached to.

**And it measured from the couple's midpoint**, ignoring `plan.lateral` — the join's offset toward
the belle. [ADR-0038](0038-the-arm-holding-the-arch-up-is-in-the-gap-too.md) wrote this one down in
its consequences and deferred it: folding it in would have put two decisions in one file, and on
the shipped pairing the term is zero. Its promotion condition was *"a cast where a short hand lands
beside its owner's head rather than above it."*

**The cast picker is what stood one up.** `#dance` gained a beau and a belle dropdown over every
character on 2026-08-22, and the first pairing tried was Ember as beau with Myco:

| | handholding width | hands need | dances at |
|---|---|---|---|
| myco (beau) / ember | 1.140 | 0.220 | 1.140 — keeps hold |
| **ember (beau) / myco** | 0.820 | **1.087** | **2.374 — lets go** |

The same two people, in the other order. With Ember as beau the join sits at 1.640 — Myco's crown
plus a hand's headroom, and as high as Myco can reach — which is level with **Ember's own head**,
half-width 0.434 there. The pair were charged `2 × (0.434 + 0.110)` for Ember's hand clearing
Ember. Ryan: *"no, that doesn't make any sense… they should not have to stand wide."*

## Decision

**Each hand is charged against the *other* dancer's cross-section at its own height, from its own
lateral, at its own hand's radius.**

```ts
const hands = [
  { hand: plan.hands.beau,  radius: b.handRadius, other: l.parts, sign:  1 },
  { hand: plan.hands.belle, radius: l.handRadius, other: b.parts, sign: -1 },
];
need = max over hands of 2 * (sideExtentAt(other, hand.height) + radius + sign * hand.lateral)
```

`lateral` runs toward the belle, so a hand leaning her way is nearer her and further from him —
hence the opposite signs. Solved directly rather than by bisection: the plan is made at the
couple's standing width, as it always was, and this reads positions off it.

The **own hand radius** rather than the larger of the two falls out of the same correction. Under a
break the two hands are separate objects and each is its owner's; under a surviving hold they sit
on the same point, so both rows evaluate at the same height and lateral and the larger wins on its
own.

## Alternatives considered

- **Fix only the own-owner half.** The cheaper change, and it leaves a measurement that is wrong in
  a way that happens to be conservative. A conservative wrong number is what hid this one: the
  midpoint assumption *under*-charges an off-centre join against the dancer it leans toward, which
  is the direction that clips.
- **Bisect on the separation, like `armSweepClearance`.** The hand positions depend on the
  separation through `insideShoulderX`, so strictly this is a fixed point. `armSweepClearance`
  already bisects while holding `hand.lateral` fixed, so the two would still disagree about what
  varies. Left as a direct solve: it keeps ADR-0018's contract — plan at the width, report the
  clearance — and a second bisection with a different set of frozen terms would be two answers to
  one question.
- **Charge the hand against the other dancer's *hand* as well.** Under a break the two hands are
  apart and both are in the gap. Neither this function nor `armSweepClearance` models hand-against-
  hand, and adding it here would be a third decision in a file that has just had two taken out.

## Consequences

- **It corrects in both directions, which is the sign it was two bugs and not one.** On the default
  pair the reshape goes **0.193 → 0.281** — it had been *under*-charged, because the join leans
  0.050 toward the belle and nothing counted that — while the break goes **0.951 → 0.905**, because
  the beau's hand no longer pays to clear the beau. A pair-wide sweep moves 9 of the 20 orderings
  of the shipped cast.
- 🔴 **It rescues fewer pairs than it should.** Ten of twenty orderings were being pushed to roughly
  twice their handholding width; nine still are. The measurement is honest now and the outcome is
  mostly unchanged, which says the remaining cause is elsewhere — see below.
- 🔴 **ADR-0036's witness weakened.** That decision — do not multiply `archClearance` by
  `CLEARANCE_MARGIN`, it already carries three margins — was evidenced by the default pair's
  margined request landing at 1.046, over square-one's cap. With the bare request down to 0.905 the
  margined one is **0.996**: a near miss rather than an overflow. The decision does not rest on this
  pair being the one it overflows for, and the test now asserts what is true with the history
  written beside it. **A decision evidenced by one number is a decision one correction away from
  looking unmotivated.**
- **`archFits` is unchanged and still says no for Myco with Sprout** — their overshoot was 1.62 and
  is 1.07. The finding survived the correction; its size did not.
- 🔴 **What actually blocks the mismatched pairs is one level up.** Myco and Sprout want **1.010** of
  their handholding width to pass each other **hands free, with no arch involved at all** — so a
  Partner Trade fails for them on the same ground. The couple's width comes from `touchHold`, which
  solves the handhold and never floors it at the room the two bodies need. That is a decision about
  what a couple's width *is*, and it belongs beside ADR-0027 rather than here.
- **Promotion condition:** the hand positions are read off a plan made at the couple's standing
  width. A figure that changes the separation *during* the hold — rather than bowing around it —
  would make that plan stale, and the fixed point this deliberately does not solve would start to
  matter.
