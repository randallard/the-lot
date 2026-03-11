import { describe, it, expect, vi } from "vitest";
import { shouldNpcComment } from "./npc-response-chance";
import type { NpcRecord } from "./npc-records";

function makeRecord(overrides: Partial<NpcRecord> = {}): NpcRecord {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    totalGames: 0,
    currentWinStreak: 0,
    currentLossStreak: 0,
    ...overrides,
  };
}

describe("npc-response-chance", () => {
  it("always comments on first game", () => {
    const record = makeRecord({ totalGames: 1 });
    // Run multiple times — should always be true
    for (let i = 0; i < 20; i++) {
      expect(shouldNpcComment("myco", "player", record, { playerScore: 3, opponentScore: 2 })).toBe(true);
    }
  });

  it("always comments on win streak of 3+", () => {
    const record = makeRecord({ totalGames: 6, wins: 4, currentWinStreak: 3 });
    for (let i = 0; i < 20; i++) {
      expect(shouldNpcComment("myco", "player", record, { playerScore: 3, opponentScore: 2 })).toBe(true);
    }
  });

  it("always comments on loss streak of 3+", () => {
    const record = makeRecord({ totalGames: 6, losses: 4, currentLossStreak: 3 });
    for (let i = 0; i < 20; i++) {
      expect(shouldNpcComment("myco", "opponent", record, { playerScore: 1, opponentScore: 3 })).toBe(true);
    }
  });

  it("always comments on every 5th game", () => {
    const record = makeRecord({ totalGames: 10, wins: 5, losses: 5 });
    for (let i = 0; i < 20; i++) {
      expect(shouldNpcComment("myco", "player", record, { playerScore: 3, opponentScore: 2 })).toBe(true);
    }
  });

  it("sometimes comments on unremarkable games (probabilistic)", () => {
    // With a 45% base chance, in 100 trials we should see both true and false
    const record = makeRecord({ totalGames: 3, wins: 1, losses: 1, ties: 1 });
    let trueCount = 0;
    for (let i = 0; i < 100; i++) {
      if (shouldNpcComment("myco", "opponent", record, { playerScore: 1, opponentScore: 3 })) {
        trueCount++;
      }
    }
    // Should be roughly 45% — between 20 and 70
    expect(trueCount).toBeGreaterThan(15);
    expect(trueCount).toBeLessThan(75);
  });

  it("has higher chance for close player wins", () => {
    // Close game + player win = 45% + 15% + 10% = 70%
    const record = makeRecord({ totalGames: 3, wins: 1, losses: 1 });
    vi.spyOn(Math, "random").mockReturnValue(0.69); // Just under 70%
    expect(shouldNpcComment("myco", "player", record, { playerScore: 3, opponentScore: 2 })).toBe(true);
    vi.spyOn(Math, "random").mockReturnValue(0.71); // Just over 70%
    expect(shouldNpcComment("myco", "player", record, { playerScore: 3, opponentScore: 2 })).toBe(false);
    vi.restoreAllMocks();
  });
});
