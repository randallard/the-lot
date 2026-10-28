/**
 * 🧪 Step 4 (2026-10-27): one stock couple's twirl with free ends and with the ends pinned to the
 * floor's standing couple (`standingTargets`). Prints the metrics and how far each end's arms sit
 * from the standing pose, and the seam between the call's last and first samples (two twirls back
 * to back).
 *
 *   npx vite-node scripts/whole-move/try-home.ts <beau> <belle> [meet|break]
 */

import { getBodyShape } from "../../src/services/body-shapes";
import { REVIEW2_SIZING, BREAK_SIZING } from "../../src/dance/baked-tracks";
import { couplePaths } from "../../src/dance/engine-paths";
import { bodyOf, metrics, shapesOf, solveBest, WEIGHTS, type Frame } from "../../src/dance/whole-move";
import { standingFrame, twirlMove } from "../../src/dance/whole-move-twirl";

const [a = "ryan", b = "ryan", style = "meet"] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const shapes = [getBodyShape(a), getBodyShape(b)] as const;
const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
const broken = style === "break";
const paths = couplePaths("california-twirl", shapes, broken ? BREAK_SIZING : REVIEW2_SIZING);
const P = { pairing: `${a}-${b}`, figure: "california-twirl", shapes: [a, b] as [string, string], beau: paths.beau, belle: paths.belle };
const R2D = 180 / Math.PI;
const wrap = (d: number) => Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * R2D;
/** The worst angle between two frames' arms, degrees, and the beau's step, cm. */
const apart = (f: Frame, g: Frame): string => {
  let worst = 0;
  for (const k of [0, 1] as const) for (const s of [0, 1] as const) for (const key of ["raise", "toward", "pitch", "heading"] as const) {
    worst = Math.max(worst, wrap(f[k].arms[s][key] - g[k].arms[s][key]));
  }
  const step = Math.hypot(f[0].x - g[0].x, f[0].z - g[0].z) * 100;
  return `${worst.toFixed(0).padStart(3)}° step ${step.toFixed(1)} cm`;
};

for (const home of [false, true]) {
  const { move, path, start } = twirlMove(P, bodies, [], broken ? "none" : "meet", broken ? "break" : "reshape", home ? shapes : undefined);
  const r = solveBest({ ...move, frames: start }, { weights: { ...WEIGHTS, margin: Number(process.argv.find((x) => x.startsWith("--margin="))?.slice(9) ?? 0.06) } });
  const m = metrics(move, r.frames, path);
  const n = r.frames.length;
  const first = r.frames[0]!;
  const last = r.frames[n - 1]!;
  const s0 = standingFrame(shapes, bodies, path[0]!);
  const s1 = standingFrame(shapes, bodies, path[n - 1]!);
  console.log(`${home ? "home" : "free"}  cost ${r.cost.toFixed(0).padStart(5)}  clip ${(m.clip * 100).toFixed(1)} cm  hands ${(m.holdGap * 100).toFixed(1)} cm  stretch ${m.stretch.toFixed(2)}  jump ${m.jump.toFixed(0)}°  | start vs standing ${apart(first, s0)}  end vs standing ${apart(last, s1)}  | seam (end→start) ${apart(last, first).replace(/ step.*/, "")}`);
}

// Where the hands open and the arms jump, per sample (--trace).
if (process.argv.includes("--trace")) {
  const { move, start } = twirlMove(P, bodies, [], broken ? "none" : "meet", broken ? "break" : "reshape", shapes);
  const r = solveBest({ ...move, frames: start }, { weights: { ...WEIGHTS, margin: Number(process.argv.find((x) => x.startsWith("--margin="))?.slice(9) ?? 0.06) } });
  r.frames.forEach((f, i) => {
    const hb = shapesOf(bodies[0], f[0]).find((s) => s.name === "hand-right")!.a;
    const hg = shapesOf(bodies[1], f[1]).find((s) => s.name === "hand-left")!.a;
    const d = Math.hypot(hb[0] - hg[0], hb[1] - hg[1], hb[2] - hg[2]) * 100;
    const prev = r.frames[i - 1];
    console.log(`${String(i).padStart(2)} hands ${d.toFixed(1).padStart(5)} cm  height ${(hb[1] * 100).toFixed(0).padStart(4)}  jump ${prev ? apart(prev, f) : "-"}`);
  });
}
