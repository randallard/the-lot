import { useState } from "react";
import { getNpcById } from "../config/npcs";
import {
  getBoardSizesPlayed,
  getUnplayedBoardSizes,
  getBoardRank,
  getBoardWinStreak,
  getOverallSpacesRank,
} from "../services/npc-board-records";
import { getRecord } from "../services/npc-records";
import { getKingsChessRecord } from "../services/npc-kings-chess-records";

interface RankDetailProps {
  npcId: string;
  onBack: () => void;
  onFind?: () => void;
  onOpenBodyEditor?: () => void;
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

function WLT({ wins, losses, ties }: { wins: number; losses: number; ties: number }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{ color: "#4caf50", fontSize: 12 }}>{wins}W</span>
      <span style={{ color: "#e74c3c", fontSize: 12 }}>{losses}L</span>
      {ties > 0 && <span style={{ color: "#888", fontSize: 12 }}>{ties}T</span>}
    </div>
  );
}

export function RankDetail({ npcId, onBack, onFind, onOpenBodyEditor }: RankDetailProps) {
  const npc = getNpcById(npcId);
  const [showUnplayed, setShowUnplayed] = useState(false);

  const played = getBoardSizesPlayed(npcId);
  const unplayed = getUnplayedBoardSizes(npcId);
  const overallRank = getOverallSpacesRank(npcId);
  const sgRecord = getRecord(npcId);
  const kcRecord = getKingsChessRecord(npcId);

  const hasKC = !!npc?.games?.["kings-cooking"];

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
        <span style={{ color: "#ccc", fontSize: 14, fontWeight: 600, flex: 1 }}>
          {npc?.displayName ?? npcId}
        </span>
        <button
          onClick={() => onOpenBodyEditor?.()}
          style={{
            background: "transparent",
            border: "1px solid #333",
            color: "#888",
            fontSize: 11,
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          appearance
        </button>
        {onFind && (
          <button
            onClick={onFind}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#888",
              fontSize: 11,
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            find →
          </button>
        )}
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

        {sgRecord.totalGames > 0 && (
          <div style={{ marginBottom: 8 }}>
            <WLT wins={sgRecord.wins} losses={sgRecord.losses} ties={sgRecord.ties} />
          </div>
        )}

        {played.length === 0 && (
          <p style={{ color: "#555", fontSize: 12, fontStyle: "italic", margin: 0 }}>
            no games played yet
          </p>
        )}

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

      {/* King's Cooking section */}
      {hasKC && (
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
              King's Cooking
            </span>
          </div>

          {kcRecord.totalGames === 0 ? (
            <p style={{ color: "#555", fontSize: 12, fontStyle: "italic", margin: 0 }}>
              no games played yet
            </p>
          ) : (
            <WLT wins={kcRecord.wins} losses={kcRecord.losses} ties={kcRecord.ties} />
          )}
        </div>
      )}

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
