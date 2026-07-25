import LZString from "lz-string";
import type { NpcConfig } from "../config/npcs";
import { getActiveSession, saveActiveSession } from "./active-sessions";
import { getPlayerName } from "./player-name";

export interface LotLaunchData {
  sessionId: string;
  npcId: string;
  npcDisplayName: string;
  opponentType: "ai-agent";
  skillLevel: string;
  modelAssignments?: Record<string, { modelId: string; label: string }>;
  returnUrl: string;
}

const GAME_URL = import.meta.env.VITE_SPACES_GAME_URL || "https://spaces-game-api.vercel.app";
const KINGS_COOKING_URL =
  import.meta.env.VITE_KINGS_COOKING_URL || "https://randallard.github.io/kings-cooking";

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

  const sg = npc.games?.["spaces-game"];
  if (!sg) {
    throw new Error(`NPC "${npc.id}" has no spaces-game configuration`);
  }

  const payload: LotLaunchData = {
    sessionId,
    npcId: npc.id,
    npcDisplayName: npc.displayName,
    opponentType: sg.opponentType,
    skillLevel: sg.skillLevel,
    modelAssignments: sg.modelAssignments,
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

export interface KingsChessLotLaunchData {
  sessionId: string;
  npcId: string;
  npcDisplayName: string;
  agentType: "scripted_1" | "scripted_2";
  returnUrl: string;
  playerName?: string;
}

export function buildKingsChessLaunchUrl(npc: NpcConfig): string {
  const sessionId = generateSessionId();
  const returnUrl = window.location.origin + window.location.pathname;

  const payload: KingsChessLotLaunchData = {
    sessionId,
    npcId: npc.id,
    npcDisplayName: npc.displayName,
    agentType: npc.games?.["kings-cooking"]?.agentType ?? "scripted_1",
    returnUrl,
    playerName: getPlayerName() ?? undefined,
  };

  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(payload),
  );

  return `${KINGS_COOKING_URL}/#lot=${compressed}`;
}

export function launchKingsChess(npc: NpcConfig): void {
  const url = buildKingsChessLaunchUrl(npc);
  window.location.assign(url);
}

export function buildGameHomeUrl(gameKey: "spaces-game" | "kings-cooking"): string {
  // Include #from-game in returnUrl so townage shows the play-again modal on return
  const returnUrl = window.location.origin + window.location.pathname + "#from-game";
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify({ returnUrl }));
  const baseUrl = gameKey === "spaces-game" ? GAME_URL : KINGS_COOKING_URL;
  return `${baseUrl}/#lot-home=${compressed}`;
}

export function launchGameHome(gameKey: "spaces-game" | "kings-cooking"): void {
  window.location.assign(buildGameHomeUrl(gameKey));
}
