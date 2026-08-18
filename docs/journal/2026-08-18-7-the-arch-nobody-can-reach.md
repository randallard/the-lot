# 2026-08-18 (7) — the arch nobody can reach, and the two ways out of it

_Documents `9041d70`. Landed 2026-08-18 after Ryan watched it: "looks pretty good."_

_Follows [entry 6](2026-08-18-6-the-twirl-was-a-trade-and-the-arch-is-a-hold.md), which declared
the arch and deliberately did not draw it, and which landed in the same commit._

Entry 6 ended by saying the raised-arm anatomy was Ryan's call and the next round. I went to
measure what the arch would actually need, and the anatomy turned out not to be the problem.

## The arch is impossible on the cast that is on screen

Ember's crown is at **2.155**. Myco's shoulder is at 0.950 with a 0.690 arm, so with his arm dead
vertical he reaches **1.640** — half a unit below the top of her head, before anyone has tried to
hold hands while doing it. Three of the six pairings in the repo cannot make an arch at all,
including the default one.

Two things about how that got found are worth keeping.

**The first version of the measurement was wrong, and wrong in the flattering direction.** I took
the top of a dancer as `max(part.y1)` over their rigid parts, which is how `sideExtentAt` reads
them — and `rigidParts` writes a head as a **zero-length segment at its centre** carrying a radius,
because that is what lets a sphere narrow toward its poles. So `max(y1)` is the middle of somebody's
head. On Ember that is 0.44 low: enough to walk a crown straight through the arch while every
number said it cleared. `crownOf` now adds the radius, and it has its own test.

**The interesting number is not the deficit, it is which constraint it belongs to.** Writing `d`
for a body-height change, `+d` to the beau and `−d` to the belle:

```
ceilingBeau(d)  = shoulderBeau  + d/2 + reachUpBeau
ceilingBelle(d) = shoulderBelle − d/2 + reachUpBelle
wanted(d)       = crownBelle    − d/2 + headroom
```

The beau's constraint moves a full unit per unit of `d`. **The belle's has no `d` in it at all** —
shrinking her lowers her crown and her shoulder by exactly the same amount. So there is a kind of
arch no torso can fix: the one where a dancer cannot get their own hand above their own head.

That is also the answer to a thing I had been about to build. Ryan's first instinct in entry 6's
owed list was a **crouch** — drop the rig with `bodyDeltaY`. It has the identical algebra: a crouch
lowers the belle's shoulder by as much as her crown and buys nothing. It looks like it should work
and does nothing, and only writing the three lines above shows why. **The torso lever works for a
reason a crouch does not: a capsule grows about its own centre, so it moves the assembly relative
to the floor rather than moving the whole dancer.**

## Ryan's two options

> can we make the duck shrink the torso? actually I want two options that happen randomly each
> time a move like this is executed — sometimes the torsos grow/shrink each a little more than
> necessary to accommodate, and sometimes the arms just reach as far as they can and the hold
> breaks to accommodate

[ADR-0028](../adr/0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md). Drawn at even odds
when the span begins, held for the call.

**🔑 "A little more than necessary" is mechanical, and I did not expect it to be.** Reshaping by
*exactly* the deficit lands both dancers at full stretch — and a straight arm is the degenerate
case of `touchPose`'s elbow solve. The circle of legal elbows shrinks to a point, the in-plane
solution stops existing, and the pose falls through to `reachPose`'s preference constants: the ones
ADR-0027 was written three hours earlier to stop relying on. Measured on the default cast, the beau's
elbow leaves his shoulder's plane at overshoot 0 and stays in it at 0.05. **Fourth time in two days
that Ryan's phrasing carried a derivation rather than a target**, and the first time the derivation
was about a numerical boundary rather than about anatomy.

**🔑 The break needed no mechanism.** An arch is a `TouchHold` with a different height — higher,
not carried forward, between the same two shoulders — so `poseArms` needed no branch for it at all.
The one new thing is that the two dancers may be handed **different heights**, and hands that are
not on the same plane are hands that have come apart. "The hold breaks" is a number.

The picture it produces is worth stating so it can be recognised: the tall belle holds her hand up
over her own head, the short beau cannot follow, and she turns under her own hand. That is a real
thing mismatched dancers do, which is why it is one of the two options rather than the error case.

## And a shipped defect fell out of it

To reshape a torso the shoulders have to come with it, and **they never have**.
`shoulderY = bodyCenterY + height/2 + radius`, `bodyHeightDelta` is a `limited` channel any emote
may move, and when it moved the body mesh scaled, the head group followed `ex.headY`, and the arms
stayed exactly where the mount-time shape had put them.
[ADR-0029](../adr/0029-a-shoulder-follows-the-torso-it-hangs-from.md).

**ADR-0017's rule survives, and reading it carefully is what allowed the fix.** The comment in
`Dancer.tsx` said *"pinned to the body with no ref on it, so nothing can move it … making the
shoulder unreachable is what stops that being expressible"*, which reads like a prohibition on the
shoulder moving. The **decision** was that no driver may *choose* where a shoulder is — against a
one-group arm whose origin went wherever the contact arithmetic needed it. A derivation from the
resolved shape is not a choice, and the head group next door has been doing exactly that all along.

🔑 **Second time in this subsystem that something was right in every number and wrong in the
render**, and the second time looking is what found it. The first was the body mesh seated at the
rig origin. Every measurement that *reasons* about a dancer reads `computePositions` and was right
the whole time — which is precisely why no test caught either one.

## What is owed

- 🔴 **Watch it.** The reshape is big: on the default cast the beau's torso goes 0.30 → 1.03 and
  the belle's 1.41 → 0.68, roughly swapping stature for four beats. That is what the gap costs,
  and whether it is charming or ridiculous is not a thing anyone can compute. The dial is
  `ARCH_OVERSHOOT`, and past that, whether the arch has to clear the crown at all.
- 🔴 **Where the join sits is still unresolved**, and it is a question about a picture. The arch
  sits between the two inside shoulders like a standing hold, but the pair's midpoint bulges
  forward to a quarter of the couple's width at the pass while the belle passes through the
  couple's centre — so she may not pass *under* the joined hands at all. Left alone on purpose.
- **The elbow watch and the clearance watch**, both still owed from 2026-08-17, and the clearance
  one now covers both couple calls at once because they walk the same paths.
- 🔴 **The shoulder's lateral position is still mount-time, and still `forearmX` rather than
  `restX`.** They coincide on every shipped cast. Recorded in ADR-0029's consequences rather than
  fixed blind.
