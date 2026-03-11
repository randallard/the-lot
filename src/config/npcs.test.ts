import { describe, it, expect } from "vitest";
import { NPC_CONFIGS, getNpcById } from "./npcs";

describe("NPC_CONFIGS", () => {
  it("has at least 3 NPCs configured", () => {
    expect(NPC_CONFIGS.length).toBeGreaterThanOrEqual(3);
  });

  it("all NPCs have unique ids", () => {
    const ids = NPC_CONFIGS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all NPCs have required personality fields", () => {
    for (const npc of NPC_CONFIGS) {
      expect(npc.personality.systemPrompt).toBeTruthy();
      expect(npc.personality.greeting).toBeTruthy();
      expect(npc.personality.winReaction).toBeTruthy();
      expect(npc.personality.loseReaction).toBeTruthy();
    }
  });

  it("game NPCs have opponent config", () => {
    const gameNpcs = NPC_CONFIGS.filter((n) => n.opponentType);
    expect(gameNpcs.length).toBeGreaterThanOrEqual(2);
    for (const npc of gameNpcs) {
      expect(npc.skillLevel).toBeTruthy();
    }
  });

  it("all NPCs have opponent config", () => {
    for (const npc of NPC_CONFIGS) {
      expect(npc.opponentType).toBe("ai-agent");
      expect(npc.skillLevel).toBeTruthy();
    }
  });
});

describe("getNpcById", () => {
  it("returns correct NPC for known id", () => {
    const myco = getNpcById("myco");
    expect(myco).toBeDefined();
    expect(myco!.displayName).toBe("Myco");
  });

  it("returns undefined for unknown id", () => {
    expect(getNpcById("nonexistent")).toBeUndefined();
  });

  it("finds all configured NPCs", () => {
    for (const npc of NPC_CONFIGS) {
      expect(getNpcById(npc.id)).toBe(npc);
    }
  });
});
