# ADR-0002: Shared refs carry per-frame state across the R3F/DOM boundary
- Status: Accepted
- Date: 2026-07-25 — backfilled; decision taken 2026-03-06 (`6d5365d`)
- Deciders: Ryan

## Context
townage has two rendering layers that must stay in sync every frame:

1. The **R3F scene** inside `<Canvas>`, which ticks in `useFrame` at display refresh rate.
2. The **React DOM overlay** outside the canvas — the directional arrow, speech bubbles, the
   virtual joystick, the phone, every modal.

These layers need to exchange continuously-changing values in both directions. The overlay
must know where the player and each NPC are *on screen* to anchor a speech bubble to their
head. The scene must know the current input direction, whether a rush is in progress, and
where the rush target is. None of that is event-shaped; it changes every frame.

The obvious approach — React state, `useState` and props — is wrong here for a specific
reason: a `setState` per frame re-renders the component tree 60 times a second. In a tree
this size (App.tsx alone mounts on the order of thirty overlay components) that is not a
micro-optimisation question, it is the difference between a smooth frame and a stuttering
one. The first session hit this immediately, while building the rush-navigation arrow.

There is a second, subtler force. The arrow component originally returned `null` when not
visible. That meant its ref was `null`, which meant the animation-frame loop early-returned
before it could ever evaluate whether the arrow *should* become visible — a chicken-and-egg
deadlock. Whatever mechanism carries this state has to be readable and writable regardless
of what is currently mounted.

## Decision
Cross-layer, per-frame state travels through **mutable refs created in `App.tsx` and passed
down to both layers**. The scene writes to them inside `useFrame`; the overlay reads them
inside its own animation-frame loops. Neither triggers a React re-render.

The refs in use (`src/App.tsx`):

| Ref | Written by | Read by |
|---|---|---|
| `inputDir` / `inputDisabled` | `useInputDirection` (keyboard + joystick) | `Player` in `useFrame` |
| `rushMode`, `rushTarget` | overlay click/Enter handlers, `Player` on arrival | `Player` in `useFrame` |
| `trinketTracker` | `useTrinketTracker` in `useFrame` | `TrinketArrow` |
| `playerScreenPos`, `npcScreenPos`, `mycoScreenPos`, `emberScreenPos`, `sproutScreenPos` | `useScreenPosition` in `useFrame` | `SpeechBubble`, `ChoiceBubble`, `MoodSlider`, chat bubbles |
| `playerWorldPos` | `World` in `useFrame` | game-launch handlers (saved to `localStorage`) |
| `cameraOffset`, `cameraLookAtOffset` | `App` render body (cutscene zoom) | `CameraRig` in `useFrame` |
| `playerAnimController` | emote handlers | `Player` in `useFrame` |

Discrete, user-visible transitions — phase changes, which modal is open, whose turn it is —
stay in React state ([ADR-0004](0004-derived-phase-with-ui-override.md)). The split is
**per-frame continuous values in refs, discrete events in state**.

## Alternatives considered
- **React state and props** — correct-by-default and what a reader expects, but a re-render
  per frame. Rejected on measured cost, not principle.
- **A state-management library** (Zustand, Valtio, or R3F's own store) — would have given a
  cleaner API and selector-based subscriptions, and is what a larger project would reach for.
  Not adopted; at the time the ref count was small and the dependency was not worth it. This
  is the alternative most likely to win a rematch — see the promotion condition below.
- **An event emitter between the layers** — wrong shape. These are continuous values, not
  events; an emitter would just be a ref with extra steps and a subscription leak risk.

## Consequences
- No per-frame re-renders. The overlay reads current values on its own schedule, and the
  scene never waits on React.
- **Refs are invisible to React's dependency tracking.** A ref write does not re-run an
  effect, re-run a memo, or update anything on screen by itself. Every consumer must poll —
  which is exactly why `TrinketArrow` and the speech bubbles run their own
  `requestAnimationFrame` loops. Anyone adding a new consumer has to know this; reading a ref
  in a render body gives you a stale value with no warning.
- **Visibility must be decoupled from ref existence.** The arrow bug above is the canonical
  failure. A component that returns `null` when hidden cannot hold the ref that decides
  whether it should be shown. The fix — separating the visibility check from the ref check —
  is a rule for every future overlay, not a one-off patch.
- Ref plumbing accumulates. `App.tsx` currently threads a dozen refs into `<World>` as props,
  and `<World>` forwards most of them further down. This is the main cost, and it is visible
  in the `WorldProps` interface.
- **Promotion condition:** the ref count is growing roughly with the NPC count — each new NPC
  has so far added a `<name>ScreenPos` ref threaded through `App` → `World` → `GameNpc`, plus
  a branch in every bubble-positioning ternary. When adding a fifth NPC means touching more
  than a couple of files, or when `src/dance/` needs to place N ∈ {2, 4, 8} dancers (which it
  will), replace the per-entity refs with a single keyed registry or a proper store, and
  supersede this ADR.
