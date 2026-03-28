import { useState, useEffect, useCallback } from "react";
import type { CharacterBodyShape } from "../services/body-shapes";
import {
  type Emote, type EmoteTracks, type TrackName,
  type BodyKeyframe, type HeadKeyframe, type ArmKeyframe,
  type EyeKeyframe, type EffectKeyframe, type Easing,
  TRACK_NAMES, TRACK_LABELS, EASINGS, EFFECT_TYPES,
  makeEmote, makeBodyKf, makeHeadKf, makeArmKf, makeEyeKf, makeEffectKf,
  getEmotes, saveEmote, deleteEmote, sampleEmote,
} from "../services/emotes";
import type { EyeShape } from "../services/eye-shapes";
import type { ArmPose } from "../services/arm-actions";
import { getNpcById } from "../config/npcs";
import { CharacterPreview } from "./CharacterPreview";

// ---------------------------------------------------------------------------
// Styles

const BTN: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2a2a40",
  color: "#888",
  fontSize: 11,
  borderRadius: 7,
  padding: "4px 10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const ROW: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

const LBL: React.CSSProperties = { color: "#aaa", fontSize: 11, minWidth: 92 };
const VAL: React.CSSProperties = { color: "#9b8abf", fontSize: 11, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const SLIDER: React.CSSProperties = { flex: 1, accentColor: "#6a4c93", cursor: "pointer", minWidth: 0 };
const SUB: React.CSSProperties = { color: "#555", fontSize: 9, textTransform: "uppercase" as const, letterSpacing: 1, margin: "8px 0 4px" };
const PANEL: React.CSSProperties = { background: "#12121e", border: "1px solid #1e1e30", borderRadius: 10, padding: "8px 12px 10px" };

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  const d = step < 1 ? value.toFixed(2) : String(Math.round(value));
  return (
    <div style={ROW}>
      <span style={LBL}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        style={SLIDER} onChange={e => onChange(parseFloat(e.target.value))} />
      <span style={VAL}>{d}</span>
    </div>
  );
}

function EasingSelect({ value, onChange }: { value: Easing; onChange: (e: Easing) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
      {EASINGS.map(e => (
        <button key={e} onClick={() => onChange(e)}
          style={{ ...BTN, flex: 1, borderColor: value === e ? "#6a4c93" : "#2a2a40", color: value === e ? "#c080e0" : "#555", fontSize: 9, padding: "2px 4px" }}>
          {e.replace("ease-", "~").replace("ease", "~")}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-track keyframe cards

function BodyKfCard({ kf, onChange, onDelete, isActive, onSelect }: {
  kf: BodyKeyframe; onChange: (k: BodyKeyframe) => void; onDelete: () => void;
  isActive: boolean; onSelect: () => void;
}) {
  return (
    <div style={{ ...PANEL, borderColor: isActive ? "#6a4c93" : "#1e1e30", cursor: "default" }} onClick={onSelect}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#6a4c93", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>body</span>
        <span style={{ flex: 1 }} />
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: "transparent", border: "none", color: "#553333", fontSize: 14, cursor: "pointer" }}>×</button>
      </div>
      <SliderRow label="time (s)"   value={kf.time}      min={0} max={20}   step={0.05} onChange={v => onChange({ ...kf, time: v })} />
      <SliderRow label="jump (ΔY)"  value={kf.deltaY}    min={0} max={3}    step={0.05} onChange={v => onChange({ ...kf, deltaY: v })} />
      <SliderRow label="spin (°)"   value={kf.deltaRotY} min={-360} max={360} step={1}  onChange={v => onChange({ ...kf, deltaRotY: v })} />
      <p style={SUB}>easing</p>
      <EasingSelect value={kf.easing} onChange={e => onChange({ ...kf, easing: e })} />
    </div>
  );
}

function HeadKfCard({ kf, onChange, onDelete, isActive, onSelect }: {
  kf: HeadKeyframe; onChange: (k: HeadKeyframe) => void; onDelete: () => void;
  isActive: boolean; onSelect: () => void;
}) {
  const patch = (axis: 0|1|2, v: number) => {
    const r = [...kf.deltaRotation] as [number,number,number];
    r[axis] = v;
    onChange({ ...kf, deltaRotation: r });
  };
  return (
    <div style={{ ...PANEL, borderColor: isActive ? "#6a4c93" : "#1e1e30", cursor: "default" }} onClick={onSelect}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#6a4c93", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>head</span>
        <span style={{ flex: 1 }} />
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: "transparent", border: "none", color: "#553333", fontSize: 14, cursor: "pointer" }}>×</button>
      </div>
      <SliderRow label="time (s)"   value={kf.time}               min={0} max={20} step={0.05} onChange={v => onChange({ ...kf, time: v })} />
      <SliderRow label="Δx (nod)"   value={kf.deltaRotation[0]}   min={-90} max={90} step={1} onChange={v => patch(0, v)} />
      <SliderRow label="Δy (turn)"  value={kf.deltaRotation[1]}   min={-180} max={180} step={1} onChange={v => patch(1, v)} />
      <SliderRow label="Δz (tilt)"  value={kf.deltaRotation[2]}   min={-90} max={90} step={1} onChange={v => patch(2, v)} />
      <p style={SUB}>easing</p>
      <EasingSelect value={kf.easing} onChange={e => onChange({ ...kf, easing: e })} />
    </div>
  );
}

function ArmKfCard({ kf, onChange, onDelete, isActive, onSelect, label }: {
  kf: ArmKeyframe; onChange: (k: ArmKeyframe) => void; onDelete: () => void;
  isActive: boolean; onSelect: () => void; label: string;
}) {
  const patchPose = (part: keyof ArmPose, axis: 0|1|2, v: number) => {
    const rot = [...kf.pose[part]] as [number,number,number];
    rot[axis] = v;
    onChange({ ...kf, pose: { ...kf.pose, [part]: rot } });
  };
  const ua = kf.pose.upperArmRotation;
  const fa = kf.pose.forearmRotation;
  const ha = kf.pose.handRotation;
  return (
    <div style={{ ...PANEL, borderColor: isActive ? "#6a4c93" : "#1e1e30", cursor: "default" }} onClick={onSelect}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#6a4c93", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ flex: 1 }} />
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: "transparent", border: "none", color: "#553333", fontSize: 14, cursor: "pointer" }}>×</button>
      </div>
      <SliderRow label="time (s)"     value={kf.time} min={0} max={20} step={0.05} onChange={v => onChange({ ...kf, time: v })} />
      <p style={SUB}>upper arm (°)</p>
      <SliderRow label="x fwd/back" value={ua[0]} min={-180} max={180} step={1} onChange={v => patchPose("upperArmRotation", 0, v)} />
      <SliderRow label="y twist"    value={ua[1]} min={-180} max={180} step={1} onChange={v => patchPose("upperArmRotation", 1, v)} />
      <SliderRow label="z raise"    value={ua[2]} min={-180} max={180} step={1} onChange={v => patchPose("upperArmRotation", 2, v)} />
      <p style={SUB}>forearm (°)</p>
      <SliderRow label="x fwd/back" value={fa[0]} min={-180} max={180} step={1} onChange={v => patchPose("forearmRotation", 0, v)} />
      <SliderRow label="y twist"    value={fa[1]} min={-180} max={180} step={1} onChange={v => patchPose("forearmRotation", 1, v)} />
      <SliderRow label="z bend"     value={fa[2]} min={-180} max={180} step={1} onChange={v => patchPose("forearmRotation", 2, v)} />
      <p style={SUB}>hand (°)</p>
      <SliderRow label="x tilt"     value={ha[0]} min={-180} max={180} step={1} onChange={v => patchPose("handRotation", 0, v)} />
      <SliderRow label="y wave"     value={ha[1]} min={-180} max={180} step={1} onChange={v => patchPose("handRotation", 1, v)} />
      <SliderRow label="z roll"     value={ha[2]} min={-180} max={180} step={1} onChange={v => patchPose("handRotation", 2, v)} />
      <p style={SUB}>easing</p>
      <EasingSelect value={kf.easing} onChange={e => onChange({ ...kf, easing: e })} />
    </div>
  );
}

const EYE_NUM_FIELDS: Array<{ key: keyof EyeShape; label: string; min: number; max: number; step: number }> = [
  { key: "width",       label: "width",      min: 0.03, max: 0.28, step: 0.005 },
  { key: "height",      label: "height",     min: 0.02, max: 0.18, step: 0.005 },
  { key: "irisSize",    label: "iris size",  min: 0.2,  max: 1.0,  step: 0.05  },
  { key: "irisOffsetY", label: "iris Δy",    min: -0.06, max: 0.06, step: 0.002 },
  { key: "rotation",    label: "rotation °", min: -45,  max: 45,   step: 1     },
  { key: "arcTop",      label: "arc top",    min: -0.06, max: 0.06, step: 0.002 },
  { key: "arcBottom",   label: "arc bottom", min: -0.06, max: 0.06, step: 0.002 },
  { key: "arcLeft",     label: "arc left",   min: -0.06, max: 0.06, step: 0.002 },
  { key: "arcRight",    label: "arc right",  min: -0.06, max: 0.06, step: 0.002 },
  { key: "cornerTL",    label: "corner TL",  min: 0, max: 1, step: 0.05 },
  { key: "cornerTR",    label: "corner TR",  min: 0, max: 1, step: 0.05 },
  { key: "cornerBL",    label: "corner BL",  min: 0, max: 1, step: 0.05 },
  { key: "cornerBR",    label: "corner BR",  min: 0, max: 1, step: 0.05 },
];

function EyeKfCard({ kf, onChange, onDelete, isActive, onSelect }: {
  kf: EyeKeyframe; onChange: (k: EyeKeyframe) => void; onDelete: () => void;
  isActive: boolean; onSelect: () => void;
}) {
  const activeKeys = Object.keys(kf.override) as (keyof EyeShape)[];
  const addableFields = EYE_NUM_FIELDS.filter(f => !activeKeys.includes(f.key));

  return (
    <div style={{ ...PANEL, borderColor: isActive ? "#6a4c93" : "#1e1e30", cursor: "default" }} onClick={onSelect}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#6a4c93", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>eyes</span>
        <span style={{ flex: 1 }} />
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: "transparent", border: "none", color: "#553333", fontSize: 14, cursor: "pointer" }}>×</button>
      </div>
      <SliderRow label="time (s)" value={kf.time} min={0} max={20} step={0.05} onChange={v => onChange({ ...kf, time: v })} />
      {EYE_NUM_FIELDS.filter(f => activeKeys.includes(f.key)).map(f => (
        <div key={String(f.key)} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ flex: 1 }}>
            <SliderRow
              label={f.label}
              value={(kf.override[f.key] as number) ?? 0}
              min={f.min} max={f.max} step={f.step}
              onChange={v => onChange({ ...kf, override: { ...kf.override, [f.key]: v } })}
            />
          </div>
          <button
            onClick={e => { e.stopPropagation(); const next = { ...kf.override }; delete next[f.key]; onChange({ ...kf, override: next }); }}
            style={{ ...BTN, border: "none", color: "#553333", padding: "0 2px", marginBottom: 6 }}>×</button>
        </div>
      ))}
      {addableFields.length > 0 && (
        <select
          value=""
          onChange={e => { if (e.target.value) onChange({ ...kf, override: { ...kf.override, [e.target.value]: 0 } }); }}
          onClick={e => e.stopPropagation()}
          style={{ width: "100%", background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 5, color: "#666", fontSize: 10, padding: "3px 6px", marginBottom: 6 }}
        >
          <option value="">+ add field…</option>
          {addableFields.map(f => <option key={String(f.key)} value={String(f.key)}>{f.label}</option>)}
        </select>
      )}
      <p style={SUB}>easing</p>
      <EasingSelect value={kf.easing} onChange={e => onChange({ ...kf, easing: e })} />
    </div>
  );
}

function EffectKfCard({ kf, onChange, onDelete, isActive, onSelect }: {
  kf: EffectKeyframe; onChange: (k: EffectKeyframe) => void; onDelete: () => void;
  isActive: boolean; onSelect: () => void;
}) {
  return (
    <div style={{ ...PANEL, borderColor: isActive ? "#6a4c93" : "#1e1e30", cursor: "default" }} onClick={onSelect}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#6a4c93", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>effect</span>
        <span style={{ flex: 1 }} />
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background: "transparent", border: "none", color: "#553333", fontSize: 14, cursor: "pointer" }}>×</button>
      </div>
      <SliderRow label="time (s)"    value={kf.time}     min={0}   max={20}  step={0.05} onChange={v => onChange({ ...kf, time: v })} />
      <SliderRow label="duration (s)" value={kf.duration} min={0.1} max={10}  step={0.1}  onChange={v => onChange({ ...kf, duration: v })} />
      <SliderRow label="offset Y"    value={kf.offsetY}  min={0}   max={2}   step={0.05} onChange={v => onChange({ ...kf, offsetY: v })} />
      <div style={ROW}>
        <span style={LBL}>type</span>
        <select value={kf.type} onChange={e => onChange({ ...kf, type: e.target.value as typeof kf.type })}
          style={{ flex: 1, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 5, color: "#9b8abf", fontSize: 11, padding: "2px 6px" }}>
          {EFFECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline view

function Timeline({ emote, selectedId, scrubTime, onScrub, onSelect }: {
  emote: Emote;
  selectedId: string | null;
  scrubTime: number;
  onScrub: (t: number) => void;
  onSelect: (trackName: TrackName, id: string) => void;
}) {
  const dur = emote.duration;

  function pct(t: number) {
    return `${Math.max(0, Math.min(1, t / dur)) * 100}%`;
  }

  const trackRows: Array<{ name: TrackName; kfs: Array<{ id: string; time: number }> }> = TRACK_NAMES.map(name => ({
    name,
    kfs: (emote.tracks[name] as Array<{ id: string; time: number }>),
  })).filter(r => r.kfs.length > 0);

  return (
    <div style={{ padding: "8px 12px" }}>
      {/* Ruler */}
      <div style={{ position: "relative", height: 18, marginBottom: 4, userSelect: "none" }}
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          onScrub(((e.clientX - rect.left) / rect.width) * dur);
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderBottom: "1px solid #2a2a40" }} />
        {Array.from({ length: Math.floor(dur) + 1 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: pct(i), top: 0, bottom: 0, borderLeft: "1px solid #2a2a40" }}>
            <span style={{ position: "absolute", top: 2, left: 2, fontSize: 8, color: "#444" }}>{i}s</span>
          </div>
        ))}
        {/* Playhead */}
        <div style={{ position: "absolute", left: pct(scrubTime), top: 0, bottom: 0, width: 1, background: "#c080e0", pointerEvents: "none" }} />
      </div>

      {/* Track rows */}
      {trackRows.length === 0 ? (
        <div style={{ color: "#333", fontSize: 11, textAlign: "center", padding: "20px 0" }}>no keyframes yet</div>
      ) : trackRows.map(row => (
        <div key={row.name} style={{ display: "flex", alignItems: "center", height: 28, marginBottom: 2 }}>
          <span style={{ width: 52, fontSize: 9, color: "#555", flexShrink: 0, textTransform: "uppercase", letterSpacing: 1 }}>
            {TRACK_LABELS[row.name]}
          </span>
          <div style={{ flex: 1, position: "relative", height: "100%", borderBottom: "1px solid #1a1a28" }}
            onClick={e => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              onScrub(((e.clientX - rect.left) / rect.width) * dur);
            }}
          >
            {row.kfs.map(kf => (
              <div
                key={kf.id}
                title={`t=${kf.time.toFixed(2)}s`}
                onClick={e => { e.stopPropagation(); onSelect(row.name, kf.id); }}
                style={{
                  position: "absolute",
                  left: pct(kf.time),
                  top: "50%",
                  transform: "translate(-50%, -50%) rotate(45deg)",
                  width: 8, height: 8,
                  background: kf.id === selectedId ? "#c080e0" : "#6a4c93",
                  border: `1px solid ${kf.id === selectedId ? "#e0a0ff" : "#9060b0"}`,
                  cursor: "pointer",
                }}
              />
            ))}
            {/* Playhead */}
            <div style={{ position: "absolute", left: pct(scrubTime), top: 0, bottom: 0, width: 1, background: "#c080e055", pointerEvents: "none" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor view

type EditorMode = "cards" | "timeline";

interface EditorViewProps {
  emote: Emote;
  shape: CharacterBodyShape;
  color: string;
  onBack: () => void;
  onSave: (emote: Emote) => void;
  isWide: boolean;
}

function EditorView({ emote: initial, shape, color, onBack, onSave, isWide }: EditorViewProps) {
  const [emote, setEmote]         = useState<Emote>(initial);
  const [mode, setMode]           = useState<EditorMode>("cards");
  const [activeTrack, setActiveTrack] = useState<TrackName>("rightArm");
  const [activeKfId, setActiveKfId]   = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  // Static pose used when not playing (scrub position preview)
  const scrubPose = !isPlaying ? sampleEmote(emote, scrubTime) : undefined;

  const updateTrack = useCallback(<K extends TrackName>(track: K, kfs: EmoteTracks[K]) => {
    setEmote(e => ({ ...e, tracks: { ...e.tracks, [track]: kfs } }));
  }, []);

  function addKf(track: TrackName) {
    const lastTime = scrubTime > 0 ? scrubTime : emote.duration * 0.5;
    switch (track) {
      case "body":     updateTrack("body",     [...emote.tracks.body,     makeBodyKf(lastTime)]);    break;
      case "head":     updateTrack("head",     [...emote.tracks.head,     makeHeadKf(lastTime)]);    break;
      case "rightArm": updateTrack("rightArm", [...emote.tracks.rightArm, makeArmKf(lastTime)]);     break;
      case "leftArm":  updateTrack("leftArm",  [...emote.tracks.leftArm,  makeArmKf(lastTime)]);     break;
      case "eyes":     updateTrack("eyes",     [...emote.tracks.eyes,     makeEyeKf(lastTime)]);     break;
      case "effects":  updateTrack("effects",  [...emote.tracks.effects,  makeEffectKf(lastTime)]);  break;
    }
  }

  function deleteKf(track: TrackName, id: string) {
    const updated = (emote.tracks[track] as Array<{ id: string }>).filter(k => k.id !== id);
    updateTrack(track, updated as EmoteTracks[typeof track]);
    if (activeKfId === id) setActiveKfId(null);
  }

  function handleTimelineSelect(track: TrackName, id: string) {
    setActiveTrack(track);
    setActiveKfId(id);
  }

  const trackKfs = emote.tracks[activeTrack] as Array<{ id: string; time: number }>;
  const sortedKfs = [...trackKfs].sort((a, b) => a.time - b.time);

  return (
    <div style={{ display: "flex", flexDirection: isWide ? "row" : "column", flex: 1, minHeight: 0, overflow: "hidden" }}>

      {/* Preview */}
      <div style={{
        flexShrink: 0,
        position: "relative",
        ...(isWide
          ? { width: "42%", minWidth: 240, maxWidth: 460, borderRight: "1px solid #1a1a2e" }
          : { height: 200, borderBottom: "1px solid #1a1a2e" }),
      }}>
        <CharacterPreview
          shape={shape} color={color}
          emotePreview={emote}
          isEmotePlaying={isPlaying}
          resolvedPoseOverride={scrubPose}
        />
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <button onClick={() => setIsPlaying(p => !p)}
            style={{ ...BTN, pointerEvents: "auto", borderColor: isPlaying ? "#6a4c93" : "#2a2a40", color: isPlaying ? "#c080e0" : "#666", background: "#0a0a14cc" }}>
            {isPlaying ? "■ stop" : "▶ preview"}
          </button>
        </div>
      </div>

      {/* Editor pane */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Emote settings */}
        <div style={{ padding: isWide ? "12px 16px 0" : "8px 12px 0", flexShrink: 0 }}>
          <input
            value={emote.name}
            onChange={e => setEmote(em => ({ ...em, name: e.target.value }))}
            placeholder="emote name"
            style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #2a2a40", color: "#e0e0ff", fontSize: 15, fontWeight: 700, outline: "none", padding: "4px 2px", boxSizing: "border-box" as const, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" as const }}>
            <SliderRow label="duration (s)" value={emote.duration} min={0.1} max={30} step={0.1}
              onChange={v => setEmote(em => ({ ...em, duration: v }))} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#aaa", fontSize: 11, flex: 1 }}>loop</span>
            <button onClick={() => setEmote(em => ({ ...em, loop: !em.loop }))}
              style={{ ...BTN, borderColor: emote.loop ? "#6a4c93" : "#2a2a40", color: emote.loop ? "#c080e0" : "#666" }}>
              {emote.loop ? "on" : "off"}
            </button>
            {emote.loop && (
              <>
                <span style={{ color: "#666", fontSize: 11 }}>×</span>
                <input type="number" min={1} max={99} value={emote.loopCount ?? ""}
                  placeholder="∞"
                  onChange={e => setEmote(em => ({ ...em, loopCount: e.target.value ? parseInt(e.target.value) : undefined }))}
                  style={{ width: 44, background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 5, color: "#9b8abf", fontSize: 11, padding: "2px 6px", textAlign: "right" as const }}
                />
              </>
            )}
          </div>
        </div>

        {/* Mode toggle + track tabs */}
        <div style={{ borderTop: "1px solid #1a1a28", borderBottom: "1px solid #1a1a28", padding: "6px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {(["cards", "timeline"] as EditorMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ ...BTN, borderColor: mode === m ? "#6a4c93" : "#2a2a40", color: mode === m ? "#c080e0" : "#555", fontSize: 10 }}>
                {m === "cards" ? "≡ cards" : "— timeline"}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline mode */}
        {mode === "timeline" && (
          <div style={{ flexShrink: 0 }}>
            <Timeline
              emote={emote}
              selectedId={activeKfId}
              scrubTime={scrubTime}
              onScrub={t => { setScrubTime(t); setIsPlaying(false); }}
              onSelect={handleTimelineSelect}
            />
          </div>
        )}

        {/* Track tabs (both modes) */}
        <div style={{ display: "flex", gap: 4, padding: "8px 12px 4px", flexShrink: 0, overflowX: "auto" as const }}>
          {TRACK_NAMES.map(t => (
            <button key={t} onClick={() => { setActiveTrack(t); setActiveKfId(null); }}
              style={{
                ...BTN,
                borderColor: activeTrack === t ? "#6a4c93" : "#2a2a40",
                color: activeTrack === t ? "#c080e0" : "#555",
                fontSize: 10,
                position: "relative",
              }}>
              {TRACK_LABELS[t]}
              {emote.tracks[t].length > 0 && (
                <span style={{ marginLeft: 4, background: "#3a2a50", borderRadius: 8, padding: "0 4px", fontSize: 9, color: "#9060c0" }}>
                  {emote.tracks[t].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Card list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 12px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedKfs.map(kf => {
              const id = kf.id;
              const isActive = id === activeKfId;
              const commonProps = {
                isActive, onSelect: () => setActiveKfId(id),
                onDelete: () => deleteKf(activeTrack, id),
              };
              switch (activeTrack) {
                case "body": return (
                  <BodyKfCard key={id} kf={kf as BodyKeyframe}
                    onChange={k => { const kfs = emote.tracks.body.map(x => x.id === id ? k : x); updateTrack("body", kfs); }}
                    {...commonProps} />
                );
                case "head": return (
                  <HeadKfCard key={id} kf={kf as HeadKeyframe}
                    onChange={k => { const kfs = emote.tracks.head.map(x => x.id === id ? k : x); updateTrack("head", kfs); }}
                    {...commonProps} />
                );
                case "rightArm": return (
                  <ArmKfCard key={id} kf={kf as ArmKeyframe} label="R arm"
                    onChange={k => { const kfs = emote.tracks.rightArm.map(x => x.id === id ? k : x); updateTrack("rightArm", kfs); }}
                    {...commonProps} />
                );
                case "leftArm": return (
                  <ArmKfCard key={id} kf={kf as ArmKeyframe} label="L arm"
                    onChange={k => { const kfs = emote.tracks.leftArm.map(x => x.id === id ? k : x); updateTrack("leftArm", kfs); }}
                    {...commonProps} />
                );
                case "eyes": return (
                  <EyeKfCard key={id} kf={kf as EyeKeyframe}
                    onChange={k => { const kfs = emote.tracks.eyes.map(x => x.id === id ? k : x); updateTrack("eyes", kfs); }}
                    {...commonProps} />
                );
                case "effects": return (
                  <EffectKfCard key={id} kf={kf as EffectKeyframe}
                    onChange={k => { const kfs = emote.tracks.effects.map(x => x.id === id ? k : x); updateTrack("effects", kfs); }}
                    {...commonProps} />
                );
              }
            })}
          </div>

          <button onClick={() => addKf(activeTrack)}
            style={{ ...BTN, borderColor: "#2a2a40", color: "#666", borderStyle: "dashed", padding: "8px", fontSize: 12, width: "100%", textAlign: "center" as const, marginTop: 10 }}>
            + add {TRACK_LABELS[activeTrack]} keyframe
          </button>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button onClick={() => { onSave(emote); onBack(); }}
              style={{ ...BTN, borderColor: "#6a4c93", color: "#c080e0", fontSize: 12, padding: "7px 24px" }}>
              save emote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view

interface ListViewProps {
  emotes: Emote[];
  onEdit: (e: Emote) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function ListView({ emotes, onEdit, onNew, onDelete }: ListViewProps) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
      {emotes.length === 0 ? (
        <div style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 40 }}>no emotes yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {emotes.map(e => (
            <div key={e.id}
              style={{ background: "#12121e", border: "1px solid #1e1e30", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => onEdit(e)}>
              <span style={{ flex: 1, color: "#ccc", fontSize: 13 }}>{e.name}</span>
              {e.tags.length > 0 && (
                <span style={{ color: "#555", fontSize: 10 }}>{e.tags.join(", ")}</span>
              )}
              <span style={{ color: "#555", fontSize: 11 }}>{e.duration.toFixed(1)}s</span>
              <button onClick={ev => { ev.stopPropagation(); onDelete(e.id); }}
                style={{ ...BTN, border: "none", color: "#553333", fontSize: 14, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
        <button onClick={onNew}
          style={{ ...BTN, borderColor: "#6a4c93", color: "#c080e0", fontSize: 12, padding: "6px 18px" }}>
          + new emote
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// useIsWide

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 720);
  useEffect(() => {
    const h = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return wide;
}

// ---------------------------------------------------------------------------
// Root modal

interface EmoteBuilderModalProps {
  subjectId: string;
  shape: CharacterBodyShape;
  onClose: () => void;
}

export function EmoteBuilderModal({ subjectId, shape, onClose }: EmoteBuilderModalProps) {
  const [emotes, setEmotes] = useState<Emote[]>(() => getEmotes(subjectId));
  const [editing, setEditing] = useState<Emote | null>(null);
  const isWide = useIsWide();

  const npc = subjectId !== "player" ? getNpcById(subjectId) : null;
  const label = npc ? `${npc.emoji} ${npc.displayName}` : "you";
  const color = npc ? npc.appearance.bodyColor : "#444444";

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") editing ? setEditing(null) : onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [editing, onClose]);

  const handleSave = useCallback((emote: Emote) => {
    saveEmote(subjectId, emote);
    setEmotes(getEmotes(subjectId));
  }, [subjectId]);

  const handleDelete = useCallback((id: string) => {
    deleteEmote(subjectId, id);
    setEmotes(getEmotes(subjectId));
  }, [subjectId]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9001, background: "#0a0a14", display: "flex", flexDirection: "column", fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isWide ? "12px 20px 10px" : "10px 14px 8px", borderBottom: "1px solid #1a1a2e", flexShrink: 0 }}>
        <button onClick={editing ? () => setEditing(null) : onClose}
          style={{ ...BTN, color: "#9b8abf", fontSize: 20, border: "none", padding: "2px 8px 2px 0" }}>‹</button>
        <span style={{ color: "#c080e0", fontSize: isWide ? 16 : 14, fontWeight: 700, flex: 1 }}>
          {editing ? editing.name || "new emote" : "emotes"}
        </span>
        <span style={{ color: "#666", fontSize: 12, marginRight: 6 }}>{label}</span>
        {!editing && (
          <button onClick={() => setEditing(makeEmote())}
            style={{ ...BTN, borderColor: "#6a4c93", color: "#c080e0" }}>+ new</button>
        )}
      </div>

      {editing ? (
        <EditorView
          emote={editing}
          shape={shape}
          color={color}
          onBack={() => setEditing(null)}
          onSave={handleSave}
          isWide={isWide}
        />
      ) : (
        <ListView
          emotes={emotes}
          onEdit={setEditing}
          onNew={() => setEditing(makeEmote())}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
