# Backup, Restore & Player Identity Plan

## Context
All settings, statistics, and customizations need backup/restore. Kings Cooking doesn't currently receive the player's name. Ryan needs to ask for it on first interaction.

---

## Complete Backup Inventory

**Identity** *(new)*
- `townage-player-name` — doesn't exist yet
- `townage-player-id` — UUID for file server keying (new)

**Customization**
- `townage-body-shapes` — all character geometry + eye shapes + arm colors
- `townage-arm-actions` — all saved arm animations per character

**Stats & Progress**
- `townage-npc-records` — wins/losses/streaks for Spaces game per NPC
- `townage-npc-kings-chess-records` — same for King's Cooking
- `townage-npc-board-records` — per-board-size timestamped results
- `townage-npc-friendliness` — per-NPC relationship score
- `townage-enthusiasm` — per-NPC enthusiasm + today's mood
- `townage-npc-intro-seen` — which NPC intros have been seen
- `townage-game-state` — current world progress (parts collected, boards, etc.)
- `townage-kings-cooking-game-{npcId}` — mid-game saves per NPC (dynamic keys)

**Preferences**
- `townage-chat-prefs` — haiku/opt-in setting
- `townage-mood-responses` — custom mood response text

**Conversations** *(large, include as optional)*
- `townage-chats` — full chat history per NPC

**UI Layout** *(skip — device-specific)*
- `bubble-offset-*`, `bubble-hint-dismissed`

**Transient — exclude**
- `townage-active-sessions`, `townage-playing-npc`, `townage-player-pos`, `townage-npc-sleep`

---

## Backup Envelope

```ts
TownageBackup {
  version: "1.0.0"
  timestamp: number
  playerName: string
  playerId: string  // UUID
  data: {
    bodyShapes, armActions,
    npcRecords, kingsChessRecords, boardRecords,
    friendliness, enthusiasm, introSeen,
    gameState,
    midGameSaves: Record<npcId, MidGameSave>,
    chatPrefs, moodResponses,
    chats  // optional
  }
}
```

---

## Backup Tiers

**Free — local download**
- JSON.stringify → Blob → `<a>` download as `townage-backup-YYYY-MM-DD.json`
- Import: file picker → parse → validate each section → write to localStorage

**File server (no DB needed)**
- POST blob to `/api/backup/{playerUUID}` — just writes a file
- GET `/api/backup/{playerUUID}` — returns the blob
- Manually look up / restore for any user by UUID
- Zero schema, zero migrations, trivially cheap
- Future: add auto-sync, version history as premium features

### Implementation (follows spaces-game-node pattern)
- `src/services/backup.ts` — export/import/validate logic
- `src/services/player-id.ts` — get/generate persistent UUID
- Backup UI — button in main nav or settings modal

---

## Player Name Flow

**New key**: `townage-player-name: string`

**Collection**: Ryan asks during the first NPC interaction:
- Check if `townage-player-name` is unset
- Ryan asks "what should I call you?" as a special NPC state
- Chat input captures the response → saves to `townage-player-name` instead of sending to AI
- Needs: `src/services/player-name.ts`, a `"ask-name"` state in Ryan's chat logic, input handler recognizing name-capture mode

**Kings Cooking fix**:
- `buildKingsChessLaunchUrl` in `launch-game.ts` already has `playerName?: string` in the `KingsChessLotLaunchData` type on the kings-cooking side
- Just add `playerName: getPlayerName()` to the launch payload — one-line fix
- Kings Cooking already falls back to `'Player'` if missing, so no breaking change

---

## Implementation Order

1. `src/services/player-name.ts` + `src/services/player-id.ts`
2. Ryan's name-asking flow in the NPC chat system
3. `playerName` added to the King's Cooking launch payload in `launch-game.ts`
4. `src/services/backup.ts` — export/import/validate
5. Backup UI component
6. File server endpoint (backend work, separate repo)
