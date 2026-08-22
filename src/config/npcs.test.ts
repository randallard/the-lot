import { describe, it, expect } from "vitest";
import { NPC_CONFIGS, getNpcById, castRoster, PLAYER_ID } from "./npcs";

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

  it("all NPCs have spaces-game config", () => {
    for (const npc of NPC_CONFIGS) {
      const sg = npc.games?.["spaces-game"];
      expect(sg).toBeDefined();
      expect(sg!.opponentType).toBe("ai-agent");
      expect(sg!.skillLevel).toBeTruthy();
    }
  });

  it("all NPCs have kings-cooking config", () => {
    for (const npc of NPC_CONFIGS) {
      expect(npc.games?.["kings-cooking"]).toBeDefined();
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

describe("castRoster", () => {
  it("puts the player first, since they are not an NPC and have no config row", () => {
    const roster = castRoster();
    expect(roster[0]?.id).toBe(PLAYER_ID);
  });

  it("offers every configured NPC, in configured order", () => {
    expect(castRoster().slice(1).map((e) => e.id)).toEqual(NPC_CONFIGS.map((n) => n.id));
  });

  it("labels each NPC with its display name", () => {
    const roster = castRoster();
    for (const npc of NPC_CONFIGS) {
      expect(roster.find((e) => e.id === npc.id)?.label).toBe(npc.displayName);
    }
  });

  // The defect a shared roster exists to rule out: a picker that offers an id nothing
  // else can resolve. Every entry has to be addressable as a body shape.
  it("has unique ids and a non-empty label on every entry", () => {
    const roster = castRoster();
    expect(new Set(roster.map((e) => e.id)).size).toBe(roster.length);
    for (const e of roster) expect(e.label).toBeTruthy();
  });
});
