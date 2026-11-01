/**
 * 🧪 The California Twirl as a whole-move problem (2026-10-26, step 2): the engine's two floor
 * paths in, a `Move` and its starting shape out. Lifted out of `scripts/whole-move/solve.ts` so the
 * script and the browser (`whole-move-client.ts`) build the same problem. Brief:
 * `work/square-dance-planning/briefs/solve-the-whole-move.md`.
 */

import type { CharacterBodyShape } from "../services/body-shapes";
import { armMetrics, touchHold } from "./arm-pose";
import type { PathSample } from "./baked-tracks";
import { armPoints, growRoom, reachArm, restArm, startOnPath, toFloor, WEIGHTS, type Arm, type Body, type DancerFrame, type Frame, type GrowStyle, type Move, type Target, type Vec } from "./whole-move";

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

/** 🧪 How firmly a call's ends hold the standing couple: a locked keyframe's pull (`WEIGHTS.target` × 10). */
export const HOME_WEIGHT = 10;

const ARM_KEYS = ["raise", "toward", "ulen", "pitch", "heading", "flen"] as const;

/**
 * 🧪 The floor's standing couple at one sample (step 4, 2026-10-27): the two dancers on their
 * spots, the beau's right hand in the belle's left where the floor holds them (`touchHold`:
 * the taller dancer's waist, ADR-0046; a little in front, ADR-0027), the upper arms hanging
 * back from it, and the free arms at rest. It's what the floor draws between calls, so a solve
 * that starts and ends here hands over to the floor, and to the next bake, without a pop.
 *
 * The floor tucks an inside shoulder in (ADR-0049) and places the wrist rather than the hand's
 * centre; this doesn't, so it lands within a few centimetres of the floor rather than on it.
 */
export function standingFrame(shapes: readonly [CharacterBodyShape, CharacterBodyShape], bodies: readonly [Body, Body], f: Frame): Frame {
  const hold = touchHold(armMetrics(shapes[0]), armMetrics(shapes[1]));
  const [b, g] = f;
  const dx = g.x - b.x;
  const dz = g.z - b.z;
  const l = Math.hypot(dx, dz) || 1;
  const o = toFloor([0, 0, 0], b);
  const z = toFloor([0, 0, 1], b);
  const fwd: Vec = [z[0] - o[0], 0, z[2] - o[2]];
  const at: Vec = [
    (b.x + g.x) / 2 + (dx / l) * hold.lateral + fwd[0] * hold.forward,
    hold.height,
    (b.z + g.z) / 2 + (dz / l) * hold.lateral + fwd[2] * hold.forward,
  ];
  const back: Vec = [-fwd[0], -0.5, -fwd[2]];
  // The hand centres sit a clasp apart across the hold, as the solver holds them (`WEIGHTS.clasp`).
  const half = (WEIGHTS.clasp * (bodies[0].handR + bodies[1].handR)) / 2;
  const pose = (d: DancerFrame, body: Body, heldSide: 0 | 1, toward: number): DancerFrame => {
    const hand: Vec = [at[0] + (toward * half * dx) / l, at[1], at[2] + (toward * half * dz) / l];
    const arms = [0, 1].map((side) =>
      side === heldSide ? reachArm(body, heldSide, d, hand, back) : restArm(body),
    ) as [Arm, Arm] /* cast: two dancers or two arms, mapped from a pair (ADR-0071) */;
    return { x: d.x, z: d.z, yaw: d.yaw, arms };
  };
  return [pose(b, bodies[0], 1, -1), pose(g, bodies[1], 0, 1)];
}

/** {@link standingFrame} as pulls on every arm dial at the first and last samples. */
export function standingTargets(shapes: readonly [CharacterBodyShape, CharacterBodyShape], bodies: readonly [Body, Body], path: readonly Frame[]): Target[] {
  const out: Target[] = [];
  const n = path.length;
  for (const i of n > 1 ? [0, n - 1] : [0]) {
    const f = path[i];
    if (f === undefined) continue;
    standingFrame(shapes, bodies, f).forEach((d, dancer) => {
      d.arms.forEach((a, side) => {
        for (const key of ARM_KEYS) out.push({ i, dancer: dancer as 0 | 1 /* cast: the index runs over a pair, so it is 0 or 1 (ADR-0071) */, side: side as 0 | 1 /* cast: the index runs over a pair, so it is 0 or 1 (ADR-0071) */, key, value: a[key], weight: HOME_WEIGHT });
      });
    });
  }
  return out;
}

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
/**
 * Two floor paths (cm, rig yaw in degrees) as solver frames (m, radians), arms at rest. Facing is
 * unwrapped so the path doesn't jump ±360° between samples.
 */
export function pathFrames(P: Pick<TwirlPaths, "beau" | "belle">, bodies: readonly [Body, Body]): Frame[] {
  const path: Frame[] = P.beau.map((b, i) => {
    const g = P.belle[i] ?? b;
    return [
      { x: b.x / 100, z: b.z / 100, yaw: b.facing * D2R, arms: [restArm(bodies[0]), restArm(bodies[0])] },
      { x: g.x / 100, z: g.z / 100, yaw: g.facing * D2R, arms: [restArm(bodies[1]), restArm(bodies[1])] },
    ];
  });
  for (const k of [0, 1] as const) for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]?.[k].yaw ?? 0;
    const cur = path[i]?.[k];
    if (cur === undefined) continue;
    while (cur.yaw - prev > Math.PI) cur.yaw -= 2 * Math.PI;
    while (cur.yaw - prev < -Math.PI) cur.yaw += 2 * Math.PI;
  }
  return path;
}

/**
 * 🧪 Per sample, the held hands' clearance over the belle's crown (`Move.over`): `clear` where she
 * is between a quarter and three quarters of the way through the turn she makes under the arch
 * (her path's facing, 0 to 3.5 of 4 beats), and nothing elsewhere.
 */
export function overHead(path: readonly Frame[], clear: number): (number | undefined)[] {
  const n = path.length;
  const end = Math.round((3.5 / 4) * (n - 1));
  const y0 = path[0]?.[1].yaw ?? 0;
  const turn = (path[end]?.[1].yaw ?? y0) - y0;
  return path.map((f, i) => {
    if (i > end || Math.abs(turn) < 1e-6) return undefined;
    const u = (f[1].yaw - y0) / turn;
    return u >= 0.25 && u <= 0.75 ? clear : undefined;
  });
}

export function twirlMove(
  P: TwirlPaths,
  bodies: [Body, Body],
  targets: readonly Target[] = [],
  grow: GrowStyle = "none",
  accommodation: "reshape" | "break" = "reshape",
  home?: readonly [CharacterBodyShape, CharacterBodyShape],
): { move: Move; path: Frame[]; start: Frame[] } {
  const broken = accommodation === "break";
  const path = pathFrames(P, bodies);

  // The beau's right holds the belle's left for the whole call: the arch span, then the ordinary
  // handhold it releases into (square-one ADR-0026; the arch is 0–3.5 of 4 beats). The arch's
  // plane: through the couple's midpoint at the start, along their facing (normal: the line
  // between their spots).
  const f0 = path[0];
  if (f0 === undefined) throw new Error("twirlMove: no samples");
  const dx = f0[1].x - f0[0].x;
  const dz = f0[1].z - f0[0].z;
  const l = Math.hypot(dx, dz) || 1;
  const plane = { p: [(f0[0].x + f0[1].x) / 2, 0, (f0[0].z + f0[1].z) / 2] satisfies Vec, n: [dx / l, 0, dz / l] satisfies Vec };
  const move: Move = {
    bodies,
    frames: path,
    holds: broken
      ? [{ from: 0, to: 1, beau: 1, belle: 0, weight: BREAK_HOLD }]
      : [
          { from: 0, to: 3.5 / 4, beau: 1, belle: 0, plane },
          { from: 3.5 / 4 + 1e-6, to: 1, beau: 1, belle: 0 },
        ],
  };
  const ends = home === undefined ? [] : standingTargets(home, bodies, path);
  if (targets.length + ends.length > 0) move.targets = [...targets, ...ends];
  if (home !== undefined) move.home = true;
  if (!broken) Object.assign(move, growRoom(grow, bodies));
  if (broken) return { move, path, start: path };
  // 🧪 The hands go over her head (Ryan, 10-29): through the middle half of her turn under the
  // arch, the held hands stay a hand's width and 3 cm over her crown. Without it the solve found
  // it cheaper to take player ×2's arch past her face, level with her crown and then beside it.
  move.over = overHead(path, bodies[1].handR + 0.03);

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
