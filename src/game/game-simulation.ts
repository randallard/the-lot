import type { Board } from "../state/types";
import type { SimulationStep, RoundResult } from "../state/types";

interface Position {
  row: number;
  col: number;
}

function rotatePosition(row: number, col: number, size: number): Position {
  return { row: size - 1 - row, col: size - 1 - col };
}

function positionKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function simulateRound(
  round: number,
  playerBoard: Board,
  opponentBoard: Board,
  boardSize: number,
): RoundResult {
  const size = boardSize;
  const steps: SimulationStep[] = [];

  let playerScore = 0;
  let opponentScore = 0;
  let playerPosition: Position | null = null;
  let opponentPosition: Position | null = null;
  let playerRoundEnded = false;
  let opponentRoundEnded = false;
  let playerGoalReached = false;
  let opponentGoalReached = false;
  let playerHitTrap = false;
  let opponentHitTrap = false;

  const playerTraps = new Map<string, number>();
  const opponentTraps = new Map<string, number>();

  const maxSteps = Math.max(playerBoard.sequence.length, opponentBoard.sequence.length);

  for (let step = 0; step < maxSteps; step++) {
    // Process player's move
    if (!playerRoundEnded && step < playerBoard.sequence.length) {
      const move = playerBoard.sequence[step]!;
      if (move.type === "piece") {
        if (playerPosition !== null && playerPosition.row > move.position.row) {
          playerScore++;
        }
        playerPosition = { ...move.position };
      } else if (move.type === "trap") {
        playerTraps.set(positionKey(move.position.row, move.position.col), step);
      } else if (move.type === "final") {
        playerGoalReached = true;
        playerScore++;
        playerRoundEnded = true;
      }
    }

    // Process opponent's move (with rotation)
    if (!opponentRoundEnded && step < opponentBoard.sequence.length) {
      const move = opponentBoard.sequence[step]!;
      const rotated = rotatePosition(move.position.row, move.position.col, size);
      if (move.type === "piece") {
        if (opponentPosition !== null && opponentPosition.row < rotated.row) {
          opponentScore++;
        }
        opponentPosition = rotated;
      } else if (move.type === "trap") {
        opponentTraps.set(positionKey(rotated.row, rotated.col), step);
      } else if (move.type === "final") {
        opponentGoalReached = true;
        opponentScore++;
        opponentRoundEnded = true;
      }
    }

    // Determine events for this step
    let event: SimulationStep["event"] = null;
    let eventTarget: SimulationStep["eventTarget"] = null;

    // Check collision
    if (
      !playerGoalReached && !opponentGoalReached &&
      playerPosition && opponentPosition &&
      playerPosition.row === opponentPosition.row &&
      playerPosition.col === opponentPosition.col
    ) {
      if (playerScore > 0) playerScore--;
      if (opponentScore > 0) opponentScore--;
      event = "collision";
      eventTarget = "both";

      steps.push({
        stepIndex: step,
        playerPos: playerPosition ? { ...playerPosition } : null,
        opponentPos: opponentPosition ? { ...opponentPosition } : null,
        event,
        eventTarget,
      });
      break;
    }

    // Check if player hit opponent's trap
    if (!playerRoundEnded && playerPosition) {
      const trapStep = opponentTraps.get(positionKey(playerPosition.row, playerPosition.col));
      if (trapStep !== undefined && trapStep <= step) {
        if (playerScore > 0) playerScore--;
        playerHitTrap = true;
        playerRoundEnded = true;
        event = "trap";
        eventTarget = "player";
      }
    }

    // Check if opponent hit player's trap
    if (!opponentRoundEnded && opponentPosition) {
      const trapStep = playerTraps.get(positionKey(opponentPosition.row, opponentPosition.col));
      if (trapStep !== undefined && trapStep <= step) {
        if (opponentScore > 0) opponentScore--;
        opponentHitTrap = true;
        opponentRoundEnded = true;
        event = event === "trap" ? "trap" : "trap";
        eventTarget = eventTarget === "player" ? "both" : "opponent";
      }
    }

    if (playerGoalReached && !event) {
      event = "goal";
      eventTarget = "player";
    }
    if (opponentGoalReached && !event) {
      event = "goal";
      eventTarget = eventTarget === "player" ? "both" : "opponent";
    }

    steps.push({
      stepIndex: step,
      playerPos: playerPosition ? { ...playerPosition } : null,
      opponentPos: opponentPosition ? { ...opponentPosition } : null,
      event,
      eventTarget,
    });

    if (playerRoundEnded && opponentRoundEnded) break;
    if (playerGoalReached || opponentGoalReached) break;
  }

  const winner: "player" | "opponent" | "tie" =
    playerScore > opponentScore ? "player" : opponentScore > playerScore ? "opponent" : "tie";

  return {
    round,
    playerBoard,
    opponentBoard,
    playerPoints: playerScore,
    opponentPoints: opponentScore,
    winner,
    steps,
  };
}
