import { describe, expect, it } from "vitest";
import { armMetrics, armPose, touchPose, upperArmStrain, type ArmMetrics } from "./arm-pose";
import {
  PLAYER_DEFAULTS, MYCO_DEFAULTS, EMBER_DEFAULTS, RYAN_DEFAULTS, SPROUT_DEFAULTS,
  type CharacterBodyShape,
} from "../services/body-shapes";

/**
 * 🔑 **The upper arm stands up as the hold rises** (ADR-0058) — `touchPose`'s `raised`.
 *
 * Ryan, 2026-08-23, on what a California Twirl's held arm should do: *"an upside down L with the
 * invisible upper arm and the forearm then is horizontal over the head."* ADR-0027's rule — the
 * humerus of a **hanging** arm stays in the plane of its own shoulder — is the right anatomy for
 * a couple standing hand in hand and the wrong one for an arch, because nothing about an arch is
 * hanging.
 *
 * Both answers are points on the same circle of legal elbows, so `raised` **rotates** between
 * them about that circle's axis. These tests are mostly about what that rotation must never
 * break.
 */
const CAST: readonly (readonly [string, CharacterBodyShape])[] = [
  ["player", PLAYER_DEFAULTS],
  ["myco", MYCO_DEFAULTS],
  ["ember", EMBER_DEFAULTS],
  ["ryan", RYAN_DEFAULTS],
  ["sprout", SPROUT_DEFAULTS],
];

/** Where the shoulder is, in the dancer's own rig frame, for a `sign`-side arm at `restX`. */
function shoulder(m: ArmMetrics, sign: number) {
  return { x: sign * m.restX, y: m.restY, z: 0 };
}

/**
 * A target this arm can actually make, up and in toward the midline — the direction an arch
 * takes a hand. At a fraction of the arm's own reach, so the elbow circle is real rather than
 * collapsed: a straight arm has no elbow freedom and nothing here would have anything to say.
 */
function archTarget(m: ArmMetrics, sign: number, fraction: number) {
  const s = shoulder(m, sign);
  const reach = fraction * (m.elbowReach + m.drawnSpan);
  const d = [-sign * 0.45, 1, 0.12];
  const len = Math.hypot(d[0]!, d[1]!, d[2]!);
  return {
    x: s.x + (d[0]! / len) * reach,
    y: s.y + (d[1]! / len) * reach,
    z: (d[2]! / len) * reach,
  };
}

/** Angle of the upper arm off straight up, in degrees. */
function offVertical(elbow: { x: number; y: number; z: number }, m: ArmMetrics, sign: number) {
  const s = shoulder(m, sign);
  const v = [elbow.x - s.x, elbow.y - s.y, elbow.z - s.z];
  const len = Math.hypot(v[0]!, v[1]!, v[2]!) || 1;
  return (Math.acos(Math.max(-1, Math.min(1, v[1]! / len))) * 180) / Math.PI;
}

const FRACTIONS = [0.5, 0.65, 0.8, 0.9];

/**
 * Whether this target leaves the arm a real elbow **circle** to turn on, rather than a point.
 *
 * 🔑 **The regime boundary is ADR-0027's own fall-through, and it has to be named rather than
 * assumed.** `touchPose` solves by pinning the elbow to the shoulder's plane, and where the
 * circle lies clear of that plane — a nearly straight arm, or a hand far enough out to the side
 * — it hands off to `reachPose` instead. Ryan reaching 90% of his arm is such a case on the
 * shipped cast. There is nothing for `raised` to do there and nothing for it to break, and a
 * test that assumed one regime for the whole cast would be asserting the wrong thing about the
 * pose rather than finding a defect in it.
 */
function onTheCircle(m: ArmMetrics, sign: number, t: { x: number; y: number; z: number }) {
  const hang = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan);
  return Math.abs(hang.x - sign * m.restX) < 1e-9;
}

describe("🔑 a raised hold stands the upper arm up", () => {
  it("🔴 leaves ADR-0027 byte-identical at raised = 0", () => {
    // The whole safety of this change. `raised` defaults to 0 and every caller that predates the
    // arch gets exactly the pose it got before — including the elbow sitting in the shoulder's
    // own plane, which is ADR-0027 stated as a coordinate.
    for (const [name, shape] of CAST) {
      const m = armMetrics(shape);
      for (const sign of [1, -1]) {
        for (const f of FRACTIONS) {
          const t = archTarget(m, sign, f);
          const a = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan);
          const b = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, 0);
          expect(b, `${name} ${String(sign)} ${String(f)}`).toEqual(a);
          // …and where the in-plane solve is the one that ran, the elbow keeps the shoulder's
          // lateral offset exactly — ADR-0027 stated as a coordinate.
          if (onTheCircle(m, sign, t)) {
            expect(a.x, `${name} ${String(sign)} ${String(f)}`).toBeCloseTo(sign * m.restX, 12);
          }
        }
      }
    }
  });

  it("🔑 keeps the humerus at its exact length all the way across", () => {
    // The reason this is a **rotation** and not a lerp between two elbow positions. A lerp cuts
    // the chord, which shortens the upper arm in the middle of the blend — an arm that changes
    // length while the hands go up, on exactly the figure where a watcher is looking at the arm.
    for (const [name, shape] of CAST) {
      const m = armMetrics(shape);
      for (const sign of [1, -1]) {
        for (const f of FRACTIONS) {
          const t = archTarget(m, sign, f);
          for (const raised of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
            const p = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, raised);
            const s = shoulder(m, sign);
            const upper = Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z);
            const where = `${name} ${String(sign)} f${String(f)} r${String(raised)}`;
            expect(upper, where).toBeCloseTo(m.elbowReach, 9);
            // Which is the same statement the strain meter makes, so it reads zero throughout.
            expect(upperArmStrain(p, m, sign), where).toBeCloseTo(0, 9);
          }
        }
      }
    }
  });

  it("🔑 and the forearm still reaches the point it was given", () => {
    // Standing the elbow up must not move the hand. The hold is a fixed point that two dancers
    // both solve onto; an elbow rule that dragged it would pull the pair's hands apart.
    for (const [name, shape] of CAST) {
      const m = armMetrics(shape);
      for (const sign of [1, -1]) {
        for (const f of FRACTIONS) {
          const t = archTarget(m, sign, f);
          for (const raised of [0, 0.5, 1]) {
            const p = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, raised);
            const where = `${name} ${String(sign)} f${String(f)} r${String(raised)}`;
            expect(p.x + p.aimX * m.drawnSpan, where).toBeCloseTo(t.x, 9);
            expect(p.y + p.aimY * m.drawnSpan, where).toBeCloseTo(t.y, 9);
            expect(p.z + p.aimZ * m.drawnSpan, where).toBeCloseTo(t.z, 9);
          }
        }
      }
    }
  });

  it("🔑 raises the upper arm monotonically, and 1 is the highest the circle has", () => {
    // "As vertical as the geometry allows", not "vertical" — the elbow cannot leave its circle,
    // so how much of an L an arm can make depends on how much slack it has. That is the same
    // observation ADR-0027 already makes from the other end: the straighter the arm, the smaller
    // the elbow's circle.
    for (const [name, shape] of CAST) {
      const m = armMetrics(shape);
      for (const sign of [1, -1]) {
        for (const f of FRACTIONS) {
          const t = archTarget(m, sign, f);
          const angles = [0, 0.25, 0.5, 0.75, 1].map((raised) =>
            offVertical(
              touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, raised),
              m,
              sign,
            ),
          );
          const where = `${name} ${String(sign)} f${String(f)}`;
          for (let i = 1; i < angles.length; i++) {
            expect(angles[i]!, `${where} step ${String(i)}`).toBeLessThanOrEqual(angles[i - 1]! + 1e-9);
          }
          // And it actually moves — a rule that quietly did nothing would pass the monotonicity
          // above. Only where there is a circle to move on: see `onTheCircle`.
          if (onTheCircle(m, sign, t)) {
            expect(angles[4]!, where).toBeLessThan(angles[0]! - 0.5);
          }
        }
      }
    }
  });

  it("🔴 and nothing on the circle is higher than where raised = 1 lands", () => {
    // The closed form earns its place here. `standUp` aims at the normalised projection of *up*
    // onto the circle's plane, which is the maximum by construction — this is the check that the
    // construction is the one that was actually written.
    for (const [name, shape] of CAST) {
      const m = armMetrics(shape);
      for (const sign of [1, -1]) {
        for (const f of FRACTIONS) {
          const t = archTarget(m, sign, f);
          const best = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, 1);
          // Sample the rotation densely; `raised` past 1 keeps turning, so it sweeps the circle.
          for (let k = -40; k <= 40; k++) {
            const p = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, k / 10);
            expect(p.y, `${name} ${String(sign)} f${String(f)} k${String(k)}`).toBeLessThanOrEqual(
              best.y + 1e-9,
            );
          }
        }
      }
    }
  });

  it("does nothing when the arm is straight, because a straight arm has no elbow to move", () => {
    // Out past the reach the solve falls through to `reachPose` and the circle has collapsed to a
    // point. Standing up is then not "refused" — there is genuinely nowhere to go, which is also
    // true of the dancer.
    for (const [name, shape] of CAST) {
      const m = armMetrics(shape);
      const t = archTarget(m, 1, 1.4);
      const hang = touchPose(armPose(), m, 1, t.x, t.y, t.z, m.restX, m.drawnSpan, 0);
      const stood = touchPose(armPose(), m, 1, t.x, t.y, t.z, m.restX, m.drawnSpan, 1);
      expect(stood, name).toEqual(hang);
    }
  });
});

/**
 * 🧪 **…but not past the hand** (`TouchHold.forearmUp`, 2026-10-12, undecided).
 *
 * Once the join sits low — a hand above a short partner's crown — a tall dancer's highest elbow
 * is well above his own hand, and the forearm comes down onto the join. Ryan: *"his arm
 * shouldn't be pointing down."*
 */
describe("🧪 a raised elbow stops level with the hand", () => {
  /** A hand at a fraction of the reach, forward and in, at `rise` × reach above the shoulder. */
  function lowTarget(m: ArmMetrics, sign: number, fraction: number, rise: number) {
    const s = shoulder(m, sign);
    const reach = fraction * (m.elbowReach + m.drawnSpan);
    const d = [-sign * 0.45, rise, 0.6];
    const len = Math.hypot(d[0]!, d[1]!, d[2]!);
    return {
      x: s.x + (d[0]! / len) * reach,
      y: s.y + (d[1]! / len) * reach,
      z: (d[2]! / len) * reach,
    };
  }

  it("🔴 without it, the highest elbow points the forearm down at a low hand", () => {
    // The defect, stated: ADR-0058 at full `raised`, hand level with the shoulder.
    const m = armMetrics(PLAYER_DEFAULTS);
    const t = lowTarget(m, -1, 0.65, 0);
    const p = touchPose(armPose(), m, -1, t.x, t.y, t.z, m.restX, m.drawnSpan, 1);
    expect(p.aimY).toBeLessThan(-0.2);
  });

  it("🔑 with it, no forearm points down wherever an elbow below the hand exists", () => {
    for (const [name, shape] of CAST) {
      const m = armMetrics(shape);
      for (const sign of [1, -1]) {
        for (const f of FRACTIONS) {
          for (const rise of [0, 0.3, 1]) {
            const t = lowTarget(m, sign, f, rise);
            if (!onTheCircle(m, sign, t)) continue;
            const hang = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, 0);
            const p = touchPose(armPose(), m, sign, t.x, t.y, t.z, m.restX, m.drawnSpan, 1, true);
            const where = `${name} ${String(sign)} f${String(f)} rise${String(rise)}`;
            // Never lower than level — unless the arm was already pointing down while hanging,
            // in which case it is left exactly there.
            if (hang.aimY >= 0) expect(p.aimY, where).toBeGreaterThan(-1e-6);
            else expect(p.aimY, where).toBeCloseTo(hang.aimY, 9);
            // And it is still a real arm: the humerus keeps its length, the hand its place.
            expect(upperArmStrain(p, m, sign), where).toBeCloseTo(0, 9);
            expect(p.y + p.aimY * m.drawnSpan, where).toBeCloseTo(t.y, 9);
          }
        }
      }
    }
  });

  it("🔑 and it changes nothing where the hand is above the highest elbow", () => {
    const m = armMetrics(PLAYER_DEFAULTS);
    const t = archTarget(m, 1, 0.8);
    const a = touchPose(armPose(), m, 1, t.x, t.y, t.z, m.restX, m.drawnSpan, 1);
    const b = touchPose(armPose(), m, 1, t.x, t.y, t.z, m.restX, m.drawnSpan, 1, true);
    if (a.aimY >= 0) expect(b).toEqual(a);
  });
});

