# ADR-0029: A shoulder follows the torso it hangs from
- Status: Accepted
- Date: 2026-08-18
- Deciders: Ryan, Claude

## Context

[ADR-0017](0017-an-arm-is-two-segments-with-a-pinned-shoulder.md) split a dancer's arm into two
groups: an outer **shoulder** group pinned to the body, and an inner **elbow** group that is the
only thing a driver is handed. `Dancer.tsx` said so in as many words:

> the outer one is the **shoulder** and is pinned to the body with no ref on it, so nothing can
> move it … Making the shoulder unreachable is what stops that being expressible.

That was the right decision and it was implemented one step too literally. The shoulder group was
positioned once, from the shape the component was mounted with, and then never again.

**A dancer's shoulder height is not a constant.** `computePositions` gives
`shoulderY = bodyCenterY + body.height / 2 + body.radius`, and `bodyHeightDelta` is an
[ADR-0010](0010-emote-choreography-channel-contract.md) `limited` channel that any emote may
move. When it moved, three things happened and only two of them were drawn: the body mesh scaled,
the head group followed `ex.headY` — and the arms stayed exactly where the mount-time shape had
put them, hanging in the air beside a torso that was no longer there.

**Nothing caught it because nothing had reason to look.** Every measurement that *reasons* about a
dancer reads `computePositions` and was right the whole time; only the picture was wrong, and only
for a shape nobody had animated. It surfaced because
[ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md) changes a torso on
purpose — a reshape that raised a shoulder in the arithmetic and not on screen would have posed
every arm to a shoulder that was not there.

This is the second time in this subsystem that a thing was right in every number and wrong in the
render (the first: the body mesh seated at the rig origin, half a unit below everything derived
from `NPC_BODY_CENTER_Y`), and the second time looking is what found it.

## Decision

**The shoulder group's height is derived from the resolved shape, every frame, exactly as the head
group's already is.** `ResolvedExpression` gains `shoulderY` beside `headY`, both taken from the
same `computePositions` call, and the driver writes it onto shoulder groups that now carry refs.

**ADR-0017's rule is unchanged, because it was never "the shoulder does not move".** It was **"no
driver may choose where a shoulder is"** — the defect it was written against was a one-group arm
whose origin went wherever the contact arithmetic needed it, measured 0.34 behind the body at bump
range. Writing a *derivation* onto the shoulder is not choosing. A driver writing anything else
there is writing a number it has no way to have computed, and that is as true now as it was with
no ref at all.

The refs go on `DancerExpressionRigs` rather than `DancerArmRigs`, which is where the distinction
lives in the type: `arms` is what a *pose* is written to, `expression` is what a *shape* is
written to, and a shoulder's height is shape.

## Alternatives considered

- **Leave it, and have the arch reshape only the belle.** Halves the accommodation and does not
  avoid the problem: her shoulder detaches instead of his, and her hand is the one being posed to
  a shoulder that has moved in the arithmetic.
- **Scale the whole rig group instead of the body mesh.** Scales the head, the arms and the hands
  with it, which is a different effect — a dancer getting bigger rather than a torso getting
  longer — and it would break every world measurement taken from the rig.
- **Recompute the whole `Dancer` subtree from the resolved shape each frame.** Correct and much
  more than is needed: only the height moves, and React reconciliation per frame is what the ref
  channels exist to avoid (ADR-0002).
- **Expose the shoulder on `DancerArmRigs` next to the elbow.** Puts a shape channel in the pose
  channel's type, which is exactly the confusion ADR-0017 split the two groups to prevent.

## Consequences

- **Every emote with a `bodyHeightDelta` now draws arms attached to its torso.** A latent defect
  in a shipped channel, fixed as a side effect of needing it — and pinned by a test that asserts
  a grown body moves its shoulders and its head by the same `d/2`, since they are one rigid
  assembly and were being drawn as two.
- **The arm read-back reads the shoulder's live height** rather than the mount-time metrics, so
  the debug report stays "what is on screen" rather than what would have been on screen if nobody
  had grown. That was the whole point of reading back off the rigs.
- 🔴 **The shoulder's *lateral* position is still the mount-time one, and it is still `forearmX`
  rather than `restX`.** `armMetrics` widens a shoulder that would otherwise sit inside its own
  chest (`restX = max(forearmXOffset, bodyBeside + armHalfWidth)`), and the rig pins at the raw
  slider. They coincide on every shipped cast, which is why this has never shown. Left alone: it
  is a real disagreement, it is not this decision's, and fixing it blind would move arms on a cast
  nobody has looked at.
- **One more thing the resolver owns.** `ResolvedExpression` is the list of what a driven dancer is
  allowed to be, and it is now two derived heights rather than one. Anything else hung off a body's
  height belongs in the same call.
