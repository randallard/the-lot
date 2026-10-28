/**
 * 🧪 Solve and bake Right and Left Thru for four dancers (2026-10-28): the N-dancer solve
 * (`whole-move-n.ts`) on the-lot's own paths (`whole-move-rlt.ts`), written to
 * `src/dance/baked-four/` for `#review2` (`baked-four.ts`).
 *
 *   npx vite-node scripts/whole-move/bake-four.ts                 # all 25 review pairings
 *   npx vite-node scripts/whole-move/bake-four.ts <beau> <belle>  # one pairing
 *
 * A pairing's set is that couple twice — beau, belle, beau, belle — which is what `#review2`'s
 * pairing list means for a four-dancer figure. ≈3.5 s a set. Prints one line per bake.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getBodyShape } from "../../src/services/body-shapes";
import { bodyPrint } from "../../src/dance/baked-tracks";
import { encodeRows, FOUR_FORMAT, fourFileName, type FourBake } from "../../src/dance/baked-four";
import { reviewPairings } from "../../src/dance/review-route";
import { metricsN, solveN } from "../../src/dance/whole-move-n";
import { rightAndLeftThru } from "../../src/dance/whole-move-rlt";

const PER_BEAT = 10;
const [a, b] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const pairings = a !== undefined && b !== undefined ? [{ beau: a, belle: b }] : reviewPairings();
const out = join(dirname(new URL(import.meta.url).pathname), "../../src/dance/baked-four");

for (const p of pairings) {
  const cast = [p.beau, p.belle, p.beau, p.belle];
  const shapes = cast.map((id) => getBodyShape(id));
  const move = rightAndLeftThru(shapes, { perBeat: PER_BEAT });
  const t0 = performance.now();
  const r = solveN(move, { iterations: 3000 });
  const m = metricsN(move, r.v);
  const s = ((performance.now() - t0) / 1000).toFixed(1);
  const score = `clip ${(m.clip * 100).toFixed(1)} cm, hands ${(m.holdGap * 100).toFixed(1)} cm, jump ${m.jump.toFixed(0)}°, step ${(m.step * 100).toFixed(0)} cm`;
  const bake: FourBake = {
    format: FOUR_FORMAT,
    version: 1,
    call: "right-and-left-thru",
    cast,
    bodies: shapes.map(bodyPrint),
    perBeat: PER_BEAT,
    note: `bake-four.ts, cost ${r.cost.toFixed(0)}, ${score}, baked ${new Date().toISOString().slice(0, 10)}`,
    rows: encodeRows(r.frames),
  };
  const file = fourFileName(bake.call, cast);
  writeFileSync(join(out, file), JSON.stringify(bake));
  console.log(`${file}  ${score}  ${s} s`);
}
