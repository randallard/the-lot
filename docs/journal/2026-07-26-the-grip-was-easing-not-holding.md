# 2026-07-26 — the grip was easing, not holding

*Fourth entry for the day. It corrects a claim in
[the third](2026-07-26-the-grip-is-horizontal-and-tracked.md): that entry says the joined
forearms are pinned to the pivot and only rotate. That was true of the **pose**, and false
of the **render**. Documents `028541e`.*

Ryan, watching the overlay: *"I'm watching the numbers along move and the gap move so I don't
think you're seeing what's happening — the forearm is staying a fixed distance from the body
along the horizontal plane while the body moves towards and away from the other dancer, and
the other dancer's forearm is doing the same so the forearms are sliding towards and away
along the other forearm."*

He was right, and he'd also correctly reverse-engineered the symptom from four digits of
readout. My verification was measuring the wrong object.

## What was actually happening

`arm-geometry.test.ts` sampled `poseArms` beat by beat and asserted the grip was rigid. It
is. But the driver did not *use* that pose — it eased the rig **toward** it, ~10% per frame:

```ts
arm.position.x += (pose.x - arm.position.x) * ease;
arm.quaternion.slerp(target, ease);
```

Replaying the driver's own loop at 60 fps tells the real story:

| | should be | actually was |
|---|---|---|
| `hand↔pivot` | constant 0.191 | **0.151 → 0.248** |
| `along` (A on B) | constant 0.40 | **0.21 → 0.57** |
| `gap` | always ≤ 0 | **−0.117 → +0.055** — let go twice per breath |

Two things make the lag much worse than "0.1 s behind":

1. **The target moves fast in the frame it is expressed in.** The pose is rig-local, and the
   rig is turning at 90°/s. So even a stationary grip is a *fast-moving* local target, and a
   first-order lag on a fast-moving target is a large positional error.
2. **Each dancer's lag pivots on their own shoulder, not the shared pivot.** So the two lags
   are different transformations, and the difference between them is precisely relative
   motion between the two forearms — sliding, and periodically letting go. Ryan's description
   of the mechanism ("staying a fixed distance from the body") is exactly what a heavily
   lagged local pose looks like: an arm glued to its dancer rather than to the pivot.

## The fix: ease the blend, not the pose

The pose is now written **exactly** — `position.set`, `setFromUnitVectors` — every frame. The
only eased quantity in the channel is a per-arm **grip blend weight**: 0 free, 1 joined,
first-order toward the target with `advanceGripBlend`, and it **snaps** at the ends. The snap
matters as much as the blend: a weight resting at 0.999 leaves the arm a hair off the pivot,
and a hair off the pivot is what slides.

So engaging and releasing are smooth (that is where a blend belongs), and a held grip is
rigid to the last decimal. `poseArms` takes the blend and no longer takes the grip hand at
all — the engine's `Motion.grips` reaches the pose only through the weight, which is a
cleaner seam than it sounds: *what* is held is engine data, *how far into holding* is
animation state, and nothing else in the channel is allowed to lag.

Verified by replaying the driver loop over the whole call: every joint's distance from the
pivot constant to 1e-6 across all 158 held frames, and `gap` ≤ 0 on every one of them.

## The real lesson is about instrumentation

The bug survived a suite that asserted the exact property it violated, because every
assertion sampled the *intent* (`poseArms`) rather than the *result* (the rig). Two changes,
both of which Ryan asked for before I understood why:

- **A test that replays the driver's frame loop** — `describe("driven frame by frame")`,
  at 60 fps, blend and all. This is the only test in the file that could have caught it, and
  the distinction it draws (intent vs. render) is worth keeping in mind for every future
  channel: *if the driver transforms what a pure function returns, the pure function's tests
  do not cover the driver.*
- **A readout built for drift, not for values.** The overlay printed instantaneous numbers;
  Ryan had to watch them move and infer a mechanism. It now prints **min → max since the grip
  engaged**, with the spread, per quantity:

  ```
  separation      1.104 →  1.562   ±0.229
  a hand↔pivot    0.191 →  0.191   ±0.000
  a along         0.400 →  0.400   ±0.000
  a gap          -0.082 → -0.082   ±0.000
  ```

  `separation` is *supposed* to breathe; every other row being flat is the contract, and a
  non-zero spread is now the defect, visible without staring. Plus **markers in the scene**:
  black at the pivot, blue at each elbow, red at each hand — a held grip looks nailed to the
  black dot while the bodies swing past it.

## What the third entry got right, and keeps

The model is unchanged and confirmed: horizontal, antiparallel forearms, hand at elbow,
pinned to the pivot, the undrawn upper arm as the compliant link that absorbs the pair's
breathing. It just wasn't happening. Ryan's *"the forearms need an anti-breathe while the
steps breathe the bodies"* is a description of what the fix delivers — the arms hold their
station while the bodies move.
