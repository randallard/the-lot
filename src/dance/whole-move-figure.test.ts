import { describe, expect, it } from "vitest";
import { defined } from "../test/defined";
import { getBodyShape } from "../services/body-shapes";
import { REVIEW2_SIZING } from "./baked-tracks";
import { figurePaths } from "./engine-paths";
import { bodyOf, metrics, solve } from "./whole-move";
import { figureMove } from "./whole-move-figure";

const shapes = [getBodyShape("ryan"), getBodyShape("ryan")] as const;
const bodies: [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>] = [bodyOf(shapes[0]), bodyOf(shapes[1])];

describe("🧪 any figure as a whole-move problem (step 7)", () => {
  it("captures a facing pair's figure with no browser: facing each other, a pair frame apart", () => {
    const p = figurePaths("dosado", "pair", shapes, REVIEW2_SIZING);
    const a = defined(p.beau[0], "p.beau[0]");
    const b = defined(p.belle[0], "p.belle[0]");
    // The pair frame's unit at the floor's default scale (2.2 m), and facing each other.
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(220, 0);
    expect(Math.abs(((a.facing - b.facing) % 360 + 360) % 360)).toBeCloseTo(180, 0);
    expect(p.grips.beau).toEqual([]);
  });

  it("holds Allemande Left's forearm grip: each hand at the other's elbow, over the engine's span", () => {
    const p = figurePaths("allemande-left", "pair", shapes, REVIEW2_SIZING);
    const g = p.grips.beau.find((x) => x.grip === "forearm");
    expect(g?.hand).toBe("left");
    const fm = figureMove("allemande-left", p, bodies);
    if ("unsupported" in fm) throw new Error(fm.unsupported);
    expect(fm.move.holds).toEqual([{ from: defined(g, "g").from / p.beats, to: defined(g, "g").to / p.beats, beau: 0, belle: 0, forearm: true }]);
  });

  it("pulls the beau's step in toward the cap", () => {
    // A Pass Thru with the belle walked straight down the beau's line: the only way past is for
    // him to step off it. (Ember ×4's real one needed 26 cm until 10-28's forward-head fix.)
    const real = figurePaths("pass-thru", "pair", shapes, REVIEW2_SIZING);
    const p = { ...real, belle: real.belle.map((s, i) => ({ ...s, x: defined(real.beau[i], "real.beau[i]").x })) };
    const free = figureMove("pass-thru", p, bodies);
    const capped = figureMove("pass-thru", p, bodies, { stepCap: 0.1 });
    const step = (fm: typeof free) => {
      if ("unsupported" in fm) return 0;
      const r = solve({ ...fm.move, frames: fm.start }, { iterations: 800 });
      return metrics(fm.move, r.frames, fm.path).step;
    };
    const a = step(free);
    const b = step(capped);
    // A strong cost, not a wall: walked head-on, clipping costs more than stepping past the cap,
    // so he still steps some way past it, but far less than uncapped.
    expect(a).toBeGreaterThan(0.3);
    expect(b).toBeLessThan(a / 2);
  });
});
