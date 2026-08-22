/**
 * The **forearm hold** — the arm-turn family's grip — and what a pair does when their
 * bodies cannot make it.
 *
 * square-one declares the hold (`GripSpan.grip === "forearm"`, two horizontal antiparallel
 * forearms along the line between the pair, each hand at the other's elbow) and has no bodies
 * to say whether these two can achieve it. This module has the bodies, so this module answers
 * it — the same division [`arch.ts`](arch.ts) makes for the raised handhold.
 *
 * ## The gap the arch left
 *
 * [ADR-0028](../../docs/adr/0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md) gave
 * the arch two accommodations and [ADR-0032](../../docs/adr/0032-the-accommodation-belongs-to-the-hold-not-to-the-arch.md)
 * made them hold-agnostic. The forearm hold had neither: `DanceFloor` found an accommodation
 * with `grip === "arch"`, `gripPose` posed the joined forearms, and **nothing asked whether the
 * two dancers could reach the height they were being posed at**. `gripHeight` averaged their
 * two resting elbows and its own doc has carried the failure mode since the fist bump —
 *
 * > past a big enough height difference the real rule is that the *taller* dancer does nearly
 * > all the accommodating, because an adult can drop their arm to a child's height and the
 * > child cannot raise theirs to the adult's
 *
 * ADR-0028 said that fact had "arrived somewhere it cannot be deferred" for the arch. This is
 * where it arrives for the hold it was originally written about.
 *
 * ## Why the mean elbow is not always reachable
 *
 * A joined forearm lies **horizontal at one shared height**, so each dancer's elbow has to be
 * at that height. The elbow hangs off the shoulder on the undrawn upper arm, which is
 * `elbowReach` long — so a dancer can put their elbow anywhere on a sphere of that radius about
 * `restY`, and no further. The hold is reachable for them exactly when
 * `|height − restY| ≤ elbowReach`.
 *
 * Averaging two elbows splits the difference, which is fine for a pair of similar height and
 * asks the impossible of a mismatched one: the child's shoulder is below the mean by more than
 * their whole upper arm.
 *
 * ## Why a reshape fixes it, and this is not the arch's argument reused
 *
 * A body-height change of `d` moves the whole shoulder-and-head assembly by `d/2` and changes
 * **no arm length** — ADR-0028's finding, and the reason the torso is the lever. Here it has a
 * property the arch's version does not: growing the shorter dancer by `d` and shrinking the
 * taller by `d` moves their elbows by `+d/2` and `−d/2`, which **leaves the mean exactly where
 * it was** and closes *both* dancers' gaps to it by `d/2`. One number, symmetric, and the hold
 * does not move while it is being made reachable.
 *
 * A break makes the opposite trade: nobody changes shape, each dancer's forearm sits at the
 * closest height their own upper arm can put it, and the two forearms end at **different
 * heights** — which is the hold coming apart, drawn honestly.
 */

import { contactRadius, contactSeparation, gripHeight, type ArmMetrics } from "./arm-pose";
import {
  BREAK,
  NO_DELTAS,
  OVERSHOOT,
  RESHAPE,
  reshapeDeltas,
  type Accommodation,
  type BodyDeltas,
} from "./accommodation";
import type { CharacterBodyShape } from "../services/body-shapes";

/** The world height this dancer's elbow can be moved to, at the limit of the upper arm. */
function elbowRange(m: ArmMetrics): { readonly low: number; readonly high: number } {
  const shoulder = m.rigOriginY + m.restY;
  return { low: shoulder - m.elbowReach, high: shoulder + m.elbowReach };
}

/** How far this dancer's elbow falls short of `height`; `0` when they can reach it. */
export function elbowShortfall(m: ArmMetrics, height: number): number {
  const { low, high } = elbowRange(m);
  if (height < low) return low - height;
  if (height > high) return height - high;
  return 0;
}

/** The nearest height to `height` this dancer's elbow can actually be put. */
export function nearestElbowHeight(m: ArmMetrics, height: number): number {
  const { low, high } = elbowRange(m);
  return Math.min(high, Math.max(low, height));
}

/**
 * How far the **body centre** sits from the shared pivot once forearms are joined — the
 * number square-one's `FigureShape.gripRadius` wants (its ADR-0020), in world units.
 *
 * Read straight out of the pose rather than invented: `gripPose` puts the hand at
 * {@link contactRadius} from the pivot and walks the forearm back from there, so the arm
 * group — the shoulder — lands `forearmSpan − contactRadius` behind it. The body centre is a
 * further `restX` back, because in an arm turn the dancers face **tangentially** and it is the
 * inside shoulder that is over the pivot.
 *
 * 🔴 **Per dancer, because two different arms genuinely put two bodies at two distances.**
 * square-one's figure has one radius for the pair; {@link pairGripRadius} is what it gets.
 */
export function bodyGripRadius(me: ArmMetrics, them: ArmMetrics): number {
  return me.forearmSpan - contactRadius(me, them) + me.restX;
}

/**
 * The one radius the pair's figure is walked at — the **mean** of what each dancer's own arm
 * asks for.
 *
 * 🔴 Not the max, and not a floor. ADR-0021 is explicit that a grip radius is a *placement*
 * rather than room a figure must find: it is where two people's arms actually put them, so the
 * pair's shared circle is the average of the two and not the more demanding of them. The
 * per-dancer difference does not go missing — `gripPose` places each arm from the pivot
 * independently, so the hands stay joined whichever circle the bodies walk.
 */
export function pairGripRadius(a: ArmMetrics, b: ArmMetrics): number {
  return (bodyGripRadius(a, b) + bodyGripRadius(b, a)) / 2;
}

/** What a forearm hold costs this pair, and what they do about it. */
export interface ForearmPlan {
  readonly accommodation: Accommodation;
  /**
   * The shared world height the joined forearms lie at.
   *
   * The mean of the two resting elbows in every case — a reshape is chosen precisely so that
   * it does not move (see the module doc), and a break does not move it either because nobody
   * changes shape. What a break moves is where each dancer's forearm actually ends up.
   */
  readonly height: number;
  /** Body-height changes to apply. Both zero under {@link BREAK}. */
  readonly bodyDeltas: BodyDeltas;
  /**
   * Where each dancer's forearm ends up, in world height.
   *
   * Equal to {@link height} whenever the hold closes. Under a {@link BREAK} by a pair who
   * cannot reach, they differ — and that difference **is** the hold coming apart.
   */
  readonly beauY: number;
  readonly belleY: number;
  /** How far apart the two forearms finish. `0` is a hold that closed. */
  readonly gap: number;
  /** Whether the hands are actually together at the end of it. */
  readonly joined: boolean;
}

/**
 * Plan a forearm hold for this pair under the accommodation they drew.
 *
 * Symmetric in the two dancers except for the sign of the reshape, which follows
 * `reshapeDeltas`' convention: positive `d` grows the beau. The **shorter-elbowed** dancer is
 * the one who grows, whichever side they are standing on, because the lever is about bodies and
 * not about position.
 */
export function planForearm(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  accommodation: Accommodation,
): ForearmPlan {
  const height = gripHeight(beau, belle);
  const shortBeau = elbowShortfall(beau, height);
  const shortBelle = elbowShortfall(belle, height);
  const worst = Math.max(shortBeau, shortBelle);

  if (worst <= 0) {
    // The ordinary case: both can put an elbow on the shared line, so there is nothing to
    // accommodate and the draw does not matter. Reported as the accommodation drawn rather
    // than as a third state — a pair who did not need one still drew one.
    return {
      accommodation,
      height,
      bodyDeltas: NO_DELTAS,
      beauY: height,
      belleY: height,
      gap: 0,
      joined: true,
    };
  }

  if (accommodation === BREAK) {
    // Nobody changes shape; each forearm goes as close as that dancer's own upper arm allows.
    const beauY = nearestElbowHeight(beau, height);
    const belleY = nearestElbowHeight(belle, height);
    const gap = Math.abs(beauY - belleY);
    return { accommodation, height, bodyDeltas: NO_DELTAS, beauY, belleY, gap, joined: gap === 0 };
  }

  // A reshape closes both gaps at once: growing the shorter-elbowed dancer by `d` and shrinking
  // the other by `d` moves their elbows `±d/2` and leaves the mean where it was, so each gap
  // shrinks by `d/2`. Hence twice the worst shortfall, and the overshoot for the reason
  // ADR-0028 gives — landing at exactly the limit is the degenerate elbow solve.
  const magnitude = 2 * worst * (1 + OVERSHOOT);
  // 🔴 **Signed by whose elbow is lower, not by whose shortfall is larger.** The first version
  // of this used the shortfall and inverted itself: on the shipped cast Myco can reach the mean
  // and Ember cannot, so the shortfall test grew *Ember* — the taller of the two — and drove her
  // elbow further from the line it had to meet. Measured, that reshape finished 0.511 apart
  // where the break finished 0.238, which is an accommodation that accommodates nothing.
  //
  // The dancer **below** the mean grows and the one above shrinks; that is what moves both
  // elbows toward it. `reshapeDeltas` grows the beau on a positive `d`.
  const beauElbow = beau.rigOriginY + beau.elbowY;
  const belleElbow = belle.rigOriginY + belle.elbowY;
  const deltas = reshapeDeltas(
    beauShape,
    belleShape,
    beauElbow <= belleElbow ? magnitude : -magnitude,
  );
  // Measured back from the deltas that survived the shape editor's bounds, not from the
  // magnitude asked for: a pair whose accommodation is clipped there simply breaks by more,
  // which is `growBody`'s standing contract and has to be honoured here rather than assumed away.
  const beauY = nearestElbowHeight(shiftElbow(beau, deltas.beau), height);
  const belleY = nearestElbowHeight(shiftElbow(belle, deltas.belle), height);
  const gap = Math.abs(beauY - belleY);
  return { accommodation: RESHAPE, height, bodyDeltas: deltas, beauY, belleY, gap, joined: gap === 0 };
}

/**
 * The same metrics with the shoulder moved as a body-height change of `delta` would move it.
 *
 * `restY` shifts by half the height change and every arm length is untouched — ADR-0028's one
 * slider, two effects. Cheaper and more honest than re-measuring a grown body here: the thing
 * being asked is only *where is the shoulder now*, and re-deriving the whole rig would invite
 * the two answers to disagree.
 */
function shiftElbow(m: ArmMetrics, delta: number): ArmMetrics {
  return delta === 0 ? m : { ...m, restY: m.restY + delta / 2 };
}

/** The lateral offset a joined pair of forearms sits at — unchanged, and re-exported so a
 *  caller planning a hold gets both numbers from one place. */
export { contactRadius, contactSeparation };
