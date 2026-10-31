/**
 * 🧪 **A floor for four, played from a solve** (2026-10-28): what `#review2` draws for a figure
 * square-one can't dance yet (`review2-figures.ts`). Takes `DanceFloor`'s clock props — `paused`,
 * `seek`, `onBeat` — and keeps its rules, so `#review2`'s transport, dials and keyframes work on it
 * unchanged:
 *
 * - **A seek is a cut**, consumed once per token, and a fresh mount counts as never having seen
 *   the token (`DanceFloor`'s `seekSeen`), so a set that mounts paused is still posed.
 * - **Paused, nothing is written** except on a seek, so `PoseOverride` can sit on top.
 * - **It stops at the end** rather than wrapping: `#review2` sees the last beat and loops every
 *   floor with a seek to 0.
 *
 * The pose comes from the set's bake (`baked-four.ts`); a set with none, or whose bodies changed
 * since, is solved here when it mounts (≈3.5 s, on the main thread) and played from that.
 */

import { createRef, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { Dancer } from "./Dancer";
import type { CharacterBodyShape } from "../services/body-shapes";
import { applyToRigs } from "./pose-dials";
import { dialsAt, loadFourBake, decodeRows, type FourCall } from "./baked-four";
import { DEFAULT_BPM } from "./useDancePerformance";
import type { DancerFrame } from "./whole-move";
import { solveN } from "./whole-move-n";
import { rightAndLeftThru } from "./whole-move-rlt";

/** The floor's beau and belle colours (`DanceFloor`'s), a shade darker for the second couple. */
const COLORS = ["#e2725b", "#5b8ce2", "#b4513c", "#3f68b4"];
const PER_BEAT = 10;

export interface SolvedFloorProps {
  readonly call: FourCall;
  /** Gent 1 · his partner · gent 2 · his partner. */
  readonly cast: readonly string[];
  readonly shapes: readonly CharacterBodyShape[];
  readonly beats: number;
  readonly paused?: boolean;
  readonly seek?: { readonly token: number; readonly beat: number };
  readonly onBeat?: (beat: number, totalBeats: number) => void;
}

export function SolvedFloor({ call, cast, shapes, beats, paused = false, seek, onBeat }: SolvedFloorProps) {
  const [solved, setSolved] = useState<{ frames: DancerFrame[][]; perBeat: number } | null>(null);
  const rigs = useMemo(() => shapes.map(() => createRef<THREE.Group>()), [shapes]);
  const castKey = cast.join("-");

  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    void loadFourBake(call, cast, shapes).then((bake) => {
      if (!live) return;
      if (bake !== undefined) {
        setSolved({ frames: decodeRows(bake.rows), perBeat: bake.perBeat });
        return;
      }
      // No bake for this set (or a body has changed since): solve it, after a paint.
      timer = window.setTimeout(() => {
        const r = solveN(rightAndLeftThru(shapes, { perBeat: PER_BEAT }), { iterations: 3000 });
        if (live) setSolved({ frames: r.frames, perBeat: PER_BEAT });
      }, 50);
    });
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
    // `cast` is read through its key: a new array with the same names is the same set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, castKey, shapes]);

  const beat = useRef(0);
  const seekSeen = useRef<number | null>(null);
  const posed = useRef<typeof solved>(null);

  useFrame((_, delta) => {
    const seekTo = seek !== undefined && seek.token !== seekSeen.current ? seek.beat : null;
    if (seek !== undefined) seekSeen.current = seek.token;
    let moved = false;
    if (seekTo !== null) {
      beat.current = Math.min(beats, Math.max(0, seekTo));
      moved = true;
    } else if (!paused) {
      beat.current = Math.min(beats, beat.current + (Math.min(delta, 0.1) * DEFAULT_BPM) / 60);
      moved = true;
    }
    // The solve arriving is a move too, or a set that loads while paused would stand unposed.
    if (solved !== null && (moved || posed.current !== solved)) {
      posed.current = solved;
      const objs = rigs.map((r) => r.current).filter((r): r is THREE.Group => r !== null);
      if (objs.length === rigs.length) applyToRigs(objs, shapes, dialsAt(solved.frames, solved.perBeat, beat.current));
    }
    onBeat?.(beat.current, beats);
  });

  return (
    // One parent for the four, so `#review2`'s pick finds each dancer's index among its siblings.
    <group visible={solved !== null}>
      {shapes.map((shape, i) => <Dancer key={i} rig={rigs[i]!} shape={shape} color={COLORS[i % COLORS.length]} />)}
    </group>
  );
}
