/**
 * Tracks active (unfinished) game sessions per NPC.
 * When a game is launched, the sessionId is saved.
 * On return with incomplete results, the sessionId is kept so the next
 * launch reuses it — allowing spaces-game-node to restore the game.
 * On return with final results, the sessionId is cleared.
 */

const STORAGE_KEY = "townage-active-sessions";

interface ActiveSession {
  npcId: string;
  sessionId: string;
}

export function getActiveSession(npcId: string): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const sessions: ActiveSession[] = JSON.parse(stored);
    return sessions.find((s) => s.npcId === npcId)?.sessionId ?? null;
  } catch {
    return null;
  }
}

export function saveActiveSession(npcId: string, sessionId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const sessions: ActiveSession[] = stored ? JSON.parse(stored) : [];
    const filtered = sessions.filter((s) => s.npcId !== npcId);
    filtered.push({ npcId, sessionId });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function clearActiveSession(npcId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const sessions: ActiveSession[] = JSON.parse(stored);
    const filtered = sessions.filter((s) => s.npcId !== npcId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}
