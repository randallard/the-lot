import { useState, useCallback, useMemo } from "react";
import type { Board, CellContent, BoardMove } from "../state/types";

interface Position {
  row: number;
  col: number;
}

export interface BoardCreatorProps {
  boardSize: number;
  onBoardSaved: (board: Board) => void;
  onCancel: () => void;
  existingBoards?: Board[];
}

type CreationPhase = "choosing-start" | "building" | "confirming";

function createEmptyGrid(size: number): CellContent[][] {
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill("empty") as CellContent[]);
}

export function BoardCreator({
  boardSize,
  onBoardSaved,
  onCancel,
}: BoardCreatorProps) {
  const [phase, setPhase] = useState<CreationPhase>("choosing-start");
  const [grid, setGrid] = useState<CellContent[][]>(() =>
    createEmptyGrid(boardSize),
  );
  const [sequence, setSequence] = useState<BoardMove[]>([]);
  const [piecePosition, setPiecePosition] = useState<Position | null>(null);

  const getAdjacentPositions = useCallback(
    (pos: Position): Position[] => {
      const dirs = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ];
      return dirs
        .map((d) => ({ row: pos.row + d.row, col: pos.col + d.col }))
        .filter(
          (p) =>
            p.row >= 0 &&
            p.row < boardSize &&
            p.col >= 0 &&
            p.col < boardSize,
        );
    },
    [boardSize],
  );

  const validMoves = useMemo(() => {
    if (phase === "choosing-start") {
      // Bottom row columns
      return Array.from({ length: boardSize }, (_, c) => ({
        row: boardSize - 1,
        col: c,
      }));
    }
    if (!piecePosition) return [];

    const adjacents = getAdjacentPositions(piecePosition);
    return adjacents.filter((p) => grid[p.row][p.col] === "empty");
  }, [phase, piecePosition, grid, boardSize, getAdjacentPositions]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const isValid = validMoves.some((m) => m.row === row && m.col === col);
      if (!isValid) return;

      if (phase === "choosing-start") {
        const newGrid = grid.map((r) => [...r]);
        newGrid[row][col] = "piece";
        setGrid(newGrid);
        setSequence([
          { position: { row, col }, type: "piece", order: 1 },
        ]);
        setPiecePosition({ row, col });
        setPhase("building");
        return;
      }

      const order = sequence.length + 1;
      const newGrid = grid.map((r) => [...r]);

      // If placing on same row as piece (not advancing) → trap
      // If advancing toward row 0 → piece move
      // If this would reach row 0 → final
      const isTrap = row === piecePosition!.row || row > piecePosition!.row;
      const isFinal = row === 0;

      if (isTrap) {
        newGrid[row][col] = "trap";
        setGrid(newGrid);
        setSequence((prev) => [
          ...prev,
          { position: { row, col }, type: "trap", order },
        ]);
      } else {
        const type = isFinal ? "final" : "piece";
        newGrid[row][col] = type;
        setGrid(newGrid);
        setSequence((prev) => [
          ...prev,
          { position: { row, col }, type, order },
        ]);
        setPiecePosition({ row, col });

        if (isFinal) {
          setPhase("confirming");
        }
      }
    },
    [phase, grid, sequence, piecePosition, validMoves],
  );

  const handleConfirm = useCallback(() => {
    const board: Board = {
      id: `board-${Date.now()}`,
      boardSize,
      grid,
      sequence,
      createdAt: Date.now(),
    };
    onBoardSaved(board);
  }, [boardSize, grid, sequence, onBoardSaved]);

  const handleReset = useCallback(() => {
    setGrid(createEmptyGrid(boardSize));
    setSequence([]);
    setPiecePosition(null);
    setPhase("choosing-start");
  }, [boardSize]);

  const CELL_SIZE = Math.min(56, Math.floor(240 / boardSize));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        minHeight: "100%",
      }}
    >
      <p style={{ color: "#aaa", fontSize: 11, margin: 0 }}>
        {phase === "choosing-start"
          ? "pick a starting column"
          : phase === "confirming"
            ? "looks good?"
            : "tap to place a move or trap"}
      </p>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${boardSize}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${boardSize}, ${CELL_SIZE}px)`,
          gap: 2,
        }}
      >
        {grid.map((row, r) =>
          row.map((_cell, c) => {
            const isValid = validMoves.some(
              (m) => m.row === r && m.col === c,
            );
            const move = sequence.find(
              (m) => m.position.row === r && m.position.col === c,
            );

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: isValid
                    ? "rgba(74, 144, 226, 0.15)"
                    : "#1a1a2e",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isValid ? "pointer" : "default",
                  border: isValid
                    ? "2px solid rgba(74, 144, 226, 0.3)"
                    : "1px solid #2a2a3e",
                  position: "relative",
                }}
              >
                {move?.type === "trap" && (
                  <span
                    style={{
                      fontSize: 20,
                      color: "#e74c3c",
                      fontWeight: 900,
                    }}
                  >
                    X
                  </span>
                )}
                {(move?.type === "piece" || move?.type === "final") && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#4a90e2",
                      opacity: 0.8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {move.order}
                    </span>
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        {phase === "confirming" && (
          <button
            onClick={handleConfirm}
            style={{
              padding: "8px 20px",
              background: "#4a90e2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            save board
          </button>
        )}
        <button
          onClick={handleReset}
          style={{
            padding: "8px 16px",
            background: "#333",
            color: "#aaa",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          reset
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            background: "#333",
            color: "#aaa",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          cancel
        </button>
      </div>
    </div>
  );
}
