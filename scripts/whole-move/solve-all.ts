/**
 * 🧪 **`solve-all`** (step 7, 2026-10-28): every `#review` figure the solver can hold, for all 25
 * pairings, in parallel, with a metrics report that puts the outliers first, so Ryan only looks at
 * those. Brief: `work/square-dance-planning/briefs/solve-the-whole-move.md`, B.1, B.3, B.5.
 *
 *   npx vite-node scripts/whole-move/solve-all.ts [--figures=a,b] [--pairings=ryan-ryan,…]
 *     [--cap=0.10 | --cap=none] [--workers=16] [--out=<dir>]
 *
 * - **Paths headless** (B.1): `figurePaths`, the engine as the floor dances each figure, couple or
 *   facing pair, sized to the two bodies.
 * - **A step-out cap** (B.5): past `--cap` metres the beau's step off his path costs ten times
 *   clipping. Default 0.10: *"with 20 couples, a 26 cm step-out is how neighbouring couples collide."*
 * - **The solve:** `solveBest`, best of 4 seeds; a 6 cm margin where hands are held (as the twirl's
 *   bakes), the solver's 2 cm where they're free.
 * - **The twirl is left out by default:** it has its own pipeline (`bake-pair.ts`) and ships all 25.
 *
 * Run it uncapped (`--cap=none`) to see how far each beau steps to make room: that's how far the
 * engine's path is too tight for the two bodies.
 *
 * Writes `<out>/results.json` (every solve's metrics and its variables) and `<out>/report.md`, and
 * prints the report. With `--bake`, every clean solve (no outlier flag) is also written to
 * `src/dance/baked/<call>.<beau>-<belle>.json`, which every floor then draws. A figure
 * the solver can't hold yet (Allemande Left's forearm grip) is listed with the reason.
 *
 * Workers are this script again with `--shard=i/n`, each writing `<out>/shard-i.jsonl`.
 */

import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CallName } from "square-one";
import { getBodyShape } from "../../src/services/body-shapes";
import { BAKE_FORMAT, bodyPrint, relativeKeyframes, REVIEW2_SIZING, type BakedTrack } from "../../src/dance/baked-tracks";
import { figurePaths } from "../../src/dance/engine-paths";
import { RESHAPE } from "../../src/dance/accommodation";
import { armMetrics } from "../../src/dance/arm-pose";
import { armTurnGrip } from "../../src/dance/forearm-hold";
import { reviewPairings } from "../../src/dance/review-route";
import { REVIEW_FIGURES } from "../../src/dance/review-steps";
import { bodyOf, metrics, solveBest, toDials, WEIGHTS, type Metrics } from "../../src/dance/whole-move";
import { figureMove } from "../../src/dance/whole-move-figure";

const args = process.argv.slice(2);
const opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
// The twirl has its own pipeline (`bake-pair.ts`: the height trade, reshape or break per pairing;
// only 3 of 25 couples twirl as built), and all 25 of its bakes ship. Name it to include it.
const figureIds = opt("figures")?.split(",") ?? REVIEW_FIGURES.map((f) => f.id).filter((id) => id !== "california-twirl");
const pairingIds = opt("pairings")?.split(",");
const capArg = opt("cap") ?? "0.10";
const cap = capArg === "none" ? undefined : Number(capArg);
const workers = Number(opt("workers") ?? 16);
const out = opt("out") ?? join(tmpdir(), `solve-all-${new Date().toISOString().slice(0, 10)}`);
const shard = opt("shard");
/** Write a bake for every clean solve (no outlier flags) into `src/dance/baked/`. */
const bake = args.includes("--bake");

interface Job {
  readonly figure: string;
  readonly call: CallName;
  readonly formation: "couple" | "pair";
  readonly beau: string;
  readonly belle: string;
}

interface Result extends Job {
  readonly unsupported?: string;
  readonly cost?: number;
  readonly metrics?: Metrics;
  readonly ms?: number;
  readonly v?: number[];
}

const jobs: Job[] = REVIEW_FIGURES.filter((f) => figureIds.includes(f.id)).flatMap((f) =>
  reviewPairings()
    .filter((p) => pairingIds === undefined || pairingIds.includes(`${p.beau}-${p.belle}`))
    .map((p) => ({ figure: f.id, call: f.call, formation: f.sequence === undefined ? "pair" as const : "couple" as const, beau: p.beau, belle: p.belle })),
);

function solveJob(j: Job): Result {
  const t0 = Date.now();
  const shapes = [getBodyShape(j.beau), getBodyShape(j.belle)] as const;
  const P = figurePaths(j.call, j.formation, shapes, REVIEW2_SIZING);
  const bodies: [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>] = [bodyOf(shapes[0]), bodyOf(shapes[1])];
  // A forearm grip is held where the floor holds it (`planForearm`), level and centred.
  const grip = armTurnGrip(bodies[0], bodies[1]);
  const gripHeight = grip.height;
  const fm = figureMove(j.call, P, bodies, { ...(cap === undefined ? {} : { stepCap: cap }), gripHeight, ...(j.call === "allemande-left" ? { grow: "meet" as const, trade: grip.grow } : {}) });
  if ("unsupported" in fm) return { ...j, unsupported: fm.unsupported };
  // 6 cm is the twirl's margin, for hands round heads under an arch. Hands free, it pushed every
  // dancer's hanging arm off their own body: arms 1.3–1.8× long (player ×4's Dosado 1.72; 1.03 at 2 cm).
  const margin = fm.move.holds.some((h) => h.forearm !== true) ? 0.06 : WEIGHTS.margin;
  const r = solveBest({ ...fm.move, frames: fm.start }, { weights: { ...WEIGHTS, margin } });
  const result: Result = { ...j, cost: r.cost, metrics: metrics(fm.move, r.frames, fm.path), ms: Date.now() - t0, v: Array.from(r.v, (x) => Math.round(x * 1e6) / 1e6) };
  if (bake && flags(result).length === 0 && result.metrics !== undefined) {
    // The twirl's bake format (`bake-pair.ts`), for every floor to draw (`DanceFloor`'s bakes).
    const m = result.metrics;
    const n = r.frames.length;
    const absolute = r.frames.map((f, i) => ({ t: Math.round((i / (n - 1)) * 1000) / 1000, values: { ...toDials(f[0], 0), ...toDials(f[1], 1) } }));
    const track: BakedTrack = {
      format: BAKE_FORMAT,
      version: 1,
      call: j.call,
      pairing: `${j.beau}-${j.belle}`,
      bodies: [bodyPrint(shapes[0]), bodyPrint(shapes[1])],
      note: `solve-all.ts, cost ${r.cost.toFixed(0)}, clip ${(m.clip * 100).toFixed(1)} cm, hands ${(m.holdGap * 100).toFixed(1)} cm, jump ${m.jump.toFixed(0)}°, step ${(m.step * 100).toFixed(0)} cm${cap === undefined ? "" : ` (cap ${String(cap * 100)})`}, baked ${new Date().toISOString().slice(0, 10)}`,
      sizing: REVIEW2_SIZING,
      stretch: Math.round(m.stretch * 100) / 100,
      clean: true,
      keyframes: relativeKeyframes(absolute, [P.beau, P.belle]),
    };
    writeFileSync(join(BAKED, `${j.call}.${j.beau}-${j.belle}.json`), JSON.stringify(track, null, 1) + "\n");
  }
  return result;
}

const BAKED = join(new URL(".", import.meta.url).pathname, "../../src/dance/baked");

/** What makes a solve an outlier, worst first: clipping, hands apart, a jump, a long step, a stretch. */
function flags(r: Result): string[] {
  const m = r.metrics;
  if (m === undefined) return [];
  const f: string[] = [];
  if (m.clip > 0.005) f.push(`clip ${(m.clip * 100).toFixed(1)} cm (${m.clipAt})`);
  if (m.holdGap > 0.02) f.push(`hands ${(m.holdGap * 100).toFixed(1)} cm`);
  if (m.jump > 30) f.push(`jump ${m.jump.toFixed(0)}° (${m.jumpAt})`);
  if (m.step > (cap ?? 0.1) + 0.01) f.push(`step ${(m.step * 100).toFixed(0)} cm`);
  if (m.stretch > 1.25) f.push(`stretch ${m.stretch.toFixed(2)}`);
  return f;
}

function report(results: readonly Result[], seconds: number): string {
  const solved = results.filter((r) => r.metrics !== undefined);
  const out: string[] = [];
  out.push(`# solve-all, ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, "");
  out.push(`${String(solved.length)} solved, ${String(results.length - solved.length)} not solvable yet, in ${seconds.toFixed(0)} s on ${String(workers)} workers. Step cap: ${cap === undefined ? "none" : `${String(cap * 100)} cm`}. Margin 6 cm under an arch, 2 cm otherwise; best of 4 seeds.`, "");
  const bad = solved.map((r) => ({ r, f: flags(r) })).filter((x) => x.f.length > 0);
  out.push(`## Outliers (${String(bad.length)})`, "");
  if (bad.length === 0) out.push("None.", "");
  else {
    out.push("| figure | pairing | what |", "|---|---|---|");
    for (const { r, f } of bad.sort((a, b) => b.f.length - a.f.length)) out.push(`| ${r.figure} | ${r.beau}-${r.belle} | ${f.join("; ")} |`);
    out.push("");
  }
  out.push("## Per figure", "", "| figure | solved | outliers | worst clip | worst hands | worst jump | worst step | mean time |", "|---|---|---|---|---|---|---|---|");
  for (const id of figureIds) {
    const rs = results.filter((r) => r.figure === id);
    const ss = rs.filter((r) => r.metrics !== undefined);
    if (ss.length === 0) {
      out.push(`| ${id} | 0 / ${String(rs.length)} | ${rs[0]?.unsupported ?? "—"} | | | | | |`);
      continue;
    }
    const max = (k: (m: Metrics) => number) => Math.max(...ss.map((r) => k(r.metrics!)));
    out.push(`| ${id} | ${String(ss.length)} / ${String(rs.length)} | ${String(ss.filter((r) => flags(r).length > 0).length)} | ${(max((m) => m.clip) * 100).toFixed(1)} cm | ${(max((m) => m.holdGap) * 100).toFixed(1)} cm | ${max((m) => m.jump).toFixed(0)}° | ${(max((m) => m.step) * 100).toFixed(0)} cm | ${(ss.reduce((a, r) => a + (r.ms ?? 0), 0) / ss.length / 1000).toFixed(1)} s |`);
  }
  out.push("");
  return out.join("\n");
}

if (shard !== undefined) {
  const [i, n] = shard.split("/").map(Number) as [number, number];
  const file = join(out, `shard-${String(i)}.jsonl`);
  for (const [k, j] of jobs.entries()) if (k % n === i) appendFileSync(file, JSON.stringify(solveJob(j)) + "\n");
} else {
  mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const n = Math.min(workers, jobs.length);
  const self = new URL(import.meta.url).pathname;
  const pass = args.filter((a) => !a.startsWith("--out=") && !a.startsWith("--workers="));
  await Promise.all(
    Array.from({ length: n }, (_, i) => new Promise<void>((resolve, reject) => {
      const file = join(out, `shard-${String(i)}.jsonl`);
      if (existsSync(file)) writeFileSync(file, "");
      const child = spawn("npx", ["vite-node", self, ...pass, `--out=${out}`, `--workers=${String(n)}`, `--shard=${String(i)}/${String(n)}`], { stdio: ["ignore", "ignore", "inherit"] });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`shard ${String(i)} exited ${String(code)}`))));
    })),
  );
  const results: Result[] = Array.from({ length: n }, (_, i) => readFileSync(join(out, `shard-${String(i)}.jsonl`), "utf8"))
    .flatMap((t) => t.split("\n").filter((l) => l.length > 0).map((l) => JSON.parse(l) as Result));
  writeFileSync(join(out, "results.json"), JSON.stringify(results));
  const text = report(results, (Date.now() - t0) / 1000);
  writeFileSync(join(out, "report.md"), text);
  console.log(text);
  console.log(`→ ${out}`);
}
