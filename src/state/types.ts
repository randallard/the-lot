// Source-of-truth game state — only store facts, derive everything else

export interface GameState {
  partsCollected: 0 | 1 | 2;
  assembled: boolean;
  npcSpoken: boolean;
  appInstalled: boolean;
  tutorialComplete: boolean;
  boards: Board[];
  // UI-only override for transient phases (cutscenes, dialogs)
  // When null, phase is derived from the above fields
  phaseOverride: PhaseOverride | null;
}

export type PhaseOverride =
  | { type: "part1-cutscene" }
  | { type: "assembly-cutscene" }
  | { type: "assembly-reveal"; step: "they-fit" | "its-a-bot" | "npc-speech" }
  | { type: "need-phone" } // "uh... you'll need your phone"
  | { type: "installing" } // app install animation on phone
  | { type: "tutorial-chat"; step: number } // NPC explaining the game
  | { type: "npc-nudge" } // "just click that app you just installed..."
  | { type: "npc-bye" } // "alrighty, maybe later" (walked away)
  | { type: "npc-welcome-back" }; // "cool, let's play!"

// Derived phase — what the game "should" be showing based on state
export type DerivedPhase =
  | { type: "exploring" }
  | { type: "between-parts" } // part1 done, waiting for part2
  | { type: "npc-waiting" } // NPC in world, assembled but no app yet
  | { type: "app-ready" } // app installed, waiting for tutorial/interaction
  | { type: "free-play" }; // tutorial done, board creation available

// The active phase is either the override (if set) or the derived phase
export type GamePhase = PhaseOverride | DerivedPhase;

export interface Board {
  id: string;
  boardSize: number;
  grid: CellContent[][];
  sequence: BoardMove[];
  createdAt: number;
}

export interface BoardMove {
  position: { row: number; col: number };
  type: "piece" | "trap" | "final";
  order: number;
}

export type CellContent = "empty" | "piece" | "trap" | "final";

export const INITIAL_STATE: GameState = {
  partsCollected: 0,
  assembled: false,
  npcSpoken: false,
  appInstalled: false,
  tutorialComplete: false,
  boards: [],
  phaseOverride: null,
};
