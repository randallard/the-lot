/**
 * 🧪 **Solve the whole move** (2026-10-24, exploratory, no ADR): pose both dancers over every
 * sample of a move at once, as one optimisation, rather than one frame at a time.
 *
 * Brief: `work/square-dance-planning/briefs/solve-the-whole-move.md`. Ryan: *"I really just don't
 * want body parts to clip into each other or flip rapidly between angles / sizes - all should be
 * smooth and "natural"."* Stretching, shrinking and growing are allowed.
 *
 * The variables are `#review2`'s own dials (`pose-dials.ts`), so a solution is a keyframe track
 * `#review2` can load and play as it is. Per dancer, per sample: each arm's upper-arm raise, toward
 * and length, and its forearm pitch, heading and length. For the beau, an offset from the floor's
 * path too ("just the beau steps out to create the room if necessary").
 *
 * The objective:
 * - **No clipping**: torso capsules, head spheres, forearm capsules and hand spheres keep a margin,
 *   between the two dancers and against each dancer's own head. Hands stay above the floor.
 * - **Held hands stay held**, for the spans the engine declares.
 * - **Smooth**: every variable's change and its change of change between samples cost.
 * - **Natural**: stretch costs gently; free arms prefer to hang; held arms prefer to be low
 *   (gravity), so an arch is only as high and as long as the bodies under it need.
 *
 * 🔑 Nothing says *when* the arch is up. That should fall out: the hands must stay joined, and her
 * head must not pass through them.
 *
 * Pure: no three.js. The forward model is `Dancer.tsx` + `computePositions` + `applyToRigs`,
 * restated: the rig faces +z, +x is the anatomical left, `rotation.y` is the facing.
 */

import { computePositions, NPC_BODY_CENTER_Y, type CharacterBodyShape } from "../services/body-shapes";

export type Vec = readonly [number, number, number];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** One arm's dials, in radians and metres. */
export interface Arm {
  raise: number;
  toward: number;
  ulen: number;
  pitch: number;
  heading: number;
  flen: number;
}

/** One dancer at one sample: where the floor puts them, and their two arms (left, right). */
export interface DancerFrame {
  x: number;
  z: number;
  /** Rig yaw, radians (`rotation.y`). */
  yaw: number;
  arms: [Arm, Arm];
}

export type Frame = [DancerFrame, DancerFrame];

/** What the forward model needs from a body shape, in the rig's own frame. */
export interface Body {
  /** Left, right. */
  shoulder: [Vec, Vec];
  head: { c: Vec; r: number };
  torso: { a: Vec; b: Vec; r: number };
  upper0: number;
  /** Elbow to hand centre at rest. */
  fore0: number;
  /** Elbow to wrist along the forearm, at rest. */
  forearm: number;
  forearmR: number;
  handR: number;
}

export function bodyOf(shape: CharacterBodyShape): Body {
  const pos = computePositions(shape, NPC_BODY_CENTER_Y);
  const { head, body, forearm, hand } = shape;
  return {
    shoulder: [
      [pos.forearmX, pos.shoulderY, pos.shoulderZ],
      [-pos.forearmX, pos.shoulderY, pos.shoulderZ],
    ],
    head: { c: [head.offsetX, pos.headY + head.offsetY, head.offsetZ], r: head.radius },
    torso: {
      a: [0, NPC_BODY_CENTER_Y - body.height / 2, 0],
      b: [0, NPC_BODY_CENTER_Y + body.height / 2, 0],
      r: body.radius,
    },
    upper0: pos.upperArmLength,
    fore0: pos.elbowY - pos.handCenterY,
    forearm: forearm.height,
    forearmR: forearm.topRadius,
    handR: hand.open.radius,
  };
}

export function restArm(b: Body): Arm {
  return { raise: 0, toward: 0, ulen: b.upper0, pitch: -Math.PI / 2, heading: 0, flen: b.fore0 };
}

const SIDES = ["left", "right"] as const;
const sign = (side: 0 | 1) => (side === 0 ? 1 : -1);

/** Shoulder, elbow, wrist and hand centre of one arm, in the rig's frame (`applyToRigs`'s maths). */
export function armPoints(b: Body, side: 0 | 1, a: Arm): { s: Vec; e: Vec; w: Vec; h: Vec } {
  const s = b.shoulder[side];
  const g = sign(side);
  const hz = Math.sin(a.raise);
  const e: Vec = [
    s[0] + g * hz * Math.sin(a.toward) * a.ulen,
    s[1] - Math.cos(a.raise) * a.ulen,
    s[2] + hz * Math.cos(a.toward) * a.ulen,
  ];
  const cp = Math.cos(a.pitch);
  const d: Vec = [g * cp * Math.sin(a.heading), Math.sin(a.pitch), cp * Math.cos(a.heading)];
  // The forearm mesh scales with the forearm-length dial, as `applyToRigs` does.
  const k = a.flen / b.fore0;
  const w: Vec = [e[0] + d[0] * b.forearm * k, e[1] + d[1] * b.forearm * k, e[2] + d[2] * b.forearm * k];
  const h: Vec = [e[0] + d[0] * a.flen, e[1] + d[1] * a.flen, e[2] + d[2] * a.flen];
  return { s, e, w, h };
}

/** Rig frame → the couple's floor frame. */
export function toFloor(p: Vec, f: DancerFrame): Vec {
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  return [p[0] * c + p[2] * s + f.x, p[1], -p[0] * s + p[2] * c + f.z];
}

// ── Distances ────────────────────────────────────────────────────────────────────────────────

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec) => Math.sqrt(dot(a, a));
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Closest distance between segments p1–q1 and p2–q2 (Ericson, Real-Time Collision Detection 5.1.9). */
export function segSeg(p1: Vec, q1: Vec, p2: Vec, q2: Vec): number {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s: number;
  let t: number;
  if (a <= 1e-12 && e <= 1e-12) return len(r);
  if (a <= 1e-12) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = dot(d1, r);
    if (e <= 1e-12) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = dot(d1, d2);
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
  const c1: Vec = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
  const c2: Vec = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return len(sub(c1, c2));
}

/** A capsule; a sphere is a capsule with `a === b`. */
interface Shape {
  name: string;
  a: Vec;
  b: Vec;
  r: number;
}

/** Every collidable of one dancer at one frame, in the floor frame. */
export function shapesOf(b: Body, f: DancerFrame): Shape[] {
  const out: Shape[] = [
    { name: "torso", a: toFloor(b.torso.a, f), b: toFloor(b.torso.b, f), r: b.torso.r },
    { name: "head", a: toFloor(b.head.c, f), b: toFloor(b.head.c, f), r: b.head.r },
  ];
  for (const side of [0, 1] as const) {
    const p = armPoints(b, side, f.arms[side]);
    const e = toFloor(p.e, f);
    const h = toFloor(p.h, f);
    // The upper arm isn't drawn, but it is there: an arm that passes through a body to get
    // round it is the cheapest wrong answer otherwise.
    out.push({ name: `upper-${SIDES[side]}`, a: toFloor(p.s, f), b: e, r: b.forearmR });
    out.push({ name: `forearm-${SIDES[side]}`, a: e, b: toFloor(p.w, f), r: b.forearmR });
    out.push({ name: `hand-${SIDES[side]}`, a: h, b: h, r: b.handR });
  }
  return out;
}

// ── The move ─────────────────────────────────────────────────────────────────────────────────

/** A held pair of hands over a stretch of the move (fractions 0–1), from the engine's grips. */
export interface Hold {
  from: number;
  to: number;
  beau: 0 | 1;
  belle: 0 | 1;
  /**
   * 🧪 An arch: the joined hands keep to this upright plane (a point on it and its horizontal
   * normal). It's the 10-19 reading of the video, *"up in an arc on the same plane"*: the plane
   * through the centre of the exchange, along the couple's facing. Nothing says how high or when.
   * That comes from her crossing the plane under them.
   */
  plane?: { p: Vec; n: Vec };
}

export interface Move {
  bodies: [Body, Body];
  /** One per sample, evenly over t = 0…1. Arms are the starting guess. */
  frames: Frame[];
  holds: Hold[];
}

export interface Weights {
  clip: number;
  margin: number;
  hold: number;
  /** Clasped hand centres sit this fraction of the two radii apart. */
  clasp: number;
  smooth1: number;
  smooth2: number;
  stretch: number;
  rest: number;
  gravity: number;
  step: number;
  range: number;
  plane: number;
}

export const WEIGHTS: Weights = {
  clip: 30000,
  margin: 0.02,
  hold: 2000,
  clasp: 0.6,
  smooth1: 2,
  smooth2: 60,
  stretch: 6,
  rest: 2,
  gravity: 0.3,
  step: 4,
  range: 200,
  plane: 400,
};

const held = (m: Move, t: number) => m.holds.filter((h) => t >= h.from - 1e-9 && t <= h.to + 1e-9);

/** Pairs that may touch: a held hand on its partner's held hand, and on the wrist behind it. */
function exempt(m: Move, t: number, a: string, b: string): boolean {
  return held(m, t).some((h) => {
    const ha = `hand-${SIDES[h.beau]}`;
    const hb = `hand-${SIDES[h.belle]}`;
    return (a === ha && (b === hb || b === `forearm-${SIDES[h.belle]}`)) || (b === hb && a === `forearm-${SIDES[h.beau]}`);
  });
}

/** Everything about one sample that doesn't involve its neighbours. */
export function frameCost(m: Move, i: number, f: Frame, w: Weights = WEIGHTS, guide?: { at: Vec; weight: number }): number {
  const t = m.frames.length > 1 ? i / (m.frames.length - 1) : 0;
  const [bb, gb] = m.bodies;
  const A = shapesOf(bb, f[0]);
  const B = shapesOf(gb, f[1]);
  let c = 0;
  const pen = (s1: Shape, s2: Shape, margin: number) => {
    const d = segSeg(s1.a, s1.b, s2.a, s2.b);
    const over = s1.r + s2.r + margin - d;
    if (over > 0) c += w.clip * over * over;
  };
  for (const s1 of A) for (const s2 of B) if (!exempt(m, t, s1.name, s2.name)) pen(s1, s2, w.margin);
  // Each dancer's own arms against their own head and torso (an arm overhead goes round the head;
  // no arm goes through its own body). The upper arm starts at the shoulder, clear of the torso.
  for (const S of [A, B]) for (const s of S.slice(2)) for (const own of S.slice(0, 2)) pen(s, own, w.margin);
  // Hands above the floor.
  for (const S of [A, B]) for (const s of S) if (s.name.startsWith("hand")) {
    const under = s.r - s.a[1];
    if (under > 0) c += w.clip * under * under;
  }
  // Held hands meet.
  const hs = held(m, t);
  for (const h of hs) {
    const ha = A.find((s) => s.name === `hand-${SIDES[h.beau]}`);
    const hb = B.find((s) => s.name === `hand-${SIDES[h.belle]}`);
    if (ha === undefined || hb === undefined) continue;
    const d = len(sub(ha.a, hb.a));
    const want = w.clasp * (ha.r + hb.r);
    c += w.hold * (d - want) * (d - want);
    if (h.plane !== undefined) {
      const mid: Vec = [(ha.a[0] + hb.a[0]) / 2, (ha.a[1] + hb.a[1]) / 2, (ha.a[2] + hb.a[2]) / 2];
      const off = dot(sub(mid, h.plane.p), h.plane.n);
      c += w.plane * off * off;
    }
    if (guide !== undefined && guide.weight > 0) {
      const mid: Vec = [(ha.a[0] + hb.a[0]) / 2, (ha.a[1] + hb.a[1]) / 2, (ha.a[2] + hb.a[2]) / 2];
      const g = sub(mid, guide.at);
      c += guide.weight * dot(g, g);
    }
  }
  // Natural: stretch, free arms hang, held arms are low, angles in range, the beau near his path.
  f.forEach((d, k) => {
    const body = m.bodies[k];
    if (body === undefined) return;
    d.arms.forEach((a, side) => {
      const su = a.ulen / body.upper0 - 1;
      const sf = a.flen / body.fore0 - 1;
      c += w.stretch * (su * su + sf * sf);
      const isHeld = hs.some((h) => (k === 0 ? h.beau : h.belle) === side);
      if (isHeld) {
        const p = armPoints(body, side as 0 | 1, a);
        c += w.gravity * (p.e[1] + p.h[1] - 2 * body.shoulder[0][1]);
      } else {
        const r = restArm(body);
        c += w.rest * ((a.raise - r.raise) ** 2 + (a.pitch - r.pitch) ** 2 + 0.1 * (a.heading ** 2 + a.toward ** 2));
      }
      // The shoulder's range: a raised arm swung far behind the back costs.
      const back = -Math.sin(a.raise) * Math.cos(a.toward);
      if (back > 0.3) c += w.range * (back - 0.3) ** 2;
      if (a.raise < 0) c += w.range * a.raise * a.raise;
      if (a.raise > Math.PI) c += w.range * (a.raise - Math.PI) ** 2;
      if (a.pitch > Math.PI / 2) c += w.range * (a.pitch - Math.PI / 2) ** 2;
      if (a.pitch < -Math.PI / 2) c += w.range * (a.pitch + Math.PI / 2) ** 2;
    });
  });
  return c;
}

// ── Variables ────────────────────────────────────────────────────────────────────────────────

const ARM_KEYS = ["raise", "toward", "ulen", "pitch", "heading", "flen"] as const;
/** Per sample: 2 dancers × 2 arms × 6, then the beau's step out (away from her) and sideways. */
const PER = 2 * 2 * 6 + 2;
/** Lengths and offsets are metres; weigh their smoothness as if a metre were this many radians. */
const METRE = 3;
const isMetric = (k: number) => k >= 24 || ARM_KEYS[k % 6] === "ulen" || ARM_KEYS[k % 6] === "flen";

function pack(frames: readonly Frame[]): Float64Array {
  const v = new Float64Array(frames.length * PER);
  frames.forEach((f, i) => {
    let k = i * PER;
    for (const d of f) for (const a of d.arms) for (const key of ARM_KEYS) v[k++] = a[key];
    v[k++] = 0;
    v[k++] = 0;
  });
  return v;
}

function unpackOne(v: Float64Array, i: number, base: Frame): Frame {
  let k = i * PER;
  const dancer = (d: DancerFrame, dx: number, dz: number): DancerFrame => {
    const arms = d.arms.map(() => {
      const a = {} as Arm;
      for (const key of ARM_KEYS) a[key] = v[k++] ?? 0;
      return a;
    }) as [Arm, Arm];
    return { ...d, x: d.x + dx, z: d.z + dz, arms };
  };
  // "Just the beau steps out": along the line from her to him, plus a (costly) sideways part.
  const out = v[i * PER + 24] ?? 0;
  const side = v[i * PER + 25] ?? 0;
  const ux = base[0].x - base[1].x;
  const uz = base[0].z - base[1].z;
  const ul = Math.hypot(ux, uz) || 1;
  const beau = dancer(base[0], (ux / ul) * out - (uz / ul) * side, (uz / ul) * out + (ux / ul) * side);
  const belle = dancer(base[1], 0, 0);
  return [beau, belle];
}

function smoothCost(v: Float64Array, n: number, w: Weights, grad?: Float64Array): number {
  let c = 0;
  for (let k = 0; k < PER; k++) {
    const sc = isMetric(k) ? METRE * METRE : 1;
    for (let i = 0; i + 1 < n; i++) {
      const d = (v[(i + 1) * PER + k] ?? 0) - (v[i * PER + k] ?? 0);
      c += w.smooth1 * sc * d * d;
      if (grad) {
        grad[(i + 1) * PER + k] = (grad[(i + 1) * PER + k] ?? 0) + 2 * w.smooth1 * sc * d;
        grad[i * PER + k] = (grad[i * PER + k] ?? 0) - 2 * w.smooth1 * sc * d;
      }
    }
    for (let i = 1; i + 1 < n; i++) {
      const a = (v[(i + 1) * PER + k] ?? 0) - 2 * (v[i * PER + k] ?? 0) + (v[(i - 1) * PER + k] ?? 0);
      c += w.smooth2 * sc * a * a;
      if (grad) {
        const g = 2 * w.smooth2 * sc * a;
        grad[(i + 1) * PER + k] = (grad[(i + 1) * PER + k] ?? 0) + g;
        grad[i * PER + k] = (grad[i * PER + k] ?? 0) - 2 * g;
        grad[(i - 1) * PER + k] = (grad[(i - 1) * PER + k] ?? 0) + g;
      }
    }
    // The beau's offset costs for itself, not only for changing.
    if (k >= 24) for (let i = 0; i < n; i++) {
      const x = v[i * PER + k] ?? 0;
      const ws = k === 25 ? w.step * 25 : w.step;
      c += ws * x * x;
      if (grad) grad[i * PER + k] = (grad[i * PER + k] ?? 0) + 2 * ws * x;
    }
  }
  return c;
}

export interface SolveOptions {
  iterations?: number;
  rate?: number;
  weights?: Weights;
  /** A warm-start pull for the joined hands, faded out over the first `guideFor` of the run. */
  guide?: (i: number) => Vec;
  guideFor?: number;
  onProgress?: (it: number, cost: number) => void;
}

/**
 * Adam over every sample at once. The gradient of a sample's own cost is by central differences
 * on that sample's variables only (its cost doesn't depend on the others); smoothness is exact.
 */
export function solve(m: Move, o: SolveOptions = {}): { frames: Frame[]; cost: number } {
  const w = o.weights ?? WEIGHTS;
  const n = m.frames.length;
  const base = m.frames;
  const v = pack(base);
  const iters = o.iterations ?? 1500;
  const lr = o.rate ?? 0.02;
  const mom = new Float64Array(v.length);
  const vel = new Float64Array(v.length);
  const b1 = 0.9;
  const b2 = 0.999;
  const h = 1e-4;
  let cost = 0;
  for (let it = 1; it <= iters; it++) {
    const grad = new Float64Array(v.length);
    cost = smoothCost(v, n, w, grad);
    const fade = o.guide && o.guideFor ? Math.max(0, 1 - it / (iters * o.guideFor)) : 0;
    for (let i = 0; i < n; i++) {
      const baseF = base[i];
      if (baseF === undefined) continue;
      const g = o.guide && fade > 0 ? { at: o.guide(i), weight: 400 * fade } : undefined;
      const f0 = frameCost(m, i, unpackOne(v, i, baseF), w, g);
      cost += f0;
      for (let k = 0; k < PER; k++) {
        const j = i * PER + k;
        const x = v[j] ?? 0;
        v[j] = x + h;
        const up = frameCost(m, i, unpackOne(v, i, baseF), w, g);
        v[j] = x - h;
        const dn = frameCost(m, i, unpackOne(v, i, baseF), w, g);
        v[j] = x;
        grad[j] = (grad[j] ?? 0) + (up - dn) / (2 * h);
      }
    }
    for (let j = 0; j < v.length; j++) {
      const g = grad[j] ?? 0;
      mom[j] = b1 * (mom[j] ?? 0) + (1 - b1) * g;
      vel[j] = b2 * (vel[j] ?? 0) + (1 - b2) * g * g;
      const mh = (mom[j] ?? 0) / (1 - b1 ** it);
      const vh = (vel[j] ?? 0) / (1 - b2 ** it);
      v[j] = (v[j] ?? 0) - (lr * mh) / (Math.sqrt(vh) + 1e-8);
    }
    if (o.onProgress && (it % 100 === 0 || it === iters)) o.onProgress(it, cost);
  }
  const frames = base.map((f, i) => unpackOne(v, i, f));
  return { frames, cost };
}

// ── Reading it: the same numbers for the floor's pose and the solver's ────────────────────────

export interface Metrics {
  /** Deepest overlap of any two parts that shouldn't touch (m), and where. */
  clip: number;
  clipAt: string;
  /** Furthest the held hands come apart, beyond clasped (m). */
  holdGap: number;
  /** Largest change of any limb's direction between neighbouring samples (deg). */
  jump: number;
  jumpAt: string;
  /** Largest stretch of any segment, as a ratio of its rest length. */
  stretch: number;
  /** The beau's furthest step off the floor's path (m). */
  step: number;
}

const angleBetween = (a: Vec, b: Vec) => {
  const c = dot(a, b) / Math.max(len(a) * len(b), 1e-12);
  return Math.acos(Math.max(-1, Math.min(1, c))) * R2D;
};

export function metrics(m: Move, frames: readonly Frame[], path?: readonly Frame[]): Metrics {
  const out: Metrics = { clip: 0, clipAt: "", holdGap: 0, jump: 0, jumpAt: "", stretch: 1, step: 0 };
  const n = frames.length;
  const noMargin = { ...WEIGHTS, margin: 0 };
  frames.forEach((f, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const A = shapesOf(m.bodies[0], f[0]);
    const B = shapesOf(m.bodies[1], f[1]);
    const check = (s1: Shape, s2: Shape, who: string) => {
      const over = s1.r + s2.r + noMargin.margin - segSeg(s1.a, s1.b, s2.a, s2.b);
      if (over > out.clip) {
        out.clip = over;
        out.clipAt = `t=${t.toFixed(3)} ${who} ${s1.name}/${s2.name}`;
      }
    };
    for (const s1 of A) for (const s2 of B) if (!exempt(m, t, s1.name, s2.name)) check(s1, s2, "beau/belle");
    [A, B].forEach((S, k) => {
      for (const s of S.slice(2)) for (const own of S.slice(0, 2)) check(s, own, k === 0 ? "beau" : "belle");
    });
    for (const h of held(m, t)) {
      const ha = A.find((s) => s.name === `hand-${SIDES[h.beau]}`);
      const hb = B.find((s) => s.name === `hand-${SIDES[h.belle]}`);
      if (ha && hb) out.holdGap = Math.max(out.holdGap, len(sub(ha.a, hb.a)) - WEIGHTS.clasp * (ha.r + hb.r));
    }
    f.forEach((d, k) => {
      const body = m.bodies[k];
      if (!body) return;
      for (const a of d.arms) out.stretch = Math.max(out.stretch, a.ulen / body.upper0, a.flen / body.fore0);
    });
    const p = path?.[i]?.[0];
    if (p) out.step = Math.max(out.step, Math.hypot(f[0].x - p.x, f[0].z - p.z));
    const prev = frames[i - 1];
    if (prev) {
      f.forEach((d, k) => {
        const body = m.bodies[k];
        const pd = prev[k];
        if (!body || !pd) return;
        for (const side of [0, 1] as const) {
          const a = armPoints(body, side, d.arms[side]);
          const b = armPoints(body, side, pd.arms[side]);
          const du = angleBetween(sub(a.e, a.s), sub(b.e, b.s));
          const df = angleBetween(sub(a.h, a.e), sub(b.h, b.e));
          const worst = Math.max(du, df);
          if (worst > out.jump) {
            out.jump = worst;
            out.jumpAt = `t=${t.toFixed(3)} ${k === 0 ? "beau" : "belle"} ${SIDES[side]} ${du >= df ? "upper arm" : "forearm"}`;
          }
        }
      });
    }
  });
  return out;
}

// ── To and from `#review2`'s dials ───────────────────────────────────────────────────────────

const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** One dancer's dial values (`<dancer>.<part>.<aspect>`) at one frame. */
export function toDials(d: DancerFrame, dancer: number): Record<string, number> {
  const out: Record<string, number> = {};
  const k = (part: string, aspect: string) => `${String(dancer)}.${part}.${aspect}`;
  out[k("torso", "x")] = Math.round(d.x * 1000) / 10;
  out[k("torso", "z")] = Math.round(d.z * 1000) / 10;
  out[k("torso", "facing")] = Math.round(wrapDeg(d.yaw * R2D));
  d.arms.forEach((a, side) => {
    const s = SIDES[side];
    out[k(`upper-arm-${s}`, "raise")] = Math.round(a.raise * R2D * 10) / 10;
    out[k(`upper-arm-${s}`, "toward")] = Math.round(wrapDeg(a.toward * R2D) * 10) / 10;
    out[k(`upper-arm-${s}`, "length")] = Math.round(a.ulen * 1000) / 10;
    out[k(`forearm-${s}`, "pitch")] = Math.round(a.pitch * R2D * 10) / 10;
    out[k(`forearm-${s}`, "heading")] = Math.round(wrapDeg(a.heading * R2D) * 10) / 10;
    out[k(`forearm-${s}`, "length")] = Math.round(a.flen * 1000) / 10;
    // The solver doesn't pose the hand, so it's set straight along the forearm. Left out, the
    // drawn hand keeps whatever turn the floor gave it that frame, which flips about.
    out[k(`hand-${s}`, "bend")] = 0;
    out[k(`hand-${s}`, "side")] = 0;
    out[k(`hand-${s}`, "roll")] = 0;
  });
  return out;
}

/** A dancer's frame from dial values (as `readRigs` gives them). Missing arm dials fall back to rest. */
export function fromDials(values: Readonly<Record<string, number>>, dancer: number, b: Body): DancerFrame {
  const g = (part: string, aspect: string) => values[`${String(dancer)}.${part}.${aspect}`];
  const r = restArm(b);
  const arm = (s: "left" | "right"): Arm => ({
    raise: (g(`upper-arm-${s}`, "raise") ?? r.raise * R2D) * D2R,
    toward: (g(`upper-arm-${s}`, "toward") ?? 0) * D2R,
    ulen: (g(`upper-arm-${s}`, "length") ?? r.ulen * 100) / 100,
    pitch: (g(`forearm-${s}`, "pitch") ?? r.pitch * R2D) * D2R,
    heading: (g(`forearm-${s}`, "heading") ?? 0) * D2R,
    flen: (g(`forearm-${s}`, "length") ?? r.flen * 100) / 100,
  });
  return {
    x: (g("torso", "x") ?? 0) / 100,
    z: (g("torso", "z") ?? 0) / 100,
    yaw: (g("torso", "facing") ?? 0) * D2R,
    arms: [arm("left"), arm("right")],
  };
}

// ── A starting shape ─────────────────────────────────────────────────────────────────────────

/** The couple's floor frame → one dancer's rig frame (the inverse of `toFloor`). */
export function toRig(p: Vec, f: DancerFrame): Vec {
  const x = p[0] - f.x;
  const z = p[2] - f.z;
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  return [x * c - z * s, p[1], x * s + z * c];
}

/**
 * Two-bone IK onto the dials: an arm whose hand centre is at `target` (floor frame), elbow bent
 * toward `pole` (a floor-frame direction). If the target is out of reach both segments lengthen by
 * the same ratio, to 95% of full reach, which is the stretch Ryan allows.
 */
export function reachArm(b: Body, side: 0 | 1, f: DancerFrame, target: Vec, pole: Vec): Arm {
  const S = b.shoulder[side];
  const H = toRig(target, f);
  const pr = toRig([pole[0] + f.x, pole[1], pole[2] + f.z], f);
  const d = sub(H, S);
  const r = Math.max(len(d), 1e-6);
  const k = Math.max(1, r / (0.95 * (b.upper0 + b.fore0)));
  const L1 = b.upper0 * k;
  const L2 = b.fore0 * k;
  const dn: Vec = [d[0] / r, d[1] / r, d[2] / r];
  const a = (L1 * L1 - L2 * L2 + r * r) / (2 * r);
  const hgt = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  // The pole, made perpendicular to the shoulder–hand line.
  const pd = dot(pr, dn);
  let q: Vec = [pr[0] - dn[0] * pd, pr[1] - dn[1] * pd, pr[2] - dn[2] * pd];
  const ql = len(q);
  q = ql > 1e-9 ? [q[0] / ql, q[1] / ql, q[2] / ql] : [0, -1, 0];
  const E: Vec = [S[0] + dn[0] * a + q[0] * hgt, S[1] + dn[1] * a + q[1] * hgt, S[2] + dn[2] * a + q[2] * hgt];
  const u = sub(E, S);
  const fv = sub(H, E);
  const g = sign(side);
  const ul = Math.max(len(u), 1e-9);
  const fl = Math.max(len(fv), 1e-9);
  return {
    raise: Math.acos(Math.max(-1, Math.min(1, -u[1] / ul))),
    toward: Math.atan2(g * u[0], u[2]),
    ulen: ul,
    pitch: Math.asin(Math.max(-1, Math.min(1, fv[1] / fl))),
    heading: Math.atan2(g * fv[0], fv[2]),
    flen: fl,
  };
}

/**
 * Put every held arm's hand on `at(i)`, elbows bent away from the dancer's own centre and a little
 * down. Angles are unwrapped along the move so the start has no ±360° steps of its own.
 */
export function startOnPath(m: Move, at: (i: number) => Vec): Frame[] {
  const frames = m.frames.map((f, i) => {
    const t = m.frames.length > 1 ? i / (m.frames.length - 1) : 0;
    const hs = held(m, t);
    return f.map((d, k) => {
      const body = m.bodies[k];
      if (!body) return d;
      const arms = d.arms.map((a, side) => {
        const isHeld = hs.some((h) => (k === 0 ? h.beau : h.belle) === side);
        if (!isHeld) return a;
        const s = toFloor(body.shoulder[side], d);
        const out: Vec = [s[0] - d.x, -0.4, s[2] - d.z];
        return reachArm(body, side as 0 | 1, d, at(i), out);
      }) as [Arm, Arm];
      return { ...d, arms };
    }) as Frame;
  });
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const cur = frames[i];
    if (!prev || !cur) continue;
    cur.forEach((d, k) => d.arms.forEach((a, side) => {
      const p = prev[k]?.arms[side];
      if (!p) return;
      for (const key of ["toward", "heading"] as const) {
        while (a[key] - p[key] > Math.PI) a[key] -= 2 * Math.PI;
        while (a[key] - p[key] < -Math.PI) a[key] += 2 * Math.PI;
      }
    }));
  }
  return frames;
}
