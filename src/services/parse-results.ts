import LZString from "lz-string";

export interface GameResults {
  sessionId: string;
  npcId: string;
  playerScore: number;
  opponentScore: number;
  winner: "player" | "opponent" | "tie" | "incomplete";
  rounds: Array<{
    round: number;
    playerPoints: number;
    opponentPoints: number;
    winner: "player" | "opponent" | "tie";
  }>;
}

export function parseResultsFromHash(): GameResults | null {
  const hash = window.location.hash;
  if (!hash) return null;

  // Look for #r=<compressed> format
  const match = hash.match(/^#r=(.+)$/);
  if (!match) return null;

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(match[1]);
    if (!decompressed) return null;

    const results = JSON.parse(decompressed) as GameResults;

    // Validate required fields
    if (
      !results.sessionId ||
      !results.npcId ||
      results.playerScore === undefined ||
      results.opponentScore === undefined ||
      !results.winner
    ) {
      return null;
    }

    // Clear hash from URL
    if (window.history.replaceState) {
      const urlWithoutHash =
        window.location.pathname + window.location.search;
      window.history.replaceState({}, document.title, urlWithoutHash);
    }

    return results;
  } catch {
    return null;
  }
}
