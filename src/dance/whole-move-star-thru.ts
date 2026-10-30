/**
 * 🧪 Star Thru as a whole-move problem (2026-10-29): square-one's two floor paths in (`figurePaths`
 * "star-thru": a facing pair walking into a couple), a `Move` and its starting shape out. Built as
 * `twirlMove` is, and the first call through the custom-move flow's steps 1–4 (planning PROGRESS,
 * 10-29): blocks and a hold from the engine, then a starting shape from the hold's class, an arch.
 *
 * What the solve is told, and nothing more:
 * - **The hold.** The man's right holds the woman's left for the whole call (the engine's arch
 *   spans, `star-thru.ts`). No plane: CALLERLAB's arch is offset to the man's right, not centred
 *   on the pair, and where it sits is the solve's to find (and Ryan's keyframes').
 * - **Over her head** (`Move.over`, 10-29) while she passes under it. They're level at 0.75 of the
 *   call, so the window is around that, not the middle as in the twirl.
 * - **A starting arc** for the topology (the 10-24 lesson: inference finds timing, not shape):
 *   the held hands between his right and her left shoulder, at eye level, rising over her crown at
 *   0.75, and down to a couple's handhold at the end ("the hand grip should be readjusted to couple
 *   handhold", CALLERLAB styling).
 */

import { armPoints, growRoom, restArm, startOnPath, toFloor, type Body, type Frame, type GrowStyle, type Move, type Target, type Vec } from "./whole-move";
import { BREAK_HOLD, pathFrames, type TwirlPaths } from "./whole-move-twirl";

/** Where they're level: `(0.5 + w/2) · t = 0.5` at the engine's widths, 0.73–0.75 on the cast. */
export const STAR_THRU_CROSSING = 0.75;

/**
 * 🧪 When the pair come within arm's length (fraction of the call): the first sample where the
 * two held shoulders are nearer than the two arms are long, less a tenth for a bent elbow. The
 * engine joins the hands from beat 0, but its pair stand a unit apart, 2.2 m on the floor, and no
 * two arms here span that: the first solve held from the start and the beau stepped 77 cm toward
 * her. CALLERLAB's "as the dancers move forward" reads the same way.
 */
export function joinAt(path: readonly Frame[], bodies: readonly [Body, Body]): number {
  const n = path.length;
  const reach = 0.9 * (bodies[0].upper0 + bodies[0].fore0 + bodies[1].upper0 + bodies[1].fore0);
  for (let i = 0; i < n; i++) {
    const f = path[i];
    if (f === undefined) continue;
    const sb = toFloor(armPoints(bodies[0], 1, restArm(bodies[0])).s, f[0]);
    const sg = toFloor(armPoints(bodies[1], 0, restArm(bodies[1])).s, f[1]);
    if (Math.hypot(sb[0] - sg[0], sb[2] - sg[2]) <= reach) return n > 1 ? i / (n - 1) : 0;
  }
  return 1;
}

/** 🧪 The samples she's under the arch: from halfway to just before the end, round the crossing. */
export function underArch(n: number, clear: number): (number | undefined)[] {
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    return t >= 0.5 && t <= 0.9 ? clear : undefined;
  });
}

export function starThruMove(
  P: Pick<TwirlPaths, "beau" | "belle">,
  bodies: [Body, Body],
  targets: readonly Target[] = [],
  grow: GrowStyle = "meet",
): { move: Move; path: Frame[]; start: Frame[] } {
  const path = pathFrames(P, bodies);
  const n = path.length;
  const move: Move = {
    bodies,
    frames: path,
    holds: [],
  };
  // Reaching for each other (a break's weak pull) until they're within arm's length, then held.
  const join = joinAt(path, bodies);
  if (join > 0) move.holds.push({ from: 0, to: join - 1e-6, beau: 1, belle: 0, weight: BREAK_HOLD });
  move.holds.push({ from: join, to: 1, beau: 1, belle: 0 });
  if (targets.length > 0) move.targets = [...targets];
  // The beau keeps to the engine's path within 10 cm, as `solve-all`'s figures do (B.5): without it
  // the reaching hands drew him 56 cm toward her before they could join.
  move.stepCap = 0.1;
  Object.assign(move, growRoom(grow, bodies));
  // The hands go over her head as she passes under them: a hand's width and 3 cm, as the twirl's.
  move.over = underArch(n, bodies[1].handR + 0.03);

  const crown = bodies[1].head.c[1] + bodies[1].head.r;
  const eye = Math.min(bodies[0].head.c[1], bodies[1].head.c[1]);
  const top = crown + bodies[1].handR + 0.05;
  const low = 0.9;
  const f0 = path[0];
  if (f0 === undefined) throw new Error("starThruMove: no samples");
  const guide = (i: number): Vec => {
    const f = path[i] ?? f0;
    const sb = toFloor(armPoints(bodies[0], 1, restArm(bodies[0])).s, f[0]);
    const sg = toFloor(armPoints(bodies[1], 0, restArm(bodies[1])).s, f[1]);
    const t = n > 1 ? i / (n - 1) : 0;
    // Eye level → over her crown at the crossing → down to the handhold.
    const y = t <= STAR_THRU_CROSSING
      ? eye + (top - eye) * Math.sin((Math.PI / 2) * (t / STAR_THRU_CROSSING))
      : top + (low - top) * Math.sin((Math.PI / 2) * ((t - STAR_THRU_CROSSING) / (1 - STAR_THRU_CROSSING)));
    return [(sb[0] + sg[0]) / 2, y, (sb[2] + sg[2]) / 2];
  };
  return { move, path, start: startOnPath(move, guide) };
}
