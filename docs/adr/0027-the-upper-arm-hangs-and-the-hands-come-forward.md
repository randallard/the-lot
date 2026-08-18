# ADR-0027: The upper arm hangs, and the joined hands come forward
- Status: Accepted
- Date: 2026-08-18
- Deciders: Ryan, Claude

## Context

Supersedes [ADR-0025](0025-the-joined-hands-hang-between-the-shoulders.md), because that ADR
carried forward a **promotion condition** and this is the change that fires it:

> the corridor is measured side-to-side only, because that is the axis a square's spacing lives
> on. If joined hands ever move *forward* of the bodies — ADR-0022's own deferred alternative,
> which is where real hands sit — the clearance question becomes 3D and this decision needs
> revisiting rather than extending.

Ryan:

> one more adjustment - they should be held a little forward from where they are, as if the upper
> arm is relaxed and hanging straight down

The hold had no forward axis at all. Its `z` was **zero** — the plane through both dancers'
centres — and `touchPose` reached it by swinging each elbow **backward** out of that plane
(ADR-0022's `ELBOW_BACK`, which exists because an elbow that folds *outward* reads as an arm
pointing at the partner). So the upper arm was never relaxed: it was rotated back behind the body
in order to put a hand somewhere no real hand goes.

Ryan's sentence contains the derivation, not just the target. A relaxed upper arm puts the elbow
**directly below its own shoulder**, with no freedom left in it. From there the forearm is a fixed
length reaching a hand already committed to a lateral offset (`across`, ADR-0025's shoulder
midpoint) and a height (the belle's waist plus this dancer's own palm, ADR-0026). One axis is left
over, and the leftover length goes into it.

## Decision

**The upper arm hangs. `TouchHold` gains a fourth number, `forward`, and it is not a preference —
it is what is left of the forearm once the relaxed elbow, the across and the height are all
paid for.**

For one dancer, with the elbow hanging at `elbowY`:

```ts
forward² = forearmSpan² − across² − (handY − elbowY)²
```

Zero where that is negative, which is the honest answer rather than a special case: a dancer
already at full stretch across and down cannot also hold their hands out in front.

The two dancers get different answers, so **the hold takes the shorter of them.** The
longer-reaching dancer's elbow then folds back to take up the slack, which is what an elbow is
for; the shorter-reaching one is exactly relaxed. Going any further forward would over-extend
somebody, and no opinion about posture can buy arm length. Same shape as the height's own band:
whichever demand binds, binds.

**The existing elbow rule needed no change, which is the check that the reading is right.**
`touchPose` already picks the further-back of the two elbow solutions in the shoulder's own plane;
at the exactly-relaxed hand position that solution *is* the vertical one, to 1e-16. The rule that
was invented to stop an elbow pointing outward turns out to produce a hanging upper arm the moment
the hand is put where a hand goes.

**Unchanged, and restated because this supersedes ADR-0025:**

- **The height is the belle's waist**, clamped only where an arm cannot reach it.
- **The lateral is halfway between the two inside shoulders** — a landmark, not a preference about
  whose arm works.
- **Stance floor** is ADR-0012's `lateralClearance` + `PERSONAL_SPACE`, **and at least a corridor**
  wide enough for the hands at the hold's height.
- **The hold is clamped into that corridor**, and the clamp outranks the landmark.
- **A hand is the ellipsoid that is drawn** ([ADR-0026](0026-a-hand-is-the-ellipsoid-that-is-drawn.md)):
  each dancer puts their own drawn palm on the contact plane.
- **The band is solved as a bounded fixed point**, now over four coupled quantities — height,
  across, palm lift and forward — because a reach is a sphere and every axis spends the same arm.

**And the promotion condition is resolved rather than deferred.** The corridor is still measured
side-to-side at `z` 0, and that is **provably conservative** now the hands are in front: a body's
rigid parts are capsules, so the lateral half-width at a forward offset `z` is
`sqrt(max(0, r² − z²))` — strictly *narrower* than at `z` 0. A hold that clears both bodies in
their own plane therefore clears them in front of it, with room to spare. No 3D corridor is needed;
the 2D one is a valid upper bound on what the hands must clear.

## Alternatives considered

- **A tuned forward offset** — "a little" as a number. Rejected on the same grounds as every other
  constant this solve has deleted: Ryan gave a *mechanism*, and the mechanism has an answer.
- **The mean of the two dancers' relaxed answers**, so neither is exactly relaxed and neither
  folds much. Symmetric and defensible, but it over-extends the shorter reach — the pair would
  stand with one arm past its own length, which `touchReach` would report and nothing would fix.
- **Relax the *height* too**, letting the hold drop toward the beau's own waist so his forearm
  hangs as well as his upper arm. Directly against the standing opinion Ryan restated in the same
  breath one message earlier (*"vertical level should be at the belle's waist"*), and it is her
  body that sets the height by decision, not by geometry.
- **Keep the elbow swung back and simply add a forward offset.** That is the shape of the change
  Ryan's words could be read as asking for, and it produces hands in front of a body whose upper
  arm is still rotated behind it — the pose he was describing the *cure* for.

## Consequences

- **Stance, height, lateral and every clearance are unchanged on all three casts.** default
  1.140 / 0.713 / 0.050, `mixed` 1.070 / 0.670 / 0.175, `max` 1.640 / 0.903 / 0.005. Only the
  forward axis is new.
- **`forward` is 0.320 on the default cast**, with the beau's upper arm dead vertical (0.00° off,
  elbow at his shoulder's own x *and* z) and the belle's folded 25.8° back. On `max` it is 0.306
  with the roles reversed — the belle binds and the beau folds 5°.
- 🔴 **0.320 is about one torso radius (0.30), so the joined hands sit essentially at the front
  surface of the beau's belly, and his forearm comes out 3° above horizontal.** That is what the
  mechanism yields, and it is worth stating plainly because it is more than "a little": the hold
  height is *her* waist, which on this pairing sits almost exactly at *his* hanging elbow, so
  nearly all of his spare forearm has nowhere to go but forward. If the pose reads as thrust out,
  the honest dial is not a fudge factor on `forward` — it is the decision about whose waist sets
  the height.
- **`mixed` gets `forward` 0.000**, because the beau there is already at 100% of his reach for the
  reason ADR-0023 recorded (a torso wider than an arm is long). Honest degradation: no spare arm,
  no hands in front.
- **Both reaches rise**, since the arms now spend length on a third axis: the beau 50% → 67% and
  the belle 71% → 79% on the default cast. Still nobody over 100%, asserted over the whole cast
  both ways round.
- **The debug panel prints `forward`**, and its note now says the `clear` figures are the
  conservative `z` 0 reading.
- **Promotion condition:** `relaxedForward` assumes the elbow hangs in the shoulder's own
  **x**-plane, which is what `touchPose` guarantees today. A move that deliberately lifts an elbow
  sideways — a star through, an arm turn with a raised hand — has no relaxed forward and this
  derivation does not apply to it.
