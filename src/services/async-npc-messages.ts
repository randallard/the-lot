/**
 * Processes async game results (fetched from Vercel KV) and generates
 * NPC chat messages for completed games the player didn't return from.
 */

import { getNpcById } from "../config/npcs";
import { addMessage, genMessageId, getPreferences } from "./chat-storage";
import { getNpcCommentary } from "./haiku-npc";
import { recordResult } from "./npc-records";
import { shouldNpcComment } from "./npc-response-chance";
import { clearActiveSession } from "./active-sessions";
import type { GameResults } from "./parse-results";

export interface AsyncResult {
  sessionId: string;
  npcId: string;
  playerScore: number;
  opponentScore: number;
  winner: "player" | "opponent" | "tie";
  rounds: Array<{
    round: number;
    playerPoints: number;
    opponentPoints: number;
    winner: string;
  }>;
  completedAt: number;
}

/**
 * Process async results: update records, optionally generate NPC messages.
 * Returns the number of unread messages generated.
 */
export async function processAsyncResults(
  results: AsyncResult[],
): Promise<number> {
  let unreadCount = 0;

  for (const result of results) {
    const npc = getNpcById(result.npcId);
    if (!npc) continue;

    // Update win/loss record
    const record = recordResult(result.npcId, result.winner);

    // Clear the active session since the game is complete
    clearActiveSession(result.npcId);

    // Check if NPC should comment
    if (
      !shouldNpcComment(result.npcId, result.winner, record, {
        playerScore: result.playerScore,
        opponentScore: result.opponentScore,
      })
    ) {
      continue;
    }

    // Generate NPC commentary
    const gameResults: GameResults = {
      sessionId: result.sessionId,
      npcId: result.npcId,
      playerScore: result.playerScore,
      opponentScore: result.opponentScore,
      winner: result.winner,
      rounds: result.rounds.map((r) => ({
        round: r.round,
        playerPoints: r.playerPoints,
        opponentPoints: r.opponentPoints,
        winner: r.winner as "player" | "opponent" | "tie",
      })),
    };

    let commentary: string;
    const prefs = getPreferences();

    if (prefs.useHaiku) {
      try {
        commentary = await getNpcCommentary(npc, gameResults);
      } catch {
        commentary = getStaticFallback(npc, result.winner);
      }
    } else {
      commentary = getStaticFallback(npc, result.winner);
    }

    // Save to chat storage with isUnread flag
    addMessage(result.npcId, {
      id: genMessageId(),
      sender: "npc",
      text: commentary,
      timestamp: result.completedAt || Date.now(),
      isUnread: true,
    });

    unreadCount++;
  }

  return unreadCount;
}

function getStaticFallback(
  npc: { personality: { winReaction: string; loseReaction: string; greeting: string } },
  winner: "player" | "opponent" | "tie",
): string {
  if (winner === "player") return npc.personality.loseReaction;
  if (winner === "opponent") return npc.personality.winReaction;
  return npc.personality.greeting;
}
