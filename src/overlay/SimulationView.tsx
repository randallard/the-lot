import { useState, useEffect, useCallback } from "react";
import type { GameSession } from "../state/types";
import { BoardGrid } from "./BoardGrid";

interface SimulationViewProps {
  game: GameSession;
  onDone: () => void;
}

export function SimulationView({ game, onDone }: SimulationViewProps) {
  const lastRound = game.rounds[game.rounds.length - 1];
  const [stepIdx, setStepIdx] = useState(0);

  const steps = lastRound?.steps ?? [];
  const currentStep = steps[stepIdx] ?? null;
  const done = stepIdx >= steps.length;

  useEffect(() => {
    if (!lastRound || steps.length === 0) return;
    if (done) return;
    const t = setTimeout(() => {
      if (stepIdx < steps.length - 1) {
        setStepIdx((i) => i + 1);
      } else {
        // Last step — pause then call done
        setTimeout(onDone, 800);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [stepIdx, steps.length, done, onDone, lastRound]);

  const handleSkip = useCallback(() => {
    onDone();
  }, [onDone]);

  if (!lastRound) {
    return (
      <div style={{ color: "#aaa", textAlign: "center", padding: 32 }}>
        <p>waiting for boards...</p>
      </div>
    );
  }

  // Build a display grid: use player's board as base
  const displayGrid = lastRound.playerBoard.grid;

  return (
    <div
      onClick={handleSkip}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "16px 0",
        cursor: "pointer",
      }}
    >
      <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>
        Round {lastRound.round}
      </h3>

      <BoardGrid
        grid={displayGrid}
        sequence={lastRound.playerBoard.sequence}
        boardSize={game.boardSize}
        showNumbers={false}
        playerPos={currentStep?.playerPos}
        opponentPos={currentStep?.opponentPos}
      />

      {currentStep?.event && (
        <p style={{ color: "#ff9", fontSize: 13, margin: 0, fontWeight: 600 }}>
          {currentStep.event === "collision" && "collision!"}
          {currentStep.event === "trap" &&
            (currentStep.eventTarget === "player"
              ? "your bot hit a trap!"
              : currentStep.eventTarget === "opponent"
                ? "opponent hit your trap!"
                : "both hit traps!")}
          {currentStep.event === "goal" &&
            (currentStep.eventTarget === "player"
              ? "your bot reached the cheese!"
              : currentStep.eventTarget === "opponent"
                ? "opponent reached the cheese!"
                : "both reached the cheese!")}
        </p>
      )}

      <p style={{ color: "#666", fontSize: 11, margin: 0 }}>
        {done ? "done" : `step ${stepIdx + 1} / ${steps.length}`} — tap to skip
      </p>
    </div>
  );
}
