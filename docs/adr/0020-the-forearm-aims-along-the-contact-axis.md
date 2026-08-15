# ADR-0020: The forearm's aim is authored, and a punch meets at shoulder height
- Status: Accepted
- Date: 2026-08-15
- Deciders: Ryan, Claude

## Context

Ryan, watching the fist bump with ADR-0017's two-bone arm and ADR-0019's twist:

> there's a little bit missing from the fist bump — in life, the forearm lines up like a
> punch to punch fists with a straight wrist — these are coming in at a real angle

He is right, and the angle is not a bug in the solve. It is the solve doing its job.
`reachPose` pins the elbow one **rigid** upper arm from the shoulder, which leaves the
forearm's direction as the only remaining unknown — so the forearm tilts to whatever that
geometry demands. Making the arm always plausibly attached and making the wrist straight are
competing goals, and ADR-0017 chose the first without noticing it was choosing.

**This also retires an answer I gave too quickly.** On the reach question Ryan asked whether
"the upper arm is restricted so it can't reach out". I measured maximum reach, found
`handReach = upper + forearm` used in full, and said no. That was true and it answered a
narrower question than the one asked: the *rigid* upper arm was not capping reach, but it was
dictating the forearm's angle, which is the thing being looked at.

**The measurement that decided the shape of the fix.** A forearm laid along the axis is
horizontal, so the undrawn upper arm has to span from the shoulder *down* to it. At the
built-in bump's `mean-elbow` height, for the default pairing at the staged separation:

| | contact | elbow, axial | upper arm needed | natural | strain |
|---|---|---|---|---|---|
| player | 0.780 | **0.042** (body radius 0.15) | 0.443 | 0.220 | **0.223** |
| NPC | 0.780 | 0.275 (body radius 0.30) | 0.414 | 0.330 | 0.084 |

The player's elbow lands *inside their own torso*, and the link doubles. That is the
detached-forearm screenshot from 2026-07-30 coming back. The cause is vertical: the contact is
0.38 below the player's shoulder and their upper arm is 0.22, so no horizontal forearm at that
height can stay attached, whatever it is aimed at.

At **`mean-shoulder`** instead — an existing authored rule, already in the schema and unused:

| | contact | elbow, axial | upper arm needed | natural | strain |
|---|---|---|---|---|---|
| player | 1.055 | 0.171 | 0.232 | 0.220 | **0.012** |
| NPC | 1.055 | 0.288 | 0.392 | 0.330 | 0.062 |

Nearly nothing. And max separation rises 1.427 → 1.605, because the arm stops spending itself
on the descent.

## Decision

**The forearm's aim is authored per constraint**, as `aim: "along-axis" | "natural"`.

- **`"along-axis"`** — the forearm lies along the line between the pair, horizontal, wrist
  straight. A punch. The hand goes where the contact says, the forearm points down the axis,
  and the elbow lands wherever those two put it; the **undrawn upper arm takes the
  difference**. That is the compliant-link model `gripPose` has always used and the reason
  ADR-0017 split the rig — the shoulder stays on the body while the link varies.
- **`"natural"`** — ADR-0017's two-bone solve. The elbow stays one upper arm from the
  shoulder and the forearm tilts. Always plausibly attached; wrist not straight.

Absent means `"along-axis"`, which is what every move authored before this field existed was
previewed and played with — `bumpPose` aimed along the axis until ADR-0017 replaced it earlier
the same day.

**And the built-in fist bump meets at `mean-shoulder`, not `mean-elbow`.** These are one
decision, not two: a level forearm is only attached if the shoulder can reach down to it, so
choosing the punch chooses the height. Keeping the aim and the height separately authorable is
what lets a future move choose differently — but the pairing has to be chosen together.

## Alternatives considered

**Keep `"natural"` and accept the tilt.** What the code already did. Rejected because Ryan is
describing a real property of the gesture — a fist bump is a punch that stops — and because the
tilt is the most visible thing about the current render.

**Make the upper arm elastic inside `reachPose`**, so the two-bone solve can straighten the
forearm by stretching. That is the same compliant link arriving through a more complicated
door, and it would make `upperArmStrain` a function of a solver's internal give rather than of
an authored choice. The straightforward version is to author the aim.

**Lower the shoulders or lengthen the upper arms in `body-shapes`.** Fixes the arithmetic by
editing every character in the cast, including ones the player made. The bodies are content.

**Fix `gripHeight`'s unequal-pair rule instead.** Genuinely open (step 3 of the dancer-size
brief) and genuinely related — the player's rig standing 0.25 higher than an NPC's is why the
mean is so far below their shoulder. Deferred still: it is a rule about *fairness between
mismatched bodies*, and this ADR needs a rule about *where a punch lands*. `mean-shoulder`
answers the second without prejudging the first.

## Consequences

- **The fists meet head on with straight wrists**, which is the ask, and the arms stay attached
  — 0.012 of stretch on the player, 0.062 on the NPC, against upper arms of 0.220 and 0.330.
- **Contact moves up to shoulder height**, which is a visible change to where a bump happens
  and the main thing to watch. On these caricatures the "shoulder" is the top of the torso, so
  this is upper-chest height rather than anything odd.
- **Reach rises again**, 1.427 → 1.605, so the approach stages the pair at 1.284 rather than
  1.142. Third increase in a day; if it now reads as *too* far apart, `APPROACH_FRACTION` is
  the dial rather than any of the geometry.
- 🔴 **`upperArmStrain` is nonzero by design for a punch**, where ADR-0017 introduced it as a
  quantity that should read zero. It is still the right instrument — it is now measuring how
  well the authored height suits the authored aim, which is exactly the coupling this ADR
  exists to name. One test moved from asserting zero to asserting a bound.
- **Handedness stops being visible in the pose again.** A punch is determined by the contact
  and the axis, so which shoulder fed it does not change the forearm in rig space. The guard
  against "it was driving the left arm" moves down a level, to `elbowLocal`, where the side
  genuinely lives — and the test moved with it. That assertion has now been rewritten three
  times by three ADRs, which is worth noticing: it is tracking *where* the handedness fact
  lives, and each rewrite has been honest about the move.
- **Promotion condition.** `"natural"` is now unused by anything shipped. If nothing authors it
  within a few more contact moves, it is dead weight and should go — but it is the correct
  answer for a contact that is not a strike (a hand on a shoulder, a palm on a back), so
  deleting it early would be discarding a solved problem.
