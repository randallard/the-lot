/**
 * The standing couple's handhold, as numbers you can put a threshold on.
 *
 * ## Why this exists
 *
 * Ryan, 2026-09-07: *"add to our chart so that there is something easy to test for, such as
 * the coordinates of the held hands … the belle's hand should be held level just above the
 * beau's hand and the beau's hand should be level just below the belle's."*
 *
 * That is a **rule**, and a rule is worth more than a rating. A 0–4 score says a pose looked
 * wrong; a number says which of the three things about it is wrong, on which pairings, and
 * by how much — and it goes on saying so after a fix without anybody having to look again.
 * So the review's chart carries both: the scores for what only an eye can judge, and these
 * for what arithmetic can.
 *
 * ## The three questions, in the order they fail
 *
 * 1. **Order** — is the beau's hand centre *below* the belle's? That is the hold as
 *    authored: *"beau right palm up and belle's left palm down"* (2026-08-15).
 * 2. **Contact** — do the two drawn hands actually meet? By construction they do: each
 *    dancer's own palm surface is put on `hold.height` ({@link touchLift}), so tangency is
 *    guaranteed rather than measured.
 * 3. ✅ **Face** — do they meet *palm to palm*, or edge to edge? This was the one nothing was
 *    checking and the one that failed; ADR-0052's wrist fixed it. {@link HandMetrics.flatness}
 *    is 0 when a palm lies in the contact plane and 1 when it stands on its rim.
 * 4. 🔴 **Room** — can each forearm actually *get to* its own hand? Two palms meeting face to
 *    face sit on one vertical line, and an arm reaching the lower of them has to come down
 *    through the upper one. {@link HandMetrics.partnerForearmGap} is the surface gap between a
 *    hand and the partner's forearm, and it is negative on every pairing the cast can make.
 *
 * ## The thing to understand before reading a number here
 *
 * **A hand is an ellipsoid, not a ball**, and since ADR-0052 it is one that *turns*: the
 * wrist rolls the palm level before it bends. So every extent here is taken through
 * {@link handExtentAlong} on the hand as drawn, in the direction actually being asked about.
 * A radius would answer for a hand nobody is drawing — Myco's is 0.110 across and 0.025
 * thick, and which of those is the right number depends entirely on the question.
 *
 * 🔑 **Question 4 is the one the wrist created.** Before it, the palms met edge to edge and
 * the two hands sat well apart; flattening them put both centres within a palm-thickness of
 * one contact plane, stacked on a common vertical. That is the correct-looking hold, and it
 * is also the arrangement in which each forearm's only route to its own hand runs through
 * the partner's. The fix for question 3 is what made question 4 visible.
 */

import {
  armMetrics,
  contact,
  drawnForearm,
  handCentre,
  vec3,
  forearm,
  handExtentAlong,
  touchHold,
  touchLift,
  trackCylinder,
  type ArmMetrics,
  type ArmPose,
  type Forearm,
  type Placement,
  type TouchHold,
  type Vec3,
} from "./arm-pose";
import type { CharacterBodyShape } from "../services/body-shapes";

/** One dancer's half of the hold. */
export interface HandMetrics {
  /** World height of this hand's **centre**. */
  readonly centreY: number;
  /**
   * How far this palm is from lying flat in the contact plane: **0 = face on, 1 = edge on.**
   *
   * The hand is a sphere of `radius` flattened to `flattenZ · radius` along the palm normal,
   * so its half-extent along world up runs from the half-thickness (palm flat, facing the
   * partner) to the full radius (palm vertical, meeting them on its rim). This is where in
   * that range the pose actually landed, which makes it comparable across bodies whose hands
   * are different sizes.
   */
  readonly flatness: number;
  /** Angle of the forearm off straight-down, in degrees. Over 90° is a forearm pointing *up*. */
  readonly forearmTilt: number;
  /**
   * 🔴 Surface gap between this hand and the **partner's forearm**. Positive is clear air;
   * **negative is the partner's arm inside this hand**, by that much.
   *
   * Both ends of it are measured on the drawn solid rather than on a radius: the forearm is a
   * cylinder of `forearmHalfWidth`, and the hand's share is {@link handExtentAlong} in the
   * direction of the crossing, which is the ellipsoid's own reach that way.
   */
  readonly partnerForearmGap: number;
  /**
   * Where along the partner's forearm the crossing is: **0 at their elbow, 1 at their hand.**
   *
   * Reported because it says *which* defect this is. Near 1 is the two hands stacked on one
   * vertical with the wrist end fouling — the structural case. Anywhere mid-span would be an
   * arm laid across a partner, which is a different fault and is not what the cast does.
   */
  readonly partnerForearmAlong: number;
}

export interface HoldMetrics {
  readonly hold: TouchHold;
  readonly beau: HandMetrics;
  readonly belle: HandMetrics;
  /** Centre-to-centre distance between the two hands. */
  readonly gap: number;
  /**
   * What {@link gap} would be if both palms lay flat against each other — the sum of the two
   * half-thicknesses, and the only gap a handhold has any business having.
   */
  readonly idealGap: number;
  /** Beau's hand below the belle's, which is the hold as authored. */
  readonly stacked: boolean;
}

/** Half-thickness of a palm: its radius, flattened along its own normal. */
function halfThickness(shape: CharacterBodyShape): number {
  return shape.hand.open.radius * shape.hand.open.flattenZ;
}

/**
 * Measure the standing couple's handhold for two bodies.
 *
 * 🔑 **Solved through the real `touchHold` and the real `touchLift`**, so this cannot
 * disagree with the picture — the same rule the debug scene's `holdReadout` follows and for
 * the same reason. A second derivation beside the first is two numbers for one thing, which
 * is the defect ADR-0045 was written about.
 */
export function holdMetrics(
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  /**
   * 🧪 **Exploratory (2026-09-14, resigned 2026-09-19), not a decided stance.** Radians the
   * beau turns *toward* the belle, with the hold point held fixed on the floor — the beau
   * yaws `−turnIn`. 🧪 **Not mirrored (2026-09-19):** `player/player` under the mirrored
   * version showed the belle needed to turn *away* rather than in, so the belle now yaws
   * `−turnIn` too (the same sign as the beau, not `+turnIn`) — same magnitude as the beau,
   * opposite effect because her hold-frame placement is already mirrored at `−width/2`. It
   * measures whether a couple turned slightly keeps its forearms off the vertical pole
   * without fouling (journal 2026-09-14-2, 2026-09-19). `touchHold` is **not** re-solved for
   * the turn, so width, lateral, height and forward are still the abreast answers. `0` takes
   * exactly the abreast path below.
   */
  turnIn = 0,
  /**
   * 🧪 **Exploratory (2026-09-19), not a decided stance.** World units the beau steps back
   * along the hold's own forward axis, and the belle steps forward by — the hold point stays
   * fixed on the floor, so each moves half the dial. From the `floor-stagger-yaw` probe
   * (2026-09-14, `stagger s>0 = beau behind`). `0` takes exactly the abreast/turn-only path.
   */
  stagger = 0,
  /**
   * 🧪 **Exploratory (2026-09-19), not a decided stance.** World units added to the shared
   * hold height, up or down — the one point both dancers' `touchLift` independently solve
   * their arm onto. `settleTouch`/`touchPose` work out whatever elbow bend the new target
   * implies; nothing here poses the elbow directly. `0` changes nothing.
   */
  handHeight = 0,
): HoldMetrics {
  const beau = armMetrics(beauShape);
  const belle = armMetrics(belleShape);
  const hold = touchHold(beau, belle);

  // Each dancer's inside hand is `across` beyond their own inside shoulder, on the side their
  // partner is on, at the hold's forward offset — the canonical standing couple `touchLifts`
  // solves against.
  const acrossBeau = hold.width / 2 + hold.lateral - hold.insideBeau;
  const acrossBelle = hold.width / 2 - hold.lateral - hold.insideBelle;
  // Turned in, the same floor point `(−lateral, forward)` is taken into each dancer's own
  // frame by the inverse of `place` below. Branched rather than always rotated so the abreast
  // numbers stay bit-identical to what every existing pin was written against.
  const localHold = (at: Placement): [number, number] => {
    const c = Math.cos(at.yaw), s = Math.sin(at.yaw);
    const dx = -hold.lateral - at.x, dz = hold.forward - at.z;
    return [dx * c - dz * s, dx * s + dz * c];
  };
  const [bx, bz] = turnIn === 0 && stagger === 0
    ? [-(acrossBeau + hold.insideBeau), hold.forward]
    : localHold({ x: hold.width / 2, z: -stagger / 2, yaw: -turnIn });
  const [lx, lz] = turnIn === 0 && stagger === 0
    ? [acrossBelle + hold.insideBelle, hold.forward]
    : localHold({ x: -hold.width / 2, z: stagger / 2, yaw: -turnIn });
  // The plane both palms actually rest on — `hold.height` plus whatever the dial moved it.
  const contactHeight = hold.height + handHeight;
  const b = touchLift(beau, true, bx, bz, contactHeight, hold.insideBeau);
  const l = touchLift(belle, false, lx, lz, contactHeight, hold.insideBelle);

  // **The couple, on the floor.** Both arms are solved in their own local frames and neither
  // needs the other — that locality is `palmOffset`'s whole design — so the first thing a
  // question about *one arm against the other* needs is the one frame they share.
  //
  // The beau stands at `+width/2` and the belle at `−width/2`, both facing `+z`, which is the
  // placement `touchLifts` is already implicitly solving: it hands the beau a hand at local
  // `−(width/2 + lateral)` and the belle one at `+(width/2 − lateral)`, and those are the same
  // world point only from these two spots. Derived here rather than asserted — the test checks
  // the two hands land together.
  //
  // Abreast, both yaws are zero and a *direction* means the same thing in either dancer's frame
  // as it does on the floor. Turned in (`turnIn`) it does not, so the crossing direction handed
  // to {@link handExtentAlong} — which asks in the dancer's own frame — is rotated into it first.
  const beauAt: Placement = { x: hold.width / 2, z: -stagger / 2, yaw: -turnIn };
  const belleAt: Placement = { x: -hold.width / 2, z: stagger / 2, yaw: -turnIn };
  // 🔑 **Where the hand is, and where the arm is, are two different questions now.**
  // `handCentre` swings the hand off the wrist the way the render draws it; `drawnForearm`
  // stops where the cylinder does. Neither is `elbow + forearmSpan · aim` any more — that
  // point is the end of the arm's *line* and there is nothing of the dancer at it.
  const place = (m: ArmMetrics, side: "left" | "right", pose: ArmPose, at: Placement): Vec3 => {
    const local = handCentre(vec3(), m, side, pose);
    const c = Math.cos(at.yaw), sn = Math.sin(at.yaw);
    return {
      x: at.x + local.x * c + local.z * sn,
      y: m.rigOriginY + local.y,
      z: at.z - local.x * sn + local.z * c,
    };
  };
  const beauHandAt = place(beau, "right", b.pose, beauAt);
  const belleHandAt = place(belle, "left", l.pose, belleAt);
  const beauArm = drawnForearm(forearm(), beau, b.pose, beauAt);
  const belleArm = drawnForearm(forearm(), belle, l.pose, belleAt);

  const measure = (
    shape: CharacterBodyShape,
    m: ArmMetrics,
    side: "left" | "right",
    pose: ArmPose,
    mineHandCentre: Vec3,
    partner: ArmMetrics,
    theirs: Forearm,
    at: Placement,
  ): HandMetrics => {
    const half = halfThickness(shape);
    const radius = shape.hand.open.radius;
    // How far this palm's own centre ended up from the contact plane — a half-thickness when
    // it came level, more when the wrist's clamp left it proud. Read off the placed hand
    // rather than off the solve's lift, which since 2026-09-13 is the **wrist's** offset.
    const rise = Math.abs(mineHandCentre.y - contactHeight);
    // 🔑 **Both solids are taken as they are drawn, and neither as a radius.** The partner's
    // arm is the capped cylinder `Dancer` draws — `trackCylinder`, not `trackContact`, because
    // the two hands sit off the *ends* of each other's forearms and that is the one place a
    // capsule and a cylinder disagree. And the hand is an ellipsoid whose reach depends on the
    // direction asked, so it is left out of the distance and put back on the next line, along
    // the direction the crossing actually happens in.
    const c = trackCylinder(contact(), mineHandCentre, theirs, partner.forearmElbowRadius, partner.forearmWristRadius);
    const wx = c.point.x - mineHandCentre.x, wz = c.point.z - mineHandCentre.z;
    const cy = Math.cos(at.yaw), sy = Math.sin(at.yaw);
    return {
      centreY: mineHandCentre.y,
      // Guarded because a perfectly round hand (`flattenZ` 1) has no flat face to speak of,
      // and dividing by its zero range would report a defect that is a body, not a pose.
      flatness: radius - half < 1e-9 ? 0 : (rise - half) / (radius - half),
      forearmTilt:
        (180 / Math.PI) *
        Math.acos(Math.min(1, Math.max(-1, -pose.aimY / Math.hypot(pose.aimX, pose.aimY, pose.aimZ)))),
      partnerForearmGap:
        c.gap -
        handExtentAlong(
          m,
          side,
          pose.aimX,
          pose.aimY,
          pose.aimZ,
          wx * cy - wz * sy,
          c.point.y - mineHandCentre.y,
          wx * sy + wz * cy,
        ),
      partnerForearmAlong: c.along,
    };
  };

  // "beau right palm up and belle's left palm down" (2026-08-15) — the same two sides
  // `palmOffset` picks, so the hand measured here is the hand the solve posed.
  const beauHand = measure(beauShape, beau, "right", b.pose, beauHandAt, belle, belleArm, beauAt);
  const belleHand = measure(belleShape, belle, "left", l.pose, belleHandAt, beau, beauArm, belleAt);
  return {
    hold,
    beau: beauHand,
    belle: belleHand,
    gap: belleHand.centreY - beauHand.centreY,
    idealGap: halfThickness(beauShape) + halfThickness(belleShape),
    stacked: beauHand.centreY < belleHand.centreY,
  };
}

/**
 * How flat a palm has to be for the hold to read as one, on the 0–1 scale above.
 *
 * 🔴 **Not met by any pairing on the shipped cast today** — the measured range is 0.03 to
 * 1.00 with a median near 0.86, so this is a target rather than an invariant, and the chart
 * prints it as a target. Set where it is because a palm a quarter of the way to its rim
 * still presents most of its face to the partner; past halfway the hands are meeting on an
 * edge whatever the arithmetic says about tangency.
 */
export const FLAT_ENOUGH = 0.25;
