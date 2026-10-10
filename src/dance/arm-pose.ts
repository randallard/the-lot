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
import { handLie, palmMap } from "./wrist";

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
  /**
   * The narrowest this arm may hang: its own body's half-width beside the arm, plus the
   * arm's own. The floor {@link tuckedRestX} clamps against, and the reason a tuck is not
   * always enough — an arm pulled in past this is an arm inside its owner's chest.
   */
  readonly tuckFloorX: number;
  /** Height of the group's pivot: the shoulder. */
  readonly restY: number;
  /** Group origin → elbow, along the aim. The upper arm that isn't drawn. */
  readonly elbowReach: number;
  /** Group origin → hand centre, along the aim. */
  readonly handReach: number;
  /** Elbow → hand centre: the span a grip has to place. */
  readonly forearmSpan: number;
  /**
   * How much of that span is **drawn** — the forearm mesh's own height.
   *
   * 🔴 **A forearm does not reach its own hand, and the difference is not small.** `Dancer`
   * draws a cylinder of `forearm.height` from the elbow and then leaves
   * `handForearmGap + radius` of air before the hand's centre, so the solid stops a good
   * fraction of the way short. Anything asking *where the arm is* — as opposed to where it
   * points — has to stop where the cylinder does, or it charges a partner for a span of
   * nothing.
   */
  readonly drawnSpan: number;
  /**
   * Shoulder → **wrist**, the reach a handhold is actually solved from.
   *
   * 🔑 **Not {@link handReach}, and the difference is a third of a forearm.** A hold joins two
   * *wrists*; the hands lie on top of each other beyond them ({@link handLie}). So the arm that
   * has to get somewhere ends at the wrist, and the `handForearmGap + handRadius` past it is
   * hand, not reach. A stance cut from `handReach` credits every dancer with that much more
   * arm than they have to place.
   */
  readonly wristReach: number;
  /** Half the forearm's width — how far off the shared plane it sits in a grip. */
  readonly forearmHalfWidth: number;
  /**
   * The forearm's radius at each end: **at the elbow** and **at the wrist**.
   *
   * 🔴 **A forearm tapers, and where it is thin is exactly where a handhold happens.** Ember's
   * runs 0.100 at the elbow to 0.025 at the wrist — a factor of four — and
   * {@link forearmHalfWidth}, which is the wider of the two, is the right answer for a grip in
   * mid-forearm and wrong by 0.075 at the wrist. That is most of a hand.
   */
  readonly forearmElbowRadius: number;
  readonly forearmWristRadius: number;
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
    tuckFloorX: bodyBeside + armHalfWidth,
    restY: pos.shoulderY,
    elbowReach: pos.upperArmLength,
    handReach,
    forearmSpan: handReach - pos.upperArmLength,
    drawnSpan: shape.forearm.height,
    wristReach: pos.upperArmLength + shape.forearm.height,
    forearmHalfWidth,
    forearmElbowRadius: shape.forearm.topRadius,
    forearmWristRadius: shape.forearm.bottomRadius,
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
 * Derived from where they actually are, which is the right question for a couple the
 * *placements* reveal: two dancers who drift around each other really do change which
 * hand is nearer.
 *
 * 🔴 **And the wrong question for a hold a figure imposes** (ADR-0056). A bearing is
 * measured in the dancer's own frame, so it moves when *either* the partner moves or the
 * dancer turns — and a California Twirl does both at once, deliberately and out of phase.
 * The belle walks the diameter at a steady 180° while the beau bows around his arc, so the
 * partner's bearing crosses her midline at beat ~1.1 and crosses back at ~2.9: her joined
 * hand is re-labelled twice mid-figure, and her free arm with it. The two rotations cancel
 * exactly at the ends — she reads `left` at beat 0 and `left` at beat 4 — which is what
 * makes the swap a phase error rather than a change of side, and what makes the figure's
 * own answer the one to trust. See {@link touchingSide}.
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
 * Whether a hold is the **figure's** rather than the placements', and — when the figure
 * says so — which hand it engages.
 *
 * Three states, because there are three: `false` is an undeclared pair, whose hold is read
 * off where they are standing; `true` is a hold declared without a hand, which still has to
 * skip the proximity gate but has nothing better than the placements to name a side with;
 * and a hand names it outright.
 */
export type DeclaredHold = boolean | "left" | "right";

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
 * whose hands never come apart.
 *
 * 🔑 **And when the figure names the hand, that is the answer** (ADR-0056). square-one's
 * {@link GripSpan} carries the hand it engages and holds it for the life of the span — beau's
 * right, belle's left, beat 0 to 7.5 across two whole Twirls — because the engine is what
 * knows which figure is being danced. Deriving it from the placements instead re-labelled the
 * belle's joined hand twice mid-Twirl (see {@link insideSide}), which swapped her free arm
 * onto the other side of her body and, because {@link poseArms} reads the role off the same
 * side, briefly made **both** dancers the beau — two palms up, and `lateral` applied in the
 * same direction by both, so the pair wrote two different contact points for one hold.
 *
 * 🔑 **A named hand is preferred over a latch for one reason: seeking.** A latch would have to
 * be seeded on the first frame of the hold, and `#review` jumps straight to a beat — landing
 * at `under-arch` would have latched the swapped value and preserved the defect in the one
 * instrument built to watch it.
 */
export function touchingSide(
  self: Placement,
  partner: Placement,
  hold: TouchHold | undefined,
  declared: DeclaredHold = false,
): "left" | "right" | null {
  if (hold === undefined) return null;
  if (declared === "left" || declared === "right") return declared;
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
  /**
   * Where each dancer's **inside arm** hangs at this stance — their `restX`, tucked in to
   * whatever room the couple's width left (ADR-0049, {@link tuckedRestX}).
   *
   * Reported rather than re-derived because the render, the arch and the readout all have
   * to pose the same arm the solve did: a shoulder placed from the authored `restX` while
   * the hold was solved from a tucked one is the two-numbers-for-one-thing defect that
   * ADR-0045 was written about.
   */
  readonly insideBeau: number;
  readonly insideBelle: number;
  /**
   * How far this hold has **risen out of the hang**, `0`–`1` — `0` (or absent) for the standing
   * handhold every solver in this module was written for, `1` for a fully raised arch.
   *
   * 🔑 **A number rather than a kind**, for the same reason the arch's height and lateral are
   * numbers: an arch *is* a standing handhold that has gone up — `DanceFloor` builds one by
   * lerping this hold's own fields — so anything that switched on "is this an arch" would pop
   * the elbow across halfway through the rise. Passed to {@link touchPose} as its `raised`,
   * where it turns the elbow up its own circle (ADR-0058) exactly as fast as the hands climb.
   *
   * 🔑 **On the hold rather than beside it, because the two dancers have to agree.** One arm
   * standing its humerus up while the other's still hangs is one hold posed by two anatomies.
   */
  readonly raised?: number;
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
  // 🔴 **The hand as *turned*, not as authored** (ADR-0052). The rise decides where a palm
  // surface sits, and since the wrist landed, where a palm faces is a property of the pose:
  // a hand that has rolled its flat face level rises by its thickness, and the same hand
  // unturned rises by its width. Reading `m.handMap` here instead would be the identical
  // mistake `handRadius` used to make one level down — a number that describes a hand nobody
  // is drawing.
  const h = palmMap(m.handMap[side], aimX, aimY, aimZ);
  const dx = aimX;
  const dy = -aimY;
  const dz = aimZ;
  const c0 = (h[0] ?? 0) * dx + (h[3] ?? 0) * dy + (h[6] ?? 0) * dz;
  const c1 = (h[1] ?? 0) * dx + (h[4] ?? 0) * dy + (h[7] ?? 0) * dz;
  const c2 = (h[2] ?? 0) * dx + (h[5] ?? 0) * dy + (h[8] ?? 0) * dz;
  return Math.hypot(c0, c1, c2);
}

/**
 * How far the **drawn** hand reaches from its own centre along an arbitrary direction, for an
 * arm aimed along `aim`. {@link handRiseAlongUp} generalised off world up.
 *
 * Same ellipsoid and the same `|Mᵀd|`; the only new work is getting `d`. World up has the
 * closed form `(aimX, −aimY, aimZ)` because every trig term cancels for that one direction,
 * and no other direction is so lucky — so this builds the forearm group's rotation (the
 * *minimal* one taking `DOWN` to `aim`) and runs `u` back through its inverse.
 *
 * 🔑 **Why a general direction is wanted at all.** A hand is an ellipsoid, so "how big is it"
 * has no single answer — Myco's is 0.110 across and 0.025 thick. Asking whether a partner's
 * forearm has entered a palm means asking how far the palm reaches *toward that forearm*, and
 * answering with `handRadius` would be the exact mistake ADR-0052's note calls out one level
 * down: a number that describes a hand nobody is drawing.
 *
 * `u` is in the **dancer's own frame**, the same frame `aim` is in. It need not be a unit
 * vector; it is normalised here.
 */
export function handExtentAlong(
  m: ArmMetrics,
  side: "left" | "right",
  aimX: number,
  aimY: number,
  aimZ: number,
  ux: number,
  uy: number,
  uz: number,
): number {
  const un = Math.hypot(ux, uy, uz);
  if (un < 1e-12) return 0;
  const [dx, dy, dz] = intoForearmFrame(aimX, aimY, aimZ, ux / un, uy / un, uz / un);
  const h = palmMap(m.handMap[side], aimX, aimY, aimZ);
  const c0 = (h[0] ?? 0) * dx + (h[3] ?? 0) * dy + (h[6] ?? 0) * dz;
  const c1 = (h[1] ?? 0) * dx + (h[4] ?? 0) * dy + (h[7] ?? 0) * dz;
  const c2 = (h[2] ?? 0) * dx + (h[5] ?? 0) * dy + (h[8] ?? 0) * dz;
  return Math.hypot(c0, c1, c2);
}

/**
 * The vector from a dancer's **wrist** to their hand's centre, in the dancer's own frame.
 *
 * 🔑 **This is where the hand actually is**, and until 2026-09-13 nothing asked. The hand was
 * drawn on the forearm's axis, so `elbow + forearmSpan · aim` was both the end of the arm's
 * line and the hand's centre. Since the wrist turns the hand ({@link handLie}), the centre
 * swings around the wrist with it, and the two stop being the same point.
 *
 * The length is `forearmSpan − drawnSpan` — `handForearmGap + handRadius`, the dead span the
 * cylinder does not cover. With an identity wrist the direction comes back as `aim` and this
 * adds up to the old placement exactly.
 */
export function handOffset(
  out: Vec3,
  m: ArmMetrics,
  side: "left" | "right",
  aimX: number,
  aimY: number,
  aimZ: number,
): Vec3 {
  const reach = m.forearmSpan - m.drawnSpan;
  const lie = handLie(m.handMap[side], aimX, aimY, aimZ);
  const [x, y, z] = outOfForearmFrame(aimX, aimY, aimZ, lie[0], lie[1], lie[2]);
  out.x = x * reach;
  out.y = y * reach;
  out.z = z * reach;
  return out;
}

/** Scratch for {@link handCentre}, which is called inside solves that must not allocate. */
const _lie = vec3();

/**
 * Where a posed arm's hand **centre** sits, in the dancer's rig-local space.
 *
 * The wrist is on the forearm's axis at {@link ArmMetrics.drawnSpan}; the hand hangs off it.
 * One derivation, used by the render, the measurements and the solve alike — the rule this
 * module keeps relearning is that a second opinion about where a hand is becomes a hold that
 * comes apart.
 */
export function handCentre(
  out: Vec3,
  m: ArmMetrics,
  side: "left" | "right",
  pose: ArmPose,
): Vec3 {
  handOffset(_lie, m, side, pose.aimX, pose.aimY, pose.aimZ);
  out.x = pose.x + pose.aimX * m.drawnSpan + _lie.x;
  out.y = pose.y + pose.aimY * m.drawnSpan + _lie.y;
  out.z = pose.z + pose.aimZ * m.drawnSpan + _lie.z;
  return out;
}

/**
 * A unit direction in the **forearm group's** frame, expressed in the dancer's — `Ru`, the
 * inverse of {@link intoForearmFrame} and the same Rodrigues with the sine term unflipped.
 */
function outOfForearmFrame(
  aimX: number,
  aimY: number,
  aimZ: number,
  vx: number,
  vy: number,
  vz: number,
): readonly [number, number, number] {
  const an = Math.hypot(aimX, aimY, aimZ);
  if (an < 1e-12) return [vx, vy, vz];
  const ax = aimX / an, ay = aimY / an, az = aimZ / an;
  const kx = -az, ky = 0, kz = ax;
  const sin = Math.hypot(kx, ky, kz);
  if (sin < 1e-12) return ay < 0 ? [vx, vy, vz] : [vx, -vy, -vz];
  const cos = -ay;
  const nx = kx / sin, ny = ky / sin, nz = kz / sin;
  const dot = nx * vx + ny * vy + nz * vz;
  const cx = ny * vz - nz * vy;
  const cy = nz * vx - nx * vz;
  const cz = nx * vy - ny * vx;
  return [
    vx * cos + cx * sin + nx * dot * (1 - cos),
    vy * cos + cy * sin + ny * dot * (1 - cos),
    vz * cos + cz * sin + nz * dot * (1 - cos),
  ];
}

/**
 * A unit direction in the dancer's frame, expressed in the **forearm group's** frame — `Rᵀu`,
 * where `R` is the minimal rotation taking `DOWN` to `aim`.
 *
 * Rodrigues about `DOWN × aim` by `−θ`. The two degenerate axes are the ones the cross product
 * loses: an arm hanging straight down needs no rotation at all, and one pointing straight up is
 * a half turn, taken about `x` because any horizontal axis gives the same answer for a body of
 * revolution about the forearm.
 */
function intoForearmFrame(
  aimX: number,
  aimY: number,
  aimZ: number,
  ux: number,
  uy: number,
  uz: number,
): readonly [number, number, number] {
  const an = Math.hypot(aimX, aimY, aimZ);
  if (an < 1e-12) return [ux, uy, uz];
  const ax = aimX / an;
  const ay = aimY / an;
  const az = aimZ / an;
  // DOWN × aim, with DOWN = (0, −1, 0).
  const kx = -az;
  const ky = 0;
  const kz = ax;
  const sin = Math.hypot(kx, ky, kz);
  if (sin < 1e-12) return ay < 0 ? [ux, uy, uz] : [ux, -uy, -uz];
  const cos = -ay;
  // Rodrigues by −θ: the sine term changes sign, the cosine term does not.
  const nx = kx / sin;
  const ny = ky / sin;
  const nz = kz / sin;
  const dot = nx * ux + ny * uy + nz * uz;
  const cx = ny * uz - nz * uy;
  const cy = nz * ux - nx * uz;
  const cz = nx * uy - ny * ux;
  return [
    ux * cos - cx * sin + nx * dot * (1 - cos),
    uy * cos - cy * sin + ny * dot * (1 - cos),
    uz * cos - cz * sin + nz * dot * (1 - cos),
  ];
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
 * height (`handY`, the aimed hold plus this dancer's own palm). One axis is left, and the
 * leftover length goes into it: **forward**.
 *
 * Zero when the arm has nothing spare, which is the honest answer rather than a special
 * case — a dancer already at full stretch across and down cannot also hold their hands out
 * in front, and {@link touchReach} is what says so.
 */
function relaxedForward(m: ArmMetrics, across: number, wristY: number): number {
  const drop = wristY - (m.rigOriginY + m.elbowY);
  // 🔑 **The drawn span, because what the forearm has to reach is the wrist.** The hand past
  // it swings on the wrist rather than extending the arm, so it is not length this link can
  // spend going forward.
  const spare = m.drawnSpan * m.drawnSpan - across * across - drop * drop;
  return Math.sqrt(Math.max(0, spare));
}

/** Scratch for {@link settleTouch}'s callers that only want the lift. */
const _settle = armPose();

/** Scratch for the hand's swing off the wrist, inside the settle. */
const _hang = vec3();

/** Scratch for {@link settleTouch}'s iterate — the wrist's offset from the hand it is placing. */
const _off = vec3();
const _next = vec3();

/** Scratch for the Newton solve in {@link settleTouch}. Module-scoped: this is a frame path. */
const _F = vec3();
const _Ftrial = vec3();
/** The 3×3 Jacobian of `F`, row-major: `_jac[r * 3 + c]` is `∂F_r / ∂off_c`. */
const _jac = new Float64Array(9);

/**
 * How many passes {@link settleTouch} gets to settle its wrist.
 *
 * 🔴 **This bound is not what is wrong, and raising it does not help — measured.** Since the
 * iterate became a vector (ADR-0054) **26 of 50 arms run the budget out without converging**,
 * and the residual is concentrated in the two components the vector added: `|dy|` lands at
 * 1e-12 or better while `|dx|` and `|dz|` sit at 1e-2. The old scalar iterate solved `y`
 * alone and solved it well; `x` and `z` are a fixed point this damping does not hold.
 *
 * Tried and measured, so nobody pays for them twice: raising the bound to 48 (buys only the
 * genuinely-slow minority, costs ~50% solver time), persistent adaptive damping
 * `w ← w/2` (worst residual 1.7e-1 → 4.5e-2, still not converging — and it *stalls*, because
 * `|g(x) − x|` does not shrink when the step does, so the weight collapses to its floor), and
 * disabling the ±face flip in {@link wristRotation} on the suspicion it was a discontinuity
 * (26 → 25 at the bound; it is not the cause).
 *
 * 🔑 **What it wants is a root-find on `F(x) = g(x) − x`, not a damped iteration** — the gain
 * exceeds 1 because the hand sits a `dead` span out on a lever from the wrist, so moving the
 * wrist sideways swings the hand further back the other way. That is the next piece of work.
 * Left at 24 deliberately: the arms that matter are wrong at any bound, and the pin that
 * catches it is left failing rather than bought off.
 */
const SETTLE_PASSES = 12;

/**
 * How near `F(off) = 0` has to get before {@link settleTouch} calls the wrist settled.
 *
 * Tight because the pins that read this are tight, and a Newton step that is converging gets
 * here in one or two more passes anyway — the cost of the last few digits is nearly nothing
 * once the quadratic regime starts.
 */
const SETTLE_TOLERANCE = 1e-12;

/** Forward-difference step for the Jacobian, in world units. */
const SETTLE_DIFF = 1e-6;


/**
 * Where one dancer's inside hand ends up on a hold, as a **lift off the contact plane and
 * the direction the forearm is pointing** — {@link settleTouch}'s answer, for callers
 * outside this module.
 *
 * Exists because these numbers are the whole of whether a handhold reads as one. The lift
 * says how far the hand centre sits from the contact (`hold.height + lift`, signed so the
 * beau's is below and the belle's above); the pose's aim says which way the palm is facing,
 * because the hand's orientation is the forearm's. A measurement that took only the lift
 * would report two palms tangent and say nothing about whether they are tangent *face to
 * face* or edge to edge.
 *
 * 🔑 **The whole pose, not just the aim, because a forearm has to get to its hand.** The
 * elbow is `pose.x/y/z`, which is what turns the arm from a direction into a *segment* — and
 * a segment is what a partner's hand can be in the way of. Nothing needed that until the
 * hands came flat and the two of them ended up stacked on one vertical line.
 *
 * Same solve as the render's, not a second one beside it: `hold-metrics.ts` measures what
 * the scene draws or it measures nothing.
 */
export function touchLift(
  m: ArmMetrics,
  isBeau: boolean,
  handX: number,
  handZ: number,
  height: number,
  restX: number,
): { lift: number; pose: ArmPose } {
  const pose = armPose();
  const lift = settleTouch(pose, m, isBeau, handX, handZ, height, restX);
  return { lift, pose };
}

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
 * 🔑 **`handX`/`handZ` name the HAND's centre, not the wrist's** — Ryan's sketch of
 * 2026-09-14. The wrist is wherever the hand's own swing puts it, which is `handOffset`
 * backwards, and it comes out somewhere quite different for each dancer because their two
 * forearms arrive from opposite sides. That separation is the sketch's *arc from the
 * median*, and it is the whole of what this used to get wrong: the offset was subtracted
 * on **y** and thrown away on **x** and **z**, so both wrists were pinned to one point in
 * plan and the two hands slid off it in opposite directions — up to 0.178 apart on
 * `player/player`, where the honest answer for two identical hands is zero.
 *
 * `height` is world. Both dancers run this independently and neither needs the other's
 * hand: each puts its own palm *on* `height`, so they meet there. Where the two hands sit
 * *across* the plane is not local in the same way — the flush rule references the partner's
 * radius — and that offset is applied by the caller, before this is entered.
 */
function settleTouch(
  out: ArmPose,
  m: ArmMetrics,
  isBeau: boolean,
  handX: number,
  handZ: number,
  height: number,
  /** Where the inside arm hangs at this stance (ADR-0049). */
  restX: number = m.restX,
  /**
   * Receives the **whole** wrist offset when a caller needs more than its `y`.
   *
   * The stance does. Every reach budget in this module is cut to the wrist — `wristReach`,
   * `drawnSpan`, {@link touchSpanAt} — and until 2026-09-14 it was then handed the *hold's*
   * coordinates to spend them against, which is the wrist's only on the vertical. The wrist
   * sits up to 0.074 out along its own arc as well, and an arm budgeted without that is an
   * arm the stance believes can reach a point it cannot.
   */
  offOut?: Vec3,
  /**
   * How far the hold has risen out of the hang (ADR-0058) — {@link TouchHold.raised}, passed
   * straight down to {@link touchPose}.
   *
   * 🔑 **It has to reach the solve, not just the final pose.** The iteration's residual is a
   * function of the arm's *aim*, and standing the humerus up turns the forearm — so settling
   * against the hanging elbow and then raising it would land the wrist somewhere the solve
   * never checked. Both `touchPose` calls below take it for that reason.
   */
  raised = 0,
): number {
  const sign = isBeau ? -1 : 1;
  const side = isBeau ? "right" : "left";

  /**
   * The one thing being solved: where this dancer's **wrist** sits from the hand it is
   * holding the plane with — a vector, because the hand swings off the wrist on all three
   * axes and only one of them used to be collected.
   *
   * 🔑 **One iterate, not three.** Its `y` is the sum of two terms — where the palm surface
   * has to be relative to its own centre ({@link palmOffset}), less how far that centre has
   * swung above or below the wrist ({@link handOffset}) — and its `x`/`z` are the rest of
   * that same swing. All of them are functions of the aim, which is a function of the wrist.
   * Splitting the two `y` terms into separate iterates let the damping hold one still while
   * the other jumped and a cast stopped converging, two palms 0.018 apart; the same rule
   * applies with a breadth of three, so the step below is taken or halved on the **vector**
   * and never componentwise.
   */
  const wristFrom = (out: Vec3, aimX: number, aimY: number, aimZ: number): Vec3 => {
    handOffset(_hang, m, side, aimX, aimY, aimZ);
    out.x = -_hang.x;
    out.y = palmOffset(m, isBeau, aimX, aimY, aimZ) - _hang.y;
    out.z = -_hang.z;
    return out;
  };

  /**
   * The residual `F(off) = g(off) − off`, written into `into`, returning its length.
   *
   * 🔑 **A root of `F` is what was wanted all along**, and `g` was being *iterated* instead.
   * Fixed-point iteration only converges where `g` contracts, and here it does not: the hand
   * sits a `dead` span out from the wrist, so nudging the wrist sideways rotates the forearm
   * and swings the hand further back the other way — a gain above 1. Measured on 2026-09-14,
   * **26 of 50 arms never settled**, the whole residual living in `x` and `z` while `y` came
   * to 1e-12. Damping cannot rescue it: `x ← x + w(g(x) − x)` converges only for
   * `−3 < g' < 1` at `w = ½`, and shrinking `w` further *stalls* rather than converges,
   * because `|g(x) − x|` does not shrink just because the step does.
   *
   * `out` is scratch here — the pose that matters is re-solved at the settled offset below.
   */
  const residual = (ox: number, oy: number, oz: number, into: Vec3): number => {
    touchPose(
      out, m, sign,
      handX + ox,
      localHeight(m, height + oy),
      handZ + oz,
      restX, m.drawnSpan, raised,
    );
    wristFrom(_next, out.aimX, out.aimY, out.aimZ);
    into.x = _next.x - ox;
    into.y = _next.y - oy;
    into.z = _next.z - oz;
    return Math.hypot(into.x, into.y, into.z);
  };

  // Seeded with a hanging arm, the same seed the iteration used.
  wristFrom(_off, 0, -1, 0);
  let fNorm = residual(_off.x, _off.y, _off.z, _F);

  // **Damped Newton.** Three extra evaluations buy the Jacobian, the 3×3 solve is Cramer, and
  // the backtracking line search is what makes it safe across ADR-0052's flexion kink — a
  // Newton step that overshoots a corner is rejected rather than taken, and a pass that cannot
  // improve `|F|` at any length stops the solve instead of wandering. Quadratic where the map
  // is smooth, which is why twelve passes are more than the twenty-four the iteration had.
  for (let pass = 0; pass < SETTLE_PASSES && fNorm > SETTLE_TOLERANCE; pass++) {
    for (let c = 0; c < 3; c++) {
      residual(
        _off.x + (c === 0 ? SETTLE_DIFF : 0),
        _off.y + (c === 1 ? SETTLE_DIFF : 0),
        _off.z + (c === 2 ? SETTLE_DIFF : 0),
        _Ftrial,
      );
      _jac[c] = (_Ftrial.x - _F.x) / SETTLE_DIFF;
      _jac[3 + c] = (_Ftrial.y - _F.y) / SETTLE_DIFF;
      _jac[6 + c] = (_Ftrial.z - _F.z) / SETTLE_DIFF;
    }

    const [a, b, c2, d, e, f, g2, h2, i2] = _jac as unknown as number[];
    const det =
      a! * (e! * i2! - f! * h2!) - b! * (d! * i2! - f! * g2!) + c2! * (d! * h2! - e! * g2!);

    // Solve `J · step = −F`. A singular Jacobian means Newton has nothing to say here, so
    // fall back to the steepest sensible thing — a step along `−F` itself, which is the old
    // iteration's direction and is at least not wrong.
    let sx: number;
    let sy: number;
    let sz: number;
    if (Math.abs(det) < 1e-18) {
      sx = _F.x; sy = _F.y; sz = _F.z;
    } else {
      const rx = -_F.x;
      const ry = -_F.y;
      const rz = -_F.z;
      sx = (rx * (e! * i2! - f! * h2!) - b! * (ry * i2! - f! * rz) + c2! * (ry * h2! - e! * rz)) / det;
      sy = (a! * (ry * i2! - f! * rz) - rx * (d! * i2! - f! * g2!) + c2! * (d! * rz - ry * g2!)) / det;
      sz = (a! * (e! * rz - ry * h2!) - b! * (d! * rz - ry * g2!) + rx * (d! * h2! - e! * g2!)) / det;
    }

    let stepped = false;
    let t = 1;
    for (let k = 0; k < 10; k++) {
      const trial = residual(_off.x + t * sx, _off.y + t * sy, _off.z + t * sz, _Ftrial);
      if (trial < fNorm) {
        _off.x += t * sx;
        _off.y += t * sy;
        _off.z += t * sz;
        _F.x = _Ftrial.x; _F.y = _Ftrial.y; _F.z = _Ftrial.z;
        fNorm = trial;
        stepped = true;
        break;
      }
      t /= 2;
    }
    // 🔴 **Nothing improved it, so stop.** Better a settled answer that is honestly short than
    // a wandering one: the callers all read this as a position, and a pose that keeps moving
    // between frames is the visible failure.
    if (!stepped) break;
  }
  touchPose(
    out, m, sign,
    handX + _off.x,
    localHeight(m, height + _off.y),
    handZ + _off.z,
    restX, m.drawnSpan, raised,
  );
  // 🔴 **The WRIST's offset from the contact plane, not the hand centre's** — the callers of
  // this are the reach budget and the stance, and what they have to know is where the arm was
  // asked to end. {@link handCentre} is how anything wanting the hand gets it.
  if (offOut) {
    offOut.x = _off.x;
    offOut.y = _off.y;
    offOut.z = _off.z;
  }
  return _off.y;
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
function touchOffsets(
  beau: ArmMetrics,
  belle: ArmMetrics,
  height: number,
  acrossBeau: number,
  acrossBelle: number,
  forward: number,
  insideBeau: number,
  insideBelle: number,
): HoldOffsets {
  const b = vec3();
  const l = vec3();
  settleTouch(_settle, beau, true, -(acrossBeau + insideBeau), forward, height, insideBeau, b);
  settleTouch(_settle, belle, false, acrossBelle + insideBelle, forward, height, insideBelle, l);
  return { beau: b, belle: l };
}

/**
 * Each dancer's **wrist offset from the hold** — where the joint the arm has to reach sits
 * relative to the hand the hold names.
 *
 * 🔑 **Three axes, and the two that were missing are the point.** `y` is the old `lifts`: the
 * palm's own rise, less the hand's swing off the wrist. `x` and `z` are the rest of that same
 * swing, and they are what the sketch of 2026-09-14 calls the *arc from the median* — the
 * beau's wrist trails off to his side and the belle's to hers, because their two forearms
 * arrive from opposite sides and each hand lies along its own arm's line.
 *
 * Carried through the stance rather than re-derived in it, because it is an output of the arm
 * solve and an input to the reach budget, and a second opinion about where a wrist is becomes
 * a hold that comes apart (ADR-0045).
 */
interface HoldOffsets {
  readonly beau: Vec3;
  readonly belle: Vec3;
}

/**
 * The beau's wrist sits at `−(across + inside) + off.x` in his own frame and his shoulder at
 * `−inside`, so the distance his arm actually spends going **across** is `across − off.x`;
 * the belle's frame is mirrored and hers is `across + off.x`. One helper rather than four
 * sprinkled signs — this is the conversion every budget below needs and none of them had.
 */
function wristAcross(across: number, off: Vec3, isBeau: boolean): number {
  return across + (isBeau ? -off.x : off.x);
}

/**
 * How far sideways this dancer's hand can go, at in-plane distance `drop` from the shoulder,
 * **with the elbow still hanging in the shoulder's own plane**.
 *
 * 🔑 **This is {@link touchPose}'s own success condition, solved for the sideways axis.** With
 * the elbow pinned to `x = sign · restX` it lies on a circle of radius `elbowReach` in the
 * shoulder's (y, z) plane, so the hands the arm can reach form a torus about that circle: the
 * closest point of the circle to a hand `drop` away in-plane is `|drop − elbowReach|` off, and
 * whatever the forearm has left over after paying that is what may be spent going across.
 * `touchPose` falls through to {@link reachPose} exactly when this returns less than the
 * `across` it is asked for.
 *
 * 🔴 **The straight-arm span is the wrong number here and was the defect.** `sqrt(handReach² −
 * drop²)` is what an arm reaches at **full extension**, and a straight arm reaching sideways
 * cannot keep its elbow in the shoulder's plane — so a stance cut from it stood the couple at a
 * width that made the hold it was standing them at impossible to pose. Every ordering that came
 * out strained was one of those, and none of them was genuinely over their arm.
 *
 * Zero when the forearm cannot cover the in-plane gap at all, which is the honest answer: there
 * is no sideways reach to be had with the elbow where an elbow goes.
 */
function touchSpanAt(m: ArmMetrics, drop: number): number {
  const gap = Math.abs(drop) - m.elbowReach;
  // The forearm as far as the **wrist** — the joint the hold places. What lies past it is hand.
  const fore = m.drawnSpan;
  return fore > Math.abs(gap) ? Math.sqrt(fore * fore - gap * gap) : 0;
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
 * Where this dancer's **inside arm** actually hangs, once the couple are standing: their
 * own `restX`, pulled in far enough that the shoulder stays a hand's daylight on their own
 * side of the couple's midpoint (ADR-0049).
 *
 * 🔴 **`restX` is authored, and it can be wider than the couple.** `forearmXOffset` runs to
 * 0.46 on the broad bodies against a torso radius of 0.30, so an arm hangs well outside its
 * own chest by design. Stand that dancer closer than {@link placeHold}'s `shoulders` term
 * asks for — which happens whenever the *bodies* floor or the pair's reach decides the
 * stance instead — and the inside shoulder ends up **past the midpoint, over the partner**,
 * with the forearm hanging down through the partner's hand. Myco with Sprout stands at
 * 0.745 while his shoulders alone span 0.92.
 *
 * 🔑 **So the arm gives way, not the couple.** The stance is already answering to the
 * bodies and to reach; widening it to suit a shoulder would undo both. This is the same
 * daylight number the `shoulders` term uses, applied to the arm instead of to the stance.
 *
 * **Clamped, not moved freely.** An arm cannot come in past its own body
 * ({@link ArmMetrics.tuckFloorX}); where the floor is wider than the room, the floor wins
 * and the shoulder still overhangs — honest degradation, and the dancer it happens to is
 * the one whose arms were authored widest.
 */
export function tuckedRestX(m: ArmMetrics, width: number, clear: number): number {
  return Math.max(m.tuckFloorX, Math.min(m.restX, width / 2 - clear));
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
 * **Height: the taller dancer's waist** (ADR-0046). Not a preference between the two of them
 * — the taller dancer is the one who *runs out of arm*, because they are reaching **down** to
 * a hold and a shoulder cannot follow it. Aim at their waist and they do not have to; the
 * shorter dancer lifts instead, which they have room for, because an arm going up is not
 * folding back on itself. That is what two people of different heights do — the hold sits
 * where the tall one can carry it and the short one reaches up to meet it.
 *
 * It is **symmetric in the pair by construction**, which is the property the rule it replaces
 * did not have. The belle's waist (ADR-0025 through ADR-0027, from Ryan on 2026-08-16: *"the
 * gent's job is to make the belle's job easier, even if she's taller"*) read correctly for a
 * long time because it is *identical* to this rule whenever the belle happens to be the taller
 * — which is the shipped pairing. Where she was not, the same two bodies got a different hold
 * depending on which of them was called beau: Ember and Myco held hands at 0.713 one way round
 * and 0.557 the other, with Ember at 100% of her reach and no hands in front at all.
 *
 * The lower of the two waists — the other tidy-looking answer, briefly implemented here in
 * 2026-08 — is worse than either: it aims at the *reachable* dancer and strands the one who
 * cannot follow, and it strains 14 of the cast's 20 orderings against this rule's 8.
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
 * this but that's the general rule."* The lateral is a landmark rather than a preference about
 * whose arm does the work — and as of ADR-0046 the height is a landmark too, so neither of the
 * hold's two in-plane numbers picks a side any more. On the
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
export function touchHold(
  beau: ArmMetrics,
  belle: ArmMetrics,
  /**
   * The height the hold *aims* at before both dancers' reach clamps it — the **taller
   * dancer's waist** by default (ADR-0046), which is the rule as written.
   *
   * The higher of the two waists *is* the taller dancer's, not a proxy for it: `waistY` is a
   * fixed fraction of shoulder height ({@link computePositions}), so it is monotone in stature
   * and `Math.max` picks the same dancer "taller" would.
   *
   * A parameter so the alternatives can be measured through the real solver rather than
   * approximated beside it: the height is the input to a fixed point, and a candidate evaluated
   * any other way is a candidate for a different function.
   */
  target: number = Math.max(beau.rigOriginY + beau.waistY, belle.rigOriginY + belle.waistY),
): TouchHold {

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
  // Seeded with a hanging arm, which has no swing across or forward yet — only the palm's
  // own rise, which is what this used to be the whole of.
  let off: HoldOffsets = {
    beau: { x: 0, y: palmOffset(beau, true, 0, -1, 0), z: 0 },
    belle: { x: 0, y: palmOffset(belle, false, 0, -1, 0), z: 0 },
  };
  let height = bandedHeight(beau, belle, target, acrossBeau, acrossBelle, off, forward);
  let inside = { beau: beau.restX, belle: belle.restX };
  let solved = placeHold(beau, belle, height, off, forward, inside);
  const moved = (a: Vec3, b: Vec3): boolean =>
    Math.abs(a.x - b.x) >= 1e-12 || Math.abs(a.y - b.y) >= 1e-12 || Math.abs(a.z - b.z) >= 1e-12;
  for (let pass = 0; pass < 12; pass++) {
    acrossBeau = solved.acrossBeau;
    acrossBelle = solved.acrossBelle;
    const nextOff = touchOffsets(
      beau, belle, height, acrossBeau, acrossBelle, solved.forward,
      solved.insideBeau, solved.insideBelle,
    );
    const next = bandedHeight(beau, belle, target, acrossBeau, acrossBelle, nextOff, solved.forward);
    const settled =
      Math.abs(next - height) < 1e-12 &&
      Math.abs(solved.forward - forward) < 1e-12 &&
      !moved(nextOff.beau, off.beau) &&
      !moved(nextOff.belle, off.belle) &&
      Math.abs(solved.insideBeau - inside.beau) < 1e-12 &&
      Math.abs(solved.insideBelle - inside.belle) < 1e-12;
    off = nextOff;
    height = next;
    forward = solved.forward;
    inside = { beau: solved.insideBeau, belle: solved.insideBelle };
    solved = placeHold(beau, belle, height, off, forward, inside);
    if (settled) break;
  }

  return {
    width: solved.width,
    height,
    lateral: solved.lateral,
    forward: solved.forward,
    insideBeau: solved.insideBeau,
    insideBelle: solved.insideBelle,
  };
}

/**
 * The aimed height — the taller dancer's waist (ADR-0046) — clamped into the height both of
 * them can actually reach **given how far sideways each of them already has to go**.
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
  off: HoldOffsets,
  forward: number,
): number {
  let floor = -Infinity;
  let ceiling = Infinity;
  for (const [m, across, o, isBeau] of [
    [beau, acrossBeau, off.beau, true],
    [belle, acrossBelle, off.belle, false],
  ] as const) {
    const shoulder = m.rigOriginY + m.restY;
    // 🔑 **Spent against the WRIST on all three axes.** `wristReach` was already the right
    // budget and `off.y` the right vertical; the across and the forward were the hold's, and
    // the wrist is off the hold on both (2026-09-14).
    const ax = wristAcross(across, o, isBeau);
    const az = forward + o.z;
    const drop = Math.sqrt(Math.max(0, m.wristReach * m.wristReach - ax * ax - az * az));
    floor = Math.max(floor, shoulder - drop - o.y);
    ceiling = Math.min(ceiling, shoulder + drop - o.y);
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
  /** Where each inside arm hangs at this stance (ADR-0049) — `restX`, tucked. */
  readonly insideBeau: number;
  readonly insideBelle: number;
}

function placeHold(
  beau: ArmMetrics,
  belle: ArmMetrics,
  height: number,
  off: HoldOffsets,
  forward: number,
  /**
   * Where the inside arms hung on the previous pass (ADR-0049), seeded with the authored
   * `restX`.
   *
   * 🔴 **The tuck has to be inside the fixed point, not after it.** `arms` is *"as far apart
   * as the pair can stand and still meet in the middle"*, and it is measured from the inside
   * shoulders — so a stance solved from the authored shoulders and then handed a tucked one
   * is a stance the tucked arms cannot make. It over-reached by 0.14% before this argument
   * existed, which is exactly the class of error `bandedHeight` takes `across` for.
   */
  inside: { beau: number; belle: number } = { beau: beau.restX, belle: belle.restX },
): PlacedHold {
  // Vertical and forward both come out of the same reach, so the stance sees them as one
  // number: what is left over is what may be spent going sideways. Both are measured to the
  // **wrist** — the joint the arm has to get to — which is `off` away from the hold on every
  // axis and not just the vertical one.
  const beauDrop = Math.hypot(handDrop(beau, height, off.beau.y), forward + off.beau.z);
  const belleDrop = Math.hypot(handDrop(belle, height, off.belle.y), forward + off.belle.z);

  // The stance. `shoulders` is the width a handhold wants; `arms` is as far apart as the
  // pair can stand and still **meet in the middle** of the daylight between their inside
  // shoulders, which is as far as the *shorter* of the two inside arms can go, twice;
  // `bodies` is the closest the pair can stand at all.
  // `touchSpanAt` answers for the **wrist**, and `arms` is a width measured to the **hold**,
  // so each dancer's answer is converted back through their own offset — {@link wristAcross}
  // run the other way. A dancer whose wrist trails outboard of the hold can hold hands that
  // much further across; one whose wrist trails inboard, that much less.
  const beauReach = Math.max(0, touchSpanAt(beau, beauDrop) + off.beau.x);
  const belleReach = Math.max(0, touchSpanAt(belle, belleDrop) - off.belle.x);
  const shoulders = 2 * (Math.max(beau.restX, belle.restX) + handDaylight(beau, belle));
  const arms = inside.beau + inside.belle + 2 * Math.min(beauReach, belleReach);
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
  // 🔑 **The arms are placed after the stance, not before it** (ADR-0049). Everything above
  // decides how far apart the pair stand; `restX` is authored and can be wider than the
  // answer, so the inside arm is pulled in to whatever room the stance actually left. The
  // `shoulders` term above is still the width a handhold *asks* for — this is what happens
  // when the bodies or the reach refuse it.
  const clear = handDaylight(beau, belle);
  const insideBeau = tuckedRestX(beau, width, clear);
  const insideBelle = tuckedRestX(belle, width, clear);

  const preferred = (insideBeau - insideBelle) / 2;

  // **And then the bodies get the last word.** Everything above is a preference about
  // whose arm does the work, computed from shoulders and reach — none of which knows
  // where a torso is. On a mismatched pair that preference walks the hold straight into
  // somebody: the joined hands land under the wider dancer's shoulder, and their shoulder
  // is inside their own chest. So the hold is finally clamped into the corridor between
  // the two bodies, which `width` above guarantees is wide enough to hold it.
  //
  // The clamp is the accommodation, and it outranks the preference on purpose: a hold
  // inside a dancer is not a hold, and no opinion about which dancer reaches can buy one.
  const floorX = -width / 2 + sideExtentAt(beau.parts, height) + clear;
  const ceilX = width / 2 - sideExtentAt(belle.parts, height) - clear;
  const lateral = Math.max(floorX, Math.min(ceilX, preferred));

  const acrossBeau = width / 2 + lateral - insideBeau;
  const acrossBelle = width / 2 - lateral - insideBelle;

  return {
    width,
    lateral,
    // **As far forward as both of them can hold with the upper arm hanging.** The shorter of
    // the two relaxed answers, because the longer-armed dancer can always fold an elbow back
    // to take up the slack and the shorter-armed one cannot conjure length. Same shape as the
    // height's own band: whichever demand binds, binds.
    // 🔑 **`relaxedForward` answers for the wrist too**, so it takes the wrist's across and
    // its answer is the wrist's forward — the hold sits `off.z` back from it. Clamped at
    // zero: ADR-0027 holds the hands *in front*, and a negative here would be a new rule
    // rather than a smaller helping of this one.
    forward: Math.max(0, Math.min(
      relaxedForward(beau, wristAcross(acrossBeau, off.beau, true), height + off.beau.y) - off.beau.z,
      relaxedForward(belle, wristAcross(acrossBelle, off.belle, false), height + off.belle.y) - off.belle.z,
    )),
    acrossBeau,
    acrossBelle,
    insideBeau,
    insideBelle,
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
  /** Where this arm hangs from — {@link tuckedRestX} inside a couple, `restX` otherwise. */
  restX: number = m.restX,
  /**
   * Length of the second link — how far the point being placed sits from the elbow.
   *
   * {@link ArmMetrics.forearmSpan} by default, which places the **hand's centre** and is what
   * every caller outside the handhold wants. A hold passes {@link ArmMetrics.drawnSpan} and
   * places the **wrist** instead, because that is the joint two dancers put together; the hand
   * then lies off it ({@link handOffset}) rather than continuing the arm's line.
   */
  span: number = m.forearmSpan,
): ArmPose {
  const sx = sign * restX;
  const sy = m.restY;
  const upper = m.elbowReach;
  const fore = span;

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
  const inside = isBeau ? hold.insideBeau : hold.insideBelle;
  const across = hold.width / 2 + (isBeau ? hold.lateral : -hold.lateral) - inside;
  // Settled rather than assumed, so the readout is the arm the render poses and not an
  // arm whose hand is a sphere. Needs no partner: `across` is already in `hold`.
  const lift = settleTouch(
    _settle,
    m,
    isBeau,
    (isBeau ? -1 : 1) * (across + inside),
    hold.forward,
    hold.height,
    inside,
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
 * hold at 100% of her own arm does not. That split is the right way round, and the
 * opposite of how the swing constants were tuned: **the straighter the arm, the smaller the
 * elbow's circle**, so a nearly straight arm gives a preference almost nothing to get wrong,
 * while the folded arms — where it had everything to get wrong, and did — are the ones that
 * now come through the anatomy.
 *
 * ## 🔑 `raised` — and why the L is a rotation rather than a second solver (ADR-0058)
 *
 * A California Twirl turns a dancer 180° beneath a hand they are still holding, and *"the
 * humerus of a hanging arm stays in the plane of its own shoulder"* is the wrong anatomy for
 * that: nothing about an arch is hanging. Ryan, 2026-08-23 — the held arm should make *"an
 * upside down L with the invisible upper arm and the forearm then is horizontal over the head."*
 *
 * 🔑 **Both answers are points on the same circle**, which is the whole reason this is one
 * parameter and not a second function. The elbow's legal positions are the intersection of two
 * spheres — one at the shoulder, one at the placed point — and that is a circle whatever rule
 * picks from it. ADR-0027 picks where the circle crosses the shoulder's own plane; the L picks
 * the **highest point on it**, which is the most vertical upper arm the geometry allows. So
 * `raised` rotates the elbow from the first toward the second *about the circle's own axis*,
 * and every value in between is a real elbow: the upper arm and the forearm keep their exact
 * lengths the whole way across, so {@link upperArmStrain} reads the same at both ends and
 * everywhere between. A lerp between two elbow *positions* would cut the chord and shorten the
 * humerus.
 *
 * 🔑 **And that is what lets it ease.** The arch blends up out of the standing handhold rather
 * than appearing, so a rule that switched at a threshold would pop the elbow across. `raised` is
 * the arch's own blend, so the upper arm stands up exactly as fast as the hands rise.
 *
 * `0` — the default, and every caller outside a raised hold — is the ADR-0027 pose **untouched**,
 * including its fall-throughs to {@link reachPose}.
 */
export function touchPose(
  out: ArmPose,
  m: ArmMetrics,
  sign: number,
  handX: number,
  handY: number,
  handZ: number,
  /** Where this arm hangs from — {@link tuckedRestX} inside a couple, `restX` otherwise. */
  restX: number = m.restX,
  /**
   * Length of the second link — how far the point being placed sits from the elbow.
   *
   * {@link ArmMetrics.forearmSpan} by default, which places the **hand's centre** and is what
   * every caller outside the handhold wants. A hold passes {@link ArmMetrics.drawnSpan} and
   * places the **wrist** instead, because that is the joint two dancers put together; the hand
   * then lies off it ({@link handOffset}) rather than continuing the arm's line.
   */
  span: number = m.forearmSpan,
  /**
   * How far the upper arm has stood up out of the hang, `0`–`1` (ADR-0058). `0` is ADR-0027
   * exactly; `1` is the highest elbow the circle has, which is the L. A raised hold passes its
   * own blend, so the arm stands up exactly as fast as the hands rise.
   */
  raised = 0,
): ArmPose {
  const sx = sign * restX;
  const sy = m.restY;
  const upper = m.elbowReach;
  const fore = span;

  const ax = handX - sx;
  const ay = handY - sy;
  const az = handZ;
  const d = Math.hypot(ax, ay, az);
  if (d < 1e-9 || d >= upper + fore) return reachPose(out, m, sign, handX, handY, handZ, restX, span);

  // The elbow lies on both spheres, so its offset `e` from the shoulder satisfies
  // `a·e = (d² + upper² − fore²)/2` and `|e| = upper`. Pinning `e.x` to zero leaves a
  // line and a circle in the dancer's own (y, z) plane.
  const k = (d * d + upper * upper - fore * fore) / 2;
  const r = Math.hypot(ay, az);
  if (r < 1e-9) return reachPose(out, m, sign, handX, handY, handZ, restX, span);
  const along = k / r;
  if (Math.abs(along) >= upper) return reachPose(out, m, sign, handX, handY, handZ, restX, span);
  const off = Math.sqrt(upper * upper - along * along);

  // `n` points from the shoulder toward the hand within the plane; `p` is perpendicular to
  // it, and the two solutions are `±off` along `p`. Take the one with the elbow further
  // back: characters face local `+z`, so that is the smaller z.
  const ny = ay / r;
  const nz = az / r;
  const py = -nz;
  const pz = ny;
  const swing = pz > 0 ? -off : off;

  let ex = sx;
  let ey = sy + along * ny + swing * py;
  let ez = along * nz + swing * pz;

  // 🔑 **Stand the upper arm up, by rotating the elbow along its own circle** (ADR-0058).
  // Everything above found the hanging elbow; this turns it toward the highest one the circle
  // has, which is the most vertical humerus the geometry allows — Ryan's upside-down L.
  if (raised > 0) {
    standUp(_stand, ex, ey, ez, sx, sy, 0, ax, ay, az, d, upper, raised);
    ex = _stand.x;
    ey = _stand.y;
    ez = _stand.z;
  }

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

/** Scratch for the raised elbow. Frame-loop code allocates nothing. */
const _stand = vec3();

/**
 * Turn an elbow along its own circle toward the **highest** point on it — the most vertical
 * upper arm the geometry allows, which is Ryan's upside-down L (ADR-0058).
 *
 * The elbow's legal positions are the intersection of a sphere at the shoulder with one at the
 * placed point: a circle, centred on the shoulder→hand line at `C = S + along·n` with radius
 * `off`, lying in the plane perpendicular to `n`. The hanging elbow is one point on it; the L is
 * another. Turning between them keeps *both* segments at their true lengths, which is why this
 * rotates rather than interpolating positions.
 *
 * 🔑 **The highest point is closed form, and basis-free.** Height on the circle is
 * `C.y + off·(ŵ·ŷ)` for the in-plane direction `ŵ`, so the maximum is at the normalised
 * projection of **up** onto the circle's plane: `w = ŷ − (ŷ·n)n`. Its length is `√(1 − n.y²)`,
 * which is zero exactly when the hand is straight above or below the shoulder — and then every
 * elbow on the circle is the same height, standing up asks for nothing, and the hanging answer
 * is returned unchanged. No search, no tuned constant.
 *
 * Rodrigues about `n` by `raised` of the angle between the two, so `raised = 1` lands on the L
 * exactly and `0` cannot move anything.
 */
function standUp(
  out: Vec3,
  ex: number, ey: number, ez: number,
  sx: number, sy: number, sz: number,
  ax: number, ay: number, az: number,
  d: number,
  upper: number,
  raised: number,
): Vec3 {
  out.x = ex;
  out.y = ey;
  out.z = ez;
  if (d < 1e-9 || upper < 1e-9) return out;

  // The circle: axis `n`, centre `C`, radius `off`.
  const nx = ax / d;
  const ny = ay / d;
  const nz = az / d;
  const vx = ex - sx;
  const vy = ey - sy;
  const vz = ez - sz;
  const along = vx * nx + vy * ny + vz * nz;
  // From the circle's centre to the hanging elbow — the vector being rotated.
  const hx = vx - along * nx;
  const hy = vy - along * ny;
  const hz = vz - along * nz;
  const off = Math.hypot(hx, hy, hz);
  if (off < 1e-9) return out;

  // Straight up, projected into the circle's plane: the direction of the highest elbow.
  const wx = -ny * nx;
  const wy = 1 - ny * ny;
  const wz = -ny * nz;
  const wlen = Math.hypot(wx, wy, wz);
  // A circle lying flat — the hand directly above or below the shoulder. Every elbow on it is
  // the same height, so there is no "up" to turn toward and the hang is already as raised as
  // anything else would be.
  if (wlen < 1e-9) return out;

  // The angle from the hanging elbow to the highest one, signed about `n`.
  const ux = hx / off;
  const uy = hy / off;
  const uz = hz / off;
  const tx = wx / wlen;
  const ty = wy / wlen;
  const tz = wz / wlen;
  const cos = clampUnit(ux * tx + uy * ty + uz * tz);
  // `u × t` runs along ±n; its component on n gives the sign of the turn.
  const crossN = (uy * tz - uz * ty) * nx + (uz * tx - ux * tz) * ny + (ux * ty - uy * tx) * nz;
  const angle = Math.atan2(crossN, cos) * raised;

  // Rodrigues: rotate `h` about `n` by `angle`.
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = hx * nx + hy * ny + hz * nz;
  const rx = hx * c + (ny * hz - nz * hy) * s + nx * dot * (1 - c);
  const ry = hy * c + (nz * hx - nx * hz) * s + ny * dot * (1 - c);
  const rz = hz * c + (nx * hy - ny * hx) * s + nz * dot * (1 - c);

  out.x = sx + along * nx + rx;
  out.y = sy + along * ny + ry;
  out.z = sz + along * nz + rz;
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
export function elbowLocal(
  out: Vec3,
  pose: ArmPose,
  m: ArmMetrics,
  sign: number,
  /** Where the shoulder group sits — {@link tuckedRestX} inside a couple (ADR-0049). */
  restX: number = m.restX,
): Vec3 {
  out.x = pose.x - sign * restX;
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

/**
 * The height dancers stand on. Zero by construction — a {@link Placement} is a point on
 * this plane and {@link ArmMetrics.rigOriginY} is measured up from it — and named rather
 * than written as a bare `0` because it is a fact about the dance, not an origin.
 */
export const FLOOR_Y = 0;

/**
 * Swing an arm up off the ground, about its own shoulder, until the hand clears the floor.
 *
 * 🔴 **An arm is a fixed length and a shoulder can now be put anywhere.** `layout.shoulderY`
 * (2026-09-19) moves where an arm attaches independently of the body it attaches to, and
 * nothing about a hanging arm ever asked how high the shoulder was: {@link restPose} — and
 * `expression-channels`' `proposeArms`, which is the path a resting dance arm actually takes
 * — hang `elbowReach + forearmSpan` of arm straight down from wherever the shoulder is. That
 * was safe only while every shoulder sat at the top of its own body, which is every character
 * before Myco. Hers sits at the base of her sunken head, 0.55, with 0.80 of arm on it: the
 * forearm and the whole hand compute to below `y = 0` and the opaque ground mesh cuts them
 * off, which reads as a limb plunging into the dirt. It is **live on the shipped cast today**,
 * not something a wider bound would introduce.
 *
 * So the arm goes where a short-shouldered person's arm actually goes — out, not through.
 * The whole straight arm rotates about the pinned shoulder until the hand's centre sits one
 * `handRadius` above the floor, keeping the upper arm at exactly its natural length, so
 * {@link upperArmStrain} still reads zero on a rest pose. A hang that already clears is
 * returned untouched, which is every other character on the cast at every authored shoulder
 * they have.
 *
 * 🔑 **`handRadius`, not the drawn hand.** A hand is a sphere of `radius` flattened in `z`
 * and then rotated ({@link handDrawnMap}), so how far it reaches *down* depends on which way
 * the wrist has turned it — but every semi-axis of that ellipsoid is at most `radius`, so one
 * `handRadius` of headroom is the bound that holds whatever the wrist is doing. Cheap and
 * conservative beats exact and orientation-dependent for a clamp.
 *
 * 🔑 **The lift is spent forward, and sideways reach is never bought with it.** Coming up off
 * the vertical is what makes an arm reach further out — the horizontal budget `√(1 − aimY²)`
 * *grows* as the arm rises — so the gain has to be pointed somewhere. Sideways is the wrong
 * place: an arm's own `restX` is the width everything from {@link tuckedRestX} to the review
 * chart reads it at, it is measured to sit clear of this dancer's own body, and a lift that
 * widened it would put a resting arm somewhere no rule had put one. Forward is where a
 * caricature has room — the same asymmetry {@link rigidParts} already relies on when it
 * declines to count a forward overhang, because dancers pass side-on and nothing that juts
 * forward narrows the gap they pass through. So `aimX` is carried across untouched (clamped
 * inward only, when even that will not fit) and the whole lift goes into `z`. A dead hang has
 * no bearing at all and simply goes forward.
 *
 * 🔴 **A lifted arm does then reach forward, and {@link constrainArm} answers that.** A
 * partner approached diagonally gets backed off along a diagonal bearing, and a diagonal has
 * an `x` in it — so a lifted arm's elbow can end up a little wider than `restX` after the
 * fold, by at most the forward reach the lift bought it. That is the fold moving the arm
 * *away* from the partner, not toward, and `arm-geometry`'s own "never lets a free arm
 * intersect the partner's" is unmoved by it.
 *
 * 🔑 **Before {@link constrainArm}, never after.** The lift is a rotation about the shoulder
 * and the fold is a horizontal slide, and a horizontal slide cannot undo a vertical lift. The
 * other order lets the fold drop a cleared hand straight back into the ground.
 */
export function clearFloor(pose: ArmPose, m: ArmMetrics): ArmPose {
  // Shoulder → hand centre, along the arm. The pose *is* the elbow (ADR-0017) and the
  // forearm aims on down the same line, so one straight segment describes the whole thing.
  const reach = m.elbowReach + m.forearmSpan;
  if (reach <= 1e-9) return pose;

  // The shoulder from the pose's own elbow rather than from `restX`/`restY`, so this stays
  // true of an arm some other rule has already moved.
  const sx = pose.x - pose.aimX * m.elbowReach;
  const sy = pose.y - pose.aimY * m.elbowReach;
  const sz = pose.z - pose.aimZ * m.elbowReach;

  // The lowest the hand's centre may sit, in this rig's own frame.
  const lowest = FLOOR_Y - m.rigOriginY + m.handRadius;
  const aimYMin = clampUnit((lowest - sy) / reach);
  if (pose.aimY >= aimYMin) return pose;

  // The horizontal budget a raised arm has. 🔴 It is *bigger* than the one it had: coming up
  // off the vertical is exactly what makes an arm reach further out. Which is why the sideways
  // share of it is pinned rather than scaled — see below.
  const room = Math.sqrt(Math.max(0, 1 - aimYMin * aimYMin));

  // `aimX` is kept to the bit, never grown: it is the only component a lane is sized against,
  // and rescaling a leaning arm's bearing to the new budget would widen it. Clamped rather
  // than rejected when it does not fit, because that direction is inward, which is always safe.
  const ax = Math.max(-room, Math.min(room, pose.aimX));
  // Everything the lift bought goes forward — or back, for an arm already leaning that way.
  const az = Math.sqrt(Math.max(0, room * room - ax * ax)) * (pose.aimZ < 0 ? -1 : 1);

  pose.aimX = ax;
  pose.aimY = aimYMin;
  pose.aimZ = az;
  pose.x = sx + pose.aimX * m.elbowReach;
  pose.y = sy + pose.aimY * m.elbowReach;
  pose.z = sz + pose.aimZ * m.elbowReach;
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
   * Whether the **figure** says these two are holding hands, rather than their placements —
   * and which hand, when the figure names one.
   *
   * Passed through to {@link touchingSide}. `false` — the default, and every use before the
   * arch — asks the placements, which is what a standing couple's hold is decided from.
   */
  declared: DeclaredHold = false,
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
  /**
   * 🧪 **Exploratory (2026-09-14).** The world yaw the **couple** faces, for a couple whose two
   * dancers are deliberately turned in toward each other (the review route's turn-in slider).
   *
   * `hold.forward` is carried along this dancer's own local `z` below, which is the couple's
   * facing only while both dancers face the same way. Turned in, the two local `z` axes diverge
   * and the two hands would be written to two different points. Given this, `forward` runs
   * along the couple's facing instead, so both still write the same point. Absent, the
   * original path runs unchanged.
   */
  coupleYaw?: number,
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
    // Off the ground first, then in off the partner: the lift is a rotation about the
    // shoulder and the fold is a horizontal slide, so this order keeps both. See
    // {@link clearFloor}. Only the limited channel — an owned hand has somewhere it must
    // be, and where a *hold* can sit is `bandedHeight`'s question, not this one.
    clearFloor(_free, me);
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

        // The couple's facing in this dancer's frame: local `+z` when no couple yaw is given,
        // which is the original placement exactly.
        const fwdX = coupleYaw === undefined ? 0 : Math.sin(coupleYaw) * c - Math.cos(coupleYaw) * s;
        const fwdZ = coupleYaw === undefined ? 1 : Math.sin(coupleYaw) * s + Math.cos(coupleYaw) * c;
        settleTouch(
          out[side],
          me,
          beau,
          coupleYaw === undefined
            ? localX / 2 + offset * dirX
            : localX / 2 + offset * dirX + hold.forward * fwdX,
          coupleYaw === undefined
            ? localZ / 2 + offset * dirZ + hold.forward
            : localZ / 2 + offset * dirZ + hold.forward * fwdZ,
          hold.height,
          // The arm hangs from where the stance left room (ADR-0049), which is the shoulder
          // the hold was solved against. Posing from the authored `restX` here would put the
          // elbow a tuck's width out from the shoulder the render is about to draw.
          beau ? hold.insideBeau : hold.insideBelle,
          undefined,
          // …and it stops hanging as the hold goes up (ADR-0058). `0` for every standing
          // handhold, which is every caller that predates the arch.
          hold.raised ?? 0,
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
 * Lay out the **drawn** part of a forearm in world space: elbow to where the cylinder
 * actually stops, which is {@link ArmMetrics.drawnSpan} short of the hand.
 *
 * {@link trackForearm} places the hand end because a grip is a question about where the hand
 * *is*; this places the mesh's end because collision is a question about where the arm *is*.
 * The two differ by `handForearmGap + handRadius`, which on this cast is a fifth to a third of
 * the whole forearm — enough that an arm measured to its hand centre is charged for a span of
 * air it does not occupy.
 */
export function drawnForearm(
  out: Forearm,
  m: ArmMetrics,
  pose: ArmPose,
  self: Placement,
): Forearm {
  const full = trackForearm(out, m, pose, self);
  const t = m.forearmSpan < 1e-12 ? 0 : m.drawnSpan / m.forearmSpan;
  full.hand.x = full.elbow.x + (full.hand.x - full.elbow.x) * t;
  full.hand.y = full.elbow.y + (full.hand.y - full.elbow.y) * t;
  full.hand.z = full.elbow.z + (full.hand.z - full.elbow.z) * t;
  return full;
}

/**
 * Resolve a point against a forearm as the **capped cylinder it is drawn as**, rather than as
 * the capsule {@link trackContact} treats it as.
 *
 * 🔴 **The cap is the whole reason this exists.** A capsule's end is a dome, so a point just
 * beyond a forearm's wrist reads as inside it; a cylinder's end is a flat disc, so the same
 * point reads as clear. For a grip that distinction never mattered — a hand wrapping a forearm
 * is nowhere near either end. For the standing couple it decides the answer, because the two
 * joined hands sit exactly off the ends of each other's arms and nowhere else.
 *
 * `gap` is the signed distance from `point` to the **solid**: positive is clear air, zero is
 * touching, and negative is that far inside, measured to the nearest face. `along` is where on
 * the axis the answer came from, 0 at the elbow and 1 at the drawn end, and `point` is the
 * place on the cylinder to measure toward — which a caller with a non-spherical hand needs,
 * because "how far does my hand reach" has no answer until there is a direction in it.
 */
export function trackCylinder(
  out: Contact,
  point: Vec3,
  cylinder: Forearm,
  /** Radius at the **elbow** end — `cylinder.elbow`. */
  radius: number,
  /**
   * Radius at the **wrist** end. Defaults to `radius`, which is a straight cylinder.
   *
   * 🔴 **The taper is not a detail here.** A forearm is drawn as a truncated cone and the
   * handhold happens at its thin end: Ember's goes 0.100 to 0.025. Charging the wide end
   * against a partner's hand overstates the crossing by 0.075, which is most of a palm.
   *
   * Sideways this is an approximation — the nearest point on a cone is not at the same axial
   * coordinate as the nearest point on a cylinder — and it is exact at the caps, which is
   * where two joined wrists put everything.
   */
  wristRadius: number = radius,
): Contact {
  const ax = cylinder.hand.x - cylinder.elbow.x;
  const ay = cylinder.hand.y - cylinder.elbow.y;
  const az = cylinder.hand.z - cylinder.elbow.z;
  const length = Math.hypot(ax, ay, az);
  if (length < 1e-12) {
    out.point.x = cylinder.elbow.x;
    out.point.y = cylinder.elbow.y;
    out.point.z = cylinder.elbow.z;
    out.along = 0;
    out.gap = Math.hypot(point.x - cylinder.elbow.x, point.y - cylinder.elbow.y, point.z - cylinder.elbow.z) - radius;
    return out;
  }
  const ux = ax / length;
  const uy = ay / length;
  const uz = az / length;

  // Split the offset from the elbow into along-the-axis and across-it.
  const ox = point.x - cylinder.elbow.x;
  const oy = point.y - cylinder.elbow.y;
  const oz = point.z - cylinder.elbow.z;
  const axial = ox * ux + oy * uy + oz * uz;
  let rx = ox - axial * ux;
  let ry = oy - axial * uy;
  let rz = oz - axial * uz;
  const radial = Math.hypot(rx, ry, rz);
  if (radial > 1e-12) {
    rx /= radial;
    ry /= radial;
    rz /= radial;
  } else {
    // Dead on the axis: any perpendicular will do, and the caller only wants a direction to
    // measure a hand's reach along. Take the world axis the forearm leans on least.
    const px = Math.abs(ux) < 0.9 ? 1 : 0;
    const py = Math.abs(ux) < 0.9 ? 0 : 1;
    const dot = px * ux + py * uy;
    rx = px - dot * ux;
    ry = py - dot * uy;
    rz = -dot * uz;
    const n = Math.hypot(rx, ry, rz) || 1;
    rx /= n;
    ry /= n;
    rz /= n;
  }

  const clampedAxial = axial < 0 ? 0 : axial > length ? length : axial;
  const here = radius + (wristRadius - radius) * (clampedAxial / length);
  const clampedRadial = radial > here ? here : radial;
  out.point.x = cylinder.elbow.x + clampedAxial * ux + clampedRadial * rx;
  out.point.y = cylinder.elbow.y + clampedAxial * uy + clampedRadial * ry;
  out.point.z = cylinder.elbow.z + clampedAxial * uz + clampedRadial * rz;
  out.along = clampedAxial / length;

  const inside = axial >= 0 && axial <= length && radial <= here;
  out.gap = inside
    ? // Deepest inside is nearest the middle of the solid, so the depth is whichever face is
      // closest — the curved side or either cap.
      -Math.min(here - radial, axial, length - axial)
    : Math.hypot(point.x - out.point.x, point.y - out.point.y, point.z - out.point.z);
  return out;
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
