/**
 * A square on the floor, driven by square-one.
 *
 * This is M4's driver: it advances the engine's stepper each frame, maps every
 * dancer's engine pose through the {@link DanceFrame}, and writes the result onto
 * the dancer rigs.
 *
 * **The blend contract (ADR-0010).** An engine-driven dancer's transform and facing
 * belong to the choreography. Emotes stay expressive — they contribute arm, head and
 * lean pose through `AnimationController` exactly as before — but they cannot move a
 * dancer or turn them, because a square is a shared coordinate agreement and one
 * dancer's emote spinning them 180° breaks the formation for everyone else.
 *
 * Not hard-coded to 8: `applyCallToPair` gives a two-dancer square, and the call
 * model is two-couple-safe by construction.
 */

import { createRef, useMemo, useRef } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Dancer, type DancerRig } from "./Dancer";
import {
  facingToRotationY,
  makeFrame,
  refit,
  toWorld,
  type DanceFrame,
  type WorldPoint,
} from "./frame";
import { useDancePerformance, type DancePerformanceOptions } from "./useDancePerformance";
import { MYCO_DEFAULTS, EMBER_DEFAULTS, type CharacterBodyShape } from "../services/body-shapes";

interface DanceFloorProps extends DancePerformanceOptions {
  /** Where the square sits on the floor. */
  origin?: WorldPoint;
  scale?: number;
  yaw?: number;
  shapes?: readonly CharacterBodyShape[];
  /** Follow the dancers' centroid as the square migrates (square-one ADR-0006). */
  followDrift?: boolean;
}

const DEFAULT_SHAPES = [MYCO_DEFAULTS, EMBER_DEFAULTS] as const;
const DEBUG_COLORS = ["#e2725b", "#5b8ce2"] as const;

export function DanceFloor({
  origin = { x: 0, z: 0 },
  scale,
  yaw = 0,
  shapes = DEFAULT_SHAPES,
  followDrift = false,
  ...performanceOptions
}: DanceFloorProps) {
  const runtime = useDancePerformance(performanceOptions);
  const keys = useMemo(() => Object.keys(runtime.motions), [runtime.motions]);

  // One rig per dancer, created in a memo rather than by mutating a ref during
  // render — the latter is what `react-hooks/refs` objects to, and it is right to.
  const rigs = useMemo(() => {
    const map: Record<string, DancerRig> = {};
    for (const key of keys) map[key] = createRef<THREE.Group>();
    return map;
  }, [keys]);

  const frameRef = useRef<DanceFrame>(makeFrame(origin, scale, yaw));

  useFrame((_state, delta) => {
    // Guard against tab-restore producing an enormous delta and teleporting the
    // square across the floor.
    const dt = Math.min(delta, 0.1);
    const states = runtime.advance(dt);

    for (const state of states) {
      const rig = rigs[state.key]?.current;
      if (!rig) continue;

      const world = toWorld(frameRef.current, state.position);
      rig.position.x = world.x;
      rig.position.z = world.z;
      // `bodyDeltaY` is a visual offset owned by the emote layer; the driver keeps
      // dancers grounded, matching how positionRef is handled everywhere else.
      rig.position.y = 0;
      rig.rotation.y = facingToRotationY(frameRef.current, state.facing);
    }

    if (followDrift) {
      const actual: WorldPoint[] = [];
      for (const key of keys) {
        const rig = rigs[key]?.current;
        if (rig) actual.push({ x: rig.position.x, z: rig.position.z });
      }
      frameRef.current = refit(frameRef.current, actual);
    }
  });

  return (
    <>
      {keys.map((key, i) => {
        const rig = rigs[key];
        if (!rig) return null;
        return (
          <Dancer
            key={key}
            rig={rig}
            shape={shapes[i % shapes.length] ?? DEFAULT_SHAPES[0]}
            color={DEBUG_COLORS[i % DEBUG_COLORS.length]}
          />
        );
      })}
    </>
  );
}

export type { WorldPoint };
