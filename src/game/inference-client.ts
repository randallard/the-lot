import type { Board, BoardMove, CellContent } from "../state/types";

const INFERENCE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_INFERENCE_API_URL) ||
  "https://spaces-game-python-production.up.railway.app";

interface InferenceResponse {
  board: {
    grid: string[][];
    sequence: { position: { row: number; col: number }; type: string; order: number }[];
    boardSize: number;
  };
  valid: boolean;
  attempts_used: number;
}

export async function requestNpcBoard(
  boardSize: number,
  roundNum: number,
  npcScore: number,
  playerScore: number,
  playerHistory: { round: number; playerBoard: Board }[],
): Promise<Board> {
  const body: Record<string, unknown> = {
    board_size: boardSize,
    round_num: roundNum - 1, // server is 0-indexed
    agent_score: npcScore, // server expects AI-perspective
    opponent_score: playerScore,
    skill_level: "scripted_1",
    opponent_history: playerHistory.map((h) => ({
      sequence: h.playerBoard.sequence.map((move) => ({
        row: move.position.row,
        col: move.position.col,
        type: move.type,
        order: move.order,
      })),
    })),
  };

  const res = await fetch(`${INFERENCE_URL}/construct-board`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Inference server error: ${res.status} ${res.statusText}`);
  }

  const data: InferenceResponse = await res.json();

  // Convert response to our Board type
  const grid: CellContent[][] = data.board.grid.map((row) =>
    row.map((cell) => {
      if (cell === "piece" || cell === "trap" || cell === "final" || cell === "empty") return cell;
      return "empty";
    }),
  );

  const sequence: BoardMove[] = data.board.sequence.map((s) => ({
    position: { row: s.position.row, col: s.position.col },
    type: s.type as "piece" | "trap" | "final",
    order: s.order,
  }));

  return {
    id: crypto.randomUUID(),
    boardSize,
    grid,
    sequence,
    createdAt: Date.now(),
  };
}
