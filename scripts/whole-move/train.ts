/**
 * 🧪 Train and measure the twirl model (2026-10-26, step 3) on `dataset.ts`'s output.
 *
 *   npx vite-node scripts/whole-move/train.ts <dir of *.jsonl> [--polish=0,100,300,1000] [--lambda=1]
 *
 * Splits the clean samples (no clipping over 0.5 cm, hands within 2 cm, stretch at most 2×) 4:1 by
 * index. On the held-out fifth it reports, for the raw prediction and after each polish length:
 * clipping, the hands' gap, the worst jump, cost against the full solve, and time. The nearest
 * neighbour in feature space is the baseline the regression has to beat.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { defined } from "../../src/test/defined";
import { join } from "node:path";
import { bodyOf, metrics, solve, unpackOne, WEIGHTS, type Body, type Frame, type GrowStyle } from "../../src/dance/whole-move";
import { twirlMove } from "../../src/dance/whole-move-twirl";
import { features, fitRidge, predictRidge, unwrapLike } from "../../src/dance/twirl-model";
import type { CharacterBodyShape } from "../../src/services/body-shapes";
import type { PathSample } from "../../src/dance/baked-tracks";

interface Row {
  k: number;
  label: string;
  /** Who could change height in the solve (10-27); absent in older datasets: nobody. */
  grow?: GrowStyle;
  shapes: [CharacterBodyShape, CharacterBodyShape];
  paths: { beau: PathSample[]; belle: PathSample[] };
  cost: number;
  metrics: { clip: number; holdGap: number; stretch: number; jump: number; step: number };
  v: number[];
  ms: number;
}

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
if (dir === undefined) throw new Error("usage: train.ts <dir> [--polish=0,100,300,1000] [--lambda=1] [--out=model.json]");
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const polishes = (flag("polish") ?? "0,100,300,1000").split(",").map(Number);
const lambda = Number(flag("lambda") ?? 1);
const outFile = flag("out");
const weights = { ...WEIGHTS, margin: 0.06 };
const N = 41;

const rows: Row[] = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(join(dir, f), "utf8").trim().split("\n").filter((l) => l.length > 0).map((l) => JSON.parse(l) as Row))
  .sort((a, b) => a.k - b.k);
const clean = (r: Row) => r.metrics.clip <= 0.005 && r.metrics.holdGap <= 0.02 && r.metrics.stretch <= 2;
const good = rows.filter(clean);
console.log(`${String(rows.length)} samples, ${String(good.length)} clean (${(100 * good.length / rows.length).toFixed(0)}%); stock pairings clean: ${String(good.filter((r) => r.k < 25).length)}/25`);
const stockBad = rows.filter((r) => r.k < 25 && !clean(r));
for (const r of stockBad) console.log(`  stock not clean: ${r.label} clip ${(r.metrics.clip * 100).toFixed(1)} cm, gap ${(r.metrics.holdGap * 100).toFixed(1)} cm, stretch ${r.metrics.stretch.toFixed(2)}`);

const ref = rows.find((r) => r.label === "ryan-ryan")?.v ?? good[0]?.v ?? [];
const prep = (r: Row) => {
  const bodies: [Body, Body] = [bodyOf(r.shapes[0]), bodyOf(r.shapes[1])];
  return { r, bodies, x: features(bodies, r.paths), y: unwrapLike(r.v, ref, N) };
};
const all = good.map(prep);
const test = all.filter((s) => s.r.k % 5 === 0 && s.r.k >= 25);
const train = all.filter((s) => !test.includes(s));
console.log(`train ${String(train.length)}, test ${String(test.length)} (held out: every 5th blend)`);

const t0 = performance.now();
const model = fitRidge(train.map((s) => s.x), train.map((s) => s.y), lambda);
console.log(`ridge fit in ${(performance.now() - t0).toFixed(0)} ms (λ ${String(lambda)})`);
if (outFile !== undefined) writeFileSync(outFile, JSON.stringify(model));

// The baseline: the nearest training couple's solve, in standardised feature space.
const nearest = (x: number[]) => {
  let best = defined(train[0], "train[0]");
  let bd = Infinity;
  for (const s of train) {
    let d = 0;
    x.forEach((v, j) => { d += ((v - (s.x[j] ?? 0)) / (model.std[j] ?? 1)) ** 2; });
    if (d < bd) { bd = d; best = s; }
  }
  return best.y;
};

const measure = (s: (typeof all)[number], v: Float64Array) => {
  const { move, path } = twirlMove({ pairing: "", figure: "", shapes: ["", ""], beau: s.r.paths.beau, belle: s.r.paths.belle }, s.bodies, [], s.r.grow ?? "none");
  const frames: Frame[] = move.frames.map((f, i) => unpackOne(v, i, f));
  return { m: metrics(move, frames, path), move };
};

type Stat = { clip: number[]; gap: number[]; jump: number[]; ratio: number[]; ms: number[]; cleanN: number };
const stats = new Map<string, Stat>();
const add = (key: string, m: { clip: number; holdGap: number; jump: number; stretch: number }, ratio: number, ms: number) => {
  const st = stats.get(key) ?? { clip: [], gap: [], jump: [], ratio: [], ms: [], cleanN: 0 };
  st.clip.push(m.clip * 100);
  st.gap.push(m.holdGap * 100);
  st.jump.push(m.jump);
  st.ratio.push(ratio);
  st.ms.push(ms);
  if (m.clip <= 0.005 && m.holdGap <= 0.02 && m.stretch <= 2) st.cleanN++;
  stats.set(key, st);
};

for (const s of test) {
  for (const [name, predict] of [["ridge", (x: number[]) => predictRidge(model, x)], ["nearest", nearest]] as const) {
    const tp = performance.now();
    const pred = predict(s.x);
    const predMs = performance.now() - tp;
    const { move } = measure(s, pred);
    for (const it of polishes) {
      const tq = performance.now();
      const r = it === 0 ? { v: pred, cost: NaN } : solve(move, { init: pred, iterations: it, rate: 0.01, rateEnd: 0.001, weights });
      const ms = performance.now() - tq + predMs;
      // The cost of what came out, measured the way the full solve's was (one more evaluation).
      const cost = solve(move, { init: r.v, iterations: 1, rate: 1e-12, weights }).cost;
      add(`${name} +${String(it)}`, measure(s, r.v).m, cost / s.r.cost, ms);
    }
  }
}

const q = (xs: number[], p: number) => { const a = [...xs].sort((u, w) => u - w); return a[Math.min(a.length - 1, Math.floor(p * a.length))] ?? NaN; };
console.log("\nheld out: median / 90th percentile  (full solve: cost 1.00×, about 5,500 ms)");
console.log("model+polish     clean     clip cm      hands cm     jump °       cost ×        ms");
for (const [key, st] of stats) {
  const f = (xs: number[], d = 1) => `${q(xs, 0.5).toFixed(d).padStart(5)} /${q(xs, 0.9).toFixed(d).padStart(6)}`;
  console.log(`${key.padEnd(16)} ${String(st.cleanN).padStart(3)}/${String(test.length).padEnd(4)} ${f(st.clip)}  ${f(st.gap)}  ${f(st.jump, 0)}  ${f(st.ratio, 2)}  ${f(st.ms, 0)}`);
}
