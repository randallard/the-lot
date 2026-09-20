# 2026-09-19 — A lever that moves two things

Session run on Claude Sonnet 5. Picked up cold from Ryan's own `008c86e` (uncommitted-to-docs
at session start): `layout.shoulderY`, an optional per-character override for where the arm
attaches, with Myco set to `0.05` and `SHAPE_BOUNDS.layout.shoulderY` at `{ min: -0.20, max:
1.50 }`. Ryan's ask: the slider needs to go lower, because Myco's head overlaps her body.

## Two bugs found chasing that, in order

**1. `waistY` was riding on the now-overridable `shoulderY`, dragging the couple's hold height
down with it — fixed.** `computePositions`' `waistY` (`src/services/body-shapes.ts`) used to be
`shoulderY * WAIST_OF_SHOULDER`, safe only because `shoulderY` always equalled `bodyTop` before
today. Once it's an independent override, lowering Myco's shoulder also lowered her `waistY` —
and `arm-pose.ts`'s `touchHold` aims the couple's joined-hand height at the taller dancer's
`waistY` (ADR-0046). Confirmed by writing a `shoulderY: -0.5` override into `localStorage`
(`townage-body-shapes`) and reloading `#review=california-twirl/stand/player-myco`: her hold
arm retracted into her own body instead of reaching for "you"'s hand. **Fixed**: `waistY` now
comes off `bodyTop` (the body's own proportions), not `shoulderY`. Zero new test failures —
30 failed/157 passed in the five touched test files, identical before and after, all
pre-existing pins from Ryan's other uncommitted work today.

**2. Widening the bound to `-1.00` (my first move) was wrong — reverted.** With that bound and
a low value, Myco's *other* arm — the idle/resting one, not the hold — reads as a forearm
plunging straight into the ground. Traced with real numbers, not by eye: dynamically
`import()`ed `body-shapes.ts` and `arm-pose.ts` in the browser console and called
`computePositions`/`armMetrics` directly on her live shape. At `shoulderY: -0.5` her shoulder
lands at local `Y ≈ 0` (her own floor level), and `DanceFloor`'s idle "outside hand" pose
(`restPose`, `aimY: -1`) hangs a **fixed-length straight line down from the shoulder with no
floor clamp** — elbow at `-0.33`, hand at `-0.69`. The floor is an opaque plane at world
`y ≈ 0` (`DanceReviewScene.tsx:663`), so the hand computes to ~0.7 below it and gets cut off —
visually: a stub that plunges into the ground and vanishes.

This isn't Myco-specific or value-specific — it's structural. The idle-arm hang was always safe
because `shoulderY` was always `bodyTop` (comfortably positive for the whole cast); an
independently-lowered shoulder will hit this for any character, at a threshold that depends on
that character's own `upperArmSpacing` + forearm length + hand radius, not a single shared
constant. **Reverted the bound back to `-0.20`**, left a comment with the numbers so the next
attempt to widen it knows what breaks first, and deliberately did **not** touch the idle-arm
pose logic itself (`DanceFloor.tsx`, the `restPose`/`aimY` block) — it carries Ryan's own
comment dated today, mid-flux on the same function, and making it floor-aware is a design call
(bend the elbow? clamp the drop? something else?), not a bounds tweak.

## What's still open, unstarted

🔴 **Ryan's actual original ask — Myco's head overlapping her body — is still unaddressed.**
`shoulderY` never touches it; `computePositions` keys `headCenterY` off `bodyTop +
headBodyGap`, independent of `shoulderY` by design (see the field's own doc comment). The
lever is `layout.headBodyGap`, currently `-0.4` for Myco and called out in her `MYCO_DEFAULTS`
comment as intentional. Whether to relax it is Ryan's call, not made yet.

🔴 **The idle-arm floor-clamp problem is diagnosed, not fixed.** If a lower `shoulderY` is
still wanted (post headBodyGap decision, or independently), the idle "outside hand" pose needs
to stop assuming a fixed-length straight hang. No candidate approach chosen yet — floor-clamp
the drop, bend the elbow, or something else. Same file/block as the 2026-09-19 wrist comment
already in `DanceFloor.tsx` around the `restPose`/`aimY` handling.

## State at handoff

Uncommitted, `src/services/body-shapes.ts` only (two changes, both described above): the
`waistY` fix (keep) and the bounds revert + warning comment (keep). Nothing else in the
session's `008c86e` touched — that commit is Ryan's own, already landed.

**Model switch:** this session ran on Sonnet 5. Next attempt continues on Opus.
