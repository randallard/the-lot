# 2026-08-18 (3) — the free arm hung from the shoulder, so every one of them was an upper arm too high

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan, on the standing couple:

> verify that the other forearm is set by the character customization - they seem really high but
> maybe that's just the way it is

**It is not set by the character customization, and it is not just the way it is.** It was a bug,
and "really high" is exactly the right size of wrong: one whole undrawn upper arm, `elbowReach`,
0.330 on the shipped cast.

## The answer, measured

| default cast | shoulder | elbow the **body** says | free elbow **drawn** | free hand |
|---|---|---|---|---|
| beau (Myco) | 0.950 | 0.620 | **0.950** | 0.590 |
| belle (Ember) | 1.425 | 1.095 | **1.425** | 0.820 |

The free elbow was at the **shoulder**, every time, on every dancer. The tell that it is a bug and
not a look: the belle's free hand came out at 0.820 — *above* the couple's joined hands at 0.713.
A hand hanging by someone's side ended up higher than the hand they are holding with.

## Where it came from

One line in `proposeArms`, the expression layer's restatement of an emote's arms:

```ts
target.y = m.restY;   // the shoulder
```

An `ArmPose` names the **elbow** in rig space — that is ADR-0017, and `elbowLocal` subtracts the
shoulder to place the group. Writing `restY` into it says "the elbow is at the shoulder", i.e. a
**zero-length upper arm**, and the drawn forearm hangs from the shoulder itself.

`restPose` — the module's own statement of what a resting arm is — has always said
`out.y = m.elbowY`, correctly. It just never ran. `resolveExpression` builds a proposal
unconditionally, including for `NEUTRAL_POSE`, so `poseArms`' `restPose` fallback is unreachable
from a dance floor. **Two definitions of "a resting arm", one of them wrong, and the wrong one is
the one every dancer went through.**

The fix is the same three lines, done properly: the elbow is `elbowReach` down the swing from the
shoulder, so both ends of the arm follow the emote's rotation —

```ts
target.x = sign * m.restX + _swing.x * m.elbowReach;
target.y = m.restY        + _swing.y * m.elbowReach;
target.z =                  _swing.z * m.elbowReach;
```

At zero rotation that is `restPose`, exactly. Away from zero it is what ADR-0017 says an arm is:
the elbow travels on a sphere of radius `elbowReach` about a **pinned** shoulder and the forearm
aims on down the same line. Before, an emote pivoted the forearm about the shoulder point.

## Why nothing caught it

**599 tests and not one of them looked.** Two reasons, both worth keeping:

- **The contact readout prints `upper arm` only for a hand the engine has gripped.** A free arm's
  upper arm was 0.000 every frame of every watch, and the one instrument that would have said so
  was filtered to the other arm. The third time this week a pane's *filter* hid the defect rather
  than its arithmetic.
- **The arm tests all drive `poseArms` directly**, passing `proposed` explicitly or leaving it
  undefined — which is the path that reaches the *correct* `restPose`. Nothing tested the seam
  `resolveExpression` actually uses. The two new tests go through `resolveExpression`, which is
  where a dance arm really comes from.

## What this does *not* undo

The 2026-08-17 elbow watch used Ember's **free** arm as the control that proved her detached-
looking forearm was the cast's authored shape and not the handhold's doing. That control still
holds: it compared the *look* of the drawn forearm — the taper, the wrist gap, the floating hand —
which is the same whatever height the arm hangs at. The comparison arm had its own defect, in a
different axis, and the conclusion drawn from it was about neither.

## Watched live

`#dance=two-trades`, `go home`, default cast. Both free forearms now hang low at the dancers'
sides and read as arms at rest; the belle's free hand is plainly below the joined hands. Played
on with `wide arms` fired: the arms swing out and down from the shoulder with no forearm emerging
from the middle of a shoulder ball.

## State

**599 tests** (from 597), lint 0 errors and none in `src/dance/`, typecheck and build clean. No
ADR — this restores what ADR-0017 already decided rather than deciding anything. Blast radius is
`DanceFloor` alone: `resolveExpression` has exactly one caller, so the character preview and the
free-roaming player and NPCs are untouched.

⚠️ Still owed, and now for a second reason: **the elbow watch on the default cast.** ADR-0025
moved the joined hands and this moves both free arms.
