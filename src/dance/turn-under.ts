/**
 * **What a dancer does with the arm they are turning under** — the three styles, named.
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
 * - {@link GABLE} — what he called "the L" until he photographed it (2026-10-12): **both** arms
 *   leaning in to a peak over the turning dancer's crown, like the two slopes of a roof. Her
 *   elbow is out over her own shoulder at about crown height and her forearm slopes up and in;
 *   neither forearm is ever level, and neither arm is straight. The joined hands stay over the
 *   centre of the exchange and she walks under them. Contact kept. The 2026-08-23 words this
 *   style was first built from — *"an upside down L with the invisible upper arm and the forearm
 *   then is horizontal over the head"* — describe one frame of it, and loosely
 *   ([journal](../../docs/journal/2026-10-12-1-the-l-is-a-gable.md)).
 * - {@link DUCK_UNDER} — the same gable, and the dancer **shrinks** under it rather than asking
 *   the arm for all of the room. Contact kept. 🔑 Ryan, 2026-10-12: *"when we say duck it's really
 *   referring to the need to shrink the dancer to make the geometry work in the-lot"* — the
 *   reflexive head-tip a dancer makes going under is **not** this; every style has that.
 * - {@link CASUAL} — no gable and no trying: each lifts a forearm from a hanging elbow, over
 *   their own shoulder, and she walks the same line anyway. Contact **lost**.
 *
 * ## 🔑 Three, since 2026-10-12 — and what happened to the fourth
 *
 * The list above named four, the last two being a "lazy L" and a "casual" arm-up. Watched side
 * by side they were one pose, and Ryan folded them: *"cut out casual — that's the same as lazy
 * for our purposes — I guess casual is a less judgemental term — lets go with that — replace
 * all lazy with casual."* So today's {@link CASUAL} is what was `lazy-gable`, under the kinder
 * name, and the old `casual` is gone.
 *
 * 🔑 **Which leaves three things a pair can do, and they differ in kind** (his words):
 *
 * - **shrink / grow** ({@link RESHAPE}) — *"creating new rules — following the rules by changing
 *   shape."* What {@link GABLE} and {@link DUCK_UNDER} force.
 * - **the break** ({@link BREAK}, by setting or coin flip) — *"trying with good effort … hands
 *   getting as close as they can without changing the rules."* No style names it: it is what a
 *   pair that meant to hold on does when they cannot.
 * - **casual** ({@link CASUAL}) — the same accommodation as the break and *"a different
 *   energy"*: nobody reaches. It is the pose that tells the two apart, not the outcome.
 *
 * ## 🔑 Deliberately not ordered as a ladder
 *
 * It is tempting to read these as a degradation sequence the way ADR-0040's reach → break is one.
 * They are not written as one, because **nobody has looked at them yet.** Ryan named the things
 * dancers do and said which of them breaks contact; whether they rank, and in what order, is
 * exactly what the review branch exists to find out. Encoding an order here would answer the
 * question the instrument was built to ask.
 *
 * What *is* recorded is the one property he stated outright — {@link keepsContact}.
 *
 * ## 🔑 Why the belle's path is the same in all three
 *
 * Including {@link CASUAL}, which sounds like it should be a detour round the outside. Ryan's
 * call, and it keeps the whole family on this side of the seam: square-one's `belleHalf` walks
 * her a `step-pivot` of exactly `couple.width` — the diameter — and `archClearance` feeds only
 * the **beau's** bow. Her path takes no clearance parameter at all. A genuinely different route
 * would need a new block, and square-one's ADR-0024 deleted the one block that modelled an
 * alternative path, with a promotion condition for rebuilding it *from an actual named call*
 * rather than from a consumer's preference.
 *
 * ## 🔴 And why {@link CASUAL} is not a new outcome
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
  | typeof GABLE
  | typeof DUCK_UNDER
  | typeof CASUAL;

/** Both arms leaning in to a peak over the turning dancer's crown. The pose the figure is drawn for. */
export const GABLE = "gable";
/** The gable, and the dancer shrinks under it instead of asking the arm for all the room. */
export const DUCK_UNDER = "duck-under";
/** No gable and no reach: a forearm lifted from a hanging elbow, hands apart. Was `lazy-gable`. */
export const CASUAL = "casual";

/**
 * All three, in the order Ryan named them — which is **not** a ranking (see the module doc).
 *
 * Exported for the same reason `ACCOMMODATIONS` is: a test or a report that has to cover the
 * family should not be able to cover three of it.
 */
export const TURN_UNDER_STYLES: readonly TurnUnderStyle[] = [
  GABLE,
  DUCK_UNDER,
  CASUAL,
];

/**
 * Whether the hands are still joined at the end of the turn.
 *
 * Ryan stated it outright — *"those both maintain contact"* of the first two, and *"lazy L and
 * break contact"* of what is now {@link CASUAL}.
 */
export function keepsContact(style: TurnUnderStyle): boolean {
  return style !== CASUAL;
}

/**
 * How much room a dancer has to drop, for `sizeArch`'s duck step — their whole body height down
 * to the shape editor's floor if they are dancing {@link DUCK_UNDER}, and `0` otherwise.
 *
 * ## The duck has a job, and it is not decoration
 *
 * Ryan's own words for it are *"the dancer drops under it rather than asking the arm for all of
 * the room"*, and 2026-09-26 found what "the room" actually is. What fails a `GABLE` is not a
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
 * the midpoint. She should be visibly lower than she is in `quarter · the gable`"*. A profile that
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
 * 🧪 **One turn-under's beats: the hands rise for the first half and lower for the second**
 * (2026-10-24).
 *
 * square-one declares a turn-under's arch from the call's first beat, and the floor used to
 * read that as "raised at beat 0". The reference stills say otherwise
 * (`work/square-dance-planning/review2/reference/twirl2/`, beat-counted by Ryan): at beat 0
 * the couple are in the ordinary handhold, hands low (`01`). By beat 1 the joined hands are up
 * between them (`02`), the arch is full at beat 2 with the belle under it (`04`, `09`), and the
 * hands are back down in the handhold at beat 4 (`06`, `11`). Ryan: *"the move starts with hands
 * raised - they should start down in a handhold"*, and then *"the full arch is at beat two when
 * the belle is under it … they stop at beat one and they should keep moving into position."*
 */
export const ARCH_CYCLE_BEATS = 4;

/**
 * How far into the arch the hold is at `beat`, `0`–`1`: `0` where the span starts, `1` half a
 * {@link ARCH_CYCLE_BEATS} later, `0` again at the end of it. A raised cosine like
 * {@link duckProfile}, so the arms never stop between the handhold and the peak.
 *
 * It repeats every cycle, so a span that square-one merged across two turn-unders in a row
 * (ADR-0026: the hold continues; the hands stay *joined*) lifts and lowers once per call.
 */
export function archLift(beat: number, from: number): number {
  if (beat <= from) return 0;
  const t = ((beat - from) % ARCH_CYCLE_BEATS) / ARCH_CYCLE_BEATS;
  return (1 - Math.cos(2 * Math.PI * t)) / 2;
}

/**
 * The reach accommodation this style forces, or `null` when it leaves that draw alone.
 *
 * - {@link CASUAL} forces {@link BREAK} — a break is already *"nobody changes shape … and the
 *   hands come apart"*. 🔑 What it does **not** share with a break reached by setting or coin
 *   flip is the pose: that one reaches with good effort, this one does not reach at all.
 * - {@link GABLE} and {@link DUCK_UNDER} force {@link RESHAPE} (2026-10-11). Ryan's own words
 *   for the pair were *"those both maintain contact"*, and a reshape is the accommodation that
 *   does; a style defined by keeping the hold cannot land on the one that lets go of it.
 *
 * 🔴 **This reverses what stood here until 2026-10-11**, which returned `null` for all of them on
 * purpose: *"whether a pair reshape or break to reach each other is a different question from
 * how one of them takes their arm over their head, and collapsing the two would silently pin one
 * of ADR-0037's two styles off."* It is a fair distinction and it cost more than it bought: with
 * the L tossing, one review address showed two poses at two distances
 * ([journal](../../docs/journal/2026-10-11-2-one-address-two-poses.md)), and a pose that cannot
 * be shown twice cannot be authored, rated or carried. Nothing is pinned off silently — the
 * break is `casual`, by name. No ADR yet; the posture work is still experimenting.
 */
export function accommodationFor(style: TurnUnderStyle): Accommodation | null {
  switch (style) {
    case CASUAL:
      return BREAK;
    case GABLE:
    case DUCK_UNDER:
      return RESHAPE;
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
