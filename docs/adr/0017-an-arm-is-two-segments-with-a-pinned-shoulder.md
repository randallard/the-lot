# ADR-0017: An arm is two segments — a pinned shoulder, a free elbow, and a compliant link between them
- Status: Accepted
- Date: 2026-08-15
- Deciders: Ryan, Claude

## Context

The fist bump built under **ADR-0016** was watched on 2026-07-30 and left one measured
defect open, flagged in `docs/PROGRESS.md` as a decision Ryan owned:

> The shoulder still slides back at bump range — origin z **−0.34 / −0.21 / −0.07** at half
> / ¾ / full reach, where it should be ≈0.

The arithmetic is exact and worth stating, because it shows the problem is structural rather
than a tuning error. `bumpPose` placed the arm group's origin at `handRadius + handReach`
back from the contact point, while the character's body stands `separation × contactFraction`
back from it. Those two agree at **one** separation — full reach, and even there they are off
by `handRadius`, because `maxSeparation` ignored the hands' own radii. Everywhere else the
whole arm slides along the axis to make up the difference. At half reach the forearm's near
end ends up *inside the torso*; far out it floats off the front.

**Why it stayed invisible for so long.** Nothing is drawn between shoulder and elbow — these
caricatures have no upper arms (`services/body-shapes`) — so an arm group placed at a
nonsense origin still renders a forearm and a hand in exactly the right place. `arm-pose.ts`
had said since M4 that it "does not model reach or attachment", written as a concession to
the caricature. The concession became a licence: with nothing asserting where the shoulder
was, and no shoulder drawn, the model could put it at the partner's feet and the tests would
pass. This is the fourth variant of the same theme this subsystem keeps producing — an
unexercised seam, over-uniform fixtures, the one quantity everyone asserts being the one the
defect preserves, and now **a quantity nothing measured because nothing drew it.**

**With a rigid one-segment arm pinned at a real shoulder there is nothing left to give.**
Shoulder fixed, forearm rigid, hand required at an authored point: direction is the only free
parameter, and a direction cannot satisfy both a position and a distance. So something had to
move — either the authored contact height (arms angle up when the pair stand closer, fists
meet higher), or the fists (let them interpenetrate), or the model of what an arm *is*.

## Decision

**An arm is two segments.** The **shoulder** is a fixed property of the body and is pinned by
the rig. The **forearm** is rigid and is what gets drawn. The **upper arm** between them is
undrawn, and it is a real, variable span rather than a constant baked into an arm group's
origin.

Concretely:

- An `ArmPose` names the **elbow** and the direction from it to the hand. It used to name the
  arm group's origin — nominally the shoulder — which is the lie this ADR removes.
- Each rig is **two nested groups**: an outer shoulder group pinned at `(±forearmX,
  shoulderY, 0)`, and an inner forearm group carrying the elbow and the aim. Only the inner
  group is exposed to a driver. There is no ref through which a shoulder can be moved, so a
  sliding shoulder is not merely wrong — it is inexpressible.
- `reachPose` solves the elbow by two-bone IK from the pinned shoulder. Both ends fixed
  leaves the elbow on a circle; `ELBOW_SWING` breaks the tie outward and down, because every
  point on that circle is legal and only one looks like an arm.
- **The authored contact height stays authoritative.** ADR-0016's vertical rule is untouched:
  the fists meet where the move says, and the elbow bends by however much that costs.
- `upperArmStrain` reports how far a pose stretches the upper arm past its natural length.
  It is instrumentation, never a clamp.
- Reach is measured **at the contact height** and across the body's own midline, so
  `maxSeparation` and `contactFraction` both take the height the vertical rule resolved.

`gripPose` keeps its opposite behaviour deliberately, and the contrast is half the decision.
A grip is pinned to the **pair's pivot** and lets the shoulder drift, because a turning pair's
separation breathes by ~0.46 world units every two beats and a hold must not let go when the
bodies move. A reach is pinned to its **own shoulder** and lets the elbow bend, because the
pair are standing still and the authored contact point is the thing that must hold. Those
were the same function until the shoulder was measured.

## Alternatives considered

**Let the contact height give.** Keep the one-segment arm and solve the height so the hand
lands on the sphere of radius `handReach` about the real shoulder: arms angle up as the pair
close, fists meet higher, which is what people actually do. The smallest change on the table,
and it fails for a reason worth recording — it makes ADR-0016's authored vertical rule a
*preference* rather than a rule, which would have meant superseding an accepted ADR to fix a
defect that is not really about height. Rejected: the vertical rule is authored content and
should mean what it says.

**Let the fists interpenetrate.** Keep the height and the horizontal forearms, clamp the
shoulder to the body, and accept overlapping hands at close range. Cheapest, needs no ADR —
and it trades a defect that can be measured for one that can only be seen, which is exactly
backwards for this subsystem.

**Leave the rig alone and only change the solver.** The two-bone solve needs no rig change to
*render* correctly: `origin = elbow − elbowReach · aim` can encode any elbow, so a
correctly-solved arm draws correctly through the old single group. Rejected on purpose. That
keeps the shoulder as a value that happens to come out right, and this subsystem's whole
history is defects that survived because the wrong thing was merely improbable rather than
impossible. Splitting the group makes the shoulder unwritable.

## Consequences

- **Nothing moves until something poses an arm.** The rest pose is unchanged by construction:
  the shoulder group holds the elbow at `elbowY − shoulderY` and the meshes hang at
  `centre − elbowY`, and the two offsets sum to the single `centre − shoulderY` the rig used
  to carry. Asserted as arithmetic in `arm-pose.test.ts` rather than left to the JSX.
- **The emote layer is untouched.** An emote's `upperArmRotation` is a rotation *about the
  shoulder*, so it keeps writing the group it always wrote and a driven forearm hangs inside
  it. `Player` now also returns the forearm to its rest offset on any frame it owns the arm,
  so a driver that has just let go cannot leave the elbow where it put it.
- **A pose now depends on which shoulder it came from**, and `bumpPose` takes a `sign`. This
  is a gain: under the one-segment model the handedness sign vanished from the answer at full
  extension — both rigs produced the *same* pose and only the group it was written to
  differed — which is precisely what made "it was driving the left arm" invisible to every
  assertion in `contact-move.test.ts`. One test there now asserts the opposite of what it
  used to.
- 🔴 **Reach is measurably shorter than it was, and some pairs will be told to move closer.**
  The old `maxSeparation` was `handReach + handReach`, which called itself conservative while
  ignoring both the climb to the contact height and the reach across the body's own midline.
  `restX` runs to 0.46 on the wider bodies, so the correction is not small. This is the honest
  reading of a rigid arm on a torso that cannot twist — and it is the **first thing to watch**
  if bumps start feeling fussy. If they do, the fix is a torso-twist allowance in
  `axialReach`, not a return to a number that was wrong in a flattering direction.
- **Two elbows no longer share a height; two fists do.** Several tests moved from measuring
  the pose's `y` to measuring the hand's. That is the correct reading of what the pose now
  means, and the rig-frame defect those tests were written for is still caught — remove
  `localHeight` from `bumpPose` and they fail again by 0.75.
- **The upper arm is reported, per side, per frame** (`TrackedArms.upperArm`, printed
  min → max in the dance debug overlay). A grip *should* breathe there — that is the compliant
  link doing its job. A reach should not. Either way it is a number that can be watched
  drifting rather than a hunch, which is this subsystem's standing rule.
- **Reach stops being a validity gate and stays an authored rule.** Past full extension
  `reachPose` honours the hand and stretches the upper arm rather than clamping, so a lobbed
  fist and a traded head (ADR-0016's gated `attach: "free"` and `exit: "transfer"`) have a
  geometry to be built on rather than a limit to fight. An unhandled case and a deliberate
  absurdity still look identical on screen; the difference is now `upperArmStrain` and who
  authored it.
- **Promotion condition.** `ELBOW_SWING` is a number tuned by eye against one gesture. If a
  second contact move wants a different elbow — an overhead high five, a hand on a shoulder —
  the swing preference becomes authored data on the constraint, and that is a new ADR
  extending ADR-0016's schema, not a quiet constant change here.
- **Not addressed, and still open:** `gripHeight`'s unequal-pair placeholder (step 3 of the
  dancer-size brief). This ADR makes the arm reach the authored height honestly; it does not
  change what that height *is* for a mismatched pair.
