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
 * **A bump and a grip are not the same geometry, and finding out why took a watch.**
 * This started as `gripPose` with `radius` = the character's own hand radius and
 * `separation` = 0, on the reasoning that both are "place an arm against a point
 * between the pair". They are not. A grip is pinned to the **pivot** and lets the
 * shoulder drift, because a hold has to survive the bodies breathing in and out as they
 * turn; a bump is pinned to the **shoulder** and lets the elbow bend, because the pair
 * are standing still and the authored contact point is the thing that must hold. Sharing
 * one function meant the bump inherited the grip's drifting shoulder — measured 0.34
 * behind the body at half reach, dragging the forearm's near end into the torso. So the
 * bump now calls {@link reachPose} and ADR-0017 owns the split.
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
  localHeight,
  reachPose,
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
  return envelopeWith(elapsed, EXTEND_SECONDS, HOLD_SECONDS, WITHDRAW_SECONDS, out);
}

/**
 * {@link envelopeAt} with the three durations supplied — an authored move carries its
 * own timing, and the constants above are the fist bump's particular answer.
 *
 * A zero-length phase is skipped cleanly rather than dividing by zero, because the
 * editor's sliders can reach 0 and a move with no hold is a legitimate thing to author
 * (a tap rather than a bump).
 */
export function envelopeWith(
  elapsed: number,
  extend: number,
  hold: number,
  withdraw: number,
  out?: BumpEnvelope,
): BumpEnvelope {
  const e = out ?? { t: 0, touching: false, done: false };
  const total = extend + hold + withdraw;
  if (elapsed <= 0) {
    e.t = 0;
    e.touching = false;
    e.done = false;
    return e;
  }
  if (elapsed < extend) {
    e.t = extend > 0 ? smoothstep(elapsed / extend) : 1;
    e.touching = false;
    e.done = false;
    return e;
  }
  if (elapsed < extend + hold) {
    e.t = 1;
    e.touching = true;
    e.done = false;
    return e;
  }
  if (elapsed < total) {
    const k = withdraw > 0 ? (elapsed - extend - hold) / withdraw : 1;
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
 * How far along the floor one character can put a hand **centre**, reaching from a
 * fixed shoulder to a point on the line between the pair at world height `height`.
 *
 * `handReach` is the straight arm, shoulder to hand centre, and the arm has to spend
 * some of it going **up or down** to the contact height and some of it going
 * **sideways** across the body's own midline — a bump between two characters facing
 * each other is each of them reaching inward, which is why a handshake needs the arm
 * that is on the far side from the hand it meets. What is left over is what travels
 * across the floor, and Pythagoras takes the two off.
 *
 * 🔴 **This is stricter than the number it replaces**, which was `handReach` flat and
 * called itself conservative while ignoring both terms. The lateral one is not small —
 * `restX` runs to 0.46 on the wider bodies — so some pairs that used to be offered a
 * bump will now be told to move closer. That is the honest reading of a rigid arm on a
 * torso that cannot twist (ADR-0017), and the first thing to watch if bumps start
 * feeling fussy.
 */
export function axialReach(m: ArmMetrics, height: number): number {
  const rise = m.rigOriginY + m.restY - height;
  const spare = m.handReach * m.handReach - rise * rise - m.restX * m.restX;
  return spare > 0 ? Math.sqrt(spare) : 0;
}

/**
 * How far from their own centre a character can put the **contact point** — their whole
 * share of the separation, hand radius included.
 */
export function bumpReach(m: ArmMetrics, height: number): number {
  return axialReach(m, height) + m.handRadius;
}

/**
 * The furthest apart two characters can be and still touch fists at `height` without
 * stretching anything.
 *
 * Each covers their own {@link bumpReach} and the two meet where they run out, so this
 * and {@link contactFraction} are one decision seen from two sides: at exactly this
 * separation the fraction puts the contact point where both arms are straight, and
 * `upperArmStrain` reads zero on both. Any further and it goes positive on both at once.
 */
export function maxSeparation(a: ArmMetrics, b: ArmMetrics, height: number): number {
  return bumpReach(a, height) + bumpReach(b, height);
}

/** Whether these two, standing here, can touch fists at `height` at all. */
export function canBump(
  a: ArmMetrics,
  b: ArmMetrics,
  pa: Placement,
  pb: Placement,
  height: number,
): boolean {
  return separationOf(pa, pb) <= maxSeparation(a, b, height);
}

/**
 * `a`'s share of the gap — the fraction of the way from `a` to `b` where the fists
 * should meet.
 *
 * Proportional to reach, so the longer arm travels further and the shorter arm is not
 * asked for something it does not have. An even pair meets in the middle; a child and
 * an adult meet close to the child. Degenerate zero-reach input falls back to the
 * midpoint rather than dividing by zero.
 *
 * **Measured at the contact height, not in the abstract**, which is the accessibility
 * rule getting sharper rather than a new one. A tall character reaching down to a
 * child's elbow height spends most of a long arm on the descent and has less floor
 * reach left than their `handReach` suggests — so the meeting point moves further
 * toward them than it used to, which is what "the taller dancer does nearly all the
 * accommodating" actually looks like when you measure it.
 */
export function contactFraction(a: ArmMetrics, b: ArmMetrics, height: number): number {
  const ra = bumpReach(a, height);
  const total = ra + bumpReach(b, height);
  if (total <= 0) return 0.5;
  return ra / total;
}

/** Where two fists meet, in world space. */
export interface BumpContact {
  x: number;
  z: number;
  /**
   * Shared height of both fists, **always in world space** — even when `x`/`z` were
   * resolved in a rig-local frame.
   *
   * The one quantity here that is not frame-agnostic, because it comes from
   * {@link gripHeight}, which averages two characters' rig-local elbows and therefore
   * has to answer in the frame they have in common. {@link bumpPose} localises it.
   */
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
  const height = gripHeight(a, b);
  return resolveContactAt(out, a, b, pa, pb, contactFraction(a, b, height), height);
}

/**
 * {@link resolveContact} with the two rules supplied rather than assumed.
 *
 * The fist bump's answers — split the gap by reach, meet at the mean resting elbow — are
 * one choice out of several, and ADR-0016 makes that choice authored data: a palm touch
 * at shoulder height is the same geometry with a different pair of rules. Extracted so
 * `contact-move.ts` composes this rather than reimplementing the axis maths, which is
 * the only copy of it.
 *
 * `f` is `a`'s share of the gap, 0 at `a` and 1 at `b`. `height` is world.
 */
export function resolveContactAt(
  out: BumpContact,
  a: ArmMetrics,
  b: ArmMetrics,
  pa: Placement,
  pb: Placement,
  f: number,
  height: number,
): BumpContact {
  const dx = pb.x - pa.x;
  const dz = pb.z - pa.z;
  const sep = Math.hypot(dx, dz);

  out.separation = sep;
  out.reachable = sep <= maxSeparation(a, b, height);
  out.height = height;

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
 * The whole gesture is now one sentence: **the fist goes `handRadius` back from the
 * contact point on this character's own side, and {@link reachPose} finds an elbow that
 * gets it there from a shoulder that does not move.** `dir` is the contact point's
 * direction back toward *this* character — `dirA*` for one, `dirB*` for the other — so
 * stepping along it by the hand's own radius is what makes the two fists touch rather
 * than interpenetrate or hover, and asymmetric hands fall out for free: the distance
 * between hand centres is `a.handRadius + b.handRadius`.
 *
 * `sign` picks the shoulder, matching {@link restPose} — new under ADR-0017 and not
 * optional. The old one-segment version never needed it, because it placed the arm
 * entirely from the contact point and the shoulder went wherever that left it; that is
 * exactly the defect this replaces.
 *
 * `c.height` is world and the pose is rig-local, so it is localised here rather than by
 * the caller — the two characters in a bump generally have rigs at different world
 * heights, and doing this at the call site is how it got missed the first time.
 */
export function bumpPose(
  out: ArmPose,
  m: ArmMetrics,
  c: BumpContact,
  dirX: number,
  dirZ: number,
  sign: number,
): ArmPose {
  return reachPose(
    out,
    m,
    sign,
    c.x + m.handRadius * dirX,
    localHeight(m, c.height),
    c.z + m.handRadius * dirZ,
  );
}

/** A character standing at their own origin — the `self` of a local frame. */
export const SELF: Placement = { x: 0, z: 0, yaw: 0 };

/**
 * The partner, expressed in this character's **local** frame.
 *
 * The rig write is local: `DanceFloor` sets `arm.position` on a group parented to the
 * character, so every pose this module produces has to be local too. `poseArms` solves
 * the same problem the same way — rotate the world offset by `-self.yaw` and treat
 * self as the origin — and this is that step, pulled out so
 * {@link resolveContact} can be reused unchanged.
 *
 * Everything else here is **frame-agnostic**: feed it world placements and the contact
 * comes back in world space, feed it `SELF` and this and it comes back rig-local. That
 * is deliberate, because the world answer is what a debug overlay wants and the local
 * one is what the rig needs.
 */
export function localPartner(out: Placement, self: Placement, partner: Placement): Placement {
  const dx = partner.x - self.x;
  const dz = partner.z - self.z;
  const c = Math.cos(self.yaw);
  const s = Math.sin(self.yaw);
  out.x = dx * c - dz * s;
  out.z = dx * s + dz * c;
  out.yaw = partner.yaw - self.yaw;
  return out;
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
