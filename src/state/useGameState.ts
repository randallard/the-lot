import { useState, useMemo, useCallback } from "react";
import type { GameState, PhaseOverride, GamePhase, Board } from "./types";
import { INITIAL_STATE } from "./types";
import { derivePhase, getActivePhase } from "./derivePhase";

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  // Derived values
  const phase = useMemo<GamePhase>(() => getActivePhase(state), [state]);
  const derivedPhase = useMemo(() => derivePhase(state), [state]);
  const inventory = useMemo(() => {
    const items: string[] = ["phone"];
    if (state.partsCollected === 1) items.push("trinket");
    if (state.assembled) items.push("bot-parts");
    if (state.appInstalled) items.push("gettcheese-app");
    return items;
  }, [state.partsCollected, state.assembled, state.appInstalled]);

  // Actions — all return complete state replacement
  const collectPart = useCallback(() => {
    setState((prev) => {
      const next = Math.min(prev.partsCollected + 1, 2) as 0 | 1 | 2;
      const override: PhaseOverride =
        next === 1 ? { type: "part1-cutscene" } : { type: "assembly-cutscene" };
      return { ...prev, partsCollected: next, phaseOverride: override };
    });
  }, []);

  const completeAssembly = useCallback(() => {
    setState((prev) => ({
      ...prev,
      assembled: true,
      phaseOverride: { type: "assembly-reveal", step: "they-fit" },
    }));
  }, []);

  const markNpcSpoken = useCallback(() => {
    setState((prev) => ({
      ...prev,
      npcSpoken: true,
      phaseOverride: null,
    }));
  }, []);

  const installApp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      appInstalled: true,
      phaseOverride: { type: "installing" },
    }));
  }, []);

  const completeTutorial = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tutorialComplete: true,
      phaseOverride: null,
    }));
  }, []);

  const saveBoard = useCallback((board: Board) => {
    setState((prev) => ({
      ...prev,
      boards: [...prev.boards, board],
    }));
  }, []);

  const setPhaseOverride = useCallback((override: PhaseOverride | null) => {
    setState((prev) => ({ ...prev, phaseOverride: override }));
  }, []);

  const clearOverride = useCallback(() => {
    setState((prev) => ({ ...prev, phaseOverride: null }));
  }, []);

  return {
    state,
    phase,
    derivedPhase,
    inventory,
    // Actions
    collectPart,
    completeAssembly,
    markNpcSpoken,
    installApp,
    completeTutorial,
    saveBoard,
    setPhaseOverride,
    clearOverride,
  };
}
