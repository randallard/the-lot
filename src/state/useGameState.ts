import { useState, useMemo, useCallback, useEffect } from "react";
import type { GameState, PhaseOverride, GamePhase, Board, BoardMove, CellContent, ResumePoint } from "./types";
import { INITIAL_STATE } from "./types";
import { derivePhase, getActivePhase } from "./derivePhase";
import type { GameResults } from "../services/parse-results";
import { arrayOf, isBoolean, isNumber, isRecord, isString } from "../services/json-guards";

const STORAGE_KEY = "townage-game-state";

// The saved state is read field by field (json-guards.ts): an older save, a hand edit or another
// build's data keeps what's valid, and each field that isn't falls back to INITIAL_STATE's.
const isCell = (v: unknown): v is CellContent => v === "empty" || v === "piece" || v === "trap" || v === "final";
const isMove = (v: unknown): v is BoardMove =>
  isRecord(v) && isRecord(v.position) && isNumber(v.position.row) && isNumber(v.position.col) &&
  (v.type === "piece" || v.type === "trap" || v.type === "final") && isNumber(v.order);
const isBoard = (v: unknown): v is Board =>
  isRecord(v) && isString(v.id) && isNumber(v.boardSize) && isNumber(v.createdAt) &&
  Array.isArray(v.grid) && v.grid.every((row) => Array.isArray(row) && row.every(isCell)) &&
  Array.isArray(v.sequence) && v.sequence.every(isMove);
const isResumePoint = (v: unknown): v is ResumePoint =>
  v === "opponents-list" || v === "game-select" || v === "board-creation";
const isPartsCollected = (v: unknown): v is GameState["partsCollected"] => v === 0 || v === 1 || v === 2;

function loadPersistedState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (!isRecord(parsed)) return INITIAL_STATE;
      // If returning from a game with NPC Ryan, bring him back immediately
      // (must happen before first render so the Npc component doesn't start walking to camp)
      const returningNpc = localStorage.getItem("townage-playing-npc");
      const returningFromRyan = returningNpc === "ryan";
      console.log("[loadState] returningNpc:", returningNpc, "parsedRelaxing:", parsed.npcRelaxing, "→ npcRelaxing:", returningFromRyan ? false : parsed.npcRelaxing);
      const bool = (v: unknown, fallback: boolean) => (isBoolean(v) ? v : fallback);
      return {
        partsCollected: isPartsCollected(parsed.partsCollected) ? parsed.partsCollected : INITIAL_STATE.partsCollected,
        assembled: bool(parsed.assembled, INITIAL_STATE.assembled),
        npcSpoken: bool(parsed.npcSpoken, INITIAL_STATE.npcSpoken),
        tutorialComplete: bool(parsed.tutorialComplete, INITIAL_STATE.tutorialComplete),
        boards: arrayOf(parsed.boards, isBoard),
        phaseOverride: null,
        gameResults: null,
        npcRelaxing: returningFromRyan ? false : bool(parsed.npcRelaxing, false),
        resumePhase: returningFromRyan || !isResumePoint(parsed.resumePhase) ? null : parsed.resumePhase,
      };
    }
  } catch {}
  return INITIAL_STATE;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadPersistedState);

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Derived values
  const phase = useMemo<GamePhase>(() => getActivePhase(state), [state]);
  const derivedPhase = useMemo(() => derivePhase(state), [state]);
  const inventory = useMemo(() => {
    const items: string[] = ["phone"];
    if (state.partsCollected === 1) items.push("trinket");
    if (state.assembled) items.push("bot-parts");
    return items;
  }, [state.partsCollected, state.assembled]);

  // Actions — all return complete state replacement
  const collectPart = useCallback(() => {
    setState((prev) => {
      const next: GameState["partsCollected"] = prev.partsCollected === 0 ? 1 : 2;
      const override: PhaseOverride =
        next === 1 ? { type: "part1-cutscene" } : { type: "assembly-cutscene" };
      console.log("[collectPart] partsCollected:", prev.partsCollected, "→", next, "override:", override.type);
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
    console.trace("[npcWalkAway] showBye:", showBye);
    setState((prev) => {
      if (prev.npcRelaxing) return prev; // already relaxing

      // Figure out resume point from current state
      let resumePhase: ResumePoint | null = null;
      const p = prev.phaseOverride;
      if (p?.type === "opponents-list") {
        resumePhase = "opponents-list";
      } else if (p?.type === "game-select") {
        resumePhase = "game-select";
      } else if (p?.type === "board-creation") {
        resumePhase = "board-creation";
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

      let override: PhaseOverride;
      if (resume === "opponents-list") {
        override = { type: "opponents-list" };
      } else if (resume === "game-select") {
        override = { type: "game-select" };
      } else {
        // "board-creation", the last ResumePoint.
        override = { type: "board-creation" };
      }

      return {
        ...prev,
        npcRelaxing: false,
        resumePhase: null,
        phaseOverride: override,
      };
    });
  }, []);

  const completeTutorial = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tutorialComplete: true,
      phaseOverride: null,
    }));
  }, []);

  // Skip the full tutorial — after assembly reveal, jump straight to free-play
  const completeIntro = useCallback(() => {
    setState((prev) => ({
      ...prev,
      npcSpoken: true,
      tutorialComplete: true,
      phaseOverride: null,
    }));
  }, []);

  // Skip parts collection entirely — jump straight to free-play state
  // Used when player returns from a game and wants to challenge an NPC directly
  const skipToFreePlay = useCallback(() => {
    setState((prev) => ({
      ...prev,
      partsCollected: 2,
      assembled: true,
      npcSpoken: true,
      tutorialComplete: true,
      npcRelaxing: false,
      resumePhase: null,
      phaseOverride: null,
    }));
  }, []);

  const saveBoard = useCallback((board: Board) => {
    setState((prev) => ({
      ...prev,
      boards: [...prev.boards, board],
    }));
  }, []);

  // Launch a game against an NPC — sets phase to launching-game and sends Ryan to camp
  const launchGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      npcRelaxing: true,
      phaseOverride: { type: "launching-game" },
    }));
  }, []);

  // Bring NPC back from camp to stand near the player (e.g. returning from game)
  const bringNpcBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      npcRelaxing: false,
      phaseOverride: null,
      resumePhase: null,
    }));
  }, []);

  // Receive results from spaces-game via URL hash
  const receiveResults = useCallback((results: GameResults) => {
    setState((prev) => ({
      ...prev,
      gameResults: results,
      phaseOverride: { type: "npc-commentary" },
    }));
  }, []);

  // Clear results and return to free-play
  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      gameResults: null,
      phaseOverride: null,
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
    completeTutorial,
    completeIntro,
    skipToFreePlay,
    saveBoard,
    launchGame,
    bringNpcBack,
    receiveResults,
    clearResults,
    setPhaseOverride,
    clearOverride,
  };
}
