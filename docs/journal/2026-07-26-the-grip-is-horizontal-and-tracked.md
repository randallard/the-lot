# 2026-07-26 — the grip is horizontal, alternated, and tracked

*Third entry for the day, and it corrects the second
([forearm grips and arm tucks](2026-07-26-forearm-grips-and-arm-tucks.md)) rather than
rewriting it: that entry's vertical-forearm grip is superseded here. The tuck it describes
is unchanged. Documents `028541e`.*

Ryan watched the vertical grip and gave the correction, plus the piece of context that
actually unlocks the problem:

> the grip isn't right though the arms should be horizontal and alternated so the hand of
> one is at the elbow of the other — really our characatures don't have upper arms, or
> necks or legs — just the important bits so we dont have to worry about body attachment
> and reach so we just need to make sure that hand contact and grip for forearm grip is
> right — this will come more into play in future moves but lets get it right for this one
> with those in mind as well so we need to track contact and arm position

He also **likes the breathing** — the 29% radius pulse from `arm-turn` interpolating its
orbit as chords. That is now a keep, not a defect. See below.

## What both wrong attempts had in common

Attempt one aimed the forearm at the grip point. Attempt two stood it up vertically at the
pivot. Both were reasoning about **where an arm can plausibly be given a shoulder** — reach,
attachment, not looking detached. Ryan's note removes that constraint entirely: these
caricatures are a body, a head, a forearm and a hand. There is no upper arm to violate, no
neck, no legs. Nothing about arm placement needs to satisfy anatomy, and the two attempts
were both compromises struck against a constraint that does not exist.

What *does* have to be right is **contact**: which hand is on which forearm, where along it,
and how the pair holds together while they turn. That is the only part of an arm a dancer
would feel, it is square-one's F2 channel, and it is what the calls after this one are made
of.

## The grip

Two **horizontal, antiparallel** forearms lying along the line between the dancers, at one
shared height, side by side, each hand at the other's elbow. Three numbers, all pair
properties, all in `arm-pose.ts`:

- **`gripHeight`** — the mean of the two resting elbow heights. A horizontal forearm sits at
  elbow height, so this is each dancer's own natural height, averaged. (This is where the
  rule started this morning. Attempt two moved off it because a *vertical* forearm hangs
  below the hand, which dropped the tall dancer's arm to their hips; horizontal has no such
  problem, so the simpler rule is right again. Recorded because it looks like a revert and
  isn't.)
- **`contactRadius`** — how far from the pivot each hand sits: **half the shorter forearm**.
  With equal forearms that is exactly hand-at-elbow both ways. With unequal ones it cannot
  be both — "my hand at your elbow" plus "your hand at my elbow" forces equal spans — and
  half the shorter is the choice that keeps *both* hands on the partner's forearm. The
  long-armed dancer reaches their partner's elbow exactly; the short-armed one holds
  partway up. Which is what people do.
- **`contactSeparation`** — how far apart the two forearm axes lie, half to each side.
  Forearms just touching would be the sum of their half widths, but **the hands are what
  hold**: Ember has a 0.07 hand on a 0.10 forearm and cannot reach across 0.158, so their
  hand hovered a visible 0.03 short of Myco's forearm. The separation is now the smaller of
  "forearms touching" and "the nearer hand's reach", and it is split evenly rather than each
  dancer contributing their own width — which is also what keeps the grip centred on the
  pivot for a mismatched pair (unequal contributions put it 0.021 off).

The lateral nudge direction is `up × dir`. Since each dancer's `dir` is the other's negated,
that lands them on opposite sides of the axis with neither needing to know what the other
chose — the same trick the earlier version used, and the one part of attempt two that
survived.

`ArmPose` lost its `pitch` scalar for an **aim vector** (unit, from the group's origin toward
the hand). A single angle could only swing an arm forward, back or up; a grip needs it
pointed sideways along an axis that rotates as the pair turns. The driver slerps the group's
quaternion onto it.

Measured over the whole Allemande, debug cast (Myco squat, Ember tall):

```
height 0.857 · radius 0.180 · separation 0.128 · forearm spans 0.360 / 0.605
Myco  → Ember   along 0.40 of the forearm   gap −0.082   (a hand wrapping)
Ember → Myco    along 0.00 — their elbow    gap −0.000   (touching)
```

Both hold for every beat of the grip span, through the whole breathing cycle.

## Tracking

New, and Ryan asked for it explicitly with future calls in mind. Two pure functions in
`arm-pose.ts` plus a channel out of the driver:

- **`trackForearm`** turns a local pose into the world segment the rig actually draws —
  `{ elbow, hand }`.
- **`trackContact`** resolves a hand against the forearm it is meant to be holding:
  `point` on the held forearm's axis, `along` (0 at its elbow, 1 at its hand), and `gap`,
  the surface distance, where **negative is a hold** because a hand wrapping a forearm
  overlaps it. It is pure measurement with no clamping of the pose: if a future call ever
  puts a hand off the end of the forearm it named, `along` pins to the end it missed and
  `gap` says how badly, which is exactly what a test or an overlay wants to see.
- **`DanceFloor.onArms`** reports both, per frame, as `ArmReport` — every dancer's two
  forearms in world space, the hand the engine has engaged, and the contact. Same
  scratch-reused discipline as `onBeat`: read it, don't retain it.
- The debug overlay prints it live: `a left → 0.40 along, gap −0.082 · b left → 0.00
  along, gap −0.000`, or `hands free`. **This is the readout that settles whether a grip is
  a grip**, which no camera angle can.

Deliberately read **back off the eased rig** rather than from the target pose, so the report
is where the arms are this frame, not where they were asked to be.

This is also the seam palm grips arrive on (Right and Left Grand, per square-one's
`GripSpan.grip`): a hand-on-hand contact is a different `trackContact` pairing, not a
different notion of where a forearm is.

## The breathing stays

The chord-cut orbit — separation pulsing 1.56 → 1.10 → 1.56 world units every two beats
because `arm-turn` emits a waypoint per quarter turn and the stepper interpolates linearly —
was flagged this morning as an engine defect to decide on. **Ryan likes it, so it stays.**
Recording it as a decision rather than an untouched finding, because the next person to
measure the orbit will otherwise "fix" it: the dancers pulling in and out through a turn
reads as breathing, and the grip is unaffected because both dancers cut the corner
symmetrically. If it ever needs to go, waypoints every eighth turn take the dip to 7.6%.

One consequence of it that is *not* a defect either: the joined forearms stay put at the
pivot while the bodies breathe in and out around them, so the visible gap between a
dancer's torso and their own forearm opens and closes by about 0.2 world units. With no
upper arm drawn there is nothing to stretch, and this is the case Ryan's note was about.

**Ryan's follow-up named the mechanism, which is worth stating as the model rather than as
a consequence:** *"the arm grip doesn't breathe like the bodies do — the invisible upper arm
is what would accommodate that — so that stays invisible and the bodies breathe but the
forearm holds steady and just rotates."* The grip is a **rigid join, pinned to the pivot,
that only rotates**; the undrawn upper arm is the compliant link. That is why `gripPose`
measures everything from the pivot and nothing from the shoulder — and it is now asserted
(*"holds steady and only rotates while the bodies breathe around it"*: every gripping elbow
and hand keeps a constant distance from the pivot across the whole span, while the pair's own
separation moves by more than 0.4 over the same beats). Joined forearms that stretched and
squashed with the bodies would be the wrong model of a hold, and the invariant now stops
anyone reintroducing one.

## Tests

`arm-pose.test.ts` (47) and `arm-geometry.test.ts` (17) — 258 in the suite, lint 0 errors,
typecheck and build clean. The geometry test now compares arms as **3D segments** (closest
distance between two segments, Ericson) rather than as vertical cylinders on a floor plan,
because a horizontal forearm breaks that shortcut. Over every call at quarter-beat
resolution it asserts: no two arms of the two dancers ever pass through each other, a
forearm goes horizontal only for a grip, gripped forearms are level and antiparallel at the
shared height, both hands stay *on* the partner's forearm with a non-positive gap, the
shorter-armed dancer's reach sets the contact radius, and the grip stays centred on the
pair's own midpoint.

Two of those assertions caught the `contactSeparation` bug before the render did: the
hovering hand (`gap +0.03`) and the off-centre grip (0.021).
