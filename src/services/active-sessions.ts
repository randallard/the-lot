/**
 * Tracks active (unfinished) game sessions per NPC.
 * When a game is launched, the sessionId is saved.
 * On return with incomplete results, the sessionId is kept so the next
 * launch reuses it — allowing spaces-game-node to restore the game.
 * On return with final results, the sessionId is cleared.
 */

import { arrayOf, isRecord, isString, readStoredJson } from "./json-guards";

const STORAGE_KEY = "townage-active-sessions";

interface ActiveSession {
  npcId: string;
  sessionId: string;
}

function isActiveSession(v: unknown): v is ActiveSession {
  return isRecord(v) && isString(v.npcId) && isString(v.sessionId);
}

function load(): ActiveSession[] {
  return arrayOf(readStoredJson(STORAGE_KEY), isActiveSession);
}

export function getActiveSession(npcId: string): string | null {
  return load().find((s) => s.npcId === npcId)?.sessionId ?? null;
}

export function saveActiveSession(npcId: string, sessionId: string): void {
  try {
    const filtered = load().filter((s) => s.npcId !== npcId);
    filtered.push({ npcId, sessionId });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function getAllActiveSessions(): ActiveSession[] {
  return load();
}

export function clearActiveSession(npcId: string): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) === null) return;
    const filtered = load().filter((s) => s.npcId !== npcId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}
