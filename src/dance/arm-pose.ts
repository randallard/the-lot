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
 * Three poses:
 *
 * - **Hold.** A couple stands with its inside hands joined ("touch hands"), and where
 *   those hands are is a fact about two bodies rather than about the formation:
 *   {@link touchHold} solves the stance width, the contact height *and* how far off the
 *   midpoint the hands sit, all three from the pair's own shoulders and arms, and
 *   {@link touchPose} hangs each upper arm where its body puts it and folds the elbow
 *   back to suit. Nothing in either one is tuned.
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
 * without a renderer. Every function on the frame path fills a caller-owned result — the
 * frame loop allocates nothing. {@link touchHold} is the one exception and returns a fresh
 * object: it is a property of a *cast*, not of a frame, and its caller memoises it.
 */

import {
  NPC_BODY_CENTER_Y,
  computePositions,
  handDrawnMap,
  lateralClearance,
  rigidParts,
  type CharacterBodyShape,
  type Mat3,
  type RigidPart,
} from "../services/body-shapes";
import { passingWidth } from "./frame";

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
  /**
   * The hand's radius, for judging whether it really has hold of something.
   *
   * ⚠️ The radius of the **sphere the hand is made from**, before it is flattened and
   * rotated — so it is how *wide* a hand is, and not how far it reaches in any particular
   * direction. Anything asking "does this hand's surface reach that point" wants
   * {@link handRiseAlongUp} and {@link handMap}, not this.
   */
  readonly handRadius: number;
  /**
   * The hand as it is **drawn**, per side — {@link handDrawnMap} of this dancer's hand pose.
   *
   * Two entries because the mesh's own rotation is mirrored between the sides, so a
   * dancer's left hand and right hand are not the same shape in the same frame.
   */
  readonly handMap: { readonly left: Mat3; readonly right: Mat3 };
  /** Half the width of the arm's widest part, hand included — what a tuck hides. */
  readonly armHalfWidth: number;
  /** Resting elbow height — where this dancer's forearm sits when horizontal. */
  readonly elbowY: number;
  /** Waist height — where a couple's joined hands are carried. */
  readonly waistY: number;
  /** The torso's own radius — this dancer's share of a tight gap. */
  readonly bodyRadius: number;
  /**
   * The body and head as ADR-0012 {@link RigidPart}s, in **world** height (the rig
   * origin already added), for anything that has to keep out of this dancer.
   *
   * A radius is not enough for that and never was: a head can be wider than the torso
   * it sits on, can be offset sideways, and sits at a height a hand may or may not be
   * near. `bodyRadius` answers "how wide is the middle of them"; this answers "what is
   * in the way, and at what height" — which is the question a handhold between two
   * bodies is actually asking.
   *
   * Arms are deliberately absent, exactly as in `rigidParts`: they are articulated, and
   * a dancer's own arm passing through their own torso is a within-one-body cosmetic
   * matter (Ryan, 2026-08-17: *"sometimes arms will be set wide … that type of thing we
   * don't need to build for — just bodies heads and shoulders"*). What must not happen
   * is one dancer's hand inside the *other* dancer.
   */
  readonly parts: readonly RigidPart[];
}

/**
 * How far this body sticks out sideways at one height — the thing a hand at that
 * height has to clear.
 *
 * Height-aware for the same reason {@link lateralClearance} is: a big head costs
 * nothing at waist height, and a hold placed under it is not inside anybody. Each part
 * contributes the half-width of its own cross-section there, so a sphere narrows to
 * nothing at its poles instead of being treated as a column.
 */
export function sideExtentAt(
  parts: readonly RigidPart[],
  y0: number,
  y1: number = y0,
): number {
  const [lo, hi] = y0 <= y1 ? [y0, y1] : [y1, y0];
  let extent = 0;
  for (const p of parts) {
    const dy = Math.max(0, Math.max(p.y0 - hi, lo - p.y1));
    if (dy >= p.radius) continue;
    extent = Math.max(extent, Math.sqrt(p.radius * p.radius - dy * dy));
  }
  return extent;
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
  const parts = rigidParts(shape, bodyCenterY).map((p) => ({
    y0: p.y0 + rigOriginY,
    y1: p.y1 + rigOriginY,
    radius: p.radius,
  }));
  // **An arm hangs beside a body, not through it.** `forearmXOffset` is a layout slider and
  // knows nothing about the torso it is attached to, so a wide enough body swallows its own
  // arms: at radius 0.6 against Myco's 0.46 offset the shoulder — and the hand hanging from
  // it — is inside the chest, and every hold solved from that shoulder starts inside the
  // dancer. The editor stays free to say anything (Ryan, 2026-08-17: *"I want to keep body
  // composition as flexible as we have it … arms will be set wide, even"*); this is the
  // **dance's** reading of that shape, and the dance accommodates the body rather than the
  // other way round. Measured over the hanging arm's own span, so it clears whatever is
  // actually beside the arm — a sunken head included — and not the pole of the capsule the
  // shoulder happens to sit on. Widening only: an arm already outside its body stays where
  // the slider put it, which is every shipped cast.
  //
  // Measured over the **drawn** forearm, elbow to hand, rather than from the shoulder: a
  // head overhangs the shoulder on almost every cast (`headBodyGap` is negative by
  // default, so they overlap on purpose), and nobody holds their arms out to clear their
  // own jaw. What an arm has to hang clear of is what is beside the *arm*.
  const bodyBeside = sideExtentAt(parts, pos.handCenterY + rigOriginY, pos.elbowY + rigOriginY);
  return {
    rigOriginY,
    handPose,
    restX: Math.max(pos.forearmX, bodyBeside + armHalfWidth),
    restY: pos.shoulderY,
    elbowReach: pos.upperArmLength,
    handReach,
    forearmSpan: handReach - pos.upperArmLength,
    forearmHalfWidth,
    handRadius,
    handMap: {
      left: handDrawnMap(shape.hand[handPose], "left"),
      right: handDrawnMap(shape.hand[handPose], "right"),
    },
    armHalfWidth,
    elbowY: pos.elbowY,
    waistY: pos.waistY,
    bodyRadius: shape.body.radius,
    parts,
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
 * 🔴 **The known failure mode has an owner now, and it is not this function** (ADR-0033).
 * Past a big enough height difference the mean is a height one of them cannot reach at all —
 * an adult can drop an arm to a child's height and the child cannot raise theirs to the
 * adult's. On the shipped cast Ember's elbow rests 0.238 above the mean she shares with Myco
 * and her upper arm will not reach down that far, and `gripPose` posed her there anyway.
 *
 * This still answers **where the hold wants to be**, which is the right question for it to
 * answer and is unchanged. Whether the pair can get there, and what they do when they cannot,
 * is `forearm-hold.ts`'s `planForearm` — the same two accommodations the arch uses, because
 * they were never the arch's (ADR-0032). Callers that pose a forearm grip should take their
 * height from a plan; this remains the input to one.
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
 * How far off a couple's own width the pair may stand and still be read as holding
 * hands, as a fraction of that width.
 *
 * A tolerance rather than an equality, because the pair breathe: square-one's Partner
 * Trade bows them off their standing radius and back (its ADR-0013), and a couple mid-call
 * is a couple. Generous enough to survive that, tight enough that a facing pair at reach
 * distance is never mistaken for one.
 */
export const TOUCH_TOLERANCE = 0.35;

/**
 * How far a couple's heading may differ and still count as side by side, in radians.
 *
 * The check that distinguishes a **couple** from a **facing pair**. Two dancers a
 * hand's width apart pointing opposite ways are not holding hands, they are about to
 * collide — and without this the touch pose would fire on a Dosado's closest moment.
 */
export const TOUCH_FACING_TOLERANCE = 0.6;

/**
 * Are these two standing side by side, close enough to be holding hands?
 *
 * Ryan's "touch hands": a couple stands with inside hands joined, and the render should
 * show it. Decided from the **live placements** rather than from a formation flag,
 * because that is the same shape the rest of this module already uses — `reachAllowance`
 * and `constrainArm` both key off the separation they can see, and a renderer that had
 * to be told which formation it was drawing would be a renderer that could be told wrong.
 *
 * `width` is the couple's own standing width, which the caller knows and this module
 * does not.
 */
export function standingAsCouple(
  self: Placement,
  partner: Placement,
  width: number,
): boolean {
  const separation = Math.hypot(partner.x - self.x, partner.z - self.z);
  if (Math.abs(separation - width) > width * TOUCH_TOLERANCE) return false;
  const heading = Math.abs(
    Math.atan2(Math.sin(partner.yaw - self.yaw), Math.cos(partner.yaw - self.yaw)),
  );
  return heading <= TOUCH_FACING_TOLERANCE;
}

/**
 * Which of this dancer's hands is the **inside** one — the one a couple joins.
 *
 * The partner is on one side or the other; the inside hand is the one nearer them.
 * Derived from where they actually are, so it stays right through a turn rather than
 * being fixed at the moment the couple formed.
 */
export function insideSide(self: Placement, partner: Placement): "left" | "right" {
  const dx = partner.x - self.x;
  const dz = partner.z - self.z;
  // The partner's bearing in this dancer's local space. `+x` is the anatomical **left**
  // group on every dance rig (see `DancerArmRigs`), so a partner at `+x` is on the left.
  const localX = dx * Math.cos(self.yaw) - dz * Math.sin(self.yaw);
  return localX >= 0 ? "left" : "right";
}

/**
 * Which hand this dancer has joined by simply **standing** as half of a couple, or
 * `null` if they are not standing as one — {@link standingAsCouple} and
 * {@link insideSide} asked as the one question they are only ever asked together.
 *
 * Exported because two places need the same answer and must not each decide it:
 * {@link poseArms}, which puts the hand at the hold, and the debug scene's joint
 * markers, which claim to show where that hand went. The markers used to key off the
 * *engine's* grip spans alone, and a standing couple's hold is not one of those — so
 * every dot went dark for exactly the pose the elbow watch was about.
 *
 * A touch hold is not a grip and this is deliberately not `GripHand`: nothing here is
 * eased, nothing is owned, and the outside arm goes on doing whatever it was.
 *
 * `declared` skips the proximity question, for a hold the **figure** imposes rather than one
 * the placements reveal — square-one's `arch` spans (its ADR-0017). It has to be skipped
 * rather than loosened: a California Twirl's pair close to half their standing width and end
 * up facing opposite ways, so {@link standingAsCouple} says "not a couple" for most of a call
 * whose hands never come apart. Which hand is still read from the live placements, because
 * that stays true through a turn and a fixed answer would not.
 */
export function touchingSide(
  self: Placement,
  partner: Placement,
  hold: TouchHold | undefined,
  declared = false,
): "left" | "right" | null {
  if (hold === undefined) return null;
  if (declared) return insideSide(self, partner);
  return standingAsCouple(self, partner, hold.width) ? insideSide(self, partner) : null;
}

/**
 * A couple's handhold, solved for the pair: where the two palms meet, and how far
 * apart the two dancers stand to put them there.
 *
 * Three numbers rather than one, because the joined hands have three degrees of freedom
 * and **every one of them has to come from the bodies** if a mismatched pair is to hold
 * hands at all. Ryan, 2026-08-17: *"I want it to work with no new limitations — the
 * movement should accommodate the body size."*
 *
 * The one that was missing is {@link lateral}. Everything before this assumed the hands
 * meet at the couple's *midpoint* — the midpoint between their two **bodies**, which is a
 * body-agnostic answer for the same reason `COUPLE_WIDTH` is. The hands meet between the two
 * **inside shoulders** instead (ADR-0027), which is the same point for a matched pair and
 * moves with the bodies for every other one.
 */
export interface TouchHold {
  /** Centre-to-centre distance between the two dancers, in world units. */
  readonly width: number;
  /** World height of the contact between the two palms. */
  readonly height: number;
  /**
   * How far the joined hands sit off the couple's midpoint, **toward the belle** —
   * negative is toward the beau, zero for a matched pair.
   *
   * Halfway between the two inside shoulders, then clamped into the corridor between the
   * bodies (ADR-0027). Off the *bodies'* midpoint only because the two dancers' shoulders
   * are not the same distance in from their own centres.
   */
  readonly lateral: number;
  /**
   * How far **in front** of the pair the joined hands sit, along the way they are facing.
   *
   * Ryan, 2026-08-18: *"they should be held a little forward from where they are, as if the
   * upper arm is relaxed and hanging straight down."* That is the derivation, not just the
   * look: an elbow directly below its own shoulder is a relaxed upper arm, and a forearm
   * running from there to a hand at the hold has to spend its length on three axes. Whatever
   * it does not spend going across and going down, it spends going **forward** — so the
   * hands land in front of the bodies rather than in the plane through both of them, which
   * is where they used to be and where nobody's hands are.
   *
   * As far forward as the pair can *both* manage with the upper arm hanging, which is the
   * shorter of the two answers ({@link relaxedForward}); the other dancer's elbow swings
   * back to take up the slack, which is what an elbow is for.
   */
  readonly forward: number;
}

/**
 * How far the **drawn** hand reaches straight up (or down — it is symmetric) from its own
 * centre, for an arm aimed along `aim`.
 *
 * 🔴 The number `handRadius` was standing in for, and getting wrong. A hand is a sphere
 * flattened to `flattenZ` in its own z and then rotated ({@link handDrawnMap}), and the
 * forearm group turns the whole thing again to point along the arm. Where that leaves the
 * flat face is a property of the pose, not of the body: Myco's hand is 0.110 across but
 * only 0.025 thick, and on the standing couple his forearm aims **77% forward**, which
 * swings the thin axis most of the way to vertical and leaves him reaching 0.073 up
 * instead of 0.110. Stacking two palms by their radii left the drawn hands 0.0415 apart —
 * a gap Ryan could see and the tests called tangent (2026-08-18).
 *
 * **The whole of the frame change is `(aimX, −aimY, aimZ)`, which is worth the two lines it
 * takes to say why.** The forearm group's rotation is the *minimal* one taking `DOWN` to
 * `aim`; run world up back through its inverse and every trig term cancels, leaving the aim
 * with its y flipped. Check it on the easy ones: `aim = DOWN` gives back up, and an arm
 * aimed forward gives `+z`, the group's own forward.
 *
 * With `d` in the group's frame, the half-extent of an ellipsoid `M·(unit sphere)` along it
 * is `|Mᵀd|` — the length of `d` dotted through `M`'s columns.
 */
export function handRiseAlongUp(
  m: ArmMetrics,
  side: "left" | "right",
  aimX: number,
  aimY: number,
  aimZ: number,
): number {
  const h = m.handMap[side];
  const dx = aimX;
  const dy = -aimY;
  const dz = aimZ;
  const c0 = (h[0] ?? 0) * dx + (h[3] ?? 0) * dy + (h[6] ?? 0) * dz;
  const c1 = (h[1] ?? 0) * dx + (h[4] ?? 0) * dy + (h[7] ?? 0) * dz;
  const c2 = (h[2] ?? 0) * dx + (h[5] ?? 0) * dy + (h[8] ?? 0) * dz;
  return Math.hypot(c0, c1, c2);
}

/**
 * Which way this dancer's own hand centre sits from the contact, and how far: the beau's
 * palm is up and **underneath**, so his hand centre sits below the hold and the belle's
 * above. Ryan, 2026-08-15: *"beau right palm up and belle's left palm down."*
 *
 * The distance is the **drawn** hand's rise, so each dancer independently puts their own
 * palm *on* the contact plane — the beau's top surface and the belle's bottom surface both
 * land on `hold.height`, and the two hands meet there without either needing to know the
 * other's hand at all. That locality is the reason this is per-dancer and not a stack
 * height solved for the pair.
 *
 * `aim` is which way the forearm points; pass `DOWN` for an arm that has not been posed yet,
 * which is the seed the solve starts from.
 */
function palmOffset(
  m: ArmMetrics,
  isBeau: boolean,
  aimX: number,
  aimY: number,
  aimZ: number,
): number {
  const rise = handRiseAlongUp(m, isBeau ? "right" : "left", aimX, aimY, aimZ);
  return isBeau ? -rise : rise;
}

/** How far this dancer's inside hand sits below their own shoulder, given its own lift. */
function handDrop(m: ArmMetrics, height: number, lift: number): number {
  return m.rigOriginY + m.restY - (height + lift);
}

/**
 * How far forward this dancer's own hand ends up when their **upper arm hangs straight
 * down** — the relaxed arm, and the whole of Ryan's *"as if the upper arm is relaxed."*
 *
 * A hanging upper arm puts the elbow directly below the shoulder, at `elbowY`, with no
 * freedom left in it. From there the forearm is a fixed length reaching a hand that is
 * already committed to a lateral offset (`across`, ADR-0027's shoulder midpoint) and a
 * height (`handY`, the belle's waist plus this dancer's own palm). One axis is left, and the
 * leftover length goes into it: **forward**.
 *
 * Zero when the arm has nothing spare, which is the honest answer rather than a special
 * case — a dancer already at full stretch across and down cannot also hold their hands out
 * in front, and {@link touchReach} is what says so.
 */
function relaxedForward(m: ArmMetrics, across: number, handY: number): number {
  const drop = handY - (m.rigOriginY + m.elbowY);
  const spare = m.forearmSpan * m.forearmSpan - across * across - drop * drop;
  return Math.sqrt(Math.max(0, spare));
}

/** Scratch for {@link settleTouch}'s callers that only want the lift. */
const _settle = armPose();

/**
 * Settle one dancer's inside arm onto a hold: writes the pose, returns the lift — how far
 * their own hand centre ended up from the contact plane.
 *
 * **Iterated, because the two are each other's inputs.** Where the hand goes decides which
 * way the forearm points; which way it points decides how much hand lies between its centre
 * and the plane ({@link handRiseAlongUp}). Seeded with a hanging arm and settled — the same
 * shape as the height band's own fixed point, and for the same reason. Bounded, so a
 * pathological body cannot spin it, and the last `touchPose` is outside the loop so the pose
 * always matches the lift that is returned.
 *
 * `handX`/`handZ` are the contact point in **this dancer's** local frame; `height` is world.
 * Both dancers run this independently and neither needs the other's hand: each puts its own
 * palm *on* `height`, so they meet there.
 */
function settleTouch(
  out: ArmPose,
  m: ArmMetrics,
  isBeau: boolean,
  handX: number,
  handZ: number,
  height: number,
): number {
  const sign = isBeau ? -1 : 1;
  let lift = palmOffset(m, isBeau, 0, -1, 0);
  // Linear, at roughly a factor of ten a pass on every cast in the repo, from a first guess
  // that is out by about 0.04 — so a dozen passes is machine precision and the cap is there
  // for a body that misbehaves, not for the ones we have. Cheap enough to spend: this is a
  // handful of multiply-adds and two square roots per pass.
  for (let pass = 0; pass < 16; pass++) {
    touchPose(out, m, sign, handX, localHeight(m, height + lift), handZ);
    const next = palmOffset(m, isBeau, out.aimX, out.aimY, out.aimZ);
    const settled = Math.abs(next - lift) < 1e-12;
    lift = next;
    if (settled) break;
  }
  touchPose(out, m, sign, handX, localHeight(m, height + lift), handZ);
  return lift;
}

/**
 * The lift each dancer's inside hand ends up with at a candidate hold, in the **canonical
 * standing couple** — the stance the hold is solved for, before the pair start breathing.
 *
 * The couple's own geometry, in one place: each dancer's inside hand is `across` beyond their
 * own inside shoulder, on the side their partner is on, at `z` 0. `poseArms` derives the same
 * point from the *live* placements, which is what keeps a held hand on the pivot while the
 * bodies move; this is what the solve has to agree with at rest.
 */
function touchLifts(
  beau: ArmMetrics,
  belle: ArmMetrics,
  height: number,
  acrossBeau: number,
  acrossBelle: number,
  forward: number,
): { beau: number; belle: number } {
  return {
    beau: settleTouch(_settle, beau, true, -(acrossBeau + beau.restX), forward, height),
    belle: settleTouch(_settle, belle, false, acrossBelle + belle.restX, forward, height),
  };
}

/**
 * The horizontal distance from shoulder to hand left over once the drop is paid for, at
 * `f` of this dancer's reach. Zero when the drop alone uses the whole arm.
 */
function spanAt(m: ArmMetrics, drop: number, f: number): number {
  const r = f * m.handReach;
  return r > Math.abs(drop) ? Math.sqrt(r * r - drop * drop) : 0;
}

/**
 * How much daylight the joined hands keep between themselves and a shoulder: **their own
 * width**.
 *
 * The couple has to be wider than its wider member's shoulders or that dancer's inside
 * shoulder sits over the joined hands and the arm hangs dead vertical with no handhold
 * to see — which is where the engine's body-agnostic default left them (0.868 across
 * Myco's 0.920 shoulders). How much wider was the last eyeballed number here, `0.11`,
 * and this is the same number said properly: the pair of stacked hands is one hand
 * radius wide, so a hand's width of daylight is exactly enough to see that the hands are
 * *between* the dancers rather than under a shoulder. Derived, so it moves when a hand
 * does.
 */
function handDaylight(a: ArmMetrics, b: ArmMetrics): number {
  return Math.max(a.handRadius, b.handRadius);
}

/**
 * The narrowest stance that leaves somewhere to *put* the joined hands at a given
 * height: both bodies' cross-sections there, plus a hand's width of daylight off each.
 *
 * A pair that merely clears each other can still have no room for a handhold — two wide
 * dancers standing a hair apart have hands but nowhere between them for the hands to be.
 * The stacked pair of palms is one hand radius wide either side of the contact, so that
 * is what each body has to give back.
 *
 * **Narrowest, not roomiest.** Widening past this makes both dancers reach further for
 * no gain, so "as comfortable as possible" and "as close as the bodies allow" are the
 * same number, and the couple only stands wider when their shoulders ask for it.
 */
function corridorWidth(beau: ArmMetrics, belle: ArmMetrics, height: number): number {
  return (
    sideExtentAt(beau.parts, height) +
    sideExtentAt(belle.parts, height) +
    2 * handDaylight(beau, belle)
  );
}

/**
 * Solve a couple's handhold from the two bodies — the whole of what "touch hands" means
 * geometrically, in one pass, with nothing tuned.
 *
 * **Height: the belle's waist, and the beau lives with it.** Ryan, 2026-08-16 and again on
 * 2026-08-17 after watching it: *"the gent's job is to make the belle's job easier, even if
 * she's taller — so if a dancer chooses that side then they need to be the ones to pay
 * attention to the belle's comfortable hand position at the belle's waist — even if it looks
 * awkward — maintain opinionation that way."*
 *
 * This is a **dance** opinion, not a geometric one, and it is the reason the rule is not
 * symmetric. It costs something real and the cost is the point: on the debug cast the belle
 * is the taller dancer, so her waist (0.713) is nearly the beau's own *shoulder* height
 * (0.950), and his forearm comes out around 80° off vertical — nearly horizontal, reaching
 * across. Splitting the difference (the lower of the two waists) hangs both forearms neatly
 * at 16° and was briefly implemented here on exactly that reasoning. It was the wrong call:
 * it makes the picture tidier by quietly reassigning the accommodation to whoever is shorter,
 * and the beau's side is the side that carries it.
 *
 * It is a band rather than a point only because an arm has a length: no dancer
 * can put their inside hand lower than it hangs, or higher than they can lift it, and
 * the hold has to be somewhere both of them can put a hand. That is *reachability*, not
 * comfort — the rule this replaces also carried a comfort ceiling (`TOUCH_COMFORT`, 0.95
 * of the reach), and with a floor as well the permitted band for MYCO + EMBER was
 * **empty**, which is what produced the standing conclusion that this pairing could not
 * hold hands. Dropping the ceiling dissolves it: an arm that has
 * to hang straight to reach hangs straight, which is what the taller dancer's arm does
 * in every real pair of mismatched heights.
 *
 * **Width.** As wide as the wider shoulders plus {@link handDaylight} on each side, but never
 * wider than the **beau** can stand and still reach her hanging hand (a couple stands where
 * its hands can meet, and the reaching across is his), and never closer than the bodies allow.
 * On the default cast the first term wins and gives 1.140 — the same stance that landed on
 * 2026-08-16, now derived rather than fitted.
 *
 * "What the bodies allow" is two things, and it used to be a third thing that was neither:
 * the sum of the two torso radii, which allowed the pair to stand exactly flush and knew
 * nothing about heads. It is now ADR-0012's {@link lateralClearance} over both dancers'
 * {@link RigidPart}s plus {@link PERSONAL_SPACE} — the same height-aware clearance the rest
 * of the square uses, so a head wider than its torso counts and a head at a height nobody
 * is near does not — and, at the hold's own height, a {@link corridorWidth} wide enough to
 * put the hands in. **The square accommodates the bodies rather than the bodies being
 * assumed to fit the square** (Ryan, 2026-08-17: *"we want the square to accommodate in this
 * case"*).
 *
 * **Lateral: halfway between the two inside shoulders.** Ryan, 2026-08-18, looking at the
 * standing couple: *"they can move to the horizontal middle between the dancer's shoulders —
 * vertical level should be at the belle's waist — the body / head disproportion might affect
 * this but that's the general rule."* So the height keeps its opinion and the lateral loses
 * one: it is a landmark rather than a preference about whose arm does the work. On the
 * default cast that moves the hold from 0.210 toward the belle — which is her inside shoulder
 * exactly, the previous rule's answer — to **0.050**, and both dancers reach the same 0.160
 * across.
 *
 * It is off the couple's midpoint at all only because the two dancers' shoulders sit different
 * distances in from their own centres; a matched pair holds hands dead centre. The "body /
 * head disproportion" Ryan names is the corridor clamp below, which is what actually moves the
 * hold off this landmark, and only on bodies that leave it nowhere else to go.
 *
 * **The one thing that outranks the opinion is a body.** The lateral is finally clamped into
 * the corridor between the two of them, so the joined hands are never inside either dancer
 * however the preference came out. That clamp binds on exactly the casts the preference gets
 * wrong — a wide beau beside a narrow belle, where "her arm hangs and he covers the daylight"
 * puts the hold under his own shoulder, which on a wide enough body is a point inside his
 * chest.
 *
 * Deterministic and symmetric in the pair — both dancers must arrive at the same three
 * numbers or their hands are not on each other, which is why this is solved once by the
 * caller and handed to both.
 */
export function touchHold(beau: ArmMetrics, belle: ArmMetrics): TouchHold {
  const target = belle.rigOriginY + belle.waistY;

  // Everything below the height is a function *of* the height, and the height turns out to
  // be a function of them back — three ways round, now:
  //
  // - how far each dancer reaches **sideways** decides how much arm is left to reach *down*
  //   with, so the reachable band cannot be cut from the vertical alone;
  // - and which way that leaves each forearm **pointing** decides how much of the hand lies
  //   between its centre and the contact plane, which is where the hand centre goes.
  //
  // So this is a fixed point rather than a pass: place the hold, settle both arms onto it,
  // re-cut the band knowing what they cost, and stop when nothing moves. Bounded, so a
  // pathological body cannot spin it. Three passes settle every cast in the repo.
  let acrossBeau = 0;
  let acrossBelle = 0;
  let forward = 0;
  let lifts = { beau: palmOffset(beau, true, 0, -1, 0), belle: palmOffset(belle, false, 0, -1, 0) };
  let height = bandedHeight(beau, belle, target, acrossBeau, acrossBelle, lifts, forward);
  let solved = placeHold(beau, belle, height, lifts, forward);
  for (let pass = 0; pass < 12; pass++) {
    acrossBeau = solved.acrossBeau;
    acrossBelle = solved.acrossBelle;
    const nextLifts = touchLifts(beau, belle, height, acrossBeau, acrossBelle, solved.forward);
    const next = bandedHeight(beau, belle, target, acrossBeau, acrossBelle, nextLifts, solved.forward);
    const settled =
      Math.abs(next - height) < 1e-12 &&
      Math.abs(solved.forward - forward) < 1e-12 &&
      Math.abs(nextLifts.beau - lifts.beau) < 1e-12 &&
      Math.abs(nextLifts.belle - lifts.belle) < 1e-12;
    lifts = nextLifts;
    height = next;
    forward = solved.forward;
    solved = placeHold(beau, belle, height, lifts, forward);
    if (settled) break;
  }

  return { width: solved.width, height, lateral: solved.lateral, forward: solved.forward };
}

/**
 * The belle's waist, clamped into the height both of them can actually reach **given how
 * far sideways each of them already has to go**.
 *
 * The sideways part is why this takes `across`. An arm's reach is a sphere, not a plumb
 * line: a hand that is already 0.02 out to the side has less than its full length left to
 * go down, so a band cut from the vertical alone is a band the arms cannot always make.
 * That is the same shape of error as the couple's midpoint — one number standing in for a
 * constraint with two axes — and it showed up as four shipped pairs overshooting their arms
 * by 0.06% once the hold stopped being free to sit exactly under a shoulder.
 *
 * Floor and ceiling come last, after the waist, because they are *reachability* rather than
 * comfort: if the two bands do not overlap, the pair are too far apart in height to join
 * hands at her waist at all, and the honest answer is the nearest height the arms can make,
 * with {@link upperArmStrain} reporting what is left over.
 */
function bandedHeight(
  beau: ArmMetrics,
  belle: ArmMetrics,
  target: number,
  acrossBeau: number,
  acrossBelle: number,
  lifts: { beau: number; belle: number },
  forward: number,
): number {
  let floor = -Infinity;
  let ceiling = Infinity;
  for (const [m, across, palm] of [
    [beau, acrossBeau, lifts.beau],
    [belle, acrossBelle, lifts.belle],
  ] as const) {
    const shoulder = m.rigOriginY + m.restY;
    // What the arm has left for the vertical, once the sideways **and the forward** are paid
    // for. Three axes now, for the same reason it stopped being one: a reach is a sphere.
    const drop = Math.sqrt(
      Math.max(0, m.handReach * m.handReach - across * across - forward * forward),
    );
    floor = Math.max(floor, shoulder - drop - palm);
    ceiling = Math.min(ceiling, shoulder + drop - palm);
  }
  return Math.max(floor, Math.min(ceiling, target));
}

/** The stance, the off-midpoint offset and the forward offset for one candidate height. */
interface PlacedHold {
  readonly width: number;
  readonly lateral: number;
  readonly forward: number;
  readonly acrossBeau: number;
  readonly acrossBelle: number;
}

function placeHold(
  beau: ArmMetrics,
  belle: ArmMetrics,
  height: number,
  lifts: { beau: number; belle: number },
  forward: number,
): PlacedHold {
  // Vertical and forward both come out of the same reach, so the stance sees them as one
  // number: what is left over is what may be spent going sideways.
  const beauDrop = Math.hypot(handDrop(beau, height, lifts.beau), forward);
  const belleDrop = Math.hypot(handDrop(belle, height, lifts.belle), forward);

  // The stance. `shoulders` is the width a handhold wants; `arms` is as far apart as the
  // pair can stand and still **meet in the middle** of the daylight between their inside
  // shoulders, which is as far as the *shorter* of the two inside arms can go, twice;
  // `bodies` is the closest the pair can stand at all.
  const beauReach = spanAt(beau, beauDrop, 1);
  const belleReach = spanAt(belle, belleDrop, 1);
  const shoulders = 2 * (Math.max(beau.restX, belle.restX) + handDaylight(beau, belle));
  const arms = beau.restX + belle.restX + 2 * Math.min(beauReach, belleReach);
  const bodies = Math.max(
    // Nothing of one dancer inside the other, at any height — heads included.
    // 🔑 **The same width the figure will need to walk them past each other** (ADR-0044).
    // This used to add `PERSONAL_SPACE` where the figure multiplies by `CLEARANCE_MARGIN`, so a
    // couple whose bodies want more than 0.600 apart stood closer than they could pass.
    passingWidth(lateralClearance(beau.parts, belle.parts)),
    // And a corridor at the hold's own height wide enough to put the hands in.
    corridorWidth(beau, belle, height),
  );
  const width = Math.max(bodies, Math.min(shoulders, arms));

  // **The hands hang halfway between the two inside shoulders.** Ryan, 2026-08-18: *"they
  // can move to the horizontal middle between the dancer's shoulders … that's the general
  // rule."* The beau's inside shoulder is `beau.restX` in from his side of the stance and
  // the belle's is `belle.restX` in from hers, so the point between them sits off the
  // couple's own midpoint by half the difference: zero for a matched pair, and toward the
  // **narrower** dancer when the two are built differently, because a broader dancer's
  // inside shoulder reaches further into the gap.
  //
  // Two things fall out of it that the rule it replaces had to work for. It does not depend
  // on `width` at all — both shoulders move with the stance, so the middle between them
  // stays the middle — and it is the one point at which the two dancers reach the *same
  // distance* across, so neither of them can be handed the other's share of the daylight.
  const preferred = (beau.restX - belle.restX) / 2;

  // **And then the bodies get the last word.** Everything above is a preference about
  // whose arm does the work, computed from shoulders and reach — none of which knows
  // where a torso is. On a mismatched pair that preference walks the hold straight into
  // somebody: the joined hands land under the wider dancer's shoulder, and their shoulder
  // is inside their own chest. So the hold is finally clamped into the corridor between
  // the two bodies, which `width` above guarantees is wide enough to hold it.
  //
  // The clamp is the accommodation, and it outranks the preference on purpose: a hold
  // inside a dancer is not a hold, and no opinion about which dancer reaches can buy one.
  const clear = handDaylight(beau, belle);
  const floorX = -width / 2 + sideExtentAt(beau.parts, height) + clear;
  const ceilX = width / 2 - sideExtentAt(belle.parts, height) - clear;
  const lateral = Math.max(floorX, Math.min(ceilX, preferred));

  const acrossBeau = width / 2 + lateral - beau.restX;
  const acrossBelle = width / 2 - lateral - belle.restX;

  return {
    width,
    lateral,
    // **As far forward as both of them can hold with the upper arm hanging.** The shorter of
    // the two relaxed answers, because the longer-armed dancer can always fold an elbow back
    // to take up the slack and the shorter-armed one cannot conjure length. Same shape as the
    // height's own band: whichever demand binds, binds.
    forward: Math.min(
      relaxedForward(beau, acrossBeau, height + lifts.beau),
      relaxedForward(belle, acrossBelle, height + lifts.belle),
    ),
    acrossBeau,
    acrossBelle,
  };
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
 * How hard a **folded** elbow prefers to go backward rather than outward.
 *
 * Companion to {@link ELBOW_SWING}, and it exists because that one alone cannot answer a
 * folded arm: with the hand nearly below the shoulder the elbow's circle is
 * near-horizontal, the "down" preference is parallel to the axis, and projection deletes
 * it. Weighted by the fold, so it is ~0 for a reaching arm and dominant for a crumpled
 * one — see the note in {@link reachPose}.
 *
 * 🔴 **It went in for touch hands and touch hands no longer uses it.** A handhold now goes
 * through {@link touchPose}, where the answer comes from anatomy — the humerus hangs in
 * its own shoulder's plane — instead of from a weighting between two tuned directions.
 * What is left here is the case it was tuned against second-hand: a folded *reach*, which
 * the fist bump is not (it is nearly straight, so it has almost no circle to choose on).
 * That makes this a constant with no render-validated case behind it, exactly the state
 * {@link ELBOW_SWING} was in when a genuinely folded arm found it out.
 *
 * Characters face local `+z` (the `DancerArmRigs` convention), so backward is `−z`.
 */
export const ELBOW_BACK = 1.5;

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
  //
  // 🔴 **The backward term is what stops a folded arm pointing at the partner.** With
  // the hand nearly *below* the shoulder — which is where a couple's joined hands are —
  // the axis is near-vertical, so the elbow's circle is near-horizontal and the `-1`
  // above is almost entirely parallel to the axis. Projection removes it, and what
  // survives is the outward term alone, with a *positive* y residual. Touch hands landed
  // the beau's elbow at x 0.790 against a joined hand at 0.570: the undrawn upper arm
  // dead horizontal, the elbow outboard of the hand it was holding with, and the whole
  // arm reading as pointed at the belle. Ryan, watching it: *"the beau's arm is pointing
  // at the belle."*
  //
  // A real elbow folds **backward**, not outward — which is the one direction that is
  // always perpendicular to a vertical axis and so cannot be projected away. Scaled by
  // how folded the arm is, so it costs nothing where it is not needed: a nearly straight
  // arm has almost no circle to choose on, which is why the fist bump (render-validated
  // 2026-07-26) is untouched by this.
  //
  // Touch hands does not come through here any more — {@link touchPose} answers the same
  // question from the shoulder's own plane, with nothing tuned — so what this weighting
  // now serves is a folded *reach*. There is no such call yet.
  const fold = 1 - d / (upper + fore);
  let px = sign * ELBOW_SWING;
  let py = -1;
  let pz = -ELBOW_BACK * fold;
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

/**
 * How much of their own arm one dancer spends on a hold, as a fraction: 0 is a hand at the
 * shoulder, 1 is a straight arm, and above 1 is a hand the body cannot reach.
 *
 * The number {@link touchHold}'s split exists to equalise, and the one that says whether an
 * arm reads folded or stretched — so it belongs next to the solve rather than being
 * re-derived by every test and readout that wants it. Measured to this dancer's own hand
 * *centre*, stacking included, which is the distinction that hid a real over-extension
 * behind a plausible-looking 100%.
 */
export function touchReach(m: ArmMetrics, hold: TouchHold, isBeau: boolean): number {
  const across = hold.width / 2 + (isBeau ? hold.lateral : -hold.lateral) - m.restX;
  // Settled rather than assumed, so the readout is the arm the render poses and not an
  // arm whose hand is a sphere. Needs no partner: `across` is already in `hold`.
  const lift = settleTouch(
    _settle,
    m,
    isBeau,
    (isBeau ? -1 : 1) * (across + m.restX),
    hold.forward,
    hold.height,
  );
  return (
    Math.hypot(across, handDrop(m, hold.height, lift), hold.forward) / m.handReach
  );
}

/**
 * Put the hand at a named point with the **upper arm hanging by the body** — the pose a
 * resting handhold wants, and the one {@link ELBOW_SWING} and {@link ELBOW_BACK} were
 * being asked to guess at.
 *
 * Same two-link problem as {@link reachPose} and the same circle of legal elbows; the
 * difference is what breaks the tie. A reach breaks it with a *preference* — mostly down,
 * a little out, backward when folded — because a bump has no anatomy to appeal to. A
 * handhold does: **the humerus of a hanging arm stays in the plane of its own shoulder.**
 * Nobody lifts their elbow sideways to hold a hand; the elbow drops and swings back, and
 * the forearm comes forward to the join. So the elbow keeps the shoulder's lateral offset
 * exactly, which cuts the circle of legal elbows down to two points, and the one further
 * *back* is the fold. No tuned constant appears anywhere in it.
 *
 * That is the defect Ryan named on 2026-08-16 — *"the beau's arm is pointing at the belle"*
 * — closed at the source rather than counterweighted. `reachPose` put that elbow at x 0.790
 * against a joined hand at 0.570, outboard of the hand it was holding with, because with the
 * hand nearly *below* the shoulder the elbow's circle is near-horizontal and only the
 * outward term survived the projection. Here the outward term does not exist: the elbow
 * cannot leave the shoulder's plane, so it cannot get outboard of anything.
 *
 * Falls back to {@link reachPose} where the shoulder's plane cannot hold the elbow at all:
 * out of arm's reach, or a hand far enough out to the side that the elbow circle lies clear
 * of the plane. Both of the default cast's dancers stay in the plane; SPROUT reaching a tall
 * belle's waist at 100% of her own arm does not. That split is the right way round, and the
 * opposite of how the swing constants were tuned: **the straighter the arm, the smaller the
 * elbow's circle**, so a nearly straight arm gives a preference almost nothing to get wrong,
 * while the folded arms — where it had everything to get wrong, and did — are the ones that
 * now come through the anatomy.
 */
export function touchPose(
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

  const ax = handX - sx;
  const ay = handY - sy;
  const az = handZ;
  const d = Math.hypot(ax, ay, az);
  if (d < 1e-9 || d >= upper + fore) return reachPose(out, m, sign, handX, handY, handZ);

  // The elbow lies on both spheres, so its offset `e` from the shoulder satisfies
  // `a·e = (d² + upper² − fore²)/2` and `|e| = upper`. Pinning `e.x` to zero leaves a
  // line and a circle in the dancer's own (y, z) plane.
  const k = (d * d + upper * upper - fore * fore) / 2;
  const r = Math.hypot(ay, az);
  if (r < 1e-9) return reachPose(out, m, sign, handX, handY, handZ);
  const along = k / r;
  if (Math.abs(along) >= upper) return reachPose(out, m, sign, handX, handY, handZ);
  const off = Math.sqrt(upper * upper - along * along);

  // `n` points from the shoulder toward the hand within the plane; `p` is perpendicular to
  // it, and the two solutions are `±off` along `p`. Take the one with the elbow further
  // back: characters face local `+z`, so that is the smaller z.
  const ny = ay / r;
  const nz = az / r;
  const py = -nz;
  const pz = ny;
  const swing = pz > 0 ? -off : off;

  const ex = sx;
  const ey = sy + along * ny + swing * py;
  const ez = along * nz + swing * pz;
  out.x = ex;
  out.y = ey;
  out.z = ez;

  const bx = handX - ex;
  const by = handY - ey;
  const bz = handZ - ez;
  const blen = Math.hypot(bx, by, bz) || 1;
  out.aimX = bx / blen;
  out.aimY = by / blen;
  out.aimZ = bz / blen;
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
 * Tight, because real dancers brush.
 *
 * 🔴 **It used to say "deliberately the same 0.06 the default frame scale leaves between passing
 * bodies", and that stopped being true without anybody editing the sentence.** The frame's margin
 * is `CLEARANCE_MARGIN`, a **multiplier**; the two coincide only at a clearance of 0.600. The
 * claim survived because nothing checks a comment — and it cost a real defect, because the
 * couple's standing floor had been written from it (ADR-0044). That floor is
 * {@link passingWidth} now. **This constant is an arm's business and only an arm's**: how much
 * daylight a limb keeps before it folds, which is not a question about where two people stand.
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
  /**
   * The pair's handhold, when these two are a couple: {@link touchHold} of the two
   * bodies, solved once by the caller rather than per frame per arm.
   *
   * Supplied rather than inferred because its `width` is also the couple's width, and
   * square-one owns what that *is* (`COUPLE_WIDTH`, which a consumer with bodies may
   * override) — the caller is the one who has to tell the engine the same number it
   * draws. Absent means "not a couple", and nothing here joins any hands.
   */
  hold?: TouchHold,
  /**
   * Whether the **figure** says these two are holding hands, rather than their placements.
   *
   * Passed through to {@link touchingSide}. `false` — the default, and every use before the
   * arch — asks the placements, which is what a standing couple's hold is decided from.
   */
  declared = false,
  /**
   * The world height **this dancer's** joined forearm sits at, when a hold has been planned
   * for the pair.
   *
   * Absent is {@link gripHeight}: the mean of the two resting elbows, which is right for a
   * pair who can both reach it and asks the impossible of a mismatched one — the failure mode
   * that function's own doc has carried since the fist bump. `forearm-hold.ts` plans it, and
   * this is where the plan arrives (ADR-0033).
   *
   * 🔴 **Per dancer, and that is the point.** Under a break the two are given *different*
   * heights, and two forearms that are not on the same plane are a hold that has come apart —
   * the same trick the arch plays with `TouchHold`'s two heights, for the same reason.
   */
  forearmY?: number,
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

  // Standing hand in hand, when the pair are a couple rather than a facing pair. Only
  // the **inside** arm is claimed; the outside one goes on doing whatever it was.
  const inside = touchingSide(self, partner, hold, declared);

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
      if (side === inside && hold !== undefined) {
        // The hands meet at the solved hold — not at the midpoint, which is where this
        // used to put them and is only the same place for a matched pair. One palm rests on
        // the other: the beau's beneath, the belle's above. `settleTouch` puts each dancer's
        // own **drawn** palm on the contact plane and poses the arm with `touchPose`, so the
        // upper arm hangs where the body puts it and the elbow folds back rather than out.
        //
        // Who goes underneath is decided by which side each dancer's inside hand is,
        // not by role: the dancer whose inside hand is their **right** is the beau, and
        // the beau's palm is up. That keeps it true for any pairing (ADR-0012) — and it
        // is also how this dancer knows which way `hold.lateral` points without being
        // told, since the belle is simply the other one.
        const beau = side === "right";
        // `lateral` runs toward the belle: the belle is the partner if I am the beau and
        // is me if I am not, so the offset flips with the role and both dancers write the
        // same point on the floor.
        const offset = beau ? hold.lateral : -hold.lateral;
        // Settled **here**, against the live placements, rather than taken from the hold:
        // the pair breathe (square-one's Partner Trade bows them off their radius), which
        // turns the forearms, which moves how much hand is between centre and plane. A lift
        // frozen at the standing stance would let the hands drift apart through the move.
        // `+ hold.forward` on the dancer's own **local z**, which is the way they are facing.
        // A couple faces the same way, so both add the same thing to parallel axes and both
        // still write the same point on the floor — the hands come forward of the pair, not
        // forward of one of them.
        settleTouch(
          out[side],
          me,
          beau,
          localX / 2 + offset * dirX,
          localZ / 2 + offset * dirZ + hold.forward,
          hold.height,
        );
        continue;
      }
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
      // `gripPose` writes a rig-local pose, so the world height has to come back into this
      // dancer's frame. A no-op between two dancers (both rigs at 0) and not between a
      // player and an NPC.
      localHeight(me, forearmY ?? gripHeight(me, them)),
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
