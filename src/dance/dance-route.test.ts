import { describe, expect, it } from "vitest";
import { DEBUG_FIGURES, danceSceneFigure, danceSceneHash } from "./dance-route";

describe("the debug scene's hash", () => {
  it("is not the dance scene at all on any other hash", () => {
    expect(danceSceneFigure("")).toBeNull();
    expect(danceSceneFigure("#play")).toBeNull();
    expect(danceSceneFigure("#dancing")).toBeNull();
  });

  it("stands the default figure up on a bare #dance", () => {
    expect(danceSceneFigure("#dance")?.id).toBe("dosado");
    expect(danceSceneFigure("#dance=")?.id).toBe("dosado");
  });

  it("names a figure by id", () => {
    expect(danceSceneFigure("#dance=two-trades")?.id).toBe("two-trades");
    expect(danceSceneFigure("#dance=nonsense")?.id).toBe("dosado");
  });

  it("🔴 round-trips every figure, so a watch can be reloaded and shared", () => {
    // The defect this exists for: the scene wrote `#dance=<call>` while the loader reads
    // ids, and the two namespaces only coincide for the facing-pair figures. `two-trades`
    // dances `partner-trade`, so choosing it rewrote the URL to a hash that read back as
    // Dosado — every couple watch unreloadable, and a link to one showed the wrong dance.
    for (const figure of DEBUG_FIGURES) {
      expect(danceSceneFigure(danceSceneHash(figure))?.id).toBe(figure.id);
    }
  });

  it("keeps the bare #dance for the default figure", () => {
    // The short URL is the one that gets typed; only the others need naming.
    expect(danceSceneHash(DEBUG_FIGURES[0]!)).toBe("#dance");
  });
});
