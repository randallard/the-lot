/**
 * 🧪 A couple's floor paths for one call, with no browser (2026-10-26, step 3): the numbers
 * `DanceFloor` feeds square-one for two bodies, the engine sampled, and each state placed as
 * `DanceFloor` places a rig. It's what `#review2` draws for a couple (default scale, no turn-in or
 * stagger), so a solve can be set up for any pair of bodies without capturing it from the live
 * screen. Checked against the 10-24 capture in `engine-paths.test.ts`.
 */

import { createPerformance, danceCoupleSequence, flattenSequence, partnerUp, type CallName, type ShapeAt } from "square-one";
import { armMetrics, touchHold } from "./arm-pose";
import { NO_DUCK, sizeArch } from "./arch";
import { BREAK, RESHAPE } from "./accommodation";
import type { BakedSizing, PathSample } from "./baked-tracks";
import { pairGripRadius } from "./forearm-hold";
import { DEFAULT_SCALE, facingToRotationY, makeFrame, passingWidth, toWorld } from "./frame";
import { lateralClearance, rigidParts, type CharacterBodyShape } from "../services/body-shapes";

const R2D = 180 / Math.PI;

/**
 * The beau's and belle's paths at `n` samples evenly over the call (t = i / (n − 1)): position in
 * cm and facing as the rig's yaw in degrees, in the couple's own frame. A Twirl's arch is sized
 * with `sizing` (`DanceFloor` does the same for a baked call).
 */
export function couplePaths(
  call: CallName,
  shapes: readonly [CharacterBodyShape, CharacterBodyShape],
  sizing: BakedSizing,
  n = 41,
): { beau: PathSample[]; belle: PathSample[]; beats: number } {
  const [a, b] = shapes;
  const scale = DEFAULT_SCALE;
  const am = armMetrics(a);
  const bm = armMetrics(b);
  const hold = touchHold(am, bm);
  const bodies = passingWidth(lateralClearance(rigidParts(a), rigidParts(b)));
  const arch = call === "california-twirl"
    ? sizeArch(am, bm, a, b, hold.width, bodies, sizing.accommodation === "break" ? BREAK : RESHAPE, sizing.overhead, sizing.close, NO_DUCK)
    : null;
  const shapeAt: ShapeAt = (index) =>
    index === 0 && arch !== null ? { archClearance: arch.wanted / scale, width: arch.width / scale } : undefined;
  const seq = danceCoupleSequence(
    [call],
    partnerUp("a", "b", undefined, undefined, hold.width / scale, bodies / scale, undefined, pairGripRadius(am, bm) / scale),
    shapeAt,
  );
  const motions = flattenSequence(seq);
  const beats = Math.max(...Object.values(motions).map((m) => m.beats));
  const frame = makeFrame({ x: 0, z: 0 }, scale, 0);
  const beau: PathSample[] = [];
  const belle: PathSample[] = [];
  for (let i = 0; i < n; i++) {
    const beat = n > 1 ? (beats * i) / (n - 1) : 0;
    const perf = createPerformance({ motions });
    const states = beat === 0 ? perf.sample() : perf.tick(beat);
    for (const s of states) {
      const w = toWorld(frame, s.position);
      const p = { x: w.x * 100, z: w.z * 100, facing: facingToRotationY(frame, s.facing) * R2D };
      if (s.key === "a") beau.push(p);
      else if (s.key === "b") belle.push(p);
    }
  }
  return { beau, belle, beats };
}
