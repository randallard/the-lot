/**
 * Where a driven dancer's forearms go, and where they make contact.
 *
 * These caricatures have **no upper arms, necks or legs** — just the parts that
 * carry meaning (`services/body-shapes`). What this module must get right is
 * **contact**: which hand is on which forearm, where, and how the pair holds together
 * as they turn. Contact is the tactile channel (square-one F2), the thing future calls
 * layer more of, and the only part a dancer would actually feel.
 *
 * **The arm is two segments, and only the second one is drawn** (ADR-0017). The
 * shoulder is a fixed property of the body; the elbow is free; the upper arm between
 * them is undrawn and compliant. An {@link ArmPose} therefore names the **elbow**, not
 * an arm-group origin, and the rig pins the shoulder where the body puts it so that no
 * pose can move it. This module previously said it "does not model reach or
 * attachment" — it now models attachment and declines to model *reach* only where a
 * move authors it away. What it still does not do is forbid: a hand may be placed
 * further than the arm can go, the upper arm stretches to say so, and
 * {@link upperArmStrain} is how a test or an overlay reads it as a number.
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
 * - **Envelope.** Nothing in the engine says "pull your arms in", but two dancers
 *   passing shoulder to shoulder at lane spacing are close enough that arms left at
 *   shoulder width overlap. So every arm that isn't gripping is *limited* rather
 *   than owned: whatever pose it is in — resting, or mid-emote — it folds in by
 *   however much it trespasses on the partner's share of the gap, and springs back
 *   the moment there is room. Per arm, as each one arrives, which is what dancers do;
 *   nobody parks both arms for a whole pass. Feed it a resting arm and the fold is
 *   the plain tuck this started as.
 *
 * That distinction — **owned** for a gripped hand, **limited** for everything else —
 * is what lets a dancer keep emoting in a tight square instead of being frozen by
 * one. It is the load-bearing half of the pending ADR-0010 contract.
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
 * A posed forearm in its dancer's local space: **the elbow, and where the forearm
 * points from it**.
 *
 * `x`/`y`/`z` is the **elbow** — the near end of the only segment anybody draws — and
 * `aim` is the unit direction from it toward the hand. At rest the elbow hangs at
 * {@link ArmMetrics.elbowY} and the aim is straight down; a forearm grip lays it
 * horizontal. The driver writes both onto the rig's forearm group.
 *
 * **It used to be the arm group's origin — nominally the shoulder — and that was a
 * lie the model could not detect** (ADR-0017). Because the elbow was derived as
 * `origin + elbowReach · aim`, placing a hand anywhere meant sliding the origin to
 * wherever the arithmetic needed it, and the shoulder went with it: measured at bump
 * range it stood 0.34 behind the body. Nothing is drawn between shoulder and elbow, so
 * it looked like nothing, right up until the forearm's near end was inside the torso.
 * Naming the elbow removes the pretence — the shoulder is now a fixed property of the
 * body, pinned by the rig, and the undrawn upper arm spans whatever is left.
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

/** Which of a body's two authored hand shapes an arm is wearing. */
export type HandPoseName = "open" | "closed";

/** What the pose maths needs to know about one dancer's arm. */
export interface ArmMetrics {
  /**
   * World Y of the character group these arm-local coordinates are measured in.
   *
   * **Every other height in this interface is local to that group**, so two characters
   * whose groups sit at different world heights cannot share a raw height number. They
   * did, and it was a real defect: `Player`'s group sits at `BASE_Y` 0.75 with
   * `PLAYER_BODY_CENTER_Y` 0, while `Npc`'s sits at 0 with `NPC_BODY_CENTER_Y` 0.5, so a
   * fist bump put the two fists exactly 0.75 apart vertically — the player's hand up at
   * the NPC's head. It stayed invisible because every dancer inside `DanceFloor` has a
   * rig at 0, which is the only pairing the grip had ever been watched on.
   *
   * Dancers keep `0` and nothing about their geometry changes.
   */
  readonly rigOriginY: number;
  /** Which hand shape these metrics were measured on — `handRadius` and `handReach` both depend on it. */
  readonly handPose: HandPoseName;
  /** `|x|` of the arm group at rest — the shoulder's offset from the midline. */
  readonly restX: number;
  /** Height of the group's pivot: the shoulder. */
  readonly restY: number;
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
  /** The torso's own radius — this dancer's share of a tight gap. */
  readonly bodyRadius: number;
}

export function armMetrics(
  shape: CharacterBodyShape,
  bodyCenterY: number = NPC_BODY_CENTER_Y,
  rigOriginY: number = 0,
  handPose: HandPoseName = "open",
): ArmMetrics {
  const pos = computePositions(shape, bodyCenterY, handPose);
  const forearmHalfWidth = Math.max(shape.forearm.topRadius, shape.forearm.bottomRadius);
  const handRadius = shape.hand[handPose].radius;
  const armHalfWidth = Math.max(forearmHalfWidth, handRadius);
  const handReach = pos.shoulderY - pos.handCenterY;
  return {
    rigOriginY,
    handPose,
    restX: pos.forearmX,
    restY: pos.shoulderY,
    elbowReach: pos.upperArmLength,
    handReach,
    forearmSpan: handReach - pos.upperArmLength,
    forearmHalfWidth,
    handRadius,
    armHalfWidth,
    elbowY: pos.elbowY,
    bodyRadius: shape.body.radius,
  };
}

/**
 * The height a pair's joined forearms lie at: the mean of their resting elbows,
 * **in world space**.
 *
 * A horizontal forearm sits at elbow height, so this is where each dancer's own arm
 * would naturally be — and it has to be **one shared number**, or the hands aren't
 * on anything. The mean splits the difference: the shorter dancer's arm rides above
 * their own elbow, the taller one's below.
 *
 * **World, not local, and that distinction is load-bearing.** `elbowY` is measured in
 * each character's own group, so averaging two raw `elbowY`s produces a number that is
 * in neither frame. Every caller writing this onto a rig must localise it with
 * {@link localHeight}. Dancers all have `rigOriginY` 0, so nothing about the grip's
 * geometry changes — but the player and an NPC differ by 0.75, which is what put a fist
 * bump's two fists at visibly different heights. See {@link ArmMetrics.rigOriginY}.
 *
 * Still a placeholder with a known failure mode, and still step 3 of the
 * dancer-size brief: past a big enough height difference the real rule is that the
 * *taller* dancer does nearly all the accommodating, because an adult can drop their
 * arm to a child's height and the child cannot raise theirs to the adult's. Mixed
 * casts are meant to make that visible rather than hide it. That is a separate problem
 * from the frame bug and is **not** fixed by it.
 */
export function gripHeight(a: ArmMetrics, b: ArmMetrics): number {
  return (a.rigOriginY + a.elbowY + b.rigOriginY + b.elbowY) / 2;
}

/**
 * A world height, in `m`'s own rig-local frame — what a pose written onto that
 * character's arm group needs.
 *
 * The inverse is `m.rigOriginY + localY`. Trivial arithmetic, named because the bug it
 * exists to prevent is exactly the kind that looks right and measures wrong.
 */
export function localHeight(m: ArmMetrics, worldY: number): number {
  return worldY - m.rigOriginY;
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
 * and out around it. That is the one place in this module where the undrawn upper arm
 * is *deliberately* left to stretch and squash — a hold does not let go because the
 * bodies moved — and under ADR-0017 it is now visible as {@link upperArmStrain} rather
 * than hidden in a sliding origin. A bump makes the opposite choice
 * ({@link reachPose}): the shoulder is where the body is and the elbow bends.
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
  // From the pivot back along the axis: hand at `radius`, then the forearm to the
  // elbow. The undrawn upper arm carries on from there to the shoulder and is not
  // this function's business — see ADR-0017.
  const back = radius - m.forearmSpan;
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
 * How much an elbow prefers to swing **outward** rather than straight down, when the
 * solve leaves it a choice.
 *
 * A two-segment arm with both ends fixed leaves the elbow one degree of freedom: a
 * circle about the shoulder-to-hand axis. Every point on it is geometrically legal and
 * only one looks like an arm, so the tie is broken by preference rather than by maths.
 * Real elbows go out and down — mostly down, a little out — which is what this ratio
 * says. Tuned by eye against the fist bump; a number to watch, not one derived from
 * anything.
 */
export const ELBOW_SWING = 0.6;

/**
 * Put the hand at a named point and let the **elbow** find its own way there.
 *
 * This is ADR-0017's half of the arm: the shoulder is fixed where the body puts it, the
 * forearm is rigid, and the elbow is the joint that gives. Two links with both ends
 * pinned leave the elbow on a circle, so the solve is the textbook one — the elbow sits
 * where the two spheres intersect — and the remaining freedom around that circle is
 * settled by {@link ELBOW_SWING}.
 *
 * **Contrast with {@link gripPose}, and the contrast is the decision.** A grip pins the
 * arm to the *pivot between the pair* and lets the shoulder drift, because a hold must
 * survive the bodies breathing in and out. A reach pins the arm to its *own shoulder*
 * and lets the elbow bend, because a bump happens between two bodies that are standing
 * still and the authored contact point is the thing that must be honoured. Both were the
 * same function until the shoulder was measured 0.34 behind the body at bump range.
 *
 * **Out of range, the hand wins.** Past `elbowReach + forearmSpan` the elbow is placed a
 * forearm back along the line to the hand, so the hand lands exactly where it was asked
 * to and the undrawn upper arm stretches to cover the rest. That is deliberate: reach is
 * a rule a move *chooses*, not a gate the geometry imposes, and a lobbed fist is a move
 * that chooses to go without one. {@link upperArmStrain} is how far it went.
 *
 * `hand` is the hand's **centre**, in this dancer's rig-local space; `sign` picks the
 * shoulder, matching {@link restPose}.
 */
export function reachPose(
  out: ArmPose,
  m: ArmMetrics,
  sign: number,
  handX: number,
  handY: number,
  handZ: number,
): ArmPose {
  const sx = sign * m.restX;
  const sy = m.restY;
  const upper = m.elbowReach;
  const fore = m.forearmSpan;

  const vx = handX - sx;
  const vy = handY - sy;
  const vz = handZ;
  const d = Math.hypot(vx, vy, vz);

  // The hand is on the shoulder. No axis, no aim — hang the arm and let the strain
  // reading say the pose is nonsense, rather than inventing a direction.
  if (d < 1e-9) return restPose(out, m, sign);

  const ux = vx / d;
  const uy = vy / d;
  const uz = vz / d;

  if (d >= upper + fore) {
    out.x = handX - fore * ux;
    out.y = handY - fore * uy;
    out.z = handZ - fore * uz;
    out.aimX = ux;
    out.aimY = uy;
    out.aimZ = uz;
    return out;
  }

  // Where along the axis the elbow sits, and how far off it. Clamped because a hand
  // closer than `|upper − fore|` puts the cosine outside its range, and folding the
  // arm as far as it goes is a better answer there than NaN.
  const cos = clampUnit((d * d + upper * upper - fore * fore) / (2 * d * upper));
  const along = upper * cos;
  const off = upper * Math.sqrt(1 - cos * cos);

  // The swing direction: the preferred one, with its component along the axis removed
  // so what is left is perpendicular and the elbow stays on its circle.
  let px = sign * ELBOW_SWING;
  let py = -1;
  let pz = 0;
  const dot = px * ux + py * uy + pz * uz;
  px -= dot * ux;
  py -= dot * uy;
  pz -= dot * uz;
  let len = Math.hypot(px, py, pz);
  if (len < 1e-6) {
    // The preference is parallel to the axis — reaching straight down the swing
    // direction. Any perpendicular will do; take the outward one.
    px = 1 - ux * ux;
    py = -ux * uy;
    pz = -ux * uz;
    len = Math.hypot(px, py, pz);
    if (len < 1e-6) {
      out.x = sx + along * ux;
      out.y = sy + along * uy;
      out.z = along * uz;
      out.aimX = ux;
      out.aimY = uy;
      out.aimZ = uz;
      return out;
    }
  }

  const ex = sx + along * ux + (off * px) / len;
  const ey = sy + along * uy + (off * py) / len;
  const ez = along * uz + (off * pz) / len;
  out.x = ex;
  out.y = ey;
  out.z = ez;

  const ax = handX - ex;
  const ay = handY - ey;
  const az = handZ - ez;
  const alen = Math.hypot(ax, ay, az) || 1;
  out.aimX = ax / alen;
  out.aimY = ay / alen;
  out.aimZ = az / alen;
  return out;
}

/** Clamps to `[-1, 1]`, so a degenerate triangle folds instead of returning NaN. */
function clampUnit(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
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
 * The arm at rest: hanging straight down from its own shoulder.
 *
 * The elbow is directly under the shoulder at {@link ArmMetrics.elbowY}, which is
 * `restY − elbowReach` by construction — `body-shapes` derives both from the same
 * `upperArmSpacing`. So a rest pose has the upper arm at exactly its natural length and
 * {@link upperArmStrain} reads zero, which is the fixed point every other pose is
 * measured against.
 */
export function restPose(out: ArmPose, m: ArmMetrics, sign: number): ArmPose {
  out.x = sign * m.restX;
  out.y = m.elbowY;
  out.z = 0;
  out.aimX = 0;
  out.aimY = -1;
  out.aimZ = 0;
  return out;
}

/** Where this arm's shoulder is, in the dancer's local space. `sign` picks the side. */
export function shoulderOf(out: Vec3, m: ArmMetrics, sign: number): Vec3 {
  out.x = sign * m.restX;
  out.y = m.restY;
  out.z = 0;
  return out;
}

/**
 * The elbow in the **shoulder group's** own frame — what the nested forearm group's
 * `position` needs.
 *
 * A pose is rig-local and the forearm group hangs off a shoulder group pinned at
 * `(±restX, restY, 0)`, so the write site has to subtract one from the other. Named
 * rather than inlined for the same reason {@link localHeight} is: the two frame
 * conversions in this subsystem have each already produced a defect that looked right
 * and measured wrong, and an unnamed subtraction at a call site is where the last one
 * hid.
 */
export function elbowLocal(out: Vec3, pose: ArmPose, m: ArmMetrics, sign: number): Vec3 {
  out.x = pose.x - sign * m.restX;
  out.y = pose.y - m.restY;
  out.z = pose.z;
  return out;
}

/**
 * How far this pose stretches the undrawn upper arm past its natural length, in world
 * units. Zero when the arm is plausible; positive when the hand has been sent somewhere
 * the body cannot reach.
 *
 * **Instrumentation, not a clamp.** ADR-0017 keeps reach an authored rule rather than a
 * validity gate — a lobbed fist is a *deliberate* detachment, and a model that forbade
 * it would make a deliberate absurdity indistinguishable from an unhandled case. So
 * nothing here refuses; this is the number an overlay prints and a test asserts, which
 * is this subsystem's standing answer to "is the geometry real" (instrument for drift,
 * not values).
 *
 * Negative slack is reported as `0`: an elbow closer to the shoulder than rest is a bent
 * arm, which is ordinary, not strain.
 */
export function upperArmStrain(pose: ArmPose, m: ArmMetrics, sign: number): number {
  const dx = pose.x - sign * m.restX;
  const dy = pose.y - m.restY;
  const excess = Math.hypot(dx, dy, pose.z) - m.elbowReach;
  return excess > 0 ? excess : 0;
}

/**
 * Daylight an arm keeps from the space its partner is entitled to, so it starts
 * folding before it would collide rather than at the moment it would.
 *
 * Deliberately the same 0.06 the default frame scale leaves between passing
 * bodies: tight, because real dancers brush.
 */
export const PERSONAL_SPACE = 0.06;

/**
 * How far toward the partner this dancer's arm may reach, measured from their own
 * centre — their **proportional share of the gap**.
 *
 * Splitting the separation by body radius rather than in half is what makes the
 * bound both fair and provable. The two dancers' allowances sum to the whole
 * separation, so two arms that each honour their own can touch and cannot overlap,
 * whoever is bigger. And at the closest distance the frame permits — where
 * `separation` is the pair's `lateralClearance`, itself never less than the two body
 * radii — a dancer's share resolves to their own body radius, which is exactly the
 * old fixed tuck. The generalisation subsumes it rather than replacing it.
 */
export function reachAllowance(me: ArmMetrics, them: ArmMetrics, separation: number): number {
  const total = me.bodyRadius + them.bodyRadius;
  if (total <= 0) return separation / 2;
  return (separation * me.bodyRadius) / total;
}

/**
 * Fold an arm in until it stops trespassing — **whatever pose it is in**.
 *
 * This is the difference between owning an arm and limiting one, and it is the whole
 * reason an emoting dancer can still emote in a tight square. The engine owns a
 * *gripped* arm outright, because a hand holding someone has somewhere it must be.
 * A passing arm is only *limited*: the emote keeps writing it, and this slides the
 * whole arm group inward by however much its furthest point trespasses. An arm
 * swinging through a full-body emote therefore folds only while it is in the shared
 * space and springs back as it swings out — per arm, as each one arrives, which is
 * what dancers actually do. Nobody parks both arms for a whole pass.
 *
 * `dir` is the unit direction toward the partner in this dancer's local space, and
 * `allowance` comes from {@link reachAllowance}. Zero cost when the arm is nowhere
 * near: the excess is zero and the pose passes through untouched.
 */
export function constrainArm(
  pose: ArmPose,
  m: ArmMetrics,
  allowance: number,
  dirX: number,
  dirZ: number,
): ArmPose {
  // How far toward the partner the arm's furthest drawn point reaches. The elbow and
  // the hand bracket the forearm, so testing both ends bounds the whole segment — and
  // the pose *is* the elbow now (ADR-0017), so the near end needs no projection.
  const elbow = pose.x * dirX + pose.z * dirZ;
  const along = pose.aimX * dirX + pose.aimZ * dirZ;
  const hand = elbow + along * m.forearmSpan;
  const reach = Math.max(elbow, hand) + m.armHalfWidth + PERSONAL_SPACE;

  const excess = reach - allowance;
  if (excess <= 0) return pose;
  pose.x -= excess * dirX;
  pose.z -= excess * dirZ;
  return pose;
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
 * Three kinds of channel meet here, and the distinction is the contract:
 *
 * - **Owned.** A hand the engine has engaged. `blend` says how far into the grip it
 *   is ({@link advanceGripBlend}, the channel's only eased quantity), and at 1 the
 *   grip is written outright — an emote's contribution to that arm is dropped,
 *   because a hand holding someone has somewhere it must be.
 * - **Limited.** Every other arm. `proposed` is whatever the expression layer wants
 *   it doing — a wave, a full-body swing, nothing at all — and it plays, folded in
 *   only while and only as far as it trespasses on the partner's share of the gap
 *   ({@link constrainArm}). Pass a rest pose and the fold is the plain arm tuck.
 * - **Free.** Everything else about a dancer, which this function never touches.
 *
 * Two dancers only: a grip needs a partner, and resolving *which* partner in a
 * larger set is formation work the engine doesn't expose yet.
 */
export function poseArms(
  out: ArmPoses,
  me: ArmMetrics,
  them: ArmMetrics,
  self: Placement,
  partner: Placement,
  blend: GripBlend,
  proposed?: ArmPoses,
): ArmPoses {
  // The partner, in this dancer's local space: the direction their share of the gap
  // lies in, and half their offset is the pivot a grip is held over.
  const dx = partner.x - self.x;
  const dz = partner.z - self.z;
  const separation = Math.hypot(dx, dz);
  const c = Math.cos(self.yaw);
  const s = Math.sin(self.yaw);
  const localX = dx * c - dz * s;
  const localZ = dx * s + dz * c;
  const allowance = reachAllowance(me, them, separation);

  for (const side of ["left", "right"] as const) {
    // `+x` is the anatomical left group — see `DancerArmRigs`.
    const sign = side === "left" ? 1 : -1;
    const joined = blend[side];

    // Degenerate only if the pair are standing in the same spot, where any axis
    // is as good as another; use this arm's own side.
    const dirX = separation < 1e-6 ? sign : localX / separation;
    const dirZ = separation < 1e-6 ? 0 : localZ / separation;

    // The free end of the blend: what this arm is doing when it isn't holding on.
    // Limited, not owned — so it is constrained rather than replaced.
    const want = proposed?.[side];
    if (want === undefined) {
      restPose(_free, me, sign);
    } else {
      _free.x = want.x;
      _free.y = want.y;
      _free.z = want.z;
      _free.aimX = want.aimX;
      _free.aimY = want.aimY;
      _free.aimZ = want.aimZ;
    }
    constrainArm(_free, me, allowance, dirX, dirZ);

    if (joined <= 0) {
      blendPose(out[side], _free, _free, 0);
      continue;
    }
    gripPose(
      _joined,
      me,
      contactRadius(me, them),
      contactSeparation(me, them),
      localX / 2,
      localZ / 2,
      dirX,
      dirZ,
      // `gripPose` writes a rig-local pose, so the shared world height has to come back
      // into this dancer's frame. A no-op between two dancers (both rigs at 0) and not
      // between a player and an NPC.
      localHeight(me, gripHeight(me, them)),
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
  place(out.elbow, 0);
  place(out.hand, m.forearmSpan);
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
