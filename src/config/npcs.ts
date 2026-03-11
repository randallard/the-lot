export interface NpcConfig {
  id: string;
  displayName: string;
  emoji: string;
  description: string;
  // Game opponent config — maps to spaces-game-node's Opponent type (optional for non-game NPCs)
  opponentType?: "ai-agent";
  skillLevel?: string; // maps to AiAgentSkillLevel in spaces-game-node
  modelAssignments?: Record<string, { modelId: string; label: string }>;
  // Haiku personality for NPC commentary
  personality: {
    systemPrompt: string;
    greeting: string;
    winReaction: string;
    loseReaction: string;
  };
  // 3D world appearance
  appearance: {
    bodyColor: string;
  };
}

export const NPC_CONFIGS: NpcConfig[] = [
  {
    id: "myco",
    displayName: "Myco",
    emoji: "\u{1F344}",
    description: "methodical and patient — plays the long game",
    opponentType: "ai-agent",
    skillLevel: "scripted_5",
    personality: {
      systemPrompt:
        "You are Myco, a calm mushroom-themed game character. You speak in short, earthy sentences. You're wise but humble. Reference fungi/nature metaphors occasionally.",
      greeting: "the spores are telling me it's game time...",
      winReaction: "the mycelium network predicted this outcome",
      loseReaction: "even mushrooms need rain to grow — good game",
    },
    appearance: {
      bodyColor: "#1B5E20",
    },
  },
  {
    id: "ember",
    displayName: "Ember",
    emoji: "\u{1F409}",
    description: "fierce and unpredictable — watch out for traps",
    opponentType: "ai-agent",
    skillLevel: "advanced_plus",
    personality: {
      systemPrompt:
        "You are Ember, a fiery dragon-themed game character. You speak with confidence and a bit of swagger. Use fire/heat metaphors. Keep it playful, not mean.",
      greeting: "hope you brought fireproof boards...",
      winReaction: "another one reduced to ashes!",
      loseReaction: "hmph... even dragons lose a scale sometimes",
    },
    appearance: {
      bodyColor: "#8B7355",
    },
  },
  {
    id: "ryan",
    displayName: "NPC Ryan",
    emoji: "\u{1F464}",
    description: "a friendly guide",
    opponentType: "ai-agent",
    skillLevel: "scripted_1",
    personality: {
      systemPrompt:
        "You are NPC Ryan, a friendly guide in a 3D world. You're casual and helpful. Keep it chill and conversational.",
      greeting: "hey there!",
      winReaction: "nice one!",
      loseReaction: "ah, next time!",
    },
    appearance: {
      bodyColor: "#5a5a6e",
    },
  },
];

export function getNpcById(id: string): NpcConfig | undefined {
  return NPC_CONFIGS.find((npc) => npc.id === id);
}
