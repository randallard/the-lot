import { describe, expect, it } from "vitest";
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
    const a = p.beau[0]!;
    const b = p.belle[0]!;
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
    expect(fm.move.holds).toEqual([{ from: g!.from / p.beats, to: g!.to / p.beats, beau: 0, belle: 0, forearm: true }]);
  });

  it("keeps the beau within the step cap", () => {
    // Ember ×4's Pass Thru: its heads sit 28 cm forward, so they meet before the bodies do, and
    // the beau steps off the path to pass (10-28, after the arm-aware clearance took the rest).
    const ember = [getBodyShape("ember"), getBodyShape("ember")] as const;
    const eb: [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>] = [bodyOf(ember[0]), bodyOf(ember[1])];
    const p = figurePaths("pass-thru", "pair", ember, REVIEW2_SIZING);
    const free = figureMove("pass-thru", p, eb);
    const capped = figureMove("pass-thru", p, eb, { stepCap: 0.1 });
    if ("unsupported" in free || "unsupported" in capped) throw new Error("pass thru should solve");
    const step = (fm: typeof free) => {
      if ("unsupported" in fm) return 0;
      const r = solve({ ...fm.move, frames: fm.start }, { iterations: 800 });
      return metrics(fm.move, r.frames, fm.path).step;
    };
    expect(step(free)).toBeGreaterThan(0.15);
    expect(step(capped)).toBeLessThan(0.11);
  });
});
