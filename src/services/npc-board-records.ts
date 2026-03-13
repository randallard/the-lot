/**
 * Per-NPC, per-board-size win/loss tracking with timestamps.
 * Stored in localStorage under "townage-npc-board-records".
 * Used for per-board-size rank calculations (S rank = 5 win streak in last 3 months).
 */

const STORAGE_KEY = "townage-npc-board-records";
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 100; // per npc+boardSize, prune older entries

export interface BoardGameEntry {
  timestamp: number;
  winner: "player" | "opponent" | "tie";
}

type BoardRecords = Record<string, BoardGameEntry[]>;

function makeKey(npcId: string, boardSize: number): string {
  return `${npcId}:${boardSize}`;
}

function loadAll(): BoardRecords {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveAll(records: BoardRecords): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export function recordBoardResult(
  npcId: string,
  boardSize: number,
  winner: "player" | "opponent" | "tie",
): void {
  const all = loadAll();
  const key = makeKey(npcId, boardSize);
  const entries = all[key] ?? [];
  entries.push({ timestamp: Date.now(), winner });
  // Prune to last MAX_ENTRIES
  if (entries.length > MAX_ENTRIES) {
    all[key] = entries.slice(-MAX_ENTRIES);
  } else {
    all[key] = entries;
  }
  saveAll(all);
}

/** All board sizes (2-10) that have at least one game against this NPC. */
export function getBoardSizesPlayed(npcId: string): number[] {
  const all = loadAll();
  const sizes: number[] = [];
  for (let s = 2; s <= 10; s++) {
    const entries = all[makeKey(npcId, s)];
    if (entries && entries.length > 0) sizes.push(s);
  }
  return sizes;
}

/** Board sizes 2-10 with no games against this NPC. */
export function getUnplayedBoardSizes(npcId: string): number[] {
  const played = new Set(getBoardSizesPlayed(npcId));
  const unplayed: number[] = [];
  for (let s = 2; s <= 10; s++) {
    if (!played.has(s)) unplayed.push(s);
  }
  return unplayed;
}

/** Recent entries within the last 3 months for a given npc + board size. */
export function getRecentEntries(npcId: string, boardSize: number): BoardGameEntry[] {
  const all = loadAll();
  const entries = all[makeKey(npcId, boardSize)] ?? [];
  const cutoff = Date.now() - THREE_MONTHS_MS;
  return entries.filter((e) => e.timestamp >= cutoff);
}

/** Current consecutive win streak from recent games (last 3 months), counting backward. */
export function getBoardWinStreak(npcId: string, boardSize: number): number {
  const recent = getRecentEntries(npcId, boardSize);
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].winner === "player") streak++;
    else break;
  }
  return streak;
}

/** S = 5+ streak, A = 3+, B = 1+, null = no wins. Per board size, last 3 months. */
export function getBoardRank(npcId: string, boardSize: number): "S" | "A" | "B" | null {
  const streak = getBoardWinStreak(npcId, boardSize);
  if (streak >= 5) return "S";
  if (streak >= 3) return "A";
  if (streak >= 1) return "B";
  return null;
}

/**
 * Overall Spaces Game rank against an NPC.
 * S = S rank on ALL board sizes played in the last 3 months.
 * Falls back to min rank across played sizes.
 */
export function getOverallSpacesRank(npcId: string): "S" | "A" | "B" | null {
  const played = getBoardSizesPlayed(npcId);
  if (played.length === 0) return null;

  // Only consider sizes with recent games
  const cutoff = Date.now() - THREE_MONTHS_MS;
  const all = loadAll();
  const recentSizes = played.filter((s) => {
    const entries = all[makeKey(npcId, s)] ?? [];
    return entries.some((e) => e.timestamp >= cutoff);
  });
  if (recentSizes.length === 0) return null;

  const ranks = recentSizes.map((s) => getBoardRank(npcId, s));
  if (ranks.every((r) => r === "S")) return "S";
  if (ranks.every((r) => r === "S" || r === "A")) return "A";
  if (ranks.some((r) => r !== null)) return "B";
  return null;
}
