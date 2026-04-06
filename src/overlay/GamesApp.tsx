import { launchGameHome } from "../services/launch-game";

interface GamesAppProps {
  onBack: () => void;
}

const gameCardStyle: React.CSSProperties = {
  width: "100%",
  background: "#1a1a2e",
  border: "2px solid #2a2a3e",
  borderRadius: 12,
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
};

export function GamesApp({ onBack }: GamesAppProps) {
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
        games
      </p>

      <div style={gameCardStyle} onClick={() => launchGameHome("spaces-game")}>
        <div>
          <p style={{ color: "#ccc", fontSize: 14, fontWeight: 600, margin: 0 }}>
            Spaces Game
          </p>
          <p style={{ color: "#666", fontSize: 11, margin: "4px 0 0" }}>
            strategy board game — 5 rounds
          </p>
        </div>
        <span style={{ color: "#6a4c93", fontSize: 18 }}>→</span>
      </div>

      <div style={gameCardStyle} onClick={() => launchGameHome("kings-cooking")}>
        <div>
          <p style={{ color: "#ccc", fontSize: 14, fontWeight: 600, margin: 0 }}>
            King's Cooking
          </p>
          <p style={{ color: "#666", fontSize: 11, margin: "4px 0 0" }}>
            chess variant — 3-column board
          </p>
        </div>
        <span style={{ color: "#6a4c93", fontSize: 18 }}>→</span>
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
          marginTop: 4,
        }}
      >
        back
      </button>
    </div>
  );
}
