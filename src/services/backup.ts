import { getPlayerName } from "./player-name";
import { getPlayerId } from "./player-id";

const BACKUP_VERSION = "1.1.0";

// Fixed localStorage keys to include in backup
const FIXED_KEYS = [
  "townage-body-shapes",
  "townage-arm-actions",
  "townage-emotes",
  "townage-npc-records",
  "townage-npc-kings-chess-records",
  "townage-npc-board-records",
  "townage-npc-friendliness",
  "townage-enthusiasm",
  "townage-npc-intro-seen",
  "townage-game-state",
  "townage-chat-prefs",
  "townage-mood-responses",
];

// Dynamic keys matching this prefix (mid-game saves)
const MID_GAME_PREFIX = "townage-kings-cooking-game-";

// Optional large keys
const OPTIONAL_KEYS = ["townage-chats"];

export interface TownageBackup {
  version: string;
  timestamp: number;
  playerName: string;
  playerId: string;
  data: Record<string, unknown>;
  optionalData?: Record<string, unknown>;
}

function collectMidGameSaves(): Record<string, unknown> {
  const saves: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(MID_GAME_PREFIX)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) saves[key] = JSON.parse(raw);
      } catch {
        // skip malformed
      }
    }
  }
  return saves;
}

export function exportBackup(includeChats = false): TownageBackup {
  const data: Record<string, unknown> = {};

  for (const key of FIXED_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  }

  // Mid-game saves
  const midGame = collectMidGameSaves();
  Object.assign(data, midGame);

  const backup: TownageBackup = {
    version: BACKUP_VERSION,
    timestamp: Date.now(),
    playerName: getPlayerName() ?? "",
    playerId: getPlayerId(),
    data,
  };

  if (includeChats) {
    const optionalData: Record<string, unknown> = {};
    for (const key of OPTIONAL_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { optionalData[key] = JSON.parse(raw); } catch { optionalData[key] = raw; }
      }
    }
    backup.optionalData = optionalData;
  }

  return backup;
}

export function downloadBackup(includeChats = false): void {
  const backup = exportBackup(includeChats);
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date(backup.timestamp).toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `townage-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type RestoreResult =
  | { ok: true; restoredKeys: string[] }
  | { ok: false; error: string };

export function importBackup(json: string): RestoreResult {
  let backup: TownageBackup;
  try {
    backup = JSON.parse(json) as TownageBackup;
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  if (!backup.version || !backup.data || typeof backup.data !== "object") {
    return { ok: false, error: "Not a valid Townage backup file" };
  }

  const restoredKeys: string[] = [];

  // Restore player identity
  if (backup.playerName) {
    localStorage.setItem("townage-player-name", backup.playerName);
    restoredKeys.push("townage-player-name");
  }
  if (backup.playerId) {
    localStorage.setItem("townage-player-id", backup.playerId);
    restoredKeys.push("townage-player-id");
  }

  // Restore data keys
  for (const [key, value] of Object.entries(backup.data)) {
    // Only restore known fixed keys or mid-game save keys
    const isKnown =
      FIXED_KEYS.includes(key) || key.startsWith(MID_GAME_PREFIX);
    if (isKnown) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        restoredKeys.push(key);
      } catch {
        // localStorage full — stop
        return { ok: false, error: "Not enough localStorage space" };
      }
    }
  }

  // Restore optional data
  if (backup.optionalData) {
    for (const [key, value] of Object.entries(backup.optionalData)) {
      if (OPTIONAL_KEYS.includes(key)) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          restoredKeys.push(key);
        } catch {
          // skip if full
        }
      }
    }
  }

  return { ok: true, restoredKeys };
}
