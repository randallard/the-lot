/**
 * The **arch** — the raised handhold a California Twirl is danced under — and the two
 * things a pair does when their bodies cannot make one.
 *
 * square-one declares the hold (`GripSpan.grip === "arch"`, its ADR-0017) and says only
 * *palms joined, raised clear of the head, high enough to walk beneath*. It has no bodies
 * and cannot say how high that is. This module answers it, and then answers the harder
 * question the answer immediately raises.
 *
 * ## The arch is usually impossible, and that is the interesting part
 *
 * Measured on the shipped cast: Ember's crown is at **2.155** and Myco's arm, from a
 * shoulder at 0.950, reaches **1.640** with the arm dead vertical. He is half a unit short
 * of the top of her head before anyone has tried to *hold hands* while doing it. Three of
 * the six pairings in the repo cannot make an arch at all, including the default one.
 *
 * That is not a defect to solve away. It is the same fact `gripHeight` has carried a note
 * about since the fist bump — *"past a big enough height difference the real rule is that
 * the taller dancer does nearly all the accommodating"* — arriving somewhere it cannot be
 * deferred, because an arch either clears a head or it does not.
 *
 * ## Two accommodations, drawn at random per execution
 *
 * Ryan, 2026-08-18: *"I want two options that happen randomly each time a move like this is
 * executed — sometimes the torsos grow/shrink each a little more than necessary to
 * accommodate, and sometimes the arms just reach as far as they can and the hold breaks to
 * accommodate."*
 *
 * - {@link ARCH_RESHAPE} — the beau's torso grows and the belle's shrinks, each by half of
 *   what the gap needs and then a little more. Both dancers keep hold.
 * - {@link ARCH_BREAK} — nobody changes shape, both reach as far as they can, and the hands
 *   come apart.
 *
 * **Neither is a failure mode.** They are two things dancers of mismatched size actually do,
 * and which one happens is drawn per execution so a repeated figure does not read as a
 * machine. See {@link drawAccommodation}.
 *
 * ## Why the reshape is a torso and not a crouch
 *
 * Ryan asked *"can we make the duck shrink the torso?"* — and it turns out this is the only
 * lever that works, for a reason worth writing down. `computePositions` builds a dancer as
 * `shoulderY = bodyCenterY + height/2 + radius`, with the head, elbow and hand all hung off
 * that. So **a body-height change of `d` moves the whole shoulder-and-head assembly by
 * `d/2` and changes no arm length at all**: `handReach`, `elbowReach` and `forearmSpan` are
 * differences of heights that all shift together. One number, two effects, no distortion of
 * anybody's proportions except the torso the slider names.
 */

import {
  armMetrics,
  sideExtentAt,
  type ArmMetrics,
} from "./arm-pose";
import { SHAPE_BOUNDS, type CharacterBodyShape } from "../services/body-shapes";

/** How a pair accommodates an arch their bodies cannot make. */
export type Accommodation = typeof ARCH_RESHAPE | typeof ARCH_BREAK;

/** Both torsos change — the beau's grows, the belle's shrinks — and the hold survives. */
export const ARCH_RESHAPE = "reshape";
/** Nobody changes shape, both arms reach their limit, and the hands come apart. */
export const ARCH_BREAK = "break";

/**
 * How far past the gap a reshape goes — Ryan's *"a little more than necessary"*.
 *
 * 🔑 **The overshoot is mechanical, not decorative, and that was a surprise.** Reshaping by
 * *exactly* the deficit lands both dancers at full stretch, and a fully straight arm is the
 * degenerate case of `touchPose`'s elbow solve: the circle of legal elbows shrinks to a
 * point, the in-plane solution stops existing, and the pose falls through to `reachPose`'s
 * preference constants — the ones ADR-0027 was written to stop relying on. Measured on the
 * default cast: at overshoot 0 the beau's elbow leaves his shoulder's plane; at 0.15 both
 * dancers solve in plane with the anatomy intact.
 *
 * So this is the one tuned number here, and what it buys is that nothing *else* is tuned.
 * A dial for Ryan. Measured: the default cast needs about **5%** to get the beau off the
 * boundary, and 15% is that rounded up far enough that a cast nobody has measured is not
 * sitting on it either.
 */
export const ARCH_OVERSHOOT = 0.15;

/**
 * How much daylight the joined hands keep above the crown of the head that passes beneath:
 * **a hand's width**, the same clearance `handDaylight` gives sideways in a standing hold.
 *
 * Derived rather than eyeballed, and for the same reason: the thing that must visibly fit
 * between a head and a join is a hand, so a hand is the measure.
 */
function headroom(beau: ArmMetrics, belle: ArmMetrics): number {
  return Math.max(beau.handRadius, belle.handRadius);
}

/**
 * The top of a dancer — the highest point of any rigid part, **including a sphere's own
 * radius**.
 *
 * `rigidParts` writes a head as a zero-length segment at its *centre* carrying a radius
 * (`y0 === y1 === headCenterY`), because that is what `sideExtentAt` needs to narrow a
 * sphere toward its poles. So the naive `max(y1)` is the middle of somebody's head, and on
 * the shipped cast that is 0.44 short — enough to walk a dancer's crown straight through the
 * arch while every number said it cleared.
 */
export function crownOf(m: ArmMetrics): number {
  return Math.max(...m.parts.map((p) => p.y1 + p.radius));
}

/**
 * The highest a dancer's own inside hand can get, at a given couple separation.
 *
 * A reach is a sphere: whatever the arm spends going **across** to meet its partner is not
 * available going up. Same decomposition `bandedHeight` makes for a hanging hold, with the
 * sign the other way round.
 */
export function reachCeiling(m: ArmMetrics, separation: number): number {
  const across = Math.abs(separation / 2 - m.restX);
  return m.rigOriginY + m.restY + Math.sqrt(Math.max(0, m.handReach ** 2 - across ** 2));
}

/**
 * How far the arch sits off the couple's midpoint, toward the belle.
 *
 * The same rule as a standing hold's (ADR-0025/0027): halfway between the two inside
 * shoulders, which is the one point at which both dancers reach the same distance across.
 *
 * **Unclamped, unlike the standing hold's**, and that is a property of being overhead rather
 * than an omission. `touchHold` finally clamps its lateral into the corridor between the two
 * bodies, because a hold at waist height can otherwise land inside somebody's chest. An arch
 * is above both crowns by construction — `sideExtentAt` returns nothing up there — so there
 * is no body to be inside of and nothing to clamp against.
 */
export function archLateral(beau: ArmMetrics, belle: ArmMetrics): number {
  return (beau.restX - belle.restX) / 2;
}

/** A body-height change, per dancer, in the units the shape editor's slider uses. */
export interface BodyDeltas {
  readonly beau: number;
  readonly belle: number;
}

/** What an arch costs this pair, and what they do about it. */
export interface ArchPlan {
  readonly accommodation: Accommodation;
  /**
   * Where the join wants to be: clear of the belle's crown, **after** any reshape.
   *
   * The target both dancers reach for in either accommodation. In a reshape they both get
   * there; in a break the shorter of them does not.
   */
  readonly height: number;
  /** How far off the couple's midpoint, toward the belle. */
  readonly lateral: number;
  /** Body-height changes to apply. Both zero under {@link ARCH_BREAK}. */
  readonly bodyDeltas: BodyDeltas;
  /**
   * Each dancer's own hand height — where they actually get to.
   *
   * Equal to {@link height} for anyone who can reach it. **Different from each other is
   * exactly what a broken hold is**, and the difference is what shows on screen.
   */
  readonly hands: { readonly beau: number; readonly belle: number };
  /** How far apart the two hands end up. `0` is a hold that survived. */
  readonly gap: number;
}

/**
 * Plan an arch for this pair at this separation.
 *
 * ## The algebra, which is short and does the whole job
 *
 * Write `d` for the body-height change — the beau `+d`, the belle `−d` — and recall that a
 * body-height change of `d` moves that dancer's shoulders and head by `d/2`. Then, holding
 * the separation fixed:
 *
 * ```
 * ceilingBeau(d)  = shoulderBeau  + d/2 + reachUpBeau
 * ceilingBelle(d) = shoulderBelle − d/2 + reachUpBelle
 * wanted(d)       = crownBelle    − d/2 + headroom
 * ```
 *
 * Two constraints fall out, and they are of completely different kinds:
 *
 * 1. **The beau's:** `ceilingBeau ≥ wanted` needs `d ≥ crownBelle + headroom − shoulderBeau
 *    − reachUpBeau`. Every unit of `d` buys a full unit — half from his shoulder rising and
 *    half from her crown dropping. **This is what a reshape is for.**
 * 2. **The belle's:** `ceilingBelle ≥ wanted` reduces to `reachUpBelle ≥ crownBelle +
 *    headroom − shoulderBelle`, and **`d` cancels out of it entirely.** Shrinking her lowers
 *    her crown and her shoulder by the same amount, so it moves her own constraint not at
 *    all.
 *
 * 🔑 **So there is a kind of arch no torso can fix: the one where a dancer cannot get their
 * own hand above their own head.** Myco misses it by 0.009 and Sprout by 0.265 — big heads
 * on short arms. When that happens the reshape does its half and the hold breaks by the
 * remainder, which is the honest picture rather than a solve that quietly lies.
 *
 * The even split — the beau grows exactly as much as the belle shrinks — is Ryan's *"the
 * torsos grow/shrink **each**"*, and it happens to be the split that makes constraint 1
 * cheapest per unit of visible deformation.
 */
export function planArch(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  separation: number,
  accommodation: Accommodation,
): ArchPlan {
  const clear = headroom(beau, belle);
  const lateral = archLateral(beau, belle);
  const wanted = crownOf(belle) + clear;

  const deficit = Math.max(0, wanted - reachCeiling(beau, separation));
  const bodyDeltas =
    accommodation === ARCH_RESHAPE
      ? clampDeltas(beauShape, belleShape, deficit * (1 + ARCH_OVERSHOOT))
      : { beau: 0, belle: 0 };

  // Re-measure whoever changed. Body height moves a shoulder and a crown by half of itself,
  // so this could be arithmetic — but `armMetrics` also re-derives `restX` from what is
  // beside the arm at its new height, and a shape that has grown is a shape this module has
  // no business half-measuring.
  const b = bodyDeltas.beau === 0 ? beau : armMetrics(growBody(beauShape, bodyDeltas.beau));
  const l = bodyDeltas.belle === 0 ? belle : armMetrics(growBody(belleShape, bodyDeltas.belle));

  const height = crownOf(l) + clear;
  const hands = {
    beau: Math.min(height, reachCeiling(b, separation)),
    belle: Math.min(height, reachCeiling(l, separation)),
  };

  return {
    accommodation,
    height,
    lateral,
    bodyDeltas,
    hands,
    gap: Math.abs(hands.beau - hands.belle),
  };
}

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

/** The pair of deltas, each clipped to what its own body may actually become. */
function clampDeltas(
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
 * **Drawn per execution, not per frame and not per pair.** The same two dancers doing the
 * same call twice should not do the same thing twice — that is the whole point of it being
 * random — and a draw that moved mid-call would reshape a torso halfway through an arch.
 */
export function drawAccommodation(random: () => number = Math.random): Accommodation {
  return random() < 0.5 ? ARCH_RESHAPE : ARCH_BREAK;
}

/**
 * How far apart this pair must stand to pass each other **under the arch** — the number
 * square-one's `Couple.archClearance` wants, in world units (square-one ADR-0018).
 *
 * 🔴 **Strictly more than the room their bodies need**, and the reason is the whole finding.
 * With hands free two dancers have to clear each other. With hands joined and raised there is a
 * **joined hand in the gap as well**, at head height, belonging to neither of them — and a head
 * is the widest thing either of them has. Ryan, watching a break: *"the beau's hand clips
 * through the belle's head — it shouldn't push into the beau's own head either though."*
 *
 * Measured on the shipped cast: torsos want 0.520, heads want 0.710, and heads with a hand
 * between them want **1.084**, against a couple who stand 1.140 apart. An arch very nearly
 * forbids the pair to approach each other at all.
 *
 * **The worse of the two accommodations**, because the figure is sized before the coin is
 * flipped and has to hold either way. A break is usually the binding one: its beau never gets
 * his hand up, so it sits lower, where a head is wider.
 */
export function archClearance(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
): number {
  const hand = Math.max(beau.handRadius, belle.handRadius);
  let need = 0;
  for (const mode of [ARCH_BREAK, ARCH_RESHAPE] as const) {
    const plan = planArch(beau, belle, beauShape, belleShape, width, mode);
    const b =
      plan.bodyDeltas.beau === 0 ? beau : armMetrics(growBody(beauShape, plan.bodyDeltas.beau));
    const l =
      plan.bodyDeltas.belle === 0 ? belle : armMetrics(growBody(belleShape, plan.bodyDeltas.belle));
    // Each hand sits at the pair's midpoint, so each must clear **both** bodies' cross-sections
    // at its own height — half the separation each way. `sideExtentAt` narrows a head toward
    // its poles, so a hand held high over a crown costs less than one held at eye level.
    for (const height of [plan.hands.beau, plan.hands.belle]) {
      const widest = Math.max(sideExtentAt(b.parts, height), sideExtentAt(l.parts, height));
      need = Math.max(need, 2 * (widest + hand));
    }
  }
  return need;
}
