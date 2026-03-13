import { describe, it, expect, beforeEach } from "vitest";
import { hasSeenIntro, markIntroSeen } from "./npc-intro-seen";

describe("npc-intro-seen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns false for unseen NPC", () => {
    expect(hasSeenIntro("myco")).toBe(false);
  });

  it("returns true after marking seen", () => {
    markIntroSeen("myco");
    expect(hasSeenIntro("myco")).toBe(true);
  });

  it("tracks per NPC independently", () => {
    markIntroSeen("myco");
    expect(hasSeenIntro("myco")).toBe(true);
    expect(hasSeenIntro("ember")).toBe(false);
  });

  it("handles corrupted localStorage", () => {
    localStorage.setItem("townage-npc-intro-seen", "bad-json");
    expect(hasSeenIntro("myco")).toBe(false);
  });
});
