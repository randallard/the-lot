/**
 * Per-NPC chat rate limiting with a rolling 12-hour window.
 * When an NPC hits the message limit, they "fall asleep" until
 * the oldest messages age out of the window.
 */

const STORAGE_KEY = "townage-npc-sleep";
const MESSAGE_LIMIT = 20;
const WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

function loadAll(): Record<string, number[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveAll(records: Record<string, number[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/** Prune timestamps older than the window. */
function prune(timestamps: number[]): number[] {
  const cutoff = Date.now() - WINDOW_MS;
  return timestamps.filter((t) => t >= cutoff);
}

/** Record a player message for rate limiting. */
export function recordMessage(npcId: string): void {
  const all = loadAll();
  const timestamps = prune(all[npcId] ?? []);
  timestamps.push(Date.now());
  all[npcId] = timestamps;
  saveAll(all);
  const remaining = MESSAGE_LIMIT - timestamps.length;
  if (remaining <= 0) {
    console.log(`[npc-sleep] ${npcId} fell asleep! (${timestamps.length}/${MESSAGE_LIMIT} messages)`);
  } else {
    console.log(`[npc-sleep] ${npcId}: ${timestamps.length}/${MESSAGE_LIMIT} messages — ${remaining} until sleep`);
  }
}

/** Number of messages sent to this NPC in the current window. */
export function getMessageCount(npcId: string): number {
  const all = loadAll();
  return prune(all[npcId] ?? []).length;
}

/** True if this NPC has hit their message limit. */
export function isAsleep(npcId: string): boolean {
  const count = getMessageCount(npcId);
  const asleep = count >= MESSAGE_LIMIT;
  if (asleep) {
    const wake = getTimeUntilWake(npcId);
    console.log(`[npc-sleep] ${npcId} is asleep (${count}/${MESSAGE_LIMIT}) — wakes ${wake ?? "soon"}`);
  }
  return asleep;
}

/** Timestamp when the NPC will wake (oldest message expires), or null. */
export function getWakeTime(npcId: string): number | null {
  const all = loadAll();
  const timestamps = prune(all[npcId] ?? []);
  if (timestamps.length < MESSAGE_LIMIT) return null;
  // The oldest message in the window — when it expires, count drops below limit
  const oldest = Math.min(...timestamps);
  return oldest + WINDOW_MS;
}

/** Human-readable time until wake, or null if not asleep. */
export function getTimeUntilWake(npcId: string): string | null {
  const wake = getWakeTime(npcId);
  if (!wake) return null;
  const ms = Math.max(0, wake - Date.now());
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `~${hours}h ${mins}m`;
  if (mins > 0) return `~${mins}m`;
  return "soon";
}

/** Messages remaining before this NPC sleeps. */
export function getMessagesRemaining(npcId: string): number {
  return Math.max(0, MESSAGE_LIMIT - getMessageCount(npcId));
}

/**
 * DEV HELPER — set an NPC to 1 message before sleep.
 * Run in browser console: `__debugSleep.almostAsleep("myco")`
 */
export function almostAsleep(npcId: string): void {
  const all = loadAll();
  const now = Date.now();
  // Fill with MESSAGE_LIMIT - 1 timestamps spread across last hour
  all[npcId] = Array.from({ length: MESSAGE_LIMIT - 1 }, (_, i) =>
    now - (MESSAGE_LIMIT - 1 - i) * 60_000,
  );
  saveAll(all);
  console.log(`[npc-sleep] ${npcId} set to ${MESSAGE_LIMIT - 1}/${MESSAGE_LIMIT} — one message from sleep`);
}

/** DEV HELPER — set ALL game NPCs to 1 message before sleep. */
export function almostAsleepAll(): void {
  for (const id of ["myco", "ember", "sprout"]) {
    almostAsleep(id);
  }
}

/** DEV HELPER — clear sleep state for an NPC (or all if no id). */
export function wakeSleep(npcId?: string): void {
  if (npcId) {
    const all = loadAll();
    delete all[npcId];
    saveAll(all);
    console.log(`[npc-sleep] ${npcId} cleared`);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[npc-sleep] all cleared");
  }
}

// Expose on window for console access
if (typeof window !== "undefined") {
  (window as any).__debugSleep = { almostAsleep, almostAsleepAll, wakeSleep };
}
