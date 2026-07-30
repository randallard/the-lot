import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DEFAULT_HOLD_MS, useWheelGesture, type UseWheelGestureOptions } from "./useWheelGesture";
import { DEAD_ZONE_PX } from "./wheel-geometry";

/** A press target that reports the gesture state it is given. */
function Harness(props: Omit<UseWheelGestureOptions, "count"> & { count?: number }) {
  const g = useWheelGesture({ count: props.count ?? 8, ...props });
  return (
    <div
      data-testid="target"
      data-mode={g.state.mode}
      data-active={String(g.state.activeIndex)}
      {...g.handlers}
    />
  );
}

/** happy-dom has no PointerEvent capture, so stub what the hook calls. */
function target() {
  const el = screen.getByTestId("target") as HTMLElement & {
    setPointerCapture: (id: number) => void;
  };
  el.setPointerCapture = vi.fn();
  el.releasePointerCapture = vi.fn();
  return el;
}

interface PtOpts {
  pointerId?: number;
  pointerType?: string;
  button?: number;
  clientX?: number;
  clientY?: number;
}

function pointer(type: string, el: HTMLElement, o: PtOpts = {}) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, {
    pointerId: o.pointerId ?? 1,
    pointerType: o.pointerType ?? "touch",
    button: o.button ?? 0,
    clientX: o.clientX ?? 0,
    clientY: o.clientY ?? 0,
  });
  act(() => {
    el.dispatchEvent(ev);
  });
}

const ORIGIN = { clientX: 200, clientY: 200 };
/** Straight up from the origin, well clear of the dead zone: wedge 0. */
const UP = { clientX: 200, clientY: 200 - DEAD_ZONE_PX * 4 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function hold(ms = DEFAULT_HOLD_MS) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("opening", () => {
  it("stays closed until the hold elapses", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    expect(el.dataset.mode).toBe("closed");
    hold(DEFAULT_HOLD_MS - 1);
    expect(el.dataset.mode).toBe("closed");
    hold(1);
    expect(el.dataset.mode).toBe("drag");
  });

  it("lets a short tap through without opening or selecting", () => {
    // The element's own click meaning -- opening chat with an NPC -- must survive.
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(<Harness onSelect={onSelect} onCancel={onCancel} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold(100);
    pointer("pointerup", el, ORIGIN);
    expect(el.dataset.mode).toBe("closed");
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("opens a right-click immediately, with no hold", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, { ...ORIGIN, pointerType: "mouse", button: 2 });
    expect(el.dataset.mode).toBe("drag");
  });

  it("branches on pointerType, not on the device — a mouse on a touch device is a mouse", () => {
    // ADR-0013's reason for existing: `"ontouchstart" in window` cannot tell these
    // apart, and would make a right-click wait 500ms on a touchscreen laptop.
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, { ...ORIGIN, pointerType: "mouse", button: 2 });
    expect(el.dataset.mode).toBe("drag");
  });

  it("ignores buttons that are not left or right", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, { ...ORIGIN, pointerType: "mouse", button: 1 });
    hold();
    expect(el.dataset.mode).toBe("closed");
  });

  it("does not open when disabled or when there is nothing to pick", () => {
    const { unmount } = render(<Harness onSelect={vi.fn()} disabled />);
    pointer("pointerdown", target(), ORIGIN);
    hold();
    expect(target().dataset.mode).toBe("closed");
    unmount();

    render(<Harness onSelect={vi.fn()} count={0} />);
    pointer("pointerdown", target(), ORIGIN);
    hold();
    expect(target().dataset.mode).toBe("closed");
  });

  it("takes pointer capture on the element that was pressed", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("honours a custom hold duration — adjustable per ADR-0015", () => {
    render(<Harness onSelect={vi.fn()} holdMs={1200} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold(DEFAULT_HOLD_MS);
    expect(el.dataset.mode).toBe("closed");
    hold(700);
    expect(el.dataset.mode).toBe("drag");
  });
});

describe("aiming", () => {
  it("tracks the wedge under the pointer", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointermove", el, UP);
    expect(el.dataset.active).toBe("0");
    pointer("pointermove", el, { clientX: 200 + DEAD_ZONE_PX * 4, clientY: 200 });
    expect(el.dataset.active).toBe("2"); // clockwise quarter of 8 wedges
  });

  it("reports null in the dead zone, before and after moving out", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    expect(el.dataset.active).toBe("null");
    pointer("pointermove", el, UP);
    expect(el.dataset.active).toBe("0");
    pointer("pointermove", el, ORIGIN);
    expect(el.dataset.active).toBe("null");
  });

  it("ignores moves from a second finger", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointermove", el, UP);
    pointer("pointermove", el, { ...ORIGIN, pointerId: 2, clientX: 400 });
    expect(el.dataset.active).toBe("0");
  });

  it("ignores a second pointer going down mid-gesture", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointerdown", el, { pointerId: 2, clientX: 500, clientY: 500 });
    pointer("pointermove", el, UP);
    expect(el.dataset.active).toBe("0");
  });
});

describe("committing", () => {
  it("selects the wedge held at release", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointermove", el, UP);
    pointer("pointerup", el, UP);
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(el.dataset.mode).toBe("closed");
  });

  it("selects however far out the flick goes — the ring is not a boundary", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointerup", el, { clientX: 200, clientY: -5000 });
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("cancels on release in the dead zone, selecting nothing", () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(<Harness onSelect={onSelect} onCancel={onCancel} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointermove", el, UP);
    pointer("pointermove", el, ORIGIN); // changed their mind
    pointer("pointerup", el, ORIGIN);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("commits on up, never on down — WCAG 2.5.2", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointermove", el, UP);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("cancels and closes when the browser takes the gesture", () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(<Harness onSelect={onSelect} onCancel={onCancel} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    hold();
    pointer("pointermove", el, UP);
    pointer("pointercancel", el, UP);
    expect(el.dataset.mode).toBe("closed");
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("does not fire cancel for a tap that never opened", () => {
    const onCancel = vi.fn();
    render(<Harness onSelect={vi.fn()} onCancel={onCancel} />);
    const el = target();
    pointer("pointerdown", el, ORIGIN);
    pointer("pointercancel", el, ORIGIN);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("is reusable — a second gesture works after the first", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const el = target();
    for (const n of [0, 1]) {
      pointer("pointerdown", el, { ...ORIGIN, pointerId: n + 1 });
      hold();
      pointer("pointerup", el, { ...UP, pointerId: n + 1 });
    }
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

describe("the non-dragging path", () => {
  it("opens sticky with no pointer, and commits on an explicit select", () => {
    // WCAG 2.5.7's alternative to hold-and-flick. Nothing wires this yet.
    const onSelect = vi.fn();
    function Sticky() {
      const g = useWheelGesture({ count: 8, onSelect });
      return (
        <>
          <button onClick={() => g.openSticky(100, 100)}>open</button>
          <button onClick={() => g.select(3)}>pick</button>
          <span data-testid="mode">{g.state.mode}</span>
        </>
      );
    }
    render(<Sticky />);
    act(() => {
      screen.getByText("open").click();
    });
    expect(screen.getByTestId("mode").textContent).toBe("sticky");
    act(() => {
      screen.getByText("pick").click();
    });
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(screen.getByTestId("mode").textContent).toBe("closed");
  });
});

describe("context menu", () => {
  it("suppresses the native menu so a right-click drag is possible", () => {
    render(<Harness onSelect={vi.fn()} />);
    const el = target();
    const ev = new Event("contextmenu", { bubbles: true, cancelable: true });
    act(() => {
      el.dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(true);
  });
});
