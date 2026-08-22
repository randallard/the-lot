# ADR-0043: A body grows from where it stands, and the rig carries the difference
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude
- Extends: [ADR-0017](0017-an-arm-is-two-segments-with-a-pinned-shoulder.md), [ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md)

## Context

`computePositions` builds a dancer as a capsule centred on `bodyCenterY`:

```ts
const bodyTop = bodyCenterY + body.height / 2 + body.radius;
```

So a height change of `d` moves the top up by `d/2` and the bottom **down** by `d/2`. Every
measurement in the dance is derived from that, and the arch algebra is written in terms of it — *a
body-height change of `d` moves the whole shoulder-and-head assembly by `d/2`*.

It is a body growing in both directions from its middle, which is not what growing looks like. A
dancer stands on something. Ryan, watching Sprout reshape:

> I really want the bottom to stay where it starts when the rest grows taller — same with all the
> characters, Ember's body when it shrinks should still start below the floor

The second half is the part that names the rule precisely. This is **not** "put everybody's feet on
the ground": the shipped cast sits at wildly different heights relative to the floor plane — Myco's
underside at 0.05, Sprout's at 0.25, Ember's at −0.425 — and that stays true. What must not happen
is a body changing size and *taking its own underside with it*.

## Decision

**A dancer wearing a body-height change stands on a rig lifted by half of it**, so the bottom of
the body holds still and the whole change goes upward.

```ts
standingLift(built, worn) = (worn.height/2 + worn.radius) - (built.height/2 + built.radius)
```

Applied as `ArmMetrics.rigOriginY` on the model side and as `rig.position.y` on the render side.

🔑 **Expressed as a rig origin rather than by re-centring the body.** `rigOriginY` already exists
for exactly this — *"the world Y of the character group these local coordinates are measured in"* —
and every height comparison in the dance already goes through it, with `localHeight` for the
inverse. The alternative, teaching `computePositions` to anchor at the feet, puts the offset in a
function that has no idea what the dancer's *resting* height was and would need the built shape
threaded into every caller.

🔑 **It takes the two shapes, not the delta.** `growBody` clamps to the shape editor's bounds, so
what a caller asked for and what a body took are different numbers whenever a slider runs out —
Ember at 1.41 asked for 0.735 takes 0.59. Lifting by half of the *request* would float a clipped
dancer off her own feet by 0.0725. The signature makes that unwritable, for the same reason
`bodyMeshScale`'s does.

**And a reshape now buys twice as much.** The grower's shoulder rises `d/2` inside the rig with the
rig rising `d/2` under it; the shrinker's crown falls the same twice over. A pair close a gap at
**`2d`** per unit of trade where they used to close it at `d`, so `planArch` asks for **half the
deficit**.

## Alternatives considered

- **Leave the model and lift only the mesh.** Half a fix that is worse than none: the head group
  and the shoulders follow *model* heights, so the drawn torso would slide against the arms hanging
  off it — the same detachment that started this, mirrored.
- **Anchor every dancer's feet at the floor plane.** Tempting, and it is a different decision
  wearing the same words. It would move the whole shipped cast on their first frame and throw away
  the authored variety in where a character sits. Ryan asked for the *bottom to stay where it
  starts*, which is per-character and per-moment.
- **Keep `d/2` and let the deficit stand.** The trade would simply overshoot, since the reshape
  already multiplies by `OVERSHOOT`. Rejected because it makes `OVERSHOOT` do two jobs — one of
  them silently correcting a factor of two — and the whole point of that constant's doc comment is
  that it is the *only* tuned number in the family.

## Consequences

- **Every reshape costs half the deformation it used to**, for the same accommodation. Myco with
  Ember trades 0.364 where it traded 0.729; Sprout with Ember settles symmetrically at 1.037/0.673
  where it used to be **pinned against both ends of the slider**. Fewer pairs run out of body.
- **No outcome changed.** The shipped cast still goes 11 dancing at their own width, 9 reaching,
  0 letting go, with identical arm deltas. What changed is how a body gets there.
- 🔴 **The bounds test needed a new subject**, which is the honest signal of the above: Sprout with
  Ember was the example of a reshape clipping at the editor's floor and no longer clips at all.
  Sprout with Myco does.
- **`wearing()` is exported** so tests measure a reshaped dancer the way the dance does. Every
  in-repo call that used bare `armMetrics(growBody(...))` was measuring a dancer standing in the
  wrong place; there were six.
- 🔴 **`bodyCenterY` is now half a story.** It is still where the capsule sits *inside* the rig, and
  the rig is no longer always at zero for a dancer. `ArmMetrics.rigOriginY`'s doc says dancers keep
  `0` and nothing about their geometry changes; that sentence is now true only of a dancer wearing
  no change. The conversion rules it describes are unaffected — this is the case they were written
  for — but the reassurance in it has expired.
- **Promotion condition:** the lift assumes the underside of the body is what rests on the world. A
  cast with legs, or a dancer whose lowest part is a hand, would want the anchor to come from the
  silhouette rather than from the body capsule.
