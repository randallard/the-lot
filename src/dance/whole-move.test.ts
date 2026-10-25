import { describe, expect, it } from "vitest";
import { computePositions, getBodyShape, NPC_BODY_CENTER_Y } from "../services/body-shapes";
import { armPoints, bodyOf, fromDials, reachArm, restArm, segSeg, toDials, toFloor, toRig, type DancerFrame, type Vec } from "./whole-move";

const near = (a: Vec, b: Vec, eps = 1e-9) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < eps;

describe("the whole-move forward model", () => {
  const shape = getBodyShape("ryan");
  const body = bodyOf(shape);
  const pos = computePositions(shape, NPC_BODY_CENTER_Y);

  it("puts a resting arm where Dancer.tsx draws it", () => {
    const p = armPoints(body, 0, restArm(body));
    expect(near(p.s, [pos.forearmX, pos.shoulderY, pos.shoulderZ])).toBe(true);
    expect(near(p.e, [pos.forearmX, pos.elbowY, pos.shoulderZ])).toBe(true);
    expect(near(p.h, [pos.forearmX, pos.handCenterY, pos.shoulderZ])).toBe(true);
    // The right arm is the mirror.
    expect(armPoints(body, 1, restArm(body)).h[0]).toBeCloseTo(-pos.forearmX);
  });

  it("measures segment distances, crossing and parallel", () => {
    expect(segSeg([0, 0, 0], [1, 0, 0], [0.5, 1, -1], [0.5, 1, 1])).toBeCloseTo(1);
    expect(segSeg([0, 0, 0], [1, 0, 0], [0, 0.3, 0], [1, 0.3, 0])).toBeCloseTo(0.3);
    expect(segSeg([0, 0, 0], [0, 0, 0], [2, 0, 0], [2, 0, 0])).toBeCloseTo(2);
  });

  it("goes to the floor frame and back", () => {
    const f: DancerFrame = { x: 0.4, z: -0.7, yaw: 2.1, arms: [restArm(body), restArm(body)] };
    const p: Vec = [0.3, 1.1, -0.2];
    expect(near(toRig(toFloor(p, f), f), p, 1e-12)).toBe(true);
    // Facing −z (yaw π): the rig's left (+x) is the floor's −x.
    expect(toFloor([1, 0, 0], { ...f, x: 0, z: 0, yaw: Math.PI })[0]).toBeCloseTo(-1);
  });

  it("reaches a target in range exactly, and stretches evenly for one out of range", () => {
    const f: DancerFrame = { x: 0, z: 0, yaw: Math.PI / 3, arms: [restArm(body), restArm(body)] };
    const s = toFloor(body.shoulder[1], f);
    const inReach: Vec = [s[0] + 0.2, s[1] + 0.3, s[2] - 0.1];
    const a = reachArm(body, 1, f, inReach, [0, -1, 0]);
    expect(near(toFloor(armPoints(body, 1, a).h, f), inReach, 1e-9)).toBe(true);
    expect(a.ulen).toBeCloseTo(body.upper0);
    const far: Vec = [s[0], s[1] + 1.2, s[2]];
    const b = reachArm(body, 1, f, far, [1, 0, 0]);
    expect(near(toFloor(armPoints(body, 1, b).h, f), far, 1e-9)).toBe(true);
    expect(b.ulen / body.upper0).toBeCloseTo(b.flen / body.fore0);
  });

  it("round-trips #review2's dials", () => {
    const f: DancerFrame = {
      x: 0.25, z: -0.5, yaw: -1.2,
      arms: [restArm(body), { raise: 2.6, toward: -1.1, ulen: 0.4, pitch: 0.7, heading: 0.3, flen: 0.38 }],
    };
    const back = fromDials(toDials(f, 1), 1, body);
    const p = armPoints(body, 1, back.arms[1]);
    const q = armPoints(body, 1, f.arms[1]);
    expect(near(p.h, q.h, 0.005)).toBe(true);
    expect(back.x).toBeCloseTo(0.25);
  });
});
