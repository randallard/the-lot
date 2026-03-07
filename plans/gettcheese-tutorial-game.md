# Gettcheese Tutorial + Board Creation + Game Loop

## Context
After the player clicks the gettcheese app icon on their phone, the tutorial should happen *inside* the phone overlay (not as world-space speech bubbles). The phone scales up to near-fullscreen, the NPC narrates via inModal speech bubbles while the phone shows an animated board demo. Then the player creates their first board, plays a 5-round game against the NPC, and gets thanked. The 3D world simulation (bots on a grid) is deferred to a follow-up -- simulation plays on the phone only for now.

## Checkpoint Plan

### Checkpoint 1: Game Engine Port
**Goal**: Pure logic, no UI. Port simulation + validation + inference client.

**New files:**
- `src/game/board-validation.ts` -- port from spaces-game-node `src/utils/board-validation.ts`
  - `validateBoard(board)` returns `{ valid, errors }`
  - Simplified: no name/thumbnail validation
- `src/game/game-simulation.ts` -- port from spaces-game-node `src/utils/game-simulation.ts`
  - `simulateRound(round, playerBoard, opponentBoard, boardSize)` returns `RoundResult`
  - Add `steps: SimulationStep[]` to result for step-by-step playback
  - Each step: both positions, trap locations, events
  - Opponent positions 180-rotated (existing logic)
- `src/game/inference-client.ts` -- call the inference server for NPC boards
  - `requestNpcBoard(boardSize, roundNum, agentScore, opponentScore, playerHistory)` -> `Promise<Board>`
  - Calls `POST /construct-board` on the inference server (default `localhost:8100`)
  - Uses `skill_level: "scripted_1"` (Sprout -- simple, predictable, no traps)
  - Handles score flipping (server expects AI-perspective: agent_score = NPC's score)
  - Round number conversion (server is 0-indexed, we use 1-indexed)
  - Converts response to our `Board` type
  - Env var `VITE_INFERENCE_API_URL` for server URL (fallback `http://localhost:8100`)

**Modified files:**
- `src/state/types.ts` -- add:
  - Phase overrides: `tutorial-demo`, `board-creation`, `game-setup`, `game-playing`, `game-round-result`, `game-over`
  - `GameSession { opponentType, boardSize, rounds: RoundRecord[], currentRound, playerScore, opponentScore, playerBoard, opponentBoard }`
  - `RoundRecord { round, playerBoard, opponentBoard, playerPoints, opponentPoints, winner, steps }`
  - `SimulationStep { stepIndex, playerPos, opponentPos, event, eventTarget }`
  - Resume points for new phases
- `src/state/useGameState.ts` -- add actions:
  - `startGame(boardSize)` -- creates GameSession
  - `selectBoard(board)` -- sets playerBoard, calls inference server for NPC board, runs simulation
  - `advanceRound()` -- move to next round or game-over
  - `endGame()` -- clear currentGame, set phase
  - Update `npcWalkAway` to handle new resume points
- `src/state/derivePhase.ts` -- no change needed (all game phases use overrides)

---

### Checkpoint 2: Phone Refactor + BoardGrid
**Goal**: Phone scales up, reusable grid component.

**Modified files:**
- `src/overlay/PhoneOverlay.tsx` -- major refactor:
  - Add `mode` prop: `"homescreen"` (160x280, current behavior) | `"app"` (near-fullscreen, max ~420px wide) | `"sidebar"` (right-docked, for during-game)
  - CSS transition for smooth scaling
  - Accept `children` prop -- when provided, render children instead of homescreen
  - Keep backdrop click-to-close only in homescreen mode

**New files:**
- `src/overlay/BoardGrid.tsx` -- reusable grid renderer:
  - Props: `grid`, `sequence`, `boardSize`, `highlightCell?`, `showNumbers?`, `onCellClick?`, `playerPos?`, `opponentPos?`
  - CSS grid layout, square cells via aspect-ratio
  - Colors: empty=#f0f0f0, piece=#4a90e2, trap=#f5222d
  - Sequence numbers inside cells
  - Highlight animations (pulse on current piece)

---

### Checkpoint 3: Tutorial Demo
**Goal**: Hardcoded animated board explanation inside the phone.

**New files:**
- `src/overlay/TutorialDemo.tsx` -- step-by-step animated 2x2 demo:
  - Hardcoded scenario: player traps + darts to goal, opponent just darts and gets trapped
  - Steps (advance on click):
    0. "we both put up some cheese" -- cheese icons appear on board edges
    1. "my bot tries to get that one, yours tries this one" -- bots at start positions
    2. "we have boards that tell bots what to do" -- path arrows light up
    3. "your board sets a trap here then darts to the goal" -- animate trap + movement
    4. "my plan was just to dart but got trapped -- you get the cheese" -- opponent hits trap
    5. "here's how you make your board..." -- transition prompt
  - Each step has timed animations (elements appearing with delays)
  - Uses `BoardGrid` for the visual

**Modified files:**
- `src/App.tsx`:
  - Remove `TUTORIAL_STEPS` array and world-space tutorial-chat rendering
  - `handleAppClick` -> sets `tutorial-demo` step 0 instead of `tutorial-chat`
  - Wire `PhoneOverlay` in app mode with `TutorialDemo` inside for `tutorial-demo` phase
  - NPC speech as `SpeechBubble inModal` alongside phone for each step
  - After step 5 dismiss -> transition to `board-creation` phase

---

### Checkpoint 4: Board Creation UI
**Goal**: Port board creation from spaces-game-node into the phone.

**New files:**
- `src/overlay/BoardCreator.tsx` -- simplified port:
  - Three phases: `choosing-start`, `building`, `confirming`
  - Size picker (2 or 3 for first game) at top
  - `BoardGrid` for the board display
  - **choosing-start**: Click bottom-row cell to place piece
  - **building**: Directional controls below grid
    - Move buttons (up/down/left/right)
    - Trap buttons (Shift modifier or separate buttons)
    - "All the Way to Finish" button
    - Undo button
    - Trap budget display: "Traps: X/Y"
  - **confirming**: Board preview + "Save" / "Back to Edit" buttons
  - Keyboard: WASD move, Shift+WASD trap, Shift+X trap-here, Enter final
  - On save: call `game.saveBoard(board)`, transition to `game-setup`
- `src/overlay/BoardSizeSelector.tsx` -- simple 2-button picker (2x2 Classic, 3x3 Standard)

**Modified files:**
- `src/App.tsx` -- wire `board-creation` phase to phone + BoardCreator

---

### Checkpoint 5: Game Loop (5 rounds)
**Goal**: Full game flow -- board selection, simulation playback on phone, NPC commentary, 5 rounds.

**New files:**
- `src/overlay/BoardSelector.tsx` -- pick from saved boards:
  - Grid of board cards with mini BoardGrid thumbnails
  - "Create New" button -> transitions to board-creation
  - Click board -> selects it for current round
- `src/overlay/SimulationView.tsx` -- phone-side simulation playback:
  - Shows `BoardGrid` with both player and opponent positions
  - Steps through at 0.5s intervals
  - Shows traps appearing, movements, events
  - Final state: who won, points scored
- `src/overlay/RoundResult.tsx` -- round outcome display:
  - Winner announcement, point breakdown
  - "Next Round" button (or "Final Results" on round 5)
- `src/overlay/GameOver.tsx` -- final score screen:
  - Total scores, winner
  - "Done" button -> clears game, NPC thanks player

**Modified files:**
- `src/App.tsx`:
  - Wire `game-setup` -> BoardSelector in phone
  - Wire `game-playing` -> SimulationView in phone (sidebar mode on mobile?)
  - Wire `game-round-result` -> RoundResult in phone
  - Wire `game-over` -> GameOver in phone
  - NPC speech bubbles for each game phase:
    - Setup: "got your board picked?"
    - Playing: watching silently
    - Win: "nice one!"  /  Lose: "got ya that time!"  /  Tie: "whoa, a tie!"
    - Between rounds: "pick another board -- give those bots a good chance at the cheese"
    - Game over win: "good game! come back anytime"
    - Game over lose: "nice try! come back for a rematch anytime"
  - Walk-away/resume for all new phases

---

## Key Decisions
- **Phone only** for simulation (3D world bots deferred)
- **Hardcoded** tutorial demo (not simulation-engine driven)
- **Checkpoint commits** after each section
- **NPC uses inference server** -- calls `POST /construct-board` with `skill_level: "scripted_1"` (Sprout) instead of hardcoded boards. Server must be running at `localhost:8100` (or `VITE_INFERENCE_API_URL`). Scripted agents are deterministic, instant, and never fail.
- **No new dependencies** -- `crypto.randomUUID()` for IDs, inline styles, pure TS logic
- **Existing types reused** -- `Board`, `BoardMove`, `CellContent` already in types.ts
- **Simplified from spaces-game-node** -- no thumbnails, no board names, no large board section view, no deck mode

## Files Summary

| File | Action | Checkpoint |
|------|--------|------------|
| `src/game/board-validation.ts` | NEW | 1 |
| `src/game/game-simulation.ts` | NEW | 1 |
| `src/game/inference-client.ts` | NEW | 1 |
| `src/state/types.ts` | MODIFY | 1 |
| `src/state/useGameState.ts` | MODIFY | 1 |
| `src/overlay/PhoneOverlay.tsx` | MODIFY | 2 |
| `src/overlay/BoardGrid.tsx` | NEW | 2 |
| `src/overlay/TutorialDemo.tsx` | NEW | 3 |
| `src/App.tsx` | MODIFY | 3, 4, 5 |
| `src/overlay/BoardCreator.tsx` | NEW | 4 |
| `src/overlay/BoardSizeSelector.tsx` | NEW | 4 |
| `src/overlay/BoardSelector.tsx` | NEW | 5 |
| `src/overlay/SimulationView.tsx` | NEW | 5 |
| `src/overlay/RoundResult.tsx` | NEW | 5 |
| `src/overlay/GameOver.tsx` | NEW | 5 |
