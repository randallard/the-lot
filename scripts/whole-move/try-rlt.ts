/**
 * 🧪 Step 5 (2026-10-27): Right and Left Thru for four dancers (`whole-move-rlt.ts`), solved by the
 * N-dancer solve (`whole-move-n.ts`). Prints the start and the solve: clipping, held-hand gaps,
 * the worst dial jump, the furthest step off a path, and the time.
 *
 *   npx vite-node scripts/whole-move/try-rlt.ts [dancer × 4, default ryan] [--iters=3000] [--step=4]
 *     [--steps (each dancer's step off their path, every 4th sample, cm)] [--out=file.json]
 */

import { writeFileSync } from "node:fs";
import { defined } from "../../src/test/defined";
import { getBodyShape } from "../../src/services/body-shapes";
import { metricsN, PER_DANCER, solveN, startN } from "../../src/dance/whole-move-n";
import { WEIGHTS } from "../../src/dance/whole-move";
import { rightAndLeftThru } from "../../src/dance/whole-move-rlt";

const arg = (name: string) => process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const pos = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const ids = [0, 1, 2, 3].map((i) => pos[i] ?? pos[0] ?? "ryan");
const m = rightAndLeftThru(ids.map((id) => getBodyShape(id)));
const show = (label: string, v: Float64Array, ms?: number) => {
  const r = metricsN(m, v);
  console.log(`${label.padEnd(6)} clip ${(r.clip * 100).toFixed(1)} cm (${r.clipAt || "-"})  hands ${(r.holdGap * 100).toFixed(1)} cm (${r.holdAt || "-"})  jump ${r.jump.toFixed(0)}° (${r.jumpAt})  step ${(r.step * 100).toFixed(0)} cm${ms === undefined ? "" : `  ${(ms / 1000).toFixed(1)} s`}`);
};
console.log(`${ids.join(" ")}: ${String(m.frames.length)} samples, holds ${m.holds.map((h) => `${String(h.a.dancer)}→${String(h.b.dancer)} ${h.from.toFixed(2)}–${h.to.toFixed(2)}`).join(", ")}`);
show("start", startN(m));
const t0 = performance.now();
const r = solveN(m, { iterations: Number(arg("iters") ?? 3000), ...(arg("step") === undefined ? {} : { weights: { ...WEIGHTS, step: Number(arg("step")) } }), onProgress: (it, c) => { if (it % 1000 === 0) console.log(`  ${String(it)}: cost ${c.toFixed(1)}`); } });
show("solved", r.v, performance.now() - t0);
const out = arg("out");
if (out !== undefined) writeFileSync(out, JSON.stringify({ ids, frames: r.frames, holds: m.holds }));
if (process.argv.includes("--steps")) for (let i = 0; i < m.frames.length; i += 4) {
  const row = [0, 1, 2, 3].map((d) => {
    const o = (i * 4 + d) * PER_DANCER;
    return `${(defined(r.v[o + 12], "r.v[o + 12]") * 100).toFixed(0).padStart(4)},${(defined(r.v[o + 13], "r.v[o + 13]") * 100).toFixed(0).padStart(4)}`;
  });
  console.log(`  ${String(i).padStart(3)} ${row.join(" | ")}`);
}
