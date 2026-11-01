import LZString from "lz-string";
import { arrayOf, isNumber, isRecord, isString } from "./json-guards";

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
  const encoded = match?.[1];
  if (encoded === undefined) return null;
  return LZString.decompressFromEncodedURIComponent(encoded);
}

function clearHash(): void {
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.search,
  );
}

type Winner = GameResults["rounds"][number]["winner"];

const isWinner = (v: unknown): v is Winner => v === "player" || v === "opponent" || v === "tie";
const isFinalOrIncomplete = (v: unknown): v is GameResults["winner"] => isWinner(v) || v === "incomplete";
const isId = (v: unknown): v is string => isString(v) && v !== "";

function isRound(v: unknown): v is GameResults["rounds"][number] {
  return isRecord(v) && isNumber(v.round) && isNumber(v.playerPoints) && isNumber(v.opponentPoints) &&
    isWinner(v.winner);
}

/**
 * Spaces Game results, built from the fields that check out; `null` without an id, both scores
 * and a winner. Rounds that don't read as rounds are dropped, and missing rounds read as none.
 */
function readGameResults(v: unknown): GameResults | null {
  if (!isRecord(v) || v.game === "kings-cooking") return null;
  const { sessionId, npcId, playerScore, opponentScore, winner, boardSize, pendingResults } = v;
  if (!isId(sessionId) || !isId(npcId) || !isNumber(playerScore) || !isNumber(opponentScore) ||
      !isFinalOrIncomplete(winner)) {
    return null;
  }
  return {
    sessionId, npcId, playerScore, opponentScore, winner,
    rounds: arrayOf(v.rounds, isRound),
    ...(isNumber(boardSize) ? { boardSize } : {}),
    ...(Array.isArray(pendingResults)
      ? { pendingResults: pendingResults.flatMap((p: unknown) => readGameResults(p) ?? []) }
      : {}),
  };
}

export function parseResultsFromHash(): GameResults | null {
  try {
    const decompressed = decompressHash();
    if (!decompressed) return null;

    // Kings-cooking results read as null here: parseKingsChessResultsFromHash handles them.
    const results = readGameResults(JSON.parse(decompressed));
    if (results === null) return null;

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

    const results: unknown = JSON.parse(decompressed);
    if (!isRecord(results)) return null;
    const { sessionId, npcId, winner, playerScore, opponentScore } = results;
    if (results.game !== "kings-cooking" || !isId(sessionId) || !isId(npcId) ||
        !isFinalOrIncomplete(winner)) {
      return null;
    }

    clearHash();
    return {
      sessionId, npcId, winner,
      game: "kings-cooking",
      playerScore: isNumber(playerScore) ? playerScore : 0,
      opponentScore: isNumber(opponentScore) ? opponentScore : 0,
    };
  } catch {
    return null;
  }
}
