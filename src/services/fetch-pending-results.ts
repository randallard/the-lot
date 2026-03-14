/**
 * Fetches pending game results from the spaces-game Vercel KV store.
 * Called on townage mount to detect games completed without returning.
 */

import { getAllActiveSessions } from "./active-sessions";
import type { AsyncResult } from "./async-npc-messages";

const GAME_API_URL =
  import.meta.env.VITE_SPACES_GAME_URL || "https://spaces-game-api.vercel.app";

/**
 * Fetch pending lot results for all active sessions from the server.
 * Returns results for games that were completed but the user didn't return from.
 * Deletes consumed results from KV after successful fetch.
 */
export async function fetchPendingResults(): Promise<AsyncResult[]> {
  const sessions = getAllActiveSessions();
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.sessionId);

  try {
    const response = await fetch(
      `${GAME_API_URL}/api/lot-results?sessions=${sessionIds.join(",")}`,
    );

    if (!response.ok) {
      // Endpoint may not exist yet — silently skip
      return [];
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Got HTML/text back — endpoint not deployed yet
      return [];
    }

    const data = await response.json();
    const results: AsyncResult[] = data.results ?? [];

    if (results.length === 0) return [];

    // Delete consumed results from KV (fire-and-forget)
    fetch(`${GAME_API_URL}/api/lot-results`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessions: results.map((r) => r.sessionId),
      }),
    }).catch(() => {});

    return results;
  } catch (error) {
    console.error("[fetchPendingResults] Error:", error);
    return [];
  }
}
