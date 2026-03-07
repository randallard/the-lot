import type { CellContent, BoardMove } from "../state/types";

export type SequenceItem = BoardMove & { color?: string };

interface BoardGridProps {
  grid: CellContent[][];
  sequence: SequenceItem[];
  boardSize: number;
  highlightCell?: { row: number; col: number } | null;
  showNumbers?: boolean;
  onCellClick?: (row: number, col: number) => void;
  playerPos?: { row: number; col: number } | null;
  opponentPos?: { row: number; col: number } | null;
  pieceColor?: string;
}

export function BoardGrid({
  grid,
  sequence,
  boardSize,
  highlightCell,
  showNumbers = true,
  onCellClick,
  playerPos,
  opponentPos,
  pieceColor = "#4a90e2",
}: BoardGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
        gap: 3,
        width: "100%",
      }}
    >
      {grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          const isHighlight = highlightCell?.row === rIdx && highlightCell?.col === cIdx;
          const isPlayer = playerPos?.row === rIdx && playerPos?.col === cIdx;
          const isOpponent = opponentPos?.row === rIdx && opponentPos?.col === cIdx;

          // Find piece and trap sequence items at this position
          const pieceSeq = sequence.find(
            (s) => s.position.row === rIdx && s.position.col === cIdx && s.type === "piece",
          );
          const trapSeq = sequence.find(
            (s) => s.position.row === rIdx && s.position.col === cIdx && s.type === "trap",
          );

          return (
            <div
              key={`${rIdx}-${cIdx}`}
              onClick={onCellClick ? () => onCellClick(rIdx, cIdx) : undefined}
              style={{
                aspectRatio: "1",
                background: isHighlight ? "#fffbe6" : "#fff",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                cursor: onCellClick ? "pointer" : "default",
                border: isHighlight ? "2px solid #f0a500" : "2px solid #e5e7eb",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {/* Piece icon (rendered behind trap) */}
              {pieceSeq && (
                <svg
                  viewBox="0 0 40 40"
                  style={{
                    width: "80%",
                    height: "80%",
                    position: "absolute",
                    animation: isHighlight ? "pulse 1.5s ease-in-out infinite" : undefined,
                  }}
                >
                  <circle cx="20" cy="20" r="14" fill={(pieceSeq as SequenceItem).color ?? pieceColor} />
                  {showNumbers && (
                    <text x="20" y="20" fontSize="14" fill="white" textAnchor="middle" dy=".3em">
                      {pieceSeq.order}
                    </text>
                  )}
                </svg>
              )}

              {/* Trap icon (rendered on top of piece) */}
              {trapSeq && (
                <svg viewBox="0 0 40 40" style={{ width: "80%", height: "80%", position: "absolute" }}>
                  <path d="M8 8 l24 24 m0 -24 l-24 24" stroke="#f5222d" strokeWidth="4" opacity="0.7" />
                  {showNumbers && (
                    <text x="35" y="18" fontSize="12" fill="#f5222d" textAnchor="middle" dy=".3em" fontWeight="bold">
                      {trapSeq.order}
                    </text>
                  )}
                </svg>
              )}

              {/* Player bot marker */}
              {isPlayer && (
                <div
                  style={{
                    position: "absolute",
                    width: "55%",
                    height: "55%",
                    borderRadius: "50%",
                    background: "#4a90e2",
                    border: "2px solid #fff",
                    boxShadow: "0 0 6px rgba(74,144,226,0.5)",
                  }}
                />
              )}

              {/* Opponent bot marker */}
              {isOpponent && (
                <div
                  style={{
                    position: "absolute",
                    width: "55%",
                    height: "55%",
                    borderRadius: "50%",
                    background: "#9b59b6",
                    border: "2px solid #fff",
                    boxShadow: "0 0 6px rgba(155,89,182,0.5)",
                  }}
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
