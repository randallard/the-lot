import { describe, expect, it } from "vitest";
import { danceCoupleSequence, partnerUp, flattenSequence, sampleMotion } from "square-one";
import { makeFrame, toWorld, facingToRotationY, DEFAULT_SCALE as scale } from "./frame";
import { arcAngle, joinArcAt, planJoinArc, type Sampled } from "./join-arc";

/** square-one's own twirl for a 0.9-wide pair, sampled the way the floor samples it. */
function twirl() {
  const couple = partnerUp("a", "b", undefined, undefined, 0.9 / scale, 0.6 / scale);
  const shapeAt = () => ({ width: 0.9 / scale, archClearance: 0.6 / scale });
  const motions = flattenSequence(danceCoupleSequence(["california-twirl"] as never, couple, shapeAt)) as Record<string, never>;
  const frame = makeFrame({ x: 0, z: 0 }, scale, 0);
  const at = (key: string) => (beat: number): Sampled => {
    const s = sampleMotion(motions[key]!, beat);
    const w = toWorld(frame, s.position);
    return { x: w.x, z: w.z, yaw: facingToRotationY(frame, s.facing) };
  };
  const grip = (motions["a"] as unknown as { grips: { grip: string; from: number; to: number }[] }).grips.find((g) => g.grip === "arch")!;
  return { beau: at("a"), belle: at("b"), grip };
}

describe("the joined hands on one arc", () => {
  const { beau, belle, grip } = twirl();
  const arc = planJoinArc(beau, belle, grip.from, grip.to);
  const LOW = 1.0, TOP = 2.0, REACH = 0.2;

  it("🔑 stays in one upright plane through the centre, along the couple's facing", () => {
    for (let b = grip.from; b <= grip.to; b += 0.125) {
      const p = joinArcAt(arc, b, LOW, TOP, REACH);
      // Sideways off the plane: across the facing, from the centre.
      const side = (p.x - arc.cx) * arc.fz - (p.z - arc.cz) * arc.fx;
      expect(Math.abs(side), `beat ${String(b)}`).toBeLessThan(1e-9);
    }
  });

  it("starts low in front of the couple and ends low in front of their new facing", () => {
    const start = joinArcAt(arc, grip.from, LOW, TOP, REACH);
    const end = joinArcAt(arc, grip.to, LOW, TOP, REACH);
    expect(start.height).toBeCloseTo(LOW);
    expect(end.height).toBeCloseTo(LOW);
    const ahead = (p: { x: number; z: number }) => (p.x - arc.cx) * arc.fx + (p.z - arc.cz) * arc.fz;
    expect(ahead(start)).toBeCloseTo(REACH);
    expect(ahead(end)).toBeCloseTo(-REACH);
    // The couple begin facing the same way, and the beau walks round in front of her.
    expect(beau(2).x * arc.fx + beau(2).z * arc.fz - (arc.cx * arc.fx + arc.cz * arc.fz)).toBeGreaterThan(0.3);
  });

  it("🔑 is at the top as she passes under the centre, half turned", () => {
    const mid = belle(2);
    expect(Math.hypot(mid.x - arc.cx, mid.z - arc.cz)).toBeLessThan(0.05);
    expect(arcAngle(arc, 2) / Math.PI).toBeGreaterThan(0.45);
    expect(arcAngle(arc, 2) / Math.PI).toBeLessThan(0.65);
    expect(joinArcAt(arc, 2, LOW, TOP, REACH).height).toBeGreaterThan(TOP - 0.1);
  });

  it("only ever goes forward along the arc, and holds its ends outside the span", () => {
    let last = -1;
    for (let b = grip.from - 0.5; b <= grip.to + 0.5; b += 0.0625) {
      const th = arcAngle(arc, b);
      expect(th).toBeGreaterThanOrEqual(last - 1e-12);
      last = th;
    }
    expect(arcAngle(arc, grip.from - 1)).toBe(0);
    expect(arcAngle(arc, grip.to + 1)).toBeCloseTo(Math.PI);
  });
});
