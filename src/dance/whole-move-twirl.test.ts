import { describe, expect, it } from "vitest";
import { defined } from "../test/defined";
import { getBodyShape } from "../services/body-shapes";
import { armMetrics, touchHold } from "./arm-pose";
import { REVIEW2_SIZING } from "./baked-tracks";
import { couplePaths } from "./engine-paths";
import { bodyOf, restArm, shapesOf, solve, WEIGHTS, type Body } from "./whole-move";
import { HOME_WEIGHT, standingFrame, twirlMove } from "./whole-move-twirl";

const R2D = 180 / Math.PI;
const wrapDeg = (d: number) => Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * R2D;

const couple = (a: string, b: string) => {
  const shapes = [getBodyShape(a), getBodyShape(b)] as const;
  const bodies: [Body, Body] = [bodyOf(shapes[0]), bodyOf(shapes[1])];
  const paths = couplePaths("california-twirl", shapes, REVIEW2_SIZING);
  const P = { pairing: `${a}-${b}`, figure: "california-twirl", shapes: [a, b] as [string, string], beau: paths.beau, belle: paths.belle };
  return { shapes, bodies, P };
};

describe("🧪 a call starts and ends as the floor's standing couple (step 4, 2026-10-27)", () => {
  it("holds the inside hands a clasp apart, where the floor holds them, and hangs the free arms", () => {
    for (const [a, b] of [["ryan", "ryan"], ["myco", "ryan"], ["ember", "sprout"], ["player", "ember"]] as const) {
      const { shapes, bodies, P } = couple(a, b);
      const { path } = twirlMove(P, bodies);
      for (const f of [defined(path[0], "path[0]"), defined(path[path.length - 1], "path[path.length - 1]")]) {
        const s = standingFrame(shapes, bodies, f);
        const hb = defined(shapesOf(bodies[0], s[0]).find((x) => x.name === "hand-right"), "shapesOf(bodies[0], s[0]).find((x) => x.name === \"hand-right\")");
        const hg = defined(shapesOf(bodies[1], s[1]).find((x) => x.name === "hand-left"), "shapesOf(bodies[1], s[1]).find((x) => x.name === \"hand-left\")");
        const d = Math.hypot(hb.a[0] - hg.a[0], hb.a[1] - hg.a[1], hb.a[2] - hg.a[2]);
        expect(d).toBeCloseTo(WEIGHTS.clasp * (hb.r + hg.r), 3);
        // At the floor's own height for the hold (the taller dancer's waist, ADR-0046).
        const height = touchHold(armMetrics(shapes[0]), armMetrics(shapes[1])).height;
        expect((hb.a[1] + hg.a[1]) / 2).toBeCloseTo(height, 3);
        // On their spots, outside arms at rest.
        expect(s[0].x).toBe(f[0].x);
        expect(s[1].z).toBe(f[1].z);
        expect(s[0].arms[0]).toEqual(restArm(bodies[0]));
        expect(s[1].arms[1]).toEqual(restArm(bodies[1]));
      }
    }
  });

  it("pins every arm dial at the two ends only when asked", () => {
    const { shapes, bodies, P } = couple("ryan", "ryan");
    const free = twirlMove(P, bodies);
    expect(free.move.home).toBeUndefined();
    expect(free.move.targets).toBeUndefined();
    const home = twirlMove(P, bodies, [], "meet", "reshape", shapes);
    const n = home.path.length;
    expect(home.move.home).toBe(true);
    // 2 ends × 2 dancers × 2 arms × 6 dials, all firm.
    expect(home.move.targets).toHaveLength(48);
    expect(defined(home.move.targets, "home.move.targets").every((t) => (t.i === 0 || t.i === n - 1) && t.weight === HOME_WEIGHT)).toBe(true);
    // A break is pinned the same way: it starts and ends holding hands.
    expect(twirlMove(P, bodies, [], "none", "break", shapes).move.targets).toHaveLength(48);
  });

  it("solves onto the standing couple at both ends, with the beau on his spot", () => {
    const { shapes, bodies, P } = couple("ryan", "ryan");
    const { move, path, start } = twirlMove(P, bodies, [], "none", "reshape", shapes);
    const r = solve({ ...move, frames: start }, { iterations: 600, rate: 0.04, rateEnd: 0.005 });
    const n = path.length;
    for (const i of [0, n - 1]) {
      const got = defined(r.frames[i], "r.frames[i]");
      const want = standingFrame(shapes, bodies, defined(path[i], "path[i]"));
      for (const k of [0, 1] as const) for (const side of [0, 1] as const) for (const key of ["raise", "toward", "pitch", "heading"] as const) {
        expect(wrapDeg(got[k].arms[side][key] - want[k].arms[side][key])).toBeLessThan(3);
      }
      expect(Math.hypot(got[0].x - defined(path[i], "path[i]")[0].x, got[0].z - defined(path[i], "path[i]")[0].z)).toBeLessThan(0.01);
    }
  });
});
