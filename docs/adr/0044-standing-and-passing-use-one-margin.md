# ADR-0044: Standing and passing ask the same function how far apart two bodies go
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude
- Extends: [ADR-0035](0035-the-square-does-not-grow-for-its-widest-pair.md), [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md)

## Context

Two places in this repo ask how far apart two bodies must be.

**`placeHold`**, deciding where a couple *stands*:

```ts
lateralClearance(beau.parts, belle.parts) + PERSONAL_SPACE   // 0.06, additive
```

**The figure**, deciding how far apart they must be to walk *past* each other:

```ts
CLEARANCE_MARGIN * lateralClearance(rigidParts(a), rigidParts(b))   // 1.1, multiplicative
```

Same question, same measurement, two margins. They are equal at a clearance of exactly **0.600**;
above it the couple's stance is the smaller number and **a pair stand closer than they can pass**.

🔴 **And `PERSONAL_SPACE`'s own doc comment described the two as the same number** — *"deliberately
the same 0.06 the default frame scale leaves between passing bodies"*. That was true when it was
written and stopped being true when the frame's margin became a multiplier. Nothing checks a
comment, so it went on describing an agreement that had lapsed, and the couple's standing floor had
been written from it.

Measured across the shipped cast: **2 of 20 orderings short, both Myco with Sprout, by 0.008** — and
only four pairings sit on that floor at all, the rest being held wider by shoulders or reach. Small,
and it is a couple standing somewhere they cannot dance.

Ryan, on which margin should win: *"ok do x1.1 everywhere."*

## Decision

**One function, `passingWidth(clearance)`, in `frame.ts` beside the constant it applies. Both the
standing floor and the figure's requirement call it.**

```ts
export function passingWidth(clearance: number): number {
  return CLEARANCE_MARGIN * clearance;
}
```

The multiplicative form wins because it is the one with a written rationale (ADR-0035) and the one
every figure in the repo already runs through; making the *stance* agree with the figure is a
smaller change than making every figure agree with the stance.

**`PERSONAL_SPACE` keeps its other two callers and loses this one.** Its stated job — *daylight an
arm keeps from the space its partner is entitled to, so it starts folding before it would collide* —
is a question about a limb, not about where two people stand. It was borrowed for the stance because
the comment said the numbers matched.

## Alternatives considered

- **Additive (`+0.06`) everywhere.** Physically the better story: a margin is "do not visibly clip",
  which is an absolute distance, and two people brushing brush by the same amount whatever their
  size. It loses on blast radius — `CLEARANCE_MARGIN` is in the clearance chain of every figure,
  and rewriting all of them to fix a 0.008 discrepancy on one pairing is the wrong trade. Recorded
  because if the small end of the cast ever looks cramped, **this is the alternative to reach for**,
  not a third constant.
- **`clearance + max(PERSONAL_SPACE, 0.1 × clearance)`.** Belt and braces, and it puts two tuned
  numbers in one formula — which is the shape of thing this month has twice found and once shipped.
  Declined on that alone.
- **Leave it: 0.008 on one pairing.** The size is not the point. Two spellings of one rule drift by
  construction, and this pair drifted the moment one of them changed form.

## Consequences

- **No pair stands closer than they can pass**, over the shipped cast and over 300 random pairs
  drawn across the whole `SHAPE_BOUNDS` range. Asserted, so the two cannot come apart again quietly.
- **Four stances moved and sixteen did not.** Myco with Sprout goes 0.737 → **0.745** in both
  orders; Sprout with the player goes 0.490 → **0.473**, because below the crossover the
  multiplicative margin is the *smaller* one. 🔴 **That is the honest cost of the choice**: the
  smallest pairing on the cast now keeps 0.043 of daylight where it kept 0.06.
- **No outcome changed.** Still 11 dancing at their own width, 9 reaching, 0 letting go, with the
  same arm deltas. What changed is where a couple stands before the arch asks them for anything.
- **Myco with Sprout now stand on exactly what they need to pass**, so every unit of their reach is
  the arch's — the hand and the arm in the gap — and none of it is the stance making up a shortfall
  it should never have had. Their overshoot ratio went 1.62 → 1.07 → **1.05** across the day's three
  corrections, which is what a number looks like when three separate things were inflating it.
- **Promotion condition:** the margin is a property of two silhouettes passing. A figure where the
  pair pass something *else* — a third dancer, scenery — would want the clearance to take more than
  two part-lists, and `passingWidth` is the seam that would grow.
