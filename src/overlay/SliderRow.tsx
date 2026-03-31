import { useRef, useCallback } from "react";

export interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Highlight label/track/value in override colour (EyeEditor expression mode) */
  overridden?: boolean;
  /** Show a × reset button when overridden */
  onReset?: () => void;
  /** minWidth of the label column — defaults to 82 */
  labelWidth?: number;
}

function snap(v: number, step: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, v));
  const snapped = Math.round((clamped - min) / step) * step + min;
  // Fix floating-point drift (e.g. 0.1 + 0.2 = 0.30000000000000004)
  return parseFloat(snapped.toFixed(10));
}

export function SliderRow({
  label, value, min, max, step, onChange,
  overridden, onReset, labelWidth = 82,
}: SliderRowProps) {
  const drag = useRef<{ startX: number; startY: number; startVal: number } | null>(null);

  const onDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, startVal: value };
  }, [value]);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const { startX, startY, startVal } = drag.current;
    const dx = e.clientX - startX;
    // Vertical: drag DOWN = coarser (sensitivity > 1), drag UP = finer (sensitivity < 1)
    const dy = e.clientY - startY;
    const sensitivity = Math.pow(2, dy / 100);
    const delta = (dx / 250) * (max - min) * sensitivity;
    onChange(snap(startVal + delta, step, min, max));
  }, [min, max, step, onChange]);

  const onUp = useCallback(() => { drag.current = null; }, []);

  const fillPct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const accent = overridden ? "#c080e0" : "#6a4c93";
  const display = step < 0.1
    ? value.toFixed(3)
    : step < 1
      ? value.toFixed(2)
      : String(Math.round(value));

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    }}>
      <span style={{
        color: overridden ? "#c080e0" : "#aaa",
        fontSize: 11,
        minWidth: labelWidth,
        flexShrink: 0,
        userSelect: "none",
      }}>
        {label}
      </span>

      {/* 2D drag surface: horizontal = value, vertical = sensitivity */}
      <div
        style={{
          flex: 1,
          height: 24,
          position: "relative",
          cursor: "ew-resize",
          display: "flex",
          alignItems: "center",
          touchAction: "none",
          userSelect: "none",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Track background */}
        <div style={{
          position: "absolute", left: 0, right: 0,
          height: 3, background: "#2a2a4e", borderRadius: 2,
        }} />
        {/* Filled portion */}
        <div style={{
          position: "absolute", left: 0,
          width: `${fillPct}%`, height: 3,
          background: accent, borderRadius: 2,
        }} />
        {/* Thumb */}
        <div style={{
          position: "absolute",
          left: `${fillPct}%`,
          width: 10, height: 10,
          background: accent,
          border: "2px solid #0a0a14",
          borderRadius: "50%",
          transform: "translate(-50%, 0)",
          pointerEvents: "none",
        }} />
      </div>

      <span style={{
        color: overridden ? "#c080e0" : "#9b8abf",
        fontSize: 11,
        minWidth: 36,
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
        userSelect: "none",
      }}>
        {display}
      </span>

      {onReset && overridden && (
        <button
          onClick={onReset}
          style={{
            background: "none", border: "none",
            color: "#553377", fontSize: 12,
            padding: "0 2px", cursor: "pointer",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
