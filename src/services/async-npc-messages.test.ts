import { describe, it, expect, beforeEach, vi } from "vitest";
import { processAsyncResults, type AsyncResult } from "./async-npc-messages";

// Mock dependencies
vi.mock("./haiku-npc", () => ({
  getNpcCommentary: vi.fn().mockResolvedValue("haiku response"),
}));

vi.mock("./npc-response-chance", () => ({
  shouldNpcComment: vi.fn().mockReturnValue(true),
}));

vi.mock("./npc-records", () => ({
  recordResult: vi.fn().mockReturnValue({
    wins: 1,
    losses: 0,
    ties: 0,
    totalGames: 1,
    currentWinStreak: 1,
    currentLossStreak: 0,
  }),
}));

import { shouldNpcComment } from "./npc-response-chance";
import { recordResult } from "./npc-records";
import { getChats, getUnreadCount, setPreferences } from "./chat-storage";
import { getActiveSession, saveActiveSession } from "./active-sessions";
import { getNpcCommentary } from "./haiku-npc";

function makeResult(overrides: Partial<AsyncResult> = {}): AsyncResult {
  return {
    sessionId: "test-session",
    npcId: "myco",
    playerScore: 3,
    opponentScore: 2,
    winner: "player",
    rounds: [
      { round: 0, playerPoints: 1, opponentPoints: 0, winner: "player" },
    ],
    completedAt: Date.now(),
    ...overrides,
  };
}

describe("processAsyncResults", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(shouldNpcComment).mockReturnValue(true);
  });

  it("returns 0 for empty results", async () => {
    expect(await processAsyncResults([])).toBe(0);
  });

  it("skips unknown NPC IDs", async () => {
    const result = makeResult({ npcId: "nonexistent-npc" });
    expect(await processAsyncResults([result])).toBe(0);
    expect(recordResult).not.toHaveBeenCalled();
  });

  it("records win/loss for each result", async () => {
    await processAsyncResults([makeResult()]);
    expect(recordResult).toHaveBeenCalledWith("myco", "player");
  });

  it("clears active session after processing", async () => {
    saveActiveSession("myco", "test-session");
    await processAsyncResults([makeResult()]);
    expect(getActiveSession("myco")).toBeNull();
  });

  it("saves NPC message to chat when shouldNpcComment is true", async () => {
    await processAsyncResults([makeResult()]);
    const chats = getChats("myco");
    expect(chats).toHaveLength(1);
    expect(chats[0]!.sender).toBe("npc");
    expect(chats[0]!.isUnread).toBe(true);
  });

  it("returns unread count matching messages generated", async () => {
    const results = [
      makeResult({ sessionId: "s1", npcId: "myco" }),
      makeResult({ sessionId: "s2", npcId: "ember" }),
    ];
    const count = await processAsyncResults(results);
    expect(count).toBe(2);
    expect(getUnreadCount("myco")).toBe(1);
    expect(getUnreadCount("ember")).toBe(1);
  });

  it("skips message when shouldNpcComment returns false", async () => {
    vi.mocked(shouldNpcComment).mockReturnValue(false);
    const count = await processAsyncResults([makeResult()]);
    expect(count).toBe(0);
    expect(getChats("myco")).toHaveLength(0);
  });

  it("still records result and clears session when skipping comment", async () => {
    vi.mocked(shouldNpcComment).mockReturnValue(false);
    saveActiveSession("myco", "test-session");
    await processAsyncResults([makeResult()]);
    expect(recordResult).toHaveBeenCalledWith("myco", "player");
    expect(getActiveSession("myco")).toBeNull();
  });

  it("uses static fallback when useHaiku is false", async () => {
    // useHaiku defaults to false
    await processAsyncResults([makeResult({ winner: "player" })]);
    const chats = getChats("myco");
    // Static fallback for player win = NPC's loseReaction
    expect(chats[0]!.text).toBe("nice one... balance");
  });

  it("uses Haiku commentary when useHaiku is true", async () => {
    setPreferences({ useHaiku: true, optInShown: true });
    await processAsyncResults([makeResult()]);
    const chats = getChats("myco");
    expect(chats[0]!.text).toBe("haiku response");
    expect(getNpcCommentary).toHaveBeenCalled();
  });

  it("falls back to static when Haiku throws", async () => {
    setPreferences({ useHaiku: true, optInShown: true });
    vi.mocked(getNpcCommentary).mockRejectedValueOnce(new Error("API error"));
    await processAsyncResults([makeResult({ winner: "opponent" })]);
    const chats = getChats("myco");
    // Static fallback for opponent win = NPC's winReaction
    expect(chats[0]!.text).toBe("the network knows");
  });

  it("uses NPC greeting for tie static fallback", async () => {
    await processAsyncResults([makeResult({ winner: "tie" })]);
    const chats = getChats("myco");
    expect(chats[0]!.text).toBe("hey");
  });
});
