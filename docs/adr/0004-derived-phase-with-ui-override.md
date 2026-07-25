# ADR-0004: Game state stores facts; the phase is derived, with a UI-only override
- Status: Accepted
- Date: 2026-07-25 — backfilled; decision taken 2026-03-06 (`f18fb40`)
- Deciders: Ryan

## Context
townage's tutorial is a sequence: spawn into the void, find one bot part, find a second, drag
them together, meet NPC Ryan, learn about the phone, reach free play. The obvious model is a
state machine with a `phase` field that each step advances.

That model rots in a specific way. `phase` and the underlying facts drift apart, and then
they contradict each other — the player has collected two parts but `phase` still says
`between-parts`, because some path forgot to set it. Every new branch is a new chance to
forget, and the bug is invisible until a player walks the unusual path.

But a purely derived phase can't express everything either. A cutscene, a modal, a speech
bubble, "the NPC is currently saying goodbye" — these are real UI states that no combination
of game facts implies. Deriving them would mean inventing facts (`isShowingPart1Cutscene`)
that exist only to be read back, which is the same drift problem wearing a different hat.

## Decision
Split the two. `GameState` stores **only facts**, and the phase the game "should" be showing
is **derived** from them:

```ts
// src/state/derivePhase.ts
export function derivePhase(state: GameState): DerivedPhase {
  if (state.partsCollected < 2 || !state.assembled) {
    if (state.partsCollected === 1) return { type: "between-parts" };
    return { type: "exploring" };
  }
  if (!state.tutorialComplete) return { type: "npc-waiting" };
  return { type: "free-play" };
}
```

Transient UI states go in a single nullable `phaseOverride` field, and the active phase is
the override when set, the derived phase otherwise:

```ts
export function getActivePhase(state: GameState): GamePhase {
  return state.phaseOverride ?? derivePhase(state);
}
```

`src/state/types.ts` opens with the rule as a comment: *"Source-of-truth game state — only
store facts, derive everything else."*

## Alternatives considered
- **An explicit `phase` field advanced by each step** — the drift problem above. Rejected.
- **A formal state-machine library** (XState or similar) — would give exhaustive transitions
  and visualisation, at the cost of a dependency and a modelling layer. The derived function
  is four branches; it did not earn a library. Still the right answer if the tutorial ever
  grows a genuinely graph-shaped structure.
- **Deriving everything, including modals** — would require inventing facts that are really
  UI state. Rejected as the same drift with extra steps.

## Consequences
- The four derived phases cannot contradict the facts, because they are recomputed from them
  on every render (`useMemo` in `useGameState`). Collecting a part *is* the phase change;
  there is no second call to keep in sync.
- **`phaseOverride` has become the larger half.** It started as cutscenes and now carries 19
  variants — every phone app (`phone-home`, `find-app`, `chat-app`, `settings-app`,
  `games-app`, `town-report`, `rank-detail`), the whole game-invite flow, and NPC dialogue
  beats. `DerivedPhase` still has four. The clean part of this decision is the small part; in
  practice `phaseOverride` is doing most of the work and behaves like a route, not an
  override. That is worth naming honestly.
- Overrides are deliberately **not persisted**: `loadPersistedState` forces
  `phaseOverride: null` on load, so a refresh mid-cutscene returns to the derived phase
  rather than restoring a modal with no context behind it.
- `phase.type` string comparison is now the main branching mechanism in `App.tsx`, including
  an eight-way `blocked` check in `togglePocket` and a six-way check for which phone screens
  the pocket button closes. Adding a phase means finding every such list.
- **Promotion condition:** if `phaseOverride` grows past roughly its current size, or the
  phone screens start needing history (a real back stack rather than each screen hardcoding
  its predecessor — `rank-detail` already carries a `from` field to fake this), split routing
  out from phase and supersede this ADR.
