# 2026-08-18 (6) — the Twirl was a Trade all along, and the arch is a hold nobody can draw yet

_Documents `9041d70`, which also carries [entry 7](2026-08-18-7-the-arch-nobody-can-reach.md) —
this round's change is a few lines inside code the next round rewrote, and splitting them after
the fact would have been an invented history. The engine change is in square-one (its
[ADR-0017](https://github.com/randallard/square-one/blob/main/docs/adr/0017-a-california-twirl-is-a-partner-trade-holding-on.md),
its `bd93203`); this side is small and mostly a decision **not** to draw something._

🔴 **Superseded within the day, and worth reading anyway.** The decision below — report the arch,
do not pose it, because the anatomy is Ryan's call — held for about an hour. Entry 7 has what
happened when I went to measure what the anatomy would need. What survives is the reasoning about
*why* not to draw it from the constants that were there; what does not is the conclusion that the
anatomy was the blocker.

Ryan, after watching both couple calls:

> partner trade looks good — california twirl beau might be same path but raise arm and have belle
> duck under the two held hands — belle's path might be the same as partner trade too — but she
> needs to start the turn to the left — ccw — and make it only a 180 degree turn — the way it's
> running now the belle is doing 540 degree turn cw

The engine work is all in square-one: the Twirl was a rigid rotation of the pair about their joined
hands with the belle taking a whole extra turn, and it is now the Partner Trade's two chains with a
`hold` on them. Same paths, waypoint for waypoint. **What is left over on this side is the arch, and
the honest answer today is that this module cannot pose one.**

## Why the arch is not a fallback away

`GripSpan.grip` gained a second style, `arch` — palms joined and raised clear of the head, high
enough to walk beneath. The obvious move is to route it into the machinery that already exists:
either `gripPose`, which lays two forearms into an arm turn, or `settleTouch`, which puts a couple's
palms on a solved contact plane.

Neither is a near miss.

`gripPose` would draw an **Allemande**: two horizontal antiparallel forearms, hands at each other's
elbows, pinned to the pair's pivot. That is a different hold entirely and it would be drawn with
full confidence.

`settleTouch` is closer and fails for a more interesting reason. It is built on
[ADR-0027](../adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md) — *the humerus of a
hanging arm stays in the plane of its own shoulder* — which is what lets `touchPose` cut the elbow's
circle down to two points and take the one further back, with no tuned constant anywhere in it. That
premise is exactly, deliberately false of an arch. **Nobody holds their hand over their partner's
head with a relaxed upper arm.** `touchPose` already knows it, in a way: it falls back to
`reachPose` when the shoulder's plane cannot hold the elbow, and a raised hand is precisely that
case — so an arch drawn today would be drawn by the *preference* constants (`ELBOW_SWING`,
`ELBOW_BACK`, "tuned by eye against the fist bump; a number to watch, not one derived from
anything") rather than by anatomy. Three hours after replacing those constants with a derivation is
the wrong moment to hand the new hold back to them.

So: **reported, not posed.** `TrackedArms` gains an `arch` field beside `grip` and `touch`, the
frame loop splits the engine's live spans by style, and the debug readout says
`arch declared by the call — raised handhold not drawn yet` rather than `hands free`, which is the
one wrong answer available. A California Twirl currently renders as the Partner Trade it is
geometrically identical to.

## The thing worth keeping

**Three kinds of hold, and the third one proves the field split was right.** This module already
distinguished an *owned* grip (eased, resolved against a partner's forearm) from a *touch* hold
(written outright at a solved point, outside arm untouched), and the comment on `TrackedArms.touch`
says they are separate "because the two are different kinds of hold". An arch is a third, and it
arrives as a third field rather than as a value of `grip` for the same reason. Had `touch` been
folded into `grip` back then, the cheap move today would have been to fold the arch in too and let
`gripPose` have it.

**And a hold with no anatomy is a better bug report than a hold with a guess.** The readout now
names the gap in the running scene, which is where this project's defects have actually been found
all week. The alternative — an arch posed from preference constants — would look approximately
right, which is the failure mode four of this week's five rounds have been about.

## What is owed

- **Decide the raised-arm anatomy.** Ryan's call, and it is the same shape of question ADR-0027
  answered for the hanging one: what breaks the tie on the elbow's circle when the hand is above the
  shoulder. That is one decision, and everything else follows from it.
- **Decide where the join sits.** A couple's hands meet between their inside shoulders. An arch that
  the belle *walks under* wants the join over her path, and in this figure the pair's midpoint bulges
  forward to a quarter of the couple's width at the pass while she passes through the centre — so
  the two are not the same point, and "she ducks under the joined hands" may or may not survive
  contact with the geometry. **Worth watching before solving.**
- **Then the height**, which is the only part that is straightforward: `bandedHeight` already clamps
  a target into what both arms can reach given what they have already spent sideways and forward,
  and `placeHold` already asks `sideExtentAt` for the corridor at the hold's own height — which at
  head height is the head. Point the same solve at a different target and most of it is done.
- **The clearance watch is still owed from yesterday**, and now covers both couple calls at once:
  they walk the same paths, so the Trade's pass separation *is* the Twirl's.
