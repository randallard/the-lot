/**
 * 🧪 One whole-move solve off the main thread (2026-10-26, step 2). `whole-move-client.ts` starts
 * one of these per seed. A `Move` is plain data, so it crosses as it is.
 */

import { solve, type Frame, type Move, type SolveOptions } from "./whole-move";

export interface SolveRequest {
  move: Move;
  options: Omit<SolveOptions, "onProgress" | "guide">;
}

export interface SolveReply {
  frames: Frame[];
  cost: number;
  /** Time inside the worker, ms. */
  ms: number;
}

globalThis.addEventListener("message", (e: MessageEvent<SolveRequest>) => {
  const t0 = performance.now();
  const r = solve(e.data.move, e.data.options);
  const reply: SolveReply = { frames: r.frames, cost: r.cost, ms: performance.now() - t0 };
  globalThis.postMessage(reply);
});
