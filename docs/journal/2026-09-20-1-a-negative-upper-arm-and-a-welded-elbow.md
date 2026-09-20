# 2026-09-20 (1) — A negative upper arm, and a welded elbow

Ryan, on `#review=california-twirl/stand/player-myco`: *"without any of the testing checkboxes
they're way far apart and should be holding hands."* The screenshot is the pair a full body
apart with their arms hanging at their sides.

They are not far apart. **They have let go.**

## The couple that let go

The Twirl's `stand` step does not stand the pair at their handhold's width — it stands them at
`sizeArch(...).width` (`DanceFloor.tsx`). When neither accommodation fits inside the couple's
own width, and no forearm length within `SHAPE_BOUNDS` rescues it, `sizeArch` takes its last
resort (`arch.ts`, ADR-0040): *"a pair who have let go are not held to a handhold's width, so
they stand at **twice** the room they need."*

Reproduced headlessly with the layout Ryan had on screen (`shoulderY −0.26`,
`upperArmSpacing −0.40`) on **both** dancers:

| | handhold width | stance | strain | beau tilt | belle tilt | |
|---|---|---|---|---|---|---|
| both at −0.26 / −0.40 | 0.801 | **1.602** | 0.533 | 180° | 180° | **let go** |
| myco alone at −0.26 / −0.40 | 0.835 | 0.864 | 0.409 | 0.0° | 180° | holds |

Exactly `2 ×`, both forearms pointing straight up. That is the picture.

## 🔴 `upperArmSpacing` is a length, and negative inverts every reach budget

It is not a gap. `computePositions` returns it verbatim as `upperArmLength`, and `armMetrics`
spends it as **`elbowReach`** and inside **`wristReach`** — both of them radii. Negative, three
things go wrong at once and none of them errors:

- **`touchSpanAt`** — how far sideways a hand reaches with the elbow still hanging in the
  shoulder's own plane — computes `gap = |drop| − elbowReach`. At `−0.40` that **adds** 0.40 to
  the gap it is meant to subtract, so `gap ≥ 0.40` against a drawn forearm of 0.24 and it
  returns **0**. The `arms` term in `placeHold` collapses and the stance drops to the bodies
  floor.
- **`wristReach` = `upperArmSpacing + forearm.height` = −0.16.** `bandedHeight` squares it, so
  the band of heights the pair can reach shrinks to a hand's width about the shoulder.
- **`handReach` = `shoulderY − handCenterY` = −0.04** — the hand computes out *above* the
  shoulder.

The model has no representation for an arm whose elbow is above its shoulder, and it says so by
producing numbers rather than by refusing.

✅ **`SHAPE_BOUNDS.layout.upperArmSpacing.min` is now `0`, was `−0.50`.** **No authored
character is affected** — the cast runs 0.10 (Sprout) to 0.33 (NPC, Myco, Ember, Ryan), player
0.22. Only a `localStorage` shape that had already been dragged negative, and the bound is not
retro-clamped on load: `migrate` merges saved layout values through untouched.

⚠️ **`0` itself is legal and still degenerate** — see below. The bound stops the arithmetic
going backwards; it does not make every value in range a good one to author.

## Where the dials land once the arm is a length again

Swept against the player at defaults, Myco at arm width 0.39 / head gap −0.40.
`stance == handhold width` means the arch fits with no reach and no let-go; flatness target is
`FLAT_ENOUGH` 0.25:

| shoulderY | upperArm | handhold | stance | strain | belle tilt | flatness | floor clamp |
|---|---|---|---|---|---|---|---|
| 0.15 | 0.05 | 0.905 | 0.905 | 0 | 4.1° | **0.019** | silent |
| 0.15 | 0.08 | 0.905 | 0.905 | 0 | 4.1° | **0.018** | silent |
| 0.10 | 0.12 | 0.905 | 0.905 | 0 | 5.9° | **0.018** | silent |
| 0.05 | 0.08 | 0.905 | 0.905 | 0 | 10.2° | 0.675 | silent |
| 0.05 | 0.33 *(shipped)* | 0.835 | 0.966 | 0 | **128.5°** | 0.018 | fires |
| −0.26 | −0.40 | 0.835 | 0.864 | 0.409 | **180.0°** | 0.170 | — |

🔑 **There is a diagonal in it.** As the shoulder drops, the upper arm has to shorten with it to
keep `clearFloor` quiet (ADR-0055's pairing) — but flatness wants the upper arm *longer*. The
two cross at **shoulderY 0.10–0.15 with upper arm space 0.05–0.12**, which is the band that
satisfies both. ADR-0055's recommended 0.08 clears the floor clamp but leaves the palms
edge-on at flatness 0.675.

`partnerForearmGap` stays negative (−0.02 to −0.05) everywhere in the table. That is the open
structural foul `hold-metrics.ts` already documents, and no layout dial reaches it.

## 🔴 Noted, not fixed: hand height does not bend Myco's elbow

Ryan, on the hand-height dial: *"it doesn't seem to bend the elbow, just move it up — I would
think the upper arm would angle and move the elbow back but it's staying on the same plane as
the other elbow."*

**The dial works. Myco has no upper arm to bend.** Her `upper arm space` is at `0.000`, so
`elbowReach` is 0 and the elbow is welded *to* the shoulder. Probed, with the player as beau:

| dial | beau elbow z | belle elbow |
|---|---|---|
| baseline | −0.0005 | (0.410, 0.550, 0.000) |
| hand height +8cm | **−0.1331** | (0.410, 0.550, 0.000) |
| hand height +16cm | **−0.1805** | (0.410, 0.550, 0.000) |
| hands fwd +21cm | +0.0878 | (0.410, 0.550, 0.000) |

Characters face local `+z`, so the beau's elbow goes **back** by 0.13 at +8cm of hand height —
which is exactly the behaviour Ryan expected, happening on the other dancer. Belle's elbow is
her shoulder `(0.410, 0.550, 0.000)` at every dial. The review readout says so out loud:
**upper arm off hang `37.5° / 0.0°`**.

Two paths reach that same place and both are correct given a zero-length upper arm.
`touchPose`'s `Math.abs(along) >= upper` is true for any `along` when `upper` is 0, so every
handhold falls through to `reachPose`; and `reachPose`'s elbow sphere has radius 0, so the
elbow lands on the shoulder. Her forearm alone then has to cover the whole shoulder-to-hand
span, which is why it swings to 145.8° — up and over — instead of folding.

🔑 **So this is not a defect in the dial, and the fix is the authoring fix above**: give her a
real upper arm in the 0.05–0.12 band and the elbow has somewhere to go. Left unfixed and
recorded per Ryan's *"don't fix that yet, just note it."* The open question it does leave is
whether the **editor** should say something when an arm is authored to zero — nothing in the
Layout panel tells you that you have just welded a joint.

## 📌 Task for later: the `sizeArch` last resort

Ryan: *"each move should start from the same 'stand' — let's set a task for later to hone that
sizeArch last resort — that isn't great."*

Two things, and they are the same thing seen from both ends:

1. **The `stand` step should be one pose.** Today it is whatever the figure it belongs to says
   it is, because `DanceFloor` sizes the stance through `sizeArch` for a Twirl. A pair who
   cannot make the *arch* are stood apart at the *standing couple* step, before the arch
   exists. The standing couple is a fact about two bodies; it should not change because of what
   they are about to dance.
2. **"Let go and stand at twice the room" is too blunt an answer.** It is correct as a last
   resort and it is reached far too readily — it is a cliff, not a degradation, and the pose it
   produces (the full body apart, arms down) reads as a bug rather than as an accommodation.
   ADR-0040 is the decision to revisit.

## State

`body-shapes.ts` only: the `upperArmSpacing` bound, plus the note explaining why the floor is
where it is. Uncommitted with the rest of 09-19. Suite **31 failed / 741 passed**, identical to
the working tree without the change — no dance code reads the bound, only `BodyEditor`'s slider.

**Next:** Ryan sets Myco to a real upper arm in the 0.05–0.12 band and says whether
`player/myco` reads right at the `stand` step.

---

**He did, the same day — `upperArmSpacing 0.10`, `shoulderY 0.11`, and a shorter forearm and
smaller hand besides.** It reads right, it is now `MYCO_DEFAULTS`, and it turned her into the
cast's first genuine short-arm case. See
[`2026-09-20-2`](2026-09-20-2-mycos-arm-is-a-diversity-case-now.md) — including the two
regressions it surfaced in the fist bump and the forearm hold, which the review route does not
cover.
