# ADR-0024: The dance hangs an arm outside its own body, whatever the editor says
- Status: Accepted
- Date: 2026-08-17
- Deciders: Ryan, Claude

## Context

A character's arms are placed by one layout slider, `forearmXOffset`, and the torso by another,
`body.radius`. Nothing relates them. `SHAPE_BOUNDS` lets the radius run to 1.00 while the arm
offset starts at 0.20, so the editor can build — and the debug scene's own `mixed` and `max`
casts do build — a dancer whose **shoulders are inside their own chest**.

That is invisible while a dancer stands alone, because nothing is drawn between shoulder and
elbow ([ADR-0017](0017-an-arm-is-two-segments-with-a-pinned-shoulder.md)) and the hand at rest
just disappears into the belly. It stops being invisible the moment two dancers hold hands: the
whole handhold solve measures from the shoulder, so a shoulder inside a chest means every
candidate hold starts inside the dancer, and no amount of clamping the *result* (ADR-0023) can
recover a comfortable pose from it. On `mixed` the beau came out at exactly 100% of his reach
with his hand pinned against his own surface.

The tempting fix is to constrain the editor. Ryan closed that off:

> I want to keep body composition as flexible as we have it — so sometimes heads will be bigger
> than torso or floating or sunken — sometimes arms will be set wide, even … so even the eyes
> might clip but that type of thing we don't need to build for — just bodies heads and shoulders

Which names both halves: the sliders stay free, and the three things the dance accommodates are
**bodies, heads and shoulders**.

## Decision

**`armMetrics` — the dance's reading of a body — hangs the arm at least clear of that body:
`restX` is the authored offset or the body's own lateral extent beside the arm plus the arm's
half-width, whichever is greater.** Widening only, so an arm already outside its body keeps
exactly the offset it was authored with.

The extent is measured over the **drawn forearm's** span, elbow to hand, and through the same
ADR-0012 rigid parts as everything else — so a sunken head that reaches down beside the arm
counts, and a head merely overhanging the shoulder does not. `headBodyGap` is negative on every
shipped body: heads are *supposed* to overlap the shoulders, and nobody holds their arms out to
clear their own jaw.

This is a **pose** rule, not a shape rule. The stored `CharacterBodyShape` is untouched, the
editor's sliders keep their full range, and the character preview still draws what the sliders
say.

## Alternatives considered

- **Clamp `forearmXOffset` in `SHAPE_BOUNDS`.** Directly against what Ryan asked for, and it
  would silently rewrite existing saved bodies.
- **Leave it, and let ADR-0023's clamp absorb it.** The clamp keeps the hands out of the
  bodies, which is the safety property, but it cannot make the pose good: the dancer reaches
  around a belly their arm is attached to the middle of.
- **Fix it in the renderer only.** Then the geometry the tests reason about and the geometry on
  screen disagree — which is this effort's most-repeated failure, three separate times in one
  week.

## Consequences

- **Every shipped body is unaffected**, asserted per cast: Myco, Ember, Ryan and Sprout all
  already hang their arms outside themselves, so the watched poses do not move.
- A wide body's dance pose now differs from its **character-preview** pose, which still draws
  the authored offset. Deliberate — the preview shows the body you built, the dance shows how
  that body has to stand — but it is a real inconsistency and the first place to look if
  someone reports "the arms move when I start dancing".
- Self-clipping is now explicitly **out of scope** as a class: an arm may pass through its own
  torso mid-move, a head may sink into a chest, eyes may clip. What must never happen is one
  dancer inside *another*. That line is Ryan's and it is the one worth holding, because the
  alternative is building collision for a caricature that is meant to be deformable.
- **Promotion condition:** if arms ever become a rigid part for pairwise clearance — today they
  are deliberately excluded, because dancers brush — this rule and that exclusion have to be
  decided together.
