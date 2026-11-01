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
 *   over the engine's grip span, held at `gripHeight` (the floor's `planForearm`) and centred
 *   between the two; the arms start reaching for that point.
 * - **Anything held another way is not solved yet**, and says why.
 */

import type { CallName, GripSpan } from "square-one";
import type { PathSample } from "./baked-tracks";
import { growRoom, startOnPath, toFloor, type Body, type Frame, type GrowStyle, type Hold, type Move, type Vec } from "./whole-move";
import { pathFrames, twirlMove } from "./whole-move-twirl";

/** A checked index read, local on purpose (journal 10-31 (8): an imported helper is slower in the bakes). */
const nth = <T>(a: readonly T[], i: number): T => {
  const x = a[i];
  if (x === undefined) throw new RangeError(`whole-move-figure: index ${String(i)} outside ${String(a.length)}`);
  return x;
};

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
  o: { readonly stepCap?: number; readonly grow?: GrowStyle; readonly gripHeight?: number; readonly trade?: readonly [number, number] } = {},
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
    return [{
      from: Math.max(g.from, her.from) / P.beats, to: Math.min(g.to, her.to) / P.beats, beau: side(g.hand), belle: side(her.hand), forearm: true,
      ...(o.gripHeight === undefined ? {} : { gripHeight: o.gripHeight }),
    }];
  });
  // A forearm grip at one height between two bodies of different heights is the floor's reshape
  // (`planForearm`): they trade height, as the twirl's `meet` does.
  // 🧪 A held figure starts with the arms hanging (10-28, 12). Left free, ember ×2's belle began
  // with her forearm tilted back (pitch −71°, heading −45°) and swung 160° up into the grip, 33–38° a
  // sample. Only the start: the grip lets go half a beat from the end, and pinned there too the
  // arms dropped 30–33° a sample (the call flows on into the next one, ADR-0026's rule).
  const ends = [0].flatMap((i) => ([0, 1] as const).flatMap((dancer) => ([0, 1] as const).flatMap((side) => [
    { i, dancer, side, key: "raise" as const, value: 0, weight: 1 },
    { i, dancer, side, key: "pitch" as const, value: -Math.PI / 2, weight: 1 },
  ])));
  const move: Move = {
    bodies, frames: path, holds, ...cap,
    ...(holds.length > 0 && o.grow !== undefined ? growRoom(o.grow, bodies) : {}),
    ...(holds.length > 0 ? { targets: ends } : {}),
  };
  if (holds.length === 0) return { move, path, start: path };
  // The arms start reaching for the point between the two, at the grip's height (`gripHeight`, the
  // floor's `planForearm`), or the lower shoulder's less 10 cm.
  const at = (i: number): Vec => {
    const f = path[i] ?? nth(path, 0);
    const sa = toFloor(bodies[0].shoulder[0], f[0]);
    const sb = toFloor(bodies[1].shoulder[0], f[1]);
    return [(f[0].x + f[1].x) / 2, o.gripHeight ?? Math.min(sa[1], sb[1]) - 0.1, (f[0].z + f[1].z) / 2];
  };
  // 🧪 The pair's height trade (`armTurnGrip`), worn over the grip and eased in over the step-in and
  // out over the step-out, so the call starts and ends as built. Left to find it, player → myco
  // traded the wrong way once myco's arm went overhead (10-28).
  const span = nth(holds, 0);
  const trade = o.trade;
  const seeded: Frame[] = trade === undefined || move.grow === undefined ? path : path.map((f, i) => {
    const t = path.length > 1 ? i / (path.length - 1) : 0;
    const u = Math.max(0, Math.min(1, span.from > 0 ? t / span.from : 1, span.to < 1 ? (1 - t) / (1 - span.to) : 1));
    return [{ ...f[0], grow: trade[0] * u }, { ...f[1], grow: trade[1] * u }];
  });
  const start = startOnPath({ ...move, frames: seeded }, at);
  // 🧪 Before the grip the held arms hang, facing the way they'll lift (10-28, 12): a hanging
  // forearm's heading is free, and ember ×2's belle started at −18° against the 119° the grip needs,
  // turning 137° on the way up where the beau turned 67°.
  const first = start.findIndex((_, i) => i / Math.max(1, start.length - 1) >= span.from - 1e-9);
  const contact = start[first];
  if (contact !== undefined) for (let i = 0; i < first; i++) {
    const f = nth(start, i);
    start[i] = [
      { ...f[0], arms: f[0].arms.map((a, s) => (s === span.beau ? { ...a, heading: contact[0].arms[s].heading } : a)) as typeof f[0]["arms"] /* cast: two dancers or two arms, mapped from a pair (ADR-0071) */ },
      { ...f[1], arms: f[1].arms.map((a, s) => (s === span.belle ? { ...a, heading: contact[1].arms[s].heading } : a)) as typeof f[1]["arms"] /* cast: two dancers or two arms, mapped from a pair (ADR-0071) */ },
    ];
  }
  return { move, path, start };
}
