import { useState, useCallback, useEffect, useMemo } from "react";
import type { Board, CellContent, BoardMove } from "../state/types";
import { validateBoard } from "../game/board-validation";
import { BoardGrid } from "./BoardGrid";

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
  existingBoards = [],
}: BoardCreatorProps) {
  const [phase, setPhase] = useState<CreationPhase>("choosing-start");
  const [grid, setGrid] = useState<CellContent[][]>(() => createEmptyGrid(boardSize));
  const [sequence, setSequence] = useState<BoardMove[]>([]);
  const [piecePosition, setPiecePosition] = useState<Position | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [completedBoard, setCompletedBoard] = useState<Board | null>(null);
  const [usedAllTheWay, setUsedAllTheWay] = useState(false);
  const [beforeFinishState, setBeforeFinishState] = useState<{
    grid: CellContent[][];
    sequence: BoardMove[];
    piecePosition: Position | null;
  } | null>(null);

  const getAdjacentPositions = useCallback(
    (pos: Position): Position[] => {
      const dirs = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ];
      const result: Position[] = [];
      for (const d of dirs) {
        const r = pos.row + d.row;
        const c = pos.col + d.col;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
          result.push({ row: r, col: c });
        }
      }
      return result;
    },
    [boardSize],
  );

  const handleChooseStart = useCallback(
    (row: number, col: number) => {
      if (row !== boardSize - 1) return;
      const newGrid = createEmptyGrid(boardSize);
      newGrid[row]![col] = "piece";
      setGrid(newGrid);
      setSequence([{ position: { row, col }, type: "piece", order: 1 }]);
      setPiecePosition({ row, col });
      setPhase("building");
      setErrors([]);
    },
    [boardSize],
  );

  const handleMove = useCallback(
    (row: number, col: number) => {
      if (!piecePosition) return;
      const newGrid = grid.map((r, rIdx) =>
        r.map((cell, cIdx) => (rIdx === row && cIdx === col ? ("piece" as CellContent) : cell)),
      );
      setGrid(newGrid);
      setSequence((prev) => [
        ...prev,
        { position: { row, col }, type: "piece", order: prev.length + 1 },
      ]);
      setPiecePosition({ row, col });
      setErrors([]);
    },
    [piecePosition, grid],
  );

  const handleTrap = useCallback(
    (row: number, col: number) => {
      if (!piecePosition) return;
      const newGrid = grid.map((r, rIdx) =>
        r.map((cell, cIdx) => (rIdx === row && cIdx === col ? ("trap" as CellContent) : cell)),
      );
      setGrid(newGrid);
      setSequence((prev) => [
        ...prev,
        { position: { row, col }, type: "trap", order: prev.length + 1 },
      ]);
      setErrors([]);
    },
    [piecePosition, grid],
  );

  const hasTrapAbove = useMemo(() => {
    if (!piecePosition) return false;
    for (let row = piecePosition.row - 1; row >= 0; row--) {
      if (grid[row]?.[piecePosition.col] === "trap") return true;
    }
    return false;
  }, [piecePosition, grid]);

  const finishBoard = useCallback(
    (finalSequence: BoardMove[], finalGrid: CellContent[][]) => {
      const board: Board = {
        id: crypto.randomUUID(),
        boardSize,
        grid: finalGrid,
        sequence: finalSequence,
        createdAt: Date.now(),
      };
      const validation = validateBoard(board);
      if (!validation.valid) {
        setErrors(validation.errors.map((e) => e.message));
        return;
      }
      setCompletedBoard(board);
      setPhase("confirming");
    },
    [boardSize],
  );

  const handleAllTheWayToFinish = useCallback(() => {
    if (!piecePosition || hasTrapAbove) return;
    setBeforeFinishState({
      grid: grid.map((row) => [...row]),
      sequence: [...sequence],
      piecePosition: { ...piecePosition },
    });
    let currentRow = piecePosition.row;
    const col = piecePosition.col;
    const newSequence = [...sequence];
    const newGrid = grid.map((row) => [...row]);
    while (currentRow > 0) {
      currentRow--;
      newSequence.push({
        position: { row: currentRow, col },
        type: "piece",
        order: newSequence.length + 1,
      });
      newGrid[currentRow]![col] = "piece";
    }
    newSequence.push({
      position: { row: -1, col },
      type: "final",
      order: newSequence.length + 1,
    });
    setSequence(newSequence);
    setGrid(newGrid);
    setPiecePosition({ row: 0, col });
    setUsedAllTheWay(true);
    finishBoard(newSequence, newGrid);
  }, [piecePosition, sequence, grid, hasTrapAbove, finishBoard]);

  const handleFinalMove = useCallback(() => {
    if (!piecePosition || piecePosition.row !== 0) return;
    setBeforeFinishState({
      grid: grid.map((row) => [...row]),
      sequence: [...sequence],
      piecePosition: { ...piecePosition },
    });
    const finalSequence = [
      ...sequence,
      {
        position: { row: -1, col: piecePosition.col },
        type: "final" as const,
        order: sequence.length + 1,
      },
    ];
    setUsedAllTheWay(false);
    finishBoard(finalSequence, grid);
  }, [piecePosition, sequence, grid, finishBoard]);

  const handleUndo = useCallback(() => {
    if (sequence.length === 0) return;
    const newSequence = sequence.slice(0, -1);
    setSequence(newSequence);
    if (newSequence.length === 0) {
      setPhase("choosing-start");
      setGrid(createEmptyGrid(boardSize));
      setPiecePosition(null);
      setErrors([]);
      return;
    }
    const newGrid = createEmptyGrid(boardSize);
    let lastPiecePos: Position | null = null;
    for (const move of newSequence) {
      if (move.type === "piece") {
        newGrid[move.position.row]![move.position.col] = "piece";
        lastPiecePos = move.position;
      } else if (move.type === "trap") {
        newGrid[move.position.row]![move.position.col] = "trap";
      }
    }
    setGrid(newGrid);
    setPiecePosition(lastPiecePos);
    setErrors([]);
  }, [sequence, boardSize]);

  const handleRestart = useCallback(() => {
    setPhase("choosing-start");
    setGrid(createEmptyGrid(boardSize));
    setSequence([]);
    setPiecePosition(null);
    setErrors([]);
    setCompletedBoard(null);
    setUsedAllTheWay(false);
    setBeforeFinishState(null);
  }, [boardSize]);

  const handleConfirm = useCallback(() => {
    if (completedBoard) onBoardSaved(completedBoard);
  }, [completedBoard, onBoardSaved]);

  const handleCancelConfirm = useCallback(() => {
    if (beforeFinishState) {
      setGrid(beforeFinishState.grid);
      setSequence(beforeFinishState.sequence);
      setPiecePosition(beforeFinishState.piecePosition);
      setBeforeFinishState(null);
    }
    setCompletedBoard(null);
    setUsedAllTheWay(false);
    setPhase("building");
  }, [beforeFinishState]);

  const directionalMoves = useMemo(() => {
    if (!piecePosition) return { up: null, down: null, left: null, right: null };
    const { row, col } = piecePosition;
    const check = (r: number, c: number) =>
      r >= 0 && r < boardSize && c >= 0 && c < boardSize && grid[r]?.[c] !== "trap"
        ? { row: r, col: c }
        : null;
    return {
      up: check(row - 1, col),
      down: check(row + 1, col),
      left: check(row, col - 1),
      right: check(row, col + 1),
    };
  }, [piecePosition, boardSize, grid]);

  const adjacentPositions = piecePosition
    ? getAdjacentPositions(piecePosition).filter((pos) => grid[pos.row]?.[pos.col] !== "trap")
    : [];

  const maxTraps = boardSize - 1;
  const currentTrapCount = sequence.filter((m) => m.type === "trap").length;
  const trapLimitReached = currentTrapCount >= maxTraps;
  const canFinish = piecePosition?.row === 0;
  const canFinishAllTheWay = !!piecePosition && !hasTrapAbove;

  const mustMoveAfterSupermove = useMemo(() => {
    if (sequence.length === 0) return false;
    const last = sequence[sequence.length - 1]!;
    return (
      last.type === "trap" &&
      piecePosition !== null &&
      last.position.row === piecePosition.row &&
      last.position.col === piecePosition.col
    );
  }, [sequence, piecePosition]);

  const trapsDisabled = trapLimitReached || mustMoveAfterSupermove;

  // Keyboard controls
  useEffect(() => {
    if (phase !== "building") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === "enter" && canFinish) {
        e.preventDefault();
        handleFinalMove();
        return;
      }
      if (key === "x" && e.shiftKey && piecePosition && !trapsDisabled) {
        e.preventDefault();
        handleTrap(piecePosition.row, piecePosition.col);
        return;
      }
      const isTrap = e.shiftKey;
      let target: Position | null = null;
      if (key === "w") target = directionalMoves.up;
      else if (key === "a") target = directionalMoves.left;
      else if (key === "s") target = directionalMoves.down;
      else if (key === "d") target = directionalMoves.right;
      else return;
      if (target) {
        e.preventDefault();
        if (isTrap && !trapsDisabled) handleTrap(target.row, target.col);
        else if (!isTrap) handleMove(target.row, target.col);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, directionalMoves, handleMove, handleTrap, canFinish, handleFinalMove, piecePosition, trapsDisabled]);

  // Confirming phase
  if (phase === "confirming" && completedBoard) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "16px 0" }}>
        <h3 style={{ color: "#52c41a", margin: 0, fontSize: 18 }}>board complete!</h3>
        <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>{completedBoard.sequence.length} moves</p>
        <BoardGrid grid={completedBoard.grid} sequence={completedBoard.sequence} boardSize={boardSize} showNumbers />
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleCancelConfirm} style={btnStyle("#555")}>
            {usedAllTheWay ? 'Back to Before "All the Way"' : "Back to Edit"}
          </button>
          <button onClick={handleConfirm} style={btnStyle("#52c41a")}>Save Board</button>
        </div>
      </div>
    );
  }

  // Render the interactive grid
  const renderGrid = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
        gap: 3,
        width: "100%",
        maxWidth: 300,
      }}
    >
      {grid.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          const bottomRow = boardSize - 1;
          const isStartChoice = phase === "choosing-start" && rowIdx === bottomRow;
          const isEmpty = cell === "empty";
          const isAdjacent = adjacentPositions.some((p) => p.row === rowIdx && p.col === colIdx);
          const isCurrentPiece =
            piecePosition?.row === rowIdx && piecePosition?.col === colIdx && phase === "building";

          const pieceAtPosition = sequence.find(
            (m) => m.position.row === rowIdx && m.position.col === colIdx && m.type === "piece",
          );
          const trapAtPosition = sequence.find(
            (m) => m.position.row === rowIdx && m.position.col === colIdx && m.type === "trap",
          );

          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              style={{
                aspectRatio: "1",
                background: "#fff",
                border: "2px solid #e5e7eb",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {/* Trap icon (under piece) */}
              {trapAtPosition && (
                <svg viewBox="0 0 40 40" style={{ width: "80%", height: "80%", position: "absolute" }}>
                  <path d="M8 8 l24 24 m0 -24 l-24 24" stroke="#f5222d" strokeWidth="4" opacity="0.7" />
                  <text x="35" y="18" fontSize="12" fill="#f5222d" textAnchor="middle" dy=".3em" fontWeight="bold">
                    {trapAtPosition.order}
                  </text>
                </svg>
              )}

              {/* Piece icon (on top) */}
              {pieceAtPosition && (
                <svg
                  viewBox="0 0 40 40"
                  style={{
                    width: "80%",
                    height: "80%",
                    position: "absolute",
                    animation: isCurrentPiece ? "pulse 1.5s ease-in-out infinite" : undefined,
                  }}
                >
                  <circle cx="20" cy="20" r="14" fill="#4a90e2" />
                  <text x="20" y="20" fontSize="14" fill="white" textAnchor="middle" dy=".3em">
                    {pieceAtPosition.order}
                  </text>
                </svg>
              )}

              {/* Trap Here button on current piece */}
              {isCurrentPiece && !trapAtPosition && !trapsDisabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrap(rowIdx, colIdx);
                  }}
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "2px 4px",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#fff",
                    background: "#fa8c16",
                    border: "none",
                    borderRadius: 3,
                    cursor: "pointer",
                    zIndex: 10,
                    whiteSpace: "nowrap",
                  }}
                >
                  Trap Here
                </button>
              )}

              {/* Start button (bottom row, choosing phase) */}
              {isEmpty && isStartChoice && (
                <button
                  onClick={() => handleChooseStart(rowIdx, colIdx)}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    background: "#4a90e2",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Start
                </button>
              )}

              {/* Move/Trap buttons on adjacent cells */}
              {isAdjacent && phase === "building" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    width: "100%",
                    padding: 2,
                    position: "absolute",
                    inset: 0,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(rowIdx, colIdx);
                    }}
                    style={{
                      padding: "4px 6px",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#fff",
                      background: "#4a90e2",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      width: "90%",
                    }}
                  >
                    Move
                  </button>
                  {!trapsDisabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrap(rowIdx, colIdx);
                      }}
                      style={{
                        padding: "4px 6px",
                        fontSize: 9,
                        fontWeight: 600,
                        color: "#fff",
                        background: "#f5222d",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        width: "90%",
                      }}
                    >
                      Trap
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }),
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0" }}>
      {/* Final Move Button (always visible at top) */}
      <button
        onClick={handleFinalMove}
        disabled={!canFinish}
        style={{
          width: "100%",
          maxWidth: 300,
          padding: "8px 12px",
          fontSize: 14,
          fontWeight: 600,
          color: "#fff",
          background: canFinish ? "#52c41a" : "#555",
          border: "none",
          borderRadius: 8,
          cursor: canFinish ? "pointer" : "not-allowed",
          opacity: canFinish ? 1 : 0.5,
        }}
      >
        Final Move
      </button>

      {/* Grid */}
      {renderGrid()}

      {/* Supermove notice */}
      {mustMoveAfterSupermove && (
        <p style={{ color: "#fa8c16", fontSize: 11, margin: 0, textAlign: "center" }}>
          piece must move after trap placed in same square
        </p>
      )}

      {/* Directional Controls */}
      {phase === "building" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "auto auto auto",
            gap: 6,
            width: "100%",
            maxWidth: 300,
            background: "#1a1a2e",
            borderRadius: 10,
            padding: 10,
            border: "2px solid #333",
          }}
        >
          {/* Top row */}
          <div />
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <DirBtn
              label="All the Way"
              onClick={handleAllTheWayToFinish}
              disabled={!canFinishAllTheWay}
              color="#52c41a"
            />
            <DirBtn
              label="Move ↑"
              onClick={() => directionalMoves.up && handleMove(directionalMoves.up.row, directionalMoves.up.col)}
              disabled={!directionalMoves.up}
            />
            {!trapsDisabled && (
              <DirBtn
                label="Trap ↑"
                onClick={() => directionalMoves.up && handleTrap(directionalMoves.up.row, directionalMoves.up.col)}
                disabled={!directionalMoves.up}
                color="#f5222d"
              />
            )}
          </div>
          <div />

          {/* Middle row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <DirBtn
              label="← Move"
              onClick={() =>
                directionalMoves.left && handleMove(directionalMoves.left.row, directionalMoves.left.col)
              }
              disabled={!directionalMoves.left}
            />
            {!trapsDisabled && (
              <DirBtn
                label="← Trap"
                onClick={() =>
                  directionalMoves.left && handleTrap(directionalMoves.left.row, directionalMoves.left.col)
                }
                disabled={!directionalMoves.left}
                color="#f5222d"
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button
              onClick={handleFinalMove}
              disabled={!canFinish}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                background: canFinish ? "#52c41a" : "#555",
                border: "none",
                borderRadius: 8,
                cursor: canFinish ? "pointer" : "not-allowed",
                opacity: canFinish ? 1 : 0.5,
              }}
            >
              Finish
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <DirBtn
              label="Move →"
              onClick={() =>
                directionalMoves.right && handleMove(directionalMoves.right.row, directionalMoves.right.col)
              }
              disabled={!directionalMoves.right}
            />
            {!trapsDisabled && (
              <DirBtn
                label="Trap →"
                onClick={() =>
                  directionalMoves.right && handleTrap(directionalMoves.right.row, directionalMoves.right.col)
                }
                disabled={!directionalMoves.right}
                color="#f5222d"
              />
            )}
          </div>

          {/* Bottom row */}
          <div />
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <DirBtn
              label="Move ↓"
              onClick={() =>
                directionalMoves.down && handleMove(directionalMoves.down.row, directionalMoves.down.col)
              }
              disabled={!directionalMoves.down}
            />
            {!trapsDisabled && (
              <DirBtn
                label="Trap ↓"
                onClick={() =>
                  directionalMoves.down && handleTrap(directionalMoves.down.row, directionalMoves.down.col)
                }
                disabled={!directionalMoves.down}
                color="#f5222d"
              />
            )}
          </div>
          <div />
        </div>
      )}

      {/* Trap Budget */}
      {phase === "building" && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#ccc",
            textAlign: "center",
            padding: "4px 12px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 6,
          }}
        >
          Traps: {currentTrapCount}/{maxTraps}
          {trapLimitReached && " (limit reached)"}
        </div>
      )}

      {/* Instruction */}
      <p style={{ color: "#888", fontSize: 11, margin: 0, textAlign: "center", maxWidth: 280 }}>
        {phase === "choosing-start"
          ? "click Start in the bottom row to place your bot"
          : "use WASD or the controls to move — Shift+WASD for traps"}
      </p>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ color: "#f5222d", fontSize: 11 }}>
          {errors.map((e, i) => (
            <p key={i} style={{ margin: "2px 0" }}>
              {e}
            </p>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={btnStyle("#4b5563")}>
          Cancel
        </button>
        {phase === "building" && (
          <>
            <button
              onClick={handleUndo}
              disabled={sequence.length === 0}
              style={btnStyle(sequence.length > 0 ? "#f59e0b" : "#555")}
            >
              Undo
            </button>
            <button onClick={handleRestart} style={btnStyle("#6366f1")}>
              Restart
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DirBtn({
  label,
  onClick,
  disabled,
  color = "#4a90e2",
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 6px",
        fontSize: 10,
        fontWeight: 600,
        color: "#fff",
        background: disabled ? "#555" : color,
        border: "none",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      {label}
    </button>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  };
}
