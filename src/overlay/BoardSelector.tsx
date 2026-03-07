import type { Board } from "../state/types";
import { BoardGrid } from "./BoardGrid";

interface BoardSelectorProps {
  boards: Board[];
  boardSize: number;
  currentRound: number;
  totalRounds: number;
  onSelect: (board: Board) => void;
  onCreateNew: () => void;
}

export function BoardSelector({
  boards,
  boardSize,
  currentRound,
  totalRounds,
  onSelect,
  onCreateNew,
}: BoardSelectorProps) {
  const filtered = boards.filter((b) => b.boardSize === boardSize);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "16px 0" }}>
      <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>
        Round {currentRound} of {totalRounds}
      </h3>
      <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>pick a board for your bot</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", maxWidth: 380 }}>
        {filtered.map((board) => (
          <div
            key={board.id}
            onClick={() => onSelect(board)}
            style={{
              cursor: "pointer",
              padding: 8,
              background: "#222",
              borderRadius: 12,
              border: "2px solid #444",
              width: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div style={{ width: 90 }}>
              <BoardGrid
                grid={board.grid}
                sequence={board.sequence}
                boardSize={board.boardSize}
                showNumbers={false}
              />
            </div>
            <p style={{ color: "#ccc", fontSize: 11, margin: 0 }}>
              {board.sequence.length} moves
            </p>
          </div>
        ))}

        {/* Create new */}
        <div
          onClick={onCreateNew}
          style={{
            cursor: "pointer",
            padding: 8,
            background: "#1a1a2e",
            borderRadius: 12,
            border: "2px dashed #555",
            width: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 120,
          }}
        >
          <span style={{ fontSize: 28, color: "#666" }}>+</span>
          <p style={{ color: "#888", fontSize: 11, margin: 0 }}>Create New</p>
        </div>
      </div>
    </div>
  );
}
