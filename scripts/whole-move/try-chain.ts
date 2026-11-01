/**
 * 🧪 Step 4 (2026-10-27): a couple's twirl twice in a row, each call's bake joined to the next
 * (`joinChain`). Prints, before and after: the worst arm change from one sample to the next across
 * the whole chain (the joins included), the clipping and held-hands gap over every sample, how
 * far each end is from the standing couple, how far the hands sink between the first call's
 * middle and the last's (the dip), and how long the joins took.
 *
 *   npx vite-node scripts/whole-move/try-chain.ts <beau> <belle> [calls, default 2] [--break]
 *     [--trace (gaps over 1.5 cm) | --trace --all (every sample, with the hands' height)]
 *     [--iters=1000] [--join=15 (the join's window, a side)]
 */

import { getBodyShape } from "../../src/services/body-shapes";
import { defined } from "../../src/test/defined";
import { BAKED_TRACKS, BREAK_SIZING, chooseBake, REVIEW2_SIZING, sampleBaked, stepToCouple, type BakedTrack } from "../../src/dance/baked-tracks";
import { couplePaths } from "../../src/dance/engine-paths";
import { joinChain } from "../../src/dance/chain-join";
import { bodyOf, fromDials, metrics, restArm, shapesOf, type Frame, type Move } from "../../src/dance/whole-move";
import { standingFrame } from "../../src/dance/whole-move-twirl";

const pos = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const [a = "ryan", b = "ryan"] = pos;
const count = Number(pos[2] ?? 2);
const broken = process.argv.includes("--break");
const shapes = [getBodyShape(a), getBodyShape(b)] as const;
const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
const bake = chooseBake(BAKED_TRACKS, "california-twirl", shapes, { grow: "meet", called: broken ? "break" : "reshape", draw: () => "reshape" });
if (bake === undefined) throw new Error("no bake");
const paths = couplePaths("california-twirl", shapes, bake.sizing ?? (broken ? BREAK_SIZING : REVIEW2_SIZING));
const calls = Array.from({ length: count }, () => ({ bake, paths }));
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** A whole chain as one floor-frame track: each call placed where the last one ended. */
function chainFrames(tracks: readonly (BakedTrack | undefined)[]): Frame[] {
  const out: Frame[] = [];
  let at: Frame | undefined;
  for (const t of tracks) {
    if (t === undefined) continue;
    const base: Frame[] = paths.beau.map((p, i) => {
      const g = defined(paths.belle[i], "paths.belle[i]");
      return [
        { x: p.x / 100, z: p.z / 100, yaw: p.facing * D2R, arms: [restArm(bodies[0]), restArm(bodies[0])] },
        { x: g.x / 100, z: g.z / 100, yaw: g.facing * D2R, arms: [restArm(bodies[1]), restArm(bodies[1])] },
      ];
    });
    const from = defined(base[0], "base[0]");
    const phi = at === undefined ? 0 : at[0].yaw - from[0].yaw;
    const c = Math.cos(phi), s = Math.sin(phi);
    const place = (x: number, z: number): [number, number] => at === undefined ? [x, z] : [(x - from[0].x) * c + (z - from[0].z) * s + at[0].x, -(x - from[0].x) * s + (z - from[0].z) * c + at[0].z];
    const frames = t.keyframes.map((k, i) => {
      const f = defined(base[i], "base[i]");
      return ([0, 1] as const).map((d) => {
        const fr = fromDials(k.values, d, bodies[d]);
        const [sx, sz] = d === 0 ? stepToCouple(k.values["0.offset.x"] ?? 0, k.values["0.offset.z"] ?? 0, f[0].yaw) : [0, 0];
        const [x, z] = place(f[d].x + sx / 100, f[d].z + sz / 100);
        return { ...fr, x, z, yaw: f[d].yaw + phi };
      }) as unknown as Frame;
    });
    out.push(...(out.length === 0 ? frames : frames.slice(1)));
    at = [{ ...defined(frames[frames.length - 1], "frames[frames.length - 1]")[0], x: place(defined(base[base.length - 1], "base[base.length - 1]")[0].x, defined(base[base.length - 1], "base[base.length - 1]")[0].z)[0], z: place(defined(base[base.length - 1], "base[base.length - 1]")[0].x, defined(base[base.length - 1], "base[base.length - 1]")[0].z)[1], yaw: defined(base[base.length - 1], "base[base.length - 1]")[0].yaw + phi }, defined(frames[frames.length - 1], "frames[frames.length - 1]")[1]];
  }
  return out;
}

const wrap = (d: number) => Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * R2D;
function report(label: string, tracks: readonly (BakedTrack | undefined)[], ms?: number) {
  const f = chainFrames(tracks);
  const move: Move = { bodies, frames: f, holds: [{ from: 0, to: 1, beau: 1, belle: 0, ...(broken ? { weight: 0.02 } : {}) }] };
  const m = metrics(move, f);
  let worst = 0, at = 0;
  for (let i = 1; i < f.length; i++) for (const k of [0, 1] as const) for (const s of [0, 1] as const) for (const key of ["raise", "toward", "pitch", "heading"] as const) {
    const d = wrap(defined(f[i], "f[i]")[k].arms[s][key] - defined(f[i - 1], "f[i - 1]")[k].arms[s][key]);
    if (d > worst) { worst = d; at = i; }
  }
  const ends = [0, f.length - 1].map((i) => {
    const st = standingFrame(shapes, bodies, defined(f[i], "f[i]"));
    let w = 0;
    for (const k of [0, 1] as const) for (const s of [0, 1] as const) for (const key of ["raise", "toward", "pitch", "heading"] as const) w = Math.max(w, wrap(defined(f[i], "f[i]")[k].arms[s][key] - st[k].arms[s][key]));
    return `${w.toFixed(0)}°`;
  });
  if (process.argv.includes("--trace")) f.forEach((fr, i) => {
    const hb = defined(shapesOf(bodies[0], fr[0]).find((x) => x.name === "hand-right"), "shapesOf(bodies[0], fr[0]).find((x) => x.name === \"hand-right\")");
    const hg = defined(shapesOf(bodies[1], fr[1]).find((x) => x.name === "hand-left"), "shapesOf(bodies[1], fr[1]).find((x) => x.name === \"hand-left\")");
    const gap = Math.hypot(hb.a[0] - hg.a[0], hb.a[1] - hg.a[1], hb.a[2] - hg.a[2]) - 0.6 * (hb.r + hg.r);
    if (process.argv.includes("--all") || Math.abs(gap) > 0.015) console.log(`  ${label} sample ${String(i).padStart(3)} hands off by ${(gap * 100).toFixed(1)} cm, height ${(hb.a[1] * 100).toFixed(0)} cm`);
  });
  // How far the held hands sink between the first call's middle and the last's (10-27: sprout's
  // came down after each twirl).
  const hh = f.map((fr) => (defined(shapesOf(bodies[0], fr[0]).find((x) => x.name === "hand-right"), "shapesOf(bodies[0], fr[0]).find((x) => x.name === \"hand-right\")").a[1] + defined(shapesOf(bodies[1], fr[1]).find((x) => x.name === "hand-left"), "shapesOf(bodies[1], fr[1]).find((x) => x.name === \"hand-left\")").a[1]) / 2);
  const mid = 20, end = f.length - 1 - 20;
  const dip = Math.min(defined(hh[mid], "hh[mid]"), defined(hh[end], "hh[end]")) - Math.min(...hh.slice(mid, end + 1));
  console.log(`${label.padEnd(7)} dip ${(dip * 100).toFixed(0).padStart(2)} cm  worst jump ${worst.toFixed(0).padStart(3)}° at sample ${String(at).padStart(3)} (joins at ${Array.from({ length: count - 1 }, (_, i) => 40 * (i + 1)).join(", ") || "-"})  clip ${(m.clip * 100).toFixed(1)} cm  hands ${(m.holdGap * 100).toFixed(1)} cm  ends vs standing ${ends.join(" / ")}${ms === undefined ? "" : `  ${ms.toFixed(0)} ms`}`);
}

function arg(name: string): string | undefined {
  return process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
}

report("as baked", calls.map((c) => c.bake));
const t0 = performance.now();
const joined = joinChain(calls, shapes, { iterations: Number(process.argv.find((x) => x.startsWith("--iters="))?.slice(8) ?? 1000), ...(arg("join") === undefined ? {} : { join: Number(arg("join")) }) });
report("joined", joined, performance.now() - t0);
void sampleBaked;
