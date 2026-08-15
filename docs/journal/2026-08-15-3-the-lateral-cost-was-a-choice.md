# 2026-08-15 (3) — the lateral cost was a choice

_Documents `c1b4450` (ADR-0019) and `e74db4f` (the build)._

Third pass today. Ryan watched the nudge and sent a screenshot of two characters standing
almost torso to torso:

> we need the body to twist — that reach is too limited — in a real life fist bump there is a
> turn towards a person sometimes — right now in game they have to be so close it's weird —
> also maybe the upper arm is restricted so it can't reach out?

## Answering the upper-arm question first, because it was testable

It is not the upper arm. Measured, for the default pairing:

| | upper | forearm | handReach | restX | rise | axialReach |
|---|---|---|---|---|---|---|
| player | 0.220 | 0.325 | **0.545** | 0.250 | 0.380 | **0.300** |
| NPC | 0.330 | 0.340 | **0.670** | 0.460 | 0.170 | **0.457** |

`handReach` is exactly `upper + forearm`, and `reachPose` straightens all the way at full
extension — the two-bone solve is not capping anything. What eats the arm is the two terms
`axialReach` subtracts: the **rise** to the contact height and the **lateral offset**.

Worth saying plainly because the instinct was reasonable — a rigid upper arm *sounds* like a
restriction, and I made it rigid only this morning. It just isn't where the reach went.

## Ryan's fix is the geometry, and it inverts a sign

Two characters facing each other bump with the arm on the *far* side from the hand it meets —
that is why a handshake works — so each spends reach crossing back over their own midline.
That is the `restX` term, and on the wider bodies it is 0.46, most of a forearm going sideways.

Turn a body `t` toward its partner and the engaged shoulder swings from `restX` **across** the
axis to `restX·cos t` across and `restX·sin t` **along** it. The lateral cost shrinks *and* the
shoulder starts closer. At a quarter turn the cost has become a pure bonus.

| | square on | 20° | 35° | 90° | old flat limit |
|---|---|---|---|---|---|
| max separation | 0.917 | 1.198 | **1.427** | 1.909 | 1.215 |

At 35° the pair bump from **further apart than the flat `handReach + handReach` limit that
preceded any of this**. That is the line that decided it: twisting is a fix, not a partial
walk-back of ADR-0017's honest measurement. I had been treating "the reach is short and that is
the true number" as the end of the argument. It was true and it was not the end — the model was
missing a degree of freedom, and a true number computed over too few degrees of freedom is
still the wrong answer.

## A budget, not a pose

`twistFor` returns the smallest twist that reaches, capped at the move's maximum, and **zero
when the pair can reach squarely**. Nobody turns sideways to bump fists with someone right in
front of them. So a close-up bump still reads square-on and the turn shows up only where the
distance asks for it.

The solve is the law of cosines rather than a search, which was a pleasant surprise: the
shoulder is on a circle of radius `restX` about the body centre, the hand has a fixed budget,
and the twist is the angle between them — `sin t = (d² − R² + restX²) / (2·d·restX)`. There is
a test asserting it is the exact inverse of `axialReach` to eight places.

## Derived, not plumbed

`twistOf(self, partner)` recovers the twist from a placement. `stanceHolds`,
`contactFraction` and `resolveConstraint` all call it rather than taking a parameter.

That started as a way to avoid threading an argument through four signatures and turned out to
be the better model. A pair angled toward each other genuinely reach further, and now they do
so **whether an approach turned them or the player simply stopped at an angle**. The reach
maths agrees with the bodies in both cases instead of only in the case somebody remembered to
pass it along. Same shape as the ADR-0017 rig split: prefer the version where the wrong thing
cannot be expressed over the version where it merely doesn't happen.

## A defect in yesterday's code, one day old

`offerReach` passed a **single** twist to a `maxSeparation` that had just become per-side, so
the second character was silently measured square-on and the offer radius came out 0.27 short.

Caught by the test that pins the offer radius to the staging arithmetic — the same
two-ends-of-one-promise check that caught the step-budget overshoot yesterday. That check has
now found two defects in two days, both of them mine, both in code that read correctly. Worth
naming as a pattern: **when two numbers are one promise seen from opposite ends, assert them
against each other rather than each against a constant.**

## What landed

- `axialReach(m, height, twist)` and `twistFor(m, height, d, max)` in `fist-bump.ts`; `twistOf`
  for reading it back off a placement. `maxSeparation` / `contactFraction` / `canBump` take a
  twist **per side**, since the two have different `restX` and different arms.
- `maxTwistDegrees` on `ContactMove`, default 35, with a slider in the editor.
- `applyTwist` inside `approachTarget`, turning each of them by what the staged separation asks
  for. Which way follows the engaged shoulder, through the same `sideFor`/`restSign` pair the
  pose uses, so the arm and the body cannot disagree about which side this is.
- `stanceHolds` judges reach at the twist the pair are actually standing at.

539 tests (from 526), lint 0 errors, typecheck and build clean.

## Still owed, and it is now the biggest term

🔴 **The rise.** The player spends **0.38 of a 0.545 arm** getting down to the contact height,
because `gripHeight` takes the mean of two elbows and the player's rig stands 0.25 higher than
an NPC's. That is step 3 of the dancer-size brief, untouched, and it is the next lever if the
twist is not enough. It is also the likeliest reason a bump reads as an arm *dangling toward*
rather than *reaching out* — which may be what the screenshot was really showing.

**Nothing here has been watched.** Fifth time of saying that about this subsystem.
