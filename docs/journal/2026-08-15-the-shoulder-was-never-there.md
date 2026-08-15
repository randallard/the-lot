# 2026-08-15 — the shoulder was never there

_Documents `40e41db` (ADR-0017) and `b30cb6e` (the build)._

Picking the repo back up after two weeks. The queue had exactly one thing at the top and it
was Ryan's to decide: the shoulder sliding backwards at bump range, measured on 2026-07-30 at
origin z **−0.34 / −0.21 / −0.07** for half / ¾ / full reach.

## What the number actually was

Worth writing down, because it turned out to be a closed-form statement of the defect rather
than a symptom of one. `bumpPose` put the arm group's origin at `handRadius + handReach` back
from the contact point along the axis; the body stands `separation × contactFraction` back
from the same point. Set the two equal and you get a single separation where they agree —
full reach, and even there off by `handRadius`, because `maxSeparation` never counted the
hands' own radii. Every other distance, the arm slides bodily along the axis to make the
arithmetic work.

The measured numbers fall straight out. At full reach the offset is exactly `−handRadius`
(−0.07). At ¾ it is `−0.25 · handReach − handRadius`. At half, `−0.5 · handReach −
handRadius`. Three data points, one formula, no tuning to be done.

## The option that wasn't on Ryan's list

The write-up framed it as two ways out — the contact height gives, or the fists interpenetrate
— on the reasoning that a rigid arm pinned at a real shoulder leaves direction as the only
free parameter. That reasoning is correct **for a one-segment arm**, and reading `Npc.tsx:262`
made it clear that is a choice rather than a fact. The arm group holds a forearm mesh and a
hand mesh at fixed offsets and nothing else. There is no upper arm drawn, so nothing prevents
a second nested group from putting the elbow wherever it likes.

Which makes it a two-bone IK problem, and two-bone IK has a textbook answer. Ryan picked it.
**ADR-0017**: pinned shoulder, free elbow, undrawn compliant link between them.

## The thing I nearly got wrong

Partway through I noticed the rig split is not needed to make the render correct. Since the
old encoding derives `elbow = origin + elbowReach · aim`, setting `origin = elbow −
elbowReach · aim` expresses any elbow you like — a correctly-solved arm draws correctly
through the single group, and the "sliding shoulder" is invisible on screen because nothing is
drawn there.

So the cheap version of this change is: fix the solver, leave the rig alone.

I nearly did that, and it would have been wrong for the reason this subsystem keeps teaching.
The cheap version leaves the shoulder as *a value that happens to come out right*. Every
defect in this file's history survived because the wrong thing was improbable rather than
impossible — the inert pin, the `spin` channel that passed by doing nothing, `osv-scan` never
running, fixtures more uniform than production. Splitting the group makes a moving shoulder
**inexpressible**: the outer group carries no ref, so there is no handle through which a
driver could write one. That is worth a rig change across three components.

The general form, which is not new but is sharper here than the earlier variants: **a
quantity that nothing draws and nothing measures is not a quantity the model has.** The other
three variants were all about tests missing something the code did. This one is about the
model not having the concept at all — `arm-pose.ts` had said since M4 that it "does not model
reach or attachment", and that sentence, written as a modest concession to caricature
anatomy, was a licence to put a shoulder at the partner's feet.

## What landed

- **`ArmPose` names the elbow**, not an arm-group origin. `restPose`, `gripPose`,
  `constrainArm` and `trackForearm` all move with it; the changes are one term each, because
  the difference between the two is exactly `elbowReach · aim`.
- **`reachPose`** — the two-bone solve. `ELBOW_SWING` breaks the remaining tie outward and
  down, since both ends fixed leaves the elbow on a whole circle and only one arc of it looks
  like an arm.
- **`upperArmStrain`** — how far a pose stretches the link past its natural length.
  Instrumentation, never a clamp: past full reach `reachPose` honours the hand and lets the
  link stretch, because reach is a rule a move chooses (ADR-0016) and the lobbed fist depends
  on that branch existing.
- **Two nested groups** in `Dancer`, `Npc`, `Player` and the editor's own preview rig, with
  the rest pose unchanged by construction — the elbow offset plus the mesh offset is the old
  mesh offset, and that is asserted as arithmetic rather than left to a renderer.
- **Height-aware reach.** `maxSeparation` and `contactFraction` now take the contact height
  and subtract both the climb to it and the reach across the body's own midline.
- The emote layer is untouched: `upperArmRotation` is a rotation about the shoulder and keeps
  writing the group it always wrote.

507 tests (from 477), lint 0 errors, typecheck and build clean.

## Two tests that now assert the opposite of what they did

Both are the interesting kind of change — not a fixture updated, but a property that was true
of the old model and is *false and should be* of the new one.

**"aims both arms horizontally"** is gone. A horizontal forearm was what the one-segment model
produced when it forced the arm along the contact axis, and forcing it is precisely what
dragged the shoulder off the body. The forearm now tilts by whatever the elbow needs. What
replaces it is the property that actually matters and could not previously be stated: the arm
is still *attached*, `upperArmStrain` reads zero, and the elbow is exactly one upper arm from
the shoulder at every reach from 0.3 to full.

**"does not move the contact point — which is why this hides"** asserted that the handedness
sign made no difference to the pose at full extension. It was true, and it was the mechanism
by which "it was driving the left arm" (2026-07-30) stayed invisible to every assertion in the
file: the whole pose was placed from the contact point, so both rigs produced the *same* pose
and only the group it was written to differed. Now the shoulder is an input, so the sign is
visible in the answer. The test asserts the contact point is unmoved and the pose is not.

Also: several assertions moved from the pose's `y` to the hand's. Two elbows solved from two
different shoulders have no reason to share a height. Two fists do.

## Flagged for the watch

🔴 **Reach is genuinely shorter now.** The old `maxSeparation` was `handReach + handReach` and
described itself as conservative while ignoring both the vertical climb and the lateral reach
across the midline — and `restX` runs to 0.46 on the wider bodies, so the correction is not a
rounding difference. Some pairs that used to be offered a bump will now be told to move
closer. That is the honest number for a rigid arm on a torso that cannot twist, and it is the
first thing to look at if bumps start feeling fussy. If they do, the answer is a torso-twist
allowance in `axialReach`, not a return to a number that was wrong in a flattering direction.

**Nothing here has been watched yet.** Four times now this repo's arm work has been wrong by
eye with a green suite behind it.
