/**
 * The pure geometry behind ADR-0015's radial wheel: which wedge a drag is pointing
 * at, and where to draw each one.
 *
 * Separated from the component for the usual reason in this repo — the maths is
 * where the defects live and a renderer is a poor place to look for them. Nothing
 * here knows about React, pointers or the DOM.
 *
 * **Screen coordinates**, so `dy` grows *downward*. Wedge 0 is centred straight up
 * and they run **clockwise**, which is how a reader scans them and lets the digit
 * keys `EmotePanel` already binds (1–9, 0) map to wedges in the order they appear.
 *
 * ## Why the ring is not a selection boundary
 *
 * The inner **dead zone cancels**, and everything beyond it selects by angle with no
 * outer bound. Cancelling after opening is done by coming *back* to the dead zone,
 * which still satisfies WCAG 2.5.2 — the user can always abort before release — and
 * keeps Fitts's law working, since a wedge that never ends is the largest target
 * there is. `RING_INNER_PX` and `RING_OUTER_PX` are where wedges get *drawn*; a drag
 * beyond the artwork still selects, and that is not a bug to fix.
 *
 * Superseded ADR-0014 said the opposite — cancel "at the centre or outside the ring"
 * — while also requiring a marking menu's directional flick. Those contradict, since
 * a flick goes outside the ring by definition, so an expert gesture would always have
 * cancelled. [ADR-0015](../../docs/adr/0015-radial-wheel-dead-zone-cancels-selection-unbounded.md)
 * resolves it in favour of the flick.
 */

/**
 * Radius of the central dead zone, in CSS pixels.
 *
 * Doubles as the cancel target, so it is sized as one: comfortably past WCAG 2.5.8's
 * 24 px minimum across its diameter, because a cancel you cannot hit is how a menu
 * fires something the user did not want.
 */
export const DEAD_ZONE_PX = 28;

/** Where the wedges are drawn. The ring is a visual, not a selection boundary. */
export const RING_INNER_PX = 44;
export const RING_OUTER_PX = 116;

const TAU = Math.PI * 2;

/**
 * Clockwise angle from straight up, in `[0, TAU)`.
 *
 * `atan2(dx, -dy)` rather than the usual `atan2(dy, dx)`: it puts zero at the top and
 * grows clockwise in screen space, which is the wheel's own frame, so no later
 * rotation or sign flip is needed.
 */
export function angleFromUp(dx: number, dy: number): number {
  const a = Math.atan2(dx, -dy);
  return a < 0 ? a + TAU : a;
}

/**
 * Which wedge a drag of `(dx, dy)` from the wheel's centre points at, or `null`
 * inside the dead zone.
 *
 * `null` is a real answer, not a failure: it is what "cancel" looks like, both before
 * the user has moved and after they have come back. Callers commit on pointer-up, so
 * a `null` at release means nothing fires.
 */
export function wedgeAt(
  dx: number,
  dy: number,
  count: number,
  deadZone: number = DEAD_ZONE_PX,
): number | null {
  if (count <= 0) return null;
  if (Math.hypot(dx, dy) < deadZone) return null;
  const step = TAU / count;
  const idx = Math.round(angleFromUp(dx, dy) / step);
  return idx % count;
}

/** A wedge's angular extent, for drawing it. Clockwise from up, radians. */
export interface WedgeBounds {
  start: number;
  end: number;
  mid: number;
}

/**
 * The angles wedge `index` occupies.
 *
 * Centred on its own direction rather than starting at it, so wedge 0 straddles
 * straight up. That is what makes "flick up" mean the first item for both an even and
 * an odd number of them.
 */
export function wedgeBounds(index: number, count: number): WedgeBounds {
  const step = TAU / count;
  const mid = index * step;
  return { start: mid - step / 2, end: mid + step / 2, mid };
}

/** Unit vector pointing at the middle of a wedge, in screen coordinates. */
export function wedgeDirection(index: number, count: number): { x: number; y: number } {
  const mid = wedgeBounds(index, count).mid;
  return { x: Math.sin(mid), y: -Math.cos(mid) };
}

/**
 * How confidently a drag picks its wedge: 1 dead centre, 0 at the boundary with a
 * neighbour.
 *
 * For the component's benefit rather than the logic's — a wedge that lights up only
 * when the drag is actually committed to it is the feedback that teaches directions,
 * which is the whole point of showing novices the menu at all.
 */
export function wedgeConfidence(dx: number, dy: number, count: number): number {
  if (count <= 1) return 1;
  const step = TAU / count;
  const a = angleFromUp(dx, dy);
  const offset = Math.abs(((a + step / 2) % step) - step / 2);
  return 1 - offset / (step / 2);
}
