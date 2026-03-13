import { useState } from "react";
import { getNpcById } from "../config/npcs";
import {
  getBoardSizesPlayed,
  getUnplayedBoardSizes,
  getBoardRank,
  getBoardWinStreak,
  getOverallSpacesRank,
} from "../services/npc-board-records";

interface RankDetailProps {
  npcId: string;
  onBack: () => void;
}

const RANK_COLORS: Record<string, { bg: string; fg: string }> = {
  S: { bg: "#FFD700", fg: "#1a1a2e" },
  A: { bg: "#C0C0C0", fg: "#1a1a2e" },
  B: { bg: "#8B6914", fg: "#fff" },
};

function RankBadge({ rank }: { rank: "S" | "A" | "B" | null }) {
  if (!rank) return <span style={{ fontSize: 10, color: "#555" }}>—</span>;
  const c = RANK_COLORS[rank];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "1px 5px",
        borderRadius: 4,
        background: c.bg,
        color: c.fg,
      }}
    >
      {rank}
    </span>
  );
}

export function RankDetail({ npcId, onBack }: RankDetailProps) {
  const npc = getNpcById(npcId);
  const [showUnplayed, setShowUnplayed] = useState(false);

  const played = getBoardSizesPlayed(npcId);
  const unplayed = getUnplayedBoardSizes(npcId);
  const overallRank = getOverallSpacesRank(npcId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px 16px",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "#9b8abf",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 20 }}>{npc?.emoji ?? "?"}</span>
        <span style={{ color: "#ccc", fontSize: 14, fontWeight: 600 }}>
          {npc?.displayName ?? npcId}
        </span>
      </div>

      {/* Spaces Game section */}
      <div
        style={{
          background: "#12121e",
          border: "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={{ color: "#9b59b6", fontSize: 13, fontWeight: 700 }}>
            Spaces Game
          </span>
          <RankBadge rank={overallRank} />
        </div>

        {played.length === 0 && (
          <p style={{ color: "#555", fontSize: 12, fontStyle: "italic", margin: 0 }}>
            no games played yet
          </p>
        )}

        {/* Played board sizes */}
        {played.map((size) => {
          const rank = getBoardRank(npcId, size);
          const streak = getBoardWinStreak(npcId, size);
          return (
            <div
              key={size}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #1e1e30",
              }}
            >
              <span style={{ color: "#aaa", fontSize: 12 }}>
                {size}×{size} board
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {streak > 0 && (
                  <span style={{ color: "#666", fontSize: 10 }}>
                    {streak} win streak
                  </span>
                )}
                <RankBadge rank={rank} />
              </div>
            </div>
          );
        })}

        {/* Unplayed sizes toggle */}
        {unplayed.length > 0 && (
          <>
            <button
              onClick={() => setShowUnplayed((s) => !s)}
              style={{
                background: "transparent",
                border: "none",
                color: "#666",
                fontSize: 11,
                cursor: "pointer",
                padding: "8px 0 2px",
                textAlign: "left",
              }}
            >
              {showUnplayed
                ? `▾ ${unplayed.length} unplayed size${unplayed.length > 1 ? "s" : ""}`
                : `… ${unplayed.length} more size${unplayed.length > 1 ? "s" : ""}`}
            </button>

            {showUnplayed && (
              <div style={{ paddingLeft: 8 }}>
                {unplayed.map((size) => (
                  <div
                    key={size}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ color: "#444", fontSize: 12 }}>
                      {size}×{size} board
                    </span>
                    <span style={{ color: "#444", fontSize: 10 }}>not played</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={onBack}
        style={{
          padding: "6px 16px",
          background: "transparent",
          color: "#666",
          border: "1px solid #333",
          borderRadius: 8,
          fontSize: 12,
          cursor: "pointer",
          alignSelf: "center",
          marginTop: 4,
        }}
      >
        back
      </button>
    </div>
  );
}
