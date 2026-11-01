/**
 * 🧪 **The whole-move solve for any number of dancers** (2026-10-27, step 5: a 4-dancer call).
 *
 * `whole-move.ts` solves a couple: two dancers, holds named beau and belle, and only the beau may
 * step off his path. A call for four (Right and Left Thru, a star) has holds between any two
 * dancers, and hands that change partners mid-call. This is the same objective over N dancers:
 *
 * - **No clipping** between every two dancers, and each arm against its own head and torso
 *   (`ownMargin`). Hands stay above the floor.
 * - **Holds** join any hand to any other dancer's hand, or a hand to a dancer's back (the gent's
 *   right hand in a courtesy turn), over a stretch of the move. Held arms, upper arm on upper arm,
 *   keep only `HELD_MARGIN`, as in the couple solve.
 * - **Smooth and natural**: the same stretch, rest, gravity and range terms, the same smoothness.
 * - **Every dancer may step** off their path (floor x and z), at `WEIGHTS.step` per m².
 *
 * Height growing, keyframe targets, arch planes and lifts are left out: nothing for four uses
 * them yet. The forward model and the exact gradient are `whole-move.ts`'s, restated per dancer.
 * When this settles, the couple solve could become its N = 2 case. Pure: no three.js.
 */

import {
  armPoints, HELD_MARGIN, ownMargin, reachArm, restArm, shapesOf, toFloor, WEIGHTS,
  type Arm, type Body, type DancerFrame, type Vec, type Weights,
} from "./whole-move";

/** One hand: whose, and which (0 left, 1 right). */
export interface HandRef {
  readonly dancer: number;
  readonly side: 0 | 1;
}

/** The small of a dancer's back, for a hand to rest on (the courtesy turn's). */
export interface BackRef {
  readonly dancer: number;
  readonly back: true;
}

/** A held hand over a stretch of the move (fractions 0–1): on another dancer's hand, or their back. */
export interface NHold {
  readonly from: number;
  readonly to: number;
  readonly a: HandRef;
  /** The other hand, or `back`: the small of `dancer`'s back. */
  readonly b: HandRef | BackRef;
  /** Scales `WEIGHTS.hold` (default 1). */
  readonly weight?: number;
  /**
   * How long the hold takes to come on and to let go, as a fraction of the move (default 0.03, a
   * quarter beat of an 8-beat call): the weight rises and falls smoothly over it. At full weight
   * from its first sample the arm snapped onto the hold (10-27: 67° in one sample).
   */
  readonly ease?: number;
  /**
   * How high the clasped hands are held (m above the floor), if it matters: a pull-by's hands
   * are joined in front at chest height. Without it the solve met two hanging hands at the hip
   * as the dancers passed close (10-28).
   */
  readonly height?: number;
  /**
   * Where across and along the clasp sits, if it matters (hand to hand only): halfway between the
   * two dancers' shoulders on the floor, and this far (m) in front along their mean facing, as
   * `touchHold` places a couple's ordinary handhold. Without it the solve ended Right and Left Thru
   * with the clasp on the gent's side and her arm across his forearm (10-28).
   */
  readonly forward?: number;
}

export interface NMove {
  readonly bodies: readonly Body[];
  /** Each sample: every dancer where their path puts them (arms used as the start). */
  readonly frames: readonly (readonly DancerFrame[])[];
  readonly holds: readonly NHold[];
}

const ARM_KEYS = ["raise", "toward", "ulen", "pitch", "heading", "flen"] as const;
/** Per dancer, per sample: 2 arms × 6, then the step off the path (floor x, z). */
export const PER_DANCER = 14;
/** Lengths and steps are metres; weigh their smoothness as if a metre were this many radians. */
const METRE = 3;
const isMetric = (k: number) => k >= 12 || k % 6 === 2 || k % 6 === 5;
const sign = (side: 0 | 1) => (side === 0 ? 1 : -1);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
// `whole-move.ts`'s checked reads, restated here rather than imported: an imported call in a hot
// loop goes through the module namespace under vite-node, which the bakes run on (10-31 (8)).
const rd = (a: Float64Array, i: number): number => {
  const x = a[i];
  if (x === undefined) throw new RangeError(`whole-move-n: index ${String(i)} outside ${String(a.length)}`);
  return x;
};
const nth = <T>(a: readonly T[], i: number): T => {
  const x = a[i];
  if (x === undefined) throw new RangeError(`whole-move-n: index ${String(i)} outside ${String(a.length)}`);
  return x;
};
const isBack = (b: NHold["b"]): b is BackRef => "back" in b;

/**
 * Where a hand on someone's back goes, in their rig's frame: behind the torso's axis, a little
 * above half its height (the small of the back), on its surface.
 */
export function backPoint(b: Body): Vec {
  const y = b.torso.a[1] + 0.55 * (b.torso.b[1] - b.torso.a[1]);
  return [b.torso.a[0], y, b.torso.a[2] - b.torso.r];
}

// ── Packing ──────────────────────────────────────────────────────────────────────────────────

export function packN(frames: readonly (readonly DancerFrame[])[]): Float64Array {
  const nd = frames[0]?.length ?? 0;
  const v = new Float64Array(frames.length * nd * PER_DANCER);
  frames.forEach((f, i) => f.forEach((d, j) => {
    let k = (i * nd + j) * PER_DANCER;
    for (const a of d.arms) for (const key of ARM_KEYS) v[k++] = a[key];
  }));
  return v;
}

/** Sample `i` of `v`, on the path frame `base`: arms set, and each dancer moved by their step. */
export function unpackN(v: Float64Array, i: number, base: readonly DancerFrame[]): DancerFrame[] {
  const nd = base.length;
  return base.map((d, j) => {
    let k = (i * nd + j) * PER_DANCER;
    const arm = (): Arm => {
      const a = {} as Arm /* cast: every `ARM_KEYS` field is set on the next line (ADR-0071) */;
      for (const key of ARM_KEYS) a[key] = v[k++] ?? 0;
      return a;
    };
    const arms: [Arm, Arm] = [arm(), arm()];
    return { ...d, x: d.x + (v[k] ?? 0), z: d.z + (v[k + 1] ?? 0), arms };
  });
}

// ── The plan per sample ──────────────────────────────────────────────────────────────────────

interface Plan {
  holds: NHold[];
  /** Per pair (d < e, index `d·nd + e`): shape × shape, 1 may touch, 2 keeps only HELD_MARGIN. */
  exempt: Map<number, Uint8Array>;
  /** dancer · 2 + side: that arm is held. */
  heldArm: boolean[];
}

const HAND = (side: 0 | 1) => 4 + 3 * side;
/** A handhold's hanging upper arms, against the hold itself (`NHold.forward`). */
const HANG = 0.1;

function planN(m: NMove): Plan[] {
  const n = m.frames.length;
  const nd = m.bodies.length;
  return m.frames.map((_, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const holds = m.holds
      .filter((h) => t >= h.from - 1e-9 && t <= h.to + 1e-9)
      .map((h) => {
        const e = h.ease ?? 0.03;
        const x = e <= 0 ? 1 : Math.min(1, (t - h.from) / e, (h.to - t) / e);
        const k = x >= 1 ? 1 : x * x * (3 - 2 * x);
        return k >= 1 ? h : { ...h, weight: (h.weight ?? 1) * k };
      });
    const exempt = new Map<number, Uint8Array>();
    const mark = (d: number, sd: number, e: number, se: number, x: 1 | 2) => {
      const [p, sp, q, sq] = d < e ? [d, sd, e, se] : [e, se, d, sd];
      const key = p * nd + q;
      let mat = exempt.get(key);
      if (mat === undefined) exempt.set(key, (mat = new Uint8Array(64)));
      if (x === 1 || mat[sp * 8 + sq] === 0) mat[sp * 8 + sq] = x;
    };
    const heldArm = new Array<boolean>(nd * 2).fill(false);
    for (const h of holds) {
      heldArm[h.a.dancer * 2 + h.a.side] = true;
      const ha = HAND(h.a.side);
      if (isBack(h.b)) {
        // The hand and the wrist behind it rest on the torso.
        mark(h.a.dancer, ha, h.b.dancer, 0, 1);
        mark(h.a.dancer, ha - 1, h.b.dancer, 0, 1);
        continue;
      }
      heldArm[h.b.dancer * 2 + h.b.side] = true;
      const hb = HAND(h.b.side);
      const [d, e] = [h.a.dancer, h.b.dancer];
      mark(d, ha, e, hb, 1);
      mark(d, ha, e, hb - 1, 1);
      mark(d, ha - 1, e, hb, 1);
      mark(d, ha - 1, e, hb - 1, 1);
      mark(d, ha - 2, e, hb - 2, 2);
      mark(d, ha - 2, e, hb - 1, 2);
      mark(d, ha - 1, e, hb - 2, 2);
    }
    return { holds, exempt, heldArm };
  });
}

// ── The cost of one sample, and its exact gradient ───────────────────────────────────────────
//
// As `frameCostGrad` in `whole-move.ts`: every point in the floor frame, each term's gradient on
// the points, then back through the rig's turn and each arm's Jacobian to the dials, and the sum
// over a dancer's points to their step. Per dancer, points: 0 torso foot, 1 torso top, 2 head,
// 3 + 4·side + (shoulder, elbow, wrist, hand), 11 the small of the back.

const NPT = 12;
const SHAPE_PTS = [0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10] as const;

let segS = 0;
let segT = 0;
const SEG_N = new Float64Array(3);

function segSegAt(P: Float64Array, p1: number, q1: number, p2: number, q2: number): number {
  const d1x = rd(P, q1) - rd(P, p1), d1y = rd(P, q1 + 1) - rd(P, p1 + 1), d1z = rd(P, q1 + 2) - rd(P, p1 + 2);
  const d2x = rd(P, q2) - rd(P, p2), d2y = rd(P, q2 + 1) - rd(P, p2 + 1), d2z = rd(P, q2 + 2) - rd(P, p2 + 2);
  const rx = rd(P, p1) - rd(P, p2), ry = rd(P, p1 + 1) - rd(P, p2 + 1), rz = rd(P, p1 + 2) - rd(P, p2 + 2);
  const a = d1x * d1x + d1y * d1y + d1z * d1z;
  const e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;
  let s = 0;
  let t = 0;
  if (a <= 1e-12 && e <= 1e-12) {
    // Two points.
  } else if (a <= 1e-12) {
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-12) {
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const den = a * e - b * b;
      s = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const x = rx + d1x * s - d2x * t;
  const y = ry + d1y * s - d2y * t;
  const z = rz + d1z * s - d2z * t;
  const d = Math.sqrt(x * x + y * y + z * z);
  segS = s;
  segT = t;
  const inv = d > 1e-12 ? 1 / d : 0;
  SEG_N[0] = x * inv;
  SEG_N[1] = y * inv;
  SEG_N[2] = z * inv;
  return d;
}

/** Scratch space, grown to the number of dancers. */
let PTS = new Float64Array(0);
let GPT = new Float64Array(0);
let JAC = new Float64Array(0);
let RAD = new Float64Array(0);

function scratch(nd: number): void {
  if (PTS.length >= nd * NPT * 3) return;
  PTS = new Float64Array(nd * NPT * 3);
  GPT = new Float64Array(nd * NPT * 3);
  JAC = new Float64Array(nd * 2 * 18);
  RAD = new Float64Array(nd * 8);
}

const addPt = (p: number, k: number, x: number, y: number, z: number) => {
  GPT[p] = rd(GPT, p) + k * x;
  GPT[p + 1] = rd(GPT, p + 1) + k * y;
  GPT[p + 2] = rd(GPT, p + 2) + k * z;
};

/** Sample `i`'s cost, its gradient added into `grad` (when given). */
function frameCostN(m: NMove, plan: Plan, i: number, v: Float64Array, w: Weights, grad?: Float64Array): number {
  const nd = m.bodies.length;
  const base = nth(m.frames, i);
  scratch(nd);
  GPT.fill(0);
  // Forward.
  for (let d = 0; d < nd; d++) {
    const b = nth(m.bodies, d);
    const f = nth(base, d);
    const o = (i * nd + d) * PER_DANCER;
    const c = Math.cos(f.yaw);
    const s = Math.sin(f.yaw);
    const tx = f.x + rd(v, o + 12);
    const tz = f.z + rd(v, o + 13);
    const put = (p: number, x: number, y: number, z: number) => {
      const j = (d * NPT + p) * 3;
      PTS[j] = x * c + z * s + tx;
      PTS[j + 1] = y;
      PTS[j + 2] = -x * s + z * c + tz;
    };
    put(0, ...b.torso.a);
    put(1, ...b.torso.b);
    put(2, ...b.head.c);
    put(11, ...backPoint(b));
    for (let sd = 0; sd < 2; sd++) {
      const k = o + sd * 6;
      const raise = rd(v, k), toward = rd(v, k + 1), ulen = rd(v, k + 2), pitch = rd(v, k + 3), heading = rd(v, k + 4), flen = rd(v, k + 5);
      const S = b.shoulder[sd as 0 | 1 /* cast: the index runs over a pair, so it is 0 or 1 (ADR-0071) */];
      const g = sign(sd as 0 | 1 /* cast: the index runs over a pair, so it is 0 or 1 (ADR-0071) */);
      const sr = Math.sin(raise), cr = Math.cos(raise), st = Math.sin(toward), ct = Math.cos(toward);
      const sp = Math.sin(pitch), cp = Math.cos(pitch), sh = Math.sin(heading), ch = Math.cos(heading);
      const ex = S[0] + g * sr * st * ulen, ey = S[1] - cr * ulen, ez = S[2] + sr * ct * ulen;
      const dx = g * cp * sh, dy = sp, dz = cp * ch;
      const wl = (b.forearm * flen) / b.fore0;
      put(3 + 4 * sd, S[0], S[1], S[2]);
      put(4 + 4 * sd, ex, ey, ez);
      put(5 + 4 * sd, ex + dx * wl, ey + dy * wl, ez + dz * wl);
      put(6 + 4 * sd, ex + dx * flen, ey + dy * flen, ez + dz * flen);
      const J = (d * 2 + sd) * 18;
      JAC[J] = g * cr * st * ulen; JAC[J + 1] = sr * ulen; JAC[J + 2] = cr * ct * ulen;
      JAC[J + 3] = g * sr * ct * ulen; JAC[J + 4] = 0; JAC[J + 5] = -sr * st * ulen;
      JAC[J + 6] = g * sr * st; JAC[J + 7] = -cr; JAC[J + 8] = sr * ct;
      JAC[J + 9] = dx; JAC[J + 10] = dy; JAC[J + 11] = dz;
      JAC[J + 12] = -g * sp * sh; JAC[J + 13] = cp; JAC[J + 14] = -sp * ch;
      JAC[J + 15] = g * cp * ch; JAC[J + 16] = 0; JAC[J + 17] = -cp * sh;
    }
    const q = d * 8;
    RAD[q] = b.torso.r; RAD[q + 1] = b.head.r;
    RAD[q + 2] = RAD[q + 3] = RAD[q + 5] = RAD[q + 6] = b.forearmR;
    RAD[q + 4] = RAD[q + 7] = b.handR;
  }

  let cost = 0;
  const pen = (da: number, sa: number, db: number, sb: number, margin: number) => {
    const p1 = (da * NPT + nth(SHAPE_PTS, sa * 2)) * 3, q1 = (da * NPT + nth(SHAPE_PTS, sa * 2 + 1)) * 3;
    const p2 = (db * NPT + nth(SHAPE_PTS, sb * 2)) * 3, q2 = (db * NPT + nth(SHAPE_PTS, sb * 2 + 1)) * 3;
    const dist = segSegAt(PTS, p1, q1, p2, q2);
    const over = rd(RAD, da * 8 + sa) + rd(RAD, db * 8 + sb) + margin - dist;
    if (over <= 0) return;
    cost += w.clip * over * over;
    const k = -2 * w.clip * over;
    const nx = rd(SEG_N, 0), ny = rd(SEG_N, 1), nz = rd(SEG_N, 2);
    addPt(p1, k * (1 - segS), nx, ny, nz);
    addPt(q1, k * segS, nx, ny, nz);
    addPt(p2, -k * (1 - segT), nx, ny, nz);
    addPt(q2, -k * segT, nx, ny, nz);
  };
  const held = Math.min(w.margin, HELD_MARGIN);
  for (let d = 0; d < nd; d++) for (let e = d + 1; e < nd; e++) {
    // Torsos too far apart for anything to touch: skip the pair (arms reach under 1.2 m a side).
    const dx = rd(PTS, d * NPT * 3) - rd(PTS, e * NPT * 3);
    const dz = rd(PTS, d * NPT * 3 + 2) - rd(PTS, e * NPT * 3 + 2);
    if (dx * dx + dz * dz > 2.6 * 2.6) continue;
    const mat = plan.exempt.get(d * nd + e);
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
      const x = mat?.[a * 8 + b] ?? 0;
      if (x !== 1) pen(d, a, e, b, x === 2 ? held : w.margin);
    }
  }
  for (let d = 0; d < nd; d++) for (let s = 2; s < 8; s++) for (const own of [0, 1] as const) pen(d, s, d, own, ownMargin(nth(m.bodies, d), s, own, w.margin));
  // Hands above the floor.
  for (let d = 0; d < nd; d++) for (let sd = 0; sd < 2; sd++) {
    const p = (d * NPT + 6 + 4 * sd) * 3;
    const under = nth(m.bodies, d).handR - rd(PTS, p + 1);
    if (under > 0) {
      cost += w.clip * under * under;
      GPT[p + 1] = rd(GPT, p + 1) - 2 * w.clip * under;
    }
  }
  // Holds.
  for (const h of plan.holds) {
    const pa = (h.a.dancer * NPT + 6 + 4 * h.a.side) * 3;
    const pb = isBack(h.b) ? (h.b.dancer * NPT + 11) * 3 : (h.b.dancer * NPT + 6 + 4 * h.b.side) * 3;
    const ra = nth(m.bodies, h.a.dancer).handR;
    const want = isBack(h.b) ? ra : w.clasp * (ra + nth(m.bodies, h.b.dancer).handR);
    const x = rd(PTS, pa) - rd(PTS, pb), y = rd(PTS, pa + 1) - rd(PTS, pb + 1), z = rd(PTS, pa + 2) - rd(PTS, pb + 2);
    const dist = Math.sqrt(x * x + y * y + z * z);
    const wh = w.hold * (h.weight ?? 1);
    cost += wh * (dist - want) * (dist - want);
    if (dist > 1e-12) {
      const k = (2 * wh * (dist - want)) / dist;
      addPt(pa, k, x, y, z);
      addPt(pb, -k, x, y, z);
    }
    if (h.forward !== undefined && !isBack(h.b)) {
      // The hands' midpoint to the shoulders' midpoint and `forward` on, on the floor.
      const sa = (h.a.dancer * NPT + 3 + 4 * h.a.side) * 3;
      const sb = (h.b.dancer * NPT + 3 + 4 * h.b.side) * 3;
      const ya = nth(base, h.a.dancer).yaw, yb = nth(base, h.b.dancer).yaw;
      const fx = (Math.sin(ya) + Math.sin(yb)) / 2, fz = (Math.cos(ya) + Math.cos(yb)) / 2;
      const ex = (rd(PTS, pa) + rd(PTS, pb) - rd(PTS, sa) - rd(PTS, sb)) / 2 - h.forward * fx;
      const ez = (rd(PTS, pa + 2) + rd(PTS, pb + 2) - rd(PTS, sa + 2) - rd(PTS, sb + 2)) / 2 - h.forward * fz;
      cost += wh * (ex * ex + ez * ez);
      addPt(pa, wh, ex, 0, ez);
      addPt(pb, wh, ex, 0, ez);
      addPt(sa, -wh, ex, 0, ez);
      addPt(sb, -wh, ex, 0, ez);
      // And each upper arm hangs, its elbow under its shoulder, as `touchHold` has it (Ryan,
      // 08-18: "as if the upper arm is relaxed and hanging straight down"). Without it her elbow,
      // still out from the courtesy turn, crossed his (10-28).
      const wk = HANG * wh;
      for (const [s, e] of [[sa, sa + 3], [sb, sb + 3]] as const) {
        const hx = rd(PTS, e) - rd(PTS, s), hz = rd(PTS, e + 2) - rd(PTS, s + 2);
        cost += wk * (hx * hx + hz * hz);
        addPt(e, 2 * wk, hx, 0, hz);
        addPt(s, -2 * wk, hx, 0, hz);
      }
    }
    if (h.height !== undefined) for (const p of isBack(h.b) ? [pa] : [pa, pb]) {
      const dy = rd(PTS, p + 1) - h.height;
      cost += wh * dy * dy;
      GPT[p + 1] = rd(GPT, p + 1) + 2 * wh * dy;
    }
  }
  // Natural, on the dials.
  for (let d = 0; d < nd; d++) {
    const b = nth(m.bodies, d);
    const o = (i * nd + d) * PER_DANCER;
    for (let sd = 0; sd < 2; sd++) {
      const k = o + sd * 6;
      const raise = rd(v, k), toward = rd(v, k + 1), ulen = rd(v, k + 2), pitch = rd(v, k + 3), heading = rd(v, k + 4), flen = rd(v, k + 5);
      const su = ulen / b.upper0 - 1;
      const sf = flen / b.fore0 - 1;
      cost += w.stretch * (su * su + sf * sf);
      if (grad) {
        grad[k + 2] = rd(grad, k + 2) + (2 * w.stretch * su) / b.upper0;
        grad[k + 5] = rd(grad, k + 5) + (2 * w.stretch * sf) / b.fore0;
      }
      if (plan.heldArm[d * 2 + sd] === true) {
        const pe = (d * NPT + 4 + 4 * sd) * 3;
        const ph = (d * NPT + 6 + 4 * sd) * 3;
        cost += w.gravity * (rd(PTS, pe + 1) + rd(PTS, ph + 1) - 2 * b.shoulder[0][1]);
        GPT[pe + 1] = rd(GPT, pe + 1) + w.gravity;
        GPT[ph + 1] = rd(GPT, ph + 1) + w.gravity;
      } else {
        const dp = pitch + Math.PI / 2;
        cost += w.rest * (raise * raise + dp * dp + 0.1 * (heading * heading + toward * toward));
        if (grad) {
          grad[k] = rd(grad, k) + 2 * w.rest * raise;
          grad[k + 1] = rd(grad, k + 1) + 0.2 * w.rest * toward;
          grad[k + 3] = rd(grad, k + 3) + 2 * w.rest * dp;
          grad[k + 4] = rd(grad, k + 4) + 0.2 * w.rest * heading;
        }
      }
      const back = -Math.sin(raise) * Math.cos(toward);
      if (back > 0.3) {
        cost += w.range * (back - 0.3) ** 2;
        if (grad) {
          const g = 2 * w.range * (back - 0.3);
          grad[k] = rd(grad, k) - g * Math.cos(raise) * Math.cos(toward);
          grad[k + 1] = rd(grad, k + 1) + g * Math.sin(raise) * Math.sin(toward);
        }
      }
      const range = (x: number, lo: number, hi: number, at: number) => {
        if (x < lo) {
          cost += w.range * (x - lo) ** 2;
          if (grad) grad[at] = rd(grad, at) + 2 * w.range * (x - lo);
        } else if (x > hi) {
          cost += w.range * (x - hi) ** 2;
          if (grad) grad[at] = rd(grad, at) + 2 * w.range * (x - hi);
        }
      };
      range(raise, 0, Math.PI, k);
      range(pitch, -Math.PI / 2, Math.PI / 2, k + 3);
    }
  }
  if (!grad) return cost;
  // Back: points → dials and steps.
  for (let d = 0; d < nd; d++) {
    const b = nth(m.bodies, d);
    const f = nth(base, d);
    const o = (i * nd + d) * PER_DANCER;
    const c = Math.cos(f.yaw);
    const s = Math.sin(f.yaw);
    let sumX = 0;
    let sumZ = 0;
    for (let p = 0; p < NPT; p++) {
      const j = (d * NPT + p) * 3;
      const gx = rd(GPT, j), gz = rd(GPT, j + 2);
      sumX += gx;
      sumZ += gz;
      GPT[j] = gx * c - gz * s;
      GPT[j + 2] = gx * s + gz * c;
    }
    grad[o + 12] = rd(grad, o + 12) + sumX;
    grad[o + 13] = rd(grad, o + 13) + sumZ;
    for (let sd = 0; sd < 2; sd++) {
      const k = o + sd * 6;
      const flen = rd(v, k + 5);
      const J = (d * 2 + sd) * 18;
      const je = (d * NPT + 4 + 4 * sd) * 3;
      const jw = je + 3;
      const jh = je + 6;
      const Sx = rd(GPT, je) + rd(GPT, jw) + rd(GPT, jh);
      const Sy = rd(GPT, je + 1) + rd(GPT, jw + 1) + rd(GPT, jh + 1);
      const Sz = rd(GPT, je + 2) + rd(GPT, jw + 2) + rd(GPT, jh + 2);
      grad[k] = rd(grad, k) + Sx * rd(JAC, J) + Sy * rd(JAC, J + 1) + Sz * rd(JAC, J + 2);
      grad[k + 1] = rd(grad, k + 1) + Sx * rd(JAC, J + 3) + Sy * rd(JAC, J + 4) + Sz * rd(JAC, J + 5);
      grad[k + 2] = rd(grad, k + 2) + Sx * rd(JAC, J + 6) + Sy * rd(JAC, J + 7) + Sz * rd(JAC, J + 8);
      const kl = b.forearm / b.fore0;
      const Tx = rd(GPT, jw) * kl + rd(GPT, jh), Ty = rd(GPT, jw + 1) * kl + rd(GPT, jh + 1), Tz = rd(GPT, jw + 2) * kl + rd(GPT, jh + 2);
      grad[k + 3] = rd(grad, k + 3) + flen * (Tx * rd(JAC, J + 12) + Ty * rd(JAC, J + 13) + Tz * rd(JAC, J + 14));
      grad[k + 4] = rd(grad, k + 4) + flen * (Tx * rd(JAC, J + 15) + Ty * rd(JAC, J + 16) + Tz * rd(JAC, J + 17));
      grad[k + 5] = rd(grad, k + 5) + Tx * rd(JAC, J + 9) + Ty * rd(JAC, J + 10) + Tz * rd(JAC, J + 11);
    }
  }
  return cost;
}

/** Smoothness of every variable, and each step's own cost. */
function smoothN(v: Float64Array, n: number, nd: number, w: Weights, grad?: Float64Array): number {
  let c = 0;
  const per = nd * PER_DANCER;
  for (let k = 0; k < per; k++) {
    const kk = k % PER_DANCER;
    const sc = isMetric(kk) ? METRE * METRE : 1;
    for (let i = 0; i + 1 < n; i++) {
      const d = rd(v, (i + 1) * per + k) - rd(v, i * per + k);
      c += w.smooth1 * sc * d * d;
      if (grad) {
        grad[(i + 1) * per + k] = rd(grad, (i + 1) * per + k) + 2 * w.smooth1 * sc * d;
        grad[i * per + k] = rd(grad, i * per + k) - 2 * w.smooth1 * sc * d;
      }
    }
    for (let i = 1; i + 1 < n; i++) {
      const a = rd(v, (i + 1) * per + k) - 2 * rd(v, i * per + k) + rd(v, (i - 1) * per + k);
      c += w.smooth2 * sc * a * a;
      if (grad) {
        const g = 2 * w.smooth2 * sc * a;
        grad[(i + 1) * per + k] = rd(grad, (i + 1) * per + k) + g;
        grad[i * per + k] = rd(grad, i * per + k) - 2 * g;
        grad[(i - 1) * per + k] = rd(grad, (i - 1) * per + k) + g;
      }
    }
    if (kk >= 12) for (let i = 0; i < n; i++) {
      const x = rd(v, i * per + k);
      c += w.step * x * x;
      if (grad) grad[i * per + k] = rd(grad, i * per + k) + 2 * w.step * x;
    }
  }
  return c;
}

/** The whole move's cost, and its gradient into `grad` (when given). */
export function costN(m: NMove, v: Float64Array, w: Weights = WEIGHTS, grad?: Float64Array): number {
  const plans = planN(m);
  let c = smoothN(v, m.frames.length, m.bodies.length, w, grad);
  plans.forEach((p, i) => (c += frameCostN(m, p, i, v, w, grad)));
  return c;
}

/**
 * Where to start: rest arms, and each held hand reached (by `reachArm`) for the middle of its
 * hold: halfway between the two shoulders at chest height, or the partner's back.
 */
export function startN(m: NMove): Float64Array {
  const n = m.frames.length;
  const frames = m.frames.map((f, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const out = f.map((d, j) => ({ ...d, arms: [restArm(nth(m.bodies, j)), restArm(nth(m.bodies, j))] satisfies [Arm, Arm] }));
    for (const h of m.holds) {
      if (t < h.from - 1e-9 || t > h.to + 1e-9) continue;
      const A = nth(m.bodies, h.a.dancer);
      const fa = nth(out, h.a.dancer);
      const sa = toFloor(A.shoulder[h.a.side], fa);
      const pole: Vec = [sa[0] - fa.x, -0.4, sa[2] - fa.z];
      if (isBack(h.b)) {
        const target = toFloor(backPoint(nth(m.bodies, h.b.dancer)), nth(out, h.b.dancer));
        fa.arms[h.a.side] = reachArm(A, h.a.side, fa, target, pole);
        continue;
      }
      const B = nth(m.bodies, h.b.dancer);
      const fb = nth(out, h.b.dancer);
      const sb = toFloor(B.shoulder[h.b.side], fb);
      // In front of the two of them: by their facings' mean (none when they face each other, as in
      // a pull-by), past the wider torso. Between the shoulders alone is inside a side-by-side
      // couple's torso (10-27: the courtesy turn started with her hand 22 cm into him).
      const fx = Math.sin(fa.yaw) + Math.sin(fb.yaw);
      const fz = Math.cos(fa.yaw) + Math.cos(fb.yaw);
      const ahead = (Math.hypot(fx, fz) / 2) * (Math.max(A.torso.r, B.torso.r) + 0.1);
      const fl = Math.hypot(fx, fz) || 1;
      const mid: Vec = [(sa[0] + sb[0]) / 2 + (fx / fl) * ahead, h.height ?? Math.min(sa[1], sb[1]) - 0.15, (sa[2] + sb[2]) / 2 + (fz / fl) * ahead];
      fa.arms[h.a.side] = reachArm(A, h.a.side, fa, mid, pole);
      fb.arms[h.b.side] = reachArm(B, h.b.side, fb, mid, [sb[0] - fb.x, -0.4, sb[2] - fb.z]);
    }
    return out;
  });
  return packN(frames);
}

export interface SolveNOptions {
  iterations?: number;
  rate?: number;
  rateEnd?: number;
  weights?: Weights;
  init?: Float64Array;
  onProgress?: (it: number, cost: number) => void;
}

/** Adam over every variable at once, on the exact gradient. */
export function solveN(m: NMove, o: SolveNOptions = {}): { v: Float64Array; cost: number; frames: DancerFrame[][] } {
  const w = o.weights ?? WEIGHTS;
  const v = o.init !== undefined ? Float64Array.from(o.init) : startN(m);
  const iters = o.iterations ?? 3000;
  const lr0 = o.rate ?? 0.02;
  const lrEnd = o.rateEnd ?? 0.001;
  const mom = new Float64Array(v.length);
  const vel = new Float64Array(v.length);
  const plans = planN(m);
  const n = m.frames.length;
  const nd = m.bodies.length;
  let cost = 0;
  for (let it = 1; it <= iters; it++) {
    const grad = new Float64Array(v.length);
    cost = smoothN(v, n, nd, w, grad);
    for (let i = 0; i < n; i++) cost += frameCostN(m, nth(plans, i), i, v, w, grad);
    const lr = lr0 * (lrEnd / lr0) ** ((it - 1) / Math.max(1, iters - 1));
    for (let j = 0; j < v.length; j++) {
      const g = rd(grad, j);
      mom[j] = 0.9 * rd(mom, j) + 0.1 * g;
      vel[j] = 0.999 * rd(vel, j) + 0.001 * g * g;
      const mh = rd(mom, j) / (1 - 0.9 ** it);
      const vh = rd(vel, j) / (1 - 0.999 ** it);
      v[j] = rd(v, j) - (lr * mh) / (Math.sqrt(vh) + 1e-8);
    }
    if (o.onProgress && (it % 250 === 0 || it === iters)) o.onProgress(it, cost);
  }
  return { v, cost, frames: m.frames.map((f, i) => unpackN(v, i, f)) };
}

export interface MetricsN {
  /** Deepest overlap of two parts that shouldn't touch, between dancers or against one's own body (m), and where. */
  clip: number;
  clipAt: string;
  /** Furthest a held hand is from where it's held (m, beyond clasped). A weak hold (a reach) isn't counted. */
  holdGap: number;
  holdAt: string;
  /** Largest change of an arm dial between neighbouring samples (deg), and where. */
  jump: number;
  jumpAt: string;
  /** Furthest step off a path (m). */
  step: number;
}

const R2D = 180 / Math.PI;

/** How a solve came out: the hard terms, measured with no margin. */
export function metricsN(m: NMove, v: Float64Array): MetricsN {
  const n = m.frames.length;
  const nd = m.bodies.length;
  const plans = planN(m);
  let clip = 0, clipAt = "", holdGap = 0, holdAt = "", jump = 0, jumpAt = "", step = 0;
  for (let i = 0; i < n; i++) {
    const f = unpackN(v, i, nth(m.frames, i));
    const S = f.map((d, j) => shapesOf(nth(m.bodies, j), d));
    for (let d = 0; d < nd; d++) for (let e = d + 1; e < nd; e++) {
      const mat = nth(plans, i).exempt.get(d * nd + e);
      nth(S, d).forEach((a, sa) => nth(S, e).forEach((b, sb) => {
        if ((mat?.[sa * 8 + sb] ?? 0) !== 0) return;
        const over = a.r + b.r - segSegV(a.a, a.b, b.a, b.b);
        if (over > clip) [clip, clipAt] = [over, `sample ${String(i)}: ${String(d)}.${a.name} / ${String(e)}.${b.name}`];
      }));
    }
    for (const h of nth(plans, i).holds) {
      if ((h.weight ?? 1) < 1) continue; // a reach, or a hold still coming on or letting go
      const A = nth(m.bodies, h.a.dancer);
      const ha = toFloor(armPoints(A, h.a.side, nth(f, h.a.dancer).arms[h.a.side]).h, nth(f, h.a.dancer));
      const hb = isBack(h.b)
        ? toFloor(backPoint(nth(m.bodies, h.b.dancer)), nth(f, h.b.dancer))
        : toFloor(armPoints(nth(m.bodies, h.b.dancer), h.b.side, nth(f, h.b.dancer).arms[h.b.side]).h, nth(f, h.b.dancer));
      const want = isBack(h.b) ? A.handR : WEIGHTS.clasp * (A.handR + nth(m.bodies, h.b.dancer).handR);
      // A hold with a height is off by how far either hand is from it, too.
      let off = h.height === undefined ? 0 : Math.max(Math.abs(ha[1] - h.height), isBack(h.b) ? 0 : Math.abs(hb[1] - h.height));
      if (h.forward !== undefined && !isBack(h.b)) {
        const fa = nth(f, h.a.dancer), fb = nth(f, h.b.dancer);
        const sa = toFloor(A.shoulder[h.a.side], fa), sb = toFloor(nth(m.bodies, h.b.dancer).shoulder[h.b.side], fb);
        const fx = (Math.sin(fa.yaw) + Math.sin(fb.yaw)) / 2, fz = (Math.cos(fa.yaw) + Math.cos(fb.yaw)) / 2;
        off = Math.max(off, Math.hypot((ha[0] + hb[0] - sa[0] - sb[0]) / 2 - h.forward * fx, (ha[2] + hb[2] - sa[2] - sb[2]) / 2 - h.forward * fz));
      }
      const gap = Math.max(Math.hypot(ha[0] - hb[0], ha[1] - hb[1], ha[2] - hb[2]) - want, off);
      if (gap > holdGap) [holdGap, holdAt] = [gap, `sample ${String(i)}: ${String(h.a.dancer)} → ${String(h.b.dancer)}${isBack(h.b) ? " back" : ""}`];
    }
    for (let d = 0; d < nd; d++) {
      const o = (i * nd + d) * PER_DANCER;
      step = Math.max(step, Math.hypot(rd(v, o + 12), rd(v, o + 13)));
      if (i > 0) for (const k of [0, 1, 3, 4, 6, 7, 9, 10]) {
        const dv = rd(v, o + k) - rd(v, o - nd * PER_DANCER + k);
        const j = Math.abs(Math.atan2(Math.sin(dv), Math.cos(dv))) * R2D;
        if (j > jump) [jump, jumpAt] = [j, `sample ${String(i)}: ${String(d)}.${k < 6 ? "left" : "right"} ${ARM_KEYS[k % 6] ?? ""}`];
      }
    }
  }
  return { clip, clipAt, holdGap, holdAt, jump, jumpAt, step };
}

function segSegV(p1: Vec, q1: Vec, p2: Vec, q2: Vec): number {
  const P = new Float64Array([...p1, ...q1, ...p2, ...q2]);
  return segSegAt(P, 0, 3, 6, 9);
}
