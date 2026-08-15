# 2026-08-15 (5) — a punch that stops

_Documents `aca3728` (ADR-0020) and `fc591ff` (the build)._

> there's a little bit missing from the fist bump — in life, the forearm lines up like a punch
> to punch fists with a straight wrist — these are coming in at a real angle

## The angle was the solve working, not failing

`reachPose` pins the elbow one **rigid** upper arm from the shoulder. Both ends of the forearm
are then fixed — hand at the contact, elbow on a sphere about the shoulder — so its direction is
whatever that geometry demands. There is no freedom left to make the wrist straight.

"Always plausibly attached" and "straight wrist" are competing goals. ADR-0017 chose the first
this morning without noticing it was choosing, because at the time the visible defect was an
arm detaching and the alternative never came up.

## Which retires an answer I gave too quickly

Earlier today Ryan asked whether "the upper arm is restricted so it can't reach out". I measured
*maximum reach*, found `handReach = upper + forearm` used in full, and said no.

True, and a narrower question than the one asked. The rigid upper arm was not capping reach —
it was **dictating the forearm's angle**, which is what was being looked at. Worth writing down
as a failure mode of my own: I picked the reading of the question I could settle with a
measurement I already had, and the measurement was real enough that being wrong felt like being
rigorous.

## The measurement that shaped the fix

A forearm along the axis is horizontal, so the undrawn upper arm has to span from the shoulder
*down* to it. At the built-in bump's `mean-elbow` height, at the staged separation:

| | contact | elbow, axial | upper arm needed | natural | strain |
|---|---|---|---|---|---|
| player | 0.780 | **0.042** (body radius 0.15) | 0.443 | 0.220 | **0.223** |
| NPC | 0.780 | 0.275 (body radius 0.30) | 0.414 | 0.330 | 0.084 |

The player's elbow lands **inside their own torso** and the link doubles — the detached-forearm
screenshot from 2026-07-30, back again. The cause is vertical, not directional: the contact is
0.38 below the player's shoulder and their upper arm is 0.22.

At `mean-shoulder`, a rule already in the schema and never used:

| | contact | elbow, axial | upper arm needed | natural | strain |
|---|---|---|---|---|---|
| player | 1.055 | 0.171 | 0.232 | 0.220 | **0.012** |
| NPC | 1.055 | 0.288 | 0.392 | 0.330 | 0.062 |

Nearly nothing, and reach rises 1.427 → 1.605 because the arm stops spending itself descending.

**So the aim and the height are one decision.** Choosing the punch chooses the height. That is
the part I would have got wrong by shipping the aim alone and calling it done.

## What landed

`punchPose` — which is `gripPose` with radius = the hand's own and separation = 0, i.e. exactly
what `bumpPose` was before this morning. `bumpPose` survives as the `"natural"` aim. The choice
is authored per constraint (`aim`), with a control in the editor, and an absent value means
`"along-axis"` — what every move authored before today was previewed with.

545 tests, lint 0 errors, typecheck and build clean.

## Three tests changed meaning, and one of them is a pattern

- **The "same pose as the hardcoded bump" test** compared `resolveRole` against `fist-bump.ts`'s
  own defaults, which hard-code mean-elbow and an untwisted split. That stopped being *this*
  gesture, so the comparison would have asserted the authored move had not changed — the
  opposite of its purpose. It now asserts ADR-0016's actual property: `resolveRole` is exactly
  the public pieces composed.
- **The zero-strain assertion became a bound.** A punch makes the undrawn link the compliant
  part by construction, so "small" is the honest claim and zero was never going to survive.
- **The handedness guard moved to `elbowLocal`.** A punch is determined by the contact and the
  axis, so the shoulder it came from does not change the forearm in rig space — but it does
  change where that forearm gets written.

That last one has now been rewritten by three consecutive ADRs: first it asserted the sign was
*invisible* in the pose (true of the one-segment arm, and the mechanism by which "it was driving
the left arm" hid from every assertion in the file), then that it was *visible* (ADR-0017 made
the shoulder an input), now that it is visible one level down. **The assertion is tracking where
a fact lives, and the fact keeps moving.** A test that has to be rewritten every time the model
changes is not necessarily a bad test — but it is worth saying out loud each time *why*, because
the version of this that goes wrong is rewriting it to match whatever the code now does.

## Still owed

🔴 `gripHeight`'s unequal-pair rule — step 3 of the dancer-size brief — is still open and is
still the reason the mean sat so far below the player's shoulder. `mean-shoulder` answers "where
does a punch land" without prejudging "what is fair between mismatched bodies".

And contact has moved up to shoulder height, which is a visible change to where a bump happens
and is the main thing to watch. **Nothing here has been watched.**
