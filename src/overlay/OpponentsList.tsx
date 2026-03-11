import { NPC_CONFIGS } from "../config/npcs";

interface OpponentsListProps {
  onPlay: (npcId: string) => void;
}

export function OpponentsList({ onPlay }: OpponentsListProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "24px 16px",
        minHeight: "100%",
      }}
    >
      <p
        style={{
          color: "#9b59b6",
          fontSize: 16,
          fontWeight: 700,
          margin: 0,
          letterSpacing: 1,
        }}
      >
        opponents
      </p>

      {NPC_CONFIGS.map((npc) => (
        <div
          key={npc.id}
          style={{
            width: "100%",
            background: "#1a1a2e",
            border: "1px solid #2a2a3e",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                color: "#ccc",
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
              }}
            >
              {npc.emoji} {npc.displayName}
            </p>
            <p style={{ color: "#666", fontSize: 11, margin: "4px 0 0" }}>
              {npc.description}
            </p>
          </div>

          <button
            onClick={() => onPlay(npc.id)}
            style={{
              padding: "8px 20px",
              background: "#6a4c93",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            play
          </button>
        </div>
      ))}
    </div>
  );
}
