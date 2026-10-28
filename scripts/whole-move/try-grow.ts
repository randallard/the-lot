/**
 * 🧪 One stock couple's twirl, solved in each growth style (2026-10-27, step 3b), with what came out.
 *
 *   npx vite-node scripts/whole-move/try-grow.ts <beau> <belle> [none,meet,duck,break] [--grow-weight=4] [--break-hold=]
 *
 * `break` (10-27): the floor's break paths, the hands reaching but not owed contact.
 */
import { getBodyShape } from "../../src/services/body-shapes";
import { REVIEW2_SIZING } from "../../src/dance/baked-tracks";
import { couplePaths } from "../../src/dance/engine-paths";
import { bodyOf, metrics, shapesOf, solveBest, WEIGHTS, type GrowStyle } from "../../src/dance/whole-move";
import { twirlMove } from "../../src/dance/whole-move-twirl";
import { BREAK_SIZING } from "../../src/dance/baked-tracks";

const args = process.argv.slice(2);
const [a = "ryan", b = "ryan", styles = "none,meet,duck"] = args.filter((x) => !x.startsWith("--"));
const gw = Number(args.find((x) => x.startsWith("--grow-weight="))?.split("=")[1] ?? WEIGHTS.grow);
const shapes = [getBodyShape(a), getBodyShape(b)] as const;
const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
const breakHold = args.find((x) => x.startsWith("--break-hold="))?.split("=")[1];
for (const style of styles.split(",") as (GrowStyle | "break")[]) {
  const t0 = Date.now();
  const broken = style === "break";
  const paths = couplePaths("california-twirl", shapes, broken ? BREAK_SIZING : REVIEW2_SIZING);
  const { move, path, start } = twirlMove({ pairing: `${a}-${b}`, figure: "california-twirl", shapes: ["", ""], beau: paths.beau, belle: paths.belle }, bodies, [], broken ? "none" : style, broken ? "break" : "reshape");
  if (breakHold !== undefined) for (const h of move.holds) if (h.weight !== undefined) h.weight = Number(breakHold);
  const r = solveBest({ ...move, frames: start }, { weights: { ...WEIGHTS, margin: 0.06, grow: gw } });
  const m = metrics(move, r.frames, path);
  const cm = (x: number) => (x * 100).toFixed(1);
  const gaps = r.frames.map((f) => {
    const A = shapesOf(bodies[0], f[0]).find((x) => x.name === "hand-right");
    const B = shapesOf(bodies[1], f[1]).find((x) => x.name === "hand-left");
    return A && B ? Math.hypot(A.a[0] - B.a[0], A.a[1] - B.a[1], A.a[2] - B.a[2]) : 0;
  });
  if (broken) console.log(`   hands apart: min ${cm(Math.min(...gaps))}, median ${cm([...gaps].sort((x, y) => x - y)[20] ?? 0)}, max ${cm(Math.max(...gaps))} cm`);
  console.log(`${a}-${b} ${style.padEnd(5)} cost ${r.cost.toFixed(0).padStart(6)} clip ${cm(m.clip)} cm, hands ${cm(m.holdGap)} cm, stretch ${m.stretch.toFixed(2)}, jump ${m.jump.toFixed(0)}°, step ${cm(m.step)} cm, grow beau ${cm(m.grow[0])} / belle ${cm(m.grow[1])} cm (heights ${cm(bodies[0].rise.height)} / ${cm(bodies[1].rise.height)}), ${String(Date.now() - t0)} ms`);
}
