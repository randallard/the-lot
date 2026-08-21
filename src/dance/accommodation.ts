/**
 * What a pair does when their bodies cannot reach a hold the figure asks for — **the two
 * styles, and the draw between them.**
 *
 * ## Why this is its own module
 *
 * All of this was in [`arch.ts`](arch.ts), because the California Twirl's arch was the first
 * hold a pair could physically fail to make (ADR-0028). It is not the only one, and the
 * question it answers is not about arches: *these two people cannot reach the thing the call
 * says they are holding — what do they do?* An Allemande Left's joined forearms and a couple's
 * touch-hands handhold both ask it, and neither has an answer yet.
 *
 * Ryan, 2026-08-21: *"I want to make sure we remember the two different styles of accommodation
 * for the reach in california twirl."* Remembering it means it stops living under the one call
 * that has it. Same move square-one's `CoupleShape` → `FigureShape` made in its ADR-0020, for
 * the same reason: the type had been named for the first thing that needed it.
 *
 * ## The two styles
 *
 * Ryan, asking for them in the first place:
 *
 * > I want two options that happen randomly each time a move like this is executed — sometimes
 * > the torsos grow/shrink each a little more than necessary to accommodate, and sometimes the
 * > arms just reach as far as they can and the hold breaks to accommodate
 *
 * - {@link RESHAPE} — both torsos change, by the same amount in opposite directions, and the
 *   hold survives.
 * - {@link BREAK} — nobody changes shape, both dancers reach as far as they can toward the same
 *   target, and the hands come apart.
 *
 * 🔴 **Neither is the fallback.** They are two things dancers of mismatched size actually do,
 * they are drawn at even odds, and the draw is per **execution** — the same two dancers doing
 * the same call twice should not do the same thing twice. A hold added later must answer *which
 * of these two* rather than inventing a third silent one, and must keep the draw.
 *
 * ## Why the reshape is a torso
 *
 * `computePositions` builds a dancer as `shoulderY = bodyCenterY + height/2 + radius`, with
 * head, elbow and hand all hung off that. So a body-height change of `d` moves the whole
 * shoulder-and-head assembly by `d/2` and changes **no arm length at all** — `handReach`,
 * `elbowReach` and `forearmSpan` are differences of heights that shift together. One slider,
 * two effects, nobody's proportions distorted but the torso's. That reasoning is about bodies
 * and not about arches, which is the other half of why it belongs here.
 */

import { SHAPE_BOUNDS, type CharacterBodyShape } from "../services/body-shapes";

/** How a pair accommodates a hold their bodies cannot make. */
export type Accommodation = typeof RESHAPE | typeof BREAK;

/** Both torsos change — one grows, the other shrinks — and the hold survives. */
export const RESHAPE = "reshape";
/** Nobody changes shape, both reach their limit, and the hands come apart. */
export const BREAK = "break";

/** Both styles, for a test or a report that has to cover the pair of them. */
export const ACCOMMODATIONS: readonly Accommodation[] = [RESHAPE, BREAK];

/**
 * How far past the gap a reshape goes — Ryan's *"a little more than necessary"*.
 *
 * 🔴 **It turned out to be mechanical rather than a matter of taste, which is why it is the
 * only tuned number in this family.** Reshaping by *exactly* the deficit lands both dancers at
 * full stretch, and a straight arm is the degenerate case of `touchPose`'s elbow solve: the
 * circle of legal elbows shrinks to a point, the in-plane solution stops existing, and the pose
 * falls through to `reachPose`'s preference constants — the ones ADR-0027 was written to stop
 * relying on. Measured: at overshoot 0 the beau's elbow leaves his shoulder's plane; at 0.05 it
 * does not. What 0.15 buys is that nothing else here is tuned.
 */
export const OVERSHOOT = 0.15;

/** A body-height change, per dancer, in the units the shape editor's slider uses. */
export interface BodyDeltas {
  readonly beau: number;
  readonly belle: number;
}

/** Nobody changes shape — what a {@link BREAK} always yields, and what a pair who can already
 *  reach the hold need. */
export const NO_DELTAS: BodyDeltas = { beau: 0, belle: 0 };

/**
 * Grow (or shrink) a body by `delta`, clamped to the shape editor's own bounds.
 *
 * The bounds are the editor's, deliberately: a dance may not put a dancer anywhere the
 * character sheet could not, or the reshape becomes a second, invisible definition of what a
 * body may be. A pair whose accommodation is clipped here simply breaks by more.
 */
export function growBody(shape: CharacterBodyShape, delta: number): CharacterBodyShape {
  const { min, max } = SHAPE_BOUNDS.body.height;
  const height = Math.max(min, Math.min(max, shape.body.height + delta));
  return { ...shape, body: { ...shape.body, height } };
}

/**
 * The pair of deltas for a reshape of `d`, each clipped to what its own body may actually
 * become — the beau up, the belle down.
 *
 * Signed from the beau's side because that is how every hold in this repo is described (beau
 * and belle, square-one's ADR-0012). A hold wanting the opposite sense passes a negative `d`.
 */
export function reshapeDeltas(
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  d: number,
): BodyDeltas {
  return {
    beau: growBody(beauShape, d).body.height - beauShape.body.height,
    belle: growBody(belleShape, -d).body.height - belleShape.body.height,
  };
}

/**
 * Draw an accommodation for one execution of the move.
 *
 * `random` is injected rather than reached for, so a test can say which one it wants and the
 * scene can still be a coin flip. Even odds: neither of these is the fallback.
 *
 * **Drawn per execution, not per frame and not per pair.** The same two dancers doing the same
 * call twice should not do the same thing twice — that is the whole point of it being random —
 * and a draw that moved mid-call would reshape a torso halfway through a hold. `DanceFloor`
 * keys it on the grip span's own identity for exactly that reason.
 */
export function drawAccommodation(random: () => number = Math.random): Accommodation {
  return random() < 0.5 ? RESHAPE : BREAK;
}
