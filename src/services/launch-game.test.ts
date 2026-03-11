import { describe, it, expect, vi, beforeEach } from "vitest";
import LZString from "lz-string";
import { buildLaunchUrl } from "./launch-game";
import { saveActiveSession, getActiveSession } from "./active-sessions";
import type { NpcConfig } from "../config/npcs";

const mockNpc: NpcConfig = {
  id: "myco",
  displayName: "Myco",
  emoji: "\u{1F344}",
  description: "test npc",
  opponentType: "ai-agent",
  skillLevel: "scripted_5",
  personality: {
    systemPrompt: "test",
    greeting: "hi",
    winReaction: "won",
    loseReaction: "lost",
  },
  appearance: { bodyColor: "#1B5E20" },
};

describe("buildLaunchUrl", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "location", {
      value: { origin: "https://townage.vercel.app", pathname: "/" },
      writable: true,
    });
    vi.stubGlobal("crypto", { randomUUID: () => "test-uuid-123" });
  });

  it("returns URL with #lot= hash", () => {
    const url = buildLaunchUrl(mockNpc);
    expect(url).toMatch(/#lot=.+$/);
  });

  it("encodes payload that can be decompressed", () => {
    const url = buildLaunchUrl(mockNpc);
    const compressed = url.split("#lot=")[1];
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    expect(json).toBeTruthy();
    const payload = JSON.parse(json!);
    expect(payload.npcId).toBe("myco");
    expect(payload.npcDisplayName).toBe("Myco");
    expect(payload.opponentType).toBe("ai-agent");
    expect(payload.skillLevel).toBe("scripted_5");
    expect(payload.returnUrl).toBe("https://townage.vercel.app/");
    expect(payload.sessionId).toBe("test-uuid-123");
  });

  it("omits model assignments when not configured", () => {
    const url = buildLaunchUrl(mockNpc);
    const compressed = url.split("#lot=")[1];
    const payload = JSON.parse(
      LZString.decompressFromEncodedURIComponent(compressed)!,
    );
    expect(payload.modelAssignments).toBeUndefined();
  });

  it("saves session for the NPC after building URL", () => {
    buildLaunchUrl(mockNpc);
    expect(getActiveSession("myco")).toBe("test-uuid-123");
  });

  it("reuses existing session for same NPC", () => {
    saveActiveSession("myco", "existing-session-456");
    const url = buildLaunchUrl(mockNpc);
    const compressed = url.split("#lot=")[1];
    const payload = JSON.parse(
      LZString.decompressFromEncodedURIComponent(compressed)!,
    );
    expect(payload.sessionId).toBe("existing-session-456");
  });

  it("generates new session when no existing session", () => {
    const url = buildLaunchUrl(mockNpc);
    const compressed = url.split("#lot=")[1];
    const payload = JSON.parse(
      LZString.decompressFromEncodedURIComponent(compressed)!,
    );
    expect(payload.sessionId).toBe("test-uuid-123");
  });

  it("does not reuse session from different NPC", () => {
    saveActiveSession("ember", "ember-session");
    const url = buildLaunchUrl(mockNpc);
    const compressed = url.split("#lot=")[1];
    const payload = JSON.parse(
      LZString.decompressFromEncodedURIComponent(compressed)!,
    );
    expect(payload.sessionId).toBe("test-uuid-123");
  });
});
