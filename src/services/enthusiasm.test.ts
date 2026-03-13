import { describe, it, expect, beforeEach } from "vitest";
import {
  getNpcLevel,
  setNpcLevel,
  getEffectiveLevel,
  getMoodToday,
  setMoodToday,
  clearMoodToday,
  needsMoodCheck,
  enthusiasmPromptSuffix,
  DEFAULT_LEVEL,
} from "./enthusiasm";

describe("enthusiasm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("per-NPC levels", () => {
    it("returns default (3) for unconfigured NPC", () => {
      expect(getNpcLevel("myco")).toBe(DEFAULT_LEVEL);
    });

    it("saves and retrieves per-NPC level", () => {
      setNpcLevel("myco", 1);
      expect(getNpcLevel("myco")).toBe(1);
    });

    it("clamps to min/max", () => {
      setNpcLevel("myco", -1);
      expect(getNpcLevel("myco")).toBe(0);
      setNpcLevel("myco", 10);
      expect(getNpcLevel("myco")).toBe(5);
    });

    it("tracks NPCs independently", () => {
      setNpcLevel("myco", 1);
      setNpcLevel("ember", 5);
      expect(getNpcLevel("myco")).toBe(1);
      expect(getNpcLevel("ember")).toBe(5);
    });
  });

  describe("mood today", () => {
    it("returns null when not set", () => {
      expect(getMoodToday()).toBeNull();
    });

    it("saves and retrieves mood", () => {
      setMoodToday(1);
      expect(getMoodToday()).toBe(1);
    });

    it("clamps to range", () => {
      setMoodToday(-1);
      expect(getMoodToday()).toBe(0);
      setMoodToday(10);
      expect(getMoodToday()).toBe(5);
    });

    it("clears mood", () => {
      setMoodToday(2);
      clearMoodToday();
      expect(getMoodToday()).toBeNull();
    });
  });

  describe("needsMoodCheck", () => {
    it("returns true when mood never set", () => {
      expect(needsMoodCheck()).toBe(true);
    });

    it("returns false after setting mood today", () => {
      setMoodToday(3);
      expect(needsMoodCheck()).toBe(false);
    });

    it("returns true after clearing mood", () => {
      setMoodToday(3);
      clearMoodToday();
      expect(needsMoodCheck()).toBe(true);
    });
  });

  describe("getEffectiveLevel", () => {
    it("returns per-NPC level when no mood set", () => {
      setNpcLevel("myco", 2);
      expect(getEffectiveLevel("myco")).toBe(2);
    });

    it("returns default when nothing is set", () => {
      expect(getEffectiveLevel("myco")).toBe(DEFAULT_LEVEL);
    });

    it("shifts by mood delta", () => {
      setNpcLevel("myco", 3);
      setMoodToday(1); // shift = -2
      expect(getEffectiveLevel("myco")).toBe(1); // 3 - 2
    });

    it("positive mood shift", () => {
      setNpcLevel("myco", 2);
      setMoodToday(5); // shift = +2
      expect(getEffectiveLevel("myco")).toBe(4); // 2 + 2
    });

    it("clamps effective level to 0", () => {
      setNpcLevel("myco", 1);
      setMoodToday(0); // shift = -3
      expect(getEffectiveLevel("myco")).toBe(0);
    });

    it("clamps effective level to 5", () => {
      setNpcLevel("myco", 4);
      setMoodToday(5); // shift = +2
      expect(getEffectiveLevel("myco")).toBe(5);
    });
  });

  describe("enthusiasmPromptSuffix", () => {
    it("returns different suffixes for each level", () => {
      const suffixes = new Set<string>();
      for (let i = 0; i <= 5; i++) {
        suffixes.add(enthusiasmPromptSuffix(i));
      }
      expect(suffixes.size).toBe(6);
    });

    it("all levels include brevity instruction", () => {
      for (let i = 0; i <= 5; i++) {
        expect(enthusiasmPromptSuffix(i)).toContain("short");
      }
    });

    it("level 0 mentions low energy", () => {
      expect(enthusiasmPromptSuffix(0)).toContain("low energy");
    });

    it("level 5 mentions pumped", () => {
      expect(enthusiasmPromptSuffix(5)).toContain("pumped");
    });
  });
});
