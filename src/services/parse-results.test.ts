import { describe, it, expect, vi, beforeEach } from "vitest";
import LZString from "lz-string";
import { parseResultsFromHash } from "./parse-results";
import type { GameResults } from "./parse-results";

const validResults: GameResults = {
  sessionId: "abc-123",
  npcId: "myco",
  playerScore: 3,
  opponentScore: 2,
  winner: "player",
  rounds: [
    { round: 1, playerPoints: 1, opponentPoints: 0, winner: "player" },
    { round: 2, playerPoints: 0, opponentPoints: 1, winner: "opponent" },
    { round: 3, playerPoints: 1, opponentPoints: 0, winner: "player" },
    { round: 4, playerPoints: 0, opponentPoints: 1, winner: "opponent" },
    { round: 5, playerPoints: 1, opponentPoints: 0, winner: "player" },
  ],
};

function setHash(results: unknown) {
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(results),
  );
  Object.defineProperty(window, "location", {
    value: {
      hash: `#r=${compressed}`,
      pathname: "/",
      search: "",
    },
    writable: true,
  });
  window.history.replaceState = vi.fn();
}

describe("parseResultsFromHash", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { hash: "", pathname: "/", search: "" },
      writable: true,
    });
    window.history.replaceState = vi.fn();
  });

  it("returns null when no hash", () => {
    expect(parseResultsFromHash()).toBeNull();
  });

  it("returns null for non-results hash", () => {
    Object.defineProperty(window, "location", {
      value: { hash: "#other=stuff", pathname: "/", search: "" },
      writable: true,
    });
    expect(parseResultsFromHash()).toBeNull();
  });

  it("parses valid compressed results", () => {
    setHash(validResults);
    const result = parseResultsFromHash();
    expect(result).toEqual(validResults);
  });

  it("clears hash after parsing", () => {
    setHash(validResults);
    parseResultsFromHash();
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      expect.any(String),
      "/",
    );
  });

  it("returns null for missing required fields", () => {
    const incomplete = { sessionId: "abc", playerScore: 1 };
    setHash(incomplete);
    expect(parseResultsFromHash()).toBeNull();
  });

  it("returns null for corrupted compressed data", () => {
    Object.defineProperty(window, "location", {
      value: { hash: "#r=garbage!!!data", pathname: "/", search: "" },
      writable: true,
    });
    expect(parseResultsFromHash()).toBeNull();
  });
});
