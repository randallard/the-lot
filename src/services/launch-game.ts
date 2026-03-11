import LZString from "lz-string";
import type { NpcConfig } from "../config/npcs";
import { getActiveSession, saveActiveSession } from "./active-sessions";

export interface LotLaunchData {
  sessionId: string;
  npcId: string;
  npcDisplayName: string;
  opponentType: "ai-agent";
  skillLevel: string;
  modelAssignments: Record<string, { modelId: string; label: string }>;
  returnUrl: string;
}

const GAME_URL = import.meta.env.VITE_SPACES_GAME_URL || "https://spaces-game-api.vercel.app";

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (e.g. HTTP over Tailscale)
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0")
  ).join("-");
}

export function buildLaunchUrl(npc: NpcConfig): string {
  // Reuse existing session if there's an unfinished game against this NPC
  const existingSession = getActiveSession(npc.id);
  const sessionId = existingSession ?? generateSessionId();

  // Save session so we can reuse it if the game is left incomplete
  saveActiveSession(npc.id, sessionId);

  const returnUrl = window.location.origin + window.location.pathname;

  const payload: LotLaunchData = {
    sessionId,
    npcId: npc.id,
    npcDisplayName: npc.displayName,
    opponentType: npc.opponentType!,
    skillLevel: npc.skillLevel!,
    modelAssignments: npc.modelAssignments!,
    returnUrl,
  };

  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(payload),
  );

  return `${GAME_URL}/#lot=${compressed}`;
}

export function launchGame(npc: NpcConfig): void {
  const url = buildLaunchUrl(npc);
  window.location.assign(url);
}
