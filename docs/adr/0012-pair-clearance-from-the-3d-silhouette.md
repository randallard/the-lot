# ADR-0012: Pair clearance comes from the 3D rigid silhouette, not a flat disc
- Status: Accepted
- Date: 2026-07-26
- Deciders: Ryan, Claude

## Context

Supersedes [ADR-0011](0011-frame-scale-derives-from-occupant-bodies.md). Everything
ADR-0011 decided about *why* and *when* still holds — the frame scale derives from the
occupants' bodies, never below the default, an explicit `scale` prop overrides, the
`SCALE_MARGIN` (1.1) is the default's own margin, `SHAPE_BOUNDS` is never clamped. What
stopped holding, within hours of the first render, was its *measurement*: a per-dancer
radial disc (`footprintRadius`), pairs summed.

The disc failed in both directions at once:

- **Too loose.** It counted forward/back overhang as lateral: Ember's head (0.44 radius,
  0.28 *forward* offset) became a 0.72 disc, and the default cast ballooned to scale
  ~4.44. Ryan's verdict on the render: dancers "really far apart" on the Allemande, the
  back-to-back slide, and the pass — but dancers pass each other *side-on in lanes*, and
  a forward-jutting caricature head never narrows a lane gap.
- **Height-blind.** It demanded full radius sums for parts that never reach each other's
  height — a child's head passes under an adult's, and Myco's head (y≈1.04) barely
  interacts with Ember's (y≈1.72).

The disc's virtue was rotation-independence; its price was a square too sparse to ever
read as dancers brushing shoulders, which is the aesthetic and the tactile channel the
accessibility brief depends on.

## Decision

A dancer's clearance silhouette is their **rigid parts as vertical segments with
effective lateral radii** — body capsule (radius + sideways-lean reach) and head (radius
+ `|offsetX|`), forward/back overhangs excluded (`rigidParts` in
`services/body-shapes.ts`). A pair's needed side-by-side gap is the **height-aware
maximum over part pairs**: parts whose heights come within `r₁+r₂` need the chord
`√((r₁+r₂)² − dy²)`, others need nothing (`lateralClearance`). The frame scale is the
neediest pair's gap through the lane arithmetic (`scaleForGaps` in `dance/frame.ts`),
floored at the default and carrying `SCALE_MARGIN` — unchanged from ADR-0011.

## Alternatives considered

- **Keep the disc** — rejected by the render: the whole square reads as strangers
  keeping distance, and no arm can bridge the Allemande gap it produces.
- **Lateral-only extents without height awareness** — halfway; still demands 0.93 for
  the Myco/Ember head pair that geometrically needs 0.64. Height awareness is a dozen
  lines and is exactly what keeps child/adult squares intimate.
- **Full swept-volume collision over the choreography** — the honest end state, but it
  belongs with engine breathing (square-one Layer 2) and question 1 of the accessibility
  brief, not in a frame-scale heuristic.

## Consequences

- Default cast: scale ~2.60 (was 4.44 under the disc; 2.2 under the naive radius) —
  close enough to brush, no true clipping. Plain same-size dancers still get exactly the
  old body-diameter floor.
- **Forward overhangs are deliberately unprotected laterally.** Two dancers *facing*
  each other closer than their forward reaches could interpenetrate front-to-back; no
  current call's ideal path does this (facing distance is 1 engine unit ≥ any reach at
  these scales), but a future call with a tight head-on approach must re-check. That is
  the residual risk accepted for a square that looks like a square dance.
- Mobility-aid footprints (wheelchair: long, not wide) get a natural home — a
  per-direction extension of `RigidPart`, per the accessibility brief's question 2.
- **Promotion condition** (inherited from ADR-0011 and sharpened): when square-one
  implements breathing or learns footprints, the engine owns clearance and this becomes
  a floor it negotiates within — revisit via a new ADR then.
