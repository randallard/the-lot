/**
 * Tracks whether the player has seen each NPC's full game intro text.
 * After the first time, Haiku generates shorter accept messages.
 */

const STORAGE_KEY = "townage-npc-intro-seen";

function load(): Record<string, boolean> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function hasSeenIntro(npcId: string): boolean {
  return load()[npcId] === true;
}

export function markIntroSeen(npcId: string): void {
  try {
    const seen = load();
    seen[npcId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {}
}
