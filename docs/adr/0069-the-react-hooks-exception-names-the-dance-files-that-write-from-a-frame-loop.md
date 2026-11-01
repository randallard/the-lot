# ADR-0069: The react-hooks exception names the dance files that write from a frame loop, not `src/dance/**`
- Status: Superseded by [ADR-0075](0075-react-hooks-7-1-and-the-wider-ref-boundary.md)
- Date: 2026-10-31
- Deciders: Ryan (proposed by Claude, from the [2026-10-31 stance review](../reviews/2026-10-31-stance-review.md))
- Supersedes: [ADR-0008](0008-react-hooks-rules-excepted-at-the-ref-boundary.md)

## Context
[ADR-0008](0008-react-hooks-rules-excepted-at-the-ref-boundary.md) turned three `react-hooks`
compiler rules off at the [ADR-0002](0002-shared-refs-across-the-r3f-dom-boundary.md) ref boundary
"and nowhere else". It named the paths: `src/world/**` and `VirtualJoystick.tsx` for
`immutability` and `purity`, and five overlay readers for `refs`. Its promotion condition was:
"when M4's `<DanceFloor>` needs per-dancer refs for a variable-size cast, **do not extend the
exception list to cover it**."

That condition fired, and it was answered only in part. On 2026-07-25 (`291a44c`, the M4
choreography adapter), `src/dance/**/*.{ts,tsx}` joined the writers' list, with a comment citing
ADR-0011. That widened the list ADR-0008 had fixed, and no ADR recorded it. Meanwhile `DanceFloor`
did what the condition asked for the refs themselves: it builds one rig per dancer in a keyed
`useMemo` map (`DanceFloor.tsx:858-865`), not per-entity refs threaded through props.

The 2026-10-31 stance review measured what the directory-wide exception covers. Lint without it
gives **9 `react-hooks/immutability` errors in 5 files**, and every other file in `src/dance/`
passes with the rules on:

| File | Sites | What it writes |
|---|---|---|
| `DanceFloor.tsx` | 3 | a rig's position, the debug report's bake and pivot |
| `FistBumpDriver.tsx` | 2 | the driven-arm flags, the bump request's start time |
| `Review2Scene.tsx` | 2 | the orbit controls' target, the camera position |
| `DanceDebugScene.tsx` | 1 | a pivot marker's visibility |
| `SolveFourScene.tsx` | 1 | the clock's beat |

All nine write to a three.js object or a caller-owned ref from a frame loop. That's ADR-0002's
mechanism, which ADR-0008 already accepted in `src/world/`. None of them is the per-dancer prop
plumbing the promotion condition warned about.

## Decision
The writers' exception (`react-hooks/immutability` and `react-hooks/purity` off) names files, not
a directory. It covers `src/world/**`, `src/overlay/VirtualJoystick.tsx`, and these five dance
files:

- `src/dance/DanceDebugScene.tsx`
- `src/dance/DanceFloor.tsx`
- `src/dance/FistBumpDriver.tsx`
- `src/dance/Review2Scene.tsx`
- `src/dance/SolveFourScene.tsx`

The rest of `src/dance/` keeps the rules at error. Everything else ADR-0008 decided still holds:
- the readers' `refs` exception for the five overlay components;
- `exhaustive-deps` as a repo-wide warning;
- `eslint-plugin-react-hooks` pinned at exactly `7.0.1`, for ADR-0008's reasons.

A new dance file that writes from a frame loop is added to the list by name, in the same change
that needs it.

## Alternatives considered
- **Keep `src/dance/**`.** It's one line, but it exempts the reducers, solvers and test helpers
  that the rules can and should check. It also hides the boundary's growth, which ADR-0008 kept
  visible on purpose.
- **Fix the nine sites.** Each would need its writes moved behind a setter or a store. That is the
  ADR-0065 refactor's job, and doing it piecemeal inside the review scenes would touch behaviour
  that's being play-tested.
- **Per-line `eslint-disable` comments at the nine sites.** ADR-0008 rejected this: scattered
  suppression, with no single place to reverse it.

## Consequences
- The exception now covers exactly the files that need it, as ADR-0008 intended. `pnpm lint`:
  0 errors and the same 25 warnings as with the directory-wide exception.
- A new frame-loop writer in `src/dance/` fails lint until it's named here and in
  `eslint.config.js`. That friction is the point: each addition is a prompt to ask whether the
  pattern still pays for itself.
- ADR-0002 is answered for the dance floor (a keyed rig map) but not for the game
  (`src/App.tsx` threads `ScreenPos` refs, 50 references). ADR-0002 stays Accepted for the game
  until [ADR-0065](0065-state-is-managed-facts-managed-position-and-derived-values.md)'s refactor
  replaces it.
- **Promotion conditions, carried from ADR-0008:**
  - If `eslint-plugin-react-hooks` ships a way to annotate an intentional externally-owned-ref
    boundary, prefer that over path-scoped suppression and supersede this ADR. 7.1.1 is out;
    whether it adds such an annotation hasn't been checked.
  - When ADR-0065's store replaces the shared refs, delete these exceptions along with ADR-0002.
