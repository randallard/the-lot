import { describe, it, expect, vi, beforeEach } from "vitest";
import LZString from "lz-string";
import { buildLaunchUrl, buildKingsChessLaunchUrl } from "./launch-game";
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
    gameInviteResponse: "which game?",
    gameAcceptText: "let's go!",
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

const kcNpc: NpcConfig = {
  id: "sprout",
  displayName: "Sprout",
  emoji: "\u{1F331}",
  description: "test npc",
  agentType: "scripted_1",
  games: ["spaces-game", "kings-cooking"],
  personality: {
    systemPrompt: "test",
    greeting: "hiya",
    winReaction: "yeah!",
    loseReaction: "shucks",
    gameInviteResponse: "ready!",
    gameAcceptText: "let's go!",
    kingsChessAcceptText: "King's Cooking!!",
  },
  appearance: { bodyColor: "#66BB6A" },
};

describe("buildKingsChessLaunchUrl", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "location", {
      value: { origin: "https://townage.vercel.app", pathname: "/" },
      writable: true,
    });
    vi.stubGlobal("crypto", { randomUUID: () => "kc-uuid-999" });
  });

  it("returns URL with #lot= hash", () => {
    const url = buildKingsChessLaunchUrl(kcNpc);
    expect(url).toMatch(/#lot=.+$/);
  });

  it("encodes kings-cooking payload correctly", () => {
    const url = buildKingsChessLaunchUrl(kcNpc);
    const compressed = url.split("#lot=")[1];
    const payload = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed)!);
    expect(payload.npcId).toBe("sprout");
    expect(payload.npcDisplayName).toBe("Sprout");
    expect(payload.agentType).toBe("scripted_1");
    expect(payload.returnUrl).toBe("https://townage.vercel.app/");
    expect(payload.sessionId).toBe("kc-uuid-999");
  });

  it("uses default agentType when npc has none", () => {
    const npcWithoutAgent: NpcConfig = { ...kcNpc, agentType: undefined };
    const url = buildKingsChessLaunchUrl(npcWithoutAgent);
    const compressed = url.split("#lot=")[1];
    const payload = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed)!);
    expect(payload.agentType).toBe("scripted_1");
  });

  it("does not include spaces-game fields", () => {
    const url = buildKingsChessLaunchUrl(kcNpc);
    const compressed = url.split("#lot=")[1];
    const payload = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed)!);
    expect(payload.opponentType).toBeUndefined();
    expect(payload.skillLevel).toBeUndefined();
    expect(payload.modelAssignments).toBeUndefined();
  });
});
