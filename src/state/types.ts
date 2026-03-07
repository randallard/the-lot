// Source-of-truth game state — only store facts, derive everything else

export interface GameState {
  partsCollected: 0 | 1 | 2;
  assembled: boolean;
  npcSpoken: boolean;
  appInstalled: boolean;
  npcRelaxing: boolean; // NPC went to camp after player walked away
  tutorialComplete: boolean;
  boards: Board[];
  currentGame: GameSession | null;
  // UI-only override for transient phases (cutscenes, dialogs)
  // When null, phase is derived from the above fields
  phaseOverride: PhaseOverride | null;
  // Where to resume when the player comes back to the NPC
  resumePhase: ResumePoint | null;
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
  | { type: "tutorial-3d"; step: number } // 3D bot tutorial sequence
  | { type: "tutorial-chat"; step: number } // NPC explaining the game
  | { type: "tutorial-demo"; step: number } // animated board demo inside phone
  | { type: "board-creation" } // player building their first board
  | { type: "game-setup" } // picking a board for the round
  | { type: "game-playing" } // simulation playback on phone
  | { type: "game-round-result" } // round outcome display
  | { type: "game-over" }; // final score screen

// Where the player left off when they walked away
export type ResumePoint =
  | "need-phone"       // hadn't opened pocket yet
  | "waiting-app-click" // app installed but not clicked
  | { type: "tutorial-3d"; step: number } // mid-3D tutorial
  | { type: "tutorial-chat"; step: number } // mid-tutorial
  | { type: "tutorial-demo"; step: number }
  | "board-creation"
  | "game-setup"
  | "game-playing"
  | "game-round-result"
  | "game-over";

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

export interface GameSession {
  opponentType: "npc";
  boardSize: number;
  rounds: RoundRecord[];
  currentRound: number;
  totalRounds: number;
  playerScore: number;
  opponentScore: number;
  playerBoard: Board | null;
  opponentBoard: Board | null;
}

export interface RoundRecord {
  round: number;
  playerBoard: Board;
  opponentBoard: Board;
  playerPoints: number;
  opponentPoints: number;
  winner: "player" | "opponent" | "tie";
  steps: SimulationStep[];
}

export interface SimulationStep {
  stepIndex: number;
  playerPos: { row: number; col: number } | null;
  opponentPos: { row: number; col: number } | null;
  event: "collision" | "trap" | "goal" | null;
  eventTarget: "player" | "opponent" | "both" | null;
}

export interface RoundResult {
  round: number;
  playerBoard: Board;
  opponentBoard: Board;
  playerPoints: number;
  opponentPoints: number;
  winner: "player" | "opponent" | "tie";
  steps: SimulationStep[];
}

export const INITIAL_STATE: GameState = {
  partsCollected: 0,
  assembled: false,
  npcSpoken: false,
  appInstalled: false,
  npcRelaxing: false,
  tutorialComplete: false,
  boards: [],
  currentGame: null,
  phaseOverride: null,
  resumePhase: null,
};
