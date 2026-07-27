# ADR-0011: The dance frame's scale derives from the occupants' bodies
- Status: Superseded by [ADR-0012](0012-pair-clearance-from-the-3d-silhouette.md)
- Date: 2026-07-26
- Deciders: Ryan, Claude

## Context

square-one models dancers as points; bodies exist only in townage. The body editor's
`SHAPE_BOUNDS` allows `body.radius` from 0.10 to 0.60, and Ryan's stated goal is that the
**whole range is playable** — representation from small child to super large adult, per the
planning effort's [dancer-size and accessibility brief](../../../work/square-dance-planning/briefs/dancer-size-and-accessibility.md).

At the fixed `DEFAULT_SCALE = 2.2`, passing dancers get a `0.66` world-unit lane gap.
Clearance is a **pair** property — two dancers clear each other only while
`scale × 0.30 ≥ r₁ + r₂` — so a single 0.60-radius dancer in an otherwise-default square
already intersects on a Pass Thru (needs scale 3.0), and two of them need 4.0. The engine
cannot see any of this: its collision property tests work in engine units where dancers are
coordinates.

What makes this non-obvious: the tempting fixes are to clamp `SHAPE_BOUNDS` down (trades the
representation goal for a constant) or to raise the constant (hides the defect for the default
body and still breaks at the top of the range). The brief rules out both.

## Decision

`DanceFloor` derives its frame scale from the bodies actually in the square:
`scaleForBodies(radii)` = the default scale, or — when the two widest occupants need more
room than the default gives — their pair floor `minScaleForPair` times the same `SCALE_MARGIN`
(1.1) the default carries over its own floor. Never below the default; an explicit `scale`
prop remains an override and may let bodies intersect.

This is **whole-square breathing done coarsely at the transform layer**: the square simply
dances bigger when bigger dancers join it, and no combination the body editor can produce
intersects.

## Alternatives considered

- **Clamp `SHAPE_BOUNDS`** — rejected by the brief: limits must exist to keep the dance
  working, not to keep the cast narrow.
- **Engine-side footprints and real breathing now** (brief question 1) — the eventual
  refinement, but it is an open cross-repo design question and an ADR-0004/0007-seam change
  in square-one. This decision deliberately does not answer it.
- **Per-call or per-pair local scaling in townage** — townage second-guessing choreography
  geometry per move is the engine's job wearing a costume; that logic belongs in square-one's
  breathing (call model Layer 2) when it lands.

## Consequences

- The full editor range works today, with the same clearance margin at every size. Tested in
  `frame.test.ts`, including the brief's hard case (one large adult among small children).
- **Loose for mixed squares by design**: one large dancer sets the spacing for everyone, even
  in moves not involving them. Engine breathing will tighten this later without changing the
  contract — this bound is never wrong, just generous.
- A worst-case square (all 0.60) dances at scale ~4.4, roughly **twice the linear footprint**
  of the default square. Dance-floor level design and camera framing must fit that.
- The frame is built once per `DanceFloor` mount, so the scale reflects the cast at mount; a
  cast change means a remount (the debug scene keys on it).
- **Promotion condition:** when square-one implements breathing (call model Layer 2) or the
  brief's question 1 gives the engine footprints, revisit via a new ADR — the derived scale
  may become a floor the engine negotiates within rather than the whole mechanism.
