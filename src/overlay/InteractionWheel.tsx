/**
 * ADR-0015's radial wheel, drawn.
 *
 * Presentational: the pointer gesture lives in `useWheelGesture` and the maths in
 * `wheel-geometry`, so this decides only what a wedge looks like. Rendered as SVG
 * arcs rather than CSS wedges because the shape is an annulus sector and the labels
 * need placing on its bisector — both trivial in path space and fiddly out of it.
 *
 * **The ring is artwork, not a boundary.** A drag beyond `RING_OUTER_PX` still selects
 * the wedge it points at; that is ADR-0015's whole correction to the superseded
 * ADR-0014, and it is what keeps Fitts's law working. Nothing here should ever start
 * hit-testing against the drawn radius.
 *
 * In `sticky` mode the wedges are real buttons — that is the non-dragging path WCAG
 * 2.5.7 requires. In `drag` mode they are inert decoration, because the pointer that
 * opened the wheel already owns the interaction and a wedge that also handled clicks
 * would fire twice.
 */

import { RING_INNER_PX, RING_OUTER_PX, DEAD_ZONE_PX, wedgeBounds } from "./wheel-geometry";

export interface WheelItem {
  id: string;
  label: string;
  /** Greyed and unselectable — e.g. a fist bump nobody is close enough for. */
  disabled?: boolean;
}

interface InteractionWheelProps {
  items: readonly WheelItem[];
  /** Screen coordinates to centre on. */
  originX: number;
  originY: number;
  /** Wedge under the pointer, or `null` for none. */
  activeIndex: number | null;
  mode: "drag" | "sticky";
  /** Sticky mode only — drag mode commits through the gesture that opened it. */
  onPick?: (index: number) => void;
  /** Sticky mode only: tapping away cancels. */
  onDismiss?: () => void;
  /** Hide the digit hints; they are noise on a device with no keyboard. */
  showKeyHints?: boolean;
}

const PAD = 4;
const SIZE = (RING_OUTER_PX + PAD) * 2;
const C = SIZE / 2;
const LABEL_R = (RING_INNER_PX + RING_OUTER_PX) / 2;

/** A point on the wheel, in the SVG's own frame. Angle is clockwise from up. */
function pt(angle: number, r: number) {
  return { x: C + Math.sin(angle) * r, y: C - Math.cos(angle) * r };
}

/** An annulus sector between two clockwise-from-up angles. */
function wedgePath(start: number, end: number, ri: number, ro: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  const os = pt(start, ro);
  const oe = pt(end, ro);
  const is = pt(start, ri);
  const ie = pt(end, ri);
  return [
    `M ${os.x} ${os.y}`,
    `A ${ro} ${ro} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${ri} ${ri} 0 ${large} 0 ${is.x} ${is.y}`,
    "Z",
  ].join(" ");
}

export function InteractionWheel({
  items,
  originX,
  originY,
  activeIndex,
  mode,
  onPick,
  onDismiss,
  showKeyHints = true,
}: InteractionWheelProps) {
  const count = items.length;
  if (count === 0) return null;

  return (
    <>
      {/* Sticky mode needs somewhere to tap that means "no thanks". In drag mode the
          pointer is captured elsewhere, so a backdrop would only swallow events. */}
      {mode === "sticky" && (
        <div
          data-testid="wheel-backdrop"
          onClick={onDismiss}
          style={{ position: "fixed", inset: 0, zIndex: 44 }}
        />
      )}

      <div
        data-testid="interaction-wheel"
        style={{
          position: "fixed",
          left: originX - C,
          top: originY - C,
          width: SIZE,
          height: SIZE,
          zIndex: 45,
          pointerEvents: mode === "sticky" ? "auto" : "none",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        <svg width={SIZE} height={SIZE} aria-hidden={mode === "drag"}>
          {items.map((item, i) => {
            const b = wedgeBounds(i, count);
            const active = i === activeIndex && !item.disabled;
            const d = wedgePath(b.start, b.end, RING_INNER_PX, RING_OUTER_PX);
            const label = pt(b.mid, LABEL_R);
            const hint = pt(b.mid, RING_OUTER_PX - 13);
            const common = (
              <>
                <path
                  d={d}
                  fill={
                    item.disabled
                      ? "rgba(20,16,36,0.72)"
                      : active
                        ? "rgba(140,100,190,0.92)"
                        : "rgba(20,16,36,0.94)"
                  }
                  stroke={active ? "#c080e0" : "rgba(106,76,147,0.55)"}
                  strokeWidth={active ? 2 : 1}
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={active ? 700 : 500}
                  fill={item.disabled ? "#5a5a6a" : active ? "#fff" : "#ddd"}
                  style={{ pointerEvents: "none" }}
                >
                  {item.label}
                </text>
                {showKeyHints && i < 10 && (
                  <text
                    x={hint.x}
                    y={hint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill="rgba(255,255,255,0.35)"
                    style={{ pointerEvents: "none" }}
                  >
                    {i === 9 ? "0" : i + 1}
                  </text>
                )}
              </>
            );

            // Sticky wedges are buttons; drag wedges are decoration. The whole
            // annulus sector is the hit area, which clears WCAG 2.5.8 comfortably at
            // eight items and this ring's thickness.
            return mode === "sticky" ? (
              <g
                key={item.id}
                role="button"
                tabIndex={item.disabled ? -1 : 0}
                aria-label={item.label}
                aria-disabled={item.disabled || undefined}
                onClick={() => !item.disabled && onPick?.(i)}
                onKeyDown={e => {
                  if (item.disabled) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPick?.(i);
                  }
                }}
                style={{ cursor: item.disabled ? "not-allowed" : "pointer" }}
              >
                {common}
              </g>
            ) : (
              <g key={item.id}>{common}</g>
            );
          })}

          {/* The dead zone: cancel target as much as centre marker, which is why it
              is drawn at all. */}
          <circle
            cx={C}
            cy={C}
            r={DEAD_ZONE_PX}
            fill="rgba(12,10,22,0.9)"
            stroke={activeIndex === null ? "rgba(200,140,230,0.75)" : "rgba(106,76,147,0.4)"}
            strokeWidth={activeIndex === null ? 2 : 1}
          />
        </svg>
      </div>
    </>
  );
}
