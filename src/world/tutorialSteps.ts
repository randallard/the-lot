import type { BotAnim } from "./PlayerBot";
import type { GridDisc, GridTrap } from "./TutorialGrid";

export interface Tutorial3DStep {
  speech: string | null;
  advanceMode: "click" | { auto: number };
  camera: { offset: [number, number, number]; lookAt: [number, number, number] };
  playerBot: { position: [number, number, number]; animation: BotAnim; visible: boolean } | null;
  npcBot: { position: [number, number, number]; animation: BotAnim; visible: boolean } | null;
  grid: { visible: boolean; discs: GridDisc[]; traps: GridTrap[] } | null;
  cheese: { position: [number, number, number]; visible: boolean }[];
}

// All positions relative to tutorial origin (captured at mount time)
// Player bot starts at [0, 0, 0], NPC bot at [0.6, 0, 0]
// Grid centered at [0.3, 0, 0] (between the two bots)
// Cheese placed off grid edges

const BLUE = "#4a90e2";
const PURPLE = "#9b59b6";

// Camera presets
const CAM_GROUND_CLOSE: Tutorial3DStep["camera"] = {
  offset: [0.3, 0.4, 0.8],
  lookAt: [0, -0.3, -0.2],
};
const CAM_ABOVE_GRID: Tutorial3DStep["camera"] = {
  offset: [0.3, 1.2, 1.0],
  lookAt: [0.3, -0.8, -0.3],
};
const CAM_ZOOM_OUT: Tutorial3DStep["camera"] = {
  offset: [0, 3, 5],
  lookAt: [0, -2, -3],
};

// Grid center
const GC: [number, number, number] = [0.3, 0, 0];

// Cheese positions (off grid edges)
const CHEESE_PLAYER: [number, number, number] = [GC[0], 0, GC[2] - 0.7]; // "top" = negative Z (player's goal)
const CHEESE_NPC: [number, number, number] = [GC[0], 0, GC[2] + 0.7]; // "bottom" = positive Z (NPC's goal)

export const TUTORIAL_3D_STEPS: Tutorial3DStep[] = [
  // === Act 1: Solo Bot (steps 0–8) ===

  // 0: "want some cheese little guy?"
  {
    speech: "want some cheese little guy?",
    advanceMode: "click",
    camera: CAM_GROUND_CLOSE,
    playerBot: null,
    npcBot: null,
    grid: null,
    cheese: [],
  },

  // 1: "here set him down and let's see..."
  {
    speech: "here set him down and let's see...",
    advanceMode: "click",
    camera: CAM_GROUND_CLOSE,
    playerBot: null,
    npcBot: null,
    grid: null,
    cheese: [],
  },

  // 2: Bot appears, looks around, sniffs (auto 3s)
  {
    speech: null,
    advanceMode: { auto: 3 },
    camera: CAM_GROUND_CLOSE,
    playerBot: { position: [0, 0, 0], animation: "sniffing", visible: true },
    npcBot: null,
    grid: null,
    cheese: [],
  },

  // 3: NPC places cheese (auto 2s)
  {
    speech: null,
    advanceMode: { auto: 2 },
    camera: CAM_GROUND_CLOSE,
    playerBot: { position: [0, 0, 0], animation: "idle", visible: true },
    npcBot: null,
    grid: null,
    cheese: [{ position: [0.5, 0, -0.3], visible: true }],
  },

  // 4: Bot notices cheese, pointer pose (auto 2s)
  {
    speech: null,
    advanceMode: { auto: 2 },
    camera: CAM_GROUND_CLOSE,
    playerBot: { position: [0, 0, 0], animation: "pointing", visible: true },
    npcBot: null,
    grid: null,
    cheese: [{ position: [0.5, 0, -0.3], visible: true }],
  },

  // 5: Bot looks around for another bot (auto 2s)
  {
    speech: null,
    advanceMode: { auto: 2 },
    camera: CAM_GROUND_CLOSE,
    playerBot: { position: [0, 0, 0], animation: "looking-around", visible: true },
    npcBot: null,
    grid: null,
    cheese: [{ position: [0.5, 0, -0.3], visible: true }],
  },

  // 6: Bot scurries to cheese, little dance (auto 3s)
  {
    speech: null,
    advanceMode: { auto: 3 },
    camera: CAM_GROUND_CLOSE,
    playerBot: { position: [0.5, 0, -0.3], animation: "dancing", visible: true },
    npcBot: null,
    grid: null,
    cheese: [{ position: [0.5, 0, -0.3], visible: true }],
  },

  // 7: Bot looks around for another bot again (auto 2s)
  {
    speech: null,
    advanceMode: { auto: 2 },
    camera: CAM_GROUND_CLOSE,
    playerBot: { position: [0.5, 0, -0.3], animation: "looking-around", visible: true },
    npcBot: null,
    grid: null,
    cheese: [{ position: [0.5, 0, -0.3], visible: true }],
  },

  // 8: "haha, yeah they really just want to play"
  {
    speech: "haha, yeah they really just want to play",
    advanceMode: "click",
    camera: CAM_GROUND_CLOSE,
    playerBot: { position: [0.5, 0, -0.3], animation: "idle", visible: true },
    npcBot: null,
    grid: null,
    cheese: [{ position: [0.5, 0, -0.3], visible: true }],
  },

  // === Act 2: Two Bots (steps 9–14) ===

  // 9: "so to play you need some cheese and an opponent"
  {
    speech: "so to play you need some cheese and an opponent",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [0, 0, 0], animation: "idle", visible: true },
    npcBot: null,
    grid: null,
    cheese: [],
  },

  // 10: NPC sets his bot down (auto 2s)
  {
    speech: null,
    advanceMode: { auto: 2 },
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [0, 0, 0], animation: "idle", visible: true },
    npcBot: { position: [0.6, 0, 0], animation: "idle", visible: true },
    grid: null,
    cheese: [],
  },

  // 11: Bots approach, touch noses (auto 2s)
  {
    speech: null,
    advanceMode: { auto: 2 },
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [0.2, 0, 0], animation: "nose-touch", visible: true },
    npcBot: { position: [0.4, 0, 0], animation: "nose-touch", visible: true },
    grid: null,
    cheese: [],
  },

  // 12: "here's the game they play" — grid appears
  {
    speech: "here's the game they play",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0], 0, GC[2]], animation: "idle", visible: true },
    npcBot: { position: [GC[0], 0, GC[2]], animation: "idle", visible: true },
    grid: { visible: true, discs: [], traps: [] },
    cheese: [],
  },

  // 13: "so we put some cheese here for your bot and some here for mine"
  {
    speech: "so we put some cheese here for your bot and some here for mine",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0], 0, GC[2]], animation: "idle", visible: true },
    npcBot: { position: [GC[0], 0, GC[2]], animation: "idle", visible: true },
    grid: { visible: true, discs: [], traps: [] },
    cheese: [
      { position: CHEESE_PLAYER, visible: true },
      { position: CHEESE_NPC, visible: true },
    ],
  },

  // 14: "they've got a little plan..."
  {
    speech: "they've got a little plan to try to get the cheese and keep their opponent from getting theirs",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0], 0, GC[2]], animation: "idle", visible: true },
    npcBot: { position: [GC[0], 0, GC[2]], animation: "idle", visible: true },
    grid: { visible: true, discs: [], traps: [] },
    cheese: [
      { position: CHEESE_PLAYER, visible: true },
      { position: CHEESE_NPC, visible: true },
    ],
  },

  // === Act 3: Game Demo (steps 15–21) ===

  // 15: "their plan starts with a starting column"
  // Blue 1 at (1,0), Purple 1 at (0,1). Bots move to starting squares.
  {
    speech: "their plan starts with a starting column",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0] - 0.25, 0, GC[2] + 0.25], animation: "idle", visible: true },
    npcBot: { position: [GC[0] + 0.25, 0, GC[2] - 0.25], animation: "idle", visible: true },
    grid: {
      visible: true,
      discs: [
        { row: 1, col: 0, color: BLUE, label: "1" },
        { row: 0, col: 1, color: PURPLE, label: "1" },
      ],
      traps: [],
    },
    cheese: [
      { position: CHEESE_PLAYER, visible: true },
      { position: CHEESE_NPC, visible: true },
    ],
  },

  // 16: "for the next step they can move or set a trap — mine looks like he's set up to move forward"
  // Purple 2 at (1,1)
  {
    speech: "for the next step they can move or set a trap \u2014 mine looks like he's set up to move forward",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0] - 0.25, 0, GC[2] + 0.25], animation: "idle", visible: true },
    npcBot: { position: [GC[0] + 0.25, 0, GC[2] - 0.25], animation: "idle", visible: true },
    grid: {
      visible: true,
      discs: [
        { row: 1, col: 0, color: BLUE, label: "1" },
        { row: 0, col: 1, color: PURPLE, label: "1" },
        { row: 1, col: 1, color: PURPLE, label: "2" },
      ],
      traps: [],
    },
    cheese: [
      { position: CHEESE_PLAYER, visible: true },
      { position: CHEESE_NPC, visible: true },
    ],
  },

  // 17: "but yours set a trap there instead of moving"
  // Red X trap at (1,1) over Purple 2. NPC bot dies.
  {
    speech: "but yours set a trap there instead of moving",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0] - 0.25, 0, GC[2] + 0.25], animation: "idle", visible: true },
    npcBot: { position: [GC[0] + 0.25, 0, GC[2] + 0.25], animation: "dead", visible: true },
    grid: {
      visible: true,
      discs: [
        { row: 1, col: 0, color: BLUE, label: "1" },
        { row: 0, col: 1, color: PURPLE, label: "1" },
        { row: 1, col: 1, color: PURPLE, label: "2" },
      ],
      traps: [{ row: 1, col: 1 }],
    },
    cheese: [
      { position: CHEESE_PLAYER, visible: true },
      { position: CHEESE_NPC, visible: true },
    ],
  },

  // 18: "so on the next step yours moves towards the goal"
  // Blue 3 at (0,0). Player bot moves there.
  {
    speech: "so on the next step yours moves towards the goal",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0] - 0.25, 0, GC[2] - 0.25], animation: "idle", visible: true },
    npcBot: { position: [GC[0] + 0.25, 0, GC[2] + 0.25], animation: "dead", visible: true },
    grid: {
      visible: true,
      discs: [
        { row: 1, col: 0, color: BLUE, label: "1" },
        { row: 0, col: 1, color: PURPLE, label: "1" },
        { row: 1, col: 1, color: PURPLE, label: "2" },
        { row: 0, col: 0, color: BLUE, label: "3" },
      ],
      traps: [{ row: 1, col: 1 }],
    },
    cheese: [
      { position: CHEESE_PLAYER, visible: true },
      { position: CHEESE_NPC, visible: true },
    ],
  },

  // 19: "and the last step is the cheese! you got it little guy!"
  // Player bot at cheese, celebrating.
  {
    speech: "and the last step is the cheese! you got it little guy!",
    advanceMode: "click",
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [CHEESE_PLAYER[0], 0, CHEESE_PLAYER[2]], animation: "celebrating", visible: true },
    npcBot: { position: [GC[0] + 0.25, 0, GC[2] + 0.25], animation: "dead", visible: true },
    grid: {
      visible: true,
      discs: [
        { row: 1, col: 0, color: BLUE, label: "1" },
        { row: 0, col: 1, color: PURPLE, label: "1" },
        { row: 1, col: 1, color: PURPLE, label: "2" },
        { row: 0, col: 0, color: BLUE, label: "3" },
      ],
      traps: [{ row: 1, col: 1 }],
    },
    cheese: [
      { position: CHEESE_PLAYER, visible: true },
      { position: CHEESE_NPC, visible: true },
    ],
  },

  // 20: Both bots spin celebration dance (auto 3s)
  {
    speech: null,
    advanceMode: { auto: 3 },
    camera: CAM_ABOVE_GRID,
    playerBot: { position: [GC[0] - 0.15, 0, GC[2]], animation: "celebrating", visible: true },
    npcBot: { position: [GC[0] + 0.15, 0, GC[2]], animation: "celebrating", visible: true },
    grid: { visible: true, discs: [], traps: [] },
    cheese: [],
  },

  // 21: "there's different size boards they can play if you set them up in the app"
  {
    speech: "there's different size boards they can play if you set them up in the app",
    advanceMode: "click",
    camera: CAM_ZOOM_OUT,
    playerBot: { position: [GC[0] - 0.15, 0, GC[2]], animation: "idle", visible: true },
    npcBot: { position: [GC[0] + 0.15, 0, GC[2]], animation: "idle", visible: true },
    grid: null,
    cheese: [],
  },

  // === Act 4: Transition (step 22) ===

  // 22: Transition to phone flow (auto)
  {
    speech: null,
    advanceMode: { auto: 1 },
    camera: CAM_ZOOM_OUT,
    playerBot: { position: [GC[0] - 0.15, 0, GC[2]], animation: "idle", visible: true },
    npcBot: { position: [GC[0] + 0.15, 0, GC[2]], animation: "idle", visible: true },
    grid: null,
    cheese: [],
  },
];

export const TUTORIAL_3D_STEP_COUNT = TUTORIAL_3D_STEPS.length;
