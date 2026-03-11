# Documentation Chat Resource Plan

NPC Ryan has a "booklet" — a structured documentation set that he can look up during chat. Instead of stuffing all game/system knowledge into his system prompt, we use Anthropic tool use to let him fetch relevant docs on demand.

## User Experience

1. Player asks Ryan a question about game mechanics, controls, agents, etc.
2. Ryan says something like *"oh hang on, let me check..."* or *"wait what did we set up for that..."*
3. Typing indicator changes to a "leafing through booklet" animation
4. Ryan responds in-character with the answer
5. Optionally, Ryan "tears out the page" — a styled modal appears with:
   - A generated summary of the answer
   - A link to the full documentation section

## Architecture

### Documentation Storage

Static markdown files served from `public/docs/`:

```
public/docs/
  index.json                    <- Topic-to-file mapping, loaded by the lookup tool
  townage/
    controls.md                 <- WASD, E, Enter, mobile joystick, keyboard shortcuts
    world.md                    <- White void, fog, parts, assembly, NPC locations
    phone-apps.md               <- Gettcheese, Find, Messages, Settings
    tutorial.md                 <- The full tutorial flow Ryan guides
    npc-guide.md                <- Myco, Ember, Ryan — personalities, difficulty
  spaces-game/
    rules.md                    <- Core mechanics: boards, paths, traps, rounds
    board-creation.md           <- How to build boards, sizes (2x2, 3x3+), sequences
    scoring.md                  <- Points, round winners, game winner, ties
    traps-and-strategy.md       <- Trap placement, supermoves, counter-strategies
    deck-mode.md                <- 10-round deck mode variant
    turn-order.md               <- Alternating first-pick, game creator rules
  inference/
    overview.md                 <- High-level: how AI opponents work
    scripted-agents.md          <- Levels 1-5, deterministic strategies
    trained-agents.md           <- RL models, difficulty levels, what they learned
    fog-of-war.md               <- What agents see vs. don't see (critical)
    models-and-training.md      <- Training pipeline, curriculum, checkpoints
    model-registry.md           <- How models are discovered, loaded, assigned
    custom-opponents.md         <- Browse menu, model assignments, more_available_models
```

### index.json Structure

```json
{
  "topics": [
    {
      "keywords": ["controls", "move", "walk", "wasd", "keyboard", "joystick"],
      "file": "townage/controls.md",
      "label": "Townage Controls"
    },
    {
      "keywords": ["trap", "traps", "supermove", "strategy", "block"],
      "file": "spaces-game/traps-and-strategy.md",
      "label": "Traps & Strategy"
    },
    {
      "keywords": ["fog", "fog of war", "see", "cheat", "fair", "hidden"],
      "file": "inference/fog-of-war.md",
      "label": "Fog of War"
    }
  ]
}
```

### Tool Use in the API

Modify `api/npc-chat.ts` to support Anthropic tool use for Ryan only:

```
Tools defined:
  1. lookup_docs(topic: string)
     - Matches topic against index.json
     - Returns the markdown content of the matched doc section
     - Ryan uses this to inform his response

  2. show_page(title: string, summary: string, doc_path: string)
     - Triggers a "torn page" modal on the client
     - Shows Ryan's generated summary + link to full docs
     - Optional — Ryan decides when a visual would help
```

**Flow:**
1. Client sends chat message to `api/npc-chat.ts`
2. API sends to Haiku with tools defined
3. If Haiku calls `lookup_docs`:
   - Server fetches the doc file from `public/docs/`
   - Sends tool result back to Haiku
   - Haiku responds in-character with the knowledge
4. If Haiku calls `show_page`:
   - Response includes a `show_page` action in the JSON
   - Client renders the torn-page modal
5. If no tools called: normal chat response (no doc lookup needed)

### Client-Side Changes

**api/npc-chat.ts:**
- Detect if NPC is Ryan and question might need docs
- Add tool definitions to the Anthropic API call
- Handle tool_use responses with a second API call (tool result)
- Return structured response: `{ dialogue, showPage?: { title, summary, docPath } }`

**src/services/haiku-npc.ts:**
- Update `chatWithNpc()` to handle the new response shape
- Pass `showPage` data back to the UI layer

**src/overlay/ChatApp.tsx / App.tsx:**
- During tool round-trip: show "leafing through booklet" animation
- When `showPage` is returned: render DocPageModal

**src/overlay/DocPageModal.tsx (NEW):**
- Styled as a torn paper/booklet page
- Shows title, summary text, and "view full docs" link
- Dismiss on click outside or close button

## Documentation Content Specifics

### Fog of War (inference/fog-of-war.md)

This is the most important doc to get right — players need to trust the AI is playing fair.

**Key points to document:**
- Agents NEVER see the player's current-round board when making their decision
- Both boards are constructed independently, then simulated together
- After simulation, agents learn what happened (via round_history):
  - **Standard agents (stage3):** See the full opponent board from completed rounds
  - **Fog agents (stage4):** See only what was revealed during simulation:
    - Opponent piece moves up to where the opponent's piece stopped or fell
    - The specific trap that was triggered (if any)
    - Everything else stays hidden
- The fog view is built identically on frontend and backend:
  - Frontend: `buildFogBoard()` in `board-encoding.ts`
  - Backend: fog observation in `SimultaneousPlayEnv`
- Score information is visible (agent knows the score differential)
- Round number is visible (agent knows which round it is)

### Scripted Agents (inference/scripted-agents.md)

**Distinct from trained agents — must be clearly explained:**
- Levels 1-5 of hardcoded Python strategies
- Size 2 boards only
- No machine learning involved — deterministic rule-based
- Used for: NPC Ryan (scripted_1), NPC Myco (scripted_5)
- Progressive complexity:
  - Level 1: Simple straight path, column switch at round 2
  - Level 2: Reactive — switches column after a loss
  - Level 3: Adds traps + reactive switching
  - Level 4: Alternating columns, trap after 2 consecutive losses
  - Level 5: State machine with supermove triggers, adapts to history
- Scripted agents do NOT use opponent history observation — same logic regardless

### Trained Agents (inference/trained-agents.md)

**The RL pipeline:**
- Trained using PPO (Proximal Policy Optimization) with action masking
- Curriculum learning: simple boards -> one-trap -> supermove -> mixed
- Self-play for advanced training
- Difficulty checkpoints saved at curriculum transitions:
  - Beginner: after phase 0 (simple boards only)
  - Intermediate: after phase 2 (simple + one-trap mixed)
  - Expert/Advanced: end of full training
- Two agent types trained separately:
  - Stage 3 (standard): full opponent board revealed after each round
  - Stage 4 (fog): partial opponent board based on simulation visibility

### Model Registry (inference/model-registry.md)

**How models get discovered and loaded:**
- Convention-based directory structure: `models/size{N}/stage{3,4}/`
- Standard files: `beginner.zip`, `intermediate.zip`, `expert.zip`
- Additional directories:
  - `level_advancement/` — snapshots at different training advancement levels (level0 through level5)
  - `more_available_models/` — additional models available in the browse menu
- Filename becomes display label (minus .zip)
- Each model gets a stable 8-character hex ID for API reference
- Skill level maps to checkpoint + deterministic flag:
  - `beginner` -> early checkpoint, stochastic
  - `beginner_plus` -> early checkpoint, deterministic
  - `intermediate` -> mid checkpoint, stochastic
  - `intermediate_plus` -> mid checkpoint, deterministic
  - `advanced` -> advanced checkpoint, stochastic
  - `advanced_plus` -> advanced checkpoint, deterministic

### Models and Training (inference/models-and-training.md)

**Training pipeline:**
- `train_simultaneous.py` — single training run with curriculum
- `train_pipeline.py` — multi-phase orchestration with Discord progress monitoring
- Key parameters: timesteps (5M production), learning rate (1e-4 fog, 3e-4 standard), entropy coefficient (0.1)
- Curriculum phases: simple -> one_trap -> mixed -> supermove -> all
- Phase transition: when win_rate > 70% for min_phase_steps
- Models committed to git, deployed via Railway auto-deploy

### What Agents See During a Game (inference/overview.md)

**Per-round observation:**
- Board size
- Round number (0-indexed)
- Score differential (agent_score - opponent_score)
- Opponent history: array of previous round boards (full or fogged depending on agent type)
- Action masks: which cells are valid for next move (prevents revisiting)

**What agents DON'T see:**
- The player's current-round board (constructed independently)
- Future rounds
- The player's board collection/saved boards
- Any metadata about the player

## Implementation Order

1. Write the documentation markdown files (from actual codebase, not stale docs)
2. Create `index.json` with keyword mappings
3. Modify `api/npc-chat.ts` to support tool use for Ryan
4. Update `haiku-npc.ts` client to handle structured responses
5. Build `DocPageModal.tsx` with torn-page styling
6. Wire up the "leafing through booklet" animation in chat flow
7. Test the full round-trip: question -> lookup -> response -> modal

## Cost Estimate

- Normal chat (no lookup): ~1500 tokens input, ~100 tokens output = ~$0.002
- Doc lookup chat: ~3000-4000 tokens input (includes doc content), ~200 tokens output = ~$0.005
- The index.json itself is tiny (~200 tokens) and only sent when tools are defined
- Tool round-trip adds one extra API call per doc question
