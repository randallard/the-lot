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
  touchHold,
  type ArmMetrics,
} from "./arm-pose";
import {
  lateralClearance,
  rigidParts,
  NPC_BODY_CENTER_Y,
  SHAPE_BOUNDS,
  type CharacterBodyShape,
} from "../services/body-shapes";
import { CLEARANCE_MARGIN } from "./frame";
import {
  BREAK,
  OVERSHOOT,
  RESHAPE,
  growBody,
  growUpperArm,
  reshapeDeltas,
  standingLift,
  UPPER_ARM_STEP,
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

/**
 * Where one dancer's inside hand actually gets to, in the couple's own plane: a height and
 * an offset from the couple's midpoint, toward the belle.
 *
 * 🔴 **A height alone was not enough** (ADR-0038). A hold that survives puts both hands on
 * the same point and the lateral is common to them, so it lived on the plan once. A hold
 * that has *broken* does not: whoever falls short stops short **across** as well as up, and
 * pretending their hand still arrives over the join charges the figure for a reach nobody
 * makes.
 */
export interface HandPoint {
  /** World height. */
  readonly height: number;
  /** Offset from the couple's midpoint, toward the belle. */
  readonly lateral: number;
}

/**
 * The x of a dancer's **inside** shoulder — the one the arch hangs from — for a couple
 * `separation` apart, with the dancer on the `sign` side of the midpoint.
 *
 * `-1` is the beau's side and `+1` the belle's, matching {@link HandPoint.lateral}'s
 * direction. Written once because every question in this module is asked in this frame, and
 * mirroring it by hand is how a sign gets lost.
 */
export function insideShoulderX(m: ArmMetrics, separation: number, sign: -1 | 1): number {
  return sign * (separation / 2 - m.restX);
}

/**
 * As far toward `target` as this arm gets, from a shoulder at `shoulderX`.
 *
 * The target itself when it is within reach; otherwise `handReach` **along the direction to
 * it**, which is what an arm at full stretch does and what {@link reachPose} already draws —
 * a straight arm aimed at a point it cannot touch.
 *
 * 🔴 **Not {@link reachCeiling}**, which answers a different question: the highest a hand can
 * get if it must arrive *over the join*. That is the right question while a hold is being
 * planned — how high can this pair get their hands — and the wrong one once the answer is
 * "not that high", because it spends the whole shortfall on height and none of it on the
 * across, leaving the hand hovering above a spot the arm cannot span to.
 */
export function reachToward(
  m: ArmMetrics,
  shoulderX: number,
  target: HandPoint,
): HandPoint {
  const shoulderY = m.rigOriginY + m.restY;
  const dx = target.lateral - shoulderX;
  const dy = target.height - shoulderY;
  const d = Math.hypot(dx, dy);
  if (d <= m.handReach || d < 1e-9) return target;
  const f = m.handReach / d;
  return { lateral: shoulderX + dx * f, height: shoulderY + dy * f };
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
   * Each dancer's own hand — where they actually get to, height **and** lateral.
   *
   * Equal to `{ height, lateral }` for anyone who can reach it. **Different from each other
   * is exactly what a broken hold is**, and the difference is what shows on screen.
   */
  readonly hands: { readonly beau: HandPoint; readonly belle: HandPoint };
  /** How far apart the two hands end up. `0` is a hold that survived. */
  readonly gap: number;
}

/**
 * This dancer as they are while wearing a reshape — the grown shape, measured from a rig lifted by
 * {@link standingLift} so their feet stay where they were (ADR-0043).
 *
 * Returns the resting metrics untouched when there is no trade, which is every pair who can make
 * the hold and every `BREAK`.
 */
export function wearing(rest: ArmMetrics, shape: CharacterBodyShape, delta: number): ArmMetrics {
  if (delta === 0) return rest;
  const grown = growBody(shape, delta);
  return armMetrics(grown, NPC_BODY_CENTER_Y, standingLift(shape, grown));
}

/**
 * What a reshape is trying to make reachable — the two heights worth aiming a torso trade at.
 *
 * - {@link LOW} — **the belle's crown plus headroom**, the least ambitious thing that works: she
 *   has to walk under the join, so the hold has to survive at *that* height and no higher. Every
 *   reshape aimed here until 2026-08-22.
 * - {@link CLEAR} — **the taller dancer's crown plus headroom**, so the join comes out clear of
 *   both of them ([ADR-0041](../../docs/adr/0041-the-join-rises-as-far-as-the-pair-can-lift-it.md)'s
 *   `hi`). Costs more deformation and can cost the *figure* more room; it is the only aim that
 *   gives a pair with a much taller **beau** a reshape worth drawing.
 */
export type ReshapeAim = typeof LOW | typeof CLEAR;
export const LOW = "low";
export const CLEAR = "clear";

/**
 * The signed torso trade a reshape takes — positive grows the beau and shrinks the belle.
 *
 * 🔑 **Whoever sets the height cannot reshape their own way up to it.** Growing a dancer raises
 * their shoulder and their crown by the same `d/2`, so `d` cancels out of their own constraint
 * entirely — a fact `planArch`'s algebra has recorded since it was written. The lever therefore
 * belongs to the *other* dancer, and which one that is decides the **sign**: aiming at a taller
 * beau's crown means a **negative** `d`, where he shrinks and she grows, so his crown comes down
 * to meet the reach she is gaining.
 *
 * 🔴 **Under {@link LOW} a short-armed belle has no lever at all**, and that is geometry rather
 * than an omission: the target is her own crown, so shrinking her lowers the target and her
 * shoulder together. It is why her two draws used to produce identical plans.
 */
function reshapeDeficit(
  beau: ArmMetrics,
  belle: ArmMetrics,
  clear: number,
  separation: number,
  aim: ReshapeAim,
): number {
  const beauTaller = crownOf(beau) > crownOf(belle);
  const high = aim === CLEAR && beauTaller;
  const target = (high ? crownOf(beau) : crownOf(belle)) + clear;
  const shortfall = Math.max(0, target - reachCeiling(high ? belle : beau, separation));
  return high ? -shortfall : shortfall;
}

/**
 * How high the joined hands go — **the lowest that clears the belle, allowed to rise as far as
 * clearing the beau if the two of them can reach that high** (ADR-0041).
 *
 * Three heights, and the answer is the middle one clamped by the first:
 *
 * - **`lo` — the belle's crown plus headroom.** She walks under it, so it can never be lower;
 *   this was the whole rule until 2026-08-22.
 * - **`hi` — clear of the *taller* of them.** `archLateral` has always documented the arch as
 *   sitting "above both crowns by construction… so there is no body to be inside of". That was
 *   an assertion the code did not maintain: with a beau much taller than his partner, `lo` lands
 *   level with **his own head**, and the joined hand — and her arm reaching it — is then inside
 *   it. Ember as beau with Myco was 1.640 against a head spanning 1.275 to 2.155.
 * - **`both` — as high as the pair can actually get it**, the lower of the two reaches. A join
 *   nobody can hold is not a join; going above this is how you get a hold that breaks for no
 *   reason a watcher could name.
 *
 * 🔑 **It rises when it can and not otherwise**, which is why every pair who could already dance
 * an arch dances exactly the arch they danced before. Raising it unconditionally to `hi` was
 * tried first and it charged the whole cast for two pairings — it even put a hairline break in
 * the *default* pair's reshape, because growing the beau to reach the join also raises his crown,
 * so above the crossover he chases his own head.
 *
 * 🔑 **And it composes with the reach** (ADR-0040): lengthening the upper arm raises `both`, so a
 * pair who could not lift the join clear of the tall one's head can reach until they can.
 */
function archHeight(
  beau: ArmMetrics,
  belle: ArmMetrics,
  clear: number,
  separation: number,
): number {
  const lo = crownOf(belle) + clear;
  const hi = Math.max(crownOf(beau), crownOf(belle)) + clear;
  const both = Math.min(reachCeiling(beau, separation), reachCeiling(belle, separation));
  return Math.max(lo, Math.min(hi, both));
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
  aim: ReshapeAim = LOW,
): ArchPlan {
  const clear = headroom(beau, belle);
  const lateral = archLateral(beau, belle);

  const deficit = reshapeDeficit(beau, belle, clear, separation, aim);
  const bodyDeltas =
    accommodation === RESHAPE
      // 🔑 **Half the deficit, because a trade of `d` now closes `2d`** (ADR-0043): each dancer
      // moves `d/2` inside their own rig and their rig moves `d/2` under them.
      ? reshapeDeltas(beauShape, belleShape, (deficit / 2) * (1 + OVERSHOOT))
      : { beau: 0, belle: 0 };

  // Re-measure whoever changed. Body height moves a shoulder and a crown by half of itself,
  // so this could be arithmetic — but `armMetrics` also re-derives `restX` from what is
  // beside the arm at its new height, and a shape that has grown is a shape this module has
  // no business half-measuring.
  const b = wearing(beau, beauShape, bodyDeltas.beau);
  const l = wearing(belle, belleShape, bodyDeltas.belle);

  const height = archHeight(b, l, clear, separation);
  // Where both of them are reaching. Whoever can span it arrives; whoever cannot stops
  // short along the line to it — across as well as up (ADR-0038).
  const target: HandPoint = { height, lateral };
  const hands = {
    beau: reachToward(b, insideShoulderX(b, separation, -1), target),
    belle: reachToward(l, insideShoulderX(l, separation, 1), target),
  };

  return {
    accommodation,
    height,
    lateral,
    bodyDeltas,
    hands,
    // The distance between the two hands, not the difference in their heights: a hand that
    // stopped short came away from the join in two directions and the hold opened by both.
    gap: Math.hypot(
      hands.beau.lateral - hands.belle.lateral,
      hands.beau.height - hands.belle.height,
    ),
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
 *
 * ## Each hand is charged against the *other* dancer, from where it actually is
 *
 * 🔴 **Both halves of that sentence were wrong until 2026-08-22**, and both inflated the answer.
 * It took `max(sideExtentAt(beau, h), sideExtentAt(belle, h))` and doubled it, which charges
 * every hand against **both** bodies — including **its own owner's**. A joined hand hangs off a
 * shoulder; it does not have to clear the dancer it is attached to. On Ember-as-beau with Myco
 * the join sits at 1.640, level with **Ember's own head**, and the pair were charged
 * `2 x (0.434 + 0.110)` for Ember's hand clearing Ember.
 *
 * 🔴 **And it measured from the couple's midpoint**, ignoring `plan.lateral` — flagged in
 * ADR-0038's consequences and deferred there, because folding it in would have put two decisions
 * in one file and because the term is *zero* on the shipped pairing. It is not zero on nine
 * others. This one corrects in **both** directions: an off-centre join is further from one
 * dancer and nearer the other, so the default pair's reshape goes **0.220 -> 0.320** (it had been
 * under-charged) while their break goes **1.085 -> 1.032**.
 *
 * The pairing that found it could not be stood up until `#dance` grew a cast picker, which is
 * the argument for the picker rather than for this function.
 */
export function archClearance(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
  accommodation: Accommodation,
  aim: ReshapeAim = LOW,
): number {
  const plan = planArch(beau, belle, beauShape, belleShape, width, accommodation, aim);
  const b = wearing(beau, beauShape, plan.bodyDeltas.beau);
  const l = wearing(belle, belleShape, plan.bodyDeltas.belle);

  // One row per hand: whose hand it is, how big it is, whose body it has to get past, and
  // which way its own lateral pushes the answer. `lateral` runs toward the belle, so a hand
  // that leans her way is *closer* to her and *further* from him — hence the opposite signs.
  const hands = [
    { hand: plan.hands.beau, radius: b.handRadius, other: l.parts, sign: 1 },
    { hand: plan.hands.belle, radius: l.handRadius, other: b.parts, sign: -1 },
  ] as const;

  let need = 0;
  for (const { hand, radius, other, sign } of hands) {
    // The other dancer stands half a separation from the midpoint; the hand stands `lateral`
    // from it. Solve `halfSeparation - sign * lateral >= extent + radius` for the separation.
    need = Math.max(need, 2 * (sideExtentAt(other, hand.height) + radius + sign * hand.lateral));
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

/**
 * How far apart the pair must stand for each raised **arm** to clear the other dancer.
 *
 * 🔴 **The gap has a fourth thing in it** (ADR-0038). square-one's [ADR-0018](https://github.com/randallard/square-one/blob/main/docs/adr/0018-the-arch-needs-a-hands-room-between-two-heads.md)
 * found the third — a joined *hand* up between two heads — and measured the room needed **at the
 * hand's height**. That is the right question for a hand and the wrong one for the arm holding it
 * up: the hand is only the top of it.
 *
 * Under a reshape the join rides clear above both crowns, so the cross-section at its height is
 * literally **zero** and the figure was sized by the bodies alone. Ryan, watching the two Twirls
 * that produced: *"now the short side is clipping the belle's arm into beau's head."* Her arm runs
 * from her shoulder up to that join, and on the way it passes exactly where his head is.
 *
 * ## Why this is solved and not measured
 *
 * The arm **slopes**: it starts at a shoulder, `restX` out from its owner's midline, and ends at
 * the join between the two of them. So where it sits laterally depends on the height you ask
 * about — and both of its endpoints move when the pair move apart. Sampling a fixed pose would
 * answer for a separation nobody is standing at.
 *
 * So it is bisected on the separation, like square-one's bow: monotonic, because pulling the two
 * apart moves every point of each arm away from the other dancer.
 *
 * 🔴 **Not simply "add the arm's width at the join's height"** — that was the cheap version, and
 * it is conservative in the wrong place. It would charge the reshape for room at a height where
 * nobody has a head, dragging it back up toward the break's number and undoing the difference
 * between the two accommodations that ADR-0037 exists to produce.
 *
 * ## Each arm ends at its own hand, not at the join
 *
 * 🔴 **The first version ran both arms to the join and over-charged the break by 0.196.** Under
 * a break the hands *are* apart — ADR-0028's *"both arms reach as far as they can toward the same
 * target, and the hands come apart"* — so whoever falls short stops short **across** as well as
 * up, and an arm drawn to the join is an arm longer than its owner has. The over-charge tipped
 * the default pair past their own handholding width, so they let go and stood twice as wide for a
 * reach neither of them makes. {@link ArchPlan.hands} carries the two hand *positions*, and each
 * arm is swept to its own.
 */
export function armSweepClearance(
  beau: ArmMetrics,
  belle: ArmMetrics,
  hands: { readonly beau: HandPoint; readonly belle: HandPoint },
): number {
  /**
   * Does `me`'s raised arm clear `them`, with the pair `s` apart, centre to centre?
   *
   * `sign` says which side of the midpoint `me` stands on — `-1` for the beau, `+1` for the
   * belle — and every quantity is written in the couple's own frame rather than mirrored into
   * each dancer's. Mirroring is what the first version did, and it carried the join's lateral
   * across the flip without negating it, so the belle's arm was measured reaching for a point
   * on the wrong side of the midpoint.
   */
  const fits = (
    me: ArmMetrics,
    them: ArmMetrics,
    hand: HandPoint,
    sign: -1 | 1,
    s: number,
  ): boolean => {
    const themX = -sign * (s / 2);
    const shoulderX = insideShoulderX(me, s, sign);
    const shoulderY = me.rigOriginY + me.restY;
    const span = hand.height - shoulderY;
    for (let i = 0; i <= ARM_SAMPLES; i++) {
      const t = i / ARM_SAMPLES;
      const h = shoulderY + span * t;
      const armX = shoulderX + (hand.lateral - shoulderX) * t;
      const reach = sideExtentAt(them.parts, h) + me.armHalfWidth;
      if (Math.abs(armX - themX) < reach) return false;
    }
    return true;
  };

  const both = (s: number): boolean =>
    fits(beau, belle, hands.beau, -1, s) && fits(belle, beau, hands.belle, 1, s);

  // Bracket: zero never fits and something generous always does. The upper bound is two whole
  // bodies plus two arms, which is more than any pose can need.
  let hi = 2 * (beau.restX + belle.restX + beau.armHalfWidth + belle.armHalfWidth) + 2;
  if (!both(hi)) return hi;
  let lo = 0;
  for (let i = 0; i < ARM_BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (both(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** How finely each arm is sampled along its length. */
const ARM_SAMPLES = 48;
/** Enough to land the separation well inside a millimetre of scene. */
const ARM_BISECTION_STEPS = 40;

/** What one execution of an arch call was drawn to do, and the room and width it needs. */
export interface ArchSizing {
  /** The accommodation the pair will dance — the draw, unless the draw cannot be delivered. */
  readonly accommodation: Accommodation;
  /** The clearance the figure has to deliver at the pass, in world units. */
  readonly wanted: number;
  /** How far apart the pair stand while dancing it, in world units. */
  readonly width: number;
  /**
   * How much undrawn upper arm both dancers take for this call — **the last resort**, `0` on
   * every pair who did not need it (ADR-0040).
   *
   * A property of the *pair* rather than of the draw: it is solved so that **both**
   * accommodations fit, so the couple stand in the same place whichever way the coin lands and
   * only the torsos and the bow differ between two Twirls. A width that changed with the draw
   * would put the per-execution difference in the one place a watcher reads as the floor
   * plan.
   */
  readonly armDelta: number;
  /**
   * Which height this execution's reshape was aimed at (ADR-0042) — kept so the pose plans the
   * same pair the figure was sized for. `LOW` unless aiming clear of a taller beau came out
   * *cheaper*, which is the only condition under which it is taken.
   */
  readonly aim: ReshapeAim;
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
 *    figure has.
 * 4. **What to do when it does not** — and there are two answers, in order (ADR-0040):
 *    - 🔑 **First they reach for it.** Both dancers lengthen the undrawn upper arm by the least
 *      the editor's own slider allows them to, until the figure fits. It buys reach one-for-one
 *      *and* widens the couple, because `touchHold` solves the standing width from how far the
 *      two can reach across — so it is the only lever that answers a pair whose **bodies** will
 *      not pass at the width their handhold gave them. Myco with Sprout costs **0.030**.
 *    - **Only then do they let go.** A pair who have let go are not held to a handhold's width,
 *      so they stand at **twice** the room they need, where the beau's arc delivers it on its
 *      own radius with no bow at all (ADR-0037 part 3). On the shipped cast this is now reached
 *      by two orderings out of twenty rather than nine.
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
  const aim = cheaperAim(beau, belle, beauShape, belleShape, width, bodies);
  const base = archRoom(beau, belle, beauShape, belleShape, width, bodies, aim);

  // 🔴 **Asked of both accommodations, not of the drawn one.** `armDelta` is a fact about the
  // pair (see {@link ArchSizing.armDelta}), so the pair reach when *either* draw would need it —
  // otherwise a Twirl that drew the cheaper accommodation would stand somewhere different from
  // the one before it, which is the per-execution difference showing up in the floor plan.
  if (base(RESHAPE) < width && base(BREAK) < width) {
    return { accommodation: drawn, wanted: base(drawn), width, armDelta: 0, aim };
  }

  const reached = reachForIt(beauShape, belleShape);
  if (reached !== null) {
    return {
      accommodation: drawn,
      wanted: reached.room(drawn),
      width: reached.width,
      armDelta: reached.delta,
      aim: reached.aim,
    };
  }

  const broken = base(BREAK);
  return { accommodation: BREAK, wanted: broken, width: 2 * broken, armDelta: 0, aim };
}

/**
 * Which height to aim this pair's reshape at — **whichever asks the figure for less room**
 * (ADR-0042).
 *
 * 🔑 **An accommodation has to beat the alternative it was chosen over.** That is ADR-0038's rule,
 * learned from a reshape that was signed backwards and finished further apart than doing nothing,
 * and it applies to *which* reshape just as much as to reshape-versus-break. Aiming clear of a
 * taller beau buys a join above both crowns and costs a much larger torso trade; measured across
 * the shipped cast it wins on some pairings and loses on others, and there is no rule shorter than
 * asking.
 *
 * `LOW` on a tie, so a pair who gain nothing from the deformation do not wear it.
 */
function cheaperAim(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
  bodies: number,
): ReshapeAim {
  if (crownOf(beau) <= crownOf(belle)) return LOW;
  const low = archRoom(beau, belle, beauShape, belleShape, width, bodies, LOW)(RESHAPE);
  const clear = archRoom(beau, belle, beauShape, belleShape, width, bodies, CLEAR)(RESHAPE);
  return clear < low ? CLEAR : LOW;
}

/** The room an arch needs for this pair at this width, per accommodation. */
function archRoom(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
  bodies: number,
  aim: ReshapeAim = LOW,
): (mode: Accommodation) => number {
  return (mode) => {
    const plan = planArch(beau, belle, beauShape, belleShape, width, mode, aim);
    const b = wearing(beau, beauShape, plan.bodyDeltas.beau);
    const l = wearing(belle, belleShape, plan.bodyDeltas.belle);
    return Math.max(
      // What must fit at each hand's own height (ADR-0018, ADR-0039).
      archClearance(beau, belle, beauShape, belleShape, width, mode, aim),
      // What the arms holding those hands up sweep through on the way (ADR-0038).
      armSweepClearance(b, l, plan.hands),
      // And never less than two bodies passing hands-free (ADR-0037).
      bodies,
    );
  };
}

/**
 * The least upper arm, in the editor's own steps, that lets this pair dance an arch at the
 * width it puts them at — **the last resort** (ADR-0040). `null` when no length within the
 * shape editor's bounds is enough.
 *
 * Solved for **both** accommodations rather than the drawn one, so the pair stand in the same
 * place whichever way the coin lands; see {@link ArchSizing.armDelta}.
 */
function reachForIt(
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
): { delta: number; width: number; aim: ReshapeAim; room: (mode: Accommodation) => number } | null {
  const { max } = SHAPE_BOUNDS.layout.upperArmSpacing;
  const room = Math.max(
    max - beauShape.layout.upperArmSpacing,
    max - belleShape.layout.upperArmSpacing,
  );
  const steps = Math.round(room / UPPER_ARM_STEP);
  for (let i = 1; i <= steps; i++) {
    const delta = i * UPPER_ARM_STEP;
    const bs = growUpperArm(beauShape, delta);
    const ls = growUpperArm(belleShape, delta);
    const bm = armMetrics(bs);
    const lm = armMetrics(ls);
    // 🔑 **The width is re-solved, not carried.** Longer arms reach further across, so the
    // couple stand further apart — which is the half of this lever that answers a pair whose
    // *bodies* will not pass at the width their handhold gave them.
    const width = touchHold(bm, lm).width;
    const bodies = CLEARANCE_MARGIN * lateralClearance(rigidParts(bs), rigidParts(ls));
    // The aim is re-chosen on the longer arms: reaching moves what each one costs.
    const aim = cheaperAim(bm, lm, bs, ls, width, bodies);
    const at = archRoom(bm, lm, bs, ls, width, bodies, aim);
    if (at(RESHAPE) < width && at(BREAK) < width) return { delta, width, aim, room: at };
  }
  return null;
}
