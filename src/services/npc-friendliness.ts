/**
 * Per-NPC friendliness meter (-1 to 4).
 * Starts at 0 or 1 (random on first encounter). Nudges up with positive interactions.
 * Only dips below 0 if the player is genuinely cold/mean (requires sentiment).
 */

const STORAGE_KEY = "townage-npc-friendliness";

export const FRIENDLINESS_MIN = -1;
export const FRIENDLINESS_MAX = 4;
export const FRIENDLINESS_DEFAULT = 0;

function clamp(n: number): number {
  return Math.max(FRIENDLINESS_MIN, Math.min(FRIENDLINESS_MAX, n));
}

function loadAll(): Record<string, number> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveAll(records: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * Get the friendliness level for an NPC (float, -1 to 4).
 * On first access, initializes to 0 or 1 randomly and persists.
 */
export function getFriendliness(npcId: string): number {
  const all = loadAll();
  if (!(npcId in all)) {
    // First encounter — random 0 or 1
    const initial = Math.random() < 0.5 ? 0 : 1;
    all[npcId] = initial;
    saveAll(all);
    return initial;
  }
  return all[npcId];
}

/** Get the friendliness as a whole number for prompt selection. */
export function getFriendlinessLevel(npcId: string): number {
  return Math.round(getFriendliness(npcId));
}

/** Nudge friendliness up after a positive interaction. */
export function nudgeFriendliness(
  npcId: string,
  amount: number,
): number {
  // getFriendliness initializes on first access if needed
  const current = getFriendliness(npcId);
  const next = clamp(current + amount);
  const all = loadAll();
  all[npcId] = Math.round(next * 100) / 100; // 2 decimal precision
  saveAll(all);
  return next;
}

/** Set friendliness directly (for testing / admin). */
export function setFriendliness(npcId: string, value: number): void {
  const all = loadAll();
  all[npcId] = clamp(value);
  saveAll(all);
}

// Nudge amounts
export const NUDGE_CHAT = 0.1;       // per message exchange
export const NUDGE_GAME_PLAYED = 0.2; // per game completed
export const NUDGE_COLD = -0.3;       // player was cold/mean (requires detection)
