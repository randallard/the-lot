import type { NpcConfig } from "../config/npcs";
import type { GameResults } from "./parse-results";
import type { ChatMessage } from "./chat-storage";
import { getEffectiveLevel, enthusiasmPromptSuffix } from "./enthusiasm";
import { getFriendlinessLevel } from "./npc-friendliness";
import { getMessagesRemaining } from "./npc-sleep";

/**
 * Build a full NPC system prompt combining:
 * 1. NPC personality
 * 2. Enthusiasm suffix (player mood + per-NPC energy)
 * 3. Friendliness context (relationship tone)
 *
 * Friendliness levels (-1 to 4):
 *  -1: Player has been cold/mean. NPC is guarded.
 *   0: Professional, cordial. Default starting point.
 *   1: Warming up. Slight familiarity.
 *   2: Friendly. Comfortable.
 *   3: Good friends. Easy banter.
 *   4: Close. Inside jokes, real warmth.
 */
function buildSystemPrompt(npc: NpcConfig): string {
  const enthusiasm = enthusiasmPromptSuffix(getEffectiveLevel(npc.id));
  const friendliness = getFriendlinessLevel(npc.id);

  let friendlinessContext: string;
  if (friendliness <= -1) {
    friendlinessContext = " The player has been cold to you. Keep it short and professional — no warmth, no jokes. You're doing your job.";
  } else if (friendliness === 0) {
    friendlinessContext = " You and the player are acquaintances. Polite and professional — you enjoy your role helping them but it's still early days. 'Good game' energy.";
  } else if (friendliness === 1) {
    friendlinessContext = " You're starting to warm up to the player. A little more relaxed, slight familiarity creeping in. Still mostly professional.";
  } else if (friendliness === 2) {
    friendlinessContext = " You and the player are becoming friends. Comfortable, easy tone. You remember past interactions.";
  } else if (friendliness === 3) {
    friendlinessContext = " You and the player are good friends. Easy banter, you can tease a little. Natural and relaxed.";
  } else {
    friendlinessContext = " You and the player are close. Real warmth, maybe a callback to something you've talked about. The kind of vibe where you don't need to fill silence.";
  }

  return npc.personality.systemPrompt + enthusiasm + friendlinessContext;
}

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
        systemPrompt: buildSystemPrompt(npc),
        gameResults: {
          playerScore: results.playerScore,
          opponentScore: results.opponentScore,
          winner: results.winner,
          rounds: results.rounds,
        },
        context:
          results.winner === "incomplete"
            ? "You and the player were playing together but they had to leave before finishing. Be understanding — suggest picking it up later."
            : results.winner === "player"
              ? "You just played a game together and the player beat you."
              : results.winner === "opponent"
                ? "You just played a game together and you beat the player."
                : "You just played a game together and it was a tie.",
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    return data.dialogue;
  } catch {
    // Fall back to static personality strings
    if (results.winner === "incomplete") {
      return "no worries, we'll pick up where we left off later";
    } else if (results.winner === "player") {
      return npc.personality.loseReaction;
    } else if (results.winner === "opponent") {
      return npc.personality.winReaction;
    }
    return npc.personality.greeting;
  }
}

/**
 * Generate NPC's response when accepting a game.
 * playerChose: "spaces-game" = player picked Spaces Game
 * playerChose: "npc-choice" = player said "you choose"
 */
export async function getGameAcceptText(
  npc: NpcConfig,
  playerChose: "spaces-game" | "npc-choice",
): Promise<{ dialogue: string; chosenGame: string }> {
  const games = "Spaces Game";
  const prompt =
    playerChose === "npc-choice"
      ? `The player asked you to choose a game from this list: ${games}. Pick one at random and let them know which one you chose. Keep it chill and short — like texting a friend.`
      : `The player chose Spaces Game. Acknowledge it casually — you're about to play. Keep it short, like between friends.`;

  const response = await fetch("/api/npc-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: buildSystemPrompt(npc),
      messages: [{ role: "user", content: prompt }],
      useTool: true,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  // For now only Spaces Game exists; when more are added, parse from dialogue or add a tool field
  return { dialogue: data.dialogue, chosenGame: "spaces-game" };
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

  let systemPrompt = buildSystemPrompt(npc);
  const remaining = getMessagesRemaining(npc.id);
  if (remaining <= 2) {
    systemPrompt += " You're getting really sleepy and need to rest soon. Mention that you're getting tired and need to take a nap, but reassure the player you'll pick up right where you left off when you wake up. Stay in character — don't break the fourth wall about message limits.";
  }

  const response = await fetch("/api/npc-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      messages,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.dialogue;
}
