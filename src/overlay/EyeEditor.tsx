import { useState, useRef } from "react";
import type { CharacterEyes, EyeShape } from "../services/eye-shapes";
import { EYE_BOUNDS, SUGGESTED_EXPRESSIONS } from "../services/eye-shapes";

// ---------------------------------------------------------------------------
// Shared styles

const ROW: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

const SLIDER: React.CSSProperties = {
  flex: 1,
  accentColor: "#6a4c93",
  cursor: "pointer",
  minWidth: 0,
};

const SUB: React.CSSProperties = {
  color: "#555",
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "8px 0 4px",
};

const BTN: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2a2a40",
  color: "#888",
  fontSize: 10,
  borderRadius: 6,
  padding: "2px 8px",
  cursor: "pointer",
};

// ---------------------------------------------------------------------------
// SliderRow — with optional "overridden" indicator for expression editors

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  overridden?: boolean;
  onReset?: () => void;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, overridden, onReset, onChange }: SliderRowProps) {
  const display = step < 0.1 ? value.toFixed(3) : step < 1 ? value.toFixed(2) : String(Math.round(value));
  return (
    <div style={ROW}>
      <span style={{ color: overridden ? "#c080e0" : "#aaa", fontSize: 11, minWidth: 82 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        style={{ ...SLIDER, accentColor: overridden ? "#c080e0" : "#6a4c93" }}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span style={{ color: overridden ? "#c080e0" : "#9b8abf", fontSize: 11, minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {display}
      </span>
      {onReset && overridden && (
        <button onClick={onReset} style={{ ...BTN, border: "none", color: "#553377", fontSize: 12, padding: "0 2px" }}>×</button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color picker row

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ ...ROW, marginBottom: 6 }}>
      <span style={{ color: "#aaa", fontSize: 11, minWidth: 82 }}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, height: 22, cursor: "pointer", background: "none", border: "1px solid #2a2a40", borderRadius: 4 }}
      />
      <span style={{ color: "#9b8abf", fontSize: 11, minWidth: 36, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mirror map — fields that flip left↔right when mirroring across the face centre

const MIRROR_MAP: Partial<Record<keyof EyeShape, keyof EyeShape>> = {
  cornerTL: "cornerTR",
  cornerTR: "cornerTL",
  cornerBL: "cornerBR",
  cornerBR: "cornerBL",
  arcLeft:  "arcRight",
  arcRight: "arcLeft",
  // arcTop, arcBottom, width, height, iris — copy directly (no left/right component)
};

// ---------------------------------------------------------------------------
// Patch helpers

function patchEye(eye: EyeShape, field: keyof EyeShape, value: number | string | boolean): EyeShape {
  return { ...eye, [field]: value };
}

// ---------------------------------------------------------------------------
// EyeShapePanel — full eye shape editor

interface EyeShapePanelProps {
  eye: EyeShape;
  /** When provided, this is an expression editor — shows overrides highlighted */
  base?: EyeShape;
  onChange: (eye: EyeShape) => void;
  /** When in expression mode, called to clear a single field override */
  onResetField?: (field: keyof EyeShape) => void;
  rotationMirrored?: boolean;
  onRotationMirroredChange?: (v: boolean) => void;
}

function EyeShapePanel({ eye, base, onChange, onResetField, rotationMirrored, onRotationMirroredChange }: EyeShapePanelProps) {
  const B = EYE_BOUNDS;
  const isExp = !!base;

  function field(f: keyof EyeShape) {
    return {
      overridden: isExp ? eye[f] !== base![f] : undefined,
      onReset: isExp && onResetField ? () => onResetField(f) : undefined,
    };
  }

  return (
    <>
      <p style={SUB}>dimensions</p>
      <SliderRow label="width"  value={eye.width}  {...B.width}  {...field("width")}  onChange={v => onChange(patchEye(eye, "width", v))} />
      <SliderRow label="height" value={eye.height} {...B.height} {...field("height")} onChange={v => onChange(patchEye(eye, "height", v))} />

      <p style={SUB}>iris</p>
      <ColorRow label="color" value={eye.irisColor} onChange={v => onChange(patchEye(eye, "irisColor", v))} />
      <SliderRow label="size"     value={eye.irisSize}    {...B.irisSize}    {...field("irisSize")}    onChange={v => onChange(patchEye(eye, "irisSize", v))} />
      <SliderRow label="offset y" value={eye.irisOffsetY} {...B.irisOffsetY} {...field("irisOffsetY")} onChange={v => onChange(patchEye(eye, "irisOffsetY", v))} />

      <p style={SUB}>transform</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <SliderRow label="rotation °" value={eye.rotation} {...B.rotation} {...field("rotation")} onChange={v => onChange(patchEye(eye, "rotation", v))} />
        </div>
        {onRotationMirroredChange && (
          <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", color: rotationMirrored ? "#c080e0" : "#555", fontSize: 10, whiteSpace: "nowrap", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={rotationMirrored ?? true}
              onChange={e => onRotationMirroredChange(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#6a4c93" }}
            />
            sym
          </label>
        )}
      </div>

      <p style={SUB}>sclera (white)</p>
      <div style={{ ...ROW, marginBottom: 8 }}>
        <span style={{ color: "#aaa", fontSize: 11 }}>show white</span>
        <button
          onClick={() => onChange(patchEye(eye, "showWhite", !eye.showWhite))}
          style={{
            background: "transparent",
            border: `1px solid ${eye.showWhite ? "#6a4c93" : "#2a2a40"}`,
            color: eye.showWhite ? "#c080e0" : "#666",
            fontSize: 10,
            borderRadius: 6,
            padding: "2px 10px",
            cursor: "pointer",
          }}
        >
          {eye.showWhite ? "on" : "off"}
        </button>
      </div>

      <p style={SUB}>corners (0=sharp, 1=round)</p>
      <SliderRow label="top left"     value={eye.cornerTL}   {...B.corner}     {...field("cornerTL")}   onChange={v => onChange(patchEye(eye, "cornerTL", v))} />
      <SliderRow label="top right"    value={eye.cornerTR}   {...B.corner}     {...field("cornerTR")}   onChange={v => onChange(patchEye(eye, "cornerTR", v))} />
      <SliderRow label="bottom left"  value={eye.cornerBL}   {...B.corner}     {...field("cornerBL")}   onChange={v => onChange(patchEye(eye, "cornerBL", v))} />
      <SliderRow label="bottom right" value={eye.cornerBR}   {...B.corner}     {...field("cornerBR")}   onChange={v => onChange(patchEye(eye, "cornerBR", v))} />

      <p style={SUB}>edge arcs (0=flat, +=convex, -=concave)</p>
      <SliderRow label="top"    value={eye.arcTop}    {...B.arc} {...field("arcTop")}    onChange={v => onChange(patchEye(eye, "arcTop", v))} />
      <SliderRow label="bottom" value={eye.arcBottom} {...B.arc} {...field("arcBottom")} onChange={v => onChange(patchEye(eye, "arcBottom", v))} />
      <SliderRow label="left"   value={eye.arcLeft}   {...B.arc} {...field("arcLeft")}   onChange={v => onChange(patchEye(eye, "arcLeft", v))} />
      <SliderRow label="right"  value={eye.arcRight}  {...B.arc} {...field("arcRight")}  onChange={v => onChange(patchEye(eye, "arcRight", v))} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Expression row — collapsible override editor

interface ExpressionRowProps {
  name: string;
  baseRight: EyeShape;
  baseLeft: EyeShape;
  override: Partial<EyeShape>;
  asymmetric: boolean;
  onUpdate: (override: Partial<EyeShape>) => void;
  onDelete: () => void;
}

function ExpressionRow({ name, baseRight, override, onUpdate, onDelete }: ExpressionRowProps) {
  const [open, setOpen] = useState(false);

  // Resolved eye = base merged with overrides (what the editor shows)
  const resolved: EyeShape = { ...baseRight, ...override };

  function handleChange(updated: EyeShape) {
    // Build sparse override: only include fields that differ from base
    const sparse: Partial<EyeShape> = {};
    (Object.keys(updated) as (keyof EyeShape)[]).forEach(k => {
      if (updated[k] !== baseRight[k]) {
        (sparse as Record<string, unknown>)[k] = updated[k];
      }
    });
    onUpdate(sparse);
  }

  function handleResetField(field: keyof EyeShape) {
    const next = { ...override };
    delete next[field];
    onUpdate(next);
  }

  const overrideCount = Object.keys(override).length;

  return (
    <div style={{ background: "#0e0e1a", border: "1px solid #1a1a2c", borderRadius: 8, overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: open ? "#9b59b6" : "#553377", fontSize: 10 }}>{open ? "▾" : "▸"}</span>
        <span style={{ flex: 1, color: "#bbb", fontSize: 12 }}>{name}</span>
        {overrideCount > 0 && (
          <span style={{ color: "#6a4c93", fontSize: 10 }}>{overrideCount} override{overrideCount !== 1 ? "s" : ""}</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ ...BTN, border: "none", color: "#553333", fontSize: 13, padding: "0 2px" }}
        >
          ×
        </button>
      </div>
      {open && (
        <div style={{ padding: "4px 12px 10px" }}>
          <EyeShapePanel
            eye={resolved}
            base={baseRight}
            onChange={handleChange}
            onResetField={handleResetField}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add expression controls

interface AddExpressionProps {
  existing: string[];
  onAdd: (name: string) => void;
}

function AddExpression({ existing, onAdd }: AddExpressionProps) {
  const [custom, setCustom] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const available = SUGGESTED_EXPRESSIONS.filter(s => !existing.includes(s));

  function submit(name: string) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || existing.includes(trimmed)) return;
    onAdd(trimmed);
    setCustom("");
  }

  return (
    <div style={{ marginTop: 6 }}>
      {available.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
          {available.map(s => (
            <button
              key={s}
              onClick={() => onAdd(s)}
              style={{ ...BTN, fontSize: 10, borderColor: "#2a2a3a", color: "#777" }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          ref={inputRef}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(custom); }}
          placeholder="custom expression…"
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid #2a2a40",
            borderRadius: 6,
            color: "#ccc",
            fontSize: 11,
            padding: "3px 8px",
            outline: "none",
          }}
        />
        <button onClick={() => submit(custom)} style={{ ...BTN, borderColor: "#3a2a50", color: "#9b8abf" }}>
          add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main EyeEditor

interface EyeEditorProps {
  eyes: CharacterEyes;
  onChange: (eyes: CharacterEyes) => void;
}

export function EyeEditor({ eyes, onChange }: EyeEditorProps) {
  const [eyeTab, setEyeTab] = useState<"right" | "left">("right");
  const [mirror, setMirror] = useState(false);
  const B = EYE_BOUNDS;

  function patch(update: Partial<CharacterEyes>) {
    onChange({ ...eyes, ...update });
  }

  const activeEye = eyeTab === "right" ? eyes.right : eyes.left;

  function handleEyeChange(updated: EyeShape) {
    if (!eyes.asymmetric) {
      // Mirror spatially: outside corner/arc of one eye maps to outside of the other
      const mirroredLeft = { ...updated };
      (Object.keys(MIRROR_MAP) as (keyof EyeShape)[]).forEach(k => {
        (mirroredLeft as unknown as Record<string, unknown>)[MIRROR_MAP[k]!] = (updated as unknown as Record<string, unknown>)[k];
      });
      mirroredLeft.rotation = -updated.rotation;
      patch({ right: updated, left: mirroredLeft });
    } else if (mirror) {
      const otherKey = eyeTab === "right" ? "left" : "right";
      const otherBase = eyeTab === "right" ? eyes.left : eyes.right;
      const activeBase = eyeTab === "right" ? eyes.right : eyes.left;
      const otherUpdate = { ...otherBase };
      (Object.keys(updated) as (keyof EyeShape)[]).forEach(k => {
        if (updated[k] !== activeBase[k]) {
          (otherUpdate as Record<string, unknown>)[MIRROR_MAP[k] ?? k] = updated[k];
        }
      });
      if (updated.rotation !== activeBase.rotation) {
        otherUpdate.rotation = -updated.rotation;
      }
      patch({ [eyeTab]: updated, [otherKey]: otherUpdate });
    } else {
      patch({ [eyeTab]: updated });
    }
  }

  function addExpression(name: string) {
    patch({ expressions: { ...eyes.expressions, [name]: {} } });
  }

  function updateExpression(name: string, override: Partial<EyeShape>) {
    patch({ expressions: { ...eyes.expressions, [name]: override } });
  }

  function deleteExpression(name: string) {
    const next = { ...eyes.expressions };
    delete next[name];
    patch({ expressions: next });
  }

  const expressionNames = Object.keys(eyes.expressions);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Positioning */}
      <p style={SUB}>position on head</p>
      <SliderRow
        label="from top"
        value={eyes.positioning.fromTopOfHead}
        {...B.fromTopOfHead}
        onChange={v => patch({ positioning: { ...eyes.positioning, fromTopOfHead: v } })}
      />
      <SliderRow
        label="separation"
        value={eyes.positioning.separation}
        {...B.separation}
        onChange={v => patch({ positioning: { ...eyes.positioning, separation: v } })}
      />

      {/* Clip overlap toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 4px" }}>
        <span style={{ color: "#aaa", fontSize: 11, flex: 1 }}>clip whites at overlap</span>
        <button
          onClick={() => patch({ clipOverlap: !eyes.clipOverlap })}
          style={{
            ...BTN,
            borderColor: eyes.clipOverlap ? "#6a4c93" : "#2a2a40",
            color: eyes.clipOverlap ? "#c080e0" : "#666",
          }}
        >
          {eyes.clipOverlap ? "on" : "off"}
        </button>
      </div>

      {/* Asymmetric toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 4px" }}>
        <span style={{ color: "#aaa", fontSize: 11, flex: 1 }}>asymmetric eyes</span>
        <button
          onClick={() => patch({ asymmetric: !eyes.asymmetric })}
          style={{
            ...BTN,
            borderColor: eyes.asymmetric ? "#6a4c93" : "#2a2a40",
            color: eyes.asymmetric ? "#c080e0" : "#666",
          }}
        >
          {eyes.asymmetric ? "on" : "off"}
        </button>
      </div>

      {/* Eye tab selector + mirror toggle (only when asymmetric) */}
      {eyes.asymmetric && (
        <div style={{ display: "flex", gap: 5, margin: "4px 0 6px", alignItems: "center" }}>
          {(["right", "left"] as const).map(side => (
            <button
              key={side}
              onClick={() => setEyeTab(side)}
              style={{
                ...BTN,
                flex: 1,
                borderColor: eyeTab === side ? "#6a4c93" : "#2a2a40",
                color: eyeTab === side ? "#c080e0" : "#666",
              }}
            >
              {side}
            </button>
          ))}
          <button
            onClick={() => setMirror(m => !m)}
            title="Mirror edits to the opposite eye (corners and arcs flip left↔right)"
            style={{
              ...BTN,
              borderColor: mirror ? "#6a4c93" : "#2a2a40",
              color: mirror ? "#c080e0" : "#555",
              whiteSpace: "nowrap",
            }}
          >
            mirrored
          </button>
        </div>
      )}

      {/* Eye shape sliders */}
      <EyeShapePanel
        eye={activeEye}
        onChange={handleEyeChange}
        rotationMirrored={eyes.rotationMirrored}
        onRotationMirroredChange={v => patch({ rotationMirrored: v })}
      />

      {/* Expressions */}
      <p style={{ ...SUB, marginTop: 14, borderTop: "1px solid #1e1e30", paddingTop: 10 }}>expressions</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {expressionNames.map(name => (
          <ExpressionRow
            key={name}
            name={name}
            baseRight={eyes.right}
            baseLeft={eyes.left}
            override={eyes.expressions[name]}
            asymmetric={eyes.asymmetric}
            onUpdate={override => updateExpression(name, override)}
            onDelete={() => deleteExpression(name)}
          />
        ))}
      </div>

      <AddExpression existing={expressionNames} onAdd={addExpression} />
    </div>
  );
}
