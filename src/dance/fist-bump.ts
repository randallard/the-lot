/**
 * A fist bump between two characters — the first two-body gesture that is not
 * choreography.
 *
 * Planning ADR-0009 makes this M5's opening move, ahead of putting the player in a
 * square: it isolates the one unknown both taught gestures share — can the player
 * make contact with another character at all — and drops the one only `arm-turn`
 * needs. So there is deliberately **no engine here**: no square-one import, no
 * beat clock, no formation. Timing is in seconds because a bump answers to a thumb,
 * not to patter tempo.
 *
 * **It is not an emote, and it could not be.** `services/emotes`'s `ResolvedPose` is
 * single-character by construction — every field is one body's own rig-local pose,
 * with no partner reference and no world space. Two fists meeting at a point
 * *between* two bodies is inexpressible in it. That is what ADR-0014's
 * `{ kind: "gesture" }` arm of the taught-thing union exists for.
 *
 * **Almost none of the geometry is new, which was a surprise.** ADR-0014 predicted a
 * fresh pose function on the grounds that {@link gripPose} is the *forearm* grip —
 * hand at the partner's elbow, forearms antiparallel. But `gripPose` is parameterised
 * by `radius` and `separation` and places everything from the pivot, so a fist bump
 * is the same function with **`radius` = the character's own hand radius** and
 * **`separation` = 0**: the fist touches the contact point from its own side, and
 * head-on rather than side by side. Asymmetric hands then fall out correctly — the
 * distance between hand centres is `a.handRadius + b.handRadius`, which is what
 * touching means.
 *
 * **Where the contact point goes is the real decision, and it is an accessibility
 * one.** {@link contactFraction} splits the gap in proportion to **reach**, not to
 * body radius as {@link reachAllowance} does. That difference is deliberate. Sharing
 * a lane laterally is a question about torsos, so body radius is right there. Meeting
 * in the middle is a question about arms, and splitting by reach makes the
 * longer-armed character cover more of the distance — which is the dancer-size
 * brief's rule ("the taller dancer does nearly all the accommodating") *falling out*
 * rather than being deferred. `gripHeight` is still the shared placeholder for
 * height, with its known failure mode; fixing it fixes both callers.
 *
 * Right hand to right hand, on the handshake convention: two characters facing each
 * other put their right hands out on the same side of the axis between them, which is
 * why handshakes work and why the contact point needs no lateral offset.
 *
 * Pure and three.js-free, like `arm-pose`: the caller hands over floor placements and
 * gets poses back, so the geometry is testable without a renderer.
 */

import {
  type ArmMetrics,
  type ArmPose,
  type Placement,
  gripHeight,
  gripPose,
} from "./arm-pose";

/**
 * The envelope, in seconds. Extend, hold, withdraw.
 *
 * Held long enough to read as a beat of contact rather than a tap — the hold is what
 * makes it look deliberate — and short enough that it does not take control of the
 * player for an awkward length of time.
 */
export const EXTEND_SECONDS = 0.25;
export const HOLD_SECONDS = 0.35;
export const WITHDRAW_SECONDS = 0.3;
export const TOTAL_SECONDS = EXTEND_SECONDS + HOLD_SECONDS + WITHDRAW_SECONDS;

/** Where a bump is in its envelope. */
export interface BumpEnvelope {
  /** Pose blend, 0 at rest and 1 at full contact. Feed to `blendPose`. */
  t: number;
  /** True only while the fists are actually together. */
  touching: boolean;
  /** True once the whole gesture has run. */
  done: boolean;
}

/**
 * Sample the envelope at `elapsed` seconds.
 *
 * Extend and withdraw are eased with a smoothstep so the arm does not start and stop
 * dead; the hold is a flat 1, written exactly. Same reasoning as the grip: contact is
 * either real or it is not, and easing *through* the contact window is how the last
 * defect in this repo's arm work managed to look right and measure wrong.
 */
export function envelopeAt(elapsed: number, out?: BumpEnvelope): BumpEnvelope {
  const e = out ?? { t: 0, touching: false, done: false };
  if (elapsed <= 0) {
    e.t = 0;
    e.touching = false;
    e.done = false;
    return e;
  }
  if (elapsed < EXTEND_SECONDS) {
    e.t = smoothstep(elapsed / EXTEND_SECONDS);
    e.touching = false;
    e.done = false;
    return e;
  }
  if (elapsed < EXTEND_SECONDS + HOLD_SECONDS) {
    e.t = 1;
    e.touching = true;
    e.done = false;
    return e;
  }
  if (elapsed < TOTAL_SECONDS) {
    const k = (elapsed - EXTEND_SECONDS - HOLD_SECONDS) / WITHDRAW_SECONDS;
    e.t = smoothstep(1 - k);
    e.touching = false;
    e.done = false;
    return e;
  }
  e.t = 0;
  e.touching = false;
  e.done = true;
  return e;
}

function smoothstep(x: number): number {
  const k = x < 0 ? 0 : x > 1 ? 1 : x;
  return k * k * (3 - 2 * k);
}

/** Floor distance between two characters. */
export function separationOf(a: Placement, b: Placement): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.hypot(dx, dz);
}

/**
 * The furthest apart two characters can be and still touch fists — both arms
 * horizontal and fully extended.
 *
 * `handReach` is shoulder-to-hand-centre, so the sum is centre-to-centre once the
 * hands meet. Conservative on purpose: it ignores the lateral shoulder offset, which
 * buys a little more real reach, and a bump that looks strained is worse than one the
 * game declines to offer.
 */
export function maxSeparation(a: ArmMetrics, b: ArmMetrics): number {
  return a.handReach + b.handReach;
}

/** Whether these two, standing here, can touch fists at all. */
export function canBump(a: ArmMetrics, b: ArmMetrics, pa: Placement, pb: Placement): boolean {
  return separationOf(pa, pb) <= maxSeparation(a, b);
}

/**
 * `a`'s share of the gap — the fraction of the way from `a` to `b` where the fists
 * should meet.
 *
 * Proportional to reach, so the longer arm travels further and the shorter arm is not
 * asked for something it does not have. An even pair meets in the middle; a child and
 * an adult meet close to the child. Degenerate zero-reach input falls back to the
 * midpoint rather than dividing by zero.
 */
export function contactFraction(a: ArmMetrics, b: ArmMetrics): number {
  const total = a.handReach + b.handReach;
  if (total <= 0) return 0.5;
  return a.handReach / total;
}

/** Where two fists meet, in world space. */
export interface BumpContact {
  x: number;
  z: number;
  /** Shared height of both fists. */
  height: number;
  /** Unit direction from the contact point back toward `a`. */
  dirAX: number;
  dirAZ: number;
  /** Unit direction from the contact point back toward `b`. Negated `dirA`. */
  dirBX: number;
  dirBZ: number;
  /** Floor distance between the pair when this was computed. */
  separation: number;
  /** False when they are too far apart to touch — the pose is then meaningless. */
  reachable: boolean;
}

export function bumpContact(): BumpContact {
  return {
    x: 0, z: 0, height: 0,
    dirAX: 0, dirAZ: 0, dirBX: 0, dirBZ: 0,
    separation: 0, reachable: false,
  };
}

/**
 * Resolve the contact point for this frame.
 *
 * Recomputed per frame rather than frozen at the start, because either character may
 * still be drifting when the gesture begins — the same reason the grip publishes
 * contact every frame instead of asserting it once.
 *
 * When the two are exactly co-located there is no axis to meet on; the directions
 * fall back to `a`'s facing so the arms have somewhere defined to point.
 */
export function resolveContact(
  out: BumpContact,
  a: ArmMetrics,
  b: ArmMetrics,
  pa: Placement,
  pb: Placement,
): BumpContact {
  const dx = pb.x - pa.x;
  const dz = pb.z - pa.z;
  const sep = Math.hypot(dx, dz);
  const f = contactFraction(a, b);

  out.separation = sep;
  out.reachable = sep <= maxSeparation(a, b);
  out.height = gripHeight(a, b);

  if (sep <= 1e-9) {
    out.x = pa.x;
    out.z = pa.z;
    out.dirAX = -Math.sin(pa.yaw);
    out.dirAZ = -Math.cos(pa.yaw);
    out.dirBX = -out.dirAX;
    out.dirBZ = -out.dirAZ;
    return out;
  }

  const ux = dx / sep;
  const uz = dz / sep;
  out.x = pa.x + ux * sep * f;
  out.z = pa.z + uz * sep * f;
  // From the contact point back toward each character.
  out.dirAX = -ux;
  out.dirAZ = -uz;
  out.dirBX = ux;
  out.dirBZ = uz;
  return out;
}

/**
 * Place one character's bumping arm.
 *
 * Delegates to {@link gripPose} with `radius` = this character's own hand radius and
 * `separation` = 0: the fist sits back from the contact point by exactly its own
 * radius, aimed along the axis, so the two fists touch rather than interpenetrate or
 * hover. `dir` is the contact point's direction back toward *this* character —
 * `dirA*` for one, `dirB*` for the other.
 */
export function bumpPose(
  out: ArmPose,
  m: ArmMetrics,
  c: BumpContact,
  dirX: number,
  dirZ: number,
): ArmPose {
  return gripPose(out, m, m.handRadius, 0, c.x, c.z, dirX, dirZ, c.height);
}

/**
 * The yaw each character needs to face the other.
 *
 * Returned rather than applied: whether a gesture may turn a character is an
 * arbitration question ADR-0010 owns for dancers, and the player's case is out of
 * scope there, so the caller decides.
 */
export function facingYaw(from: Placement, to: Placement): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}
