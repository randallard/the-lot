import { describe, expect, it } from "vitest";
import {
  TUCK_CLEAR_AT,
  TUCK_FULL_AT,
  armMetrics,
  armPose,
  contact,
  advanceGripBlend,
  contactRadius,
  contactSeparation,
  forearm,
  gripBlend,
  gripHeight,
  poseArms,
  trackContact,
  trackForearm,
  tuckExposure,
  tuckNearness,
  tuckPose,
  type ArmMetrics,
  type ArmPose,
  type Placement,
} from "./arm-pose";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  RYAN_DEFAULTS,
  SPROUT_DEFAULTS,
  lateralClearance,
  rigidParts,
  type CharacterBodyShape,
} from "../services/body-shapes";

/** A blend with the left hand fully joined — what a held grip looks like. */
const JOINED_LEFT = { left: 1, right: 0 };

const CAST: readonly [string, CharacterBodyShape][] = [
  ["Myco", MYCO_DEFAULTS],
  ["Ember", EMBER_DEFAULTS],
  ["Ryan", RYAN_DEFAULTS],
  ["Sprout", SPROUT_DEFAULTS],
];

describe("arm metrics", () => {
  it.each(CAST)("hides %s's whole arm inside the torso when tucked", (_name, shape) => {
    const m = armMetrics(shape);
    expect(m.tuckX + m.armHalfWidth).toBeLessThanOrEqual(shape.body.radius + 1e-9);
  });

  it.each(CAST)("never tucks %s's arm outward", (_name, shape) => {
    expect(armMetrics(shape).tuckX).toBeLessThanOrEqual(armMetrics(shape).restX);
  });

  it.each(CAST)("puts %s's hand below the shoulder at rest", (_name, shape) => {
    expect(armMetrics(shape).handReach).toBeGreaterThan(0);
  });

  it.each(CAST)("gives %s a forearm span shorter than the whole arm", (_name, shape) => {
    const m = armMetrics(shape);
    expect(m.forearmSpan).toBeGreaterThan(0);
    expect(m.forearmSpan).toBeCloseTo(m.handReach - m.elbowReach, 9);
  });
});

describe("the tuck clears the lane", () => {
  // The defect this channel exists to fix, stated as arithmetic: at the closest
  // distance the frame lets a pair pass, arms left hanging at shoulder width
  // overlap, and tucked arms cannot.
  const pairs = CAST.flatMap((a, i) => CAST.slice(i + 1).map((b) => [a, b] as const));

  it.each(pairs)("keeps %s and %s from crossing arms", ([, aShape], [, bShape]) => {
    const gap = lateralClearance(rigidParts(aShape), rigidParts(bShape));
    const a = armMetrics(aShape);
    const b = armMetrics(bShape);
    expect(a.tuckX + a.armHalfWidth + b.tuckX + b.armHalfWidth).toBeLessThanOrEqual(gap);
  });

  it("is needed — the debug cast's resting arms do cross at that distance", () => {
    const gap = lateralClearance(rigidParts(MYCO_DEFAULTS), rigidParts(EMBER_DEFAULTS));
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    expect(a.restX + a.armHalfWidth + b.restX + b.armHalfWidth).toBeGreaterThan(gap);
  });
});

describe("tuck amount", () => {
  const clearance = 0.8;

  it("is full at contact and gone by the clear distance", () => {
    expect(tuckNearness(0, clearance)).toBe(1);
    expect(tuckNearness(TUCK_FULL_AT * clearance, clearance)).toBeCloseTo(1, 9);
    expect(tuckNearness(TUCK_CLEAR_AT * clearance, clearance)).toBeCloseTo(0, 9);
    expect(tuckNearness(10, clearance)).toBe(0);
  });

  it("eases in monotonically between them", () => {
    let previous = -1;
    for (let d = TUCK_CLEAR_AT * clearance; d >= 0; d -= 0.02) {
      const t = tuckNearness(d, clearance);
      expect(t).toBeGreaterThanOrEqual(previous);
      previous = t;
    }
  });

  it("scales with the pair — bigger dancers start narrowing further out", () => {
    expect(tuckNearness(1.2, 0.8)).toBeGreaterThan(tuckNearness(1.2, 0.5));
  });

  it("is zero when the pair has no clearance to measure against", () => {
    expect(tuckNearness(0.5, 0)).toBe(0);
  });
});

describe("which arm is in the way", () => {
  it("tucks the arm on the side the partner is passing, not the other", () => {
    // Partner fully to local +x, which is the anatomical left group.
    expect(tuckExposure(1, 1)).toBe(1);
    expect(tuckExposure(1, -1)).toBe(0);
    expect(tuckExposure(-1, -1)).toBe(1);
    expect(tuckExposure(-1, 1)).toBe(0);
  });

  it("leaves both arms hanging when the partner is straight ahead", () => {
    expect(tuckExposure(0, 1)).toBe(0);
    expect(tuckExposure(0, -1)).toBe(0);
  });
});

describe("tuck pose", () => {
  const m = armMetrics(MYCO_DEFAULTS);

  it("rests at the shoulder with the forearm hanging", () => {
    const p = tuckPose(armPose(), m, 1, 0);
    expect(p).toEqual({ x: m.restX, y: m.restY, z: 0, aimX: 0, aimY: -1, aimZ: 0 });
    expect(tuckPose(armPose(), m, -1, 0).x).toBe(-m.restX);
  });

  it("slides to the tuck at full amount, mirrored per side", () => {
    expect(tuckPose(armPose(), m, 1, 1).x).toBeCloseTo(m.tuckX, 9);
    expect(tuckPose(armPose(), m, -1, 1).x).toBeCloseTo(-m.tuckX, 9);
  });

  it("moves inward, never outward, as the amount grows", () => {
    let previous = m.restX + 1;
    for (let a = 0; a <= 1; a += 0.1) {
      const x = tuckPose(armPose(), m, 1, a).x;
      expect(x).toBeLessThanOrEqual(previous);
      previous = x;
    }
  });

  it("keeps the shoulder height and the neutral plane", () => {
    const p = tuckPose(armPose(), m, 1, 0.5);
    expect(p.y).toBe(m.restY);
    expect(p.z).toBe(0);
  });
});

describe("grip blend", () => {
  it("snaps to fully joined instead of approaching it forever", () => {
    // The snap is the whole point: a weight stuck at 0.999 leaves the arm a hair off
    // the pivot, and a hair off the pivot is what slides the grip.
    const b = gripBlend();
    for (let i = 0; i < 200; i++) advanceGripBlend(b, "left", 0.17);
    expect(b.left).toBe(1);
    expect(b.right).toBe(0);
  });

  it("lets go gradually, then snaps free", () => {
    const b = { left: 1, right: 0 };
    advanceGripBlend(b, null, 0.17);
    expect(b.left).toBeLessThan(1);
    expect(b.left).toBeGreaterThan(0);
    for (let i = 0; i < 200; i++) advanceGripBlend(b, null, 0.17);
    expect(b.left).toBe(0);
  });

  it("treats the engine's \"none\" as hands free", () => {
    const b = { left: 1, right: 1 };
    for (let i = 0; i < 200; i++) advanceGripBlend(b, "none", 0.17);
    expect(b).toEqual({ left: 0, right: 0 });
  });

  it("joins instantly at ease 1, for a driver that wants no blend", () => {
    expect(advanceGripBlend(gripBlend(), "right", 1)).toEqual({ left: 0, right: 1 });
  });
});

describe("grip height", () => {
  const myco = armMetrics(MYCO_DEFAULTS);
  const ember = armMetrics(EMBER_DEFAULTS);

  it("is a dancer's own elbow height when the pair are the same size", () => {
    expect(gripHeight(myco, myco)).toBe(myco.elbowY);
  });

  it("splits the difference for a mixed pair — the taller reaches down", () => {
    // The documented placeholder rule, asserted so step 3 of the size brief has to
    // replace it deliberately rather than by accident.
    const height = gripHeight(myco, ember);
    expect(height).toBeGreaterThan(myco.elbowY);
    expect(height).toBeLessThan(ember.elbowY);
  });
});

describe("contact radius", () => {
  const myco = armMetrics(MYCO_DEFAULTS);
  const ember = armMetrics(EMBER_DEFAULTS);

  it("is half a forearm for an even pair — hand exactly at elbow", () => {
    expect(contactRadius(myco, myco)).toBeCloseTo(myco.forearmSpan / 2, 9);
  });

  it("follows the shorter forearm, so both hands still reach", () => {
    expect(ember.forearmSpan).toBeGreaterThan(myco.forearmSpan);
    expect(contactRadius(myco, ember)).toBeCloseTo(myco.forearmSpan / 2, 9);
    expect(contactRadius(ember, myco)).toBe(contactRadius(myco, ember));
  });
});

/**
 * A pair joined in a forearm grip, posed and tracked into world space the way the
 * driver does it: both facing tangentially with the pivot on their left, which is
 * the geometry `arm-turn` produces.
 */
function joinedPair(
  aShape: CharacterBodyShape,
  bShape: CharacterBodyShape,
  radius = 0.78,
): {
  ma: ArmMetrics;
  mb: ArmMetrics;
  a: ReturnType<typeof forearm>;
  b: ReturnType<typeof forearm>;
  height: number;
} {
  const ma = armMetrics(aShape);
  const mb = armMetrics(bShape);
  // A south of the pivot facing −x, B north facing +x: local +x (the anatomical
  // left group) points at the pivot for both.
  const pa: Placement = { x: 0, z: radius, yaw: -Math.PI / 2 };
  const pb: Placement = { x: 0, z: -radius, yaw: Math.PI / 2 };
  const posesA = poseArms(armPosesFor(), ma, mb, pa, pb, 0.71, JOINED_LEFT);
  const posesB = poseArms(armPosesFor(), mb, ma, pb, pa, 0.71, JOINED_LEFT);
  return {
    ma,
    mb,
    a: trackForearm(forearm(), ma, posesA.left, pa),
    b: trackForearm(forearm(), mb, posesB.left, pb),
    height: gripHeight(ma, mb),
  };
}

function armPosesFor(): { left: ArmPose; right: ArmPose } {
  return { left: armPose(), right: armPose() };
}

function direction(f: ReturnType<typeof forearm>): { x: number; y: number; z: number } {
  const dx = f.hand.x - f.elbow.x;
  const dy = f.hand.y - f.elbow.y;
  const dz = f.hand.z - f.elbow.z;
  const len = Math.hypot(dx, dy, dz);
  return { x: dx / len, y: dy / len, z: dz / len };
}

describe("a forearm grip, in world space", () => {
  const even = joinedPair(MYCO_DEFAULTS, MYCO_DEFAULTS);
  const mixed = joinedPair(MYCO_DEFAULTS, EMBER_DEFAULTS);

  it("lays both forearms horizontal at the shared grip height", () => {
    for (const [name, pair] of [["even", even], ["mixed", mixed]] as const) {
      for (const f of [pair.a, pair.b]) {
        expect(f.elbow.y, name).toBeCloseTo(pair.height, 9);
        expect(f.hand.y, name).toBeCloseTo(pair.height, 9);
      }
    }
  });

  it("points them opposite ways — alternated, not parallel", () => {
    for (const pair of [even, mixed]) {
      const da = direction(pair.a);
      const db = direction(pair.b);
      expect(da.x * db.x + da.y * db.y + da.z * db.z).toBeCloseTo(-1, 9);
    }
  });

  it("puts each hand abeam of the other's elbow when the forearms match", () => {
    // Level with it along the grip axis (here the z axis) and one grip separation
    // beside it, which is what side-by-side forearms means.
    expect(even.a.hand.z).toBeCloseTo(even.b.elbow.z, 9);
    expect(even.b.hand.z).toBeCloseTo(even.a.elbow.z, 9);
    const separation = contactSeparation(even.ma, even.mb);
    expect(Math.abs(even.a.hand.x - even.b.elbow.x)).toBeCloseTo(separation, 9);
  });

  it("keeps both hands on the partner's forearm even when they don't match", () => {
    const onB = trackContact(contact(), mixed.a.hand, mixed.ma.handRadius, mixed.b, mixed.mb.forearmHalfWidth);
    const onA = trackContact(contact(), mixed.b.hand, mixed.mb.handRadius, mixed.a, mixed.ma.forearmHalfWidth);
    // Strictly between the ends for the short-armed dancer, exactly at the elbow
    // for the long-armed one: `contactRadius` follows the shorter forearm.
    expect(onB.along).toBeGreaterThan(0);
    expect(onB.along).toBeLessThan(1);
    expect(onA.along).toBeCloseTo(0, 6);
    // Zero or negative gap: touching, and a hand wider than a forearm wraps it.
    expect(onB.gap).toBeLessThanOrEqual(1e-9);
    expect(onA.gap).toBeLessThanOrEqual(1e-9);
  });

  it("lays them side by side at the separation the hands can reach across", () => {
    for (const pair of [even, mixed]) {
      // The distance between two parallel axes is the part of the offset between
      // them that isn't along the grip axis. (Their midpoints are not abeam of each
      // other when the forearms differ in length, so don't measure those.)
      const d = direction(pair.a);
      const v = {
        x: pair.b.elbow.x - pair.a.elbow.x,
        y: pair.b.elbow.y - pair.a.elbow.y,
        z: pair.b.elbow.z - pair.a.elbow.z,
      };
      const along = v.x * d.x + v.y * d.y + v.z * d.z;
      const apart = Math.hypot(v.x - along * d.x, v.y - along * d.y, v.z - along * d.z);
      expect(apart).toBeCloseTo(contactSeparation(pair.ma, pair.mb), 6);
      expect(apart).toBeLessThanOrEqual(
        pair.ma.forearmHalfWidth + pair.mb.forearmHalfWidth + 1e-9,
      );
    }
  });

  it("centres the grip on the pivot the pair turns about", () => {
    for (const pair of [even, mixed]) {
      // The pivot is the pair's midpoint — the origin in this setup.
      const contactMid = {
        x: (pair.a.hand.x + pair.b.hand.x) / 2,
        z: (pair.a.hand.z + pair.b.hand.z) / 2,
      };
      expect(contactMid.x).toBeCloseTo(0, 6);
      expect(contactMid.z).toBeCloseTo(0, 6);
    }
  });

  it("survives a pair standing in the same spot", () => {
    const m = armMetrics(MYCO_DEFAULTS);
    const here: Placement = { x: 1, z: 2, yaw: 0.3 };
    const poses = poseArms(armPosesFor(), m, m, here, { ...here }, 0.71, JOINED_LEFT);
    for (const v of [poses.left.x, poses.left.y, poses.left.z, poses.left.aimX]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("tracking a posed arm", () => {
  const m = armMetrics(MYCO_DEFAULTS);

  it("puts a resting arm below its own shoulder", () => {
    const self: Placement = { x: 3, z: -2, yaw: 0 };
    const f = trackForearm(forearm(), m, tuckPose(armPose(), m, 1, 0), self);
    expect(f.elbow.x).toBeCloseTo(3 + m.restX, 9);
    expect(f.elbow.y).toBeCloseTo(m.restY - m.elbowReach, 9);
    expect(f.hand.y).toBeCloseTo(m.restY - m.handReach, 9);
    expect(f.hand.x).toBeCloseTo(3 + m.restX, 9);
  });

  it("carries the dancer's heading — the arm turns with them", () => {
    const spun: Placement = { x: 0, z: 0, yaw: Math.PI / 2 };
    const f = trackForearm(forearm(), m, tuckPose(armPose(), m, 1, 0), spun);
    // Local +x becomes world −z at a quarter turn.
    expect(f.elbow.x).toBeCloseTo(0, 9);
    expect(f.elbow.z).toBeCloseTo(-m.restX, 9);
  });

  it("reports a miss rather than pretending", () => {
    // A hand nowhere near the forearm it named: `along` pins to an end and `gap`
    // says how far off it was. Pure measurement, no clamping of the pose.
    const held = forearm();
    held.elbow.x = 0;
    held.hand.x = 0.4;
    const miss = trackContact(contact(), { x: -1, y: 0, z: 0 }, 0.1, held, 0.05);
    expect(miss.along).toBe(0);
    expect(miss.gap).toBeCloseTo(1 - 0.15, 9);
  });
});
