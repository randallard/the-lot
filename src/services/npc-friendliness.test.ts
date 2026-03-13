import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getFriendliness,
  getFriendlinessLevel,
  nudgeFriendliness,
  setFriendliness,
  FRIENDLINESS_MIN,
  FRIENDLINESS_MAX,
  FRIENDLINESS_DEFAULT,
  NUDGE_CHAT,
  NUDGE_GAME_PLAYED,
  NUDGE_COLD,
} from "./npc-friendliness";

describe("npc-friendliness", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getFriendliness", () => {
    it("initializes to 0 when Math.random < 0.5", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.3);
      expect(getFriendliness("myco")).toBe(0);
    });

    it("initializes to 1 when Math.random >= 0.5", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      expect(getFriendliness("myco")).toBe(1);
    });

    it("persists the random initial value", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.7);
      getFriendliness("myco"); // initializes to 1
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      expect(getFriendliness("myco")).toBe(1); // still 1, not re-randomized
    });

    it("returns stored value", () => {
      setFriendliness("myco", 2);
      expect(getFriendliness("myco")).toBe(2);
    });
  });

  describe("getFriendlinessLevel", () => {
    it("rounds to nearest integer", () => {
      setFriendliness("myco", 1.7);
      expect(getFriendlinessLevel("myco")).toBe(2);
    });

    it("rounds down at .4", () => {
      setFriendliness("myco", 1.4);
      expect(getFriendlinessLevel("myco")).toBe(1);
    });
  });

  describe("setFriendliness", () => {
    it("clamps to min", () => {
      setFriendliness("myco", -5);
      expect(getFriendliness("myco")).toBe(FRIENDLINESS_MIN);
    });

    it("clamps to max", () => {
      setFriendliness("myco", 10);
      expect(getFriendliness("myco")).toBe(FRIENDLINESS_MAX);
    });

    it("tracks NPCs independently", () => {
      setFriendliness("myco", 3);
      setFriendliness("ember", 1);
      expect(getFriendliness("myco")).toBe(3);
      expect(getFriendliness("ember")).toBe(1);
    });
  });

  describe("nudgeFriendliness", () => {
    it("increases from a known starting point", () => {
      setFriendliness("myco", 0);
      const next = nudgeFriendliness("myco", NUDGE_CHAT);
      expect(next).toBe(NUDGE_CHAT);
      expect(getFriendliness("myco")).toBeCloseTo(NUDGE_CHAT, 2);
    });

    it("accumulates over multiple nudges", () => {
      setFriendliness("myco", 0);
      nudgeFriendliness("myco", NUDGE_CHAT);
      nudgeFriendliness("myco", NUDGE_CHAT);
      nudgeFriendliness("myco", NUDGE_CHAT);
      expect(getFriendliness("myco")).toBeCloseTo(NUDGE_CHAT * 3, 2);
    });

    it("clamps at max", () => {
      setFriendliness("myco", 3.9);
      const next = nudgeFriendliness("myco", NUDGE_GAME_PLAYED);
      expect(next).toBe(FRIENDLINESS_MAX);
    });

    it("can go negative with cold nudge", () => {
      setFriendliness("myco", 0);
      const next = nudgeFriendliness("myco", NUDGE_COLD);
      expect(next).toBe(NUDGE_COLD);
    });

    it("clamps at min", () => {
      setFriendliness("myco", -0.8);
      const next = nudgeFriendliness("myco", NUDGE_COLD);
      expect(next).toBe(FRIENDLINESS_MIN);
    });

    it("stores with 2 decimal precision", () => {
      setFriendliness("myco", 0);
      nudgeFriendliness("myco", 0.123456);
      expect(getFriendliness("myco")).toBe(0.12);
    });
  });

  describe("constants", () => {
    it("has expected ranges", () => {
      expect(FRIENDLINESS_MIN).toBe(-1);
      expect(FRIENDLINESS_MAX).toBe(4);
      expect(FRIENDLINESS_DEFAULT).toBe(0);
    });

    it("has expected nudge values", () => {
      expect(NUDGE_CHAT).toBe(0.1);
      expect(NUDGE_GAME_PLAYED).toBe(0.2);
      expect(NUDGE_COLD).toBe(-0.3);
    });
  });
});
