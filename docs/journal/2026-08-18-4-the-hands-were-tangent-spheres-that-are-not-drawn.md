# 2026-08-18 (4) — the hands were tangent spheres, and the spheres are not what is drawn

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan, on the pose ADR-0025 had just moved:

> looks better - the hands could still be closer to actually touching

[ADR-0026](../adr/0026-a-hand-is-the-ellipsoid-that-is-drawn.md).

## They were touching. That was the problem.

Measured before changing anything, because "closer to actually touching" could have been a look
preference and was not:

```
beau  hand centre y 0.6025   belle hand centre y 0.7825
centres 0.1800 apart = handRadius 0.110 + handRadius 0.070   -> exactly tangent
```

A test asserted that exact sum and passed. So the model was self-consistent and the picture still
had a gap — which meant the model was of the wrong object.

`ArmMetrics.handRadius` is `shape.hand[pose].radius`: the radius of the sphere a hand is *made
from*. `Dancer` then puts that sphere in a mesh with `scale=[1,1,flattenZ]` and
`rotation=handRotations(pose)[side]`. **Myco's open hand is 0.110 across and 0.025 thick.** How far
it reaches from its own centre is a question with an answer per direction, and `handRadius` is the
answer for exactly one of them.

The direction that matters here is the worst one available:

| | sphere radius | flattenZ | mesh rotation | forearm aim | drawn rise |
|---|---|---|---|---|---|
| beau (Myco) | 0.110 | 0.23 | [0,0,0] | (−0.44, −0.46, **0.77**) | **0.0732** |
| belle (Ember) | 0.070 | 0.15 | [−23,45,−14] | (0.26, −0.83, 0.49) | **0.0653** |

The beau's forearm aims **77% forward** — the elbow swings back (ADR-0017's `ELBOW_BACK`) and the
hand comes forward to the hold — which turns his hand's thin axis most of the way to vertical. So
the drawn surfaces spanned 0.1385 of the 0.1800 the centres were placed apart. **Gap 0.0415**,
and every test was asking the same wrong question, so 599 of them agreed with each other.

## The fix, and the one line in it worth reading

`body-shapes` now exports `handDrawnMap(pose, side)` — the hand as a linear map from the unit
sphere, composed the way three composes a local matrix. It lives beside `handRotations` on purpose:
that is where the renderer's own numbers are, so there is one statement of how a hand is built and
`arm-pose` gets a matrix instead of a second opinion. `arm-pose` stays free of three, which it has
always been and should stay.

`arm-pose` asks it `handRiseAlongUp(m, side, aim)`. The whole frame change is:

```ts
const dx = aimX, dy = -aimY, dz = aimZ;
```

The forearm group's rotation is the **minimal** one taking `DOWN` to `aim`, and running world up
back through its inverse cancels every trig term — the aim with its y flipped, no branches, no
degenerate case. Check it on the easy ones: `aim = DOWN` gives back up, and an arm aimed forward
gives `+z`, the group's own forward. Then the half-extent of `M·(unit sphere)` along a unit `d` is
`|Mᵀd|`, which is `d` dotted through `M`'s columns.

**`palmOffset` is that rise now.** Which buys a property worth naming: each dancer puts their own
drawn palm *on* `hold.height` — his top surface, her bottom surface — so the two hands meet there
and **neither needs to know the other's hand at all.** The stack is not solved for the pair; it is
two independent local facts that happen to agree, which is the sturdiest kind of agreement.

## And a third fixed point, for the third time this week

The lift and the aim are each other's inputs: where the hand goes decides which way the forearm
points, and which way it points decides how much hand is between its centre and the plane. So
`settleTouch` iterates — seeded with a hanging arm, converging at about a factor of ten a pass.

That is worth a note, because the first attempt capped it at six passes and the tests failed at
**3.4e-8** — not wrong, just not finished. Sixteen passes is machine precision and costs a handful
of multiply-adds. `touchHold`'s own fixed point gained the lifts alongside the height; `poseArms`
re-settles against the **live** placements rather than taking the hold's lift, because the pair
breathe (square-one's Partner Trade bows them off their radius) and a lift frozen at the standing
stance would let the hands drift apart mid-move.

## What moved and what did not

| cast | stance | height | lateral | centres | drawn gap | reach |
|---|---|---|---|---|---|---|
| `default` | 1.140 | 0.713 | 0.050 | 0.1800 → **0.1344** | 0.0415 → **0.000007** | 55% → 50% / 71% |
| `mixed` | 1.070 | 0.670 | 0.175 | → **0.1673** | → **0.000011** | 100% / 62% |
| `max` | 1.640 | 0.903 | 0.005 | → **0.1448** | → **0.000005** | 68% → 64% / 90% |

Stance, height, lateral and every clearance are **unchanged on all three casts**. Only the hand
centres moved, which is the whole of what was wrong. The reaches drop slightly because a hand no
longer has to get as far past the plane.

The drawn gaps above are **sampled from the real mesh transform** — 20 000 points on the sphere,
pushed through the same scale and rotations `Dancer` uses — deliberately not through
`handRiseAlongUp`, so the check is independent of the arithmetic it is checking. The 7e-6 residual
is the sampling density. The suite asserts the analytic version at 1e-9.

## The one to carry

**Fourth instance in three days of the same shape: a quantity the renderer draws one way and the
solve re-derives another.** The joint markers keyed to engine grips; the readout counting only
engine grips; the free arm's elbow written as its shoulder; and now a hand's size. Every one of
them passed its tests, because the test and the solve shared the wrong model.

What actually caught this one was **a person looking at it**, three times running. The pattern to
take seriously: this subsystem's tests are good at "does the solve compute what it means to" and
structurally incapable of "does it mean the right thing". The only instrument for the second
question is the scene — which is why the four hours spent repairing it this morning were the
cheapest hours of the week.

**And the corollary for the test that failed:** *"the two hand centres are `handRadius +
handRadius` apart"* asserted the implementation back to itself. The replacement asserts the
**drawn palms land on the contact plane**, which is a statement about the world instead. When a
test restates the code, it cannot fail for the reason you care about.

## State

**599 tests**, lint 0 errors and none in `src/dance/`, typecheck and build clean. Two tests changed
rather than were added — the stacking test now measures surfaces, and the swapped-pair clamp test
states its bound as the drawn rise of a hanging arm, which is the one case where the old and new
answers agreed by accident and now agree by construction.

⚠️ Still owed, now for three reasons: **the elbow watch on the default cast.** ADR-0025 moved the
joined hands, the free-arm fix moved both outside arms, and this moves both hands.
