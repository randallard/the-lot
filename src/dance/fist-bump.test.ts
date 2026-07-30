import { describe, expect, it } from "vitest";
import {
  EXTEND_SECONDS,
  HOLD_SECONDS,
  TOTAL_SECONDS,
  bumpContact,
  bumpPose,
  canBump,
  contactFraction,
  envelopeAt,
  facingYaw,
  maxSeparation,
  resolveContact,
  separationOf,
} from "./fist-bump";
import { armMetrics, armPose, gripHeight, type ArmMetrics, type Placement } from "./arm-pose";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  PLAYER_DEFAULTS,
  RYAN_DEFAULTS,
  SPROUT_DEFAULTS,
  type CharacterBodyShape,
} from "../services/body-shapes";

const CAST: readonly [string, CharacterBodyShape][] = [
  ["Myco", MYCO_DEFAULTS],
  ["Ember", EMBER_DEFAULTS],
  ["Ryan", RYAN_DEFAULTS],
  ["Sprout", SPROUT_DEFAULTS],
  ["Player", PLAYER_DEFAULTS],
];

function at(x: number, z: number, yaw = 0): Placement {
  return { x, z, yaw };
}

/** Where a posed arm's hand centre actually ends up, from the pose alone. */
function handOf(pose: ReturnType<typeof armPose>, m: ArmMetrics) {
  const reach = m.handReach;
  return {
    x: pose.x + pose.aimX * reach,
    y: pose.y + pose.aimY * reach,
    z: pose.z + pose.aimZ * reach,
  };
}

/** Stand the pair the fraction of their max separation apart, facing each other. */
function facingPair(a: ArmMetrics, b: ArmMetrics, frac = 0.8) {
  const sep = maxSeparation(a, b) * frac;
  return [at(0, 0), at(0, sep)] as const;
}

describe("envelope", () => {
  it("starts at rest and is not touching", () => {
    const e = envelopeAt(0);
    expect(e.t).toBe(0);
    expect(e.touching).toBe(false);
    expect(e.done).toBe(false);
  });

  it("reaches full extension exactly when the hold begins", () => {
    expect(envelopeAt(EXTEND_SECONDS).t).toBe(1);
    expect(envelopeAt(EXTEND_SECONDS).touching).toBe(true);
  });

  it("writes the hold exactly — no easing through contact", () => {
    // The grip's lesson: a contact window that eases is how a defect looks right
    // and measures wrong.
    for (let s = EXTEND_SECONDS; s < EXTEND_SECONDS + HOLD_SECONDS; s += 0.02) {
      expect(envelopeAt(s).t).toBe(1);
      expect(envelopeAt(s).touching).toBe(true);
    }
  });

  it("is monotonic while extending and while withdrawing", () => {
    let prev = -1;
    for (let s = 0; s <= EXTEND_SECONDS; s += 0.01) {
      const t = envelopeAt(s).t;
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
    prev = 2;
    for (let s = EXTEND_SECONDS + HOLD_SECONDS; s <= TOTAL_SECONDS; s += 0.01) {
      const t = envelopeAt(s).t;
      expect(t).toBeLessThanOrEqual(prev + 1e-9);
      prev = t;
    }
  });

  it("finishes at rest, and stays done", () => {
    expect(envelopeAt(TOTAL_SECONDS).done).toBe(true);
    expect(envelopeAt(TOTAL_SECONDS).t).toBe(0);
    expect(envelopeAt(TOTAL_SECONDS + 10).done).toBe(true);
  });

  it("never leaves 0..1", () => {
    for (let s = -1; s < TOTAL_SECONDS + 1; s += 0.01) {
      const t = envelopeAt(s).t;
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it("fills a caller-owned result, allocating nothing", () => {
    const out = { t: 0, touching: false, done: false };
    expect(envelopeAt(EXTEND_SECONDS, out)).toBe(out);
    expect(out.touching).toBe(true);
  });
});

describe("reach", () => {
  it.each(CAST)("%s can bump themselves at a plausible distance", (_n, shape) => {
    const m = armMetrics(shape);
    expect(maxSeparation(m, m)).toBeGreaterThan(0);
    expect(canBump(m, m, at(0, 0), at(0, maxSeparation(m, m) * 0.9))).toBe(true);
  });

  it("declines a bump that is out of reach", () => {
    const a = armMetrics(PLAYER_DEFAULTS);
    const b = armMetrics(SPROUT_DEFAULTS);
    const tooFar = maxSeparation(a, b) * 1.01;
    expect(canBump(a, b, at(0, 0), at(0, tooFar))).toBe(false);
    expect(resolveContact(bumpContact(), a, b, at(0, 0), at(0, tooFar)).reachable).toBe(false);
  });

  it("measures separation on the floor, ignoring yaw", () => {
    expect(separationOf(at(0, 0, 1.2), at(3, 4, -2))).toBeCloseTo(5, 10);
  });
});

describe("where the fists meet", () => {
  it("splits an even pair down the middle", () => {
    const m = armMetrics(MYCO_DEFAULTS);
    expect(contactFraction(m, m)).toBeCloseTo(0.5, 12);
  });

  it("makes the longer arm cover more of the gap", () => {
    // The dancer-size brief's rule, falling out of the split rather than deferred:
    // the character who *can* reach further is the one who does.
    const child = armMetrics(SPROUT_DEFAULTS);
    const adult = armMetrics(RYAN_DEFAULTS);
    const longer = adult.handReach > child.handReach ? adult : child;
    const shorter = longer === adult ? child : adult;

    const [pl, ps] = [at(0, 0), at(0, maxSeparation(longer, shorter) * 0.9)];
    const c = resolveContact(bumpContact(), longer, shorter, pl, ps);

    const fromLonger = Math.hypot(c.x - pl.x, c.z - pl.z);
    const fromShorter = Math.hypot(c.x - ps.x, c.z - ps.z);
    expect(fromLonger).toBeGreaterThan(fromShorter);
  });

  it("puts the contact point between them, on the line", () => {
    const a = armMetrics(PLAYER_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    const [pa, pb] = facingPair(a, b);
    const c = resolveContact(bumpContact(), a, b, pa, pb);
    const total = Math.hypot(c.x - pa.x, c.z - pa.z) + Math.hypot(c.x - pb.x, c.z - pb.z);
    expect(total).toBeCloseTo(c.separation, 10);
  });

  it("shares one height, which is the grip's", () => {
    const a = armMetrics(PLAYER_DEFAULTS);
    const b = armMetrics(SPROUT_DEFAULTS);
    const [pa, pb] = facingPair(a, b);
    expect(resolveContact(bumpContact(), a, b, pa, pb).height).toBe(gripHeight(a, b));
  });

  it("points each direction back at its own character", () => {
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    const [pa, pb] = facingPair(a, b);
    const c = resolveContact(bumpContact(), a, b, pa, pb);
    // Stepping from the contact point along dirA must get closer to a.
    const near = Math.hypot(c.x + c.dirAX * 0.01 - pa.x, c.z + c.dirAZ * 0.01 - pa.z);
    expect(near).toBeLessThan(Math.hypot(c.x - pa.x, c.z - pa.z));
    expect(c.dirBX).toBeCloseTo(-c.dirAX, 12);
    expect(c.dirBZ).toBeCloseTo(-c.dirAZ, 12);
  });

  it("survives two characters standing in exactly the same spot", () => {
    const m = armMetrics(MYCO_DEFAULTS);
    const c = resolveContact(bumpContact(), m, m, at(2, 2, 0), at(2, 2, Math.PI));
    expect(Number.isFinite(c.x)).toBe(true);
    expect(Number.isFinite(c.z)).toBe(true);
    expect(Math.hypot(c.dirAX, c.dirAZ)).toBeCloseTo(1, 10);
  });
});

describe("the fists actually touch", () => {
  // The property the whole module exists for, asserted as a number rather than
  // judged by camera angle — this repo's arm work has been wrong by eye three times
  // with green tests behind it.
  it.each(CAST)("%s bumping every castmate leaves hands exactly touching", (_n, shape) => {
    const a = armMetrics(shape);
    for (const [, other] of CAST) {
      const b = armMetrics(other);
      const [pa, pb] = facingPair(a, b);
      const c = resolveContact(bumpContact(), a, b, pa, pb);

      const poseA = bumpPose(armPose(), a, c, c.dirAX, c.dirAZ);
      const poseB = bumpPose(armPose(), b, c, c.dirBX, c.dirBZ);
      const ha = handOf(poseA, a);
      const hb = handOf(poseB, b);

      const gap = Math.hypot(ha.x - hb.x, ha.y - hb.y, ha.z - hb.z);
      expect(gap).toBeCloseTo(a.handRadius + b.handRadius, 10);
    }
  });

  it("holds both fists at the shared height", () => {
    const a = armMetrics(PLAYER_DEFAULTS);
    const b = armMetrics(SPROUT_DEFAULTS);
    const [pa, pb] = facingPair(a, b);
    const c = resolveContact(bumpContact(), a, b, pa, pb);
    const ha = handOf(bumpPose(armPose(), a, c, c.dirAX, c.dirAZ), a);
    const hb = handOf(bumpPose(armPose(), b, c, c.dirBX, c.dirBZ), b);
    expect(ha.y).toBeCloseTo(c.height, 10);
    expect(hb.y).toBeCloseTo(c.height, 10);
  });

  it("keeps touching as the pair drifts, which is why it is per-frame", () => {
    const a = armMetrics(MYCO_DEFAULTS);
    const b = armMetrics(EMBER_DEFAULTS);
    const c = bumpContact();
    for (let sep = maxSeparation(a, b) * 0.4; sep < maxSeparation(a, b); sep += 0.03) {
      resolveContact(c, a, b, at(0, 0), at(0, sep));
      const ha = handOf(bumpPose(armPose(), a, c, c.dirAX, c.dirAZ), a);
      const hb = handOf(bumpPose(armPose(), b, c, c.dirBX, c.dirBZ), b);
      const gap = Math.hypot(ha.x - hb.x, ha.y - hb.y, ha.z - hb.z);
      expect(gap).toBeCloseTo(a.handRadius + b.handRadius, 10);
    }
  });

  it("aims both arms horizontally", () => {
    const a = armMetrics(RYAN_DEFAULTS);
    const b = armMetrics(PLAYER_DEFAULTS);
    const [pa, pb] = facingPair(a, b);
    const c = resolveContact(bumpContact(), a, b, pa, pb);
    expect(bumpPose(armPose(), a, c, c.dirAX, c.dirAZ).aimY).toBe(0);
    expect(bumpPose(armPose(), b, c, c.dirBX, c.dirBZ).aimY).toBe(0);
  });

  it("fills a caller-owned pose", () => {
    const a = armMetrics(MYCO_DEFAULTS);
    const c = resolveContact(bumpContact(), a, a, at(0, 0), at(0, 0.5));
    const out = armPose();
    expect(bumpPose(out, a, c, c.dirAX, c.dirAZ)).toBe(out);
  });
});

describe("facing", () => {
  it("gives the yaw that turns one character toward the other", () => {
    expect(facingYaw(at(0, 0), at(0, 1))).toBeCloseTo(0, 10);
    expect(facingYaw(at(0, 0), at(1, 0))).toBeCloseTo(Math.PI / 2, 10);
  });

  it("is opposite for the two ends of a pair", () => {
    const f = facingYaw(at(0, 0), at(3, 4));
    const r = facingYaw(at(3, 4), at(0, 0));
    expect(Math.abs(Math.atan2(Math.sin(f - r), Math.cos(f - r)))).toBeCloseTo(Math.PI, 10);
  });
});
