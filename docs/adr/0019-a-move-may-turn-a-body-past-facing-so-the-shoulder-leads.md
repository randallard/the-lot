# ADR-0019: A move may turn a body past facing, so the working shoulder leads
- Status: Accepted
- Date: 2026-08-15
- Deciders: Ryan, Claude

## Context

ADR-0018 gave the fist bump an approach, so the pair no longer have to line themselves up.
Ryan watched it and the gesture still read wrong — the two ended up almost torso to torso:

> we need the body to twist — that reach is too limited — in a real life fist bump there is
> a turn towards a person sometimes — right now in game they have to be so close it's weird

He also asked whether the upper arm was the constraint. **It is not, and measuring said so.**
For the default player↔NPC pairing:

| | upper | forearm | handReach | restX | rise to contact | axialReach |
|---|---|---|---|---|---|---|
| player | 0.220 | 0.325 | 0.545 | 0.250 | 0.380 | **0.300** |
| NPC | 0.330 | 0.340 | 0.670 | 0.460 | 0.170 | **0.457** |

`handReach` is exactly `upper + forearm`, and `reachPose` uses all of it — the two-bone solve
straightens completely at full extension. Nothing caps the arm. What eats it is the two terms
`axialReach` subtracts: the **rise** to the contact height, and the **lateral offset**.

The lateral one is the interesting half, because it is the one that can be turned around. Two
characters facing each other bump with the arm on the *far* side from the hand it meets — that
is why a handshake works — so each spends reach crossing back over their own midline. `restX`
runs to 0.46 on the wider bodies, which is most of a forearm spent going sideways.

**Ryan's observation is the geometry.** Turn a body `t` toward its partner and the engaged
shoulder swings from `restX` *across* the axis to `restX·cos t` across and `restX·sin t`
**along** it. The lateral term shrinks and the shoulder starts closer. At a quarter turn the
cost has become a pure bonus.

| | square on | 20° | 35° | 90° | old flat limit |
|---|---|---|---|---|---|
| max separation | 0.917 | 1.198 | **1.427** | 1.909 | 1.215 |

At 35° the pair can bump from *further apart than the flat `handReach + handReach` limit that
preceded any of this* — so twisting is a fix rather than a partial walk-back of ADR-0017's
honest measurement.

## Decision

A contact move carries **`maxTwistDegrees`** — how far it may turn a body **past** squarely
facing its partner, so the engaged shoulder leads. Default 35°.

**It is a budget, not a pose.** `twistFor` returns the smallest twist that brings the contact
within reach, capped at the move's maximum, and **zero when the pair can reach squarely**.
Nobody turns sideways to bump fists with someone standing right in front of them, so a close-up
bump still reads square-on and the turn appears only where the distance asks for it. The solve
is the law of cosines rather than a search: `sin t = (d² − R² + restX²) / (2·d·restX)`.

**Which way each turns follows the engaged shoulder**, through the same `sideFor` / `restSign`
pair the pose itself uses — so the arm and the body cannot disagree about which side this is. A
right-handed bump turns both of them one way; a left-handed one the other.

**Twist is read off placements, never plumbed.** `twistOf(self, partner)` recovers it from a
yaw and a bearing, and `stanceHolds`, `contactFraction` and `resolveConstraint` all call it.
That means a pair angled toward each other genuinely reach further **whether an approach turned
them or the player simply stopped at an angle** — the reach maths agrees with the bodies in
both cases, rather than only in the case somebody remembered to pass a parameter.

Reach is measured per side, at each character's own twist: they have different `restX` and
different arms, so they do not turn by the same amount.

## Alternatives considered

**Let the upper arm stretch.** It is undrawn, so extending it is invisible, and `gripPose`
already treats it as compliant. Rejected as the *primary* lever: it buys reach by making a body
dimension elastic, which is exactly the "value that happens to come out right" ADR-0017 spent a
rig change to eliminate. Turning is what a person actually does, and it costs nothing in
honesty. The stretch stays available as the authored out-of-range behaviour it already is.

**Raise `APPROACH_STEP` instead.** Closes the gap by walking further rather than reaching
further. It does not help — the pair were *already* being staged at 80% of a reach that was too
short, so a bigger step just walks them into the same too-close stance faster.

**Loosen `axialReach` with a fudge factor.** The version of this that gives up. The number was
right; the model was missing a degree of freedom.

**Make the twist a constant rather than authored.** Simpler, and wrong for the same reason the
rest of ADR-0016 is authored: a fist bump turns in, a formal handshake squares up, a shoulder
barge is nearly side-on. The manner is part of the move.

## Consequences

- **The default pair can now bump from 1.43 apart rather than 0.917**, and the approach stages
  them at 80% of that — so the staged separation goes from about 0.73 to about 1.14, against
  combined body radii of 0.45. That is the "so close it's weird" complaint, answered.
- **The offer radius goes to about 2.64**, since `offerReach` measures from the twisted staging
  distance plus the step budget.
- **A twisted pair are no longer square to each other**, which is new on screen and is the main
  thing to watch. 35° is chosen by arithmetic, not by eye. Too much and they read as standing
  side-on; the slider is in the editor.
- **A defect this caught in ADR-0018's code, one day old:** `offerReach` passed a single twist
  to a `maxSeparation` that had just become per-side, so the second character was silently
  measured square-on. Found by the test that pins the offer radius to the staging arithmetic —
  the two-ends-of-one-promise check that also caught the step-budget overshoot yesterday.
- 🔴 **The rise is now the biggest single term and it is still a placeholder.** The player
  spends **0.38 of a 0.545 arm** getting down to the contact height, because `gripHeight` takes
  the mean of two elbows and the player's rig stands 0.25 higher than an NPC's. That is step 3
  of the dancer-size brief, untouched here, and it is the next lever if the twist is not enough.
  It is also the likeliest reason a bump reads as an arm *dangling toward* rather than
  *reaching out*.
- **Nothing about the pose maths changed.** `reachPose` works in rig-local space and the twist
  is rig yaw, so the fists still meet — asserted rather than assumed, because "should be
  untouched" is how three of this subsystem's defects got in.
- **Promotion condition.** The twist turns the *whole body*, because these characters have no
  hips-versus-shoulders separation. If a move ever needs a character to face one way and reach
  another — watching a caller while shaking hands with a neighbour, which square dancing will
  want — that is a real torso joint in the rig and a new ADR, not a larger number here.
