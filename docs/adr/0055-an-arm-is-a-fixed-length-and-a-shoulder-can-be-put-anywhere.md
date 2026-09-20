# ADR-0055: An arm is a fixed length, and a shoulder can be put anywhere

- Status: Accepted
- Date: 2026-09-19
- Deciders: Ryan, Claude

## Context

`layout.shoulderY` (2026-09-19, uncommitted at `008c86e`) lets a character's arm attach
somewhere other than the top of its own body. It exists because a **sunken head** puts the
shoulder in the wrong place: Myco's `headBodyGap` is `-0.4` on purpose, so her head visibly
starts at 0.55 while her body capsule's top — where the shoulder was being read — is at 0.95,
a whole head-radius above where anyone would draw a shoulder on her.

🔴 **Nothing about a hanging arm ever asked how high the shoulder was.** `restPose`, and
`expression-channels`' `proposeArms` which is the path a resting dance arm actually takes,
hang `elbowReach + forearmSpan` of arm straight down from wherever the shoulder is. That was
safe for one reason only: every shoulder in the cast's history sat at the top of its own body,
which is comfortably high on every shape the editor would produce.

Move the shoulder down and the arm does not shorten with it. **Measured on the shipped cast,
at Myco's own authored `shoulderY: 0.05`:**

| | shoulder | arm length | hand bottom | floor |
|---|---|---|---|---|
| Myco | 0.55 | **0.80** | **−0.25** | 0 |
| Ryan | 0.95 | 0.80 | 0.15 | 0 |
| player | 0.91 | 0.635 | 0.275 | 0 |
| Ember | 1.425 | 1.005 | 0.42 | 0 |
| Sprout | 0.75 | 0.34 | 0.41 | 0 |

Her forearm and her whole hand compute to below the ground plane (`DanceReviewScene`, an
opaque mesh at `y = −0.01`), which cuts them off. That is the stub in Ryan's screenshot of
2026-09-19, and **it was live on the cast before anything here was changed** — not something
a wider bound introduced.

The bound was the thing that hid it. `SHAPE_BOUNDS.layout.shoulderY.min` was `-0.20`, and the
session of 2026-09-19 (journal 1) widened it to `-1.00`, saw a limb in the dirt, and put it
back with a comment saying not to widen it again until a hanging arm was floor-aware. That
left Ryan's actual ask — *"I need the shoulder height setting to be able to decrease more"* —
blocked on a design call nobody had made: floor-clamp the drop, bend the elbow, or something
else.

## Decision

**A free arm is swung up off the ground about its own shoulder, and the lift is spent
forward.**

`clearFloor(pose, m)` in `arm-pose.ts`. Where the straight arm from the shoulder would put the
hand's centre lower than one `handRadius` above `FLOOR_Y`, the whole arm rotates about the
pinned shoulder until it sits exactly there. The upper arm keeps its natural length, so
`upperArmStrain` still reads zero on a rest pose — the fixed point every other pose is
measured against is undisturbed.

Three things make it the rule rather than a patch:

**It is a limit, not a pose.** It runs in `poseArms`' *limited* channel, beside
`constrainArm`, on `_free` only. An owned hand has somewhere it must be, and where a **hold**
may sit is `bandedHeight`'s question and already answered there.

**Before `constrainArm`, never after.** The lift is a rotation about the shoulder; the fold is
a horizontal slide. A horizontal slide cannot undo a vertical lift, and the other order lets
the fold drop a cleared hand straight back into the ground.

**`aimX` is carried across untouched, and only ever clamped inward.** Coming up off the
vertical *grows* an arm's horizontal budget — `√(1 − aimY²)` — so the gain has to be pointed
somewhere. Sideways is wrong: `restX` is the width everything from `tuckedRestX` to the review
chart reads an arm at, and it is measured to sit clear of this dancer's own body, so a lift
that widened it would put a resting arm somewhere no rule had put one. Forward is where a
caricature has room — the same asymmetry `rigidParts` already relies on when it declines to
count a forward overhang, because dancers pass side-on and nothing that juts forward narrows
the gap they pass through.

**And the bound opens to the body's own span:** `shoulderY` now runs `{ min: -1.30, max: 1.50 }`,
`±(body.height/2 + body.radius)` over `SHAPE_BOUNDS.body`'s extremes. A shoulder may be put
anywhere on the body it belongs to, top to bottom.

## Alternatives considered

**Swing out to the side.** Reads better — a mushroom with its arms out is a penguin, and a
mushroom with its arms forward is a zombie — and it was built first. It puts Myco's elbow at
`|x| = 0.714` against a `restX` of 0.46, which is a resting arm half a body-radius outside the
envelope every other rule reads her at. Rejected on that, not on looks.

**Bend the elbow instead of the shoulder.** More faithful to a real arm, and it leaves the
visible attachment vertical. It does not avoid anything: the forearm still has to point
somewhere with a horizontal component, so it meets `constrainArm` in exactly the same way, and
it costs the `upperArmStrain`-reads-zero property for no gain.

**Put the clamp inside `restPose`.** It would have spared two test rewrites, because both
sides of every `restPose` comparison would move together. Rejected: `restPose` is the pure
geometric statement of what a resting arm *is*, which `fist-bump.ts` and `contact-move.ts`
both use as a reference, and a limit that depends on where the world's floor happens to be does
not belong in it.

**Leave it to authoring — widen the bound and let a badly-authored arm look wrong.** This is
the real fix for Myco and it is recommended below; it is not a substitute for the rule, because
the threshold is per-character (`upperArmSpacing` + forearm + hand, not one shared constant)
and nothing in the editor would have told anyone they had crossed it.

## Consequences

**It fires for exactly one character on the cast, and only because her arm is longer than her
shoulder is high.** Every other shape hangs untouched at every shoulder it has — asserted over
the cast rather than assumed.

🔑 **The authoring answer is a shorter upper arm, and the clamp is the safety net under it.**
Myco's arm is 0.80 on a 0.55 shoulder, so it cannot hang, and no amount of clamping makes a
short-shouldered figure with a long arm look like it is standing still. Measured, at her
authored `shoulderY: 0.05`:

| `upperArmSpacing` | hand bottom on a straight hang | clamp | arm tilt |
|---|---|---|---|
| 0.33 *(shipped)* | −0.25 | fires | 50.4° |
| 0.20 | −0.12 | fires | 38.2° |
| 0.12 | −0.04 | fires | 23.6° |
| 0.10 | −0.02 | fires | 17.0° |
| **0.08** | **0.00** | **silent** | **0°** |
| 0.06 | 0.02 | silent | 0° |

**`shoulderY` and `upperArmSpacing` are one adjustment, not two.** That pairing is the whole
of setting up a low-shouldered character, and it is what the editor's Layout section is for.
Her shipped `upperArmSpacing` is **left at 0.33 deliberately** — it is an authored look, and
re-authoring a character to make a new rule quiet is the wrong way round.

**Seven existing test statements moved, none of them re-pinned to a number.** Each one said
"a free arm hangs at `aimY === -1`" and each was exercising it through Myco. They now say what
a resting arm is — `clearFloor(restPose(…))` — so they keep stating the rule and will keep
passing when her upper arm is shortened and the clamp goes quiet. The one that could not be
restated that way (`expression-channels`' *"hangs an un-emoting arm where the body says its
elbow rests"*, whose actual subject is a proposal writing the **shoulder** into the pose)
asserts the shoulder-to-elbow distance is a full `elbowReach` instead, which is the defect it
was written for and is untouched by any of this.

🔴 **A lifted arm reaches forward, and `constrainArm` answers that by backing it off along a
diagonal — which has an `x` in it.** So a lifted arm's elbow can finish a little wider than
`restX` after a fold: 0.484 against 0.46 on Myco at the dosado's beat 4.25, bounded by the
forward reach the lift bought (at most `forearmSpan`). It is the fold moving the arm **away**
from the partner, and `arm-geometry`'s *"never lets a free arm intersect the partner's"* is
unmoved by it. Recorded rather than fixed: it is a property of `constrainArm` folding along a
bearing, it predates this, and nothing but a floor-lifted free arm had any forward reach to
expose it.

**Not the head.** `headBodyGap` is untouched and Myco's `-0.4` stands. The overlap is why her
shoulder is hard to place, not a thing to be fixed — `computePositions` keys `headCenterY` off
`bodyTop` by design, so `shoulderY` never moved the head and was never going to.
