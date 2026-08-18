# ADR-0028: An arch a pair cannot make is accommodated two ways, drawn at random
- Status: Accepted
- Date: 2026-08-18
- Deciders: Ryan, Claude

## Context

square-one's California Twirl declares a raised handhold — `GripSpan.grip === "arch"`, its
ADR-0017 — and says only *palms joined, raised clear of the head, high enough to walk beneath*.
It has no bodies and cannot say how high that is. This repo has the bodies, so this repo answers
it.

**The answer, on the shipped cast, is that the arch is impossible.** Ember's crown is at 2.155.
Myco's shoulder is at 0.950 with a 0.690 arm, so with the arm dead vertical he reaches 1.640 —
half a unit short of the top of her head, before anyone has tried to *hold hands* while doing it.
Three of the six pairings in the repo cannot make an arch at all, including the default one.

That is not a defect. It is the fact `gripHeight` has carried a note about since the fist bump —
*"past a big enough height difference the real rule is that the taller dancer does nearly all the
accommodating"* — arriving somewhere it cannot be deferred, because an arch either clears a head
or it does not.

Ryan, shown the numbers:

> can we make the duck shrink the torso? actually I want two options that happen randomly each
> time a move like this is executed — sometimes the torsos grow/shrink each a little more than
> necessary to accommodate, and sometimes the arms just reach as far as they can and the hold
> breaks to accommodate

## Decision

**A pair that cannot make an arch accommodates it in one of two ways, drawn at even odds when the
move begins: they reshape, or they let go.**

- **`reshape`** — the beau's torso grows and the belle's shrinks, by the same amount each, and
  both dancers keep hold.
- **`break`** — nobody changes shape, both arms reach as far as they can toward the same target,
  and the hands come apart.

**Neither is the fallback.** They are two things dancers of mismatched size actually do, and the
draw is per **execution** — the same two dancers doing the same call twice should not do the same
thing twice.

Three things follow, and they are the substance:

**The torso is the only lever, and it is a good one.** `computePositions` builds a dancer as
`shoulderY = bodyCenterY + height/2 + radius`, with head, elbow and hand all hung off that. So a
body-height change of `d` moves the whole shoulder-and-head assembly by `d/2` and changes **no arm
length at all** — `handReach`, `elbowReach` and `forearmSpan` are differences of heights that
shift together. One slider, two effects, nobody's proportions distorted but the torso's.

**The reshape closes the beau's half of the gap and cannot touch the belle's.** Writing `d` for the
change, `+d` to the beau and `−d` to the belle:

```
ceilingBeau(d)  = shoulderBeau  + d/2 + reachUpBeau
ceilingBelle(d) = shoulderBelle − d/2 + reachUpBelle
wanted(d)       = crownBelle    − d/2 + headroom
```

The beau's constraint needs `d ≥ crownBelle + headroom − shoulderBeau − reachUpBeau`, and every
unit of `d` buys a full unit — half from his shoulder rising and half from her crown dropping.
**The belle's constraint has no `d` in it at all**: shrinking her lowers her crown and her shoulder
by the same amount. So there is a kind of arch no torso can fix — the one where a dancer cannot get
their own hand above their own head. Myco misses it by 0.009 and Sprout by 0.265, big heads on
short arms. When that happens the reshape does its half and the hold breaks by the remainder.

**"A little more than necessary" turned out to be mechanical.** Reshaping by *exactly* the deficit
lands both dancers at full stretch, and a straight arm is the degenerate case of `touchPose`'s
elbow solve: the circle of legal elbows shrinks to a point, the in-plane solution stops existing,
and the pose falls through to `reachPose`'s preference constants — the ones
[ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md) was written to stop relying on.
Measured: at overshoot 0 the beau's elbow leaves his shoulder's plane; at 0.05 it does not.
`ARCH_OVERSHOOT` is 0.15, and it is **the only tuned number in the module** — what it buys is that
nothing else is.

## Alternatives considered

- **Lower the arch to whatever the pair can reach and let the belle walk through it.** The cheapest
  thing, and it draws a dancer's head passing through her partner's arm. An arch that does not
  clear a head is not an arch.
- **Crouch instead of shrink** — take `bodyDeltaY` and lower the whole rig. Rejected on Ryan's
  question and then on the arithmetic: `bodyDeltaY` is an ADR-0010 **`free`** channel that the
  dance deliberately never touches, and lowering the rig lowers the belle's *shoulder* by as much
  as her crown, so it moves her constraint not at all. It looks like it should work and does
  nothing. The torso lever works because a capsule grows about its own centre.
- **Solve the arch per frame against the live separation.** A California Twirl closes the couple
  to half their width at the pass, so the plan would have the torsos breathing in and out through
  the figure. Planned once, at the separation the pair start from: a dancer decides how to handle
  a hold when they take it.
- **Make the choice a property of the pair, or of the cast.** Then two Twirls in a row are
  identical, which is the thing the randomness is for.
- **Let the engine choose.** square-one has no bodies and cannot know an arch is hard
  (its ADR-0002). It declares the hold; the consumer that knows how tall anybody is decides what
  it costs.

## Consequences

- **The reshape is large, and visibly so.** On the default cast the beau's torso goes 0.30 → 1.03
  and the belle's 1.41 → 0.68: they roughly swap stature for four beats. That is what the gap
  costs, stated rather than softened — 🔴 **and it is the first thing to judge on screen.** If it
  reads as too much, the dial is `ARCH_OVERSHOOT` and, past that, whether the arch must clear the
  crown at all.
- **A `TouchHold` with two heights is the whole of "the hold breaks".** An arch is the standing
  hold's machinery told to hold higher, so `poseArms` needed no branch for it — the one new thing
  is that the two dancers may be handed **different heights**, and hands not on the same plane are
  hands that have come apart. A number, not a special case.
- 🔴 **`touchingSide` had to stop asking the placements.** A Twirl's pair close to half their
  standing width and finish facing opposite ways, so `standingAsCouple` reads "not a couple" for
  most of a call whose hands never come apart. A `declared` flag skips the question for a hold the
  *figure* imposes. Which hand is still read from the placements, because that stays true through
  a turn.
- **`armMetrics` is now called per frame while a torso is changing size**, against this module's
  standing "a frame allocates nothing". Only during a reshape, and only because a grown shape is
  not one to half-measure — the arithmetic shortcut would miss that `restX` is re-derived from
  what is beside the arm at its new height. A break costs nothing.
- **The reshape does not go through the emote channel table.** It changes the dance's *base* shape
  before `mergeAnimation` runs, so an emote's own `bodyHeightDelta` still plays on top of it,
  `limited` exactly as [ADR-0010](0010-emote-choreography-channel-contract.md) says. Nothing in
  the contract moves.
- **The bounds are the shape editor's.** A dance may not put a dancer anywhere the character sheet
  could not, or the reshape becomes a second, invisible definition of what a body may be. Sprout
  and Ember together are the pair that hits both stops; they break by the remainder.
- 🔴 **The arch's *lateral* position is unresolved, and the render is what will settle it.** The
  join sits between the two inside shoulders, as a standing hold does. But the pair's midpoint
  bulges forward to a quarter of the couple's width at the pass while the belle passes through the
  couple's centre — so she may not actually pass *under* the joined hands at all. Left alone on
  purpose: it is a question about a picture.
