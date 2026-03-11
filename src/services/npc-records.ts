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
