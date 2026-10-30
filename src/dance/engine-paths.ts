/**
 * 🧪 A couple's floor paths for one call, with no browser (2026-10-26, step 3): the numbers
 * `DanceFloor` feeds square-one for two bodies, the engine sampled, and each state placed as
 * `DanceFloor` places a rig. It's what `#review2` draws for a couple (default scale, no turn-in or
 * stagger), so a solve can be set up for any pair of bodies without capturing it from the live
 * screen. Checked against the 10-24 capture in `engine-paths.test.ts`.
 */

import {
  applyCallToPair, applyStarThru, createPerformance, danceCoupleSequence, DEFAULT_PAIR_SHAPE, flattenSequence, partnerUp, shapeOf,
  type CallName, type GripSpan, type Motion, type ShapeAt,
} from "square-one";
import { armMetrics, touchHold } from "./arm-pose";
import { NO_DUCK, sizeArch } from "./arch";
import { BREAK, RESHAPE } from "./accommodation";
import type { BakedSizing, PathSample } from "./baked-tracks";
import { armTurnGrip } from "./forearm-hold";
import { bodyOf } from "./whole-move";
import { DEFAULT_SCALE, facingToRotationY, makeFrame, passingWidth, toWorld } from "./frame";
import { archPassClearance, forwardReach, passingClearance } from "./passing";
import type { FloorCall } from "./floor-calls";
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
): { beau: PathSample[]; belle: PathSample[]; beats: number; grips: { beau: readonly GripSpan[]; belle: readonly GripSpan[] } } {
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
    // The arch is sized on the bodies (`sizeArch`, above); the pass on arms and all (`passing.ts`).
    partnerUp("a", "b", undefined, undefined, hold.width / scale, passingClearance(a, b) / scale, undefined, armTurnGrip(bodyOf(a), bodyOf(b)).radius / scale),
    shapeAt,
  );
  return sampleMotions(flattenSequence(seq), n);
}

/**
 * 🧪 Any `#review` figure's floor paths, with no browser (step 7, 2026-10-28): a couple figure as
 * {@link couplePaths} has it, and a facing pair's (Dosado, Pass Thru, Allemande Left) as the floor
 * dances it (`useDancePerformance`: `applyCallToPair`, sized by the pair's clearance and grip
 * radius). With each dancer's grips, the engine's own word on which hands are held when.
 */
export function figurePaths(
  call: FloorCall,
  formation: "couple" | "pair",
  shapes: readonly [CharacterBodyShape, CharacterBodyShape],
  sizing: BakedSizing,
  n = 41,
): { beau: PathSample[]; belle: PathSample[]; beats: number; grips: { beau: readonly GripSpan[]; belle: readonly GripSpan[] } } {
  const [a, b] = shapes;
  const scale = DEFAULT_SCALE;
  // 🧪 Star Thru (10-29): a facing pair walking into a couple as wide as their handhold, bowing
  // apart by their passing clearance where they're level, as the floor dances it
  // (`useDancePerformance`, `a` the man and beau).
  if (call === "star-thru") {
    const width = touchHold(armMetrics(a), armMetrics(b)).width / scale;
    const clearance = archPassClearance(a, b) / scale;
    const { a: man, b: woman } = applyStarThru("a", shapeOf({ width, clearance }, DEFAULT_PAIR_SHAPE));
    return sampleMotions({ a: man, b: woman }, n);
  }
  if (formation === "couple") return couplePaths(call, shapes, sizing, n);
  const pair = applyCallToPair(
    call,
    shapeOf({
      clearance: passingClearance(a, b) / scale,
      gripRadius: armTurnGrip(bodyOf(a), bodyOf(b)).radius / scale,
      ...(forwardReach(a, b) > 0 ? { forward: forwardReach(a, b) / scale } : {}),
    }, DEFAULT_PAIR_SHAPE),
  );
  return sampleMotions(pair, n);
}

/** Two dancers' motions (keys `a`, `b`) sampled as `DanceFloor` places a rig. */
function sampleMotions(motions: Record<string, Motion>, n: number): { beau: PathSample[]; belle: PathSample[]; beats: number; grips: { beau: readonly GripSpan[]; belle: readonly GripSpan[] } } {
  const scale = DEFAULT_SCALE;
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
  return { beau, belle, beats, grips: { beau: motions.a?.grips ?? [], belle: motions.b?.grips ?? [] } };
}
