/**
 * 🧪 Training data for a twirl pose model (2026-10-26, step 3). For each sample index in
 * [from, to): two bodies (`samplePair`: the 25 stock pairings first, then blends around the cast),
 * their paths from the engine (`couplePaths`, as `#review2` draws them), and the whole move solved
 * (`solveBest`, 6 cm margin, the `SCHEDULE`). One JSON line per sample.
 *
 *   npx vite-node scripts/whole-move/dataset.ts <from> <to> <out.jsonl>
 *
 * Run several over disjoint ranges to use the cores; each solve is about 5.5 s (best of 4).
 */

import { appendFileSync } from "node:fs";
import { REVIEW2_SIZING } from "../../src/dance/baked-tracks";
import { samplePair } from "../../src/dance/body-sample";
import { couplePaths } from "../../src/dance/engine-paths";
import { bodyOf, metrics, solveBest, WEIGHTS } from "../../src/dance/whole-move";
import { twirlMove } from "../../src/dance/whole-move-twirl";

const [fromArg, toArg, out] = process.argv.slice(2);
if (fromArg === undefined || toArg === undefined || out === undefined) throw new Error("usage: dataset.ts <from> <to> <out.jsonl>");
const weights = { ...WEIGHTS, margin: 0.06 };

for (let k = Number(fromArg); k < Number(toArg); k++) {
  const t0 = Date.now();
  const { shapes, label } = samplePair(k);
  const paths = couplePaths("california-twirl", shapes, REVIEW2_SIZING);
  const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
  const { move, path, start } = twirlMove({ pairing: label, figure: "california-twirl", shapes: ["", ""], beau: paths.beau, belle: paths.belle }, bodies);
  const r = solveBest({ ...move, frames: start }, { weights });
  const m = metrics(move, r.frames, path);
  appendFileSync(out, JSON.stringify({
    k,
    label,
    shapes,
    paths: { beau: paths.beau, belle: paths.belle },
    cost: r.cost,
    costs: r.costs,
    seed: r.seed,
    metrics: m,
    v: Array.from(r.v, (x) => Math.round(x * 1e6) / 1e6),
    ms: Date.now() - t0,
  }) + "\n");
  console.log(`${String(k)} ${label}: cost ${r.cost.toFixed(1)} clip ${(m.clip * 100).toFixed(1)} cm, jump ${m.jump.toFixed(0)}°, ${String(Date.now() - t0)} ms`);
}
