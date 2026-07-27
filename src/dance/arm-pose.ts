/**
 * Where a driven dancer's forearms go, and where they make contact.
 *
 * These caricatures have **no upper arms, necks or legs** — just the parts that
 * carry meaning (`services/body-shapes`). So this module does not model reach or
 * attachment: an arm is not obliged to stay plausibly connected to a shoulder, and
 * trying to make it look connected is what made the first two attempts at a grip
 * wrong. What it must get right is **contact**: which hand is on which forearm,
 * where, and how the pair holds together as they turn. Contact is the tactile
 * channel (square-one F2), the thing future calls layer more of, and the only part a
 * dancer would actually feel.
 *
 * **The undrawn upper arm is the compliant link, and that is load-bearing design.**
 * A turning pair's separation is not constant — `arm-turn` walks the chords of its
 * orbit, so the bodies breathe in and out by about 0.46 world units every two beats.
 * The grip does **not** follow them: it is a rigid join, pinned to the pivot at a
 * fixed radius, that only rotates. The upper arm nobody draws is what takes up the
 * difference, exactly as a real one would. Two joined forearms that stretched and
 * squashed with the bodies would be the wrong model of a hold.
 *
 * Two poses:
 *
 * - **Grip.** square-one's `Motion.grips` names a hand and a span of beats. A
 *   forearm grip is two **horizontal, antiparallel** forearms lying along the line
 *   between the dancers, side by side and touching, each hand at the other's elbow.
 *   Not two arms aimed at a common point (attempt one: they stuck out sideways at
 *   each other), and not two vertical forearms (attempt two: side by side, but hands
 *   meeting hands instead of hand meeting elbow).
 * - **Tuck.** Nothing in the engine says "pull your arms in", but two dancers
 *   passing shoulder to shoulder at lane spacing are close enough that forearms
 *   hanging at shoulder width overlap. Real dancers narrow; here the near forearm
 *   slides into the torso, which is opaque and cannot cross over.
 *
 * Pure, and deliberately three.js-free: the driver hands over floor positions and
 * headings and eases its rig toward what comes back, so the geometry can be tested
 * without a renderer. Every function fills a caller-owned result — the frame loop
 * allocates nothing.
 */

import {
  NPC_BODY_CENTER_Y,
  computePositions,
  type CharacterBodyShape,
} from "../services/body-shapes";

/** A point in world space. Mutable so the frame loop can reuse it. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function vec3(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

/**
 * An arm group's placement in its dancer's local space.
 *
 * `aim` is the unit direction from the group's own origin toward the hand — the
 * direction the rig's arm chain runs. At rest it is straight down; a forearm grip
 * makes it horizontal. The driver turns it into the group's rotation.
 */
export interface ArmPose {
  x: number;
  y: number;
  z: number;
  aimX: number;
  aimY: number;
  aimZ: number;
}

/** A pose at the resting hang, for a caller to reuse. */
export function armPose(): ArmPose {
  return { x: 0, y: 0, z: 0, aimX: 0, aimY: -1, aimZ: 0 };
}

/** Both of a dancer's arms. */
export interface ArmPoses {
  readonly left: ArmPose;
  readonly right: ArmPose;
}

export function armPoses(): ArmPoses {
  return { left: armPose(), right: armPose() };
}

/** Where a dancer is standing and which way they are turned, on the floor. */
export interface Placement {
  x: number;
  z: number;
  /** three.js `rotation.y` — the heading `facingToRotationY` produces. */
  yaw: number;
}

/**
 * The hand square-one says is engaged. Its own `Hand` vocabulary includes
 * `"none"`, and `null` is "no grip span covers this beat" — both mean hands free,
 * and both fall through to the tuck by never matching a side.
 */
export type GripHand = "left" | "right" | "none" | null;

/** What the pose maths needs to know about one dancer's arm. */
export interface ArmMetrics {
  /** `|x|` of the arm group at rest — the shoulder's offset from the midline. */
  readonly restX: number;
  /** Height of the group's pivot: the shoulder. */
  readonly restY: number;
  /** `|x|` the group slides to when tucked, far enough in to be hidden. */
  readonly tuckX: number;
  /** Group origin → elbow, along the aim. The upper arm that isn't drawn. */
  readonly elbowReach: number;
  /** Group origin → hand centre, along the aim. */
  readonly handReach: number;
  /** Elbow → hand centre: the span a grip has to place. */
  readonly forearmSpan: number;
  /** Half the forearm's width — how far off the shared plane it sits in a grip. */
  readonly forearmHalfWidth: number;
  /** The hand's radius, for judging whether it really has hold of something. */
  readonly handRadius: number;
  /** Half the width of the arm's widest part, hand included — what a tuck hides. */
  readonly armHalfWidth: number;
  /** Resting elbow height — where this dancer's forearm sits when horizontal. */
  readonly elbowY: number;
}

export function armMetrics(
  shape: CharacterBodyShape,
  bodyCenterY: number = NPC_BODY_CENTER_Y,
): ArmMetrics {
  const pos = computePositions(shape, bodyCenterY);
  const forearmHalfWidth = Math.max(shape.forearm.topRadius, shape.forearm.bottomRadius);
  const handRadius = shape.hand.open.radius;
  const armHalfWidth = Math.max(forearmHalfWidth, handRadius);
  const handReach = pos.shoulderY - pos.handCenterY;
  return {
    restX: pos.forearmX,
    restY: pos.shoulderY,
    // Tucked so the arm's *widest* part — usually the hand — sits inside the torso
    // radius: as far out as it can be and still be covered. That bound is what
    // makes the tuck provably enough. `lateralClearance` (ADR-0012) is never less
    // than the two body radii, since every torso spans the same body centre, so
    // two arms hidden inside their torsos cannot reach each other at any distance
    // the square is allowed to pass at.
    //
    // Never further out than rest, so a narrow-bodied dancer tucks less rather
    // than swinging their arm outward to reach the body wall.
    tuckX: Math.min(pos.forearmX, Math.max(0, shape.body.radius - armHalfWidth)),
    elbowReach: pos.upperArmLength,
    handReach,
    forearmSpan: handReach - pos.upperArmLength,
    forearmHalfWidth,
    handRadius,
    armHalfWidth,
    elbowY: pos.elbowY,
  };
}

/**
 * The height a pair's joined forearms lie at: the mean of their resting elbows.
 *
 * A horizontal forearm sits at elbow height, so this is where each dancer's own arm
 * would naturally be — and it has to be **one shared number**, or the hands aren't
 * on anything. The mean splits the difference: the shorter dancer's arm rides above
 * their own elbow, the taller one's below.
 *
 * Still a placeholder with a known failure mode, and still step 3 of the
 * dancer-size brief: past a big enough height difference the real rule is that the
 * *taller* dancer does nearly all the accommodating, because an adult can drop their
 * arm to a child's height and the child cannot raise theirs to the adult's. Mixed
 * casts are meant to make that visible rather than hide it.
 */
export function gripHeight(a: ArmMetrics, b: ArmMetrics): number {
  return (a.elbowY + b.elbowY) / 2;
}

/**
 * How far from the pivot each dancer's **hand** sits in a forearm grip: half the
 * shorter of the two forearms.
 *
 * With equal forearms this is exactly hand-at-elbow both ways — the grip as
 * described. With unequal ones it cannot be both, because "my hand at your elbow"
 * and "your hand at my elbow" together force equal spans; half the shorter forearm
 * is the choice that keeps **both** hands on the partner's forearm, with the
 * longer-armed dancer reaching their partner's elbow exactly and the shorter-armed
 * one holding further up. Which is what people do.
 */
export function contactRadius(a: ArmMetrics, b: ArmMetrics): number {
  return Math.min(a.forearmSpan, b.forearmSpan) / 2;
}

/**
 * How far apart the two forearm *axes* lie, across the grip axis — and therefore
 * how far each dancer nudges off it: half this, each to their own side.
 *
 * Side by side and touching would be the sum of their half widths, but that is the
 * wrong thing to optimise: **the hands are what hold.** A dancer whose hand is
 * narrower than their own forearm (Ember, a 0.07 hand on a 0.10 forearm) cannot
 * reach across that much, and a hand hovering a visible gap from the forearm it is
 * supposedly gripping is worse than two forearms overlapping slightly. So the
 * separation is whichever is smaller: forearms touching, or the nearer reach of the
 * two hands.
 *
 * Half each, rather than each dancer contributing its own width, so the offsets
 * cancel: an even pair and a mismatched pair both keep the grip centred on the pivot
 * the couple turns about.
 */
export function contactSeparation(a: ArmMetrics, b: ArmMetrics): number {
  return Math.min(
    a.forearmHalfWidth + b.forearmHalfWidth,
    a.handRadius + b.forearmHalfWidth,
    b.handRadius + a.forearmHalfWidth,
  );
}

/**
 * Lay the named forearm horizontally into a grip.
 *
 * `pivot` and `dir` are in this dancer's local space, and `dir` is the unit
 * direction toward the partner — the axis the joined forearms lie along, which is
 * also the axis the pair rotates about the pivot on. The forearm runs *along* it,
 * hand leading, so the hand ends up on the partner's side of the pivot and the two
 * arms are antiparallel.
 *
 * Everything is placed from the **pivot**, never from the shoulder, which is what
 * makes the join rigid: `radius` and `separation` are pair constants, so the arm
 * keeps a fixed distance from the pivot and only turns while the bodies breathe in
 * and out around it.
 *
 * The lateral nudge is `up × dir`, half of {@link contactSeparation}: because the
 * partner's `dir` is this one's negated, that resolves to opposite sides of the axis
 * without either dancer needing to know which side the other picked.
 */
export function gripPose(
  out: ArmPose,
  m: ArmMetrics,
  radius: number,
  separation: number,
  pivotX: number,
  pivotZ: number,
  dirX: number,
  dirZ: number,
  height: number,
): ArmPose {
  // From the pivot back along the axis: hand at `radius`, then the forearm, then
  // the undrawn upper arm to the group's own origin.
  const back = radius - m.forearmSpan - m.elbowReach;
  const half = separation / 2;
  out.x = pivotX + back * dirX + half * dirZ;
  out.y = height;
  out.z = pivotZ + back * dirZ - half * dirX;
  out.aimX = dirX;
  out.aimY = 0;
  out.aimZ = dirZ;
  return out;
}

/**
 * Blend between two poses. `t` 0 is `from`, 1 is `to`.
 *
 * Used for engaging and releasing a grip, and **only** for that. A held grip must
 * be written exactly, never approached: the target moves fast in a turning dancer's
 * own frame, so easing *toward* it lags — and because each dancer's lag pivots on
 * their own shoulder rather than the shared pivot, a lagging pair slides against
 * each other and lets go. Measured before this was fixed: `hand↔pivot` wandered
 * 0.151–0.248 where it should be a constant 0.191, and the grip's `gap` went
 * positive (no contact at all) twice per breath.
 */
export function blendPose(out: ArmPose, from: ArmPose, to: ArmPose, t: number): ArmPose {
  const k = clamp01(t);
  out.x = from.x + (to.x - from.x) * k;
  out.y = from.y + (to.y - from.y) * k;
  out.z = from.z + (to.z - from.z) * k;
  // Normalised linear blend: the two aims here are at most a quarter turn apart, so
  // this is smooth and needs no great-circle machinery.
  const ax = from.aimX + (to.aimX - from.aimX) * k;
  const ay = from.aimY + (to.aimY - from.aimY) * k;
  const az = from.aimZ + (to.aimZ - from.aimZ) * k;
  const len = Math.hypot(ax, ay, az) || 1;
  out.aimX = ax / len;
  out.aimY = ay / len;
  out.aimZ = az / len;
  return out;
}

/**
 * Slide the named forearm toward the midline. `amount` 0 is the resting hang,
 * 1 is fully inside the torso.
 */
export function tuckPose(out: ArmPose, m: ArmMetrics, sign: number, amount: number): ArmPose {
  out.x = sign * (m.restX + (m.tuckX - m.restX) * amount);
  out.y = m.restY;
  out.z = 0;
  out.aimX = 0;
  out.aimY = -1;
  out.aimZ = 0;
  return out;
}

/** Fully tucked at or inside this multiple of the pair's passing clearance. */
export const TUCK_FULL_AT = 1.15;
/** Resting hang at or beyond this multiple of it. */
export const TUCK_CLEAR_AT = 2.0;

/**
 * How much the pair's closeness alone calls for a tuck, from their centre distance.
 *
 * Measured in multiples of the pair's own passing clearance (ADR-0012's
 * `lateralClearance`, reused here as a proximity yardstick rather than a spacing
 * rule) so that big dancers start narrowing sooner in absolute terms, which is
 * exactly when they need to. Smoothstepped: the arms ease in and out with the
 * approach instead of snapping at a threshold.
 */
export function tuckNearness(distance: number, clearance: number): number {
  if (clearance <= 0) return 0;
  const span = (TUCK_CLEAR_AT - TUCK_FULL_AT) * clearance;
  const t = clamp01((TUCK_CLEAR_AT * clearance - distance) / span);
  return t * t * (3 - 2 * t);
}

/** Past this much of the partner's direction lying to one side, that arm is fully exposed. */
const EXPOSURE_SATURATION = 0.5;

/**
 * How much *this* arm is the one in the way, from the partner's direction in the
 * dancer's local space.
 *
 * Only the forearm on the side the partner is passing needs to come in; the outside
 * arm keeps swinging, which is both what dancers do and what keeps the tuck from
 * reading as "the dancer put their arms away". `localX` is the local x of the unit
 * vector toward the partner, `sign` the arm's own side (`+1` = the group at `+x`).
 */
export function tuckExposure(localX: number, sign: number): number {
  return clamp01((localX * sign) / EXPOSURE_SATURATION);
}

/** How far each arm is into its grip: 0 free, 1 fully joined. */
export interface GripBlend {
  left: number;
  right: number;
}

export function gripBlend(): GripBlend {
  return { left: 0, right: 0 };
}

// Scratch for the two ends of a blend. Not reentrant, like everything else here.
const _free = armPose();
const _joined = armPose();

/**
 * Both of one dancer's arms for this instant: the whole decision, in the dancer's
 * own local space, **exact** — the driver writes it straight onto the rig.
 *
 * The engine's grip span reaches this through `blend` — how far each hand is into
 * joining or letting go, and the only eased quantity in the channel
 * ({@link advanceGripBlend}). An arm not holding anything answers instead to how
 * close the partner is and which side they are passing on. Everything else is a
 * function of where the dancers are *this* frame, and must not lag behind it.
 *
 * `passingDistance` is the pair's clearance from `lateralClearance` (ADR-0012).
 * Two dancers only: a grip needs a partner, and resolving *which* partner in a
 * larger set is formation work the engine doesn't expose yet.
 */
export function poseArms(
  out: ArmPoses,
  me: ArmMetrics,
  them: ArmMetrics,
  self: Placement,
  partner: Placement,
  passingDistance: number,
  blend: GripBlend,
): ArmPoses {
  // The partner, in this dancer's local space. Their bearing decides which arm is
  // in the way; half their offset is the pivot the pair grips over and turns about.
  const dx = partner.x - self.x;
  const dz = partner.z - self.z;
  const separation = Math.hypot(dx, dz);
  const c = Math.cos(self.yaw);
  const s = Math.sin(self.yaw);
  const localX = dx * c - dz * s;
  const localZ = dx * s + dz * c;
  const nearness = tuckNearness(separation, passingDistance);

  const bearingX = separation < 1e-6 ? 0 : localX / separation;

  for (const side of ["left", "right"] as const) {
    // `+x` is the anatomical left group — see `DancerArmRigs`.
    const sign = side === "left" ? 1 : -1;
    const joined = blend[side];
    // The free pose is where this arm belongs when it has nothing to hold. It is
    // also the far end of the release blend, so it is computed either way.
    tuckPose(_free, me, sign, nearness * tuckExposure(bearingX, sign));
    if (joined <= 0) {
      blendPose(out[side], _free, _free, 0);
      continue;
    }
    // Degenerate only if the pair are standing in the same spot, where any axis
    // is as good as another; use the gripping arm's own side.
    const dirX = separation < 1e-6 ? sign : localX / separation;
    const dirZ = separation < 1e-6 ? 0 : localZ / separation;
    gripPose(
      _joined,
      me,
      contactRadius(me, them),
      contactSeparation(me, them),
      localX / 2,
      localZ / 2,
      dirX,
      dirZ,
      gripHeight(me, them),
    );
    blendPose(out[side], _free, _joined, joined);
  }
  return out;
}

/**
 * Advance a grip blend one frame: `ease` toward joined on the hand the engine named,
 * toward free on the others, and **snap** at the ends.
 *
 * The snap is the point. A weight that merely approaches 1 leaves the arm
 * permanently a hair off its pivot, and a hair off is what slides.
 */
export function advanceGripBlend(blend: GripBlend, gripHand: GripHand, ease: number): GripBlend {
  for (const side of ["left", "right"] as const) {
    const target = gripHand === side ? 1 : 0;
    const next = blend[side] + (target - blend[side]) * clamp01(ease);
    blend[side] = Math.abs(target - next) < 1e-3 ? target : next;
  }
  return blend;
}

// ---------------------------------------------------------------------------
// Tracking: where the arms and their contacts actually ended up.
//
// The poses above are what the rig is told; these are what a dancer would feel.
// Kept separate and in world space because contact is a property of a *pair*, and
// because future calls (palm grips with Right and Left Grand, two-hand swings,
// stars) add contact kinds without changing what a posed forearm is.
// ---------------------------------------------------------------------------

/** A posed forearm in world space: the two ends that matter. */
export interface Forearm {
  readonly elbow: Vec3;
  readonly hand: Vec3;
}

export function forearm(): Forearm {
  return { elbow: vec3(), hand: vec3() };
}

/** Put a local {@link ArmPose} on the floor, as the segment it draws. */
export function trackForearm(
  out: Forearm,
  m: ArmMetrics,
  pose: ArmPose,
  self: Placement,
): Forearm {
  const c = Math.cos(self.yaw);
  const s = Math.sin(self.yaw);
  const place = (target: Vec3, along: number): void => {
    const lx = pose.x + pose.aimX * along;
    const lz = pose.z + pose.aimZ * along;
    target.x = self.x + lx * c + lz * s;
    target.y = pose.y + pose.aimY * along;
    target.z = self.z - lx * s + lz * c;
  };
  place(out.elbow, m.elbowReach);
  place(out.hand, m.handReach);
  return out;
}

/** Where a hand has hold of a forearm, and how well. */
export interface Contact {
  /** The point on the held forearm's axis that the hand is closest to. */
  readonly point: Vec3;
  /** How far along the held forearm: 0 at its elbow, 1 at its hand. */
  along: number;
  /**
   * Surface gap between hand and held forearm. Zero is a touch and **negative is
   * a hold** — a hand wrapping a forearm overlaps it.
   */
  gap: number;
}

export function contact(): Contact {
  return { point: vec3(), along: 0, gap: 0 };
}

/**
 * Resolve one hand against the forearm it is meant to be holding.
 *
 * Pure measurement, no clamping of the pose: if a call ever places a hand off the
 * end of the forearm it named, `along` pins to the end it missed and `gap` says how
 * badly. That is the reading a test or a debug overlay wants.
 */
export function trackContact(
  out: Contact,
  hand: Vec3,
  handRadius: number,
  held: Forearm,
  heldHalfWidth: number,
): Contact {
  const ax = held.hand.x - held.elbow.x;
  const ay = held.hand.y - held.elbow.y;
  const az = held.hand.z - held.elbow.z;
  const lengthSquared = ax * ax + ay * ay + az * az;
  const t =
    lengthSquared < 1e-12
      ? 0
      : clamp01(
          ((hand.x - held.elbow.x) * ax +
            (hand.y - held.elbow.y) * ay +
            (hand.z - held.elbow.z) * az) /
            lengthSquared,
        );
  out.point.x = held.elbow.x + ax * t;
  out.point.y = held.elbow.y + ay * t;
  out.point.z = held.elbow.z + az * t;
  out.along = t;
  out.gap =
    Math.hypot(hand.x - out.point.x, hand.y - out.point.y, hand.z - out.point.z) -
    (handRadius + heldHalfWidth);
  return out;
}

/** Clamps to `[0, 1]`, normalising `−0` to `0` on the way. */
function clamp01(v: number): number {
  return v > 0 ? (v > 1 ? 1 : v) : 0;
}
