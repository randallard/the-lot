/**
 * 🧪 The whole-move test run (2026-10-24): solve the California Twirl for one pairing and write
 * the result as a `#review2` bundle (📂 load). Brief:
 * `work/square-dance-planning/briefs/solve-the-whole-move.md`.
 *
 *   npx vite-node scripts/whole-move/solve.ts [paths.json] [iterations] [--margin=0.06]
 *     [--targets=<bundle.json>] [--target-weight=1] [--out=<file>]
 *
 * `--targets` (2026-10-26) steers the solve by Ryan's keyframes: a `#review2` 📂 export (or any
 * bundle). The pairing's timeline is folded as `#review2` folds it, and each dial he **set** pulls
 * the solve toward his value at that moment (a locked pairing's pull 10×). Soft: clearance and held
 * hands still win, and the run reports how close it got to each one. `--target-weight` scales the
 * pull. In the bundle written, the solve's keyframes mark nothing as set, so his stay
 * distinguishable. At a moment where he has a keyframe, his set dials are kept as he set them.
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
import { fromBundle, lockedBehind, pairingTimeline, reduce, timelinesOf, toBundle, makeEvent, type Keyframe, type PoseEvent } from "../../src/dance/pose-events";
import {
  armPoints,
  bodyOf,
  metrics,
  restArm,
  segSeg,
  shapesOf,
  solve,
  startOnPath,
  targetsFromKeyframes,
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
const flag = (name: string) => flags.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const targetsFile = flag("targets");
const targetWeight = Number(flag("target-weight") ?? 1);
if (!Number.isFinite(targetWeight) || targetWeight < 0) throw new Error(`bad --target-weight: ${String(flag("target-weight"))}`);
const outFlag = flag("out");
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
// Ryan's keyframes, if given: the ones with dials he set.
const LOCKED_WEIGHT = 10;
let his: Keyframe[] = [];
let hisLocked = false;
if (targetsFile !== undefined) {
  const parsed = fromBundle(readFileSync(targetsFile, "utf8"));
  if ("error" in parsed) throw new Error(`${targetsFile}: ${parsed.error}`);
  const tl = timelinesOf(reduce(parsed.events), P.figure);
  hisLocked = tl.locked.has(P.pairing) || lockedBehind(tl, P.pairing);
  his = pairingTimeline(tl, P.pairing)
    .filter((p) => p.source !== "hidden" && p.keyframe.setKeys.length > 0)
    .map((p) => p.keyframe);
}
const { targets, unused } = targetsFromKeyframes(
  his.map((k) => ({ ...k, weight: targetWeight * (hisLocked ? LOCKED_WEIGHT : 1) })),
  frames.length,
);
if (targetsFile !== undefined) {
  console.log(`targets: ${String(his.length)} keyframe(s) with set dials${hisLocked ? " (locked: 10× pull)" : ""}, ${String(targets.length)} pulls`);
  if (unused.length > 0) console.log(`  not solver variables, left out: ${unused.join(", ")}`);
}

const move: Move = {
  bodies: [bodies[0], bodies[1]],
  frames,
  holds: [
    { from: 0, to: 3.5 / 4, beau: 1, belle: 0, plane },
    { from: 3.5 / 4 + 1e-6, to: 1, beau: 1, belle: 0 },
  ],
  ...(targets.length > 0 ? { targets } : {}),
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

// How close the solve came to each dial Ryan set (sampled where his keyframe sits).
if (his.length > 0) {
  const lerpF = (u: number): Frame => {
    const x = Math.min(1, Math.max(0, u)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(x));
    const f = x - i;
    const a = out[i]!;
    const b = out[i + 1]!;
    const l = (p: number, q: number) => p + (q - p) * f;
    const mixD = (p: DancerFrame, q: DancerFrame): DancerFrame => ({
      x: l(p.x, q.x),
      z: l(p.z, q.z),
      yaw: l(p.yaw, q.yaw),
      arms: [0, 1].map((side) => {
        const u = p.arms[side]!;
        const v = q.arms[side]!;
        return { raise: l(u.raise, v.raise), toward: l(u.toward, v.toward), ulen: l(u.ulen, v.ulen), pitch: l(u.pitch, v.pitch), heading: l(u.heading, v.heading), flen: l(u.flen, v.flen) };
      }) as DancerFrame["arms"],
    });
    return [mixD(a[0], b[0]), mixD(a[1], b[1])];
  };
  console.log("his keyframes, wanted → solved:");
  for (const k of his) {
    const f = lerpF(k.t);
    const got = { ...toDials(f[0], 0), ...toDials(f[1], 1) };
    const parts = k.setKeys.filter((key) => got[key] !== undefined && !unused.includes(key))
      .map((key) => `${key} ${String(k.values[key])} → ${String(got[key])}`);
    console.log(`  t=${k.t.toFixed(3)}  ${parts.join("  ·  ")}`);
  }
}

// The solve's keyframes mark nothing as set: they're what the solve shows, not what Ryan chose.
// Where he has a keyframe at the same moment, his set dials stay his, as he set them.
const hisAt = new Map(his.map((k) => [Math.round(k.t * 1000), k]));
const stamp = Date.now();
const events: PoseEvent[] = out.map((f, i) => {
  const t = Math.round((i / (n - 1)) * 1000) / 1000;
  const solved = { ...toDials(f[0], 0), ...toDials(f[1], 1) };
  const mine = hisAt.get(Math.round(t * 1000));
  const setKeys = mine?.setKeys ?? [];
  const values = { ...solved };
  for (const key of setKeys) if (mine?.values[key] !== undefined) values[key] = mine.values[key];
  return makeEvent(
    {
      kind: "keyframe-set",
      figure: P.figure,
      scope: { pairing: P.pairing },
      keyframe: { t, values, setKeys: [...setKeys] },
    },
    new Date(stamp + i),
  );
});
const outFile = outFlag ?? join(dirname(file), `${P.pairing}-${P.figure}.solved.json`);
writeFileSync(outFile, JSON.stringify(toBundle(events), null, 1));
console.log(`wrote ${outFile} (${String(events.length)} keyframes)`);
