/**
 * 🧪 **How far apart two dancers must be to pass each other, arms and all** (2026-10-28, from
 * `solve-all`'s first run, the-lot journal 10-28-8).
 *
 * The wider of two measures:
 * - **the bodies'**: `passingWidth(lateralClearance(...))`, torsos and heads (ADR-0031, ADR-0044);
 * - **the arms'**: the two shoulders' distance out from the body's centre line, a hand hanging
 *   off each, and 4 cm between. Right and Left Thru's lane (10-27-8: four Ryans' shoulders
 *   stand 46 cm out past 30 cm torsos, and the gents stepped 38 cm wide of a bodies-only lane).
 *
 * Bodies only, the engine's paths were too tight for anybody whose shoulders stand out past their
 * torso: `solve-all` found the beau stepping 12–41 cm off his path to make the room in every
 * pairing with ryan (Partner Trade, Dosado, Pass Thru), and clipping when the step was capped.
 *
 * Only the room two dancers **pass** in. Standing as a couple (`placeHold`'s floor) and an arch
 * (`sizeArch`) are other questions, and still read the bodies' measure.
 */

import { lateralClearance, rigidParts, type CharacterBodyShape } from "../services/body-shapes";
import { passingWidth } from "./frame";
import { bodyOf } from "./whole-move";

/** Shoulders out, a hanging hand off each, and this between them (m). */
export const ARMS_GAP = 0.04;

/** The arms' measure alone: each shoulder's distance out from its body's centre line, and a hand. */
export function armsClearance(a: CharacterBodyShape, b: CharacterBodyShape): number {
  const A = bodyOf(a);
  const B = bodyOf(b);
  return Math.abs(A.shoulder[0][0]) + Math.abs(B.shoulder[0][0]) + 2 * Math.max(A.handR, B.handR) + ARMS_GAP;
}

/**
 * 🧪 How much nearer two dancers' heads come than their centres when they face each other (m): how
 * far ahead of each body's centre line its head sits, the two added (square-one's
 * `FigureShape.forward`, 0.9.0). Ember carries its head 28 cm forward, and two embers in a Pass
 * Thru met head first (10-28, `solve-all`). Everyone else's head is over their centre: 0.
 */
export function forwardReach(a: CharacterBodyShape, b: CharacterBodyShape): number {
  return Math.max(0, bodyOf(a).head.c[2]) + Math.max(0, bodyOf(b).head.c[2]);
}

/** How far apart two dancers must be to pass, centre to centre (m): the bodies' or the arms', the wider. */
export function passingClearance(a: CharacterBodyShape, b: CharacterBodyShape): number {
  return Math.max(passingWidth(lateralClearance(rigidParts(a), rigidParts(b))), armsClearance(a, b));
}

/**
 * 🧪 How far apart two dancers pass **under an arch they hold** (m, 10-29, Star Thru): the bodies'
 * clearance alone. Passing right shoulders, his passing-side arm is the one up in the arch, so the
 * hanging arms {@link passingClearance} also counts aren't in the gap. The floor and the headless
 * paths (`figurePaths`) both read this, so a bake is played on the paths it was solved on.
 */
export function archPassClearance(a: CharacterBodyShape, b: CharacterBodyShape): number {
  return passingWidth(lateralClearance(rigidParts(a), rigidParts(b)));
}
