# ADR-0007: Browser `localStorage` is the only store; a versioned backup file is the escape hatch
- Status: Accepted
- Date: 2026-07-25 — backfilled; decision taken 2026-03-28 (`5b58561`)
- Deciders: Ryan

## Context
townage accumulates a lot about a player: tutorial progress, per-NPC win/loss records across
two games, friendliness scores, chat transcripts, mood responses, custom emotes, custom arm
actions, edited body shapes for every character, mid-game saves. By the time the body and eye
editors landed, that was over twenty distinct keys.

None of it is shared between people. Every value describes one player's own relationship with
their own copy of the town. There is no leaderboard, no matchmaking, no social feed — the
"opponents" are local NPCs, and the games are played against agents, not other humans.

So the question is not "which database" but "does this need a server at all." Against a
server: an account system, a backend to operate, and a privacy surface for what is currently
data that never leaves the device — a property `ChatInfoModal` states to players explicitly.
For a server: the data survives a cleared browser, and follows the player to another device.

The forcing event was the body/eye editor work. Once players could spend real time
customising characters, "one wrong click in browser settings erases everything" stopped being
acceptable.

## Decision
Persist everything in **browser `localStorage`**, namespaced under a `townage-` prefix, with
no backend and no account. Each concern owns its own key and its own accessor module
(`chat-storage.ts`, `npc-records.ts`, `body-shapes.ts`, `emotes.ts`, …).

Durability and portability are handled by an explicit **versioned backup file** the player
exports and imports (`src/services/backup.ts`, `BackupModal`):

```ts
const BACKUP_VERSION = "1.1.0";
export interface TownageBackup {
  version: string; timestamp: number;
  playerName: string; playerId: string;
  data: Record<string, unknown>;
  optionalData?: Record<string, unknown>;
}
```

The backup enumerates three classes of key: a **fixed list** of twelve, a **dynamic prefix**
for mid-game saves (`townage-kings-cooking-game-`), and **optional** large keys
(`townage-chats`) the player can choose to leave out.

## Alternatives considered
- **A backend with accounts** — solves cross-device and survives a cleared browser, at the
  cost of an auth system, a service to run, and turning device-local data into data held by
  someone else. Rejected as disproportionate for single-player data.
- **IndexedDB** — more capacity and structured queries, but a more complex async API for what
  is a set of small JSON blobs. `localStorage`'s synchronous read is what lets
  `loadPersistedState` run during `useState` initialisation, before the first render.
- **Automatic cloud sync** — same objection as accounts, plus it would contradict the privacy
  copy shown to players.
- **No durability story at all** — where the project actually was until 2026-03-28. Rejected
  once the editors made lost data expensive.

## Consequences
- No backend to operate, no accounts, and the privacy claim in `ChatInfoModal` — chat history
  "never leaves your device unless AI responses are enabled" — is true by construction rather
  than by policy.
- **Backup is manual.** A player who never opens the modal has no protection. Clearing site
  data, browsing privately, or switching browsers loses everything. This is the accepted cost,
  and it is only acceptable while the data is replaceable-by-playing.
- **The backup list is hand-maintained and already incomplete.** Twelve keys are enumerated in
  `FIXED_KEYS`; the repo writes more than twenty. `townage-player-name` and `townage-player-id`
  are carried separately as top-level fields, and several — including `townage-active-sessions`
  and `townage-npc-sleep` — are in neither list. Adding a feature that persists something new
  silently omits it from backups unless the author remembers to update `backup.ts`. Nothing
  enforces this; there is no test that walks the `townage-` namespace and asserts every key is
  accounted for. That test is the obvious next piece of work here.
- `version: "1.1.0"` on the format is doing real work: it is what lets a future import
  migrate an older file instead of rejecting it. Restore paths must keep handling old versions.
- Storage quota (~5MB per origin, typically) is shared across all keys. `townage-chats` is the
  one that grows without bound, which is why it is *optional* in the backup — but nothing
  currently prunes it in normal use.
- **Promotion condition:** the moment any data is shared *between people* — a real leaderboard,
  human-vs-human play, or sharing a custom character with another player — this decision no
  longer covers the case, and the backend question gets asked properly via a new ADR. That is
  the same threshold the wider square-dance planning effort set for its own social layer.
