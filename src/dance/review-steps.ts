/**
 * The **steps** each figure is reviewed at — the named moments a pose is judged on.
 *
 * ## Why a step catalog exists
 *
 * `#dance` can stop in exactly two places: wherever the pause button catches it, and
 * beat 0. That is enough to *find* a defect and not enough to *track* one. Ryan's
 * California Twirl report is three screenshots of the same call at three moments he had
 * to catch by hand, and the moment that matters — the belle passing under the arch —
 * is the one at 120 bpm you cannot pause on.
 *
 * So a step is a **named, addressable moment**: a figure, a beat, and the question that
 * moment is on screen to answer. Naming them is what makes a rating mean something
 * later — "the Twirl is a 1" is not actionable, "the Twirl's `under-arch` is a 1 on
 * every pairing but Ember-as-belle" is a diagnosis.
 *
 * ## Where the beats come from
 *
 * Every beat below is read off the **motion waypoints square-one actually emits**, not
 * chosen for being round. The couple figures emit a waypoint every 1/6 beat (ADR-0022's
 * finer sampling, so the polyline does not sag inside the arc); the facing-pair figures
 * emit one per beat. The block boundaries are where a step is worth having, plus the
 * mid-block crossings where two dancers are closest — which is where a clearance is
 * either right or visibly wrong.
 *
 * ## The one step that is not a beat
 *
 * `stand` is the **standing couple**, and it is a `home` pass rather than a seek,
 * because those are two different poses and both are wanted. square-one declares a
 * California Twirl's arch from `from: 0`, so beat 0 is already *inside* the arch;
 * `DanceFloor`'s home pass deliberately forces the arch blend to 0 to recover the pose
 * underneath it (ADR-0032, from Ryan: *"when I'm in california twirl and click 'go
 * home' they go to the arch."*). The couple standing with hands joined low and forward,
 * and the couple with the arch raised over them, are the first two things to look at in
 * that order — so the catalog asks for both.
 */

import type { CallName } from "square-one";

/**
 * Which pass stands the floor at a step.
 *
 * `stand` is the home pass — the standing couple, arch down. `beat` is a seek, which
 * cuts to that beat and snaps every blend to what the beat itself declares. Both are
 * cuts rather than moves; they differ only in what the arch is asked to be.
 */
export type StepPose =
  | { readonly kind: "stand" }
  | { readonly kind: "beat"; readonly beat: number };

export interface ReviewStep {
  /** Slug, unique within its figure. Half of a cell's address. */
  readonly id: string;
  readonly label: string;
  readonly pose: StepPose;
  /**
   * What this step is on screen to answer, in one sentence.
   *
   * Shown in the review panel above the rating buttons, because a rating given without
   * the question in view is a rating of the general vibe. Every one of these is a thing
   * that has actually been wrong at least once, or a thing an ADR claims is now right.
   */
  readonly watch: string;
}

export interface ReviewFigure {
  readonly id: string;
  readonly label: string;
  /** The call a facing pair dances, and what a couple figure names for the readout. */
  readonly call: CallName;
  /** Present for the couple figures — one execution, not the `2×` zero `#dance` shows. */
  readonly sequence?: readonly CallName[];
  /** The call's own length, for the beat readout. */
  readonly beats: number;
  readonly steps: readonly ReviewStep[];
}

/**
 * The couple's 180° exchange, danced holding on under a raised arch.
 *
 * 🔴 **This is the figure with the open defect** (2026-08-23): the belle's down arm
 * appears on the other side halfway through instead of turning under the arch. That
 * defect lives between `quarter` and `three-quarter` and is centred on `under-arch`,
 * which is why the exchange gets three steps across the pass rather than one.
 *
 * 🔑 **The arch is a pose the figure passes through, not the one it ends on.**
 * square-one releases it half a beat before the call is over (`HOLD_RELEASE_BEATS`), so
 * `end` names a beat *outside* the arch span and the couple are back in the ordinary
 * handhold there. That makes the step list bracket the arch on both sides: `stand` is
 * before it, `arch-up` through `three-quarter` are inside it, and `end` is after.
 */
const TWIRL_STEPS: readonly ReviewStep[] = [
  {
    id: "stand",
    label: "standing couple",
    pose: { kind: "stand" },
    watch:
      "Hands joined, low and in front of the pair — not yet raised. Both dancers on their own spots, at the width they can still make the hold at (ADR-0047). Neither inside shoulder past the midpoint (ADR-0049).",
  },
  {
    id: "arch-up",
    label: "arch raised",
    pose: { kind: "beat", beat: 0 },
    watch:
      "The inside hands — beau's right, belle's left — lifted clear of the taller crown, both dancers still on their spots. The arch is the only thing that changed from `standing couple`.",
  },
  {
    id: "quarter",
    label: "quarter through",
    pose: { kind: "beat", beat: 1 },
    watch:
      "Beau 45° round his semicircle, belle a quarter across the diameter and turning left. 🔴 The belle's **down** arm should still be on the side it started — this is the first step the 08-23 arm-swap could show.",
  },
  {
    id: "under-arch",
    label: "belle under the arch",
    pose: { kind: "beat", beat: 2 },
    watch:
      "🔴 The moment the whole figure is for. The belle is at the couple's midpoint facing back down the line, directly under the joined hands; the beau is at the top of his arc. Her held arm should be an upside-down L — undrawn upper arm vertical, forearm horizontal over her head — and her **down** arm should be turned under, not re-labelled onto the other side.",
  },
  {
    id: "three-quarter",
    label: "three-quarters through",
    pose: { kind: "beat", beat: 3 },
    watch:
      "Beau 135° round, belle three-quarters across. The down arm should have come back to the side it will finish on, and it should have got there by turning rather than by swapping.",
  },
  {
    id: "end",
    label: "ending position",
    pose: { kind: "beat", beat: 4 },
    watch:
      "🔑 Places exchanged, both facing the way the couple now faces, inside hands still joined — a Twirl finishes with the hand it used (square-one ADR-0017) — and the arch is **back DOWN**: joined hands low and in front, the ordinary handhold. Ryan, 2026-09-12: *the ending position is always hands back down in a normal handhold.* So this should be indistinguishable from `standing couple` with the two bodies swapped — NOT a mirror of `arch-up`.",
  },
];

/**
 * The same two paths with the hands free (square-one ADR-0017) — which makes the Trade
 * the **control** for every Twirl step.
 *
 * Any difference between a Trade step and its Twirl counterpart is the hold and nothing
 * else. If a Trade step reads worse than its Twirl, the defect is not in the arch.
 */
const TRADE_STEPS: readonly ReviewStep[] = [
  {
    id: "stand",
    label: "standing couple",
    pose: { kind: "stand" },
    watch:
      "The same standing couple the Twirl starts from — this step should be indistinguishable from the Twirl's `stand`, because nothing has been asked of the hands yet.",
  },
  {
    id: "start",
    label: "starting position",
    pose: { kind: "beat", beat: 0 },
    watch:
      "🔑 The control for the Twirl's `arch-up`: same spots, same bodies, **hands free**. The difference between this and that step is the entire difference between the two calls.",
  },
  {
    id: "quarter",
    label: "quarter through",
    pose: { kind: "beat", beat: 1 },
    watch:
      "Beau 45° round, belle a quarter across and turning left. Both arms hanging free — nothing should be reaching for anything.",
  },
  {
    id: "pass",
    label: "the pass",
    pose: { kind: "beat", beat: 2 },
    watch:
      "🔴 The closest the two get. Bodies and heads clear, with the bow the pair drew for their own clearance (ADR-0031) and no more. The belle walks the diameter; the beau bows round it.",
  },
  {
    id: "three-quarter",
    label: "three-quarters through",
    pose: { kind: "beat", beat: 3 },
    watch: "Beau 135° round, belle three-quarters across. Mirror of `quarter`.",
  },
  {
    id: "end",
    label: "ending position",
    pose: { kind: "beat", beat: 4 },
    watch:
      "Places exchanged, hands free — which is what lets a Trade flow into anything, and the one measurable that differs from a Twirl's ending.",
  },
];

/** Out along your own lane, across, and back along the other (square-one ADR-0020). */
const DOSADO_STEPS: readonly ReviewStep[] = [
  {
    id: "face",
    label: "facing",
    pose: { kind: "beat", beat: 0 },
    watch: "A facing pair on their own spots, hands free, square to each other.",
  },
  {
    id: "right-shoulders",
    label: "right shoulders passing",
    pose: { kind: "beat", beat: 1.5 },
    watch:
      "🔴 The outbound pass, right shoulder to right shoulder. Shoulders clear — tight is right, through is not — and the near forearm tucked rather than swinging into the other body.",
  },
  {
    id: "back-to-back",
    label: "back to back",
    pose: { kind: "beat", beat: 2.5 },
    watch:
      "Mid-slide, the widest point of the figure. Both still facing their original way — nobody turns in a Dosado.",
  },
  {
    id: "left-shoulders",
    label: "left shoulders passing",
    pose: { kind: "beat", beat: 4.5 },
    watch:
      "The return pass, left shoulder to left shoulder, walked backward. Same clearance as the outbound and the mirror of it.",
  },
  {
    id: "home",
    label: "home",
    pose: { kind: "beat", beat: 6 },
    watch:
      "Back on the starting spots, still facing. A Dosado is a zero — this step should be indistinguishable from `face`.",
  },
];

/** The shallowest clearance in the catalog, and the one most likely to be seen. */
const PASS_THRU_STEPS: readonly ReviewStep[] = [
  {
    id: "face",
    label: "facing",
    pose: { kind: "beat", beat: 0 },
    watch: "A facing pair on their own spots, hands free.",
  },
  {
    id: "shoulders",
    label: "shoulders passing",
    pose: { kind: "beat", beat: 1 },
    watch:
      "🔴 The single moment this call is. Right shoulders pass on the lane the two bodies asked for — real dancers brush shoulders here, so tight is right and through is wrong.",
  },
  {
    id: "through",
    label: "through",
    pose: { kind: "beat", beat: 2 },
    watch: "Each dancer on the other's starting spot, still facing the way they walked.",
  },
];

/**
 * The catalog's one figure sized by **arms** rather than by a clearance — the forearm
 * grip runs beat 1 to 7.5, so the four turning steps are all inside one held span.
 */
const ALLEMANDE_STEPS: readonly ReviewStep[] = [
  {
    id: "face",
    label: "facing",
    pose: { kind: "beat", beat: 0 },
    watch: "A facing pair a half-unit apart, hands free, before anyone steps in.",
  },
  {
    id: "grip",
    label: "forearms joined",
    pose: { kind: "beat", beat: 1 },
    watch:
      "🔴 Left forearms joined at the shared pivot, the pair standing off it by the radius their own arms give (square-one ADR-0020). A reach a pair can fail to make, exactly as an arch is (ADR-0033) — check both elbows are where an arm can put them.",
  },
  {
    id: "quarter",
    label: "quarter round",
    pose: { kind: "beat", beat: 3 },
    watch:
      "A quarter of the turn walked. The grip should look nailed to the pivot while the bodies breathe past it — any drift here is the grip sliding.",
  },
  {
    id: "half",
    label: "half round",
    pose: { kind: "beat", beat: 5 },
    watch: "Half round, each dancer on the other's side. Same grip, same standoff.",
  },
  {
    id: "three-quarter",
    label: "three-quarters round",
    pose: { kind: "beat", beat: 7 },
    watch: "Three-quarters round, and the last frame before the grip releases at 7.5.",
  },
  {
    id: "step-out",
    label: "stepped out",
    pose: { kind: "beat", beat: 8 },
    watch:
      "Released and stepped out to the exit spot, hands free. Nothing should still be drawn holding on.",
  },
];

/**
 * Every figure the review walks, in the order it walks them.
 *
 * The couple figures are **one execution** rather than `#dance`'s `2×` zeros: a zero is a
 * question about the whole figure returning home, and every cell here is a question about
 * one pose. Reviewing the second execution as well would double the matrix to answer a
 * question no single frame can answer anyway.
 *
 * The Twirl is first because it is where the open defect is.
 */
export const REVIEW_FIGURES: readonly ReviewFigure[] = [
  {
    id: "california-twirl",
    label: "California Twirl",
    call: "california-twirl",
    sequence: ["california-twirl"],
    beats: 4,
    steps: TWIRL_STEPS,
  },
  {
    id: "partner-trade",
    label: "Partner Trade",
    call: "partner-trade",
    sequence: ["partner-trade"],
    beats: 4,
    steps: TRADE_STEPS,
  },
  { id: "dosado", label: "Dosado", call: "dosado", beats: 6, steps: DOSADO_STEPS },
  { id: "pass-thru", label: "Pass Thru", call: "pass-thru", beats: 2, steps: PASS_THRU_STEPS },
  {
    id: "allemande-left",
    label: "Allemande Left",
    call: "allemande-left",
    beats: 8,
    steps: ALLEMANDE_STEPS,
  },
];
