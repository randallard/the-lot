import type { GameState, GamePhase, DerivedPhase } from "./types";

export function derivePhase(state: GameState): DerivedPhase {
  if (state.partsCollected < 2 || !state.assembled) {
    if (state.partsCollected === 1) return { type: "between-parts" };
    return { type: "exploring" };
  }

  if (!state.appInstalled) return { type: "npc-waiting" };
  if (!state.tutorialComplete) return { type: "app-ready" };
  return { type: "free-play" };
}

export function getActivePhase(state: GameState): GamePhase {
  return state.phaseOverride ?? derivePhase(state);
}
