import { describe, expect, it } from "vitest";
import {
  DEAD_ZONE_PX,
  angleFromUp,
  wedgeAt,
  wedgeBounds,
  wedgeConfidence,
  wedgeDirection,
} from "./wheel-geometry";

const TAU = Math.PI * 2;
/** Comfortably outside the dead zone. */
const R = DEAD_ZONE_PX * 3;

/** A point `r` from the centre at a clockwise-from-up angle. */
function polar(angle: number, r = R) {
  return { dx: Math.sin(angle) * r, dy: -Math.cos(angle) * r };
}

describe("angleFromUp", () => {
  it("puts zero straight up and grows clockwise", () => {
    expect(angleFromUp(0, -1)).toBeCloseTo(0, 12);
    expect(angleFromUp(1, 0)).toBeCloseTo(Math.PI / 2, 12);
    expect(angleFromUp(0, 1)).toBeCloseTo(Math.PI, 12);
    expect(angleFromUp(-1, 0)).toBeCloseTo((3 * Math.PI) / 2, 12);
  });

  it("always lands in [0, TAU)", () => {
    for (let a = -TAU; a < TAU * 2; a += 0.05) {
      const { dx, dy } = polar(a);
      const r = angleFromUp(dx, dy);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(TAU);
    }
  });
});

describe("the dead zone cancels", () => {
  it("returns null inside it, whatever the direction", () => {
    for (let a = 0; a < TAU; a += 0.1) {
      const { dx, dy } = polar(a, DEAD_ZONE_PX * 0.5);
      expect(wedgeAt(dx, dy, 8)).toBeNull();
    }
  });

  it("returns null before the pointer has moved at all", () => {
    expect(wedgeAt(0, 0, 8)).toBeNull();
  });

  it("selects as soon as the drag clears it", () => {
    expect(wedgeAt(0, -(DEAD_ZONE_PX + 1), 8)).toBe(0);
  });

  it("still cancels when the drag comes back — abort before release", () => {
    // WCAG 2.5.2: the user must be able to change their mind mid-gesture.
    expect(wedgeAt(0, -R, 8)).toBe(0);
    expect(wedgeAt(0, -1, 8)).toBeNull();
  });
});

describe("selection has no outer bound", () => {
  // ADR-0015: a flick goes outside the ring by definition, so an outer cancel
  // boundary (superseded ADR-0014's) would make the expert gesture always cancel.
  it("keeps selecting however far the flick travels", () => {
    for (const r of [DEAD_ZONE_PX + 1, 200, 2000, 100000]) {
      expect(wedgeAt(0, -r, 8)).toBe(0);
    }
  });
});

describe("wedge selection", () => {
  it("puts wedge 0 straight up and runs clockwise", () => {
    expect(wedgeAt(0, -R, 4)).toBe(0);
    expect(wedgeAt(R, 0, 4)).toBe(1);
    expect(wedgeAt(0, R, 4)).toBe(2);
    expect(wedgeAt(-R, 0, 4)).toBe(3);
  });

  it("centres each wedge on its own direction", () => {
    for (const count of [3, 4, 5, 6, 8]) {
      for (let i = 0; i < count; i++) {
        const { dx, dy } = polar(wedgeBounds(i, count).mid);
        expect(wedgeAt(dx, dy, count)).toBe(i);
      }
    }
  });

  it("covers the whole circle with no gaps and no index out of range", () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 12]) {
      for (let a = 0; a < TAU; a += 0.005) {
        const { dx, dy } = polar(a);
        const idx = wedgeAt(dx, dy, count);
        expect(idx).not.toBeNull();
        expect(idx! >= 0 && idx! < count).toBe(true);
      }
    }
  });

  it("wraps the seam below wedge 0 back to wedge 0, not to count", () => {
    // Rounding an angle just under TAU gives `count`, which is out of range unless
    // it is taken modulo — the off-by-one this test exists to catch.
    for (const count of [3, 4, 5, 8]) {
      const { dx, dy } = polar(TAU - 1e-6);
      expect(wedgeAt(dx, dy, count)).toBe(0);
    }
  });

  it("gives every wedge an equal share", () => {
    const count = 8;
    const tally = new Array<number>(count).fill(0);
    for (let a = 0; a < TAU; a += 0.0005) {
      const { dx, dy } = polar(a);
      tally[wedgeAt(dx, dy, count)!]++;
    }
    const min = Math.min(...tally);
    const max = Math.max(...tally);
    expect(max - min).toBeLessThanOrEqual(2);
  });

  it("handles a single item and a degenerate count", () => {
    expect(wedgeAt(0, -R, 1)).toBe(0);
    expect(wedgeAt(R, 0, 1)).toBe(0);
    expect(wedgeAt(0, -R, 0)).toBeNull();
  });
});

describe("wedgeBounds and direction", () => {
  it("gives each wedge an equal, contiguous span", () => {
    const count = 6;
    const step = TAU / count;
    for (let i = 0; i < count; i++) {
      const b = wedgeBounds(i, count);
      expect(b.end - b.start).toBeCloseTo(step, 12);
      expect(b.mid).toBeCloseTo((b.start + b.end) / 2, 12);
      if (i > 0) expect(b.start).toBeCloseTo(wedgeBounds(i - 1, count).end, 12);
    }
  });

  it("points wedge 0 up and wedge directions are unit length", () => {
    expect(wedgeDirection(0, 8)).toEqual({ x: expect.closeTo(0, 12), y: -1 });
    for (let i = 0; i < 8; i++) {
      const d = wedgeDirection(i, 8);
      expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 12);
    }
  });

  it("agrees with wedgeAt — drawing and selection cannot disagree", () => {
    for (const count of [3, 4, 6, 8]) {
      for (let i = 0; i < count; i++) {
        const d = wedgeDirection(i, count);
        expect(wedgeAt(d.x * R, d.y * R, count)).toBe(i);
      }
    }
  });
});

describe("wedgeConfidence", () => {
  it("is 1 dead centre of a wedge", () => {
    for (let i = 0; i < 8; i++) {
      const d = wedgeDirection(i, 8);
      expect(wedgeConfidence(d.x * R, d.y * R, 8)).toBeCloseTo(1, 10);
    }
  });

  it("falls to 0 on the boundary between two wedges", () => {
    const { dx, dy } = polar(wedgeBounds(0, 8).end);
    expect(wedgeConfidence(dx, dy, 8)).toBeCloseTo(0, 10);
  });

  it("stays within 0..1 everywhere", () => {
    for (let a = 0; a < TAU; a += 0.01) {
      const { dx, dy } = polar(a);
      const c = wedgeConfidence(dx, dy, 8);
      expect(c).toBeGreaterThanOrEqual(-1e-12);
      expect(c).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
});
