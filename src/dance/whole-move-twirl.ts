/**
 * 🧪 The California Twirl as a whole-move problem (2026-10-26, step 2): the engine's two floor
 * paths in, a `Move` and its starting shape out. Lifted out of `scripts/whole-move/solve.ts` so the
 * script and the browser (`whole-move-client.ts`) build the same problem. Brief:
 * `work/square-dance-planning/briefs/solve-the-whole-move.md`.
 */

import type { PathSample } from "./baked-tracks";
import { armPoints, growRoom, restArm, startOnPath, toFloor, type Body, type Frame, type GrowStyle, type Move, type Target, type Vec } from "./whole-move";

/** A pairing's floor paths, as captured from `#review2` (`scripts/whole-move/*.paths.json`). */
export interface TwirlPaths {
  pairing: string;
  figure: string;
  shapes: [string, string];
  beau: PathSample[];
  belle: PathSample[];
}

const D2R = Math.PI / 180;

/** 🧪 A break's pull between the hands, as a fraction of a hold's (10-27, measured on the stock cast). */
export const BREAK_HOLD = 0.02;

/**
 * The move, the floor's path (arms at rest: what `metrics` measures the step-out against), and
 * the start: the held hands put on a guide arc by two-bone IK, elbows out. The arc rises from
 * between the two held shoulders to a hand's width over her crown at the middle of the move.
 * Only the start uses it; the solve runs without it. `grow` says who may change height (10-27);
 * the start is as built either way.
 *
 * `accommodation` (10-27) is the floor's draw (ADR-0037). `reshape` is the held arch, reached for
 * as far as the arms stretch. `break`: the hands reach for each other at {@link BREAK_HOLD} of a
 * hold's pull but aren't owed contact, nobody changes height, and the arms start at rest. Pair it
 * with paths sized for a break (`couplePaths` with a `break` sizing): the beau bows out as far as
 * a break needs, which on most of the stock cast is no further than held.
 */
export function twirlMove(
  P: TwirlPaths,
  bodies: [Body, Body],
  targets: readonly Target[] = [],
  grow: GrowStyle = "none",
  accommodation: "reshape" | "break" = "reshape",
): { move: Move; path: Frame[]; start: Frame[] } {
  const broken = accommodation === "break";
  const path: Frame[] = P.beau.map((b, i) => {
    const g = P.belle[i] ?? b;
    return [
      { x: b.x / 100, z: b.z / 100, yaw: b.facing * D2R, arms: [restArm(bodies[0]), restArm(bodies[0])] },
      { x: g.x / 100, z: g.z / 100, yaw: g.facing * D2R, arms: [restArm(bodies[1]), restArm(bodies[1])] },
    ];
  });
  // Facing is unwrapped so the path doesn't jump ±360° between samples.
  for (const k of [0, 1] as const) for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]?.[k].yaw ?? 0;
    const cur = path[i]?.[k];
    if (cur === undefined) continue;
    while (cur.yaw - prev > Math.PI) cur.yaw -= 2 * Math.PI;
    while (cur.yaw - prev < -Math.PI) cur.yaw += 2 * Math.PI;
  }

  // The beau's right holds the belle's left for the whole call: the arch span, then the ordinary
  // handhold it releases into (square-one ADR-0026; the arch is 0–3.5 of 4 beats). The arch's
  // plane: through the couple's midpoint at the start, along their facing (normal: the line
  // between their spots).
  const f0 = path[0];
  if (f0 === undefined) throw new Error("twirlMove: no samples");
  const dx = f0[1].x - f0[0].x;
  const dz = f0[1].z - f0[0].z;
  const l = Math.hypot(dx, dz) || 1;
  const plane = { p: [(f0[0].x + f0[1].x) / 2, 0, (f0[0].z + f0[1].z) / 2] as Vec, n: [dx / l, 0, dz / l] as Vec };
  const move: Move = {
    bodies,
    frames: path,
    holds: broken
      ? [{ from: 0, to: 1, beau: 1, belle: 0, weight: BREAK_HOLD }]
      : [
          { from: 0, to: 3.5 / 4, beau: 1, belle: 0, plane },
          { from: 3.5 / 4 + 1e-6, to: 1, beau: 1, belle: 0 },
        ],
    ...(targets.length > 0 ? { targets } : {}),
  };
  if (!broken) Object.assign(move, growRoom(grow, bodies));
  if (broken) return { move, path, start: path };

  const n = path.length;
  const crown = bodies[1].head.c[1] + bodies[1].head.r;
  const guide = (i: number): Vec => {
    const f = path[i] ?? f0;
    const sb = toFloor(armPoints(bodies[0], 1, restArm(bodies[0])).s, f[0]);
    const sg = toFloor(armPoints(bodies[1], 0, restArm(bodies[1])).s, f[1]);
    const t = n > 1 ? i / (n - 1) : 0;
    const low = 0.6;
    const top = crown + bodies[1].handR + 0.05;
    return [(sb[0] + sg[0]) / 2, low + (top - low) * Math.sin(Math.PI * t), (sb[2] + sg[2]) / 2];
  };
  return { move, path, start: startOnPath(move, guide) };
}
