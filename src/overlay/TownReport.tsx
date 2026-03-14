import { getTownHappiness, getHappinessEmoji } from "../services/town-happiness";
import { NPC_CONFIGS } from "../config/npcs";
import { getFriendlinessLevel } from "../services/npc-friendliness";
import { getRecord } from "../services/npc-records";
import { isAsleep, getTimeUntilWake } from "../services/npc-sleep";

interface TownReportProps {
  onBack: () => void;
}

const FRIENDLINESS_LABELS = ["cold", "neutral", "warming up", "friendly", "good friends", "close"];

export function TownReport({ onBack }: TownReportProps) {
  const happiness = getTownHappiness();
  const emoji = getHappinessEmoji(happiness);
  const gameNpcs = NPC_CONFIGS.filter((n) => n.opponentType);

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
        <span style={{ color: "#ccc", fontSize: 14, fontWeight: 600 }}>
          townage
        </span>
      </div>

      {/* Big emoji */}
      <div style={{ textAlign: "center", fontSize: 48, padding: "8px 0" }}>
        {emoji}
      </div>

      {/* NPC breakdown */}
      <div
        style={{
          background: "#12121e",
          border: "1px solid #2a2a3e",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        {gameNpcs.map((npc) => {
          const friendliness = getFriendlinessLevel(npc.id);
          const record = getRecord(npc.id);
          const label = FRIENDLINESS_LABELS[Math.max(0, Math.min(5, friendliness + 1))];
          const sleeping = isAsleep(npc.id);
          const wakeTime = sleeping ? getTimeUntilWake(npc.id) : null;

          return (
            <div
              key={npc.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #1e1e30",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{npc.emoji}</span>
                <span style={{ color: "#aaa", fontSize: 12 }}>{npc.displayName}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#666", fontSize: 10 }}>
                  {record.totalGames > 0 ? `${record.totalGames} game${record.totalGames !== 1 ? "s" : ""}` : "no games"}
                </span>
                <span style={{ color: "#888", fontSize: 10 }}>{label}</span>
                {sleeping && (
                  <span style={{ color: "#6a7fff", fontSize: 10 }}>
                    zzz {wakeTime ? `(${wakeTime})` : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
