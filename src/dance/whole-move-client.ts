/**
 * 🧪 Solve a whole move in the browser (2026-10-26, step 2): `solveBest`, with each seed in its own
 * web worker, so the tries run side by side and the page keeps drawing.
 */

import { SCHEDULE, type Frame, type Move, type SolveOptions } from "./whole-move";
import type { SolveReply, SolveRequest } from "./whole-move.worker";

export interface WorkerSolve {
  frames: Frame[];
  cost: number;
  seed: number;
  /** Each seed's cost and its time inside its worker (ms), seed 1 first. */
  tries: { cost: number; ms: number }[];
  /** First post to last reply, ms. */
  wall: number;
}

export async function solveInWorkers(
  move: Move,
  options: Omit<SolveOptions, "onProgress" | "guide" | "seed"> = SCHEDULE,
  tries: number = SCHEDULE.tries,
): Promise<WorkerSolve> {
  const t0 = performance.now();
  const one = (seed: number) =>
    new Promise<SolveReply>((resolve, reject) => {
      const w = new Worker(new URL("./whole-move.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<SolveReply>) => {
        w.terminate();
        resolve(e.data);
      };
      w.onerror = (e) => {
        w.terminate();
        reject(new Error(e.message));
      };
      const req: SolveRequest = { move, options: { ...options, seed } };
      w.postMessage(req);
    });
  const replies = await Promise.all(Array.from({ length: Math.max(1, tries) }, (_, k) => one(k + 1)));
  let best = 0;
  replies.forEach((r, k) => {
    if (r.cost < (replies[best]?.cost ?? Infinity)) best = k;
  });
  const b = replies[best];
  if (b === undefined) throw new Error("solveInWorkers: no replies");
  return {
    frames: b.frames,
    cost: b.cost,
    seed: best + 1,
    tries: replies.map((r) => ({ cost: r.cost, ms: r.ms })),
    wall: performance.now() - t0,
  };
}
