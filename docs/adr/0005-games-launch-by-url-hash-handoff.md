# ADR-0005: Games are separate deployments, integrated by a compressed URL-hash handoff
- Status: Accepted
- Date: 2026-07-25 — backfilled; decision taken 2026-03-11 (`a2f71fa`)
- Deciders: Ryan

## Context
townage is a platform that hosts games, not a game itself. The first two — Spaces Game
(`spaces-game-api.vercel.app`) and King's Cooking (`randallard.github.io/kings-cooking`) —
already existed as their own repositories, their own build pipelines, and their own
deployments, written before townage did. More are expected.

The integration question is how a player standing in the world in front of an NPC gets into
a game against that NPC, and how the result gets back. The handoff has to carry who the
opponent is, what difficulty or agent type they play at, a session id so an abandoned game
can be resumed, and a way home.

The constraint that shapes everything: **the games are deployed on different origins.**
Spaces Game is on Vercel, King's Cooking on GitHub Pages, townage on its own. That rules out
anything depending on shared storage or same-origin access.

## Decision
Launch a game by **navigating the whole page** to its URL, with the handoff payload
JSON-encoded, LZ-String-compressed, and placed in the **URL fragment**:

```ts
// src/services/launch-game.ts
const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
return `${GAME_URL}/#lot=${compressed}`;
```

The payload (`LotLaunchData`) carries `sessionId`, `npcId`, `npcDisplayName`, opponent
configuration, and a `returnUrl` pointing back at townage. The game plays out entirely in its
own deployment and navigates back to `returnUrl` with results in its own hash, which townage
parses on mount (`parse-results.ts`, read in the first `useEffect` of `App.tsx`).

Because a full-page navigation destroys all in-memory state, townage writes what it needs to
survive the round trip into `localStorage` first — `townage-playing-npc` and
`townage-player-pos` — and restores from them on return.

## Alternatives considered
- **An iframe per game** — keeps townage mounted and avoids the state round trip, but means
  cross-origin `postMessage` plumbing on both sides, a message protocol to version, and the
  games needing to be embeddable at all. Rejected: it moves complexity into the games, which
  are supposed to stay independent.
- **A monorepo with the games as packages** — removes the origin problem entirely, at the
  cost of merging three independent release cadences and build setups. Rejected as far too
  large a change for the benefit.
- **Query string instead of fragment** — the fragment was chosen because it is never sent to
  the server and does not appear in server logs. With opponent configuration and session ids
  in the payload, that is the safer default.
- **Uncompressed JSON in the URL** — works, but the payload includes `modelAssignments` and
  the practical URL length ceiling is real. LZ-String buys headroom cheaply.

## Consequences
- Each game keeps its own repository, stack, and deploy cadence. townage needs to know only a
  URL and a payload shape.
- **The payload shape is an unversioned contract across repositories.** `LotLaunchData` and
  `KingsChessLotLaunchData` are declared in `src/services/launch-game.ts`, and their
  counterparts are declared independently in each game's repo. Nothing checks that they agree.
  Changing a field means a coordinated change in two repositories with no compiler to catch a
  mismatch — this is the sharpest cost of the decision and the most likely source of a silent
  production break.
- Game URLs are configurable via `VITE_SPACES_GAME_URL` and `VITE_KINGS_COOKING_URL`, with
  production defaults hardcoded — so local development against a local game build works.
- A full-page navigation loses all React state. The `localStorage` round trip is the mitigation,
  and it leaks: `App.tsx` reads `townage-player-pos` during `useState` initialisation and
  deletes it in an effect, precisely so that a *plain refresh* does not restore a position that
  only makes sense when returning from a game.
- The player may never come back. That case is handled out-of-band: games post results to
  Vercel KV, and townage polls for them on mount (`fetch-pending-results.ts`), turning them into
  NPC messages. **Two of that module's tests currently fail** — see [`../PROGRESS.md`](../PROGRESS.md).
- **Promotion condition:** when a third game is added, or when a payload field first has to
  change after both sides have shipped, extract the shared launch/result types into a versioned
  package both sides depend on, and supersede this ADR.
