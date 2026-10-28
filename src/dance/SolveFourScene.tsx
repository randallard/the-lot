/**
 * 🧪 `#solve4`: four dancers dancing a solved call (2026-10-27, step 5). The N-dancer solve
 * (`whole-move-n.ts`) on Right and Left Thru (`whole-move-rlt.ts`), run when the page opens and
 * played back on four `Dancer` rigs through the same dials `#review2` and the bakes use
 * (`toDials`, `applyToRigs`).
 *
 * `#solve4` is four NPC Ryans; `#solve4=myco,ember,sprout,ryan` names the four (first gent, his
 * partner, the opposite gent, his partner). A debug view: no state machine, nothing saved.
 */

import { createRef, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Dancer, type DancerRig } from "./Dancer";
import { getBodyShape } from "../services/body-shapes";
import { applyToRigs } from "./pose-dials";
import { toDials, type DancerFrame } from "./whole-move";
import { metricsN, solveN, type MetricsN } from "./whole-move-n";
import { rightAndLeftThru } from "./whole-move-rlt";
import { frameAt } from "./baked-four";

const COLORS = ["#3366cc", "#cc4433", "#2f9e6a", "#c99a1a"];
const PER_BEAT = 10;

interface Clock {
  beat: number;
  playing: boolean;
  bpm: number;
  onBeat: (b: number) => void;
}

function Player({ frames, rigs, shapes, clock }: {
  frames: readonly (readonly DancerFrame[])[];
  rigs: readonly DancerRig[];
  shapes: ReturnType<typeof getBodyShape>[];
  clock: RefObject<Clock>;
}) {
  useFrame((_, dt) => {
    const c = clock.current;
    const beats = (frames.length - 1) / PER_BEAT;
    if (c.playing) {
      c.beat += (dt * c.bpm) / 60;
      if (c.beat > beats + 1) c.beat = 0;
    }
    const f = frameAt(frames, Math.min(beats, c.beat) * PER_BEAT);
    const objs = rigs.map((r) => r.current).filter((r): r is THREE.Group => r !== null);
    if (objs.length !== 4) return;
    const values = Object.assign({}, ...f.map((d, k) => toDials(d, k))) as Record<string, number>;
    applyToRigs(objs, shapes, values);
    c.onBeat(c.beat);
  });
  return null;
}

export function SolveFourScene({ cast }: { cast: string[] }) {
  const shapes = useMemo(() => cast.map((id) => getBodyShape(id)), [cast]);
  const move = useMemo(() => rightAndLeftThru(shapes), [shapes]);
  const [solved, setSolved] = useState<{ frames: DancerFrame[][]; metrics: MetricsN; ms: number } | null>(null);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rigs = useMemo(() => [0, 1, 2, 3].map(() => createRef<THREE.Group>()), []);
  const clock = useRef<Clock>({ beat: 0, playing: true, bpm: 60, onBeat: (b) => setBeat(Math.round(b * 10) / 10) });
  useEffect(() => {
    clock.current.playing = playing;
  }, [playing]);

  useEffect(() => {
    // Let "solving…" paint first: the solve takes a few seconds on the main thread.
    const id = window.setTimeout(() => {
      const t0 = performance.now();
      const r = solveN(move, { iterations: 3000 });
      setSolved({ frames: r.frames, metrics: metricsN(move, r.v), ms: performance.now() - t0 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [move]);

  const m = solved?.metrics;
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
      <div style={{ width: 300, padding: 10, background: "#f7f7f4", overflowY: "auto" }}>
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>🧪 Right and Left Thru — N-dancer solve</div>
        <div>{cast.map((id, i) => <span key={i} style={{ color: COLORS[i], marginRight: 8 }}>{id}</span>)}</div>
        <div style={{ color: "#666", margin: "4px 0 8px" }}>gent 1 · his partner · gent 2 · his partner</div>
        {solved === null ? <div>solving…</div> : (
          <>
            <button onClick={() => setPlaying((p) => !p)}>{playing ? "pause" : "play"}</button>
            <span style={{ marginLeft: 8 }}>beat {beat.toFixed(1)} / 8</span>
            <input
              type="range" min={0} max={8} step={0.1} value={Math.min(8, beat)} style={{ width: "100%" }}
              onChange={(e) => { setPlaying(false); clock.current.beat = Number(e.target.value); setBeat(Number(e.target.value)); }}
            />
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {`solved in ${(solved.ms / 1000).toFixed(1)} s
clip   ${((m?.clip ?? 0) * 100).toFixed(1)} cm ${m?.clipAt ?? ""}
hands  ${((m?.holdGap ?? 0) * 100).toFixed(1)} cm ${m?.holdAt ?? ""}
jump   ${(m?.jump ?? 0).toFixed(0)}°
step   ${((m?.step ?? 0) * 100).toFixed(0)} cm`}
            </pre>
          </>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <Canvas shadows camera={{ position: [0, 4.5, 6], fov: 45 }}>
          <OrbitControls makeDefault target={[0, 0.8, 0]} maxPolarAngle={Math.PI / 2} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#e8e8e2" />
          </mesh>
          <gridHelper args={[40, 40, "#b9b9b3", "#d6d6d0"]} />
          {rigs.map((rig, i) => <Dancer key={i} rig={rig} shape={shapes[i]!} color={COLORS[i]!} />)}
          {solved !== null && <Player frames={solved.frames} rigs={rigs} shapes={shapes} clock={clock} />}
        </Canvas>
      </div>
    </div>
  );
}
