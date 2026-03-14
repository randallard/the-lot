/**
 * Town happiness — a simple 0-4 score based on how well the player
 * is treating NPCs and staying active.
 *
 * Factors:
 * 1. Average friendliness across all NPCs (0-4 scale)
 * 2. Recent game activity (played each NPC in last 3 days?)
 * 3. Coverage (interacting with all NPCs, not just one)
 */

import { NPC_CONFIGS } from "../config/npcs";
import { getFriendliness } from "./npc-friendliness";
import { getRecord } from "./npc-records";

/** 0-4 happiness score. */
export function getTownHappiness(): number {
  const gameNpcs = NPC_CONFIGS.filter((n) => n.opponentType);
  if (gameNpcs.length === 0) return 2;

  // 1. Average friendliness (0 to 4)
  const avgFriendliness =
    gameNpcs.reduce((sum, n) => sum + Math.max(0, getFriendliness(n.id)), 0) / gameNpcs.length;

  // 2. Game activity — what fraction of NPCs have been played?
  let recentlyPlayed = 0;
  for (const npc of gameNpcs) {
    const record = getRecord(npc.id);
    if (record.totalGames > 0) recentlyPlayed++;
  }
  const activityRatio = recentlyPlayed / gameNpcs.length; // 0-1

  // Blend: 60% friendliness, 40% activity (scaled to 0-4)
  const raw = avgFriendliness * 0.6 + activityRatio * 4 * 0.4;

  return Math.round(Math.max(0, Math.min(4, raw)));
}

/** Map happiness score to emoji face. */
export function getHappinessEmoji(level: number): string {
  const emojis = ["\u{1F610}", "\u{1F642}", "\u{1F60A}", "\u{1F604}", "\u{1F929}"];
  return emojis[Math.max(0, Math.min(4, level))];
}
