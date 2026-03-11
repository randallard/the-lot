import type { CellContent, BoardMove } from "../state/types";

interface BoardGridProps {
  grid: CellContent[][];
  sequence: BoardMove[];
  boardSize: number;
  showNumbers?: boolean;
  highlightCell?: { row: number; col: number } | null;
  pieceColor?: string;
}

const CELL_SIZE = 56;
const BLUE = "#4a90e2";

export function BoardGrid({
  grid,
  sequence,
  boardSize,
  showNumbers = false,
  highlightCell,
  pieceColor,
}: BoardGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${boardSize}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${boardSize}, ${CELL_SIZE}px)`,
        gap: 2,
        padding: 4,
      }}
    >
      {grid.map((row, r) =>
        row.map((_cell, c) => {
          const isHighlighted =
            highlightCell?.row === r && highlightCell?.col === c;
          const movesHere = sequence.filter(
            (m) => m.position.row === r && m.position.col === c,
          );

          return (
            <div
              key={`${r}-${c}`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: isHighlighted
                  ? "rgba(231, 76, 60, 0.15)"
                  : "#1a1a2e",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                border: isHighlighted
                  ? "2px solid rgba(231, 76, 60, 0.4)"
                  : "1px solid #2a2a3e",
              }}
            >
              {movesHere.map((move, i) => {
                if (move.type === "trap") {
                  return (
                    <span
                      key={i}
                      style={{
                        fontSize: 22,
                        color: "#e74c3c",
                        fontWeight: 900,
                        position: "absolute",
                      }}
                    >
                      X
                    </span>
                  );
                }
                const color =
                  (move as BoardMove & { color?: string }).color ??
                  pieceColor ??
                  BLUE;
                return (
                  <div
                    key={i}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: color,
                      opacity: 0.7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "absolute",
                    }}
                  >
                    {showNumbers && (
                      <span
                        style={{
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {move.order}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }),
      )}
    </div>
  );
}

export function CheeseTokenStack({
  pulse = false,
  small = false,
}: {
  pulse?: boolean;
  small?: boolean;
}) {
  const chipColor = "#f5a623";
  const rimColor = "#d4891a";
  const chips = small ? [0, 1, 2] : [0, 1, 2, 3];
  const w = small ? 36 : 52;
  const faceH = small ? 18 : 26;
  const edgeH = small ? 6 : 8;
  const stackGap = small ? 5 : 6;
  const totalH = small ? 42 : 64;

  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: totalH,
        animation: pulse ? "pocket-pulse 1s ease-in-out infinite" : undefined,
        filter: pulse ? "drop-shadow(0 0 8px #f5a623)" : undefined,
      }}
    >
      {chips.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            bottom: i * stackGap,
            left: 0,
            width: w,
            height: faceH + edgeH,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 2,
              width: w - 4,
              height: edgeH,
              background: rimColor,
              borderRadius: `0 0 ${w / 2}px ${w / 2}px`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: w,
              height: faceH,
              background: chipColor,
              borderRadius: "50%",
              border: `${small ? 2 : 3}px solid ${rimColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                i === chips.length - 1
                  ? "0 2px 8px rgba(0,0,0,0.3)"
                  : "none",
            }}
          >
            {i === chips.length - 1 && (
              <span
                style={{
                  fontSize: small ? 10 : 13,
                  fontWeight: 800,
                  color: "#fff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  position: "relative",
                }}
              >
                1
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
