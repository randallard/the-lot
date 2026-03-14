/**
 * Send player feedback to the support channel via Discord webhook.
 * Called when NPC Ryan escalates a player's message.
 */

import { SUPPORT_CONFIG } from "../config/support";

export async function sendSupportMessage(
  email: string,
  message: string,
  npcId = "ryan",
): Promise<boolean> {
  if (!SUPPORT_CONFIG.enabled) {
    console.log("[support] disabled in config, would have sent:", { email, message, npcId });
    return false;
  }

  try {
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message, npcId }),
    });
    if (!res.ok) {
      console.error("[support] API error:", res.status);
      return false;
    }
    console.log("[support] sent successfully");
    return true;
  } catch (error) {
    console.error("[support] error:", error);
    return false;
  }
}
