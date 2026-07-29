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

import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DanceFloor, type ArmReport } from "./DanceFloor";
import { AnimationController } from "../services/animation-controller";
import { DEBUG_EMOTES } from "./debug-emotes";
import type { Emote } from "../services/emotes";
import { DEFAULT_BPM } from "./useDancePerformance";
import type { CallName } from "square-one";
import { DEBUG_CALLS } from "./dance-route";
import {
  MYCO_DEFAULTS,
  EMBER_DEFAULTS,
  type CharacterBodyShape,
} from "../services/body-shapes";

function withBodyRadius(shape: CharacterBodyShape, radius: number): CharacterBodyShape {
  return { ...shape, body: { ...shape.body, radius } };
}

/**
 * Casts for exercising the body-derived frame scale at the SHAPE_BOUNDS
 * extremes. `default` leaves DanceFloor's own cast (lands on DEFAULT_SCALE);
 * the others must visibly grow the square while everyone still clears.
 */
const SIZE_CASTS = {
  default: undefined,
  mixed: [withBodyRadius(MYCO_DEFAULTS, 0.6), withBodyRadius(EMBER_DEFAULTS, 0.1)],
  max: [withBodyRadius(MYCO_DEFAULTS, 0.6), withBodyRadius(EMBER_DEFAULTS, 0.6)],
} as const;

type SizeCast = keyof typeof SIZE_CASTS;

/** Min–max of one tracked quantity since the current grip engaged. */
interface Span {
  min: number;
  max: number;
}

function track(spans: Map<string, Span>, name: string, value: number): void {
  const seen = spans.get(name);
  if (seen === undefined) {
    spans.set(name, { min: value, max: value });
    return;
  }
  seen.min = Math.min(seen.min, value);
  seen.max = Math.max(seen.max, value);
}

function fmt(v: number): string {
  return (v < 0 ? "" : " ") + v.toFixed(3);
}

export function DanceDebugScene({ initialCall }: { initialCall: CallName }) {
  const [call, setCall] = useState<CallName>(initialCall);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [drift, setDrift] = useState(false);
  const [sizes, setSizes] = useState<SizeCast>("default");
  const [paused, setPaused] = useState(false);
  const [joints, setJoints] = useState(false);
  const [emoting, setEmoting] = useState<string | null>(null);
  // The contact readout is off by default and sits at the bottom of the panel. It
  // rewrites every frame and its height changes with the number of tracked rows, so
  // anything below it moves while you are trying to click it — which is no way to
  // fire an emote at a chosen moment. It is for judging grip drift; that watch is
  // done, and it can be turned back on for the next one.
  const [readout, setReadout] = useState(false);

  // One expression layer per dancer, so an emote can be fired *while* a call runs —
  // the arbitration this scene exists to watch. Both dancers get the same emote:
  // the interesting frames are the ones where both are reaching at once.
  const controllers = useMemo(
    () => [new AnimationController(), new AnimationController()] as const,
    [],
  );
  // An emote button is a trigger, not a switch. Two things follow from that.
  //
  // `interrupt` rather than `play`, because `play` *queues* behind whatever is
  // already running — press two emotes in a row and the second one appears to do
  // nothing, then arrives late. A hand-fired debug button means "show me this
  // now", so the press takes over.
  //
  // And the highlight is momentary: it marks the emote that is running and
  // releases itself when the emote ends. The emotes are one-shot, so their own
  // duration is when that is.
  const emoteTimer = useRef<number | null>(null);
  const fire = useCallback(
    (emote: Emote) => {
      if (emoteTimer.current !== null) clearTimeout(emoteTimer.current);
      for (const c of controllers) c.interrupt(emote, { resume: false });
      setEmoting(emote.id);
      emoteTimer.current = window.setTimeout(() => {
        emoteTimer.current = null;
        setEmoting(null);
      }, emote.duration * 1000);
    },
    [controllers],
  );
  useEffect(
    () => () => {
      if (emoteTimer.current !== null) clearTimeout(emoteTimer.current);
    },
    [],
  );

  // The beat readout updates every frame; written straight to the DOM so a
  // 60 fps clock doesn't become 60 fps React renders (ADR-0002's idiom).
  const beatLabel = useRef<HTMLSpanElement>(null);
  const onBeat = useCallback((beat: number, totalBeats: number) => {
    const el = beatLabel.current;
    if (el) el.textContent = `beat ${beat.toFixed(1)} / ${totalBeats}`;
  }, []);

  // The tactile channel, in numbers — and in **ranges**, because an instantaneous
  // reading hides exactly the defect that matters. A grip is only a grip if it holds
  // *still*: `hand↔pivot` must be one frozen number while `separation` breathes, and
  // `along` (0 at the partner's elbow, 1 at their hand) must not wander. `gap` is the
  // surface distance, so negative is a hold. Every row is min–max since the current
  // grip engaged, so drift shows up as a spread instead of scrolling past.
  const armLabel = useRef<HTMLPreElement>(null);
  const spans = useRef(new Map<string, Span>());

  // The same thing in the scene: a marker on every tracked joint, so "is the grip
  // pinned to the pivot" is answerable by looking. Off by default — they are a
  // debugging aid, not part of the dance — and the refs simply read `null` while
  // unmounted, so the frame callback needs no notion of whether they are shown.
  // Created in a memo rather than by mutating a ref during render, same as
  // `DanceFloor`'s rigs.
  const markers = useMemo(
    () => ({
      pivot: createRef<THREE.Mesh>(),
      elbows: [createRef<THREE.Mesh>(), createRef<THREE.Mesh>()],
      hands: [createRef<THREE.Mesh>(), createRef<THREE.Mesh>()],
    }),
    [],
  );

  const onArms = useCallback((report: ArmReport) => {
    // Markers first: they should track whether or not the readout is legible.
    const pivot = markers.pivot.current;
    if (pivot) {
      pivot.visible = report.dancers.some((d) => d.holding);
      pivot.position.set(report.pivot.x, 0.02, report.pivot.z);
    }
    report.dancers.forEach((d, i) => {
      const side = d.grip === "left" || d.grip === "right" ? d.grip : null;
      for (const [which, marker] of [
        ["elbow", markers.elbows[i]],
        ["hand", markers.hands[i]],
      ] as const) {
        const mesh = marker?.current;
        if (!mesh) continue;
        mesh.visible = side !== null;
        if (side === null) continue;
        const point = which === "elbow" ? d[side].elbow : d[side].hand;
        mesh.position.set(point.x, point.y, point.z);
      }
    });

    const el = armLabel.current;
    if (!el) return;
    const holding = report.dancers.filter((d) => d.holding);
    if (holding.length === 0) {
      spans.current.clear();
      el.textContent = "hands free";
      return;
    }
    track(spans.current, "separation", report.separation);
    for (const d of holding) {
      const hand = d.grip === "left" || d.grip === "right" ? d[d.grip].hand : null;
      if (hand) {
        track(
          spans.current,
          `${d.key} hand↔pivot`,
          Math.hypot(hand.x - report.pivot.x, hand.z - report.pivot.z),
        );
      }
      track(spans.current, `${d.key} along`, d.contact.along);
      track(spans.current, `${d.key} gap`, d.contact.gap);
    }
    el.textContent = [...spans.current]
      .map(([name, s]) => `${name.padEnd(14)} ${fmt(s.min)} → ${fmt(s.max)}   ±${fmt((s.max - s.min) / 2)}`)
      .join("\n");
  }, [markers]);

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

        {/* Keyed on the cast: the frame (and its body-derived scale) is built
            once per mount, so a new cast means a fresh DanceFloor. */}
        <DanceFloor
          key={sizes}
          call={call}
          bpm={bpm}
          loop
          followDrift={drift}
          paused={paused}
          onBeat={onBeat}
          onArms={onArms}
          controllers={controllers}
          {...(SIZE_CASTS[sizes] === undefined ? {} : { shapes: SIZE_CASTS[sizes] })}
        />

        {/* Joint markers: black = the pivot the pair holds over, blue = each elbow,
            red = each hand. A held grip should look nailed to the black dot while
            the bodies breathe past it. */}
        {joints && (
          <>
            <mesh ref={markers.pivot} visible={false}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshBasicMaterial color="#111111" />
            </mesh>
            {markers.elbows.map((ref, i) => (
              <mesh key={`elbow-${String(i)}`} ref={ref} visible={false}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshBasicMaterial color="#2255cc" />
              </mesh>
            ))}
            {markers.hands.map((ref, i) => (
              <mesh key={`hand-${String(i)}`} ref={ref} visible={false}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshBasicMaterial color="#cc3322" />
              </mesh>
            ))}
          </>
        )}
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => { setPaused((p) => !p); }}
            style={{
              padding: "4px 10px",
              cursor: "pointer",
              background: paused ? "#333" : "#fff",
              color: paused ? "#fff" : "#333",
              border: "1px solid #999",
              borderRadius: 4,
            }}
          >
            {paused ? "▶ play" : "⏸ pause"}
          </button>
          <span ref={beatLabel} style={{ fontVariantNumeric: "tabular-nums", color: "#333" }}>
            beat 0.0 / –
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          emote
          {DEBUG_EMOTES.map((e) => (
            <button
              key={e.id}
              onClick={() => { fire(e); }}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                background: emoting === e.id ? "#333" : "#fff",
                color: emoting === e.id ? "#fff" : "#333",
                border: "1px solid #999",
                borderRadius: 4,
              }}
            >
              {e.name}
            </button>
          ))}
        </div>
        <span style={{ color: "#666", fontSize: 11 }}>
          One-shot — the button releases when the emote ends. Arms fold where they
          trespass; a gripped hand ignores the emote entirely; a spin turns the head
          and sweeps the arms but must not turn a driven dancer's body at all — judge
          that on the <strong>chest</strong> dot, not the head dot, which the spin owns.
          Puff up should swell in full while the pair is apart and be squeezed back as
          they close, each dancer by their own share of the gap.
        </span>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={joints} onChange={(e) => { setJoints(e.target.checked); }} />
          joint markers (pivot · elbows · hands)
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={drift} onChange={(e) => { setDrift(e.target.checked); }} />
          follow drift (re-fit frame to centroid)
        </label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          bodies
          {(Object.keys(SIZE_CASTS) as SizeCast[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSizes(s); }}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                background: s === sizes ? "#333" : "#fff",
                color: s === sizes ? "#fff" : "#333",
                border: "1px solid #999",
                borderRadius: 4,
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <span style={{ color: "#666" }}>red = engine +x · blue = engine +y</span>

        {/* Last in the column on purpose: this is the one element whose height
            changes every frame, so nothing that has to be clicked sits below it. */}
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={readout}
            onChange={(e) => {
              // Spans stop accumulating while hidden, so a stale map would otherwise
              // reappear as history from before it was switched off.
              spans.current.clear();
              setReadout(e.target.checked);
            }}
          />
          contact readout (grip drift)
        </label>
        {readout && (
          <>
            <pre
              ref={armLabel}
              style={{
                font: "11px/1.45 ui-monospace, monospace",
                color: "#333",
                margin: 0,
                padding: "6px 8px",
                background: "#f7f7f4",
                border: "1px solid #e0e0da",
                borderRadius: 4,
                whiteSpace: "pre",
              }}
            >
              hands free
            </pre>
            <span style={{ color: "#666", fontSize: 11 }}>
              min → max since the grip engaged. `separation` should breathe; everything
              else should be flat.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
