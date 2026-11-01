/**
 * Tracks whether the player has seen each NPC's full game intro text.
 * After the first time, Haiku generates shorter accept messages.
 */

import { isBoolean, readStoredJson, recordOf } from "./json-guards";

const STORAGE_KEY = "townage-npc-intro-seen";

function load(): Record<string, boolean> {
  return recordOf(readStoredJson(STORAGE_KEY), isBoolean);
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
