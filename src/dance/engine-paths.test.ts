import { describe, expect, it } from "vitest";
import { getBodyShape } from "../services/body-shapes";
import { REVIEW2_SIZING } from "./baked-tracks";
import { blendBody, rng, samplePair } from "./body-sample";
import { couplePaths } from "./engine-paths";
import { bodyOf, restGap } from "./whole-move";
import captured from "../../scripts/whole-move/ryan-ryan-twirl.paths.json";

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

describe("🧪 a couple's paths without a browser (2026-10-26, step 3)", () => {
  it("are what #review2 drew for ryan → ryan, to the capture's rounding", () => {
    const r = couplePaths("california-twirl", [getBodyShape("ryan"), getBodyShape("ryan")], REVIEW2_SIZING);
    expect(r.beats).toBe(4);
    for (const k of ["beau", "belle"] as const) {
      expect(r[k]).toHaveLength(41);
      r[k].forEach((p, i) => {
        const c = captured[k][i]!;
        expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeLessThan(0.5);
        expect(Math.abs(wrap(p.facing - c.facing))).toBeLessThan(0.6);
      });
    }
  });
});

describe("🧪 sampled bodies (2026-10-26, step 3)", () => {
  it("starts with the 25 stock pairings, beau-major, then the same blend for the same index", () => {
    expect(samplePair(0).label).toBe("player-player");
    expect(samplePair(18).label).toBe("ryan-ryan");
    expect(samplePair(24).label).toBe("sprout-sprout");
    expect(samplePair(40)).toEqual(samplePair(40));
    expect(samplePair(40).label).not.toBe(samplePair(41).label);
  });

  it("blends within the bounds, and a blend at 0 with no jitter is the first body's geometry", () => {
    const ryan = getBodyShape("ryan");
    const myco = getBodyShape("myco");
    const same = blendBody(ryan, myco, 0, () => 0.5);
    expect(same.head.radius).toBeCloseTo(ryan.head.radius, 9);
    expect(same.body.height).toBeCloseTo(ryan.body.height, 9);
    const r = rng(3);
    for (let i = 0; i < 50; i++) {
      const b = blendBody(ryan, myco, r(), r);
      expect(b.head.radius).toBeGreaterThanOrEqual(0.1);
      expect(b.layout.upperArmSpacing).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("🧪 an upper arm's own-body margin (2026-10-26, step 3)", () => {
  it("is the stock cast's full margin, and no more than a body's rest clearance otherwise", () => {
    const ryan = bodyOf(getBodyShape("ryan"));
    // 15 cm of room at rest: any margin used applies in full.
    expect(restGap(ryan, 0, 1)).toBeGreaterThan(0.1);
    // A body whose shoulder sits in its head: the rest clearance is negative, so it's allowed.
    const tucked = bodyOf({ ...getBodyShape("ryan"), layout: { ...getBodyShape("ryan").layout, forearmXOffset: 0.2, shoulderY: 0.95 } });
    expect(restGap(tucked, 0, 1)).toBeLessThan(restGap(ryan, 0, 1));
  });
});
