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
 * - {@link RESHAPE} — the beau's torso grows and the belle's shrinks, each by half of
 *   what the gap needs and then a little more. Both dancers keep hold.
 * - {@link BREAK} — nobody changes shape, both reach as far as they can, and the hands
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
import { type CharacterBodyShape } from "../services/body-shapes";
import {
  BREAK,
  OVERSHOOT,
  RESHAPE,
  growBody,
  reshapeDeltas,
  type Accommodation,
  type BodyDeltas,
} from "./accommodation";


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
  /** Body-height changes to apply. Both zero under {@link BREAK}. */
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
    accommodation === RESHAPE
      ? reshapeDeltas(beauShape, belleShape, deficit * (1 + OVERSHOOT))
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
 * 🔴 **Per accommodation, as of [ADR-0037](../../docs/adr/0037-the-figure-is-sized-to-the-accommodation-drawn.md).**
 * It used to take the **worse** of the two, because ADR-0030 sized the figure before the coin was
 * flipped so it would hold either way. That cost more than it looked: on the default cast a
 * reshape wants **0.193** of the couple's width and a break wants **0.951** — five times more —
 * so every Twirl was danced with a bow for a break the pair had usually not drawn.
 *
 * A break is the binding one, and the reason is worth keeping: its beau never gets his hand up,
 * so the join sits lower, where a head is wider.
 */
export function archClearance(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
  accommodation: Accommodation,
): number {
  const hand = Math.max(beau.handRadius, belle.handRadius);
  const plan = planArch(beau, belle, beauShape, belleShape, width, accommodation);
  const b =
    plan.bodyDeltas.beau === 0 ? beau : armMetrics(growBody(beauShape, plan.bodyDeltas.beau));
  const l =
    plan.bodyDeltas.belle === 0 ? belle : armMetrics(growBody(belleShape, plan.bodyDeltas.belle));
  let need = 0;
  // Each hand sits at the pair's midpoint, so each must clear **both** bodies' cross-sections
  // at its own height — half the separation each way. `sideExtentAt` narrows a head toward
  // its poles, so a hand held high over a crown costs less than one held at eye level.
  for (const height of [plan.hands.beau, plan.hands.belle]) {
    const widest = Math.max(sideExtentAt(b.parts, height), sideExtentAt(l.parts, height));
    need = Math.max(need, 2 * (widest + hand));
  }
  return need;
}

/**
 * Whether this pair can dance an arch at all under `accommodation` — **can the figure be given
 * the room, at the width they are standing at?**
 *
 * square-one bows the beau's arc out to meet the clearance, and at both ends of the call the two
 * are exactly the couple's width apart whatever the bow does in between, so a request **at or
 * above that width cannot be delivered at any bow** (its ADR-0018). Asking anyway is not an
 * error there: it is answered with the cap, the widest bow the figure has, which looks like a
 * working figure danced by a sprinting beau.
 *
 * 🔴 **So the question has to be asked on this side, and it was not** until 2026-08-21. Myco with
 * Sprout — an adult and a child — wants **1.62** of their handholding width under either
 * accommodation, and had been silently capped since the field existed (ADR-0037).
 */
export function archFits(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
  accommodation: Accommodation,
): boolean {
  return archClearance(beau, belle, beauShape, belleShape, width, accommodation) < width;
}

/** What one execution of an arch call was drawn to do, and the room and width it needs. */
export interface ArchSizing {
  /** The accommodation the pair will dance — the draw, unless the draw cannot be delivered. */
  readonly accommodation: Accommodation;
  /** The clearance the figure has to deliver at the pass, in world units. */
  readonly wanted: number;
  /** How far apart the pair stand while dancing it, in world units. */
  readonly width: number;
}

/**
 * Size one execution of an arch call to the accommodation it drew (ADR-0037).
 *
 * 🔴 **Here rather than in `DanceFloor` because it has been duplicated into a test helper three
 * times and been wrong there twice** — once by omitting the arch clearance entirely, once by
 * omitting the floor below. A helper that drives the performance *almost* like the scene measures
 * a figure nobody dances, and the only cure that holds is for there to be one implementation.
 *
 * Three things decide it:
 *
 * 1. **The draw.** A reshape and a break want very different room — 0.193 and 0.951 of the
 *    couple's width on the shipped cast — because a reshape puts the joined hand high above the
 *    crown where a head is narrow, and a break leaves it low where a head is widest.
 * 2. **A floor at `bodies`**, the room the two of them need hands-free. A hold cannot make a pass
 *    cheaper than no hold, and without this a reshaped Twirl passed *closer* than a Trade out of
 *    the same two people.
 * 3. **Whether it fits at all.** A clearance at or above the couple's own width cannot be
 *    delivered at any bow (square-one ADR-0018) and is silently answered with the widest bow the
 *    figure has. When neither accommodation fits, the pair let go — and a pair who have let go
 *    are not held to a handhold's width, so they stand at **twice** the room they need, where the
 *    beau's arc delivers it on its own radius with no bow at all.
 */
export function sizeArch(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
  bodies: number,
  drawn: Accommodation,
): ArchSizing {
  const wanted = Math.max(archClearance(beau, belle, beauShape, belleShape, width, drawn), bodies);
  if (wanted < width) return { accommodation: drawn, wanted, width };
  const broken = Math.max(
    archClearance(beau, belle, beauShape, belleShape, width, BREAK),
    bodies,
  );
  return { accommodation: BREAK, wanted: broken, width: 2 * broken };
}
