# 2026-11-01 (2): the lint pass reaches zero, and the configs swap

Ryan: *"pick up the lint pass in the-lot"*. It started at 81 strict findings (79 errors, 2
warnings) in 22 files ([10-31 (20)](2026-10-31-20-services-and-overlays.md)). **It's now at 0.**
`eslint.strict.config.js` is folded into `eslint.config.js` and deleted, and `pnpm lint` is
`eslint . --max-warnings 0`, so CI enforces strictTypeChecked, ADR-1011's three rules and
ADR-0070's two options with zero warnings. Uncommitted, waiting on Ryan's playtest.

## What changed, by kind

- **Checked index reads (34 `!`).** `baked-tracks`, `baked-four`, `pose-dials`, `couple-disk`,
  `whole-move-figure` and `whole-move-rlt` each get the local, unexported `nth` from 10-31 (8): a
  `RangeError` naming the file instead of a crash on `undefined`. They're local because an
  imported helper was 5× slower in the bakes.
  - `couple-disk`'s `refocus` no longer reads by index at all: each candidate pair carries its spot.
  - `whole-move-figure`'s `o.trade!` became a `const trade`, which TypeScript narrows inside the
    callback.
  - The two scenes that map one array and index another (`SolveFourScene`, `SolvedFloor`) skip an
    unpaired entry. That never happens: both arrays are made with the same length.
  - `main.tsx` throws a named error if `#root` is missing.
- **Untrusted JSON, two more places.**
  - **`useGameState`'s saved state was `JSON.parse(saved) as GameState`.** It's now read field by
    field with `json-guards.ts`: `isBoard`, `isMove`, `isCell`, `isResumePoint`, and
    `partsCollected` as 0, 1 or 2. Each invalid field falls back to `INITIAL_STATE`'s, and a bad
    board costs only that board. A valid save loads exactly as before. The lint finding was the
    `?? false` on `npcRelaxing`, which the cast made look dead but which really did protect old
    saves.
  - `review-store` did the same with `value as Partial<ReviewRecord>`; it now uses `isRecord`.
  - `api/support.ts` reads its body with npc-chat's `field` pattern. **Two small behaviour
    changes** there: a non-string or empty `email` or `message` is now a 400 (it was a 500, or
    passed straight to Discord), and an empty `npcId` becomes "ryan" (it was sent as "").
- **Dead conditions (26).**
  - `pose-solids`: three's `Matrix4.elements` is a 16-tuple, so the twelve `?? 0` were dead.
  - `DanceFloor`: `keys.length === 2` inside a block that had just checked it, and `seekTo !== null`
    already implied by `seeking`.
  - `FistBumpDriver`: its `request` and `drivenArms` refs are always created with a value (App,
    World).
  - `World`: `playerPos` is created with a Vector3.
  - `Npc`: "walking-to-camp" re-checked inside its own branch. The smoke refs never hold null.
  - `Player`: `animController?.current?.` became `?.current.`, and the rush target is captured
    once, so the `!` went.
  - `useGameState`'s last `else if` is a plain `else`.
- **`DanceReviewScene`'s `unbuiltStyle` was always false.** All three turn-under styles have
  poses now. Rather than delete the guard, it became `BUILT_STYLES`, a set. A new style added to
  `TurnUnderStyle` then shows as unbuilt on its own, which is what the guard was for.
- **Unnecessary casts (9).** Seven object-literal casts in `FistBumpDriver`'s scratch were really
  unnecessary. **The rule was wrong about the eighth:** dropping `as RoleResolution` widens
  `side: "right"` to `string`, and `tsc` fails. It's now a typed factory, `freshResolution()`, not
  a cast. One cast in `sound-alike` was unnecessary too.
- The rest:
  - `pose-events`: `Scope | string` became `Extract<Scope, object> | string`.
  - `review-store`'s `delete` became a filtered copy.
  - The test `localStorage` mock is a `Map`. It keeps `|| null`, so a stored `""` still reads as
    absent, as before.
- **The last 2 warnings (`exhaustive-deps`).**
  - `DanceFloor`: `shapes` was an extra dep of a memo that reads only `coupleWidthWorld` and
    `scale`. The value is the same, and it's recomputed less often.
  - `World`: the part-1 spawn effect is meant to run once, deciding from `partsCollected` at
    mount. That's now `const [resuming] = useState(() => partsCollected >= 1)` with
    `[resuming]` as its deps, so it re-runs exactly when it did before (never).

## Verified

- `tsc -b`; `pnpm lint` (strict, `--max-warnings 0`) exits 0; 1,240 tests pass, 29 expected-fail,
  3 skipped; the build passes.
- **The bakes are byte-identical apart from the date stamp.** The four-dancer
  `right-and-left-thru` (ember/myco and ryan/player, about 6 s each, unchanged) goes through
  `whole-move-rlt` and `baked-four`. The pair `california-twirl` ember/myco (meet and break)
  goes through `baked-tracks`. The committed files were restored afterwards.

## Needs a playtest (no UI tests cover these)

- A fresh start: part 1 spawns on Enter or click, or after the delay. A resumed save: it doesn't
  spawn.
- Reload with boards saved: they're all still there, and resume-where-you-left-off still works.
- Rush mode: the fade, and the walk to the target. An NPC walking to camp sits down when it
  arrives. Campfire smoke.
- A fist bump with an NPC.
- The support form sends (`api/support.ts`, only on a deploy or `vercel dev`).
- The dance review panel: ratings load, and "clear" removes one. `#solve-four` and the solved
  floor draw all four dancers.

## What's next: the two decisions that were tied to this change

ADR-0066 (the cast registry) and ADR-0067 (jsx-a11y) both say "with the strict lint pass".
Sized today:

- **The registry:** roughly 490 casts in `src/` and `api/`, and 160 in tests (a rough grep, not
  a count of sound vs unsound). That's several sessions, not one change.
- **jsx-a11y 6.10.2** (a trial install, reverted): **96 findings in 28 files**, 48
  `no-static-element-interactions` and 47 `click-events-have-key-events` (clickable `div`s), plus
  1 `no-autofocus`. Its latest release is from 2024-10, and its peer range stops at ESLint 9, so
  adopting it **blocks the eslint 10 move** that would retire the minimatch ignore (stance review
  11-01).

Provable-lite isn't claimed yet: the README waits on the registry (PROGRESS).
