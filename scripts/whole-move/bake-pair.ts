/**
 * 🧪 Solve and bake one couple's California Twirl both ways the floor can draw it (2026-10-27):
 * held, with the torsos meeting in the middle (a reach when the arms stretch past `REACH_LIMIT`),
 * and a break. No bundle in between: the solve goes straight to `src/dance/baked/`.
 *
 *   npx vite-node scripts/whole-move/bake-pair.ts <beau> <belle> [meet|duck] [--only=held|break]
 *
 * Writes `california-twirl.<beau>-<belle>.<style>.json` (with the solve's worst `stretch`, which
 * decides whether the floor tosses for it) and `california-twirl.<beau>-<belle>.break.json`.
 * Paths come from the engine (`couplePaths`), sized as `#review2` sizes each accommodation. Margin
 * 6 cm, best of 4 seeds. Prints one line per bake.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getBodyShape } from "../../src/services/body-shapes";
import { BAKE_FORMAT, BREAK_SIZING, bodyPrint, relativeKeyframes, REVIEW2_SIZING, type BakedTrack } from "../../src/dance/baked-tracks";
import { couplePaths } from "../../src/dance/engine-paths";
import { bodyOf, metrics, solveBest, toDials, WEIGHTS, type GrowStyle } from "../../src/dance/whole-move";
import { twirlMove } from "../../src/dance/whole-move-twirl";

const args = process.argv.slice(2);
const [a, b, style = "meet"] = args.filter((x) => !x.startsWith("--"));
if (a === undefined || b === undefined) throw new Error("usage: bake-pair.ts <beau> <belle> [meet|duck] [--only=held|break]");
if (style !== "meet" && style !== "duck") throw new Error(`bad style: ${style}`);
const only = args.find((x) => x.startsWith("--only="))?.slice(7);
const shapes = [getBodyShape(a), getBodyShape(b)] as const;
const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
const weights = { ...WEIGHTS, margin: 0.06 };
const here = dirname(new URL(import.meta.url).pathname);
const pairing = `${a}-${b}`;

for (const broken of [false, true]) {
  if (only === "held" && broken) continue;
  if (only === "break" && !broken) continue;
  const sizing = broken ? BREAK_SIZING : REVIEW2_SIZING;
  const paths = couplePaths("california-twirl", shapes, sizing);
  const { move, path, start } = twirlMove(
    { pairing, figure: "california-twirl", shapes: [a, b], beau: paths.beau, belle: paths.belle },
    bodies, [], broken ? "none" : (style as GrowStyle), broken ? "break" : "reshape",
  );
  const r = solveBest({ ...move, frames: start }, { weights });
  const m = metrics(move, r.frames, path);
  const n = r.frames.length;
  const absolute = r.frames.map((f, i) => ({ t: Math.round((i / (n - 1)) * 1000) / 1000, values: { ...toDials(f[0], 0), ...toDials(f[1], 1) } }));
  const name = broken ? "break" : style;
  const bake: BakedTrack = {
    format: BAKE_FORMAT,
    version: 1,
    call: "california-twirl",
    pairing,
    bodies: [bodyPrint(shapes[0]), bodyPrint(shapes[1])],
    note: `bake-pair.ts ${name}, cost ${r.cost.toFixed(0)}, clip ${(m.clip * 100).toFixed(1)} cm, hands ${(m.holdGap * 100).toFixed(1)} cm, jump ${m.jump.toFixed(0)}°, baked ${new Date().toISOString().slice(0, 10)}`,
    sizing,
    ...(broken ? {} : { grow: style, stretch: Math.round(m.stretch * 100) / 100, clean: m.clip <= 0.005 && m.holdGap <= 0.02 }),
    keyframes: relativeKeyframes(absolute, [paths.beau, paths.belle]),
  };
  const out = join(here, "../../src/dance/baked", `california-twirl.${pairing}.${name}.json`);
  writeFileSync(out, JSON.stringify(bake, null, 1) + "\n");
  console.log(`${pairing.padEnd(14)} ${name.padEnd(5)} cost ${r.cost.toFixed(0).padStart(5)}  clip ${(m.clip * 100).toFixed(1)} cm  hands ${(m.holdGap * 100).toFixed(1)} cm  stretch ${m.stretch.toFixed(2)}  jump ${m.jump.toFixed(0)}°  step ${(m.step * 100).toFixed(0)} cm  grow ${(m.grow[0] * 100).toFixed(0)}/${(m.grow[1] * 100).toFixed(0)} cm`);
}
