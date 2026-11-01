# 2026-10-31 (20): services and overlays

Ryan: *"pick up from here"* (after committing 10-31 (19)). `src/services/` and `src/overlay/` held
132 strict findings across 40 files. More than half came from one source: JSON taken on trust.

## Untrusted JSON: `json-guards.ts`

Fifteen storage readers did `data ? JSON.parse(data) : {}` (or `as SomeType`), and four places
read `fetch` replies straight off `any`. There was no shared helper (`api/npc-chat.ts` has a
private `field`/`str` pair, but it's in the `api` tsconfig project), so I added
`src/services/json-guards.ts`:

- `readStoredJson(key): unknown`: parse, or `undefined` when absent or not JSON.
- `isRecord`, `recordOf(x, guard)` and `arrayOf(x, guard)` keep the entries that pass, so one
  bad entry is dropped instead of costing the rest. Plus `isNumber` (finite), `isString` and
  `isBoolean`.

Guards follow `isBakedTrack`'s precedent. Small values are checked fully (`NpcRecord`, board
entries, chat messages, sessions, prefs, enthusiasm). Authored shapes are checked by their header
(arm actions, contact moves, emotes: id, name, and their arrays present). No `as` was added, so
ADR-0066's registry inherits nothing from this pass. The unflagged `as` casts in `chat-storage.ts`
and `parse-results.ts` went too.

**The runtime change, everywhere:** corrupt or foreign storage now falls back to the reader's
default. It used to flow on as the wrong type. Same for replies:

- **npc-chat** (`haiku-npc.ts`, `MoodSlider.tsx`): a reply without a string `dialogue` now
  throws. Each caller already falls back on a failed request (static lines, "alright"). It used
  to show `undefined`.
- **lot-results** (`fetch-pending-results.ts`): results that don't read as results are dropped.
- **The `#r=` hash** (`parse-results.ts`): results are built from the checked fields. Missing
  rounds read as none, and bad rounds are dropped. App reads only typed fields, so nothing it
  uses changes.
- **`importBackup`**: the same accept/reject rules, written as guards.
- **`active-sessions`**: corrupt storage used to block saving a session. Now it's replaced.

## `import.meta.env`

`VITE_NPC_CHAT_URL`, `VITE_SPACES_GAME_URL` and `VITE_KINGS_COOKING_URL` were `any` (Vite's
index signature). They're now declared in `src/vite-env.d.ts`, which is Vite's documented way.
That cleared about 15 findings in `haiku-npc`, `launch-game` and `fetch-pending-results`.

## The body and eye migrations

`body-shapes.ts`'s `migrate` was built on casts: `(raw.x as number) ?? default` tells TypeScript
the value is never nullish, which is why lint called the fallbacks unnecessary. It now reads each
field with `num`/`vec3`: a saved field is kept when it has its field's type, and anything else
falls back as a missing one did. Field by field, not a generic merge over the defaults' keys,
because that would silently drop `layout.shoulderY` (optional, authored for Myco).
`migrateEyes` does the same through one `eyeFields` (13 number fields, `irisColor`, `showWhite`),
used for both eyes and every expression override.

**Checked against the old code**, with a throwaway test (not committed) that wrote
`getBodyShape` for all six ids across these cases: empty storage, a current-format round trip, a
legacy flat hand with `flattenY`, a layout `handForearmGap`, `elbowYFromBodyCenter`, junk
entries, a reset shoulder, and saved eyes (asymmetric, expressions, junk). **Identical**, except
that stray keys the old spread carried along (`layout.handForearmGap`, `layout.elbowYFromBodyCenter`,
`hand.open.flattenY`) are gone. No typed code reads them.

🔑 **One dead migration, kept dead.** The old code meant to move a legacy `layout.handForearmGap`
into the hand poses, but it spread the defaults in first, so `handForearmGap == null` was never
true. My first version made the migration work, and the diff caught it (Myco's legacy gap went
0.01 → 0.04). Since this is a lint pass, it keeps what players see. The comment on `handPose` says
so.

## The rest

- **`crypto.randomUUID`** (`player-id`, `launch-game`, `emotes`): the types say it's always
  there, but it's missing outside a secure context (the HTTP-over-Tailscale case the code
  mentions). The check stays, as `typeof crypto.randomUUID === "function"`, with a comment.
  `player-id`'s byte fix-up is a `map`, with no indexing.
- **Screen-position refs** (`!sp` ×4 and `TrinketArrow`'s tracker): every one starts from an
  object in `App.tsx` and is never null. Removed. `history.replaceState` is always there too.
- **`!` removed:** `BoardCreator` (returns if no piece yet; building always has one),
  `PlayAgainModal`, `EmotePanel`, `VirtualJoystick` (checks the stick before claiming the touch),
  `animation-controller` (pop/shift then test), `npc-board-records` (the filter now narrows the
  rank), `haiku-npc` (the game name is picked on its own branch), `chat-storage`.
- **Dynamic deletes** (`EyeEditor` ×2, `npc-sleep`): rest destructuring, as in 10-31 (10).
- **`EyeEditor`'s mirror**: typed pairs replace `as unknown as Record` casts. The lookup map
  is derived from the same pairs.
- **Floating promises**: marked `void`, or wrapped in `onClick`, as in 10-31 (9).
- **`emotes`**: `case "linear"` named next to `default` (a saved emote can hold an unknown easing).
  Two `as Easing` turned out to be needed inside a generic call, so the factories got return
  types instead.
- **Hooks, with nothing re-running differently:** `MoodSlider` lists `isIntro` (a prop that was
  read stale). The two mount-only effects stay mount-only: `NpcChatBubble` keeps the first
  render's choice in a ref, and `StartupNotification` reads the prefs inside the effect. The two
  `myId.current` cleanups copy the id when the effect starts (it's set once). `PhoneOverlay`'s
  `homeActions` is memoised over the props it reads. It was a new array every render, so the
  effect used to re-subscribe on every render.

## Checked

`tsc -b` is clean, and the build passes. 1,240 tests pass. `pnpm lint` has 0 errors and **2
warnings** (from 8). The services and overlay tests (240) pass unchanged; none needed editing.
What the tests don't reach, **Ryan's playtest** covers: a chat line and the opt-in modal, the mood
check (intro and not), a game round trip (results hash and pending results), the eye editor's
mirror and reset, the phone's keys, and the joystick.

**The strict count: 213 → 81.**

## Next

81 left: 34 `!`, 26 unnecessary conditions, 9 unnecessary assertions, a handful of unsafe ones.
They're mostly in `src/dance/` (`pose-solids` 12, `FistBumpDriver` 10, `whole-move-rlt` 9,
`baked-tracks` 7, `whole-move-figure` 5), then `api/support.ts` (6) and `src/world/`. The two
`pnpm lint` warnings are there too.
