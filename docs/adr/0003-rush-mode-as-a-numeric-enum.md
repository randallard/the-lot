# ADR-0003: Rush mode is one numeric enum, not a set of boolean flags
- Status: Accepted
- Date: 2026-07-25 — backfilled; decision taken 2026-03-06 (`6d5365d`)
- Deciders: Ryan

## Context
Rushing is townage's assisted-navigation move: the player goes incorporeal (translucent) and
flies toward a target with exponential deceleration. It exists because the world is large and
sparse — the second bot part spawns 40 units away — and walking there with WASD is tedious.

Two different gestures start a rush, and they must end differently:

- Clicking the **directional arrow** (or pressing Enter, or clicking empty space) means "take
  me over there." It should stop at conversational distance, not on top of the object.
- Clicking the **object itself** means "take me to it and pick it up." It has to close all the
  way to pickup range.

So the rush needs to carry *why* it started, not just *that* it started. The naive encoding —
`isRushing: boolean` plus `rushToPickup: boolean` — admits a state that has no meaning
(`isRushing: false, rushToPickup: true`) and requires every reader to check two values in the
right order.

This value also lives in a shared ref ([ADR-0002](0002-shared-refs-across-the-r3f-dom-boundary.md)),
read inside `useFrame` on every frame. Two refs would mean two reads and a correctness
question about whether they can be observed mid-update.

## Decision
Encode rush state as a **single numeric enum** in one ref:

```ts
// src/world/Player.tsx
// 0 = not rushing, 1 = rush stop short, 2 = rush to pickup
export type RushMode = 0 | 1 | 2;
```

`0` is both "off" and the falsy default, so `rushMode.current !== 0` is the whole
is-rushing test. The mode then selects the stop distance:

```ts
const stopDist = rushMode.current === 2 ? RUSH_PICKUP_DISTANCE : RUSH_ARRIVE_DISTANCE;
```

Writers: `1` from the overlay (`handleRush` in `App.tsx`, reached from the arrow, the Enter
key, and canvas clicks); `2` from `BotParts.tsx` when the object itself is clicked; `0` from
`Player.tsx` on arrival and from the pickup handlers.

## Alternatives considered
- **Two booleans** (`isRushing`, `rushToPickup`) — admits an unrepresentable state and
  doubles the ref reads per frame. Rejected.
- **A string union** (`"none" | "arrive" | "pickup"`) — more readable at the call site and
  what the rest of the codebase does elsewhere (`PhaseOverride` is a discriminated union of
  string-tagged objects). Rejected here because `0` being falsy makes the hot-path check
  cheap and terse; that reasoning is weaker now than it looked then — see below.

## Consequences
- One ref, one read per frame, no unrepresentable states.
- **The encoding is not self-describing.** `rushMode.current = 2` at the click site in
  `BotParts.tsx` says nothing about what 2 means; the comment on the type declaration in
  `Player.tsx` is the only place the mapping is written down. This is the real cost, and it is
  paid by every future reader rather than by the author.
- **The type does not survive the whole plumbing path.** `BotParts.tsx` declares its prop as
  `React.RefObject<number>`, not `React.RefObject<RushMode>` — so at the one site that writes
  `2`, TypeScript would happily accept `3`. Worth tightening; noted here rather than fixed,
  because the docs retrofit deliberately made no `src/` changes.
- Adding a third rush behaviour means picking `3` and updating a comment. The scheme extends,
  but each extension makes the readability cost worse rather than better.
- **Promotion condition:** if a third mode is ever needed, switch to a string union at the
  same time and supersede this ADR. The performance argument for a falsy `0` does not survive
  a third case, and the readability cost compounds.
