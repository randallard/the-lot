/**
 * 🧪 What `#review2` can pose (2026-10-28): the review catalog's figures (`REVIEW_FIGURES`, which
 * `#review` rates and the engine dances), and the figures for four that the-lot solves itself
 * until square-one has them (step 5; `whole-move-rlt.ts`, `SolvedFloor`).
 *
 * Kept apart from `REVIEW_FIGURES` because `#review` draws every figure there on a `DanceFloor`,
 * which can't dance a call the engine doesn't have.
 *
 * **A pairing means both couples.** `#review2` is organised round the 25 beau → belle pairings; for
 * a four-dancer figure, pairing X is couple X facing another couple X. Mixed sets come later.
 */

import { REVIEW_FIGURES, type ReviewFigure, type ReviewStep } from "./review-steps";
import type { FourCall } from "./baked-four";

export interface SolvedFigure {
  readonly id: string;
  readonly label: string;
  /** Danced by `SolvedFloor` from a four-dancer solve, not by the engine. */
  readonly solved: FourCall;
  readonly beats: number;
  readonly steps: readonly ReviewStep[];
}

export type Review2Figure = ReviewFigure | SolvedFigure;

export const isSolved = (f: Review2Figure): f is SolvedFigure => "solved" in f;

/** Dancer `d` of a set made from one pairing: gents are 0 and 2, their partners 1 and 3. */
export const roleOf = (d: number): "beau" | "belle" => (d % 2 === 0 ? "beau" : "belle");

const RLT_STEPS: readonly ReviewStep[] = [
  {
    id: "face",
    label: "facing",
    pose: { kind: "beat", beat: 0 },
    watch: "Two couples facing, each in a handhold, a lane apart.",
  },
  {
    id: "right-hands",
    label: "right hands",
    pose: { kind: "beat", beat: 0.7 },
    watch: "Each gives a right hand to the opposite and pulls by, right shoulders passing, the arms clear of the dancers they pass.",
  },
  {
    id: "left-hands",
    label: "left hands",
    pose: { kind: "beat", beat: 2.5 },
    watch: "Each gent takes his partner's left hand in his left, his right hand on her back.",
  },
  {
    id: "courtesy",
    label: "courtesy turn",
    pose: { kind: "beat", beat: 4 },
    watch: "They turn left as a unit, close, the lady a little ahead, the gent backing up.",
  },
  {
    id: "home",
    label: "facing again",
    pose: { kind: "beat", beat: 6 },
    watch: "On the other side, facing the other couple, back in the ordinary handhold.",
  },
];

export const REVIEW2_FIGURES: readonly Review2Figure[] = [
  ...REVIEW_FIGURES,
  { id: "right-and-left-thru", label: "Right and Left Thru (4)", solved: "right-and-left-thru", beats: 6, steps: RLT_STEPS },
];
