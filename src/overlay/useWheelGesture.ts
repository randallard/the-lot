/**
 * The pointer half of ADR-0015's radial wheel: hold to open, drag to aim, release to
 * commit.
 *
 * Implements [ADR-0013](../../docs/adr/0013-pointer-events-with-capture-for-new-pointer-input.md)
 * — Pointer Events with capture, following `SliderRow.tsx`, branching on
 * `e.pointerType` rather than on a device-capability boolean. That branch is the
 * reason this is not two code paths: a finger needs a hold before the wheel appears,
 * a right-click should open it at once, and `"ontouchstart" in window` cannot tell
 * those apart on a touchscreen laptop.
 *
 * ## Why a short tap does nothing here
 *
 * Only a *hold* opens the wheel. A quick tap cancels the timer and the gesture never
 * starts, so whatever the element normally does on click — opening chat with an NPC,
 * today — still happens untouched. That is deliberate: the wheel has to coexist with
 * an existing tap meaning rather than take it.
 *
 * The consequence is that ADR-0015's required non-dragging path ("tap to open and tap
 * a wedge") **cannot come from tapping the same target**. {@link openSticky} exists
 * for it — a wheel opened without a pointer driving it, which stays up until a wedge
 * is tapped — but nothing calls it yet. **Wiring a sticky opener is required before
 * this ships**, because it is the WCAG 2.5.7 alternative, not a nicety.
 *
 * ## Capture lives on the opener
 *
 * `setPointerCapture` is called on the element that was pressed, not on the wheel:
 * the wheel does not exist yet at `pointerdown`, and the press target is what must be
 * guaranteed the matching `pointerup`. Moves and releases are then read from that
 * captured element's own handlers, filtered by `pointerId` so a second finger landing
 * mid-gesture is ignored — ADR-0013's one surviving piece of bookkeeping.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { wedgeAt } from "./wheel-geometry";

/**
 * Default hold before the wheel appears, in milliseconds.
 *
 * Matches the platform conventions — Android's long-press timeout and iOS's
 * `UILongPressGestureRecognizer.minimumPressDuration` are both 500 ms — so the
 * gesture feels native rather than sluggish or twitchy.
 *
 * **Adjustable on purpose** (ADR-0015): a fixed long-press is hostile to tremor and
 * motor impairment, so this is a default and not a constant to hard-code against.
 */
export const DEFAULT_HOLD_MS = 500;

export type WheelMode = "closed" | "drag" | "sticky";

export interface WheelGestureState {
  mode: WheelMode;
  /** Screen coordinates the wheel is centred on. */
  originX: number;
  originY: number;
  /** Wedge under the pointer, or `null` in the dead zone — which means cancel. */
  activeIndex: number | null;
}

const CLOSED: WheelGestureState = { mode: "closed", originX: 0, originY: 0, activeIndex: null };

export interface UseWheelGestureOptions {
  /** How many wedges. Selection is meaningless at 0, so the gesture will not open. */
  count: number;
  /** Fired on release over a wedge, and on a tap in sticky mode. */
  onSelect: (index: number) => void;
  /** Fired when a gesture ends without a selection. */
  onCancel?: () => void;
  holdMs?: number;
  /** Turn the gesture off without unmounting the consumer. */
  disabled?: boolean;
}

export interface WheelGesture {
  state: WheelGestureState;
  /** Spread onto the element the wheel opens from. */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
  };
  /** Open without a pointer driving it — the non-dragging path. */
  openSticky: (x: number, y: number) => void;
  /** Commit from sticky mode, e.g. a tapped wedge. */
  select: (index: number) => void;
  close: () => void;
}

export function useWheelGesture({
  count,
  onSelect,
  onCancel,
  holdMs = DEFAULT_HOLD_MS,
  disabled = false,
}: UseWheelGestureOptions): WheelGesture {
  const [state, setState] = useState<WheelGestureState>(CLOSED);

  // Refs rather than state: these are read inside pointer handlers that must not
  // re-subscribe, the ADR-0002 boundary ADR-0008 already excepts from react-hooks.
  const pointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opened = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // A gesture in flight must not outlive the component, or the timer fires into a
  // torn-down tree.
  useEffect(() => clearTimer, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    pointer.current = null;
    opened.current = false;
    setState(CLOSED);
  }, [clearTimer]);

  const open = useCallback((x: number, y: number) => {
    opened.current = true;
    origin.current = { x, y };
    setState({ mode: "drag", originX: x, originY: y, activeIndex: null });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || count <= 0) return;
      // One pointer at a time; a second finger mid-gesture is not a second wheel.
      if (pointer.current !== null) return;
      // Left button or touch opens on a hold; right button opens at once. Anything
      // else (middle, back) is not ours.
      const isRightClick = e.pointerType === "mouse" && e.button === 2;
      if (e.pointerType === "mouse" && e.button !== 0 && !isRightClick) return;

      pointer.current = e.pointerId;
      origin.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);

      if (isRightClick) {
        open(e.clientX, e.clientY);
        return;
      }
      const { clientX, clientY } = e;
      timer.current = setTimeout(() => {
        timer.current = null;
        open(clientX, clientY);
      }, holdMs);
    },
    [count, disabled, holdMs, open],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointer.current || !opened.current) return;
      const idx = wedgeAt(e.clientX - origin.current.x, e.clientY - origin.current.y, count);
      setState(s => (s.activeIndex === idx ? s : { ...s, activeIndex: idx }));
    },
    [count],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointer.current) return;
      const wasOpen = opened.current;
      const idx = wasOpen
        ? wedgeAt(e.clientX - origin.current.x, e.clientY - origin.current.y, count)
        : null;
      reset();
      if (!wasOpen) return; // Released before the hold — the element's own click stands.
      if (idx === null) onCancel?.(); // Dead zone: ADR-0015's cancel.
      else onSelect(idx);
    },
    [count, onCancel, onSelect, reset],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointer.current) return;
      const wasOpen = opened.current;
      reset();
      if (wasOpen) onCancel?.();
    },
    [onCancel, reset],
  );

  // Suppress the native menu only. The wheel itself opens from `pointerdown`, which
  // fires first and already knows it was button 2.
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
  }, [disabled]);

  const openSticky = useCallback(
    (x: number, y: number) => {
      if (disabled || count <= 0) return;
      clearTimer();
      pointer.current = null;
      opened.current = true;
      origin.current = { x, y };
      setState({ mode: "sticky", originX: x, originY: y, activeIndex: null });
    },
    [clearTimer, count, disabled],
  );

  const select = useCallback(
    (index: number) => {
      reset();
      onSelect(index);
    },
    [onSelect, reset],
  );

  const close = useCallback(() => {
    const wasOpen = opened.current;
    reset();
    if (wasOpen) onCancel?.();
  }, [onCancel, reset]);

  return {
    state,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu },
    openSticky,
    select,
    close,
  };
}
