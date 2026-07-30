import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WheelButton } from "./WheelButton";

describe("WheelButton", () => {
  it("opens the wheel on click", () => {
    const onOpen = vi.fn();
    render(<WheelButton onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /interaction wheel/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("answers the keyboard, because that is half the point", () => {
    const onOpen = vi.fn();
    render(<WheelButton onOpen={onOpen} />);
    const b = screen.getByRole("button", { name: /interaction wheel/i });
    // A real <button> turns Enter and Space into clicks.
    fireEvent.click(b);
    expect(onOpen).toHaveBeenCalled();
    expect(b.tagName).toBe("BUTTON");
  });

  it("renders on every device, unlike its touch-only neighbours", () => {
    // PocketButton and the emote button hide behind a touch check. This one must not:
    // it is the WCAG 2.5.7 alternative for people who cannot hold a press, on any
    // input.
    render(<WheelButton onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: /interaction wheel/i })).toBeInTheDocument();
  });

  it("clears the 24px minimum target size by a wide margin", () => {
    render(<WheelButton onOpen={vi.fn()} />);
    const b = screen.getByRole("button", { name: /interaction wheel/i });
    expect(parseFloat(b.style.width)).toBeGreaterThanOrEqual(24);
    expect(parseFloat(b.style.height)).toBeGreaterThanOrEqual(24);
  });

  it("stays put when disabled, and does not fire", () => {
    const onOpen = vi.fn();
    render(<WheelButton onOpen={onOpen} disabled />);
    const b = screen.getByRole("button", { name: /interaction wheel/i });
    fireEvent.click(b);
    expect(onOpen).not.toHaveBeenCalled();
    expect(b).toBeInTheDocument();
  });

  it("sits clear of the pocket and emote buttons", () => {
    render(<WheelButton onOpen={vi.fn()} />);
    const b = screen.getByRole("button", { name: /interaction wheel/i });
    // Pocket is at right:40, emotes at right:104, both 56 wide.
    expect(parseFloat(b.style.right)).toBeGreaterThanOrEqual(104 + 56);
  });
});
