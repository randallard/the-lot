/**
 * Per-NPC win/loss/tie tracking.
 * Stored in localStorage under "townage-npc-records".
 */

const STORAGE_KEY = "townage-npc-records";

export interface NpcRecord {
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
  currentWinStreak: number;
  currentLossStreak: number;
  bestWinStreak?: number;
}

function defaultRecord(): NpcRecord {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    totalGames: 0,
    currentWinStreak: 0,
    currentLossStreak: 0,
  };
}

function loadAll(): Record<string, NpcRecord> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveAll(records: Record<string, NpcRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export function getRecord(npcId: string): NpcRecord {
  const all = loadAll();
  return all[npcId] ?? defaultRecord();
}

/** Best win streak ever achieved against this NPC. */
export function getBestWinStreak(npcId: string): number {
  const all = loadAll();
  const record = all[npcId];
  return record ? (record.bestWinStreak ?? record.currentWinStreak) : 0;
}

/** S = 5+ win streak, A = 3+, B = 1+, null = no wins. */
export function getRank(npcId: string): "S" | "A" | "B" | null {
  const best = getBestWinStreak(npcId);
  if (best >= 5) return "S";
  if (best >= 3) return "A";
  if (best >= 1) return "B";
  return null;
}

export function recordResult(
  npcId: string,
  winner: "player" | "opponent" | "tie",
): NpcRecord {
  const all = loadAll();
  const record = all[npcId] ?? defaultRecord();

  record.totalGames++;

  if (winner === "player") {
    record.wins++;
    record.currentWinStreak++;
    record.currentLossStreak = 0;
    record.bestWinStreak = Math.max(record.bestWinStreak ?? 0, record.currentWinStreak);
  } else if (winner === "opponent") {
    record.losses++;
    record.currentLossStreak++;
    record.currentWinStreak = 0;
  } else {
    record.ties++;
    // Ties reset both streaks
    record.currentWinStreak = 0;
    record.currentLossStreak = 0;
  }

  all[npcId] = record;
  saveAll(all);
  return record;
}
