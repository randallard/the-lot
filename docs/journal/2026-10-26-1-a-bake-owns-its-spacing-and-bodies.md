# 2026-10-26 (1) — a bake owns its spacing and its bodies

🧪 Exploratory, no ADR. Committed with 10-25-3. Corrects 10-25-3's "review 1 draws the
bake", which was checked on dials alone.

Ryan opened review 1 at `#review=california-twirl/under-arch/ryan-ryan` and sent a screenshot.
The pair stood apart and the belle's held forearm floated over the beau's head. 10-25-3 had
checked review 1 by comparing **dials** with the bake, and they matched. The dials were right; the
bodies they hang from weren't where the solve had them. **Two causes, both found in the browser:**

## 1. The engine walked a different gap

At beat 2, review 1's engine had the pair **171 cm** apart against the **91 cm** the solve was
captured on, so the hands missed by **94 cm**. It isn't the coin flip: review 1 gave 171 for every
style and for reshape and break alike. It's review 1's **over-the-centre** arch sizing
(`archOverCentre: true`, `archOverhead: 1` in its `DanceFloor` props, read off the live React
tree). That sizes the figure for hands over her crown at the midpoint, which bows the beau's
path out. `#review2` passes neither, and gave 91 on 8 remounts out of 8.

⚠️ **A measurement trap on the way:** `#review2` at exactly 50% sits on a stored keyframe, and
there it draws the keyframe even in the engine's mode (10-25-2). My first review2 reading was the
keyframe, not the engine. Readings between keyframes (48.75%, 26.25%) confirmed 91.

**Fix:**
- **A bake records how its figure was sized** (`sizing`: accommodation, overhead, close; the
  ryan → ryan twirl has `REVIEW2_SIZING`, a reshape with 0 and 0). `DanceFloor` finds bakes
  **before** sizing the arch, and sizes a baked call that way. Review 1's dials, its style
  buttons and the coin flip no longer move a baked call's paths.
- **A guard:** each keyframe carries the engine's gap the solve saw (`engine.gap`). Each frame,
  if the live engine is more than 5 cm off it, the bake is **left off** and the floor poses the
  call, rather than drawing hands that miss.

## 2. The floor reshaped the bodies under the solve's arms

With the gap fixed, the hands were still 56 cm apart at under-arch. Diffing every `readRigs`
value between the two screens at the same moment found only the torso lengths. The floor's
**reshape** for review 1's over-the-centre arch stretched the beau's torso to 1.40× and lifted
his rig 18 cm; it shrank hers to 0.78× and lowered it 10 cm. Review2's reshape is small (1.04× /
0.96×). The solve assumes none: it's done on the bodies as built.

**Fix:** `DanceFloor` decides **before the arms** whether the bake draws this frame. Under a
drawn bake it applies no reshape, duck or figure arm-stretch. The review's own stretch sliders
still apply, since they're drawn on top.

## Checked in a browser (review 1, ryan → ryan)

| step | apart | joined hands (centre to centre) | bodies |
|---|---|---|---|
| arch raised (beat 0) | 125 cm | 13.1 cm | built, no lift |
| quarter | 109 cm | 13.1 cm | built |
| **under-arch** | **110 cm** | **13.7 cm** | built |
| three-quarter | 103 cm | 13.0 cm | built |
| ending position | 140 cm | 13.0 cm | built |

- At under-arch the join is **1.5 cm** off the line over the belle's head and 52 cm above the
  head's centre. That's the twirl's moment, as review2 draws it.
- **The gable, duck and casual buttons all draw the same baked solve**, as intended.
- `#review2` between keyframes: the hands are held (about 15 cm) and every dial matches the bake
  within rounding.
- **The new panel line** in review 1, "baked solve: drawn / left off", says which one is on screen.
- **Rules still flag** the solve's stretch (upper arm 0.18–0.20 at under-arch; the solve allows up
  to 1.6×) and a 1–5 cm hand gap at quarter and end. These are the old rule ladder's limits, not
  clipping.
- **Colours:** in review 1 the beau is red and the belle blue (`DEBUG_COLORS` by dancer index).
- `tsc -b` is clean, and eslint is clean apart from the warning already at HEAD. `vitest`:
  38 failed (the same 38) / 1111 passed. The bake tests are now 11.

## Lesson

A pose check has to cover **what the pose hangs from**, not just the pose: spacing, body sizes and
the rig's height, as well as the dials. 10-25-3's check was the same narrow check 10-25-1 warned
about, one level up.
