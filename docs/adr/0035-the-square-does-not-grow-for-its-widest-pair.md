# ADR-0035: The square does not grow for its widest pair
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude

## Context

Since ADR-0012 the square has sized its **whole floor** to whoever needed the most room:
`scaleForGaps` took the widest pairwise `lateralClearance` in the cast and grew the frame until
square-one's fixed engine lane — `2 × ENGINE_LANE_OFFSET`, a hand-copied duplicate of the engine's
private `LANE_OFFSET` — happened to equal it.

`frame.ts` said what that cost, in its own words:

> whole-square breathing done coarsely — the neediest pair sets the spacing for everyone, even in
> moves that don't involve them. Local breathing (square-one call model Layer 2, unimplemented)
> will tighten that later; this bound is loose for mixed squares but never wrong.

It was the only lever available. The engine's figures were drawn at fixed sizes, so the one way to
give two real bodies room was to move the floor under everybody.

That stopped being true today. square-one's [ADR-0020](https://github.com/randallard/square-one)
made every call sizeable to the dancers, [ADR-0023](https://github.com/randallard/square-one) made
a pass walk only as far as it needs to clear, and v0.3.0 exports the constants a consumer has to
beat. **The figures carry their own accommodation now**, and the floor is carrying a second copy of
it.

## Decision

**The square dances at one scale. `DEFAULT_SCALE`, or whatever the consumer passes — never a
number derived from anybody's body.**

`scaleForGaps`, `minScaleForGap`, `minScaleForPair`, `minScaleFor` and `ENGINE_LANE_OFFSET` are
deleted. `DanceFloor` no longer computes pairwise gaps at all.

`SCALE_MARGIN` survives as **`CLEARANCE_MARGIN`**, and the rename is the decision in miniature: the
margin was never about scale, it was about `lateralClearance` returning the distance at which
nothing *touches*, which is the distance at which everything touches. It now multiplies the
clearance this module measures and hands to the engine, so it applies to the pair it was computed
for.

## Alternatives considered

- **Keep the growth as a floor under the local accommodation.** Belt and braces, and it hides
  exactly the bug this replaces: a figure that failed to accommodate would still look fine, because
  the floor would have quietly made room. The whole value of local accommodation is that it fails
  visibly.
- **Keep `ENGINE_LANE_OFFSET` for other arithmetic.** Nothing else used it, and it was a
  hand-maintained copy of a constant in another repository — the exact duplication square-one's
  ADR-0020 exported its constants to end.
- **Do it and keep the frame at the old 2.603 for this cast**, so nothing on screen moves. That is
  a fitted constant replacing a derived one, and the derivation was the only thing making 2.603
  meaningful.

## Consequences

- **The square is 15% tighter on the shipped cast** — a facing pair stands **2.200** world units
  apart where it stood 2.603 — and **every clearance is delivered unchanged**: the pass still
  opens to 0.781 world against the 0.710 two bodies need, because the accommodation moved from the
  floor into the figure. That is the whole claim, and it is what the render watch is for.
- **The engine's body measurements finally bind.** At the old scale the cast's clearance divided to
  0.273 engine, *below* the figure's own 0.3, so ADR-0021 floored it and the lane never moved. At
  one scale it divides to 0.355 and the pair calls genuinely widen. The seam had been open for a
  day and doing nothing.
- 🔴 **And `gripRadius` flipped sign.** The same arms divided to 0.274 engine at the old scale and
  0.324 now — below the body-agnostic figure yesterday, above it today. Its test asserted
  "smaller than `ORBIT_RADIUS`" and now asserts the opposite. **The number was never a fact about
  the cast alone**, which is precisely why ADR-0021 refuses to clamp it in either direction: a
  floor would have hidden yesterday's case and a ceiling would hide today's.
- 🔴 **Two calibrated test thresholds rotted, and both were world distances.** The arm-geometry
  "breathes at the bodies" range fell from 0.46 to 0.387 against a flat `0.4`, with the property
  unchanged. Both are expressed against `DEFAULT_SCALE` now. **A test that hard-codes a world
  distance is a test pinned to a frame it does not name.**
- 🔴 **The chord-sag residual grew from 0.20% to 0.28%**, and square-one's ADR-0022 predicted
  exactly that: the sag scales with the **bowed radius**, and a tighter floor makes the clearance a
  larger fraction of the couple's width, so the bow is bigger. A bound moved; nothing was
  discovered.
- **Promotion condition:** if a cast ever turns up whose bodies cannot be accommodated *within* the
  figures — a pair needing more room than a call's own geometry can bow to, which square-one caps
  at one couple-width — the answer is a bigger `scale` passed by the consumer, deliberately and per
  square. Not a return to deriving it.
