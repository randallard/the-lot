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
  boardSize?: number;
  pendingResults?: GameResults[];
}

export interface KingsChessResults {
  sessionId: string;
  npcId: string;
  winner: "player" | "opponent" | "tie" | "incomplete";
  game: "kings-cooking";
  playerScore: number;
  opponentScore: number;
}

function decompressHash(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;
  const match = hash.match(/^#r=(.+)$/);
  if (!match) return null;
  return LZString.decompressFromEncodedURIComponent(match[1]);
}

function clearHash(): void {
  if (window.history.replaceState) {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search,
    );
  }
}

export function parseResultsFromHash(): GameResults | null {
  try {
    const decompressed = decompressHash();
    if (!decompressed) return null;

    const results = JSON.parse(decompressed) as GameResults & { game?: string };

    // Skip kings-cooking results — handled by parseKingsChessResultsFromHash
    if (results.game === "kings-cooking") return null;

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

    clearHash();
    return results;
  } catch {
    return null;
  }
}

export function parseKingsChessResultsFromHash(): KingsChessResults | null {
  try {
    const decompressed = decompressHash();
    if (!decompressed) return null;

    const results = JSON.parse(decompressed) as KingsChessResults;

    if (
      results.game !== "kings-cooking" ||
      !results.sessionId ||
      !results.npcId ||
      !results.winner
    ) {
      return null;
    }

    clearHash();
    return {
      ...results,
      playerScore: results.playerScore ?? 0,
      opponentScore: results.opponentScore ?? 0,
    };
  } catch {
    return null;
  }
}
