# 2026-10-25 (3) — baked tracks: the solve on every floor

🧪 Exploratory, no ADR. **Uncommitted.** Follows [10-25-2](2026-10-25-2-play-my-keyframes.md).

Ryan watched the 6 cm solve in "play: my keyframes": *"that's gorgeous."* Next he wants it to
**persist into review 1 and later exercises**, then go to the other dances and to new characters,
with about **20 couples** on the floor at once in the end. The plan is in the effort
(`work/square-dance-planning/briefs/solve-the-whole-move.md`, "The plan from here"). This entry is
**path A, steps 1–2**: a bake format, and `DanceFloor` drawing it.

## The idea

Every screen draws through `DanceFloor`: `#review`, `#dance`, `#review2`, and the game later on.
So the solve goes there once, rather than living in one browser's IndexedDB and being drawn only
by `#review2`'s `PoseOverride`.

## What was built

- **`src/dance/baked-tracks.ts`** (+10 tests). A bake is one call for two bodies: 41 keyframes of
  arm and hand dials, plus each dancer's **step off the engine's path in their own frame**
  (`<d>.offset.x/z`, cm). The step is relative, not the couple-frame spot, because the solver keeps
  the engine's facing and moves only the beau's spot. That way a bake fits wherever a couple
  stands and whichever way it faces (a second Twirl in a sequence, a ring, a square in town).
  - **Matched by geometry, not by name.** A bake carries `bodyPrint`, a hash of each body as the
    solver sees it (`bodyOf`). A reshaped body doesn't get someone else's arms; it falls back to
    `arm-pose.ts`. Colour and eyes don't change the print.
  - **Linear between keyframes, not smoothstep,** so a dense track doesn't pulse.
- **`scripts/whole-move/bake.ts`** turns a `#review2` bundle and the paths it was solved on into
  `src/dance/baked/<call>.<pairing>.json`. It folds the timeline the way `#review2` does (`reduce`,
  `pairingTimeline`), so an export of hand-edited or locked keyframes bakes the same way.
  - Baked: **`california-twirl.ryan-ryan.json`**. The beau's step is 26.3 cm at most and the
    belle's is 0.0 everywhere, which shows the frames line up.
- **`useDancePerformance`** returns `steps` (each call's beat span). That's what tells a sequence
  which call it's in.
- **`DanceFloor`**: for a two-dancer floor, it finds the bake for each call (`findBake`, memoised),
  then every frame samples it at the call's fraction and applies it (`applyBaked`).
  - **Order:** after the floor's read-back, so the floor's own tracking carries on from its own
    pose. Before the pose rules, so they measure what's drawn.
  - New prop `baked` (default on) turns it off, to compare with the floor's own pose.

## Checked

- **In a browser, review 1** at `#review=california-twirl/under-arch/ryan-ryan` (beat 2) draws
  the bake. The beau's right raise is 164° (bake 164.3) and forearm pitch 38° (38.0). The belle's
  left raise is 180° (179.6) and forearm pitch 37° (37.4).
- The browser's `ryan` prints the same as the default (`f3edec85`).
- `tsc -b` is clean. eslint is clean on the touched files; the one warning, `DanceFloor.tsx` `shapes`
  dep, is there at HEAD too.
- `vitest`: 38 failed / 1110 passed. The failures are the same 38 as 10-24-5, plus 10 new tests,
  all passing.

## Worth knowing

- **`#review2`'s "play: the move as solved" now includes the bake** (it's the same `DanceFloor`).
  For ryan → ryan, both play modes now show the solve, and the label's trap is mostly gone.
- **Review 1's style buttons (gable / duck / casual) don't change a baked pairing.** The bake
  is one solve, and the styles steer `arm-pose.ts`, which the bake overrides. If styles are kept,
  each style is its own solve.
- The floor still runs `arm-pose.ts` underneath a bake. With 20 couples that's wasted work, and
  skipping it for baked calls is the obvious saving once frame time is measured.
- Only **two-dancer floors** take bakes, as with the arms today.
