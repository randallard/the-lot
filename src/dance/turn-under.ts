/**
 * **What a dancer does with the arm they are turning under** — the four styles, named.
 *
 * ## The problem this is about
 *
 * A California Twirl turns the belle 180° beneath a hand she is still holding. Her joined arm
 * therefore has to wind over her own head and come down the other side, which is a pose nothing
 * in this repo produces: `TrackedArms.arch` has been reported-and-undrawn since the span existed,
 * because every hold here is built on [ADR-0027](../../docs/adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md)
 * — the humerus of a **hanging** arm stays in the plane of its own shoulder — which is the right
 * anatomy for a couple standing hand in hand and the wrong one for an arch.
 *
 * [ADR-0056](../../docs/adr/0056-a-declared-hold-keeps-the-hand-the-figure-named.md) made that
 * more visible rather than less. Before it, the belle's joined hand was silently re-labelled onto
 * her other side halfway through, so the arm never had to wind at all — the defect was *hiding*
 * the missing pose.
 *
 * ## The four, in Ryan's words (2026-09-21)
 *
 * > happy path is the L, next is to L and duck under, those both maintain contact, sometimes they
 * > lazy L and break contact, sometimes they just arm up as high as casually possible and walk
 * > around it
 *
 * - {@link FULL_L} — the upside-down L: the undrawn upper arm vertical, the forearm horizontal
 *   over the head. Ryan, 2026-08-23, in the same report that found the swap: *"the left arm need
 *   to be turned under as it makes an upside down L with the invisible upper arm and the forearm
 *   then is horizontal over the head."* Contact kept.
 * - {@link DUCK_UNDER} — the same L, and the dancer drops under it rather than asking the arm for
 *   all of the room. Contact kept.
 * - {@link LAZY_L} — the L attempted and not made; the hands come apart. Contact **lost**.
 * - {@link CASUAL} — no L at all: the arm goes as high as it casually goes and the dancer walks
 *   the same line anyway.
 *
 * ## 🔑 Deliberately not ordered as a ladder
 *
 * It is tempting to read these as a degradation sequence the way ADR-0040's reach → break is one.
 * They are not written as one, because **nobody has looked at them yet.** Ryan named four things
 * dancers do and said which of them breaks contact; whether they rank, and in what order, is
 * exactly what the review branch exists to find out. Encoding an order here would answer the
 * question the instrument was built to ask.
 *
 * What *is* recorded is the one property he stated outright — {@link keepsContact}.
 *
 * ## 🔑 Why the belle's path is the same in all four
 *
 * Including {@link CASUAL}, which sounds like it should be a detour round the outside. Ryan's
 * call, and it keeps the whole family on this side of the seam: square-one's `belleHalf` walks
 * her a `step-pivot` of exactly `couple.width` — the diameter — and `archClearance` feeds only
 * the **beau's** bow. Her path takes no clearance parameter at all. A genuinely different route
 * would need a new block, and square-one's ADR-0024 deleted the one block that modelled an
 * alternative path, with a promotion condition for rebuilding it *from an actual named call*
 * rather than from a consumer's preference.
 *
 * ## 🔴 And why {@link LAZY_L} is not a new outcome
 *
 * It is [ADR-0037](../../docs/adr/)'s {@link BREAK}. [`accommodation.ts`](accommodation.ts) is
 * explicit that a hold added later must *"answer which of these two rather than inventing a third
 * silent one"*, and losing contact is precisely what a break already is.
 *
 * The two modules answer different questions and meet at that one outcome. `accommodation.ts`
 * asks **can this pair reach the hold at all** — about two bodies and a width, decided before the
 * figure is built. This asks **can this dancer get their own arm over their own head** — about
 * one body, decided at pose time. A pair can fail either independently.
 */

import { BREAK, RESHAPE, type Accommodation } from "./accommodation";

/** How a dancer takes their joined arm over their own head while turning beneath it. */
export type TurnUnderStyle =
  | typeof FULL_L
  | typeof DUCK_UNDER
  | typeof LAZY_L
  | typeof CASUAL;

/** Upper arm vertical, forearm horizontal over the head. The pose the figure is drawn for. */
export const FULL_L = "full-l";
/** The L, and the dancer drops under it instead of asking the arm for all the room. */
export const DUCK_UNDER = "duck-under";
/** The L attempted and not made — the hands come apart. */
export const LAZY_L = "lazy-l";
/** No L: the arm goes as high as it casually goes, and the dancer walks the line anyway. */
export const CASUAL = "casual";

/**
 * All four, in the order Ryan named them — which is **not** a ranking (see the module doc).
 *
 * Exported for the same reason `ACCOMMODATIONS` is: a test or a report that has to cover the
 * family should not be able to cover three of it.
 */
export const TURN_UNDER_STYLES: readonly TurnUnderStyle[] = [
  FULL_L,
  DUCK_UNDER,
  LAZY_L,
  CASUAL,
];

/**
 * Whether the hands are still joined at the end of the turn.
 *
 * The one property Ryan stated outright — *"those both maintain contact"* of the first two, and
 * *"lazy L and break contact"* of the third. {@link CASUAL} keeps contact because it keeps the
 * path and the hold and simply declines to make the shape: the arm is low, not let go.
 */
export function keepsContact(style: TurnUnderStyle): boolean {
  return style !== LAZY_L;
}

/**
 * How much room a dancer has to drop, for `sizeArch`'s duck step — their whole body height down
 * to the shape editor's floor if they are dancing {@link DUCK_UNDER}, and `0` otherwise.
 *
 * ## The duck has a job, and it is not decoration
 *
 * Ryan's own words for it are *"the dancer drops under it rather than asking the arm for all of
 * the room"*, and 2026-09-26 found what "the room" actually is. What fails a `FULL_L` is not a
 * **reach** — `reshapeDeficit` correctly computes a zero torso trade for several of the failing
 * orderings, because the beau's hand *can* get to the join. What fails is `armSweepClearance`:
 * his arm, travelling from his shoulder to a join above her crown, passing through her head.
 *
 * Growing him does not fix it (measured: Ember's sweep sat at 1.280 against a width of 1.080 and
 * did not move over a grow of 0.8, because the join rides on *her* crown and he chases a fixed
 * target from a rising shoulder). **Dropping her does**, and directly: it is her crown in the
 * way, so lowering it is the one lever aimed at the actual constraint.
 *
 * ## Why it is a torso and not a crouch — the same answer the reshape gave
 *
 * [ADR-0043](../../docs/adr/) already settled this for the reshape, and the duck inherits it
 * whole: a body-height change of `d` moves the shoulder-and-head assembly by `d/2`,
 * `standingLift` puts the rig origin under it so the **feet stay on the floor**, and no arm
 * length changes at all. It is also literally where the lever came from — Ryan asked *"can we
 * make the duck shrink the torso?"* and the torso trade is the answer that was built.
 *
 * 🔑 **Room, not depth.** This says how far a dancer *may* go; `duckForIt` finds the least drop
 * that actually clears, because a duck is not a competition and the shallowest one that works is
 * the one that reads as ducking rather than as collapsing.
 *
 * 🔴 **The editor's floor is a generous bound and on one pairing it shows.** `ryan/ember` — a
 * beau far shorter than his belle — needs **-1.20** of Ember's 1.41 of body to get under his
 * arm. That is honest geometry (a much taller dancer really does have to fold a long way to pass
 * under a shorter one's arm) and it is also the case `review-steps`' watch text warns about:
 * *"whether the drop reads as ducking rather than as a shrunken dancer."* Left at the editor's
 * bound rather than capped at a guessed fraction, because the number to cap it at is something
 * to see before it is chosen.
 */
export function duckRoom(
  style: TurnUnderStyle | null | undefined,
  bodyHeight: number,
  floor: number,
): number {
  return style === DUCK_UNDER ? Math.max(0, bodyHeight - floor) : 0;
}

/**
 * How far into the duck a dancer is at `beat`, `0` at both ends of the arch span and `1` at its
 * middle.
 *
 * 🔑 **Spread across the turn rather than spent at the midpoint**, which is `review-steps`'
 * specification for the pose in as many words: *"a duck is spread across the turn, not spent at
 * the midpoint. She should be visibly lower than she is in `quarter · the L`"*. A profile that
 * only dipped under the arch would leave her standing upright a quarter-beat before she had to
 * fold, which reads as a dancer being deflated rather than one ducking.
 *
 * Raised cosine rather than a triangle: it leaves and returns to standing with zero slope, so the
 * drop starts and finishes smoothly instead of kinking at the ends of the span. `three-quarter`
 * is then the mirror of `quarter` by construction — which is the other thing the watch text asks
 * for, *"a duck that rises faster than it fell is a dancer being released rather than standing
 * up."*
 *
 * Degenerate spans (`to <= from`) return `0`: no span, no duck.
 */
export function duckProfile(beat: number, from: number, to: number): number {
  if (to <= from) return 0;
  const t = Math.min(1, Math.max(0, (beat - from) / (to - from)));
  return (1 - Math.cos(2 * Math.PI * t)) / 2;
}

/**
 * The reach accommodation this style forces, or `null` when it leaves that draw alone.
 *
 * - {@link LAZY_L} forces {@link BREAK} — because a break is already *"nobody changes shape,
 *   both dancers reach as far as they can toward the same target, and the hands come apart"*,
 *   which is the whole of what a lazy L is.
 * - {@link FULL_L} and {@link DUCK_UNDER} force {@link RESHAPE} (2026-10-11). Ryan's own words
 *   for the pair were *"those both maintain contact"*, and a reshape is the accommodation that
 *   does; a style defined by keeping the hold cannot land on the one that lets go of it.
 * - {@link CASUAL} returns `null` and still takes `drawAccommodation()`'s coin flip. It has no
 *   pose yet, so there is nothing for a fixed answer to be true of.
 *
 * 🔴 **This reverses what stood here until 2026-10-11**, which returned `null` for all three on
 * purpose: *"whether a pair reshape or break to reach each other is a different question from
 * how one of them takes their arm over their head, and collapsing the two would silently pin one
 * of ADR-0037's two styles off."* It is a fair distinction and it cost more than it bought: with
 * the L tossing, one review address showed two poses at two distances
 * ([journal](../../docs/journal/2026-10-11-2-one-address-two-poses.md)), and a pose that cannot
 * be shown twice cannot be authored, rated or carried. Nothing is pinned off silently — the
 * break is `lazy-l`, by name. No ADR yet; the posture work is still experimenting.
 */
export function accommodationFor(style: TurnUnderStyle): Accommodation | null {
  switch (style) {
    case LAZY_L:
      return BREAK;
    case FULL_L:
    case DUCK_UNDER:
      return RESHAPE;
    case CASUAL:
      return null;
  }
}

/**
 * The accommodation a whole pair's styles force, or `null` to leave `drawAccommodation`'s
 * per-execution coin flip alone — {@link accommodationFor} asked of every dancer at once.
 *
 * 🔑 **Either dancer is enough to break.** A break is a property of the *hold*, and one person
 * letting go breaks it for two — so a break anywhere in the list settles it, ahead of anybody's
 * reshape. That is the one disagreement there is to resolve, and it is resolved here rather than
 * by each caller, which is why this takes the whole list.
 *
 * Absent and `null` entries are dancers with no style set, which force nothing.
 */
export function forcedAccommodation(
  styles: readonly (TurnUnderStyle | null | undefined)[] | undefined,
): Accommodation | null {
  // A break outranks a reshape, whoever is listed first: one dancer letting go has let go for
  // both, and the other's intention to keep hold does not survive it.
  let forced: Accommodation | null = null;
  for (const style of styles ?? []) {
    if (style === null || style === undefined) continue;
    const mine = accommodationFor(style);
    if (mine === BREAK) return BREAK;
    if (mine !== null) forced = mine;
  }
  return forced;
}
