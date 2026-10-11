# 2026-10-11 (1) — the solid is its own corners

Ryan looked at [yesterday's](2026-10-10-2-the-rules-are-asked-of-the-meshes.md) verdict box on
`#review=california-twirl/under-arch/player-ember` — the first time the checker ran in front of
anybody. It measured (it left *not measured yet*), and of nine lines it printed he called five
right, two wrong, and two expected-so-not-a-breach.

## His reading, line by line

| line | Ryan |
|---|---|
| Ember's left hand 0.404 across own midline | *"she's in an L with that arm so that's expected"* |
| Ember's left elbow 0.071 across own midline | *"correct … well at times it will be across the midline"* |
| Ember's left forearm 0.152 into own head | **wrong** — *"the angle or polygons or whatever — you can see there is space"* |
| you's right forearm 0.084 into own head | correct |
| you's right hand 0.047 short of partner left hand | true |
| you's right upper arm stretched 0.030 | *"true, probably"* |
| Ember's left upper arm stretched 0.368 | *"not sure about the stretch — might be ok"* |
| Ember's body 0.014 off the floor | **wrong** — *"pretty sure ember's body is not off the floor"* |
| you's right hand 0.010 into partner left forearm | correct |

And of yesterday's calls: *"most of your calls are good — I think the forearm stretch is ok but
leave it up for review — can we list all stretch and shrink and give me a dial to play around for
those?"*

## The two wrong lines were one mistake: the checker rounded the picture off

It read the meshes' *positions* and then measured the **shapes they stand for** — a forearm as a
round tapered capsule, a head as a sphere, a torso as an upright capsule.

- **Ember's forearm is drawn with three sides and a flat end** (`radialSegments: 3`). A round cone
  of the same nominal radius is twice as thick across a flat, and the capsule approximation put a
  0.1 dome on the elbow end besides. That is the 0.152.
- **Ember leans 14°** (`leanX`). A leaning torso's lowest point is not under its centre, and the
  feet rule compared it to an upright one. That is the 0.014 — she was "off the floor" standing
  still.

🔑 **So a solid is now its mesh's own vertices** (`Hull`, `pose-solids.ts`'s `hullOf`), in world
space, through the mesh's own matrix — nothing named, nothing rounded. The cast is low-poly on
purpose and by different amounts per character (a head is anywhere from 3 to 32 segments), so the
only solid that matches the picture is the picture's corners.

Two convex solids are apart by the widest gap any direction shows and overlapping by the
narrowest overlap any direction shows — one number, `signedGap`, found by trying 320 directions
and then closing in round the best. It is a search: good to about a millimetre, and it can only
*miss* the best direction, so when it is wrong it calls a pose tighter than it is. Tested against
boxes (exact), finely drawn spheres, and the three-sided-forearm case in miniature.

The feet rule's `standY` is now where the torso bottoms out **in the shape it is wearing, at the
lean it has**.

## The side rule was asked of the wrong arm

Both midline lines were about the arm Ember is turning under. A dancer passing beneath their own
raised arm crosses it as a matter of course. The 09-21 defect the rule comes from was the belle's
**down** arm changing sides. So `PoseContext.raised` names the arm in an arch and the side rule
skips it; every other arm is still held to it. The hand half also changed: a hand breaks the rule
when it is *wholly* across, no corner left on its own side.

## Stretch and shrink: a list, and a hand on each

A purple dashed box under the verdict. Per dancer, three sliders in cm — **torso**, **forearm**,
**upper arm** — and beside the first two the amount the dancer is actually wearing, figure and
dial together, read back off the floor. So a slider at 0 with a number beside it is the figure's
own choice (the reshape, the duck, the reach). Under them, how far the pose has pulled each
undrawn upper arm past its length, red over 1cm. Live on every step, not only the arch.

`DanceFloor` takes `stretch?: [Stretch, Stretch]`; `TrackedArms` gains `forearmDelta` and
`upperArmNatural`; `accommodation.ts` gains `growUpperArm`.

🔴 **The dials change the shape a dancer wears, not the figure's sizing.** `sizeArch` and
`planArch` have already decided where the pair stand and where the hands aim. A dial shows what
the arms can do with more or less body *at that stance*; it does not re-solve the stance. That is
the right first version — it isolates one thing — and it is a limit to know about.

🔴 **The forearm stretch is still not a violation, and is now visible.** Ryan: *"I think the
forearm stretch is ok but leave it up for review."* It is in the list; `length` still checks the
upper arm only.

## State

The 10-10 checkpoint that [10-10 (1)](2026-10-10-1-the-rules-check-and-ryan-poses.md) records
is `4fd341d` (source) and `8602437` (docs); that entry was written before either existed.

`pose-rules.test.ts` 27 tests. Suite **934 passing / 38 failing** (the same 38), `tsc -b` clean,
eslint 0 errors. Everything since the 10-10 checkpoint is uncommitted: `pose-rules.ts`,
`pose-solids.ts`, their test, and edits to `DanceFloor.tsx`, `DanceReviewScene.tsx`,
`accommodation.ts`.

🔴 **Unseen again.** The rewrite and the dials have not been looked at. My own Chrome tab still
runs no frames.

🔴 **Cost.** The checker runs every frame `onArms` is set — about eighty solid pairs, each a few
hundred directions over the meshes' vertices. Fine for one floor. The contact sheet is 25 floors
and will need it run on a pose change rather than every frame.

## Open, for Ryan

- **Ember's upper arm stretched 0.368.** ADR-0058 says the L is a rotation that keeps the humerus
  its exact length. Either this pairing is not in that case (the hold is asked for past her reach
  and something gives) or the reading is off. The upper-arm slider is the experiment: if +37cm
  zeroes it and the pose looks the same, the pose was always borrowing that length.
- Whether a **raised** arm wants any side rule at all — e.g. the elbow may cross but the hand may
  not end up *behind* her.

## Next

1. Ryan re-reads the box on the same cell: the two wrong lines should be gone, the two midline
   lines gone, the other five still there.
2. Then the contact sheet.
