import type { CharacterBodyShape, HandPose } from "../services/body-shapes";
import { SHAPE_BOUNDS } from "../services/body-shapes";

export type Section = "head" | "body" | "forearm" | "hand" | "layout";
export const ALL_SECTIONS: Section[] = ["head", "body", "forearm", "hand", "layout"];

const PANEL: React.CSSProperties = {
  background: "#12121e",
  border: "1px solid #1e1e30",
  borderRadius: 10,
  padding: "6px 12px 10px",
};

const ROW: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginBottom: 7,
};

const SLIDER: React.CSSProperties = {
  flex: 1,
  accentColor: "#6a4c93",
  cursor: "pointer",
  minWidth: 0,
};

const SUB_LABEL: React.CSSProperties = {
  color: "#555",
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "8px 0 5px",
};

const POSE_LABEL: React.CSSProperties = {
  color: "#6a4c93",
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "10px 0 5px",
  borderTop: "1px solid #1e1e30",
  paddingTop: 8,
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const display = Number.isInteger(step) ? String(Math.round(value)) : value.toFixed(3);
  return (
    <div style={ROW}>
      <span style={{ color: "#aaa", fontSize: 11, minWidth: 82 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={SLIDER}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span style={{ color: "#9b8abf", fontSize: 11, minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {display}
      </span>
    </div>
  );
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: "none",
        border: "none",
        padding: "5px 0 6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        textAlign: "left",
      }}
    >
      <span style={{ color: open ? "#9b59b6" : "#553377", fontSize: 10 }}>{open ? "▾" : "▸"}</span>
      <span style={{ color: open ? "#c080e0" : "#8855aa", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </span>
    </button>
  );
}

interface BodyEditorProps {
  shape: CharacterBodyShape;
  onChange: (shape: CharacterBodyShape) => void;
  openSections: Record<Section, boolean>;
  onToggleSection: (s: Section) => void;
}

// ---------------------------------------------------------------------------
// Patch helpers

function patchSection<K extends "head" | "body" | "forearm" | "layout">(
  shape: CharacterBodyShape,
  section: K,
  field: keyof CharacterBodyShape[K],
  value: number,
): CharacterBodyShape {
  return { ...shape, [section]: { ...shape[section], [field]: value } };
}

function patchHandPose(
  shape: CharacterBodyShape,
  pose: "open" | "closed",
  field: keyof Omit<HandPose, "rotation">,
  value: number,
): CharacterBodyShape {
  return {
    ...shape,
    hand: { ...shape.hand, [pose]: { ...shape.hand[pose], [field]: value } },
  };
}

function patchHandRotation(
  shape: CharacterBodyShape,
  pose: "open" | "closed",
  axis: 0 | 1 | 2,
  value: number,
): CharacterBodyShape {
  const rot = [...shape.hand[pose].rotation] as [number, number, number];
  rot[axis] = value;
  return {
    ...shape,
    hand: { ...shape.hand, [pose]: { ...shape.hand[pose], rotation: rot } },
  };
}

// ---------------------------------------------------------------------------

function HandPoseSliders({
  pose,
  poseLabel,
  handPose,
  shape,
  onChange,
}: {
  pose: "open" | "closed";
  poseLabel: string;
  handPose: HandPose;
  shape: CharacterBodyShape;
  onChange: (s: CharacterBodyShape) => void;
}) {
  const B = SHAPE_BOUNDS.hand;
  const rot = handPose.rotation;
  return (
    <>
      <p style={POSE_LABEL}>{poseLabel}</p>
      <SliderRow label="radius"       value={handPose.radius}          {...B.radius}          onChange={v => onChange(patchHandPose(shape, pose, "radius", v))} />
      <SliderRow label="flatness"     value={handPose.flattenY}        {...B.flattenY}        onChange={v => onChange(patchHandPose(shape, pose, "flattenY", v))} />
      <SliderRow label="wrist gap"    value={handPose.handForearmGap}  {...B.handForearmGap}  onChange={v => onChange(patchHandPose(shape, pose, "handForearmGap", v))} />
      <SliderRow label="width segs"   value={handPose.widthSegments}   {...B.widthSegments}   onChange={v => onChange(patchHandPose(shape, pose, "widthSegments", v))} />
      <SliderRow label="height segs"  value={handPose.heightSegments}  {...B.heightSegments}  onChange={v => onChange(patchHandPose(shape, pose, "heightSegments", v))} />
      <p style={SUB_LABEL}>rotation (°) — left hand mirrors Y & Z</p>
      <SliderRow label="x (tilt fwd)" value={rot[0]} {...B.rotation} onChange={v => onChange(patchHandRotation(shape, pose, 0, v))} />
      <SliderRow label="y (yaw)"      value={rot[1]} {...B.rotation} onChange={v => onChange(patchHandRotation(shape, pose, 1, v))} />
      <SliderRow label="z (roll)"     value={rot[2]} {...B.rotation} onChange={v => onChange(patchHandRotation(shape, pose, 2, v))} />
    </>
  );
}

export function BodyEditor({ shape, onChange, openSections, onToggleSection }: BodyEditorProps) {
  const B = SHAPE_BOUNDS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>

      {/* Head */}
      <div style={PANEL}>
        <SectionHeader label="Head" open={openSections.head} onToggle={() => onToggleSection("head")} />
        {openSections.head && (
          <>
            <SliderRow label="radius"       value={shape.head.radius}         {...B.head.radius}         onChange={v => onChange(patchSection(shape, "head", "radius", v))} />
            <SliderRow label="width segs"   value={shape.head.widthSegments}  {...B.head.widthSegments}  onChange={v => onChange(patchSection(shape, "head", "widthSegments", v))} />
            <SliderRow label="height segs"  value={shape.head.heightSegments} {...B.head.heightSegments} onChange={v => onChange(patchSection(shape, "head", "heightSegments", v))} />
          </>
        )}
      </div>

      {/* Body */}
      <div style={PANEL}>
        <SectionHeader label="Body" open={openSections.body} onToggle={() => onToggleSection("body")} />
        {openSections.body && (
          <>
            <SliderRow label="radius"       value={shape.body.radius}         {...B.body.radius}         onChange={v => onChange(patchSection(shape, "body", "radius", v))} />
            <SliderRow label="height"       value={shape.body.height}         {...B.body.height}         onChange={v => onChange(patchSection(shape, "body", "height", v))} />
            <SliderRow label="cap segs"     value={shape.body.capSegments}    {...B.body.capSegments}    onChange={v => onChange(patchSection(shape, "body", "capSegments", v))} />
            <SliderRow label="radial segs"  value={shape.body.radialSegments} {...B.body.radialSegments} onChange={v => onChange(patchSection(shape, "body", "radialSegments", v))} />
          </>
        )}
      </div>

      {/* Forearms */}
      <div style={PANEL}>
        <SectionHeader label="Forearms" open={openSections.forearm} onToggle={() => onToggleSection("forearm")} />
        {openSections.forearm && (
          <>
            <SliderRow label="elbow radius" value={shape.forearm.topRadius}      {...B.forearm.topRadius}      onChange={v => onChange(patchSection(shape, "forearm", "topRadius", v))} />
            <SliderRow label="wrist radius" value={shape.forearm.bottomRadius}   {...B.forearm.bottomRadius}   onChange={v => onChange(patchSection(shape, "forearm", "bottomRadius", v))} />
            <SliderRow label="length"       value={shape.forearm.height}         {...B.forearm.height}         onChange={v => onChange(patchSection(shape, "forearm", "height", v))} />
            <SliderRow label="sides"        value={shape.forearm.radialSegments} {...B.forearm.radialSegments} onChange={v => onChange(patchSection(shape, "forearm", "radialSegments", v))} />
          </>
        )}
      </div>

      {/* Hands — open and closed poses */}
      <div style={PANEL}>
        <SectionHeader label="Hands" open={openSections.hand} onToggle={() => onToggleSection("hand")} />
        {openSections.hand && (
          <>
            <HandPoseSliders
              pose="open"
              poseLabel="open (resting)"
              handPose={shape.hand.open}
              shape={shape}
              onChange={onChange}
            />
            <HandPoseSliders
              pose="closed"
              poseLabel="closed (fist — stored for animations)"
              handPose={shape.hand.closed}
              shape={shape}
              onChange={onChange}
            />
          </>
        )}
      </div>

      {/* Layout */}
      <div style={PANEL}>
        <SectionHeader label="Layout" open={openSections.layout} onToggle={() => onToggleSection("layout")} />
        {openSections.layout && (
          <>
            <p style={SUB_LABEL}>positioning</p>
            <SliderRow label="arm width"        value={shape.layout.forearmXOffset}  {...B.layout.forearmXOffset}  onChange={v => onChange(patchSection(shape, "layout", "forearmXOffset", v))} />
            <SliderRow label="upper arm space"  value={shape.layout.upperArmSpacing} {...B.layout.upperArmSpacing} onChange={v => onChange(patchSection(shape, "layout", "upperArmSpacing", v))} />
            <SliderRow label="head↔body gap"    value={shape.layout.headBodyGap}     {...B.layout.headBodyGap}     onChange={v => onChange(patchSection(shape, "layout", "headBodyGap", v))} />
          </>
        )}
      </div>

    </div>
  );
}
