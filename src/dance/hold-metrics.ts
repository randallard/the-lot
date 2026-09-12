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
 * 3. 🔴 **Face** — do they meet *palm to palm*, or edge to edge? This is the one nothing was
 *    checking, and it is the one that fails. {@link HoldMetrics.flatness} is 0 when a palm
 *    lies in the contact plane and 1 when it stands on its rim.
 *
 * ## The thing to understand before reading a number here
 *
 * **There is no wrist.** A hand is an ellipsoid with a fixed authored rotation, carried by
 * the forearm group — so where the palm faces is decided entirely by where the forearm
 * points, and the forearm points wherever the reach happened to leave it. `arm-pose.ts`
 * already compensates for the *consequence* (`handRiseAlongUp` measures the tilted hand's
 * true vertical extent, so the surfaces still touch) but nothing addresses the *cause*. Two
 * hands can therefore be exactly tangent and still be two coins standing on their rims.
 */

import {
  armMetrics,
  touchHold,
  touchLift,
  type TouchHold,
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
export function holdMetrics(beauShape: CharacterBodyShape, belleShape: CharacterBodyShape): HoldMetrics {
  const beau = armMetrics(beauShape);
  const belle = armMetrics(belleShape);
  const hold = touchHold(beau, belle);

  // Each dancer's inside hand is `across` beyond their own inside shoulder, on the side their
  // partner is on, at the hold's forward offset — the canonical standing couple `touchLifts`
  // solves against.
  const acrossBeau = hold.width / 2 + hold.lateral - hold.insideBeau;
  const acrossBelle = hold.width / 2 - hold.lateral - hold.insideBelle;
  const b = touchLift(beau, true, -(acrossBeau + hold.insideBeau), hold.forward, hold.height, hold.insideBeau);
  const l = touchLift(belle, false, acrossBelle + hold.insideBelle, hold.forward, hold.height, hold.insideBelle);

  const measure = (
    shape: CharacterBodyShape,
    lift: number,
    aim: { aimX: number; aimY: number; aimZ: number },
  ): HandMetrics => {
    const half = halfThickness(shape);
    const radius = shape.hand.open.radius;
    const rise = Math.abs(lift);
    return {
      centreY: hold.height + lift,
      // Guarded because a perfectly round hand (`flattenZ` 1) has no flat face to speak of,
      // and dividing by its zero range would report a defect that is a body, not a pose.
      flatness: radius - half < 1e-9 ? 0 : (rise - half) / (radius - half),
      forearmTilt:
        (180 / Math.PI) *
        Math.acos(Math.min(1, Math.max(-1, -aim.aimY / Math.hypot(aim.aimX, aim.aimY, aim.aimZ)))),
    };
  };

  const beauHand = measure(beauShape, b.lift, b);
  const belleHand = measure(belleShape, l.lift, l);
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
