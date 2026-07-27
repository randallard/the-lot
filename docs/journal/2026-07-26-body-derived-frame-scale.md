# 2026-07-26 — Body-derived frame scale: the full editor range dances

_Step 1 of the dancer-size plan from the planning effort's
[dancer-size and accessibility brief](../../../work/square-dance-planning/briefs/dancer-size-and-accessibility.md).
Decision recorded as [ADR-0011](../adr/0011-frame-scale-derives-from-occupant-bodies.md),
superseded the same day by [ADR-0012](../adr/0012-pair-clearance-from-the-3d-silhouette.md).
Documents `028541e`, with the three entries that follow it._

## What changed

The brief's "immediate defect" — the body editor can produce dancers who physically cannot
pass each other — is closed at the transform layer, without touching square-one and without
clamping `SHAPE_BOUNDS`.

- **`frame.ts`**: `minScaleFor` generalized. Clearance is a pair property, so the new
  primitive is `minScaleForPair(r1, r2) = (r1 + r2) / (2 × ENGINE_LANE_OFFSET)`;
  `minScaleFor` is now its symmetric case. `SCALE_MARGIN = 1.1` names the margin the 2.2
  default always carried over its 2.0 floor. `scaleForBodies(radii)` picks the square's
  scale: never below `DEFAULT_SCALE`, growing to `SCALE_MARGIN × minScaleForPair(widest,
  second-widest)` when the cast demands it.
- **`DanceFloor.tsx`**: when no explicit `scale` prop is given, the frame's scale is
  `scaleForBodies` over the occupants' body radii. The occupant-shape cycling was hoisted
  into a memo (`occupantShapes`) so the scale and the render use the same cast. An explicit
  `scale` remains an override and may let bodies intersect — the prop doc says so.
- **`DanceDebugScene.tsx`**: a "bodies" switch (default / mixed / max) that dresses the pair
  in `SHAPE_BOUNDS` extremes, keyed on `DanceFloor` so the frame rebuilds. `mixed` is a
  0.60 + 0.10 pair (the brief's large-adult-and-small-child case, scale ≈ 2.57); `max` is
  two 0.60s (scale 4.4, double the default footprint).
- **`frame.test.ts`**: the new cases — one wide dancer breaks the default scale, the mixed
  square clears every real pair, order-independence, the lone-dancer and empty cases, and
  the margin constant equalling `DEFAULT_SCALE / minScaleFor(0.3)` exactly.

Later the same day, after Ryan's first look at the scene (it renders!): **pause and a beat
clock**, for screenshotting against the simulated-position tables. `useDancePerformance`
exposes the stepper's `beat` as a getter; `DanceFloor` grew `paused` (freezes the clock,
dancers hold pose mid-move) and `onBeat` (per-frame callback — refs/DOM only, no state); the
debug HUD grew a ⏸/▶ button and a `beat n.n / total` readout written via `textContent`
(ADR-0002's idiom: a 60 fps clock must not become 60 fps React renders).

## Two finds from Ryan's paused screenshots

**The face dot was on the back of the head.** Ryan read the paused Dosado as "dancers facing
the wrong way" and suspected the marker, not the maths — correctly. Proof without a
screenshot: townage's heading convention `rotation.y = atan2(dir.x, dir.z)` (`Player.tsx:151`)
points local **+z** along the heading, and the cast's eyes sit at `+eyeZOnSphere` — so
characters face local +z, and `Dancer.tsx`'s marker at `−z` was a face on the back of the
skull. Its comment had misapplied the *world* mapping ("engine +y is world −z") to
mesh-local space; `facingToRotationY` already owns that mapping. Fixed: marker at +z,
anchored to the true head center so it survives caricature head offsets. **The choreography
was right all along** — every facing check in the M4 list needs a re-watch now that the faces
are honest.

**The footprint is not the body capsule** (`footprintRadius`, `body-shapes.ts`; tests in
`body-shapes.test.ts`). Ryan's screenshot showed arms crossing into each other's space and
heads on course to collide — "caricature deviations from reality," which he wants kept. The
resolution splits the silhouette:

- **Rigid parts drive spacing.** `footprintRadius` = max horizontal reach of the leaned body
  capsule and the offset head, radially (the disc a turning dancer sweeps). `DanceFloor`
  feeds it to `scaleForBodies` instead of `body.radius`. Caricature stays; the square
  breathes out for big heads exactly as for wide bodies.
- **Arms stay out of spacing, on purpose.** Real dancers brush arms; arm contact is the
  tactile channel. Spacing that kept arm envelopes apart would keep dancers from ever
  touching. Deep visual crossing is *pose* work — traditional Dosado styling is arms folded
  across the chest, and the driver already owes arm poses through `arm-actions` for
  grip-bearing blocks. That's the next "looking good" step.

Consequence to expect at the next render: **the default debug cast now dances at ~4.44, not
2.2** — Ember's head (0.44 radius, 0.28 forward offset → 0.72 footprint) and Myco's 0.49
head were silently clipping on Pass Thru before (their head height-bands overlap at
1.28–1.53). The roomier square is the honest one. Two refinements deliberately left on the
table: per-direction footprints (the brief's wheelchair question will force ellipses), and
height-band-aware pair clearance (a child's head passes under an adult's — would let mixed
squares stay tighter).

## The disc lasted three hours: ADR-0012

Ryan restarted the dev server, saw the 4.44 square, and called it: **"really far apart"** —
on the Allemande, on Dosado's back-to-back slide, on the pass. Both "refinements
deliberately left on the table" above turned out to be the difference between honest and
absurd, so they went in the same day and the disc came out
([ADR-0012](../adr/0012-pair-clearance-from-the-3d-silhouette.md) supersedes ADR-0011):

- `footprintRadius` (flat disc) → `rigidParts` + `lateralClearance` in `body-shapes.ts`:
  rigid parts as vertical segments with lateral radii; pair needs are the height-aware
  chord `√((r₁+r₂)²−dy²)`, and **forward overhang doesn't count** — dancers pass side-on,
  and Ember's forward-jutting head never narrowed any lane.
- `frame.ts`: `minScaleForGap` + `scaleForGaps` (pair gaps in, scale out); `scaleForBodies`
  deleted; `minScaleForPair` survives as the disc special case.
- Default cast: **~2.60** — binding pair is Myco's head against Ember's torso (0.71). Plain
  same-size dancers still get exactly the old body-diameter floor. The remaining Allemande
  sparseness at 2.60 is the missing joined-arm pose (`arm-actions` work), not spacing.

The residual risk ADR-0012 accepts, so it's said twice: forward reaches are laterally
unprotected — a future call whose ideal path brings dancers face-to-face closer than their
combined forward reach must re-check (no starter call does; facing distance is a full
engine unit).

## Dosado round two: the return should mirror the outbound

Ryan, after the round-one fix rendered: the outbound goes *diagonal* into the lane, so the
return "should do exactly the opposite from the other side and go diagonal back to the
starting position" — not straight back plus a sidestep correction. He asked for the
references to be checked, and CALLERLAB's Basic definition backs him word for word:
*"**Walking a smooth circular path** … slide **slightly** to the left to return to their
starting position."* Smooth path — no 90° corner at beat 5; slight slide — blended, not a
discrete step.

Fixed in square-one: `pass` gained a 3-beat **`close`** exit (back straight at half
walking pace, then a final-beat diagonal one lane toward the brushing shoulder — the
opening veer mirrored), Dosado became a three-block chain (2+1+3 = 6), and the
just-added `slide span: half` was removed the same day it appeared — its only consumer is
gone, and the definition says the closing lateral is walked, not stepped. 41 square-one
tests, 194 the-lot tests, all gates green. Full story in
[square-one journal 9](../../../square-one/docs/journal/2026-07-26-first-render-validation-9.md).

**Styling correction to an earlier claim in this journal:** the "traditional folded-arms
Dosado styling" mentioned under the footprint find is wrong — CALLERLAB explicitly notes
crossed arms are *not* recommended styling today (men: natural dance position; women:
skirt work). The tucked-arm passing pose remains the right *clipping* mitigation for
close passes, but it should read as natural arms, not a folded-arms figure.

## The grip channel: Allemande gets its arms

The block→pose plumbing (the "tougher win"). square-one's `Motion` gained **`grips`** —
per-beat hand-engagement spans (`{ hand, grip: "forearm", from, to }`; see square-one
journal 9) — and this repo's driver consumes it:

- **`Dancer`** exposes `arms` — refs to the two arm groups, named **anatomically**:
  characters face local `+z`, so the anatomical left arm is the `+x` group. Note the
  trap: that's the group the hand *styling* calls "right", because hand-pose naming is
  viewer-mirrored (same convention as the eye editor). Comments at both sites.
- **`DanceFloor`** per frame: if a dancer's motion has an active grip span, the named
  forearm slerp-aims at the **grip point** — the pair midpoint at averaged elbow height,
  which for an arm-turn is exactly the pivot its grip-centred frame orbits. No span →
  slerp back to rest. Ease rate `dt × 10`; scratch vectors module-level (no per-frame
  allocation). Two-dancer squares only — partner resolution for larger sets arrives
  with formations.
- Deliberately **not** routed through `services/arm-actions.ts`: that is the canned
  keyframe/emote system, and grip aiming tracks a live target. Choreography owns the
  engaged arm the same way it owns transform and facing — one more input for the
  pending ADR-0010 blend contract.

**What to check at the render:** Allemande Left should show each dancer's **left**
forearm raised toward the shared centre for the whole turn, releasing smoothly on the
step-out; Dosado and Pass Thru keep natural hanging arms throughout (their `grips` are
empty — F2's hands-free-is-a-fact). If the *wrong* arm raises, the anatomical mapping
in `Dancer.tsx` is the place to look — swap `arms?.left`/`arms?.right`, one line.

The owed square-one tag is now **v0.2.0** (grips is new API), not v0.1.1.

All green: typecheck, eslint 0 errors, 186/186 tests.

## What this deliberately does not do

- **Local breathing.** One large dancer sets spacing for the whole square, even in moves
  not involving them. That refinement is square-one call-model Layer 2 (breathing,
  unimplemented) and hangs on the brief's question 1 — does the engine learn footprints.
  This bound is loose for mixed squares but never wrong.
- **Height.** The 0.10–2.00 height range is mechanically free (the dance is flat) but hand
  contact isn't: `computePositions` puts hands at body-derived heights, so an Allemande
  between a 2.00 and a 0.10 dancer has hands ~half a unit apart vertically. Real dancers
  solve it by the taller one reaching down toward the shorter dancer's comfortable reach.
  That's townage rendering work (step 3 of the plan) and also the foundation for the
  wheelchair adaptations, where hand contact *is* the motion.
- **Step cadence.** At adult-pair scale a small child covers a lot of floor per beat. Step 2
  of the plan is deriving step cadence from body size (ADR-0006 coefficients in the planning
  effort's sense) so small dancers visibly scamper rather than glide.

## Next steps

1. **Watch the render** — still the standing M4 next-action, unchanged. While there, flip
   the new "bodies" switch: `mixed` and `max` must show a visibly bigger square with
   everyone clearing on Pass Thru.
2. Step 2: size-derived step cadence.
3. Step 3: hand-contact height resolution.
4. The brief's question 1 (engine footprints) → engine breathing; ADR-0011 names this as its
   promotion condition.
