# ADR-0001: React Three Fiber as the 3D renderer, over Babylon.js
- Status: Accepted
- Date: 2026-07-25 — backfilled; decision taken 2026-03-06 (`be7b4a7`)
- Deciders: Ryan

## Context
The platform needed a 3D renderer on day one. The founding vision was a Matrix-style white
void: a featureless white ground plane fading into white fog, a player capsule, and objects
discovered in the emptiness. Games and NPCs would arrive later, and the arc extends to
physics-bearing and animation-heavy content.

Two forces pointed in different directions. Babylon.js is the more complete engine —
built-in scene graph tooling, materials, physics, an inspector, an animation system. Against
that: the project was already committed to React and TypeScript for everything outside the
canvas (the phone overlay, cutscenes, modals, the whole 2D UI layer), and the target
aesthetic is deliberately minimal. Most of what Babylon brings would have gone unused, while
the React/non-React boundary would have had to be crossed by hand.

The original planning document (`AGENT_PLAY_PLATFORM.md`) had assumed a 2D Phaser approach;
the direction shifted to 3D during the first session, so the renderer was an open question
at the moment scaffolding started.

## Decision
Render the world with **React Three Fiber** (`@react-three/fiber`) on top of three.js, with
`@react-three/drei` for helpers and `@react-three/rapier` available for physics.

## Alternatives considered
- **Babylon.js** — heavier systems than a minimal aesthetic needs, and it would have sat
  outside React's component model. Rejected on fit, not capability.
- **Raw three.js** — no imperative-to-declarative bridge; the world would have needed its own
  lifecycle management alongside React's, which is precisely the seam R3F exists to remove.
- **2D Phaser** — the original `AGENT_PLAY_PLATFORM.md` plan. Superseded by the shift to 3D
  before any code was written.

## Consequences
- The world is written in the same language and component model as the UI. `<World>` is a
  React component mounted inside `<Canvas>`; so are `<Player>`, `<Npc>`, `<Ground>`.
- Per-frame work goes through `useFrame`, which is where the real constraint appears: React
  state updates cannot happen per frame without re-rendering the whole tree. That cost is
  what forced [ADR-0002](0002-shared-refs-across-the-r3f-dom-boundary.md), and it is a
  permanent tax on this choice rather than a one-time cost.
- drei and rapier are dependencies from the start, but the ecosystem argument is so far
  mostly unspent: drei is imported in exactly two places (`Plane` in `world/Ground.tsx`,
  `OrbitControls` in `overlay/CharacterPreview.tsx`), and **`@react-three/rapier` is not
  imported anywhere in `src/`**. Physics was provisioned, not adopted. That is a live loose
  end, not a settled position — and it means the "drei/rapier are available" half of the
  original rationale has not yet been tested against reality.
- Committing to R3F means committing to the React 19 / three.js / R3F version triangle. All
  three move independently, and a major bump in any of them is a coordinated upgrade.
- The minimal aesthetic is now load-bearing on this choice. Characters are built from
  primitive geometry — capsules, spheres, cylinders — assembled in `src/services/body-shapes.ts`
  rather than authored as models. If the art direction ever wants rigged, skinned meshes, this
  decision should be revisited via a new ADR rather than stretched.
