# ADR-0026: A hand is the ellipsoid that is drawn, not the sphere it is made from
- Status: Accepted
- Date: 2026-08-18
- Deciders: Ryan, Claude

## Context

[ADR-0025](0025-the-joined-hands-hang-between-the-shoulders.md) moved the couple's joined hands
to the middle between the two inside shoulders. Ryan looked at the result:

> looks better - the hands could still be closer to actually touching

They were already touching, in the model. The solve put the two hand centres exactly
`beau.handRadius + belle.handRadius` apart — tangent spheres, and a test asserted precisely that
and passed. Measured on the **drawn** meshes, the two hands were **0.0415 apart**, more than half
the belle's whole hand.

`ArmMetrics.handRadius` is `shape.hand[pose].radius`: the radius of the sphere a hand is *made
from*. It is not how big a hand is. `Dancer` puts that sphere inside a mesh with
`scale=[1, 1, flattenZ]` and `rotation=handRotations(pose)[side]`, so what is drawn is a
flattened, rotated ellipsoid — Myco's open hand is 0.110 across and **0.025** thick. How far it
reaches from its centre depends entirely on which way you ask.

And on this pose the direction that matters is the worst one. The beau's forearm aims **77%
forward** (the elbow swings back, ADR-0017's `ELBOW_BACK`), which turns his hand's thin axis most
of the way to vertical: he reaches **0.073** up from his hand centre where the solve assumed
0.110. The belle, 0.065 where it assumed 0.070. Together 0.1385 of the 0.180 the centres were
placed apart — a 0.0415 gap that no test could see, because every test was asking the same wrong
question.

This is the fourth instance in three days of one shape: **a quantity the renderer draws one way
and the solve re-derives another.** The joint markers keyed to engine grips, the readout counting
only engine grips, the free arm's elbow written as its shoulder, and now a hand's size.

## Decision

**The geometry layer asks how far a hand reaches *in a direction*, and the answer comes from the
mesh the renderer actually builds.**

- `body-shapes` gains **`handDrawnMap(pose, side)`** — the hand as a linear map from the unit
  sphere: this pose's `flattenZ` and its own mirrored `rotation`, composed the way three composes
  a local matrix. It lives beside `handRotations`, next to the numbers `Dancer` reads, so there is
  one statement of how a hand is built and the geometry layer gets a matrix rather than a second
  opinion. `arm-pose` stays free of three.
- `arm-pose` gains **`handRiseAlongUp(m, side, aim)`** — the drawn hand's half-extent along world
  vertical for an arm aimed that way. The frame change is `(aimX, −aimY, aimZ)`: the forearm
  group's rotation is the *minimal* one from `DOWN` to `aim`, and running world up back through
  its inverse cancels every trig term.
- **`palmOffset` is that rise**, not `handRadius`. Each dancer independently puts their own drawn
  palm *on* the contact plane — the beau's top surface and the belle's bottom surface both land on
  `hold.height` — so the two hands meet there and **neither needs to know the other's hand**. That
  locality is why this is a per-dancer offset and not a stack height solved for the pair.
- **`settleTouch` is the shared fixed point**, because the two quantities are each other's
  inputs: where the hand goes decides which way the forearm points, and which way it points
  decides how much hand lies between its centre and the plane. Seeded with a hanging arm,
  converging at about a factor of ten a pass, bounded at sixteen. `touchHold`'s own fixed point
  gains the lifts alongside the height; `poseArms` re-settles against the **live** placements,
  because the pair breathe and a lift frozen at the standing stance would let the hands drift
  apart mid-move.
- **`handRadius` keeps its name and loses its job.** It is documented as how *wide* a hand is —
  the sphere before flattening — and anything asking whether a hand's surface reaches a point uses
  the rise instead.

## Alternatives considered

- **Drop the hand's caricature in the dance**, as the dance already drops `shape.head.rotation`.
  The existing solve would become true for free, and held hands would stop matching the same
  character's hands everywhere else — the preview, the free arms, the player. Offered; Ryan chose
  to have the solve learn the real hand instead.
- **Stack by the hand's half-*thickness* (`radius · flattenZ`).** A palm is a flat face, so this
  sounds right, and it assumes the flat face is horizontal, which it is not. It would bury the two
  hands almost concentric: 0.036 between centres where the surfaces need 0.138.
- **Overlap the hands deliberately** — the principle `contactSeparation` already states for the
  forearm grip ("a hand hovering a visible gap … is worse than two forearms overlapping
  slightly"). Offered as a third option. Not taken: with the rise correct the surfaces *meet*, and
  an overlap term would be a tuned number on top of a solved one. Still available if the pose
  reads thin.

## Consequences

- **The hands touch, on every cast, asserted against the drawn surfaces**: the palms land on
  `hold.height` to 1e-9 in the tests, and to 7e-6 when independently sampled from 20 000 points on
  the real mesh transform (that residual is the sampling, not the solve).
- **Stance, height and lateral do not move**: default 1.140 / 0.713 / 0.050, `mixed` 1.070 /
  0.670 / 0.175, `max` 1.640 / 0.903 / 0.005, and every clearance unchanged. The hand centres come
  closer together — default 0.180 → 0.1344 — and only the centres move.
- **The reaches drop slightly**, because a hand no longer has to get as far past the plane: the
  beau goes 55% → 50% on the default cast. `mixed` still has him at 100% for the reason ADR-0023
  recorded — a torso wider than an arm is long.
- 🔴 **The pose solve now depends on cosmetic hand authoring** — `flattenZ` and the hand pose's
  `rotation` — which is a real inversion of the line ADR-0024 drew, and the opposite of what the
  dance does with `shape.head.rotation` (drops it as caricature). Accepted knowingly: a hand is
  the thing that *holds*, so how it is drawn is load-bearing in a way a head's tilt is not. The
  cost is that editing a hand's flatness or rotation now moves a couple's joined hands. Nothing
  clamps the editor; ADR-0024's "the sliders stay free" is untouched.
- **`ArmMetrics` grew a matrix per side**, because the mesh rotation is mirrored between them so a
  dancer's two hands are not the same shape in the same frame.
- **Promotion condition:** the rise is taken along world **vertical** only, because that is the
  axis a stacked palm-to-palm hold lives on. A hold whose hands meet along any other axis — hands
  clasped side to side, a forearm grip judged the same way — needs the general direction, which
  `handRiseAlongUp` is one argument away from providing and does not yet expose.
