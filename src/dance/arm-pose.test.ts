import { describe, expect, it } from "vitest";
import {
  PERSONAL_SPACE,
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
  constrainArm,
  elbowLocal,
  reachAllowance,
  reachPose,
  restPose,
  insideSide,
  standingAsCouple,
  touchHeight,
  armPoses,
  upperArmStrain,
  vec3,
  ELBOW_SWING,
  type ArmMetrics,
  type ArmPose,
  type Placement,
} from "./arm-pose";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  RYAN_DEFAULTS,
  SPROUT_DEFAULTS,
  computePositions,
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
  it.each(CAST)("puts %s's hand below the shoulder at rest", (_name, shape) => {
    expect(armMetrics(shape).handReach).toBeGreaterThan(0);
  });

  it.each(CAST)("gives %s a forearm span shorter than the whole arm", (_name, shape) => {
    const m = armMetrics(shape);
    expect(m.forearmSpan).toBeGreaterThan(0);
    expect(m.forearmSpan).toBeCloseTo(m.handReach - m.elbowReach, 9);
  });
});

describe("the envelope clears the lane", () => {
  // The defect this channel exists to fix, stated as arithmetic: at the closest
  // distance the frame lets a pair pass, arms left hanging at shoulder width
  // overlap, and folded arms cannot.
  const pairs = CAST.flatMap((a, i) => CAST.slice(i + 1).map((b) => [a, b] as const));

  it.each(pairs)("keeps %s and %s from crossing arms", ([, aShape], [, bShape]) => {
    const gap = lateralClearance(rigidParts(aShape), rigidParts(bShape));
    const a = armMetrics(aShape);
    const b = armMetrics(bShape);
    // Each dancer folded to their own share of the closest permitted gap: the two
    // allowances sum to the whole of it, so touching is the worst case.
    expect(reachAllowance(a, b, gap) + reachAllowance(b, a, gap)).toBeCloseTo(gap, 9);
  });

  it.each(CAST)("resolves %s's share at the closest pass to their own body", (_n, shape) => {
    // The old fixed tuck, recovered as a special case rather than replaced.
    const me = armMetrics(shape);
    const them = armMetrics(EMBER_DEFAULTS);
    const closest = me.bodyRadius + them.bodyRadius;
    expect(reachAllowance(me, them, closest)).toBeCloseTo(me.bodyRadius, 9);
  });

  it("is needed — the debug cast's resting arms do cross at that distance", () => {
    const gap = lateralClearance(rigidParts(MYCO_DEFAULTS), rigidParts(EMBER_DEFAULTS));
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    expect(a.restX + a.armHalfWidth + b.restX + b.armHalfWidth).toBeGreaterThan(gap);
  });

  it("gives a bigger dancer the bigger share", () => {
    const big = armMetrics(MYCO_DEFAULTS);
    const small = armMetrics(SPROUT_DEFAULTS);
    expect(big.bodyRadius).toBeGreaterThan(small.bodyRadius);
    expect(reachAllowance(big, small, 2)).toBeGreaterThan(reachAllowance(small, big, 2));
  });
});

describe("folding an arm in", () => {
  const m = armMetrics(MYCO_DEFAULTS);
  // Partner abeam on the anatomical-left side.
  const DIR_X = 1;
  const DIR_Z = 0;

  function folded(pose: ArmPose, allowance: number): ArmPose {
    return constrainArm(pose, m, allowance, DIR_X, DIR_Z);
  }

  it("leaves an arm alone when there is room", () => {
    const p = folded(restPose(armPose(), m, 1), 10);
    expect(p.x).toBeCloseTo(m.restX, 9);
  });

  it("folds a resting arm to the old tuck when the pair are at their closest", () => {
    const p = folded(restPose(armPose(), m, 1), m.bodyRadius);
    // Everything drawn, plus its personal space, inside the dancer's own share.
    expect(p.x + m.armHalfWidth + PERSONAL_SPACE).toBeCloseTo(m.bodyRadius, 9);
  });

  it("leaves the outside arm untouched at the same moment", () => {
    const p = folded(restPose(armPose(), m, -1), m.bodyRadius);
    expect(p.x).toBeCloseTo(-m.restX, 9);
  });

  it("folds an arm swung outward by an emote, by more", () => {
    // An arm raised toward the partner reaches further, so it has further to fold.
    const raised = restPose(armPose(), m, 1);
    raised.aimX = 1;
    raised.aimY = 0;
    const p = folded(raised, m.bodyRadius);
    const resting = folded(restPose(armPose(), m, 1), m.bodyRadius);
    expect(p.x).toBeLessThan(resting.x);
    // ...and still ends up inside the allowance, hand included. A `forearmSpan` from the
    // **elbow**, not a `handReach` from an arm-group origin: since ADR-0017 the pose is
    // the elbow, and the undrawn upper arm behind it trespasses on nothing.
    expect(p.x + m.forearmSpan + m.armHalfWidth + PERSONAL_SPACE).toBeCloseTo(m.bodyRadius, 9);
  });

  it("never pushes an arm outward", () => {
    for (const allowance of [0.1, 0.3, 0.5, 1, 3]) {
      expect(folded(restPose(armPose(), m, 1), allowance).x).toBeLessThanOrEqual(m.restX + 1e-9);
    }
  });

  it("folds along the partner's bearing, not just sideways", () => {
    const pose = constrainArm(restPose(armPose(), m, 1), m, 0.1, 0, 1);
    // Partner dead ahead: the fold is in z, and x is left where it was.
    expect(pose.z).toBeLessThan(0);
    expect(pose.x).toBeCloseTo(m.restX, 9);
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
  const posesA = poseArms(armPosesFor(), ma, mb, pa, pb, JOINED_LEFT);
  const posesB = poseArms(armPosesFor(), mb, ma, pb, pa, JOINED_LEFT);
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
    const poses = poseArms(armPosesFor(), m, m, here, { ...here }, JOINED_LEFT);
    for (const v of [poses.left.x, poses.left.y, poses.left.z, poses.left.aimX]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("tracking a posed arm", () => {
  const m = armMetrics(MYCO_DEFAULTS);

  it("puts a resting arm below its own shoulder", () => {
    const self: Placement = { x: 3, z: -2, yaw: 0 };
    const f = trackForearm(forearm(), m, restPose(armPose(), m, 1), self);
    expect(f.elbow.x).toBeCloseTo(3 + m.restX, 9);
    expect(f.elbow.y).toBeCloseTo(m.restY - m.elbowReach, 9);
    expect(f.hand.y).toBeCloseTo(m.restY - m.handReach, 9);
    expect(f.hand.x).toBeCloseTo(3 + m.restX, 9);
  });

  it("carries the dancer's heading — the arm turns with them", () => {
    const spun: Placement = { x: 0, z: 0, yaw: Math.PI / 2 };
    const f = trackForearm(forearm(), m, restPose(armPose(), m, 1), spun);
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

describe("the two-segment arm — a pinned shoulder and a free elbow", () => {
  // ADR-0017. Everything here is a property the one-segment model could not state,
  // because it had no shoulder to state it about: the arm's origin was placed by the
  // arithmetic and went wherever the contact point needed it, measured 0.34 behind the
  // body at bump range with nothing on screen to say so.
  const RIGHT = -1;

  /** The shoulder this sign names, in rig-local space. */
  function shoulder(m: ArmMetrics, sign: number) {
    return { x: sign * m.restX, y: m.restY, z: 0 };
  }

  function handOf(pose: ArmPose, m: ArmMetrics) {
    return {
      x: pose.x + pose.aimX * m.forearmSpan,
      y: pose.y + pose.aimY * m.forearmSpan,
      z: pose.z + pose.aimZ * m.forearmSpan,
    };
  }

  it.each(CAST)("%s: a rest pose has an unstrained arm and a straight-down forearm", (_n, shape) => {
    const m = armMetrics(shape);
    for (const sign of [1, -1]) {
      const p = restPose(armPose(), m, sign);
      // Closed to double-precision noise rather than bit-exact: `restY` and `elbowY`
      // are both derived from `upperArmSpacing` but by different subtractions, so their
      // difference lands within an ulp of `elbowReach` and not on it.
      expect(upperArmStrain(p, m, sign)).toBeCloseTo(0, 12);
      // The elbow really is one upper arm below the shoulder — `body-shapes` derives
      // `elbowY` and `upperArmLength` from the same `upperArmSpacing`, and this is the
      // assertion that keeps the two definitions from drifting apart.
      expect(m.restY - p.y).toBeCloseTo(m.elbowReach, 12);
      expect(p.aimY).toBe(-1);
    }
  });

  it.each(CAST)("%s: reaches any point inside its own range with the shoulder unmoved", (_n, shape) => {
    const m = armMetrics(shape);
    const s = shoulder(m, RIGHT);
    const range = m.elbowReach + m.forearmSpan;
    // A spread of targets around the shoulder — in front, across the midline, high and
    // low — at fractions of full reach that a bump actually uses.
    for (const frac of [0.4, 0.6, 0.8, 0.99]) {
      for (const dir of [
        { x: 0, y: 0, z: 1 },
        { x: 0.6, y: -0.2, z: 0.8 },
        { x: -0.7, y: 0.3, z: 0.6 },
        { x: 0, y: -1, z: 0 },
      ]) {
        const len = Math.hypot(dir.x, dir.y, dir.z);
        const d = (range * frac) / len;
        const target = { x: s.x + dir.x * d, y: s.y + dir.y * d, z: s.z + dir.z * d };
        const p = reachPose(armPose(), m, RIGHT, target.x, target.y, target.z);

        const hand = handOf(p, m);
        expect(hand.x).toBeCloseTo(target.x, 9);
        expect(hand.y).toBeCloseTo(target.y, 9);
        expect(hand.z).toBeCloseTo(target.z, 9);
        expect(upperArmStrain(p, m, RIGHT)).toBeCloseTo(0, 9);
      }
    }
  });

  it("swings the elbow outward and down rather than into the body", () => {
    // The tie-break `ELBOW_SWING` settles. Reaching straight ahead, the elbow has a
    // whole circle to sit on and only the outward-and-down part of it looks like an arm.
    const m = armMetrics(MYCO_DEFAULTS);
    const s = shoulder(m, RIGHT);
    const d = (m.elbowReach + m.forearmSpan) * 0.7;
    const p = reachPose(armPose(), m, RIGHT, s.x, s.y, s.z + d);
    // Outward for this shoulder is further negative x, and elbows do not ride up.
    expect(p.x).toBeLessThan(s.x);
    expect(p.y).toBeLessThan(s.y);
    expect(ELBOW_SWING).toBeGreaterThan(0);
  });

  it("mirrors cleanly between the two shoulders", () => {
    const m = armMetrics(RYAN_DEFAULTS);
    const d = (m.elbowReach + m.forearmSpan) * 0.7;
    const left = reachPose(armPose(), m, 1, m.restX, m.restY, d);
    const right = reachPose(armPose(), m, -1, -m.restX, m.restY, d);
    expect(left.x).toBeCloseTo(-right.x, 12);
    expect(left.y).toBeCloseTo(right.y, 12);
    expect(left.z).toBeCloseTo(right.z, 12);
  });

  it("honours the hand past full reach, and says how far it stretched", () => {
    // Reach is a rule a move chooses, not a gate the geometry imposes — the lobbed fist
    // depends on this branch existing rather than clamping.
    const m = armMetrics(MYCO_DEFAULTS);
    const s = shoulder(m, RIGHT);
    const over = (m.elbowReach + m.forearmSpan) * 1.5;
    const p = reachPose(armPose(), m, RIGHT, s.x, s.y, s.z + over);
    const hand = handOf(p, m);
    expect(hand.z).toBeCloseTo(s.z + over, 9);
    expect(upperArmStrain(p, m, RIGHT)).toBeCloseTo(over - m.elbowReach - m.forearmSpan, 9);
  });

  it("folds rather than returning NaN when the hand is closer than the arm can fold", () => {
    // Inside `|elbowReach − forearmSpan|` the cosine leaves its range. Nothing here may
    // produce NaN: a pose with a NaN in it writes a silently invisible rig.
    const m = armMetrics(SPROUT_DEFAULTS);
    const s = shoulder(m, RIGHT);
    for (const d of [0, 0.001, Math.abs(m.elbowReach - m.forearmSpan) * 0.5]) {
      const p = reachPose(armPose(), m, RIGHT, s.x, s.y, s.z + d);
      for (const v of [p.x, p.y, p.z, p.aimX, p.aimY, p.aimZ]) expect(Number.isFinite(v)).toBe(true);
      expect(Math.hypot(p.aimX, p.aimY, p.aimZ)).toBeCloseTo(1, 9);
    }
  });

  it("fills a caller-owned pose", () => {
    const m = armMetrics(MYCO_DEFAULTS);
    const out = armPose();
    expect(reachPose(out, m, 1, 0, 1, 0.3)).toBe(out);
  });
});

describe("the rig's two groups compose back to the rest pose", () => {
  // The change is meant to be invisible until something poses an arm, and this is the
  // arithmetic that makes it so: the shoulder group holds the elbow at
  // `elbowY − shoulderY`, the meshes hang at `centre − elbowY`, and the two hops sum to
  // the single `centre − shoulderY` offset the rig used to carry. Asserted here rather
  // than left to the JSX, because a renderer test would not say *why* it held.
  it.each(CAST)("%s: elbow offset plus mesh offset is the old mesh offset", (_n, shape) => {
    const pos = computePositions(shape, 0);
    const elbowLocalY = pos.elbowY - pos.shoulderY;
    expect(elbowLocalY + (pos.forearmCenterY - pos.elbowY)).toBeCloseTo(
      pos.forearmCenterY - pos.shoulderY, 12);
    expect(elbowLocalY + (pos.handCenterY - pos.elbowY)).toBeCloseTo(
      pos.handCenterY - pos.shoulderY, 12);
  });

  it.each(CAST)("%s: elbowLocal is the inverse of the shoulder offset", (_n, shape) => {
    const m = armMetrics(shape);
    for (const sign of [1, -1]) {
      const p = restPose(armPose(), m, sign);
      const e = elbowLocal(vec3(), p, m, sign);
      expect(e.x + sign * m.restX).toBeCloseTo(p.x, 12);
      expect(e.y + m.restY).toBeCloseTo(p.y, 12);
      expect(e.z).toBeCloseTo(p.z, 12);
      // A resting forearm hangs at exactly the offset the JSX pins it at.
      expect(e.y).toBeCloseTo(-m.elbowReach, 12);
      expect(e.x).toBeCloseTo(0, 12);
    }
  });
});

describe("touch hands — a couple stands with inside hands joined", () => {
  // Ryan, 2026-08-15: "they should hold hands — we say touch hands — beau right palm up
  // and belle's left palm down … the characters need to be a bit closer together."
  const a = armMetrics(MYCO_DEFAULTS);
  const b = armMetrics(EMBER_DEFAULTS);
  const WIDTH = a.restX + b.restX;
  const side = (x: number, yaw = 0): Placement => ({ x, z: 0, yaw });

  it("recognises a couple from where they are standing, not from a flag", () => {
    // The same shape the rest of this module uses — `reachAllowance` and `constrainArm`
    // both key off the separation they can see. A renderer that had to be told which
    // formation it was drawing is one that could be told wrong.
    expect(standingAsCouple(side(0), side(WIDTH), WIDTH)).toBe(true);
  });

  it("🔴 does not mistake a facing pair for one", () => {
    // The check that matters. Two dancers a hand's width apart pointing opposite ways
    // are not holding hands, and without the heading test the touch pose would fire on
    // a Dosado's closest moment.
    expect(standingAsCouple(side(0), side(WIDTH, Math.PI), WIDTH)).toBe(false);
  });

  it("tolerates the pair breathing, because a couple mid-call is a couple", () => {
    // Partner Trade steps them onto lanes and back.
    expect(standingAsCouple(side(0), side(WIDTH * 1.2), WIDTH)).toBe(true);
    expect(standingAsCouple(side(0), side(WIDTH * 0.85), WIDTH)).toBe(true);
    // ...but not once they have plainly left the formation.
    expect(standingAsCouple(side(0), side(WIDTH * 2), WIDTH)).toBe(false);
  });

  it("picks the inside hand from where the partner actually is", () => {
    // Derived rather than fixed when the couple formed, so it stays right through a turn.
    expect(insideSide(side(0), side(WIDTH))).toBe("left");
    expect(insideSide(side(0), side(-WIDTH))).toBe("right");
  });

  it("joins the hands at a height nobody has to reach for", () => {
    // The width square-one chose is the one at which *resting* hands meet, which is what
    // makes touch hands a resting formation rather than a pose being held.
    const h = touchHeight(a, b);
    expect(h).toBeCloseTo(
      ((a.restY - a.handReach) + (b.restY - b.handReach)) / 2,
      9,
    );
  });

  it("🔴 puts the two hands on each other, one stacked above the other", () => {
    // The property the whole thing exists for, as a number rather than a look.
    const self = side(0);
    const partner = side(WIDTH);
    const mine = poseArms(armPoses(), a, b, self, partner, gripBlend(), undefined, WIDTH);
    const theirs = poseArms(armPoses(), b, a, partner, self, gripBlend(), undefined, WIDTH);

    // Each one's inside arm: mine is `left` (partner at +x), theirs is `right`.
    const myHand = handEnd(mine.left, a);
    const theirHand = handEnd(theirs.right, b);

    // Same point on the floor — the midpoint between them. Both poses are rig-local, so
    // each is *added* to its own dancer's position: the second one's hand sits at
    // −WIDTH/2 in their frame, which is the same spot from the other side.
    expect(self.x + myHand.x).toBeCloseTo(WIDTH / 2, 5);
    expect(partner.x + theirHand.x).toBeCloseTo(WIDTH / 2, 5);

    // ...and stacked rather than interpenetrating: the dancer whose inside hand is their
    // anatomical **right** is the beau, and the beau's palm is underneath. Stated in
    // anatomical terms so it survives the engine and the renderer disagreeing about
    // which way `+x` points, which they do.
    const underneath = insideSide(partner, self) === "right" ? theirHand : myHand;
    const above = underneath === theirHand ? myHand : theirHand;
    expect(above.y).toBeGreaterThan(underneath.y);
  });

  it("leaves the outside arm hanging", () => {
    const mine = poseArms(armPoses(), a, b, side(0), side(WIDTH), gripBlend(), undefined, WIDTH);
    // Straight down — the outside arm is not claimed, only limited as it always was.
    expect(mine.right.aimY).toBeCloseTo(-1, 5);
  });

  it("🔴 joins nothing when no width is supplied", () => {
    // Absent means "not a couple", and a facing pair must be untouched by any of this.
    // Compared against the *folded* rest pose rather than `restX`: at a couple's own
    // separation `constrainArm` already tucks the inside arm, and that behaviour is
    // older than this feature and must survive it.
    const withWidth = poseArms(armPoses(), a, b, side(0), side(WIDTH), gripBlend(), undefined, WIDTH);
    const without = poseArms(armPoses(), a, b, side(0), side(WIDTH), gripBlend());
    expect(without.left.aimY).toBeCloseTo(-1, 5);
    expect(without.left.x).not.toBeCloseTo(withWidth.left.x, 3);
  });
});

/** A hand's centre in rig-local space, from the elbow the pose names. */
function handEnd(pose: ArmPose, m: ArmMetrics) {
  return {
    x: pose.x + pose.aimX * m.forearmSpan,
    y: pose.y + pose.aimY * m.forearmSpan,
    z: pose.z + pose.aimZ * m.forearmSpan,
  };
}
