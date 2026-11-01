# ADR-0075: react-hooks is pinned at 7.1.1 for ESLint 10, and its new findings are excepted by file
- Status: Accepted
- Date: 2026-11-01
- Deciders: Ryan ("accept ADR-0075", 2026-11-01; proposed by Claude)
- Supersedes: [ADR-0069](0069-the-react-hooks-exception-names-the-dance-files-that-write-from-a-frame-loop.md)

## Context
ESLint 10 clears GHSA-g3hv-75wg-m249 (stance review 11-01), and `eslint-plugin-react-hooks` first
supports it in 7.1. [ADR-0069](0069-the-react-hooks-exception-names-the-dance-files-that-write-from-a-frame-loop.md)
pins that plugin at exactly 7.0.1 and names the files excepted from its rules, so both need changing.

7.1.1 reports 73 new errors in 7 files, nearly all at the
[ADR-0002](0002-shared-refs-across-the-r3f-dom-boundary.md) boundary, on purpose or not:

| Rule | Errors | Files |
|---|---|---|
| `refs` | 55 | `App.tsx`, `DanceDebugScene`, `Review2Scene`, `Npc`, `Player`, `World` |
| `preserve-manual-memoization` | 10 | `DanceDebugScene`, `Review2Scene`, `VirtualJoystick` |
| `set-state-in-effect` | 6 | `App.tsx`, `VirtualJoystick`, `World` |
| `immutability` | 2 | `App.tsx` |

Two of the `set-state-in-effect` errors were one-line fixes, a lazy `useState` for touch detection in
`VirtualJoystick` and `App.tsx`'s `PocketHint`. So the exception for that rule covers only `App.tsx`
and `World.tsx`.

These errors weren't all examined for correctness. Some sites, such as `World.tsx:147` assigning a ref
during render, may be real faults that this pattern happens to tolerate.

## Decision
Pin `eslint-plugin-react-hooks` at exactly 7.1.1. Turn each remaining rule off only for the files that
trip it, by name, in `eslint.config.js`. Every other file, and every other rule on these files, stays
at error. Everything else in ADR-0069 stands: its writers' and readers' lists, and `exhaustive-deps`.

`App.tsx` joins an exception for the first time. It wasn't in ADR-0008's or ADR-0069's lists.

## Alternatives considered
- **Fix the sites.** Moving render-time ref writes into effects changes when they happen, on screens
  with no UI tests and a playtest already owed. It's the better end state, but it's a separate job.
- **Stay on ESLint 9.** This keeps the plugin at 7.0.1 and the minimatch ignore in both scanners.
- **Inline disables.** That's about 70 comments, in place of a list that shows the boundary's size.

## Consequences
- The boundary gains one file, `App.tsx`, and more rules on files already listed. That's the growth
  ADR-0008 wanted kept visible.
- New ref misuse in these files won't be reported, for these rules.
- **Promotion condition:** a file comes off the list when its state is restructured (ADR-0074's
  conditions for `App.tsx`), or the first time a defect is traced to a site these rules flagged. Then
  fix that file's sites, not only that one.
