# 2026-11-01 (3): the cast registry, and accessibility lint deferred

Ryan, on the two decisions left from [11-01 (2)](2026-11-01-2-the-lint-pass-reaches-zero.md):
*"2: defer it; 1: start it"*.

- [ADR-0072](../adr/0072-accessibility-lint-is-deferred.md) defers jsx-a11y and supersedes 0067.
  The latest release, 6.10.2, is from 2024-10 and its peer range stops at ESLint 9, so adopting it
  would block the ESLint 10 route to retiring the minimatch ignore. Revisit when a release supports
  ESLint 10, or when keyboard and screen-reader use of the overlays becomes a requirement. The
  stance review watches for it (`docs/reviews/README.md`, "In this repo").
- [ADR-0071](../adr/0071-every-cast-is-registered.md) adopts the registry and supersedes 0066.

## The count was 177, not 650

The grep in 11-01 (2) said about 650, because it matched `as` in prose and comments too. A count
over the TypeScript AST (`AsExpression` and `TypeAssertionExpression`, except `as const`, plus
`any` keywords) gave **177 casts, 0 `any`**. **86 went, and 91 are registered.**

## Replaced (86)

- **Untrusted data, read on trust.** These are the ones that mattered:
  - `npc-kings-chess-records` read storage `as Record<string, KingsChessRecord>`. It now uses
    `recordOf` with an `isKingsChessRecord` guard, like `npc-records`; the 10-31 (20) pass had
    missed it.
  - **Pending results' round winners** are a `string` straight from the game server, and were cast
    to the winner union. A round whose winner isn't a winner is now dropped, as `parseResults`
    drops it (`isWinner` is exported for this).
  - `VoiceTestScene`'s save reply is now checked for `path`.
  - Review2's stored view settings go through `readStoredJson` and `isRecord`.
  - Seven `as Record<string, unknown>` after a `typeof … === "object"` check became `isRecord`, in
    `baked-four`, `baked-tracks` (including `canonical`, which hashes bodies) and `pose-events`.
- **Event targets (11).** These became `instanceof` checks (`HTMLCanvasElement`, `Element`,
  `HTMLElement`, `Node`) with the same behaviour. `StartupNotification` still closes on a click
  outside it.
- **Tuple literals and copies (~20).** These became `satisfies [number, number, number]`, `Vec`,
  `[Arm, Arm]` and so on. `satisfies` gives the literal its tuple type and checks it, where `as`
  only asserted it.
  - `contact-move`'s two `"A" as RoleId` became `as const`, because `satisfies` let the property
    widen.
  - `ROUND` is exposed once as a typed `ROUND_AT: readonly number[]`, so the loops look indices up
    without a cast.
- **Tests (21).** `["california-twirl"] as never`, and the narrowing casts on `flattenSequence`'s
  result, existed only because the tests had re-typed square-one's output. Without them it all
  compiles against square-one's own types.
  - `standing-hold` takes `readonly CallName[]`.
  - `declared-hold`'s two hand casts became `handed()`, which throws on `"none"`. The cast had let
    "none" through silently.
  - The property test keeps its last state in a variable.
- **The rest:**
  - `body-sample`'s JSON round-trip clone became `structuredClone`.
  - `Array(size).fill(…)` became `Array.from` with a typed callback.
  - `reader.result` is checked with `typeof`.
  - `partsCollected + 1` is computed (0 → 1, otherwise 2).
  - The three mesh finders in `DanceFloor` and `pose-solids` check `instanceof THREE.Mesh`.

## Registered (91)

[`docs/any-registry.md`](../any-registry.md) has 12 shared reasons covering 71 casts, and 20
one-off casts (the Fisher–Yates swap is two casts on one line). Each site carries `/* cast: <reason> (ADR-0071) */` right after the cast. A script
inserted these from the AST end positions, so they're safe inside JSX; a second run found nothing
left to add. Kept on purpose:

- **21 `as 0 | 1` in the solver's hot loops.** Journal 10-31 (8) showed that changing a loop's
  shape costs bake time.
- **Review2Scene's `mats as THREE.Material[]`.** `instanceof THREE.Mesh` narrows to
  `Mesh<any, any>`, so without the cast the material is `any`, and the lint rejects every use of
  it. Narrowing with `instanceof THREE.Material` gives `any` too.

## The tier

**the README now claims provable-lite.** CI enforces the strictness bar in both halves at zero
warnings, plus the reducer properties in a green test job. The registry is listed separately, as
kept by review: CI doesn't check it.

## Verified

- `tsc -b`, `pnpm lint` (0 findings, `--max-warnings 0`), 1,240 tests (29 expected-fail, 3
  skipped) and the build all pass.
- The four-dancer RLT bake (ember/myco) is byte-identical apart from its date, at 6.1 s.

## Playtest additions (on top of 11-01 (2)'s list)

- King's Cooking records survive a reload.
- Async results with commentary still arrive.
- Review2's top panel and opacity are remembered.
- The voice test's "save to dev machine" works.
- The trinket arrow brightens on hover.
- The chat and choice bubbles still ignore clicks on their buttons and inputs.
- A backup still restores.
- A new board starts empty.

## Docs caught up, and a correction to 11-01 (2)

A docs check after this entry found three things behind:

- **`openapi.yaml` still described the old `api/support.ts`.** It now says a 400 covers an empty or
  non-string `email` or `message` (`minLength: 1` on both), and that `npcId` falls back to `ryan`
  when empty or not a string too.
- **PROGRESS's pick-up block still pointed at the 10-31 dance work.** It now leads with the playtest
  and the commit, then what the lint pass unblocked: eslint 10 with the minimatch override, and the
  vite 8 + vitest 5 evaluation.
- **The README didn't mention `openapi.yaml`.** It does now.

**Correction to 11-01 (2):** it says an empty `email` or `message` "is now a 400". An empty one
already was (`!email || !message`). What's new is a body that isn't an object (a 500 before) and a
non-string value (passed to Discord before).
