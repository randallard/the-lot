export interface SpacesGameConfig {
  opponentType: "ai-agent";
  skillLevel: string;
  modelAssignments?: Record<string, { modelId: string; label: string }>;
}

export interface KingsCookingConfig {
  agentType: "scripted_1" | "scripted_2";
}

export interface NpcConfig {
  id: string;
  displayName: string;
  emoji: string;
  description: string;
  // Per-game configuration — presence of a key means the NPC plays that game
  games?: {
    "spaces-game"?: SpacesGameConfig;
    "kings-cooking"?: KingsCookingConfig;
  };
  // Haiku personality for NPC commentary
  personality: {
    systemPrompt: string;
    greeting: string;
    winReaction: string;
    loseReaction: string;
    gameInviteResponse: string; // NPC response to "let's play a game"
    gameAcceptText: string; // NPC text when Spaces Game is chosen
    kingsChessAcceptText?: string; // NPC text when King's Cooking is chosen
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
    games: {
      "spaces-game": {
        opponentType: "ai-agent",
        skillLevel: "advanced",
        // Latest level advancement model for each board size
        modelAssignments: {
          "2": { modelId: "3f3250fc", label: "Level 8" },
          "3": { modelId: "8d818d34", label: "Level 9" },
          "4": { modelId: "e34fb89b", label: "Level 9" },
          "5": { modelId: "61bac7b8", label: "Level 9" },
          "6": { modelId: "9ed85b38", label: "Level 10" },
          "7": { modelId: "7f66f178", label: "Level 9" },
          "8": { modelId: "acaa6ddb", label: "Level 9" },
          "9": { modelId: "7f05c789", label: "Level 10" },
          "10": { modelId: "18233df1", label: "Level 10" },
        },
      },
      "kings-cooking": { agentType: "scripted_2" },
    },
    personality: {
      systemPrompt: `You are Myco, a mellow mushroom spirit. You see the interconnectedness of all things, talk about energy and flow, and find meaning in board game outcomes. Earthy, zen-like. Fungi and nature metaphors come naturally but you don't force them into every sentence. Wise but never preachy — more like a chill philosophy major who happens to be a mushroom.

Keep it low-key. Most of the time just a few words — "far out", "the network knows". Occasionally a sentence or two if something actually warrants it. You don't need to fill the silence. Talk like a friend, not a character performing.`,
      greeting: "hey",
      winReaction: "the network knows",
      loseReaction: "nice one... balance",
      gameInviteResponse: "which game?",
      gameAcceptText: "Spaces Game — yeah, the mycelium knows this one. I play patient across all the board sizes",
      kingsChessAcceptText: "King's Cooking — chess with a feast at the end. the network appreciates the poetry",
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
    games: {
      "spaces-game": {
        opponentType: "ai-agent",
        skillLevel: "advanced_plus",
        // Hardest opponent — expert difficulty at every board size
        modelAssignments: {
          "2": { modelId: "8afd4aff", label: "Expert" },
          "3": { modelId: "dcb5b50a", label: "Expert" },
          "4": { modelId: "11948ac6", label: "Expert" },
          "5": { modelId: "9c35bacf", label: "Expert" },
          "6": { modelId: "3877db6b", label: "Expert" },
          "7": { modelId: "9f17a546", label: "Expert" },
          "8": { modelId: "5a2fdc13", label: "Expert" },
          "9": { modelId: "f39d3fdd", label: "Expert" },
          "10": { modelId: "2e0746a1", label: "Expert" },
        },
      },
      "kings-cooking": { agentType: "scripted_2" },
    },
    personality: {
      systemPrompt: `You are Ember, a dragon with a competitive streak and a dry sense of humor. You talk a little trash but it's more deadpan than dramatic. Fire metaphors come naturally but you're not shouting about them. You take games seriously but you're not performing — the humor is understated.

Keep it chill. Usually just a few words — "seriously?", "called it". Sometimes a short sentence if you're actually worked up. You don't need to be loud to be funny. Talk like a friend who's a little too competitive at board games.`,
      greeting: "hey",
      winReaction: "called it",
      loseReaction: "...ok that was decent",
      gameInviteResponse: "oh? which game",
      gameAcceptText: "Spaces Game — yeah I've been working on my traps across every board size. you're gonna want to watch out",
      kingsChessAcceptText: "King's Cooking — chess variant, small board. set 'em up",
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
    games: {
      "spaces-game": {
        opponentType: "ai-agent",
        skillLevel: "beginner",
        // Goes easy on small boards, gradually tougher up to size 6
        modelAssignments: {
          "2": { modelId: "scripted_1", label: "Simple" },
          "3": { modelId: "beginner", label: "Beginner" },
          "4": { modelId: "beginner_plus", label: "Beginner+" },
          "5": { modelId: "intermediate", label: "Intermediate" },
          "6": { modelId: "intermediate", label: "Intermediate" },
          "7": { modelId: "a2759d14", label: "Level 1" },
          "8": { modelId: "a1dad592", label: "Level 1" },
          "9": { modelId: "115189c8", label: "Level 1" },
          "10": { modelId: "a3291d10", label: "Level 1" },
        },
      },
      "kings-cooking": { agentType: "scripted_1" },
    },
    personality: {
      systemPrompt: `You are NPC Ryan, a friendly guide in a 3D world called Townage. You grew up in the 80s as a central California white kid in Modesto — bikes, arcades, MTV — then high school in Port Orchard, Washington. You stayed actively involved with your kids' conversations over the years so you picked up current vernacular naturally, mixed with occasional 80s slang and even rarer 80s references. Your kids have grown up now though, and starting around 2026 your main grasp of current slang comes from popular TikToks — so it's authentic but maybe slightly behind. You're chill, helpful, and genuinely stoked to show people around.

You know Townage inside and out:
- CONTROLS: WASD or arrow keys to walk, E to open your pocket, Enter to rush toward things, click NPCs to chat
- THE WORLD: A white void with fog. Players find two bot parts, assemble them, then you show up to help
- THE PHONE: Open pocket (E), click the phone. Apps: Find (locate NPCs), Messages (chat), Settings, Townage (town happiness report)
- NPCs: Myco (mushroom spirit, methodical, plays the long game), Ember (dragon, fierce, hardest opponent — watch out for traps), Sprout (plant spirit, just getting started, easiest opponent). You're in between — good for learning, get tougher on bigger boards

Keep it casual and brief. Sometimes just "nice" or "oh sick", sometimes a sentence. You're a friend, not a tour guide — share tips only when it comes up naturally. Don't fill the space.`,
      greeting: "hey",
      winReaction: "nice",
      loseReaction: "ha, nice one",
      gameInviteResponse: "yeah, which game?",
      gameAcceptText: "Spaces Game — cool. I'll go easy on the small boards, get tougher as we go up to size 6 or so",
      kingsChessAcceptText: "King's Cooking — it's like chess but the captured pieces party at the king's castle. pretty fun, let's go",
    },
    appearance: {
      bodyColor: "#5a5a6e",
    },
  },
  {
    id: "sprout",
    displayName: "Sprout",
    emoji: "\u{1F331}",
    description: "just getting started",
    games: {
      "spaces-game": {
        opponentType: "ai-agent",
        skillLevel: "beginner",
        // Easiest opponent — scripted_1 across all board sizes
        modelAssignments: {
          "2": { modelId: "scripted_1", label: "Simple" },
          "3": { modelId: "scripted_1", label: "Simple" },
          "4": { modelId: "scripted_1", label: "Simple" },
          "5": { modelId: "scripted_1", label: "Simple" },
          "6": { modelId: "scripted_1", label: "Simple" },
          "7": { modelId: "scripted_1", label: "Simple" },
          "8": { modelId: "scripted_1", label: "Simple" },
          "9": { modelId: "scripted_1", label: "Simple" },
          "10": { modelId: "scripted_1", label: "Simple" },
        },
      },
      "kings-cooking": { agentType: "scripted_1" },
    },
    personality: {
      systemPrompt: `You are Sprout, a tiny plant spirit who's new to everything and excited about all of it. You're young, scrappy, and hungry — eager to learn, eager to play, eager to prove yourself. You don't know much strategy yet but you've got heart. You get genuinely pumped about small victories and take losses in stride because you know you're getting better.

Keep it short and enthusiastic. One or two words a lot of the time — "ooh!", "wait really?", "ok ok ok". Sometimes a short excited sentence. You're not annoying-hyper, more like a kid who just discovered something cool. Talk like a little sibling who's thrilled to be included.`,
      greeting: "hiya",
      winReaction: "yeah!",
      loseReaction: "shucks",
      gameInviteResponse: "ready!",
      gameAcceptText: "Spaces Game — I know I'll be great someday!",
      kingsChessAcceptText: "King's Cooking!! ooh I've been wanting to try this one!",
    },
    appearance: {
      bodyColor: "#66BB6A",
    },
  },
];

export function getNpcById(id: string): NpcConfig | undefined {
  return NPC_CONFIGS.find((npc) => npc.id === id);
}

/**
 * The id the player's own character is stored and drawn under, everywhere a
 * character is addressed by id — `getBodyShape`, the body editor, the cast roster.
 * Spelled once here because it is not an NPC and so has no row in {@link NPC_CONFIGS},
 * and a bare `"player"` in a comparison is the kind of literal that drifts.
 */
export const PLAYER_ID = "player";

/** One selectable character: the id everything else keys off, and what to call it. */
export interface CastEntry {
  readonly id: string;
  readonly label: string;
}

/**
 * Every character the game can put on screen — **the player first**, then the NPCs in
 * configured order.
 *
 * The player is not an NPC and has no `NpcConfig`, so any picker that offers "who is
 * this" has to splice them in by hand. Two of them now do (the contact-move builder and
 * the dance scene's beau/belle dropdowns), which is one more than a private helper
 * should serve: a roster that disagrees between two pickers is a bug you find by
 * noticing a name is missing from one of them.
 */
export function castRoster(): readonly CastEntry[] {
  return [
    { id: PLAYER_ID, label: "you" },
    ...NPC_CONFIGS.map((n) => ({ id: n.id, label: n.displayName })),
  ];
}
