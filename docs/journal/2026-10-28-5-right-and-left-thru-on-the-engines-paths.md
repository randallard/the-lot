# 2026-10-28 (5): Right and Left Thru on the engine's paths

🧪 Exploratory, no ADR. **Uncommitted.** It needs square-one's unreleased facing couples (its
journal 26). It runs here through the link (`scripts/link-engine.mjs`), and commits after square-one
releases 0.7.0 and the pin moves.

Ryan: *"go with 2 - leave 1 for later - this looks great"*: spec facing couples and Right and Left
Thru in square-one, and swap this repo's hand-written paths (10-27-8) for the engine's. Mixed sets
wait.

## The swap (`whole-move-rlt.ts`)

`rightAndLeftThru` now samples `applyCallToFacingCouples("right-and-left-thru", set)` instead of
writing paths:
- **Frame:** the engine's frame at scale 1 is metres (`makeFrame`, `toWorld`,
  `facingToRotationY`). The first couple faces the engine's −y, which is the floor's +z, so they
  start where they always did, gent at +x. The yaw is unwrapped so a facing past 360° doesn't spin.
- **6 beats, not 8:** CALLERLAB's from facing couples (pull-by 2, courtesy turn 4). The `#review2`
  figure and its five moments are retimed (0, 0.7, 2.5, 4, 6), and `#solve4`'s "/ 8" is the
  solve's own length. The 8 was the squared-set figure.
- **What stays here is the bodies:** each couple's width (`touchHold`, now each its own); the
  set's arm-aware passing lane, passed as the engine's new **set clearance**; how close the turn
  closes (`bodyLane`, as the hand-written turn did, passed as each couple's clearance); and the
  holds.

## What it took

Each of these was found by solving, one cast after another:

| found | fix | where |
|---|---|---|
| The pull-by is 2 beats now, not 3.5, so a half-beat minimum hold started the hands while short arms were still far apart (myco stepped 45 cm forward at beat 0) | the-lot's pull-by times scaled by 2/3.5: at least 0.3 beat, let go 0.06 before level, start handhold off by 0.3 | here |
| Passing the arm-aware lane as each couple's clearance meant the turn never closed: his right arm crossed her forearm (sprout–player, 1.2 cm) | the **set** has its own clearance beside each couple's | square-one |
| Closed to the partners' own clearance, a big gent with a small lady flipped his arm over (85°) | close to the widest bodies' clearance in the set, as before | here |
| The turn faced the path walked, and the bowing circle turned the couple 67° in its last beat | `orbit`'s `unit: true`: square to the line between them | square-one |
| With her level beside him, his hand had to go behind his own back to reach hers | **the lady a little ahead** again: a torso and a hand's breadth, as the hand-written turn had it, laid on the engine's path | here |
| Ember–sprout: shoulder 1.40 m, her back 0.52 m, arm 0.94 m. He reaches it only at the turn's tightest, and a fixed window flipped his arm (93°, 29 cm short) | his hand goes to her back **while he can reach it** (shoulder within 95% of his arm), within beats 2.5–5.5 | here |

## Re-baked, all 25

**Clip 0 in every set**, hands within 2.5 cm, jumps 16–26°, steps 6–36 cm. Compared with the
hand-written paths (10-28-4):
- Ember ×4's jump went from 37° to 20°.
- The two that clipped (sprout–player 1.2 cm, sprout–ryan 0.5 cm) don't any more.
- Steps run a little wider (up to 36 cm against 33).

`baked-four.test.ts` checks a bake is as long as the figure that plays it.

Watched in Chrome at `#review2=right-and-left-thru/ryan-ryan`. The bar reads "/ 6". Beat 0 is
the handhold. At 0.6 the right hands reach across. At 2.4–4.2 each couple turns close, side by
side, square to each other. At 6 they're in the handhold on the other's line.

`npx tsc -b` clean; vitest 38 failed (the known ones) | 1143 passed; the one lint warning is
`DanceFloor`'s, from before.

## Next

1. Ryan looks. Then square-one commits, releases 0.7.0 and is pushed, the pin moves here, and
   this commits.
2. Mixed sets (later, Ryan's call): a cast picker, baked on demand or in a worker.
3. Whether the engine's Courtesy Turn should put the lady ahead itself.
