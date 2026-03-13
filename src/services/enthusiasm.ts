/**
 * Player mood ("me today") and per-NPC enthusiasm settings.
 * Mood is the player's energy level for the day — NPCs match it.
 * Per-NPC levels let players fine-tune individual NPCs.
 */

const STORAGE_KEY = "townage-enthusiasm";

export interface EnthusiasmSettings {
  /** Per-NPC enthusiasm level (0-5). Missing = default (3). */
  perNpc: Record<string, number>;
  /** Player's mood for the day (0-5). null = not yet set. */
  moodToday: number | null;
  /** ISO date string (YYYY-MM-DD) when mood was last set. */
  moodDate: string | null;
}

export const DEFAULT_LEVEL = 3;
export const MIN_LEVEL = 0;
export const MAX_LEVEL = 5;

function load(): EnthusiasmSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { perNpc: {}, moodToday: null, moodDate: null };
    const parsed = JSON.parse(data);
    // Migration: add moodDate if missing
    if (!("moodDate" in parsed)) parsed.moodDate = null;
    return parsed;
  } catch {
    return { perNpc: {}, moodToday: null, moodDate: null };
  }
}

function save(settings: EnthusiasmSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function clamp(n: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, n));
}

/** Get the stored per-NPC level. */
export function getNpcLevel(npcId: string): number {
  return load().perNpc[npcId] ?? DEFAULT_LEVEL;
}

/** Set per-NPC enthusiasm level. */
export function setNpcLevel(npcId: string, level: number): void {
  const settings = load();
  settings.perNpc[npcId] = clamp(level);
  save(settings);
}

/** Get the player's mood for today (null if not set). */
export function getMoodToday(): number | null {
  return load().moodToday;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Set the player's mood for today. */
export function setMoodToday(level: number): void {
  const settings = load();
  settings.moodToday = clamp(level);
  settings.moodDate = todayStr();
  save(settings);
}

/** True if mood hasn't been set today yet. */
export function needsMoodCheck(): boolean {
  const settings = load();
  return settings.moodDate !== todayStr();
}

/** Clear the player's mood (resets to default). */
export function clearMoodToday(): void {
  const settings = load();
  settings.moodToday = null;
  settings.moodDate = null;
  save(settings);
}

/**
 * Get the effective enthusiasm level for an NPC.
 * Combines per-NPC setting with the player's mood.
 * If mood is set, it shifts the NPC level relative to default.
 */
export function getEffectiveLevel(npcId: string): number {
  const settings = load();
  const base = settings.perNpc[npcId] ?? DEFAULT_LEVEL;

  if (settings.moodToday === null) return base;

  const shift = settings.moodToday - DEFAULT_LEVEL;
  return clamp(base + shift);
}

/**
 * Prompt suffix based on effective level.
 * Controls energy/warmth, NOT length — all levels stay short.
 */
export function enthusiasmPromptSuffix(level: number): string {
  const base = " Keep it short — a few words to a sentence, max two sentences. Mostly common vernacular, only lightly peppered with character personality.";
  if (level <= 0) return base + " The player is very low energy right now. Match that — minimal words, flat tone, no flair.";
  if (level === 1) return base + " The player is pretty mellow. Keep it subdued and quiet. Low warmth.";
  if (level === 2) return base + " The player is chill. Easygoing tone, don't push energy.";
  if (level === 3) return base + " The player is in a normal mood. Casual and natural, like talking to a friend.";
  if (level === 4) return base + " The player is in a good mood. A little more warmth and personality than usual.";
  return base + " The player is pumped. Match their energy — more personality, more fun, but still brief.";
}
