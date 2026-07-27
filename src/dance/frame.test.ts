import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCALE,
  SCALE_MARGIN,
  facingToRotationY,
  minScaleFor,
  minScaleForGap,
  minScaleForPair,
  makeFrame,
  refit,
  rotationYToFacing,
  scaleForGaps,
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

describe("scale floor for passing dancers", () => {
  // The engine's collision tests work in engine units and cannot see this: it only
  // exists once abstract dancers acquire a body radius.
  const BODY_RADIUS = 0.3; // services/body-shapes defaults

  it("derives the scale below which passing dancers intersect", () => {
    expect(minScaleFor(BODY_RADIUS)).toBeCloseTo(2, 9);
  });

  it("the default scale clears it", () => {
    expect(DEFAULT_SCALE).toBeGreaterThan(minScaleFor(BODY_RADIUS));
  });

  it("at the default scale a Pass Thru lane gap exceeds a body diameter", () => {
    // Passing dancers sit 2 x lane offset apart in engine units.
    const gap = 2 * 0.15 * DEFAULT_SCALE;
    expect(gap).toBeGreaterThan(2 * BODY_RADIUS);
  });

  it("clearance is a pair property: one wide dancer breaks the default scale", () => {
    // A single SHAPE_BOUNDS-max dancer (0.6) in an otherwise-default square.
    expect(minScaleForPair(0.3, 0.6)).toBeCloseTo(3, 9);
    expect(DEFAULT_SCALE).toBeLessThan(minScaleForPair(0.3, 0.6));
  });

  it("minScaleFor is the symmetric pair case", () => {
    expect(minScaleFor(0.45)).toBeCloseTo(minScaleForPair(0.45, 0.45), 9);
  });
});

describe("clearance-derived square scale", () => {
  it("pairs that fit the default lane gap dance at the default scale", () => {
    // Two default bodies need 0.6 — exactly the old body-diameter floor.
    expect(scaleForGaps([0.6, 0.5, 0.6])).toBe(DEFAULT_SCALE);
  });

  it("never shrinks below the default — small dancers get room, not a cramped square", () => {
    expect(scaleForGaps([0.2, 0.2])).toBe(DEFAULT_SCALE);
  });

  it("grows for the neediest pair present, keeping the default's margin", () => {
    // A pair needing 1.2 world units (two SHAPE_BOUNDS-max bodies) touches at 4.0.
    expect(scaleForGaps([0.6, 1.2, 0.7])).toBeCloseTo(SCALE_MARGIN * 4, 9);
    expect(scaleForGaps([0.6, 1.2, 0.7])).toBeGreaterThan(minScaleForGap(1.2));
  });

  it("no pairs — a lone dancer or empty floor — is just the default", () => {
    expect(scaleForGaps([])).toBe(DEFAULT_SCALE);
  });

  it("minScaleForPair is the disc special case of minScaleForGap", () => {
    expect(minScaleForPair(0.3, 0.6)).toBeCloseTo(minScaleForGap(0.9), 9);
  });

  it("the margin constant is exactly what the default scale carries over its floor", () => {
    expect(SCALE_MARGIN).toBeCloseTo(DEFAULT_SCALE / minScaleFor(0.3), 9);
  });
});
