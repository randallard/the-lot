import { describe, it, expect, beforeEach } from "vitest";
import { getRecord, recordResult } from "./npc-records";

describe("npc-records", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default record for unknown NPC", () => {
    const record = getRecord("unknown");
    expect(record.wins).toBe(0);
    expect(record.losses).toBe(0);
    expect(record.ties).toBe(0);
    expect(record.totalGames).toBe(0);
    expect(record.currentWinStreak).toBe(0);
    expect(record.currentLossStreak).toBe(0);
  });

  it("records a player win", () => {
    const record = recordResult("myco", "player");
    expect(record.wins).toBe(1);
    expect(record.totalGames).toBe(1);
    expect(record.currentWinStreak).toBe(1);
    expect(record.currentLossStreak).toBe(0);
  });

  it("records an opponent win (player loss)", () => {
    const record = recordResult("myco", "opponent");
    expect(record.losses).toBe(1);
    expect(record.totalGames).toBe(1);
    expect(record.currentLossStreak).toBe(1);
    expect(record.currentWinStreak).toBe(0);
  });

  it("records a tie and resets streaks", () => {
    recordResult("myco", "player");
    recordResult("myco", "player");
    const record = recordResult("myco", "tie");
    expect(record.ties).toBe(1);
    expect(record.totalGames).toBe(3);
    expect(record.currentWinStreak).toBe(0);
    expect(record.currentLossStreak).toBe(0);
  });

  it("tracks win streak correctly", () => {
    recordResult("myco", "player");
    recordResult("myco", "player");
    const record = recordResult("myco", "player");
    expect(record.currentWinStreak).toBe(3);
    expect(record.currentLossStreak).toBe(0);
  });

  it("resets win streak on loss", () => {
    recordResult("myco", "player");
    recordResult("myco", "player");
    const record = recordResult("myco", "opponent");
    expect(record.currentWinStreak).toBe(0);
    expect(record.currentLossStreak).toBe(1);
  });

  it("tracks per-NPC records independently", () => {
    recordResult("myco", "player");
    recordResult("ember", "opponent");

    expect(getRecord("myco").wins).toBe(1);
    expect(getRecord("myco").losses).toBe(0);
    expect(getRecord("ember").wins).toBe(0);
    expect(getRecord("ember").losses).toBe(1);
  });

  it("persists across calls", () => {
    recordResult("myco", "player");
    recordResult("myco", "player");

    // Get fresh record
    const record = getRecord("myco");
    expect(record.wins).toBe(2);
    expect(record.totalGames).toBe(2);
  });
});
