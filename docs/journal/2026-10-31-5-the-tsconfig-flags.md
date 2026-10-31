# 2026-10-31 (5): the tsconfig flags

Ryan: *"start on the tsconfig flags."* This is the second of the three steps before
provable-lite (ADR-1011).

`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitReturns` are now on in
`tsconfig.app.json` and `tsconfig.node.json`, and in a new **`tsconfig.api.json`**, referenced
from `tsconfig.json`. That last one means `api/npc-chat.ts` and `support.ts` are typechecked for
the first time; both were clean. **179 errors, 0 left.** I chose every fix so that runtime
behaviour stays the same, and none uses a non-null `!`, which the coming lint pass bans.

## How they were fixed

- **Optional props passed `undefined` (exact-optional):** the prop types now say
  `prop?: T | undefined`, which is the truth: callers pass `cond ? x : undefined`. That covers 30
  props in 16 files, plus two data types where `undefined` means "cleared":
  `layout.shoulderY` (BodyEditor's reset) and `Emote.loopCount` (∞). I didn't use conditional
  spreads.
- **Optional refs on R3F elements** (`ref={expression?.head}`, 10 in `Dancer.tsx` and `Npc.tsx`)
  became `ref={… ?? null}`. React treats a null ref the same as no ref.
- **Indexed reads that can't miss** got a guard that never fires, with a one-line comment
  (`if (!curr) continue; // i < n, so never`): the eye clip loop, emote keyframe sampling, Z
  bubbles, smoke, and the touches in VirtualJoystick and the three drag bubbles.
- **Better types instead of guards** where a type could say it:
  - `_inflated` is a `[MutablePart, MutablePart]` tuple.
  - `RANK_COLORS` and `RANK_VALUE` are keyed by `"S" | "A" | "B"`.
  - The bench legs are `as const`.
  - `m.bodies[1 - k]` became `[k === 0 ? 1 : 0]`.
  - EyeEditor maps `Object.entries` rather than re-reading `expressions[name]`.
  - `bubble-offset` uses `findIndex`.
- **BoardCreator** wrote into a copied grid by index; it now uses a `withCell(grid, row, col, v)`
  copy helper.
- **World's fist-bump constraint** is read once, from a function that throws if `fistBumpMove()`
  ever has no constraint.
- **`noImplicitReturns`:** two effects (SpeechBubble, AssemblyCutscene) return `undefined`
  explicitly on the path with no cleanup.
- **Tests:** a new `src/test/defined.ts`, `defined(value, what)`, throws with a message on a
  missing value (undefined or null), so a test fails where it read the value. It's used in
  contact-move (11), launch-game (8) and wheel-geometry.
- Two lookups gained a fallback that can't be reached: `getHappinessEmoji` (the level is already
  rounded to 0–4) and MoodSlider's focus row (the index is clamped).

## Checked

- `tsc -b --force`: 0 errors.
- `pnpm lint`: 0 errors, the same 25 warnings.
- `pnpm build` passes.
- `vitest run`, 8 runs: 7 gave 1,240 passed, 29 expected fail. **The first run had 1 failure, and
  I didn't capture which test it was. It didn't reproduce in the next 7 runs.** That's probably a
  timing-sensitive test. If it shows up again, note its name.

## Next

Lint `strictTypeChecked` plus `no-non-null-assertion`, `switch-exhaustiveness-check` and
`no-floating-promises` at error. The dry run found 2,756 findings in 173 files; re-measure it
after today's changes. Then ADR-0066's registry pass on the casts, then claim provable-lite.
