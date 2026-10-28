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
 * - **A forearm grip** (Allemande Left, 10-28): a `forearm` hold, each hand at the other's elbow,
 *   over the engine's grip span; the arms start reaching for the point between the two at the
 *   lower shoulder's height less 10 cm.
 * - **Anything held another way is not solved yet**, and says why.
 */

import type { CallName, GripSpan } from "square-one";
import type { PathSample } from "./baked-tracks";
import { startOnPath, toFloor, type Body, type Frame, type GrowStyle, type Hold, type Move, type Vec } from "./whole-move";
import { pathFrames, twirlMove } from "./whole-move-twirl";

export interface FigurePaths {
  readonly beau: PathSample[];
  readonly belle: PathSample[];
  /** The call's beats, which the grips' spans are in. */
  readonly beats: number;
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
  const other = grips.find((g) => g.hand !== "none" && g.grip !== "forearm");
  if (other !== undefined) return { unsupported: `a ${other.grip} grip (${other.hand} hand): the solver joins hand to hand, or hand to elbow` };
  const path = pathFrames(P, bodies);
  const side = (h: string): 0 | 1 => (h === "left" ? 0 : 1);
  const holds: Hold[] = P.grips.beau.flatMap((g) => {
    if (g.grip !== "forearm" || g.hand === "none") return [];
    const her = P.grips.belle.find((b) => b.grip === "forearm" && b.hand !== "none" && b.from < g.to && b.to > g.from);
    if (her === undefined) return [];
    return [{ from: Math.max(g.from, her.from) / P.beats, to: Math.min(g.to, her.to) / P.beats, beau: side(g.hand), belle: side(her.hand), forearm: true }];
  });
  const move: Move = { bodies, frames: path, holds, ...cap };
  if (holds.length === 0) return { move, path, start: path };
  // The arms start reaching for the point between the two, at the lower shoulder's height less 10 cm.
  const at = (i: number): Vec => {
    const f = path[i] ?? path[0]!;
    const sa = toFloor(bodies[0].shoulder[0], f[0]);
    const sb = toFloor(bodies[1].shoulder[0], f[1]);
    return [(f[0].x + f[1].x) / 2, Math.min(sa[1], sb[1]) - 0.1, (f[0].z + f[1].z) / 2];
  };
  return { move, path, start: startOnPath(move, at) };
}
