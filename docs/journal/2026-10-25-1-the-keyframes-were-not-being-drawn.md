# 2026-10-25 (1) — the loaded keyframes weren't being drawn

🧪 Exploratory, no ADR. **Uncommitted**, with the rest since 10-19.

Ryan loaded the 8 cm and 2 cm solves from [10-24-5](2026-10-24-5-more-clearance-and-the-small-standards-gaps.md):
*"now these all look the same to me when I load and play"*, the belle's arm still clips, and the
beau's hand *"is moving spastically"* between 37% and 40%.

## Load was fine

📂 load merges, and at each moment the newest `keyframe-set` wins (`reduce` sorts by `at`). The
store held all four solves (10-24 21:24, 10-25 03:04, 12:29, 12:32), 41 keyframes each, with
nothing locked. Clearing first isn't needed.

## Three faults between the keyframe and the screen

Found by reaching the live scene from the page (`_roots` from the app's own
`@react-three/fiber` module) and comparing `readRigs` against the stored keyframe at the same
`t`.

1. **`PoseOverride` found no dancers.** It looked for direct children of `couple:<id>` named
   `dancer`. 10-24's *turn around each loop* wrapped them in a rotation group, so it found none
   and applied nothing. **Nothing Ryan loaded since then was drawn**: what he saw was the floor's
   own pose, which is why every margin looked the same. The 37–40% twitch is the floor's own 122°
   forearm jump at t 0.375, measured in 10-24-4. Fix: `getObjectsByProperty("name", "dancer")`,
   as the read path at line 200 already did (`Review2Scene.tsx:234`).
2. **The hand sat beside the forearm.** With 1 fixed, the held forearms still drew 10–20° off in
   pitch (beau's right: keyframe 38.8°, drawn 20° at t 0.5). The floor's solve leaves the hand
   mesh 16–18 cm off the elbow group's axis (`hand.position` ≈ (0.16, −0.48, 0)), per ADR-0054.
   `applyToRigs` turned the elbow group but kept that offset, while `readRigs` (and the solver)
   measure elbow → hand. Fix: a dialled forearm direction puts the hand on the axis at its current
   reach (`pose-dials.ts`). After both fixes, every dial draws within **0.5°** of its keyframe at
   t 0.25, 0.375, 0.5 and 0.75, which is the rounding.
3. **The hand's turn wasn't in the keyframes,** so it came from the floor's pose each frame. Fix:
   `toDials` writes `hand-*.bend/side/roll = 0` (straight along the forearm). Only new solves
   carry it. The committed bundle is re-solved at 6 cm with it.

The solver's sizes match the drawn meshes: head r 0.34, forearm r 0.058 (the drawn cylinder's top
radius), hand r 0.11 (a flattened sphere drawn, so the model's full sphere is conservative).

## Not fixed: playback eases in and out of every keyframe

`sampleTrack` applies `ease` (smoothstep) on each span, so with 41 keyframes the motion slows to
a stop 40 times in a move. For hand-placed keyframes that's right. For a dense solved track it
pulses. If that shows on screen, the fix is linear (or Catmull-Rom) between keyframes closer than
some spacing.

## Tests

`whole-move`, `pose-dials` and `review2-session`: 28 passed. `tsc -b` and eslint are clean on the
three files. The 24 failures at HEAD from 10-24-5 are untouched.
