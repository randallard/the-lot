/**
 * 🧪 Bake a solved pairing for every `DanceFloor` (2026-10-25). Reads a `#review2` bundle (what
 * `solve.ts` writes, or a 📂 export) and the engine paths it was solved on, and writes
 * `src/dance/baked/<call>.<pairing>.json`. See `src/dance/baked-tracks.ts`.
 *
 *   npx vite-node scripts/whole-move/bake.ts [bundle.json] [paths.json] [--grow=meet|duck]
 *
 * `--grow` (10-27) records the style the solve changed heights in (`solve.ts --grow`), so a floor
 * can pick it, and names the file `<call>.<pairing>.<style>.json`.
 * Defaults: the ryan → ryan twirl's bundle and paths, beside this script. The bake records the
 * sizing the paths were captured under (`REVIEW2_SIZING`: what `#review2` draws) and the engine's
 * gap at each keyframe, so every floor walks those paths and checks it is. The pairing's timeline
 * is folded as `#review2` folds it (`reduce`, `pairingTimeline`: newest keyframe at each moment
 * wins, a locked pairing gives its locked timeline); hidden keyframes are left out.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getBodyShape } from "../../src/services/body-shapes";
import { fromBundle, pairingTimeline, reduce, timelinesOf } from "../../src/dance/pose-events";
import { BAKE_FORMAT, bodyPrint, relativeKeyframes, REVIEW2_SIZING, type BakedTrack, type PathSample } from "../../src/dance/baked-tracks";
import { REVIEW_FIGURES } from "../../src/dance/review-steps";

interface PathFile {
  pairing: string;
  figure: string;
  shapes: [string, string];
  beau: PathSample[];
  belle: PathSample[];
}

const here = dirname(new URL(import.meta.url).pathname);
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const grow = process.argv.find((a) => a.startsWith("--grow="))?.slice(7);
if (grow !== undefined && grow !== "meet" && grow !== "duck") throw new Error(`bad --grow: ${grow}`);
const bundleFile = positional[0] ?? join(here, "ryan-ryan-california-twirl.solved.json");
const pathsFile = positional[1] ?? join(here, "ryan-ryan-twirl.paths.json");

const P = JSON.parse(readFileSync(pathsFile, "utf8")) as PathFile;
const parsed = fromBundle(readFileSync(bundleFile, "utf8"));
if ("error" in parsed) throw new Error(`${bundleFile}: ${parsed.error}`);

const figure = REVIEW_FIGURES.find((f) => f.id === P.figure);
if (figure === undefined) throw new Error(`unknown figure ${P.figure}`);
const timeline = pairingTimeline(timelinesOf(reduce(parsed.events), P.figure), P.pairing)
  .filter((p) => p.source !== "hidden")
  .map((p) => p.keyframe);
if (timeline.length === 0) throw new Error(`no keyframes for ${P.figure} / ${P.pairing} in ${bundleFile}`);

const keyframes = relativeKeyframes(timeline, [P.beau, P.belle]);
const bake: BakedTrack = {
  format: BAKE_FORMAT,
  version: 1,
  call: figure.call,
  pairing: P.pairing,
  bodies: [bodyPrint(getBodyShape(P.shapes[0])), bodyPrint(getBodyShape(P.shapes[1]))],
  note: `${bundleFile.split("/").pop() ?? bundleFile}, baked ${new Date().toISOString().slice(0, 10)}`,
  sizing: REVIEW2_SIZING,
  ...(grow === undefined ? {} : { grow }),
  keyframes,
};

const out = join(here, "../../src/dance/baked", `${figure.call}.${P.pairing}${grow === undefined ? "" : `.${grow}`}.json`);
writeFileSync(out, JSON.stringify(bake, null, 1) + "\n");

const steps = keyframes.map((k) => Math.hypot(k.values["0.offset.x"] ?? 0, k.values["0.offset.z"] ?? 0));
const her = keyframes.map((k) => Math.hypot(k.values["1.offset.x"] ?? 0, k.values["1.offset.z"] ?? 0));
console.log(`${out}: ${String(keyframes.length)} keyframes, bodies ${bake.bodies.join(" / ")}`);
console.log(`beau's step off the path: max ${Math.max(...steps).toFixed(1)} cm; belle's: max ${Math.max(...her).toFixed(1)} cm`);
const heights = (d: number) => keyframes.map((k) => k.values[`${String(d)}.torso.grow`] ?? 0);
if (grow !== undefined) console.log(`height change: beau ${Math.min(...heights(0)).toFixed(1)}…${Math.max(...heights(0)).toFixed(1)} cm, belle ${Math.min(...heights(1)).toFixed(1)}…${Math.max(...heights(1)).toFixed(1)} cm`);
