/**
 * 🧪 A small model of the solved twirl (2026-10-26, step 3): two bodies in, all of `solve`'s
 * variables out (41 samples × `PER`), in microseconds, as a starting point a short polish makes
 * clean. The solver is the teacher (`scripts/whole-move/dataset.ts` makes the examples) and the
 * polisher. Brief: `work/square-dance-planning/briefs/north-star-caller-practice.md`, proof 1.
 *
 * The first model is the plainest that might do: ridge regression from a few body measurements
 * and the engine's spacing to every variable. Prediction is one small matrix multiply.
 */

import { PER, type Body } from "./whole-move";
import type { PathSample } from "./baked-tracks";

/** What the model sees of a couple: each body's solver geometry, and how far apart the engine puts them. */
export function features(bodies: readonly [Body, Body], paths: { beau: readonly PathSample[]; belle: readonly PathSample[] }): number[] {
  const one = (b: Body) => [
    b.shoulder[0][0], b.shoulder[0][1], b.shoulder[0][2],
    b.head.c[0], b.head.c[1], b.head.c[2], b.head.r,
    b.torso.a[1], b.torso.b[1], b.torso.r,
    b.upper0, b.fore0, b.forearm, b.forearmR, b.handR,
  ];
  const apart = (i: number) => {
    const p = paths.beau[i];
    const q = paths.belle[i];
    return p === undefined || q === undefined ? 0 : Math.hypot(p.x - q.x, p.z - q.z) / 100;
  };
  const mid = Math.floor(paths.beau.length / 2);
  return [...one(bodies[0]), ...one(bodies[1]), apart(0), apart(mid)];
}

/** Which of a sample's `PER` variables are angles (wrapped by 2π): each arm's raise, toward, pitch, heading. */
const isAngle = (k: number) => k < 24 && [0, 1, 3, 4].includes(k % 6);

/**
 * Shift each angle's whole trajectory by whole turns to sit nearest `ref`'s, so one couple's
 * heading of 179° and another's of −181° are the same answer to the model.
 */
export function unwrapLike(v: ArrayLike<number>, ref: ArrayLike<number>, n: number): Float64Array {
  const out = Float64Array.from(v as ArrayLike<number>);
  for (let k = 0; k < PER; k++) {
    if (!isAngle(k)) continue;
    let d = 0;
    for (let i = 0; i < n; i++) d += (ref[i * PER + k] ?? 0) - (out[i * PER + k] ?? 0);
    const turns = Math.round(d / n / (2 * Math.PI));
    if (turns !== 0) for (let i = 0; i < n; i++) out[i * PER + k] = (out[i * PER + k] ?? 0) + turns * 2 * Math.PI;
  }
  return out;
}

export interface RidgeModel {
  kind: "ridge";
  /** Feature standardisation. */
  mean: number[];
  std: number[];
  /** (features + 1) × outputs, row-major; the last row is the intercept. */
  w: number[];
  outputs: number;
}

/** Solve A x = b in place (Gaussian elimination, partial pivoting); A is n × n, b is n × m. */
function solveLinear(A: Float64Array, B: Float64Array, n: number, m: number): void {
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r * n + c]!) > Math.abs(A[p * n + c]!)) p = r;
    if (p !== c) {
      for (let k = 0; k < n; k++) { const t = A[c * n + k]!; A[c * n + k] = A[p * n + k]!; A[p * n + k] = t; }
      for (let k = 0; k < m; k++) { const t = B[c * m + k]!; B[c * m + k] = B[p * m + k]!; B[p * m + k] = t; }
    }
    const piv = A[c * n + c]!;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r * n + c]! / piv;
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r * n + k] = A[r * n + k]! - f * A[c * n + k]!;
      for (let k = 0; k < m; k++) B[r * m + k] = B[r * m + k]! - f * B[c * m + k]!;
    }
  }
  for (let r = 0; r < n; r++) {
    const piv = A[r * n + r]!;
    for (let k = 0; k < m; k++) B[r * m + k] = B[r * m + k]! / piv;
  }
}

/** Ridge regression of `ys` on standardised `xs` (the intercept isn't shrunk). */
export function fitRidge(xs: readonly number[][], ys: readonly ArrayLike<number>[], lambda: number): RidgeModel {
  const n = xs.length;
  const f = xs[0]?.length ?? 0;
  const o = ys[0]?.length ?? 0;
  const mean = Array.from({ length: f }, (_, j) => xs.reduce((s, x) => s + (x[j] ?? 0), 0) / n);
  const std = Array.from({ length: f }, (_, j) => Math.sqrt(xs.reduce((s, x) => s + ((x[j] ?? 0) - (mean[j] ?? 0)) ** 2, 0) / n) || 1);
  const F = f + 1;
  const z = xs.map((x) => [...x.map((v, j) => (v - (mean[j] ?? 0)) / (std[j] ?? 1)), 1]);
  const A = new Float64Array(F * F);
  const B = new Float64Array(F * o);
  for (let s = 0; s < n; s++) {
    const zs = z[s]!;
    const y = ys[s]!;
    for (let a = 0; a < F; a++) {
      const za = zs[a]!;
      for (let b = 0; b < F; b++) A[a * F + b] = A[a * F + b]! + za * zs[b]!;
      for (let k = 0; k < o; k++) B[a * o + k] = B[a * o + k]! + za * (y[k] ?? 0);
    }
  }
  for (let a = 0; a < f; a++) A[a * F + a] = A[a * F + a]! + lambda;
  solveLinear(A, B, F, o);
  return { kind: "ridge", mean, std, w: Array.from(B), outputs: o };
}

export function predictRidge(m: RidgeModel, x: readonly number[]): Float64Array {
  const F = m.mean.length + 1;
  const out = new Float64Array(m.outputs);
  for (let a = 0; a < F; a++) {
    const z = a === F - 1 ? 1 : ((x[a] ?? 0) - (m.mean[a] ?? 0)) / (m.std[a] ?? 1);
    if (z === 0) continue;
    const row = a * m.outputs;
    for (let k = 0; k < m.outputs; k++) out[k] = out[k]! + z * m.w[row + k]!;
  }
  return out;
}
