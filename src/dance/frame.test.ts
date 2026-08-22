import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCALE,
  CLEARANCE_MARGIN,
  facingToRotationY,
  makeFrame,
  refit,
  rotationYToFacing,
  toEngine,
  toWorld,
} from "./frame";

const F = makeFrame({ x: 0, z: 0 }, 2);

describe("engine ↔ world transform", () => {
  it("puts the engine origin at the frame origin", () => {
    expect(toWorld(makeFrame({ x: 5, z: -3 }, 2), { x: 0, y: 0 })).toEqual({ x: 5, z: -3 });
  });

  it("maps engine +y to world −z, so the square reads like it does on paper", () => {
    expect(toWorld(F, { x: 0, y: 1 })).toEqual({ x: 0, z: -2 });
    expect(toWorld(F, { x: 1, y: 0 })).toEqual({ x: 2, z: 0 });
  });

  it("round-trips through toEngine", () => {
    const frame = makeFrame({ x: 3, z: -1 }, 2.5, 0.7);
    for (const p of [{ x: 0, y: 0 }, { x: 0.15, y: -0.5 }, { x: -0.3, y: 0.8 }]) {
      const back = toEngine(frame, toWorld(frame, p));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });

  it("scales distances uniformly — a square must not be sheared onto the floor", () => {
    const a = toWorld(F, { x: 0, y: 0 });
    const b = toWorld(F, { x: 0.3, y: 0.4 }); // 0.5 in engine units
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(0.5 * F.scale, 9);
  });

  it("yaw rotates the whole square about its origin without changing distances", () => {
    const spun = makeFrame({ x: 0, z: 0 }, 2, Math.PI / 3);
    const a = toWorld(spun, { x: 0, y: 0 });
    const b = toWorld(spun, { x: 1, y: 0 });
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(2, 9);
  });
});

describe("facing", () => {
  it("agrees with townage's atan2(dir.x, dir.z) heading convention", () => {
    // Engine facing θ is direction (cos θ, sin θ), which is (cos θ, −sin θ) in world
    // (x, z). The rig's heading must point the same way.
    for (const deg of [0, 45, 90, 180, 270, 359]) {
      const rad = (deg * Math.PI) / 180;
      const expected = Math.atan2(Math.cos(rad), -Math.sin(rad));
      const actual = facingToRotationY(F, deg);
      // Compare as directions, since angles are only equal modulo 2π.
      expect(Math.sin(actual)).toBeCloseTo(Math.sin(expected), 9);
      expect(Math.cos(actual)).toBeCloseTo(Math.cos(expected), 9);
    }
  });

  it("engine +y (facing 90°) points at world −z", () => {
    const r = facingToRotationY(F, 90);
    // Heading vector under townage's convention.
    expect(Math.sin(r)).toBeCloseTo(0, 9);
    expect(Math.cos(r)).toBeCloseTo(-1, 9);
  });

  it("round-trips through rotationYToFacing", () => {
    for (const deg of [0, 37, 90, 180, 271]) {
      expect(rotationYToFacing(F, facingToRotationY(F, deg))).toBeCloseTo(deg, 6);
    }
  });
});

describe("drift re-fitting", () => {
  it("moves the origin to the dancers' centroid", () => {
    const fitted = refit(F, [{ x: 2, z: 0 }, { x: 4, z: 4 }]);
    expect(fitted.origin).toEqual({ x: 3, z: 2 });
  });

  it("leaves scale and yaw alone — drift is translation, not reshaping", () => {
    const spun = makeFrame({ x: 0, z: 0 }, 2.5, 1.1);
    const fitted = refit(spun, [{ x: 9, z: 9 }]);
    expect(fitted.scale).toBe(spun.scale);
    expect(fitted.yaw).toBe(spun.yaw);
  });

  it("is a no-op with no dancers, so callers can apply it unconditionally", () => {
    expect(refit(F, [])).toBe(F);
  });
});

describe("the square no longer sizes itself to its widest pair (ADR-0035)", () => {
  // 🔴 **This block replaces five tests of machinery that is gone.** `minScaleFor`,
  // `minScaleForPair`, `minScaleForGap` and `scaleForGaps` grew the whole floor until the
  // engine's fixed lane happened to equal the widest pair's clearance — *"whole-square
  // breathing done coarsely,"* in this module's own words, *"the neediest pair sets the
  // spacing for everyone, even in moves that don't involve them."*
  //
  // The figures carry their own accommodation now (square-one ADR-0020, ADR-0023), so the
  // square sits at one scale and a wide pair widens the call they are in. What is left to
  // assert is the margin, which is the only part of that arithmetic that survived — moved
  // from the floor to the measurement it qualifies.

  it("keeps a margin over the bare clearance, because touching is not clearing", () => {
    // `lateralClearance` returns the distance at which nothing *touches*, which is the
    // distance at which everything touches. Real dancers brush shoulders on a Pass Thru, so
    // tight is right and zero is wrong.
    expect(CLEARANCE_MARGIN).toBeGreaterThan(1);
    expect(CLEARANCE_MARGIN).toBeLessThan(1.25);
  });

  it("has one scale, and it does not depend on anybody's body", () => {
    // The whole point: the floor is a floor. A consumer may still override it per square,
    // which is what the `scale` prop is for.
    expect(DEFAULT_SCALE).toBe(2.2);
    expect(makeFrame({ x: 0, z: 0 }).scale).toBe(DEFAULT_SCALE);
  });
});
