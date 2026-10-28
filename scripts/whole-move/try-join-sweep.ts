/**
 * 🧪 The join between two twirls (`joinChain`), on all 25 stock couples: the held hands' gap and
 * any clipping over the last beat of the first twirl and the join (10-27: sprout → sprout's hands
 * opened 3.4 cm there). Prints each couple and the gaps' sum.
 *
 *   npx vite-node scripts/whole-move/try-join-sweep.ts
 */

import { getBodyShape } from "../../src/services/body-shapes";
import { BAKED_TRACKS, chooseBake, REVIEW2_SIZING, stepToCouple } from "../../src/dance/baked-tracks";
import { couplePaths } from "../../src/dance/engine-paths";
import { joinChain } from "../../src/dance/chain-join";
import { bodyOf, fromDials, metrics, type Frame } from "../../src/dance/whole-move";

const cast = ["player", "ryan", "myco", "ember", "sprout"];
const D2R = Math.PI / 180;
let sum = 0;
for (const a of cast) for (const b of cast) {
  const shapes = [getBodyShape(a), getBodyShape(b)] as const;
  const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
  const bake = chooseBake(BAKED_TRACKS, "california-twirl", shapes, { grow: "meet", called: "reshape", draw: () => "reshape" });
  if (bake === undefined) { console.log(`${a} → ${b}: no bake`); continue; }
  const paths = couplePaths("california-twirl", shapes, bake.sizing ?? REVIEW2_SIZING);
  const [t] = joinChain([{ bake, paths }, { bake, paths }], shapes);
  const n = t!.keyframes.length;
  const frames: Frame[] = [];
  for (let i = n - 11; i < n; i++) {
    const v = t!.keyframes[i]!.values;
    const p = [paths.beau[i]!, paths.belle[i]!] as const;
    const [sx, sz] = stepToCouple(v["0.offset.x"] ?? 0, v["0.offset.z"] ?? 0, p[0].facing * D2R);
    frames.push(([0, 1] as const).map((d) => ({
      ...fromDials(v, d, bodies[d]),
      x: p[d].x / 100 + (d === 0 ? sx / 100 : 0),
      z: p[d].z / 100 + (d === 0 ? sz / 100 : 0),
      yaw: p[d].facing * D2R,
    })) as unknown as Frame);
  }
  const m = metrics({ bodies, frames, holds: [{ from: 0, to: 1, beau: 1, belle: 0 }] }, frames);
  sum += m.holdGap;
  console.log(`${a.padEnd(7)}→ ${b.padEnd(7)} hands ${(m.holdGap * 100).toFixed(1)} cm  clip ${(m.clip * 100).toFixed(1)} cm`);
}
console.log(`sum of gaps ${(sum * 100).toFixed(1)} cm`);
