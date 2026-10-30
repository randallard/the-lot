/**
 * 🧪 Solve and bake one couple's Star Thru (2026-10-29): the man (beau) and woman (belle) of a facing
 * pair, on the engine's paths (`figurePaths` "star-thru"), from the arch's starting shape
 * (`starThruMove`). Held only: CALLERLAB's Star Thru has no break. Goes straight to
 * `src/dance/baked/star-thru.<beau>-<belle>.json`, which every floor then draws.
 *
 *   npx vite-node scripts/whole-move/bake-star-thru.ts <beau> <belle> [--tries=4] [--targets=<bundle>] [--target-weight=1]
 *
 * Margin 6 cm, as the twirl's held bakes. Prints one line.
 *
 * `--targets` (2026-10-29, step 6): Ryan's keyframes, a `#review2` 📂 export. The `star-thru`
 * figure's timeline for this pairing is folded as `#review2` folds it (general, then the pairing's
 * own overrides), and each dial he **set** pulls the solve toward his value at that moment, as
 * `solve.ts` does for the twirl. A locked pairing's pull is 10×. Soft: clearance and held hands still
 * win. All 25 on one bundle:
 *
 *   for a in ember myco player ryan sprout; do for b in ember myco player ryan sprout; do
 *     npx vite-node scripts/whole-move/bake-star-thru.ts $a $b --targets=star-thru.keyframes.json; done; done
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getBodyShape } from "../../src/services/body-shapes";
import { BAKE_FORMAT, bodyPrint, relativeKeyframes, REVIEW2_SIZING, type BakedTrack } from "../../src/dance/baked-tracks";
import { figurePaths } from "../../src/dance/engine-paths";
import { fromBundle, lockedBehind, pairingTimeline, reduce, timelinesOf } from "../../src/dance/pose-events";
import { bodyOf, metrics, SCHEDULE, solveBest, targetsFromKeyframes, toDials, WEIGHTS } from "../../src/dance/whole-move";
import { starThruMove } from "../../src/dance/whole-move-star-thru";

const args = process.argv.slice(2);
const [a, b] = args.filter((x) => !x.startsWith("--"));
if (a === undefined || b === undefined) throw new Error("usage: bake-star-thru.ts <beau> <belle> [--tries=4] [--targets=<bundle>] [--target-weight=1]");
const flag = (name: string) => args.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const tries = Number(flag("tries") ?? SCHEDULE.tries);
const targetsFile = flag("targets");
const targetWeight = Number(flag("target-weight") ?? 1);
if (!Number.isFinite(targetWeight) || targetWeight < 0) throw new Error(`bad --target-weight: ${String(flag("target-weight"))}`);
const shapes = [getBodyShape(a), getBodyShape(b)] as const;
const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
const weights = { ...WEIGHTS, margin: 0.06 };
const here = dirname(new URL(import.meta.url).pathname);
const pairing = `${a}-${b}`;

const paths = figurePaths("star-thru", "pair", shapes, REVIEW2_SIZING);
// Ryan's keyframes, if given: the ones with dials he set.
const LOCKED_WEIGHT = 10;
let his: { t: number; values: Readonly<Record<string, number>>; setKeys: readonly string[]; weight: number }[] = [];
if (targetsFile !== undefined) {
  const parsed = fromBundle(readFileSync(targetsFile, "utf8"));
  if ("error" in parsed) throw new Error(`${targetsFile}: ${parsed.error}`);
  const tl = timelinesOf(reduce(parsed.events), "star-thru");
  const locked = tl.locked.has(pairing) || lockedBehind(tl, pairing);
  his = pairingTimeline(tl, pairing)
    .filter((p) => p.source !== "hidden" && p.keyframe.setKeys.length > 0)
    .map((p) => ({ ...p.keyframe, weight: targetWeight * (locked ? LOCKED_WEIGHT : 1) }));
}
const { targets, unused } = targetsFromKeyframes(his, paths.beau.length);
const { move, path, start } = starThruMove(paths, bodies, targets);
const r = solveBest({ ...move, frames: start }, { weights }, tries);
const m = metrics(move, r.frames, path);
const n = r.frames.length;
const absolute = r.frames.map((f, i) => ({ t: Math.round((i / (n - 1)) * 1000) / 1000, values: { ...toDials(f[0], 0), ...toDials(f[1], 1) } }));
const bake: BakedTrack = {
  format: BAKE_FORMAT,
  version: 1,
  call: "star-thru",
  pairing,
  bodies: [bodyPrint(shapes[0]), bodyPrint(shapes[1])],
  note: `bake-star-thru.ts${targetsFile === undefined ? "" : `, ${String(his.length)} keyframe(s) as targets`}, cost ${r.cost.toFixed(0)}, clip ${(m.clip * 100).toFixed(1)} cm, hands ${(m.holdGap * 100).toFixed(1)} cm, jump ${m.jump.toFixed(0)}°, baked ${new Date().toISOString().slice(0, 10)}`,
  sizing: REVIEW2_SIZING,
  grow: "meet",
  stretch: Math.round(m.stretch * 100) / 100,
  clean: m.clip <= 0.005 && m.holdGap <= 0.02,
  keyframes: relativeKeyframes(absolute, [paths.beau, paths.belle]),
};
writeFileSync(join(here, "../../src/dance/baked", `star-thru.${pairing}.json`), JSON.stringify(bake, null, 1) + "\n");
console.log(`${pairing.padEnd(14)} cost ${r.cost.toFixed(0).padStart(5)}  clip ${(m.clip * 100).toFixed(1)} cm (${m.clipAt})  hands ${(m.holdGap * 100).toFixed(1)} cm  stretch ${m.stretch.toFixed(2)}  jump ${m.jump.toFixed(0)}° (${m.jumpAt})  step ${(m.step * 100).toFixed(0)} cm  grow ${(m.grow[0] * 100).toFixed(0)}/${(m.grow[1] * 100).toFixed(0)} cm`);
if (unused.length > 0) console.log(`  not solver variables, left out: ${unused.join(", ")}`);
