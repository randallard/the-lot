# ADR-0008: `react-hooks` compiler rules are excepted at the ADR-0002 ref boundary, not worked around
- Status: Accepted
- Date: 2026-07-25
- Deciders: Ryan

## Context
Standing up CI (the trailing half of the planning effort's ADR-0002 retrofit) meant running
`pnpm lint` as a blocking gate for the first time. It exits 1: **61 errors and 25 warnings**.

Thirty-five of those errors were mechanical — empty blocks, unused bindings, expression-
statement ternaries, a non-null assertion on an optional chain, an `any`. Those were fixed
outright. Five more were ordinary React issues unrelated to anything architectural
(`set-state-in-effect` in four components, a `preserve-manual-memoization` in `SettingsApp`);
those were fixed too, and one of them turned out to be hiding a real bug — `settingsActions`
memoized on `[onOpenBodyEditor]` while closing over `prefs`, so the keyboard shortcut for
"toggle AI responses" fired against stale preferences.

That leaves **21 errors that are not defects**. They are
`eslint-plugin-react-hooks` v7 — the compiler-aligned rule set — objecting to the shared-ref
pattern this repo adopted deliberately in
[ADR-0002](0002-shared-refs-across-the-r3f-dom-boundary.md):

| Rule | Count | Where | What it's objecting to |
|---|---|---|---|
| `react-hooks/immutability` | 13 | all of `src/world/`, plus `overlay/VirtualJoystick.tsx` | writing `out.current!.x = …` inside `useFrame` |
| `react-hooks/purity` | 2 | `world/Npc.tsx` | reading/mutating a ref during a render-adjacent path |
| `react-hooks/refs` | 6 | 5 overlay components | reading `tracker.current` inside a `requestAnimationFrame` loop |

The rules are right about the general case and wrong about this one. Mutating a caller-owned
ref inside `useFrame` **is** the ADR-0002 mechanism: it is how the R3F scene publishes
per-frame position, screen projection, and rush state to a DOM overlay without a `setState`
per frame. React's compiler cannot distinguish that from an accidental mutation, because at
the type level it is the same operation.

So the choice is not "fix the lint errors." It is: **change the architecture, or record that
the linter and the architecture disagree.**

## Decision
Configure the three rules **off at the boundary where ADR-0002 operates, and nowhere else**,
in `eslint.config.js`, with each override commented and pointing here:

- `react-hooks/immutability` and `react-hooks/purity` — off for `src/world/**/*.{ts,tsx}`
  (the R3F scene layer, which is entirely ref writers) and `src/overlay/VirtualJoystick.tsx`
  (the one overlay component that *writes* `inputDir`).
- `react-hooks/refs` — off for the five overlay components that read shared refs from their
  own `requestAnimationFrame` loops: `AssemblyCutscene`, `ChoiceBubble`, `MoodSlider`,
  `NpcChatBubble`, `SpeechBubble`.

Everywhere else the rules stay on at error severity. `react-hooks/exhaustive-deps` stays a
warning repo-wide (24 of them) — it does not block CI, and it is a genuine backlog rather
than an architectural disagreement.

**`eslint-plugin-react-hooks` is pinned to an exact `7.0.1`** (no caret), because this
exception list is calibrated against that version's rule attribution and a minor bump moves
it. `7.1.1`, swept in incidentally by an audit-driven `pnpm update` during this work, was
measured before being reverted: it reclassifies most `immutability` findings as `refs`,
raising that rule from 6 to 47 and extending it to `App.tsx` — which is fair, since `App.tsx`
is where every shared ref is created. It also surfaces 6 `set-state-in-effect` and 2
`preserve-manual-memoization` errors that are *not* the ref pattern and need real
restructuring in behaviour-critical paths (the game-return handler, the assembly cutscene
step machine). Adopting it is tracked in [`../PROGRESS.md`](../PROGRESS.md) as its own piece
of work with play-testing, not a drive-by inside a CI change.

## Alternatives considered
- **Change the pattern** — replace shared refs with a store (Zustand/Valtio) or R3F's own
  state, which the rules would accept. This supersedes ADR-0002 and rewrites the seam between
  the scene and every overlay component. It is a real option and possibly the right long-term
  one, but doing it *now* would land a large refactor immediately before M4 builds
  `src/dance/` on top of that exact seam. Wrong order.
- **Disable the rules repo-wide** — one line, and it would have been dishonest. The rules
  would then also be off in ordinary React code where they catch real bugs, and nothing would
  record why. The `SettingsApp` bug above is direct evidence that this rule family earns its
  keep outside the ref boundary.
- **Per-line `eslint-disable` comments** — 21 of them, each restating the same reason, none
  linking to the decision. Scattered suppression with no single place to reverse it.
- **Leave lint non-blocking in CI** — a gate that does not gate. It would have hidden the 35
  mechanical errors and the 5 real ones too.

## Consequences
- CI can go green today without pretending the disagreement is resolved. The exception is
  visible in one file, scoped to named paths, and explained.
- **The exception is load-bearing on the file layout.** It is scoped by path, so a new
  overlay component that reads shared refs in an rAF loop will fail lint until it is added to
  the list. That friction is deliberate: it makes the boundary's growth *visible* rather than
  automatic, and each addition is a small prompt to ask whether the pattern is still paying
  for itself.
- **This is live evidence for ADR-0002's own promotion condition.** That ADR said to revisit
  when the ref plumbing outgrows itself, and named `src/dance/` placing N ∈ {2, 4, 8} dancers
  as the likely trigger. The tooling is now answering the same question independently: React's
  compiler is telling us this pattern is outside what it can reason about. Two signals
  pointing the same way.
- **A pinned linter is a cost, and it is the smaller one.** Holding `7.0.1` means not getting
  new rules until someone does the upgrade deliberately. The alternative was landing 47
  reclassified findings and 8 real refactors inside a CI change, with no way to play-test the
  paths being touched. The pin is sequencing, not avoidance — the exact impact is measured and
  written down above.
- **Promotion condition:** when M4's `<DanceFloor>` needs per-dancer refs for a variable-size
  cast, do not extend the exception list to cover it. That is the moment to reach for a keyed
  registry or a store, supersede ADR-0002, and delete this ADR's exceptions along with it.
- If `eslint-plugin-react-hooks` later ships a way to annotate an intentional
  externally-owned-ref boundary, prefer that over path-scoped suppression and supersede this.
