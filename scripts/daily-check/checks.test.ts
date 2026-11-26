import { describe, expect, it } from "vitest";
import {
  CHAT_FALLBACK,
  agentUrlsIn,
  judgeAgentHealth,
  judgeChat,
  judgeCpuBoards,
  judgeKingsMove,
  judgePage,
  judgeSpacesBoard,
  scriptUrls,
  summarize,
} from "./checks.ts";

const railwayGone = { status: 404, body: '{"status":"error","code":404,"message":"Application not found"}' };

describe("judgePage", () => {
  it("passes a 200 with HTML", () => {
    expect(judgePage("x", { status: 200, body: "<!doctype html><html lang=en>" }).ok).toBe(true);
  });
  it("fails a 200 that isn't HTML, and a timeout", () => {
    expect(judgePage("x", { status: 200, body: "{}" }).ok).toBe(false);
    expect(judgePage("x", { status: 0, body: "The operation was aborted" }).detail).toBe("no response: The operation was aborted");
  });
});

describe("judgeChat", () => {
  it("passes a real line from the model", () => {
    const r = judgeChat({ status: 200, body: JSON.stringify({ dialogue: "ok", continues: false }) });
    expect(r).toMatchObject({ ok: true, detail: 'replied "ok"' });
  });
  it("fails the proxy's fallback line, which means the model said nothing usable", () => {
    expect(judgeChat({ status: 200, body: JSON.stringify({ dialogue: CHAT_FALLBACK }) }).ok).toBe(false);
  });
  it("fails an upstream error and a missing key", () => {
    expect(judgeChat({ status: 502, body: '{"error":"Upstream API error"}' }).detail).toBe("HTTP 502");
    expect(judgeChat({ status: 500, body: '{"error":"API key not configured"}' }).ok).toBe(false);
  });
  it("fails a 200 with no dialogue or a body that isn't JSON", () => {
    expect(judgeChat({ status: 200, body: "{}" }).ok).toBe(false);
    expect(judgeChat({ status: 200, body: "<html>" }).ok).toBe(false);
  });
});

describe("agent servers", () => {
  it("names Railway's 'Application not found' as gone, not asleep", () => {
    expect(judgeAgentHealth("King's Cooking", railwayGone).detail).toContain("gone, not asleep");
  });
  it("passes /health only on status ok", () => {
    expect(judgeAgentHealth("g", { status: 200, body: '{"status":"ok"}' }).ok).toBe(true);
    expect(judgeAgentHealth("g", { status: 200, body: '{"status":"starting"}' }).ok).toBe(false);
  });
  it("passes a King's Cooking move and fails a reply without one", () => {
    const r = judgeKingsMove({ status: 200, body: JSON.stringify({ move: { from: [0, 0], to: [1, 0] }, agent: "scripted_1" }) });
    expect(r).toMatchObject({ ok: true, detail: "moved [0,0] → [1,0]" });
    expect(judgeKingsMove({ status: 200, body: '{"agent":"scripted_1"}' }).ok).toBe(false);
    expect(judgeKingsMove({ status: 422, body: "{}" }).ok).toBe(false);
  });
  it("passes a Spaces Game board and fails a reply without one", () => {
    expect(judgeSpacesBoard({ status: 200, body: '{"board":{"boardSize":2},"valid":true}' }).ok).toBe(true);
    expect(judgeSpacesBoard({ status: 200, body: "{}" }).ok).toBe(false);
  });
  it("fails the server's own failure shape, a null board", () => {
    expect(judgeSpacesBoard({ status: 200, body: '{"board":null,"valid":false,"attempts_used":3}' }).ok).toBe(false);
    expect(judgeSpacesBoard({ status: 200, body: '{"board":{"boardSize":2},"valid":false}' }).ok).toBe(false);
  });
});

describe("judgeCpuBoards", () => {
  it("passes status ok and fails anything else", () => {
    expect(judgeCpuBoards({ status: 200, body: '{"status":"ok","version":"1.0.0"}' }).ok).toBe(true);
    expect(judgeCpuBoards({ status: 200, body: '{"status":"degraded"}' }).ok).toBe(false);
    expect(judgeCpuBoards({ status: 404, body: "" }).ok).toBe(false);
  });
});

describe("finding the agent server in a live bundle", () => {
  it("resolves script tags against the page", () => {
    const html = '<script type="module" crossorigin src="/kings-cooking/assets/index-abc.js"></script><link href="/x.css">';
    expect(scriptUrls(html, "https://randallard.github.io/kings-cooking/")).toEqual([
      "https://randallard.github.io/kings-cooking/assets/index-abc.js",
    ]);
  });
  it("finds a compiled-in Railway URL once, and ignores other hosts", () => {
    const bundle =
      'const a="https://kings-cooking-inference-production.up.railway.app";fetch(`${a}/select-move`);' +
      'x="https://kings-cooking-inference-production.up.railway.app";y="https://cdn.discordapp.com/a"';
    expect(agentUrlsIn(bundle)).toEqual(["https://kings-cooking-inference-production.up.railway.app"]);
  });
  it("finds nothing in a bundle with no agent host", () => {
    expect(agentUrlsIn('fetch("https://townage.app/api/npc-chat")')).toEqual([]);
  });
});

describe("summarize", () => {
  it("lists failures first and counts them", () => {
    const text = summarize(
      [
        { name: "a", ok: true, detail: "fine" },
        { name: "b", ok: false, detail: "HTTP 404 | gone" },
      ],
      "2026-11-22 14:00 UTC",
    );
    expect(text).toContain("**1 of 2 checks failing.**");
    expect(text.indexOf("| ❌ | b |")).toBeLessThan(text.indexOf("| ✅ | a |"));
    expect(text).toContain("HTTP 404 \\| gone");
  });
  it("says so when everything passes", () => {
    expect(summarize([{ name: "a", ok: true, detail: "" }], "t")).toContain("All 1 checks pass.");
  });
});
