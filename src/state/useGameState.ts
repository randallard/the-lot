import { useState, useMemo, useCallback } from "react";
import type { GameState, PhaseOverride, GamePhase, Board, ResumePoint } from "./types";
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

  const setNpcRelaxing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      npcRelaxing: true,
      phaseOverride: { type: "npc-bye" },
    }));
  }, []);

  // Player walked away — figure out where they were and save it
  const npcWalkAway = useCallback((showBye: boolean) => {
    setState((prev) => {
      if (prev.npcRelaxing) return prev; // already relaxing

      // Figure out resume point from current state
      let resumePhase: ResumePoint | null = null;
      const p = prev.phaseOverride;
      if (p?.type === "tutorial-chat") {
        resumePhase = { type: "tutorial-chat", step: p.step };
      } else if (p?.type === "waiting-app-click" || p?.type === "npc-nudge") {
        resumePhase = "waiting-app-click";
      } else if (p?.type === "installing") {
        resumePhase = "waiting-app-click";
      } else if (prev.appInstalled && !prev.tutorialComplete) {
        resumePhase = "waiting-app-click";
      } else if (!prev.appInstalled) {
        resumePhase = "need-phone";
      }

      return {
        ...prev,
        npcRelaxing: true,
        resumePhase,
        phaseOverride: showBye ? { type: "npc-bye" } : null,
      };
    });
  }, []);

  // Player returned to NPC — resume where they left off
  const resumeFromNpc = useCallback(() => {
    setState((prev) => {
      const resume = prev.resumePhase;
      if (!resume) return { ...prev, phaseOverride: null };

      let override: PhaseOverride | null = null;
      if (resume === "need-phone") {
        override = { type: "need-phone" };
      } else if (resume === "waiting-app-click") {
        override = { type: "waiting-app-click" };
      } else if (typeof resume === "object" && resume.type === "tutorial-chat") {
        override = { type: "tutorial-chat", step: resume.step };
      }

      return {
        ...prev,
        npcRelaxing: false,
        resumePhase: null,
        phaseOverride: override,
      };
    });
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
    setNpcRelaxing,
    npcWalkAway,
    resumeFromNpc,
    installApp,
    completeTutorial,
    saveBoard,
    setPhaseOverride,
    clearOverride,
  };
}
