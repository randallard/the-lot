/**
 * 🧪 The pull-by, looked at (2026-10-28): solve Right and Left Thru for one pairing's set and print,
 * every 0.2 beat of the pull-by, the right hands' gap and height for each passing pair.
 *
 *   npx vite-node scripts/whole-move/try-pullby.ts <beau> <belle> [pullReach] [pullAfter]
 */
import { getBodyShape } from "../../src/services/body-shapes";
import { armPoints, toFloor } from "../../src/dance/whole-move";
import { metricsN, solveN } from "../../src/dance/whole-move-n";
import { rightAndLeftThru } from "../../src/dance/whole-move-rlt";

const [beau = "ryan", belle = "ryan", reach, after] = process.argv.slice(2);
const shapes = [beau, belle, beau, belle].map((id) => getBodyShape(id));
const move = rightAndLeftThru(shapes, {
  ...(reach !== undefined ? { pullReach: Number(reach) } : {}),
  ...(after !== undefined ? { pullAfter: Number(after) } : {}),
});
const n = move.frames.length;
for (const h of move.holds.slice(0, 2)) console.log(`hold ${String(h.a.dancer)}→${"side" in h.b ? String(h.b.dancer) : "back"} beats ${(h.from * (n - 1) / 10).toFixed(1)}–${(h.to * (n - 1) / 10).toFixed(1)} at ${((h.height ?? 0) * 100).toFixed(0)} cm`);
const r = solveN(move, { iterations: 3000 });
const m = metricsN(move, r.v);
console.log(`cost ${r.cost.toFixed(0)}, clip ${(m.clip * 100).toFixed(1)} cm, hands ${(m.holdGap * 100).toFixed(1)} cm (${m.holdAt}), jump ${m.jump.toFixed(0)}° (${m.jumpAt}), step ${(m.step * 100).toFixed(0)} cm`);
const b = move.bodies;
const hand = (d: number, i: number) => toFloor(armPoints(b[d]!, 1, r.frames[i]![d]!.arms[1]).h, r.frames[i]![d]!);
const cm = (x: number) => (x * 100).toFixed(0).padStart(4);
for (let i = 0; i <= 36; i += 2) {
  const row = [[0, 3], [1, 2]].map(([p, q]) => {
    const hp = hand(p!, i), hq = hand(q!, i);
    return `gap ${cm(Math.hypot(hp[0] - hq[0], hp[1] - hq[1], hp[2] - hq[2]))} y ${cm(hp[1])}${cm(hq[1])}`;
  });
  console.log((i / 10).toFixed(1).padStart(4), row.join("  |  "));
}
// Where each dancer steps off their path most.
for (let d = 0; d < 4; d++) {
  let best = 0, at = 0;
  for (let i = 0; i < n; i++) {
    const o = (i * 4 + d) * 14;
    const s = Math.hypot(r.v[o + 12]!, r.v[o + 13]!);
    if (s > best) [best, at] = [s, i];
  }
  const o = (at * 4 + d) * 14;
  console.log(`dancer ${String(d)} steps ${cm(best)} cm at beat ${(at / 10).toFixed(1)} (x ${cm(r.v[o + 12]!)}, z ${cm(r.v[o + 13]!)})`);
}
