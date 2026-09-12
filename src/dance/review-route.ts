/**
 * The review matrix and its URL — every pose worth judging, in one enumerable order.
 *
 * ## What a cell is
 *
 * One **figure**, one **step** of it, one **ordered pairing** of characters. The pairing
 * is ordered because the role swap is not a symmetry: ADR-0046 exists entirely because
 * the hold was aimed at the *belle's* waist, which read correctly for six days on the one
 * pairing where the belle happens to be the taller dancer and was wrong on its mirror. A
 * matrix that folded `myco/sprout` and `sprout/myco` into one cell would be a matrix that
 * cannot see the defect that produced three of the last four ADRs.
 *
 * ## Why the address is names rather than an index
 *
 * `#review=california-twirl/under-arch/sprout-myco` survives adding a step, reordering the
 * figures, or a fifth NPC; `#review=143` does not. The URL is how a pose gets shared, kept
 * in a note, or reopened tomorrow, and a rating that points at a moved index is worse than
 * no rating — it is a wrong one that looks right.
 *
 * Its own module, and not part of the scene component, for the reason `dance-route.ts`
 * gives: `main.tsx` needs the parse at mount time, and a component file that also exports
 * a function breaks fast refresh.
 */

import { castRoster } from "../config/npcs";
import { REVIEW_FIGURES, type ReviewFigure, type ReviewStep } from "./review-steps";

/** Who is standing where. Ordered — `beau` and `belle` are two places, not a set. */
export interface Pairing {
  readonly beau: string;
  readonly belle: string;
}

/** One pose to judge: a figure, a moment in it, and two bodies dancing it. */
export interface ReviewCell {
  /** `figure/step/beau-belle` — the address, and the key ratings are stored under. */
  readonly id: string;
  readonly figure: ReviewFigure;
  readonly step: ReviewStep;
  readonly pairing: Pairing;
}

/** `beau-belle`, the pairing half of a cell id. */
export function pairingId(p: Pairing): string {
  return `${p.beau}-${p.belle}`;
}

export function cellId(figure: ReviewFigure, step: ReviewStep, pairing: Pairing): string {
  return `${figure.id}/${step.id}/${pairingId(pairing)}`;
}

/**
 * Every ordered pairing the roster can stand up — 25 on the shipped cast of five.
 *
 * Nothing is excluded, **including a dancer partnered with themselves.** What a pairing
 * contributes is proportions and not identity — `Dancer` seats every occupant at the same
 * body centre, and `DanceFloor` takes the two bodies as a positional pair — so `you → you`
 * is not a dancer holding their own hand, it is *two dancers of identical build*, which is
 * a pose the geometry has to get right and which no other cell stands up.
 *
 * 🔑 **The identity pairings are the control row.** Every mixed cell shows a figure and a
 * size difference at once, and when one of those reads wrong the chart cannot say which it
 * was. On `myco → myco` the two halves are the same size by construction, so any asymmetry
 * left on screen belongs to the **figure** — the arch, the pass, the grip — and any
 * asymmetry that appears only off the diagonal belongs to the **fit**. That is the same
 * reading the row/column layout of the chart is built for, with the confound removed.
 *
 * The player is in here like anybody else, for the same reason: proportions are the whole
 * question.
 */
export function reviewPairings(): readonly Pairing[] {
  const ids = castRoster().map((c) => c.id);
  const out: Pairing[] = [];
  for (const beau of ids) {
    for (const belle of ids) {
      out.push({ beau, belle });
    }
  }
  return out;
}

/**
 * The whole matrix, in review order: **figure, then step, then pairing.**
 *
 * Pairing innermost on purpose. The question a review answers is "does this pose hold up
 * across bodies", and holding one moment still while the bodies change under it is how
 * that gets seen — it is exactly the sweep that turned up the born-narrow problem and the
 * eight orderings standing under their `shoulders` term. Walking figures innermost would
 * instead show one pair dancing everything, which is what `#dance` already does.
 */
export function reviewCells(): readonly ReviewCell[] {
  const pairings = reviewPairings();
  const out: ReviewCell[] = [];
  for (const figure of REVIEW_FIGURES) {
    for (const step of figure.steps) {
      for (const pairing of pairings) {
        out.push({ id: cellId(figure, step, pairing), figure, step, pairing });
      }
    }
  }
  return out;
}

/** Look one up by address. `null` for anything that does not name a real cell. */
export function findCell(id: string): ReviewCell | null {
  return reviewCells().find((c) => c.id === id) ?? null;
}

/**
 * `#review` → the first cell; `#review=<id>` → that cell; an unknown id → the first cell.
 * Anything that is not a review hash at all → `null`, so `main.tsx` can branch on it.
 *
 * Falling back rather than erroring is the same choice `danceSceneFigure` makes: a stale
 * link from a note should open the review, not a blank page.
 */
export function reviewSceneCell(hash: string): ReviewCell | null {
  const m = /^#review(?:=(.*))?$/.exec(hash);
  if (m === null) return null;
  const cells = reviewCells();
  const first = cells[0] ?? null;
  const requested = m[1];
  if (requested === undefined || requested === "") return first;
  return findCell(decodeURIComponent(requested)) ?? first;
}

/**
 * The inverse of {@link reviewSceneCell} — kept beside it for the reason `dance-route.ts`
 * learned the hard way: an inverse that lives away from its function is an inverse nobody
 * notices has stopped being one. Round-tripped over the whole matrix in the tests.
 */
export function reviewSceneHash(cell: ReviewCell): string {
  return `#review=${cell.id}`;
}
