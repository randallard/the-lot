import type { NpcConfig } from "../config/npcs";
import type { GameResults } from "./parse-results";
import type { ChatMessage } from "./chat-storage";

export async function getNpcCommentary(
  npc: NpcConfig,
  results: GameResults,
): Promise<string> {
  try {
    const response = await fetch("/api/npc-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        npcId: npc.id,
        systemPrompt: npc.personality.systemPrompt,
        gameResults: {
          playerScore: results.playerScore,
          opponentScore: results.opponentScore,
          winner: results.winner,
          rounds: results.rounds,
        },
        context:
          results.winner === "incomplete"
            ? "The player left the game before finishing."
            : results.winner === "player"
              ? "The player beat you."
              : results.winner === "opponent"
                ? "You beat the player."
                : "It was a tie.",
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    return data.dialogue;
  } catch {
    // Fall back to static personality strings
    if (results.winner === "incomplete") {
      return "leaving already? we can finish later";
    } else if (results.winner === "player") {
      return npc.personality.loseReaction;
    } else if (results.winner === "opponent") {
      return npc.personality.winReaction;
    }
    return npc.personality.greeting;
  }
}

export async function chatWithNpc(
  npc: NpcConfig,
  history: ChatMessage[],
): Promise<string> {
  const recentHistory = history.slice(-20);
  const messages = recentHistory.map((msg) => ({
    role: msg.sender === "player" ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }));

  const response = await fetch("/api/npc-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt:
        npc.personality.systemPrompt +
        " Keep responses brief (1-2 sentences). Be conversational and in-character.",
      messages,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.dialogue;
}
