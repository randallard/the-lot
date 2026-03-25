/**
 * Per-NPC win/loss/tie tracking for King's Cooking.
 * Stored in localStorage under "townage-npc-kings-chess-records".
 */

const STORAGE_KEY = "townage-npc-kings-chess-records";

/** localStorage key used by kings-cooking to store mid-game saves. */
const progressKey = (npcId: string) => `townage-kings-cooking-game-${npcId}`;

export interface KingsChessRecord {
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
  currentWinStreak: number;
  currentLossStreak: number;
  bestWinStreak?: number;
}

function defaultRecord(): KingsChessRecord {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    totalGames: 0,
    currentWinStreak: 0,
    currentLossStreak: 0,
  };
}

function loadAll(): Record<string, KingsChessRecord> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as Record<string, KingsChessRecord>) : {};
  } catch {
    return {};
  }
}

function saveAll(records: Record<string, KingsChessRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export function getKingsChessRecord(npcId: string): KingsChessRecord {
  const all = loadAll();
  return all[npcId] ?? defaultRecord();
}

export function recordKingsChessResult(
  npcId: string,
  winner: "player" | "opponent" | "tie",
): KingsChessRecord {
  const all = loadAll();
  const record = all[npcId] ?? defaultRecord();

  record.totalGames++;

  if (winner === "player") {
    record.wins++;
    record.currentWinStreak++;
    record.currentLossStreak = 0;
    record.bestWinStreak = Math.max(
      record.bestWinStreak ?? 0,
      record.currentWinStreak,
    );
  } else if (winner === "opponent") {
    record.losses++;
    record.currentLossStreak++;
    record.currentWinStreak = 0;
  } else {
    record.ties++;
    record.currentWinStreak = 0;
    record.currentLossStreak = 0;
  }

  all[npcId] = record;
  saveAll(all);
  return record;
}

/** S = 5+ win streak, A = 3+, B = 1+, null = no wins. */
export function getKingsChessRank(npcId: string): "S" | "A" | "B" | null {
  const record = getKingsChessRecord(npcId);
  const best = record.bestWinStreak ?? record.currentWinStreak;
  if (best >= 5) return "S";
  if (best >= 3) return "A";
  if (best >= 1) return "B";
  return null;
}

/** Returns true when kings-cooking has a mid-game save for this NPC. */
export function hasKingsChessInProgress(npcId: string): boolean {
  return localStorage.getItem(progressKey(npcId)) !== null;
}
