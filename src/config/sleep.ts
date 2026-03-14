/** NPC sleep/rate-limiting configuration */

export const SLEEP_CONFIG = {
  /** Master toggle — set false to disable sleep system entirely */
  enabled: true,

  /** Max messages per NPC within the rolling window */
  messageLimit: 20,

  /** Rolling window duration in hours */
  windowHours: 4,

  /**
   * First warning threshold as a percentage of messageLimit (0-1).
   * At this point the NPC starts mentioning they're getting tired.
   * 0.9 = warn when 90% of messages used (e.g. message 18 of 20)
   */
  firstWarnPercent: 0.9,

  /**
   * After the first warning, repeat the sleepy prompt every N% of remaining messages.
   * 1.0 = warn on every message after firstWarnPercent.
   * 0.5 = warn on every other message after firstWarnPercent.
   */
  recurringWarnPercent: 1.0,
};

/** Derived: window in milliseconds */
export const WINDOW_MS = SLEEP_CONFIG.windowHours * 60 * 60 * 1000;

/** Check if a given message count should trigger a sleepy warning */
export function shouldWarn(messageCount: number): boolean {
  if (!SLEEP_CONFIG.enabled) return false;
  const { messageLimit, firstWarnPercent, recurringWarnPercent } = SLEEP_CONFIG;
  const firstWarnAt = Math.floor(messageLimit * firstWarnPercent);
  if (messageCount < firstWarnAt) return false;
  if (messageCount === firstWarnAt) return true;
  // After first warning, warn every N messages
  const interval = Math.max(1, Math.round(messageLimit * (1 - firstWarnPercent) * recurringWarnPercent));
  return (messageCount - firstWarnAt) % interval === 0;
}
