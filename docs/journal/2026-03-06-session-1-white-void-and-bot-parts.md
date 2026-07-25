# The Lot - Session 1 / 2026-03-06

## Context

Ryan came in with a vision: a 3D world-building game platform that would host multiple games, starting with his existing spaces-game-node project (to be rebranded "get t' cheese"). The concept draws from the Matrix's white void construct — a blank space where a player discovers things, builds a companion bot, and gets introduced to games through NPC encounters. He'd already written up a planning doc at `AGENT_PLAY_PLATFORM.md` covering a 2D Phaser approach, but the direction shifted to 3D during our conversation.

We settled on the name **the-lot** — a casual, open-ended name that doesn't tie the platform to any single game. Ryan created the repo on GitHub, cloned it locally, and we got to work.

## What we built

Scaffolded a Vite + React + TypeScript project with React Three Fiber for the 3D engine. The core experience so far:

- **The white void**: A featureless white ground plane fading into white fog. The player (a dark gray capsule) spawns into nothingness — intentionally disorienting for a moment.
- **Bot part discovery**: After 6 seconds (or a click/Enter), the first bot part appears off to the right. A small, dull metallic box sitting tilted on the ground like discarded junk. Walking into it triggers a pickup cutscene.
- **Second part**: Spawns far to the left 2 seconds after the first cutscene is dismissed. An arrow and rush system guide the player there.
- **Assembly**: Picking up the second part opens a drag-to-assemble modal where either piece can be dragged onto the other. They snap together with a purple glow.
- **Pocket inventory**: Press E (or tap the button on mobile) to check your pocket. Phone is there from the start. Trinket appears after first pickup, replaced by "bot parts" after assembly.
- **Rush navigation**: A purple directional arrow appears when the target is far away or off-screen. Click it to rush — the player goes incorporeal (translucent) and flies toward the target with exponential deceleration. Clicking the trinket directly rushes all the way to pickup distance.
- **Mobile support**: Virtual joystick (touch only, hidden on desktop), all overlays work on mobile via Tailscale for testing.

## Technical decisions

- **React Three Fiber over Babylon.js**: The project is already React-heavy, the aesthetic is minimal (no need for Babylon's heavy systems), and drei/rapier provide what we'd need later.
- **Shared ref pattern for cross-layer state**: Input direction, rush mode, rush target, and trinket tracker all use refs that bridge the R3F render loop and React overlay. This avoids re-renders on every frame while keeping both layers in sync.
- **Rush mode as a numeric enum (0/1/2)**: Distinguishes "not rushing" from "rush but stop short" (arrow) vs "rush to pickup" (click on object). Clean way to handle the two behaviors without separate flags.
- **Dynamic target system**: The tracker and rush target point at whichever part is currently active, so adding more parts later is straightforward.

## Difficulties

**Font rendering on Linux**: This was the most puzzling issue of the session. Some text in the pocket overlay looked sans-serif on Ryan's laptop browsers (Chrome and Firefox on Arch) while looking fine on mobile. We went through several rounds of fixes — global CSS selectors, `!important`, removing inline fontFamily overrides. Turned out Courier New isn't installed on the system at all; the fallback is CaskaydiaMono Nerd Font. DevTools confirmed all text was using the same font — it just renders differently at 12px in a way that looks sans-serif. We moved on rather than chase it further. Something to revisit if it bothers Ryan later, possibly with a bundled web font.

**Trinket arrow not appearing**: The initial implementation had a chicken-and-egg bug — the arrow component returned `null` when not visible, which meant the ref was null, which caused the rAF loop to early-return before it could ever check if the arrow should become visible. Fixed by separating the visibility check from the ref check.

**Pointer events on drag**: The assembly modal's hold-and-drag didn't work initially because pointer events were only on the small piece div. Moving the pointer off the element during drag lost the interaction. Fixed by handling pointermove/pointerup on the full overlay div.

**R3F click target too precise**: The trinket is tiny (0.2 units), making it nearly impossible to click at distance. Added an invisible sphere hitbox that scales with camera distance — small up close, generous from far away.

## What's next

The big milestones ahead based on Ryan's vision:
- More bot parts to find and a full bot assembly sequence
- NPC appears after bot is complete — "hey, got yourself a nice bot there — want to play a game?"
- Phone overlay becomes interactive (board creation for gettcheese)
- First game integration: boards managed on phone, bot plays in-world
- Eventually: multiple games, other NPCs, social challenges
