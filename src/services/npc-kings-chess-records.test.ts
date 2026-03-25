import { describe, it, expect, beforeEach } from "vitest";
import {
  getKingsChessRecord,
  recordKingsChessResult,
  getKingsChessRank,
  hasKingsChessInProgress,
} from "./npc-kings-chess-records";

describe("npc-kings-chess-records", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getKingsChessRecord", () => {
    it("returns default record for unknown NPC", () => {
      const record = getKingsChessRecord("unknown");
      expect(record.wins).toBe(0);
      expect(record.losses).toBe(0);
      expect(record.ties).toBe(0);
      expect(record.totalGames).toBe(0);
      expect(record.currentWinStreak).toBe(0);
      expect(record.currentLossStreak).toBe(0);
    });
  });

  describe("recordKingsChessResult", () => {
    it("records a player win", () => {
      const record = recordKingsChessResult("myco", "player");
      expect(record.wins).toBe(1);
      expect(record.totalGames).toBe(1);
      expect(record.currentWinStreak).toBe(1);
      expect(record.currentLossStreak).toBe(0);
    });

    it("records an opponent win", () => {
      const record = recordKingsChessResult("myco", "opponent");
      expect(record.losses).toBe(1);
      expect(record.totalGames).toBe(1);
      expect(record.currentLossStreak).toBe(1);
      expect(record.currentWinStreak).toBe(0);
    });

    it("records a tie and resets streaks", () => {
      recordKingsChessResult("myco", "player");
      recordKingsChessResult("myco", "player");
      const record = recordKingsChessResult("myco", "tie");
      expect(record.ties).toBe(1);
      expect(record.totalGames).toBe(3);
      expect(record.currentWinStreak).toBe(0);
      expect(record.currentLossStreak).toBe(0);
    });

    it("tracks win streak and bestWinStreak", () => {
      recordKingsChessResult("myco", "player");
      recordKingsChessResult("myco", "player");
      const record = recordKingsChessResult("myco", "player");
      expect(record.currentWinStreak).toBe(3);
      expect(record.bestWinStreak).toBe(3);
    });

    it("bestWinStreak survives a loss", () => {
      recordKingsChessResult("myco", "player");
      recordKingsChessResult("myco", "player");
      recordKingsChessResult("myco", "opponent");
      const record = getKingsChessRecord("myco");
      expect(record.bestWinStreak).toBe(2);
      expect(record.currentWinStreak).toBe(0);
    });

    it("persists across separate calls", () => {
      recordKingsChessResult("ember", "player");
      recordKingsChessResult("ember", "opponent");
      const record = getKingsChessRecord("ember");
      expect(record.wins).toBe(1);
      expect(record.losses).toBe(1);
      expect(record.totalGames).toBe(2);
    });

    it("tracks records separately per NPC", () => {
      recordKingsChessResult("myco", "player");
      recordKingsChessResult("ember", "opponent");
      expect(getKingsChessRecord("myco").wins).toBe(1);
      expect(getKingsChessRecord("ember").losses).toBe(1);
      expect(getKingsChessRecord("myco").losses).toBe(0);
    });
  });

  describe("getKingsChessRank", () => {
    it("returns null for no wins", () => {
      expect(getKingsChessRank("myco")).toBeNull();
    });

    it("returns B for 1 win streak", () => {
      recordKingsChessResult("myco", "player");
      expect(getKingsChessRank("myco")).toBe("B");
    });

    it("returns A for 3 win streak", () => {
      recordKingsChessResult("myco", "player");
      recordKingsChessResult("myco", "player");
      recordKingsChessResult("myco", "player");
      expect(getKingsChessRank("myco")).toBe("A");
    });

    it("returns S for 5 win streak", () => {
      for (let i = 0; i < 5; i++) recordKingsChessResult("myco", "player");
      expect(getKingsChessRank("myco")).toBe("S");
    });
  });

  describe("hasKingsChessInProgress", () => {
    it("returns false when no save exists", () => {
      expect(hasKingsChessInProgress("myco")).toBe(false);
    });

    it("returns true when mid-game save exists", () => {
      localStorage.setItem("townage-kings-cooking-game-myco", JSON.stringify({ test: true }));
      expect(hasKingsChessInProgress("myco")).toBe(true);
    });

    it("returns false for different NPC", () => {
      localStorage.setItem("townage-kings-cooking-game-myco", JSON.stringify({ test: true }));
      expect(hasKingsChessInProgress("ember")).toBe(false);
    });
  });
});
