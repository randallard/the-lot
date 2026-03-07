import type { GameSession } from "../state/types";

interface RoundResultProps {
  game: GameSession;
  onNext: () => void;
}

export function RoundResult({ game, onNext }: RoundResultProps) {
  const lastRound = game.rounds[game.rounds.length - 1];
  if (!lastRound) return null;

  const isLastRound = game.currentRound >= game.totalRounds;
  const runningPlayerScore = game.playerScore + lastRound.playerPoints;
  const runningOpponentScore = game.opponentScore + lastRound.opponentPoints;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
      <h3 style={{ color: "#fff", margin: 0, fontSize: 18 }}>
        Round {lastRound.round} Result
      </h3>

      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: lastRound.winner === "player" ? "#52c41a" : lastRound.winner === "opponent" ? "#f5222d" : "#faad14",
        margin: "8px 0",
      }}>
        {lastRound.winner === "player" ? "You Win!" : lastRound.winner === "opponent" ? "You Lose" : "Tie!"}
      </div>

      <div style={{ display: "flex", gap: 32, color: "#ccc", fontSize: 14 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>You</p>
          <p style={{ margin: 0, fontSize: 24, color: "#4a90e2" }}>+{lastRound.playerPoints}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>NPC</p>
          <p style={{ margin: 0, fontSize: 24, color: "#e24a4a" }}>+{lastRound.opponentPoints}</p>
        </div>
      </div>

      <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
        Total: {runningPlayerScore} - {runningOpponentScore}
      </div>

      <button
        onClick={onNext}
        style={{
          padding: "10px 24px",
          background: "#4a90e2",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          marginTop: 8,
        }}
      >
        {isLastRound ? "Final Results" : "Next Round"}
      </button>
    </div>
  );
}
