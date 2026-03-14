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

const ALL_SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const RANK_VALUE: Record<string, number> = { S: 3, A: 2, B: 1 };

/**
 * Overall Spaces Game rank against an NPC.
 * S = S rank on ALL 9 board sizes (2-10) — perfect mastery.
 * A = all played sizes are S but not all 9 covered, OR A+ on all 9,
 *     OR average rank across played sizes is A-level (>= 2.0).
 * B = any rank on any size.
 */
export function getOverallSpacesRank(npcId: string): "S" | "A" | "B" | null {
  const cutoff = Date.now() - THREE_MONTHS_MS;
  const all = loadAll();

  // Get ranks for all sizes with recent games
  const recentRanks: { size: number; rank: "S" | "A" | "B" | null }[] = [];
  for (const s of ALL_SIZES) {
    const entries = all[makeKey(npcId, s)] ?? [];
    if (entries.some((e) => e.timestamp >= cutoff)) {
      recentRanks.push({ size: s, rank: getBoardRank(npcId, s) });
    }
  }

  const ranked = recentRanks.filter((r) => r.rank !== null);
  if (ranked.length === 0) return null;

  const allCovered = recentRanks.length === ALL_SIZES.length;
  const allS = ranked.length === recentRanks.length && ranked.every((r) => r.rank === "S");
  const allAPlus = ranked.length === recentRanks.length && ranked.every((r) => r.rank === "S" || r.rank === "A");

  // S: S on every single board size
  if (allS && allCovered) return "S";

  // A: all played are S but missing sizes, OR A+ on all 9, OR average >= A
  if (allS && !allCovered) return "A";
  if (allAPlus && allCovered) return "A";
  const avg = ranked.reduce((sum, r) => sum + RANK_VALUE[r.rank!], 0) / ranked.length;
  if (avg >= 2) return "A";

  return "B";
}
