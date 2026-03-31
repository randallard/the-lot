import type { ActionKeyframe } from "../services/arm-actions";
import { SliderRow } from "./SliderRow";

const PANEL: React.CSSProperties = {
  background: "#12121e",
  border: "1px solid #1e1e30",
  borderRadius: 10,
  padding: "8px 12px 10px",
};

const ROW: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

const LBL: React.CSSProperties = {
  color: "#aaa",
  fontSize: 11,
  minWidth: 88,
};

const SUB: React.CSSProperties = {
  color: "#555",
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "8px 0 5px",
};

function patchPose(
  kf: ActionKeyframe,
  part: "upperArmRotation" | "forearmRotation" | "handRotation",
  axis: 0 | 1 | 2,
  value: number,
): ActionKeyframe {
  const rot = [...kf.pose[part]] as [number, number, number];
  rot[axis] = value;
  return { ...kf, pose: { ...kf.pose, [part]: rot } };
}

interface KeyframeCardProps {
  keyframe: ActionKeyframe;
  index: number;
  isActive: boolean;
  onChange: (kf: ActionKeyframe) => void;
  onDelete: () => void;
  onSelect: () => void;
}

export function KeyframeCard({ keyframe: kf, index, isActive, onChange, onDelete, onSelect }: KeyframeCardProps) {
  const ua = kf.pose.upperArmRotation;
  const fr = kf.pose.forearmRotation;
  const hr = kf.pose.handRotation;

  return (
    <div
      style={{
        ...PANEL,
        borderColor: isActive ? "#6a4c93" : "#1e1e30",
        cursor: "default",
      }}
      onClick={onSelect}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#6a4c93", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          kf {index + 1}
        </span>
        <input
          value={kf.label}
          placeholder="label"
          onClick={e => e.stopPropagation()}
          onChange={e => onChange({ ...kf, label: e.target.value })}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            borderBottom: "1px solid #2a2a40",
            color: "#ccc",
            fontSize: 11,
            outline: "none",
            padding: "1px 2px",
          }}
        />
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            background: "transparent",
            border: "none",
            color: "#553333",
            fontSize: 14,
            cursor: "pointer",
            padding: "0 2px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <p style={SUB}>upper arm — shoulder pivot (°)</p>
      <SliderRow label="x (fwd/back)" value={ua[0]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "upperArmRotation", 0, v))} />
      <SliderRow label="y (twist)"    value={ua[1]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "upperArmRotation", 1, v))} />
      <SliderRow label="z (raise)"    value={ua[2]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "upperArmRotation", 2, v))} />

      <p style={SUB}>forearm — elbow pivot (°)</p>
      <SliderRow label="x (fwd/back)" value={fr[0]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "forearmRotation", 0, v))} />
      <SliderRow label="y (twist)"    value={fr[1]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "forearmRotation", 1, v))} />
      <SliderRow label="z (bend)"     value={fr[2]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "forearmRotation", 2, v))} />

      <p style={SUB}>hand — wrist pivot (°)</p>
      <SliderRow label="x (tilt)"     value={hr[0]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "handRotation", 0, v))} />
      <SliderRow label="y (wave)"     value={hr[1]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "handRotation", 1, v))} />
      <SliderRow label="z (roll)"     value={hr[2]} min={-180} max={180} step={1} onChange={v => onChange(patchPose(kf, "handRotation", 2, v))} />

      <p style={SUB}>timing</p>
      <SliderRow label="transition (s)" value={kf.transitionDuration} min={0.05} max={3} step={0.05}
        onChange={v => onChange({ ...kf, transitionDuration: v })} />
      <div style={ROW}>
        <span style={LBL}>hold loops</span>
        <input
          type="number"
          min={0}
          max={20}
          value={kf.holdLoops}
          onClick={e => e.stopPropagation()}
          onChange={e => onChange({ ...kf, holdLoops: Math.max(0, parseInt(e.target.value) || 0) })}
          style={{
            width: 52,
            background: "#0d0d1a",
            border: "1px solid #2a2a40",
            borderRadius: 5,
            color: "#9b8abf",
            fontSize: 11,
            padding: "2px 6px",
            textAlign: "right",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Return-to-rest card (always last, not deletable)

interface ReturnCardProps {
  returnDuration: number;
  onChange: (v: number) => void;
}

export function ReturnToRestCard({ returnDuration, onChange }: ReturnCardProps) {
  return (
    <div style={{ ...PANEL, borderColor: "#1e1e30", opacity: 0.7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#444", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          return to rest
        </span>
      </div>
      <SliderRow label="duration (s)" value={returnDuration} min={0.05} max={3} step={0.05} onChange={onChange} />
    </div>
  );
}
