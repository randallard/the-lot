/**
 * Customizable player responses for the daily mood check slider.
 * Each level (0-5) has a phrase the player "says" back to the NPC.
 */

const STORAGE_KEY = "townage-mood-responses";

export const DEFAULT_MOOD_RESPONSES: Record<number, string> = {
  0: "I dunno",
  1: "ok",
  2: "pretty good",
  3: "good!",
  4: "great!",
  5: "really excited!",
};

function load(): Record<number, string> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { ...DEFAULT_MOOD_RESPONSES };
    return { ...DEFAULT_MOOD_RESPONSES, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_MOOD_RESPONSES };
  }
}

function save(responses: Record<number, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
  } catch {}
}

/** Get the player's response text for a mood level. */
export function getMoodResponse(level: number): string {
  return load()[level] ?? DEFAULT_MOOD_RESPONSES[level] ?? "ok";
}

/** Get all mood responses (0-5). */
export function getAllMoodResponses(): Record<number, string> {
  return load();
}

/** Set a custom response for a specific mood level. */
export function setMoodResponse(level: number, text: string): void {
  const all = load();
  all[level] = text;
  save(all);
}

/** Reset all responses to defaults. */
export function resetMoodResponses(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
