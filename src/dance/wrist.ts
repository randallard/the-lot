/**
 * The wrist: how a hand turns to bring its palm onto the plane it is holding at
 * ([ADR-0052](../../docs/adr/0052-a-palm-turns-on-its-forearm-before-the-wrist-bends.md)).
 *
 * ## Why there has to be one
 *
 * A palm's normal sits ~90° off its own forearm — measured at 87.5°–90° on this cast, and
 * anatomically right rather than a modelling artifact. With the hand's rotation *authored*,
 * the palm therefore faces wherever the forearm happens to point, and a standing couple's
 * joined hands came out tangent **edge to edge**: two coins on their rims, only 2 of 40 palms
 * presenting a face.
 *
 * ## Roll first, then bend
 *
 * The two rotations are not equal and the order is the decision. **Roll** — about the
 * forearm's own axis, which is pronation — is anatomically free through ±90° and reads as
 * turning your palm over. **Bend** — across the forearm — is what a wrist actually spends,
 * and it is limited. So the roll is taken in full first and the bend only pays for what is
 * left, which is why 30 of 40 hands land inside 45° of bend instead of the 60° median the
 * total rotation would suggest.
 *
 * 🔑 **The residual bend axis comes out perpendicular to the forearm on its own.** After the
 * best roll, the palm normal is the closest point of its cone to the target, and at that
 * point the normal, the target and the forearm axis are coplanar — so the rotation between
 * them turns about an axis normal to that plane, which contains the forearm. Flexion, not
 * deviation, without having to be asked for. That is the whole reason ADR-0051 was wrong:
 * it costed the residual as deviation, where a wrist has ~25°, instead of flexion's ~80°.
 *
 * ## The authored rotation is kept
 *
 * `hand.rotation` is **styling** — Ember's `[-23,45,-14]` is why her palm sits 74° off her
 * forearm rather than 90° — so the solve **composes onto it** rather than replacing it. The
 * authored value stays the hand's rest pose relative to the forearm and the solve turns it
 * from there. Replacing it would have posed every character's hand identically and thrown
 * away the one thing a body editor is for.
 */

import type { Mat3 } from "../services/body-shapes";

/**
 * How far a wrist bends across its forearm before it stops, in radians (~80°).
 *
 * Flexion, because the roll has already put the residual in that plane. Human flexion runs
 * to roughly 80° and extension to 70°; the smaller of the two is the honest ceiling for a
 * joint being asked to bend either way.
 *
 * 🔴 **A hand needing more than this keeps what the clamp gives**, and stays visibly off. On
 * the shipped cast that is the four Sprout-as-beau orderings, which need 77°–88° — and their
 * staying wrong is deliberate: it is the evidence the couple-stagger decision (ADR-0051's
 * idea, superseded but not refuted) still lacks.
 *
 * A constant here rather than a field on the body because it is a fact about joints, not
 * about a character. If a body ever wants its own, this is what moves.
 */
export const WRIST_FLEXION_LIMIT = (80 * Math.PI) / 180;

type V3 = readonly [number, number, number];

function norm(v: V3): V3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return n < 1e-12 ? [0, 0, 0] : [v[0] / n, v[1] / n, v[2] / n];
}
function dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Rotation about a unit axis by an angle, row-major — Rodrigues, written out. */
function rotation(k: V3, t: number): Mat3 {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const d = 1 - c;
  const [x, y, z] = k;
  return [
    c + x * x * d,     x * y * d - z * s, x * z * d + y * s,
    y * x * d + z * s, c + y * y * d,     y * z * d - x * s,
    z * x * d - y * s, z * y * d + x * s, c + z * z * d,
  ];
}

function mul(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9).fill(0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += (a[i * 3 + k] ?? 0) * (b[k * 3 + j] ?? 0);
      out[i * 3 + j] = sum;
    }
  }
  return out;
}

function apply(m: Mat3, v: V3): V3 {
  return [
    (m[0] ?? 0) * v[0] + (m[1] ?? 0) * v[1] + (m[2] ?? 0) * v[2],
    (m[3] ?? 0) * v[0] + (m[4] ?? 0) * v[1] + (m[5] ?? 0) * v[2],
    (m[6] ?? 0) * v[0] + (m[7] ?? 0) * v[1] + (m[8] ?? 0) * v[2],
  ];
}

/**
 * The forearm group's own axis, in its own frame: the hand sits at `[0, handLocalY, 0]`
 * inside it, so the forearm runs along local **+y** toward the hand.
 */
const FOREARM_AXIS: V3 = [0, 1, 0];

/**
 * The wrist rotation that brings a hand's palm as near flat as it can get, in the forearm
 * group's frame — roll about the forearm, then bend across it, clamped.
 *
 * `aim` is the direction the forearm points in the **dancer's** frame. World up pulled back
 * through the forearm group's rotation is `(aimX, −aimY, aimZ)` — the identity `arm-pose.ts`
 * derives, and the reason this never has to build that rotation.
 *
 * Returns the identity when there is nothing to do, so a caller can compose unconditionally.
 */
export function wristRotation(
  handMap: Mat3,
  aimX: number,
  aimY: number,
  aimZ: number,
  limit: number = WRIST_FLEXION_LIMIT,
): Mat3 {
  const identity: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  // The authored palm normal: the image of the hand mesh's own z, which is the flattened
  // axis — the third column of its drawn map.
  const n0 = norm([handMap[2] ?? 0, handMap[5] ?? 0, handMap[8] ?? 0]);
  // Where "flat" points, in this same frame.
  const target = norm([aimX, -aimY, aimZ]);
  if (Math.hypot(...n0) < 0.5 || Math.hypot(...target) < 0.5) return identity;

  // A flattened sphere is symmetric through its centre, so either face may be the one that
  // ends up level: aim at whichever of ±target is nearer, and a palm never rotates more than
  // 90° to get flat.
  const t: V3 = dot(n0, target) < 0 ? [-target[0], -target[1], -target[2]] : target;

  // --- Roll, about the forearm's own axis. Free, so it is spent first and in full.
  //
  // Split both vectors across the axis. The roll that brings the normal nearest the target is
  // the one that turns the normal's perpendicular part onto the target's.
  const along = (v: V3): V3 => {
    const k = dot(v, FOREARM_AXIS);
    return [v[0] - k * FOREARM_AXIS[0], v[1] - k * FOREARM_AXIS[1], v[2] - k * FOREARM_AXIS[2]];
  };
  const p0 = along(n0);
  const pt = along(t);
  let roll = identity;
  if (Math.hypot(...p0) > 1e-9 && Math.hypot(...pt) > 1e-9) {
    const a = norm(p0);
    const b = norm(pt);
    // Signed angle from a to b about the forearm axis.
    roll = rotation(FOREARM_AXIS, Math.atan2(dot(cross(a, b), FOREARM_AXIS), dot(a, b)));
  }

  // --- Bend, across it. Only what the roll could not reach, and only as far as a wrist goes.
  const n1 = apply(roll, n0);
  const axis = cross(n1, t);
  if (Math.hypot(...axis) < 1e-9) return roll; // already there, or exactly opposed
  const angle = Math.acos(Math.min(1, Math.max(-1, dot(n1, t))));
  return mul(rotation(norm(axis), Math.min(angle, limit)), roll);
}

/**
 * A hand's drawn map with its wrist applied — what the hand **is** at this aim, as opposed to
 * how it was authored.
 *
 * This is what every measurement of a posed hand should read, `handRiseAlongUp` first among
 * them: the rise that decides where a palm surface sits is a property of the hand as turned,
 * and reading the authored map instead is the same class of mistake as reading `handRadius`
 * for a flattened sphere.
 */
export function palmMap(handMap: Mat3, aimX: number, aimY: number, aimZ: number): Mat3 {
  return mul(wristRotation(handMap, aimX, aimY, aimZ), handMap);
}

/**
 * How far the palm is from level after the wrist has done what it can, in radians — 0 when it
 * came flat, and the leftover past the clamp when it did not.
 *
 * The number the review is watching, and the one the stagger decision turns on.
 */
export function palmResidual(handMap: Mat3, aimX: number, aimY: number, aimZ: number, limit = WRIST_FLEXION_LIMIT): number {
  const m = palmMap(handMap, aimX, aimY, aimZ);
  const n = norm([m[2] ?? 0, m[5] ?? 0, m[8] ?? 0]);
  const t = norm([aimX, -aimY, aimZ]);
  void limit;
  return Math.acos(Math.min(1, Math.abs(dot(n, t))));
}
