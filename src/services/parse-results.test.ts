import { describe, it, expect, vi, beforeEach } from "vitest";
import LZString from "lz-string";
import { parseResultsFromHash, parseKingsChessResultsFromHash } from "./parse-results";
import type { GameResults } from "./parse-results";

/** One mock, cleared per test; asserted on directly rather than through `window.history`. */
const replaceState = vi.fn();

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
  replaceState.mockClear();
    window.history.replaceState = replaceState;
}

describe("parseResultsFromHash", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { hash: "", pathname: "/", search: "" },
      writable: true,
    });
    replaceState.mockClear();
    window.history.replaceState = replaceState;
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
    expect(replaceState).toHaveBeenCalledWith(
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

  it("returns null for kings-cooking results (handled separately)", () => {
    setHash({ sessionId: "abc", npcId: "myco", winner: "player", game: "kings-cooking" });
    expect(parseResultsFromHash()).toBeNull();
  });
});

describe("parseKingsChessResultsFromHash", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { hash: "", pathname: "/", search: "" },
      writable: true,
    });
    replaceState.mockClear();
    window.history.replaceState = replaceState;
  });

  it("returns null when no hash", () => {
    expect(parseKingsChessResultsFromHash()).toBeNull();
  });

  it("returns null for spaces-game results", () => {
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(validResults),
    );
    Object.defineProperty(window, "location", {
      value: { hash: `#r=${compressed}`, pathname: "/", search: "" },
      writable: true,
    });
    replaceState.mockClear();
    window.history.replaceState = replaceState;
    expect(parseKingsChessResultsFromHash()).toBeNull();
  });

  it("parses valid kings-cooking results", () => {
    const kcResults = {
      sessionId: "kc-session-1",
      npcId: "myco",
      winner: "player",
      game: "kings-cooking",
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(kcResults));
    Object.defineProperty(window, "location", {
      value: { hash: `#r=${compressed}`, pathname: "/", search: "" },
      writable: true,
    });
    replaceState.mockClear();
    window.history.replaceState = replaceState;

    const result = parseKingsChessResultsFromHash();
    expect(result?.sessionId).toBe("kc-session-1");
    expect(result?.npcId).toBe("myco");
    expect(result?.winner).toBe("player");
    expect(result?.game).toBe("kings-cooking");
  });

  it("clears hash after parsing", () => {
    const kcResults = {
      sessionId: "kc-1",
      npcId: "ember",
      winner: "opponent",
      game: "kings-cooking",
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(kcResults));
    Object.defineProperty(window, "location", {
      value: { hash: `#r=${compressed}`, pathname: "/", search: "" },
      writable: true,
    });
    replaceState.mockClear();
    window.history.replaceState = replaceState;

    parseKingsChessResultsFromHash();
    expect(replaceState).toHaveBeenCalled();
  });

  it("returns null for missing required fields", () => {
    const bad = { game: "kings-cooking", npcId: "myco" };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(bad));
    Object.defineProperty(window, "location", {
      value: { hash: `#r=${compressed}`, pathname: "/", search: "" },
      writable: true,
    });
    replaceState.mockClear();
    window.history.replaceState = replaceState;
    expect(parseKingsChessResultsFromHash()).toBeNull();
  });
});
