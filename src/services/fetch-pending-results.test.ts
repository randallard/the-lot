import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchPendingResults } from "./fetch-pending-results";
import { saveActiveSession } from "./active-sessions";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("fetchPendingResults", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it("returns empty array when no active sessions", async () => {
    const results = await fetchPendingResults();
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls API with all active session IDs", async () => {
    saveActiveSession("myco", "session-1");
    saveActiveSession("ember", "session-2");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

    await fetchPendingResults();

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("/api/lot-results?sessions=");
    expect(url).toContain("session-1");
    expect(url).toContain("session-2");
  });

  it("returns results from API response", async () => {
    saveActiveSession("myco", "session-1");

    const mockResult = {
      sessionId: "session-1",
      npcId: "myco",
      playerScore: 3,
      opponentScore: 2,
      winner: "player",
      rounds: [],
      completedAt: 12345,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [mockResult] }),
    });
    // DELETE call for cleanup
    mockFetch.mockResolvedValueOnce({ ok: true });

    const results = await fetchPendingResults();
    expect(results).toEqual([mockResult]);
  });

  it("sends DELETE to clean up consumed results", async () => {
    saveActiveSession("myco", "session-1");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            { sessionId: "session-1", npcId: "myco", rounds: [], completedAt: 0, playerScore: 0, opponentScore: 0, winner: "tie" },
          ],
        }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true });

    await fetchPendingResults();

    // Second call should be the DELETE
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const deleteCall = mockFetch.mock.calls[1]!;
    expect(deleteCall[1]!.method).toBe("DELETE");
    expect(JSON.parse(deleteCall[1]!.body as string)).toEqual({
      sessions: ["session-1"],
    });
  });

  it("returns empty array on API error", async () => {
    saveActiveSession("myco", "session-1");

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const results = await fetchPendingResults();
    expect(results).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    saveActiveSession("myco", "session-1");

    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const results = await fetchPendingResults();
    expect(results).toEqual([]);
  });

  it("skips DELETE when API returns no results", async () => {
    saveActiveSession("myco", "session-1");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

    await fetchPendingResults();
    // Only the GET call, no DELETE
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
