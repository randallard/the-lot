import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InteractionWheel, type WheelItem } from "./InteractionWheel";

const ITEMS: WheelItem[] = [
  { id: "wave", label: "wave" },
  { id: "bump", label: "fist bump" },
  { id: "greet", label: "greet" },
  { id: "far", label: "arm turn", disabled: true },
];

function renderWheel(over: Partial<React.ComponentProps<typeof InteractionWheel>> = {}) {
  return render(
    <InteractionWheel
      items={ITEMS}
      originX={300}
      originY={220}
      activeIndex={null}
      mode="drag"
      {...over}
    />,
  );
}

describe("rendering", () => {
  it("renders nothing when there is nothing to pick", () => {
    const { container } = renderWheel({ items: [] });
    expect(container.innerHTML).toBe("");
  });

  it("draws one label per item", () => {
    renderWheel();
    for (const i of ITEMS) expect(screen.getByText(i.label)).toBeInTheDocument();
  });

  it("centres itself on the origin it was given", () => {
    renderWheel({ originX: 300, originY: 220 });
    const el = screen.getByTestId("interaction-wheel");
    // Square, so the offsets are equal and the centre lands on the origin.
    const left = parseFloat(el.style.left);
    const top = parseFloat(el.style.top);
    const w = parseFloat(el.style.width);
    expect(left + w / 2).toBeCloseTo(300, 6);
    expect(top + w / 2).toBeCloseTo(220, 6);
  });

  it("suppresses the iOS callout and text selection during a hold", () => {
    renderWheel();
    const el = screen.getByTestId("interaction-wheel");
    expect(el.style.touchAction).toBe("none");
    expect(el.style.userSelect).toBe("none");
  });

  it("shows digit hints, and can be told not to", () => {
    renderWheel();
    expect(screen.getByText("1")).toBeInTheDocument();
    screen.getByText("4");

    renderWheel({ showKeyHints: false });
    expect(screen.queryAllByText("1")).toHaveLength(1); // only the first render's
  });
});

describe("drag mode", () => {
  it("does not intercept pointer events — the opener owns the gesture", () => {
    renderWheel({ mode: "drag" });
    expect(screen.getByTestId("interaction-wheel").style.pointerEvents).toBe("none");
  });

  it("has no backdrop to swallow the captured pointer", () => {
    renderWheel({ mode: "drag" });
    expect(screen.queryByTestId("wheel-backdrop")).toBeNull();
  });

  it("offers no buttons — a wedge that also handled clicks would fire twice", () => {
    renderWheel({ mode: "drag" });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("sticky mode is the non-dragging path", () => {
  it("makes every enabled wedge a button", () => {
    renderWheel({ mode: "sticky" });
    // Three enabled, one disabled -- all get the role, disabled is marked.
    expect(screen.getAllByRole("button")).toHaveLength(ITEMS.length);
    expect(screen.getByRole("button", { name: "arm turn" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("picks on click", () => {
    const onPick = vi.fn();
    renderWheel({ mode: "sticky", onPick });
    fireEvent.click(screen.getByRole("button", { name: "fist bump" }));
    expect(onPick).toHaveBeenCalledWith(1);
  });

  it("picks on Enter and Space, for keyboard users", () => {
    const onPick = vi.fn();
    renderWheel({ mode: "sticky", onPick });
    const wedge = screen.getByRole("button", { name: "greet" });
    fireEvent.keyDown(wedge, { key: "Enter" });
    fireEvent.keyDown(wedge, { key: " " });
    expect(onPick).toHaveBeenCalledTimes(2);
    expect(onPick).toHaveBeenCalledWith(2);
  });

  it("will not pick a disabled wedge, by click or key", () => {
    const onPick = vi.fn();
    renderWheel({ mode: "sticky", onPick });
    const wedge = screen.getByRole("button", { name: "arm turn" });
    fireEvent.click(wedge);
    fireEvent.keyDown(wedge, { key: "Enter" });
    expect(onPick).not.toHaveBeenCalled();
  });

  it("takes a disabled wedge out of the tab order", () => {
    renderWheel({ mode: "sticky" });
    expect(screen.getByRole("button", { name: "arm turn" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("button", { name: "wave" })).toHaveAttribute("tabindex", "0");
  });

  it("dismisses on a tap away", () => {
    const onDismiss = vi.fn();
    renderWheel({ mode: "sticky", onDismiss });
    fireEvent.click(screen.getByTestId("wheel-backdrop"));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("a single item draws a ring, not a sliver", () => {
  // With one wedge the bounds run -PI to +PI, whose endpoints coincide, so the
  // sector path degenerates into a stray radial line. Caught on screen first.
  const ONE: WheelItem[] = [{ id: "solo", label: "new emote" }];

  it("emits a closed two-subpath ring", () => {
    const { container } = renderWheel({ items: ONE });
    const d = container.querySelector("path")!.getAttribute("d")!;
    // Two subpaths (outer and inner edge), four arcs, no straight join.
    expect(d.match(/M /g)).toHaveLength(2);
    expect(d.match(/A /g)).toHaveLength(4);
    expect(d).not.toContain("L ");
  });

  it("spans the full width of the ring", () => {
    const { container } = renderWheel({ items: ONE });
    const d = container.querySelector("path")!.getAttribute("d")!;
    const xs = [...d.matchAll(/-?\d+(?:\.\d+)?(?= \d)/g)].map(Number);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(100);
  });

  it("still labels and still highlights", () => {
    const { container } = renderWheel({ items: ONE, activeIndex: 0 });
    expect(screen.getByText("new emote")).toBeInTheDocument();
    expect(container.querySelector("path")!.getAttribute("stroke")).toBe("#c080e0");
  });

  it("keeps multi-item wedges as sectors", () => {
    const { container } = renderWheel();
    expect(container.querySelector("path")!.getAttribute("d")).toContain("L ");
  });
});

describe("the active wedge", () => {
  it("highlights the one under the pointer", () => {
    const { container } = renderWheel({ activeIndex: 1 });
    const strokes = [...container.querySelectorAll("path")].map(p => p.getAttribute("stroke"));
    expect(strokes.filter(s => s === "#c080e0")).toHaveLength(1);
  });

  it("never highlights a disabled wedge, even when aimed at", () => {
    const { container } = renderWheel({ activeIndex: 3 });
    const strokes = [...container.querySelectorAll("path")].map(p => p.getAttribute("stroke"));
    expect(strokes.filter(s => s === "#c080e0")).toHaveLength(0);
  });

  it("marks the dead zone as live when nothing is aimed at — cancel is a state", () => {
    const { container: none } = renderWheel({ activeIndex: null });
    const { container: aimed } = renderWheel({ activeIndex: 0 });
    const ring = (c: HTMLElement) => c.querySelector("circle")!.getAttribute("stroke-width");
    expect(ring(none)).toBe("2");
    expect(ring(aimed)).toBe("1");
  });
});
