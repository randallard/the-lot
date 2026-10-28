/**
 * 🧪 **Calls chain** (2026-10-27, step 4): each danced call's bake, re-solved for a short window
 * at each of its ends so it joins what the floor draws either side.
 *
 * A bake is solved for one call on its own, so its ends are wherever that solve left the arms: it
 * started with the arch already up and ended mid-gesture. square-one's ADR-0026 (Ryan, 09-12)
 * says what a chain does at a boundary: *"hands don't always go down in the middle of a
 * sequence … the sequence continuing and the hands position blending into the next move rather
 * than going to the waiting position"*. So:
 *
 * - **Two bakes in a row** (a twirl after a twirl): the last beat of one and the first beat of
 *   the next are re-solved as one window, hands held across the join, so the arch flows on.
 * - **The sequence's start and end**, and a boundary with a call that has no bake: the couple
 *   is waiting, or the floor is posing them, and the floor's pose there is the standing couple
 *   (`standingFrame`: the hold at the taller dancer's waist). The window runs from that pose
 *   into the bake, or out of it. Ryan, 10-27: *"during the chain they don't go all the way to
 *   hand hold between moves but if there's a beat or more after the next call should be called
 *   then they go to handhold"*.
 *
 * A window is the 10-26-4 polish: started from the bakes eased onto the join, with its outer samples frozen
 * so it meets the untouched part of each bake exactly. Pure: no three.js.
 */

import type { CharacterBodyShape } from "../services/body-shapes";
import { stepToCouple, stepToDancer, type BakedKeyframe, type BakedTrack, type PathSample } from "./baked-tracks";
import { bodyOf, growRoom, PER, restArm, solve, WEIGHTS, fromDials, toDials, type Body, type Frame, type Hold, type Move } from "./whole-move";
import { BREAK_HOLD, standingFrame } from "./whole-move-twirl";

const D2R = Math.PI / 180;

/** One danced call: its bake (if any) and the engine's paths it was solved on (`couplePaths`). */
export interface ChainCall {
  readonly bake: BakedTrack | undefined;
  readonly paths: { readonly beau: readonly PathSample[]; readonly belle: readonly PathSample[] } | undefined;
}

export interface JoinOptions {
  /** Samples re-solved on each side of a boundary (a bake has 10 a beat). Default 10. */
  readonly window?: number;
  /** The polish's length. Default 1000: at 300 the hands came down into the standing hold 4.8 cm apart (ryan → ryan), at 1000 1.2 cm, about 80 ms a window. */
  readonly iterations?: number;
}

/** A call's path as solver frames (arms at rest), facing unwrapped. */
function pathFrames(p: NonNullable<ChainCall["paths"]>, bodies: readonly [Body, Body]): Frame[] {
  const out: Frame[] = p.beau.map((b, i) => {
    const g = p.belle[i] ?? b;
    return [
      { x: b.x / 100, z: b.z / 100, yaw: b.facing * D2R, arms: [restArm(bodies[0]), restArm(bodies[0])] },
      { x: g.x / 100, z: g.z / 100, yaw: g.facing * D2R, arms: [restArm(bodies[1]), restArm(bodies[1])] },
    ];
  });
  for (const k of [0, 1] as const) for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1]![k].yaw;
    const cur = out[i]![k];
    while (cur.yaw - prev > Math.PI) cur.yaw -= 2 * Math.PI;
    while (cur.yaw - prev < -Math.PI) cur.yaw += 2 * Math.PI;
  }
  return out;
}

/** Turn and move `f` so its sample `from` lands on `onto`'s beau: a later call into an earlier one's floor. */
function placeOnto(f: readonly Frame[], from: Frame, onto: Frame): Frame[] {
  const phi = onto[0].yaw - from[0].yaw;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return f.map((fr) => fr.map((d) => {
    const x = d.x - from[0].x;
    const z = d.z - from[0].z;
    return { ...d, x: x * c + z * s + onto[0].x, z: -x * s + z * c + onto[0].z, yaw: d.yaw + phi, arms: [...d.arms] };
  }) as Frame);
}

/** The solver's variables for one sample of a bake, against the path frame it was solved on. */
function packValues(values: Readonly<Record<string, number>>, base: Frame, bodies: readonly [Body, Body], out: Float64Array, i: number): void {
  let k = i * PER;
  for (const d of [0, 1] as const) {
    const f = fromDials(values, d, bodies[d]);
    for (const a of f.arms) {
      out[k++] = a.raise;
      out[k++] = a.toward;
      out[k++] = a.ulen;
      out[k++] = a.pitch;
      out[k++] = a.heading;
      out[k++] = a.flen;
    }
  }
  // The beau's step: his own-frame offset (cm) → the floor → out from her, and sideways.
  const [sx, sz] = stepToCouple(values["0.offset.x"] ?? 0, values["0.offset.z"] ?? 0, base[0].yaw);
  const ux = base[0].x - base[1].x;
  const uz = base[0].z - base[1].z;
  const ul = Math.hypot(ux, uz) || 1;
  out[k++] = ((sx * ux + sz * uz) / ul) / 100;
  out[k++] = ((-sx * uz + sz * ux) / ul) / 100;
  out[k++] = (values["0.torso.grow"] ?? 0) / 100;
  out[k++] = (values["1.torso.grow"] ?? 0) / 100;
}

/** The standing couple's variables on `base`: on their spots, as built. */
function packStanding(shapes: readonly [CharacterBodyShape, CharacterBodyShape], bodies: readonly [Body, Body], base: Frame, out: Float64Array, i: number): void {
  let k = i * PER;
  for (const d of standingFrame(shapes, bodies, base)) for (const a of d.arms) {
    out[k++] = a.raise;
    out[k++] = a.toward;
    out[k++] = a.ulen;
    out[k++] = a.pitch;
    out[k++] = a.heading;
    out[k++] = a.flen;
  }
  for (let j = 0; j < 4; j++) out[k++] = 0;
}

const ARM_DIAL = /^[01]\.(upper-arm|forearm)-(left|right)\./;

/** Write a re-solved sample back over a bake's keyframe values, keeping everything it didn't solve. */
function unpackValues(v: Float64Array, i: number, base: Frame, original: Readonly<Record<string, number>>): Record<string, number> {
  const values: Record<string, number> = { ...original };
  let k = i * PER;
  const arm = () => {
    const a = { raise: v[k]!, toward: v[k + 1]!, ulen: v[k + 2]!, pitch: v[k + 3]!, heading: v[k + 4]!, flen: v[k + 5]! };
    k += 6;
    return a;
  };
  for (const d of [0, 1] as const) {
    const arms = [arm(), arm()] as Frame[0]["arms"];
    for (const [key, x] of Object.entries(toDials({ ...base[d], arms }, d))) if (ARM_DIAL.test(key)) values[key] = x;
  }
  const out = v[k]!;
  const side = v[k + 1]!;
  const ux = base[0].x - base[1].x;
  const uz = base[0].z - base[1].z;
  const ul = Math.hypot(ux, uz) || 1;
  const [lx, lz] = stepToDancer(((ux * out - uz * side) / ul) * 100, ((uz * out + ux * side) / ul) * 100, base[0].yaw);
  values["0.offset.x"] = Math.round(lx * 10) / 10;
  values["0.offset.z"] = Math.round(lz * 10) / 10;
  for (const d of [0, 1] as const) {
    const g = Math.round(v[k + 2 + d]! * 1000) / 10;
    const key = `${String(d)}.torso.grow`;
    if (g !== 0 || key in values) values[key] = g;
  }
  return values;
}

/** The angles that go round (`toward`, `heading`) of each arm, as offsets within a sample. */
const ROUND = [1, 4, 7, 10, 13, 16, 19, 22] as const;
const wrapTo = (x: number, near: number) => x - 2 * Math.PI * Math.round((x - near) / (2 * Math.PI));

/**
 * Unwrap a window's angles that go round, sample to sample, starting from `from`: a standing pose
 * and a bake can name nearly the same heading 360° apart, and smoothness would pay for the turn.
 */
function unwrap(v: Float64Array, n: number, from: number): void {
  for (let i = from + 1; i < n; i++) for (const k of ROUND) v[i * PER + k] = wrapTo(v[i * PER + k]!, v[(i - 1) * PER + k]!);
  for (let i = from - 1; i >= 0; i--) for (const k of ROUND) v[i * PER + k] = wrapTo(v[i * PER + k]!, v[(i + 1) * PER + k]!);
}

const ease = (x: number) => x * x * (3 - 2 * x);

/** A run of a bake's samples as solver variables, angles unwrapped along it. */
function packAll(values: readonly Readonly<Record<string, number>>[], frames: readonly Frame[], bodies: readonly [Body, Body]): Float64Array {
  const v = new Float64Array(values.length * PER);
  values.forEach((x, j) => packValues(x, frames[j]!, bodies, v, j));
  unwrap(v, values.length, 0);
  return v;
}

/**
 * The bake shifted so sample `at` is `onto`, the shift scaled by `share(j)` at sample `j` (1 at
 * `at`, fading to 0 at the far end). Moving the whole run, not just the end, keeps the bake's own
 * motion through the window; a polish this short can adjust a move but not make one.
 */
function eased(bake: Float64Array, n: number, onto: Float64Array, at: number, share: (j: number) => number): Float64Array {
  const v = Float64Array.from(bake);
  for (let k = 0; k < PER; k++) {
    let d = onto[k]! - bake[at * PER + k]!;
    if ((ROUND as readonly number[]).includes(k)) d = wrapTo(d, 0);
    for (let j = 0; j < n; j++) v[j * PER + k] = bake[j * PER + k]! + d * share(j);
  }
  return v;
}

/** How hard a bake's hands hold: a break only reaches (`BREAK_HOLD`). */
const holdWeight = (b: BakedTrack) => (b.sizing?.accommodation === "break" ? BREAK_HOLD : 1);

/** One window: `frames` (floor), `v` started from the bakes, the holds, and who may grow. */
function polish(
  frames: Frame[], v: Float64Array, holds: Hold[], bodies: [Body, Body], grow: BakedTrack["grow"], iterations: number,
): Float64Array {
  const move: Move = { bodies, frames, holds, ...(grow === undefined ? {} : growRoom(grow, bodies)) };
  const n = frames.length;
  return solve(move, {
    init: v,
    iterations,
    rate: 0.01,
    rateEnd: 0.001,
    weights: { ...WEIGHTS, margin: 0.06 },
    frozen: [0, n - 1],
  }).v;
}

/**
 * Each call's bake, its ends re-solved to join its neighbours ({@link ChainCall}s in the order
 * danced). A call with no bake comes back `undefined`, as it went in.
 */
export function joinChain(
  calls: readonly ChainCall[],
  shapes: readonly [CharacterBodyShape, CharacterBodyShape],
  o: JoinOptions = {},
): (BakedTrack | undefined)[] {
  const K = o.window ?? 10;
  const iters = o.iterations ?? 1000;
  const bodies: [Body, Body] = [bodyOf(shapes[0]), bodyOf(shapes[1])];
  // Working copies of each bake's keyframe values, and its path frames.
  const work = calls.map((c) => {
    if (c.bake === undefined || c.paths === undefined) return undefined;
    const path = pathFrames(c.paths, bodies);
    if (path.length !== c.bake.keyframes.length || path.length <= 2 * K) return undefined;
    return { bake: c.bake, path, values: c.bake.keyframes.map((k) => ({ ...k.values })) };
  });

  work.forEach((w, i) => {
    if (w === undefined) return;
    const n = w.path.length;
    const weight = holdWeight(w.bake);
    const hold: Hold[] = [{ from: 0, to: 1, beau: 1, belle: 0, weight }];
    // Its start: waiting, or after a call the floor posed. The bake eased onto the standing couple.
    if (i === 0 || work[i - 1] === undefined) {
      const frames = w.path.slice(0, K + 1);
      const bake = packAll(w.values.slice(0, K + 1), frames, bodies);
      const stand = new Float64Array(PER);
      packStanding(shapes, bodies, frames[0]!, stand, 0);
      const v = eased(bake, K + 1, stand, 0, (j) => 1 - ease(j / K));
      const r = polish(frames, v, hold, bodies, w.bake.grow, iters);
      for (let j = 0; j < K; j++) w.values[j] = unpackValues(r, j, frames[j]!, w.values[j]!);
    }
    // Its end: the dance ends waiting (ADR-0026's release), or a call the floor poses follows.
    const next = work[i + 1];
    if (next === undefined) {
      const frames = w.path.slice(n - 1 - K);
      const bake = packAll(w.values.slice(n - 1 - K), frames, bodies);
      const stand = new Float64Array(PER);
      packStanding(shapes, bodies, frames[K]!, stand, 0);
      const v = eased(bake, K + 1, stand, K, (j) => ease(j / K));
      const r = polish(frames, v, hold, bodies, w.bake.grow, iters);
      for (let j = 1; j <= K; j++) w.values[n - 1 - K + j] = unpackValues(r, j, frames[j]!, w.values[n - 1 - K + j]!);
      return;
    }
    // Into the next bake: one window over the join, hands held across it (ADR-0026's merge). Each
    // side eased onto the pose halfway between where the two bakes have the join.
    const tail = w.path.slice(n - 1 - K);
    const head = placeOnto(next.path, next.path[0]!, w.path[n - 1]!).slice(0, K + 1);
    const a = packAll(w.values.slice(n - 1 - K), tail, bodies);
    const b = packAll(next.values.slice(0, K + 1), next.path.slice(0, K + 1), bodies);
    const mid = new Float64Array(PER);
    for (let k = 0; k < PER; k++) {
      const x = a[K * PER + k]!;
      const y = (ROUND as readonly number[]).includes(k) ? wrapTo(b[k]!, x) : b[k]!;
      mid[k] = (x + y) / 2;
    }
    const va = eased(a, K + 1, mid, K, (j) => ease(j / K));
    const vb = eased(b, K + 1, mid, 0, (j) => 1 - ease(j / K));
    const frames = [...tail, ...head.slice(1)];
    const v = new Float64Array(frames.length * PER);
    v.set(va, 0);
    v.set(vb.subarray(PER), (K + 1) * PER);
    unwrap(v, frames.length, 0);
    const seam = K / (frames.length - 1);
    const holds: Hold[] = [
      { from: 0, to: seam, beau: 1, belle: 0, weight },
      { from: seam + 1e-6, to: 1, beau: 1, belle: 0, weight: holdWeight(next.bake) },
    ];
    const r = polish(frames, v, holds, bodies, w.bake.grow ?? next.bake.grow, iters);
    for (let j = 1; j <= K; j++) w.values[n - 1 - K + j] = unpackValues(r, j, tail[j]!, w.values[n - 1 - K + j]!);
    // The join itself and after it, in the next call's own frame: the same pose, so the hand-over is exact.
    for (let j = 0; j < K; j++) next.values[j] = unpackValues(r, K + j, next.path[j]!, next.values[j]!);
  });

  return calls.map((c, i) => {
    const w = work[i];
    if (w === undefined) return c.bake;
    const keyframes: BakedKeyframe[] = w.bake.keyframes.map((k, j) => ({ ...k, values: w.values[j]! }));
    return { ...w.bake, keyframes };
  });
}
