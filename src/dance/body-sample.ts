/**
 * 🧪 Bodies for training a pose model (2026-10-26, step 3): random dancers **around the stock
 * cast**, not across all of `SHAPE_BOUNDS`. That range runs to heads of 0.6 and bodies 0.1 tall,
 * and most of it isn't a dancer; which range onboarding allows is an open question in the north-star
 * brief. Each sample is a blend of two stock bodies with a little jitter on every dimension the
 * pose depends on, clamped to the bounds.
 */

import { getBodyShape, SHAPE_BOUNDS, type CharacterBodyShape } from "../services/body-shapes";

export const STOCK = ["player", "myco", "ember", "ryan", "sprout"] as const;

/** A seeded generator in [0, 1) (mulberry32): a sample is the same body every time for its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x: number, b: { min: number; max: number }) => Math.min(b.max, Math.max(b.min, x));

/** Where the shoulder sits (relative to the body's centre): the layout's own, or the capsule's top. */
const shoulderOf = (s: CharacterBodyShape) => s.layout.shoulderY ?? s.body.height / 2 + s.body.radius;

/**
 * `a` and `b` mixed at `u` (0 is `a`), each dimension then scaled by 1 ± `spread` (offsets moved
 * by ± `spread` × 10 cm instead). Colours, segments and eyes are `a`'s.
 */
export function blendBody(a: CharacterBodyShape, b: CharacterBodyShape, u: number, r: () => number, spread = 0.1): CharacterBodyShape {
  const j = () => 1 + spread * (2 * r() - 1);
  const mix = (p: number, q: number) => p + (q - p) * u;
  const scaled = (p: number, q: number, bound: { min: number; max: number }) => clamp(mix(p, q) * j(), bound);
  const moved = (p: number, q: number, bound: { min: number; max: number }) => clamp(mix(p, q) + spread * 0.1 * (2 * r() - 1), bound);
  const B = SHAPE_BOUNDS;
  const out: CharacterBodyShape = JSON.parse(JSON.stringify(a)) as CharacterBodyShape;
  out.head.radius = scaled(a.head.radius, b.head.radius, B.head.radius);
  out.head.offsetX = moved(a.head.offsetX, b.head.offsetX, B.head.offsetX);
  out.head.offsetY = moved(a.head.offsetY, b.head.offsetY, B.head.offsetY);
  out.head.offsetZ = moved(a.head.offsetZ, b.head.offsetZ, B.head.offsetZ);
  out.body.radius = scaled(a.body.radius, b.body.radius, B.body.radius);
  out.body.height = scaled(a.body.height, b.body.height, B.body.height);
  out.forearm.topRadius = scaled(a.forearm.topRadius, b.forearm.topRadius, B.forearm.topRadius);
  out.forearm.bottomRadius = scaled(a.forearm.bottomRadius, b.forearm.bottomRadius, B.forearm.bottomRadius);
  out.forearm.height = scaled(a.forearm.height, b.forearm.height, B.forearm.height);
  out.hand.open.radius = scaled(a.hand.open.radius, b.hand.open.radius, B.hand.radius);
  out.hand.open.handForearmGap = moved(a.hand.open.handForearmGap, b.hand.open.handForearmGap, B.hand.handForearmGap);
  out.layout.forearmXOffset = scaled(a.layout.forearmXOffset, b.layout.forearmXOffset, B.layout.forearmXOffset);
  out.layout.upperArmSpacing = scaled(a.layout.upperArmSpacing, b.layout.upperArmSpacing, B.layout.upperArmSpacing);
  out.layout.headBodyGap = moved(a.layout.headBodyGap, b.layout.headBodyGap, B.layout.headBodyGap);
  out.layout.shoulderY = moved(shoulderOf(a), shoulderOf(b), B.layout.shoulderY);
  return out;
}

/**
 * Sample `k`'s two dancers. The first 25 are the stock pairings as they are (beau-major:
 * k = 5·beau + belle), so a dataset also holds a solve for every stock couple. After that, each
 * dancer is an independent blend.
 */
export function samplePair(k: number): { shapes: [CharacterBodyShape, CharacterBodyShape]; label: string } {
  if (k < STOCK.length * STOCK.length) {
    const a = STOCK[Math.floor(k / STOCK.length)] ?? "ryan";
    const b = STOCK[k % STOCK.length] ?? "ryan";
    return { shapes: [getBodyShape(a), getBodyShape(b)], label: `${a}-${b}` };
  }
  const r = rng(1000 + k);
  const pick = () => STOCK[Math.floor(r() * STOCK.length)] ?? "ryan";
  const one = () => {
    const a = pick();
    const b = pick();
    const u = r();
    return { shape: blendBody(getBodyShape(a), getBodyShape(b), u, r), label: `${a}~${b}@${u.toFixed(2)}` };
  };
  const beau = one();
  const belle = one();
  return { shapes: [beau.shape, belle.shape], label: `${beau.label} / ${belle.label}` };
}
