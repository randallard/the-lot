import type { GameSession } from "../state/types";

interface GameOverProps {
  game: GameSession;
  onDone: () => void;
}

export function GameOver({ game, onDone }: GameOverProps) {
  const playerWon = game.playerScore > game.opponentScore;
  const tied = game.playerScore === game.opponentScore;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
      <h3 style={{ color: "#fff", margin: 0, fontSize: 20 }}>
        Game Over
      </h3>

      <div style={{
        fontSize: 32,
        fontWeight: 700,
        color: playerWon ? "#52c41a" : tied ? "#faad14" : "#f5222d",
        margin: "8px 0",
      }}>
        {playerWon ? "You Win!" : tied ? "It's a Tie!" : "You Lose"}
      </div>

      <div style={{ display: "flex", gap: 40, color: "#ccc", fontSize: 14 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>You</p>
          <p style={{ margin: 0, fontSize: 36, color: "#4a90e2", fontWeight: 700 }}>{game.playerScore}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>NPC</p>
          <p style={{ margin: 0, fontSize: 36, color: "#e24a4a", fontWeight: 700 }}>{game.opponentScore}</p>
        </div>
      </div>

      {/* Round breakdown */}
      <div style={{ width: "100%", maxWidth: 280 }}>
        {game.rounds.map((r) => (
          <div
            key={r.round}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid #333",
              color: "#aaa",
              fontSize: 12,
            }}
          >
            <span>Round {r.round}</span>
            <span>
              <span style={{ color: "#4a90e2" }}>{r.playerPoints}</span>
              {" - "}
              <span style={{ color: "#e24a4a" }}>{r.opponentPoints}</span>
              {r.winner === "player" ? " ✓" : r.winner === "opponent" ? " ✗" : " ="}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        style={{
          padding: "10px 24px",
          background: "#4a90e2",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          marginTop: 12,
        }}
      >
        Done
      </button>
    </div>
  );
}
