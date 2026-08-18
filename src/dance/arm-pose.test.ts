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
  touchingSide,
  touchHold,
  touchPose,
  touchReach,
  handRiseAlongUp,
  sideExtentAt,
  armPoses,
  upperArmStrain,
  vec3,
  ELBOW_SWING,
  type ArmMetrics,
  type ArmPose,
  type Placement,
  type TouchHold,
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
  //
  // `beau` is MYCO and `belle` is EMBER, which is the debug scene's own arrangement:
  // `shapes[0]` wears the key `a` and `useDancePerformance` makes `a` the beau.
  const beau = armMetrics(MYCO_DEFAULTS);
  const belle = armMetrics(EMBER_DEFAULTS);
  const HOLD = touchHold(beau, belle);
  const WIDTH = HOLD.width;
  const side = (x: number, yaw = 0): Placement => ({ x, z: 0, yaw });
  // The beau's inside hand is his **right**, so his partner stands at −x.
  const BEAU_AT = side(0);
  const BELLE_AT = side(-WIDTH);

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
    // Partner Trade bows them off their standing radius and back.
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

  it("🔴 names the joined hand for anyone who has to point at it", () => {
    // The debug scene's joint markers used to key off square-one's grip spans alone, and
    // a standing couple's hold is not one of those — so every elbow and hand dot went dark
    // for exactly the pose the elbow watch was about. Both places now ask this.
    expect(touchingSide(BEAU_AT, BELLE_AT, HOLD)).toBe("right");
    expect(touchingSide(BELLE_AT, BEAU_AT, HOLD)).toBe("left");
    // Not a couple, no joined hand: a facing pair at the same distance...
    expect(touchingSide(side(0), side(WIDTH, Math.PI), HOLD)).toBeNull();
    // ...a pair who have left the formation...
    expect(touchingSide(side(0), side(WIDTH * 2), HOLD)).toBeNull();
    // ...and a floor with no couple hold at all, which is how a facing pair is danced.
    expect(touchingSide(BEAU_AT, BELLE_AT, undefined)).toBeNull();
  });

  it("🔴 takes the figure's word for an arch, because the placements would say no", () => {
    // square-one's `arch` spans (its ADR-0017) are a hold the **figure** imposes rather than
    // one the placements reveal, and `declared` is the difference. It matters because a
    // California Twirl's pair close to half their standing width and finish facing opposite
    // ways: every proximity test below fails somewhere in the middle of a call whose hands
    // never come apart, and a hold that let go there would be letting go for a reason that
    // is about the renderer rather than the dance.
    expect(touchingSide(side(0), side(-WIDTH / 2), HOLD)).toBeNull();
    expect(touchingSide(side(0), side(-WIDTH / 2), HOLD, true)).toBe("right");
    // Facing opposite ways — the Twirl's own exit — and still holding on.
    expect(touchingSide(side(0), side(-WIDTH, Math.PI), HOLD, true)).toBe("right");
    // **Which** hand is still read from the placements, though, because that stays true
    // through a turn and a fixed answer would not.
    expect(touchingSide(side(0), side(WIDTH), HOLD, true)).toBe("left");
    // And a floor with no couple hold at all still joins nothing, declared or not.
    expect(touchingSide(BEAU_AT, BELLE_AT, undefined, true)).toBeNull();
  });

  it("🔴 puts both inside hands on a raised arch, and lets them part when it is broken", () => {
    // An arch is a `TouchHold` with a different height, not a different mechanism — so this
    // is the standing pose machinery, told to hold higher. Asserted through `poseArms` and
    // not through `arch.ts`, because the thing worth checking is that the hands actually get
    // where the plan says.
    const raised = (height: number): TouchHold => ({
      width: WIDTH,
      height,
      lateral: 0,
      // Nothing spare to spend going forward when the arm is overhead.
      forward: 0,
    });
    /** Where a posed arm's hand centre ends up, in rig-local space. */
    const handAt = (pose: ArmPose, m: ArmMetrics) => ({
      y: pose.y + pose.aimY * m.forearmSpan,
    });
    const HIGH = 1.55;
    const his = poseArms(
      armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend(), undefined, raised(HIGH), true,
    );
    const hers = poseArms(
      armPoses(), belle, beau, BELLE_AT, BEAU_AT, gripBlend(), undefined, raised(HIGH), true,
    );
    // Each dancer's inside hand: his right, her left. Both above their own shoulders, which
    // is what makes this an arch rather than a handhold.
    const hisHand = handAt(his.right, beau);
    const hersHand = handAt(hers.left, belle);
    expect(hisHand.y).toBeGreaterThan(beau.rigOriginY + beau.restY);
    expect(Math.abs(hisHand.y - HIGH)).toBeLessThan(0.1);
    expect(Math.abs(hersHand.y - HIGH)).toBeLessThan(0.1);

    // The break: two different heights, one per dancer, and the hands are simply not in the
    // same place any more. That is the whole of "the hold breaks" — a number, not a branch.
    const low = poseArms(
      armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend(), undefined, raised(1.2), true,
    );
    expect(handAt(low.right, beau).y).toBeLessThan(hisHand.y - 0.2);
  });

  it("carries the joined hands at the belle's waist, whatever it costs the beau", () => {
    // Ryan, 2026-08-17: "the gent's job is to make the belle's job easier, even if she's
    // taller … they need to be the ones to pay attention to the belle's comfortable hand
    // position at the belle's waist — even if it looks awkward — maintain opinionation that
    // way." One body sets the height and it is always hers.
    expect(HOLD.height).toBeCloseTo(belle.rigOriginY + belle.waistY, 12);
    // The cost, asserted rather than left implied: this belle is the taller dancer, so the
    // hold sits well above the beau's own waist and most of the way to his shoulder. Taking
    // the *lower* waist instead would hang both forearms neatly and is not the rule.
    expect(HOLD.height).toBeGreaterThan(beau.rigOriginY + beau.waistY);
    expect(HOLD.height).toBeGreaterThan(0.7 * (beau.rigOriginY + beau.restY));
  });

  it("raises them only where an arm cannot reach that low at all", () => {
    // The other arrangement of the same two bodies: EMBER as the beau, whose palm is
    // underneath, so her hand has to get below the contact. The lower waist — Myco's, 0.475
    // — is past the end of Ember's arm however the pair stand, since width only ever *adds*
    // to a reach, so the hold rises to exactly where her arm hangs straight.
    // Reachability, not comfort: the comfort ceiling this replaces left the permitted band
    // for this pair empty, which is what "this pairing cannot hold hands" was built on.
    //
    // "Below the contact" is the **drawn** hand's rise, not `handRadius` — her arm hangs
    // dead vertical here, which is the one case where the two used to agree by accident and
    // now agrees by construction.
    const swapped = touchHold(belle, beau);
    expect(swapped.height).toBeCloseTo(
      belle.rigOriginY +
        belle.restY -
        belle.handReach +
        handRiseAlongUp(belle, "right", 0, -1, 0),
      12,
    );
    expect(swapped.height).toBeGreaterThan(beau.rigOriginY + beau.waistY);
  });

  it("🔴 asks neither dancer to reach past the end of their own arm", () => {
    // The defect that killed the mean-of-hanging-hands rule, as a number, now asserted on
    // the posed arms rather than on an intermediate: `upperArmStrain` is zero when the arm
    // is plausible and positive when a hand has been sent where the body cannot go.
    // ADR-0017 permits the latter (a lobbed fist is a deliberate detachment), which is
    // exactly why a resting formation needs a test rather than a crash.
    for (const [x, y] of [
      [beau, belle],
      [belle, beau],
    ] as const) {
      const hold = touchHold(x, y);
      const at = side(0);
      const other = side(-hold.width);
      const his = poseArms(armPoses(), x, y, at, other, gripBlend(), undefined, hold);
      const hers = poseArms(armPoses(), y, x, other, at, gripBlend(), undefined, hold);
      expect(upperArmStrain(his.right, x, -1)).toBeCloseTo(0, 9);
      expect(upperArmStrain(hers.left, y, 1)).toBeCloseTo(0, 9);
    }
  });

  it("stands the couple a hand's width clear of the wider shoulders", () => {
    // The stance is derived from the handhold, not the other way round. With a dancer's
    // inside shoulder *over* the joined hands the arm hangs dead vertical and there is no
    // handhold to see — which is where the engine's body-agnostic width left them, since
    // Myco's shoulders alone are wider than the couple was. The daylight is the joined
    // hands' own width, which is where the eyeballed 0.11 went.
    expect(WIDTH).toBeCloseTo(
      2 * (Math.max(beau.restX, belle.restX) + Math.max(beau.handRadius, belle.handRadius)),
      12,
    );
    for (const m of [beau, belle]) expect(WIDTH / 2).toBeGreaterThan(m.restX);
  });

  it("🔴 hangs the joined hands halfway between the two inside shoulders", () => {
    // Ryan, 2026-08-18: "they can move to the horizontal middle between the dancer's
    // shoulders." The rule this replaces put them under the belle's inside shoulder — the
    // far end of the same gap, `WIDTH / 2 - belle.restX` — because the beau covered all of
    // the daylight. Stated as the two shoulder positions rather than as `(restX - restX) / 2`
    // so the test says the *landmark* and not the arithmetic.
    const beauShoulder = -WIDTH / 2 + beau.restX;
    const belleShoulder = WIDTH / 2 - belle.restX;
    expect(HOLD.lateral).toBeCloseTo((beauShoulder + belleShoulder) / 2, 9);
    for (const [m, isBeau] of [
      [beau, true],
      [belle, false],
    ] as const) {
      expect(touchReach(m, HOLD, isBeau)).toBeLessThan(1);
    }
  });

  it("has both dancers reach the same distance across", () => {
    // What the midpoint *is*, said the other way round: neither dancer can be handed the
    // other's share of the daylight, because the landmark sits where the two spans are equal.
    // Not the same as equal *effort* — the fractions differ with the arms, and this belle
    // spends more of hers than the beau does of his.
    const acrossBeau = WIDTH / 2 + HOLD.lateral - beau.restX;
    const acrossBelle = WIDTH / 2 - HOLD.lateral - belle.restX;
    expect(acrossBeau).toBeCloseTo(acrossBelle, 12);
    expect(acrossBeau).toBeGreaterThan(0);
  });

  it("holds a matched pair's hands dead centre", () => {
    // MYCO and RYAN are the same body, so their inside shoulders are the same distance in
    // from their own centres and the middle between them *is* the couple's midpoint. The rule
    // this replaces put the hold the whole daylight off centre even on twins — the beau's
    // side was the side that accommodated, at 91% of his arm against 53% of hers. A landmark
    // is symmetric where the bodies are.
    const twinBeau = armMetrics(MYCO_DEFAULTS);
    const twinBelle = armMetrics(RYAN_DEFAULTS);
    const twins = touchHold(twinBeau, twinBelle);
    expect(twins.lateral).toBeCloseTo(0, 12);
    // Their *spans across* are equal, which is what the landmark buys. Their reach
    // **fractions** are not, and on twins that is the whole of what is left: the beau's palm
    // is underneath, so his hand centre sits a hand's radius lower than hers and his arm
    // reaches that much further down. 86% against 55% here, on identical bodies. The stacking
    // is the asymmetry (ADR-0022's "beau right palm up"), not the placement.
    expect(touchReach(twinBeau, twins, true)).toBeGreaterThan(
      touchReach(twinBelle, twins, false),
    );
    for (const [m, isBeau] of [
      [twinBeau, true],
      [twinBelle, false],
    ] as const) {
      expect(touchReach(m, twins, isBeau)).toBeLessThanOrEqual(1);
    }
  });

  it("never sends a hand further than the arm can span, whoever the pair are", () => {
    // The whole shipped cast against itself, both ways round. `touchReach` at or under 1 is
    // the same statement as zero strain, said about the solve rather than about one pose —
    // and it is the claim that replaces "this pairing cannot hold hands".
    const cast = [MYCO_DEFAULTS, EMBER_DEFAULTS, RYAN_DEFAULTS, SPROUT_DEFAULTS];
    for (const first of cast) {
      for (const second of cast) {
        const x = armMetrics(first);
        const y = armMetrics(second);
        const hold = touchHold(x, y);
        expect(touchReach(x, hold, true)).toBeLessThanOrEqual(1 + 1e-9);
        expect(touchReach(y, hold, false)).toBeLessThanOrEqual(1 + 1e-9);
        // ...and they are standing far enough apart not to be inside one another.
        expect(hold.width).toBeGreaterThanOrEqual(x.bodyRadius + y.bodyRadius);
      }
    }
  });

  it("🔴 puts the two hands on each other, one stacked above the other", () => {
    // The property the whole thing exists for, as a number rather than a look.
    const his = poseArms(armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend(), undefined, HOLD);
    const hers = poseArms(armPoses(), belle, beau, BELLE_AT, BEAU_AT, gripBlend(), undefined, HOLD);

    // Each one's inside arm: the beau's is `right` (partner at −x), the belle's is `left`.
    const beauHand = handEnd(his.right, beau);
    const belleHand = handEnd(hers.left, belle);

    // Same point on the floor. Both poses are rig-local, so each is *added* to its own
    // dancer's position — and that point is the hold, off the midpoint toward the belle.
    const meet = (BEAU_AT.x + BELLE_AT.x) / 2 - HOLD.lateral;
    expect(BEAU_AT.x + beauHand.x).toBeCloseTo(meet, 5);
    expect(BELLE_AT.x + belleHand.x).toBeCloseTo(meet, 5);

    // ...and stacked rather than interpenetrating: the dancer whose inside hand is their
    // anatomical **right** is the beau, and the beau's palm is underneath. Stated in
    // anatomical terms so it survives the engine and the renderer disagreeing about
    // which way `+x` points, which they do.
    expect(belleHand.y).toBeGreaterThan(beauHand.y);

    // 🔴 **And the two drawn palms land on the contact plane** — which is the property
    // "the hands touch" actually means, and the one this test used to get wrong. It asserted
    // the centres were `handRadius + handRadius` apart, which is exactly what the solve
    // computed, so it passed while the *drawn* hands sat 0.0415 apart: a hand is a sphere
    // flattened to `flattenZ` and rotated, and on this pose the beau's forearm aims 77%
    // forward, which turns his thin axis most of the way to vertical. Ryan, 2026-08-18:
    // *"the hands could still be closer to actually touching."*
    const beauTop = beauHand.y + handRiseAlongUp(beau, "right", his.right.aimX, his.right.aimY, his.right.aimZ);
    const belleBottom = belleHand.y - handRiseAlongUp(belle, "left", hers.left.aimX, hers.left.aimY, hers.left.aimZ);
    expect(beauTop).toBeCloseTo(HOLD.height, 9);
    expect(belleBottom).toBeCloseTo(HOLD.height, 9);
    expect(belleBottom - beauTop).toBeCloseTo(0, 9);
  });

  it("🔴 never lets an elbow get outboard of the hand it is holding with", () => {
    // Ryan, 2026-08-16: "see the beau's arm is pointing at the belle though?" The elbow had
    // landed at x 0.790 against a joined hand at 0.570 — the undrawn upper arm dead
    // horizontal, the elbow outboard of its own hand, the whole arm reading as pointed at
    // the partner. The invariant it violated, for both dancers and either pose path.
    const his = poseArms(armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend(), undefined, HOLD);
    const hers = poseArms(armPoses(), belle, beau, BELLE_AT, BEAU_AT, gripBlend(), undefined, HOLD);
    for (const [pose, m] of [
      [his.right, beau],
      [hers.left, belle],
    ] as const) {
      const hand = handEnd(pose, m);
      const toward = Math.sign(hand.x);
      // The belle's is an equality to the last bit — her arm hangs, so her elbow is directly
      // above her hand — which is the invariant met exactly rather than a near miss.
      expect(pose.x * toward).toBeLessThanOrEqual(hand.x * toward + 1e-9);
      // ...and folded backward rather than forward: characters face local +z.
      expect(pose.z).toBeLessThanOrEqual(0);
    }
    // Both of these arms are folded enough for the shoulder's own plane to hold the elbow,
    // which is `touchPose`'s answer outright: the elbow keeps its shoulder's lateral offset
    // to the digit and the whole fold goes into z. A straighter arm has to leave that plane —
    // SPROUT reaching a tall belle's waist does — and `reachPose` picks it up there, where
    // the circle is small enough that the swing constants barely move it.
    expect(hers.left.x).toBeCloseTo(belle.restX, 12);
    expect(his.right.x).toBeCloseTo(-beau.restX, 12);
  });

  it("hands a reach back to `reachPose` rather than inventing one", () => {
    // `touchPose` answers a hang. Past the end of the arm there is no elbow circle to pick
    // a point on, and the two-link solve's own answer — hand honoured, upper arm stretched,
    // strain reported — is the right one.
    const far = touchPose(armPose(), beau, 1, 2, 2, 0);
    const same = reachPose(armPose(), beau, 1, 2, 2, 0);
    expect(far).toEqual(same);
  });

  it("leaves the outside arm hanging", () => {
    const his = poseArms(armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend(), undefined, HOLD);
    // Straight down — the outside arm is not claimed, only limited as it always was.
    expect(his.left.aimY).toBeCloseTo(-1, 5);
  });

  it("🔴 joins nothing when no hold is supplied", () => {
    // Absent means "not a couple", and a facing pair must be untouched by any of this.
    // Compared on the *aim*, because by construction almost nothing else separates them any
    // more: `touchPose` keeps the shoulder's own offset, so a held arm and a hanging one share
    // an elbow x — and since ADR-0027 the binding dancer's elbow hangs dead vertical too, so
    // they share an elbow **z**. What is left, and what a handhold actually is, is a forearm
    // that leaves the elbow and goes somewhere: forward and across, rather than straight down.
    const held = poseArms(armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend(), undefined, HOLD);
    const free = poseArms(armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend());
    expect(free.right.aimY).toBeCloseTo(-1, 5);
    expect(free.right.z).toBeCloseTo(0, 12);
    expect(free.right.aimZ).toBeCloseTo(0, 12);
    expect(held.right.aimY).not.toBeCloseTo(-1, 2);
    expect(held.right.aimZ).toBeGreaterThan(0.5);
  });

  it("🔴 hangs the binding dancer's upper arm dead vertical, and holds the hands forward", () => {
    // Ryan, 2026-08-18: *"they should be held a little forward from where they are, as if the
    // upper arm is relaxed and hanging straight down."* The hold used to sit in the plane
    // through both dancers (`z` 0) with the elbow swung *back* to reach it — which is where
    // nobody's hands are. The upper arm is the thing that relaxes; forward is what falls out.
    const his = poseArms(armPoses(), beau, belle, BEAU_AT, BELLE_AT, gripBlend(), undefined, HOLD);
    const hers = poseArms(armPoses(), belle, beau, BELLE_AT, BEAU_AT, gripBlend(), undefined, HOLD);

    expect(HOLD.forward).toBeGreaterThan(0);
    // Both hands still land on the same point, forward included — the whole thing is void
    // otherwise.
    expect(handEnd(his.right, beau).z).toBeCloseTo(HOLD.forward, 9);
    expect(handEnd(hers.left, belle).z).toBeCloseTo(HOLD.forward, 9);

    // The binding dancer — the one whose relaxed reach is shorter, here the beau — has his
    // upper arm exactly vertical: elbow directly below the shoulder, in x *and* z.
    expect(his.right.x).toBeCloseTo(-beau.restX, 12);
    expect(his.right.z).toBeCloseTo(0, 9);
    expect(his.right.y).toBeCloseTo(beau.restY - beau.elbowReach, 9);

    // The other dancer's elbow takes up the slack by folding back, which is what an elbow is
    // for — never forward of her own shoulder, which would read as an elbow leading.
    expect(hers.left.z).toBeLessThanOrEqual(1e-9);
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

describe("touch hands — the square accommodates the bodies", () => {
  // Ryan, 2026-08-17, watching `go home` on the debug scene's size casts: *"with different
  // body sizes go home should update so that the handhold is between the beau and the belle
  // as comfortably as possible, right? never pushed into the body of either — we want the
  // square to accommodate in this case."*
  //
  // It did not. The solve knew a torso only as a floor on the stance (`beauR + belleR`,
  // which permits standing flush and knows nothing about heads), and nothing at all
  // constrained *where the hold went*, so on the debug scene's `mixed` cast the joined hands
  // sat 0.140 inside the beau's chest and the couple stood **narrower** than the default
  // pair while being twice the size.
  const wide = (s: CharacterBodyShape, radius: number): CharacterBodyShape => ({
    ...s,
    body: { ...s.body, radius },
  });
  // The debug scene's own `bodies` casts, which is where this was seen.
  const SIZE_CASTS: readonly (readonly [string, CharacterBodyShape, CharacterBodyShape])[] = [
    ["default", MYCO_DEFAULTS, EMBER_DEFAULTS],
    ["mixed", wide(MYCO_DEFAULTS, 0.6), wide(EMBER_DEFAULTS, 0.1)],
    ["max", wide(MYCO_DEFAULTS, 0.6), wide(EMBER_DEFAULTS, 0.6)],
    // ...and the same two the other way round, since neither rule is symmetric.
    ["mixed reversed", wide(EMBER_DEFAULTS, 0.1), wide(MYCO_DEFAULTS, 0.6)],
  ];

  it.each(SIZE_CASTS)(
    "🔴 %s — puts the joined hands between the two dancers, never inside one",
    (_name, beauShape, belleShape) => {
      const beau = armMetrics(beauShape);
      const belle = armMetrics(belleShape);
      const hold = touchHold(beau, belle);
      // Each dancer's surface at the hold's own height, from the couple's midpoint.
      const beauSurface = -hold.width / 2 + sideExtentAt(beau.parts, hold.height);
      const belleSurface = hold.width / 2 - sideExtentAt(belle.parts, hold.height);
      // The stacked palms are a hand wide, and the wider of the two hands is what has to fit.
      const hand = Math.max(beau.handRadius, belle.handRadius);
      expect(hold.lateral - beauSurface).toBeGreaterThanOrEqual(hand - 1e-9);
      expect(belleSurface - hold.lateral).toBeGreaterThanOrEqual(hand - 1e-9);
    },
  );

  it.each(SIZE_CASTS)("%s — stands the couple clear of both bodies and heads", (_name, beauShape, belleShape) => {
    const beau = armMetrics(beauShape);
    const belle = armMetrics(belleShape);
    // ADR-0012's own clearance, which the stance used to undercut by ignoring heads and by
    // allowing two torsos to stand exactly flush.
    const need = lateralClearance(rigidParts(beauShape), rigidParts(belleShape));
    expect(touchHold(beau, belle).width).toBeGreaterThanOrEqual(need + PERSONAL_SPACE - 1e-9);
  });

  it("🔴 grows the square when the bodies grow, rather than shrinking it", () => {
    // The tell that the old rule was upside down: `mixed` came out at 0.820 against the
    // default cast's 1.140 — a bigger pair standing closer, because the stance was capped
    // by the beau's reach and the reach got shorter as the hold slid into him.
    const narrow = touchHold(armMetrics(MYCO_DEFAULTS), armMetrics(EMBER_DEFAULTS)).width;
    const fat = touchHold(
      armMetrics(wide(MYCO_DEFAULTS, 0.6)),
      armMetrics(wide(EMBER_DEFAULTS, 0.6)),
    ).width;
    expect(fat).toBeGreaterThan(narrow);
  });

  it("hangs an arm beside its own body rather than through it", () => {
    // The layout slider knows nothing about the torso it is attached to, so a wide enough
    // body swallows its own arms — and then every hold solved from that shoulder starts
    // inside the dancer. The dance reads the shape and hangs the arm clear.
    const fat = armMetrics(wide(MYCO_DEFAULTS, 0.6));
    expect(fat.restX).toBeGreaterThanOrEqual(fat.bodyRadius + fat.armHalfWidth - 1e-9);
  });

  it.each(CAST)("leaves %s's authored arm width alone, because it already clears", (_name, shape) => {
    // Widening only. Every shipped body already hangs its arms outside itself, so this rule
    // is invisible on the whole cast — which is what keeps the watched pose watched.
    expect(armMetrics(shape).restX).toBeCloseTo(computePositions(shape, 0.5).forearmX, 12);
  });

  it.each(SIZE_CASTS)("%s — still puts the two hands on each other", (_name, beauShape, belleShape) => {
    // The property the whole solve exists for, asserted on the casts that broke it. A hold
    // that clears both bodies but leaves the two hands in different places is not a hold —
    // and the clamp above moves the hold *after* each arm has been solved for, so this is
    // exactly where that could have gone wrong.
    const beauM = armMetrics(beauShape);
    const belleM = armMetrics(belleShape);
    const hold = touchHold(beauM, belleM);
    const at = (x: number): Placement => ({ x, z: 0, yaw: 0 });
    // The beau's inside hand is his right, so his partner stands at −x.
    const beauAt = at(0);
    const belleAt = at(-hold.width);
    const his = poseArms(armPoses(), beauM, belleM, beauAt, belleAt, gripBlend(), undefined, hold);
    const hers = poseArms(armPoses(), belleM, beauM, belleAt, beauAt, gripBlend(), undefined, hold);
    const meet = (beauAt.x + belleAt.x) / 2 - hold.lateral;
    expect(beauAt.x + handEnd(his.right, beauM).x).toBeCloseTo(meet, 5);
    expect(belleAt.x + handEnd(hers.left, belleM).x).toBeCloseTo(meet, 5);
    // And touching, on every cast — the drawn palms, not the sphere centres.
    const top = handEnd(his.right, beauM).y
      + handRiseAlongUp(beauM, "right", his.right.aimX, his.right.aimY, his.right.aimZ);
    const bottom = handEnd(hers.left, belleM).y
      - handRiseAlongUp(belleM, "left", hers.left.aimX, hers.left.aimY, hers.left.aimZ);
    expect(bottom - top).toBeCloseTo(0, 9);
  });

  it("leaves the watched default hold exactly where Ryan signed it off", () => {
    // 2026-08-18, after the shoulder-midpoint correction: stance 1.140, hands 0.713 (the
    // belle's waist, unmoved), off-mid **0.050** toward the belle. The stance and the height
    // are the numbers Ryan signed off on 2026-08-17 and none of the accommodation may move
    // them; the lateral is the one he changed, from 0.210 — her inside shoulder — to the
    // middle between the two shoulders.
    const hold = touchHold(armMetrics(MYCO_DEFAULTS), armMetrics(EMBER_DEFAULTS));
    expect(hold.width).toBeCloseTo(1.14, 3);
    expect(hold.height).toBeCloseTo(0.713, 3);
    expect(hold.lateral).toBeCloseTo(0.05, 3);
  });
});
