import { useState, useMemo, useCallback } from "react";
import type { GameState, PhaseOverride, GamePhase, Board, ResumePoint, GameSession } from "./types";
import { INITIAL_STATE } from "./types";
import { derivePhase, getActivePhase } from "./derivePhase";
import { simulateRound } from "../game/game-simulation";
import { requestNpcBoard } from "../game/inference-client";

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
      if (p?.type === "tutorial-3d") {
        resumePhase = { type: "tutorial-3d", step: p.step };
      } else if (p?.type === "tutorial-demo") {
        resumePhase = { type: "tutorial-demo", step: p.step };
      } else if (p?.type === "tutorial-chat") {
        resumePhase = { type: "tutorial-chat", step: p.step };
      } else if (p?.type === "board-creation") {
        resumePhase = "board-creation";
      } else if (p?.type === "game-setup" || p?.type === "game-playing" || p?.type === "game-round-result") {
        resumePhase = "game-setup";
      } else if (p?.type === "game-over") {
        resumePhase = "game-over";
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
      } else if (resume === "board-creation") {
        override = { type: "board-creation" };
      } else if (resume === "game-setup") {
        override = { type: "game-setup" };
      } else if (resume === "game-over") {
        override = { type: "game-over" };
      } else if (typeof resume === "object" && resume.type === "tutorial-3d") {
        override = { type: "tutorial-3d", step: resume.step };
      } else if (typeof resume === "object" && resume.type === "tutorial-chat") {
        override = { type: "tutorial-chat", step: resume.step };
      } else if (typeof resume === "object" && resume.type === "tutorial-demo") {
        override = { type: "tutorial-demo", step: resume.step };
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

  const startGame = useCallback((boardSize: number) => {
    const session: GameSession = {
      opponentType: "npc",
      boardSize,
      rounds: [],
      currentRound: 1,
      totalRounds: 5,
      playerScore: 0,
      opponentScore: 0,
      playerBoard: null,
      opponentBoard: null,
    };
    setState((prev) => ({
      ...prev,
      currentGame: session,
      phaseOverride: { type: "game-setup" },
    }));
  }, []);

  const selectBoard = useCallback(async (board: Board) => {
    // Capture game state before async work
    let gameSnapshot: GameSession | null = null;
    setState((prev) => {
      if (!prev.currentGame) return prev;
      gameSnapshot = prev.currentGame;
      return {
        ...prev,
        currentGame: { ...prev.currentGame, playerBoard: board },
        phaseOverride: { type: "game-playing" },
      };
    });

    if (!gameSnapshot) return;
    const game = gameSnapshot as GameSession;

    try {
      const npcBoard = await requestNpcBoard(
        game.boardSize,
        game.currentRound,
        game.opponentScore,
        game.playerScore,
        game.rounds.map((r) => ({ round: r.round, playerBoard: r.playerBoard })),
      );

      // Run simulation
      const result = simulateRound(game.currentRound, board, npcBoard, game.boardSize);

      // Store both boards and the round result
      setState((prev) => {
        if (!prev.currentGame) return prev;
        const newRound = {
          round: prev.currentGame.currentRound,
          playerBoard: board,
          opponentBoard: npcBoard,
          playerPoints: result.playerPoints,
          opponentPoints: result.opponentPoints,
          winner: result.winner,
          steps: result.steps,
        };
        return {
          ...prev,
          currentGame: {
            ...prev.currentGame,
            playerBoard: board,
            opponentBoard: npcBoard,
            rounds: [...prev.currentGame.rounds, newRound],
          },
          phaseOverride: { type: "game-playing" },
        };
      });
    } catch (err) {
      console.error("Failed to get NPC board:", err);
      // Fallback: stay on game-setup
      setState((prev) => ({
        ...prev,
        phaseOverride: { type: "game-setup" },
      }));
    }
  }, []);

  const advanceRound = useCallback(() => {
    setState((prev) => {
      if (!prev.currentGame) return prev;
      const game = prev.currentGame;
      const lastRound = game.rounds[game.rounds.length - 1];
      if (!lastRound) return prev;

      const newPlayerScore = game.playerScore + lastRound.playerPoints;
      const newOpponentScore = game.opponentScore + lastRound.opponentPoints;

      if (game.currentRound >= game.totalRounds) {
        return {
          ...prev,
          currentGame: {
            ...game,
            playerScore: newPlayerScore,
            opponentScore: newOpponentScore,
            playerBoard: null,
            opponentBoard: null,
          },
          phaseOverride: { type: "game-over" },
        };
      }

      return {
        ...prev,
        currentGame: {
          ...game,
          currentRound: game.currentRound + 1,
          playerScore: newPlayerScore,
          opponentScore: newOpponentScore,
          playerBoard: null,
          opponentBoard: null,
        },
        phaseOverride: { type: "game-setup" },
      };
    });
  }, []);

  const endGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentGame: null,
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
    installApp,
    completeTutorial,
    saveBoard,
    startGame,
    selectBoard,
    advanceRound,
    endGame,
    setPhaseOverride,
    clearOverride,
  };
}
