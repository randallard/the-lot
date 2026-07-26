/**
 * The M4 debug scene: two NPCs looping a call, driven by square-one.
 *
 * This is the milestone's "done when", and it is also the check three call specs
 * are stacked behind — square-one's Dosado marks its waypoints "provisional until
 * rendered", and this is the renderer.
 *
 * Reached at `#dance` (optionally `#dance=pass-thru`). Deliberately its own Canvas
 * and its own early return in `App.tsx`, so nothing about the debug scene can touch
 * the game's state machine.
 */

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DanceFloor } from "./DanceFloor";
import { DEFAULT_BPM } from "./useDancePerformance";
import type { CallName } from "square-one";
import { DEBUG_CALLS } from "./dance-route";

export function DanceDebugScene({ initialCall }: { initialCall: CallName }) {
  const [call, setCall] = useState<CallName>(initialCall);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [drift, setDrift] = useState(false);

  useEffect(() => {
    window.location.hash = call === "dosado" ? "#dance" : `#dance=${call}`;
  }, [call]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f4f4f2" }}>
      <Canvas shadows camera={{ position: [0, 6.5, 7.5], fov: 45 }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow />

        {/* Floor, with a grid so travel and lane offsets are readable. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial color="#e8e8e4" />
        </mesh>
        <gridHelper args={[24, 24, "#b9b9b3", "#d6d6d0"]} />
        {/* Engine axes: red = +x, blue = engine +y (world −z). */}
        <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.02, 0), 2.2, 0xcc4433]} />
        <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.02, 0), 2.2, 0x3355cc]} />

        <DanceFloor call={call} bpm={bpm} loop followDrift={drift} />
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.92)",
          border: "1px solid #ccc",
          borderRadius: 8,
          font: "13px/1.4 system-ui, sans-serif",
        }}
      >
        <strong>square-one · M4 debug</strong>
        <div style={{ display: "flex", gap: 6 }}>
          {DEBUG_CALLS.map((c) => (
            <button
              key={c}
              onClick={() => { setCall(c); }}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                background: c === call ? "#333" : "#fff",
                color: c === call ? "#fff" : "#333",
                border: "1px solid #999",
                borderRadius: 4,
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <label>
          tempo {bpm} bpm
          <input
            type="range"
            min={30}
            max={180}
            value={bpm}
            onChange={(e) => { setBpm(Number(e.target.value)); }}
            style={{ width: "100%" }}
          />
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={drift} onChange={(e) => { setDrift(e.target.checked); }} />
          follow drift (re-fit frame to centroid)
        </label>
        <span style={{ color: "#666" }}>red = engine +x · blue = engine +y</span>
      </div>
    </div>
  );
}
