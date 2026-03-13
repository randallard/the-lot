// Source-of-truth game state — only store facts, derive everything else

import type { GameResults } from "../services/parse-results";

export interface GameState {
  partsCollected: 0 | 1 | 2;
  assembled: boolean;
  npcSpoken: boolean;
  appInstalled: boolean;
  npcRelaxing: boolean; // NPC went to camp after player walked away
  tutorialComplete: boolean;
  boards: Board[];
  // UI-only override for transient phases (cutscenes, dialogs)
  // When null, phase is derived from the above fields
  phaseOverride: PhaseOverride | null;
  // Where to resume when the player comes back to the NPC
  resumePhase: ResumePoint | null;
  // Results returned from spaces-game
  gameResults: GameResults | null;
}

export type PhaseOverride =
  | { type: "part1-cutscene" }
  | { type: "assembly-cutscene" }
  | { type: "assembly-reveal"; step: "they-fit" | "its-a-bot" | "npc-speech" }
  | { type: "need-phone" } // "uh... you'll need your phone"
  | { type: "installing" } // app install animation on phone
  | { type: "waiting-app-click" } // phone open with speech bubble, waiting for player to click app
  | { type: "npc-nudge" } // "just click that app you just installed..."
  | { type: "npc-bye" } // "alrighty, maybe later" (walked away)
  | { type: "npc-welcome-back" } // "cool, let's play!"
  | { type: "npc-question" } // "what do you think?" → thought bubble
  | { type: "opponents-list" } // opponents screen after install
  | { type: "game-invite"; npcId: string } // NPC says "which game?" + player choices
  | { type: "game-accept"; npcId: string; playerChose: "spaces-game" | "npc-choice" } // NPC pre-game text before launching
  | { type: "game-select" } // choosing which game to play
  | { type: "board-creation" } // player building their board
  | { type: "phone-home" } // phone homescreen in free-play
  | { type: "find-app" } // find NPC app
  | { type: "chat-app" } // messaging app
  | { type: "settings-app" } // settings app
  | { type: "launching-game" } // navigating to spaces-game
  | { type: "npc-commentary" }; // NPC reacting to game results

// Where the player left off when they walked away
export type ResumePoint =
  | "need-phone"       // hadn't opened pocket yet
  | "waiting-app-click" // app installed but not clicked
  | "opponents-list"
  | "game-select"
  | "board-creation";

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
  npcRelaxing: false,
  tutorialComplete: false,
  boards: [],
  phaseOverride: null,
  resumePhase: null,
  gameResults: null,
};
