/**
 * 🧪 The whole-move test run (2026-10-24): solve the California Twirl for one pairing and write
 * the result as a `#review2` bundle (📂 load). Brief:
 * `work/square-dance-planning/briefs/solve-the-whole-move.md`.
 *
 *   npx vite-node scripts/whole-move/solve.ts [paths.json] [iterations] [--margin=0.06]
 *
 * `--margin` is the clearance (m) every pair of shapes keeps beyond touching: arms round heads,
 * hands off bodies. It defaults to `WEIGHTS.margin` (2 cm), which left the hands brushing the
 * belle's head on playback (Ryan, 10-24).
 *
 * The floor paths are captured from the live `#review2` (see the fixture's `_note`). The arms
 * start at rest. The joined hands get a warm-start pull (between the two held shoulders, lifting
 * over the middle of the move) that fades out over the first 70% of the run, so what's left at
 * the end is the objective's own answer.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getBodyShape } from "../../src/services/body-shapes";
import { toBundle, makeEvent, type PoseEvent } from "../../src/dance/pose-events";
import {
  armPoints,
  bodyOf,
  metrics,
  restArm,
  segSeg,
  shapesOf,
  solve,
  startOnPath,
  toDials,
  toFloor,
  WEIGHTS,
  type DancerFrame,
  type Frame,
  type Move,
  type Vec,
} from "../../src/dance/whole-move";

interface PathFile {
  pairing: string;
  figure: string;
  shapes: [string, string];
  beau: { x: number; z: number; facing: number }[];
  belle: { x: number; z: number; facing: number }[];
}

const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const marginFlag = flags.find((a) => a.startsWith("--margin="));
const margin = marginFlag === undefined ? WEIGHTS.margin : Number(marginFlag.slice("--margin=".length));
if (!Number.isFinite(margin) || margin < 0) throw new Error(`bad --margin: ${String(marginFlag)}`);
const file = args[0] ?? join(dirname(new URL(import.meta.url).pathname), "ryan-ryan-twirl.paths.json");
const iterations = Number(args[1] ?? 1500);
const P = JSON.parse(readFileSync(file, "utf8")) as PathFile;
const bodies = [bodyOf(getBodyShape(P.shapes[0])), bodyOf(getBodyShape(P.shapes[1]))] as const;
const D2R = Math.PI / 180;

const frames: Frame[] = P.beau.map((b, i) => {
  const g = P.belle[i]!;
  return [
    { x: b.x / 100, z: b.z / 100, yaw: b.facing * D2R, arms: [restArm(bodies[0]), restArm(bodies[0])] },
    { x: g.x / 100, z: g.z / 100, yaw: g.facing * D2R, arms: [restArm(bodies[1]), restArm(bodies[1])] },
  ];
});
// Facing is unwrapped so the path doesn't jump ±360° between samples.
for (const k of [0, 1] as const) for (let i = 1; i < frames.length; i++) {
  const prev = frames[i - 1]![k].yaw;
  let y = frames[i]![k].yaw;
  while (y - prev > Math.PI) y -= 2 * Math.PI;
  while (y - prev < -Math.PI) y += 2 * Math.PI;
  frames[i]![k].yaw = y;
}

// The California Twirl: the beau's right holds the belle's left for the whole call (the arch
// span, then the ordinary handhold it releases into; square-one ADR-0026).
// The arch's plane: through the couple's midpoint at the start, along their facing (normal: the
// line between their spots). square-one declares the grip an arch for 0–3.5 of 4 beats; after
// that it's the ordinary handhold, still joined.
const f0 = frames[0]!;
const plane = {
  p: [(f0[0].x + f0[1].x) / 2, 0, (f0[0].z + f0[1].z) / 2] as Vec,
  n: (() => { const dx = f0[1].x - f0[0].x; const dz = f0[1].z - f0[0].z; const l = Math.hypot(dx, dz); return [dx / l, 0, dz / l] as Vec; })(),
};
const move: Move = {
  bodies: [bodies[0], bodies[1]],
  frames,
  holds: [
    { from: 0, to: 3.5 / 4, beau: 1, belle: 0, plane },
    { from: 3.5 / 4 + 1e-6, to: 1, beau: 1, belle: 0 },
  ],
};

const n = frames.length;
const crown = bodies[1].head.c[1] + bodies[1].head.r;
const guide = (i: number): Vec => {
  const f = frames[i]!;
  const sb = toFloor(armPoints(bodies[0], 1, restArm(bodies[0])).s, f[0]);
  const sg = toFloor(armPoints(bodies[1], 0, restArm(bodies[1])).s, f[1]);
  const t = i / (n - 1);
  const low = 0.6;
  const top = crown + bodies[1].handR + 0.05;
  return [(sb[0] + sg[0]) / 2, low + (top - low) * Math.sin(Math.PI * t), (sb[2] + sg[2]) / 2];
};

// The start: held hands on the guide arc (two-bone IK, elbows out). Then no guide at all.
const start = startOnPath(move, guide);
console.log("start:", JSON.stringify(metrics(move, start, frames)));
const t0 = Date.now();
console.log(`margin ${(margin * 100).toFixed(1)} cm`);
const { frames: out, cost } = solve({ ...move, frames: start }, {
  iterations,
  weights: { ...WEIGHTS, margin },
  onProgress: (it, c) => { if (it % 250 === 0) console.log(`  it ${String(it)}  cost ${c.toFixed(2)}`); },
});
const m = metrics(move, out, frames);
console.log(`solved in ${((Date.now() - t0) / 1000).toFixed(1)} s, cost ${cost.toFixed(2)}`);
console.log(JSON.stringify(m, null, 1));

// How close anything comes to either head: on the samples, and halfway between them, since
// playback eases from one keyframe to the next and a pose between two clean samples can clip.
const lerp = (a: number, b: number) => (a + b) / 2;
const mid = (a: DancerFrame, b: DancerFrame): DancerFrame => ({
  x: lerp(a.x, b.x),
  z: lerp(a.z, b.z),
  yaw: lerp(a.yaw, b.yaw),
  arms: [0, 1].map((s) => {
    const p = a.arms[s]!;
    const q = b.arms[s]!;
    return { raise: lerp(p.raise, q.raise), toward: lerp(p.toward, q.toward), ulen: lerp(p.ulen, q.ulen), pitch: lerp(p.pitch, q.pitch), heading: lerp(p.heading, q.heading), flen: lerp(p.flen, q.flen) };
  }) as DancerFrame["arms"],
});
const headGap = (f: Frame) => {
  const S = [shapesOf(bodies[0], f[0]), shapesOf(bodies[1], f[1])];
  let best = Infinity;
  let at = "";
  S.forEach((own, k) => {
    const head = own.find((s) => s.name === "head")!;
    for (const other of [...own.slice(2), ...S[1 - k]!.slice(2)]) {
      const gap = segSeg(head.a, head.b, other.a, other.b) - head.r - other.r;
      if (gap < best) { best = gap; at = `${k === 0 ? "beau" : "belle"} head / ${own.includes(other) ? "own" : "partner's"} ${other.name}`; }
    }
  });
  return { gap: best, at };
};
const report = (label: string, fs: Frame[], ts: number[]) => {
  let worst = { gap: Infinity, at: "", t: 0 };
  fs.forEach((f, i) => { const g = headGap(f); if (g.gap < worst.gap) worst = { ...g, t: ts[i]! }; });
  console.log(`closest to a head (${label}): ${(worst.gap * 100).toFixed(1)} cm at t=${worst.t.toFixed(3)} (${worst.at})`);
};
report("samples", out, out.map((_, i) => i / (n - 1)));
report("halfway between", out.slice(1).map((f, i) => [mid(out[i]![0], f[0]), mid(out[i]![1], f[1])] as Frame), out.slice(1).map((_, i) => (i + 0.5) / (n - 1)));

// Where the joined hands are over the move, for the write-up.
const rows = out.map((f, i) => {
  const hb = toFloor(armPoints(bodies[0], 1, f[0].arms[1]).h, f[0]);
  const g = f[1];
  const apart = Math.hypot(f[0].x - g.x, f[0].z - g.z);
  const was = Math.hypot(frames[i]![0].x - g.x, frames[i]![0].z - g.z);
  return `t=${(i / (n - 1)).toFixed(3)} beat ${(4 * i / (n - 1)).toFixed(1)}  hands y ${hb[1].toFixed(2)} at (${hb[0].toFixed(2)}, ${hb[2].toFixed(2)})  belle at (${g.x.toFixed(2)}, ${g.z.toFixed(2)})  apart ${apart.toFixed(2)} (floor ${was.toFixed(2)})`;
});
console.log(rows.filter((_, i) => i % 4 === 0).join("\n"));

const stamp = Date.now();
const events: PoseEvent[] = out.map((f, i) => {
  const values = { ...toDials(f[0], 0), ...toDials(f[1], 1) };
  return makeEvent(
    {
      kind: "keyframe-set",
      figure: P.figure,
      scope: { pairing: P.pairing },
      keyframe: { t: Math.round((i / (n - 1)) * 1000) / 1000, values, setKeys: Object.keys(values) },
    },
    new Date(stamp + i),
  );
});
const outFile = join(dirname(file), `${P.pairing}-${P.figure}.solved.json`);
writeFileSync(outFile, JSON.stringify(toBundle(events), null, 1));
console.log(`wrote ${outFile} (${String(events.length)} keyframes)`);
