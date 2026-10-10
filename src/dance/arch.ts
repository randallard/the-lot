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
import { passingWidth } from "./frame";
import {
  BREAK,
  NO_DELTAS,
  OVERSHOOT,
  RESHAPE,
  growBody,
  growForearm,
  reshapeDeltas,
  standingLift,
  FOREARM_STEP,
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
 * The highest a dancer's own inside hand can get, at a given couple separation — reaching for
 * a join at `lateral`, with this dancer on the `sign` side of the midpoint.
 *
 * A reach is a sphere: whatever the arm spends going **across** to meet its partner is not
 * available going up. Same decomposition `bandedHeight` makes for a hanging hold, with the
 * sign the other way round.
 *
 * 🔴 **The callers used to leave `lateral` out, and that was a defect of its own** (found
 * 2026-09-26, while `overhead` was being built). `across` was measured to the couple's
 * **midpoint** — but the join has never been at the midpoint. {@link archLateral} puts it at
 * the midpoint of the two inside *shoulders*, which is a different point whenever the pair's
 * `restX` differ, by up to 0.130 on the shipped cast. So the height solve priced a reach to a
 * point nobody was reaching for.
 *
 * Small, and it moved a real outcome: the contrived pair in `sizeArch`'s terminal-case test —
 * forearms at the editor's ceiling, heads at their widest — **no longer has to let go**, because
 * the reach they were being charged for was never the reach they make. That is ADR-0037 part 3
 * losing one of its witnesses, not losing its reachability.
 *
 * The defaults are still the old arithmetic exactly (`lateral = 0` gives
 * `|separation / 2 - restX|`, and the `sign` is irrelevant there because the two inside
 * shoulders are equidistant from the midpoint) — but nothing in this module calls it that way
 * any more. Pass the join's own lateral and the dancer's own sign, together.
 */
export function reachCeiling(
  m: ArmMetrics,
  separation: number,
  lateral = 0,
  sign: -1 | 1 = -1,
): number {
  const across = Math.abs(lateral - insideShoulderX(m, separation, sign));
  return m.rigOriginY + m.restY + Math.sqrt(Math.max(0, m.handReach ** 2 - across ** 2));
}

/**
 * How far the arch sits off the couple's midpoint, toward the belle.
 *
 * At `overhead === 0`: halfway between the two inside shoulders — the same rule as a standing
 * hold's (ADR-0025/0027), the one point at which both dancers reach the same distance across.
 *
 * **Unclamped, unlike the standing hold's**, and that is a property of being overhead rather
 * than an omission. `touchHold` finally clamps its lateral into the corridor between the two
 * bodies, because a hold at waist height can otherwise land inside somebody's chest. An arch
 * is above both crowns by construction — `sideExtentAt` returns nothing up there — so there
 * is no body to be inside of and nothing to clamp against.
 *
 * ## 🧪 `overhead` — the join over the belle's own crown (2026-09-26, undecided)
 *
 * Ryan, watching the L: *"the beau kind of has to put their hand directly above the belle's
 * head … in our implementation the beau is just putting his hand up in between the couple and
 * that causes the belle to have to reach more than is reasonable."* Four reference photographs,
 * and in every one the joined hands are above the turning dancer's crown while the beau's arm
 * is the one that crosses the gap.
 *
 * The shoulder-midpoint rule is inherited from the **standing** hold, where it is right: two
 * people facing each other hand in hand meet in the middle. A turn-under is not that figure.
 * The measurement, on the shipped cast: the join lands 30%–70% of the separation short of the
 * belle's midline, and in 18 of the 20 orderings her hand ends up **inboard of her own inside
 * shoulder** — reaching across her chest toward him, in the opposite direction from her head.
 *
 * `overhead` slides the join from that midpoint (`0`) to the belle's own midline (`1`), which
 * is where her crown is. It is a **dial and not yet a decision**: `0` is the default and keeps
 * ADR-0025's rule, so nothing dances differently until somebody turns it.
 *
 * (`0` is not *quite* the old behaviour, and the exception is not this dial's doing — see
 * {@link reachCeiling} for the midpoint-versus-shoulders slip it uncovered on the way past.)
 *
 * 🔑 **Her midline rather than her crown's `x`** — they are the same number. A dancer's rigid
 * parts are centred on their own midline, so `separation / 2` *is* directly above the head.
 */
export function archLateral(
  beau: ArmMetrics,
  belle: ArmMetrics,
  separation = 0,
  overhead = 0,
): number {
  const shoulders = (beau.restX - belle.restX) / 2;
  return shoulders + overhead * (separation / 2 - shoulders);
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
 * The target itself when it is within reach; otherwise `comfort * handReach` **along the
 * direction to it**, which is what an arm at full stretch does and what {@link reachPose}
 * already draws — a straight arm aimed at a point it cannot touch.
 *
 * 🧪 **`comfort` is how much of the arm this reach is willing to spend** (2026-09-30,
 * undecided). `1` is full stretch and is what every caller asked for until now. Ryan, on
 * what a *broken* hold should look like: *"the arms should move in the direction but not
 * require touch — should get as close as comfortably possible, not spread to max
 * distance."* See {@link BREAK_COMFORT}.
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
  comfort = 1,
): HandPoint {
  const shoulderY = m.rigOriginY + m.restY;
  const dx = target.lateral - shoulderX;
  const dy = target.height - shoulderY;
  const d = Math.hypot(dx, dy);
  const spend = m.handReach * comfort;
  if (d <= spend || d < 1e-9) return target;
  const f = spend / d;
  return { lateral: shoulderX + dx * f, height: shoulderY + dy * f };
}

/**
 * 🧪 **How much of their arm each dancer spends on a hold that is not being made**
 * (2026-09-30, undecided — no ADR yet, and `1` is today's shipped figure).
 *
 * ADR-0028 has both arms reach **as far as they can** toward the same target, and that is
 * what a hold *being made* does: a reach that must arrive arrives, straight arm and all —
 * it is why {@link touchHold} dropped its own comfort ceiling (`TOUCH_COMFORT`, 0.95).
 *
 * 🔑 **A break is the opposite case, and it wants the ceiling back.** Nothing has to arrive,
 * so nothing has to strain: Ryan, 2026-09-30 — *"for a broken hold, the arms should move in
 * the direction but not require touch — should get as close as comfortably possible, not
 * spread to max distance."* The direction is kept (so an overhead join still pulls her hand
 * out over her own head); what is given up is the last of the stretch.
 */
export const BREAK_COMFORT = 0.95;

/**
 * 🧪 **As far along this reach as the hand gets without being inside the other dancer**
 * (2026-09-30, undecided — no ADR yet, and it applies only under {@link BREAK}).
 *
 * The other half of {@link BREAK_COMFORT}. A comfort ceiling shortens a reach but does not aim
 * it anywhere new, and with the join over the belle's own crown the direction itself runs into
 * her: the beau's hand leaves his shoulder pointed at a spot above her head, and the points
 * short of that spot are *under* it. Stopping at 70% of his arm only puts his hand inside her
 * cap instead of above it — which is why the comfort ceiling alone moved 10 let-gos to 8.
 *
 * 🔴 **`archClearance` answers the same collision by moving the couple, and that is the wrong
 * lever for a break.** Its premise is square-one's ADR-0018 — a *joined* hand in the gap
 * between two heads, which the pair must be given room for, because the hold is going to be
 * made and the hand has to go somewhere. There is no joined hand here. Two separate hands that
 * would collide do not need the dancers moved apart; they need to stop, which is what Ryan
 * asked for: *"get as close as comfortably possible, not spread to max distance."*
 *
 * Walked rather than bisected, for {@link duckForIt}'s reason: a silhouette is not monotone in
 * height, so a bisection can settle on the far side of a waist it never sampled. The walk is
 * along the shoulder→hand segment and takes the furthest clear sample, so a hand that is
 * already clear is returned untouched, and one that is not comes back at the last good point.
 */
function stopClearOf(
  hand: HandPoint,
  shoulder: HandPoint,
  handRadius: number,
  them: ArmMetrics,
  themX: number,
): HandPoint {
  const crown = crownOf(them);
  const clear = (p: HandPoint): boolean =>
    // Over their head is clear by going over them — the same exemption `archClearance` takes,
    // and for the same reason: what keeps a hand off a crown up there is `headroom`.
    p.height >= crown || Math.abs(p.lateral - themX) >= sideExtentAt(them.parts, p.height) + handRadius;

  if (clear(hand)) return hand;

  const dx = hand.lateral - shoulder.lateral;
  const dy = hand.height - shoulder.height;
  const span = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(span / FOREARM_STEP));
  for (let i = steps - 1; i > 0; i--) {
    const t = i / steps;
    const p = { lateral: shoulder.lateral + dx * t, height: shoulder.height + dy * t };
    if (clear(p)) return p;
  }
  // Nothing along the reach is clear, which means the shoulder itself is inside them — a pair
  // standing closer than their bodies allow, which `archRoom`'s `bodies` floor already forbids.
  return { lateral: shoulder.lateral, height: shoulder.height };
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
  lateral: number,
): number {
  const beauTaller = crownOf(beau) > crownOf(belle);
  const high = aim === CLEAR && beauTaller;
  const target = (high ? crownOf(beau) : crownOf(belle)) + clear;
  // Whoever holds the lever is reaching from their own side: the belle from `+1`, the beau
  // from `-1`. It made no difference while the join sat at the midpoint and it makes a large
  // one once `overhead` moves it — the whole point of the dial is that the two of them stop
  // reaching the same distance across.
  const shortfall = Math.max(
    0,
    target - reachCeiling(high ? belle : beau, separation, lateral, high ? 1 : -1),
  );
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
  lateral: number,
): number {
  const lo = crownOf(belle) + clear;
  const hi = Math.max(crownOf(beau), crownOf(belle)) + clear;
  const both = Math.min(
    reachCeiling(beau, separation, lateral, -1),
    reachCeiling(belle, separation, lateral, 1),
  );
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
  overhead = 0,
): ArchPlan {
  const clear = headroom(beau, belle);
  const lateral = archLateral(beau, belle, separation, overhead);

  const deficit = reshapeDeficit(beau, belle, clear, separation, aim, lateral);
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

  const height = archHeight(b, l, clear, separation, lateral);
  // Where both of them are reaching. Whoever can span it arrives; whoever cannot stops
  // short along the line to it — across as well as up (ADR-0038).
  const target: HandPoint = { height, lateral };
  // 🧪 Only a break spends less than the whole arm — a reshape is a hold that is being made,
  // and a hold that must arrive arrives (see {@link BREAK_COMFORT}).
  const comfort = accommodation === BREAK ? BREAK_COMFORT : 1;
  const beauShoulder: HandPoint = {
    lateral: insideShoulderX(b, separation, -1),
    height: b.rigOriginY + b.restY,
  };
  const belleShoulder: HandPoint = {
    lateral: insideShoulderX(l, separation, 1),
    height: l.rigOriginY + l.restY,
  };
  const reach = {
    beau: reachToward(b, beauShoulder.lateral, target, comfort),
    belle: reachToward(l, belleShoulder.lateral, target, comfort),
  };
  // 🧪 And a hand that is not going to arrive stops **short of the other dancer** rather than
  // inside them (2026-09-30, undecided — see {@link stopClearOf}).
  const hands =
    accommodation === BREAK
      ? {
          beau: stopClearOf(reach.beau, beauShoulder, b.handRadius, l, separation / 2),
          belle: stopClearOf(reach.belle, belleShoulder, l.handRadius, b, -separation / 2),
        }
      : reach;

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
  overhead = 0,
): number {
  const plan = planArch(beau, belle, beauShape, belleShape, width, accommodation, aim, overhead);
  const b = wearing(beau, beauShape, plan.bodyDeltas.beau);
  const l = wearing(belle, belleShape, plan.bodyDeltas.belle);

  // One row per hand: whose hand it is, how big it is, whose body it has to get past, and
  // which way its own lateral pushes the answer. `lateral` runs toward the belle, so a hand
  // that leans her way is *closer* to her and *further* from him — hence the opposite signs.
  const hands = [
    { hand: plan.hands.beau, radius: b.handRadius, other: l, sign: 1 },
    { hand: plan.hands.belle, radius: l.handRadius, other: b, sign: -1 },
  ] as const;

  let need = 0;
  for (const { hand, radius, other, sign } of hands) {
    // 🔴 **A hand above the other dancer's crown is cleared by going over them, and asking it
    // to clear them *sideways* as well is unsatisfiable by construction** (found 2026-09-26,
    // with `overhead` turned up).
    //
    // The inequality below wants `halfSeparation - sign * lateral >= extent + radius`. Put the
    // join over the belle's own midline — which is the whole of what `overhead` does — and
    // `lateral` **is** `halfSeparation`, so it reads `0 >= extent + radius` and no separation
    // satisfies it. `archFits` then failed for every pair at every width, `sizeArch` fell
    // through to its terminal let-go, and the couple stood at *twice* the room: the opposite
    // of the figure, and exactly what was on screen.
    //
    // It was latent rather than new. The rule has always been "each hand is charged against the
    // *other* dancer", and the premise underneath it is square-one's ADR-0018 — a joined hand
    // **in the gap between two heads**. A hand over somebody's head is not in the gap. What
    // keeps it off them there is `headroom`, vertically, which `archHeight`'s `lo` already
    // guarantees, and there is no second thing for this term to buy.
    if (hand.height >= crownOf(other)) continue;
    // The other dancer stands half a separation from the midpoint; the hand stands `lateral`
    // from it. Solve `halfSeparation - sign * lateral >= extent + radius` for the separation.
    need = Math.max(
      need,
      2 * (sideExtentAt(other.parts, hand.height) + radius + sign * hand.lateral),
    );
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
  overhead = 0,
): boolean {
  return (
    archClearance(beau, belle, beauShape, belleShape, width, accommodation, LOW, overhead) < width
  );
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
    const theirCrown = crownOf(them);
    for (let i = 0; i <= ARM_SAMPLES; i++) {
      const t = i / ARM_SAMPLES;
      const h = shoulderY + span * t;
      // 🔴 **Above their crown there is nothing to clear, and charging `armHalfWidth` anyway is
      // what pinned this at 1.280** (found 2026-09-26, tracing why a duck changed nothing).
      //
      // `sideExtentAt` already returns 0 up there, so the old expression collapsed to
      // `|armX - themX| < armHalfWidth` — an arm passing directly over somebody's head, with
      // their body metres below it, was still failed for not clearing their *axis* sideways.
      // The bisection then answered `2 * (handLateral + armHalfWidth)` for every pairing, which
      // is why the number never moved as the belle ducked: her crown was falling, her partner's
      // hand was not, and the sample that bound was the hand itself.
      //
      // Exactly the defect the hands term had one level up, and the same cure: this is a
      // **lateral** clearance, so it is owed only where there is a cross-section to clear. What
      // keeps an arm off a head it passes over is `headroom`, vertically.
      if (h >= theirCrown) continue;
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
  /**
   * 🧪 How far each dancer drops for this call, as a body-height change — negative, and `0` for
   * anyone not dancing `DUCK_UNDER` or for a pair who did not need it (2026-09-26).
   *
   * 🔴 **Sized here rather than posed in `DanceFloor`, and the first attempt got that wrong.**
   * A duck solved at pose time can only be measured against `ArchSizing.width` — which, for the
   * pairings a duck exists to rescue, is *already* the doubled let-go width. The arm clears
   * trivially at that separation, so every pairing came back needing a duck of one centimetre.
   * The duck has to be tried **while the pair are still trying to keep the hold**, which is
   * here, in the cascade, between reaching and letting go.
   */
  readonly duck: BodyDeltas;
}

/**
 * How far each dancer is willing to drop — the shape editor's own room below their body height,
 * for a dancer dancing `DUCK_UNDER`, and `0` for everyone else.
 *
 * Passed in rather than read from a style here, because `arch.ts` knows about bodies and holds
 * and deliberately not about the four turn-under styles: `turn-under.ts` owns which dancer is
 * ducking, this owns what ducking buys.
 */
export interface DuckRoom {
  readonly beau: number;
  readonly belle: number;
}

/** Nobody ducking — the default, so every existing caller sizes exactly as it did. */
export const NO_DUCK: DuckRoom = { beau: 0, belle: 0 };

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
  overhead = 0,
  close = 0,
  duck: DuckRoom = NO_DUCK,
): ArchSizing {
  // 🧪 The pair close up *before* anything is measured, because every question below is asked
  // at a separation — the reshape, the join's height, the clearance and the arms' own sweep.
  // Closing afterwards would size the figure for a couple standing somewhere they are not.
  const fitsAt = (w: number): boolean => {
    const at = archRoom(beau, belle, beauShape, belleShape, w, bodies, LOW, overhead);
    return at(RESHAPE) < w && at(BREAK) < w;
  };
  const stood = closedWidth(width, bodies, close, fitsAt);
  const aim = cheaperAim(beau, belle, beauShape, belleShape, stood, bodies, overhead);
  const base = archRoom(beau, belle, beauShape, belleShape, stood, bodies, aim, overhead);

  // 🔴 **Asked of both accommodations, not of the drawn one.** `armDelta` is a fact about the
  // pair (see {@link ArchSizing.armDelta}), so the pair reach when *either* draw would need it —
  // otherwise a Twirl that drew the cheaper accommodation would stand somewhere different from
  // the one before it, which is the per-execution difference showing up in the floor plan.
  if (base(RESHAPE) < stood && base(BREAK) < stood) {
    return {
      accommodation: drawn, wanted: base(drawn), width: stood, armDelta: 0, aim, duck: NO_DELTAS,
    };
  }

  const reached = reachForIt(beauShape, belleShape, overhead);
  if (reached !== null) {
    return {
      accommodation: drawn,
      wanted: reached.room(drawn),
      width: reached.width,
      armDelta: reached.delta,
      aim: reached.aim,
      duck: NO_DELTAS,
    };
  }

  // 🧪 **Then one of them ducks, if their style says they do** (2026-09-26). Last before the
  // let-go, because it is the only lever aimed at the constraint that actually binds an
  // overhead join — `armSweepClearance`, the partner's arm passing over a crown.
  const ducked = duckForIt(beau, belle, beauShape, belleShape, stood, bodies, overhead, duck);
  if (ducked !== null) {
    return {
      accommodation: drawn,
      wanted: ducked.room(drawn),
      width: stood,
      armDelta: 0,
      aim: ducked.aim,
      duck: ducked.depths,
    };
  }

  const broken = base(BREAK);
  return {
    accommodation: BREAK, wanted: broken, width: 2 * broken, armDelta: 0, aim, duck: NO_DELTAS,
  };
}

/**
 * The least each ducking dancer has to drop for this pair to dance the arch at the width they
 * are standing at — `null` when no drop within the shape editor's bounds is enough, or when
 * nobody is ducking.
 *
 * 🔑 **The width is *not* re-solved, unlike {@link reachForIt}'s.** Lengthening an arm changes
 * how far across a pair can reach and therefore where they stand; ducking does not. She drops
 * **after** the hands are joined and the couple are placed — mid-figure, on the spot — so the
 * stance is an input here rather than an output. Re-solving it would walk the pair apart as she
 * folded, which is a dancer dragging her partner rather than one ducking under his arm.
 *
 * 🔴 **Scanned, not bisected.** Clearance is not monotone in body height: measured on
 * `ryan/player`, growing the beau took the arm sweep 1.244 → 1.164 → back to 1.244, so a
 * bisection could settle either side of a dip it never saw. A scan in the editor's own steps
 * finds the **least** depth that works even when the predicate misbehaves, which is the property
 * that makes a duck read as ducking rather than as collapsing.
 */
function duckForIt(
  beau: ArmMetrics,
  belle: ArmMetrics,
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  width: number,
  bodies: number,
  overhead: number,
  room: DuckRoom,
): { depths: BodyDeltas; aim: ReshapeAim; room: (mode: Accommodation) => number } | null {
  const step = SHAPE_BOUNDS.body.height.step;
  const deepest = Math.max(room.beau, room.belle);
  if (deepest < step) return null;

  const steps = Math.floor(deepest / step);
  for (let i = 1; i <= steps; i++) {
    const drop = i * step;
    // Each dancer takes the drop only as far as their own room allows, so a pair where one of
    // them is not ducking is a pair where one of these stays zero throughout.
    // `|| 0` normalises the negative zero a dancer with no room would otherwise carry: `-0` is
    // `=== 0` but not `Object.is` 0, and a delta that compares equal everywhere except in a test
    // assertion is exactly the kind of value worth not creating.
    const depths: BodyDeltas = {
      beau: -Math.min(drop, room.beau) || 0,
      belle: -Math.min(drop, room.belle) || 0,
    };
    const bs = depths.beau === 0 ? beauShape : growBody(beauShape, depths.beau);
    const ls = depths.belle === 0 ? belleShape : growBody(belleShape, depths.belle);
    // 🔑 **Measured on a lifted rig** (ADR-0043): a dancer who ducks keeps her feet on the
    // floor, so the whole drop comes out of the top of her — which is the half of this that
    // lowers the crown the partner's arm has to clear.
    const bm = depths.beau === 0 ? beau : armMetrics(bs, NPC_BODY_CENTER_Y, standingLift(beauShape, bs));
    const lm = depths.belle === 0 ? belle : armMetrics(ls, NPC_BODY_CENTER_Y, standingLift(belleShape, ls));
    const aim = cheaperAim(bm, lm, bs, ls, width, bodies, overhead);
    const at = archRoom(bm, lm, bs, ls, width, bodies, aim, overhead);
    if (at(RESHAPE) < width && at(BREAK) < width) return { depths, aim, room: at };
  }
  return null;
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
  overhead = 0,
): ReshapeAim {
  if (crownOf(beau) <= crownOf(belle)) return LOW;
  const low = archRoom(beau, belle, beauShape, belleShape, width, bodies, LOW, overhead)(RESHAPE);
  const clear = archRoom(beau, belle, beauShape, belleShape, width, bodies, CLEAR, overhead)(RESHAPE);
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
  overhead = 0,
): (mode: Accommodation) => number {
  return (mode) => {
    const plan = planArch(beau, belle, beauShape, belleShape, width, mode, aim, overhead);
    const b = wearing(beau, beauShape, plan.bodyDeltas.beau);
    const l = wearing(belle, belleShape, plan.bodyDeltas.belle);
    return Math.max(
      // What must fit at each hand's own height (ADR-0018, ADR-0039).
      archClearance(beau, belle, beauShape, belleShape, width, mode, aim, overhead),
      // What the arms holding those hands up sweep through on the way (ADR-0038).
      armSweepClearance(b, l, plan.hands),
      // And never less than two bodies passing hands-free (ADR-0037).
      bodies,
    );
  };
}

/**
 * 🧪 **How close the pair stand while turning under** (2026-09-26, undecided) — `0` is the
 * standing handhold's own width and changes nothing, `1` is as close as the figure can still be
 * *delivered*.
 *
 * Ryan, 2026-09-26: *"the turn under we should have the pair get closer during execution of
 * that type of move."*
 *
 * 🔑 **This is the other half of {@link archLateral}'s `overhead`, and neither works alone.**
 * A join over the belle's crown is most of a separation away from the beau's inside shoulder,
 * which is further than anybody on the cast can reach — so moving the join without letting the
 * pair close up just breaks the hold. In the reference photographs the two are *close*, and
 * that is what makes the reach over her head an ordinary thing to do rather than a stretch.
 *
 * ## 🔴 Why `1` is solved and not simply `bodies`
 *
 * `bodies` — the room two dancers need hands-free — looks like the obvious floor, and it is the
 * one ADR-0044's invariant names. But it is exactly the wrong *target*: `archRoom` already
 * floors the required clearance at `bodies`, and square-one answers a clearance at or above the
 * couple's own width with its cap rather than with the figure (its ADR-0018). So standing the
 * pair **at** `bodies` asks for a room equal to their width, which is undeliverable by
 * definition — `close = 1` would push every pairing into `sizeArch`'s terminal let-go and walk
 * them twice as far apart under a dial named *closer*.
 *
 * So the tightest end is bisected: the smallest width in `[bodies, standing]` at which **both**
 * accommodations still fit. Both, for {@link ArchSizing.armDelta}'s reason — the couple stand in
 * the same place whichever way the coin lands.
 *
 * Kept separate from `overhead` rather than folded into one dial, so the two effects can be told
 * apart on screen: one moves the join, the other moves the couple.
 */
export function closedWidth(
  standing: number,
  bodies: number,
  close: number,
  fits: (width: number) => boolean,
): number {
  if (close <= 0 || bodies >= standing || !fits(standing)) return standing;
  // Bracket: `standing` fits (just asserted) and `bodies` cannot (the required room is floored
  // there, so it can never be strictly less than a width equal to it). Bisect toward the
  // crossover, keeping `lo` as the tightest width known to fail and `hi` the tightest to fit.
  let lo = bodies;
  let hi = standing;
  for (let i = 0; i < CLOSE_BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return standing + close * (hi - standing);
}

/** Enough to land the closed width well inside a millimetre of scene, like the arm sweep's. */
const CLOSE_BISECTION_STEPS = 40;

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
  overhead = 0,
): { delta: number; width: number; aim: ReshapeAim; room: (mode: Accommodation) => number } | null {
  const { max } = SHAPE_BOUNDS.forearm.height;
  const room = Math.max(max - beauShape.forearm.height, max - belleShape.forearm.height);
  const steps = Math.round(room / FOREARM_STEP);
  for (let i = 1; i <= steps; i++) {
    const delta = i * FOREARM_STEP;
    const bs = growForearm(beauShape, delta);
    const ls = growForearm(belleShape, delta);
    const bm = armMetrics(bs);
    const lm = armMetrics(ls);
    // 🔑 **The width is re-solved, not carried.** A longer *forearm* reaches further across,
    // so the couple stand further apart — which is the half of this lever that answers a pair
    // whose *bodies* will not pass at the width their handhold gave them. It has to be the
    // forearm: the stance is capped by the sideways reach an elbow can make while still hanging
    // in the shoulder's own plane, and that is not monotone in the upper arm (see
    // {@link growForearm}).
    const width = touchHold(bm, lm).width;
    const bodies = passingWidth(lateralClearance(rigidParts(bs), rigidParts(ls)));
    // The aim is re-chosen on the longer arms: reaching moves what each one costs.
    const aim = cheaperAim(bm, lm, bs, ls, width, bodies, overhead);
    const at = archRoom(bm, lm, bs, ls, width, bodies, aim, overhead);
    if (at(RESHAPE) < width && at(BREAK) < width) return { delta, width, aim, room: at };
  }
  return null;
}
