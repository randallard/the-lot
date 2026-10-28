/**
 * 🧪 **Any `#review` figure as a whole-move problem** (step 7, 2026-10-28): the engine's paths and
 * grips in (`figurePaths`), a `Move` and its starting shape out, for `solve-all`. Brief:
 * `work/square-dance-planning/briefs/solve-the-whole-move.md`, B.1–B.3 and B.5.
 *
 * - **California Twirl** is `twirlMove`: its arch hold, the arch's plane and the guide that
 *   starts the arms up.
 * - **Hands free** (Partner Trade, Dosado, Pass Thru): no hold. The solve is clearance, rest and
 *   smoothness, and the beau's step. Partner Trade's couple handhold at its ends is the floor's,
 *   not a grip (square-one's `GripStyle`), so the solve leaves the hands free.
 * - **Anything held another way is not solved yet**, and says why. Allemande Left's is a
 *   `forearm` grip: each hand at the other's elbow. The solver joins hand to hand only.
 */

import type { CallName, GripSpan } from "square-one";
import type { PathSample } from "./baked-tracks";
import type { Body, Frame, GrowStyle, Move } from "./whole-move";
import { pathFrames, twirlMove } from "./whole-move-twirl";

export interface FigurePaths {
  readonly beau: PathSample[];
  readonly belle: PathSample[];
  readonly grips: { readonly beau: readonly GripSpan[]; readonly belle: readonly GripSpan[] };
}

export type FigureMove =
  | { readonly move: Move; readonly path: Frame[]; readonly start: Frame[] }
  | { readonly unsupported: string };

export function figureMove(
  call: CallName,
  P: FigurePaths,
  bodies: [Body, Body],
  o: { readonly stepCap?: number; readonly grow?: GrowStyle } = {},
): FigureMove {
  const cap = o.stepCap === undefined ? {} : { stepCap: o.stepCap };
  if (call === "california-twirl") {
    const t = twirlMove({ pairing: "", figure: call, shapes: ["", ""], beau: P.beau, belle: P.belle }, bodies, [], o.grow ?? "none");
    return { ...t, move: { ...t.move, ...cap } };
  }
  const grips = [...P.grips.beau, ...P.grips.belle];
  const other = grips.find((g) => g.hand !== "none");
  if (other !== undefined) return { unsupported: `a ${other.grip} grip (${other.hand} hand): the solver joins hand to hand only` };
  const path = pathFrames(P, bodies);
  return { move: { bodies, frames: path, holds: [], ...cap }, path, start: path };
}
