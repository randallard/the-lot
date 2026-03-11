/**
 * Determines whether an NPC should comment on a game result.
 * Not every game gets a response — this makes NPC messages feel more natural.
 */

import type { NpcRecord } from "./npc-records";

/**
 * Decide if an NPC should comment on this game result.
 *
 * Rules:
 * - Always comment: first game with NPC, streak of 3+, every 5th game (milestones)
 * - Base 45% chance + 15% for close games (score diff <= 1) + 10% for player wins
 * - Max ~70% for a close player win, minimum 45% for unremarkable games
 */
export function shouldNpcComment(
  _npcId: string,
  winner: "player" | "opponent" | "tie",
  record: NpcRecord,
  scores: { playerScore: number; opponentScore: number },
): boolean {
  // Always comment on first game
  if (record.totalGames <= 1) return true;

  // Always comment on streaks of 3+
  if (record.currentWinStreak >= 3 || record.currentLossStreak >= 3) return true;

  // Always comment on milestones (every 5th game)
  if (record.totalGames % 5 === 0) return true;

  // Probabilistic: base 45%
  let chance = 0.45;

  // +15% for close games (score diff <= 1)
  const diff = Math.abs(scores.playerScore - scores.opponentScore);
  if (diff <= 1) chance += 0.15;

  // +10% for player wins
  if (winner === "player") chance += 0.1;

  return Math.random() < chance;
}
