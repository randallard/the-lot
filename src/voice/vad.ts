/**
 * 🧪 Where speech starts and ends, from the microphone's level (2026-10-30 (12), `#voice-test`).
 *
 * The first meter (one threshold at 4× an average of the quiet samples) failed in Ryan's noisy runs
 * (journal 10-30 (10), (11)): noise spikes opened dozens of zero-length segments, and with a soft
 * voice the end of speech went missing, so per-call latency couldn't be trusted. This is the usual
 * shape of a voice-activity detector, made pure so it's tested on synthetic signals and on the
 * level traces the page now saves:
 *
 * - **The noise floor is tracked by its minimum.** It drops to any quieter level at once and rises
 *   slowly ({@link FLOOR_RISE}, about 5 s to follow a louder room), and ten times slower again
 *   during speech, so a 20 s run of calls doesn't lift it toward the voice (and a room that has
 *   really got louder still catches up, in under a minute). The old average of "not loud" samples
 *   crept up whenever speech was borderline.
 * - **Two thresholds (hysteresis).** Speech starts above {@link ON_RATIO}× the floor and carries on
 *   while above {@link OFF_RATIO}×, so a soft voice dipping between syllables doesn't flicker.
 * - **Onset and minimum length.** It takes {@link ONSET_MS} of loudness to start (a click doesn't),
 *   and a segment shorter than {@link MIN_SEGMENT_MS} is dropped, never reported.
 * - **Hangover.** Speech ends {@link HANGOVER_MS} after the last loud sample, and the end is stamped
 *   at that sample.
 *
 * The screen band-passes the microphone to speech frequencies before it measures (a Web Audio
 * filter, not here), so rumble and hiss count less.
 */

/**
 * Thresholds over the floor. The floor is the room's *lower* edge (its minimum), so these sit
 * above the room's ordinary ripple: noise varying ±30 % peaks near 1.9× its minimum.
 */
export const ON_RATIO = 4;
export const OFF_RATIO = 2.5;
/** Below this the level is silence whatever the floor (a dead-quiet room's floor is near 0). */
export const MIN_LEVEL = 0.004;
/** Per sample, the share of the way the floor rises toward a louder level (10 ms samples: ~5 s). */
export const FLOOR_RISE = 0.002;
/** The same during speech. */
export const FLOOR_RISE_SPEAKING = 0.0002;
export const ONSET_MS = 60;
export const MIN_SEGMENT_MS = 150;
export const HANGOVER_MS = 350;

export interface VadState {
  readonly floor: number | null;
  /** When the current run above the start threshold began, before speech is confirmed. */
  readonly onsetAt: number | null;
  /** Speech under way: when it began and when it was last above the carry-on threshold. */
  readonly speech: { readonly start: number; readonly lastLoud: number; readonly reported: boolean } | null;
}

export type VadEvent = { readonly type: "speech-start"; readonly at: number } | { readonly type: "speech-end"; readonly at: number };

export const VAD_START: VadState = { floor: null, onsetAt: null, speech: null };

/**
 * One level sample (RMS, 0–1) at `now` ms. Returns the next state and what happened, if anything.
 * A start is reported once the segment has lasted {@link MIN_SEGMENT_MS}, stamped at its onset; an
 * end only for a segment whose start was reported.
 */
export function vadStep(s: VadState, level: number, now: number): { readonly state: VadState; readonly events: readonly VadEvent[] } {
  const rise = s.speech === null ? FLOOR_RISE : FLOOR_RISE_SPEAKING;
  const floor = s.floor === null ? level : level < s.floor ? level : s.floor + (level - s.floor) * rise;
  const on = Math.max(MIN_LEVEL, floor * ON_RATIO);
  const off = Math.max(MIN_LEVEL, floor * OFF_RATIO);

  if (s.speech !== null) {
    const loud = level > off;
    const lastLoud = loud ? now : s.speech.lastLoud;
    if (!loud && now - lastLoud > HANGOVER_MS) {
      const events: VadEvent[] = s.speech.reported ? [{ type: "speech-end", at: lastLoud }] : [];
      return { state: { floor, onsetAt: null, speech: null }, events };
    }
    const report = !s.speech.reported && lastLoud - s.speech.start >= MIN_SEGMENT_MS;
    const speech = { start: s.speech.start, lastLoud, reported: s.speech.reported || report };
    return { state: { floor, onsetAt: null, speech }, events: report ? [{ type: "speech-start", at: s.speech.start }] : [] };
  }

  if (level <= on) return { state: { floor, onsetAt: null, speech: null }, events: [] };
  const onsetAt = s.onsetAt ?? now;
  if (now - onsetAt < ONSET_MS) return { state: { floor, onsetAt, speech: null }, events: [] };
  return { state: { floor, onsetAt: null, speech: { start: onsetAt, lastLoud: now, reported: false } }, events: [] };
}
