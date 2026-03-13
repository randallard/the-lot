import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  getAllActiveSessions,
} from "./active-sessions";

describe("active-sessions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getActiveSession", () => {
    it("returns null when no sessions saved", () => {
      expect(getActiveSession("myco")).toBeNull();
    });

    it("returns null for unknown NPC", () => {
      saveActiveSession("myco", "session-1");
      expect(getActiveSession("ember")).toBeNull();
    });

    it("returns sessionId for saved NPC", () => {
      saveActiveSession("myco", "session-1");
      expect(getActiveSession("myco")).toBe("session-1");
    });

    it("handles corrupted localStorage", () => {
      localStorage.setItem("townage-active-sessions", "not-json");
      expect(getActiveSession("myco")).toBeNull();
    });
  });

  describe("saveActiveSession", () => {
    it("saves a new session", () => {
      saveActiveSession("myco", "session-1");
      expect(getActiveSession("myco")).toBe("session-1");
    });

    it("overwrites existing session for same NPC", () => {
      saveActiveSession("myco", "session-1");
      saveActiveSession("myco", "session-2");
      expect(getActiveSession("myco")).toBe("session-2");
    });

    it("preserves sessions for other NPCs", () => {
      saveActiveSession("myco", "session-1");
      saveActiveSession("ember", "session-2");
      expect(getActiveSession("myco")).toBe("session-1");
      expect(getActiveSession("ember")).toBe("session-2");
    });

    it("handles corrupted existing data", () => {
      localStorage.setItem("townage-active-sessions", "bad-data");
      // Should not throw, just overwrite
      saveActiveSession("myco", "session-1");
      // May or may not recover — just verify no crash
    });
  });

  describe("clearActiveSession", () => {
    it("removes session for specific NPC", () => {
      saveActiveSession("myco", "session-1");
      saveActiveSession("ember", "session-2");
      clearActiveSession("myco");
      expect(getActiveSession("myco")).toBeNull();
      expect(getActiveSession("ember")).toBe("session-2");
    });

    it("does nothing when NPC has no session", () => {
      saveActiveSession("myco", "session-1");
      clearActiveSession("ember"); // no-op
      expect(getActiveSession("myco")).toBe("session-1");
    });

    it("does nothing when no sessions exist", () => {
      clearActiveSession("myco"); // no-op, no crash
      expect(getActiveSession("myco")).toBeNull();
    });

    it("handles corrupted localStorage", () => {
      localStorage.setItem("townage-active-sessions", "garbage");
      // Should not throw
      clearActiveSession("myco");
    });
  });

  describe("getAllActiveSessions", () => {
    it("returns empty array when no sessions", () => {
      expect(getAllActiveSessions()).toEqual([]);
    });

    it("returns all saved sessions", () => {
      saveActiveSession("myco", "session-1");
      saveActiveSession("ember", "session-2");
      const sessions = getAllActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions).toContainEqual({ npcId: "myco", sessionId: "session-1" });
      expect(sessions).toContainEqual({ npcId: "ember", sessionId: "session-2" });
    });

    it("handles corrupted localStorage", () => {
      localStorage.setItem("townage-active-sessions", "bad-json");
      expect(getAllActiveSessions()).toEqual([]);
    });
  });
});
